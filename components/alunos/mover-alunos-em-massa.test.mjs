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
  const arquivo = new URL("./mover-alunos-em-massa.tsx", import.meta.url);
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
      if (id === "@/components/shared/confirm-dialog") return { ConfirmDialog: () => null };
      if (id === "@/lib/toast") return { useToast: () => ({ success() {}, error() {} }) };
      if (id === "@/components/ui/button") return { Button: ({ children, variant, ...props }) => React.createElement("button", props, children) };
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
