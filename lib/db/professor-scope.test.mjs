import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const codigo = ts.transpileModule(readFileSync(new URL("./professor-scope.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function resolverComDados(tabelas) {
  const db = {
    from(tabela) {
      let linhas = tabelas[tabela] ?? [];
      const consulta = {
        select() { return consulta; },
        eq(coluna, valor) { linhas = linhas.filter((linha) => linha[coluna] === valor); return consulta; },
        then(resolve, reject) { return Promise.resolve({ data: linhas, error: null }).then(resolve, reject); },
      };
      return consulta;
    },
  };
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    require(id) {
      if (id === "server-only") return {};
      if (id === "@/lib/db/postgres") return { getDatabase: () => db };
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.resolverEscopoProfessor;
}

const usuario = { id: "prof-a", nome: "Professora Exemplo", perfil: "professor" };
const professores = [
  { id: "prof-a", nome: "Professora Exemplo", perfil: "professor", ativo: true },
  { id: "prof-b", nome: "Professora Exemplo", perfil: "professor", ativo: true },
];

test("vínculos por ID permanecem válidos para professoras homônimas e múltiplas turmas", async () => {
  const resolver = resolverComDados({
    usuarios: professores,
    turmas: [
      { id: "sala-1", professor_usuario_id: "prof-a", professor_nome: "Professora Exemplo" },
      { id: "sala-2", professor_usuario_id: "prof-b", professor_nome: "Professora Exemplo" },
      { id: "sala-3", professor_usuario_id: "prof-a", professor_nome: "Nome anterior" },
    ],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await resolver(usuario))), {
    restrito: true, turmaIds: ["sala-1", "sala-3"],
  });
});

test("nome igual não dá acesso à sala com vínculo explícito de outra professora", async () => {
  const resolver = resolverComDados({
    usuarios: [professores[0]],
    turmas: [{ id: "sala-outra", professor_usuario_id: "prof-b", professor_nome: "Professora Exemplo" }],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await resolver(usuario))), { restrito: true, turmaIds: [] });
});

test("nome manual nunca concede acesso, mesmo com um único professor ativo homônimo", async () => {
  const turmas = [{ id: "sala-legada", professor_id: "legado-1", professor_nome: "Professora Exemplo" }];
  assert.deepEqual(JSON.parse(JSON.stringify(await resolverComDados({ usuarios: [professores[0]], turmas })(usuario))), {
    restrito: true, turmaIds: [],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await resolverComDados({ usuarios: professores, turmas })(usuario))), {
    restrito: true, turmaIds: [],
  });
});

test("ID legado sem vínculo canônico também não concede acesso em runtime", async () => {
  const resolver = resolverComDados({
    turmas: [{ id: "sala-legada", professor_id: "prof-a", professor_nome: "Professora Exemplo" }],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await resolver(usuario))), { restrito: true, turmaIds: [] });
});

test("coordenação mantém escopo de gestão sem depender de turma atribuída", async () => {
  const resolver = resolverComDados({});
  assert.deepEqual(JSON.parse(JSON.stringify(await resolver({ ...usuario, perfil: "coordenador" }))), {
    restrito: false, turmaIds: null,
  });
});
