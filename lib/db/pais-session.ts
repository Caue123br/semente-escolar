import crypto from "crypto";

function secret(): string {
  const value = process.env.PAIS_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("PAIS_SESSION_SECRET deve ter pelo menos 32 caracteres");
  }
  return value;
}

/**
 * Nome do cookie da sessão dos responsáveis.
 *
 * TODO(auditoria): trocar por "__Host-pais_session" em produção. O prefixo só
 * pode entrar junto com os três pontos que leem/apagam o cookie pelo nome
 * literal — proxy.ts, app/pais/page.tsx e app/api/auth/pais/logout/route.ts.
 * Renomear só aqui desloga todas as famílias do portal, que está no ar.
 */
export const PAIS_SESSION_COOKIE = "pais_session";

/** Sessão curta: o login é email+CPF, refazer custa pouco pra família. */
function ttlHoras(): number {
  const configurado = Number(process.env.PAIS_SESSION_TTL_HORAS ?? 12);
  if (!Number.isFinite(configurado)) return 12;
  return Math.min(Math.max(Math.trunc(configurado), 1), 72);
}

export function paisSessionMaxAge(): number {
  return ttlHoras() * 60 * 60;
}

export function paisSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: paisSessionMaxAge(),
  };
}

export interface PaisSession {
  email: string;
  cpf: string;
  exp: number; // unix timestamp
}

/**
 * Revogação sem tabela: guarda as assinaturas revogadas até o vencimento delas.
 * Vive na memória do processo — zera em deploy/restart, quando as sessões
 * curtas já estão perto de vencer de qualquer forma. Por isso também NÃO
 * atravessa workers: com o PM2 em cluster, o logout revoga no worker que
 * atendeu e os outros seguem aceitando o token até ele expirar. Revogação
 * valendo para todos exigiria tabela.
 */
const REVOGADAS = new Map<string, number>();

function limparRevogadas(agora: number): void {
  for (const [assinatura, expira] of REVOGADAS) {
    if (expira <= agora) REVOGADAS.delete(assinatura);
  }
}

export function assinarSessaoPais(s: Omit<PaisSession, "exp">): string {
  const payload: PaisSession = {
    ...s,
    exp: Date.now() + paisSessionMaxAge() * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/** Invalida o token no servidor, não só no navegador. */
export function revogarSessaoPais(cookie: string | undefined | null): void {
  const payload = verificarSessaoPais(cookie);
  if (!payload || !cookie) return;
  const assinatura = cookie.split(".")[1];
  if (!assinatura) return;
  limparRevogadas(Date.now());
  REVOGADAS.set(assinatura, payload.exp);
}

export function verificarSessaoPais(cookie: string | undefined | null): PaisSession | null {
  if (!cookie) return null;
  const parts = cookie.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  let expected: Buffer;
  let received: Buffer;
  try {
    expected = crypto.createHmac("sha256", secret()).update(data).digest();
    received = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as PaisSession;
    if (!payload.email || !payload.cpf) return null;
    const agora = Date.now();
    if (payload.exp < agora) return null;
    // Cookie emitido sob um TTL maior que o atual (as sessões de 30 dias que
    // existiam antes desta correção) não vale mais. Vale para qualquer redução
    // de PAIS_SESSION_TTL_HORAS: baixar o valor desloga todas as famílias no
    // ato, então mudar isso é assunto para fora do horário de atendimento.
    if (payload.exp - agora > paisSessionMaxAge() * 1000 + 60_000) return null;
    if (REVOGADAS.has(sig)) return null;
    return payload;
  } catch {
    return null;
  }
}
