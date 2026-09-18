import { diffDays } from "@/lib/utils";
import type { Mensalidade } from "@/lib/types";

/**
 * Critério único de "recebido" e "em aberto" do Financeiro.
 *
 * Todas as telas do mês (KPIs, DRE, fluxo de caixa, composição da receita,
 * conciliação, boletos, régua) leem daqui: dois números diferentes para o mesmo
 * mês em telas vizinhas não existe.
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
    (m) => m.status === "Atrasada" || (m.status === "Renegociada" && m.vencimento < hoje)
  );
  const aVencer = lista.filter(
    (m) =>
      m.status === "A Vencer" ||
      m.status === "Vence Hoje" ||
      (m.status === "Renegociada" && m.vencimento >= hoje)
  );
  return { atrasadas, aVencer };
}

/**
 * Dias de atraso a usar na cobrança. O contador gravado (`dias_atraso`) só é
 * alimentado enquanto o status é "Atrasada" — a renegociada chega com 0 mesmo
 * quando o novo vencimento já estourou. Nesse caso o atraso vem da data, senão
 * a cobrança mais antiga entraria na régua como "Recente".
 */
export function diasAtrasoDe(
  m: Pick<Mensalidade, "diasAtraso" | "vencimento">,
  hoje: string
): number {
  if (m.diasAtraso > 0) return m.diasAtraso;
  if (!m.vencimento || m.vencimento >= hoje) return 0;
  const dias = diffDays(m.vencimento, hoje);
  return Number.isFinite(dias) ? Math.max(0, dias) : 0;
}
