/**
 * Rate limiter simples in-memory.
 *
 * Em produção com uma instância PM2, limita tentativas por processo.
 * Para múltiplas instâncias, trocar por um limitador compartilhado.
 */

interface Bucket {
  tokens: number;
  resetAt: number;
}

const STORE = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetIn: number; // segundos até reset
}

/**
 * Verifica se a chave está dentro do limite.
 * @param key combine IP + endpoint (ex: "login:127.0.0.1")
 * @param max número máximo de chamadas
 * @param windowMs janela em ms
 */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = STORE.get(key);

  if (!bucket || bucket.resetAt < now) {
    const novo = { tokens: max - 1, resetAt: now + windowMs };
    STORE.set(key, novo);
    return { ok: true, remaining: novo.tokens, resetIn: Math.ceil(windowMs / 1000) };
  }

  if (bucket.tokens <= 0) {
    return { ok: false, remaining: 0, resetIn: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.tokens--;
  return { ok: true, remaining: bucket.tokens, resetIn: Math.ceil((bucket.resetAt - now) / 1000) };
}

// Limpa buckets expirados periodicamente (memória)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of STORE.entries()) {
      if (b.resetAt < now) STORE.delete(k);
    }
  }, 60_000).unref?.();
}
