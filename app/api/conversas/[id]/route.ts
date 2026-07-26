import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
  status: "status",
  prioridade: "prioridade",
  responsavelNome: "responsavel_nome",
  responsavelTelefone: "responsavel_telefone",
  responsavelEmail: "responsavel_email",
  alunoId: "aluno_id",
  alunoNome: "aluno_nome",
  atendenteId: "atendente_id",
  atendenteNome: "atendente_nome",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patch = await req.json();
  if (patch.responsavelTelefone !== undefined) {
    const telefone = String(patch.responsavelTelefone).replace(/\D/g, "");
    if (telefone.length < 8 || telefone.length > 15) {
      return NextResponse.json({ error: "Telefone deve ter entre 8 e 15 dígitos" }, { status: 400 });
    }
    patch.responsavelTelefone = telefone;
  }
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = MAPA[k];
    if (col) update[col] = v;
  }
  if (patch.tags !== undefined) update.tags = patch.tags;
  if (patch.atribuirMim) {
    const u = await getUsuarioLogado();
    if (u) {
      update.atendente_id = u.id;
      update.atendente_nome = u.nome;
    }
  }
  if (patch.naoLidasCount !== undefined) update.nao_lidas_count = patch.naoLidasCount;
  update.updated_at = new Date().toISOString();

  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });
  const sb = getDatabase();
  const { error } = await sb.from("conversas").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await registrarAudit("editar", "conversas", id, { campos: Object.keys(patch) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getDatabase();
  const { error } = await sb.from("conversas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await registrarAudit("excluir", "conversas", id);
  return NextResponse.json({ ok: true });
}
