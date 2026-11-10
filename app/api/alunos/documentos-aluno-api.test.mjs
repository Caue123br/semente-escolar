import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = new URL("../../../", import.meta.url);

function carregar(caminho, dependencias = {}) {
  const codigo = ts.transpileModule(readFileSync(new URL(caminho, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports, Request, Response, URL, process, console,
    require(id) {
      if (Object.hasOwn(dependencias, id)) return dependencias[id];
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports;
}

const next = { NextResponse: { json: (corpo, opcoes) => new Response(JSON.stringify(corpo), opcoes) } };
const docs = carregar("lib/documentos-aluno.ts");

function ambiente({ perfil = "diretor", escopoTurmas = null } = {}) {
  const tabelas = {
    alunos: [{ id: "a1", turma_id: "t1" }],
    alunos_documentos: [
      { id: "d1", aluno_id: "a1", categoria: "RG", descricao: null, arquivo_url: "/api/uploads/default/alunos/a1/documentos/d1.pdf", mime: "application/pdf", tamanho_bytes: 100, enviado_por_nome: "Gestora", criado_em: "2026-11-01" },
      { id: "d2", aluno_id: "a1", categoria: "CPF", descricao: null, arquivo_url: "/api/uploads/default/alunos/a1/documentos/d2.png", mime: "image/png", tamanho_bytes: 200, enviado_por_nome: "Gestora", criado_em: "2026-11-09" },
    ],
  };
  const fs = { unlink: [] };
  const audits = [];
  const db = {
    from(tabela) {
      const filtros = [];
      let operacao = "select", unico = false, ordem = null;
      const consulta = {
        select() { return consulta; },
        eq(campo, valor) { filtros.push((l) => l[campo] === valor); return consulta; },
        order(campo, opcoes) { ordem = { campo, asc: opcoes?.ascending !== false }; return consulta; },
        delete() { operacao = "delete"; return consulta; },
        maybeSingle() { unico = true; return consulta; },
        then(resolve, reject) {
          let rows = tabelas[tabela].filter((l) => filtros.every((f) => f(l)));
          if (operacao === "delete") {
            tabelas[tabela] = tabelas[tabela].filter((l) => !rows.includes(l));
            return Promise.resolve({ data: null, error: null }).then(resolve, reject);
          }
          if (ordem) {
            rows = [...rows].sort((a, b) =>
              (a[ordem.campo] < b[ordem.campo] ? -1 : a[ordem.campo] > b[ordem.campo] ? 1 : 0) * (ordem.asc ? 1 : -1)
            );
          }
          return Promise.resolve({ data: structuredClone(unico ? rows[0] ?? null : rows), error: null }).then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  const deps = {
    "next/server": next,
    "node:path": { ...require("node:path"), default: require("node:path") },
    "node:fs/promises": { unlink: async (destino) => { fs.unlink.push(destino); } },
    "@/lib/access-control": { podeGerenciarAlunos: (p) => ["diretor", "coordenador"].includes(p) },
    "@/lib/db/api-response": carregar("lib/db/api-response.ts", { "next/server": next }),
    "@/lib/db/postgres": { getDatabase: () => db },
    "@/lib/db/auth": { getUsuarioLogado: async () => ({ id: "gestora", nome: "Gestora", perfil }) },
    "@/lib/db/audit": { registrarAudit: async (...args) => { audits.push(args); } },
    "@/lib/db/professor-scope": {
      resolverEscopoProfessor: async () => (escopoTurmas ? { restrito: true, turmaIds: escopoTurmas } : { restrito: false, turmaIds: null }),
      professorPodeAcessarAluno: async (escopo, alunoId) => !escopo.restrito ||
        tabelas.alunos.some((a) => a.id === alunoId && escopo.turmaIds.includes(a.turma_id)),
    },
    "@/lib/documentos-aluno": docs,
  };
  return {
    tabelas, fs, audits,
    GET: carregar("app/api/alunos/[id]/documentos/route.ts", deps).GET,
    DELETE: carregar("app/api/alunos/[id]/documentos/[docId]/route.ts", deps).DELETE,
  };
}

const params = (valores) => ({ params: Promise.resolve(valores) });
const req = () => new Request("https://exemplo.invalid/api/alunos/a1/documentos");

test("GET lista do mais novo para o mais velho", async () => {
  const env = ambiente();
  const resposta = await env.GET(req(), params({ id: "a1" }));
  assert.equal(resposta.status, 200);
  const { items } = await resposta.json();
  assert.deepEqual(items.map((item) => item.id), ["d2", "d1"]);
  assert.equal(items[0].arquivoUrl, "/api/uploads/default/alunos/a1/documentos/d2.png");
});

test("financeiro não lista documentos; professor fora do escopo também não", async () => {
  assert.equal((await ambiente({ perfil: "financeiro" }).GET(req(), params({ id: "a1" }))).status, 403);
  assert.equal((await ambiente({ perfil: "professor", escopoTurmas: ["t9"] }).GET(req(), params({ id: "a1" }))).status, 403);
  assert.equal((await ambiente({ perfil: "professor", escopoTurmas: ["t1"] }).GET(req(), params({ id: "a1" }))).status, 200);
});

test("DELETE remove a linha, apaga o arquivo físico e audita", async () => {
  const env = ambiente();
  const resposta = await env.DELETE(req(), params({ id: "a1", docId: "d1" }));
  assert.equal(resposta.status, 200);
  assert.deepEqual(env.tabelas.alunos_documentos.map((documento) => documento.id), ["d2"]);
  assert.equal(env.fs.unlink.length, 1);
  assert.ok(env.fs.unlink[0].endsWith("d1.pdf"));
  assert.ok(env.fs.unlink[0].includes("documentos"));
  assert.equal(env.audits.length, 1);
  assert.equal(env.audits[0][0], "excluir");
});

test("DELETE de documento inexistente devolve 404 sem apagar nada", async () => {
  const env = ambiente();
  assert.equal((await env.DELETE(req(), params({ id: "a1", docId: "dX" }))).status, 404);
  assert.equal(env.fs.unlink.length, 0);
  assert.equal(env.tabelas.alunos_documentos.length, 2);
});
