import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db/sqlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS: Record<string, string> = {
  nome: "nome",
  categoria: "categoria",
  subcategoria: "subcategoria",
  quantidade: "quantidade",
  unidade: "unidade",
  pontoReposicao: "ponto_reposicao",
  custoUnitario: "custo_unitario",
  precoVenda: "preco_venda",
  fornecedor: "fornecedor",
  validade: "validade",
  tamanho: "tamanho",
};

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const { id } = await params;
  const db = getDb();
  await db.execute({ sql: "DELETE FROM estoque WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const { id } = await params;
  const patch = await req.json();
  const db = getDb();

  const setClauses: string[] = [];
  const args: (string | number | null)[] = [];

  for (const [k, v] of Object.entries(patch)) {
    const col = COLS[k];
    if (!col) continue;
    setClauses.push(`${col} = ?`);
    args.push(v as string | number | null);
  }

  if (setClauses.length === 0) return NextResponse.json({ ok: true });
  args.push(id);
  await db.execute({
    sql: `UPDATE estoque SET ${setClauses.join(", ")} WHERE id = ?`,
    args,
  });
  return NextResponse.json({ ok: true });
}
