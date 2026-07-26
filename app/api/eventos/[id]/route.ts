import { NextResponse } from "next/server";

import {
  dataCivilValida,
  horaCurta,
  horaValida,
  minutosDaHora,
  objetoSimples,
  texto,
  textoOpcional,
} from "@/lib/api-input";
import { registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { rowToEvento } from "@/lib/db/mappers";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS_EVENTO = new Set([
  "Aula", "Reunião", "Festa", "Passeio", "Avaliação", "Feriado", "Recesso",
  "Formação Docente", "Visita", "Outros",
]);

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await getDatabase()
    .from("eventos")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Evento");
  await registrarAudit("excluir", "eventos", id);
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
    .from("eventos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (erroBusca) return erros.servidorIndisponivel(erroBusca);
  if (!atual) return erros.naoEncontrado("Evento");

  const update: Record<string, unknown> = {};
  if (Object.hasOwn(body, "titulo")) {
    const titulo = texto(body.titulo);
    if (titulo.length < 2 || titulo.length > 200) return erros.dadosInvalidos("título");
    update.titulo = titulo;
  }
  if (Object.hasOwn(body, "data")) {
    if (!dataCivilValida(body.data)) return erros.dadosInvalidos("data do evento");
    update.data = body.data;
  }
  if (Object.hasOwn(body, "tipo")) {
    const tipo = texto(body.tipo);
    if (!TIPOS_EVENTO.has(tipo)) return erros.dadosInvalidos("tipo de evento");
    update.tipo = tipo;
  }
  for (const [campo, coluna, limite] of [
    ["local", "local", 200],
    ["responsavel", "responsavel", 200],
    ["descricao", "descricao", 5_000],
  ] as const) {
    if (!Object.hasOwn(body, campo)) continue;
    const value = textoOpcional(body[campo]);
    if (value && value.length > limite) return erros.dadosInvalidos(campo);
    update[coluna] = value;
  }
  for (const [campo, coluna] of [
    ["horaInicio", "hora_inicio"],
    ["horaFim", "hora_fim"],
  ] as const) {
    if (!Object.hasOwn(body, campo)) continue;
    const value = textoOpcional(body[campo]);
    if (value && !horaValida(value)) return erros.dadosInvalidos(campo);
    update[coluna] = value ? horaCurta(value) : null;
  }

  if (Object.hasOwn(body, "turmas")) {
    if (
      body.turmas !== null &&
      (!Array.isArray(body.turmas) ||
        body.turmas.length > 100 ||
        !body.turmas.every(
          (turmaId) =>
            typeof turmaId === "string" && turmaId.trim().length > 0 && turmaId.length <= 120
        ))
    ) {
      return erros.dadosInvalidos("turmas");
    }
    const turmas = body.turmas === null
      ? []
      : [...new Set(body.turmas.map((turmaId) => turmaId.trim()))];
    if (turmas.length > 0) {
      const { data: existentes, error } = await sb.from("turmas").select("id").in("id", turmas);
      if (error) return erros.servidorIndisponivel(error);
      if ((existentes ?? []).length !== turmas.length) {
        return erroAPI("Uma ou mais turmas selecionadas não existem.", 422);
      }
    }
    update.turmas_json = turmas.length > 0 ? turmas : null;
  }

  const inicio = Object.hasOwn(update, "hora_inicio")
    ? String(update.hora_inicio ?? "")
    : String(atual.hora_inicio ?? "");
  const fim = Object.hasOwn(update, "hora_fim")
    ? String(update.hora_fim ?? "")
    : String(atual.hora_fim ?? "");
  if (inicio && fim && minutosDaHora(fim) <= minutosDaHora(inicio)) {
    return erros.dadosInvalidos("a hora final deve ser posterior à inicial");
  }
  if (Object.keys(update).length === 0) {
    return erros.dadosInvalidos("nenhum campo editável foi enviado");
  }

  const { data, error } = await sb
    .from("eventos")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Evento");
  await registrarAudit("editar", "eventos", id, { campos: Object.keys(update) });
  return sucesso({ item: rowToEvento(data) });
}
