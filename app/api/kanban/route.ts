import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { rowToKanban } from "@/lib/db/mappers";
import {
  professorPodeAcessarTurma,
  resolverEscopoProfessor,
} from "@/lib/db/professor-scope";
import { seedKanban } from "@/lib/db/seed";
import type { KanbanCard } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  await seedKanban();
  const sb = getDatabase();
  let query = sb.from("kanban_cards").select("*").order("ordem", { ascending: true });
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (escopo.restrito) query = query.in("turma_id", escopo.turmaIds);
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await query;
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToKanban) });
}

export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  let c: KanbanCard;
  try {
    c = (await req.json()) as KanbanCard;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  const turmaId = typeof c?.turmaId === "string" ? c.turmaId.trim() : "";
  const titulo = typeof c?.titulo === "string" ? c.titulo.trim() : "";
  const descricao = typeof c?.descricao === "string" ? c.descricao.trim() : "";
  const responsavel = typeof c?.responsavel === "string" ? c.responsavel.trim() : "";
  const colunas = new Set(["c-todo", "c-doing", "c-review", "c-done"]);
  const tipos = new Set(["Atividade", "Evento", "Pendência", "Avaliação"]);
  if (!turmaId) return erros.dadosInvalidos("turma");
  if (titulo.length < 2 || titulo.length > 200) return erros.dadosInvalidos("título");
  if (!colunas.has(c.colunaId)) return erros.dadosInvalidos("coluna");
  if (!tipos.has(c.tipo)) return erros.dadosInvalidos("tipo");
  if (descricao.length > 4_000 || responsavel.length > 160) return erros.dadosInvalidos("texto muito longo");
  if (c.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(c.prazo)) return erros.dadosInvalidos("prazo");
  if (c.cor && !/^#[0-9a-f]{6}$/i.test(c.cor)) return erros.dadosInvalidos("cor");
  const sb = getDatabase();
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!professorPodeAcessarTurma(escopo, turmaId)) {
      return erros.semPermissao("criar cards em turmas não atribuídas ao seu usuário");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data: turma, error: erroTurma } = await sb.from("turmas").select("id").eq("id", turmaId).maybeSingle();
  if (erroTurma) return erros.servidorIndisponivel(erroTurma);
  if (!turma) return erroAPI("A turma informada não existe mais.", 422);
  const id = randomUUID();
  const { data, error } = await sb.from("kanban_cards").insert({
    id,
    coluna_id: c.colunaId,
    turma_id: turmaId,
    titulo,
    descricao: descricao || null,
    tipo: c.tipo,
    prazo: c.prazo ?? null,
    responsavel: responsavel || null,
    cor: c.cor ?? null,
  }).select("*").single();
  if (error || !data) {
    if (["22007", "23502", "23503", "23514"].includes(error?.code ?? "")) return erros.dadosInvalidos();
    return erros.servidorIndisponivel(error ?? new Error("INSERT de card sem retorno"));
  }
  await registrarAudit("criar", "kanban", id, { turmaId, colunaId: c.colunaId });
  return sucesso({ item: rowToKanban(data) }, 201);
}
