import { randomUUID } from "node:crypto";

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
import { seedReservas } from "@/lib/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function horariosConflitam(
  inicio: string,
  fim: string,
  outroInicio: unknown,
  outroFim: unknown
): boolean {
  if (!outroInicio || !outroFim) return true;
  return (
    minutosDaHora(inicio) < minutosDaHora(String(outroFim)) &&
    minutosDaHora(fim) > minutosDaHora(String(outroInicio))
  );
}

export async function GET() {
  await seedReservas();
  const { data, error } = await getDatabase()
    .from("reservas")
    .select("*")
    .order("data", { ascending: true });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToReserva) });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!objetoSimples(body)) return erros.dadosInvalidos("corpo da requisição");

  const espaco = texto(body.espaco);
  const dataReserva = body.data;
  const horaInicio = textoOpcional(body.horaInicio);
  const horaFim = textoOpcional(body.horaFim);
  const responsavel = textoOpcional(body.responsavel);
  const motivo = textoOpcional(body.motivo);
  if (espaco.length < 2 || espaco.length > 160) return erros.dadosInvalidos("espaço");
  if (!dataCivilValida(dataReserva)) return erros.dadosInvalidos("data da reserva");
  if (horaInicio && !horaValida(horaInicio)) return erros.dadosInvalidos("hora inicial");
  if (horaFim && !horaValida(horaFim)) return erros.dadosInvalidos("hora final");
  if (horaInicio && horaFim && minutosDaHora(horaFim) <= minutosDaHora(horaInicio)) {
    return erros.dadosInvalidos("a hora final deve ser posterior à inicial");
  }
  if (responsavel && responsavel.length > 200) return erros.dadosInvalidos("responsável");
  if (motivo && motivo.length > 500) return erros.dadosInvalidos("motivo");

  const sb = getDatabase();
  const { data: existentes, error: erroAgenda } = await sb
    .from("reservas")
    .select("id,hora_inicio,hora_fim,status")
    .eq("espaco", espaco)
    .eq("data", dataReserva);
  if (erroAgenda) return erros.servidorIndisponivel(erroAgenda);
  const conflito = (existentes ?? []).some(
    (reserva) =>
      reserva.status !== "Cancelada" &&
      (!horaInicio || !horaFim ||
        horariosConflitam(horaInicio, horaFim, reserva.hora_inicio, reserva.hora_fim))
  );
  if (conflito) {
    return erroAPI("Esse espaço já possui uma reserva no horário informado.", 409);
  }

  const id = randomUUID();
  const { data, error } = await sb
    .from("reservas")
    .insert({
      id,
      espaco,
      data: dataReserva,
      hora_inicio: horaInicio ? horaCurta(horaInicio) : null,
      hora_fim: horaFim ? horaCurta(horaFim) : null,
      responsavel,
      motivo,
      status: "Confirmada",
    })
    .select("*")
    .single();
  if (error || !data) {
    return erros.servidorIndisponivel(error ?? new Error("INSERT de reserva sem retorno"));
  }
  await registrarAudit("criar", "reservas", id, { espaco, data: dataReserva });
  return sucesso({ item: rowToReserva(data) }, 201);
}
