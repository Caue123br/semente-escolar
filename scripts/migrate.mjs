import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_MIGRATION_URL;
const migrationRole = process.env.DATABASE_MIGRATION_ROLE?.trim();

if (!connectionString) {
  throw new Error("DATABASE_MIGRATION_URL não configurada");
}
if (migrationRole && !/^[a-z_][a-z0-9_]*$/i.test(migrationRole)) {
  throw new Error("DATABASE_MIGRATION_ROLE inválida");
}

function timeoutEnv(name, fallback, maximum) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} inválida: informe milissegundos inteiros acima de zero`);
  }
  return Math.min(parsed, maximum);
}

// Sem lock_timeout, um ALTER TABLE espera indefinidamente por qualquer sessão
// que esteja com a tabela aberta e o deploy fica pendurado no meio. Falhar em
// segundos, com mensagem dizendo o que fazer, é melhor que travar o sistema.
const lockTimeoutMs = timeoutEnv("DATABASE_MIGRATION_LOCK_TIMEOUT_MS", 10_000, 120_000);
const statementTimeoutMs = timeoutEnv("DATABASE_MIGRATION_STATEMENT_TIMEOUT_MS", 300_000, 1_800_000);

// 55P03 = lock_timeout estourado ao esperar um lock de tabela.
function erroDeTimeout(error, contexto) {
  const codigo = error?.code;
  if (codigo === "55P03") {
    return new Error(
      `${contexto}: não foi possível obter o lock em ${lockTimeoutMs}ms. Alguma sessão está com a tabela aberta (consulta longa, transação parada ou psql esquecido). Encerre essa sessão e rode as migrations de novo.`,
      { cause: error }
    );
  }
  if (codigo === "57014") {
    return new Error(
      `${contexto}: o comando passou de ${statementTimeoutMs}ms e foi cancelado. Nada foi aplicado. Rode em janela de baixo uso ou aumente DATABASE_MIGRATION_STATEMENT_TIMEOUT_MS.`,
      { cause: error }
    );
  }
  return error;
}

// A trava é usada só por este runner: quem a segura é sempre outra execução de
// migrations, nunca uma consulta comum. Mandar encerrar a sessão aqui seria
// mandar derrubar um deploy no meio de um DDL.
function erroDeTravaOcupada(error) {
  if (error?.code === "55P03") {
    return new Error(
      `Trava de migrations ocupada: outra execução de migrations está em andamento (esperei ${lockTimeoutMs}ms pela trava). Espere ela terminar e rode as migrations de novo.`,
      { cause: error }
    );
  }
  return erroDeTimeout(error, "Trava de migrations ocupada");
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(scriptDirectory, "..", "db", "migrations");
const files = (await readdir(migrationsDirectory))
  .filter((file) => /^\d+.*\.sql$/.test(file))
  .sort((left, right) => left.localeCompare(right));

const client = new Client({
  connectionString,
  application_name: "semente-migrations",
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false,
});

await client.connect();

try {
  if (migrationRole) {
    await client.query(`SET ROLE "${migrationRole}"`);
  }
  await client.query(`SET lock_timeout = ${lockTimeoutMs}`);
  await client.query(`SET statement_timeout = ${statementTimeoutMs}`);

  try {
    await client.query("SELECT pg_advisory_lock(hashtext('semente-schema-migrations'))");
  } catch (error) {
    throw erroDeTravaOcupada(error);
  }
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const appliedResult = await client.query(
    "SELECT filename, checksum FROM public.schema_migrations ORDER BY filename"
  );
  const applied = new Map(appliedResult.rows.map((row) => [row.filename, row.checksum]));

  for (const filename of files) {
    const source = await readFile(path.join(migrationsDirectory, filename), "utf8");
    const checksum = createHash("sha256").update(source).digest("hex");
    const previousChecksum = applied.get(filename);

    if (previousChecksum) {
      if (previousChecksum !== checksum) {
        throw new Error(`Migration já aplicada foi alterada: ${filename}`);
      }
      process.stdout.write(`skip ${filename}\n`);
      continue;
    }

    process.stdout.write(`apply ${filename}\n`);
    await client.query("BEGIN");
    try {
      await client.query(source);
      await client.query(
        "INSERT INTO public.schema_migrations (filename, checksum) VALUES ($1, $2)",
        [filename, checksum]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw erroDeTimeout(error, `Migration ${filename} não foi aplicada`);
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('semente-schema-migrations'))").catch(() => {});
  await client.end();
}

process.stdout.write("migrations ok\n");
