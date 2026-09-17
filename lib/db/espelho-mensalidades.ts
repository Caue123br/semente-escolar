import "server-only";

import { formatBRL } from "@/lib/utils";
import { registrarAudit } from "./audit";
import type { DatabaseClient } from "./postgres";

/**
 * Espelho das cobranças de mensalidade em app.mensalidades — é de lá que o
 * Financeiro (DRE, KPIs, fluxo de caixa, régua de inadimplência) lê. Uma linha
 * por competência, porque é o que mensalidades_aluno_competencia_unique admite.
 *
 * Depende da migration 0007 (mensalidades_pagamento_registrado): sem ela vale a
 * regra antiga, que exigia valor pago exatamente igual ao previsto, e toda baixa
 * com bolsa, desconto ou multa é recusada pelo banco (ver MENSAGEM_ESPELHO_RECUSADO).
 */

const COMPETENCIA = /^20\d{2}-(0[1-9]|1[0-2])$/;

const cent = (v: unknown) => Math.round(Number(v ?? 0) * 100);
const reais = (centavos: number) => centavos / 100;
const competenciaDe = (vencimento: unknown) => String(vencimento ?? "").slice(0, 7);
const diasEntre = (de: string, ate: string) =>
  Math.max(0, Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000));
const mesLegivel = (competencia: string) => `${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`;

/**
 * Id determinístico da linha do espelho. Só a linha com este id pertence às
 * cobranças do aluno; qualquer outra foi lançada na aba Mensalidades e não pode
 * ser reescrita nem apagada por aqui.
 */
export function idEspelho(alunoId: string, competencia: string): string {
  return `mens-${alunoId}-${competencia}`;
}

/** A linha de app.mensalidades é o espelho das cobranças (e não um lançamento manual). */
export function ehLinhaDoEspelho(linha: Record<string, unknown>): boolean {
  return String(linha.id) === idEspelho(String(linha.aluno_id), String(linha.competencia));
}

export const MENSAGEM_LINHA_DO_ESPELHO =
  "A mensalidade deste mês vem das cobranças da ficha financeira do aluno. Registre o recebimento, a renegociação ou a exclusão por lá — o que fosse alterado aqui seria desfeito na próxima atualização das cobranças.";

export const MENSAGEM_ESPELHO_RECUSADO =
  "O Financeiro não aceitou atualizar a mensalidade deste mês e nada foi gravado: a atualização do banco que libera valor recebido diferente do previsto ainda não foi aplicada. Avise o suporte e tente de novo.";

/**
 * O mês do aluno já tem lançamento próprio na aba Mensalidades.
 *
 * A recusa é por posse do id (só a linha com `idEspelho` pertence às
 * cobranças), não por status: ajustar valor ou dar baixa no lançamento manual
 * não libera a operação — a única saída é excluir a linha.
 *
 * TODO(ui-financeiro): a aba Mensalidades ainda não tem exclusão
 * (components/financeiro/mensalidades-table.tsx só usa `update`), então hoje
 * esse recado só é cumprível por DELETE em /api/mensalidades/[id]. Precisa do
 * botão de excluir lançamento manual na tela.
 */
export class ConflitoEspelho extends Error {
  constructor(
    readonly competencia: string,
    readonly statusExistente: string
  ) {
    super(
      `Nada foi alterado: o mês ${mesLegivel(competencia)} deste aluno já tem mensalidade lançada na aba Mensalidades (${statusExistente}). Exclua esse lançamento por lá e repita a operação.`
    );
    this.name = "ConflitoEspelho";
  }
}

/** Distingue a falha de banco vinda do espelho da vinda da própria cobrança. */
export function ehFalhaDoEspelho(erro: unknown): boolean {
  return Boolean(
    erro && typeof erro === "object" && (erro as { origem?: string }).origem === "espelho"
  );
}

function falhaDoEspelho(erro: { message: string; code?: string }): Error {
  return Object.assign(new Error(erro.message), { code: erro.code, origem: "espelho" });
}

export type LinhaEspelhoRemovida = {
  id: string;
  competencia: string;
  valor: number;
  valorPago: number | null;
  status: string;
};

/**
 * Auditoria da linha do espelho que a operação deixou sem cobrança por trás —
 * receita saindo do Financeiro é registro que precisa de prova. Chame depois do
 * commit: a auditoria não participa da transação.
 */
export async function registrarEspelhoRemovido(
  alunoId: string,
  motivo: string,
  removidas: LinhaEspelhoRemovida[]
): Promise<void> {
  if (removidas.length === 0) return;
  await registrarAudit("excluir", "mensalidades", alunoId, {
    motivo,
    antes: Object.fromEntries(
      removidas.map((linha) => [
        linha.id,
        `${linha.competencia} · ${formatBRL(linha.valor)} · ${linha.status}${
          linha.valorPago == null ? "" : ` · recebido ${formatBRL(linha.valorPago)}`
        }`,
      ])
    ),
  });
}

/**
 * Regrava as linhas do espelho do aluno a partir das cobranças de mensalidade e
 * remove as competências que ficaram sem nenhuma cobrança.
 * `competenciasAfetadas` são os meses que a operação mexeu — é onde a limpeza
 * procura linha órfã.
 * Devolve as linhas removidas, para a rota registrar na auditoria depois do commit.
 */
export async function sincronizarEspelho(
  tx: DatabaseClient,
  alunoId: string,
  hoje: string,
  competenciasAfetadas: string[]
): Promise<LinhaEspelhoRemovida[]> {
  const { data: cobrancas, error } = await tx
    .from("cobrancas")
    .select("valor, valor_pago, vencimento, status, data_pagamento, forma_pagamento")
    .eq("aluno_id", alunoId)
    .eq("tipo", "mensalidade");
  if (error) throw falhaDoEspelho(error);

  const { data: aluno } = await tx
    .from("alunos")
    .select("nome, turma_id")
    .eq("id", alunoId)
    .maybeSingle();
  let turmaNome: string | null = null;
  if (aluno?.turma_id) {
    const { data: turma } = await tx
      .from("turmas")
      .select("nome")
      .eq("id", String(aluno.turma_id))
      .maybeSingle();
    turmaNome = turma?.nome ? String(turma.nome) : null;
  }

  type Agregado = {
    valorCent: number;
    pagoCent: number;
    vencimento: string;
    vencimentoAberto: string | null;
    dataPagamento: string | null;
    formaPagamento: string | null;
    tudoPago: boolean;
  };
  const porCompetencia = new Map<string, Agregado>();
  for (const c of cobrancas ?? []) {
    const vencimento = String(c.vencimento ?? "").slice(0, 10);
    const competencia = competenciaDe(vencimento);
    if (!COMPETENCIA.test(competencia)) continue;
    const a: Agregado = porCompetencia.get(competencia) ?? {
      valorCent: 0,
      pagoCent: 0,
      vencimento,
      vencimentoAberto: null,
      dataPagamento: null,
      formaPagamento: null,
      tudoPago: true,
    };
    a.valorCent += cent(c.valor);
    if (vencimento < a.vencimento) a.vencimento = vencimento;
    if (c.status === "Pago") {
      a.pagoCent += cent(c.valor_pago);
      const dataPagamento = c.data_pagamento ? String(c.data_pagamento).slice(0, 10) : null;
      if (dataPagamento && (!a.dataPagamento || dataPagamento > a.dataPagamento)) {
        a.dataPagamento = dataPagamento;
        a.formaPagamento = c.forma_pagamento ? String(c.forma_pagamento) : null;
      }
    } else {
      a.tudoPago = false;
      if (!a.vencimentoAberto || vencimento < a.vencimentoAberto) a.vencimentoAberto = vencimento;
    }
    porCompetencia.set(competencia, a);
  }

  const vazias = competenciasAfetadas.filter(
    (competencia) => COMPETENCIA.test(competencia) && !porCompetencia.has(competencia)
  );
  const competencias = [...new Set([...porCompetencia.keys(), ...vazias])];
  if (competencias.length === 0) return [];

  const { data: existentesRaw, error: erroLeitura } = await tx
    .from("mensalidades")
    .select("id, competencia, valor, valor_pago, status")
    .eq("aluno_id", alunoId)
    .in("competencia", competencias);
  if (erroLeitura) throw falhaDoEspelho(erroLeitura);
  const existentes = new Map(
    (existentesRaw ?? []).map((linha) => [String(linha.competencia), linha])
  );

  // Linha de outro id foi lançada na aba Mensalidades: o upsert por
  // (aluno_id, competencia) reescreveria valor, status e baixa dela, apagando o
  // pagamento ou a renegociação registrados por lá. Se é um dos meses que a
  // operação mexeu, a operação inteira para aqui com o recado; mês só de
  // passagem fica como está — quem manda nele é a aba Mensalidades.
  const afetadas = new Set(competenciasAfetadas);
  const foraDoEspelho = new Set<string>();
  for (const competencia of porCompetencia.keys()) {
    const atual = existentes.get(competencia);
    if (!atual || String(atual.id) === idEspelho(alunoId, competencia)) continue;
    if (afetadas.has(competencia)) throw new ConflitoEspelho(competencia, String(atual.status));
    foraDoEspelho.add(competencia);
  }

  const linhas = [...porCompetencia]
    .filter(([competencia]) => !foraDoEspelho.has(competencia))
    .map(([competencia, a]) => {
      // Competência só fica "Paga" com dinheiro registrado: baixa legada de
      // valor zero viraria 'Paga' sem valor pago, o banco recusaria a linha e a
      // ficha do aluno ficaria impossível de operar.
      const recebido = a.pagoCent > 0;
      const quitada = a.tudoPago && recebido;
      const referencia = a.vencimentoAberto ?? a.vencimento;
      const status = quitada
        ? "Paga"
        : referencia < hoje
          ? "Atrasada"
          : referencia === hoje
            ? "Vence Hoje"
            : "A Vencer";
      return {
        id: idEspelho(alunoId, competencia),
        aluno_id: alunoId,
        aluno_nome: aluno?.nome ? String(aluno.nome) : null,
        turma_nome: turmaNome,
        competencia,
        vencimento: a.vencimento,
        valor: reais(a.valorCent),
        valor_pago: recebido ? reais(a.pagoCent) : null,
        data_pagamento: recebido ? a.dataPagamento : null,
        status,
        dias_atraso: status === "Atrasada" ? diasEntre(referencia, hoje) : 0,
        forma_pagamento: recebido ? a.formaPagamento : null,
      };
    });

  if (linhas.length > 0) {
    const { error: erroEspelho } = await tx
      .from("mensalidades")
      .upsert(linhas, { onConflict: "aluno_id,competencia" });
    if (erroEspelho) throw falhaDoEspelho(erroEspelho);
  }

  // Competência que ficou sem nenhuma cobrança não pode continuar somando no
  // Financeiro — inclusive quando estava quitada, senão a receita fica para
  // sempre no DRE sem cobrança por trás. Linha de outro id não é do espelho e
  // fica como está.
  const removidas: LinhaEspelhoRemovida[] = [];
  for (const competencia of vazias) {
    const atual = existentes.get(competencia);
    if (!atual || String(atual.id) !== idEspelho(alunoId, competencia)) continue;
    removidas.push({
      id: String(atual.id),
      competencia,
      valor: Number(atual.valor),
      valorPago: atual.valor_pago == null ? null : Number(atual.valor_pago),
      status: String(atual.status),
    });
  }
  if (removidas.length > 0) {
    const { error: erroLimpeza } = await tx
      .from("mensalidades")
      .delete()
      .eq("aluno_id", alunoId)
      .in(
        "id",
        removidas.map((linha) => linha.id)
      );
    if (erroLimpeza) throw falhaDoEspelho(erroLimpeza);
  }

  return removidas;
}
