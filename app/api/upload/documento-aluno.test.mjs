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
    exports, Request, Response, URL, process, console, Buffer, File, FormData,
    require(id) {
      if (Object.hasOwn(dependencias, id)) return dependencias[id];
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports;
}

const next = { NextResponse: { json: (corpo, opcoes) => new Response(JSON.stringify(corpo), opcoes) } };
const docs = carregar("lib/documentos-aluno.ts");

function ambiente({ perfil = "diretor", escopoTurmas = null, alunos = [{ id: "a1", turma_id: "t1" }], falharInsert = false } = {}) {
  const tabelas = { alunos: structuredClone(alunos), alunos_documentos: [] };
  const fs = { mkdir: [], writeFile: [], unlink: [] };
  const audits = [];
  const db = {
    from(tabela) {
      const filtros = [];
      let operacao = "select", payload, unico = false;
      const consulta = {
        select() { return consulta; },
        eq(campo, valor) { filtros.push((l) => l[campo] === valor); return consulta; },
        insert(valor) { operacao = "insert"; payload = structuredClone(valor); return consulta; },
        single() { unico = true; return consulta; },
        maybeSingle() { unico = true; return consulta; },
        then(resolve, reject) {
          if (operacao === "insert") {
            if (falharInsert) return Promise.resolve({ data: null, error: { message: "insert falhou" } }).then(resolve, reject);
            const linha = { ...payload, criado_em: "2026-11-10" };
            tabelas[tabela].push(linha);
            return Promise.resolve({ data: structuredClone(linha), error: null }).then(resolve, reject);
          }
          const rows = tabelas[tabela].filter((l) => filtros.every((f) => f(l)));
          return Promise.resolve({ data: structuredClone(unico ? rows[0] ?? null : rows), error: null }).then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  const rota = carregar("app/api/upload/documento-aluno/route.ts", {
    "next/server": next,
    "node:crypto": require("node:crypto"),
    // Default import no route ("import path from ...") exige o campo default.
    "node:path": { ...require("node:path"), default: require("node:path") },
    "node:fs/promises": {
      mkdir: async (dir, opcoes) => { fs.mkdir.push({ dir, opcoes }); },
      writeFile: async (dest, _dados, opcoes) => { fs.writeFile.push({ dest, opcoes }); },
      unlink: async (dest) => { fs.unlink.push(dest); },
    },
    "@/lib/access-control": { podeGerenciarAlunos: (p) => ["diretor", "coordenador"].includes(p) },
    "@/lib/db/postgres": { getDatabase: () => db },
    "@/lib/db/auth": { getUsuarioLogado: async () => ({ id: "gestora", nome: "Gestora", perfil }) },
    "@/lib/db/audit": { registrarAudit: async (...args) => { audits.push(args); } },
    "@/lib/db/professor-scope": {
      resolverEscopoProfessor: async () => (escopoTurmas ? { restrito: true, turmaIds: escopoTurmas } : { restrito: false, turmaIds: null }),
      professorPodeAcessarAluno: async (escopo, alunoId) => !escopo.restrito ||
        tabelas.alunos.some((a) => a.id === alunoId && escopo.turmaIds.includes(a.turma_id)),
    },
    "@/lib/documentos-aluno": docs,
  });
  return { tabelas, fs, audits, POST: rota.POST };
}

const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("conteudo de teste")]);

function requisicao({ alunoId = "a1", categoria = "RG", descricao, conteudo = PDF, mime = "application/pdf", nome = "rg.pdf" } = {}) {
  const fd = new FormData();
  fd.set("alunoId", alunoId);
  fd.set("categoria", categoria);
  if (descricao !== undefined) fd.set("descricao", descricao);
  fd.set("file", new File([conteudo], nome, { type: mime }));
  return new Request("https://exemplo.invalid/api/upload/documento-aluno", { method: "POST", body: fd });
}

test("PDF válido é arquivado: grava em documentos/, insere a linha e audita", async () => {
  const env = ambiente();
  const resposta = await env.POST(requisicao({ descricao: "via 2026" }));
  assert.equal(resposta.status, 201);
  const { item } = await resposta.json();
  assert.match(item.arquivoUrl, /^\/api\/uploads\/default\/alunos\/a1\/documentos\/[0-9a-f-]+\.pdf$/);
  assert.equal(item.categoria, "RG");
  assert.equal(item.descricao, "via 2026");
  assert.equal(item.mime, "application/pdf");
  assert.equal(env.fs.writeFile.length, 1);
  assert.ok(env.fs.writeFile[0].dest.includes("documentos"));
  // wx = nunca sobrescreve; 0600/0700 = laudo e RG ilegíveis para outros usuários do host.
  assert.equal(env.fs.writeFile[0].opcoes.flag, "wx");
  assert.equal(env.fs.writeFile[0].opcoes.mode, 0o600);
  assert.equal(env.fs.mkdir[0].opcoes.mode, 0o700);
  assert.equal(env.tabelas.alunos_documentos.length, 1);
  assert.equal(env.tabelas.alunos_documentos[0].enviado_por_nome, "Gestora");
  assert.equal(env.audits.length, 1);
});

test("extensão mentirosa é recusada pelo conteúdo, sem gravar nada", async () => {
  const env = ambiente();
  const resposta = await env.POST(requisicao({ conteudo: Buffer.from("isto nao e um pdf"), mime: "application/pdf" }));
  assert.equal(resposta.status, 400);
  assert.equal(env.fs.writeFile.length, 0);
  assert.equal(env.tabelas.alunos_documentos.length, 0);
});

test("maior que 10 MB e categoria fora da lista são recusados", async () => {
  const env = ambiente();
  const grande = Buffer.alloc(10 * 1024 * 1024 + 1, 0x25);
  assert.equal((await env.POST(requisicao({ conteudo: grande }))).status, 400);
  assert.equal((await env.POST(requisicao({ categoria: "Qualquer coisa" }))).status, 400);
  assert.equal(env.fs.writeFile.length, 0);
});

test("professor não arquiva documento (escrita é da gestão)", async () => {
  const env = ambiente({ perfil: "professor", escopoTurmas: ["t1"] });
  assert.equal((await env.POST(requisicao())).status, 403);
});

test("INSERT falhou: o arquivo recém-gravado é removido (compensação)", async () => {
  const env = ambiente({ falharInsert: true });
  const resposta = await env.POST(requisicao());
  assert.equal(resposta.status, 500);
  assert.equal(env.fs.unlink.length, 1);
  assert.equal(env.fs.unlink[0], env.fs.writeFile[0].dest);
});

test("aluno inexistente devolve 404", async () => {
  const env = ambiente({ alunos: [] });
  assert.equal((await env.POST(requisicao())).status, 404);
});
