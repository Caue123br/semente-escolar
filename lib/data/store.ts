"use client";

/**
 * Store cliente que conversa exclusivamente com as rotas /api.
 * Dados escolares nunca são persistidos no navegador como fallback.
 */

import * as React from "react";
import { formatarErro } from "@/lib/format-error";
import { useToast } from "@/lib/toast";
import type {
  Aluno,
  AvaliacaoPedagogica,
  Mensalidade,
  Venda,
  ItemEstoque,
  Turma,
  KanbanCard,
  NotaFiscal,
} from "@/lib/types";
import type { Despesa } from "@/lib/mock-data/despesas";
import type { EventoCalendario } from "@/lib/mock-data/calendario";
import type { Funcionario } from "@/lib/mock-data/rh";
import type { Livro, Emprestimo } from "@/lib/mock-data/biblioteca";
import type { BebeBercario, RegistroBercario } from "@/lib/mock-data/bercario";
import type { DiaCardapio } from "@/lib/mock-data/cardapio";
import type { RotaTransporte } from "@/lib/mock-data/transporte";
import type { Lead } from "@/lib/mock-data/crm";

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

export interface Reserva {
  id: string;
  espaco: string;
  data: string;
  horaInicio?: string;
  horaFim?: string;
  responsavel?: string;
  motivo?: string;
  status: string;
}

export interface ItemPatrimonio {
  id: string;
  item: string;
  categoria: string;
  local: string;
  valor: number;
  dataCompra: string;
  estado: string;
  responsavel: string;
}

export interface RegistroFrequencia {
  id: string;
  alunoId: string;
  data: string;
  presente: boolean;
  justificativa?: string;
}

type Entidades = {
  alunos: Aluno[];
  turmas: Turma[];
  mensalidades: Mensalidade[];
  despesas: Despesa[];
  vendas: Venda[];
  estoque: ItemEstoque[];
  eventos: EventoCalendario[];
  funcionarios: Funcionario[];
  muralPosts: MuralPost[];
  kanban: KanbanCard[];
  bibliotecaLivros: Livro[];
  bibliotecaEmprestimos: Emprestimo[];
  bercarioBebes: BebeBercario[];
  bercarioRegistros: RegistroBercario[];
  cardapio: DiaCardapio[];
  reservas: Reserva[];
  transporte: RotaTransporte[];
  patrimonio: ItemPatrimonio[];
  crm: Lead[];
  notasFiscais: NotaFiscal[];
  frequencia: RegistroFrequencia[];
  avaliacoes: AvaliacaoPedagogica[];
};

// Quais entidades têm endpoint /api/<chave>/
const COM_API: Partial<Record<keyof Entidades, string>> = {
  alunos: "/api/alunos",
  turmas: "/api/turmas",
  mensalidades: "/api/mensalidades",
  despesas: "/api/despesas",
  vendas: "/api/vendas",
  estoque: "/api/estoque",
  eventos: "/api/eventos",
  funcionarios: "/api/funcionarios",
  muralPosts: "/api/mural-posts",
  kanban: "/api/kanban",
  bibliotecaLivros: "/api/biblioteca-livros",
  bibliotecaEmprestimos: "/api/biblioteca-emprestimos",
  bercarioBebes: "/api/bercario-bebes",
  bercarioRegistros: "/api/bercario-registros",
  cardapio: "/api/cardapio",
  reservas: "/api/reservas",
  transporte: "/api/transporte",
  patrimonio: "/api/patrimonio",
  crm: "/api/crm",
  notasFiscais: "/api/notas-fiscais",
  frequencia: "/api/frequencia",
  avaliacoes: "/api/avaliacoes",
};

// ----------- API helpers -----------
type ApiPayload = {
  error?: unknown;
  items?: unknown;
  [key: string]: unknown;
};

async function lerResposta(r: Response): Promise<ApiPayload> {
  const data = (await r.json().catch(() => ({}))) as ApiPayload;
  if (!r.ok) {
    const mensagem = typeof data.error === "string"
      ? data.error
      : `O servidor respondeu com status ${r.status}`;
    throw new Error(mensagem);
  }
  return data;
}

async function fetchApi<T>(url: string): Promise<T[]> {
  const r = await fetch(url, { cache: "no-store" });
  const data = await lerResposta(r);
  if (!Array.isArray(data.items)) {
    throw new Error("O servidor retornou uma resposta inválida");
  }
  return data.items as T[];
}

async function postApi(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return lerResposta(r);
}

async function deleteApi(url: string) {
  const r = await fetch(url, { method: "DELETE" });
  return lerResposta(r);
}

async function patchApi(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return lerResposta(r);
}

// ----------- API pública (CRUD) -----------
export function useEntidade<K extends keyof Entidades>(
  chave: K,
  options: { habilitado?: boolean } = {}
): {
  items: Entidades[K];
  add: (item: Entidades[K][number]) => Promise<void>;
  update: (id: string, patch: Partial<Entidades[K][number]>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
  carregando: boolean;
  erro: string | null;
} {
  const habilitado = options.habilitado ?? true;
  const [items, setItems] = React.useState<Entidades[K]>([] as unknown as Entidades[K]);
  const [carregando, setCarregando] = React.useState(habilitado);
  const [erro, setErro] = React.useState<string | null>(null);
  const apiUrl = habilitado ? COM_API[chave] : undefined;
  const toast = useToast();
  const versaoRequisicao = React.useRef(0);

  const carregar = React.useCallback(async () => {
    const versao = ++versaoRequisicao.current;
    if (!habilitado) {
      setItems([] as unknown as Entidades[K]);
      setErro(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    if (apiUrl) {
      try {
        const data = await fetchApi<Entidades[K][number]>(apiUrl);
        if (versao !== versaoRequisicao.current) return;
        setItems(data as Entidades[K]);
        setErro(null);
        setCarregando(false);
        return;
      } catch (e) {
        if (versao !== versaoRequisicao.current) return;
        console.warn(`[Escola Modelo] API indisponível para ${chave}`, e);
        setErro(formatarErro(e));
      }
    }
    if (versao === versaoRequisicao.current) setCarregando(false);
  }, [apiUrl, chave, habilitado]);

  React.useEffect(() => {
    void carregar();
    if (!habilitado) {
      return () => {
        versaoRequisicao.current += 1;
      };
    }
    const handler = () => carregar();
    window.addEventListener(`semente:changed:${chave}`, handler);
    return () => {
      versaoRequisicao.current += 1;
      window.removeEventListener(`semente:changed:${chave}`, handler);
    };
  }, [chave, carregar, habilitado]);

  const add = async (item: Entidades[K][number]) => {
    if (!apiUrl) return;
    try {
      const resposta = await postApi(apiUrl, item);
      if (resposta.item && typeof resposta.item === "object") {
        setItems((anteriores) => [
          resposta.item as Entidades[K][number],
          ...(anteriores as unknown[]),
        ] as Entidades[K]);
      }
      window.dispatchEvent(new CustomEvent(`semente:changed:${chave}`));
    } catch (e) {
      console.warn(`[Escola Modelo] POST falhou`, e);
      toast.error("Não foi possível salvar", formatarErro(e));
      throw e;
    }
  };

  const update = async (id: string, patch: Partial<Entidades[K][number]>) => {
    if (!apiUrl) return;
    try {
      await patchApi(`${apiUrl}/${id}`, patch);
      window.dispatchEvent(new CustomEvent(`semente:changed:${chave}`));
    } catch (e) {
      console.warn(`[Escola Modelo] PATCH falhou`, e);
      toast.error("Não foi possível salvar a alteração", formatarErro(e));
      throw e;
    }
  };

  const remove = async (id: string) => {
    if (!apiUrl) return;
    try {
      await deleteApi(`${apiUrl}/${id}`);
      window.dispatchEvent(new CustomEvent(`semente:changed:${chave}`));
    } catch (e) {
      console.warn(`[Escola Modelo] DELETE falhou`, e);
      toast.error("Não foi possível remover", formatarErro(e));
      throw e;
    }
  };

  const reset = () => void carregar();

  return { items, add, update, remove, reset, carregando, erro };
}

export function getBackendMode(): "postgresql" {
  return "postgresql";
}

/** Remove apenas caches legados que versões antigas gravavam no navegador. */
export function resetTudo() {
  if (typeof window === "undefined") return;
  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) window.localStorage.removeItem(key);
  }
  window.location.reload();
}
