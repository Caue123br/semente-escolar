import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

const ModalStub = (props) => React.createElement("div", { "data-modal-captura": props.alunoId });

function componente(react = React) {
  const codigo = ts.transpileModule(readFileSync(new URL("./upload-foto.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    require(id) {
      if (id === "react") return react;
      if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
      if (id === "@/components/alunos/capturar-foto-modal") return { CapturarFotoModal: ModalStub };
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
  return exports.UploadFotoAluno;
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
      estado = 0; efeito = 0; pendentes = [];
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

test("mostra a foto atual e o botão descreve a ação", () => {
  const Upload = componente();
  const html = renderToStaticMarkup(React.createElement(Upload, {
    alunoId: "a1", nomeAluno: "Alícia Quintela", fotoAtual: "/api/uploads/x/alunos/a1/f.jpg",
  }));
  assert.ok(html.includes("/api/uploads/x/alunos/a1/f.jpg"));
  assert.ok(html.includes("Tirar ou enviar foto de Alícia Quintela"));
});

test("clicar no botão de câmera abre o CapturarFotoModal com o aluno certo", () => {
  const hooks = hooksFalsos();
  const Upload = componente(hooks.react);
  const props = { alunoId: "a1", nomeAluno: "Alícia Quintela" };
  let arvore = hooks.renderizar(Upload, props);
  assert.equal(encontrar(arvore, (no) => no.type === ModalStub), undefined);
  encontrar(arvore, (no) => no.type === "button").props.onClick();
  arvore = hooks.renderizar(Upload, props);
  const modal = encontrar(arvore, (no) => no.type === ModalStub);
  assert.equal(modal.props.alunoId, "a1");
});
