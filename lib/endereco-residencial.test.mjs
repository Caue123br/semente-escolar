import assert from "node:assert/strict";
import { test } from "node:test";

const modulo = await import("./endereco-residencial.ts").catch((error) => {
  if (error.code === "ERR_MODULE_NOT_FOUND") return {};
  throw error;
});

test("endereço inclui número residencial textual sem perder letras ou S/N", () => {
  assert.equal(typeof modulo.formatarEnderecoResidencial, "function");
  for (const numeroResidencia of ["123", "123A", "S/N"]) {
    assert.equal(modulo.formatarEnderecoResidencial({ endereco: "Rua das Flores", numeroResidencia }), `Rua das Flores, nº ${numeroResidencia}`);
  }
});

test("endereço legado sem número separado continua igual", () => {
  assert.equal(typeof modulo.formatarEnderecoResidencial, "function");
  for (const numeroResidencia of [undefined, null, "", "  "]) {
    assert.equal(modulo.formatarEnderecoResidencial({ endereco: "Rua Antiga, 456", numeroResidencia }), "Rua Antiga, 456");
  }
});

test("endereço residencial remove espaços externos e não imprime separadores vazios", () => {
  assert.equal(typeof modulo.formatarEnderecoResidencial, "function");
  assert.equal(modulo.formatarEnderecoResidencial({ endereco: "  Avenida Exemplo  ", numeroResidencia: "  25 B  " }), "Avenida Exemplo, nº 25 B");
  assert.equal(modulo.formatarEnderecoResidencial({ numeroResidencia: "S/N" }), "nº S/N");
  assert.equal(modulo.formatarEnderecoResidencial({}), "");
});
