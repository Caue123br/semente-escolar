// Cria um usuário do sistema pela linha de comando.
//
// A criação normal acontece em Configurações → Usuários, e exige estar logado
// como diretor. Este script existe para dois casos em que aquela porta não
// serve: montar o quadro inicial de acessos e destravar a escola quando não há
// nenhum diretor capaz de entrar.
//
// A senha é sorteada aqui e impressa UMA vez, no fim. Não é gravada em lugar
// nenhum além do hash bcrypt — se a folha for perdida, o caminho é trocar a
// senha, não recuperá-la.
//
//   NOME="Maria Silva" EMAIL=maria@escola.com PERFIL=coordenador \
//     node --env-file-if-exists=.env.local scripts/criar-usuario.mjs
//
// PERFIL: diretor | coordenador | professor | financeiro

import { randomUUID, randomInt } from "node:crypto";

import bcrypt from "bcryptjs";
import pg from "pg";

const { Client } = pg;

const PERFIS = ["diretor", "coordenador", "professor", "financeiro"];

const connectionString =
  process.env.DATABASE_BOOTSTRAP_URL ?? process.env.DATABASE_MIGRATION_URL;
const migrationRole = process.env.DATABASE_MIGRATION_ROLE?.trim();
const schoolId = (process.env.SCHOOL_ID ?? "default").trim();
const nome = process.env.NOME?.trim();
const email = process.env.EMAIL?.trim().toLowerCase();
const perfil = process.env.PERFIL?.trim();

if (!connectionString) {
  throw new Error("DATABASE_MIGRATION_URL não configurada");
}
if (migrationRole && !/^[a-z_][a-z0-9_]*$/i.test(migrationRole)) {
  throw new Error("DATABASE_MIGRATION_ROLE inválida");
}
if (!nome || nome.length < 2 || nome.length > 120) {
  throw new Error("NOME é obrigatório (2 a 120 caracteres)");
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
  throw new Error("EMAIL válido é obrigatório");
}
if (!perfil || !PERFIS.includes(perfil)) {
  throw new Error(`PERFIL deve ser um de: ${PERFIS.join(", ")}`);
}

// Sem caracteres ambíguos (O/0, l/1/I): a senha vai ser lida em voz alta ou
// copiada de um papel antes do primeiro acesso.
function sortearSenha(tamanho = 20) {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let senha = "";
  for (let i = 0; i < tamanho; i += 1) {
    senha += alfabeto[randomInt(alfabeto.length)];
  }
  return senha;
}

const senha = sortearSenha();
// Custo 12 — o mesmo de lib/db/auth.ts, senão o login fica mais lento ou mais
// fraco que o do resto do sistema.
const senhaHash = await bcrypt.hash(senha, 12);

const client = new Client({
  connectionString,
  application_name: "semente-criar-usuario",
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : false,
});

await client.connect();

try {
  if (migrationRole) {
    await client.query(`SET ROLE "${migrationRole}"`);
  }
  await client.query("BEGIN");

  const escola = await client.query("SELECT 1 FROM app.escolas WHERE id = $1", [schoolId]);
  if (escola.rowCount !== 1) {
    throw new Error(`Escola "${schoolId}" não existe. Rode as migrations antes.`);
  }

  const id = `usr-${randomUUID()}`;
  const inserido = await client.query(
    `INSERT INTO iam.usuarios
       (escola_id, id, email, nome, perfil, senha_hash, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     ON CONFLICT (escola_id, email) DO NOTHING
     RETURNING id`,
    [schoolId, id, email, nome, perfil, senhaHash]
  );

  if (inserido.rowCount !== 1) {
    throw new Error(`Já existe um usuário com o e-mail ${email} nesta escola`);
  }

  await client.query("COMMIT");
} catch (erro) {
  await client.query("ROLLBACK");
  throw erro;
} finally {
  await client.end();
}

process.stdout.write(
  `\n  ${nome} · ${perfil}\n  login: ${email}\n  senha: ${senha}\n\n` +
    `  Entregue em particular. Só um diretor consegue trocar essa senha depois,\n` +
    `  em Configurações → Usuários.\n\n`
);
