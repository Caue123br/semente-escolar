import { NextResponse } from "next/server";
import { erros, sucesso } from "@/lib/db/api-response";
import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { rowToFrequencia } from "@/lib/db/mappers";
import {
  professorPodeAcessarAluno,
  resolverEscopoProfessor,
} from "@/lib/db/professor-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
  presente: "presente", justificativa: "justificativa",
};

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  const sb = getDatabase();
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (escopo.restrito) {
      const { data: registro, error: erroRegistro } = await sb
        .from("frequencia")
        .select("aluno_id")
        .eq("id", id)
        .maybeSingle();
      if (erroRegistro) return erros.servidorIndisponivel(erroRegistro);
      if (!registro) return erros.naoEncontrado("Registro de frequência");
      if (!(await professorPodeAcessarAluno(escopo, String(registro.aluno_id)))) {
        return erros.semPermissao("excluir frequência de alunos fora das suas turmas");
      }
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await sb.from("frequencia").delete().eq("id", id).select("id").maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Registro de frequência");
  await registrarAudit("excluir", "frequencia", id);
  return sucesso({ id });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  let patch: Record<string, unknown>;
  try {
    patch = (await req.json()) as Record<string, unknown>;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return erros.dadosInvalidos();
  const sb = getDatabase();
  const { data: registro, error: erroRegistro } = await sb
    .from("frequencia")
    .select("aluno_id")
    .eq("id", id)
    .maybeSingle();
  if (erroRegistro) return erros.servidorIndisponivel(erroRegistro);
  if (!registro) return erros.naoEncontrado("Registro de frequência");
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (escopo.restrito) {
      if (!(await professorPodeAcessarAluno(escopo, String(registro.aluno_id)))) {
        return erros.semPermissao("editar frequência de alunos fora das suas turmas");
      }
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = MAPA[k];
    if (col) update[col] = v;
  }
  if (update.presente !== undefined && typeof update.presente !== "boolean") return erros.dadosInvalidos("presença");
  if (update.justificativa !== undefined) {
    if (update.justificativa !== null && typeof update.justificativa !== "string") return erros.dadosInvalidos("justificativa");
    const justificativa = typeof update.justificativa === "string" ? update.justificativa.trim() : "";
    if (justificativa.length > 2_000) return erros.dadosInvalidos("justificativa");
    update.justificativa = justificativa || null;
  }
  if (Object.keys(update).length === 0) return erros.dadosInvalidos("nenhuma alteração editável");
  const { data, error } = await sb.from("frequencia").update(update).eq("id", id).select("*").maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Registro de frequência");
  await registrarAudit("editar", "frequencia", id, { campos: Object.keys(update) });
  return sucesso({ item: rowToFrequencia(data) });
}
