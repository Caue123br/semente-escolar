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
    exports, Request, Response, URL, process, console, Buffer,
    require(id) {
      if (Object.hasOwn(dependencias, id)) return dependencias[id];
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports;
}

class RespostaFalsa {
  constructor(corpo, opcoes = {}) {
    this.corpo = corpo;
    this.status = opcoes.status ?? 200;
    this.headers = new Map(Object.entries(opcoes.headers ?? {}));
  }
}
const next = { NextResponse: RespostaFalsa };

function ambiente({ documentos = [] } = {}) {
  const tabelas = {
    alunos: [{ id: "a1", turma_id: "t1" }],
    alunos_documentos: documentos,
  };
  const db = {
    from(tabela) {
      const filtros = [];
      let unico = false;
      const consulta = {
        select() { return consulta; },
        eq(campo, valor) { filtros.push((l) => l[campo] === valor); return consulta; },
        maybeSingle() { unico = true; return consulta; },
        then(resolve, reject) {
          const rows = tabelas[tabela].filter((l) => filtros.every((f) => f(l)));
          return Promise.resolve({ data: structuredClone(unico ? rows[0] ?? null : rows), error: null }).then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  const rota = carregar("app/api/uploads/[...arquivo]/route.ts", {
    "next/server": next,
    "node:path": { ...require("node:path"), default: require("node:path") },
    "node:fs/promises": { readFile: async () => Buffer.from("conteudo") },
    "@/lib/access-control": { podeAcessarModulo: () => true },
    "@/lib/db/postgres": { getDatabase: () => db },
    "@/lib/db/auth": { getUsuarioLogado: async () => ({ id: "u1", perfil: "diretor" }) },
    "@/lib/db/professor-scope": {
      resolverEscopoProfessor: async () => ({ restrito: false, turmaIds: null }),
      professorPodeAcessarTurma: () => true,
    },
  });
  return rota.GET;
}

const chamada = (GET, segmentos) =>
  GET(new Request("https://exemplo.invalid/api/uploads/x"), { params: Promise.resolve({ arquivo: segmentos }) });

test("foto com 4 segmentos continua servida como antes", async () => {
  const GET = ambiente();
  const resposta = await chamada(GET, ["default", "alunos", "a1", "foto.jpg"]);
  assert.equal(resposta.status, 200);
  assert.equal(resposta.headers.get("content-type"), "image/jpeg");
  assert.equal(resposta.headers.get("content-disposition"), undefined);
});

test("documento PDF com 5 segmentos é servido inline com nome legível da categoria", async () => {
  const GET = ambiente({
    documentos: [{ categoria: "Certidão de nascimento", arquivo_url: "/api/uploads/default/alunos/a1/documentos/d1.pdf" }],
  });
  const resposta = await chamada(GET, ["default", "alunos", "a1", "documentos", "d1.pdf"]);
  assert.equal(resposta.status, 200);
  assert.equal(resposta.headers.get("content-type"), "application/pdf");
  const disposicao = resposta.headers.get("content-disposition");
  assert.ok(disposicao.startsWith("inline;"));
  assert.ok(disposicao.includes("Certidao de nascimento.pdf"));
  assert.ok(disposicao.includes("filename*=UTF-8''"));
});

test("5 segmentos sem a pasta documentos, PDF em caminho de foto e traversal continuam 404", async () => {
  const GET = ambiente();
  assert.equal((await chamada(GET, ["default", "alunos", "a1", "outros", "d1.pdf"])).status, 404);
  assert.equal((await chamada(GET, ["default", "alunos", "a1", "foto.pdf"])).status, 404);
  assert.equal((await chamada(GET, ["default", "alunos", "a1", "documentos", "..%2Fd1.pdf"])).status, 404);
  assert.equal((await chamada(GET, ["default", "alunos", "a1", "documentos", "d1.exe"])).status, 404);
});
