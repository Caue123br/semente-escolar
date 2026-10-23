/** Projeção derivada: os valores originais de cada cobrança continuam intactos. */
type Linha = Record<string, unknown>;
const cent = (v: unknown) => Math.round(Number(v ?? 0) * 100);
const competenciaValida = /^20\d{2}-(0[1-9]|1[0-2])$/;

export const idEspelho = (alunoId: string, competencia: string): string =>
  `mens-${alunoId}-${competencia}`;
export const chaveEspelho = (alunoId: unknown, competencia: unknown): string =>
  `${String(alunoId)}\u0000${String(competencia)}`;

export function calcularEspelhos(cobrancas: Linha[], hoje: string) {
  type Agregado = {
    alunoId: string; competencia: string; nominal: number; pago: number; aberto: number;
    vencimento: string; vencimentoAberto: string | null; tudoPago: boolean;
    dataPagamento: string | null; formaPagamento: string | null;
  };
  const agregados = new Map<string, Agregado>();
  for (const c of cobrancas) {
    const alunoId = String(c.aluno_id ?? "");
    const vencimento = String(c.vencimento ?? "").slice(0, 10);
    const competencia = vencimento.slice(0, 7);
    if (!alunoId || !competenciaValida.test(competencia)) continue;
    const chave = chaveEspelho(alunoId, competencia);
    const a = agregados.get(chave) ?? {
      alunoId, competencia, nominal: 0, pago: 0, aberto: 0, vencimento,
      vencimentoAberto: null, tudoPago: true, dataPagamento: null, formaPagamento: null,
    };
    a.nominal += cent(c.valor);
    if (vencimento < a.vencimento) a.vencimento = vencimento;
    const recebido = cent(c.valor_pago);
    a.pago += recebido;
    if (c.status === "Pago") {
      const data = c.data_pagamento ? String(c.data_pagamento).slice(0, 10) : null;
      if (data && (!a.dataPagamento || data > a.dataPagamento)) {
        a.dataPagamento = data;
        a.formaPagamento = c.forma_pagamento ? String(c.forma_pagamento) : null;
      }
    } else {
      a.tudoPago = false;
      a.aberto += Math.max(0, cent(c.valor) - recebido);
      if (!a.vencimentoAberto || vencimento < a.vencimentoAberto) a.vencimentoAberto = vencimento;
    }
    agregados.set(chave, a);
  }
  return new Map([...agregados].map(([chave, a]) => {
    const recebido = a.pago > 0;
    const quitada = a.tudoPago && recebido;
    const referencia = a.vencimentoAberto ?? a.vencimento;
    const status = quitada ? "Paga" : referencia < hoje ? "Atrasada" : referencia === hoje ? "Vence Hoje" : "A Vencer";
    return [chave, {
      aluno_id: a.alunoId,
      competencia: a.competencia,
      vencimento: referencia,
      // Em competência mista, valor - recebido precisa ser o saldo dos itens
      // abertos. Desconto/juros de item quitado não pertencem à dívida restante.
      // Sem baixa registrada, conserva o nominal legado e não inventa receita.
      valor: (a.tudoPago ? a.nominal : a.pago + a.aberto) / 100,
      valor_pago: recebido ? a.pago / 100 : null,
      data_pagamento: recebido ? a.dataPagamento : null,
      forma_pagamento: recebido ? a.formaPagamento : null,
      status,
      dias_atraso: status === "Atrasada" ? Math.max(0, Math.round((Date.parse(`${hoje}T00:00:00Z`) - Date.parse(`${referencia}T00:00:00Z`)) / 86_400_000)) : 0,
    }];
  }));
}

/** Repara só a leitura de linhas já existentes, sem escrever ou alterar manuais. */
export function projetarEspelhos(linhas: Linha[], cobrancas: Linha[], hoje: string): Linha[] {
  const espelhos = calcularEspelhos(cobrancas, hoje);
  return linhas.map((linha) => {
    if (String(linha.id) !== idEspelho(String(linha.aluno_id), String(linha.competencia))) return linha;
    const atual = espelhos.get(chaveEspelho(linha.aluno_id, linha.competencia));
    return atual ? { ...linha, ...atual } : linha;
  });
}
