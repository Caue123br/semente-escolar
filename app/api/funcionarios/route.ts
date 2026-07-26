import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToFuncionario } from "@/lib/db/mappers";
import { seedFuncionarios } from "@/lib/db/seed";
import type { Funcionario } from "@/lib/mock-data/rh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await seedFuncionarios();
  const sb = getDatabase();
  const { data, error } = await sb.from("funcionarios").select("*").order("nome", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []).map(rowToFuncionario) });
}

export async function POST(req: Request) {
  const f = (await req.json()) as Funcionario;
  const sb = getDatabase();
  const { error } = await sb.from("funcionarios").upsert({
    id: f.id,
    nome: f.nome,
    cargo: f.cargo,
    cpf: f.cpf,
    email: f.email,
    telefone: f.telefone,
    admissao: f.admissao,
    salario_bruto: f.salarioBruto,
    vinculo: f.vinculo,
    status: f.status,
    turmas_atuacao_json: f.turmasAtuacao ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: f }, { status: 201 });
}
