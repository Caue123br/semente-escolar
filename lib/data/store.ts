"use client";

/**
 * Data store híbrido com 3 níveis de backend:
 * 1. Supabase (se configurado em .env.local)
 * 2. SQLite via API routes (modo padrão — persiste no servidor)
 * 3. localStorage (fallback se API offline)
 *
 * O componente continua usando useEntidade("alunos") normalmente.
 */

import * as React from "react";
import { alunos as alunosSeed } from "@/lib/mock-data/alunos";
import { turmas as turmasSeed } from "@/lib/mock-data/turmas";
import { mensalidadesJunho as mensalidadesSeed } from "@/lib/mock-data/financeiro";
import { vendas as vendasSeed } from "@/lib/mock-data/vendas";
import { despesas as despesasSeed } from "@/lib/mock-data/despesas";
import { itensEstoque as estoqueSeed } from "@/lib/mock-data/estoque";
import { eventos as eventosSeed } from "@/lib/mock-data/calendario";
import { funcionarios as funcionariosSeed } from "@/lib/mock-data/rh";
import type { Aluno, Mensalidade, Venda, ItemEstoque } from "@/lib/types";
import type { Despesa } from "@/lib/mock-data/despesas";
import type { EventoCalendario } from "@/lib/mock-data/calendario";
import type { Funcionario } from "@/lib/mock-data/rh";

const STORAGE_PREFIX = "semente:data:";

export interface MuralPost {
  id: string;
  autor: string;
  cargo: string;
  tipo: "Importante" | "Pedagógico" | "Atividade" | "Avisos" | "Evento";
  titulo: string;
  conteudo: string;
  data: string;
  likes: number;
  comentarios: number;
  fixado: boolean;
}

type Entidades = {
  alunos: Aluno[];
  turmas: typeof turmasSeed;
  mensalidades: Mensalidade[];
  despesas: Despesa[];
  vendas: Venda[];
  estoque: ItemEstoque[];
  eventos: EventoCalendario[];
  funcionarios: Funcionario[];
  muralPosts: MuralPost[];
};

// Quais entidades têm endpoint /api/<chave>/
const COM_API: Partial<Record<keyof Entidades, string>> = {
  alunos: "/api/alunos",
  eventos: "/api/eventos",
  muralPosts: "/api/mural-posts",
};

const muralPostsSeed: MuralPost[] = [
  {
    id: "p1",
    autor: "Renata Andrade",
    cargo: "Direção",
    tipo: "Importante",
    fixado: true,
    titulo: "Festa Junina 2026 — Confirmem presença!",
    conteudo:
      "Famílias, nossa Festa Junina será dia 22/06 (sábado) das 10h às 16h. Teremos quadrilha das crianças, barracas de comidas típicas e muitas brincadeiras. Confirmem presença pelo WhatsApp.",
    data: "2026-06-08 14:30",
    likes: 47,
    comentarios: 12,
  },
  {
    id: "p2",
    autor: "Cláudio Vasconcelos",
    cargo: "Coordenação",
    tipo: "Pedagógico",
    fixado: false,
    titulo: "Encerramento do 2º bimestre — boletins disponíveis em 30/06",
    conteudo:
      "Pais e mães, os boletins do 2º bimestre estarão disponíveis no Portal dos Pais a partir do dia 30/06. As reuniões individuais serão agendadas via WhatsApp pelas professoras.",
    data: "2026-06-07 10:15",
    likes: 28,
    comentarios: 5,
  },
  {
    id: "p3",
    autor: "Mariana Costa",
    cargo: "Profa. Jardim II - A",
    tipo: "Atividade",
    fixado: false,
    titulo: "Projeto 'Animais da Fazenda' começa semana que vem",
    conteudo:
      "Famílias do Jardim II - A, vamos iniciar nosso projeto sobre animais da fazenda. Por favor, enviem fotos das crianças com animais (se tiverem) para o nosso painel coletivo.",
    data: "2026-06-07 18:45",
    likes: 19,
    comentarios: 8,
  },
];

const SEEDS: Entidades = {
  alunos: alunosSeed,
  turmas: turmasSeed,
  mensalidades: mensalidadesSeed,
  despesas: despesasSeed,
  vendas: vendasSeed,
  estoque: estoqueSeed,
  eventos: eventosSeed,
  funcionarios: funcionariosSeed,
  muralPosts: muralPostsSeed,
};

// ----------- localStorage helpers -----------
function readLocal<K extends keyof Entidades>(chave: K): Entidades[K] {
  if (typeof window === "undefined") return SEEDS[chave];
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + chave);
    if (raw) return JSON.parse(raw) as Entidades[K];
  } catch {}
  writeLocal(chave, SEEDS[chave]);
  return SEEDS[chave];
}

function writeLocal<K extends keyof Entidades>(chave: K, valor: Entidades[K]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_PREFIX + chave, JSON.stringify(valor));
  window.dispatchEvent(new CustomEvent(`semente:changed:${chave}`));
}

// ----------- API helpers -----------
async function fetchApi<T>(url: string): Promise<T[]> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`API ${url} retornou ${r.status}`);
  const data = (await r.json()) as { items: T[] };
  return data.items;
}

async function postApi(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${url} retornou ${r.status}`);
  return r.json();
}

async function deleteApi(url: string) {
  const r = await fetch(url, { method: "DELETE" });
  if (!r.ok) throw new Error(`DELETE ${url} retornou ${r.status}`);
  return r.json();
}

async function patchApi(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${url} retornou ${r.status}`);
  return r.json();
}

// ----------- API pública (CRUD) -----------
export function useEntidade<K extends keyof Entidades>(chave: K): {
  items: Entidades[K];
  add: (item: Entidades[K][number]) => Promise<void>;
  update: (id: string, patch: Partial<Entidades[K][number]>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
  carregando: boolean;
} {
  const [items, setItems] = React.useState<Entidades[K]>(() => SEEDS[chave]);
  const [carregando, setCarregando] = React.useState(true);
  const apiUrl = COM_API[chave];

  const carregar = React.useCallback(async () => {
    if (apiUrl) {
      try {
        const data = await fetchApi<Entidades[K][number]>(apiUrl);
        setItems(data as Entidades[K]);
        writeLocal(chave, data as Entidades[K]); // cache local
        setCarregando(false);
        return;
      } catch (e) {
        console.warn(`[Semente] API offline para ${chave}, usando localStorage`, e);
      }
    }
    setItems(readLocal(chave));
    setCarregando(false);
  }, [apiUrl, chave]);

  React.useEffect(() => {
    carregar();
    const handler = () => carregar();
    window.addEventListener(`semente:changed:${chave}`, handler);
    return () =>
      window.removeEventListener(`semente:changed:${chave}`, handler);
  }, [chave, carregar]);

  const add = async (item: Entidades[K][number]) => {
    // Otimista: atualiza UI primeiro
    setItems((prev) => [item, ...(prev as unknown[])] as Entidades[K]);
    if (apiUrl) {
      try {
        await postApi(apiUrl, item);
        window.dispatchEvent(new CustomEvent(`semente:changed:${chave}`));
        return;
      } catch (e) {
        console.warn(`[Semente] POST falhou, salvando localmente`, e);
      }
    }
    const atual = readLocal(chave);
    writeLocal(chave, [item, ...(atual as unknown[])] as Entidades[K]);
  };

  const update = async (id: string, patch: Partial<Entidades[K][number]>) => {
    setItems((prev) =>
      (prev as Array<{ id: string }>).map((it) =>
        it.id === id ? { ...it, ...patch } : it
      ) as Entidades[K]
    );
    if (apiUrl) {
      try {
        await patchApi(`${apiUrl}/${id}`, patch);
        return;
      } catch (e) {
        console.warn(`[Semente] PATCH falhou`, e);
      }
    }
    const atual = readLocal(chave) as Array<{ id: string }>;
    const novo = atual.map((it) =>
      it.id === id ? { ...it, ...patch } : it
    ) as Entidades[K];
    writeLocal(chave, novo);
  };

  const remove = async (id: string) => {
    setItems((prev) =>
      (prev as Array<{ id: string }>).filter((it) => it.id !== id) as Entidades[K]
    );
    if (apiUrl) {
      try {
        await deleteApi(`${apiUrl}/${id}`);
        return;
      } catch (e) {
        console.warn(`[Semente] DELETE falhou`, e);
      }
    }
    const atual = readLocal(chave) as Array<{ id: string }>;
    writeLocal(chave, atual.filter((it) => it.id !== id) as Entidades[K]);
  };

  const reset = () => writeLocal(chave, SEEDS[chave]);

  return { items, add, update, remove, reset, carregando };
}

export function getBackendMode(): "supabase" | "sqlite" | "localStorage" {
  // Se chegou aqui sem Supabase, e API responder, é sqlite
  return "sqlite";
}

/** Apaga TUDO do localStorage do Semente (útil pra reset da demo) */
export function resetTudo() {
  if (typeof window === "undefined") return;
  const chaves = Object.keys(SEEDS) as Array<keyof Entidades>;
  for (const k of chaves) {
    window.localStorage.removeItem(STORAGE_PREFIX + k);
  }
  window.location.reload();
}
