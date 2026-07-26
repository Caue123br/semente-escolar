import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { objetoSimples, texto, textoOpcional } from "@/lib/api-input";
import { registrarAudit } from "@/lib/db/audit";
import { erros, sucesso } from "@/lib/db/api-response";
import { rowToBebe } from "@/lib/db/mappers";
import { getDatabase } from "@/lib/db/postgres";
import { seedBercario } from "@/lib/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await seedBercario();
  const { data, error } = await getDatabase()
    .from("bercario_bebes")
    .select("*")
    .order("nome", { ascending: true });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToBebe) });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!objetoSimples(body)) return erros.dadosInvalidos("corpo da requisição");

  const nome = texto(body.nome);
  const idadeMeses = Number(body.idadeMeses);
  const responsavel = textoOpcional(body.responsavel);
  const professora = textoOpcional(body.professora);
  if (nome.length < 2 || nome.length > 200) return erros.dadosInvalidos("nome do bebê");
  if (!Number.isInteger(idadeMeses) || idadeMeses < 0 || idadeMeses > 72) {
    return erros.dadosInvalidos("idade em meses");
  }
  if (responsavel && responsavel.length > 200) return erros.dadosInvalidos("responsável");
  if (professora && professora.length > 200) return erros.dadosInvalidos("professora");

  const id = randomUUID();
  const { data, error } = await getDatabase()
    .from("bercario_bebes")
    .insert({ id, nome, idade_meses: idadeMeses, responsavel, professora })
    .select("*")
    .single();
  if (error || !data) {
    return erros.servidorIndisponivel(error ?? new Error("INSERT de bebê sem retorno"));
  }
  await registrarAudit("criar", "bercario_bebes", id, { idadeMeses });
  return sucesso({ item: rowToBebe(data) }, 201);
}
