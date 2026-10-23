import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToCobranca } from "@/lib/db/mappers";
import { erroAPI, erros } from "@/lib/db/api-response";
import {
  ConflitoEspelho,
  MENSAGEM_ESPELHO_RECUSADO,
  ehFalhaDoEspelho,
  registrarEspelhoRemovido,
  sincronizarEspelho,
  type LinhaEspelhoRemovida,
} from "@/lib/db/espelho-mensalidades";
import { cobrancaAtualizada } from "@/lib/financeiro-mensalidades";
import { formatDateLocalISO } from "@/lib/utils";
import type { Cobranca } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class ConflitoIdentidade extends Error {
  constructor() {
    super("Esta cobrança já pertence a outro aluno ou foi alterada em outra tela. Recarregue a ficha financeira.");
  }
}

const competenciaDe = (vencimento: unknown) => String(vencimento ?? "").slice(0, 7);

export async function GET() {
  const sb = getDatabase();
  const { data, error } = await sb
    .from("cobrancas")
    .select("*")
    .order("vencimento", { ascending: true });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map((row) => cobrancaAtualizada(rowToCobranca(row), formatDateLocalISO())) });
}

export async function POST(req: Request) {
  let c: Cobranca;
  try {
    c = (await req.json()) as Cobranca;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!c.id || !c.alunoId || !(Number(c.valor) > 0)) {
    return erros.dadosInvalidos("cobrança");
  }
  if (c.status === "Pago") {
    // Recebido diferente do previsto é rotina (bolsa, desconto, multa,
    // arredondamento); o que não pode faltar é o registro da baixa.
    if (!(Number(c.valorPago) > 0)) {
      return erroAPI("Informe o valor recebido para registrar o pagamento.", 400);
    }
    if (!c.dataPagamento || !c.formaPagamento) {
      return erroAPI("Informe a data e a forma de pagamento para quitar a cobrança.", 400);
    }
  }
  const sb = getDatabase();
  const alunoId = String(c.alunoId);
  const tipo = c.tipo ?? "mensalidade";
  const hoje = formatDateLocalISO();

  let espelhoRemovido: LinhaEspelhoRemovida[] = [];
  try {
    // A cobrança e o espelho em app.mensalidades (de onde o Financeiro lê)
    // entram juntos: sem isso a cobrança criada por aqui só apareceria no
    // Financeiro depois de um "Gerar cobranças" ou de uma baixa do aluno.
    espelhoRemovido = await sb.transaction(async (tx) => {
      // O upsert por id pode mover a cobrança de mês — o mês antigo também
      // precisa ser refeito no espelho.
      const { data: anterior, error: erroAnterior } = await tx
        .from("cobrancas")
        .select("aluno_id, tipo, vencimento, status, valor, valor_pago")
        .eq("id", String(c.id))
        .maybeSingle();
      if (erroAnterior) throw new Error(erroAnterior.message);

      if (anterior && String(anterior.aluno_id) !== alunoId) throw new ConflitoIdentidade();
      const registro = {
          id: c.id,
          aluno_id: alunoId,
          tipo,
          descricao: c.descricao,
          valor: c.valor,
          vencimento: c.vencimento,
          valor_pago: c.valorPago ?? null,
          data_pagamento: c.dataPagamento ?? null,
          status: c.status ?? "Pendente",
          forma_pagamento: c.formaPagamento ?? null,
          parcela_num: c.parcelaNum ?? null,
          parcela_total: c.parcelaTotal ?? null,
        };
      // Insert separado impede que dois criadores concorrentes transfiram um
      // mesmo ID. Update exige a identidade lida, inclusive após corrida/delete.
      if (anterior) {
        const { id: _id, aluno_id: _alunoId, ...campos } = registro;
        const { data: atualizada, error } = await tx.from("cobrancas")
          .update(campos).eq("id", String(c.id)).eq("aluno_id", alunoId)
          .eq("vencimento", anterior.vencimento).eq("tipo", anterior.tipo)
          .eq("status", anterior.status).eq("valor", anterior.valor)
          .is("valor_pago", anterior.valor_pago ?? null).select("id").maybeSingle();
        if (error) throw Object.assign(new Error(error.message), { code: error.code });
        if (!atualizada) throw new ConflitoIdentidade();
      } else {
        const { error } = await tx.from("cobrancas").insert(registro);
        if (error) throw Object.assign(new Error(error.message), { code: error.code });
      }

      const competencias = [
        ...new Set([
          ...(tipo === "mensalidade" ? [competenciaDe(c.vencimento)] : []),
          ...(anterior?.tipo === "mensalidade" ? [competenciaDe(anterior.vencimento)] : []),
        ]),
      ];
      if (competencias.length === 0) return [];
      return sincronizarEspelho(tx, alunoId, hoje, competencias);
    });
  } catch (e) {
    if (e instanceof ConflitoIdentidade || (e as { code?: string }).code === "23505") return erroAPI(new ConflitoIdentidade().message, 409);
    if (e instanceof ConflitoEspelho) return erroAPI(e.message, 409);
    const codigo = (e as { code?: string }).code;
    if (codigo === "23514") {
      if (ehFalhaDoEspelho(e)) return erroAPI(MENSAGEM_ESPELHO_RECUSADO, 500);
      return erroAPI(
        "Os dados da cobrança não foram aceitos. Confira o valor, o vencimento e, no caso de pagamento, a data e a forma.",
        400
      );
    }
    return erros.servidorIndisponivel(e);
  }

  await registrarEspelhoRemovido(
    alunoId,
    "competência ficou sem cobrança após o lançamento da cobrança",
    espelhoRemovido
  );
  return NextResponse.json({ ok: true, item: c }, { status: 201 });
}
