import crypto from "crypto";

function secret(): string {
  const value = process.env.PAIS_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("PAIS_SESSION_SECRET deve ter pelo menos 32 caracteres");
  }
  return value;
}

export interface PaisSession {
  email: string;
  cpf: string;
  exp: number; // unix timestamp
}

export function assinarSessaoPais(s: Omit<PaisSession, "exp">): string {
  const payload: PaisSession = {
    ...s,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 dias
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${sig}`;
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
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
