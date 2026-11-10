import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const raiz = path.join(new URL(".", import.meta.url).pathname, "..", "..");

function carregarPostgres() {
  const codigo = ts.transpileModule(readFileSync(path.join(raiz, "lib/db/postgres.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports, process, console,
    require(id) {
      if (id === "server-only") return {};
      if (id === "pg") return { Pool: class Pool {}, types: { setTypeParser() {} } };
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports;
}

function arquivosDeRota(diretorio) {
  const achados = [];
  for (const nome of readdirSync(diretorio)) {
    const caminho = path.join(diretorio, nome);
    if (statSync(caminho).isDirectory()) achados.push(...arquivosDeRota(caminho));
    else if (nome === "route.ts") achados.push(caminho);
  }
  return achados;
}

// O builder lança "Tabela não permitida" para tabelas fora do registro TABLES —
// e os testes de rota stubam getDatabase, então esse erro só apareceria em
// produção. Este teste varre TODAS as rotas e prende cada .from("...") usado
// ao registro real (foi exatamente o furo da tabela alunos_documentos).
test("toda tabela usada nas rotas da API está registrada no query builder real", () => {
  const { getDatabase } = carregarPostgres();
  const db = getDatabase();

  const usadas = new Set();
  for (const arquivo of arquivosDeRota(path.join(raiz, "app", "api"))) {
    const fonte = readFileSync(arquivo, "utf8");
    for (const [, tabela] of fonte.matchAll(/\.from\("([a-z_]+)"\)/g)) usadas.add(tabela);
  }
  assert.ok(usadas.size >= 10, `varredura encontrou só ${usadas.size} tabelas — regex quebrou?`);
  assert.ok(usadas.has("alunos_documentos"), "a varredura precisa enxergar as rotas de documentos");

  for (const tabela of usadas) {
    assert.doesNotThrow(() => db.from(tabela), `Tabela usada em rota mas fora do registro: ${tabela}`);
  }
});

test("tabela desconhecida continua bloqueada pelo registro", () => {
  const { getDatabase } = carregarPostgres();
  assert.throws(() => getDatabase().from("tabela_inventada"), /não permitida/);
});
