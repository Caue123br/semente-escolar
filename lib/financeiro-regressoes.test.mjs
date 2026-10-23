import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = new URL("../", import.meta.url);
const hoje = "2026-10-23";

// Só o limite externo do banco é substituído: rotas, espelho, mappers e cálculos
// são o código real. As fixtures não leem ambiente nem acessam dados escolares.
function ambiente(iniciais = {}, opcoes = {}) {
  const tabelas = structuredClone({ alunos: [], turmas: [], cobrancas: [], mensalidades: [], ...iniciais });
  const db = {
    from(tabela) {
      const filtros = [];
      let operacao = "select", payload, unico = false, conflito = ["id"];
      const q = {
        select() { return q; },
        eq(campo, valor) { filtros.push((row) => row[campo] === valor); return q; },
        is(campo, valor) { filtros.push((row) => (row[campo] ?? null) === valor); return q; },
        eqOrNull(campo, valor) { filtros.push((row) => row[campo] == null || row[campo] === valor); return q; },
        gte(campo, valor) { filtros.push((row) => row[campo] >= valor); return q; },
        lte(campo, valor) { filtros.push((row) => row[campo] <= valor); return q; },
        in(campo, valores) { filtros.push((row) => valores.includes(row[campo])); return q; },
        order() { return q; },
        insert(valor) { operacao = "insert"; payload = valor; return q; },
        upsert(valor, opcoes) { operacao = "upsert"; payload = valor; conflito = (opcoes?.onConflict ?? "id").split(","); return q; },
        update(valor) { operacao = "update"; payload = valor; return q; },
        delete() { operacao = "delete"; return q; },
        single() { unico = true; return q; },
        maybeSingle() { unico = true; return q; },
        then(resolve, reject) {
          if (operacao !== "select") opcoes.antesDeGravar?.(tabela, operacao, tabelas);
          let linhas = tabelas[tabela].filter((row) => filtros.every((f) => f(row)));
          if (operacao === "delete") tabelas[tabela] = tabelas[tabela].filter((row) => !linhas.includes(row));
          if (operacao === "update") linhas.forEach((row) => Object.assign(row, payload));
          if (operacao === "insert" || operacao === "upsert") {
            linhas = [];
            for (const item of Array.isArray(payload) ? payload : [payload]) {
              const atual = tabelas[tabela].find((row) => conflito.every((campo) => row[campo] === item[campo]));
              if (atual && operacao === "insert") return Promise.resolve({ data: null, error: { code: "23505", message: "duplicado" } }).then(resolve, reject);
              if (atual) Object.assign(atual, item);
              else tabelas[tabela].push(structuredClone(item));
              linhas.push(atual ?? tabelas[tabela].at(-1));
            }
          }
          return Promise.resolve({ data: structuredClone(unico ? linhas[0] ?? null : linhas), error: null, count: linhas.length }).then(resolve, reject);
        },
      };
      return q;
    },
    async transaction(callback) {
      const snapshot = structuredClone(tabelas);
      try { return await callback(db); }
      catch (error) { Object.assign(tabelas, snapshot); opcoes.aposRollback?.(tabelas); throw error; }
    },
  };
  const cache = new Map();
  const externos = {
    "server-only": {},
    "next/server": { NextResponse: { json: (body, opcoes) => new Response(JSON.stringify(body), opcoes) } },
    "@/lib/db/postgres": { getDatabase: () => db },
    "@/lib/db/audit": { registrarAudit: async () => {} },
    "@/lib/db/seed": { seedMensalidades: async () => {} },
    ...opcoes.modulos,
  };
  function carregar(caminho) {
    if (cache.has(caminho)) return cache.get(caminho);
    const source = readFileSync(new URL(caminho, root), "utf8");
    const codigo = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const exports = {};
    cache.set(caminho, exports);
    vm.runInNewContext(codigo, { exports, Request, Response, console, Date, process: { env: { NODE_ENV: "production" } }, require(id) {
      if (Object.hasOwn(externos, id)) return externos[id];
      if (id.startsWith("@/")) {
        const relativo = `${id.slice(2)}.ts`;
        const loaded = carregar(existsSync(new URL(relativo, root)) ? relativo : `${relativo}x`);
        return id === "@/lib/utils" ? { ...loaded, formatDateLocalISO: () => hoje } : loaded;
      }
      if (id.startsWith("./")) {
        const relativo = new URL(`${id}.ts`, new URL(caminho, root)).pathname.slice(root.pathname.length);
        const chave = `@/${relativo.slice(0, -3)}`;
        return Object.hasOwn(externos, chave) ? externos[chave] : carregar(relativo);
      }
      return require(id);
    } });
    return exports;
  }
  return { tabelas, db, carregar };
}

const req = (body) => new Request("https://exemplo.invalid/api/cobrancas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const mensalidade = (extra = {}) => ({ id: "manual-m", alunoId: "a", alunoNome: "Aluno Exemplo", turmaNome: "Sala", competencia: "2026-10", vencimento: "2026-10-10", valor: 1000, status: "A Vencer", diasAtraso: 1, ...extra });
const cobranca = (extra = {}) => ({ id: "c1", aluno_id: "a", tipo: "mensalidade", descricao: "Mensalidade Out/2026", valor: 1000, vencimento: "2026-10-10", status: "Pendente", ...extra });

test("dívida usa saldo e data atual mesmo com status e contador antigos", () => {
  const f = ambiente().carregar("lib/financeiro-mensalidades.ts");
  const atrasada = mensalidade();
  const renegociada = mensalidade({ id: "r", status: "Renegociada", vencimento: "2026-11-10" });
  const zerada = mensalidade({ id: "z", valorPago: 1000 });
  const quitada = mensalidade({ id: "p", status: "Paga", valorPago: 800 });
  const grupos = f.dividaEmAberto([atrasada, renegociada, zerada, quitada], hoje);
  assert.deepEqual(Array.from(grupos.atrasadas, (m) => m.id), ["manual-m"]);
  assert.deepEqual(Array.from(grupos.aVencer, (m) => m.id), ["r"]);
  assert.equal(f.diasAtrasoDe(atrasada, hoje), 13);
  assert.equal(f.diasAtrasoDe({ vencimento: "2026-11-01", diasAtraso: 50 }, hoje), 0);
});

test("gerar plano preserva manual na janela, futuros de 2028 e histórico pago", async () => {
  const preservadas = [
    cobranca({ id: "manual", vencimento: "2027-01-10", valor: 321 }),
    cobranca({ id: "cob-a-mens-2028-01", vencimento: "2028-01-10", valor: 432 }),
    cobranca({ id: "cob-a-mens-2026-09", vencimento: "2026-09-10", status: "Pago", valor_pago: 800, data_pagamento: "2026-09-10", forma_pagamento: "Pix" }),
    cobranca({ id: "cob-a-mat-09", tipo: "matricula", vencimento: "2028-01-10", valor: 543 }),
  ];
  const { carregar, tabelas } = ambiente({ alunos: [{ id: "a", nome: "Aluno Exemplo", mensalidade_valor: 1000, matricula_taxa: 0, dia_vencimento: 10 }], cobrancas: preservadas });
  const resposta = await carregar("app/api/cobrancas/gerar/route.ts").POST(req({ alunoId: "a", mesInicio: "2026-11" }));
  assert.equal(resposta.status, 200, await resposta.text());
  for (const item of preservadas) assert.deepEqual(tabelas.cobrancas.find((c) => c.id === item.id), item);
  assert.equal(tabelas.cobrancas.filter((c) => c.vencimento.startsWith("2027-01")).length, 1);
});

test("espelho não reabre desconto nem compensa dívida com pagamento maior de parcela quitada", async () => {
  for (const [pago, valorEspelho] of [[800, 1800], [1200, 2200]]) {
    const { carregar, db, tabelas } = ambiente({ alunos: [{ id: "a", nome: "Aluno Exemplo" }], cobrancas: [cobranca({ status: "Pago", valor_pago: pago, data_pagamento: "2026-10-12", forma_pagamento: "Pix" }), cobranca({ id: "c2" })] });
    await carregar("lib/db/espelho-mensalidades.ts").sincronizarEspelho(db, "a", hoje, ["2026-10"]);
    const m = tabelas.mensalidades[0];
    assert.equal(m.valor, valorEspelho);
    assert.equal(m.valor_pago, pago);
    assert.equal(m.valor - m.valor_pago, 1000);
  }
});

test("GET corrige projeção de espelho antigo e atraso sem escrever nas linhas originais", async () => {
  const espelhoAntigo = { id: "mens-a-2026-10", aluno_id: "a", competencia: "2026-10", vencimento: "2026-10-01", valor: 2000, valor_pago: 800, status: "A Vencer", dias_atraso: 1 };
  const manual = { id: "manual", aluno_id: "b", competencia: "2026-10", vencimento: "2026-10-10", valor: 1000, status: "A Vencer", dias_atraso: 0 };
  const { carregar, tabelas } = ambiente({ mensalidades: [espelhoAntigo, manual], cobrancas: [cobranca({ status: "Pago", vencimento: "2026-10-01", valor_pago: 800, data_pagamento: "2026-10-02", forma_pagamento: "Pix" }), cobranca({ id: "c2" })] });
  const resposta = await carregar("app/api/mensalidades/route.ts").GET();
  assert.equal(resposta.status, 200);
  const { items } = await resposta.json();
  assert.equal(items[0].valor - items[0].valorPago, 1000);
  assert.equal(items[0].vencimento, "2026-10-10");
  assert.equal(items[0].diasAtraso, 13);
  assert.equal(items[1].valor, 1000);
  assert.equal(items[1].status, "Atrasada");
  assert.equal(items[1].diasAtraso, 13);
  assert.deepEqual(tabelas.mensalidades, [espelhoAntigo, manual]);
});

test("GET cobranças atualiza status de vencidas e preserva pagas", async () => {
  const { carregar } = ambiente({ cobrancas: [cobranca(), cobranca({ id: "p", status: "Pago", valor_pago: 800 })] });
  const { items } = await (await carregar("app/api/cobrancas/route.ts").GET()).json();
  assert.equal(items[0].status, "Atrasada");
  assert.equal(items[1].status, "Pago");
});

test("POST não transfere identidade do mesmo ID e mantém espelho anterior", async () => {
  const original = cobranca();
  const m = { id: "mens-a-2026-10", aluno_id: "a", competencia: "2026-10", valor: 1000, vencimento: "2026-10-10", status: "Atrasada" };
  const { carregar, tabelas } = ambiente({ cobrancas: [original], mensalidades: [m] });
  const resposta = await carregar("app/api/cobrancas/route.ts").POST(req({ id: "c1", alunoId: "b", valor: 500, vencimento: "2026-11-10", tipo: "mensalidade" }));
  assert.equal(resposta.status, 409);
  assert.deepEqual(tabelas.cobrancas, [original]);
  assert.deepEqual(tabelas.mensalidades, [m]);
});

test("POST do mesmo aluno refaz competência antiga e nova atomicamente", async () => {
  const { carregar, tabelas } = ambiente({ alunos: [{ id: "a", nome: "Aluno Exemplo" }], cobrancas: [cobranca()], mensalidades: [{ id: "mens-a-2026-10", aluno_id: "a", competencia: "2026-10", valor: 1000, vencimento: "2026-10-10", status: "Atrasada" }] });
  const resposta = await carregar("app/api/cobrancas/route.ts").POST(req({ id: "c1", alunoId: "a", valor: 500, vencimento: "2026-11-10", tipo: "mensalidade", status: "Pendente", descricao: "Mensalidade" }));
  assert.equal(resposta.status, 201);
  assert.equal(tabelas.mensalidades.length, 1);
  assert.equal(tabelas.mensalidades[0].competencia, "2026-11");
  assert.equal(tabelas.mensalidades[0].valor, 500);
});

test("receita inclui matrícula recebida pelo valor efetivo sem duplicar mensalidades de cobranças", () => {
  const f = ambiente().carregar("lib/financeiro-mensalidades.ts");
  assert.equal(typeof f.resumoFinanceiro, "function");
  const mens = [mensalidade({ status: "Paga", valorPago: 800 }), mensalidade({ id: "legada", valor: 300, valorPago: 100 })];
  const cob = [{ id: "mat", alunoId: "a", tipo: "matricula", valor: 500, valorPago: 450, status: "Pago", vencimento: "2026-09-10", dataPagamento: "2026-10-05" }, { id: "mens", alunoId: "a", tipo: "mensalidade", valor: 1000, valorPago: 800, status: "Pago", vencimento: "2026-10-10", dataPagamento: "2026-10-12" }];
  const out = f.resumoFinanceiro(mens, cob, "2026-10", hoje);
  assert.equal(out.recebido, 1350);
  assert.equal(out.recebidoMensalidades, 900);
  assert.equal(out.recebidoMatriculas, 450);
  assert.equal(out.inadimplencia, 200);
  assert.equal(f.resumoFinanceiro(mens, cob, "2026-09", hoje).recebidoMatriculas, 0);
});

test("caixa distribui espelho pelas datas reais e mantém recebimentos manuais/legados uma única vez", () => {
  const f = ambiente().carregar("lib/financeiro-mensalidades.ts");
  assert.equal(typeof f.recebimentosFinanceiros, "function");
  const mens = [mensalidade({ id: "mens-a-2026-09", competencia: "2026-09", status: "Paga", valor: 2000, valorPago: 1800, dataPagamento: "2026-10-12" }), mensalidade({ id: "manual", status: "Paga", valorPago: 300, dataPagamento: "2026-10-02" }), mensalidade({ id: "legada", competencia: "2026-08", status: "Paga", valor: 200, valorPago: undefined, dataPagamento: undefined })];
  const cob = [{ id: "p1", alunoId: "a", tipo: "mensalidade", valor: 1000, valorPago: 800, status: "Pago", vencimento: "2026-09-10", dataPagamento: "2026-09-12" }, { id: "p2", alunoId: "a", tipo: "mensalidade", valor: 1000, valorPago: 1000, status: "Pago", vencimento: "2026-09-20", dataPagamento: "2026-10-12" }, { id: "mat", alunoId: "a", tipo: "matricula", valor: 500, valorPago: 450, status: "Pago", vencimento: "2026-09-10", dataPagamento: "2026-10-01" }];
  const lancamentos = f.recebimentosFinanceiros(mens, cob);
  const somaMes = (comp) => lancamentos.filter((r) => r.data.startsWith(comp)).reduce((sum, r) => sum + r.valor, 0);
  assert.equal(somaMes("2026-09"), 800);
  assert.equal(somaMes("2026-10"), 1750);
  assert.equal(somaMes("2026-08"), 200);
  assert.equal(lancamentos.reduce((sum, r) => sum + r.valor, 0), 2750);
});


test("POST recusa edição quando outro recebimento moveu a competência após a leitura", async () => {
  const { carregar, tabelas } = ambiente({ alunos: [{ id: "a", nome: "Aluno Exemplo" }], cobrancas: [cobranca()] }, {
    antesDeGravar(tabela, operacao, dados) {
      if (tabela === "cobrancas" && operacao === "update") dados.cobrancas[0].vencimento = "2026-11-10";
    },
  });
  const resposta = await carregar("app/api/cobrancas/route.ts").POST(req({ id: "c1", alunoId: "a", valor: 500, vencimento: "2026-12-10", tipo: "mensalidade", status: "Pendente" }));
  assert.equal(resposta.status, 409);
  assert.equal(tabelas.mensalidades.length, 0);
});

test("quitação integral com desconto ou valor maior permanece quitada no espelho", async () => {
  for (const pago of [800, 1200]) {
    const { carregar, db, tabelas } = ambiente({ alunos: [{ id: "a", nome: "Aluno Exemplo" }], cobrancas: [cobranca({ status: "Pago", valor_pago: pago, data_pagamento: "2026-10-12", forma_pagamento: "Pix" })] });
    await carregar("lib/db/espelho-mensalidades.ts").sincronizarEspelho(db, "a", hoje, ["2026-10"]);
    const m = carregar("lib/db/mappers.ts").rowToMensalidade(tabelas.mensalidades[0]);
    const f = carregar("lib/financeiro-mensalidades.ts");
    assert.equal(m.valor, 1000);
    assert.equal(m.status, "Paga");
    assert.equal(f.recebidoDe(m), pago);
    assert.equal(f.emAbertoDe(m), 0);
    assert.equal(f.dividaEmAberto([m], hoje).atrasadas.length, 0);
  }
});

test("mensalidade manual do mesmo aluno não vira espelho nem é sobrescrita pela projeção", async () => {
  const manual = { id: "manual", aluno_id: "a", competencia: "2026-10", vencimento: "2026-10-10", valor: 1000, status: "A Vencer", dias_atraso: 0 };
  const { carregar, tabelas } = ambiente({ mensalidades: [manual], cobrancas: [cobranca({ status: "Pago", valor_pago: 800 }), cobranca({ id: "c2" })] });
  const { items } = await (await carregar("app/api/mensalidades/route.ts").GET()).json();
  assert.equal(items.length, 1);
  assert.equal(items[0].valor, 1000);
  assert.equal(items[0].valorPago, undefined);
  assert.equal(items[0].status, "Atrasada");
  assert.deepEqual(tabelas.mensalidades, [manual]);
});

test("gerar mantém pagamentos parciais e vencidas, e substitui somente IDs gerados futuros", async () => {
  const futuro = cobranca({ id: "cob-a-mens-2026-12", vencimento: "2026-12-10", valor: 700 });
  const pago = cobranca({ id: "cob-a-mens-2026-11", vencimento: "2026-11-10", status: "Pago", valor_pago: 800 });
  const saldo = cobranca({ id: "cob-saldo", vencimento: "2026-11-10", valor: 200 });
  const vencida = cobranca({ id: "cob-a-mens-2026-09", vencimento: "2026-09-10", status: "Atrasada" });
  const { carregar, tabelas } = ambiente({ alunos: [{ id: "a", nome: "Aluno Exemplo", mensalidade_valor: 1000, dia_vencimento: 10 }], cobrancas: [futuro, pago, saldo, vencida] });
  const resposta = await carregar("app/api/cobrancas/gerar/route.ts").POST(req({ alunoId: "a", mesInicio: "2026-11" }));
  assert.equal(resposta.status, 200);
  for (const item of [pago, saldo, vencida]) assert.deepEqual(tabelas.cobrancas.find((c) => c.id === item.id), item);
  assert.equal(tabelas.cobrancas.find((c) => c.id === futuro.id).valor, 1000);
});

test("POST não desfaz baixa feita por outra tela depois da leitura", async () => {
  const { carregar } = ambiente({ cobrancas: [cobranca()] }, {
    antesDeGravar(tabela, operacao, dados) {
      if (tabela === "cobrancas" && operacao === "update") Object.assign(dados.cobrancas[0], { status: "Pago", valor_pago: 800 });
    },
  });
  const resposta = await carregar("app/api/cobrancas/route.ts").POST(req({ id: "c1", alunoId: "a", valor: 1000, vencimento: "2026-10-10", tipo: "mensalidade", status: "Pendente" }));
  assert.equal(resposta.status, 409);
});


test("DRE, KPIs e composição incluem a matrícula; fluxo e conciliação usam o mês real", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const dados = {
    mensalidades: [mensalidade({ status: "Paga", valorPago: 800, dataPagamento: "2026-10-10" }), mensalidade({ id: "legada", competencia: "2026-09", valor: 1000, status: "Paga", valorPago: 1000, dataPagamento: "2026-10-12" })],
    cobrancas: [{ id: "mat", alunoId: "a", tipo: "matricula", descricao: "Matrícula Exemplo", status: "Pago", valor: 500, valorPago: 450, vencimento: "2026-09-10", dataPagamento: "2026-10-05", formaPagamento: "Pix" }],
    vendas: [], despesas: [], funcionarios: [],
  };
  const periodo = { mes: 9, ano: 2026, competencia: "2026-10", inicio: "2026-10-01", fim: "2026-10-31", label: "Outubro/2026" };
  const { carregar } = ambiente({}, { modulos: {
    "@/lib/data/store": { useEntidade: (nome) => ({ items: dados[nome] ?? [] }) },
    "@/lib/contexto-periodo": { usePeriodoContexto: () => ({ periodo, periodoAnterior: { ...periodo, mes: 8, competencia: "2026-09" } }) },
  } });
  const texto = (caminho, exportado) => renderToStaticMarkup(React.createElement(carregar(caminho)[exportado])).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  for (const [caminho, exportado] of [["components/financeiro/dre-tab.tsx", "DreTab"], ["components/financeiro/kpi-row.tsx", "KpiRow"], ["components/financeiro/composicao-receita.tsx", "ComposicaoReceita"]]) {
    assert.match(texto(caminho, exportado), /1\.250,00/);
  }
  assert.match(texto("components/financeiro/dre-tab.tsx", "DreTab"), /Taxas de matrícula recebidas/);
  for (const [caminho, exportado] of [["components/financeiro/fluxo-caixa-tab.tsx", "FluxoCaixaTab"], ["components/financeiro/conciliacao-tab.tsx", "ConciliacaoTab"]]) {
    assert.match(texto(caminho, exportado), /2\.250,00/);
  }
});

test("geração recusa apagar parcela que foi paga depois da leitura do plano", async () => {
  const { carregar } = ambiente({ alunos: [{ id: "a", nome: "Aluno Exemplo", mensalidade_valor: 1000, dia_vencimento: 10 }], cobrancas: [cobranca({ id: "cob-a-mens-2026-11", vencimento: "2026-11-10" })] }, {
    antesDeGravar(tabela, operacao, dados) {
      if (tabela === "cobrancas" && operacao === "delete") Object.assign(dados.cobrancas[0], { status: "Pago", valor_pago: 800, data_pagamento: hoje, forma_pagamento: "Pix" });
    },
  });
  const resposta = await carregar("app/api/cobrancas/gerar/route.ts").POST(req({ alunoId: "a", mesInicio: "2026-11" }));
  assert.equal(resposta.status, 409);
});


for (const [campo, mudanca] of [
  ["vencimento dentro da janela", { vencimento: "2026-12-10" }],
  ["valor", { valor: 750 }],
  ["tipo", { tipo: "matricula" }],
  ["descrição", { descricao: "Cobrança ajustada pela secretaria" }],
  ["status em aberto", { status: "Atrasada" }],
  ["valor pago nulo para zero", { valor_pago: 0 }],
]) {
  test(`geração preserva mudança concorrente de ${campo} e desfaz exclusões anteriores`, async () => {
    const anterior = cobranca({ id: "cob-a-mens-2026-12", vencimento: "2026-12-10", valor_pago: null });
    const original = cobranca({ id: "cob-a-mens-2026-11", vencimento: "2026-11-10", valor_pago: null });
    let concorrenteExecutou = false;
    const aplicarConcorrente = (dados) => Object.assign(dados.cobrancas.find((c) => c.id === original.id), mudanca);
    const { carregar, tabelas } = ambiente({ alunos: [{ id: "a", nome: "Aluno Exemplo", mensalidade_valor: 1000, dia_vencimento: 10 }], cobrancas: [anterior, original] }, {
      antesDeGravar(tabela, operacao, dados) {
        if (tabela === "cobrancas" && operacao === "delete" && !concorrenteExecutou) {
          concorrenteExecutou = true;
          aplicarConcorrente(dados);
        }
      },
      // A alteração de outra transação já foi confirmada e sobrevive ao rollback
      // desta geração. O adaptador isolado reproduz essa fronteira externa.
      aposRollback(dados) { if (concorrenteExecutou) aplicarConcorrente(dados); },
    });
    const resposta = await carregar("app/api/cobrancas/gerar/route.ts").POST(req({ alunoId: "a", mesInicio: "2026-11" }));
    assert.equal(resposta.status, 409);
    assert.deepEqual(tabelas.cobrancas, [anterior, { ...original, ...mudanca }]);
    assert.equal(tabelas.mensalidades.length, 0);
  });
}
