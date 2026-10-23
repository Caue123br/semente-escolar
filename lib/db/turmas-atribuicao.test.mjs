import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = new URL("../../", import.meta.url);

function carregar(caminho, dependencias) {
  const source = readFileSync(new URL(caminho, root), "utf8");
  const codigo = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports, Request, Response,
    require(id) {
      if (Object.hasOwn(dependencias, id)) return dependencias[id];
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports;
}

function ambiente(perfil = "coordenador") {
  const tabelas = {
    turmas: [{ id: "sala-1", nome: "Sala Exemplo", capacidade: 20, professor_usuario_id: "prof-antiga", professor_id: "prof-antiga", professor_nome: "Professora Anterior" }],
    usuarios: [
      { id: "prof-ativa", nome: "Nome Canônico", perfil: "professor", ativo: true },
      { id: "prof-inativa", nome: "Pessoa Inativa", perfil: "professor", ativo: false },
      { id: "outro-perfil", nome: "Coordenação", perfil: "coordenador", ativo: true },
    ],
  };
  const db = {
    from(tabela) {
      const filtros = [];
      let operacao = "select", payload, unico = false;
      const consulta = {
        select() { return consulta; },
        eq(campo, valor) { filtros.push([campo, valor]); return consulta; },
        order() { return consulta; },
        insert(valor) { operacao = "insert"; payload = valor; return consulta; },
        update(valor) { operacao = "update"; payload = valor; return consulta; },
        single() { unico = true; return consulta; },
        maybeSingle() { unico = true; return consulta; },
        then(resolve, reject) {
          let linhas = tabelas[tabela].filter((linha) => filtros.every(([campo, valor]) => linha[campo] === valor));
          if (operacao === "insert") { tabelas[tabela].push(payload); linhas = [payload]; }
          if (operacao === "update") linhas.forEach((linha) => Object.assign(linha, payload));
          return Promise.resolve({ data: unico ? linhas[0] ?? null : linhas, error: null }).then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  const next = { NextResponse: { json: (corpo, opcoes) => new Response(JSON.stringify(corpo), opcoes) } };
  const acesso = carregar("lib/access-control.ts", {});
  const respostas = carregar("lib/db/api-response.ts", { "next/server": next });
  const dependencias = {
    "next/server": next,
    "node:crypto": { randomUUID: () => "sala-nova" },
    "@/lib/access-control": acesso,
    "@/lib/db/api-response": respostas,
    "@/lib/db/auth": { getUsuarioLogado: async () => ({ id: "gestora", perfil }) },
    "@/lib/db/postgres": { getDatabase: () => db },
    "@/lib/db/audit": { registrarAudit: async () => {} },
    "@/lib/db/mappers": { rowToTurma: (row) => row },
    "@/lib/db/seed": { seedTurmas: async () => {} },
    "@/lib/db/professor-scope": { resolverEscopoProfessor: async () => ({ restrito: false }), professorPodeAcessarTurma: () => true },
  };
  return {
    tabelas,
    criar: carregar("app/api/turmas/route.ts", dependencias).POST,
    editar: carregar("app/api/turmas/[id]/route.ts", dependencias).PATCH,
  };
}

const requisicao = (body) => new Request("https://exemplo.invalid/api/turmas/sala-1", {
  method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});
const params = { params: Promise.resolve({ id: "sala-1" }) };

test("coordenação atribui responsável pelo nome sem criar login e remove IDs anteriores", async () => {
  const { editar, tabelas } = ambiente();
  const resposta = await editar(requisicao({ professorId: "", professorNome: "  Professora Responsável  " }), params);
  assert.equal(resposta.status, 200);
  assert.equal(tabelas.turmas[0].professor_nome, "Professora Responsável");
  assert.equal(tabelas.turmas[0].professor_usuario_id, null);
  assert.equal(tabelas.turmas[0].professor_id, null);
});

test("vincular professora ativa usa nome canônico e rejeita inativa, outro perfil ou ID ausente", async () => {
  const { editar, tabelas } = ambiente();
  assert.equal((await editar(requisicao({ professorId: "prof-ativa", professorNome: "Nome inventado" }), params)).status, 200);
  assert.equal(tabelas.turmas[0].professor_nome, "Nome Canônico");
  assert.equal(tabelas.turmas[0].professor_usuario_id, "prof-ativa");
  for (const professorId of ["prof-inativa", "outro-perfil", "inexistente"]) {
    assert.equal((await editar(requisicao({ professorId }), params)).status, 422);
  }
});

test("editar sala e capacidade preserva atribuição e limpar exige os dois campos vazios", async () => {
  const { editar, tabelas } = ambiente();
  assert.equal((await editar(requisicao({ nome: "Sala Renomeada", capacidade: 25 }), params)).status, 200);
  assert.equal(tabelas.turmas[0].professor_usuario_id, "prof-antiga");
  assert.equal((await editar(requisicao({ professorId: "" }), params)).status, 400);
  assert.equal(tabelas.turmas[0].professor_usuario_id, "prof-antiga");
  assert.equal((await editar(requisicao({ professorId: "", professorNome: "" }), params)).status, 200);
  assert.equal(tabelas.turmas[0].professor_nome, null);
});

test("professor e financeiro não atribuem nem criam turmas mesmo chamando handler diretamente", async () => {
  for (const perfil of ["professor", "financeiro"]) {
    const { criar, editar, tabelas } = ambiente(perfil);
    assert.equal((await editar(requisicao({ professorId: "prof-ativa" }), params)).status, 403);
    assert.equal((await criar(requisicao({ nome: "Sala Nova", serie: "Maternal", turno: "Manhã", capacidade: 20 }))).status, 403);
    assert.equal(tabelas.turmas.length, 1);
  }
});

test("criar turma permite responsável sem login e mantém cadastro sem professora possível", async () => {
  const { criar, tabelas } = ambiente("diretor");
  const base = { nome: "Sala Nova", serie: "Maternal", turno: "Manhã", capacidade: 20 };
  assert.equal((await criar(requisicao({ ...base, professorId: "", professorNome: "Professora Manual" }))).status, 201);
  assert.equal(tabelas.turmas.at(-1).professor_nome, "Professora Manual");
  assert.equal(tabelas.turmas.at(-1).professor_usuario_id, null);
  assert.equal((await criar(requisicao(base))).status, 201);
  assert.equal(tabelas.turmas.at(-1).professor_nome, null);
});
