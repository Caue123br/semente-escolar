import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";

import { erros, sucesso } from "@/lib/db/api-response";
import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { checkRateLimit } from "@/lib/db/rate-limit";
import { formatDateLocalISO } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HORARIOS = new Set(["09:00", "10:30", "14:00", "15:30", "17:00"]);
const FAIXAS_ALUNOS = new Set(["ate-80", "80-150", "150-250", "250-500", "mais-500"]);

interface SolicitacaoDemoInput {
  nome?: unknown;
  cargo?: unknown;
  escola?: unknown;
  telefone?: unknown;
  email?: unknown;
  faixaAlunos?: unknown;
  dataPreferida?: unknown;
  horaPreferida?: unknown;
  website?: unknown;
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

function dataPreferidaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    return false;
  }
  const hoje = new Date(`${formatDateLocalISO()}T12:00:00Z`);
  const diasAFrente = Math.round((data.getTime() - hoje.getTime()) / 86_400_000);
  const diaSemana = data.getUTCDay();
  return diasAFrente >= 1 && diasAFrente <= 60 && diaSemana >= 1 && diaSemana <= 5;
}

export async function GET() {
  const usuario = await getUsuarioLogado();
  if (usuario?.perfil !== "diretor") return erros.semPermissao("consultar solicitações de demonstração");

  const { data, error } = await getDatabase()
    .from("solicitacoes_demo")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  if (!mesmaOrigem(req)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 20_000) {
    return NextResponse.json({ error: "Requisição muito grande" }, { status: 413 });
  }

  const limite = checkRateLimit(`demo:${clientIp(req)}`, 6, 60 * 60 * 1000);
  if (!limite.ok) {
    return NextResponse.json(
      { error: "Muitas solicitações. Tente novamente mais tarde.", resetIn: limite.resetIn },
      { status: 429 }
    );
  }

  let body: SolicitacaoDemoInput;
  try {
    body = (await req.json()) as SolicitacaoDemoInput;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return erros.dadosInvalidos("corpo da requisição");
  }

  // Campo invisível preenchido por robôs. Responder normalmente evita que o
  // bot adapte o ataque, sem persistir lixo ou dados pessoais.
  if (texto(body.website)) {
    return sucesso({ protocolo: "RECEBIDO" }, 201);
  }

  const nome = texto(body.nome);
  const cargo = texto(body.cargo);
  const escola = texto(body.escola);
  const telefone = texto(body.telefone);
  const email = texto(body.email).toLowerCase();
  const faixaAlunos = texto(body.faixaAlunos);
  const dataPreferida = texto(body.dataPreferida);
  const horaPreferida = texto(body.horaPreferida);
  const telefoneNumerico = telefone.replace(/\D/g, "");

  if (nome.length < 2 || nome.length > 120) return erros.dadosInvalidos("nome");
  if (cargo.length < 2 || cargo.length > 120) return erros.dadosInvalidos("cargo");
  if (escola.length < 2 || escola.length > 160) return erros.dadosInvalidos("escola");
  if (telefoneNumerico.length < 10 || telefoneNumerico.length > 13) {
    return erros.dadosInvalidos("telefone");
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return erros.dadosInvalidos("e-mail");
  }
  if (!FAIXAS_ALUNOS.has(faixaAlunos)) return erros.dadosInvalidos("faixa de alunos");
  if (!dataPreferidaValida(dataPreferida)) return erros.dadosInvalidos("data de preferência");
  if (!HORARIOS.has(horaPreferida)) return erros.dadosInvalidos("horário de preferência");

  const id = randomUUID();
  const { data, error } = await getDatabase()
    .from("solicitacoes_demo")
    .insert({
      id,
      nome,
      cargo,
      escola,
      telefone,
      email,
      faixa_alunos: faixaAlunos,
      data_preferida: dataPreferida,
      hora_preferida: horaPreferida,
      status: "recebida",
      origem: "landing",
    })
    .select("id")
    .single();

  if (error || !data) {
    return erros.servidorIndisponivel(
      error ?? new Error("INSERT de solicitação de demonstração sem retorno")
    );
  }

  const protocolo = `DEM-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  await registrarAudit("criar", "solicitacoes_demo", id, {
    dataPreferida,
    horaPreferida,
  });
  return sucesso({ protocolo }, 201);
}
