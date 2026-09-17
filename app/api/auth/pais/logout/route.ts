import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { PAIS_SESSION_COOKIE, revogarSessaoPais } from "@/lib/db/pais-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  // Apagar o cookie do navegador não invalida um token já copiado: a revogação
  // no servidor é o que derruba a sessão de verdade.
  revogarSessaoPais(cookieStore.get(PAIS_SESSION_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PAIS_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  // Compat: limpa cookies antigos
  res.cookies.set("pais_email", "", { path: "/", maxAge: 0 });
  res.cookies.set("pais_cpf", "", { path: "/", maxAge: 0 });
  return res;
}
