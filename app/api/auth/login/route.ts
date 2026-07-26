import { NextResponse } from "next/server";
import { isIP } from "node:net";
import {
  buscarUsuarioPorEmail,
  checarSenha,
  criarSessao,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";
import { getDatabase } from "@/lib/db/postgres";
import { checkRateLimit } from "@/lib/db/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DUMMY_PASSWORD_HASH = "$2b$12$3ol1t.hVqSKuhw7BkzB0Fejw292bWxGL2fFB5OmM5v22tohCmunVW";

function clientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;
  const forwarded = req.headers.get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .at(-1);
  return forwarded && isIP(forwarded) ? forwarded : "unknown";
}

export async function POST(req: Request) {
  // Rate limit: 8 tentativas / 5min por IP
  const rateLimitIp = clientIp(req);
  const rl = checkRateLimit(`login:${rateLimitIp}`, 8, 5 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${Math.ceil(rl.resetIn / 60)} minuto(s).` },
      { status: 429 }
    );
  }

  let body: { senha?: unknown; email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }
  const senha = String(body.senha ?? "");
  const email = body.email ? String(body.email).toLowerCase().trim() : "";

  if (
    !email ||
    email.length > 254 ||
    !email.includes("@") ||
    !senha ||
    Buffer.byteLength(senha, "utf8") > 72
  ) {
    return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
  }

  try {
    const u = await buscarUsuarioPorEmail(email);
    const senhaCorreta = await checarSenha(senha, u?.senhaHash ?? DUMMY_PASSWORD_HASH);
    if (!u || !u.ativo || !senhaCorreta) {
      return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 });
    }

    const { token, maxAge } = await criarSessao(u, {
      ip: rateLimitIp === "unknown" ? null : rateLimitIp,
      userAgent: req.headers.get("user-agent"),
    });
    const res = NextResponse.json({ ok: true, perfil: u.perfil, nome: u.nome });
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(maxAge));
    // Remove os cookies inseguros das versões anteriores.
    res.cookies.set("modelo_user", "", { path: "/", maxAge: 0 });
    res.cookies.set("modelo_session", "", { path: "/", maxAge: 0 });

    const { error: updateError } = await getDatabase()
      .from("usuarios")
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq("id", u.id);
    if (updateError) console.error("[auth] ultimo_acesso falhou", updateError);

    await registrarAudit("login", "usuarios", u.id, { email: u.email }, u);
    return res;
  } catch (error) {
    console.error("[auth] login indisponível", error);
    return NextResponse.json({ error: "Serviço temporariamente indisponível" }, { status: 503 });
  }
}
