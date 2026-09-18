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
import {
  esperaLegivel,
  registrarFalhaLogin,
  registrarSucessoLogin,
  verificarBloqueioConta,
  verificarLimiteIpLogin,
} from "@/lib/db/rate-limit";

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
  // Limite por rede é folgado de propósito: a escola toda sai por um IP só.
  // Quem segura força-bruta é o bloqueio progressivo por conta, mais abaixo.
  const rateLimitIp = clientIp(req);
  const limiteIp = verificarLimiteIpLogin("login", rateLimitIp);
  if (!limiteIp.ok) {
    return NextResponse.json(
      {
        error: `Muitas tentativas de login vindas desta rede. Tente novamente em ${esperaLegivel(limiteIp.resetIn)}.`,
      },
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

  // Bloqueio por conta e origem: quem errou a senha espera, e a dona da conta
  // continua entrando de outra rede mesmo que alguém esteja errando de fora.
  const bloqueioConta = verificarBloqueioConta("login", email, rateLimitIp);
  if (!bloqueioConta.ok) {
    return NextResponse.json(
      {
        error: `Por segurança, o acesso a esta conta a partir desta rede está bloqueado por ${esperaLegivel(bloqueioConta.resetIn)} depois de várias senhas erradas. Espere esse tempo ou peça à direção para redefinir sua senha.`,
      },
      { status: 429 }
    );
  }

  try {
    const u = await buscarUsuarioPorEmail(email);
    const senhaCorreta = await checarSenha(senha, u?.senhaHash ?? DUMMY_PASSWORD_HASH);
    if (!u || !u.ativo || !senhaCorreta) {
      const bloqueio = registrarFalhaLogin("login", email, rateLimitIp);
      if (!bloqueio.ok) {
        return NextResponse.json(
          {
            error: `Email ou senha inválidos. Por segurança, o acesso a esta conta a partir desta rede ficou bloqueado por ${esperaLegivel(bloqueio.resetIn)}. Espere esse tempo ou peça à direção para redefinir sua senha.`,
          },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 });
    }
    registrarSucessoLogin("login", email, rateLimitIp);

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
