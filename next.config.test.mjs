import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function carregarConfig() {
  const codigo = ts.transpileModule(readFileSync(new URL("./next.config.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, { exports, require() { throw new Error("config não deve importar runtime"); } });
  return exports.default;
}

test("Permissions-Policy libera a câmera só para o próprio site e mantém o resto fechado", async () => {
  const config = carregarConfig();
  const [{ headers }] = await config.headers();
  const politica = headers.find((item) => item.key === "Permissions-Policy");
  assert.ok(politica, "Permissions-Policy presente");
  assert.ok(politica.value.includes("camera=(self)"), "webcam liberada para o app (captura de foto do aluno)");
  assert.ok(politica.value.includes("microphone=()"));
  assert.ok(politica.value.includes("geolocation=()"));
});

test("CSP continua permitindo blob: em img-src (prévia da foto capturada)", async () => {
  const config = carregarConfig();
  const [{ headers }] = await config.headers();
  const csp = headers.find((item) => item.key === "Content-Security-Policy");
  assert.ok(csp.value.includes("img-src 'self' data: blob:"));
});
