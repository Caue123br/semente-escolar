import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const ts = require("typescript");

function carregarDocsLib() {
  const codigo = ts.transpileModule(readFileSync(new URL("../../lib/documentos-aluno.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, { exports, require() { throw new Error("sem dependências"); } });
  return exports;
}
const docsLib = carregarDocsLib();

function componente(react = React, globais = {}) {
  const arquivo = new URL("./documentos-aluno.tsx", import.meta.url);
  if (!existsSync(arquivo)) return undefined;
  const codigo = ts.transpileModule(readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    AbortController,
    ...globais,
    require(id) {
      if (id === "react") return react;
      if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
      if (id === "@/components/shared/confirm-dialog") return { ConfirmDialog: () => null };
      if (id === "@/lib/perfil-context") return { usePerfil: () => ({ perfil: globais.perfil ?? "diretor", carregando: false }) };
      if (id === "@/lib/access-control") return { podeGerenciarAlunos: (p) => ["diretor", "coordenador"].includes(p) };
      if (id === "@/lib/toast") return { useToast: () => globais.toast ?? { success() {}, error() {} } };
      if (id === "@/lib/utils") return { formatDateBR: (data) => `BR(${data})`, cn: (...c) => c.filter(Boolean).join(" ") };
      if (id === "@/lib/documentos-aluno") return docsLib;
      for (const [nome, tag] of [["Button", "button"], ["Input", "input"], ["Label", "label"]]) {
        if (id === `@/components/ui/${nome.toLowerCase()}`) return { [nome]: ({ children, variant, size, ...props }) => React.createElement(tag, props, children) };
      }
      if (id === "@/components/ui/card") {
        const simples = (tag) => ({ children, ...props }) => React.createElement(tag, props, children);
        return { Card: simples("section"), CardHeader: simples("header"), CardTitle: simples("h3"), CardDescription: simples("p"), CardContent: simples("div") };
      }
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.DocumentosAluno;
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

function contemTexto(no, texto) {
  if (typeof no === "string") return no.includes(texto);
  if (Array.isArray(no)) return no.some((filho) => contemTexto(filho, texto));
  if (!no || typeof no !== "object") return false;
  return contemTexto(no.props?.children, texto);
}

const aguardar = () => new Promise((resolver) => setTimeout(resolver, 0));

const doc = {
  id: "d1", alunoId: "a1", categoria: "Certidão de nascimento", descricao: "via 2026",
  arquivoUrl: "/api/uploads/default/alunos/a1/documentos/d1.pdf", mime: "application/pdf",
  tamanhoBytes: 2048, enviadoPorNome: "Gestora", criadoEm: "2026-11-10T12:00:00Z",
};

test("gestão vê o formulário; a lista mostra categoria, tamanho, autor e o link Abrir", async () => {
  const hooks = hooksFalsos();
  const Aba = componente(hooks.react, { fetch: async () => ({ ok: true, json: async () => ({ items: [doc] }) }) });
  assert.equal(typeof Aba, "function");
  hooks.renderizar(Aba, { alunoId: "a1" });
  await aguardar();
  const arvore = hooks.renderizar(Aba, { alunoId: "a1" });
  assert.ok(contemTexto(arvore, "Certidão de nascimento"));
  assert.ok(contemTexto(arvore, "via 2026"));
  assert.ok(contemTexto(arvore, "2 KB"));
  assert.ok(contemTexto(arvore, "Gestora"));
  assert.ok(contemTexto(arvore, "Arquivar"));
  assert.ok(encontrar(arvore, (no) => no.type === "a" && no.props?.href === doc.arquivoUrl));
});

test("professor não vê formulário nem Excluir, mas vê a lista", async () => {
  const hooks = hooksFalsos();
  const Aba = componente(hooks.react, { perfil: "professor", fetch: async () => ({ ok: true, json: async () => ({ items: [doc] }) }) });
  hooks.renderizar(Aba, { alunoId: "a1" });
  await aguardar();
  const arvore = hooks.renderizar(Aba, { alunoId: "a1" });
  assert.ok(!contemTexto(arvore, "Arquivar"));
  assert.ok(!contemTexto(arvore, "Excluir"));
  assert.ok(contemTexto(arvore, "Certidão de nascimento"));
});

test("enviar monta o FormData do contrato da API e recarrega a lista", async () => {
  class FormDataFalso {
    constructor() { this.dados = new Map(); }
    set(chave, valor) { this.dados.set(chave, valor); }
  }
  const chamadas = [];
  const hooks = hooksFalsos();
  const Aba = componente(hooks.react, {
    FormData: FormDataFalso,
    fetch: async (url, opcoes = {}) => {
      chamadas.push({ url, metodo: opcoes.method ?? "GET", body: opcoes.body });
      return { ok: true, json: async () => (opcoes.method === "POST" ? { ok: true } : { items: [] }) };
    },
  });
  const props = { alunoId: "a1" };
  hooks.renderizar(Aba, props);
  await aguardar();
  let arvore = hooks.renderizar(Aba, props);

  const arquivoFalso = { name: "certidao.pdf", size: 1000 };
  encontrar(arvore, (no) => no.type === "input" && no.props?.type === "file").props.onChange({ target: { files: [arquivoFalso] } });
  arvore = hooks.renderizar(Aba, props);
  encontrar(arvore, (no) => no.type === "form").props.onSubmit({ preventDefault() {} });
  await aguardar();
  // O recarregamento vem do efeito [tentativa], que roda no próximo render.
  hooks.renderizar(Aba, props);
  await aguardar();

  const post = chamadas.find((chamada) => chamada.metodo === "POST");
  assert.equal(post.url, "/api/upload/documento-aluno");
  assert.equal(post.body.dados.get("alunoId"), "a1");
  assert.equal(post.body.dados.get("categoria"), "Certidão de nascimento");
  assert.equal(post.body.dados.get("file"), arquivoFalso);
  assert.ok(chamadas.filter((chamada) => chamada.metodo === "GET").length >= 2);
});

test("excluir passa pelo ConfirmDialog e chama o DELETE certo", async () => {
  const chamadas = [];
  const hooks = hooksFalsos();
  const Aba = componente(hooks.react, {
    fetch: async (url, opcoes = {}) => {
      chamadas.push({ url, metodo: opcoes.method ?? "GET" });
      return { ok: true, json: async () => (opcoes.method === "DELETE" ? { ok: true } : { items: [doc] }) };
    },
  });
  const props = { alunoId: "a1" };
  hooks.renderizar(Aba, props);
  await aguardar();
  let arvore = hooks.renderizar(Aba, props);
  encontrar(arvore, (no) => typeof no.type === "function" && typeof no.props?.onClick === "function" && contemTexto(no, "Excluir")).props.onClick();
  arvore = hooks.renderizar(Aba, props);
  const dialogo = encontrar(arvore, (no) => no.props?.textoBotaoConfirmar === "Sim, excluir");
  assert.equal(dialogo.props.aberto, true);
  await dialogo.props.onConfirmar();
  assert.ok(chamadas.some((chamada) => chamada.metodo === "DELETE" && chamada.url === "/api/alunos/a1/documentos/d1"));
});
