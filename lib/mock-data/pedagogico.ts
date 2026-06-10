import type { AvaliacaoBimestre, NivelPsicogenese, PedagogicoAluno } from "@/lib/types";
import { alunos } from "@/lib/mock-data/alunos";
import { turmas } from "@/lib/mock-data/turmas";
import type { SerieEnum } from "@/lib/types";

// Converte nivel de psicogênese para escala 1-4 (usado em gráficos)
export const nivelPsicogeneseParaNumero: Record<NivelPsicogenese, number> = {
  "Pré-silábico": 1,
  Silábico: 2,
  "Silábico-alfabético": 3,
  Alfabético: 4,
};

const NIVEIS_PSICO: NivelPsicogenese[] = [
  "Pré-silábico",
  "Silábico",
  "Silábico-alfabético",
  "Alfabético",
];

// Nível inicial esperado no início do ano por série (realista BR)
const NIVEL_INICIAL_POR_SERIE: Record<SerieEnum, number> = {
  Berçário: 0,
  "Maternal I": 0,
  "Maternal II": 0,
  "Jardim I": 0,
  "Jardim II": 1,
  "1º Ano": 1,
  "2º Ano": 2,
  "3º Ano": 3,
  "4º Ano": 3,
  "5º Ano": 3,
};

// Velocidade de evolução por série (0=devagar, 1=normal, 2=rápida)
const VELOCIDADE_POR_SERIE: Record<SerieEnum, number> = {
  Berçário: 0,
  "Maternal I": 0,
  "Maternal II": 0,
  "Jardim I": 1,
  "Jardim II": 1,
  "1º Ano": 2,
  "2º Ano": 1,
  "3º Ano": 1,
  "4º Ano": 0,
  "5º Ano": 0,
};

// IDs de alunos estagnados (para gerar alerta)
const ALUNOS_ESTAGNADOS_IDS = new Set(["a2", "a8", "a14"]);

function gerarAvaliacoesMock(alunoId: string, idx: number, ano = 2026): AvaliacaoBimestre[] {
  const aluno = alunos.find((a) => a.id === alunoId)!;
  const turma = turmas.find((t) => t.id === aluno.turmaId)!;
  const stuck = ALUNOS_ESTAGNADOS_IDS.has(alunoId);

  const nivelInicial = NIVEL_INICIAL_POR_SERIE[turma.serie];
  const velocidade = VELOCIDADE_POR_SERIE[turma.serie];

  // Variação individual: alguns alunos avançam um pouco mais lento ou rápido
  const variacao = (idx % 3) - 1; // -1, 0 ou 1

  let leituraIdx = Math.max(0, Math.min(3, nivelInicial + (idx % 2 === 0 ? 0 : -1)));
  if (leituraIdx < 0) leituraIdx = 0;

  let escrita: 1 | 2 | 3 | 4 = (Math.max(1, Math.min(4, leituraIdx + 1)) as 1 | 2 | 3 | 4);
  let logica: 1 | 2 | 3 | 4 = (Math.max(1, Math.min(4, leituraIdx + 1 + (variacao > 0 ? 1 : 0))) as 1 | 2 | 3 | 4);
  let oralidade: 1 | 2 | 3 | 4 = (Math.max(2, Math.min(4, leituraIdx + 2)) as 1 | 2 | 3 | 4);

  const bims: AvaliacaoBimestre[] = [];

  for (let bim = 1; bim <= 4; bim++) {
    if (bim > 1 && !stuck) {
      // Evolução baseada na velocidade da série
      const evolui = velocidade >= 1 || (velocidade === 0 && bim === 4);
      if (evolui && leituraIdx < 3) {
        if (velocidade === 2 || bim >= 3) {
          leituraIdx = Math.min(3, leituraIdx + 1);
        }
      }
      if (escrita < 4) escrita = Math.min(4, escrita + 1) as 1 | 2 | 3 | 4;
      if (logica < 4) logica = Math.min(4, logica + 1) as 1 | 2 | 3 | 4;
      if (oralidade < 4 && bim === 4) oralidade = Math.min(4, oralidade + 1) as 1 | 2 | 3 | 4;
    }

    bims.push({
      bimestre: bim as 1 | 2 | 3 | 4,
      ano,
      leituraNivel: NIVEIS_PSICO[leituraIdx],
      leitura: ((leituraIdx + 1) as 1 | 2 | 3 | 4),
      escrita,
      logicaMatematica: logica,
      oralidade,
      observacao:
        bim === 2
          ? stuck
            ? "Aluno apresentou estagnação no bimestre. Necessita acompanhamento individual e reunião com a família."
            : turma.serie === "Berçário" || turma.serie === "Maternal I"
            ? "Desenvolvimento dentro do esperado para a faixa etária."
            : "Bom desempenho. Continua avançando nas competências."
          : undefined,
    });
  }
  return bims;
}

export const pedagogicoPorAluno: PedagogicoAluno[] = alunos.map((aluno, idx) => ({
  alunoId: aluno.id,
  avaliacoes: gerarAvaliacoesMock(aluno.id, idx),
}));

export function getPedagogicoAluno(alunoId: string): PedagogicoAluno | undefined {
  return pedagogicoPorAluno.find((p) => p.alunoId === alunoId);
}

// Para o protótipo consideramos o "atual" como o 2º bimestre (junho/2026)
const BIM_ATUAL = 2;

// Alunos com estagnação: bim atual vs anterior — nenhuma das 4 competências evoluiu
// E não estão no nível máximo em todas competências (estes não têm pra onde subir)
export function alunosEstagnados(): { alunoId: string; alunoNome: string; turmaId: string }[] {
  const result: { alunoId: string; alunoNome: string; turmaId: string }[] = [];
  for (const ped of pedagogicoPorAluno) {
    const av = ped.avaliacoes;
    if (av.length < BIM_ATUAL) continue;
    const atual = av[BIM_ATUAL - 1];
    const anterior = av[BIM_ATUAL - 2];
    const cs: (keyof AvaliacaoBimestre)[] = ["leitura", "escrita", "logicaMatematica", "oralidade"];
    const evoluiu = cs.some((c) => (atual[c] as number) > (anterior[c] as number));
    // Aluno "pleno" (todas competências em 4) não conta como estagnado
    const todasMaximas = cs.every((c) => (atual[c] as number) >= 4);
    if (!evoluiu && !todasMaximas) {
      const aluno = alunos.find((a) => a.id === ped.alunoId);
      if (aluno) {
        result.push({ alunoId: aluno.id, alunoNome: aluno.nome, turmaId: aluno.turmaId });
      }
    }
  }
  return result;
}

// Retorna a avaliação "atual" (2º bimestre de 2026) e a anterior (1º bim)
export function getAvaliacoesAtuais(alunoId: string): {
  atual?: AvaliacaoBimestre;
  anterior?: AvaliacaoBimestre;
} {
  const ped = getPedagogicoAluno(alunoId);
  if (!ped) return {};
  return {
    atual: ped.avaliacoes[BIM_ATUAL - 1],
    anterior: ped.avaliacoes[BIM_ATUAL - 2],
  };
}
