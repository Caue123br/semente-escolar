import assert from "node:assert/strict";
import { test } from "node:test";

const modulo = await import("./periodos-matricula.ts").catch((error) => {
  if (error.code === "ERR_MODULE_NOT_FOUND") return {};
  throw error;
});

const esperados = [
  ["parcial_manha", "Parcial Manhã", "Saída até 12:00", "parcial"],
  ["parcial_tarde", "Parcial Tarde", "13:00 às 17:00", "parcial"],
  ["semi_manha", "Semi Manhã", "Saída até 13:30", "semi"],
  ["semi_tarde", "Semi Tarde", "13:00 às 18:30", "semi"],
  ["intermediario_manha", "Intermediário Manhã", "08:00 às 15:00", "intermediario"],
  ["intermediario_tarde", "Intermediário Tarde", "11:00 às 18:30", "intermediario"],
  ["integral", "Integral", "07:00 às 18:30", "integral"],
];

test("os sete períodos preservam nome, horário e categoria usados na ficha e contrato", () => {
  assert.equal(modulo.PERIODOS_MATRICULA?.length, 7);
  for (const [valor, nome, horario, contrato] of esperados) {
    assert.deepEqual(modulo.obterPeriodoMatricula(valor), { valor, nome, horario, contrato });
    assert.equal(modulo.formatarPeriodoMatricula(valor), `${nome} — ${horario}`);
  }
});

test("período legado ausente, nulo ou desconhecido não inventa horário", () => {
  assert.equal(typeof modulo.obterPeriodoMatricula, "function");
  for (const valor of [undefined, null, "", "manha", "Integral", 1, {}, []]) {
    assert.equal(modulo.obterPeriodoMatricula(valor), undefined);
    assert.equal(modulo.formatarPeriodoMatricula(valor), "");
  }
});

test("pessoas autorizadas legadas continuam válidas sem telefone", () => {
  assert.equal(typeof modulo.normalizarPessoasAutorizadas, "function");
  assert.deepEqual(modulo.normalizarPessoasAutorizadas([
    { nome: " Avó Exemplo ", parentesco: " Avó " },
    { nome: "Tia Exemplo", parentesco: "Tia", telefone: "" },
  ]), {
    ok: true,
    lista: [
      { nome: "Avó Exemplo", parentesco: "Avó" },
      { nome: "Tia Exemplo", parentesco: "Tia" },
    ],
  });
});

test("telefone de pessoa autorizada aceita DDD com dez ou onze dígitos e normaliza máscara", () => {
  assert.equal(typeof modulo.normalizarPessoasAutorizadas, "function");
  assert.deepEqual(modulo.normalizarPessoasAutorizadas([
    { nome: "Pessoa Um", parentesco: "Tia", telefone: "(12) 3456-7890" },
    { nome: "Pessoa Dois", parentesco: "Tio", telefone: "(12) 99999-9999" },
  ]), {
    ok: true,
    lista: [
      { nome: "Pessoa Um", parentesco: "Tia", telefone: "1234567890" },
      { nome: "Pessoa Dois", parentesco: "Tio", telefone: "12999999999" },
    ],
  });
});

test("telefone preenchido sem DDD, excessivo ou de tipo inesperado é recusado", () => {
  assert.equal(typeof modulo.normalizarPessoasAutorizadas, "function");
  for (const telefone of ["99999-9999", "(12) 345", "5512999999999", "123456789012", "telefone", 12999999999]) {
    assert.equal(modulo.normalizarPessoasAutorizadas([
      { nome: "Pessoa Exemplo", parentesco: "Tia", telefone },
    ]).ok, false);
  }
});

test("lista de pessoas autorizadas inválida é recusada antes da gravação", () => {
  assert.equal(typeof modulo.normalizarPessoasAutorizadas, "function");
  for (const valor of [null, {}, [null], ["Pessoa"], [1]]) {
    assert.equal(modulo.normalizarPessoasAutorizadas(valor).ok, false);
  }
});
