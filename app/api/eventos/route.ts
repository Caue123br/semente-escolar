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
import { rowToEvento } from "@/lib/db/mappers";
import { getDatabase } from "@/lib/db/postgres";
import { seedEventos } from "@/lib/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS_EVENTO = new Set([
  "Aula",
  "Reunião",
  "Festa",
  "Passeio",
  "Avaliação",
  "Feriado",
  "Recesso",
  "Formação Docente",
  "Visita",
  "Outros",
]);

function turmasValidas(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every((id) => typeof id === "string" && id.trim().length > 0 && id.length <= 120)
  );
}

export async function GET() {
  await seedEventos();
  const { data, error } = await getDatabase()
    .from("eventos")
    .select("*")
    .order("data", { ascending: true });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToEvento) });
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
  const tipo = texto(body.tipo);
  const dataEvento = body.data;
  const horaInicio = textoOpcional(body.horaInicio);
  const horaFim = textoOpcional(body.horaFim);
  const local = textoOpcional(body.local);
  const responsavel = textoOpcional(body.responsavel);
  const descricao = textoOpcional(body.descricao);
  const turmasBrutas = body.turmas ?? [];

  if (titulo.length < 2 || titulo.length > 200) {
    return erros.dadosInvalidos("título deve ter entre 2 e 200 caracteres");
  }
  if (!dataCivilValida(dataEvento)) return erros.dadosInvalidos("data do evento");
  if (!TIPOS_EVENTO.has(tipo)) return erros.dadosInvalidos("tipo de evento");
  if (horaInicio && !horaValida(horaInicio)) return erros.dadosInvalidos("hora inicial");
  if (horaFim && !horaValida(horaFim)) return erros.dadosInvalidos("hora final");
  if (
    horaInicio &&
    horaFim &&
    minutosDaHora(horaFim) <= minutosDaHora(horaInicio)
  ) {
    return erros.dadosInvalidos("a hora final deve ser posterior à inicial");
  }
  if (local && local.length > 200) return erros.dadosInvalidos("local");
  if (responsavel && responsavel.length > 200) return erros.dadosInvalidos("responsável");
  if (descricao && descricao.length > 5_000) return erros.dadosInvalidos("descrição");
  if (!turmasValidas(turmasBrutas)) return erros.dadosInvalidos("turmas");

  const turmas = [...new Set(turmasBrutas.map((id) => id.trim()))];
  const sb = getDatabase();
  if (turmas.length > 0) {
    const { data: turmasExistentes, error: erroTurmas } = await sb
      .from("turmas")
      .select("id")
      .in("id", turmas);
    if (erroTurmas) return erros.servidorIndisponivel(erroTurmas);
    if ((turmasExistentes ?? []).length !== turmas.length) {
      return erroAPI("Uma ou mais turmas selecionadas não existem.", 422);
    }
  }

  const id = randomUUID();
  const { data, error } = await sb
    .from("eventos")
    .insert({
      id,
      titulo,
      data: dataEvento,
      hora_inicio: horaInicio ? horaCurta(horaInicio) : null,
      hora_fim: horaFim ? horaCurta(horaFim) : null,
      tipo,
      local,
      responsavel,
      descricao,
      turmas_json: turmas.length > 0 ? turmas : null,
    })
    .select("*")
    .single();
  if (error || !data) {
    return erros.servidorIndisponivel(error ?? new Error("INSERT de evento sem retorno"));
  }

  await registrarAudit("criar", "eventos", id, { tipo, data: dataEvento });
  return sucesso({ item: rowToEvento(data) }, 201);
}
