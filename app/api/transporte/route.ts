import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToRotaTransporte } from "@/lib/db/mappers";
import { seedTransporte } from "@/lib/db/seed";
import type { RotaTransporte } from "@/lib/mock-data/transporte";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await seedTransporte();
  const sb = getDatabase();
  const { data, error } = await sb.from("transporte_rotas").select("*").order("nome", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []).map(rowToRotaTransporte) });
}

export async function POST(req: Request) {
  const r = (await req.json()) as RotaTransporte;
  const alunosIds = Array.isArray(r.alunosIds)
    ? Array.from(new Set(r.alunosIds.filter((id): id is string => typeof id === "string" && id.length > 0)))
    : [];
  const sb = getDatabase();
  const { error } = await sb.from("transporte_rotas").upsert({
    id: r.id, nome: r.nome, motorista: r.motorista, monitora: r.monitora,
    veiculo: r.veiculo, placa: r.placa, capacidade: r.capacidade,
    alunos_atuais: alunosIds.length, alunos_ids_json: alunosIds, bairros_json: r.bairros,
    horario_saida: r.horarioSaida, horario_retorno: r.horarioRetorno,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    item: { ...r, alunosIds, alunosAtuais: alunosIds.length },
  }, { status: 201 });
}
