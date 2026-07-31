import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/db/postgres";
import { rowToCobranca } from "@/lib/db/mappers";
import { erros, erroAPI } from "@/lib/db/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const pad = (n: number) => String(n).padStart(2, "0");

// Vencimento no mês (base + offset), no dia informado, com clamp ao último dia do mês.
function vencimentoEmMeses(base: Date, offsetMeses: number, dia: number): string {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offsetMeses, 1));
  const ultimoDia = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  const diaFinal = Math.min(Math.max(Math.trunc(dia) || 1, 1), ultimoDia);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(diaFinal)}`;
}

export async function POST(req: Request) {
  let body: { alunoId?: string };
  try {
    body = (await req.json()) as { alunoId?: string };
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  const alunoId = typeof body.alunoId === "string" ? body.alunoId.trim() : "";
  if (!alunoId) return erros.dadosInvalidos("alunoId");

  const sb = getDatabase();
  const { data: aluno, error: errAluno } = await sb
    .from("alunos")
    .select("*")
    .eq("id", alunoId)
    .maybeSingle();
  if (errAluno) return erros.servidorIndisponivel(errAluno);
  if (!aluno) return erros.naoEncontrado("Aluno");

  const taxa = aluno.matricula_taxa != null ? Number(aluno.matricula_taxa) : 0;
  const modalidade = String(aluno.matricula_modalidade ?? "avista");
  const parcelas = Math.max(1, Math.trunc(Number(aluno.matricula_parcelas ?? 1)) || 1);
  const mensalidade = aluno.mensalidade_valor != null ? Number(aluno.mensalidade_valor) : 0;
  const periodicidade = String(aluno.mensalidade_periodicidade ?? "mensal");
  const dia = Math.trunc(Number(aluno.dia_vencimento ?? 10)) || 10;

  if (!(taxa > 0) && !(mensalidade > 0)) {
    return erroAPI(
      "Preencha ao menos a taxa de matrícula ou o valor da mensalidade antes de gerar as cobranças.",
      400
    );
  }

  const agora = new Date();
  const base = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
  const novas: Record<string, unknown>[] = [];

  // --- Taxa de matrícula ---
  if (taxa > 0) {
    if (modalidade === "parcelado" && parcelas > 1) {
      const centavos = Math.round(taxa * 100);
      const baseParc = Math.floor(centavos / parcelas);
      const resto = centavos - baseParc * parcelas;
      for (let i = 0; i < parcelas; i++) {
        const valorCent = baseParc + (i === parcelas - 1 ? resto : 0);
        if (valorCent <= 0) continue;
        novas.push({
          id: `cob-${randomUUID()}`,
          aluno_id: alunoId,
          tipo: "matricula",
          descricao: `Matrícula — parcela ${i + 1}/${parcelas}`,
          valor: valorCent / 100,
          vencimento: vencimentoEmMeses(base, i, dia),
          status: "Pendente",
          parcela_num: i + 1,
          parcela_total: parcelas,
        });
      }
    } else {
      novas.push({
        id: `cob-${randomUUID()}`,
        aluno_id: alunoId,
        tipo: "matricula",
        descricao: "Taxa de matrícula (à vista)",
        valor: taxa,
        vencimento: vencimentoEmMeses(base, 0, dia),
        status: "Pendente",
        parcela_num: 1,
        parcela_total: 1,
      });
    }
  }

  // --- Mensalidade / Anuidade ---
  if (mensalidade > 0) {
    if (periodicidade === "anual") {
      novas.push({
        id: `cob-${randomUUID()}`,
        aluno_id: alunoId,
        tipo: "mensalidade",
        descricao: `Anuidade ${base.getUTCFullYear()}`,
        valor: mensalidade,
        vencimento: vencimentoEmMeses(base, 0, dia),
        status: "Pendente",
      });
    } else {
      for (let i = 0; i < 12; i++) {
        const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1));
        novas.push({
          id: `cob-${randomUUID()}`,
          aluno_id: alunoId,
          tipo: "mensalidade",
          descricao: `Mensalidade ${MESES[d.getUTCMonth()]}/${d.getUTCFullYear()}`,
          valor: mensalidade,
          vencimento: vencimentoEmMeses(base, i, dia),
          status: "Pendente",
        });
      }
    }
  }

  // Não recriar períodos que já foram pagos, senão o responsável é cobrado 2x.
  // Chave do período: matrícula por número da parcela; mensalidade por ano-mês do vencimento.
  const chavePeriodo = (
    tipo: unknown,
    vencimento: unknown,
    parcelaNum: unknown
  ): string =>
    tipo === "matricula"
      ? `matricula:${Number(parcelaNum) || 1}`
      : `mensalidade:${String(vencimento ?? "").slice(0, 7)}`;

  const { data: pagas, error: errPagas } = await sb
    .from("cobrancas")
    .select("tipo, vencimento, parcela_num")
    .eq("aluno_id", alunoId)
    .eq("status", "Pago");
  if (errPagas) return erros.servidorIndisponivel(errPagas);

  const pagasSet = new Set(
    (pagas ?? []).map((c) => chavePeriodo(c.tipo, c.vencimento, c.parcela_num))
  );
  const novasFiltradas = novas.filter(
    (n) => !pagasSet.has(chavePeriodo(n.tipo, n.vencimento, n.parcela_num))
  );

  // Substitui as cobranças NÃO pagas do aluno (preserva as já pagas) e insere as
  // novas de forma atômica — se o insert falhar, o delete é revertido (sem perda).
  try {
    await sb.transaction(async (tx) => {
      const { error: errDel } = await tx
        .from("cobrancas")
        .delete()
        .eq("aluno_id", alunoId)
        .in("status", ["Pendente", "Atrasada"]);
      if (errDel) throw new Error(errDel.message);

      if (novasFiltradas.length > 0) {
        const { error: errIns } = await tx.from("cobrancas").insert(novasFiltradas);
        if (errIns) throw new Error(errIns.message);
      }
    });
  } catch (e) {
    return erros.servidorIndisponivel(e);
  }

  const { data, error } = await sb
    .from("cobrancas")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("vencimento", { ascending: true });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ ok: true, items: (data ?? []).map(rowToCobranca) });
}
