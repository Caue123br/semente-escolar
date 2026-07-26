import { NextResponse } from "next/server";

import { objetoSimples, texto } from "@/lib/api-input";
import { registrarAudit } from "@/lib/db/audit";
import { erros, sucesso } from "@/lib/db/api-response";
import { rowToMuralPost } from "@/lib/db/mappers";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS = new Set(["Importante", "Pedagógico", "Atividade", "Avisos", "Evento"]);

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await getDatabase()
    .from("mural_posts")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Aviso");
  await registrarAudit("excluir", "mural_posts", id);
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

  const update: Record<string, unknown> = {};
  if (Object.hasOwn(body, "titulo")) {
    const titulo = texto(body.titulo);
    if (!titulo || titulo.length > 200) return erros.dadosInvalidos("título");
    update.titulo = titulo;
  }
  if (Object.hasOwn(body, "conteudo")) {
    const conteudo = texto(body.conteudo);
    if (!conteudo || conteudo.length > 5_000) return erros.dadosInvalidos("mensagem");
    update.conteudo = conteudo;
  }
  if (Object.hasOwn(body, "tipo")) {
    const tipo = texto(body.tipo);
    if (!TIPOS.has(tipo)) return erros.dadosInvalidos("categoria");
    update.tipo = tipo;
  }
  if (Object.hasOwn(body, "fixado")) {
    if (typeof body.fixado !== "boolean") return erros.dadosInvalidos("fixado");
    update.fixado = body.fixado;
  }
  if (Object.keys(update).length === 0) {
    return erros.dadosInvalidos("nenhum campo editável foi enviado");
  }

  const { data, error } = await getDatabase()
    .from("mural_posts")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Aviso");
  await registrarAudit("editar", "mural_posts", id, { campos: Object.keys(update) });
  return sucesso({ item: rowToMuralPost(data) });
}
