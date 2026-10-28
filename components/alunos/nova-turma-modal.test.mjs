import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const ts = require("typescript");

function componente(react = React) {
  const arquivo = new URL("./nova-turma-modal.tsx", import.meta.url);
  if (!existsSync(arquivo)) return undefined;
  const codigo = ts.transpileModule(readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    // O efeito de abrir busca /api/professores; aqui a lista vem vazia.
    fetch: async () => ({ ok: true, json: async () => ({ items: [] }) }),
    require(id) {
      if (id === "react") return react;
      if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
      if (id === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children), __esModule: true };
      if (id === "@/lib/toast") return { useToast: () => ({ success() {}, error() {} }) };
      for (const [nome, tag] of [["Button", "button"], ["Input", "input"], ["Label", "label"]]) {
        if (id === `@/components/ui/${nome.toLowerCase()}`) return { [nome]: ({ children, variant, ...props }) => React.createElement(tag, props, children) };
      }
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.NovaTurmaModal;
}

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

const inicial = { nome: "Maternal 1 - Manhã B", serie: "Maternal 1", turno: "Manhã", capacidade: 25, cor: "#112233" };

test("prop inicial pré-preenche o formulário (duplicar sala), com capacidade como texto", () => {
  const hooks = hooksFalsos();
  const Modal = componente(hooks.react);
  assert.equal(typeof Modal, "function");
  const props = { aberto: true, onClose() {}, onSalvar: async () => {}, inicial };
  hooks.renderizar(Modal, props);
  const arvore = hooks.renderizar(Modal, props);
  assert.equal(encontrar(arvore, (no) => no.props?.id === "turma-nome").props.value, "Maternal 1 - Manhã B");
  assert.equal(encontrar(arvore, (no) => no.props?.id === "turma-serie").props.value, "Maternal 1");
  assert.equal(encontrar(arvore, (no) => no.props?.id === "turma-turno").props.value, "Manhã");
  assert.equal(encontrar(arvore, (no) => no.props?.id === "turma-capacidade").props.value, "25");
  assert.equal(encontrar(arvore, (no) => no.props?.id === "turma-cor").props.value, "#112233");
});

test("sem inicial o formulário abre vazio com os padrões de sempre", () => {
  const hooks = hooksFalsos();
  const Modal = componente(hooks.react);
  const props = { aberto: true, onClose() {}, onSalvar: async () => {} };
  hooks.renderizar(Modal, props);
  const arvore = hooks.renderizar(Modal, props);
  assert.equal(encontrar(arvore, (no) => no.props?.id === "turma-nome").props.value, "");
  assert.equal(encontrar(arvore, (no) => no.props?.id === "turma-capacidade").props.value, "20");
});
