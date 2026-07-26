import type {
  Aluno,
  AvaliacaoBimestre,
  AvaliacaoPedagogica,
  NivelCompetencia,
  NivelPsicogenese,
} from "@/lib/types";
import { NIVEIS_PSICOGENESE } from "@/lib/types";

export type AvaliacaoCompleta = Omit<
  AvaliacaoPedagogica,
  | "leituraNivel"
  | "leitura"
  | "escrita"
  | "logicaMatematica"
  | "oralidade"
  | "observacao"
> &
  AvaliacaoBimestre;

const COMPETENCIAS = [
  "leitura",
  "escrita",
  "logicaMatematica",
  "oralidade",
] as const;

function competenciaValida(valor: number | null): valor is NivelCompetencia {
  return Number.isInteger(valor) && valor !== null && valor >= 1 && valor <= 4;
}

function nivelValido(valor: NivelPsicogenese | null): valor is NivelPsicogenese {
  return valor !== null && NIVEIS_PSICOGENESE.includes(valor);
}

export function avaliacaoEstaCompleta(
  avaliacao: AvaliacaoPedagogica
): avaliacao is AvaliacaoCompleta {
  return (
    nivelValido(avaliacao.leituraNivel) &&
    competenciaValida(avaliacao.leitura) &&
    competenciaValida(avaliacao.escrita) &&
    competenciaValida(avaliacao.logicaMatematica) &&
    competenciaValida(avaliacao.oralidade)
  );
}

export function avaliacoesDoAluno(
  avaliacoes: AvaliacaoPedagogica[],
  alunoId: string
): AvaliacaoCompleta[] {
  return avaliacoes
    .filter(
      (avaliacao): avaliacao is AvaliacaoCompleta =>
        avaliacao.alunoId === alunoId && avaliacaoEstaCompleta(avaliacao)
    )
    .sort((a, b) => a.ano - b.ano || a.bimestre - b.bimestre);
}

export function ultimasDuasAvaliacoes(avaliacoes: AvaliacaoCompleta[]): {
  atual?: AvaliacaoCompleta;
  anterior?: AvaliacaoCompleta;
} {
  return {
    atual: avaliacoes.at(-1),
    anterior: avaliacoes.at(-2),
  };
}

export function houveEvolucao(
  atual: AvaliacaoCompleta,
  anterior: AvaliacaoCompleta
): boolean {
  return COMPETENCIAS.some((competencia) => atual[competencia] > anterior[competencia]);
}

export function estaEstagnado(
  atual: AvaliacaoCompleta,
  anterior: AvaliacaoCompleta
): boolean {
  const todasMaximas = COMPETENCIAS.every((competencia) => atual[competencia] >= 4);
  return !houveEvolucao(atual, anterior) && !todasMaximas;
}

export function listarAlunosEstagnados(
  alunos: Aluno[],
  avaliacoes: AvaliacaoPedagogica[]
): Array<{ alunoId: string; alunoNome: string; turmaId: string }> {
  return alunos.flatMap((aluno) => {
    const { atual, anterior } = ultimasDuasAvaliacoes(
      avaliacoesDoAluno(avaliacoes, aluno.id)
    );
    return atual && anterior && estaEstagnado(atual, anterior)
      ? [{ alunoId: aluno.id, alunoNome: aluno.nome, turmaId: aluno.turmaId }]
      : [];
  });
}

export function ultimasAvaliacoesPorAluno(
  alunos: Aluno[],
  avaliacoes: AvaliacaoPedagogica[]
): AvaliacaoCompleta[] {
  return alunos.flatMap((aluno) => {
    const ultima = avaliacoesDoAluno(avaliacoes, aluno.id).at(-1);
    return ultima ? [ultima] : [];
  });
}
