import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function carregar() {
  const codigo = ts.transpileModule(readFileSync(new URL("./documentos-aluno.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, { exports, require() { throw new Error("sem dependências"); } });
  return exports;
}

test("categorias fixas cobrem os documentos da secretaria e terminam em Outro", () => {
  const { CATEGORIAS_DOCUMENTO } = carregar();
  assert.equal(CATEGORIAS_DOCUMENTO.length, 8);
  assert.ok(CATEGORIAS_DOCUMENTO.includes("Certidão de nascimento"));
  assert.ok(CATEGORIAS_DOCUMENTO.includes("Carteira de vacinação"));
  assert.equal(CATEGORIAS_DOCUMENTO.at(-1), "Outro");
});

test("formatarTamanho produz B/KB/MB legíveis e aguenta lixo", () => {
  const { formatarTamanho } = carregar();
  assert.equal(formatarTamanho(512), "512 B");
  assert.equal(formatarTamanho(2048), "2 KB");
  assert.equal(formatarTamanho(3 * 1024 * 1024), "3.0 MB");
  assert.equal(formatarTamanho(-1), "—");
  assert.equal(formatarTamanho(Number.NaN), "—");
});

test("linhaParaDocumentoAluno mapeia a linha do banco, Date vira ISO e descrição vazia vira null", () => {
  const { linhaParaDocumentoAluno } = carregar();
  const item = linhaParaDocumentoAluno({
    id: "d1", aluno_id: "a1", categoria: "RG", descricao: "  ",
    arquivo_url: "/api/uploads/default/alunos/a1/documentos/d1.pdf",
    mime: "application/pdf", tamanho_bytes: "123", enviado_por_nome: "Gestora",
    criado_em: new Date("2026-11-10T12:00:00Z"),
  });
  assert.equal(item.descricao, null);
  assert.equal(item.tamanhoBytes, 123);
  assert.equal(item.criadoEm, "2026-11-10T12:00:00.000Z");
  assert.equal(item.arquivoUrl, "/api/uploads/default/alunos/a1/documentos/d1.pdf");
  const comDescricao = linhaParaDocumentoAluno({ descricao: "via 2026", criado_em: "2026-11-10" });
  assert.equal(comDescricao.descricao, "via 2026");
  assert.equal(comDescricao.criadoEm, "2026-11-10");
});
