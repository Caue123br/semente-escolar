import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase, getPostgresPool } from "@/lib/db/postgres";
import { rowToVenda } from "@/lib/db/mappers";
import { seedVendas } from "@/lib/db/seed";
import { registrarAudit } from "@/lib/db/audit";
import type { Venda } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await seedVendas();
  const sb = getDatabase();
  const { data, error } = await sb.from("vendas").select("*").order("data", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []).map(rowToVenda) });
}

export async function POST(req: Request) {
  let body: Venda | CheckoutInput;
  try {
    body = (await req.json()) as Venda | CheckoutInput;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (ehCheckout(body)) return finalizarCheckout(body);

  const v = body as Venda;
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    return NextResponse.json({ error: "Dados da venda inválidos" }, { status: 400 });
  }
  const itemNome = typeof v.itemNome === "string" ? v.itemNome.trim() : "";
  const cliente = typeof v.cliente === "string" ? v.cliente.trim() : "";
  const quantidade = Number(v.quantidade);
  const precoUnitario = Number(v.precoUnitario);
  const tipos = new Set<Venda["tipo"]>([
    "Uniforme", "Evento/Festa", "Alimentação Extra", "Atividade Extra", "Material",
  ]);
  if (itemNome.length < 2 || itemNome.length > 200) {
    return NextResponse.json({ error: "Informe um item válido" }, { status: 400 });
  }
  if (cliente.length < 2 || cliente.length > 200) {
    return NextResponse.json({ error: "Informe um cliente válido" }, { status: 400 });
  }
  if (!tipos.has(v.tipo) || !FORMAS_PAGAMENTO.has(v.formaPagamento)) {
    return NextResponse.json({ error: "Categoria ou forma de pagamento inválida" }, { status: 400 });
  }
  if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 10_000) {
    return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 });
  }
  if (!Number.isFinite(precoUnitario) || precoUnitario <= 0 || precoUnitario > 999_999_999) {
    return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
  }
  const alunoId = typeof v.alunoId === "string" ? v.alunoId.trim() : "";
  const id = randomUUID();
  const total = Math.round(quantidade * precoUnitario * 100) / 100;
  const sb = getDatabase();
  const { data, error } = await sb.from("vendas").insert({
    id,
    data: dataDaEscola(),
    item_nome: itemNome,
    tipo: v.tipo,
    quantidade,
    preco_unitario: precoUnitario,
    total,
    cliente,
    aluno_id: alunoId || null,
    forma_pagamento: v.formaPagamento,
    nota_fiscal: null,
  }).select("*").single();
  if (error || !data) {
    if (error?.code === "23503") {
      return NextResponse.json({ error: "O aluno informado não existe mais" }, { status: 422 });
    }
    if (["22003", "23502", "23514"].includes(error?.code ?? "")) {
      return NextResponse.json({ error: "Dados da venda inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Não foi possível registrar a venda" }, { status: 500 });
  }
  await registrarAudit("criar", "vendas", id, { modo: "manual", total });
  return NextResponse.json({ ok: true, item: rowToVenda(data) }, { status: 201 });
}

interface CheckoutInput {
  checkout: true;
  cliente: string;
  alunoId?: string;
  formaPagamento: Venda["formaPagamento"];
  descontoPct?: number;
  itens: Array<{ itemId: string; quantidade: number }>;
}

const FORMAS_PAGAMENTO = new Set<Venda["formaPagamento"]>([
  "Pix",
  "Cartão",
  "Dinheiro",
  "Boleto",
]);

const TIPO_POR_SUBCATEGORIA: Record<string, Venda["tipo"]> = {
  Uniforme: "Uniforme",
  Festa: "Evento/Festa",
  "Material Escolar": "Material",
  "Alimentação Extra": "Alimentação Extra",
  "Atividade Extra": "Atividade Extra",
};

class CheckoutError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function ehCheckout(body: Venda | CheckoutInput): body is CheckoutInput {
  return Boolean(body && typeof body === "object" && "checkout" in body && body.checkout === true);
}

function dataDaEscola(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.SCHOOL_TIMEZONE ?? "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

async function finalizarCheckout(input: CheckoutInput) {
  const cliente = typeof input.cliente === "string" ? input.cliente.trim() : "";
  const descontoPct = Number(input.descontoPct ?? 0);
  if (cliente.length < 2 || cliente.length > 200) {
    return NextResponse.json({ error: "Informe um cliente válido" }, { status: 400 });
  }
  if (!FORMAS_PAGAMENTO.has(input.formaPagamento)) {
    return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 });
  }
  if (!Number.isFinite(descontoPct) || descontoPct < 0 || descontoPct > 100) {
    return NextResponse.json({ error: "Desconto inválido" }, { status: 400 });
  }
  if (!Array.isArray(input.itens) || input.itens.length === 0 || input.itens.length > 100) {
    return NextResponse.json({ error: "Carrinho inválido" }, { status: 400 });
  }

  const itens = input.itens.map((item) => ({
    itemId: typeof item?.itemId === "string" ? item.itemId.trim() : "",
    quantidade: Number(item?.quantidade),
  }));
  if (itens.some((item) => !item.itemId || !Number.isSafeInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 10_000)) {
    return NextResponse.json({ error: "Item ou quantidade inválida" }, { status: 400 });
  }
  const ids = itens.map((item) => item.itemId);
  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "Há produtos repetidos no carrinho" }, { status: 400 });
  }

  const escolaId = process.env.SCHOOL_ID ?? "default";
  const alunoId = typeof input.alunoId === "string" ? input.alunoId.trim() : "";
  const client = await getPostgresPool().connect();
  const vendasCriadas: Record<string, unknown>[] = [];
  const recibo: Array<{ nome: string; qtd: number; preco: number; total: number }> = [];
  let total = 0;

  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT id, nome, categoria, subcategoria, quantidade, preco_venda
       FROM app.estoque
       WHERE escola_id = $1 AND id = ANY($2::text[])
       ORDER BY id
       FOR UPDATE`,
      [escolaId, ids]
    );
    if (rows.length !== itens.length) {
      throw new CheckoutError("Um produto do carrinho não existe mais. Atualize a página.", 409);
    }

    const porId = new Map(rows.map((row) => [String(row.id), row]));
    const fatorDesconto = 1 - descontoPct / 100;
    const data = dataDaEscola();

    for (const item of itens) {
      const produto = porId.get(item.itemId);
      if (!produto || produto.categoria !== "Venda") {
        throw new CheckoutError("Um item do carrinho não está disponível para venda.", 409);
      }
      const disponivel = Number(produto.quantidade);
      const precoOriginal = Number(produto.preco_venda);
      if (!Number.isFinite(precoOriginal) || precoOriginal < 0) {
        throw new CheckoutError(`O produto ${produto.nome} está sem preço de venda.`, 409);
      }
      if (!Number.isFinite(disponivel) || disponivel < item.quantidade) {
        throw new CheckoutError(`Estoque insuficiente para ${produto.nome}. Disponível: ${disponivel}.`, 409);
      }

      const precoFinal = Math.round(precoOriginal * fatorDesconto * 100) / 100;
      const totalLinha = Math.round(precoFinal * item.quantidade * 100) / 100;
      const vendaId = randomUUID();
      const tipo = TIPO_POR_SUBCATEGORIA[String(produto.subcategoria)] ?? "Material";
      const { rows: inseridas } = await client.query(
        `INSERT INTO app.vendas
          (escola_id, id, data, item_nome, tipo, quantidade, preco_unitario, total,
           cliente, aluno_id, forma_pagamento)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULLIF($10, ''), $11)
         RETURNING *`,
        [
          escolaId,
          vendaId,
          data,
          String(produto.nome),
          tipo,
          item.quantidade,
          precoFinal,
          totalLinha,
          cliente,
          alunoId,
          input.formaPagamento,
        ]
      );
      await client.query(
        `UPDATE app.estoque
         SET quantidade = quantidade - $3, updated_at = NOW()
         WHERE escola_id = $1 AND id = $2`,
        [escolaId, item.itemId, item.quantidade]
      );
      vendasCriadas.push(inseridas[0]);
      recibo.push({
        nome: String(produto.nome),
        qtd: item.quantidade,
        preco: precoOriginal,
        total: Math.round(precoOriginal * item.quantidade * 100) / 100,
      });
      total += totalLinha;
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[checkout] transação falhou", error instanceof Error
      ? { name: error.name, message: error.message }
      : { message: "erro desconhecido" });
    return NextResponse.json({ error: "Não foi possível finalizar a venda. Nada foi alterado." }, { status: 500 });
  } finally {
    client.release();
  }

  const checkoutId = randomUUID();
  await registrarAudit("criar", "vendas", checkoutId, {
    quantidadeLinhas: vendasCriadas.length,
    total: Math.round(total * 100) / 100,
  });
  return NextResponse.json({
    ok: true,
    items: vendasCriadas.map(rowToVenda),
    recibo,
    total: Math.round(total * 100) / 100,
  }, { status: 201 });
}
