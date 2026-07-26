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
  await client.query("SELECT pg_advisory_lock(hashtext('semente-schema-migrations'))");
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
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('semente-schema-migrations'))").catch(() => {});
  await client.end();
}

process.stdout.write("migrations ok\n");
