import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/db/postgres";
import { erroAPI, erros } from "@/lib/db/api-response";
import { registrarAudit } from "@/lib/db/audit";
import {
  ConflitoEspelho,
  MENSAGEM_ESPELHO_RECUSADO,
  ehFalhaDoEspelho,
  registrarEspelhoRemovido,
  sincronizarEspelho,
  type LinhaEspelhoRemovida,
} from "@/lib/db/espelho-mensalidades";
import { formatBRL, formatDateLocalISO } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
  descricao: "descricao",
  valor: "valor",
  vencimento: "vencimento",
  status: "status",
  valorPago: "valor_pago",
  dataPagamento: "data_pagamento",
  formaPagamento: "forma_pagamento",
};

const cent = (v: unknown) => Math.round(Number(v ?? 0) * 100);
const reais = (centavos: number) => centavos / 100;
const competenciaDe = (vencimento: unknown) => String(vencimento ?? "").slice(0, 7);

function temCampo(objeto: Record<string, unknown>, campo: string): boolean {
  return Object.prototype.hasOwnProperty.call(objeto, campo);
}

// "Mensalidade Set/2026 — saldo restante" já parcial de novo não vira
// "— saldo restante — saldo restante".
const descricaoBase = (descricao: unknown) =>
  String(descricao ?? "").replace(/( — saldo restante)+$/, "");

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let patch: Record<string, unknown>;
  try {
    const body = (await req.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return erros.dadosInvalidos("corpo da requisição");
    }
    patch = body as Record<string, unknown>;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = MAPA[k];
    if (col) update[col] = v;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

  const sb = getDatabase();
  const { data: atual, error: erroBusca } = await sb
    .from("cobrancas")
    .select(
      "aluno_id, tipo, descricao, valor, valor_pago, vencimento, status, data_pagamento, forma_pagamento, parcela_num, parcela_total"
    )
    .eq("id", id)
    .maybeSingle();
  if (erroBusca) return erros.servidorIndisponivel(erroBusca);
  if (!atual) return erros.naoEncontrado("Cobrança");

  if (temCampo(update, "valor") && !(cent(update.valor) > 0)) {
    return erroAPI("O valor da cobrança precisa ser maior que zero.", 400);
  }

  const statusFinal = temCampo(update, "status") ? update.status : atual.status;
  // Só mexe na baixa quando a requisição realmente altera o pagamento — editar
  // a descrição de uma cobrança já paga não recalcula nada.
  const registrandoPagamento =
    statusFinal === "Pago" &&
    (temCampo(update, "status") || temCampo(update, "valor_pago") || temCampo(update, "valor"));

  const hoje = formatDateLocalISO();
  let residual: Record<string, unknown> | null = null;

  if (registrandoPagamento) {
    const pagoCent = cent(temCampo(update, "valor_pago") ? update.valor_pago : atual.valor_pago);
    if (!(pagoCent > 0)) {
      return erroAPI("Informe o valor recebido para registrar o pagamento.", 400);
    }
    const dataPagamento = temCampo(update, "data_pagamento")
      ? update.data_pagamento
      : atual.data_pagamento;
    const formaPagamento = temCampo(update, "forma_pagamento")
      ? update.forma_pagamento
      : atual.forma_pagamento;
    if (
      typeof dataPagamento !== "string" || !dataPagamento.trim() ||
      typeof formaPagamento !== "string" || !formaPagamento.trim()
    ) {
      return erroAPI(
        "Informe a data e a forma de pagamento para quitar a cobrança.",
        400
      );
    }

    // Recebido diferente do previsto é rotina (bolsa, desconto de pontualidade,
    // multa, arredondamento): a baixa é registrada pelo valor recebido.
    const devidoCent = cent(temCampo(update, "valor") ? update.valor : atual.valor);
    const faltaCent = devidoCent - pagoCent;
    update.valor_pago = reais(pagoCent);
    update.data_pagamento = dataPagamento;
    update.forma_pagamento = formaPagamento;

    if (faltaCent > 0 && patch.quitarComDesconto !== true) {
      // Recebimento parcial: a parte recebida é quitada e o saldo continua em
      // aberto, senão a diferença desapareceria da inadimplência. Para quitar
      // o total com abatimento, envie `quitarComDesconto: true`.
      update.valor = reais(pagoCent);
      const vencimento = String(atual.vencimento ?? "").slice(0, 10);
      residual = {
        id: `cob-${randomUUID()}`,
        aluno_id: String(atual.aluno_id),
        tipo: String(atual.tipo),
        descricao: `${descricaoBase(atual.descricao)} — saldo restante`,
        valor: reais(faltaCent),
        vencimento,
        status: vencimento < hoje ? "Atrasada" : "Pendente",
        parcela_num: atual.parcela_num ?? null,
        parcela_total: atual.parcela_total ?? null,
      };
    }
  } else if (temCampo(update, "status") && statusFinal !== "Pago") {
    // Reversão de pagamento: não deixar valor_pago/data/forma órfãos na linha.
    update.valor_pago = null;
    update.data_pagamento = null;
    update.forma_pagamento = null;
  }

  const alunoId = String(atual.aluno_id);
  const competenciasAfetadas = [
    ...new Set([
      competenciaDe(atual.vencimento),
      competenciaDe(temCampo(update, "vencimento") ? update.vencimento : atual.vencimento),
    ]),
  ];

  let resultado: { saldoId: string | null; espelhoRemovido: LinhaEspelhoRemovida[] };
  try {
    resultado = await sb.transaction(async (tx) => {
      const { data: alterada, error } = await tx
        .from("cobrancas")
        .update(update)
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw Object.assign(new Error(error.message), { code: error.code });
      if (!alterada) throw Object.assign(new Error("cobrança não encontrada"), { code: "404" });

      let saldoId: string | null = null;
      if (residual) {
        // A mesma baixa parcial chegando duas vezes (retry, duplo clique) criaria
        // um segundo "saldo restante" no mesmo vencimento. Havendo irmã em
        // aberto, o saldo é ajustado nela.
        const { data: irmas, error: erroIrmas } = await tx
          .from("cobrancas")
          .select("id")
          .eq("aluno_id", alunoId)
          .eq("tipo", String(residual.tipo))
          .eq("vencimento", String(residual.vencimento))
          .eq("descricao", String(residual.descricao))
          .in("status", ["Pendente", "Atrasada"]);
        if (erroIrmas) throw new Error(erroIrmas.message);
        const irma = (irmas ?? []).find((c) => String(c.id) !== id);

        if (irma) {
          saldoId = String(irma.id);
          const { error: erroAjuste } = await tx
            .from("cobrancas")
            .update({ valor: residual.valor })
            .eq("id", saldoId);
          if (erroAjuste) {
            throw Object.assign(new Error(erroAjuste.message), { code: erroAjuste.code });
          }
        } else {
          saldoId = String(residual.id);
          const { error: erroResidual } = await tx.from("cobrancas").insert(residual);
          if (erroResidual) {
            throw Object.assign(new Error(erroResidual.message), { code: erroResidual.code });
          }
        }
      }

      const espelhoRemovido =
        atual.tipo === "mensalidade"
          ? await sincronizarEspelho(tx, alunoId, hoje, competenciasAfetadas)
          : [];

      return { saldoId, espelhoRemovido };
    });
  } catch (e) {
    if (e instanceof ConflitoEspelho) return erroAPI(e.message, 409);
    const codigo = (e as { code?: string }).code;
    if (codigo === "404") return erros.naoEncontrado("Cobrança");
    if (codigo === "23514") {
      // Recusa do espelho não é erro do valor recebido: a cobrança estava certa
      // e o que faltou foi o banco aceitar a linha do Financeiro.
      if (ehFalhaDoEspelho(e)) return erroAPI(MENSAGEM_ESPELHO_RECUSADO, 500);
      return erroAPI(
        "O valor recebido não foi aceito para esta cobrança. Confira o valor, a data e a forma de pagamento.",
        400
      );
    }
    return erros.servidorIndisponivel(e);
  }

  await registrarAudit("editar", "cobrancas", id, {
    campos: Object.keys(update),
    antes: {
      status: String(atual.status),
      valor: formatBRL(Number(atual.valor)),
      valorPago: atual.valor_pago == null ? null : formatBRL(Number(atual.valor_pago)),
    },
    depois: {
      status: String(statusFinal),
      valor: formatBRL(Number(update.valor ?? atual.valor)),
      valorPago: update.valor_pago == null ? null : formatBRL(Number(update.valor_pago)),
    },
    ...(residual
      ? { saldoRestante: formatBRL(Number(residual.valor)), saldoRestanteId: resultado.saldoId }
      : {}),
  });
  await registrarEspelhoRemovido(
    alunoId,
    "competência ficou sem cobrança após a baixa",
    resultado.espelhoRemovido
  );

  return NextResponse.json({ ok: true, saldoRestante: residual ? Number(residual.valor) : 0 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getDatabase();
  const { data: atual, error: erroBusca } = await sb
    .from("cobrancas")
    .select("aluno_id, tipo, descricao, valor, vencimento, status")
    .eq("id", id)
    .maybeSingle();
  if (erroBusca) return erros.servidorIndisponivel(erroBusca);
  if (!atual) return erros.naoEncontrado("Cobrança");

  const hoje = formatDateLocalISO();
  const alunoId = String(atual.aluno_id);
  let espelhoRemovido: LinhaEspelhoRemovida[] = [];
  try {
    espelhoRemovido = await sb.transaction(async (tx) => {
      const { error } = await tx.from("cobrancas").delete().eq("id", id);
      if (error) throw new Error(error.message);
      if (atual.tipo !== "mensalidade") return [];
      return sincronizarEspelho(tx, alunoId, hoje, [competenciaDe(atual.vencimento)]);
    });
  } catch (e) {
    if (e instanceof ConflitoEspelho) return erroAPI(e.message, 409);
    if ((e as { code?: string }).code === "23514" && ehFalhaDoEspelho(e)) {
      return erroAPI(MENSAGEM_ESPELHO_RECUSADO, 500);
    }
    return erros.servidorIndisponivel(e);
  }

  await registrarAudit("excluir", "cobrancas", id, {
    alunoId,
    antes: {
      descricao: String(atual.descricao ?? ""),
      vencimento: String(atual.vencimento),
      valor: formatBRL(Number(atual.valor)),
      status: String(atual.status),
    },
  });
  await registrarEspelhoRemovido(
    alunoId,
    "competência ficou sem cobrança após a exclusão",
    espelhoRemovido
  );
  return NextResponse.json({ ok: true });
}
