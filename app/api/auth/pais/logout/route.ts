import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("pais_session", "", { path: "/", maxAge: 0 });
  // Compat: limpa cookies antigos
  res.cookies.set("pais_email", "", { path: "/", maxAge: 0 });
  res.cookies.set("pais_cpf", "", { path: "/", maxAge: 0 });
  return res;
}
