import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { dataCivilValida, horaCurta, horaValida, objetoSimples, texto } from "@/lib/api-input";
import { registrarAudit } from "@/lib/db/audit";
import { erros, sucesso } from "@/lib/db/api-response";
import { getUsuarioLogado } from "@/lib/db/auth";
import { rowToRegistroBercario } from "@/lib/db/mappers";
import { getDatabase } from "@/lib/db/postgres";
import { seedBercario } from "@/lib/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS = new Set(["Sono", "Troca", "Alimentação", "Banho", "Observação"]);

export async function GET() {
  await seedBercario();
  const { data, error } = await getDatabase()
    .from("bercario_registros")
    .select("*")
    .order("data", { ascending: false })
    .order("hora", { ascending: false });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToRegistroBercario) });
}

export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!objetoSimples(body)) return erros.dadosInvalidos("corpo da requisição");

  const bebeId = texto(body.bebeId);
  const dataRegistro = body.data;
  const hora = texto(body.hora);
  const tipo = texto(body.tipo);
  const detalhes = texto(body.detalhes);
  if (!bebeId || bebeId.length > 120) return erros.dadosInvalidos("bebê");
  if (!dataCivilValida(dataRegistro)) return erros.dadosInvalidos("data do registro");
  if (!horaValida(hora)) return erros.dadosInvalidos("hora do registro");
  if (!TIPOS.has(tipo)) return erros.dadosInvalidos("tipo do registro");
  if (!detalhes || detalhes.length > 2_000) return erros.dadosInvalidos("detalhes");

  const sb = getDatabase();
  const { data: bebe, error: erroBebe } = await sb
    .from("bercario_bebes")
    .select("id")
    .eq("id", bebeId)
    .maybeSingle();
  if (erroBebe) return erros.servidorIndisponivel(erroBebe);
  if (!bebe) return erros.naoEncontrado("Bebê");

  const id = randomUUID();
  const { data, error } = await sb
    .from("bercario_registros")
    .insert({
      id,
      bebe_id: bebeId,
      data: dataRegistro,
      hora: horaCurta(hora),
      tipo,
      detalhes,
      registrado_por: usuario.nome,
    })
    .select("*")
    .single();
  if (error || !data) {
    return erros.servidorIndisponivel(error ?? new Error("INSERT de registro sem retorno"));
  }
  await registrarAudit("criar", "bercario_registros", id, { bebeId, tipo }, usuario);
  return sucesso({ item: rowToRegistroBercario(data) }, 201);
}
