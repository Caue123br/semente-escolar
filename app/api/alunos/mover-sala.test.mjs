import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = new URL("../../../", import.meta.url);

function carregar(caminho, dependencias = {}) {
  const source = readFileSync(new URL(caminho, root), "utf8");
  const codigo = ts.transpileModule(source, {
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

function ambiente({ perfil = "diretor", escopoTurmas = null, alunos = [], turmas = [] } = {}) {
  const tabelas = { alunos: structuredClone(alunos), turmas: structuredClone(turmas) };
  const audits = [];
  const db = {
    from(tabela) {
      const filtros = [];
      // Como SOFT_DELETE_TABLES em lib/db/postgres.ts: toda query em alunos
      // ganha deleted_at IS NULL automaticamente, sem o route pedir.
      if (tabela === "alunos") filtros.push((linha) => (linha.deleted_at ?? null) === null);
      let operacao = "select", payload, unico = false, head = false, projecao = "*";
      const consulta = {
        select(colunas, opcoes) { head = opcoes?.head === true; projecao = colunas ?? "*"; return consulta; },
        eq(campo, valor) { filtros.push((linha) => linha[campo] === valor); return consulta; },
        in(campo, valores) { filtros.push((linha) => valores.includes(linha[campo])); return consulta; },
        is(campo, valor) { filtros.push((linha) => (linha[campo] ?? null) === valor); return consulta; },
        order() { return consulta; },
        update(valor) { operacao = "update"; payload = structuredClone(valor); return consulta; },
        maybeSingle() { unico = true; return consulta; },
        then(resolve, reject) {
          const rows = tabelas[tabela].filter((linha) => filtros.every((filtro) => filtro(linha)));
          if (operacao === "update") rows.forEach((linha) => Object.assign(linha, payload));
          // Como o builder real, devolve só as colunas pedidas no select.
          const campos = typeof projecao === "string" && projecao.trim() !== "*"
            ? projecao.split(",").map((campo) => campo.trim())
            : null;
          const projetar = (linha) =>
            campos ? Object.fromEntries(campos.map((campo) => [campo, linha[campo]])) : structuredClone(linha);
          return Promise.resolve({
            data: head ? null : unico ? (rows[0] ? projetar(rows[0]) : null) : rows.map(projetar),
            count: rows.length, error: null,
          }).then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  const rota = carregar("app/api/alunos/mover-sala/route.ts", {
    "next/server": next,
    "@/lib/db/postgres": { getDatabase: () => db },
    "@/lib/db/auth": { getUsuarioLogado: async () => ({ id: "gestora", nome: "Gestora", perfil }) },
    "@/lib/db/api-response": carregar("lib/db/api-response.ts", { "next/server": next }),
    "@/lib/db/audit": {
      registrarAudit: async (...args) => { audits.push(args); },
      diffAudit: (antes, depois) => ({ antes, depois }),
    },
    "@/lib/db/professor-scope": {
      resolverEscopoProfessor: async () => (escopoTurmas
        ? { restrito: true, turmaIds: escopoTurmas }
        : { restrito: false, turmaIds: null }),
      professorPodeAcessarTurma: (escopo, turmaId) => !escopo.restrito || escopo.turmaIds.includes(turmaId),
    },
  });
  return { tabelas, audits, POST: rota.POST };
}

const req = (body) => new Request("https://exemplo.invalid/api/alunos/mover-sala", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

const turmaA = { id: "sala-a", nome: "Maternal 1 - Manhã", capacidade: 20 };
const turmaB = { id: "sala-b", nome: "Maternal 1 - Manhã B", capacidade: 20 };
const aluno = (id, turma_id = "sala-a", status = "Ativo") => ({ id, nome: `Aluno ${id}`, turma_id, status, deleted_at: null });

test("move vários alunos de uma vez e audita cada um", async () => {
  const env = ambiente({ turmas: [turmaA, turmaB], alunos: [aluno("a1"), aluno("a2"), aluno("a3")] });
  const resposta = await env.POST(req({ alunoIds: ["a1", "a2"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 200);
  const corpo = await resposta.json();
  assert.equal(corpo.movidos, 2);
  assert.equal(corpo.turmaNome, "Maternal 1 - Manhã B");
  assert.equal(env.tabelas.alunos.find((a) => a.id === "a1").turma_id, "sala-b");
  assert.equal(env.tabelas.alunos.find((a) => a.id === "a2").turma_id, "sala-b");
  assert.equal(env.tabelas.alunos.find((a) => a.id === "a3").turma_id, "sala-a");
  assert.equal(env.audits.length, 2);
  assert.equal(env.audits[0][0], "editar");
  assert.equal(env.audits[0][1], "alunos");
});

test("lotação bloqueia o lote inteiro com uma única resposta 422", async () => {
  const destinoPequeno = { ...turmaB, capacidade: 3 };
  const ocupantes = [aluno("b1", "sala-b"), aluno("b2", "sala-b")];
  const env = ambiente({ turmas: [turmaA, destinoPequeno], alunos: [...ocupantes, aluno("a1"), aluno("a2")] });
  const resposta = await env.POST(req({ alunoIds: ["a1", "a2"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 422);
  const corpo = await resposta.json();
  assert.equal(corpo.codigo, "lotacao");
  assert.equal(corpo.ocupacao, 2);
  assert.equal(corpo.capacidade, 3);
  assert.equal(corpo.quantidade, 2);
  assert.equal(env.tabelas.alunos.find((a) => a.id === "a1").turma_id, "sala-a");
  assert.equal(env.audits.length, 0);
});

test("confirmarLotacao move mesmo com a sala cheia", async () => {
  const destinoPequeno = { ...turmaB, capacidade: 1 };
  const env = ambiente({ turmas: [turmaA, destinoPequeno], alunos: [aluno("b1", "sala-b"), aluno("a1")] });
  const resposta = await env.POST(req({ alunoIds: ["a1"], turmaId: "sala-b", confirmarLotacao: true }));
  assert.equal(resposta.status, 200);
  assert.equal(env.tabelas.alunos.find((a) => a.id === "a1").turma_id, "sala-b");
});

test("alunos Inativos não contam para a capacidade", async () => {
  const destinoPequeno = { ...turmaB, capacidade: 1 };
  const env = ambiente({
    turmas: [turmaA, destinoPequeno],
    alunos: [aluno("b1", "sala-b", "Inativo"), aluno("a1", "sala-a", "Inativo"), aluno("a2")],
  });
  const resposta = await env.POST(req({ alunoIds: ["a1", "a2"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 200);
  assert.equal((await resposta.json()).movidos, 2);
});

test("aluno já na sala destino é ignorado sem erro", async () => {
  const env = ambiente({ turmas: [turmaA, turmaB], alunos: [aluno("a1", "sala-b"), aluno("a2")] });
  const resposta = await env.POST(req({ alunoIds: ["a1", "a2"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 200);
  assert.equal((await resposta.json()).movidos, 1);
  assert.equal(env.audits.length, 1);
});

test("corpo inválido devolve 400 sem tocar no banco", async () => {
  const env = ambiente({ turmas: [turmaA, turmaB], alunos: [aluno("a1")] });
  for (const body of [
    {}, { turmaId: "sala-b" }, { alunoIds: [], turmaId: "sala-b" },
    { alunoIds: ["a1"] }, { alunoIds: ["a1"], turmaId: "  " }, { alunoIds: "a1", turmaId: "sala-b" },
  ]) {
    const resposta = await env.POST(req(body));
    assert.equal(resposta.status, 400, JSON.stringify(body));
  }
  assert.equal(env.tabelas.alunos[0].turma_id, "sala-a");
});

test("sala destino inexistente devolve 422", async () => {
  const env = ambiente({ turmas: [turmaA], alunos: [aluno("a1")] });
  const resposta = await env.POST(req({ alunoIds: ["a1"], turmaId: "sala-x" }));
  assert.equal(resposta.status, 422);
});

test("aluno inexistente ou excluído devolve 422 e não move ninguém", async () => {
  const env = ambiente({
    turmas: [turmaA, turmaB],
    alunos: [aluno("a1"), { ...aluno("a2"), deleted_at: "2026-01-01" }],
  });
  const resposta = await env.POST(req({ alunoIds: ["a1", "a2"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 422);
  assert.equal(env.tabelas.alunos[0].turma_id, "sala-a");
});

test("capacidade 0 é sala fechada: bloqueia sem confirmação e aceita com confirmarLotacao", async () => {
  const fechada = { ...turmaB, capacidade: 0 };
  const bloqueio = ambiente({ turmas: [turmaA, fechada], alunos: [aluno("a1")] });
  const resposta = await bloqueio.POST(req({ alunoIds: ["a1"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 422);
  assert.equal((await resposta.json()).codigo, "lotacao");
  assert.equal(bloqueio.tabelas.alunos[0].turma_id, "sala-a");

  const confirmada = ambiente({ turmas: [turmaA, fechada], alunos: [aluno("a1")] });
  assert.equal((await confirmada.POST(req({ alunoIds: ["a1"], turmaId: "sala-b", confirmarLotacao: true }))).status, 200);
  assert.equal(confirmada.tabelas.alunos[0].turma_id, "sala-b");
});

test("aluno excluído (soft delete) na sala destino não ocupa vaga na contagem", async () => {
  const destino = { ...turmaB, capacidade: 1 };
  const env = ambiente({
    turmas: [turmaA, destino],
    alunos: [{ ...aluno("b1", "sala-b"), deleted_at: "2026-01-01" }, aluno("a1")],
  });
  const resposta = await env.POST(req({ alunoIds: ["a1"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 200);
  assert.equal((await resposta.json()).movidos, 1);
});

test("professor restrito não move para sala fora do escopo (403) nem aluno fora do escopo (422)", async () => {
  const fora = await ambiente({
    perfil: "professor", escopoTurmas: ["sala-a"],
    turmas: [turmaA, turmaB], alunos: [aluno("a1")],
  }).POST(req({ alunoIds: ["a1"], turmaId: "sala-b" }));
  assert.equal(fora.status, 403);

  const env = ambiente({
    perfil: "professor", escopoTurmas: ["sala-b"],
    turmas: [turmaA, turmaB], alunos: [aluno("a1", "sala-a")],
  });
  const resposta = await env.POST(req({ alunoIds: ["a1"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 422);
  assert.equal(env.tabelas.alunos[0].turma_id, "sala-a");
});
