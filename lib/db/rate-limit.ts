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

/* ------------------------------ Tentativas de login ------------------------------ */

/**
 * Login tem dois limites diferentes:
 *
 * - por IP, bem folgado, porque a escola inteira sai por um NAT só — apertar
 *   aqui tranca todo mundo por causa de uma pessoa que errou a senha;
 * - por conta E origem, com bloqueio progressivo, que é o que realmente segura
 *   força-bruta de senha (ou de CPF, no portal dos responsáveis).
 *
 * A escalada entra a origem na chave de propósito. Chaveada só pelo email, quem
 * soubesse o email da diretora mandaria uma senha errada a cada 15 minutos e a
 * manteria trancada para sempre — inclusive com a senha certa em mãos, e sem
 * ninguém para destravar, já que o estado é de memória. Com a origem na chave o
 * bloqueio vale para quem errou, e a dona da conta entra da rede dela. Isso só
 * se sustenta porque o nginx sobrescreve X-Real-IP/X-Forwarded-For com o
 * $remote_addr (deploy/nginx-semente-temporary.conf): sem isso a origem seria
 * escolhida por quem tenta e a escalada não valeria nada.
 *
 * MODO DE FALHA, para quem for mexer no deploy: sem o nginx à frente (dev, ou a
 * porta do Node exposta direto, ou um proxy que não reescreve esses cabeçalhos)
 * clientIp() devolve "unknown" para todo mundo (app/api/auth/login/route.ts).
 * A chave desta escalada colapsa em conta+"unknown", as tentativas de origens
 * diferentes se somam e o bloqueio volta a ser dirigível de fora: quem soubesse
 * o e-mail da diretora a manteria trancada. Publicar a porta do Node sem o
 * proxy na frente é, por isso, regressão de segurança — não só de log.
 *
 * Como o limitador acima, o estado vive na MEMÓRIA DO PROCESSO: zera em todo
 * deploy/restart do PM2 e não é compartilhado entre instâncias. Persistir isso
 * exigiria tabela nova.
 */
const IP_MAX_TENTATIVAS = 120;
const IP_JANELA_MS = 15 * 60 * 1000;
/** Erro de digitação não bloqueia ninguém; a escalada começa depois disso. */
const CONTA_TOLERANCIA = 4;
/**
 * A escalada para em 15 minutos de propósito: no dia de matrícula ninguém pode
 * ficar uma hora sem entrar por causa de senha digitada errada.
 */
const CONTA_BLOQUEIOS_MS = [60_000, 5 * 60_000, 15 * 60_000];
/** Falha antiga deixa de contar: quem acerta no dia seguinte não paga o histórico. */
const CONTA_JANELA_MS = 12 * 60 * 60 * 1000;
/**
 * Alvo de memória, não teto rígido: liberarEspacoContas é poda oportunista e só
 * descarta entradas já liberadas, então sob enxurrada de tentativas o mapa pode
 * passar do alvo. A limpeza definitiva é a janela de CONTA_JANELA_MS.
 */
const CONTA_MAX_ENTRADAS = 5_000;

interface TentativasConta {
  falhas: number;
  ultimaFalha: number;
  bloqueadoAte: number;
}

const CONTAS = new Map<string, TentativasConta>();

export interface BloqueioLogin {
  ok: boolean;
  resetIn: number; // segundos até liberar
}

const LIBERADO: BloqueioLogin = { ok: true, resetIn: 0 };

/** Tempo de espera em linguagem de gente, pro texto que vai pra tela. */
export function esperaLegivel(segundos: number): string {
  if (segundos <= 60) return "1 minuto";
  const minutos = Math.ceil(segundos / 60);
  if (minutos < 60) return `${minutos} minutos`;
  const horas = Math.ceil(minutos / 60);
  return horas === 1 ? "1 hora" : `${horas} horas`;
}

function chaveConta(escopo: string, conta: string, origem: string): string {
  return `${escopo}:${conta.trim().toLowerCase()}:${origem.trim() || "unknown"}`;
}

/** Limite folgado por origem — só barra volume anormal, não o uso da escola. */
export function verificarLimiteIpLogin(escopo: string, ip: string): BloqueioLogin {
  const resultado = checkRateLimit(`${escopo}-ip:${ip}`, IP_MAX_TENTATIVAS, IP_JANELA_MS);
  return { ok: resultado.ok, resetIn: resultado.resetIn };
}

/**
 * Consulta o bloqueio da conta nesta origem, sem consumir tentativa.
 * @param origem IP de quem está tentando (clientIp da rota).
 */
export function verificarBloqueioConta(
  escopo: string,
  conta: string,
  origem: string
): BloqueioLogin {
  if (!conta.trim()) return LIBERADO;
  const chave = chaveConta(escopo, conta, origem);
  const registro = CONTAS.get(chave);
  if (!registro) return LIBERADO;

  const agora = Date.now();
  if (registro.bloqueadoAte > agora) {
    return { ok: false, resetIn: Math.ceil((registro.bloqueadoAte - agora) / 1000) };
  }
  if (agora - registro.ultimaFalha > CONTA_JANELA_MS) CONTAS.delete(chave);
  return LIBERADO;
}

/** Registra credencial errada e devolve o bloqueio que passou a valer agora. */
export function registrarFalhaLogin(
  escopo: string,
  conta: string,
  origem: string
): BloqueioLogin {
  if (!conta.trim()) return LIBERADO;
  const chave = chaveConta(escopo, conta, origem);
  const agora = Date.now();
  const registro = CONTAS.get(chave);
  const anteriores = registro && agora - registro.ultimaFalha <= CONTA_JANELA_MS ? registro.falhas : 0;
  const falhas = anteriores + 1;
  const excedente = falhas - CONTA_TOLERANCIA;
  const bloqueioMs = excedente > 0
    ? CONTA_BLOQUEIOS_MS[Math.min(excedente - 1, CONTA_BLOQUEIOS_MS.length - 1)]
    : 0;

  if (!registro && CONTAS.size >= CONTA_MAX_ENTRADAS) liberarEspacoContas(agora);
  CONTAS.set(chave, { falhas, ultimaFalha: agora, bloqueadoAte: agora + bloqueioMs });

  return bloqueioMs > 0 ? { ok: false, resetIn: Math.ceil(bloqueioMs / 1000) } : LIBERADO;
}

/** Acertou a credencial: o histórico de erros desta origem deixa de pesar. */
export function registrarSucessoLogin(escopo: string, conta: string, origem: string): void {
  if (!conta.trim()) return;
  CONTAS.delete(chaveConta(escopo, conta, origem));
}

/**
 * Impede que tentativas em contas inexistentes façam o mapa crescer sem limite.
 * Só descarta entradas já liberadas — senão bastaria uma enxurrada de e-mails
 * inventados para apagar o bloqueio de uma conta sob ataque.
 */
function liberarEspacoContas(agora: number): void {
  const liberadas: Array<[string, number]> = [];
  for (const [chave, registro] of CONTAS) {
    if (registro.bloqueadoAte > agora) continue;
    if (agora - registro.ultimaFalha > CONTA_JANELA_MS) {
      CONTAS.delete(chave);
      continue;
    }
    liberadas.push([chave, registro.ultimaFalha]);
  }
  liberadas.sort((a, b) => a[1] - b[1]);
  for (const [chave] of liberadas) {
    if (CONTAS.size < CONTA_MAX_ENTRADAS) break;
    CONTAS.delete(chave);
  }
}

// Limpa buckets expirados periodicamente (memória)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of STORE.entries()) {
      if (b.resetAt < now) STORE.delete(k);
    }
    for (const [k, c] of CONTAS.entries()) {
      if (c.bloqueadoAte < now && now - c.ultimaFalha > CONTA_JANELA_MS) CONTAS.delete(k);
    }
  }, 60_000).unref?.();
}
