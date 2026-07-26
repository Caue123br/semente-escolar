import { NextResponse } from "next/server";

import {
  dataCivilValida,
  horaCurta,
  horaValida,
  objetoSimples,
  texto,
} from "@/lib/api-input";
import { registrarAudit } from "@/lib/db/audit";
import { erros, sucesso } from "@/lib/db/api-response";
import { rowToRegistroBercario } from "@/lib/db/mappers";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS = new Set(["Sono", "Troca", "Alimentação", "Banho", "Observação"]);

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await getDatabase()
    .from("bercario_registros")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Registro");
  await registrarAudit("excluir", "bercario_registros", id);
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
  const update: Record<string, unknown> = {};
  if (Object.hasOwn(body, "bebeId")) {
    const bebeId = texto(body.bebeId);
    if (!bebeId || bebeId.length > 120) return erros.dadosInvalidos("bebê");
    const { data: bebe, error } = await sb
      .from("bercario_bebes")
      .select("id")
      .eq("id", bebeId)
      .maybeSingle();
    if (error) return erros.servidorIndisponivel(error);
    if (!bebe) return erros.naoEncontrado("Bebê");
    update.bebe_id = bebeId;
  }
  if (Object.hasOwn(body, "data")) {
    if (!dataCivilValida(body.data)) return erros.dadosInvalidos("data do registro");
    update.data = body.data;
  }
  if (Object.hasOwn(body, "hora")) {
    const hora = texto(body.hora);
    if (!horaValida(hora)) return erros.dadosInvalidos("hora do registro");
    update.hora = horaCurta(hora);
  }
  if (Object.hasOwn(body, "tipo")) {
    const tipo = texto(body.tipo);
    if (!TIPOS.has(tipo)) return erros.dadosInvalidos("tipo do registro");
    update.tipo = tipo;
  }
  if (Object.hasOwn(body, "detalhes")) {
    const detalhes = texto(body.detalhes);
    if (!detalhes || detalhes.length > 2_000) return erros.dadosInvalidos("detalhes");
    update.detalhes = detalhes;
  }
  if (Object.keys(update).length === 0) {
    return erros.dadosInvalidos("nenhum campo editável foi enviado");
  }

  const { data, error } = await sb
    .from("bercario_registros")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error?.code === "23503") return erros.naoEncontrado("Bebê");
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Registro");
  await registrarAudit("editar", "bercario_registros", id, { campos: Object.keys(update) });
  return sucesso({ item: rowToRegistroBercario(data) });
}
