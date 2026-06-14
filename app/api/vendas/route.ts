import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db/sqlite";
import { rowToVenda } from "@/lib/db/mappers";
import type { Venda } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const db = getDb();
  const r = await db.execute("SELECT * FROM vendas ORDER BY data DESC, rowid DESC");
  const items = r.rows.map(rowToVenda);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  await initDb();
  const v = (await req.json()) as Venda;
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO vendas (id, data, item_nome, tipo, quantidade, preco_unitario, total, cliente, aluno_id, forma_pagamento, nota_fiscal) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      v.id,
      v.data,
      v.itemNome,
      v.tipo,
      v.quantidade,
      v.precoUnitario,
      v.total,
      v.cliente,
      v.alunoId ?? null,
      v.formaPagamento,
      v.notaFiscal ?? null,
    ],
  });
  return NextResponse.json({ ok: true, item: v }, { status: 201 });
}
