import { NextResponse } from "next/server";
import { registrarAudit } from "@/lib/db/audit";
import { cookies } from "next/headers";
import {
  revogarSessaoToken,
  SESSION_COOKIE_NAME,
} from "@/lib/db/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await registrarAudit("logout", "usuarios");
  const cookieStore = await cookies();
  await revogarSessaoToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  res.cookies.set("modelo_session", "", { path: "/", maxAge: 0 });
  res.cookies.set("modelo_user", "", { path: "/", maxAge: 0 });
  return res;
}
