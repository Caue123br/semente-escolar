import { diffDays } from "@/lib/utils";
import type { Cobranca, Mensalidade } from "@/lib/types";

/**
 * Critério único de "recebido" e "em aberto" do Financeiro.
 *
 * KPIs/DRE reconhecem mensalidades por competência; caixa/conciliação usam a
 * data efetiva de recebimento. Matrículas vêm exclusivamente de cobranças.
 * Os dois recortes compartilham o valor recebido e nunca duplicam o espelho.
 *
 * O espelho das cobranças (app.mensalidades) grava valor_pago na competência
 * mesmo quando ela ainda não está toda quitada — mês com uma parcela paga e
 * saldo em aberto fica com status "A Vencer"/"Atrasada" e valor_pago > 0. Por
 * isso o recebido soma valor_pago de qualquer status, e o que falta entrar é
 * sempre valor − valor_pago.
 */
export type MensalidadeValores = Pick<Mensalidade, "status" | "valor" | "valorPago">;

/** Quanto desta mensalidade já entrou no caixa. */
export const recebidoDe = (m: MensalidadeValores): number =>
  m.status === "Paga" ? m.valorPago ?? m.valor : m.valorPago ?? 0;

/**
 * Quanto desta mensalidade a família ainda deve. Competência quitada não tem
 * saldo — mesmo quando foi quitada com abatimento e o valor pago ficou abaixo do
 * faturado.
 */
export const emAbertoDe = (m: MensalidadeValores): number =>
  m.status === "Paga" ? 0 : Math.max(0, m.valor - (m.valorPago ?? 0));

export const somaRecebida = (lista: MensalidadeValores[]): number =>
  lista.reduce((a, m) => a + recebidoDe(m), 0);

export const somaEmAberto = (lista: MensalidadeValores[]): number =>
  lista.reduce((a, m) => a + emAbertoDe(m), 0);

/**
 * Uma mensalidade renegociada continua sendo dívida: ela entra em "a receber"
 * enquanto o novo vencimento não chegar e em "inadimplência" depois disso.
 * Antes ela ficava fora dos dois indicadores e a dívida desaparecia da tela.
 */
export function dividaEmAberto<T extends MensalidadeValores & Pick<Mensalidade, "vencimento">>(
  lista: T[],
  hoje: string
): { atrasadas: T[]; aVencer: T[] } {
  const atrasadas = lista.filter(
    (m) => emAbertoDe(m) > 0 && m.vencimento < hoje
  );
  const aVencer = lista.filter((m) => emAbertoDe(m) > 0 && m.vencimento >= hoje);
  return { atrasadas, aVencer };
}

/**
 * O contador gravado é uma fotografia antiga. Derive sempre da data atual,
 * inclusive depois de uma renegociação, para não congelar o atraso.
 */
export function diasAtrasoDe(
  m: Pick<Mensalidade, "diasAtraso" | "vencimento">,
  hoje: string
): number {
  if (!m.vencimento || m.vencimento >= hoje) return 0;
  const dias = diffDays(m.vencimento, hoje);
  return Number.isFinite(dias) ? Math.max(0, dias) : 0;
}

/** Atualiza a projeção de leitura; renegociação mantém seu rótulo e vence normalmente. */
export function mensalidadeAtualizada<T extends Mensalidade>(m: T, hoje: string): T {
  if (m.status === "Paga") return { ...m, diasAtraso: 0 };
  const diasAtraso = diasAtrasoDe(m, hoje);
  const status = m.status === "Renegociada" ? m.status
    : m.vencimento < hoje ? "Atrasada" : m.vencimento === hoje ? "Vence Hoje" : "A Vencer";
  return { ...m, status, diasAtraso };
}

export function cobrancaAtualizada<T extends Cobranca>(c: T, hoje: string): T {
  return c.status === "Pago" ? c : { ...c, status: c.vencimento < hoje ? "Atrasada" : "Pendente" };
}

const recebidoCobranca = (c: Cobranca) => c.status === "Pago" ? c.valorPago ?? c.valor : c.valorPago ?? 0;
export const emAbertoCobranca = (c: Cobranca) => c.status === "Pago" ? 0 : Math.max(0, c.valor - (c.valorPago ?? 0));
const mesRecebimento = (c: Cobranca) => (c.dataPagamento ?? c.vencimento).slice(0, 7);

/** Mensalidades consolidadas + matrícula, nunca a mensalidade e seu espelho juntos. */
export function resumoFinanceiro(mensalidades: Mensalidade[], cobrancas: Cobranca[], competencia: string, hoje: string) {
  const doMes = mensalidades.filter((m) => m.competencia === competencia);
  const matriculasDoMes = cobrancas.filter((c) => c.tipo === "matricula" && c.vencimento.slice(0, 7) === competencia);
  const { atrasadas, aVencer } = dividaEmAberto(doMes, hoje);
  const matriculasAtrasadas = matriculasDoMes.filter((c) => emAbertoCobranca(c) > 0 && c.vencimento < hoje);
  const matriculasAVencer = matriculasDoMes.filter((c) => emAbertoCobranca(c) > 0 && c.vencimento >= hoje);
  const recebidoMensalidades = somaRecebida(doMes);
  const recebidoMatriculas = cobrancas.filter((c) => c.tipo === "matricula" && mesRecebimento(c) === competencia).reduce((s, c) => s + recebidoCobranca(c), 0);
  return {
    recebidoMensalidades, recebidoMatriculas,
    recebido: recebidoMensalidades + recebidoMatriculas,
    faturado: doMes.reduce((s, m) => s + m.valor, 0) + matriculasDoMes.reduce((s, c) => s + c.valor, 0),
    aReceber: somaEmAberto(aVencer) + matriculasAVencer.reduce((s, c) => s + emAbertoCobranca(c), 0),
    inadimplencia: somaEmAberto(atrasadas) + matriculasAtrasadas.reduce((s, c) => s + emAbertoCobranca(c), 0),
    parcelasNoPrazo: aVencer.length + matriculasAVencer.length,
    familiasEmAtraso: new Set([...atrasadas, ...matriculasAtrasadas].map((m) => m.alunoId)).size,
    quantidadeMatriculas: matriculasDoMes.length,
  };
}

export type RecebimentoFinanceiro = {
  id: string; data: string; valor: number; tipo: "mensalidade" | "matricula";
  alunoId: string; alunoNome: string; formaPagamento?: string; competencia: string;
};

/**
 * Caixa usa o mês do recebimento. Só detalha parcelas de uma mensalidade quando
 * elas explicam exatamente o recebido do espelho; manuais/legadas usam a própria
 * baixa, com competência como fallback quando não há data legada.
 */
export function recebimentosFinanceiros(mensalidades: Mensalidade[], cobrancas: Cobranca[]): RecebimentoFinanceiro[] {
  const resultado: RecebimentoFinanceiro[] = [];
  const porEspelho = new Map<string, Cobranca[]>();
  for (const c of cobrancas) {
    if (c.tipo !== "mensalidade" || recebidoCobranca(c) <= 0) continue;
    const chave = `mens-${c.alunoId}-${c.vencimento.slice(0, 7)}`;
    const parcelas = porEspelho.get(chave) ?? [];
    parcelas.push(c);
    porEspelho.set(chave, parcelas);
  }
  for (const m of mensalidades) {
    const valor = recebidoDe(m);
    if (valor <= 0) continue;
    const parcelas = m.id === `mens-${m.alunoId}-${m.competencia}` ? porEspelho.get(m.id) : undefined;
    if (parcelas && Math.round(parcelas.reduce((s, c) => s + recebidoCobranca(c), 0) * 100) === Math.round(valor * 100)) {
      for (const c of parcelas) resultado.push({ id: `mens:${c.id}`, data: c.dataPagamento ?? c.vencimento, valor: recebidoCobranca(c), tipo: "mensalidade", alunoId: m.alunoId, alunoNome: m.alunoNome, formaPagamento: c.formaPagamento, competencia: m.competencia });
    } else {
      resultado.push({ id: `mens:${m.id}`, data: m.dataPagamento ?? `${m.competencia}-01`, valor, tipo: "mensalidade", alunoId: m.alunoId, alunoNome: m.alunoNome, formaPagamento: m.formaPagamento, competencia: m.competencia });
    }
  }
  for (const c of cobrancas) {
    if (c.tipo !== "matricula" || recebidoCobranca(c) <= 0) continue;
    resultado.push({ id: `mat:${c.id}`, data: c.dataPagamento ?? c.vencimento, valor: recebidoCobranca(c), tipo: "matricula", alunoId: c.alunoId, alunoNome: mensalidades.find((m) => m.alunoId === c.alunoId)?.alunoNome ?? c.descricao, formaPagamento: c.formaPagamento, competencia: c.vencimento.slice(0, 7) });
  }
  return resultado;
}
