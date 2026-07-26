import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToDespesa } from "@/lib/db/mappers";
import { seedDespesas } from "@/lib/db/seed";
import type { Despesa } from "@/lib/mock-data/despesas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await seedDespesas();
  const sb = getDatabase();
  const { data, error } = await sb.from("despesas").select("*").order("data", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []).map(rowToDespesa) });
}

export async function POST(req: Request) {
  const d = (await req.json()) as Despesa;
  const sb = getDatabase();
  const { error } = await sb.from("despesas").upsert({
    id: d.id,
    data: d.data,
    descricao: d.descricao,
    categoria: d.categoria,
    valor: d.valor,
    status: d.status,
    fornecedor: d.fornecedor,
    forma_pagamento: d.formaPagamento ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: d }, { status: 201 });
}
