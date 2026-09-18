import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToMensalidade } from "@/lib/db/mappers";
import { seedMensalidades } from "@/lib/db/seed";
import { erroAPI, erros } from "@/lib/db/api-response";
import { MENSAGEM_LINHA_DO_ESPELHO, ehLinhaDoEspelho } from "@/lib/db/espelho-mensalidades";
import type { Mensalidade } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    // Recebido diferente do previsto é rotina (bolsa, desconto de pontualidade,
    // multa, arredondamento) e o banco já aceita — o que não pode faltar é o
    // registro da baixa.
    if (!(Number(m.valorPago) > 0)) {
      return erroAPI("Informe o valor recebido para registrar o pagamento.", 400);
    }
    if (!m.dataPagamento || !m.formaPagamento) {
      return erroAPI(
        "Informe a data e a forma de pagamento para quitar a mensalidade.",
        400
      );
    }
  }
  const sb = getDatabase();
  // O upsert é por (aluno_id, competencia): sem esta conferência, um lançamento
  // manual reescreveria a linha que espelha as cobranças do aluno.
  const { data: existente, error: erroExistente } = await sb
    .from("mensalidades")
    .select("id, aluno_id, competencia")
    .eq("aluno_id", String(m.alunoId ?? ""))
    .eq("competencia", String(m.competencia ?? ""))
    .maybeSingle();
  if (erroExistente) return erros.servidorIndisponivel(erroExistente);
  if (existente && ehLinhaDoEspelho(existente)) {
    return erroAPI(MENSAGEM_LINHA_DO_ESPELHO, 409);
  }

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
  if (error?.code === "23514") {
    return erroAPI(
      "Esta mensalidade não foi aceita. Confira o valor, o vencimento e, no caso de pagamento, o valor recebido, a data e a forma.",
      400
    );
  }
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ ok: true, item: m }, { status: 201 });
}
