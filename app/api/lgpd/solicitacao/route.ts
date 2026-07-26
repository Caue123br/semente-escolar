import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";

import { limparCPF, validarCPF } from "@/lib/cpf";
import { erros, sucesso } from "@/lib/db/api-response";
import { getDatabase } from "@/lib/db/postgres";
import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { checkRateLimit } from "@/lib/db/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const usuario = await getUsuarioLogado();
  if (usuario?.perfil !== "diretor") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const sb = getDatabase();
  const { data, error } = await sb
    .from("lgpd_solicitacoes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

const TIPOS_SOLICITACAO = new Set([
  "acesso",
  "exclusao",
  "correcao",
  "portabilidade",
]);
const LIMITE_BODY_BYTES = 20_000;

interface SolicitacaoInput {
  tipo?: unknown;
  nome?: unknown;
  email?: unknown;
  cpf?: unknown;
  telefone?: unknown;
  detalhes?: unknown;
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function clientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;
  const forwarded = req.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .at(-1);
  return forwarded && isIP(forwarded) ? forwarded : "unknown";
}

function mesmaOrigem(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}

async function lerBodyLimitado(req: Request): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  const partes: string[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > LIMITE_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    partes.push(decoder.decode(value, { stream: true }));
  }

  partes.push(decoder.decode());
  return partes.join("");
}

export async function POST(req: Request) {
  if (!mesmaOrigem(req)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > LIMITE_BODY_BYTES) {
    return NextResponse.json({ error: "Requisição muito grande" }, { status: 413 });
  }

  const limite = checkRateLimit(`lgpd:${clientIp(req)}`, 6, 60 * 60 * 1000);
  if (!limite.ok) {
    return NextResponse.json(
      {
        error: "Muitas solicitações. Tente novamente mais tarde.",
        resetIn: limite.resetIn,
      },
      { status: 429 }
    );
  }

  let rawBody: string | null;
  try {
    rawBody = await lerBodyLimitado(req);
  } catch {
    return erros.dadosInvalidos("corpo da requisição");
  }
  if (rawBody === null) {
    return NextResponse.json({ error: "Requisição muito grande" }, { status: 413 });
  }

  let body: SolicitacaoInput;
  try {
    body = JSON.parse(rawBody) as SolicitacaoInput;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return erros.dadosInvalidos("corpo da requisição");
  }

  const tipo = texto(body.tipo);
  const nome = texto(body.nome);
  const email = texto(body.email).toLowerCase();
  const cpfInformado = texto(body.cpf);
  const cpf = cpfInformado ? limparCPF(cpfInformado) : "";
  const telefone = texto(body.telefone);
  const telefoneNumerico = telefone.replace(/\D/g, "");
  const detalhes = texto(body.detalhes);

  if (!TIPOS_SOLICITACAO.has(tipo)) return erros.dadosInvalidos("tipo de solicitação");
  if (nome.length < 2 || nome.length > 160) return erros.dadosInvalidos("nome");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return erros.dadosInvalidos("e-mail");
  }
  if (cpfInformado && (cpfInformado.length > 18 || !validarCPF(cpf))) {
    return erros.dadosInvalidos("CPF");
  }
  if (
    telefone &&
    (telefone.length > 24 || telefoneNumerico.length < 10 || telefoneNumerico.length > 13)
  ) {
    return erros.dadosInvalidos("telefone");
  }
  if (detalhes.length > 4_000) return erros.dadosInvalidos("detalhes");

  const id = randomUUID();
  const sb = getDatabase();
  const { data, error } = await sb
    .from("lgpd_solicitacoes")
    .insert({
      id,
      tipo,
      nome,
      email,
      cpf: cpf || null,
      telefone: telefone || null,
      detalhes: detalhes || null,
      status: "pendente",
    })
    .select("id")
    .single();
  if (error || !data) {
    return erros.servidorIndisponivel(
      error ?? new Error("INSERT de solicitação LGPD sem retorno")
    );
  }
  await registrarAudit("criar", "lgpd_solicitacoes", id, { tipo });
  return sucesso({ id }, 201);
}
