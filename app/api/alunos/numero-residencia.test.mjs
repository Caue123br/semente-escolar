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

const periodos = carregar("lib/periodos-matricula.ts");
const mappers = carregar("lib/db/mappers.ts", { "@/lib/periodos-matricula": periodos });
const next = { NextResponse: { json: (corpo, opcoes) => new Response(JSON.stringify(corpo), opcoes) } };
const ficha = {
  nome: "Criança Exemplo", dataNascimento: "2020-01-01", turmaId: "sala-1",
  endereco: "Rua Exemplo, 99", periodo: "integral", cpf: "", rg: "",
  responsaveis: [{ nome: "Responsável Exemplo", telefone: "11999999999", principal: true }],
  pessoasAutorizadas: [{ nome: "Avó Exemplo", parentesco: "Avó" }],
  fichaSaude: { alergias: "Sem alergias" },
};

function ambiente(perfil = "secretaria", linhas = []) {
  const tabelas = {
    alunos: structuredClone(linhas),
    turmas: [{ id: "sala-1", nome: "Sala Exemplo", capacidade: 25 }],
  };
  // A rede/banco são externos; os handlers, validações e mapper são os reais.
  const db = {
    from(tabela) {
      const filtros = [];
      let operacao = "select", payload, unico = false, head = false;
      const consulta = {
        select(_colunas, opcoes) { head = opcoes?.head === true; return consulta; },
        eq(campo, valor) { filtros.push((linha) => linha[campo] === valor); return consulta; },
        in(campo, valores) { filtros.push((linha) => valores.includes(linha[campo])); return consulta; },
        order() { return consulta; },
        insert(valor) { operacao = "insert"; payload = structuredClone(valor); return consulta; },
        update(valor) { operacao = "update"; payload = structuredClone(valor); return consulta; },
        single() { unico = true; return consulta; },
        maybeSingle() { unico = true; return consulta; },
        then(resolve, reject) {
          let rows = tabelas[tabela].filter((linha) => filtros.every((filtro) => filtro(linha)));
          if (operacao === "insert") { tabelas[tabela].push(payload); rows = [payload]; }
          if (operacao === "update") rows.forEach((linha) => Object.assign(linha, payload));
          return Promise.resolve({
            data: head ? null : structuredClone(unico ? rows[0] ?? null : rows),
            count: rows.length, error: null,
          }).then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  const dependencias = {
    "next/server": next,
    "node:crypto": require("node:crypto"),
    "@/lib/db/api-response": carregar("lib/db/api-response.ts", { "next/server": next }),
    "@/lib/db/auth": { getUsuarioLogado: async () => ({ id: "gestora", perfil }) },
    "@/lib/db/postgres": {
      getDatabase: () => db,
      getPostgresPool: () => ({ query: async (sql, valores) => {
        assert.match(sql, /SELECT .* FROM app\.alunos/s);
        return { rows: structuredClone(tabelas.alunos.filter((linha) =>
          sql.includes("AND id = $2") ? linha.id === valores[1] : linha.data_nascimento === valores[1])) };
      } }),
    },
    "@/lib/db/audit": { registrarAudit: async () => {}, diffAudit: (_antes, depois) => depois },
    "@/lib/db/mappers": mappers,
    "@/lib/db/seed": { seedAlunos: async () => {} },
    "@/lib/cpf": carregar("lib/cpf.ts"),
    "@/lib/periodos-matricula": periodos,
    "@/lib/utils": carregar("lib/utils.ts", { clsx: require("clsx"), "tailwind-merge": require("tailwind-merge") }),
    "@/lib/db/professor-scope": {
      resolverEscopoProfessor: async () => ({ restrito: perfil === "professor", turmaIds: ["sala-1"] }),
      professorPodeAcessarAluno: async () => true, professorPodeAcessarTurma: () => true,
    },
  };
  return {
    tabelas,
    ...carregar("app/api/alunos/route.ts", dependencias),
    ...carregar("app/api/alunos/[id]/route.ts", dependencias),
  };
}

const req = (body, chave, method = "POST") => new Request("https://exemplo.invalid/api/alunos", {
  method, headers: { "content-type": "application/json", ...(chave ? { "Idempotency-Key": chave } : {}) },
  body: JSON.stringify(body),
});
const params = (id) => ({ params: Promise.resolve({ id }) });

test("mapper retorna número separado sem inferir número do endereço legado", () => {
  assert.equal(mappers.rowToAluno({ endereco: "Rua Exemplo, 99", numero_residencia: "123A" }).numeroResidencia, "123A");
  for (const numero_residencia of [undefined, null, ""]) {
    const item = mappers.rowToAluno({ endereco: "Rua Exemplo, 99", numero_residencia });
    assert.equal(item.numeroResidencia, undefined);
    assert.equal(item.endereco, "Rua Exemplo, 99");
  }
});

test("POST persiste e retorna número opcional normalizado sem alterar a ficha", async () => {
  for (const [enviado, esperado] of [[" 123 ", "123"], ["123A", "123A"], [" S/N ", "S/N"], ["x".repeat(30), "x".repeat(30)], ["   ", null], [null, null], [undefined, null]]) {
    const env = ambiente();
    const resposta = await env.POST(req({ ...ficha, numeroResidencia: enviado }));
    assert.equal(resposta.status, 201);
    const { item } = await resposta.json();
    assert.equal(env.tabelas.alunos[0].numero_residencia, esperado);
    assert.equal(item.numeroResidencia, esperado ?? undefined);
    assert.equal(item.endereco, "Rua Exemplo, 99");
    assert.equal(item.cpf, "");
    assert.equal(item.periodo, "integral");
    assert.equal(item.pessoasAutorizadas[0].nome, "Avó Exemplo");
    assert.equal(item.fichaSaude.alergias, "Sem alergias");
  }
});

test("POST recusa número de tipo inválido ou acima de 30 sem criar aluno", async () => {
  for (const numeroResidencia of [123, true, {}, [], "x".repeat(31)]) {
    const env = ambiente();
    const resposta = await env.POST(req({ ...ficha, numeroResidencia }));
    assert.equal(resposta.status, 400);
    assert.equal(env.tabelas.alunos.length, 0);
  }
});

test("retry normaliza número, mantém uma matrícula e avisa divergência sem sobrescrever", async () => {
  const env = ambiente();
  assert.equal((await env.POST(req({ ...ficha, numeroResidencia: " 123A " }, "chave-numero"))).status, 201);
  const repetido = await env.POST(req({ ...ficha, numeroResidencia: "123A" }, "chave-numero"));
  assert.equal(repetido.status, 200);
  assert.equal((await repetido.json()).avisoDadosDivergentes, undefined);
  const divergente = await env.POST(req({ ...ficha, numeroResidencia: "999" }, "chave-numero"));
  assert.equal(divergente.status, 200);
  assert.equal((await divergente.json()).avisoDadosDivergentes, true);
  assert.equal(env.tabelas.alunos.length, 1);
  assert.equal(env.tabelas.alunos[0].numero_residencia, "123A");
});

test("retry equipara número ausente, nulo e vazio e valida tipos mesmo com chave usada", async () => {
  const env = ambiente();
  assert.equal((await env.POST(req(ficha, "chave-vazia"))).status, 201);
  for (const numeroResidencia of [undefined, null, "   "]) {
    const resposta = await env.POST(req({ ...ficha, numeroResidencia }, "chave-vazia"));
    assert.equal(resposta.status, 200);
    assert.equal((await resposta.json()).avisoDadosDivergentes, undefined);
  }
  for (const numeroResidencia of [123, false, [], {}, "x".repeat(31)]) {
    assert.equal((await env.POST(req({ ...ficha, numeroResidencia }, "chave-vazia"))).status, 400);
  }
  assert.equal(env.tabelas.alunos.length, 1);
});

test("PATCH salva e limpa número e permite editar responsável legado sem contato", async () => {
  const env = ambiente("secretaria", [{ id: "aluno-1", endereco: "Rua Exemplo, 99", responsaveis_json: [{ nome: "Contato Legado" }] }]);
  for (const [numeroResidencia, esperado] of [[" 123A ", "123A"], ["S/N", "S/N"], ["x".repeat(30), "x".repeat(30)], ["", null], ["  ", null], [null, null]]) {
    const resposta = await env.PATCH(req({ numeroResidencia, responsaveis: [{ nome: "Contato Legado" }] }, null, "PATCH"), params("aluno-1"));
    assert.equal(resposta.status, 200);
    assert.equal(env.tabelas.alunos[0].numero_residencia, esperado);
    assert.equal(env.tabelas.alunos[0].endereco, "Rua Exemplo, 99");
    assert.equal(env.tabelas.alunos[0].responsaveis_json[0].nome, "Contato Legado");
  }
});

test("PATCH recusa número inválido sem salvar nenhuma alteração", async () => {
  for (const numeroResidencia of [123, true, {}, [], "x".repeat(31)]) {
    const env = ambiente("secretaria", [{ id: "aluno-1", nome: "Nome Original", numero_residencia: "123" }]);
    const resposta = await env.PATCH(req({ nome: "Nome Novo", numeroResidencia }, null, "PATCH"), params("aluno-1"));
    assert.equal(resposta.status, 400);
    assert.equal(env.tabelas.alunos[0].nome, "Nome Original");
    assert.equal(env.tabelas.alunos[0].numero_residencia, "123");
  }
});

test("GET preserva endereço e número para secretaria e omite ambos para professor e financeiro", async () => {
  for (const perfil of ["secretaria", "professor", "financeiro"]) {
    const env = ambiente(perfil, [{ id: "aluno-1", turma_id: "sala-1", endereco: "Rua Exemplo, 99", numero_residencia: "123A" }]);
    const resposta = await env.GET(new Request("https://exemplo.invalid/api/alunos"));
    assert.equal(resposta.status, 200);
    const { items: [item] } = await resposta.json();
    assert.equal(item.numeroResidencia, perfil === "secretaria" ? "123A" : undefined);
    assert.equal(item.endereco, perfil === "secretaria" ? "Rua Exemplo, 99" : undefined);
  }
});
