import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

function componente() {
  const arquivo = new URL("./avatar-aluno-lista.tsx", import.meta.url);
  if (!existsSync(arquivo)) return undefined;
  const codigo = ts.transpileModule(readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    require(id) {
      if (id === "react") return React;
      if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
      if (id === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children), __esModule: true };
      if (id === "@/lib/utils") return require("./upload-foto-utils-stub.cjs");
      if (id === "@/components/ui/avatar") {
        return {
          Avatar: ({ children, ...props }) => React.createElement("span", props, children),
          AvatarImage: (props) => React.createElement("img", props),
          AvatarFallback: ({ children, ...props }) => React.createElement("span", props, children),
        };
      }
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.AvatarAlunoLista;
}

const base = { id: "a1", nome: "Alícia Quintela" };

test("com foto renderiza a imagem num link para o aluno", () => {
  const AvatarLista = componente();
  assert.equal(typeof AvatarLista, "function");
  const html = renderToStaticMarkup(React.createElement(AvatarLista, {
    aluno: { ...base, foto: "/api/uploads/x/alunos/a1/f.jpg" },
    href: "/alunos/a1", podeGerenciar: true, onCapturar() {},
  }));
  assert.ok(html.includes("/api/uploads/x/alunos/a1/f.jpg"));
  assert.ok(html.includes('href="/alunos/a1"'));
  assert.ok(!html.includes("Tirar foto"));
});

test("sem foto e com permissão vira botão de captura identificado pelo aluno", () => {
  const AvatarLista = componente();
  const html = renderToStaticMarkup(React.createElement(AvatarLista, {
    aluno: base, href: "/alunos/a1", podeGerenciar: true, onCapturar() {},
  }));
  assert.ok(html.includes("Tirar foto de Alícia Quintela"));
  assert.ok(html.includes("<button"));
});

test("clicar no botão de captura entrega o aluno da própria linha", () => {
  const AvatarLista = componente();
  let capturado = null;
  // Sem hooks no componente: dá para chamar como função e acionar o onClick real.
  const arvore = AvatarLista({
    aluno: base, href: "/alunos/a1", podeGerenciar: true,
    onCapturar: (aluno) => { capturado = aluno; },
  });
  function encontrarBotao(no) {
    if (Array.isArray(no)) return no.map(encontrarBotao).find(Boolean);
    if (!no || typeof no !== "object") return undefined;
    if (no.type === "button") return no;
    return encontrarBotao(no.props?.children);
  }
  encontrarBotao(arvore).props.onClick();
  assert.equal(capturado?.id, "a1");
  assert.equal(capturado?.nome, "Alícia Quintela");
});

test("sem permissão fica só as iniciais, sem botão nem link de captura", () => {
  const AvatarLista = componente();
  const html = renderToStaticMarkup(React.createElement(AvatarLista, {
    aluno: base, href: "/pedagogico/a1", podeGerenciar: false, onCapturar() {},
  }));
  assert.ok(html.includes("AQ"));
  assert.ok(!html.includes("<button"));
  assert.ok(!html.includes("Tirar foto"));
});
