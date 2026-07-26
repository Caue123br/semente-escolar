import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { objetoSimples, texto, textoOpcional } from "@/lib/api-input";
import { registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { rowToLivro } from "@/lib/db/mappers";
import { getDatabase } from "@/lib/db/postgres";
import { seedBiblioteca } from "@/lib/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIAS = new Set(["Infantil", "Didático", "Literário", "Pedagógico", "Quadrinhos"]);

export async function GET() {
  await seedBiblioteca();
  const { data, error } = await getDatabase()
    .from("biblioteca_livros")
    .select("*")
    .order("titulo", { ascending: true });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToLivro) });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!objetoSimples(body)) return erros.dadosInvalidos("corpo da requisição");

  const titulo = texto(body.titulo);
  const autor = texto(body.autor);
  const isbn = textoOpcional(body.isbn);
  const categoria = texto(body.categoria);
  const faixaEtaria = texto(body.faixaEtaria) || "Todas";
  const exemplares = Number(body.exemplares);
  if (!titulo || titulo.length > 300) return erros.dadosInvalidos("título");
  if (!autor || autor.length > 200) return erros.dadosInvalidos("autor");
  if (isbn && isbn.length > 40) return erros.dadosInvalidos("ISBN");
  if (!CATEGORIAS.has(categoria)) return erros.dadosInvalidos("categoria");
  if (faixaEtaria.length > 80) return erros.dadosInvalidos("faixa etária");
  if (!Number.isInteger(exemplares) || exemplares < 1 || exemplares > 10_000) {
    return erros.dadosInvalidos("quantidade de exemplares");
  }

  const id = randomUUID();
  const { data, error } = await getDatabase()
    .from("biblioteca_livros")
    .insert({
      id,
      titulo,
      autor,
      isbn,
      categoria,
      faixa_etaria: faixaEtaria,
      exemplares,
      disponiveis: exemplares,
      emprestados: 0,
    })
    .select("*")
    .single();
  if (error?.code === "23505") return erroAPI("Este ISBN já está cadastrado.", 409);
  if (error || !data) {
    return erros.servidorIndisponivel(error ?? new Error("INSERT de livro sem retorno"));
  }
  await registrarAudit("criar", "biblioteca_livros", id, { categoria, exemplares });
  return sucesso({ item: rowToLivro(data) }, 201);
}
