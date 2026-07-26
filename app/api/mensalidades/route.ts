import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToMensalidade } from "@/lib/db/mappers";
import { seedMensalidades } from "@/lib/db/seed";
import { erroAPI, erros } from "@/lib/db/api-response";
import type { Mensalidade } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mesmoValorEmCentavos(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.round(a * 100) === Math.round(b * 100);
}

export async function GET() {
  await seedMensalidades();
  const sb = getDatabase();
  const { data, error } = await sb.from("mensalidades").select("*").order("vencimento", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data ?? []).map(rowToMensalidade) });
}

export async function POST(req: Request) {
  let m: Mensalidade;
  try {
    m = (await req.json()) as Mensalidade;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (m.status === "Paga") {
    if (!mesmoValorEmCentavos(Number(m.valor), Number(m.valorPago))) {
      return erroAPI(
        "Para marcar como paga, o valor recebido deve ser igual ao total da mensalidade. Pagamentos parciais ainda não são suportados.",
        400
      );
    }
    if (!m.dataPagamento || !m.formaPagamento) {
      return erroAPI(
        "Informe a data e a forma de pagamento para quitar a mensalidade.",
        400
      );
    }
  }
  const sb = getDatabase();
  const { error } = await sb.from("mensalidades").upsert({
    id: m.id,
    aluno_id: m.alunoId,
    aluno_nome: m.alunoNome,
    turma_nome: m.turmaNome,
    competencia: m.competencia,
    vencimento: m.vencimento,
    valor: m.valor,
    valor_pago: m.valorPago ?? null,
    data_pagamento: m.dataPagamento ?? null,
    status: m.status,
    dias_atraso: m.diasAtraso,
    forma_pagamento: m.formaPagamento ?? null,
  }, { onConflict: "aluno_id,competencia" });
  if (error?.code === "23514") return erros.dadosInvalidos("pagamento");
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ ok: true, item: m }, { status: 201 });
}
