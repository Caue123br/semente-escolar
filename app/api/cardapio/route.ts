import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToCardapioDia } from "@/lib/db/mappers";
import { seedCardapio } from "@/lib/db/seed";
import type { DiaCardapio } from "@/lib/mock-data/cardapio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await seedCardapio();
  const sb = getDatabase();
  const { data, error } = await sb.from("cardapio_semana").select("*").order("data", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []).map(rowToCardapioDia) });
}

export async function POST(req: Request) {
  const d = (await req.json()) as DiaCardapio & { id?: string };
  const sb = getDatabase();
  const { error } = await sb.from("cardapio_semana").upsert({
    id: d.id ?? `card-${d.data}`,
    data: d.data,
    dia_semana: d.diaSemana,
    refeicoes_json: d.refeicoes,
  }, { onConflict: "data" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: d }, { status: 201 });
}
