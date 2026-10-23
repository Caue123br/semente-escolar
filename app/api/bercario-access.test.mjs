import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = new URL("../../", import.meta.url);

function carregar(caminho, dependencias) {
  const codigo = ts.transpileModule(readFileSync(new URL(caminho, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports, Request, Response, console,
    process: { env: { SCHOOL_ID: "escola-a", UPLOADS_DIR: "/private/tmp/fotos-de-teste" } },
    require(id) {
      if (Object.hasOwn(dependencias, id)) return dependencias[id];
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports;
}

function ambiente(perfil = "professor", comTurma = true) {
  const usuario = perfil ? { id: "prof-a", nome: "Professora A", perfil } : null;
  const tabelas = {
    turmas: [
      { id: "sala-a", professor_usuario_id: comTurma ? "prof-a" : "outro" },
      { id: "sala-b", professor_usuario_id: "prof-b" },
    ],
    bercario_bebes: [
      { id: "bebe-a", nome: "Bebê A", turma_id: "sala-a" },
      { id: "bebe-b", nome: "Bebê B", turma_id: "sala-b" },
      { id: "bebe-legado", nome: "Bebê Legado", turma_id: null, professora: "Professora A" },
    ],
    bercario_registros: [
      { id: "reg-a", bebe_id: "bebe-a", detalhes: "original a" },
      { id: "reg-b", bebe_id: "bebe-b", detalhes: "original b" },
      { id: "reg-legado", bebe_id: "bebe-legado", detalhes: "original legado" },
    ],
    alunos: [{ id: "aluno-a", turma_id: "sala-a" }, { id: "aluno-b", turma_id: "sala-b" }],
  };
  const db = {
    from(tabela) {
      const filtros = [];
      let operacao = "select", payload, unico = false;
      const consulta = {
        select() { return consulta; },
        eq(campo, valor) { filtros.push((linha) => linha[campo] === valor); return consulta; },
        in(campo, valores) { filtros.push((linha) => valores.includes(linha[campo])); return consulta; },
        order() { return consulta; }, limit() { return consulta; },
        insert(valor) { operacao = "insert"; payload = valor; return consulta; },
        update(valor) { operacao = "update"; payload = valor; return consulta; },
        delete() { operacao = "delete"; return consulta; },
        single() { unico = true; return consulta; }, maybeSingle() { unico = true; return consulta; },
        then(resolve, reject) {
          let linhas = tabelas[tabela].filter((linha) => filtros.every((filtro) => filtro(linha)));
          if (operacao === "insert") { tabelas[tabela].push(payload); linhas = [payload]; }
          if (operacao === "update") linhas.forEach((linha) => Object.assign(linha, payload));
          if (operacao === "delete") tabelas[tabela] = tabelas[tabela].filter((linha) => !linhas.includes(linha));
          return Promise.resolve({ data: unico ? linhas[0] ?? null : linhas, error: null }).then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  class NextResponse extends Response {
    static json(corpo, opcoes) { return new NextResponse(JSON.stringify(corpo), opcoes); }
  }
  const next = { NextResponse };
  const scope = carregar("lib/db/professor-scope.ts", { "server-only": {}, "@/lib/db/postgres": { getDatabase: () => db } });
  const dependencias = {
    "next/server": next,
    "node:crypto": { randomUUID: () => "novo-id" },
    "node:path": require("node:path"),
    "node:fs/promises": { readFile: async () => Buffer.from("foto-sintetica") },
    "@/lib/api-input": carregar("lib/api-input.ts", {}),
    "@/lib/access-control": carregar("lib/access-control.ts", {}),
    "@/lib/db/api-response": carregar("lib/db/api-response.ts", { "next/server": next }),
    "@/lib/db/auth": { getUsuarioLogado: async () => usuario },
    "@/lib/db/postgres": { getDatabase: () => db },
    "@/lib/db/professor-scope": scope,
    "@/lib/db/audit": { registrarAudit: async () => {} },
    "@/lib/db/mappers": { rowToBebe: (row) => row, rowToRegistroBercario: (row) => row },
    "@/lib/db/seed": { seedBercario: async () => {} },
  };
  return {
    tabelas,
    bebes: carregar("app/api/bercario-bebes/route.ts", dependencias),
    bebe: carregar("app/api/bercario-bebes/[id]/route.ts", dependencias),
    registros: carregar("app/api/bercario-registros/route.ts", dependencias),
    registro: carregar("app/api/bercario-registros/[id]/route.ts", dependencias),
    foto: carregar("app/api/uploads/[...arquivo]/route.ts", dependencias),
  };
}

const req = (body) => new Request("https://exemplo.invalid/api/bercario-registros", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});
const params = (id) => ({ params: Promise.resolve({ id }) });
const rotina = (bebeId) => ({ bebeId, data: "2026-10-23", hora: "10:30", tipo: "Sono", detalhes: "Soneca" });

test("professor sem turma não lê bebês nem rotinas e não cria, edita ou exclui rotina alheia", async () => {
  const env = ambiente("professor", false);
  assert.deepEqual((await (await env.bebes.GET()).json()).items, []);
  assert.deepEqual((await (await env.registros.GET()).json()).items, []);
  assert.equal((await env.registros.POST(req(rotina("bebe-b")))).status, 403);
  assert.equal((await env.registro.PATCH(req({ detalhes: "alterado" }), params("reg-b"))).status, 403);
  assert.equal((await env.registro.DELETE(req({}), params("reg-b"))).status, 403);
  assert.equal(env.tabelas.bercario_registros.length, 3);
  assert.equal(env.tabelas.bercario_registros[1].detalhes, "original b");
});

test("professor acessa apenas bebê de turma explícita; rótulo legado não concede acesso", async () => {
  const env = ambiente();
  assert.deepEqual((await (await env.bebes.GET()).json()).items.map((b) => b.id), ["bebe-a"]);
  assert.deepEqual((await (await env.registros.GET()).json()).items.map((r) => r.id), ["reg-a"]);
  assert.equal((await env.registros.POST(req(rotina("bebe-a")))).status, 201);
  assert.equal((await env.registros.POST(req(rotina("bebe-legado")))).status, 403);
  assert.equal((await env.registro.PATCH(req({ bebeId: "bebe-b" }), params("reg-a"))).status, 403);
  assert.equal(env.tabelas.bercario_registros[0].bebe_id, "bebe-a");
  assert.equal((await env.registro.PATCH(req({ bebeId: "bebe-a", detalhes: "alterado" }), params("reg-b"))).status, 403);
  assert.equal((await env.registro.PATCH(req({ detalhes: "Soneca atualizada" }), params("reg-a"))).status, 200);
  assert.equal((await env.registro.DELETE(req({}), params("reg-a"))).status, 200);
});

test("gestão preserva legados e pode atribuir ou remover turma do bebê validando sala", async () => {
  for (const perfil of ["diretor", "coordenador"]) {
    const env = ambiente(perfil);
    assert.equal((await (await env.bebes.GET()).json()).items.length, 3);
    assert.equal((await (await env.registros.GET()).json()).items.length, 3);
    assert.equal((await env.bebe.PATCH(req({ turmaId: "inexistente" }), params("bebe-legado"))).status, 400);
    assert.equal((await env.bebe.PATCH(req({ turmaId: "sala-a" }), params("bebe-legado"))).status, 200);
    assert.equal(env.tabelas.bercario_bebes[2].turma_id, "sala-a");
    assert.equal((await env.bebe.PATCH(req({ turmaId: null }), params("bebe-legado"))).status, 200);
    assert.equal(env.tabelas.bercario_bebes[2].turma_id, null);
    assert.equal((await env.bebes.POST(req({ nome: "Novo bebê", idadeMeses: 12, turmaId: "sala-b" }))).status, 201);
    assert.equal(env.tabelas.bercario_bebes.at(-1).turma_id, "sala-b");
  }
});

test("somente gestão altera cadastro ou vínculo de bebê, inclusive dentro da própria turma", async () => {
  for (const perfil of ["professor", "financeiro"]) {
    const env = ambiente(perfil);
    assert.equal((await env.bebe.PATCH(req({ turmaId: "sala-a" }), params("bebe-b"))).status, 403);
    assert.equal((await env.bebe.DELETE(req({}), params("bebe-a"))).status, 403);
    assert.equal((await env.bebes.POST(req({ nome: "Novo bebê", idadeMeses: 12 }))).status, 403);
    assert.equal(env.tabelas.bercario_bebes.length, 3);
  }
});

test("handlers de berçário exigem sessão e perfil autorizado mesmo sem passar pelo proxy", async () => {
  for (const [perfil, status] of [[null, 401], ["financeiro", 403]]) {
    const env = ambiente(perfil);
    assert.equal((await env.bebes.GET()).status, status);
    assert.equal((await env.registros.GET()).status, status);
    assert.equal((await env.registros.POST(req(rotina("bebe-a")))).status, status);
    assert.equal((await env.registro.PATCH(req({ detalhes: "alterado" }), params("reg-a"))).status, status);
    assert.equal((await env.registro.DELETE(req({}), params("reg-a"))).status, status);
  }
});

test("URL de foto conhecida exige aluno dentro do escopo do professor", async () => {
  const foto = (id) => ({ params: Promise.resolve({ arquivo: ["escola-a", "alunos", id, "foto.png"] }) });
  const env = ambiente();
  assert.equal((await env.foto.GET(req({}), foto("aluno-b"))).status, 404);
  assert.equal((await env.foto.GET(req({}), foto("aluno-a"))).status, 200);
  assert.equal((await ambiente("professor", false).foto.GET(req({}), foto("aluno-a"))).status, 404);
  assert.equal((await ambiente("coordenador").foto.GET(req({}), foto("aluno-b"))).status, 200);
  assert.equal((await ambiente("coordenador").foto.GET(req({}), foto("inexistente"))).status, 404);
  assert.equal((await ambiente("financeiro").foto.GET(req({}), foto("aluno-a"))).status, 403);
  assert.equal((await ambiente(null).foto.GET(req({}), foto("aluno-a"))).status, 401);
});
