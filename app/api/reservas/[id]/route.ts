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
import { rowToReserva } from "@/lib/db/mappers";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS = new Set(["Confirmada", "Cancelada"]);

function horariosConflitam(inicio: string, fim: string, outroInicio: unknown, outroFim: unknown) {
  if (!outroInicio || !outroFim) return true;
  return (
    minutosDaHora(inicio) < minutosDaHora(String(outroFim)) &&
    minutosDaHora(fim) > minutosDaHora(String(outroInicio))
  );
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await getDatabase()
    .from("reservas")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Reserva");
  await registrarAudit("excluir", "reservas", id);
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
    .from("reservas")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (erroBusca) return erros.servidorIndisponivel(erroBusca);
  if (!atual) return erros.naoEncontrado("Reserva");

  const update: Record<string, unknown> = {};
  if (Object.hasOwn(body, "espaco")) {
    const espaco = texto(body.espaco);
    if (espaco.length < 2 || espaco.length > 160) return erros.dadosInvalidos("espaço");
    update.espaco = espaco;
  }
  if (Object.hasOwn(body, "data")) {
    if (!dataCivilValida(body.data)) return erros.dadosInvalidos("data da reserva");
    update.data = body.data;
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
  for (const [campo, coluna, limite] of [
    ["responsavel", "responsavel", 200],
    ["motivo", "motivo", 500],
  ] as const) {
    if (!Object.hasOwn(body, campo)) continue;
    const value = textoOpcional(body[campo]);
    if (value && value.length > limite) return erros.dadosInvalidos(campo);
    update[coluna] = value;
  }
  if (Object.hasOwn(body, "status")) {
    const status = texto(body.status);
    if (!STATUS.has(status)) return erros.dadosInvalidos("status");
    update.status = status;
  }
  if (Object.keys(update).length === 0) {
    return erros.dadosInvalidos("nenhum campo editável foi enviado");
  }

  const espaco = String(update.espaco ?? atual.espaco);
  const dataReserva = String(update.data ?? atual.data);
  const horaInicio = Object.hasOwn(update, "hora_inicio")
    ? String(update.hora_inicio ?? "")
    : String(atual.hora_inicio ?? "");
  const horaFim = Object.hasOwn(update, "hora_fim")
    ? String(update.hora_fim ?? "")
    : String(atual.hora_fim ?? "");
  const status = String(update.status ?? atual.status);
  if (horaInicio && horaFim && minutosDaHora(horaFim) <= minutosDaHora(horaInicio)) {
    return erros.dadosInvalidos("a hora final deve ser posterior à inicial");
  }

  if (status === "Confirmada") {
    const { data: existentes, error } = await sb
      .from("reservas")
      .select("id,hora_inicio,hora_fim,status")
      .eq("espaco", espaco)
      .eq("data", dataReserva);
    if (error) return erros.servidorIndisponivel(error);
    const conflito = (existentes ?? []).some(
      (reserva) =>
        reserva.id !== id &&
        reserva.status !== "Cancelada" &&
        (!horaInicio || !horaFim ||
          horariosConflitam(horaInicio, horaFim, reserva.hora_inicio, reserva.hora_fim))
    );
    if (conflito) {
      return erroAPI("Esse espaço já possui uma reserva no horário informado.", 409);
    }
  }

  const { data, error } = await sb
    .from("reservas")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Reserva");
  await registrarAudit("editar", "reservas", id, { campos: Object.keys(update) });
  return sucesso({ item: rowToReserva(data) });
}
