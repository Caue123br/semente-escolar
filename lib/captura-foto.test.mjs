import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function carregar() {
  const source = readFileSync(new URL("./captura-foto.ts", import.meta.url), "utf8");
  const codigo = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, { exports, require() { throw new Error("sem dependências"); } });
  return exports;
}

test("recorteQuadrado centraliza o quadrado no vídeo paisagem e retrato", () => {
  const { recorteQuadrado } = carregar();
  assert.deepEqual(JSON.parse(JSON.stringify(recorteQuadrado(1280, 720))), { sx: 280, sy: 0, lado: 720 });
  assert.deepEqual(JSON.parse(JSON.stringify(recorteQuadrado(720, 1280))), { sx: 0, sy: 280, lado: 720 });
  assert.deepEqual(JSON.parse(JSON.stringify(recorteQuadrado(640, 640))), { sx: 0, sy: 0, lado: 640 });
});

test("capturarQuadrado desenha o recorte certo e resolve com o blob JPEG", async () => {
  const { capturarQuadrado } = carregar();
  const desenhos = [];
  const blobFalso = { tamanho: 42 };
  let args = null;
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ drawImage: (...parametros) => desenhos.push(parametros) }),
    toBlob: (callback, tipo, qualidade) => { args = { tipo, qualidade }; callback(blobFalso); },
  };
  const video = { videoWidth: 1280, videoHeight: 720 };
  const blob = await capturarQuadrado(video, canvas, 512);
  assert.equal(blob, blobFalso);
  assert.equal(canvas.width, 512);
  assert.equal(canvas.height, 512);
  assert.equal(desenhos.length, 1);
  const [, sx, sy, sw, sh, dx, dy, dw, dh] = desenhos[0];
  assert.deepEqual([sx, sy, sw, sh, dx, dy, dw, dh], [280, 0, 720, 720, 0, 0, 512, 512]);
  assert.equal(args.tipo, "image/jpeg");
  assert.equal(args.qualidade, 0.9);
});

test("capturarQuadrado rejeita quando o canvas não gera imagem ou não tem contexto", async () => {
  const { capturarQuadrado } = carregar();
  const video = { videoWidth: 640, videoHeight: 480 };
  await assert.rejects(() => capturarQuadrado(video, {
    width: 0, height: 0, getContext: () => null, toBlob() {},
  }, 512));
  await assert.rejects(() => capturarQuadrado(video, {
    width: 0, height: 0,
    getContext: () => ({ drawImage() {} }),
    toBlob: (callback) => callback(null),
  }, 512));
});
