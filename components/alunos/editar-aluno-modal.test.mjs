import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const ts = require("typescript");

// Executa o componente real; substitui apenas o runtime de hooks e as dependências de apresentação.
function sessao(alteracoes = {}, perfil = "diretor", respostaCep) {
  const estados = [], refs = [], dependencias = [];
  let indiceEstado = 0, indiceRef = 0, indiceEfeito = 0, efeitos = [];
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
        efeitos.push(callback);
      }
    },
    useId() { return "campo-saude"; },
  };
  const avisos = [];
  const cache = new Map();
  const carregar = (arquivo) => {
    const chave = arquivo.href;
    if (cache.has(chave)) return cache.get(chave);
    const exports = {};
    cache.set(chave, exports);
    const codigo = ts.transpileModule(readFileSync(arquivo, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(codigo, {
      exports,
      fetch: async () => ({ ok: true, json: async () => respostaCep }),
      require(id) {
        if (id === "react") return react;
        if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
        if (id === "@/lib/toast") return { useToast: () => ({ success: (...args) => avisos.push(args), error: (...args) => avisos.push(args) }) };
        if (id === "@/lib/perfil-context") return { usePerfil: () => ({ perfil, carregando: false }) };
        if (id === "@/lib/access-control") return carregar(new URL("../../lib/access-control.ts", import.meta.url));
        if (id === "@/lib/utils") return { formatDateLocalISO: () => "2026-10-23" };
        if (id === "@/lib/data/store") return { ErroApi: class ErroApi extends Error {} };
        if (id === "@/lib/cpf") return carregar(new URL("../../lib/cpf.ts", import.meta.url));
        if (id === "@/lib/periodos-matricula") return carregar(new URL("../../lib/periodos-matricula.ts", import.meta.url));
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
  const { EditarAlunoModal } = carregar(new URL("./editar-aluno-modal.tsx", import.meta.url));
  const aluno = {
    id: "aluno-1", nome: "Criança Exemplo", dataNascimento: "2021-03-01", cpf: "", sexo: "F",
    matricula: "0001", turmaId: "sala-1", status: "Ativo", bilingue: true, periodo: "semi_tarde",
    rg: "RG antigo", ra: "RA antigo", raca: "Cor anterior", naturalDe: "Cidade anterior", estado: "SP",
    cep: "12000-000", endereco: "Rua anterior", bairro: "Bairro anterior", telefoneAluno: "12999999999",
    religiao: "Religião anterior", observacoes: "Anotação anterior",
    responsaveis: [{ nome: "Responsável Exemplo", parentesco: "Mãe", telefone: "12988888888", principal: true, responsavelFinanceiro: true, localTrabalho: "Preservar trabalho" }],
    pessoasAutorizadas: [{ nome: "Avó Exemplo", parentesco: "Avó", telefone: "12977777777" }],
    ...alteracoes,
  };
  const salvos = [];
  const props = { aberto: true, aluno, turmas: [{ id: "sala-1", nome: "Sala 1", professorNome: "Professora Exemplo" }], onClose() {}, onSalvar: async (id, patch) => { salvos.push({ id, patch: JSON.parse(JSON.stringify(patch)) }); } };
  const renderizar = () => {
    indiceEstado = 0; indiceRef = 0; indiceEfeito = 0; efeitos = [];
    const arvore = EditarAlunoModal(props);
    efeitos.forEach((callback) => callback());
    return arvore;
  };
  renderizar();
  return { renderizar, salvos, avisos, aluno, props };
}

function encontrar(arvore, predicado) {
  if (Array.isArray(arvore)) {
    for (const filho of arvore) { const encontrado = encontrar(filho, predicado); if (encontrado) return encontrado; }
  } else if (arvore && typeof arvore === "object") {
    if (predicado(arvore)) return arvore;
    return encontrar(arvore.props?.children, predicado);
  }
}
function campo(arvore, label) {
  const elemento = encontrar(arvore, (e) => e.props?.label === label);
  assert.ok(elemento, `Campo de edição ausente: ${label}`);
  return elemento;
}
function porId(arvore, id) {
  const elemento = encontrar(arvore, (e) => e.props?.id === id && e.props?.onChange);
  assert.ok(elemento, `Controle de edição ausente: ${id}`);
  return elemento;
}
async function tentarSalvar(sessao) {
  const botao = encontrar(sessao.renderizar(), (e) => e.type === "button" && Array.isArray(e.props?.children) && e.props.children.includes(" Salvar alterações"));
  assert.ok(botao);
  botao.props.onClick();
  await Promise.resolve();
}
async function salvar(sessao) {
  await tentarSalvar(sessao);
  assert.equal(sessao.salvos.length, 1, JSON.stringify(sessao.avisos));
  return sessao.salvos[0].patch;
}

// Regressão: voltar a undefined em qualquer campo apagado omite a chave no JSON e conserva o dado antigo no servidor.
test("apagar dados opcionais envia valores vazios explícitos no JSON do PATCH", async () => {
  const s = sessao();
  let arvore = s.renderizar();
  for (const label of ["RG (opcional)", "RA (registro acadêmico)", "Raça/Cor", "Natural de", "Estado (UF)", "Religião", "Endereço", "Bairro"]) {
    campo(arvore, label).props.onChange("  ");
  }
  for (const tipo of ["InputCPF", "InputTelefone", "InputCEP"]) {
    encontrar(arvore, (e) => e.type === tipo).props.onChange("");
  }
  porId(arvore, "ed-sexo").props.onChange({ target: { value: "" } });
  porId(arvore, "ed-obs").props.onChange({ target: { value: "  " } });
  const patch = await salvar(s);
  for (const chave of ["rg", "ra", "raca", "naturalDe", "estado", "religiao", "endereco", "bairro", "cpf", "telefoneAluno", "cep", "sexo", "observacoes"]) {
    assert.equal(patch[chave], "", `O campo ${chave} precisa chegar vazio ao servidor`);
  }
  assert.equal(patch.periodo, "semi_tarde");
  assert.equal(patch.bilingue, true);
  assert.equal(patch.turmaId, "sala-1");
  assert.deepEqual(patch.pessoasAutorizadas, [{ nome: "Avó Exemplo", parentesco: "Avó", telefone: "12977777777" }]);
  assert.equal(Object.hasOwn(patch, "responsaveis"), false);
  assert.equal(s.aluno.responsaveis[0].localTrabalho, "Preservar trabalho");
  assert.equal(Object.hasOwn(patch, "fichaSaude"), false);
});

// Regressão: substituir a ficha por defaults apagaria dados de saúde legados e doenças não presentes no formulário.
test("editar saúde altera alergias e autorização sem perder o restante da ficha", async () => {
  const ficha = {
    doencas: { bronquite: true, hepatite: true, hepatiteTipo: "B", doencaLegada: "preservar" },
    alergias: "Alergia anterior", medicamentoFebreSim: true, medicamentoFebreQual: "Orientação anterior",
    medicoNome: "Médica Atual", medicoTelefone: "12966666666", convenioSim: true, convenioQual: "Convênio Atual",
    internadoMotivo: "Histórico anterior", campoLegado: { nota: "preservar objeto" },
  };
  const s = sessao({ fichaSaude: ficha });
  let arvore = s.renderizar();
  porId(arvore, "ed-saude-alergias").props.onChange({ target: { value: "" } });
  arvore = s.renderizar();
  const autorizacao = campo(arvore, "Em caso de febre, pode ser dado algum medicamento? Qual?");
  const radios = autorizacao.type(autorizacao.props);
  encontrar(radios, (e) => e.type === "input" && e.props.type === "radio" && e.props.checked === false).props.onChange();
  arvore = s.renderizar();
  porId(arvore, "ed-saude-doenca-bronquite").props.onChange({ target: { checked: false } });
  const patch = await salvar(s);
  assert.deepEqual(patch.fichaSaude, {
    ...ficha, alergias: "", medicamentoFebreSim: false,
    doencas: { ...ficha.doencas, bronquite: false },
  });
  assert.deepEqual(ficha.doencas, { bronquite: true, hepatite: true, hepatiteTipo: "B", doencaLegada: "preservar" });
  assert.equal(patch.periodo, "semi_tarde");
  assert.equal(patch.pessoasAutorizadas[0].telefone, "12977777777");
});

test("nova ficha de saúde só envia respostas informadas e mantém período legado não reconhecido", async () => {
  const s = sessao({ fichaSaude: undefined, periodo: "periodo-legado" });
  campo(s.renderizar(), "Médico responsável").props.onChange("Dra. Exemplo");
  const patch = await salvar(s);
  assert.deepEqual(patch.fichaSaude, { doencas: {}, medicoNome: "Dra. Exemplo" });
  assert.equal(Object.hasOwn(patch, "periodo"), false);
});

test("edição salva doenças, histórico, tratamento, médico e convênio no mesmo contrato da matrícula", async () => {
  const s = sessao({ fichaSaude: { doencas: { hepatite: true, hepatiteTipo: "C" } } });
  const arvore = s.renderizar();
  for (const chave of ["bronquite", "catapora", "caxumba", "convulsao", "coqueluche", "diabete", "hepatite", "pneumonia", "problemasCoracao", "rubeola", "sarampo"]) {
    porId(arvore, `ed-saude-doenca-${chave}`).props.onChange({ target: { checked: true } });
  }
  for (const [label, valor] of [
    ["Hepatite — qual tipo?", "A"], ["Outras doenças", "Outras condições"],
    ["Possui algum trauma ou fobia?", "Medo de altura"], ["Médico responsável", "Dra. Exemplo"],
    ["Telefone do médico", "12966666666"],
  ]) campo(arvore, label).props.onChange(valor);
  for (const [label, motivo] of [
    ["O aluno já desmaiou alguma vez?", "Histórico de desmaio"],
    ["O aluno já esteve internado?", "Histórico de internação"],
    ["Está em tratamento médico?", "Orientação de tratamento"],
    ["Em caso de febre, pode ser dado algum medicamento? Qual?", "Conforme orientação médica"],
    ["Possui convênio médico?", "Convênio Exemplo"],
  ]) {
    const controle = campo(arvore, label);
    controle.props.onChangeSim(true);
    controle.props.onChangeMotivo(motivo);
  }
  porId(arvore, "ed-saude-alergias").props.onChange({ target: { value: "Alimentação" } });
  porId(arvore, "ed-saude-informacoes").props.onChange({ target: { value: "Informação para a equipe" } });
  const patch = await salvar(s);
  assert.deepEqual(patch.fichaSaude, {
    doencas: { bronquite: true, catapora: true, caxumba: true, convulsao: true, coqueluche: true, diabete: true, hepatite: true, hepatiteTipo: "A", pneumonia: true, problemasCoracao: true, rubeola: true, sarampo: true },
    doencasOutras: "Outras condições", desmaioSim: true, desmaioMotivo: "Histórico de desmaio",
    internadoSim: true, internadoMotivo: "Histórico de internação", alergias: "Alimentação",
    tratamentoMedicoSim: true, tratamentoMotivo: "Orientação de tratamento", traumaFobia: "Medo de altura",
    medicamentoFebreSim: true, medicamentoFebreQual: "Conforme orientação médica",
    medicoNome: "Dra. Exemplo", medicoTelefone: "12966666666", convenioSim: true, convenioQual: "Convênio Exemplo",
    informacoesComplementares: "Informação para a equipe",
  });
});

test("professor e financeiro não recebem formulário de edição do cadastro e saúde", () => {
  for (const perfil of ["professor", "financeiro"]) assert.equal(sessao({}, perfil).renderizar(), null);
});

test("editar saúde preserva responsáveis legados inalterados sem exigir contato, CPF ou nome corrigidos", async () => {
  for (const responsavel of [
    { nome: "Responsável sem contato", parentesco: "Mãe" },
    { nome: "Responsável com CPF legado", parentesco: "Pai", cpf: "11111111111", telefone: "12988888888" },
    { nome: "A", parentesco: "Outro", telefone: "12988888888" },
    { nome: "Responsável sem eleição financeira", parentesco: "Mãe", telefone: "12988888888", principal: false, responsavelFinanceiro: false },
  ]) {
    const s = sessao({ responsaveis: [responsavel] });
    const original = JSON.parse(JSON.stringify(s.aluno.responsaveis));
    porId(s.renderizar(), "ed-saude-alergias").props.onChange({ target: { value: "Alergia atualizada" } });
    const patch = await salvar(s);
    assert.equal(patch.fichaSaude.alergias, "Alergia atualizada");
    assert.equal(Object.hasOwn(patch, "responsaveis"), false);
    assert.deepEqual(s.aluno.responsaveis, original);
  }
});

test("responsável editado com nome curto, CPF inválido ou contato removido continua bloqueando o salvamento", async () => {
  for (const tipo of ["nome", "cpf", "contato"]) {
    const s = sessao({ responsaveis: [{ nome: "Responsável Exemplo", parentesco: "Mãe", cpf: "52998224725", telefone: "12988888888", principal: true, responsavelFinanceiro: true }] });
    const arvore = s.renderizar();
    if (tipo === "nome") campo(arvore, "Nome").props.onChange("A");
    if (tipo === "cpf") encontrar(arvore, (e) => e.type === "InputCPF" && e.props.value === "52998224725").props.onChange("11111111111");
    if (tipo === "contato") encontrar(arvore, (e) => e.type === "InputTelefone" && e.props.value === "12988888888").props.onChange("");
    porId(arvore, "ed-saude-alergias").props.onChange({ target: { value: "Alergia atualizada" } });
    await tentarSalvar(s);
    assert.equal(s.salvos.length, 0, `Lista alterada inválida não pode salvar: ${tipo}`);
    assert.ok(s.avisos.some(([titulo]) => titulo === ({ nome: "Nome do responsável incompleto", cpf: "CPF do responsável inválido", contato: "Falta o contato da família" })[tipo]));
  }
});

test("eleição financeira explícita mantém campos legados e move os dois indicadores juntos", async () => {
  const s = sessao({ responsaveis: [
    { nome: "Primeiro Responsável", parentesco: "Mãe", telefone: "12988888888", principal: true, responsavelFinanceiro: true, localTrabalho: "Trabalho anterior" },
    { nome: "Segundo Responsável", parentesco: "Pai", telefone: "12977777777", principal: false, responsavelFinanceiro: false, profissao: "Profissão anterior" },
  ] });
  encontrar(s.renderizar(), (e) => e.type === "input" && e.props.name === "responsavel-financeiro" && e.props.checked === false).props.onChange();
  const patch = await salvar(s);
  assert.deepEqual(patch.responsaveis, [
    { nome: "Primeiro Responsável", parentesco: "Mãe", telefone: "12988888888", principal: false, responsavelFinanceiro: false, localTrabalho: "Trabalho anterior" },
    { nome: "Segundo Responsável", parentesco: "Pai", telefone: "12977777777", principal: true, responsavelFinanceiro: true, profissao: "Profissão anterior" },
  ]);
});


// Sem estado/carregamento/payload de número, este fluxo perde ou deixa de limpar o valor persistido.
test("número da residência carrega, aceita sufixo ou S/N e chega separado ao JSON do PATCH", async () => {
  for (const numero of ["123", "123A", "S/N"]) {
    const s = sessao({ numeroResidencia: "45", endereco: "Rua antiga, 45" });
    const controle = campo(s.renderizar(), "Número da residência");
    assert.equal(controle.props.value, "45");
    const elemento = controle.type(controle.props);
    const label = encontrar(elemento, (e) => e.type === "label");
    const input = encontrar(elemento, (e) => e.type === "input");
    assert.equal(label.props.htmlFor, input.props.id);
    assert.equal(input.props.placeholder, "Ex.: 123 ou S/N");
    assert.equal(input.props.maxLength, 30);
    input.props.onChange({ target: { value: ` ${numero} ` } });
    const patch = await salvar(s);
    assert.equal(patch.numeroResidencia, numero);
    assert.equal(patch.endereco, "Rua antiga, 45");
    assert.equal(Object.hasOwn(patch, "responsaveis"), false);
  }
});

test("apagar o número envia string vazia explícita e reabrir recarrega o dado salvo", async () => {
  const s = sessao({ numeroResidencia: "123A" });
  campo(s.renderizar(), "Número da residência").props.onChange("  ");
  assert.equal((await salvar(s)).numeroResidencia, "");
  s.props.aberto = false;
  s.renderizar();
  s.props.aberto = true;
  s.renderizar();
  assert.equal(campo(s.renderizar(), "Número da residência").props.value, "123A");
});

test("CEP preenche logradouro e bairro preservando número já digitado na edição", async () => {
  const s = sessao({ numeroResidencia: "S/N" }, "diretor", { ok: true, endereco: "Rua do CEP", bairro: "Centro" });
  const cep = encontrar(s.renderizar(), (e) => e.type === "InputCEP");
  cep.props.onChange("12000-001");
  await new Promise(setImmediate);
  const patch = await salvar(s);
  assert.equal(patch.numeroResidencia, "S/N");
  assert.equal(patch.endereco, "Rua do CEP");
  assert.equal(patch.bairro, "Centro");
});

test("cadastro legado mantém endereço e não infere número da residência", async () => {
  const s = sessao({ numeroResidencia: undefined, endereco: "Rua Legada, 987" });
  assert.equal(campo(s.renderizar(), "Número da residência").props.value, "");
  const patch = await salvar(s);
  assert.equal(patch.endereco, "Rua Legada, 987");
  assert.equal(patch.numeroResidencia, "");
});
