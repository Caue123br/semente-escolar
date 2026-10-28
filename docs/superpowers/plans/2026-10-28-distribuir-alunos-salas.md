# Distribuir alunos entre salas e professoras — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A partir da listagem de alunos, trocar a sala (e portanto a professora) de um aluno em 3 cliques, mover vários alunos de uma vez para outra sala com uma única confirmação de lotação, e duplicar uma sala existente para criar a "sala B" do mesmo nível.

**Architecture:** A professora continua pertencendo à turma (zero migração). Troca individual reusa `PATCH /api/alunos/{id}` (já valida `turmaId` + lotação). Mover em massa ganha o endpoint novo `POST /api/alunos/mover-sala` (uma checagem de capacidade para o lote, auditoria por aluno). Duplicar sala reusa `POST /api/turmas` via `NovaTurmaModal` com valores iniciais. UI atualiza pelo event bus `semente:changed:alunos` já existente.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind, query builder próprio sobre `pg` (`lib/db/postgres.ts`), testes `node:test` + `typescript.transpileModule` + `vm` (rodar com `pnpm test`).

**Spec:** `docs/superpowers/specs/2026-10-28-distribuir-alunos-salas-design.md`

---

## File map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `app/api/alunos/mover-sala/route.ts` | Create | Endpoint POST de movimentação em massa |
| `app/api/alunos/mover-sala.test.mjs` | Create | Testes do endpoint |
| `components/alunos/trocar-sala-modal.tsx` | Create | Modal leve de troca individual de sala |
| `components/alunos/trocar-sala-modal.test.mjs` | Create | Testes do modal |
| `components/alunos/mover-alunos-em-massa.tsx` | Create | Barra fixa "N selecionados → Mover" |
| `components/alunos/mover-alunos-em-massa.test.mjs` | Create | Testes da barra |
| `app/(dashboard)/alunos/page.tsx` | Modify | Checkboxes, células clicáveis, wiring dos modais |
| `components/alunos/gerenciar-turmas-modal.tsx` | Modify | Botão "Duplicar sala" por turma |
| `components/alunos/gerenciar-turmas-modal.test.mjs` | Modify | Teste do botão Duplicar |
| `components/alunos/nova-turma-modal.tsx` | Modify | Prop `inicial` (pré-preenchimento) |

Fatos do código que o plano usa (conferidos):
- `PATCH /api/alunos/[id]` já aceita `turmaId` (MAPA linha 24) e `confirmarLotacao` no corpo; devolve 422 `codigo: "lotacao"` com `{ocupacao, capacidade, turmaNome}` (`app/api/alunos/[id]/route.ts:526-569`).
- `useEntidade("alunos").update(id, patch, {extras})` injeta extras no corpo e dispara `semente:changed:alunos` (`lib/data/store.ts:333-349`); `lotacao` está em `CODIGOS_TRATADOS_NA_TELA` (não gera toast duplicado).
- `ErroApi` expõe `.codigo` e `.payload` (`lib/data/store.ts:140-152`).
- Query builder: `.select(cols, {count:"exact", head:true})`, `.eq`, `.in`, `.is`, `.update(...).in(...).select("id")` — todos existem (`lib/db/postgres.ts:223-315`).
- Proxy já exige `podeGerenciarAlunos` para qualquer não-GET sob `/api/alunos` (`proxy.ts:121-133`) — cobre a rota nova sem mudança.
- `registrarAudit(acao, entidade, registroId?, detalhes?, ator?)` e `diffAudit(antes, depois)` (`lib/db/audit.ts:149, 178`).
- Rota estática `app/api/alunos/mover-sala/route.ts` vence a dinâmica `[id]` no App Router.

---

### Task 1: Endpoint `POST /api/alunos/mover-sala`

**Files:**
- Test: `app/api/alunos/mover-sala.test.mjs`
- Create: `app/api/alunos/mover-sala/route.ts`

- [ ] **Step 1.1: Escrever os testes (falhando)**

Criar `app/api/alunos/mover-sala.test.mjs`:

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
  const source = readFileSync(new URL(caminho, root), "utf8");
  const codigo = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
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

function ambiente({ perfil = "diretor", escopoTurmas = null, alunos = [], turmas = [] } = {}) {
  const tabelas = { alunos: structuredClone(alunos), turmas: structuredClone(turmas) };
  const audits = [];
  const db = {
    from(tabela) {
      const filtros = [];
      let operacao = "select", payload, unico = false, head = false;
      const consulta = {
        select(_colunas, opcoes) { head = opcoes?.head === true; return consulta; },
        eq(campo, valor) { filtros.push((linha) => linha[campo] === valor); return consulta; },
        in(campo, valores) { filtros.push((linha) => valores.includes(linha[campo])); return consulta; },
        is(campo, valor) { filtros.push((linha) => (linha[campo] ?? null) === valor); return consulta; },
        order() { return consulta; },
        update(valor) { operacao = "update"; payload = structuredClone(valor); return consulta; },
        maybeSingle() { unico = true; return consulta; },
        then(resolve, reject) {
          const rows = tabelas[tabela].filter((linha) => filtros.every((filtro) => filtro(linha)));
          if (operacao === "update") rows.forEach((linha) => Object.assign(linha, payload));
          return Promise.resolve({
            data: head ? null : structuredClone(unico ? rows[0] ?? null : rows),
            count: rows.length, error: null,
          }).then(resolve, reject);
        },
      };
      return consulta;
    },
  };
  const rota = carregar("app/api/alunos/mover-sala/route.ts", {
    "next/server": next,
    "@/lib/db/postgres": { getDatabase: () => db },
    "@/lib/db/auth": { getUsuarioLogado: async () => ({ id: "gestora", nome: "Gestora", perfil }) },
    "@/lib/db/api-response": carregar("lib/db/api-response.ts", { "next/server": next }),
    "@/lib/db/audit": {
      registrarAudit: async (...args) => { audits.push(args); },
      diffAudit: (antes, depois) => ({ antes, depois }),
    },
    "@/lib/db/professor-scope": {
      resolverEscopoProfessor: async () => (escopoTurmas
        ? { restrito: true, turmaIds: escopoTurmas }
        : { restrito: false, turmaIds: null }),
      professorPodeAcessarTurma: (escopo, turmaId) => !escopo.restrito || escopo.turmaIds.includes(turmaId),
    },
  });
  return { tabelas, audits, POST: rota.POST };
}

const req = (body) => new Request("https://exemplo.invalid/api/alunos/mover-sala", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

const turmaA = { id: "sala-a", nome: "Maternal 1 - Manhã", capacidade: 20 };
const turmaB = { id: "sala-b", nome: "Maternal 1 - Manhã B", capacidade: 20 };
const aluno = (id, turma_id = "sala-a", status = "Ativo") => ({ id, nome: `Aluno ${id}`, turma_id, status, deleted_at: null });

test("move vários alunos de uma vez e audita cada um", async () => {
  const env = ambiente({ turmas: [turmaA, turmaB], alunos: [aluno("a1"), aluno("a2"), aluno("a3")] });
  const resposta = await env.POST(req({ alunoIds: ["a1", "a2"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 200);
  const corpo = await resposta.json();
  assert.equal(corpo.movidos, 2);
  assert.equal(corpo.turmaNome, "Maternal 1 - Manhã B");
  assert.equal(env.tabelas.alunos.find((a) => a.id === "a1").turma_id, "sala-b");
  assert.equal(env.tabelas.alunos.find((a) => a.id === "a2").turma_id, "sala-b");
  assert.equal(env.tabelas.alunos.find((a) => a.id === "a3").turma_id, "sala-a");
  assert.equal(env.audits.length, 2);
  assert.equal(env.audits[0][0], "editar");
  assert.equal(env.audits[0][1], "alunos");
});

test("lotação bloqueia o lote inteiro com uma única resposta 422", async () => {
  const destinoPequeno = { ...turmaB, capacidade: 3 };
  const ocupantes = [aluno("b1", "sala-b"), aluno("b2", "sala-b")];
  const env = ambiente({ turmas: [turmaA, destinoPequeno], alunos: [...ocupantes, aluno("a1"), aluno("a2")] });
  const resposta = await env.POST(req({ alunoIds: ["a1", "a2"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 422);
  const corpo = await resposta.json();
  assert.equal(corpo.codigo, "lotacao");
  assert.equal(corpo.ocupacao, 2);
  assert.equal(corpo.capacidade, 3);
  assert.equal(corpo.quantidade, 2);
  assert.equal(env.tabelas.alunos.find((a) => a.id === "a1").turma_id, "sala-a");
  assert.equal(env.audits.length, 0);
});

test("confirmarLotacao move mesmo com a sala cheia", async () => {
  const destinoPequeno = { ...turmaB, capacidade: 1 };
  const env = ambiente({ turmas: [turmaA, destinoPequeno], alunos: [aluno("b1", "sala-b"), aluno("a1")] });
  const resposta = await env.POST(req({ alunoIds: ["a1"], turmaId: "sala-b", confirmarLotacao: true }));
  assert.equal(resposta.status, 200);
  assert.equal(env.tabelas.alunos.find((a) => a.id === "a1").turma_id, "sala-b");
});

test("alunos Inativos não contam para a capacidade", async () => {
  const destinoPequeno = { ...turmaB, capacidade: 1 };
  const env = ambiente({
    turmas: [turmaA, destinoPequeno],
    alunos: [aluno("b1", "sala-b", "Inativo"), aluno("a1", "sala-a", "Inativo"), aluno("a2")],
  });
  const resposta = await env.POST(req({ alunoIds: ["a1", "a2"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 200);
  assert.equal((await resposta.json()).movidos, 2);
});

test("aluno já na sala destino é ignorado sem erro", async () => {
  const env = ambiente({ turmas: [turmaA, turmaB], alunos: [aluno("a1", "sala-b"), aluno("a2")] });
  const resposta = await env.POST(req({ alunoIds: ["a1", "a2"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 200);
  assert.equal((await resposta.json()).movidos, 1);
  assert.equal(env.audits.length, 1);
});

test("corpo inválido devolve 400 sem tocar no banco", async () => {
  const env = ambiente({ turmas: [turmaA, turmaB], alunos: [aluno("a1")] });
  for (const body of [
    {}, { turmaId: "sala-b" }, { alunoIds: [], turmaId: "sala-b" },
    { alunoIds: ["a1"] }, { alunoIds: ["a1"], turmaId: "  " }, { alunoIds: "a1", turmaId: "sala-b" },
  ]) {
    const resposta = await env.POST(req(body));
    assert.equal(resposta.status, 400, JSON.stringify(body));
  }
  assert.equal(env.tabelas.alunos[0].turma_id, "sala-a");
});

test("sala destino inexistente devolve 422", async () => {
  const env = ambiente({ turmas: [turmaA], alunos: [aluno("a1")] });
  const resposta = await env.POST(req({ alunoIds: ["a1"], turmaId: "sala-x" }));
  assert.equal(resposta.status, 422);
});

test("aluno inexistente ou excluído devolve 422 e não move ninguém", async () => {
  const env = ambiente({
    turmas: [turmaA, turmaB],
    alunos: [aluno("a1"), { ...aluno("a2"), deleted_at: "2026-01-01" }],
  });
  const resposta = await env.POST(req({ alunoIds: ["a1", "a2"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 422);
  assert.equal(env.tabelas.alunos[0].turma_id, "sala-a");
});

test("professor restrito não move para sala fora do escopo (403) nem aluno fora do escopo (422)", async () => {
  const fora = await ambiente({
    perfil: "professor", escopoTurmas: ["sala-a"],
    turmas: [turmaA, turmaB], alunos: [aluno("a1")],
  }).POST(req({ alunoIds: ["a1"], turmaId: "sala-b" }));
  assert.equal(fora.status, 403);

  const env = ambiente({
    perfil: "professor", escopoTurmas: ["sala-b"],
    turmas: [turmaA, turmaB], alunos: [aluno("a1", "sala-a")],
  });
  const resposta = await env.POST(req({ alunoIds: ["a1"], turmaId: "sala-b" }));
  assert.equal(resposta.status, 422);
  assert.equal(env.tabelas.alunos[0].turma_id, "sala-a");
});
```

- [ ] **Step 1.2: Rodar e ver falhar**

Run: `pnpm test app/api/alunos/mover-sala.test.mjs`
Expected: FAIL (arquivo `app/api/alunos/mover-sala/route.ts` não existe).

- [ ] **Step 1.3: Implementar a rota**

Criar `app/api/alunos/mover-sala/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { diffAudit, registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros } from "@/lib/db/api-response";
import { professorPodeAcessarTurma, resolverEscopoProfessor } from "@/lib/db/professor-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Movimentação em massa: a secretaria seleciona N alunos na listagem e manda
 * todos para outra sala de uma vez (ex.: desmembrar uma turma cheia em duas
 * salas do mesmo nível). A professora "muda" junto porque pertence à sala.
 * Uma única checagem de lotação para o lote — confirmável, como no PATCH
 * individual — em vez de N erros um por um.
 */
export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();

  let corpo: Record<string, unknown>;
  try {
    corpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
    return erros.dadosInvalidos("corpo da requisição");
  }

  const turmaId = typeof corpo.turmaId === "string" ? corpo.turmaId.trim() : "";
  if (!turmaId) return erroAPI("Selecione a sala de destino.", 400);
  if (!Array.isArray(corpo.alunoIds)) return erros.dadosInvalidos("alunos selecionados");
  const ids = [...new Set(
    corpo.alunoIds
      .filter((id): id is string => typeof id === "string" && id.trim() !== "")
      .map((id) => id.trim())
  )];
  if (ids.length === 0) return erroAPI("Selecione ao menos um aluno para mover.", 400);
  if (ids.length > 500) return erroAPI("Mova até 500 alunos por vez.", 400);

  const sb = getDatabase();
  let escopo;
  try {
    escopo = await resolverEscopoProfessor(usuario);
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  if (!professorPodeAcessarTurma(escopo, turmaId)) {
    return erros.semPermissao("mover alunos para uma turma não atribuída ao seu usuário");
  }

  const { data: turma, error: erroTurma } = await sb
    .from("turmas")
    .select("id, nome, capacidade")
    .eq("id", turmaId)
    .maybeSingle();
  if (erroTurma) return erros.servidorIndisponivel(erroTurma);
  if (!turma) return erroAPI("A sala selecionada não existe mais. Atualize a página.", 422);

  let consulta = sb
    .from("alunos")
    .select("id, turma_id, status")
    .in("id", ids)
    .is("deleted_at", null);
  if (escopo.restrito) consulta = consulta.in("turma_id", escopo.turmaIds);
  const { data: encontrados, error: erroAlunos } = await consulta;
  if (erroAlunos) return erros.servidorIndisponivel(erroAlunos);
  const alunos = encontrados ?? [];
  if (alunos.length !== ids.length) {
    return erroAPI(
      "Alguns alunos selecionados não foram encontrados. Atualize a página e tente de novo.",
      422
    );
  }

  const movendo = alunos.filter((aluno) => aluno.turma_id !== turmaId);
  if (movendo.length === 0) {
    return NextResponse.json({ ok: true, movidos: 0, turmaNome: String(turma.nome) });
  }

  // Mesma regra do PATCH individual: só aluno Ativo ocupa vaga; capacidade 0 é
  // sala fechada; a direção pode confirmar por cima.
  const capacidade = Number(turma.capacidade ?? 0);
  const ativosMovendo = movendo.filter((aluno) => aluno.status === "Ativo").length;
  if (
    corpo.confirmarLotacao !== true &&
    Number.isFinite(capacidade) &&
    capacidade >= 0 &&
    ativosMovendo > 0
  ) {
    const { count, error: erroOcupacao } = await sb
      .from("alunos")
      .select("id", { count: "exact", head: true })
      .eq("turma_id", turmaId)
      .eq("status", "Ativo");
    if (erroOcupacao) return erros.servidorIndisponivel(erroOcupacao);
    const ocupacao = count ?? 0;
    if (ocupacao + ativosMovendo > capacidade) {
      return NextResponse.json(
        {
          error: `A turma ${turma.nome} tem ${ocupacao} de ${capacidade} vagas ocupadas e receberia mais ${ativosMovendo} aluno(s). Confirme para mover mesmo assim ou aumente a capacidade dela em Turmas.`,
          codigo: "lotacao",
          ocupacao,
          capacidade,
          turmaNome: String(turma.nome),
          quantidade: ativosMovendo,
        },
        { status: 422 }
      );
    }
  }

  const { error: erroUpdate } = await sb
    .from("alunos")
    .update({ turma_id: turmaId })
    .in("id", movendo.map((aluno) => aluno.id))
    .select("id");
  if (erroUpdate) {
    if ((erroUpdate as { code?: string }).code === "23503") {
      return erroAPI("A sala selecionada não existe mais. Atualize a página.", 422);
    }
    return erros.servidorIndisponivel(erroUpdate);
  }

  for (const aluno of movendo) {
    await registrarAudit(
      "editar",
      "alunos",
      String(aluno.id),
      { ...diffAudit({ turma_id: aluno.turma_id }, { turma_id: turmaId }), operacao: "mover-sala" },
      usuario
    );
  }
  return NextResponse.json({ ok: true, movidos: movendo.length, turmaNome: String(turma.nome) });
}
```

- [ ] **Step 1.4: Rodar e ver passar**

Run: `pnpm test app/api/alunos/mover-sala.test.mjs`
Expected: PASS (10 testes).

- [ ] **Step 1.5: Commit**

```bash
git add app/api/alunos/mover-sala/route.ts app/api/alunos/mover-sala.test.mjs
git commit -m "feat(alunos): endpoint de movimentação em massa entre salas"
```

---

### Task 2: Modal de troca rápida de sala na linha

**Files:**
- Test: `components/alunos/trocar-sala-modal.test.mjs`
- Create: `components/alunos/trocar-sala-modal.tsx`
- Modify: `app/(dashboard)/alunos/page.tsx` (células Sala/Professora viram gatilho; modal montado)

- [ ] **Step 2.1: Escrever os testes (falhando)**

Criar `components/alunos/trocar-sala-modal.test.mjs`:

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

function componente() {
  const arquivo = new URL("./trocar-sala-modal.tsx", import.meta.url);
  if (!existsSync(arquivo)) return undefined;
  const codigo = ts.transpileModule(readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    require(id) {
      if (id === "react") return React;
      if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
      if (id === "@/components/shared/confirm-dialog") return { ConfirmDialog: () => null };
      if (id === "@/lib/toast") return { useToast: () => ({ success() {}, error() {} }) };
      if (id === "@/lib/data/store") return { ErroApi: class ErroApi extends Error {} };
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
```

- [ ] **Step 2.2: Rodar e ver falhar**

Run: `pnpm test components/alunos/trocar-sala-modal.test.mjs`
Expected: FAIL (`typeof Modal` é `undefined`).

- [ ] **Step 2.3: Implementar o componente**

Criar `components/alunos/trocar-sala-modal.tsx`:

```tsx
"use client";

import * as React from "react";
import { ArrowRightLeft, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/lib/toast";
import { ErroApi, type OpcoesEscrita } from "@/lib/data/store";
import type { Aluno, Turma } from "@/lib/types";

interface Props {
  aluno: Aluno | null;
  turmas: Turma[];
  /** Alunos Ativos por turma, calculado na página a partir da lista carregada. */
  ocupacaoPorTurma: ReadonlyMap<string, number>;
  onClose: () => void;
  onSalvar: (id: string, patch: Partial<Aluno>, opcoes?: OpcoesEscrita) => Promise<void>;
  /** Abre o modal "Turmas e professoras" para trocar a professora da sala inteira. */
  onGerenciarTurmas: () => void;
}

const selectCls =
  "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/**
 * Atalho da listagem: troca só a sala do aluno (a professora acompanha a sala).
 * Reusa o PATCH existente, inclusive a confirmação de lotação.
 */
export function TrocarSalaModal({ aluno, turmas, ocupacaoPorTurma, onClose, onSalvar, onGerenciarTurmas }: Props) {
  const toast = useToast();
  const [turmaId, setTurmaId] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  const [conflitoLotacao, setConflitoLotacao] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (aluno) {
      setTurmaId(aluno.turmaId);
      setConflitoLotacao(null);
    }
  }, [aluno]);

  if (!aluno) return null;

  const turmaAtual = turmas.find((t) => t.id === aluno.turmaId);
  const turmaNova = turmas.find((t) => t.id === turmaId);
  const primeiroNome = aluno.nome.split(" ")[0];
  const rotulo = (t: Turma) =>
    `${t.nome} — ${t.professorNome?.trim() || "Sem professora"} (${ocupacaoPorTurma.get(t.id) ?? 0}/${t.capacidade})`;

  const salvar = async (confirmarLotacao: boolean) => {
    if (!turmaId || turmaId === aluno.turmaId) return;
    setSalvando(true);
    try {
      await onSalvar(aluno.id, { turmaId }, confirmarLotacao ? { extras: { confirmarLotacao: true } } : {});
      setConflitoLotacao(null);
      toast.success(
        "Sala atualizada",
        `${primeiroNome} agora está em ${turmaNova?.nome ?? "outra sala"}${
          turmaNova?.professorNome?.trim() ? ` com ${turmaNova.professorNome.trim()}` : ""
        }.`
      );
      onClose();
    } catch (e) {
      // Sala na capacidade: a própria tela pergunta se insiste (a store não avisa).
      if (e instanceof ErroApi && e.codigo === "lotacao") {
        setConflitoLotacao(e.message);
        return;
      }
      setConflitoLotacao(null);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={() => !salvando && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trocar-sala-titulo"
          className="w-full max-w-md overflow-hidden rounded-2xl bg-popover shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b p-5">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <h2 id="trocar-sala-titulo" className="font-bold">Trocar sala e professora</h2>
                <p className="text-xs text-muted-foreground">{aluno.nome}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !salvando && onClose()}
              className="rounded-md p-2 hover:bg-accent"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 p-5">
            <p className="text-sm text-muted-foreground">
              Hoje: {turmaAtual?.nome ?? "sala não informada"} —{" "}
              {turmaAtual?.professorNome?.trim() || "sem professora vinculada"}.
            </p>
            <div>
              <Label htmlFor="trocar-sala-destino">Nova sala</Label>
              <select
                id="trocar-sala-destino"
                className={selectCls}
                value={turmaId}
                onChange={(event) => setTurmaId(event.target.value)}
                disabled={salvando}
              >
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{rotulo(t)}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                A professora responsável é a da sala: ao trocar a sala, a professora muda junto.
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => {
                onClose();
                onGerenciarTurmas();
              }}
            >
              Trocar a professora desta sala (afeta todos os alunos dela)
            </button>
          </div>

          <div className="flex justify-end gap-2 border-t bg-muted/30 p-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void salvar(false)} disabled={salvando || !turmaId || turmaId === aluno.turmaId}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        aberto={conflitoLotacao !== null}
        titulo="Sala cheia"
        descricao={conflitoLotacao ? `${conflitoLotacao} Mover ${primeiroNome} mesmo assim?` : ""}
        variante="warning"
        textoBotaoConfirmar="Mover mesmo assim"
        onConfirmar={() => void salvar(true)}
        onFechar={() => setConflitoLotacao(null)}
      />
    </>
  );
}
```

- [ ] **Step 2.4: Rodar e ver passar**

Run: `pnpm test components/alunos/trocar-sala-modal.test.mjs`
Expected: PASS (2 testes).

- [ ] **Step 2.5: Wiring na página**

Em `app/(dashboard)/alunos/page.tsx`:

(a) Imports — adicionar `Pencil` ao import do lucide (linha 5) e o modal (após a linha 40):

```tsx
import { AlertCircle, Users, Plus, Search, Filter, Download, UserPlus, Cake, Heart, Pencil } from "lucide-react";
```
```tsx
import { TrocarSalaModal } from "@/components/alunos/trocar-sala-modal";
```

(b) Estado — junto dos outros `useState` (após a linha 62):

```tsx
const [trocandoSala, setTrocandoSala] = React.useState<Aluno | null>(null);
```

(c) Ocupação — logo após o `turmasMap` (linha 129):

```tsx
const ocupacaoPorTurma = React.useMemo(() => {
  const mapa = new Map<string, number>();
  for (const aluno of alunos) {
    if (aluno.status !== "Ativo") continue;
    mapa.set(aluno.turmaId, (mapa.get(aluno.turmaId) ?? 0) + 1);
  }
  return mapa;
}, [alunos]);
```

(d) Montar o modal — logo após o bloco `<EditarAlunoModal ... />` (linha 304-310):

```tsx
{podeGerenciar && (
  <TrocarSalaModal
    aluno={trocandoSala}
    turmas={turmas}
    ocupacaoPorTurma={ocupacaoPorTurma}
    onClose={() => setTrocandoSala(null)}
    onSalvar={update}
    onGerenciarTurmas={() => setModalGerenciarTurmasAberto(true)}
  />
)}
```

(e) Células clicáveis — substituir as duas células (linhas 512-513):

```tsx
<TableCell>{turma?.nome || "Não informada"}</TableCell>
<TableCell className="text-sm">{turma?.professorNome?.trim() || "Sem professora vinculada"}</TableCell>
```

por:

```tsx
<TableCell>
  {podeGerenciar ? (
    <button
      type="button"
      onClick={() => setTrocandoSala(a)}
      title="Trocar sala e professora"
      className="group/troca inline-flex items-center gap-1.5 text-left hover:underline"
    >
      {turma?.nome || "Não informada"}
      <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/troca:opacity-100" />
    </button>
  ) : (
    turma?.nome || "Não informada"
  )}
</TableCell>
<TableCell className="text-sm">
  {podeGerenciar ? (
    <button
      type="button"
      onClick={() => setTrocandoSala(a)}
      title="Trocar sala e professora"
      className="group/troca inline-flex items-center gap-1.5 text-left hover:underline"
    >
      {turma?.professorNome?.trim() || "Sem professora vinculada"}
      <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/troca:opacity-100" />
    </button>
  ) : (
    turma?.professorNome?.trim() || "Sem professora vinculada"
  )}
</TableCell>
```

- [ ] **Step 2.6: Typecheck + testes**

Run: `pnpm typecheck && pnpm test components/alunos/trocar-sala-modal.test.mjs`
Expected: sem erros de tipo; testes PASS.

- [ ] **Step 2.7: Commit**

```bash
git add components/alunos/trocar-sala-modal.tsx components/alunos/trocar-sala-modal.test.mjs "app/(dashboard)/alunos/page.tsx"
git commit -m "feat(alunos): troca rápida de sala/professora direto da listagem"
```

---

### Task 3: Seleção em massa + barra "Mover para sala"

**Files:**
- Test: `components/alunos/mover-alunos-em-massa.test.mjs`
- Create: `components/alunos/mover-alunos-em-massa.tsx`
- Modify: `app/(dashboard)/alunos/page.tsx` (checkboxes + barra)

- [ ] **Step 3.1: Escrever os testes (falhando)**

Criar `components/alunos/mover-alunos-em-massa.test.mjs`:

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

function componente() {
  const arquivo = new URL("./mover-alunos-em-massa.tsx", import.meta.url);
  if (!existsSync(arquivo)) return undefined;
  const codigo = ts.transpileModule(readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    require(id) {
      if (id === "react") return React;
      if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
      if (id === "@/components/shared/confirm-dialog") return { ConfirmDialog: () => null };
      if (id === "@/lib/toast") return { useToast: () => ({ success() {}, error() {} }) };
      if (id === "@/components/ui/button") return { Button: ({ children, variant, ...props }) => React.createElement("button", props, children) };
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.MoverAlunosEmMassa;
}

const turmas = [
  { id: "sala-a", nome: "Maternal 1 - Manhã", serie: "Maternal 1", turno: "Manhã", professorId: "", professorNome: "Profa. Vanessa", totalAlunos: 2, capacidade: 20, cor: "#059669" },
  { id: "sala-b", nome: "Maternal 1 - Manhã B", serie: "Maternal 1", turno: "Manhã", professorId: "", professorNome: "Profa. Ana", totalAlunos: 0, capacidade: 20, cor: "#059669" },
];
const ocupacao = new Map([["sala-a", 12], ["sala-b", 3]]);

test("mostra a contagem e as salas de destino com professora e ocupação", () => {
  const Barra = componente();
  assert.equal(typeof Barra, "function");
  const html = renderToStaticMarkup(React.createElement(Barra, {
    selecionados: ["a1", "a2", "a3"], turmas, ocupacaoPorTurma: ocupacao, onLimpar() {},
  }));
  assert.ok(html.includes("3 selecionado(s)"));
  assert.ok(html.includes("Maternal 1 - Manhã B — Profa. Ana (3/20)"));
  assert.ok(html.includes("Mover"));
  assert.ok(html.includes("Limpar seleção"));
});

test("sem seleção não renderiza nada", () => {
  const Barra = componente();
  const html = renderToStaticMarkup(React.createElement(Barra, {
    selecionados: [], turmas, ocupacaoPorTurma: ocupacao, onLimpar() {},
  }));
  assert.equal(html, "");
});
```

- [ ] **Step 3.2: Rodar e ver falhar**

Run: `pnpm test components/alunos/mover-alunos-em-massa.test.mjs`
Expected: FAIL (`typeof Barra` é `undefined`).

- [ ] **Step 3.3: Implementar a barra**

Criar `components/alunos/mover-alunos-em-massa.tsx`:

```tsx
"use client";

import * as React from "react";
import { Loader2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/lib/toast";
import type { Turma } from "@/lib/types";

interface Props {
  /** Ids dos alunos marcados na listagem (já restritos ao filtro atual). */
  selecionados: string[];
  turmas: Turma[];
  ocupacaoPorTurma: ReadonlyMap<string, number>;
  onLimpar: () => void;
}

const selectCls =
  "flex h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm";

/**
 * Barra fixa que aparece com 1+ alunos selecionados. Chama o endpoint de
 * movimentação em massa; lotação vem como UMA confirmação para o lote.
 */
export function MoverAlunosEmMassa({ selecionados, turmas, ocupacaoPorTurma, onLimpar }: Props) {
  const toast = useToast();
  const [turmaId, setTurmaId] = React.useState("");
  const [movendo, setMovendo] = React.useState(false);
  const [conflitoLotacao, setConflitoLotacao] = React.useState<string | null>(null);

  if (selecionados.length === 0) return null;

  const mover = async (confirmarLotacao: boolean) => {
    if (!turmaId) return;
    setMovendo(true);
    try {
      const resposta = await fetch("/api/alunos/mover-sala", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alunoIds: selecionados,
          turmaId,
          ...(confirmarLotacao ? { confirmarLotacao: true } : {}),
        }),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as Record<string, unknown>;
      if (!resposta.ok) {
        if (corpo.codigo === "lotacao" && typeof corpo.error === "string") {
          setConflitoLotacao(corpo.error);
          return;
        }
        throw new Error(
          typeof corpo.error === "string" ? corpo.error : `O servidor respondeu com status ${resposta.status}`
        );
      }
      setConflitoLotacao(null);
      const destino = turmas.find((t) => t.id === turmaId);
      const movidos = typeof corpo.movidos === "number" ? corpo.movidos : selecionados.length;
      toast.success(
        "Alunos movidos",
        `${movidos} aluno(s) agora em ${destino?.nome ?? "nova sala"}${
          destino?.professorNome?.trim() ? ` com ${destino.professorNome.trim()}` : ""
        }.`
      );
      window.dispatchEvent(new CustomEvent("semente:changed:alunos"));
      setTurmaId("");
      onLimpar();
    } catch (e) {
      setConflitoLotacao(null);
      toast.error("Não foi possível mover", e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setMovendo(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 shadow-xl">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <Users className="h-4 w-4 text-primary" />
          {selecionados.length} selecionado(s)
        </span>
        <label className="sr-only" htmlFor="mover-sala-destino">Mover para sala</label>
        <select
          id="mover-sala-destino"
          className={selectCls}
          value={turmaId}
          onChange={(event) => setTurmaId(event.target.value)}
          disabled={movendo}
        >
          <option value="">Mover para sala…</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} — {t.professorNome?.trim() || "Sem professora"} ({ocupacaoPorTurma.get(t.id) ?? 0}/{t.capacidade})
            </option>
          ))}
        </select>
        <Button type="button" size="sm" onClick={() => void mover(false)} disabled={movendo || !turmaId}>
          {movendo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Mover
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onLimpar} disabled={movendo}>
          <X className="mr-1 h-4 w-4" /> Limpar seleção
        </Button>
      </div>

      <ConfirmDialog
        aberto={conflitoLotacao !== null}
        titulo="Sala cheia"
        descricao={conflitoLotacao ? `${conflitoLotacao}` : ""}
        variante="warning"
        textoBotaoConfirmar="Mover mesmo assim"
        onConfirmar={() => void mover(true)}
        onFechar={() => setConflitoLotacao(null)}
      />
    </>
  );
}
```

- [ ] **Step 3.4: Rodar e ver passar**

Run: `pnpm test components/alunos/mover-alunos-em-massa.test.mjs`
Expected: PASS (2 testes).

- [ ] **Step 3.5: Wiring na página (checkboxes + barra)**

Em `app/(dashboard)/alunos/page.tsx`:

(a) Import:

```tsx
import { MoverAlunosEmMassa } from "@/components/alunos/mover-alunos-em-massa";
```

(b) Estado + helpers — junto do estado `trocandoSala`:

```tsx
const [selecionados, setSelecionados] = React.useState<ReadonlySet<string>>(new Set());
```

Logo após o cálculo de `ordenados` (depois da linha 164):

```tsx
// Seleção só vale para quem está na lista filtrada atual (todas as páginas).
const selecionadosNaLista = ordenados.filter((a) => selecionados.has(a.id)).map((a) => a.id);
const todosSelecionados = ordenados.length > 0 && ordenados.every((a) => selecionados.has(a.id));
const alternarSelecionado = (id: string) => {
  setSelecionados((atual) => {
    const novo = new Set(atual);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    return novo;
  });
};
const alternarTodos = () => {
  setSelecionados(todosSelecionados ? new Set() : new Set(ordenados.map((a) => a.id)));
};
```

(c) Limpar seleção quando o filtro muda — no efeito existente das linhas 170-172:

```tsx
React.useEffect(() => {
  setPagina(1);
  setSelecionados(new Set());
}, [busca, turmaFiltro, professoraFiltro, bilinguismo, comAlergia]);
```

(d) Cabeçalho da tabela — antes do `<SortHeader ...>Aluno</SortHeader>` (linha 465):

```tsx
{podeGerenciar && (
  <TableHead className="w-10">
    <input
      type="checkbox"
      aria-label="Selecionar todos os alunos filtrados"
      className="rounded"
      checked={todosSelecionados}
      onChange={alternarTodos}
    />
  </TableHead>
)}
```

(e) Linha da tabela — primeira célula de cada `<TableRow key={a.id}>` (antes da célula do nome, linha 481):

```tsx
{podeGerenciar && (
  <TableCell className="w-10">
    <input
      type="checkbox"
      aria-label={`Selecionar ${a.nome}`}
      className="rounded"
      checked={selecionados.has(a.id)}
      onChange={() => alternarSelecionado(a.id)}
    />
  </TableCell>
)}
```

(f) Skeleton — ajustar contagem de colunas (linha 450):

```tsx
<SkeletonTableRows rows={6} cols={podeGerenciar ? 9 : 7} />
```

(g) Barra — antes do `<ConfirmDialog` final (linha 733):

```tsx
{podeGerenciar && (
  <MoverAlunosEmMassa
    selecionados={selecionadosNaLista}
    turmas={turmas}
    ocupacaoPorTurma={ocupacaoPorTurma}
    onLimpar={() => setSelecionados(new Set())}
  />
)}
```

- [ ] **Step 3.6: Typecheck + testes**

Run: `pnpm typecheck && pnpm test components/alunos/mover-alunos-em-massa.test.mjs`
Expected: sem erros de tipo; testes PASS.

- [ ] **Step 3.7: Commit**

```bash
git add components/alunos/mover-alunos-em-massa.tsx components/alunos/mover-alunos-em-massa.test.mjs "app/(dashboard)/alunos/page.tsx"
git commit -m "feat(alunos): seleção em massa e mover alunos para outra sala"
```

---

### Task 4: Duplicar sala

**Files:**
- Modify: `components/alunos/gerenciar-turmas-modal.tsx` (prop `onDuplicar` + botão)
- Modify: `components/alunos/nova-turma-modal.tsx` (prop `inicial`)
- Modify: `app/(dashboard)/alunos/page.tsx` (wiring)
- Test: `components/alunos/gerenciar-turmas-modal.test.mjs` (novo caso)

- [ ] **Step 4.1: Escrever o teste (falhando)**

Adicionar ao final de `components/alunos/gerenciar-turmas-modal.test.mjs`:

```js
test("botão Duplicar sala aparece só quando a página fornece onDuplicar", () => {
  const Modal = componente();
  const sem = renderToStaticMarkup(React.createElement(Modal, { aberto: true, turmas, onClose() {}, onSalvar: async () => {} }));
  assert.ok(!sem.includes("Duplicar sala"));
  const com = renderToStaticMarkup(React.createElement(Modal, {
    aberto: true, turmas, onClose() {}, onSalvar: async () => {}, onDuplicar() {},
  }));
  assert.ok(com.includes("Duplicar sala"));
});
```

- [ ] **Step 4.2: Rodar e ver falhar**

Run: `pnpm test components/alunos/gerenciar-turmas-modal.test.mjs`
Expected: FAIL no caso novo (`com.includes("Duplicar sala")` é false).

- [ ] **Step 4.3: Implementar `onDuplicar` no GerenciarTurmasModal**

Em `components/alunos/gerenciar-turmas-modal.tsx`:

(a) Interface `Props` (linha 15-20) ganha:

```tsx
interface Props {
  aberto: boolean;
  onClose: () => void;
  turmas: Turma[];
  onSalvar: (id: string, patch: Partial<Turma>) => Promise<void>;
  /** Pré-preenche "Nova turma" com os dados desta sala (fluxo "sala B"). */
  onDuplicar?: (turma: Turma) => void;
}
```

(b) Destructuring do componente (linha 25):

```tsx
export function GerenciarTurmasModal({ aberto, onClose, turmas, onSalvar, onDuplicar }: Props) {
```

(c) Repassar à linha (linha 126) — adicionar `onDuplicar={onDuplicar}`:

```tsx
<LinhaTurma key={turma.id} turma={turma} professoras={professoras} carregandoProfessoras={carregando} desabilitada={Boolean(salvandoId)} salvando={salvandoId === turma.id} onSalvar={salvar} onDuplicar={onDuplicar} />
```

(d) `LinhaTurma` (linha 136) — nova prop na assinatura:

```tsx
function LinhaTurma({ turma, professoras, carregandoProfessoras, desabilitada, salvando, onSalvar, onDuplicar }: {
  turma: Turma;
  professoras: Professora[];
  carregandoProfessoras: boolean;
  desabilitada: boolean;
  salvando: boolean;
  onSalvar: Props["onSalvar"];
  onDuplicar?: Props["onDuplicar"];
}) {
```

(e) Botão — na fileira de botões (linha 260-263), antes de "Remover atribuição":

```tsx
<div className="flex flex-wrap items-center justify-end gap-2">
  {onDuplicar && (
    <Button type="button" variant="outline" onClick={() => onDuplicar(turma)}>
      Duplicar sala
    </Button>
  )}
  {turma.professorNome?.trim() && <Button type="button" variant="ghost" onClick={() => void remover()}>Remover atribuição</Button>}
  <Button type="submit">{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar turma</Button>
</div>
```

- [ ] **Step 4.4: Prop `inicial` no NovaTurmaModal**

Em `components/alunos/nova-turma-modal.tsx`:

(a) Interface `Props` (linha 16-20):

```tsx
interface Props {
  aberto: boolean;
  onClose: () => void;
  onSalvar: (turma: Turma) => Promise<unknown>;
  /** Pré-preenche o formulário (ex.: duplicar uma sala existente). */
  inicial?: Partial<Pick<Turma, "nome" | "serie" | "turno" | "capacidade" | "cor">> | null;
}
```

(b) Destructuring (linha 22):

```tsx
export function NovaTurmaModal({ aberto, onClose, onSalvar, inicial }: Props) {
```

(c) Novo efeito — logo após o efeito que busca professores (depois da linha 69):

```tsx
// Duplicação: ao abrir com valores iniciais, o formulário já vem preenchido.
React.useEffect(() => {
  if (!aberto || !inicial) return;
  if (inicial.nome !== undefined) setNome(inicial.nome);
  if (inicial.serie !== undefined) setSerie(inicial.serie);
  if (inicial.turno !== undefined) setTurno(inicial.turno);
  if (inicial.capacidade !== undefined) setCapacidade(String(inicial.capacidade));
  if (inicial.cor !== undefined) setCor(inicial.cor);
}, [aberto, inicial]);
```

- [ ] **Step 4.5: Wiring na página**

Em `app/(dashboard)/alunos/page.tsx`:

(a) Estado — junto dos outros:

```tsx
const [turmaInicial, setTurmaInicial] = React.useState<
  Partial<Pick<Turma, "nome" | "serie" | "turno" | "capacidade" | "cor">> | null
>(null);
```

(b) Botão "Nova turma" (linha 257-259) limpa o pré-preenchimento:

```tsx
<Button variant="outline" onClick={() => { setTurmaInicial(null); setModalTurmaAberto(true); }}>
  <Plus className="mr-2 h-4 w-4" /> Nova turma
</Button>
```

(c) `NovaTurmaModal` (linha 311-315) recebe `inicial`:

```tsx
<NovaTurmaModal
  aberto={modalTurmaAberto}
  onClose={() => setModalTurmaAberto(false)}
  onSalvar={addTurma}
  inicial={turmaInicial}
/>
```

(d) `GerenciarTurmasModal` (linha 316-323) recebe `onDuplicar`:

```tsx
{podeGerenciar && (
  <GerenciarTurmasModal
    aberto={modalGerenciarTurmasAberto}
    onClose={() => setModalGerenciarTurmasAberto(false)}
    turmas={turmas}
    onSalvar={atualizarTurma}
    onDuplicar={(t) => {
      setModalGerenciarTurmasAberto(false);
      setTurmaInicial({ nome: `${t.nome} B`, serie: t.serie, turno: t.turno, capacidade: t.capacidade, cor: t.cor });
      setModalTurmaAberto(true);
    }}
  />
)}
```

- [ ] **Step 4.6: Typecheck + testes**

Run: `pnpm typecheck && pnpm test components/alunos/gerenciar-turmas-modal.test.mjs`
Expected: sem erros de tipo; todos os casos PASS (incluindo o novo).

- [ ] **Step 4.7: Commit**

```bash
git add components/alunos/gerenciar-turmas-modal.tsx components/alunos/gerenciar-turmas-modal.test.mjs components/alunos/nova-turma-modal.tsx "app/(dashboard)/alunos/page.tsx"
git commit -m "feat(turmas): duplicar sala pré-preenchendo a nova turma"
```

---

### Task 5: Verificação final

- [ ] **Step 5.1: Suíte completa + typecheck**

Run: `pnpm typecheck && pnpm test`
Expected: zero erros de tipo; todos os testes do repositório PASS (os antigos continuam verdes — nenhuma assinatura existente mudou de forma incompatível: as props novas são opcionais).

- [ ] **Step 5.2: Revisão do diff**

Run: `git log --oneline main...HEAD && git diff main --stat`
Conferir contra os critérios de aceite da spec:
- Troca individual em ≤ 3 cliques (célula → select → Salvar).
- Mover 10+ alunos com uma única confirmação de lotação.
- Duplicar sala com professora própria sem sair do fluxo.
- Nada visível para perfis sem `podeGerenciarAlunos` (células viram texto puro, sem checkbox, sem barra, sem modais).
- Auditoria por aluno movido.
