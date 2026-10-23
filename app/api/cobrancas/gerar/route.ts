import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToCobranca } from "@/lib/db/mappers";
import { erros, erroAPI } from "@/lib/db/api-response";
import { registrarAudit } from "@/lib/db/audit";
import {
  ConflitoEspelho,
  MENSAGEM_ESPELHO_RECUSADO,
  ehFalhaDoEspelho,
  registrarEspelhoRemovido,
  sincronizarEspelho,
  type LinhaEspelhoRemovida,
} from "@/lib/db/espelho-mensalidades";
import { formatBRL, formatDateLocalISO } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const pad = (n: number) => String(n).padStart(2, "0");
const COMPETENCIA = /^20\d{2}-(0[1-9]|1[0-2])$/;
// Limite do CHECK alunos_dia_vencimento_valido.
const DIA_MIN = 1;
const DIA_MAX = 28;

const cent = (v: unknown) => Math.round(Number(v ?? 0) * 100);
const reais = (centavos: number) => centavos / 100;
const competenciaDe = (vencimento: unknown) => String(vencimento ?? "").slice(0, 7);
const indiceMes = (competencia: string) =>
  Number(competencia.slice(0, 4)) * 12 + Number(competencia.slice(5, 7)) - 1;
const mesLegivel = (competencia: string) => `${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`;

// Vencimento no mês (base + offset) no dia do plano. O dia é validado em
// 1..28 antes de chegar aqui, então existe em qualquer mês.
function vencimentoEmMeses(base: Date, offsetMeses: number, dia: number): string {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offsetMeses, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(dia)}`;
}

function diaSeguinte(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function primeiroDiaDoMes(competencia: string): Date {
  const d = new Date(Date.UTC(2000, 0, 1));
  d.setUTCFullYear(Number(competencia.slice(0, 4)), Number(competencia.slice(5, 7)) - 1, 1);
  return d;
}

function mesSeguinte(competencia: string): string {
  const d = primeiroDiaDoMes(competencia);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

// Id determinístico da cobrança do plano: duas gerações simultâneas (duas abas,
// retry de rede) colidem na chave primária em vez de criar o plano duas vezes —
// app.cobrancas não tem índice único por competência.
const idMensalidade = (alunoId: string, competencia: string) =>
  `cob-${alunoId}-mens-${competencia}`;
const idParcelaMatricula = (alunoId: string, parcela: number) =>
  `cob-${alunoId}-mat-${pad(parcela)}`;

// "Anuidade 2026" x "Mensalidade Set/2026": é o que distingue a periodicidade de
// uma cobrança já lançada.
const periodicidadeDaCobranca = (descricao: unknown) =>
  /^anuidade/i.test(String(descricao ?? "").trim()) ? "anual" : "mensal";

/** Recusa com mensagem pronta para o operador, decidida dentro da transação. */
class ErroPlano extends Error {
  constructor(
    readonly status: number,
    mensagem: string
  ) {
    super(mensagem);
    this.name = "ErroPlano";
  }
}

type LinhaCobranca = Record<string, unknown>;
type PlanoGerado = {
  apagar: LinhaCobranca[];
  novas: LinhaCobranca[];
  preservadas: number;
  puladas: string[];
  espelhoRemovido: LinhaEspelhoRemovida[];
};

export async function POST(req: Request) {
  let body: { alunoId?: string; mesInicio?: string };
  try {
    body = (await req.json()) as { alunoId?: string; mesInicio?: string };
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  const alunoId = typeof body.alunoId === "string" ? body.alunoId.trim() : "";
  if (!alunoId) return erros.dadosInvalidos("alunoId");

  const mesInicio = typeof body.mesInicio === "string" ? body.mesInicio.trim() : "";
  if (mesInicio && !COMPETENCIA.test(mesInicio)) {
    return erroAPI("Informe o mês de início no formato ano-mês, como 2026-02.", 400);
  }

  const sb = getDatabase();
  const { data: aluno, error: errAluno } = await sb
    .from("alunos")
    .select("*")
    .eq("id", alunoId)
    .maybeSingle();
  if (errAluno) return erros.servidorIndisponivel(errAluno);
  if (!aluno) return erros.naoEncontrado("Aluno");

  const taxaCent = cent(aluno.matricula_taxa);
  const modalidade = String(aluno.matricula_modalidade ?? "avista");
  const parcelasPlano =
    modalidade === "parcelado"
      ? Math.max(1, Math.trunc(Number(aluno.matricula_parcelas ?? 1)) || 1)
      : 1;
  const mensalidadeCent = cent(aluno.mensalidade_valor);
  const periodicidade = String(aluno.mensalidade_periodicidade ?? "mensal");

  if (taxaCent <= 0 && mensalidadeCent <= 0) {
    return erroAPI(
      "Preencha ao menos a taxa de matrícula ou o valor da mensalidade antes de gerar as cobranças.",
      400
    );
  }

  const dia = aluno.dia_vencimento == null ? 10 : Math.trunc(Number(aluno.dia_vencimento));
  if (!Number.isFinite(dia) || dia < DIA_MIN || dia > DIA_MAX) {
    return erroAPI(
      `O dia de vencimento precisa estar entre ${DIA_MIN} e ${DIA_MAX}. Corrija o plano de pagamento e gere as cobranças de novo.`,
      400
    );
  }

  const hoje = formatDateLocalISO();
  const competenciaHoje = hoje.slice(0, 7);
  const dataMatricula = String(aluno.data_matricula ?? "").slice(0, 10);
  const competenciaMatricula = competenciaDe(dataMatricula);

  // Mês base do plano: o mês corrente. O mês da matrícula só vale quando é
  // posterior (contrato que começa no futuro). Cobrança retroativa é decisão do
  // operador na tela — só acontece com `mesInicio` explícito, nunca inferida da
  // data de matrícula, senão um aluno cadastrado hoje com matrícula de fevereiro
  // nasceria devendo oito meses.
  let competenciaBase = competenciaHoje;
  if (mesInicio) {
    competenciaBase = mesInicio;
  } else if (
    COMPETENCIA.test(competenciaMatricula) &&
    indiceMes(competenciaMatricula) > indiceMes(competenciaHoje)
  ) {
    competenciaBase = competenciaMatricula;
  }

  // Cobrança criada agora não pode nascer vencida: o primeiro vencimento é o
  // primeiro dia do plano a partir de hoje (ou da matrícula futura). Se o dia já
  // passou no mês base, o plano começa no mês seguinte.
  if (!mesInicio) {
    const piso = dataMatricula > hoje ? dataMatricula : hoje;
    if (vencimentoEmMeses(primeiroDiaDoMes(competenciaBase), 0, dia) < piso) {
      competenciaBase = mesSeguinte(competenciaBase);
    }
  }

  const base = primeiroDiaDoMes(competenciaBase);
  const primeiroVencimento = vencimentoEmMeses(base, 0, dia);
  // O que já venceu (ou já foi pago) é dívida comunicada à família: regerar o
  // plano não apaga nem reescreve. A substituição alcança só o que ainda vai
  // vencer dentro da janela que será regerada.
  const corte = primeiroVencimento > diaSeguinte(hoje) ? primeiroVencimento : diaSeguinte(hoje);
  const statusPorVencimento = (vencimento: string) => (vencimento < hoje ? "Atrasada" : "Pendente");

  // Janela que esta geração alcança: 12 competências a partir da base (a
  // anuidade cobre o mesmo período com uma cobrança só). Fora dela nada colide
  // com o que vai ser gerado — histórico de anos anteriores não é obstáculo.
  const janelaInicio = indiceMes(competenciaBase);
  const janelaFim = janelaInicio + 11;
  const dentroDaJanela = (competencia: string) => {
    const idx = indiceMes(competencia);
    return idx >= janelaInicio && idx <= janelaFim;
  };

  let plano: PlanoGerado;
  try {
    plano = await sb.transaction(async (tx) => {
      // A leitura mora dentro da transação: fora dela dois POSTs quase
      // simultâneos decidem sobre o mesmo estado e cada um insere o plano
      // inteiro. Com a leitura aqui e o id determinístico, o segundo ou enxerga
      // o plano do primeiro ou esbarra na chave primária.
      const { data: existentesRaw, error: errExist } = await tx
        .from("cobrancas")
        .select("id, tipo, descricao, valor, valor_pago, vencimento, status")
        .eq("aluno_id", alunoId);
      if (errExist) throw new Error(errExist.message);
      const existentes = existentesRaw ?? [];

      const competenciasComPagamento = new Set(
        existentes
          .filter((c) => c.tipo === "mensalidade" && c.status === "Pago")
          .map((c) => competenciaDe(c.vencimento))
      );
      const apagar = existentes.filter(
        (c) =>
          (c.status === "Pendente" || c.status === "Atrasada") &&
          String(c.vencimento) >= corte &&
          dentroDaJanela(competenciaDe(c.vencimento)) &&
          // Só IDs reconhecidos do gerador pertencem a este plano. Lançamentos
          // manuais e contratos fora da janela jamais são substituídos aqui.
          (c.tipo === "mensalidade"
            ? String(c.id) === idMensalidade(alunoId, competenciaDe(c.vencimento))
            : c.tipo === "matricula" &&
              String(c.id).startsWith(`cob-${alunoId}-mat-`) &&
              String(c.id) === idParcelaMatricula(alunoId, Number(String(c.id).slice(`cob-${alunoId}-mat-`.length)))) &&
          cent(c.valor_pago) === 0 &&
          // Saldo de mês que já teve recebimento continua em aberto.
          !(c.tipo === "mensalidade" && competenciasComPagamento.has(competenciaDe(c.vencimento)))
      );
      const idsApagar = new Set(apagar.map((c) => String(c.id)));
      const mantidas = existentes.filter((c) => !idsApagar.has(String(c.id)));

      const mensalidadesMantidas = mantidas.filter((c) => c.tipo === "mensalidade");
      const competenciasMantidas = new Set(
        mensalidadesMantidas.map((c) => competenciaDe(c.vencimento))
      );
      const matriculaMantida = mantidas.filter((c) => c.tipo === "matricula");
      const matriculaMantidaCent = matriculaMantida.reduce((s, c) => s + cent(c.valor), 0);

      // Trocar mensal <-> anual com cobrança preservada da periodicidade antiga
      // não tem resultado coerente: ou a anuidade era pulada pela trava por
      // competência (aluno ficava com uma mensalidade em vez da anuidade), ou a
      // anuidade preservada convivia com 12 mensalidades novas — cobrança em
      // dobro no mesmo contrato. A trava vale só para as competências da janela:
      // olhar o histórico inteiro deixava a troca de periodicidade impossível
      // depois da primeira baixa, mandando excluir cobrança já quitada.
      if (mensalidadeCent > 0) {
        const outraPeriodicidade = mensalidadesMantidas.filter(
          (c) =>
            dentroDaJanela(competenciaDe(c.vencimento)) &&
            periodicidadeDaCobranca(c.descricao) !== periodicidade
        );
        if (outraPeriodicidade.length > 0) {
          const meses = [
            ...new Set(outraPeriodicidade.map((c) => mesLegivel(competenciaDe(c.vencimento)))),
          ].join(", ");
          throw new ErroPlano(
            409,
            periodicidade === "anual"
              ? `Este aluno já tem mensalidade lançada no período do plano (${meses}) — a anuidade cobraria o mesmo período duas vezes. Estorne ou exclua essas cobranças na ficha financeira antes de passar o plano para anuidade.`
              : `Este aluno já tem anuidade lançada no período do plano (${meses}) — as mensalidades cobrariam o mesmo período duas vezes. Estorne ou exclua essa cobrança na ficha financeira antes de passar o plano para mensal.`
          );
        }
      }

      const novas: LinhaCobranca[] = [];

      // --- Taxa de matrícula ---
      // O que resta é a taxa menos o que já está cobrado/quitado, e não uma nova
      // divisão do valor cheio: trocar à vista <-> parcelado não recobra nada.
      const matriculaRestanteCent = taxaCent - matriculaMantidaCent;
      if (taxaCent > 0 && matriculaRestanteCent > 0) {
        const jaCobradas = matriculaMantida.length;
        const totalParcelas = Math.max(parcelasPlano, jaCobradas + 1);
        const aGerar = totalParcelas - jaCobradas;
        // O id da parcela é determinístico, então numerar pela CONTAGEM das
        // preservadas reusa o número de uma parcela paga fora de ordem (família
        // adianta a última) e o INSERT estoura a chave primária — 'Gerar
        // cobranças' ficava travado para sempre nesse aluno. As novas entram nos
        // números que ficaram livres, como já se faz por competência na
        // mensalidade. Sobram sempre pelo menos `aGerar` números em 1..total,
        // porque as preservadas ocupam no máximo `jaCobradas` deles.
        const idsMatriculaMantida = new Set(matriculaMantida.map((c) => String(c.id)));
        const numerosLivres: number[] = [];
        for (let n = 1; n <= totalParcelas && numerosLivres.length < aGerar; n++) {
          if (!idsMatriculaMantida.has(idParcelaMatricula(alunoId, n))) numerosLivres.push(n);
        }
        const valorBase = Math.floor(matriculaRestanteCent / aGerar);
        const resto = matriculaRestanteCent - valorBase * aGerar;
        for (let i = 0; i < numerosLivres.length; i++) {
          const valorCent = valorBase + (i === numerosLivres.length - 1 ? resto : 0);
          if (valorCent <= 0) continue;
          const parcela = numerosLivres[i];
          // Parcela N vence no mês base + (N-1): mantém a ordem dos números e o
          // mesmo vencimento de antes quando as preservadas estão em sequência.
          const vencimento = vencimentoEmMeses(base, parcela - 1, dia);
          novas.push({
            id: idParcelaMatricula(alunoId, parcela),
            aluno_id: alunoId,
            tipo: "matricula",
            descricao:
              totalParcelas > 1
                ? `Matrícula — parcela ${parcela}/${totalParcelas}`
                : "Taxa de matrícula (à vista)",
            valor: reais(valorCent),
            vencimento,
            status: statusPorVencimento(vencimento),
            parcela_num: parcela,
            parcela_total: totalParcelas,
          });
        }
      }

      // --- Mensalidade / Anuidade ---
      const puladas: string[] = [];
      if (mensalidadeCent > 0) {
        // Horizonte contado a partir do PLANO, não de cada clique em 'Gerar
        // cobranças'. A âncora do primeiro vencimento empurra a base para o mês
        // seguinte sempre que o dia já passou; 12 meses fixos a partir dali
        // esticavam o fim da janela e a família ganhava uma mensalidade a mais
        // (13, 14...) em cada regeração. Quando o plano já alcança a janela, ele
        // é quem diz onde ela termina. Só contam as cobranças da periodicidade
        // atual: vinda de anuidade, o horizonte mensal começa do zero.
        const fimJaPlanejado = existentes
          .filter(
            (c) =>
              c.tipo === "mensalidade" &&
              String(c.id) === idMensalidade(alunoId, competenciaDe(c.vencimento)) &&
              periodicidadeDaCobranca(c.descricao) === periodicidade
          )
          .map((c) => indiceMes(competenciaDe(c.vencimento)))
          .filter((idx) => idx >= janelaInicio && idx <= janelaFim)
          .reduce((maior, idx) => Math.max(maior, idx), -1);
        const meses =
          periodicidade === "anual"
            ? 1
            : fimJaPlanejado < janelaInicio
              ? 12
              : fimJaPlanejado - janelaInicio + 1;
        for (let i = 0; i < meses; i++) {
          const vencimento = vencimentoEmMeses(base, i, dia);
          const competencia = competenciaDe(vencimento);
          // Mês que já tem cobrança preservada não é cobrado de novo.
          if (competenciasMantidas.has(competencia)) {
            puladas.push(competencia);
            continue;
          }
          const d = new Date(`${vencimento}T00:00:00Z`);
          novas.push({
            id: idMensalidade(alunoId, competencia),
            aluno_id: alunoId,
            tipo: "mensalidade",
            descricao:
              periodicidade === "anual"
                ? `Anuidade ${d.getUTCFullYear()}`
                : `Mensalidade ${MESES[d.getUTCMonth()]}/${d.getUTCFullYear()}`,
            valor: reais(mensalidadeCent),
            vencimento,
            status: statusPorVencimento(vencimento),
          });
        }
      }

      for (const original of apagar) {
        const { data: apagada, error: errDel } = await tx
          .from("cobrancas")
          .delete()
          .eq("aluno_id", alunoId)
          .eq("id", String(original.id))
          .eq("tipo", original.tipo)
          .eq("valor", original.valor)
          .eq("vencimento", original.vencimento)
          .eq("status", original.status)
          .is("descricao", original.descricao ?? null)
          .is("valor_pago", original.valor_pago ?? null)
          .select("id")
          .maybeSingle();
        if (errDel) throw new Error(errDel.message);
        // O DELETE compara o estado exato lido e detém a trava da linha. Uma
        // remarcação dentro da janela também muda a posse do ID; qualquer
        // diferença desfaz a geração inteira, inclusive exclusões anteriores.
        if (!apagada) {
          throw new ErroPlano(409, "Uma cobrança foi recebida ou alterada em outra tela. Nada foi regerado; recarregue a ficha financeira.");
        }
      }

      if (novas.length > 0) {
        const { error: errIns } = await tx.from("cobrancas").insert(novas);
        if (errIns) throw Object.assign(new Error(errIns.message), { code: errIns.code });
      }

      // Meses que o plano mexeu: os que perderam cobrança (a limpeza do espelho
      // olha para eles) e os que ganharam (é onde o espelho precisa escrever).
      const competenciasAfetadas = [
        ...new Set([
          ...apagar
            .filter((c) => c.tipo === "mensalidade")
            .map((c) => competenciaDe(c.vencimento)),
          ...novas
            .filter((c) => c.tipo === "mensalidade")
            .map((c) => competenciaDe(c.vencimento)),
        ]),
      ];
      const espelhoRemovido = await sincronizarEspelho(tx, alunoId, hoje, competenciasAfetadas);

      return { apagar, novas, preservadas: mantidas.length, puladas, espelhoRemovido };
    });
  } catch (e) {
    if (e instanceof ErroPlano) return erroAPI(e.message, e.status);
    if (e instanceof ConflitoEspelho) return erroAPI(e.message, 409);
    const codigo = (e as { code?: string }).code;
    if (codigo === "23505") {
      // Sem a origem, a duplicidade vinda do espelho (alguém lançou a
      // mensalidade do mês na aba Mensalidades no meio da operação) recebia o
      // recado de recarregar a ficha financeira, que não muda nada.
      if (ehFalhaDoEspelho(e)) {
        return erroAPI(
          "Nada foi gravado: um dos meses deste plano acabou de receber mensalidade lançada na aba Mensalidades. Confira essa aba e gere as cobranças de novo.",
          409
        );
      }
      return erroAPI(
        "As cobranças deste aluno acabaram de ser geradas em outra tela. Recarregue a ficha financeira para ver o plano atual.",
        409
      );
    }
    if (codigo === "23514") {
      if (ehFalhaDoEspelho(e)) return erroAPI(MENSAGEM_ESPELHO_RECUSADO, 500);
      return erroAPI(
        "Algum valor do plano não foi aceito. Confira a taxa, a mensalidade e o dia de vencimento e tente de novo.",
        400
      );
    }
    return erros.servidorIndisponivel(e);
  }

  if (plano.apagar.length > 0) {
    // `antes` guarda id -> resumo da cobrança apagada (o normalizador do audit
    // preserva valor por valor nessa chave, então nenhum id se perde).
    await registrarAudit("excluir", "cobrancas", alunoId, {
      motivo: "regeração do plano de pagamento",
      vencimentoMinimoRegerado: corte,
      quantidade: plano.apagar.length,
      totalApagado: reais(plano.apagar.reduce((s, c) => s + cent(c.valor), 0)),
      antes: Object.fromEntries(
        plano.apagar.map((c) => [
          String(c.id),
          `${String(c.descricao ?? c.tipo)} · vence ${String(c.vencimento)} · ${formatBRL(
            Number(c.valor)
          )} · ${String(c.status)}`,
        ])
      ),
    });
  }
  if (plano.novas.length > 0) {
    await registrarAudit("criar", "cobrancas", alunoId, {
      motivo: "geração do plano de pagamento",
      mesBase: competenciaBase,
      criadas: plano.novas.length,
      totalCriado: reais(plano.novas.reduce((s, c) => s + cent(c.valor), 0)),
    });
  }
  await registrarEspelhoRemovido(
    alunoId,
    "competência ficou sem cobrança após a regeração do plano",
    plano.espelhoRemovido
  );

  const { data, error } = await sb
    .from("cobrancas")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("vencimento", { ascending: true });
  if (error) return erros.servidorIndisponivel(error);

  // `avisos` explica um "criadas: 0" que hoje a tela não consegue justificar.
  const avisos: string[] = [];
  if (plano.puladas.length > 0) {
    avisos.push(
      `Meses que já tinham cobrança e não foram gerados de novo: ${plano.puladas
        .map(mesLegivel)
        .join(", ")}.`
    );
  }

  return NextResponse.json({
    ok: true,
    items: (data ?? []).map(rowToCobranca),
    criadas: plano.novas.length,
    removidas: plano.apagar.length,
    preservadas: plano.preservadas,
    mesBase: competenciaBase,
    avisos,
  });
}
