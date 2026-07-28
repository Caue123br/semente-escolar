import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { erros } from "@/lib/db/api-response";

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let patch: Record<string, unknown>;
  try {
    patch = (await req.json()) as Record<string, unknown>;
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
