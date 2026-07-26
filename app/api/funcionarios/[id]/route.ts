import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
  nome: "nome",
  cargo: "cargo",
  cpf: "cpf",
  email: "email",
  telefone: "telefone",
  admissao: "admissao",
  salarioBruto: "salario_bruto",
  vinculo: "vinculo",
  status: "status",
};

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const sb = getDatabase();
  const { data, error } = await sb
    .from("funcionarios")
    .update({ deleted_at: new Date().toISOString(), deleted_by: usuario.id })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  await registrarAudit("excluir", "funcionarios", id);
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
  if (patch.turmasAtuacao !== undefined) update.turmas_atuacao_json = patch.turmasAtuacao;
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });
  const sb = getDatabase();
  const { error } = await sb.from("funcionarios").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
