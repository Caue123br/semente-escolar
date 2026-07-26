import { NextResponse } from "next/server";

import { objetoSimples, texto, textoOpcional } from "@/lib/api-input";
import { registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { rowToLivro } from "@/lib/db/mappers";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIAS = new Set(["Infantil", "Didático", "Literário", "Pedagógico", "Quadrinhos"]);

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await getDatabase()
    .from("biblioteca_livros")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error?.code === "23503") {
    return erroAPI("Este livro possui empréstimos vinculados e não pode ser removido.", 409);
  }
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Livro");
  await registrarAudit("excluir", "biblioteca_livros", id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!objetoSimples(body)) return erros.dadosInvalidos("corpo da requisição");

  const sb = getDatabase();
  const { data: atual, error: erroBusca } = await sb
    .from("biblioteca_livros")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (erroBusca) return erros.servidorIndisponivel(erroBusca);
  if (!atual) return erros.naoEncontrado("Livro");

  const update: Record<string, unknown> = {};
  if (Object.hasOwn(body, "titulo")) {
    const titulo = texto(body.titulo);
    if (!titulo || titulo.length > 300) return erros.dadosInvalidos("título");
    update.titulo = titulo;
  }
  if (Object.hasOwn(body, "autor")) {
    const autor = texto(body.autor);
    if (!autor || autor.length > 200) return erros.dadosInvalidos("autor");
    update.autor = autor;
  }
  if (Object.hasOwn(body, "isbn")) {
    const isbn = textoOpcional(body.isbn);
    if (isbn && isbn.length > 40) return erros.dadosInvalidos("ISBN");
    update.isbn = isbn;
  }
  if (Object.hasOwn(body, "categoria")) {
    const categoria = texto(body.categoria);
    if (!CATEGORIAS.has(categoria)) return erros.dadosInvalidos("categoria");
    update.categoria = categoria;
  }
  if (Object.hasOwn(body, "faixaEtaria")) {
    const faixaEtaria = texto(body.faixaEtaria) || "Todas";
    if (faixaEtaria.length > 80) return erros.dadosInvalidos("faixa etária");
    update.faixa_etaria = faixaEtaria;
  }
  if (Object.hasOwn(body, "exemplares")) {
    const exemplares = Number(body.exemplares);
    const emprestados = Number(atual.emprestados);
    if (!Number.isInteger(exemplares) || exemplares < 1 || exemplares > 10_000) {
      return erros.dadosInvalidos("quantidade de exemplares");
    }
    if (exemplares < emprestados) {
      return erroAPI(
        `Há ${emprestados} exemplar(es) emprestado(s); o total não pode ser menor que isso.`,
        422
      );
    }
    update.exemplares = exemplares;
    update.disponiveis = exemplares - emprestados;
  }
  if (Object.keys(update).length === 0) {
    return erros.dadosInvalidos("nenhum campo editável foi enviado");
  }

  const { data, error } = await sb
    .from("biblioteca_livros")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error?.code === "23505") return erroAPI("Este ISBN já está cadastrado.", 409);
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Livro");
  await registrarAudit("editar", "biblioteca_livros", id, { campos: Object.keys(update) });
  return sucesso({ item: rowToLivro(data) });
}
