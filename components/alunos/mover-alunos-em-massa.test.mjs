import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

function componente(react = React, globais = {}) {
  const arquivo = new URL("./mover-alunos-em-massa.tsx", import.meta.url);
  if (!existsSync(arquivo)) return undefined;
  const codigo = ts.transpileModule(readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    ...globais,
    require(id) {
      if (id === "react") return react;
      if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
      if (id === "@/components/shared/confirm-dialog") return { ConfirmDialog: () => null };
      if (id === "@/lib/toast") return { useToast: () => globais.toast ?? { success() {}, error() {} } };
      if (id === "@/components/ui/button") return { Button: ({ children, variant, size, ...props }) => React.createElement("button", props, children) };
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.MoverAlunosEmMassa;
}

const turmas = [
  { id: "sala-a", nome: "Maternal 1 - Manhã", serie: "Maternal 1", turno: "Manhã", professorId: "", professorNome: "Profa. Vanessa", totalAlunos: 2, capacidade: 20, cor: "#059669" },
  { id: "sala-b", nome: "Maternal 1 - Manhã B", serie: "Maternal 1", turno: "Manhã", professorId: "", professorNome: "Profa. Ana", totalAlunos: 0, capacidade: 20, cor: "#059669" },
];
const ocupacao = new Map([["sala-a", 12], ["sala-b", 3]]);

test("mostra a contagem e as salas de destino com professora e ocupação", () => {
  const Barra = componente();
  assert.equal(typeof Barra, "function");
  const html = renderToStaticMarkup(React.createElement(Barra, {
    selecionados: ["a1", "a2", "a3"], turmas, ocupacaoPorTurma: ocupacao, onLimpar() {},
  }));
  assert.ok(html.includes("3 selecionado(s)"));
  assert.ok(html.includes("Maternal 1 - Manhã B — Profa. Ana (3/20)"));
  assert.ok(html.includes("Mover"));
  assert.ok(html.includes("Limpar seleção"));
});

test("sem seleção não renderiza nada", () => {
  const Barra = componente();
  const html = renderToStaticMarkup(React.createElement(Barra, {
    selecionados: [], turmas, ocupacaoPorTurma: ocupacao, onLimpar() {},
  }));
  assert.equal(html, "");
});

// ---- Harness de interação: hooks falsos que guardam estado entre renders ----

function hooksFalsos() {
  const estados = [], dependencias = [];
  let estado = 0, efeito = 0, pendentes = [];
  return {
    react: {
      ...React,
      useState(inicial) {
        const indice = estado++;
        if (!(indice in estados)) estados[indice] = typeof inicial === "function" ? inicial() : inicial;
        return [estados[indice], (valor) => { estados[indice] = typeof valor === "function" ? valor(estados[indice]) : valor; }];
      },
      useEffect(callback, deps) {
        const indice = efeito++;
        if (!dependencias[indice] || deps.some((valor, i) => !Object.is(valor, dependencias[indice][i]))) {
          dependencias[indice] = deps;
          pendentes.push(callback);
        }
      },
      useCallback(callback) { return callback; },
    },
    renderizar(Componente, props) {
      estado = 0;
      efeito = 0;
      pendentes = [];
      const arvore = Componente(props);
      pendentes.forEach((callback) => callback());
      return arvore;
    },
  };
}

function encontrar(arvore, predicado) {
  if (Array.isArray(arvore)) {
    for (const filho of arvore) {
      const achado = encontrar(filho, predicado);
      if (achado) return achado;
    }
    return undefined;
  }
  if (!arvore || typeof arvore !== "object") return undefined;
  if (predicado(arvore)) return arvore;
  return encontrar(arvore.props?.children, predicado);
}

function contemTexto(no, texto) {
  if (typeof no === "string") return no.includes(texto);
  if (Array.isArray(no)) return no.some((filho) => contemTexto(filho, texto));
  if (!no || typeof no !== "object") return false;
  return contemTexto(no.props?.children, texto);
}

function montar(fetchImpl) {
  const eventos = [];
  const toasts = [];
  class CustomEventFalso { constructor(tipo) { this.type = tipo; } }
  const hooks = hooksFalsos();
  const Barra = componente(hooks.react, {
    fetch: fetchImpl,
    window: { dispatchEvent: (evento) => eventos.push(evento.type) },
    CustomEvent: CustomEventFalso,
    toast: { success: (t, d) => toasts.push(`${t}: ${d}`), error: (t, d) => toasts.push(`ERRO ${t}: ${d}`) },
  });
  return { hooks, Barra, eventos, toasts };
}

const aguardar = () => new Promise((resolver) => setTimeout(resolver, 0));

test("Mover envia o contrato da API, trata lotação com reenvio confirmado e limpa a seleção", async () => {
  const chamadas = [];
  const respostas = [
    { ok: false, status: 422, json: async () => ({ error: "A turma está cheia.", codigo: "lotacao", ocupacao: 3, capacidade: 3, turmaNome: "Maternal 1 - Manhã B", quantidade: 2 }) },
    { ok: true, status: 200, json: async () => ({ ok: true, movidos: 2, turmaNome: "Maternal 1 - Manhã B" }) },
  ];
  const { hooks, Barra, eventos } = montar(async (url, opcoes) => {
    chamadas.push({ url, body: JSON.parse(opcoes.body) });
    return respostas.shift();
  });
  let limpou = 0;
  const props = { selecionados: ["a1", "a2"], turmas, ocupacaoPorTurma: ocupacao, onLimpar: () => { limpou += 1; } };

  let arvore = hooks.renderizar(Barra, props);
  encontrar(arvore, (no) => no.type === "select").props.onChange({ target: { value: "sala-b" } });
  arvore = hooks.renderizar(Barra, props);
  const botaoMover = encontrar(arvore, (no) =>
    typeof no.props?.onClick === "function" && contemTexto(no, "Mover") && !contemTexto(no, "Limpar"));
  botaoMover.props.onClick();
  await aguardar();

  assert.equal(chamadas[0].url, "/api/alunos/mover-sala");
  assert.deepEqual(chamadas[0].body, { alunoIds: ["a1", "a2"], turmaId: "sala-b" });

  arvore = hooks.renderizar(Barra, props);
  const dialogo = encontrar(arvore, (no) => no.props?.textoBotaoConfirmar === "Mover mesmo assim");
  assert.equal(dialogo.props.aberto, true);
  await dialogo.props.onConfirmar();
  await aguardar();

  assert.deepEqual(chamadas[1].body, { alunoIds: ["a1", "a2"], turmaId: "sala-b", confirmarLotacao: true });
  assert.deepEqual(eventos, ["semente:changed:alunos", "semente:changed:turmas"]);
  assert.equal(limpou, 1);
});

test("movidos 0 mantém a seleção, não dispara recarga e avisa sem fingir movimentação", async () => {
  const { hooks, Barra, eventos, toasts } = montar(async () => ({
    ok: true, status: 200, json: async () => ({ ok: true, movidos: 0, turmaNome: "Maternal 1 - Manhã B" }),
  }));
  let limpou = 0;
  const props = { selecionados: ["a1"], turmas, ocupacaoPorTurma: ocupacao, onLimpar: () => { limpou += 1; } };

  let arvore = hooks.renderizar(Barra, props);
  encontrar(arvore, (no) => no.type === "select").props.onChange({ target: { value: "sala-b" } });
  arvore = hooks.renderizar(Barra, props);
  encontrar(arvore, (no) =>
    typeof no.props?.onClick === "function" && contemTexto(no, "Mover") && !contemTexto(no, "Limpar")).props.onClick();
  await aguardar();

  assert.equal(limpou, 0);
  assert.deepEqual(eventos, []);
  assert.ok(toasts.some((texto) => texto.includes("já estão nessa sala")));
});

test("destino escolhido não sobrevive ao esvaziamento da seleção", async () => {
  const { hooks, Barra } = montar(async () => { throw new Error("não deveria chamar a API"); });
  const props = (selecionados) => ({ selecionados, turmas, ocupacaoPorTurma: ocupacao, onLimpar() {} });

  let arvore = hooks.renderizar(Barra, props(["a1", "a2"]));
  encontrar(arvore, (no) => no.type === "select").props.onChange({ target: { value: "sala-b" } });
  arvore = hooks.renderizar(Barra, props(["a1", "a2"]));
  assert.equal(encontrar(arvore, (no) => no.type === "select").props.value, "sala-b");

  // Seleção zera (Limpar/desmarcar/filtro) e volta: o destino antigo não pode
  // reaparecer pré-selecionado com o botão Mover armado.
  hooks.renderizar(Barra, props([]));
  arvore = hooks.renderizar(Barra, props(["a3"]));
  assert.equal(encontrar(arvore, (no) => no.type === "select").props.value, "");
});
