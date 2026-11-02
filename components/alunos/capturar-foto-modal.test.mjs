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
  const arquivo = new URL("./capturar-foto-modal.tsx", import.meta.url);
  if (!existsSync(arquivo)) return undefined;
  const codigo = ts.transpileModule(readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    URL,
    ...globais,
    require(id) {
      if (id === "react") return react;
      if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
      if (id === "@/lib/toast") return { useToast: () => globais.toast ?? { success() {}, error() {} } };
      if (id === "@/lib/captura-foto") return { capturarQuadrado: async () => ({ falso: true }) };
      if (id === "@/components/ui/button") return { Button: ({ children, variant, size, ...props }) => React.createElement("button", props, children) };
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.CapturarFotoModal;
}

test("render inicial mostra o estado de câmera e o fallback de arquivo", () => {
  const Modal = componente();
  assert.equal(typeof Modal, "function");
  const html = renderToStaticMarkup(React.createElement(Modal, {
    alunoId: "a1", nomeAluno: "Alícia Quintela", onClose() {},
  }));
  assert.ok(html.includes("Foto de Alícia Quintela"));
  assert.ok(html.includes("Abrindo a câmera"));
  assert.ok(html.includes("Enviar arquivo"));
});

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
      useRef(inicial) {
        const indice = estado++;
        if (!(indice in estados)) estados[indice] = { current: inicial };
        return estados[indice];
      },
      useEffect(callback, deps) {
        const indice = efeito++;
        if (!dependencias[indice] || !deps || deps.some((valor, i) => !Object.is(valor, dependencias[indice][i]))) {
          dependencias[indice] = deps ?? [];
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

const aguardar = () => new Promise((resolver) => setTimeout(resolver, 0));

test("sem câmera disponível mostra o aviso e o envio de arquivo funciona de ponta a ponta", async () => {
  class FormDataFalso {
    constructor() { this.dados = new Map(); }
    set(chave, valor) { this.dados.set(chave, valor); }
  }
  const chamadas = [];
  const toasts = [];
  let atualizado = null;
  let fechou = 0;
  const hooks = hooksFalsos();
  const Modal = componente(hooks.react, {
    navigator: {}, // sem mediaDevices: câmera indisponível
    FormData: FormDataFalso,
    fetch: async (url, opcoes) => {
      chamadas.push({ url, body: opcoes.body });
      return { ok: true, json: async () => ({ ok: true, url: "/api/uploads/x/alunos/a1/f.jpg" }) };
    },
    toast: { success: (t) => toasts.push(t), error: (t, d) => toasts.push(`ERRO ${t}: ${d}`) },
  });
  const props = {
    alunoId: "a1", nomeAluno: "Alícia Quintela",
    onClose: () => { fechou += 1; }, onAtualizado: (url) => { atualizado = url; },
  };

  let arvore = hooks.renderizar(Modal, props);
  arvore = hooks.renderizar(Modal, props);
  assert.ok(contemTexto(arvore, "não dá acesso à câmera"));
  assert.equal(encontrar(arvore, (no) => contemTexto(no, "Tirar foto") && typeof no.props?.onClick === "function"), undefined);

  const arquivoFalso = { name: "foto.png", size: 10 };
  encontrar(arvore, (no) => no.type === "input" && no.props?.type === "file")
    .props.onChange({ target: { files: [arquivoFalso], value: "" } });
  await aguardar();

  assert.equal(chamadas[0].url, "/api/upload/foto-aluno");
  assert.equal(chamadas[0].body.dados.get("alunoId"), "a1");
  assert.equal(chamadas[0].body.dados.get("file"), arquivoFalso);
  assert.equal(atualizado, "/api/uploads/x/alunos/a1/f.jpg");
  assert.equal(fechou, 1);
  assert.ok(toasts.includes("Foto atualizada!"));
});

test("upload com erro mantém o modal aberto e avisa", async () => {
  class FormDataFalso {
    constructor() { this.dados = new Map(); }
    set(chave, valor) { this.dados.set(chave, valor); }
  }
  const toasts = [];
  let fechou = 0;
  const hooks = hooksFalsos();
  const Modal = componente(hooks.react, {
    navigator: {},
    FormData: FormDataFalso,
    fetch: async () => ({ ok: false, json: async () => ({ error: "Imagem vazia ou maior que 5 MB" }) }),
    toast: { success() {}, error: (t, d) => toasts.push(`${t}: ${d}`) },
  });
  const props = { alunoId: "a1", nomeAluno: "Alícia", onClose: () => { fechou += 1; } };

  let arvore = hooks.renderizar(Modal, props);
  arvore = hooks.renderizar(Modal, props);
  encontrar(arvore, (no) => no.type === "input" && no.props?.type === "file")
    .props.onChange({ target: { files: [{ name: "x.png" }], value: "" } });
  await aguardar();

  assert.equal(fechou, 0);
  assert.ok(toasts.some((texto) => texto.includes("5 MB")));
});
