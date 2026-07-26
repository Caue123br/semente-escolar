import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESCOLA_ID = process.env.SCHOOL_ID ?? "default";

export async function GET() {
  const sb = getDatabase();
  const { data, error } = await sb.from("escolas").select("*").eq("id", ESCOLA_ID).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json({ error: "Escola não configurada" }, { status: 404 });
  }
  return NextResponse.json({
    id: String(data.id),
    nome: String(data.nome ?? ""),
    cnpj: String(data.cnpj ?? ""),
    endereco: String(data.endereco ?? ""),
    telefone: String(data.telefone ?? ""),
    logoTexto: String(data.logo_texto ?? "EM"),
    logoUrl: data.logo_url ? String(data.logo_url) : null,
  });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const sb = getDatabase();
  const update: Record<string, unknown> = {};
  if (body.nome !== undefined) update.nome = body.nome;
  if (body.cnpj !== undefined) update.cnpj = body.cnpj;
  if (body.endereco !== undefined) update.endereco = body.endereco;
  if (body.telefone !== undefined) update.telefone = body.telefone;
  if (body.logoTexto !== undefined) update.logo_texto = body.logoTexto;
  if (body.logoUrl !== undefined) update.logo_url = body.logoUrl;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido enviado" }, { status: 400 });
  }
  const { data, error } = await sb
    .from("escolas")
    .update(update)
    .eq("id", ESCOLA_ID)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Escola não encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
