# Documentos arquivados por aluno — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A aba Documentos da ficha do aluno vira arquivo digital real: enviar (PDF/JPG/PNG/WEBP até 10 MB, validados por magic bytes), listar, abrir e excluir — com auditoria e remoção física no delete.

**Architecture:** Migration aditiva cria `app.alunos_documentos`. Upload novo (`POST /api/upload/documento-aluno`) espelha o endurecimento do upload de foto; listagem/exclusão em `/api/alunos/[id]/documentos[/docId]`; a rota de servir arquivos ganha PDFs e o subcaminho `documentos/`. Um componente (`DocumentosAluno`) substitui o placeholder da aba. Constantes/mapper compartilhados em `lib/documentos-aluno.ts`.

**Tech Stack:** Next.js 16 App Router, query builder próprio sobre `pg` (injeta `escola_id` e soft-delete automaticamente), testes `node:test` + transpile (`pnpm test`), migrations SQL via `pnpm db:migrate` (registro em `public.schema_migrations`).

**Spec:** `docs/superpowers/specs/2026-11-10-documentos-aluno-design.md`

Fatos conferidos: aba placeholder em `app/(dashboard)/alunos/[alunoId]/page.tsx:298-314` (`FileText` segue em uso nas linhas 128/231 — manter import); serving em `app/api/uploads/[...arquivo]/route.ts` exige exatamente 4 segmentos hoje; grant pattern da 0006 (`DO $$ ... GRANT ... TO semente_app`); FK composta p/ `iam.usuarios` com `ON DELETE SET NULL (coluna)` como na 0005; builder injeta `escola_id` em INSERT (POST /api/turmas não o envia); proxy: não-GET sob `/api/alunos` já exige `podeGerenciarAlunos`; GET é liberado a `podeLerCadastroDeAlunos` (inclui financeiro → bloquear no handler); `.env.local` existe (migration local roda).

---

## File map

| Arquivo | Ação |
|---|---|
| `db/migrations/0011_documentos_aluno.sql` | Create — tabela + índice + grant |
| `lib/documentos-aluno.ts` | Create — categorias, limites, formatarTamanho, mapper |
| `lib/documentos-aluno.test.mjs` | Create |
| `app/api/upload/documento-aluno/route.ts` | Create — upload multipart |
| `app/api/upload/documento-aluno.test.mjs` | Create |
| `app/api/alunos/[id]/documentos/route.ts` | Create — GET lista |
| `app/api/alunos/[id]/documentos/[docId]/route.ts` | Create — DELETE |
| `app/api/alunos/documentos-aluno-api.test.mjs` | Create — GET+DELETE |
| `app/api/uploads/[...arquivo]/route.ts` | Modify — PDF + 5 segmentos + content-disposition |
| `app/api/uploads/servir-documentos.test.mjs` | Create |
| `proxy.ts` | Modify — gate + módulo da rota de upload nova |
| `components/alunos/documentos-aluno.tsx` | Create — a aba |
| `components/alunos/documentos-aluno.test.mjs` | Create |
| `app/(dashboard)/alunos/[alunoId]/page.tsx` | Modify — usa o componente |

---

### Task 1: Migration + helpers compartilhados

**Files:** Create `db/migrations/0011_documentos_aluno.sql`, `lib/documentos-aluno.ts`; Test `lib/documentos-aluno.test.mjs`.

- [ ] **Step 1.1: Teste (falhando)** — criar `lib/documentos-aluno.test.mjs`:

```js
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
```

- [ ] **Step 1.2:** `pnpm test lib/documentos-aluno.test.mjs` → FAIL (ENOENT).

- [ ] **Step 1.3: Implementar `lib/documentos-aluno.ts`:**

```ts
/** Categorias fixas do arquivo de documentos do aluno (validadas na API). */
export const CATEGORIAS_DOCUMENTO = [
  "Certidão de nascimento",
  "RG",
  "CPF",
  "Comprovante de residência",
  "Carteira de vacinação",
  "Laudo/relatório médico",
  "Contrato",
  "Outro",
] as const;

export type CategoriaDocumento = (typeof CATEGORIAS_DOCUMENTO)[number];

export const TAMANHO_MAXIMO_DOCUMENTO = 10 * 1024 * 1024;

export interface DocumentoAluno {
  id: string;
  alunoId: string;
  categoria: string;
  descricao: string | null;
  arquivoUrl: string;
  mime: string;
  tamanhoBytes: number;
  enviadoPorNome: string;
  criadoEm: string;
}

export function formatarTamanho(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const texto = (valor: unknown): string => (typeof valor === "string" ? valor : String(valor ?? ""));

export function linhaParaDocumentoAluno(linha: Record<string, unknown>): DocumentoAluno {
  const descricao = typeof linha.descricao === "string" ? linha.descricao.trim() : "";
  return {
    id: texto(linha.id),
    alunoId: texto(linha.aluno_id),
    categoria: texto(linha.categoria),
    descricao: descricao || null,
    arquivoUrl: texto(linha.arquivo_url),
    mime: texto(linha.mime),
    tamanhoBytes: Number(linha.tamanho_bytes ?? 0) || 0,
    enviadoPorNome: texto(linha.enviado_por_nome),
    criadoEm: linha.criado_em instanceof Date ? linha.criado_em.toISOString() : texto(linha.criado_em),
  };
}
```

- [ ] **Step 1.4: Criar `db/migrations/0011_documentos_aluno.sql`:**

```sql
-- 0011_documentos_aluno.sql
-- Arquivo digital de documentos por aluno (certidão, RG, laudos, contratos).
-- Aditiva e segura: cria apenas a tabela nova; nada existente muda.

CREATE TABLE IF NOT EXISTS app.alunos_documentos (
  escola_id        TEXT NOT NULL,
  id               TEXT NOT NULL,
  aluno_id         TEXT NOT NULL,
  categoria        TEXT NOT NULL,
  descricao        TEXT,
  arquivo_url      TEXT NOT NULL,
  mime             TEXT NOT NULL,
  tamanho_bytes    INTEGER NOT NULL,
  enviado_por      TEXT,
  enviado_por_nome TEXT NOT NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (escola_id, id),
  CONSTRAINT alunos_documentos_escola_fk
    FOREIGN KEY (escola_id) REFERENCES app.escolas (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  -- RESTRICT de propósito: aluno com documentos arquivados não pode sumir do
  -- banco sem decisão explícita (a exclusão de aluno no app é reversível).
  CONSTRAINT alunos_documentos_aluno_fk
    FOREIGN KEY (escola_id, aluno_id) REFERENCES app.alunos (escola_id, id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT alunos_documentos_enviado_por_fk
    FOREIGN KEY (escola_id, enviado_por) REFERENCES iam.usuarios (escola_id, id)
    ON UPDATE CASCADE ON DELETE SET NULL (enviado_por),
  CONSTRAINT alunos_documentos_id_nao_vazio CHECK (btrim(id) <> ''),
  CONSTRAINT alunos_documentos_categoria_nao_vazia CHECK (btrim(categoria) <> ''),
  CONSTRAINT alunos_documentos_mime_valido CHECK (
    mime IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
  ),
  CONSTRAINT alunos_documentos_tamanho_valido CHECK (tamanho_bytes > 0)
);

CREATE INDEX IF NOT EXISTS alunos_documentos_aluno_idx
  ON app.alunos_documentos (escola_id, aluno_id, criado_em DESC);

-- Grants (default privileges do owner já cobrem; explícito por segurança).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'semente_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.alunos_documentos TO semente_app;
  END IF;
END
$$;
```

- [ ] **Step 1.5:** `pnpm test lib/documentos-aluno.test.mjs` → PASS (3). Depois `pnpm db:migrate` → aplica 0011 no banco local sem erro (se o Postgres local não estiver de pé, anotar e validar a migration no deploy).

- [ ] **Step 1.6: Commit** — `git add db/migrations/0011_documentos_aluno.sql lib/documentos-aluno.ts lib/documentos-aluno.test.mjs && git commit -m "feat(documentos): tabela alunos_documentos e helpers compartilhados"`

---

### Task 2: Upload `POST /api/upload/documento-aluno` + gates no proxy

**Files:** Create `app/api/upload/documento-aluno/route.ts`; Modify `proxy.ts`; Test `app/api/upload/documento-aluno.test.mjs`.

- [ ] **Step 2.1: Teste (falhando)** — criar `app/api/upload/documento-aluno.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = new URL("../../../", import.meta.url);

function carregar(caminho, dependencias = {}) {
  const codigo = ts.transpileModule(readFileSync(new URL(caminho, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports, Request, Response, URL, process, console, Buffer, File, FormData,
    require(id) {
      if (Object.hasOwn(dependencias, id)) return dependencias[id];
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports;
}

const next = { NextResponse: { json: (corpo, opcoes) => new Response(JSON.stringify(corpo), opcoes) } };
const docs = carregar("lib/documentos-aluno.ts");

function ambiente({ perfil = "diretor", escopoTurmas = null, alunos = [{ id: "a1", turma_id: "t1" }], falharInsert = false } = {}) {
  const tabelas = { alunos: structuredClone(alunos), alunos_documentos: [] };
  const fs = { mkdir: [], writeFile: [], unlink: [] };
  const audits = [];
  const db = {
    from(tabela) {
      const filtros = [];
      let operacao = "select", payload, unico = false;
      const consulta = {
        select() { return consulta; },
        eq(campo, valor) { filtros.push((l) => l[campo] === valor); return consulta; },
        insert(valor) { operacao = "insert"; payload = structuredClone(valor); return consulta; },
        single() { unico = true; return consulta; },
        maybeSingle() { unico = true; return consulta; },
        then(resolve, reject) {
          if (operacao === "insert") {
            if (falharInsert) return Promise.resolve({ data: null, error: { message: "insert falhou" } }).then(resolve, reject);
            const linha = { ...payload, criado_em: "2026-11-10" };
            tabelas[tabela].push(linha);
            return Promise.resolve({ data: structuredClone(linha), error: null }).then(resolve, reject);
          }
          const rows = tabelas[tabela].filter((l) => filtros.every((f) => f(l)));
          return Promise.resolve({ data: structuredClone(unico ? rows[0] ?? null : rows), error: null }).then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  const rota = carregar("app/api/upload/documento-aluno/route.ts", {
    "next/server": next,
    "node:crypto": require("node:crypto"),
    "node:path": require("node:path"),
    "node:fs/promises": {
      mkdir: async (dir) => { fs.mkdir.push(dir); },
      writeFile: async (dest) => { fs.writeFile.push(dest); },
      unlink: async (dest) => { fs.unlink.push(dest); },
    },
    "@/lib/access-control": { podeGerenciarAlunos: (p) => ["diretor", "coordenador"].includes(p) },
    "@/lib/db/postgres": { getDatabase: () => db },
    "@/lib/db/auth": { getUsuarioLogado: async () => ({ id: "gestora", nome: "Gestora", perfil }) },
    "@/lib/db/audit": { registrarAudit: async (...args) => { audits.push(args); } },
    "@/lib/db/professor-scope": {
      resolverEscopoProfessor: async () => (escopoTurmas ? { restrito: true, turmaIds: escopoTurmas } : { restrito: false, turmaIds: null }),
      professorPodeAcessarAluno: async (escopo, alunoId) => !escopo.restrito ||
        tabelas.alunos.some((a) => a.id === alunoId && escopo.turmaIds.includes(a.turma_id)),
    },
    "@/lib/documentos-aluno": docs,
  });
  return { tabelas, fs, audits, POST: rota.POST };
}

const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("conteudo de teste")]);

function requisicao({ alunoId = "a1", categoria = "RG", descricao, conteudo = PDF, mime = "application/pdf", nome = "rg.pdf" } = {}) {
  const fd = new FormData();
  fd.set("alunoId", alunoId);
  fd.set("categoria", categoria);
  if (descricao !== undefined) fd.set("descricao", descricao);
  fd.set("file", new File([conteudo], nome, { type: mime }));
  return new Request("https://exemplo.invalid/api/upload/documento-aluno", { method: "POST", body: fd });
}

test("PDF válido é arquivado: grava em documentos/, insere a linha e audita", async () => {
  const env = ambiente();
  const resposta = await env.POST(requisicao({ descricao: "via 2026" }));
  assert.equal(resposta.status, 201);
  const { item } = await resposta.json();
  assert.match(item.arquivoUrl, /^\/api\/uploads\/default\/alunos\/a1\/documentos\/[0-9a-f-]+\.pdf$/);
  assert.equal(item.categoria, "RG");
  assert.equal(item.descricao, "via 2026");
  assert.equal(item.mime, "application/pdf");
  assert.equal(env.fs.writeFile.length, 1);
  assert.ok(env.fs.writeFile[0].includes("documentos"));
  assert.equal(env.tabelas.alunos_documentos.length, 1);
  assert.equal(env.tabelas.alunos_documentos[0].enviado_por_nome, "Gestora");
  assert.equal(env.audits.length, 1);
});

test("extensão mentirosa é recusada pelo conteúdo, sem gravar nada", async () => {
  const env = ambiente();
  const resposta = await env.POST(requisicao({ conteudo: Buffer.from("isto nao e um pdf"), mime: "application/pdf" }));
  assert.equal(resposta.status, 400);
  assert.equal(env.fs.writeFile.length, 0);
  assert.equal(env.tabelas.alunos_documentos.length, 0);
});

test("maior que 10 MB e categoria fora da lista são recusados", async () => {
  const env = ambiente();
  const grande = Buffer.alloc(10 * 1024 * 1024 + 1, 0x25);
  assert.equal((await env.POST(requisicao({ conteudo: grande }))).status, 400);
  assert.equal((await env.POST(requisicao({ categoria: "Qualquer coisa" }))).status, 400);
  assert.equal(env.fs.writeFile.length, 0);
});

test("professor não arquiva documento (escrita é da gestão)", async () => {
  const env = ambiente({ perfil: "professor", escopoTurmas: ["t1"] });
  assert.equal((await env.POST(requisicao())).status, 403);
});

test("INSERT falhou: o arquivo recém-gravado é removido (compensação)", async () => {
  const env = ambiente({ falharInsert: true });
  const resposta = await env.POST(requisicao());
  assert.equal(resposta.status, 500);
  assert.equal(env.fs.unlink.length, 1);
  assert.equal(env.fs.unlink[0], env.fs.writeFile[0]);
});

test("aluno inexistente devolve 404", async () => {
  const env = ambiente({ alunos: [] });
  assert.equal((await env.POST(requisicao())).status, 404);
});
```

- [ ] **Step 2.2:** `pnpm test app/api/upload/documento-aluno.test.mjs` → FAIL (ENOENT).

- [ ] **Step 2.3: Implementar `app/api/upload/documento-aluno/route.ts`:**

```ts
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { podeGerenciarAlunos } from "@/lib/access-control";
import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { professorPodeAcessarAluno, resolverEscopoProfessor } from "@/lib/db/professor-scope";
import {
  CATEGORIAS_DOCUMENTO,
  TAMANHO_MAXIMO_DOCUMENTO,
  linhaParaDocumentoAluno,
} from "@/lib/documentos-aluno";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALUNO_ID = /^[a-zA-Z0-9_-]{1,100}$/;
const DESCRICAO_MAXIMA = 300;

// Mesmo princípio do upload de foto: o conteúdo manda, a extensão mente.
const FORMATOS = [
  {
    mime: "application/pdf",
    extension: "pdf",
    matches: (buffer: Buffer) => buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-",
  },
  {
    mime: "image/jpeg",
    extension: "jpg",
    matches: (buffer: Buffer) =>
      buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mime: "image/png",
    extension: "png",
    matches: (buffer: Buffer) =>
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: "image/webp",
    extension: "webp",
    matches: (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP",
  },
] as const;

function uploadsRoot(): string {
  const configured = process.env.UPLOADS_DIR;
  if (configured) {
    if (!path.isAbsolute(configured)) {
      throw new Error("UPLOADS_DIR deve ser um caminho absoluto");
    }
    return path.normalize(configured);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("UPLOADS_DIR não configurado em produção");
  }
  return path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "uploads");
}

export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!podeGerenciarAlunos(usuario.perfil)) {
    return NextResponse.json({ error: "Sem permissão para arquivar documentos." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Envie como multipart/form-data" }, { status: 400 });
  }

  const alunoId = form.get("alunoId");
  const categoria = form.get("categoria");
  const descricaoBruta = form.get("descricao");
  const file = form.get("file");

  if (typeof alunoId !== "string" || !ALUNO_ID.test(alunoId)) {
    return NextResponse.json({ error: "alunoId inválido" }, { status: 400 });
  }
  if (typeof categoria !== "string" || !(CATEGORIAS_DOCUMENTO as readonly string[]).includes(categoria)) {
    return NextResponse.json({ error: "Escolha a categoria do documento." }, { status: 400 });
  }
  const descricao = typeof descricaoBruta === "string" ? descricaoBruta.trim() : "";
  if (descricao.length > DESCRICAO_MAXIMA) {
    return NextResponse.json({ error: `A descrição deve ter até ${DESCRICAO_MAXIMA} caracteres.` }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }
  if (file.size === 0 || file.size > TAMANHO_MAXIMO_DOCUMENTO) {
    return NextResponse.json({ error: "Arquivo vazio ou maior que 10 MB" }, { status: 400 });
  }

  const db = getDatabase();
  const { data: aluno, error: erroAluno } = await db
    .from("alunos").select("id").eq("id", alunoId).maybeSingle();
  if (erroAluno) {
    console.error("[documento-aluno] consulta falhou", erroAluno);
    return NextResponse.json({ error: "Não foi possível validar o aluno" }, { status: 500 });
  }
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!(await professorPodeAcessarAluno(escopo, alunoId))) {
      return NextResponse.json({ error: "Sem permissão para este aluno." }, { status: 403 });
    }
  } catch (error) {
    console.error("[documento-aluno] escopo falhou", error);
    return NextResponse.json({ error: "Não foi possível validar o acesso" }, { status: 500 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const formato = FORMATOS.find((item) => item.mime === file.type && item.matches(buffer));
  if (!formato) {
    return NextResponse.json(
      { error: "O conteúdo do arquivo não é PDF, JPG, PNG ou WEBP válido" },
      { status: 400 }
    );
  }

  const escolaId = process.env.SCHOOL_ID ?? "default";
  const documentoId = randomUUID();
  const fileName = `${documentoId}.${formato.extension}`;
  const relativeParts = [escolaId, "alunos", alunoId, "documentos", fileName];
  const directory = path.join(/* turbopackIgnore: true */ uploadsRoot(), ...relativeParts.slice(0, -1));
  const destination = path.join(/* turbopackIgnore: true */ directory, fileName);
  const url = `/api/uploads/${relativeParts.map(encodeURIComponent).join("/")}`;

  try {
    await mkdir(/* turbopackIgnore: true */ directory, { recursive: true, mode: 0o700 });
    await writeFile(/* turbopackIgnore: true */ destination, buffer, { flag: "wx", mode: 0o600 });
  } catch (error) {
    console.error("[documento-aluno] gravação falhou", error);
    return NextResponse.json({ error: "Não foi possível armazenar o documento" }, { status: 500 });
  }

  const { data: linha, error: erroInsert } = await db
    .from("alunos_documentos")
    .insert({
      id: documentoId,
      aluno_id: alunoId,
      categoria,
      descricao: descricao || null,
      arquivo_url: url,
      mime: formato.mime,
      tamanho_bytes: buffer.length,
      enviado_por: usuario.id,
      enviado_por_nome: usuario.nome,
    })
    .select("*")
    .single();
  if (erroInsert || !linha) {
    try {
      await unlink(/* turbopackIgnore: true */ destination);
    } catch (cleanupError) {
      console.error("[documento-aluno] limpeza compensatória falhou", cleanupError);
    }
    return NextResponse.json({ error: "Não foi possível registrar o documento" }, { status: 500 });
  }

  await registrarAudit(
    "criar",
    "alunos_documentos",
    documentoId,
    { alunoId, categoria, tamanhoBytes: buffer.length },
    usuario
  );
  return NextResponse.json({ ok: true, item: linhaParaDocumentoAluno(linha) }, { status: 201 });
}
```

- [ ] **Step 2.4: Gates no `proxy.ts`** — duas edições:

Em `MODULOS_API` (junto da linha `["/api/upload/foto-aluno", "alunos"],`):
```ts
  ["/api/upload/documento-aluno", "alunos"],
```

Na lista de não-GET que exige `podeGerenciarAlunos` (hoje: `"/api/alunos", "/api/turmas", "/api/upload/foto-aluno", "/api/bercario-bebes"`):
```ts
      "/api/upload/foto-aluno",
      "/api/upload/documento-aluno",
```

- [ ] **Step 2.5:** `pnpm typecheck && pnpm test app/api/upload/documento-aluno.test.mjs` → PASS (6).

- [ ] **Step 2.6: Commit** — `git add app/api/upload/documento-aluno/route.ts app/api/upload/documento-aluno.test.mjs proxy.ts && git commit -m "feat(documentos): upload de documento do aluno com validação real de conteúdo"`

---

### Task 3: GET lista + DELETE

**Files:** Create `app/api/alunos/[id]/documentos/route.ts`, `app/api/alunos/[id]/documentos/[docId]/route.ts`; Test `app/api/alunos/documentos-aluno-api.test.mjs`.

- [ ] **Step 3.1: Teste (falhando)** — criar `app/api/alunos/documentos-aluno-api.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = new URL("../../../", import.meta.url);

function carregar(caminho, dependencias = {}) {
  const codigo = ts.transpileModule(readFileSync(new URL(caminho, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommONJS ?? ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports, Request, Response, URL, process, console,
    require(id) {
      if (Object.hasOwn(dependencias, id)) return dependencias[id];
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports;
}

const next = { NextResponse: { json: (corpo, opcoes) => new Response(JSON.stringify(corpo), opcoes) } };
const docs = carregar("lib/documentos-aluno.ts");

function ambiente({ perfil = "diretor", escopoTurmas = null } = {}) {
  const tabelas = {
    alunos: [{ id: "a1", turma_id: "t1" }],
    alunos_documentos: [
      { id: "d1", aluno_id: "a1", categoria: "RG", descricao: null, arquivo_url: "/api/uploads/default/alunos/a1/documentos/d1.pdf", mime: "application/pdf", tamanho_bytes: 100, enviado_por_nome: "Gestora", criado_em: "2026-11-01" },
      { id: "d2", aluno_id: "a1", categoria: "CPF", descricao: null, arquivo_url: "/api/uploads/default/alunos/a1/documentos/d2.png", mime: "image/png", tamanho_bytes: 200, enviado_por_nome: "Gestora", criado_em: "2026-11-09" },
    ],
  };
  const fs = { unlink: [] };
  const audits = [];
  const db = {
    from(tabela) {
      const filtros = [];
      let operacao = "select", unico = false, ordem = null;
      const consulta = {
        select() { return consulta; },
        eq(campo, valor) { filtros.push((l) => l[campo] === valor); return consulta; },
        order(campo, opcoes) { ordem = { campo, asc: opcoes?.ascending !== false }; return consulta; },
        delete() { operacao = "delete"; return consulta; },
        maybeSingle() { unico = true; return consulta; },
        then(resolve, reject) {
          let rows = tabelas[tabela].filter((l) => filtros.every((f) => f(l)));
          if (operacao === "delete") {
            tabelas[tabela] = tabelas[tabela].filter((l) => !rows.includes(l));
            return Promise.resolve({ data: null, error: null }).then(resolve, reject);
          }
          if (ordem) rows = [...rows].sort((a, b) => (a[ordem.campo] < b[ordem.campo] ? 1 : -1) * (ordem.asc ? -1 : 1));
          return Promise.resolve({ data: structuredClone(unico ? rows[0] ?? null : rows), error: null }).then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  const deps = {
    "next/server": next,
    "node:path": require("node:path"),
    "node:fs/promises": { unlink: async (destino) => { fs.unlink.push(destino); } },
    "@/lib/access-control": { podeGerenciarAlunos: (p) => ["diretor", "coordenador"].includes(p) },
    "@/lib/db/api-response": carregar("lib/db/api-response.ts", { "next/server": next }),
    "@/lib/db/postgres": { getDatabase: () => db },
    "@/lib/db/auth": { getUsuarioLogado: async () => ({ id: "gestora", nome: "Gestora", perfil }) },
    "@/lib/db/audit": { registrarAudit: async (...args) => { audits.push(args); } },
    "@/lib/db/professor-scope": {
      resolverEscopoProfessor: async () => (escopoTurmas ? { restrito: true, turmaIds: escopoTurmas } : { restrito: false, turmaIds: null }),
      professorPodeAcessarAluno: async (escopo, alunoId) => !escopo.restrito ||
        tabelas.alunos.some((a) => a.id === alunoId && escopo.turmaIds.includes(a.turma_id)),
    },
    "@/lib/documentos-aluno": docs,
  };
  return {
    tabelas, fs, audits,
    GET: carregar("app/api/alunos/[id]/documentos/route.ts", deps).GET,
    DELETE: carregar("app/api/alunos/[id]/documentos/[docId]/route.ts", deps).DELETE,
  };
}

const params = (valores) => ({ params: Promise.resolve(valores) });
const req = () => new Request("https://exemplo.invalid/api/alunos/a1/documentos");

test("GET lista do mais novo para o mais velho", async () => {
  const env = ambiente();
  const resposta = await env.GET(req(), params({ id: "a1" }));
  assert.equal(resposta.status, 200);
  const { items } = await resposta.json();
  assert.deepEqual(items.map((i) => i.id), ["d2", "d1"]);
  assert.equal(items[0].arquivoUrl, "/api/uploads/default/alunos/a1/documentos/d2.png");
});

test("financeiro não lista documentos; professor fora do escopo também não", async () => {
  assert.equal((await ambiente({ perfil: "financeiro" }).GET(req(), params({ id: "a1" }))).status, 403);
  assert.equal((await ambiente({ perfil: "professor", escopoTurmas: ["t9"] }).GET(req(), params({ id: "a1" }))).status, 403);
  assert.equal((await ambiente({ perfil: "professor", escopoTurmas: ["t1"] }).GET(req(), params({ id: "a1" }))).status, 200);
});

test("DELETE remove a linha, apaga o arquivo físico e audita", async () => {
  const env = ambiente();
  const resposta = await env.DELETE(req(), params({ id: "a1", docId: "d1" }));
  assert.equal(resposta.status, 200);
  assert.deepEqual(env.tabelas.alunos_documentos.map((d) => d.id), ["d2"]);
  assert.equal(env.fs.unlink.length, 1);
  assert.ok(env.fs.unlink[0].endsWith("d1.pdf"));
  assert.ok(env.fs.unlink[0].includes("documentos"));
  assert.equal(env.audits.length, 1);
  assert.equal(env.audits[0][0], "excluir");
});

test("DELETE de documento inexistente devolve 404 sem apagar nada", async () => {
  const env = ambiente();
  assert.equal((await env.DELETE(req(), params({ id: "a1", docId: "dX" }))).status, 404);
  assert.equal(env.fs.unlink.length, 0);
  assert.equal(env.tabelas.alunos_documentos.length, 2);
});
```

(Atenção ao typo proposital corrigido: em `carregar`, usar `ts.ModuleKind.CommonJS` direto — remover o `CommONJS ??`.)

- [ ] **Step 3.2:** `pnpm test app/api/alunos/documentos-aluno-api.test.mjs` → FAIL (ENOENT).

- [ ] **Step 3.3: Implementar `app/api/alunos/[id]/documentos/route.ts`:**

```ts
import { NextResponse } from "next/server";

import { podeGerenciarAlunos } from "@/lib/access-control";
import { erros } from "@/lib/db/api-response";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { professorPodeAcessarAluno, resolverEscopoProfessor } from "@/lib/db/professor-scope";
import { linhaParaDocumentoAluno } from "@/lib/documentos-aluno";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  // O proxy libera GET de /api/alunos para o financeiro (cobrança), mas
  // documento pessoal não participa da cobrança: só gestão e professora.
  if (!podeGerenciarAlunos(usuario.perfil) && usuario.perfil !== "professor") {
    return erros.semPermissao("ver os documentos do aluno");
  }
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!(await professorPodeAcessarAluno(escopo, id))) {
      return erros.semPermissao("ver documentos de um aluno fora das suas turmas");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await getDatabase()
    .from("alunos_documentos")
    .select("*")
    .eq("aluno_id", id)
    .order("criado_em", { ascending: false });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(linhaParaDocumentoAluno) });
}
```

- [ ] **Step 3.4: Implementar `app/api/alunos/[id]/documentos/[docId]/route.ts`:**

```ts
import { unlink } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { erros } from "@/lib/db/api-response";
import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { professorPodeAcessarAluno, resolverEscopoProfessor } from "@/lib/db/professor-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEGMENTO = /^[a-zA-Z0-9_.-]{1,120}$/;

function uploadsRoot(): string {
  const configured = process.env.UPLOADS_DIR;
  if (configured) {
    if (!path.isAbsolute(configured)) {
      throw new Error("UPLOADS_DIR deve ser um caminho absoluto");
    }
    return path.normalize(configured);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("UPLOADS_DIR não configurado em produção");
  }
  return path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "uploads");
}

/** Deriva o caminho físico da própria linha gravada — nunca de input do cliente. */
function caminhoDoDocumento(arquivoUrl: string): string | null {
  if (!arquivoUrl.startsWith("/api/uploads/")) return null;
  const partes = arquivoUrl.slice("/api/uploads/".length).split("/").map((parte) => decodeURIComponent(parte));
  if (partes.length !== 5 || partes[1] !== "alunos" || partes[3] !== "documentos") return null;
  if (partes.some((segmento) => !SEGMENTO.test(segmento))) return null;
  const root = uploadsRoot();
  const absoluto = path.join(/* turbopackIgnore: true */ root, ...partes);
  if (!absoluto.startsWith(`${root}${path.sep}`)) return null;
  return absoluto;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!(await professorPodeAcessarAluno(escopo, id))) {
      return erros.semPermissao("excluir documentos de um aluno fora das suas turmas");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }

  const db = getDatabase();
  const { data: documento, error: erroBusca } = await db
    .from("alunos_documentos")
    .select("*")
    .eq("id", docId)
    .eq("aluno_id", id)
    .maybeSingle();
  if (erroBusca) return erros.servidorIndisponivel(erroBusca);
  if (!documento) return erros.naoEncontrado("Documento");

  const { error: erroDelete } = await db.from("alunos_documentos").delete().eq("id", docId);
  if (erroDelete) return erros.servidorIndisponivel(erroDelete);

  // LGPD: o arquivo físico sai junto. Falha aqui não ressuscita o registro —
  // loga e segue (o arquivo pode já ter sido removido por fora).
  const caminho = caminhoDoDocumento(String(documento.arquivo_url ?? ""));
  if (caminho) {
    try {
      await unlink(/* turbopackIgnore: true */ caminho);
    } catch (error) {
      console.error("[documento-aluno] unlink falhou", error);
    }
  }

  await registrarAudit(
    "excluir",
    "alunos_documentos",
    docId,
    { alunoId: id, categoria: documento.categoria, arquivoUrl: documento.arquivo_url },
    usuario
  );
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3.5:** `pnpm typecheck && pnpm test app/api/alunos/documentos-aluno-api.test.mjs` → PASS (4).

- [ ] **Step 3.6: Commit** — `git add "app/api/alunos/[id]/documentos" app/api/alunos/documentos-aluno-api.test.mjs && git commit -m "feat(documentos): listar e excluir documentos do aluno com auditoria"`

---

### Task 4: Servir PDFs e o subcaminho documentos/

**Files:** Modify `app/api/uploads/[...arquivo]/route.ts`; Test `app/api/uploads/servir-documentos.test.mjs`.

- [ ] **Step 4.1: Teste (falhando)** — criar `app/api/uploads/servir-documentos.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = new URL("../../../", import.meta.url);

function carregar(caminho, dependencias = {}) {
  const codigo = ts.transpileModule(readFileSync(new URL(caminho, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports, Request, Response, URL, process, console, Buffer,
    require(id) {
      if (Object.hasOwn(dependencias, id)) return dependencias[id];
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports;
}

class RespostaFalsa {
  constructor(corpo, opcoes = {}) {
    this.corpo = corpo;
    this.status = opcoes.status ?? 200;
    this.headers = new Map(Object.entries(opcoes.headers ?? {}));
  }
}
const next = { NextResponse: RespostaFalsa };

function ambiente({ documentos = [] } = {}) {
  const tabelas = {
    alunos: [{ id: "a1", turma_id: "t1" }],
    alunos_documentos: documentos,
  };
  const db = {
    from(tabela) {
      const filtros = [];
      let unico = false;
      const consulta = {
        select() { return consulta; },
        eq(campo, valor) { filtros.push((l) => l[campo] === valor); return consulta; },
        maybeSingle() { unico = true; return consulta; },
        then(resolve, reject) {
          const rows = tabelas[tabela].filter((l) => filtros.every((f) => f(l)));
          return Promise.resolve({ data: structuredClone(unico ? rows[0] ?? null : rows), error: null }).then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  const rota = carregar("app/api/uploads/[...arquivo]/route.ts", {
    "next/server": next,
    "node:path": require("node:path"),
    "node:fs/promises": { readFile: async () => Buffer.from("conteudo") },
    "@/lib/access-control": { podeAcessarModulo: () => true },
    "@/lib/db/postgres": { getDatabase: () => db },
    "@/lib/db/auth": { getUsuarioLogado: async () => ({ id: "u1", perfil: "diretor" }) },
    "@/lib/db/professor-scope": {
      resolverEscopoProfessor: async () => ({ restrito: false, turmaIds: null }),
      professorPodeAcessarTurma: () => true,
    },
  });
  return rota.GET;
}

const chamada = (GET, segmentos) =>
  GET(new Request("https://exemplo.invalid/api/uploads/x"), { params: Promise.resolve({ arquivo: segmentos }) });

test("foto com 4 segmentos continua servida como antes", async () => {
  const GET = ambiente();
  const resposta = await chamada(GET, ["default", "alunos", "a1", "foto.jpg"]);
  assert.equal(resposta.status, 200);
  assert.equal(resposta.headers.get("content-type"), "image/jpeg");
  assert.equal(resposta.headers.get("content-disposition"), undefined);
});

test("documento PDF com 5 segmentos é servido inline com nome legível da categoria", async () => {
  const GET = ambiente({
    documentos: [{ categoria: "Certidão de nascimento", arquivo_url: "/api/uploads/default/alunos/a1/documentos/d1.pdf" }],
  });
  const resposta = await chamada(GET, ["default", "alunos", "a1", "documentos", "d1.pdf"]);
  assert.equal(resposta.status, 200);
  assert.equal(resposta.headers.get("content-type"), "application/pdf");
  const disposicao = resposta.headers.get("content-disposition");
  assert.ok(disposicao.startsWith("inline;"));
  assert.ok(disposicao.includes("Certidao de nascimento.pdf"));
  assert.ok(disposicao.includes("filename*=UTF-8''"));
});

test("5 segmentos sem a pasta documentos, PDF em caminho de foto e traversal continuam 404", async () => {
  const GET = ambiente();
  assert.equal((await chamada(GET, ["default", "alunos", "a1", "outros", "d1.pdf"])).status, 404);
  assert.equal((await chamada(GET, ["default", "alunos", "a1", "foto.pdf"])).status, 404);
  assert.equal((await chamada(GET, ["default", "alunos", "a1", "documentos", "..%2Fd1.pdf"])).status, 404);
  assert.equal((await chamada(GET, ["default", "alunos", "a1", "documentos", "d1.exe"])).status, 404);
});
```

- [ ] **Step 4.2:** `pnpm test app/api/uploads/servir-documentos.test.mjs` → FAIL (PDF 404, sem content-disposition).

- [ ] **Step 4.3: Editar `app/api/uploads/[...arquivo]/route.ts`:**

(a) `CONTENT_TYPES` — adicionar PDF e separar o que cada caminho aceita:

```ts
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const CONTENT_TYPES_DOCUMENTO: Record<string, string> = {
  ...CONTENT_TYPES,
  ".pdf": "application/pdf",
};
```

(b) Validação de forma — substituir o bloco `if (arquivo.length !== 4 || ...)`:

```ts
  const { arquivo } = await params;
  const escolaId = process.env.SCHOOL_ID ?? "default";
  const ehFoto = arquivo.length === 4;
  const ehDocumento = arquivo.length === 5 && arquivo[3] === "documentos";
  if (
    (!ehFoto && !ehDocumento) ||
    arquivo[0] !== escolaId ||
    arquivo[1] !== "alunos" ||
    arquivo.some((segmento) => !SEGMENTO.test(segmento))
  ) {
    return new NextResponse(null, { status: 404 });
  }
```

(c) Content-type por tipo de caminho — substituir a linha do `contentType`:

```ts
  const contentType = (ehDocumento ? CONTENT_TYPES_DOCUMENTO : CONTENT_TYPES)[
    path.extname(absolutePath).toLowerCase()
  ];
  if (!contentType) return new NextResponse(null, { status: 404 });
```

(d) Nome legível para documentos — logo após o cálculo do `contentType` (antes do `readFile`):

```ts
  // Documento abre inline com o nome da categoria (o uuid no disco é ilegível).
  let contentDisposition: string | null = null;
  if (ehDocumento) {
    const urlRelativa = `/api/uploads/${arquivo.map(encodeURIComponent).join("/")}`;
    const { data: documento } = await getDatabase()
      .from("alunos_documentos")
      .select("categoria")
      .eq("arquivo_url", urlRelativa)
      .maybeSingle();
    const extensao = path.extname(absolutePath).toLowerCase();
    const rotulo =
      typeof documento?.categoria === "string" && documento.categoria.trim()
        ? documento.categoria.trim()
        : "documento";
    const ascii =
      rotulo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9 _.-]/g, "").trim() ||
      "documento";
    contentDisposition = `inline; filename="${ascii}${extensao}"; filename*=UTF-8''${encodeURIComponent(`${rotulo}${extensao}`)}`;
  }
```

(e) Headers da resposta — incluir a disposição quando houver:

```ts
    return new NextResponse(file, {
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=300, no-store",
        "x-content-type-options": "nosniff",
        ...(contentDisposition ? { "content-disposition": contentDisposition } : {}),
      },
    });
```

- [ ] **Step 4.4:** `pnpm typecheck && pnpm test app/api/uploads/servir-documentos.test.mjs` → PASS (3).

- [ ] **Step 4.5: Commit** — `git add "app/api/uploads/[...arquivo]/route.ts" app/api/uploads/servir-documentos.test.mjs && git commit -m "feat(documentos): servir PDFs e documentos do aluno com nome legível"`

---

### Task 5: A aba Documentos

**Files:** Create `components/alunos/documentos-aluno.tsx`; Modify `app/(dashboard)/alunos/[alunoId]/page.tsx:298-314`; Test `components/alunos/documentos-aluno.test.mjs`.

- [ ] **Step 5.1: Teste (falhando)** — criar `components/alunos/documentos-aluno.test.mjs`:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

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
      if (id === "@/lib/documentos-aluno") {
        const docs = ts.transpileModule(readFileSync(new URL("../../lib/documentos-aluno.ts", import.meta.url), "utf8"), {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText;
        const docExports = {};
        vm.runInNewContext(docs, { exports: docExports, require() { throw new Error("x"); } });
        return docExports;
      }
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

  const post = chamadas.find((c) => c.metodo === "POST");
  assert.equal(post.url, "/api/upload/documento-aluno");
  assert.equal(post.body.dados.get("alunoId"), "a1");
  assert.equal(post.body.dados.get("categoria"), "Certidão de nascimento");
  assert.equal(post.body.dados.get("file"), arquivoFalso);
  // Recarrega a lista depois do POST
  assert.ok(chamadas.filter((c) => c.metodo === "GET").length >= 2);
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
  assert.ok(chamadas.some((c) => c.metodo === "DELETE" && c.url === "/api/alunos/a1/documentos/d1"));
});
```

- [ ] **Step 5.2:** `pnpm test components/alunos/documentos-aluno.test.mjs` → FAIL.

- [ ] **Step 5.3: Implementar `components/alunos/documentos-aluno.tsx`:**

```tsx
"use client";

import * as React from "react";
import { ExternalLink, FileText, Image as ImagemIcone, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { podeGerenciarAlunos } from "@/lib/access-control";
import { usePerfil } from "@/lib/perfil-context";
import { useToast } from "@/lib/toast";
import { formatDateBR } from "@/lib/utils";
import {
  CATEGORIAS_DOCUMENTO,
  TAMANHO_MAXIMO_DOCUMENTO,
  formatarTamanho,
  type DocumentoAluno as Documento,
} from "@/lib/documentos-aluno";

interface Props {
  alunoId: string;
}

const selectCls =
  "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/** Arquivo digital da aba Documentos: enviar, listar, abrir e excluir. */
export function DocumentosAluno({ alunoId }: Props) {
  const { perfil } = usePerfil();
  const podeGerenciar = podeGerenciarAlunos(perfil);
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [documentos, setDocumentos] = React.useState<Documento[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);
  const [tentativa, setTentativa] = React.useState(0);
  const [categoria, setCategoria] = React.useState<string>(CATEGORIAS_DOCUMENTO[0]);
  const [descricao, setDescricao] = React.useState("");
  const [arquivo, setArquivo] = React.useState<File | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = React.useState<Documento | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro(null);
    fetch(`/api/alunos/${alunoId}/documentos`, { cache: "no-store", signal: controller.signal })
      .then(async (resposta) => {
        const corpo = (await resposta.json().catch(() => ({}))) as { items?: unknown; error?: unknown };
        if (!resposta.ok || !Array.isArray(corpo.items)) {
          throw new Error(typeof corpo.error === "string" ? corpo.error : "Não foi possível listar os documentos.");
        }
        if (!controller.signal.aborted) setDocumentos(corpo.items as Documento[]);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setErro(error instanceof Error ? error.message : "Não foi possível listar os documentos.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [alunoId, tentativa]);

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!arquivo) {
      toast.error("Escolha o arquivo", "PDF, JPG, PNG ou WEBP até 10 MB.");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_DOCUMENTO) {
      toast.error("Arquivo grande demais", "O limite é 10 MB.");
      return;
    }
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.set("alunoId", alunoId);
      fd.set("categoria", categoria);
      if (descricao.trim()) fd.set("descricao", descricao.trim());
      fd.set("file", arquivo);
      const resposta = await fetch("/api/upload/documento-aluno", { method: "POST", body: fd });
      const corpo = (await resposta.json().catch(() => ({}))) as { error?: unknown };
      if (!resposta.ok) {
        toast.error("Não foi possível arquivar", typeof corpo.error === "string" ? corpo.error : "Tente de novo");
        return;
      }
      toast.success("Documento arquivado", `${categoria} salvo na ficha.`);
      setDescricao("");
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      setTentativa((valor) => valor + 1);
    } catch (error) {
      toast.error("Erro de conexão", String(error));
    } finally {
      setEnviando(false);
    }
  };

  const excluir = async () => {
    if (!confirmarExcluir) return;
    try {
      const resposta = await fetch(`/api/alunos/${alunoId}/documentos/${confirmarExcluir.id}`, {
        method: "DELETE",
      });
      const corpo = (await resposta.json().catch(() => ({}))) as { error?: unknown };
      if (!resposta.ok) {
        throw new Error(typeof corpo.error === "string" ? corpo.error : "Tente de novo");
      }
      toast.success("Documento excluído", confirmarExcluir.categoria);
      setConfirmarExcluir(null);
      setTentativa((valor) => valor + 1);
    } catch (error) {
      toast.error("Não foi possível excluir", error instanceof Error ? error.message : "Tente de novo");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
        <CardDescription>Cópias digitalizadas e contratos arquivados na ficha do aluno</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {podeGerenciar && (
          <form onSubmit={enviar} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label htmlFor="doc-categoria">Categoria</Label>
              <select
                id="doc-categoria"
                className={selectCls}
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                disabled={enviando}
              >
                {CATEGORIAS_DOCUMENTO.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <Label htmlFor="doc-descricao" className="mt-3 block">Descrição (opcional)</Label>
              <Input
                id="doc-descricao"
                className="mt-1.5"
                value={descricao}
                maxLength={300}
                onChange={(event) => setDescricao(event.target.value)}
                placeholder="Ex.: via atualizada 2026"
                disabled={enviando}
              />
            </div>
            <div>
              <Label htmlFor="doc-arquivo">Arquivo (PDF, JPG, PNG ou WEBP · até 10 MB)</Label>
              <input
                id="doc-arquivo"
                ref={inputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90"
                onChange={(event) => setArquivo(event.target.files?.[0] ?? null)}
                disabled={enviando}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={enviando || !arquivo}>
                {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Arquivar
              </Button>
            </div>
          </form>
        )}

        {carregando && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos…
          </p>
        )}
        {erro && (
          <div role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            <p>{erro}</p>
            <Button type="button" variant="outline" className="mt-2" onClick={() => setTentativa((valor) => valor + 1)}>
              Tentar de novo
            </Button>
          </div>
        )}
        {!carregando && !erro && documentos.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="mt-3 text-sm font-medium">Nenhum documento anexado</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {podeGerenciar
                ? "Use o formulário acima para arquivar a primeira cópia digitalizada."
                : "A gestão ainda não arquivou documentos para este aluno."}
            </p>
          </div>
        )}
        {!carregando && documentos.length > 0 && (
          <ul className="divide-y rounded-xl border">
            {documentos.map((documento) => (
              <li key={documento.id} className="flex flex-wrap items-center gap-3 p-3">
                {documento.mime === "application/pdf" ? (
                  <FileText className="h-5 w-5 shrink-0 text-rose-600" />
                ) : (
                  <ImagemIcone className="h-5 w-5 shrink-0 text-emerald-600" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{documento.categoria}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {documento.descricao ? `${documento.descricao} · ` : ""}
                    {formatarTamanho(documento.tamanhoBytes)} · {formatDateBR(documento.criadoEm.slice(0, 10))}
                    {documento.enviadoPorNome ? ` · por ${documento.enviadoPorNome}` : ""}
                  </div>
                </div>
                <a
                  href={documento.arquivoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir
                </a>
                {podeGerenciar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-rose-600 hover:text-rose-700"
                    onClick={() => setConfirmarExcluir(documento)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        aberto={confirmarExcluir !== null}
        titulo="Excluir documento?"
        descricao={
          confirmarExcluir
            ? `O arquivo de ${confirmarExcluir.categoria} será removido da ficha e do servidor. Essa ação não pode ser desfeita.`
            : ""
        }
        variante="danger"
        textoBotaoConfirmar="Sim, excluir"
        onConfirmar={excluir}
        onFechar={() => setConfirmarExcluir(null)}
      />
    </Card>
  );
}
```

- [ ] **Step 5.4: Integrar na ficha** — em `app/(dashboard)/alunos/[alunoId]/page.tsx`, adicionar o import:

```tsx
import { DocumentosAluno } from "@/components/alunos/documentos-aluno";
```

e substituir o conteúdo do `TabsContent value="documentos"` (o Card placeholder inteiro, linhas 298-314):

```tsx
        <TabsContent value="documentos">
          <DocumentosAluno alunoId={aluno.id} />
        </TabsContent>
```

(`FileText` continua importado — segue em uso nas linhas 128 e 231.)

- [ ] **Step 5.5:** `pnpm typecheck && pnpm test components/alunos/documentos-aluno.test.mjs` → PASS (4).

- [ ] **Step 5.6: Commit** — `git add components/alunos/documentos-aluno.tsx components/alunos/documentos-aluno.test.mjs "app/(dashboard)/alunos/[alunoId]/page.tsx" && git commit -m "feat(documentos): aba Documentos da ficha com envio, listagem e exclusão"`

---

### Task 6: Verificação final

- [ ] **Step 6.1:** `pnpm typecheck && pnpm test` — zero erros, suíte inteira verde.
- [ ] **Step 6.2:** `git diff main --stat` contra os critérios de aceite da spec (upload+abrir, extensão mentirosa recusada, excluir com remoção física+auditoria, professora/financeiro restritos, migration limpa).
