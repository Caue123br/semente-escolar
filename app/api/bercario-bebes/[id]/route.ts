import { NextResponse } from "next/server";

import { objetoSimples, texto, textoOpcional } from "@/lib/api-input";
import { registrarAudit } from "@/lib/db/audit";
import { erros, sucesso } from "@/lib/db/api-response";
import { rowToBebe } from "@/lib/db/mappers";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await getDatabase()
    .from("bercario_bebes")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Bebê");
  await registrarAudit("excluir", "bercario_bebes", id);
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
  if (Object.hasOwn(body, "nome")) {
    const nome = texto(body.nome);
    if (nome.length < 2 || nome.length > 200) return erros.dadosInvalidos("nome do bebê");
    update.nome = nome;
  }
  if (Object.hasOwn(body, "idadeMeses")) {
    const idade = body.idadeMeses === null ? null : Number(body.idadeMeses);
    if (idade !== null && (!Number.isInteger(idade) || idade < 0 || idade > 72)) {
      return erros.dadosInvalidos("idade em meses");
    }
    update.idade_meses = idade;
  }
  for (const [campo, coluna] of [
    ["responsavel", "responsavel"],
    ["professora", "professora"],
  ] as const) {
    if (!Object.hasOwn(body, campo)) continue;
    const value = textoOpcional(body[campo]);
    if (value && value.length > 200) return erros.dadosInvalidos(campo);
    update[coluna] = value;
  }
  if (Object.keys(update).length === 0) {
    return erros.dadosInvalidos("nenhum campo editável foi enviado");
  }

  const { data, error } = await getDatabase()
    .from("bercario_bebes")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Bebê");
  await registrarAudit("editar", "bercario_bebes", id, { campos: Object.keys(update) });
  return sucesso({ item: rowToBebe(data) });
}
