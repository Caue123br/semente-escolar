import { NextResponse } from "next/server";
import { getUsuarioLogado } from "@/lib/db/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getUsuarioLogado();
  if (!u) return NextResponse.json({ usuario: null });
  return NextResponse.json({
    usuario: {
      id: u.id,
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
    },
  });
}
