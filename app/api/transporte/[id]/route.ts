import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
  nome: "nome", motorista: "motorista", monitora: "monitora",
  veiculo: "veiculo", placa: "placa", capacidade: "capacidade",
  horarioSaida: "horario_saida", horarioRetorno: "horario_retorno",
};

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await getDatabase().from("transporte_rotas").delete().eq("id", id);
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
  if (patch.bairros !== undefined) update.bairros_json = patch.bairros;
  if (patch.alunosIds !== undefined) {
    if (!Array.isArray(patch.alunosIds)) {
      return NextResponse.json({ error: "alunosIds deve ser uma lista" }, { status: 400 });
    }
    const alunosIds = Array.from(new Set(
      patch.alunosIds.filter((alunoId: unknown): alunoId is string => typeof alunoId === "string" && alunoId.length > 0)
    ));
    update.alunos_ids_json = alunosIds;
    update.alunos_atuais = alunosIds.length;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });
  const { error } = await getDatabase().from("transporte_rotas").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
