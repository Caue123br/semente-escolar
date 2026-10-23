import "server-only";

import { formatBRL } from "@/lib/utils";
import { calcularEspelhos, idEspelho } from "@/lib/financeiro-espelho";
import { registrarAudit } from "./audit";
import type { DatabaseClient } from "./postgres";

export { idEspelho } from "@/lib/financeiro-espelho";

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

const mesLegivel = (competencia: string) => `${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`;

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
    .select("aluno_id, valor, valor_pago, vencimento, status, data_pagamento, forma_pagamento")
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

  const porCompetencia = new Map(
    [...calcularEspelhos(cobrancas ?? [], hoje).values()].map((linha) => [linha.competencia, linha])
  );

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
    .map(([competencia, a]) => ({
      ...a,
      id: idEspelho(alunoId, competencia),
      aluno_nome: aluno?.nome ? String(aluno.nome) : null,
      turma_nome: turmaNome,
    }));

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
