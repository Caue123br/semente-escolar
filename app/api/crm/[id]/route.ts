import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
  nomeResponsavel: "nome_responsavel", nomeCrianca: "nome_crianca",
  idadeCrianca: "idade_crianca", serieInteresse: "serie_interesse",
  telefone: "telefone", email: "email", origem: "origem", estagio: "estagio",
  dataPrimeiroContato: "data_primeiro_contato",
  proximaAcao: "proxima_acao", proximaData: "proxima_data",
  responsavelComercial: "responsavel_comercial",
  valorPotencial: "valor_potencial", observacoes: "observacoes",
};

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await getDatabase().from("crm_leads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patch = await req.json();
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = MAPA[k];
    if (col) update[col] = v;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });
  const { error } = await getDatabase().from("crm_leads").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
