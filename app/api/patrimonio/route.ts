import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToPatrimonio } from "@/lib/db/mappers";
import { seedPatrimonio } from "@/lib/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatrimonioInput {
  id: string;
  item: string;
  categoria?: string;
  local?: string;
  valor?: number;
  dataCompra?: string;
  estado?: string;
  responsavel?: string;
}

export async function GET() {
  await seedPatrimonio();
  const sb = getDatabase();
  const { data, error } = await sb.from("patrimonio").select("*").order("item", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []).map(rowToPatrimonio) });
}

export async function POST(req: Request) {
  const p = (await req.json()) as PatrimonioInput;
  const sb = getDatabase();
  const { error } = await sb.from("patrimonio").upsert({
    id: p.id, item: p.item, categoria: p.categoria ?? null,
    local: p.local ?? null, valor: p.valor ?? null,
    data_compra: p.dataCompra ?? null, estado: p.estado ?? null,
    responsavel: p.responsavel ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: p }, { status: 201 });
}
