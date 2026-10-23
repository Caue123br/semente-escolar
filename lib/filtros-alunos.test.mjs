import assert from "node:assert/strict";
import { test } from "node:test";

const modulo = await import("./filtros-alunos.ts").catch((error) => {
  if (error.code === "ERR_MODULE_NOT_FOUND") return {};
  throw error;
});

const turmas = [
  { id: "sala-a", nome: "Sala A", professorId: "prof-ana", professorNome: "Ana" },
  { id: "sala-b", nome: "Sala B", professorId: "prof-ana", professorNome: "Ana Atualizada" },
  { id: "sala-c", nome: "Sala C", professorId: "prof-bia", professorNome: "Beatriz" },
  { id: "sala-legado", nome: "Sala Legada", professorId: "", professorNome: " Inês " },
  { id: "sala-legado-2", nome: "Sala Legada 2", professorId: "", professorNome: "INES" },
  { id: "sala-vazia", nome: "Sala sem vínculo", professorId: "", professorNome: "" },
];
const alunos = [
  { id: "a", nome: "João Alves", turmaId: "sala-a", bilingue: true, fichaSaude: { alergias: "Leite e proteína de AMÊNDOIM" } },
  { id: "b", nome: "Maria", turmaId: "sala-b", bilingue: false, fichaSaude: { tratamentoMedicoSim: true } },
  { id: "c", nome: "Luísa", turmaId: "sala-c", bilingue: true, fichaSaude: { alergias: "Lactose" } },
  { id: "d", nome: "José", turmaId: "sala-legado", bilingue: false },
  { id: "e", nome: "Sem vínculo", turmaId: "sala-vazia", bilingue: false },
  { id: "f", nome: "Turma ausente", turmaId: "outra-escola", bilingue: false },
];

test("filtra a professora pelo vínculo da turma em todas as salas dela", () => {
  assert.equal(typeof modulo.filtrarAlunos, "function");
  assert.deepEqual(modulo.filtrarAlunos(alunos, turmas, { professoraFiltro: "id:prof-ana" }).map((a) => a.id), ["a", "b"]);
  assert.deepEqual(modulo.filtrarAlunos(alunos, turmas, { professoraFiltro: "nome:ines" }).map((a) => a.id), ["d"]);
});

test("a busca de alergia ignora caixa e acentos sem confundir tratamento com alergia", () => {
  assert.equal(typeof modulo.filtrarAlunos, "function");
  assert.deepEqual(modulo.filtrarAlunos(alunos, turmas, { buscaAlergia: "amendoim" }).map((a) => a.id), ["a"]);
  assert.deepEqual(modulo.filtrarAlunos(alunos, turmas, { buscaAlergia: " LÁCTOSE " }).map((a) => a.id), ["c"]);
  const saude = alunos.filter(modulo.temAlertaSaude);
  assert.deepEqual(modulo.filtrarAlunos(saude, turmas, { buscaAlergia: "" }).map((a) => a.id), ["a", "b", "c"]);
  assert.deepEqual(modulo.filtrarAlunos(saude, turmas, { buscaAlergia: "leite" }).map((a) => a.id), ["a"]);
});

test("combina sala, professora, nome sem acento e bilingüismo antes da paginação", () => {
  assert.equal(typeof modulo.filtrarAlunos, "function");
  assert.deepEqual(modulo.filtrarAlunos(alunos, turmas, {
    turmaFiltro: "sala-a", professoraFiltro: "id:prof-ana", busca: "joao", bilinguismo: "sim", comAlergia: true,
  }).map((a) => a.id), ["a"]);
  assert.deepEqual(modulo.filtrarAlunos(alunos, turmas, {
    turmaFiltro: "sala-a", professoraFiltro: "id:prof-bia",
  }), []);
});

test("filtros legados sem professora preservam o conjunto anterior e não misturam turmas ausentes", () => {
  assert.equal(typeof modulo.filtrarAlunos, "function");
  assert.equal(modulo.filtrarAlunos(alunos, turmas).length, alunos.length);
  assert.deepEqual(modulo.filtrarAlunos(alunos, turmas, {
    turmaFiltro: "todas", bilinguismo: "nao", comAlergia: false,
  }).map((a) => a.id), ["b", "d", "e", "f"]);
  assert.equal(modulo.filtrarAlunos(alunos, turmas, { professoraFiltro: "id:outra-escola" }).length, 0);
});

test("opções de professora agrupam pelo id e usam nome normalizado apenas no legado", () => {
  assert.equal(typeof modulo.listarProfessorasTurmas, "function");
  const opcoes = modulo.listarProfessorasTurmas(turmas);
  assert.equal(opcoes.filter((opcao) => opcao.valor === "id:prof-ana").length, 1);
  assert.equal(opcoes.filter((opcao) => opcao.valor === "nome:ines").length, 1);
  assert.equal(opcoes.filter((opcao) => opcao.valor === "sem-professora").length, 1);
  assert.equal(opcoes.length, 4);
  const homonimas = modulo.listarProfessorasTurmas([
    { id: "a", professorId: "p1", professorNome: "Ana" },
    { id: "b", professorId: "p2", professorNome: "Ana" },
  ]);
  assert.equal(homonimas.length, 2);
});
