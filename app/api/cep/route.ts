import { isIP } from "node:net";
import { NextResponse } from "next/server";

import { sucesso } from "@/lib/db/api-response";
import { getUsuarioLogado } from "@/lib/db/auth";
import { checkRateLimit } from "@/lib/db/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A consulta ao ViaCEP acontece aqui, no servidor, e não no navegador: assim o
// autofill de endereço funciona sem abrir `connect-src` do CSP para fora do app.
const VIACEP_TIMEOUT_MS = 3_000;
const LIMITE_POR_MINUTO = 30;

interface RespostaViaCep {
  erro?: boolean | string;
  logradouro?: unknown;
  bairro?: unknown;
  localidade?: unknown;
  uf?: unknown;
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

// Toda resposta segue o mesmo formato { ok, ... } — inclusive as de erro, para o
// campo de CEP no formulário só precisar olhar `ok`.
function falha(mensagem: string, status: number, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ ok: false, error: mensagem, ...extra }, { status });
}

const CEP_INDISPONIVEL = "A busca de CEP está fora do ar agora. Preencha o endereço à mão.";

export async function GET(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return falha("Sessão expirou. Faça login de novo.", 401);

  const cep = (new URL(req.url).searchParams.get("cep") ?? "").replace(/\D/g, "");
  if (cep.length !== 8) {
    return falha("Digite o CEP com 8 números para buscar o endereço.", 400);
  }

  const limite = checkRateLimit(
    `cep:${usuario.id}:${clientIp(req)}`,
    LIMITE_POR_MINUTO,
    60_000
  );
  if (!limite.ok) {
    return falha("Muitas buscas de CEP seguidas. Espere alguns segundos.", 429, {
      resetIn: limite.resetIn,
    });
  }

  let resposta: Response;
  try {
    resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(VIACEP_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[cep] consulta ao ViaCEP falhou", error);
    return falha("A busca de CEP não respondeu. Preencha o endereço à mão.", 504);
  }
  if (!resposta.ok) {
    console.error("[cep] ViaCEP respondeu", resposta.status);
    return falha(CEP_INDISPONIVEL, 502);
  }

  let dados: RespostaViaCep;
  try {
    dados = (await resposta.json()) as RespostaViaCep;
  } catch (error) {
    console.error("[cep] resposta do ViaCEP ilegível", error);
    return falha(CEP_INDISPONIVEL, 502);
  }

  const cidade = texto(dados.localidade);
  // O ViaCEP sinaliza CEP inexistente com `erro` (boolean ou string, conforme a versão).
  if (dados.erro === true || dados.erro === "true" || !cidade) {
    return falha("CEP não encontrado. Confira o número ou preencha o endereço à mão.", 404);
  }

  const resultado = sucesso({
    endereco: texto(dados.logradouro),
    bairro: texto(dados.bairro),
    cidade,
    estado: texto(dados.uf).toUpperCase().slice(0, 2),
  });
  // Endereço de CEP muda muito devagar: o cache privado poupa o ViaCEP quando a
  // secretaria volta ao mesmo campo para corrigir o resto da ficha.
  resultado.headers.set("Cache-Control", "private, max-age=86400");
  return resultado;
}
