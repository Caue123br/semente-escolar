import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db/sqlite";
import { rowToDespesa } from "@/lib/db/mappers";
import type { Despesa } from "@/lib/mock-data/despesas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const db = getDb();
  const r = await db.execute("SELECT * FROM despesas ORDER BY data DESC, rowid DESC");
  const items = r.rows.map(rowToDespesa);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  await initDb();
  const d = (await req.json()) as Despesa;
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO despesas (id, data, descricao, categoria, valor, status, fornecedor, forma_pagamento) VALUES (?,?,?,?,?,?,?,?)`,
    args: [
      d.id,
      d.data,
      d.descricao,
      d.categoria,
      d.valor,
      d.status,
      d.fornecedor,
      d.formaPagamento ?? null,
    ],
  });
  return NextResponse.json({ ok: true, item: d }, { status: 201 });
}
