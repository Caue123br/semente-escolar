import "server-only";

import type { Usuario } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";

export type EscopoProfessor =
  | { restrito: false; turmaIds: null }
  | { restrito: true; turmaIds: string[] };

/** Autorização depende exclusivamente do vínculo IAM explícito da turma. */
export async function resolverEscopoProfessor(
  usuario: Usuario
): Promise<EscopoProfessor> {
  if (usuario.perfil !== "professor") {
    return { restrito: false, turmaIds: null };
  }

  const { data, error } = await getDatabase()
    .from("turmas")
    .select("id")
    .eq("professor_usuario_id", usuario.id);
  if (error) throw new Error("Falha ao resolver as turmas atribuídas ao professor");
  return { restrito: true, turmaIds: (data ?? []).map((turma) => String(turma.id)) };
}

export function professorPodeAcessarTurma(
  escopo: EscopoProfessor,
  turmaId: string
): boolean {
  return !escopo.restrito || escopo.turmaIds.includes(turmaId);
}

export async function listarAlunosDoEscopoProfessor(
  escopo: EscopoProfessor
): Promise<string[]> {
  if (!escopo.restrito || escopo.turmaIds.length === 0) return [];

  const { data, error } = await getDatabase()
    .from("alunos")
    .select("id")
    .in("turma_id", escopo.turmaIds);
  if (error) throw new Error("Falha ao resolver os alunos atribuídos ao professor");
  return (data ?? []).map((aluno) => String(aluno.id));
}

export async function professorPodeAcessarAluno(
  escopo: EscopoProfessor,
  alunoId: string
): Promise<boolean> {
  if (!escopo.restrito) return true;
  if (!alunoId || escopo.turmaIds.length === 0) return false;

  const { data, error } = await getDatabase()
    .from("alunos")
    .select("id")
    .eq("id", alunoId)
    .in("turma_id", escopo.turmaIds)
    .maybeSingle();
  if (error) throw new Error("Falha ao validar o aluno atribuído ao professor");
  return Boolean(data);
}

/** Bebês sem turma permanecem acessíveis apenas à gestão. */
export async function listarBebesDoEscopoProfessor(
  escopo: EscopoProfessor
): Promise<string[]> {
  if (!escopo.restrito || escopo.turmaIds.length === 0) return [];
  const { data, error } = await getDatabase()
    .from("bercario_bebes")
    .select("id")
    .in("turma_id", escopo.turmaIds);
  if (error) throw new Error("Falha ao resolver os bebês atribuídos ao professor");
  return (data ?? []).map((bebe) => String(bebe.id));
}

export async function professorPodeAcessarBebe(
  escopo: EscopoProfessor,
  bebeId: string
): Promise<boolean> {
  if (!escopo.restrito) return true;
  if (!bebeId || escopo.turmaIds.length === 0) return false;
  const { data, error } = await getDatabase()
    .from("bercario_bebes")
    .select("id")
    .eq("id", bebeId)
    .in("turma_id", escopo.turmaIds)
    .maybeSingle();
  if (error) throw new Error("Falha ao validar o bebê atribuído ao professor");
  return Boolean(data);
}
