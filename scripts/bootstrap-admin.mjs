import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import pg from "pg";

const { Client } = pg;

const connectionString =
  process.env.DATABASE_BOOTSTRAP_URL ?? process.env.DATABASE_MIGRATION_URL;
const migrationRole = process.env.DATABASE_MIGRATION_ROLE?.trim();
const schoolId = (process.env.SCHOOL_ID ?? "default").trim();
const schoolName = process.env.SCHOOL_NAME?.trim();
const adminName = process.env.ADMIN_NAME?.trim();
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

delete process.env.ADMIN_PASSWORD;

if (!connectionString) {
  throw new Error("DATABASE_MIGRATION_URL não configurada");
}
if (migrationRole && !/^[a-z_][a-z0-9_]*$/i.test(migrationRole)) {
  throw new Error("DATABASE_MIGRATION_ROLE inválida");
}
if (!schoolId || !schoolName) {
  throw new Error("SCHOOL_ID e SCHOOL_NAME são obrigatórios");
}
if (!adminName || !adminEmail || !adminEmail.includes("@")) {
  throw new Error("ADMIN_NAME e ADMIN_EMAIL válido são obrigatórios");
}
if (
  !adminPassword ||
  adminPassword.length < 12 ||
  Buffer.byteLength(adminPassword, "utf8") > 72
) {
  throw new Error("ADMIN_PASSWORD deve ter entre 12 e 72 bytes");
}

const passwordHash = await bcrypt.hash(adminPassword, 12);
const client = new Client({
  connectionString,
  application_name: "semente-bootstrap-admin",
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false,
});

await client.connect();

try {
  if (migrationRole) {
    await client.query(`SET ROLE "${migrationRole}"`);
  }
  await client.query("BEGIN");
  await client.query(
    `INSERT INTO app.escolas (id, nome)
     VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [schoolId, schoolName]
  );

  const inserted = await client.query(
    `INSERT INTO iam.usuarios
       (escola_id, id, email, nome, perfil, senha_hash, ativo)
     VALUES ($1, $2, $3, $4, 'diretor', $5, TRUE)
     ON CONFLICT (escola_id, email) DO NOTHING
     RETURNING id`,
    [schoolId, randomUUID(), adminEmail, adminName, passwordHash]
  );

  if (inserted.rowCount !== 1) {
    throw new Error("Já existe um usuário com esse e-mail nesta escola");
  }

  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

process.stdout.write(`Diretor criado para ${adminEmail} na escola ${schoolId}.\n`);
