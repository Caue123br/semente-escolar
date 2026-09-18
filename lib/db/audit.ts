import { headers } from "next/headers";
import { formatDateLocalISO } from "@/lib/utils";
import { getDatabase } from "./postgres";
import { getUsuarioLogado, type Usuario } from "./auth";

export type AcaoAudit =
  | "criar"
  | "editar"
  | "excluir"
  | "login"
  | "logout"
  | "exportar"
  | "outros";

/**
 * Detalhes livres do evento. `antes`/`depois` (objetos campo -> valor) guardam
 * os valores que mudaram — é o que transforma o log em prova quando um dado de
 * aluno é alterado ou removido. Use `diffAudit` para montá-los.
 */
export type DetalhesAudit = Record<string, unknown> & {
  antes?: unknown;
  depois?: unknown;
};

// Um campo grande (ficha de saúde, foto em base64) transformaria o log numa
// segunda cópia do registro. Guarda o suficiente para conferência.
const LIMITE_VALOR = 500;

function truncar(texto: string): string {
  return `${texto.slice(0, LIMITE_VALOR)}… (${texto.length} caracteres, truncado)`;
}

// Nada aqui pode lançar: a auditoria não derruba o que o usuário está salvando.
function isoDeData(valor: Date): string | null {
  return Number.isNaN(valor.getTime()) ? null : valor.toISOString();
}

function serializar(valor: unknown): string {
  try {
    return JSON.stringify(valor) || String(valor);
  } catch {
    return String(valor);
  }
}

// O PostgreSQL guarda jsonb com as chaves reordenadas (por tamanho e depois
// byte) e o formulário manda na ordem dele. Comparar o texto na ordem de
// inserção marcaria responsaveis_json como alterado em toda edição de aluno.
// Arrays ficam na ordem original: trocar responsável de posição é mudança real.
function ordenarChaves(_chave: string, valor: unknown): unknown {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return valor;
  const entradas = Object.entries(valor as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  return Object.fromEntries(entradas);
}

function serializarCanonico(valor: unknown): string {
  try {
    return JSON.stringify(valor, ordenarChaves) || String(valor);
  } catch {
    return String(valor);
  }
}

function valorRegistravel(valor: unknown): unknown {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === "number" || typeof valor === "boolean") return valor;
  if (valor instanceof Date) return isoDeData(valor);
  if (typeof valor === "string") return valor.length <= LIMITE_VALOR ? valor : truncar(valor);
  const texto = serializar(valor);
  return texto.length <= LIMITE_VALOR ? valor : truncar(texto);
}

const SOMENTE_DATA = /^\d{4}-\d{2}-\d{2}$/;

// O banco devolve data como Date e o formulário manda YYYY-MM-DD. Sem isto,
// toda edição de aluno apareceria trocando a data de nascimento.
function mesmoDiaCivil(anterior: unknown, novo: unknown): boolean | null {
  let data: Date | null = null;
  let texto: string | null = null;
  if (anterior instanceof Date && typeof novo === "string") {
    data = anterior;
    texto = novo;
  } else if (novo instanceof Date && typeof anterior === "string") {
    data = novo;
    texto = anterior;
  }
  if (!data || !texto || !SOMENTE_DATA.test(texto) || Number.isNaN(data.getTime())) return null;
  return formatDateLocalISO(data) === texto;
}

const NUMERO_DECIMAL = /^-?\d+(\.\d+)?$/;

// Coluna numeric volta do banco como string ('450.00') e a API grava número
// (450). Sem isto, salvar o plano mexendo só no dia de vencimento registraria
// alteração de mensalidade e taxa que ninguém fez. Só vale quando um dos lados
// é número: dois textos iguais em valor ('0123' e '123') são campos de texto
// como CPF, onde o zero à esquerda é diferença de verdade.
function mesmoNumero(anterior: unknown, novo: unknown): boolean | null {
  const numero =
    typeof anterior === "number" ? anterior : typeof novo === "number" ? novo : null;
  const texto = typeof anterior === "string" ? anterior : typeof novo === "string" ? novo : null;
  if (numero === null || texto === null) return null;
  const limpo = texto.trim();
  if (!NUMERO_DECIMAL.test(limpo)) return null;
  return Number(limpo) === numero;
}

function mesmoValor(anterior: unknown, novo: unknown): boolean {
  if (anterior === novo) return true;
  const mesmoDia = mesmoDiaCivil(anterior, novo);
  if (mesmoDia !== null) return mesmoDia;
  const mesmaQuantia = mesmoNumero(anterior, novo);
  if (mesmaQuantia !== null) return mesmaQuantia;
  const a = anterior instanceof Date ? isoDeData(anterior) : anterior ?? null;
  const b = novo instanceof Date ? isoDeData(novo) : novo ?? null;
  return serializarCanonico(a) === serializarCanonico(b);
}

// Vale para quem monta os detalhes na mão também: um `antes`/`depois` com a
// linha inteira do aluno (foto em base64, ficha de saúde) não pode inflar o
// audit_logs a cada edição.
function normalizarDetalhes(detalhes?: DetalhesAudit): Record<string, unknown> | null {
  if (!detalhes) return null;
  const normalizado: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(detalhes)) {
    const ehLadoDoDiff = chave === "antes" || chave === "depois";
    if (ehLadoDoDiff && valor && typeof valor === "object" && !Array.isArray(valor)) {
      normalizado[chave] = Object.fromEntries(
        Object.entries(valor as Record<string, unknown>).map(([campo, conteudo]) => [
          campo,
          valorRegistravel(conteudo),
        ])
      );
      continue;
    }
    normalizado[chave] = valorRegistravel(valor);
  }
  return normalizado;
}

/**
 * Monta os `detalhes` de uma edição: lista dos campos alterados e o valor de
 * cada um antes e depois. `depois` pode ser o patch parcial da requisição;
 * campos iguais ficam de fora. Sem `depois`, registra o registro que existia
 * (uso típico na exclusão).
 */
export function diffAudit(
  antes: Record<string, unknown> | null | undefined,
  depois: Record<string, unknown> | null | undefined
): DetalhesAudit {
  const anterior = antes ?? {};
  const novo = depois ?? {};

  // Sem `depois` (remoção) registra inteiro o que existia antes. Com `depois`
  // compara só os campos que ele traz: `depois` costuma ser o patch da
  // requisição, e um patch parcial não pode marcar como alterado o que nem
  // tocou. Campo com `undefined` é o que o banco nem recebe.
  const campos = (
    depois == null
      ? Object.keys(anterior)
      : Object.keys(novo).filter(
          (campo) => novo[campo] !== undefined && !mesmoValor(anterior[campo], novo[campo])
        )
  ).sort();

  const valoresAntes: Record<string, unknown> = {};
  const valoresDepois: Record<string, unknown> = {};
  for (const campo of campos) {
    valoresAntes[campo] = valorRegistravel(anterior[campo]);
    valoresDepois[campo] = valorRegistravel(novo[campo]);
  }

  return { campos, antes: valoresAntes, depois: valoresDepois };
}

export async function registrarAudit(
  acao: AcaoAudit,
  entidade: string,
  registroId?: string,
  detalhes?: DetalhesAudit,
  ator?: Pick<Usuario, "id" | "nome" | "email">
): Promise<void> {
  let usuarioId: string | null = null;
  // Contexto sem valores pessoais: dá para achar o registro e os campos
  // envolvidos no log do servidor sem copiar dado de criança para lá.
  const contexto = () => ({
    acao,
    entidade,
    registroId: registroId ?? null,
    usuarioId,
    campos: Array.isArray(detalhes?.campos) ? detalhes.campos : Object.keys(detalhes ?? {}),
  });

  try {
    const u = ator ?? (await getUsuarioLogado());
    usuarioId = u?.id ?? null;
    const h = await headers();
    const sb = getDatabase();
    const { error } = await sb.from("audit_logs").insert({
      id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      usuario_id: usuarioId,
      usuario_nome: u?.nome ?? "Sistema",
      usuario_email: u?.email ?? null,
      acao,
      entidade,
      registro_id: registroId ?? null,
      detalhes: normalizarDetalhes(detalhes),
      ip: h.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
      user_agent: h.get("user-agent") ?? null,
    });
    // Auditoria é prova: a operação do usuário não é derrubada por causa dela,
    // mas a falha precisa aparecer no log do servidor com o que investigar.
    if (error) {
      console.error("[audit] não registrado", {
        ...contexto(),
        code: error.code,
        message: error.message,
      });
    }
  } catch (e) {
    console.error("[audit] não registrado", {
      ...contexto(),
      erro: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    });
  }
}
