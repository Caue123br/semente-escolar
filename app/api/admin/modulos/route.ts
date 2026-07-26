import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = getDatabase();
  const { data, error } = await sb
    .from("modulos_config")
    .select("*")
    .order("grupo", { ascending: true })
    .order("ordem", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    items: (data ?? []).map((m) => ({
      id: String(m.id),
      nome: String(m.nome),
      ativo: Boolean(m.ativo),
      grupo: m.grupo ? String(m.grupo) : null,
      ordem: Number(m.ordem ?? 0),
      descricao: m.descricao ? String(m.descricao) : null,
    })),
  });
}

interface ToggleInput {
  id: string;
  ativo: boolean;
}

export async function PATCH(req: Request) {
  const u = await getUsuarioLogado();
  if (u?.perfil !== "diretor") {
    return NextResponse.json({ error: "Apenas a diretora pode ativar/desativar módulos" }, { status: 403 });
  }
  const body = (await req.json()) as ToggleInput;
  if (!body.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const sb = getDatabase();
  const { error } = await sb
    .from("modulos_config")
    .update({ ativo: body.ativo, updated_at: new Date().toISOString() })
    .eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await registrarAudit("editar", "modulos_config", body.id, { ativo: body.ativo });
  return NextResponse.json({ ok: true });
}
