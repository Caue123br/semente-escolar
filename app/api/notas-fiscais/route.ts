import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToNotaFiscal } from "@/lib/db/mappers";
import { seedNotasFiscais } from "@/lib/db/seed";
import { registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { formatDateLocalISO } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await seedNotasFiscais();
  const sb = getDatabase();
  const { data, error } = await sb.from("notas_fiscais").select("*").order("data", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []).map(rowToNotaFiscal) });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return erros.dadosInvalidos("corpo da requisição");
  }

  const cliente = typeof body.cliente === "string" ? body.cliente.trim() : "";
  const cpfCnpj = typeof body.cpfCnpj === "string" ? body.cpfCnpj.trim() : "";
  const documento = cpfCnpj.replace(/\D/g, "");
  const servico = typeof body.servico === "string" ? body.servico.trim() : "";
  const valor = Number(body.valor);

  if (cliente.length < 2 || cliente.length > 200) return erros.dadosInvalidos("tomador");
  if (![11, 14].includes(documento.length)) return erros.dadosInvalidos("CPF/CNPJ");
  if (servico.length < 2 || servico.length > 2_000) return erros.dadosInvalidos("descrição do serviço");
  if (!Number.isFinite(valor) || valor <= 0 || valor > 999_999_999.99) {
    return erros.dadosInvalidos("valor");
  }

  const id = randomUUID();
  const dataRegistro = formatDateLocalISO();
  const numero = `REG-${dataRegistro.slice(0, 4)}/${id.slice(0, 8).toUpperCase()}`;
  const sb = getDatabase();
  const { data, error } = await sb.from("notas_fiscais").insert({
    id,
    numero,
    data: dataRegistro,
    cliente,
    cpf_cnpj: cpfCnpj,
    valor,
    servico,
    // Sem conector municipal não há evidência para aceitar "Emitida" do cliente.
    status: "Pendente",
    venda_id: null,
  }).select("*").single();

  if (error || !data) {
    if (["22003", "23502", "23514"].includes(error?.code ?? "")) {
      return erros.dadosInvalidos();
    }
    if (error?.code === "23505") {
      return erroAPI("Não foi possível gerar um protocolo único. Tente novamente.", 409);
    }
    return erros.servidorIndisponivel(error ?? new Error("INSERT fiscal sem retorno"));
  }

  await registrarAudit("criar", "notas_fiscais", id, { status: "Pendente", numero });
  return sucesso({ item: rowToNotaFiscal(data) }, 201);
}
