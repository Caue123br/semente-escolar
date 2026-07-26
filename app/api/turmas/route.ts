import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToTurma } from "@/lib/db/mappers";
import { seedTurmas } from "@/lib/db/seed";
import { registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { getUsuarioLogado } from "@/lib/db/auth";
import { resolverEscopoProfessor } from "@/lib/db/professor-scope";
import type { Turma } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  await seedTurmas();
  const sb = getDatabase();
  let query = sb.from("turmas").select("*").order("nome", { ascending: true });
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (escopo.restrito) query = query.in("id", escopo.turmaIds);
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await query;
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToTurma) });
}

export async function POST(req: Request) {
  let t: Turma;
  try {
    t = (await req.json()) as Turma;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!t || typeof t !== "object" || Array.isArray(t)) {
    return erros.dadosInvalidos("corpo da requisição");
  }

  const nome = typeof t?.nome === "string" ? t.nome.trim() : "";
  const series = new Set(["Mini Maternal", "Maternal", "Maternal 1", "Jardim", "Pré"]);
  const turnos = new Set(["Manhã", "Tarde", "Integral"]);
  const capacidade = Number(t?.capacidade);

  if (nome.length < 2 || nome.length > 120) return erros.dadosInvalidos("nome da turma");
  if (!series.has(t?.serie)) return erros.dadosInvalidos("série");
  if (!turnos.has(t?.turno)) return erros.dadosInvalidos("turno");
  if (!Number.isInteger(capacidade) || capacidade < 1 || capacidade > 100) {
    return erros.dadosInvalidos("capacidade");
  }
  if (t.cor && !/^#[0-9a-f]{6}$/i.test(t.cor)) return erros.dadosInvalidos("cor");

  const sb = getDatabase();
  const professorId = typeof t.professorId === "string" ? t.professorId.trim() : "";
  let professorNome: string | null = null;
  if (professorId) {
    const { data: professor, error: erroProfessor } = await sb
      .from("usuarios")
      .select("id,nome,perfil,ativo")
      .eq("id", professorId)
      .maybeSingle();
    if (erroProfessor) return erros.servidorIndisponivel(erroProfessor);
    if (!professor || professor.perfil !== "professor" || !professor.ativo) {
      return erroAPI("O professor selecionado não está disponível.", 422);
    }
    professorNome = String(professor.nome);
  }
  const id = randomUUID();
  const { data, error } = await sb.from("turmas").insert({
    id,
    nome,
    serie: t.serie,
    turno: t.turno,
    professor_usuario_id: professorId || null,
    professor_id: professorId || null,
    professor_nome: professorNome,
    total_alunos: 0,
    capacidade,
    cor: t.cor || "#059669",
  }).select("*").single();
  if (error || !data) {
    if (error?.code === "23503") return erroAPI("A escola configurada não existe.", 422);
    return erros.servidorIndisponivel(error ?? new Error("INSERT de turma sem retorno"));
  }
  await registrarAudit("criar", "turmas", id);
  return sucesso({ item: rowToTurma(data) }, 201);
}
