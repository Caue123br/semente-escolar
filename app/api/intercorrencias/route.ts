import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { getDatabase } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";
import {
  listarAlunosDoEscopoProfessor,
  professorPodeAcessarAluno,
  resolverEscopoProfessor,
} from "@/lib/db/professor-scope";
import { formatDateLocalISO } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  const url = new URL(req.url);
  const alunoId = url.searchParams.get("alunoId")?.trim();
  const sb = getDatabase();
  let query = sb.from("intercorrencias").select("*").order("data", { ascending: false }).order("hora", { ascending: false });
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (alunoId) {
      if (!(await professorPodeAcessarAluno(escopo, alunoId))) {
        return erros.semPermissao("acessar intercorrências de alunos fora das suas turmas");
      }
      query = query.eq("aluno_id", alunoId);
    } else if (escopo.restrito) {
      query = query.in("aluno_id", await listarAlunosDoEscopoProfessor(escopo));
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await query.limit(200);
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({
    items: (data ?? []).map((r) => ({
      id: String(r.id),
      alunoId: String(r.aluno_id),
      alunoNome: String(r.aluno_nome),
      data: String(r.data),
      hora: r.hora ? String(r.hora) : null,
      tipo: String(r.tipo),
      descricao: String(r.descricao),
      temperatura: r.temperatura ? Number(r.temperatura) : null,
      medicamentoNome: r.medicamento_nome ? String(r.medicamento_nome) : null,
      medicamentoDose: r.medicamento_dose ? String(r.medicamento_dose) : null,
      registradoPorNome: r.registrado_por_nome ? String(r.registrado_por_nome) : null,
      notificouPais: Boolean(r.notificou_pais),
      createdAt: r.created_at ? String(r.created_at) : null,
    })),
  });
}

interface IntercorrenciaInput {
  alunoId: string;
  alunoNome: string;
  data?: string;
  hora?: string;
  tipo: "febre" | "queda" | "medicamento" | "mal_estar" | "alergia" | "higiene" | "comportamento" | "outros";
  descricao: string;
  temperatura?: number;
  medicamentoNome?: string;
  medicamentoDose?: string;
  notificouPais?: boolean;
}

export async function POST(req: Request) {
  const u = await getUsuarioLogado();
  if (!u) return erros.naoAutenticado();
  let body: IntercorrenciaInput;
  try {
    body = (await req.json()) as IntercorrenciaInput;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  const alunoId = typeof body?.alunoId === "string" ? body.alunoId.trim() : "";
  const descricao = typeof body?.descricao === "string" ? body.descricao.trim() : "";
  const medicamentoNome = typeof body?.medicamentoNome === "string" ? body.medicamentoNome.trim() : "";
  const medicamentoDose = typeof body?.medicamentoDose === "string" ? body.medicamentoDose.trim() : "";
  const tipos = new Set(["febre", "queda", "medicamento", "mal_estar", "alergia", "higiene", "comportamento", "outros"]);
  const dataRegistro = typeof body?.data === "string" && body.data ? body.data : formatDateLocalISO();
  const hora = typeof body?.hora === "string" && body.hora ? body.hora : new Date().toTimeString().slice(0, 8);
  const temperatura = body?.temperatura == null ? null : Number(body.temperatura);
  if (!alunoId || !tipos.has(body?.tipo) || descricao.length < 2 || descricao.length > 4_000) {
    return erros.dadosInvalidos("aluno, tipo ou descrição");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataRegistro) || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(hora)) {
    return erros.dadosInvalidos("data ou hora");
  }
  if (temperatura !== null && (!Number.isFinite(temperatura) || temperatura < 30 || temperatura > 45)) {
    return erros.dadosInvalidos("temperatura");
  }
  if (medicamentoNome.length > 200 || medicamentoDose.length > 200) return erros.dadosInvalidos("medicamento");
  try {
    const escopo = await resolverEscopoProfessor(u);
    if (!(await professorPodeAcessarAluno(escopo, alunoId))) {
      return erros.semPermissao("registrar intercorrências de alunos fora das suas turmas");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const id = randomUUID();
  // Este endpoint apenas registra a confirmação informada pelo usuário.
  // Não há disparo automático de WhatsApp, SMS, e-mail ou push.
  const avisoAosResponsaveisConfirmado = body.notificouPais === true;
  const sb = getDatabase();
  const { data: aluno, error: erroAluno } = await sb.from("alunos").select("id,nome").eq("id", alunoId).maybeSingle();
  if (erroAluno) return erros.servidorIndisponivel(erroAluno);
  if (!aluno) return erroAPI("O aluno informado não existe mais.", 422);
  const { data, error } = await sb.from("intercorrencias").insert({
    id,
    aluno_id: alunoId,
    aluno_nome: String(aluno.nome),
    data: dataRegistro,
    hora,
    tipo: body.tipo,
    descricao,
    temperatura,
    medicamento_nome: medicamentoNome || null,
    medicamento_dose: medicamentoDose || null,
    registrado_por_id: u?.id ?? null,
    registrado_por_nome: u?.nome ?? "Sistema",
    notificou_pais: avisoAosResponsaveisConfirmado,
    notificado_em: avisoAosResponsaveisConfirmado ? new Date().toISOString() : null,
  }).select("*").single();
  if (error || !data) return erros.servidorIndisponivel(error ?? new Error("INSERT de intercorrência sem retorno"));
  await registrarAudit("criar", "intercorrencias", id, { alunoId, tipo: body.tipo });
  return sucesso({
    id,
    item: data,
    avisoAosResponsaveisConfirmado,
    avisoAutomaticoEnviado: false,
  }, 201);
}
