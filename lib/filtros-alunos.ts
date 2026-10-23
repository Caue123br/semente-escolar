import type { Aluno, Turma } from "./types";

type TurmaFiltro = Pick<Turma, "id" | "professorId" | "professorNome">;
type AlunoFiltro = Pick<Aluno, "nome" | "turmaId" | "bilingue" | "fichaSaude">;

export interface FiltrosAlunos {
  busca?: string;
  turmaFiltro?: string;
  professoraFiltro?: string;
  bilinguismo?: string;
  comAlergia?: boolean;
  buscaAlergia?: string;
}

export interface OpcaoProfessora {
  valor: string;
  nome: string;
}

/** A busca por "Ines" ou "amendoim" também encontra "Inês" e "AMÊNDOIM". */
export function normalizarBuscaAlunos(valor: string): string {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
}

export function chaveProfessoraTurma(turma: TurmaFiltro | undefined): string {
  const id = turma?.professorId?.trim();
  if (id) return `id:${id}`;
  const nome = normalizarBuscaAlunos(turma?.professorNome ?? "");
  return nome ? `nome:${nome}` : "sem-professora";
}

export function listarProfessorasTurmas(turmas: readonly TurmaFiltro[]): OpcaoProfessora[] {
  const professoras = new Map<string, OpcaoProfessora>();
  for (const turma of turmas) {
    const valor = chaveProfessoraTurma(turma);
    if (!professoras.has(valor)) {
      professoras.set(valor, {
        valor,
        nome: turma.professorNome?.trim() || (valor === "sem-professora" ? "Sem professora vinculada" : "Professora sem nome informado"),
      });
    }
  }
  return [...professoras.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function temAlertaSaude(aluno: Pick<Aluno, "fichaSaude">): boolean {
  return Boolean(aluno.fichaSaude?.alergias?.trim() || aluno.fichaSaude?.tratamentoMedicoSim);
}

/** Recebe apenas alunos e turmas já autorizados pela API; nunca consulta outra escola. */
export function filtrarAlunos<T extends AlunoFiltro>(
  alunos: readonly T[],
  turmas: readonly TurmaFiltro[],
  filtros: FiltrosAlunos = {}
): T[] {
  const busca = normalizarBuscaAlunos(filtros.busca ?? "");
  const alergia = normalizarBuscaAlunos(filtros.buscaAlergia ?? "");
  const turmasPorId = new Map(turmas.map((turma) => [turma.id, turma]));
  return alunos.filter((aluno) => {
    if (busca && !normalizarBuscaAlunos(aluno.nome).includes(busca)) return false;
    if (filtros.turmaFiltro && filtros.turmaFiltro !== "todas" && aluno.turmaId !== filtros.turmaFiltro) return false;
    if (filtros.professoraFiltro && filtros.professoraFiltro !== "todas") {
      const turma = turmasPorId.get(aluno.turmaId);
      if (chaveProfessoraTurma(turma) !== filtros.professoraFiltro) return false;
    }
    if (filtros.bilinguismo === "sim" && !aluno.bilingue) return false;
    if (filtros.bilinguismo === "nao" && aluno.bilingue) return false;
    if (filtros.comAlergia && !aluno.fichaSaude?.alergias?.trim()) return false;
    if (alergia && !normalizarBuscaAlunos(aluno.fichaSaude?.alergias ?? "").includes(alergia)) return false;
    return true;
  });
}
