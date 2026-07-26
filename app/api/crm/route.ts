import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToLead } from "@/lib/db/mappers";
import { seedCRM } from "@/lib/db/seed";
import type { Lead } from "@/lib/mock-data/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await seedCRM();
  const sb = getDatabase();
  const { data, error } = await sb.from("crm_leads").select("*").order("data_primeiro_contato", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []).map(rowToLead) });
}

export async function POST(req: Request) {
  const l = (await req.json()) as Lead;
  const sb = getDatabase();
  const { error } = await sb.from("crm_leads").upsert({
    id: l.id,
    nome_responsavel: l.nomeResponsavel,
    nome_crianca: l.nomeCrianca,
    idade_crianca: l.idadeCrianca,
    serie_interesse: l.serieInteresse,
    telefone: l.telefone,
    email: l.email,
    origem: l.origem,
    estagio: l.estagio,
    data_primeiro_contato: l.dataPrimeiroContato,
    proxima_acao: l.proximaAcao,
    proxima_data: l.proximaData,
    responsavel_comercial: l.responsavelComercial,
    valor_potencial: l.valorPotencial,
    observacoes: l.observacoes ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: l }, { status: 201 });
}
