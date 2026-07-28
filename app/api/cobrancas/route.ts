import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToCobranca } from "@/lib/db/mappers";
import { erros } from "@/lib/db/api-response";
import type { Cobranca } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = getDatabase();
  const { data, error } = await sb
    .from("cobrancas")
    .select("*")
    .order("vencimento", { ascending: true });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToCobranca) });
}

export async function POST(req: Request) {
  let c: Cobranca;
  try {
    c = (await req.json()) as Cobranca;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!c.id || !c.alunoId || !(Number(c.valor) > 0)) {
    return erros.dadosInvalidos("cobrança");
  }
  const sb = getDatabase();
  const { error } = await sb.from("cobrancas").upsert(
    {
      id: c.id,
      aluno_id: c.alunoId,
      tipo: c.tipo ?? "mensalidade",
      descricao: c.descricao,
      valor: c.valor,
      vencimento: c.vencimento,
      valor_pago: c.valorPago ?? null,
      data_pagamento: c.dataPagamento ?? null,
      status: c.status ?? "Pendente",
      forma_pagamento: c.formaPagamento ?? null,
      parcela_num: c.parcelaNum ?? null,
      parcela_total: c.parcelaTotal ?? null,
    },
    { onConflict: "id" }
  );
  if (error?.code === "23514") return erros.dadosInvalidos("pagamento");
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ ok: true, item: c }, { status: 201 });
}
