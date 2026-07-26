import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToItemEstoque } from "@/lib/db/mappers";
import { seedEstoque } from "@/lib/db/seed";
import { registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import type { ItemEstoque } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await seedEstoque();
  const sb = getDatabase();
  const { data, error } = await sb.from("estoque").select("*").order("categoria", { ascending: true }).order("nome", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []).map(rowToItemEstoque) });
}

export async function POST(req: Request) {
  let i: ItemEstoque;
  try {
    i = (await req.json()) as ItemEstoque;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!i || typeof i !== "object" || Array.isArray(i)) return erros.dadosInvalidos();

  const nome = typeof i.nome === "string" ? i.nome.trim() : "";
  const categoria = i.categoria;
  const subcategoria = typeof i.subcategoria === "string" ? i.subcategoria.trim() : "";
  const unidade = typeof i.unidade === "string" ? i.unidade.trim() : "";
  const quantidade = Number(i.quantidade);
  const pontoReposicao = Number(i.pontoReposicao);
  const custoUnitario = Number(i.custoUnitario);
  const precoVenda = i.precoVenda == null ? null : Number(i.precoVenda);
  const validade = typeof i.validade === "string" && i.validade ? i.validade : null;
  const codigoBarras = typeof i.codigoBarras === "string" ? i.codigoBarras.trim() : "";
  const subcategoriasValidas: Record<string, readonly string[]> = {
    Consumo: ["Alimentos", "Limpeza", "Material Pedagógico"],
    Venda: ["Uniforme", "Festa", "Material Escolar", "Alimentação Extra", "Atividade Extra"],
  };

  if (nome.length < 2 || nome.length > 200) return erros.dadosInvalidos("nome");
  if (!subcategoriasValidas[categoria]?.includes(subcategoria)) return erros.dadosInvalidos("categoria");
  if (!unidade || unidade.length > 30) return erros.dadosInvalidos("unidade");
  if (![quantidade, pontoReposicao, custoUnitario].every((valor) => Number.isFinite(valor) && valor >= 0)) {
    return erros.dadosInvalidos("quantidades e custo");
  }
  if (precoVenda !== null && (!Number.isFinite(precoVenda) || precoVenda < 0)) {
    return erros.dadosInvalidos("preço de venda");
  }
  if (validade && !/^\d{4}-\d{2}-\d{2}$/.test(validade)) return erros.dadosInvalidos("validade");
  if (codigoBarras.length > 100) return erros.dadosInvalidos("código de barras");

  const id = randomUUID();
  const sb = getDatabase();
  const { data, error } = await sb.from("estoque").insert({
    id,
    nome,
    categoria,
    subcategoria,
    quantidade,
    unidade,
    ponto_reposicao: pontoReposicao,
    custo_unitario: custoUnitario,
    preco_venda: categoria === "Venda" ? precoVenda : null,
    fornecedor: typeof i.fornecedor === "string" ? i.fornecedor.trim() || null : null,
    validade: categoria === "Consumo" ? validade : null,
    tamanho: categoria === "Venda" && typeof i.tamanho === "string" ? i.tamanho.trim() || null : null,
    codigo_barras: codigoBarras || null,
  }).select("*").single();
  if (error || !data) {
    if (error?.code === "23505") return erroAPI("Este código de barras já está cadastrado.", 409);
    return erros.servidorIndisponivel(error ?? new Error("INSERT de estoque sem retorno"));
  }
  await registrarAudit("criar", "estoque", id, { categoria, quantidade });
  return sucesso({ item: rowToItemEstoque(data) }, 201);
}
