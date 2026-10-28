import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

function componente(perfil = "diretor", react = React) {
  const arquivo = new URL("./gerenciar-turmas-modal.tsx", import.meta.url);
  if (!existsSync(arquivo)) return undefined;
  const codigo = ts.transpileModule(readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    require(id) {
      if (id === "react") return react;
      if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
      if (id === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children), __esModule: true };
      if (id === "@/lib/perfil-context") return { usePerfil: () => ({ perfil, carregando: false }) };
      if (id === "@/lib/access-control") return { podeGerenciarAlunos: (valor) => ["diretor", "coordenador"].includes(valor) };
      if (id === "@/lib/toast") return { useToast: () => ({ success() {}, error() {} }) };
      for (const [nome, tag] of [["Button", "button"], ["Input", "input"], ["Label", "label"]]) {
        if (id === `@/components/ui/${nome.toLowerCase()}`) return { [nome]: ({ children, variant, ...props }) => React.createElement(tag, props, children) };
      }
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.GerenciarTurmasModal;
}

const base = { serie: "Maternal", turno: "Manhã", professorId: "", professorNome: "", totalAlunos: 2, capacidade: 20, cor: "#059669" };
const turmas = Array.from({ length: 10 }, (_, i) => ({ ...base, id: `sala-${i + 1}`, nome: `Sala Exemplo ${i + 1}` }));

test("gestão lista todas as dez salas e identifica pendências de professora", () => {
  const Modal = componente();
  assert.equal(typeof Modal, "function");
  const html = renderToStaticMarkup(React.createElement(Modal, { aberto: true, turmas, onClose() {}, onSalvar: async () => {} }));
  for (let i = 1; i <= 10; i++) assert.ok(html.includes(`Sala Exemplo ${i}`));
  assert.ok(html.includes("Sem professora atribuída"));
  assert.ok(html.includes("Nome da responsável"));
  assert.ok(html.includes("Salvar turma"));
});

test("responsável sem login aparece sem exigir novo acesso ao sistema", () => {
  const Modal = componente("coordenador");
  assert.equal(typeof Modal, "function");
  const html = renderToStaticMarkup(React.createElement(Modal, {
    aberto: true, turmas: [{ ...turmas[0], professorNome: "Professora Manual" }], onClose() {}, onSalvar: async () => {},
  }));
  assert.ok(html.includes("Professora Manual"));
  assert.ok(html.includes("sem acesso"));
  assert.ok(!html.includes("Sem professora atribuída"));
});

test("professor e financeiro não recebem controles de edição", () => {
  for (const perfil of ["professor", "financeiro"]) {
    const Modal = componente(perfil);
    assert.equal(typeof Modal, "function");
    const html = renderToStaticMarkup(React.createElement(Modal, { aberto: true, turmas, onClose() {}, onSalvar: async () => {} }));
    assert.equal(html, "");
  }
});

function encontrar(arvore, predicado) {
  if (Array.isArray(arvore)) {
    for (const filho of arvore) {
      const encontrado = encontrar(filho, predicado);
      if (encontrado) return encontrado;
    }
    return undefined;
  }
  if (!arvore || typeof arvore !== "object") return undefined;
  if (predicado(arvore)) return arvore;
  return encontrar(arvore.props?.children, predicado);
}

function hooksDeLinha() {
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
    renderizar(Componente, props, executarEfeitos = true) {
      estado = 0;
      efeito = 0;
      pendentes = [];
      const arvore = Componente(props);
      if (executarEfeitos) pendentes.forEach((callback) => callback());
      return arvore;
    },
    reiniciar() {
      estados.length = 0;
      dependencias.length = 0;
    },
  };
}

test("remover professora preserva nome e capacidade ainda não salvos na mesma sala", async () => {
  const hooks = hooksDeLinha();
  const Modal = componente("diretor", hooks.react);
  let turma = { ...turmas[0], professorNome: "Professora Manual" };
  const modal = hooks.renderizar(Modal, { aberto: true, turmas: [turma], onClose() {}, onSalvar: async () => {} }, false);
  const linha = encontrar(modal, (elemento) => typeof elemento.type === "function" && elemento.props?.turma);
  assert.ok(linha);
  // Cada linha possui seus próprios slots de hooks, como uma instância React.
  hooks.reiniciar();
  const renderDaLinha = () => hooks.renderizar(linha.type, {
    ...linha.props, turma, onSalvar: async (_id, patch) => { turma = { ...turma, ...patch }; },
  });
  let arvore = renderDaLinha();
  encontrar(arvore, (elemento) => elemento.props?.id === "gerenciar-sala-1-nome").props.onChange({ target: { value: "Sala em edição" } });
  encontrar(arvore, (elemento) => elemento.props?.id === "gerenciar-sala-1-capacidade").props.onChange({ target: { value: "30" } });
  arvore = renderDaLinha();
  encontrar(arvore, (elemento) => elemento.props?.children === "Remover atribuição").props.onClick();
  await Promise.resolve();
  arvore = renderDaLinha();
  arvore = renderDaLinha();
  assert.equal(encontrar(arvore, (elemento) => elemento.props?.id === "gerenciar-sala-1-nome").props.value, "Sala em edição");
  assert.equal(encontrar(arvore, (elemento) => elemento.props?.id === "gerenciar-sala-1-capacidade").props.value, "30");
  assert.equal(turma.professorNome, "");
});

test("botão Duplicar sala aparece só quando a página fornece onDuplicar", () => {
  const Modal = componente();
  const sem = renderToStaticMarkup(React.createElement(Modal, { aberto: true, turmas, onClose() {}, onSalvar: async () => {} }));
  assert.ok(!sem.includes("Duplicar sala"));
  const com = renderToStaticMarkup(React.createElement(Modal, {
    aberto: true, turmas, onClose() {}, onSalvar: async () => {}, onDuplicar() {},
  }));
  assert.ok(com.includes("Duplicar sala"));
});

test("Duplicar sala entrega a turma da própria linha", () => {
  const hooks = hooksDeLinha();
  const Modal = componente("diretor", hooks.react);
  let duplicada = null;
  const modal = hooks.renderizar(Modal, {
    aberto: true, turmas, onClose() {}, onSalvar: async () => {}, onDuplicar: (turma) => { duplicada = turma; },
  }, false);
  const linha = encontrar(modal, (elemento) => typeof elemento.type === "function" && elemento.props?.turma?.id === "sala-3");
  assert.ok(linha);
  hooks.reiniciar();
  const arvore = hooks.renderizar(linha.type, linha.props);
  encontrar(arvore, (elemento) => elemento.props?.children === "Duplicar sala").props.onClick();
  assert.equal(duplicada?.id, "sala-3");
  assert.equal(duplicada?.nome, "Sala Exemplo 3");
});
