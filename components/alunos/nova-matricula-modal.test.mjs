import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const ts = require("typescript");
const CHAVE = "semente:data:rascunho-matricula";

// Usa o componente real e suas transições; apenas fronteiras de apresentação,
// storage do navegador, relógio e rede recebem substitutos determinísticos.
function sessao({ storage = new Map(), respostaCep, rascunho } = {}) {
  if (rascunho) storage.set(CHAVE, JSON.stringify(rascunho));
  const estados = [], refs = [], dependencias = [], limpezas = [];
  const timers = new Map();
  let indiceEstado = 0, indiceRef = 0, indiceEfeito = 0, efeitos = [], proximoTimer = 0;
  const react = {
    ...React,
    useState(inicial) {
      const indice = indiceEstado++;
      if (!(indice in estados)) estados[indice] = typeof inicial === "function" ? inicial() : inicial;
      return [estados[indice], (valor) => { estados[indice] = typeof valor === "function" ? valor(estados[indice]) : valor; }];
    },
    useRef(inicial) { return refs[indiceRef++] ??= { current: inicial }; },
    useEffect(callback, deps) {
      const indice = indiceEfeito++;
      if (!dependencias[indice] || deps.some((valor, i) => !Object.is(valor, dependencias[indice][i]))) {
        dependencias[indice] = deps;
        efeitos.push(() => { limpezas[indice]?.(); limpezas[indice] = callback(); });
      }
    },
    useMemo(callback) { return callback(); },
    useCallback(callback) { return callback; },
    useId() { return "campo-matricula"; },
  };
  const avisos = [], salvos = [], cache = new Map();
  const carregar = (arquivo) => {
    if (cache.has(arquivo.href)) return cache.get(arquivo.href);
    const exports = {};
    cache.set(arquivo.href, exports);
    const codigo = ts.transpileModule(readFileSync(arquivo, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(codigo, {
      exports,
      window: { localStorage: { getItem: (chave) => storage.get(chave) ?? null, setItem: (chave, valor) => storage.set(chave, valor), removeItem: (chave) => storage.delete(chave) } },
      setTimeout: (callback) => { const id = ++proximoTimer; timers.set(id, callback); return id; },
      clearTimeout: (id) => timers.delete(id),
      fetch: async () => ({ ok: true, json: async () => respostaCep }),
      require(id) {
        if (id === "react") return react;
        if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
        if (id === "@/lib/toast") return { useToast: () => Object.fromEntries(["success", "error", "info"].map((tipo) => [tipo, (...args) => avisos.push(args)])) };
        if (id === "@/lib/perfil-context") return { usePerfil: () => ({ nome: "Secretária Exemplo", perfil: "diretor", carregando: false }) };
        if (id === "@/lib/utils") return { cn: (...classes) => classes.filter(Boolean).join(" "), formatDateLocalISO: () => "2026-10-23", formatDateBR: (v) => v, formatRelative: () => "agora" };
        if (id === "@/lib/data/store") return { ErroApi: class ErroApi extends Error {}, RASCUNHO_MATRICULA_CHAVE: CHAVE, RASCUNHO_MATRICULA_CHAVE_ANTIGA: "antiga", apagarRascunhoMatricula: () => storage.delete(CHAVE) };
        for (const nome of ["cpf", "periodos-matricula", "endereco-residencial"]) {
          if (id === `@/lib/${nome}`) return carregar(new URL(`../../lib/${nome}.ts`, import.meta.url));
        }
        if (id === "@/components/shared/confirm-dialog") return { ConfirmDialog: () => null };
        if (id === "@/components/shared/campos-mascarados") return Object.fromEntries(["InputCPF", "InputTelefone", "InputCEP"].map((nome) => [nome, nome]));
        for (const [nome, tag] of [["Button", "button"], ["Input", "input"], ["Label", "label"]]) {
          if (id === `@/components/ui/${nome.toLowerCase()}`) return { [nome]: tag };
        }
        throw new Error(`Dependência inesperada: ${id}`);
      },
    });
    return exports;
  };
  const { NovaMatriculaModal } = carregar(new URL("./nova-matricula-modal.tsx", import.meta.url));
  const props = { aberto: true, turmas: [{ id: "sala-1", nome: "Sala 1", professorNome: "Professora Exemplo" }], onClose() {}, onSalvar: async (aluno) => salvos.push(JSON.parse(JSON.stringify(aluno))) };
  const renderizar = () => {
    indiceEstado = 0; indiceRef = 0; indiceEfeito = 0; efeitos = [];
    const arvore = NovaMatriculaModal(props);
    efeitos.forEach((callback) => callback());
    return arvore;
  };
  renderizar();
  return {
    renderizar, props, salvos, avisos, storage,
    gravarRascunho() { renderizar(); const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach((callback) => callback()); },
  };
}
function encontrar(arvore, predicado) {
  if (Array.isArray(arvore)) {
    for (const filho of arvore) { const encontrado = encontrar(filho, predicado); if (encontrado) return encontrado; }
  } else if (arvore && typeof arvore === "object") {
    if (predicado(arvore)) return arvore;
    return encontrar(arvore.props?.children, predicado);
  }
}
function etapa(s, nome) {
  const elemento = encontrar(s.renderizar(), (e) => e.type?.name === nome);
  assert.ok(elemento, `Etapa ausente: ${nome}`);
  return elemento;
}
function texto(arvore) {
  if (Array.isArray(arvore)) return arvore.map(texto).join("");
  if (arvore && typeof arvore === "object") return texto(arvore.props?.children);
  return typeof arvore === "string" ? arvore : "";
}
function clicar(s, rotulo) {
  const botao = encontrar(s.renderizar(), (e) => e.type === "button" && texto(e).trim() === rotulo);
  assert.ok(botao, `Botão ausente: ${rotulo}`);
  return botao.props.onClick();
}
function preencherAluno(s, dados = {}) {
  for (const [chave, valor] of Object.entries({ nome: "Criança Exemplo", dataNascimento: "2021-03-01", periodo: "semi_tarde", ...dados })) etapa(s, "PassoAluno").props.atualizar(chave, valor);
}
async function concluir(s, enderecoEsperado) {
  clicar(s, "Próximo");
  const pai = etapa(s, "PassoResponsavel");
  pai.props.atualizar("nome", "Pai Exemplo");
  pai.props.atualizar("telefone", "12988888888");
  for (let i = 0; i < 4; i++) clicar(s, "Próximo");
  if (enderecoEsperado !== undefined) {
    const conclusao = etapa(s, "PassoConclusao");
    assert.ok(texto(conclusao.type(conclusao.props)).includes(enderecoEsperado), "Conclusão precisa exibir endereço com o número informado");
  }
  clicar(s, "Finalizar matrícula");
  await new Promise(setImmediate);
  assert.equal(s.salvos.length, 1, JSON.stringify(s.avisos));
  return s.salvos[0];
}

// Captura perdas no estado do aluno, montagem do JSON e endereço familiar sem número.
test("matrícula oferece campo acessível e salva número separado, resumo e endereço familiar", async () => {
  for (const numero of ["123", "123A", "S/N"]) {
    const s = sessao();
    const controle = etapa(s, "PassoAluno");
    const arvore = controle.type(controle.props);
    const label = encontrar(arvore, (e) => e.type === "label" && e.props.children === "Número da residência");
    assert.ok(label, "Número da residência precisa de rótulo acessível");
    const input = encontrar(arvore, (e) => e.type === "input" && e.props.id === label.props.htmlFor);
    assert.ok(input);
    assert.equal(input.props.placeholder, "Ex.: 123 ou S/N");
    assert.equal(input.props.maxLength, 30);
    input.props.onChange({ target: { value: ` ${numero} ` } });
    preencherAluno(s, { endereco: "Rua Exemplo", bairro: "Centro" });
    const aluno = await concluir(s, `Rua Exemplo, nº ${numero}`);
    assert.equal(aluno.numeroResidencia, numero);
    assert.equal(aluno.endereco, "Rua Exemplo");
    assert.equal(aluno.responsaveis[0].endereco, `Rua Exemplo, nº ${numero}, Centro`);
    assert.equal(aluno.periodo, "semi_tarde");
  }
});

test("digitar só número já guarda rascunho e retomada após reabrir conserva o valor", () => {
  const s = sessao();
  etapa(s, "PassoAluno").props.atualizar("numeroResidencia", "123A");
  s.gravarRascunho();
  assert.ok(s.storage.has(CHAVE), "Digitar só número deve agendar o rascunho");
  assert.equal(JSON.parse(s.storage.get(CHAVE)).aluno.numeroResidencia, "123A");
  const reaberta = sessao({ storage: s.storage });
  clicar(reaberta, "Retomar");
  assert.equal(etapa(reaberta, "PassoAluno").props.dados.numeroResidencia, "123A");
});

test("CEP preenche rua e bairro sem apagar número e payload mantém ambos após retomar rascunho", async () => {
  const s = sessao({ respostaCep: { ok: true, endereco: "Rua do CEP", bairro: "Centro" } });
  preencherAluno(s, { numeroResidencia: "S/N" });
  etapa(s, "PassoAluno").props.onCepChange("12000-001");
  await new Promise(setImmediate);
  assert.equal(etapa(s, "PassoAluno").props.dados.numeroResidencia, "S/N");
  s.gravarRascunho();
  const reaberta = sessao({ storage: s.storage });
  clicar(reaberta, "Retomar");
  const aluno = await concluir(reaberta);
  assert.equal(aluno.numeroResidencia, "S/N");
  assert.equal(aluno.endereco, "Rua do CEP");
  assert.equal(aluno.bairro, "Centro");
});

test("rascunho legado sem número permanece válido sem extrair número do endereço", async () => {
  const s = sessao({ rascunho: {
    salvoEm: Date.now(), dono: "diretor:Secretária Exemplo", passo: 1,
    aluno: { nome: "Criança Legada", dataNascimento: "2021-03-01", periodo: "semi_tarde", endereco: "Rua antiga, 789" },
  } });
  clicar(s, "Retomar");
  assert.equal(etapa(s, "PassoAluno").props.dados.numeroResidencia, "");
  const aluno = await concluir(s);
  assert.equal(aluno.numeroResidencia, "");
  assert.equal(aluno.endereco, "Rua antiga, 789");
});
