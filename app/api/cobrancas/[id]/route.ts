import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { erroAPI, erros } from "@/lib/db/api-response";

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

function mesmoValorEmCentavos(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.round(a * 100) === Math.round(b * 100);
}

function temCampo(objeto: Record<string, unknown>, campo: string): boolean {
  return Object.prototype.hasOwnProperty.call(objeto, campo);
}

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
    .select("valor, valor_pago, status, data_pagamento, forma_pagamento")
    .eq("id", id)
    .maybeSingle();
  if (erroBusca) return erros.servidorIndisponivel(erroBusca);
  if (!atual) return erros.naoEncontrado("Cobrança");

  const statusFinal = temCampo(update, "status") ? update.status : atual.status;

  if (statusFinal === "Pago") {
    const valorPagoFinal = Number(
      temCampo(update, "valor_pago") ? update.valor_pago : atual.valor_pago
    );
    if (!mesmoValorEmCentavos(Number(atual.valor), valorPagoFinal)) {
      return erroAPI(
        "Para marcar como paga, o valor recebido deve ser igual ao total da cobrança. Pagamentos parciais ainda não são suportados.",
        400
      );
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
  } else if (temCampo(update, "status")) {
    // Reversão de pagamento: não deixar valor_pago/data/forma órfãos na linha.
    update.valor_pago = null;
    update.data_pagamento = null;
    update.forma_pagamento = null;
  }

  const { error } = await sb.from("cobrancas").update(update).eq("id", id);
  if (error?.code === "23514") return erros.dadosInvalidos("pagamento");
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getDatabase();
  const { error } = await sb.from("cobrancas").delete().eq("id", id);
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ ok: true });
}
