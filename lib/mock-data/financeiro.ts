import type { FaturamentoMensal, Mensalidade } from "@/lib/types";
import { alunos } from "@/lib/mock-data/alunos";
import { turmas } from "@/lib/mock-data/turmas";

// ====== Faturamento histórico (últimos 12 meses) ======
export const faturamentoHistorico: FaturamentoMensal[] = [
  { mes: "Jul", ano: 2025, faturado: 198500, recebido: 184200, inadimplencia: 14300 },
  { mes: "Ago", ano: 2025, faturado: 201200, recebido: 191800, inadimplencia: 9400 },
  { mes: "Set", ano: 2025, faturado: 205800, recebido: 196200, inadimplencia: 9600 },
  { mes: "Out", ano: 2025, faturado: 208600, recebido: 199400, inadimplencia: 9200 },
  { mes: "Nov", ano: 2025, faturado: 211400, recebido: 198700, inadimplencia: 12700 },
  { mes: "Dez", ano: 2025, faturado: 219000, recebido: 207800, inadimplencia: 11200 },
  { mes: "Jan", ano: 2026, faturado: 224500, recebido: 215300, inadimplencia: 9200 },
  { mes: "Fev", ano: 2026, faturado: 228700, recebido: 218400, inadimplencia: 10300 },
  { mes: "Mar", ano: 2026, faturado: 231200, recebido: 220500, inadimplencia: 10700 },
  { mes: "Abr", ano: 2026, faturado: 233500, recebido: 219800, inadimplencia: 13700 },
  { mes: "Mai", ano: 2026, faturado: 236800, recebido: 215200, inadimplencia: 21600 },
  { mes: "Jun", ano: 2026, faturado: 241200, recebido: 198400, inadimplencia: 42800 },
];

// ====== Mensalidades (com inadimplência) ======
// Gerador de mensalidades brasileiras realistas
function valorMensalidade(turmaId: string, bilingue: boolean): number {
  const turma = turmas.find((t) => t.id === turmaId);
  if (!turma) return 1500;
  const base: Record<string, number> = {
    Berçário: 2890,
    "Maternal I": 2490,
    "Maternal II": 2390,
    "Jardim I": 2290,
    "Jardim II": 2290,
    "1º Ano": 2090,
    "2º Ano": 2090,
    "3º Ano": 2190,
    "4º Ano": 2190,
    "5º Ano": 2290,
  };
  let valor = base[turma.serie] ?? 2000;
  if (bilingue) valor += 580;
  if (turma.turno === "Integral") valor += 750;
  return valor;
}

// Gera mensalidade de junho/2026 para todos os alunos com status variado
export const mensalidadesJunho: Mensalidade[] = alunos.map((aluno, i) => {
  const turma = turmas.find((t) => t.id === aluno.turmaId)!;
  const valor = valorMensalidade(aluno.turmaId, aluno.bilingue);
  // Distribui status: maioria paga, alguns atrasados
  const statusPick = i % 7;
  let status: Mensalidade["status"];
  let diasAtraso = 0;
  let valorPago: number | undefined;
  let dataPagamento: string | undefined;
  let formaPagamento: Mensalidade["formaPagamento"] | undefined;

  if (statusPick === 0) {
    status = "Atrasada";
    diasAtraso = 25 + i * 2;
  } else if (statusPick === 1) {
    status = "Atrasada";
    diasAtraso = 10 + (i % 5);
  } else if (statusPick === 2) {
    status = "A Vencer";
  } else if (statusPick === 3) {
    status = "Renegociada";
    diasAtraso = 0;
  } else {
    status = "Paga";
    valorPago = valor;
    dataPagamento = `2026-06-0${(i % 9) + 1}`;
    formaPagamento = ["Pix", "Boleto", "Cartão"][i % 3] as Mensalidade["formaPagamento"];
  }

  return {
    id: `m-${aluno.id}-jun26`,
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    turmaNome: turma.nome,
    competencia: "2026-06",
    vencimento: "2026-06-05",
    valor,
    valorPago,
    dataPagamento,
    status,
    diasAtraso,
    formaPagamento,
  };
});

// Lista filtrada de inadimplentes (régua)
export const inadimplentes: Mensalidade[] = mensalidadesJunho
  .filter((m) => m.status === "Atrasada")
  .sort((a, b) => b.diasAtraso - a.diasAtraso);

// ====== Indicadores do mês ======
// Mensalidades ainda no prazo (status "A Vencer" + "Vence Hoje") — soma dos valores
const totalAReceberMensalidades = mensalidadesJunho
  .filter((m) => m.status === "A Vencer" || m.status === "Vence Hoje")
  .reduce((acc, m) => acc + m.valor, 0);

// Outras receitas pendentes (vendas a prazo, parcelas de matrícula nova, etc) — mock
const outrasReceitasAReceber = 8400;

export const totalAReceberMes = totalAReceberMensalidades + outrasReceitasAReceber;
export const totalRecebidoMes = faturamentoHistorico[faturamentoHistorico.length - 1].recebido;
export const totalInadimplenteMes =
  faturamentoHistorico[faturamentoHistorico.length - 1].inadimplencia;

// Faturado = recebido + a receber + inadimplência
export const totalFaturadoMes =
  totalRecebidoMes + totalAReceberMes + totalInadimplenteMes;

export const variacaoFaturamentoMesAnterior =
  ((totalFaturadoMes -
    faturamentoHistorico[faturamentoHistorico.length - 2].faturado) /
    faturamentoHistorico[faturamentoHistorico.length - 2].faturado) *
  100;
