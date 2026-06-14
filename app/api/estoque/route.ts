import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db/sqlite";
import { rowToItemEstoque } from "@/lib/db/mappers";
import type { ItemEstoque } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const db = getDb();
  const r = await db.execute("SELECT * FROM estoque ORDER BY categoria ASC, nome ASC");
  const items = r.rows.map(rowToItemEstoque);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  await initDb();
  const i = (await req.json()) as ItemEstoque;
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO estoque (id, nome, categoria, subcategoria, quantidade, unidade, ponto_reposicao, custo_unitario, preco_venda, fornecedor, validade, tamanho) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      i.id,
      i.nome,
      i.categoria,
      i.subcategoria,
      i.quantidade,
      i.unidade,
      i.pontoReposicao,
      i.custoUnitario,
      i.precoVenda ?? null,
      i.fornecedor ?? null,
      i.validade ?? null,
      i.tamanho ?? null,
    ],
  });
  return NextResponse.json({ ok: true, item: i }, { status: 201 });
}
