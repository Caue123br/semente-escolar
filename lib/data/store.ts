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
  Cobranca,
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
  cobrancas: Cobranca[];
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
  cobrancas: "/api/cobrancas",
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

/**
 * Erro de API que preserva status, código de conflito e corpo da resposta —
 * sem isso a tela perde os candidatos da duplicata e a ocupação da turma.
 */
export class ErroApi extends Error {
  readonly status: number;
  readonly codigo?: string;
  readonly payload: ApiPayload;

  constructor(mensagem: string, status: number, payload: ApiPayload) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
    this.codigo = typeof payload.codigo === "string" ? payload.codigo : undefined;
    this.payload = payload;
  }
}

/** Conflitos resolvidos pela própria tela (mostra candidatos / pede confirmação). */
const CODIGOS_TRATADOS_NA_TELA = new Set(["duplicata", "lotacao", "dados_divergentes"]);

export interface OpcoesEscrita {
  /** Vai no header Idempotency-Key: retentativa do mesmo preenchimento não cria dois registros. */
  idempotencyKey?: string;
  /** Campos extras no corpo (ex.: confirmarDuplicata / confirmarLotacao da matrícula). */
  extras?: Record<string, unknown>;
}

async function lerResposta(r: Response): Promise<ApiPayload> {
  const data = (await r.json().catch(() => ({}))) as ApiPayload;
  if (!r.ok) {
    const mensagem = typeof data.error === "string"
      ? data.error
      : `O servidor respondeu com status ${r.status}`;
    throw new ErroApi(mensagem, r.status, data);
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

function cabecalhosEscrita(opcoes: OpcoesEscrita): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opcoes.idempotencyKey) headers["Idempotency-Key"] = opcoes.idempotencyKey;
  return headers;
}

function corpoComExtras(body: unknown, extras?: Record<string, unknown>) {
  if (!extras || !body || typeof body !== "object" || Array.isArray(body)) return body;
  return { ...(body as Record<string, unknown>), ...extras };
}

async function postApi(url: string, body: unknown, opcoes: OpcoesEscrita = {}) {
  const r = await fetch(url, {
    method: "POST",
    headers: cabecalhosEscrita(opcoes),
    body: JSON.stringify(corpoComExtras(body, opcoes.extras)),
  });
  return lerResposta(r);
}

async function deleteApi(url: string) {
  const r = await fetch(url, { method: "DELETE" });
  return lerResposta(r);
}

async function patchApi(url: string, body: unknown, opcoes: OpcoesEscrita = {}) {
  const r = await fetch(url, {
    method: "PATCH",
    headers: cabecalhosEscrita(opcoes),
    body: JSON.stringify(corpoComExtras(body, opcoes.extras)),
  });
  return lerResposta(r);
}

// ----------- API pública (CRUD) -----------
export function useEntidade<K extends keyof Entidades>(
  chave: K,
  options: { habilitado?: boolean } = {}
): {
  items: Entidades[K];
  add: (
    item: Entidades[K][number],
    opcoes?: OpcoesEscrita
  ) => Promise<Entidades[K][number] | null>;
  update: (
    id: string,
    patch: Partial<Entidades[K][number]>,
    opcoes?: OpcoesEscrita
  ) => Promise<void>;
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

  const add = async (
    item: Entidades[K][number],
    opcoes: OpcoesEscrita = {}
  ): Promise<Entidades[K][number] | null> => {
    if (!apiUrl) return null;
    try {
      const resposta = await postApi(apiUrl, item, opcoes);
      // A API responde 200 com `avisoDadosDivergentes` quando a chave de
      // idempotência já gravou um registro e o conteúdo enviado agora é outro:
      // o que a pessoa acabou de digitar NÃO entrou. Isso não é sucesso, então
      // vira rejeição com código próprio — a tela mostra o que aconteceu em vez
      // de anunciar um cadastro que não houve. O payload leva o registro que
      // está gravado, para a tela poder apontar a ficha certa.
      if (resposta.avisoDadosDivergentes === true) {
        // O registro existe no servidor mas pode não estar na lista local (a
        // resposta do primeiro envio se perdeu): recarrega para ele aparecer.
        window.dispatchEvent(new CustomEvent(`semente:changed:${chave}`));
        throw new ErroApi(
          "Este envio já havia salvo o registro com os dados anteriores. A correção que você acabou de digitar não entrou.",
          200,
          { ...resposta, codigo: "dados_divergentes" }
        );
      }
      let criado: Entidades[K][number] | null = null;
      if (resposta.item && typeof resposta.item === "object") {
        const novo = resposta.item as Entidades[K][number];
        criado = novo;
        const novoId = (novo as { id?: string }).id;
        setItems((anteriores) => {
          const lista = anteriores as unknown as Array<{ id?: string }>;
          // Resposta repetida por idempotência devolve o mesmo registro: não listar duas vezes.
          const semRepetido = novoId ? lista.filter((i) => i?.id !== novoId) : lista;
          return [novo, ...semRepetido] as unknown as Entidades[K];
        });
      }
      window.dispatchEvent(new CustomEvent(`semente:changed:${chave}`));
      return criado;
    } catch (e) {
      console.warn(`[Escola Modelo] POST falhou`, e);
      const tratadoNaTela =
        e instanceof ErroApi && e.codigo !== undefined && CODIGOS_TRATADOS_NA_TELA.has(e.codigo);
      if (!tratadoNaTela) toast.error("Não foi possível salvar", formatarErro(e));
      throw e;
    }
  };

  const update = async (
    id: string,
    patch: Partial<Entidades[K][number]>,
    opcoes: OpcoesEscrita = {}
  ) => {
    if (!apiUrl) return;
    try {
      await patchApi(`${apiUrl}/${id}`, patch, opcoes);
      window.dispatchEvent(new CustomEvent(`semente:changed:${chave}`));
    } catch (e) {
      console.warn(`[Escola Modelo] PATCH falhou`, e);
      const tratadoNaTela =
        e instanceof ErroApi && e.codigo !== undefined && CODIGOS_TRATADOS_NA_TELA.has(e.codigo);
      if (!tratadoNaTela) toast.error("Não foi possível salvar a alteração", formatarErro(e));
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

/**
 * Chaves do rascunho local de matrícula: a atual (sob o prefixo que resetTudo
 * varre) e a usada antes, fora do prefixo. Moram aqui porque quem apaga o
 * rascunho não é só o modal de matrícula — os botões de sair também precisam,
 * e o cabeçalho do dashboard não deve importar o modal inteiro só por isso.
 */
export const RASCUNHO_MATRICULA_CHAVE = `${STORAGE_PREFIX}rascunho:matricula`;
export const RASCUNHO_MATRICULA_CHAVE_ANTIGA = "semente:rascunho:matricula";

/**
 * Apaga o rascunho de matrícula do navegador. Chamado quando a matrícula é
 * salva ou descartada e nos dois botões de sair: em computador compartilhado da
 * secretaria, CPF/RG/endereço de uma família não pode sobreviver à troca de
 * usuário nem ficar no disco esperando o vencimento.
 */
export function apagarRascunhoMatricula() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RASCUNHO_MATRICULA_CHAVE);
    window.localStorage.removeItem(RASCUNHO_MATRICULA_CHAVE_ANTIGA);
  } catch {
    // Sem storage disponível: nada a limpar.
  }
}

/**
 * Remove o que o app guarda no navegador sob "semente:data:" — caches legados
 * de versões antigas e rascunhos locais (ex.: rascunho de matrícula).
 */
export function resetTudo() {
  if (typeof window === "undefined") return;
  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) window.localStorage.removeItem(key);
  }
  window.location.reload();
}
