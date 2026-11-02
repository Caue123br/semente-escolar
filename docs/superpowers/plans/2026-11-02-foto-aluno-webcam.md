# Foto do aluno pela webcam — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar a foto do aluno pela webcam — no perfil, no pós-matrícula e direto na listagem (aluno sem foto) — com fallback de arquivo, reutilizando a rota de upload existente.

**Architecture:** Um modal novo (`CapturarFotoModal`) concentra webcam + fallback de arquivo + upload; o `UploadFotoAluno` passa a só abrir esse modal; a listagem ganha um componente de avatar (`AvatarAlunoLista`) que mostra a foto de quem tem e vira botão de captura para quem não tem. A lógica de recorte/captura fica em helpers puros (`lib/captura-foto.ts`) testáveis sem DOM. `next.config.ts` muda `camera=()` → `camera=(self)` (hoje o próprio site está bloqueado de usar a câmera).

**Tech Stack:** Next.js 16 App Router, React 19, `getUserMedia`/canvas, rota existente `POST /api/upload/foto-aluno` (valida magic bytes, grava disco, atualiza `alunos.foto`, audita). Testes `node:test` + transpile (`pnpm test`).

**Spec:** `docs/superpowers/specs/2026-11-02-foto-aluno-webcam-design.md`

---

## File map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `lib/captura-foto.ts` | Create | Recorte quadrado central + captura canvas→Blob (puro, stubável) |
| `lib/captura-foto.test.mjs` | Create | Testes dos helpers |
| `components/alunos/capturar-foto-modal.tsx` | Create | Modal webcam + arquivo + upload |
| `components/alunos/capturar-foto-modal.test.mjs` | Create | Testes do modal |
| `components/alunos/upload-foto.tsx` | Modify | Botão de câmera abre o modal (upload migra pro modal) |
| `components/alunos/upload-foto.test.mjs` | Create | Teste da integração |
| `components/alunos/avatar-aluno-lista.tsx` | Create | Avatar da listagem (foto / botão de captura / iniciais) |
| `components/alunos/avatar-aluno-lista.test.mjs` | Create | Testes dos 3 ramos |
| `app/(dashboard)/alunos/page.tsx` | Modify | Usa `AvatarAlunoLista` + monta o modal de captura |
| `next.config.ts` | Modify | `Permissions-Policy: camera=(self)` |
| `next.config.test.mjs` | Create | Trava de regressão dos headers |

Fatos conferidos no código:
- Rota de upload: `app/api/upload/foto-aluno/route.ts` — FormData `{alunoId, file}`, 5 MB, JPG/PNG/WEBP por magic bytes, resposta `{ok, url}`.
- CSP já permite `img-src ... blob:` (preview por `URL.createObjectURL` funciona).
- `next.config.ts:33` envia `camera=()` — bloqueia `getUserMedia` até para o próprio site.
- Listagem (`page.tsx:486-507`) renderiza só `AvatarFallback` dentro do `Link` do nome; `GET /api/alunos` devolve `foto`.
- `UploadFotoAluno` é usado em `app/(dashboard)/alunos/[alunoId]/page.tsx:97` e no pós-matrícula `page.tsx:314`.
- HSTS ativo (produção em HTTPS) — requisito de contexto seguro do `getUserMedia` atendido.

---

### Task 1: Helpers de captura (`lib/captura-foto.ts`)

**Files:**
- Test: `lib/captura-foto.test.mjs`
- Create: `lib/captura-foto.ts`

- [ ] **Step 1.1: Teste (falhando)**

Criar `lib/captura-foto.test.mjs`:

```js
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
```

- [ ] **Step 1.2: Rodar e ver falhar**

Run: `pnpm test lib/captura-foto.test.mjs` — Expected: FAIL (ENOENT `lib/captura-foto.ts`).

- [ ] **Step 1.3: Implementar**

Criar `lib/captura-foto.ts`:

```ts
/**
 * Captura de foto pela webcam: recorte quadrado central do frame do vídeo.
 * Tipos estruturais mínimos para os testes stubarem vídeo e canvas sem DOM.
 */

export interface FonteVideo {
  videoWidth: number;
  videoHeight: number;
}

export interface ContextoCaptura {
  drawImage(
    fonte: FonteVideo,
    sx: number, sy: number, sw: number, sh: number,
    dx: number, dy: number, dw: number, dh: number
  ): void;
}

export interface CanvasCaptura {
  width: number;
  height: number;
  getContext(tipo: "2d"): ContextoCaptura | null;
  toBlob(callback: (blob: Blob | null) => void, tipo?: string, qualidade?: number): void;
}

export function recorteQuadrado(largura: number, altura: number): { sx: number; sy: number; lado: number } {
  const lado = Math.min(largura, altura);
  return {
    sx: Math.floor((largura - lado) / 2),
    sy: Math.floor((altura - lado) / 2),
    lado,
  };
}

/** Congela o frame atual do vídeo num JPEG quadrado (ladoDestino × ladoDestino). */
export function capturarQuadrado(
  video: FonteVideo,
  canvas: CanvasCaptura,
  ladoDestino = 512
): Promise<Blob> {
  const { sx, sy, lado } = recorteQuadrado(video.videoWidth, video.videoHeight);
  canvas.width = ladoDestino;
  canvas.height = ladoDestino;
  const contexto = canvas.getContext("2d");
  if (!contexto) return Promise.reject(new Error("Canvas 2D indisponível neste navegador"));
  contexto.drawImage(video, sx, sy, lado, lado, 0, 0, ladoDestino, ladoDestino);
  return new Promise((resolver, rejeitar) => {
    canvas.toBlob(
      (blob) => (blob ? resolver(blob) : rejeitar(new Error("Falha ao gerar a imagem"))),
      "image/jpeg",
      0.9
    );
  });
}
```

- [ ] **Step 1.4: Rodar e ver passar**

Run: `pnpm test lib/captura-foto.test.mjs` — Expected: PASS (3 testes).

- [ ] **Step 1.5: Commit**

```bash
git add lib/captura-foto.ts lib/captura-foto.test.mjs
git commit -m "feat(foto): helpers de recorte e captura quadrada da webcam"
```

---

### Task 2: `CapturarFotoModal`

**Files:**
- Test: `components/alunos/capturar-foto-modal.test.mjs`
- Create: `components/alunos/capturar-foto-modal.tsx`

- [ ] **Step 2.1: Teste (falhando)**

Criar `components/alunos/capturar-foto-modal.test.mjs`:

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
  const arquivo = new URL("./capturar-foto-modal.tsx", import.meta.url);
  if (!existsSync(arquivo)) return undefined;
  const codigo = ts.transpileModule(readFileSync(arquivo, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    URL: globais.URL ?? URL,
    ...globais,
    require(id) {
      if (id === "react") return react;
      if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
      if (id === "@/lib/toast") return { useToast: () => globais.toast ?? { success() {}, error() {} } };
      if (id === "@/lib/captura-foto") return { capturarQuadrado: async () => ({ falso: true }) };
      if (id === "@/components/ui/button") return { Button: ({ children, variant, size, ...props }) => React.createElement("button", props, children) };
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.CapturarFotoModal;
}

test("render inicial mostra o estado de câmera e o fallback de arquivo", () => {
  const Modal = componente();
  assert.equal(typeof Modal, "function");
  const html = renderToStaticMarkup(React.createElement(Modal, {
    alunoId: "a1", nomeAluno: "Alícia Quintela", onClose() {},
  }));
  assert.ok(html.includes("Foto de Alícia Quintela"));
  assert.ok(html.includes("Abrindo a câmera"));
  assert.ok(html.includes("Enviar arquivo"));
});

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
      estado = 0;
      efeito = 0;
      pendentes = [];
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

test("sem câmera disponível mostra o aviso e o envio de arquivo funciona de ponta a ponta", async () => {
  class FormDataFalso {
    constructor() { this.dados = new Map(); }
    set(chave, valor) { this.dados.set(chave, valor); }
  }
  const chamadas = [];
  const toasts = [];
  let atualizado = null;
  let fechou = 0;
  const hooks = hooksFalsos();
  const Modal = componente(hooks.react, {
    navigator: {}, // sem mediaDevices: câmera indisponível
    FormData: FormDataFalso,
    fetch: async (url, opcoes) => {
      chamadas.push({ url, body: opcoes.body });
      return { ok: true, json: async () => ({ ok: true, url: "/api/uploads/x/alunos/a1/f.jpg" }) };
    },
    toast: { success: (t) => toasts.push(t), error: (t, d) => toasts.push(`ERRO ${t}: ${d}`) },
  });
  const props = {
    alunoId: "a1", nomeAluno: "Alícia Quintela",
    onClose: () => { fechou += 1; }, onAtualizado: (url) => { atualizado = url; },
  };

  let arvore = hooks.renderizar(Modal, props);
  arvore = hooks.renderizar(Modal, props);
  assert.ok(contemTexto(arvore, "não dá acesso à câmera"));
  assert.equal(encontrar(arvore, (no) => contemTexto(no, "Tirar foto") && typeof no.props?.onClick === "function"), undefined);

  const arquivoFalso = { name: "foto.png", size: 10 };
  encontrar(arvore, (no) => no.type === "input" && no.props?.type === "file")
    .props.onChange({ target: { files: [arquivoFalso], value: "" } });
  await aguardar();

  assert.equal(chamadas[0].url, "/api/upload/foto-aluno");
  assert.equal(chamadas[0].body.dados.get("alunoId"), "a1");
  assert.equal(chamadas[0].body.dados.get("file"), arquivoFalso);
  assert.equal(atualizado, "/api/uploads/x/alunos/a1/f.jpg");
  assert.equal(fechou, 1);
  assert.ok(toasts.includes("Foto atualizada!"));
});

test("upload com erro mantém o modal aberto e avisa", async () => {
  class FormDataFalso {
    constructor() { this.dados = new Map(); }
    set(chave, valor) { this.dados.set(chave, valor); }
  }
  const toasts = [];
  let fechou = 0;
  const hooks = hooksFalsos();
  const Modal = componente(hooks.react, {
    navigator: {},
    FormData: FormDataFalso,
    fetch: async () => ({ ok: false, json: async () => ({ error: "Imagem vazia ou maior que 5 MB" }) }),
    toast: { success() {}, error: (t, d) => toasts.push(`${t}: ${d}`) },
  });
  const props = { alunoId: "a1", nomeAluno: "Alícia", onClose: () => { fechou += 1; } };

  let arvore = hooks.renderizar(Modal, props);
  arvore = hooks.renderizar(Modal, props);
  encontrar(arvore, (no) => no.type === "input" && no.props?.type === "file")
    .props.onChange({ target: { files: [{ name: "x.png" }], value: "" } });
  await aguardar();

  assert.equal(fechou, 0);
  assert.ok(toasts.some((texto) => texto.includes("5 MB")));
});
```

- [ ] **Step 2.2: Rodar e ver falhar**

Run: `pnpm test components/alunos/capturar-foto-modal.test.mjs` — Expected: FAIL (`typeof Modal` é `undefined`).

- [ ] **Step 2.3: Implementar**

Criar `components/alunos/capturar-foto-modal.tsx`:

```tsx
"use client";

import * as React from "react";
import { Camera, Loader2, RefreshCcw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { capturarQuadrado } from "@/lib/captura-foto";

interface Props {
  alunoId: string;
  nomeAluno: string;
  onClose: () => void;
  onAtualizado?: (url: string) => void;
}

type EstadoCamera = "iniciando" | "ativa" | "erro";

function mensagemErroCamera(erro: unknown): string {
  const nome = (erro as { name?: string } | null)?.name;
  if (nome === "NotAllowedError") {
    return "O navegador bloqueou a câmera. Libere a permissão no cadeado da barra de endereço ou envie um arquivo.";
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") {
    return "Nenhuma câmera foi encontrada neste computador. Envie um arquivo.";
  }
  return "Não deu para abrir a câmera. Envie um arquivo.";
}

/**
 * Tira a foto do aluno pela webcam (recorte quadrado) ou recebe um arquivo —
 * os dois caminhos sobem pela mesma rota de upload já auditada. Montar o
 * componente abre o modal; a câmera desliga ao fechar/desmontar.
 */
export function CapturarFotoModal({ alunoId, nomeAluno, onClose, onAtualizado }: Props) {
  const toast = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [camera, setCamera] = React.useState<EstadoCamera>("iniciando");
  const [erroCamera, setErroCamera] = React.useState("");
  const [capturada, setCapturada] = React.useState<{ blob: Blob; url: string } | null>(null);
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => {
    let ativo = true;
    const iniciar = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCamera("erro");
        setErroCamera("Este navegador não dá acesso à câmera. Envie um arquivo.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1024 }, height: { ideal: 1024 } },
          audio: false,
        });
        if (!ativo) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamera("ativa");
      } catch (erro) {
        if (!ativo) return;
        setCamera("erro");
        setErroCamera(mensagemErroCamera(erro));
      }
    };
    void iniciar();
    return () => {
      ativo = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // A prévia congelada usa um object URL; sem revogar, cada captura vaza memória.
  React.useEffect(() => {
    return () => {
      if (capturada) URL.revokeObjectURL(capturada.url);
    };
  }, [capturada]);

  const tirarFoto = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    try {
      const blob = await capturarQuadrado(video, document.createElement("canvas"));
      setCapturada({ blob, url: URL.createObjectURL(blob) });
    } catch {
      toast.error("Não foi possível capturar", "Tente de novo ou envie um arquivo.");
    }
  };

  const enviar = async (file: File) => {
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.set("alunoId", alunoId);
      fd.set("file", file);
      const resposta = await fetch("/api/upload/foto-aluno", { method: "POST", body: fd });
      const data = (await resposta.json().catch(() => ({}))) as { url?: unknown; error?: unknown };
      if (!resposta.ok) {
        toast.error("Erro ao salvar a foto", typeof data.error === "string" ? data.error : "Tente de novo");
        return;
      }
      toast.success("Foto atualizada!", nomeAluno);
      onAtualizado?.(String(data.url));
      onClose();
    } catch (erro) {
      toast.error("Erro de conexão", String(erro));
    } finally {
      setEnviando(false);
    }
  };

  const usarCapturada = () => {
    if (!capturada) return;
    void enviar(new File([capturada.blob], "webcam.jpg", { type: "image/jpeg" }));
  };

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void enviar(file as File);
    event.target.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !enviando && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="capturar-foto-titulo"
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-popover shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h2 id="capturar-foto-titulo" className="font-bold">Foto de {nomeAluno}</h2>
          </div>
          <button
            type="button"
            onClick={() => !enviando && onClose()}
            className="rounded-md p-2 hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
            {/* Prévia espelhada como um espelho; a foto gravada sai sem espelho. */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover -scale-x-100"
            />
            {capturada && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capturada.url}
                alt="Prévia da foto capturada"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {camera === "iniciando" && !capturada && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white">
                <Loader2 className="h-4 w-4 animate-spin" /> Abrindo a câmera…
              </div>
            )}
            {camera === "erro" && !capturada && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
                {erroCamera}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {camera === "ativa" && !capturada && (
              <Button type="button" onClick={() => void tirarFoto()}>
                <Camera className="mr-2 h-4 w-4" /> Tirar foto
              </Button>
            )}
            {capturada && (
              <>
                <Button type="button" onClick={usarCapturada} disabled={enviando}>
                  {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Usar esta foto
                </Button>
                <Button type="button" variant="outline" onClick={() => setCapturada(null)} disabled={enviando}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Tirar outra
                </Button>
              </>
            )}
            <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()} disabled={enviando}>
              {enviando && !capturada && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" /> Enviar arquivo
            </Button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPickFile}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2.4: Rodar e ver passar**

Run: `pnpm test components/alunos/capturar-foto-modal.test.mjs` — Expected: PASS (3 testes).

- [ ] **Step 2.5: Commit**

```bash
git add components/alunos/capturar-foto-modal.tsx components/alunos/capturar-foto-modal.test.mjs
git commit -m "feat(foto): modal de captura pela webcam com fallback de arquivo"
```

---

### Task 3: `UploadFotoAluno` abre o modal

**Files:**
- Test: `components/alunos/upload-foto.test.mjs`
- Modify: `components/alunos/upload-foto.tsx` (reescrita: upload migra pro modal)

- [ ] **Step 3.1: Teste (falhando)**

Criar `components/alunos/upload-foto.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const ts = require("typescript");

const ModalStub = (props) => React.createElement("div", { "data-modal-captura": props.alunoId });

function componente(react = React) {
  const codigo = ts.transpileModule(readFileSync(new URL("./upload-foto.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(codigo, {
    exports,
    require(id) {
      if (id === "react") return react;
      if (id === "react/jsx-runtime" || id === "lucide-react") return require(id);
      if (id === "@/components/alunos/capturar-foto-modal") return { CapturarFotoModal: ModalStub };
      if (id === "@/lib/utils") return require("./upload-foto-utils-stub.cjs");
      if (id === "@/components/ui/avatar") {
        return {
          Avatar: ({ children, ...props }) => React.createElement("span", props, children),
          AvatarImage: (props) => React.createElement("img", props),
          AvatarFallback: ({ children, ...props }) => React.createElement("span", props, children),
        };
      }
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.UploadFotoAluno;
}

function hooksFalsos() {
  const estados = [];
  let estado = 0, pendentes = [], dependencias = [];
  let efeito = 0;
  return {
    react: {
      ...React,
      useState(inicial) {
        const indice = estado++;
        if (!(indice in estados)) estados[indice] = typeof inicial === "function" ? inicial() : inicial;
        return [estados[indice], (valor) => { estados[indice] = typeof valor === "function" ? valor(estados[indice]) : valor; }];
      },
      useEffect(callback, deps) {
        const indice = efeito++;
        if (!dependencias[indice] || deps.some((valor, i) => !Object.is(valor, dependencias[indice][i]))) {
          dependencias[indice] = deps;
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

test("mostra a foto atual e o botão descreve a ação", () => {
  const Upload = componente();
  const html = renderToStaticMarkup(React.createElement(Upload, {
    alunoId: "a1", nomeAluno: "Alícia Quintela", fotoAtual: "/api/uploads/x/alunos/a1/f.jpg",
  }));
  assert.ok(html.includes("/api/uploads/x/alunos/a1/f.jpg"));
  assert.ok(html.includes("Tirar ou enviar foto de Alícia Quintela"));
});

test("clicar no botão de câmera abre o CapturarFotoModal com o aluno certo", () => {
  const hooks = hooksFalsos();
  const Upload = componente(hooks.react);
  const props = { alunoId: "a1", nomeAluno: "Alícia Quintela" };
  let arvore = hooks.renderizar(Upload, props);
  assert.equal(encontrar(arvore, (no) => no.type === ModalStub), undefined);
  encontrar(arvore, (no) => no.type === "button").props.onClick();
  arvore = hooks.renderizar(Upload, props);
  const modal = encontrar(arvore, (no) => no.type === ModalStub);
  assert.equal(modal.props.alunoId, "a1");
});
```

E criar o stub de utils `components/alunos/upload-foto-utils-stub.cjs`:

```js
module.exports = {
  initials: (nome) => String(nome).split(/\s+/).map((parte) => parte[0]).join("").slice(0, 2).toUpperCase(),
  cn: (...classes) => classes.filter(Boolean).join(" "),
};
```

- [ ] **Step 3.2: Rodar e ver falhar**

Run: `pnpm test components/alunos/upload-foto.test.mjs` — Expected: FAIL (aria-label não existe ainda / modal não abre).

- [ ] **Step 3.3: Reescrever `components/alunos/upload-foto.tsx`**

```tsx
"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";
import { CapturarFotoModal } from "@/components/alunos/capturar-foto-modal";

interface UploadFotoProps {
  alunoId: string;
  nomeAluno: string;
  fotoAtual?: string | null;
  cor?: string;
  size?: "md" | "lg" | "xl";
  onAtualizado?: (url: string) => void;
}

const SIZE_CLASSES = {
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-32 w-32 text-3xl",
};

export function UploadFotoAluno({
  alunoId,
  nomeAluno,
  fotoAtual,
  cor,
  size = "lg",
  onAtualizado,
}: UploadFotoProps) {
  const [modalAberto, setModalAberto] = React.useState(false);
  const [fotoLocal, setFotoLocal] = React.useState<string | null>(fotoAtual ?? null);

  React.useEffect(() => {
    setFotoLocal(fotoAtual ?? null);
  }, [fotoAtual]);

  return (
    <div className="relative inline-block group">
      <Avatar className={cn(SIZE_CLASSES[size], "ring-2 ring-background shadow")}>
        {fotoLocal && <AvatarImage src={fotoLocal} alt={nomeAluno} />}
        <AvatarFallback
          className="font-bold"
          style={cor ? { backgroundColor: cor + "30", color: cor } : undefined}
        >
          {initials(nomeAluno)}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        title="Tirar ou enviar foto"
        aria-label={`Tirar ou enviar foto de ${nomeAluno}`}
        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      >
        <Camera className="h-4 w-4" />
      </button>
      {modalAberto && (
        <CapturarFotoModal
          alunoId={alunoId}
          nomeAluno={nomeAluno}
          onClose={() => setModalAberto(false)}
          onAtualizado={(url) => {
            setFotoLocal(url);
            onAtualizado?.(url);
          }}
        />
      )}
    </div>
  );
}
```

(O `fazerUpload`/input/toast saem daqui — moram no modal agora.)

- [ ] **Step 3.4: Rodar, typecheck e ver passar**

Run: `pnpm typecheck && pnpm test components/alunos/upload-foto.test.mjs` — Expected: PASS (2 testes), sem erro de tipo.

- [ ] **Step 3.5: Commit**

```bash
git add components/alunos/upload-foto.tsx components/alunos/upload-foto.test.mjs components/alunos/upload-foto-utils-stub.cjs
git commit -m "feat(foto): botão de câmera abre captura por webcam no perfil e pós-matrícula"
```

---

### Task 4: Avatar da listagem com captura

**Files:**
- Test: `components/alunos/avatar-aluno-lista.test.mjs`
- Create: `components/alunos/avatar-aluno-lista.tsx`
- Modify: `app/(dashboard)/alunos/page.tsx`

- [ ] **Step 4.1: Teste (falhando)**

Criar `components/alunos/avatar-aluno-lista.test.mjs`:

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
  const arquivo = new URL("./avatar-aluno-lista.tsx", import.meta.url);
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
      if (id === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children), __esModule: true };
      if (id === "@/lib/utils") return require("./upload-foto-utils-stub.cjs");
      if (id === "@/components/ui/avatar") {
        return {
          Avatar: ({ children, ...props }) => React.createElement("span", props, children),
          AvatarImage: (props) => React.createElement("img", props),
          AvatarFallback: ({ children, ...props }) => React.createElement("span", props, children),
        };
      }
      throw new Error(`Dependência inesperada: ${id}`);
    },
  });
  return exports.AvatarAlunoLista;
}

const base = { id: "a1", nome: "Alícia Quintela" };

test("com foto renderiza a imagem num link para o aluno", () => {
  const AvatarLista = componente();
  assert.equal(typeof AvatarLista, "function");
  const html = renderToStaticMarkup(React.createElement(AvatarLista, {
    aluno: { ...base, foto: "/api/uploads/x/alunos/a1/f.jpg" },
    href: "/alunos/a1", podeGerenciar: true, onCapturar() {},
  }));
  assert.ok(html.includes("/api/uploads/x/alunos/a1/f.jpg"));
  assert.ok(html.includes('href="/alunos/a1"'));
  assert.ok(!html.includes("Tirar foto"));
});

test("sem foto e com permissão vira botão de captura identificado pelo aluno", () => {
  const AvatarLista = componente();
  const html = renderToStaticMarkup(React.createElement(AvatarLista, {
    aluno: base, href: "/alunos/a1", podeGerenciar: true, onCapturar() {},
  }));
  assert.ok(html.includes("Tirar foto de Alícia Quintela"));
  assert.ok(html.includes("<button"));
});

test("sem permissão fica só as iniciais, sem botão nem link de captura", () => {
  const AvatarLista = componente();
  const html = renderToStaticMarkup(React.createElement(AvatarLista, {
    aluno: base, href: "/pedagogico/a1", podeGerenciar: false, onCapturar() {},
  }));
  assert.ok(html.includes("AQ"));
  assert.ok(!html.includes("<button"));
  assert.ok(!html.includes("Tirar foto"));
});
```

- [ ] **Step 4.2: Rodar e ver falhar**

Run: `pnpm test components/alunos/avatar-aluno-lista.test.mjs` — Expected: FAIL (`typeof AvatarLista` é `undefined`).

- [ ] **Step 4.3: Implementar `components/alunos/avatar-aluno-lista.tsx`**

```tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import type { Aluno } from "@/lib/types";

type AlunoResumo = Pick<Aluno, "id" | "nome" | "foto">;

interface Props {
  aluno: AlunoResumo;
  /** Destino do clique quando há foto (perfil ou visão pedagógica). */
  href: string;
  cor?: string;
  podeGerenciar: boolean;
  onCapturar: (aluno: AlunoResumo) => void;
}

/**
 * Avatar da listagem: mostra a foto de quem tem; para aluno sem foto, quem
 * gerencia vê um botão de captura rápida (webcam/arquivo) sem sair da lista.
 */
export function AvatarAlunoLista({ aluno, href, cor, podeGerenciar, onCapturar }: Props) {
  const fallback = (
    <AvatarFallback
      className="text-xs"
      style={{ backgroundColor: (cor ?? "#888") + "30", color: cor ?? "#888" }}
    >
      {initials(aluno.nome)}
    </AvatarFallback>
  );

  if (aluno.foto) {
    return (
      <Link href={href} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={aluno.foto} alt="" />
          {fallback}
        </Avatar>
      </Link>
    );
  }

  if (!podeGerenciar) {
    return <Avatar className="h-8 w-8 shrink-0">{fallback}</Avatar>;
  }

  return (
    <button
      type="button"
      onClick={() => onCapturar(aluno)}
      title="Tirar foto do aluno"
      aria-label={`Tirar foto de ${aluno.nome}`}
      className="relative shrink-0"
    >
      <Avatar className="h-8 w-8">{fallback}</Avatar>
      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
        <Camera className="h-2.5 w-2.5" />
      </span>
    </button>
  );
}
```

- [ ] **Step 4.4: Rodar e ver passar**

Run: `pnpm test components/alunos/avatar-aluno-lista.test.mjs` — Expected: PASS (3 testes).

- [ ] **Step 4.5: Wiring na página**

Em `app/(dashboard)/alunos/page.tsx`:

(a) Imports — junto dos outros de `components/alunos`:

```tsx
import { CapturarFotoModal } from "@/components/alunos/capturar-foto-modal";
import { AvatarAlunoLista } from "@/components/alunos/avatar-aluno-lista";
```

(b) Estado — junto de `trocandoSala`:

```tsx
const [fotoCaptura, setFotoCaptura] = React.useState<Aluno | null>(null);
```

(c) Montar o modal — logo após o bloco do `TrocarSalaModal`:

```tsx
{podeGerenciar && fotoCaptura && (
  <CapturarFotoModal
    alunoId={fotoCaptura.id}
    nomeAluno={fotoCaptura.nome}
    onClose={() => setFotoCaptura(null)}
    onAtualizado={() => window.dispatchEvent(new CustomEvent("semente:changed:alunos"))}
  />
)}
```

(d) Célula do aluno — substituir o bloco atual (o `<Link>` que envolve Avatar + nome,
linhas ~495-525) por avatar irmão do link do nome:

Antes:
```tsx
<TableCell>
  <Link
    href={podeGerenciar ? `/alunos/${a.id}` : `/pedagogico/${a.id}`}
    className="flex items-center gap-3 hover:underline"
  >
    <Avatar className="h-8 w-8">
      <AvatarFallback
        className="text-xs"
        style={{
          backgroundColor: (turma?.cor ?? "#888") + "30",
          color: turma?.cor ?? "#888",
        }}
      >
        {initials(a.nome)}
      </AvatarFallback>
    </Avatar>
    <div>
      <div className="font-medium">{a.nome}</div>
      <div className="text-xs text-muted-foreground">
        {a.bilingue && (
          <Badge variant="info" className="text-[10px] py-0">
            Bilíngue
          </Badge>
        )}
      </div>
    </div>
  </Link>
</TableCell>
```

Depois:
```tsx
<TableCell>
  <div className="flex items-center gap-3">
    <AvatarAlunoLista
      aluno={a}
      href={podeGerenciar ? `/alunos/${a.id}` : `/pedagogico/${a.id}`}
      cor={turma?.cor}
      podeGerenciar={podeGerenciar}
      onCapturar={() => setFotoCaptura(a)}
    />
    <Link
      href={podeGerenciar ? `/alunos/${a.id}` : `/pedagogico/${a.id}`}
      className="hover:underline"
    >
      <div className="font-medium">{a.nome}</div>
      <div className="text-xs text-muted-foreground">
        {a.bilingue && (
          <Badge variant="info" className="text-[10px] py-0">
            Bilíngue
          </Badge>
        )}
      </div>
    </Link>
  </div>
</TableCell>
```

Se `Avatar`/`AvatarFallback`/`initials` ficarem sem uso na página após a troca,
remover dos imports (conferir com `pnpm typecheck`/lint — `initials` ainda é usado?
buscar antes de remover).

- [ ] **Step 4.6: Typecheck + testes**

Run: `pnpm typecheck && pnpm test components/alunos/avatar-aluno-lista.test.mjs` — Expected: PASS, sem erro de tipo.

- [ ] **Step 4.7: Commit**

```bash
git add components/alunos/avatar-aluno-lista.tsx components/alunos/avatar-aluno-lista.test.mjs "app/(dashboard)/alunos/page.tsx"
git commit -m "feat(foto): listagem mostra foto e captura rápida para aluno sem foto"
```

---

### Task 5: Permissions-Policy libera a câmera para o próprio site

**Files:**
- Test: `next.config.test.mjs` (raiz)
- Modify: `next.config.ts:33`

- [ ] **Step 5.1: Teste (falhando)**

Criar `next.config.test.mjs` (raiz do repo):

```js
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
```

- [ ] **Step 5.2: Rodar e ver falhar**

Run: `pnpm test next.config.test.mjs` — Expected: FAIL (`camera=(self)` ausente).

- [ ] **Step 5.3: Editar `next.config.ts`**

Trocar (linha 31-34):
```ts
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
```
por:
```ts
  {
    // camera=(self): a captura de foto do aluno usa a webcam no próprio app;
    // iframes/terceiros continuam sem acesso, e o resto segue fechado.
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
```

- [ ] **Step 5.4: Rodar e ver passar**

Run: `pnpm test next.config.test.mjs` — Expected: PASS (2 testes).

- [ ] **Step 5.5: Commit**

```bash
git add next.config.ts next.config.test.mjs
git commit -m "fix(headers): Permissions-Policy camera=(self) para a captura de foto"
```

---

### Task 6: Verificação final

- [ ] **Step 6.1:** `pnpm typecheck && pnpm test` — tudo verde (os testes antigos continuam passando; o pós-matrícula usa `UploadFotoAluno` sem mudança de contrato).
- [ ] **Step 6.2:** Revisar `git diff main --stat` contra os critérios de aceite da spec (webcam nos 3 pontos, fallback de arquivo, foto na listagem, nada para perfis sem permissão, câmera desliga ao fechar).
