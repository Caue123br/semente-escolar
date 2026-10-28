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
  const arquivo = new URL("./trocar-sala-modal.tsx", import.meta.url);
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
      if (id === "@/lib/data/store") return { ErroApi: class ErroApi extends Error {} };
      for (const [nome, tag] of [["Button", "button"], ["Label", "label"]]) {
        if (id === `@/components/ui/${nome.toLowerCase()}`) return { [nome]: ({ children, variant, ...props }) => React.createElement(tag, props, children) };
      }
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.TrocarSalaModal;
}

const turmas = [
  { id: "sala-a", nome: "Maternal 1 - Manhã", serie: "Maternal 1", turno: "Manhã", professorId: "", professorNome: "Profa. Vanessa", totalAlunos: 2, capacidade: 20, cor: "#059669" },
  { id: "sala-b", nome: "Maternal 1 - Manhã B", serie: "Maternal 1", turno: "Manhã", professorId: "", professorNome: "", totalAlunos: 0, capacidade: 20, cor: "#059669" },
];
const aluno = { id: "a1", nome: "Lucca Fialho", turmaId: "sala-a", status: "Ativo", responsaveis: [] };
const ocupacao = new Map([["sala-a", 12]]);

test("lista as salas com professora e ocupação e explica que a professora é da sala", () => {
  const Modal = componente();
  assert.equal(typeof Modal, "function");
  const html = renderToStaticMarkup(React.createElement(Modal, {
    aluno, turmas, ocupacaoPorTurma: ocupacao,
    onClose() {}, onSalvar: async () => {}, onGerenciarTurmas() {},
  }));
  assert.ok(html.includes("Lucca Fialho"));
  assert.ok(html.includes("Maternal 1 - Manhã — Profa. Vanessa (12/20)"));
  assert.ok(html.includes("Maternal 1 - Manhã B — Sem professora (0/20)"));
  assert.ok(html.includes("a professora muda junto"));
  assert.ok(html.includes("Trocar a professora desta sala"));
});

test("sem aluno não renderiza nada", () => {
  const Modal = componente();
  const html = renderToStaticMarkup(React.createElement(Modal, {
    aluno: null, turmas, ocupacaoPorTurma: ocupacao,
    onClose() {}, onSalvar: async () => {}, onGerenciarTurmas() {},
  }));
  assert.equal(html, "");
});
