import "server-only";

import type { Usuario } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";

export type EscopoProfessor =
  | { restrito: false; turmaIds: null }
  | { restrito: true; turmaIds: string[] };

/**
 * Normaliza apenas diferenças de representação do mesmo nome. Pontuação,
 * títulos e palavras continuam relevantes para evitar vínculos aproximados.
 */
export function normalizarNomeProfessor(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

/**
 * Mitigação transitória enquanto turma e usuário não possuem um vínculo por FK.
 * Resolve o escopo uma única vez por requisição. Perfis que não são professor
 * permanecem irrestritos; qualquer ambiguidade nominal fecha o escopo.
 */
export async function resolverEscopoProfessor(
  usuario: Usuario
): Promise<EscopoProfessor> {
  if (usuario.perfil !== "professor") {
    return { restrito: false, turmaIds: null };
  }

  const nomeUsuario = normalizarNomeProfessor(usuario.nome);
  if (!nomeUsuario) return { restrito: true, turmaIds: [] };

  const db = getDatabase();
  const { data: professores, error: erroProfessores } = await db
    .from("usuarios")
    .select("id,nome")
    .eq("perfil", "professor")
    .eq("ativo", true);
  if (erroProfessores) {
    throw new Error("Falha ao confirmar a identidade nominal do professor");
  }

  const professoresComMesmoNome = (professores ?? []).filter(
    (professor) =>
      typeof professor.nome === "string" &&
      normalizarNomeProfessor(professor.nome) === nomeUsuario
  );
  if (
    professoresComMesmoNome.length !== 1 ||
    String(professoresComMesmoNome[0].id) !== usuario.id
  ) {
    return { restrito: true, turmaIds: [] };
  }

  const { data, error } = await db
    .from("turmas")
    .select("id,professor_usuario_id,professor_id,professor_nome");
  if (error) throw new Error("Falha ao resolver as turmas atribuídas ao professor");

  const turmasPorUsuario = (data ?? [])
    .filter(
      (turma) =>
        String(turma.professor_usuario_id ?? turma.professor_id ?? "") === usuario.id
    )
    .map((turma) => String(turma.id));
  if (turmasPorUsuario.length > 0) {
    return { restrito: true, turmaIds: turmasPorUsuario };
  }

  const turmaIds = (data ?? [])
    .filter(
      (turma) =>
        typeof turma.professor_nome === "string" &&
        normalizarNomeProfessor(turma.professor_nome) === nomeUsuario
    )
    .map((turma) => String(turma.id));

  return { restrito: true, turmaIds };
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
