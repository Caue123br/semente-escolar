import { NextResponse } from "next/server";
import {
  checkDatabaseConnection,
  getPostgresPool,
  isDatabaseConfigured,
} from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Acima disso o banco responde, mas devagar: vira aviso, não queda. Reiniciar o
// app por lentidão do banco não devolveria o sistema para a secretaria.
const LATENCIA_DEGRADADA_MS = 1_500;

// Rota pública e sem autenticação: só sinais de operação, nada de string de
// conexão, versão de servidor, nome de host ou contagem de registros.
type StatusOperacional =
  | "ok"
  | "degradado"
  | "banco_fora"
  | "schema_incompleto"
  | "sem_configuracao";

interface Diagnostico {
  /** Nenhum problema detectado — falso também quando está apenas lento. */
  ok: boolean;
  /** O app consegue atender requisições agora. Base do 200 x 503. */
  ready: boolean;
  status: StatusOperacional;
  db: "up" | "down" | "unconfigured";
  db_latency_ms: number | null;
  latency_ms: number;
  uptime_s: number;
  rss_mb: number;
  timestamp: string;
}

function responder(diagnostico: Diagnostico): NextResponse {
  const resposta = NextResponse.json(diagnostico, { status: diagnostico.ready ? 200 : 503 });
  // Sem cache em nenhuma camada: um health cacheado responde por um app morto.
  resposta.headers.set("Cache-Control", "no-store");
  return resposta;
}

export async function GET() {
  const inicio = Date.now();
  const processo = {
    uptime_s: Math.round(process.uptime()),
    rss_mb: Math.round(process.memoryUsage.rss() / 1024 / 1024),
    timestamp: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    console.error("[health] DATABASE_URL não configurada");
    return responder({
      ...processo,
      ok: false,
      ready: false,
      status: "sem_configuracao",
      db: "unconfigured",
      db_latency_ms: null,
      latency_ms: Date.now() - inicio,
    });
  }

  // Duas checagens separadas porque a ação de plantão é diferente: "banco fora"
  // (Postgres parado, rede, credencial) pede olhar o banco; "schema incompleto"
  // (deploy sem migration ou sem GRANT) pede olhar o deploy.
  const inicioBanco = Date.now();
  try {
    await getPostgresPool().query("SELECT 1");
  } catch (error) {
    console.error("[health] banco inacessível", error);
    return responder({
      ...processo,
      ok: false,
      ready: false,
      status: "banco_fora",
      db: "down",
      db_latency_ms: null,
      latency_ms: Date.now() - inicio,
    });
  }
  const latenciaBanco = Date.now() - inicioBanco;

  try {
    await checkDatabaseConnection();
  } catch (error) {
    console.error("[health] schema ou privilégios incompletos", error);
    return responder({
      ...processo,
      ok: false,
      ready: false,
      status: "schema_incompleto",
      db: "up",
      db_latency_ms: latenciaBanco,
      latency_ms: Date.now() - inicio,
    });
  }

  const latenciaTotal = Date.now() - inicio;
  const degradado = latenciaTotal > LATENCIA_DEGRADADA_MS;
  return responder({
    ...processo,
    ok: !degradado,
    ready: true,
    status: degradado ? "degradado" : "ok",
    db: "up",
    db_latency_ms: latenciaBanco,
    latency_ms: latenciaTotal,
  });
}
