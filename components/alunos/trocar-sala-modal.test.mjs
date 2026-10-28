import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

// Mesma forma do ErroApi real (lib/data/store.ts): codigo e payload expostos.
class ErroApiFalso extends Error {
  constructor(mensagem, codigo, payload = {}) {
    super(mensagem);
    this.codigo = codigo;
    this.payload = payload;
  }
}

function componente(react = React, globais = {}) {
  const arquivo = new URL("./trocar-sala-modal.tsx", import.meta.url);
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
      if (id === "@/lib/data/store") return { ErroApi: ErroApiFalso };
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

const aguardar = () => new Promise((resolver) => setTimeout(resolver, 0));

test("salvar manda o patch pela store; lotação abre diálogo coerente e reenvia com extras.confirmarLotacao", async () => {
  const chamadas = [];
  const eventos = [];
  let falhar = true;
  const onSalvar = async (id, patch, opcoes) => {
    chamadas.push({ id, patch, opcoes });
    if (falhar) {
      falhar = false;
      throw new ErroApiFalso(
        "A turma Maternal 1 - Manhã B já tem 20 de 20 vagas ocupadas. Escolha outra turma ou aumente a capacidade dela em Turmas.",
        "lotacao",
        { ocupacao: 20, capacidade: 20, turmaNome: "Maternal 1 - Manhã B" }
      );
    }
  };
  let fechou = 0;
  const hooks = hooksFalsos();
  class CustomEventFalso { constructor(tipo) { this.type = tipo; } }
  const Modal = componente(hooks.react, {
    window: { dispatchEvent: (evento) => eventos.push(evento.type) },
    CustomEvent: CustomEventFalso,
  });
  const props = {
    aluno, turmas, ocupacaoPorTurma: ocupacao,
    onClose: () => { fechou += 1; }, onSalvar, onGerenciarTurmas() {},
  };

  let arvore = hooks.renderizar(Modal, props);
  encontrar(arvore, (no) => no.type === "select").props.onChange({ target: { value: "sala-b" } });
  arvore = hooks.renderizar(Modal, props);
  encontrar(arvore, (no) =>
    typeof no.props?.onClick === "function" && contemTexto(no, "Salvar") && !contemTexto(no, "Cancelar")).props.onClick();
  await aguardar();

  // 1ª tentativa: patch puro, sem confirmação embutida. (JSON: objetos criados
  // dentro do vm têm prototype de outro realm e falham no deepStrictEqual.)
  assert.deepEqual(JSON.parse(JSON.stringify(chamadas[0])), { id: "a1", patch: { turmaId: "sala-b" }, opcoes: {} });

  // Diálogo coerente: números do conflito + pergunta, sem o "escolha outra turma" da API.
  arvore = hooks.renderizar(Modal, props);
  const dialogo = encontrar(arvore, (no) => no.props?.textoBotaoConfirmar === "Mover mesmo assim");
  assert.equal(dialogo.props.aberto, true);
  assert.ok(dialogo.props.descricao.includes("já tem 20 de 20 vagas ocupadas"));
  assert.ok(dialogo.props.descricao.includes("Mover Lucca mesmo assim?"));
  assert.ok(!dialogo.props.descricao.includes("Escolha outra turma"));

  // Confirmação: a store só injeta no corpo o que vem em opcoes.extras.
  await dialogo.props.onConfirmar();
  await aguardar();
  assert.deepEqual(JSON.parse(JSON.stringify(chamadas[1].opcoes)), { extras: { confirmarLotacao: true } });
  assert.deepEqual(eventos, ["semente:changed:turmas"]);
  assert.equal(fechou, 1);
});
