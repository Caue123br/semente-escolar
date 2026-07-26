import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await getDatabase().from("cardapio_semana").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patch = await req.json();
  const update: Record<string, unknown> = {};
  if (patch.data !== undefined) update.data = patch.data;
  if (patch.diaSemana !== undefined) update.dia_semana = patch.diaSemana;
  if (patch.refeicoes !== undefined) update.refeicoes_json = patch.refeicoes;
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });
  const { error } = await getDatabase().from("cardapio_semana").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
