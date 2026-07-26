import { NextResponse } from "next/server";
import { getDatabase, getPostgresPool } from "@/lib/db/postgres";
import { registrarAudit } from "@/lib/db/audit";
import { rowToItemEstoque } from "@/lib/db/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
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
  codigoBarras: "codigo_barras",
};

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getDatabase();
  const { error } = await sb.from("estoque").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let patch: Record<string, unknown>;
  try {
    patch = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (patch.incrementarQuantidade !== undefined) {
    const incremento = Number(patch.incrementarQuantidade);
    if (!Number.isFinite(incremento) || incremento <= 0) {
      return NextResponse.json({ error: "Quantidade de entrada inválida" }, { status: 400 });
    }
    const escolaId = process.env.SCHOOL_ID ?? "default";
    try {
      const { rows } = await getPostgresPool().query(
        `UPDATE app.estoque
         SET quantidade = quantidade + $3, updated_at = NOW()
         WHERE escola_id = $1 AND id = $2
         RETURNING *`,
        [escolaId, id, incremento]
      );
      if (!rows[0]) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
      await registrarAudit("editar", "estoque", id, { entrada: incremento });
      return NextResponse.json({ ok: true, item: rowToItemEstoque(rows[0]) });
    } catch (error) {
      console.error("[estoque] entrada atômica falhou", error instanceof Error
        ? { name: error.name, message: error.message }
        : { message: "erro desconhecido" });
      return NextResponse.json({ error: "Não foi possível registrar a entrada" }, { status: 500 });
    }
  }

  const camposNumericos = ["quantidade", "pontoReposicao", "custoUnitario", "precoVenda"];
  for (const campo of camposNumericos) {
    if (patch[campo] !== undefined) {
      const valor = Number(patch[campo]);
      if (!Number.isFinite(valor) || valor < 0) {
        return NextResponse.json({ error: `${campo} deve ser um número não negativo` }, { status: 400 });
      }
      patch[campo] = valor;
    }
  }
  if (patch.codigoBarras !== undefined) {
    if (typeof patch.codigoBarras !== "string" || patch.codigoBarras.trim().length > 100) {
      return NextResponse.json({ error: "Código de barras inválido" }, { status: 400 });
    }
    patch.codigoBarras = patch.codigoBarras.trim() || null;
  }

  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = MAPA[k];
    if (col) update[col] = v;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nenhum campo válido enviado" }, { status: 400 });
  const sb = getDatabase();
  const { data, error } = await sb.from("estoque").update(update).eq("id", id).select("id").maybeSingle();
  if (error?.code === "23505") return NextResponse.json({ error: "Este código de barras já está cadastrado" }, { status: 409 });
  if (error) return NextResponse.json({ error: "Não foi possível atualizar o item" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  await registrarAudit("editar", "estoque", id, { campos: Object.keys(update) });
  return NextResponse.json({ ok: true });
}
