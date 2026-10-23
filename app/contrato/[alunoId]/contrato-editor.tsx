"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONTRATOS, type PeriodoContrato } from "@/lib/contrato-modelo";
import { obterPeriodoMatricula } from "@/lib/periodos-matricula";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { Aluno } from "@/lib/types";

const PERIODO_LABEL: Record<PeriodoContrato, string> = {
  parcial: "Parcial",
  semi: "Semi-integral",
  intermediario: "Intermediário",
  integral: "Integral",
};
const selectCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const MESES_NOME = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function brl(n?: number): string {
  return n != null && Number.isFinite(n)
    ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
}

// Volta de um campo digitado em pt-BR para número, para somar taxa + anuidade.
function numeroBR(v?: string): number | null {
  const bruto = (v ?? "").replace(/[^\d,.-]/g, "");
  if (!bruto) return null;
  const soMilhar = /^-?\d{1,3}(\.\d{3})+$/;
  const normalizado = bruto.includes(",")
    ? bruto.replace(/\./g, "").replace(",", ".")
    : soMilhar.test(bruto)
    ? bruto.replace(/\./g, "")
    : bruto;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

export interface PlanoContrato {
  matriculaTaxa?: number;
  matriculaModalidade?: "avista" | "parcelado";
  matriculaParcelas?: number;
  matriculaForma?: string;
  mensalidadeValor?: number;
  mensalidadePeriodicidade?: "mensal" | "anual";
  diaVencimento?: number;
  dataMatricula?: string;
}

/** Resumo das cobranças já geradas — é o que a família vai receber de fato. */
export interface CobradoContrato {
  matriculaTotal: number;
  matriculaParcelas: number;
  primeiroVencimentoMatricula: string | null;
  anuidadeTotal: number;
  mensalidades: number;
  primeiroVencimentoMensalidade: string | null;
}

interface Props {
  aluno: Aluno;
  turma: { nome: string; serie: string; turno: string };
  escola: { nome: string; cnpj: string; endereco: string; telefone: string };
  plano: PlanoContrato;
  cobrado: CobradoContrato | null;
}

// Dia de vencimento aceito pelo banco (CHECK alunos_dia_vencimento_valido).
function diaValido(dia: number): number | null {
  const n = Math.trunc(Number(dia));
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, 1), 28);
}

function mesNomeDeISO(iso: string, somarMeses = 0): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return "";
  const indice = (Number(m[2]) - 1 + somarMeses) % 12;
  return MESES_NOME[(indice + 12) % 12] ?? "";
}

export function ContratoEditor({ aluno, turma, plano, cobrado }: Props) {
  const periodoMatriculado = obterPeriodoMatricula(aluno.periodo);
  const [categoriaContrato, setCategoriaContrato] = React.useState<PeriodoContrato>(
    () => periodoMatriculado?.contrato ?? "parcial"
  );
  const anual = plano.mensalidadePeriodicidade === "anual";

  const [campos, setCampos] = React.useState<Record<string, string>>(() => {
    const resp = aluno.responsaveis ?? [];
    const pai = resp.find((r) => r.parentesco === "Pai");
    const mae = resp.find((r) => r.parentesco === "Mãe");
    const fin = resp.find((r) => r.responsavelFinanceiro) || resp.find((r) => r.principal) || pai || mae;

    const mens = plano.mensalidadeValor;
    const parcelasAnuidade = anual ? 1 : 12;
    // Só entra no papel a data que tem cobrança gerada por trás: previsão
    // impressa como vencimento vira compromisso que a escola não assumiu.
    const vencAnuidade = cobrado?.primeiroVencimentoMensalidade ?? null;
    const vencTaxa = cobrado?.primeiroVencimentoMatricula ?? null;
    // Dia da parcela: o cadastrado no plano; sem ele, o dia das cobranças já
    // geradas. Sem nenhum dos dois fica em branco — a geração usaria o dia 10,
    // mas isso é default de código, não combinado com a família.
    const diaCobrado = vencAnuidade ? diaValido(Number(vencAnuidade.slice(8, 10))) : null;
    const dia = (plano.diaVencimento != null ? diaValido(plano.diaVencimento) : null) ?? diaCobrado;
    const parcelasTaxa =
      plano.matriculaModalidade === "parcelado" ? Math.max(1, plano.matriculaParcelas ?? 1) : 1;

    return {
      ALUNO_NOME: aluno.nome ?? "",
      PAI_NOME: pai?.nome ?? "",
      PAI_NAC: pai ? "Brasileiro(a)" : "",
      PAI_RG: pai?.rg ?? "",
      PAI_CPF: pai?.cpf ?? "",
      MAE_NOME: mae?.nome ?? "",
      MAE_NAC: mae ? "Brasileira" : "",
      MAE_RG: mae?.rg ?? "",
      MAE_CPF: mae?.cpf ?? "",
      ENDERECO: aluno.endereco ?? "",
      BAIRRO: aluno.bairro ?? "",
      CIDADE: "Taubaté",
      CEP: aluno.cep ?? "",
      NIVEL: turma.serie || turma.nome || "",
      HORARIO: periodoMatriculado?.horario ?? "",
      // A anuidade é o total das mensalidades do plano, não um valor solto.
      ANUIDADE: mens != null ? brl(mens * parcelasAnuidade) : "",
      N_PARC: mens != null ? String(parcelasAnuidade) : "",
      PRIM_PARC: mens != null ? brl(mens) : "",
      // No plano anual não existem parcelas remanescentes: o trecho mensal da
      // cláusula sai em branco, para a direção preencher ou riscar à mão.
      MES_INICIO: !anual && mens != null && vencAnuidade ? mesNomeDeISO(vencAnuidade, 1) : "",
      N_PARC2: !anual && mens != null ? String(parcelasAnuidade - 1) : "",
      DIA_VENC: !anual && mens != null && dia != null ? String(dia) : "",
      VALOR_PARC: !anual && mens != null ? brl(mens) : "",
      PRIM_VENC: vencAnuidade ? formatDateBR(vencAnuidade) : "",
      TAXA_MATR: plano.matriculaTaxa != null ? brl(plano.matriculaTaxa) : "",
      TAXA_PARC: plano.matriculaTaxa != null ? String(parcelasTaxa) : "",
      TAXA_VENC: vencTaxa ? formatDateBR(vencTaxa) : "",
      DESC_MENS: "",
      DESC_PONT: "",
      RESP_NOME: fin?.nome ?? "",
    };
  });

  const set = (k: string, v: string) => setCampos((c) => ({ ...c, [k]: v }));

  const preencher = React.useCallback(
    (p: string): string =>
      p
        .replace(/\{\{(\w+)\}\}/g, (_m, tk: string) => {
          if (tk === "PERIODO") {
            return periodoMatriculado?.contrato === categoriaContrato
              ? periodoMatriculado.nome
              : PERIODO_LABEL[categoriaContrato];
          }
          const v = campos[tk];
          return v && v.trim() ? v : "____________";
        })
        // Na cláusula 8ª o modelo veio do .docx com dois tokens colados na
        // palavra seguinte ("as{{N_PARC2}}", "{{MES_INICIO}}e meses"). O texto
        // legal é verbatim e não se edita: o espaço é reposto ao preencher.
        .replace(/\bas([\d_])/g, "as $1")
        .replace(/(\S)e meses subsequentes/g, "$1 e meses subsequentes"),
    [campos, categoriaContrato, periodoMatriculado]
  );

  const anuidadeContrato = numeroBR(campos.ANUIDADE);
  const taxaContrato = numeroBR(campos.TAXA_MATR);
  const clausulaIncompleta =
    !campos.ANUIDADE.trim() || !campos.N_PARC.trim() || (!anual && !campos.VALOR_PARC.trim());
  const semPlanoCadastrado = plano.mensalidadeValor == null && plano.matriculaTaxa == null;
  const semCobrancaMensalidade =
    plano.mensalidadeValor != null && !cobrado?.primeiroVencimentoMensalidade;
  // Plano com taxa zerada não tem cobrança de matrícula para gerar.
  const semCobrancaTaxa =
    plano.matriculaTaxa != null && plano.matriculaTaxa > 0 && !cobrado?.primeiroVencimentoMatricula;
  // Campo da taxa apagado ou zerado enquanto a escola cobra taxa de matrícula:
  // o quadro-resumo sai sem o item da taxa (omissão), nunca afirmando que ela
  // não existe.
  const taxaCobradaPeloPlano = Math.max(plano.matriculaTaxa ?? 0, cobrado?.matriculaTotal ?? 0);
  const taxaForaDoQuadro = taxaCobradaPeloPlano > 0 && !(taxaContrato != null && taxaContrato > 0);

  // Parágrafo NOVO, não veio do modelo .docx da escola: fica desligado por
  // padrão até a direção aprovar a redação (ver o controle na barra do topo).
  // Ele existe porque o sistema cobra a taxa de matrícula SEPARADA das 12
  // parcelas da anuidade (13 cobranças no plano mensal), enquanto a cláusula
  // 8ª, lida sozinha, dá a entender que a 1ª parcela da anuidade é a paga no
  // ato da matrícula.
  const [incluirQuadro, setIncluirQuadro] = React.useState(false);

  const quadroResumo = React.useMemo(() => {
    const itens: string[] = [];
    const parcelasTaxa = Math.max(1, Math.trunc(Number(campos.TAXA_PARC)) || 1);
    const vencTaxa = campos.TAXA_VENC.trim();

    if (taxaContrato != null && taxaContrato > 0) {
      const forma =
        parcelasTaxa > 1
          ? `em ${parcelasTaxa} parcelas mensais`
          : "em parcela única";
      itens.push(
        `a taxa de matrícula, no valor total de R$ ${brl(taxaContrato)}, é cobrança distinta da ` +
          `anuidade e não integra as parcelas previstas nesta cláusula, sendo cobrada ${forma}` +
          (vencTaxa ? `, com o primeiro vencimento em ${vencTaxa}` : "")
      );
    } else if (plano.matriculaTaxa === 0 && !(cobrado && cobrado.matriculaTotal > 0)) {
      // Só o plano zerado (e sem cobrança de matrícula gerada) autoriza a
      // afirmação negativa. Campo apagado com plano > 0 omite o item e avisa na
      // tela: o contrato assinado não pode afirmar que não existe taxa quando a
      // escola cobra taxa.
      itens.push("não há taxa de matrícula prevista neste plano de pagamento");
    }

    if (anuidadeContrato != null && anuidadeContrato > 0) {
      const parcelas = campos.N_PARC.trim();
      const valorParcela = campos.VALOR_PARC.trim();
      const vencAnuidade = campos.PRIM_VENC.trim();
      const dia = campos.DIA_VENC.trim();
      const corpo =
        parcelas === "1"
          ? `a anuidade, no valor de R$ ${brl(anuidadeContrato)}, é cobrada em parcela única`
          : `a anuidade, no valor total de R$ ${brl(anuidadeContrato)}, é cobrada em ${
              parcelas || "____"
            } parcelas mensais de R$ ${valorParcela || "____"}`;
      // A cláusula 8ª diz que a 1ª parcela vence "no ato da matrícula". O
      // quadro não pode dar uma segunda data para o mesmo pagamento: ele diz
      // com que vencimento essa mesma parcela é cobrada.
      const primeira = vencAnuidade
        ? `, sendo a parcela referida na Cláusula 8ª como devida no ato da matrícula/rematrícula cobrada com vencimento em ${vencAnuidade}`
        : "";
      itens.push(
        corpo +
          primeira +
          (parcelas !== "1" && dia ? ` e as demais todo dia ${dia} dos meses subsequentes` : "")
      );
    }

    if (taxaContrato != null && taxaContrato > 0 && anuidadeContrato != null && anuidadeContrato > 0) {
      itens.push(
        `o total previsto para o ano letivo é de R$ ${brl(taxaContrato + anuidadeContrato)}, ` +
          "correspondente à soma da taxa de matrícula com a anuidade"
      );
    }

    if (itens.length === 0) return "";
    const rotulos = ["(i)", "(ii)", "(iii)"];
    return (
      "Quadro-resumo do plano de pagamento, para esclarecimento da Cláusula 8ª: " +
      itens.map((item, i) => `${rotulos[i] ?? `(${i + 1})`} ${item}`).join("; ") +
      "."
    );
  }, [campos, anuidadeContrato, taxaContrato, plano.matriculaTaxa, cobrado]);

  const corpo = CONTRATOS[categoriaContrato].corpo;

  type Bloco = { texto: string; tipo: "titulo" | "clausula" | "corpo" };
  const blocos = React.useMemo<Bloco[]>(() => {
    const lista: Bloco[] = [];
    for (const p of corpo) {
      const tipo: Bloco["tipo"] = /CONTRATO DE PRESTA/i.test(p)
        ? "titulo"
        : /^CL[ÁA]USU/i.test(p.trim())
        ? "clausula"
        : "corpo";
      lista.push({ texto: preencher(p), tipo });
      if (incluirQuadro && quadroResumo && /^CL[ÁA]USULA 8/i.test(p.trim())) {
        lista.push({ texto: quadroResumo, tipo: "clausula" });
      }
    }
    return lista;
  }, [corpo, preencher, quadroResumo, incluirQuadro]);

  // O que a família vai receber com linha em branco ou redação a conferir.
  const avisosImpressao: string[] = [];
  if (clausulaIncompleta) {
    avisosImpressao.push("a cláusula 8ª sai sem os valores da anuidade");
  }
  if (anual) {
    avisosImpressao.push(
      "o plano é anual (pagamento único) e o modelo fala em parcelas mensais: o trecho das parcelas remanescentes sai em branco"
    );
  }
  if (!anual && plano.mensalidadeValor != null && !campos.MES_INICIO.trim()) {
    avisosImpressao.push("o mês de início das parcelas sai em branco");
  }
  if (incluirQuadro && plano.mensalidadeValor != null && !campos.PRIM_VENC.trim()) {
    avisosImpressao.push("o vencimento da 1ª parcela sai em branco no quadro-resumo");
  }
  if (incluirQuadro && taxaContrato != null && taxaContrato > 0 && !campos.TAXA_VENC.trim()) {
    avisosImpressao.push("o vencimento da taxa de matrícula sai em branco no quadro-resumo");
  }
  if (incluirQuadro && taxaForaDoQuadro) {
    avisosImpressao.push(
      `a escola cobra taxa de matrícula de ${formatBRL(taxaCobradaPeloPlano)}, mas o campo ` +
        "da taxa está sem valor: o quadro-resumo sai sem nenhum item sobre a taxa"
    );
  }
  if (incluirQuadro) {
    avisosImpressao.push(
      "o quadro-resumo está ligado e o texto dele ainda não foi aprovado pela direção"
    );
  }

  const imprimir = () => {
    if (
      avisosImpressao.length > 0 &&
      !window.confirm(
        `Antes de imprimir, confira:\n\n${avisosImpressao
          .map((a) => `• ${a}`)
          .join("\n")}\n\nImprimir assim mesmo?`
      )
    ) {
      return;
    }
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    const paras = blocos
      .map(({ texto, tipo }) => {
        const esc = texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const cls = tipo === "corpo" ? "" : tipo;
        return `<p class="${cls}">${esc}</p>`;
      })
      .join("");
    w.document.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>Contrato</title><style>' +
        "@page{margin:16mm}*{box-sizing:border-box}" +
        "body{font-family:'Times New Roman',Georgia,serif;font-size:11pt;line-height:1.4;color:#000;margin:0}" +
        "p{margin:0 0 6px;text-align:justify}" +
        ".titulo{text-align:center;font-weight:bold;font-size:12pt;margin:0 0 12px}" +
        ".clausula{margin-top:8px}" +
        ".assin{margin-top:40px;display:flex;justify-content:space-between;gap:40px;text-align:center}" +
        ".assin div{flex:1;border-top:1px solid #000;padding-top:4px;font-size:10pt}" +
        "</style></head><body>" +
        paras +
        '<div class="assin"><div>Contratada — Centro Educacional Modelo</div><div>Contratante — Responsável legal</div></div>' +
        "<p style='margin-top:24px'>Taubaté, ______ de ____________________ de ______.</p>" +
        "</body></html>"
    );
    w.document.close();
    w.focus();
    window.setTimeout(() => w.print(), 300);
  };

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Barra de controle */}
      <div className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 shadow-sm print:hidden">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
          <Link href={`/alunos/${aluno.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="periodo" className="text-xs whitespace-nowrap">Período do contrato:</Label>
              <select
                id="periodo"
                className={`${selectCls} w-48`}
                value={categoriaContrato}
                onChange={(e) => {
                  const categoria = e.target.value as PeriodoContrato;
                  setCategoriaContrato(categoria);
                  setCampos((atuais) => ({
                    ...atuais,
                    HORARIO: periodoMatriculado?.contrato === categoria ? periodoMatriculado.horario : "",
                  }));
                }}
              >
                <option value="parcial">Parcial</option>
                <option value="semi">Semi-integral</option>
                <option value="intermediario">Intermediário</option>
                <option value="integral">Integral</option>
              </select>
            </div>
            <Button onClick={imprimir}>
              <Printer className="h-4 w-4" /> Imprimir contrato
            </Button>
          </div>
          <label htmlFor="quadro-resumo" className="flex w-full items-start gap-2 text-xs">
            <input
              id="quadro-resumo"
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
              checked={incluirQuadro}
              onChange={(e) => setIncluirQuadro(e.target.checked)}
            />
            <span>
              <span className="font-semibold">
                Incluir quadro-resumo do plano de pagamento na cláusula 8ª
              </span>{" "}
              <span className="text-amber-700">
                — texto novo, ainda não aprovado pela direção. Não veio do modelo de contrato da
                escola; só ligue se a direção já tiver lido a redação.
              </span>
            </span>
          </label>
        </div>
      </div>

      <main className="mx-auto max-w-[210mm] px-4 py-6">
        {clausulaIncompleta && (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 print:hidden">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="font-bold">
                {semPlanoCadastrado
                  ? "Este aluno ainda não tem plano de pagamento"
                  : "Faltam valores na cláusula 8ª"}
              </div>
              <p className="mt-1">
                Sem a anuidade, o número e o valor das parcelas, o contrato sai com linhas em branco
                justamente na parte financeira. Defina o plano em{" "}
                <Link href={`/alunos/${aluno.id}`} className="font-semibold underline">
                  Alunos → ficha do aluno → Financeiro
                </Link>{" "}
                e gere as cobranças, ou preencha os campos de anuidade abaixo antes de imprimir.
              </p>
            </div>
          </div>
        )}

        {anual && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 print:hidden">
            <span className="font-bold">Plano anual (pagamento único).</span> O modelo de contrato
            fala em parcelas mensais. O trecho das parcelas remanescentes (quantidade, mês de
            início, dia e valor) sai em branco, para a direção completar ou riscar à mão. Revise a
            redação da cláusula 8ª com a direção antes de imprimir.
          </div>
        )}

        {(semCobrancaMensalidade || semCobrancaTaxa) && (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 print:hidden">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="font-bold">
                {semCobrancaMensalidade && semCobrancaTaxa
                  ? "As cobranças deste plano ainda não foram geradas"
                  : semCobrancaMensalidade
                  ? "As mensalidades deste plano ainda não foram geradas"
                  : "A taxa de matrícula ainda não foi gerada"}
              </div>
              <p className="mt-1">
                Sem cobrança gerada não existe vencimento definido, então as datas saem em branco no
                contrato. Gere as cobranças em{" "}
                <Link href={`/alunos/${aluno.id}`} className="font-semibold underline">
                  Alunos → ficha do aluno → Financeiro
                </Link>{" "}
                e recarregue esta página, ou digite as datas abaixo antes de imprimir.
              </p>
            </div>
          </div>
        )}

        {incluirQuadro && taxaForaDoQuadro && (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 print:hidden">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="font-bold">
                O campo da taxa de matrícula está sem valor, mas a escola cobra{" "}
                {formatBRL(taxaCobradaPeloPlano)}
              </div>
              <p className="mt-1">
                O quadro-resumo vai sair sem nenhum item sobre a taxa — ele não afirma que a taxa
                não existe, porque ela existe. Preencha <strong>Taxa de matrícula R$</strong> abaixo
                para a taxa constar no contrato, ou desligue o quadro-resumo se ela não deve
                aparecer.
              </p>
            </div>
          </div>
        )}

        {cobrado && (
          <div className="mb-6 rounded-xl border bg-white p-5 text-sm print:hidden">
            <h2 className="mb-2 text-sm font-bold">Cobranças já geradas para este aluno</h2>
            <ul className="space-y-1 text-muted-foreground">
              {cobrado.matriculaParcelas > 0 && (
                <li>
                  Taxa de matrícula: <strong className="text-foreground">{formatBRL(cobrado.matriculaTotal)}</strong>{" "}
                  em {cobrado.matriculaParcelas} cobrança(s)
                  {cobrado.primeiroVencimentoMatricula
                    ? `, a partir de ${formatDateBR(cobrado.primeiroVencimentoMatricula)}`
                    : ""}
                </li>
              )}
              {cobrado.mensalidades > 0 && (
                <li>
                  Anuidade: <strong className="text-foreground">{formatBRL(cobrado.anuidadeTotal)}</strong>{" "}
                  em {cobrado.mensalidades} mensalidade(s)
                  {cobrado.primeiroVencimentoMensalidade
                    ? `, a partir de ${formatDateBR(cobrado.primeiroVencimentoMensalidade)}`
                    : ""}
                </li>
              )}
            </ul>
            {((anuidadeContrato != null && Math.abs(cobrado.anuidadeTotal - anuidadeContrato) >= 0.01) ||
              (taxaContrato != null && Math.abs(cobrado.matriculaTotal - taxaContrato) >= 0.01)) && (
              <p className="mt-3 rounded-md bg-amber-50 p-3 text-amber-900">
                Os valores das cobranças não batem com os que vão para o contrato. Isso acontece
                quando parte do plano ainda não foi gerada, quando o plano começou no meio do ano
                ou quando foi alterado depois de gerar as cobranças. Confira os dois lados antes de
                imprimir e assinar.
              </p>
            )}
          </div>
        )}

        {/* Form de revisão — não impresso */}
        <div className="mb-6 rounded-xl border bg-white p-5 print:hidden">
          <h2 className="mb-1 text-sm font-bold">Revise os dados antes de imprimir</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Pré-preenchido do cadastro. Ajuste o que precisar — a prévia abaixo atualiza na hora. Campos em branco viram linhas para preencher à mão.
          </p>

          <Secao titulo="Aluno e responsáveis">
            <C k="ALUNO_NOME" label="Nome do aluno" campos={campos} set={set} col2 />
            <C k="PAI_NOME" label="Nome do pai" campos={campos} set={set} />
            <C k="PAI_RG" label="RG do pai" campos={campos} set={set} />
            <C k="PAI_CPF" label="CPF do pai" campos={campos} set={set} />
            <C k="MAE_NOME" label="Nome da mãe" campos={campos} set={set} />
            <C k="MAE_RG" label="RG da mãe" campos={campos} set={set} />
            <C k="MAE_CPF" label="CPF da mãe" campos={campos} set={set} />
            <C k="RESP_NOME" label="Responsável (autorização de imagem)" campos={campos} set={set} col2 />
          </Secao>

          <Secao titulo="Endereço e turma">
            <C k="ENDERECO" label="Endereço" campos={campos} set={set} col2 />
            <C k="BAIRRO" label="Bairro" campos={campos} set={set} />
            <C k="CIDADE" label="Cidade" campos={campos} set={set} />
            <C k="CEP" label="CEP" campos={campos} set={set} />
            <C k="NIVEL" label="Nível" campos={campos} set={set} />
            <C k="HORARIO" label="Horário (Das…)" campos={campos} set={set} />
          </Secao>

          <Secao titulo="Anuidade (cláusula 8ª)">
            <C k="ANUIDADE" label="Anuidade R$" campos={campos} set={set} />
            <C k="N_PARC" label="Nº de parcelas" campos={campos} set={set} />
            <C k="VALOR_PARC" label="Valor da parcela R$" campos={campos} set={set} />
            <C k="PRIM_PARC" label="1ª parcela R$" campos={campos} set={set} />
            <C k="PRIM_VENC" label="Vencimento da 1ª parcela (quadro-resumo)" campos={campos} set={set} />
            <C k="MES_INICIO" label="Mês de início das demais" campos={campos} set={set} />
            <C k="DIA_VENC" label="Dia de vencimento" campos={campos} set={set} />
            <C k="DESC_MENS" label="Desconto mensalidade" campos={campos} set={set} />
            <C k="DESC_PONT" label="Desconto pontualidade" campos={campos} set={set} />
          </Secao>

          <Secao titulo="Taxa de matrícula (cobrança separada da anuidade — só sai no quadro-resumo)">
            <C k="TAXA_MATR" label="Taxa de matrícula R$" campos={campos} set={set} />
            <C k="TAXA_PARC" label="Nº de parcelas da taxa" campos={campos} set={set} />
            <C k="TAXA_VENC" label="1º vencimento da taxa" campos={campos} set={set} />
          </Secao>
        </div>

        {/* Prévia A4 do contrato */}
        <div className="bg-white p-10 font-serif text-[11pt] leading-relaxed shadow-2xl print:shadow-none">
          {blocos.map(({ texto, tipo }, i) => (
            <p
              key={i}
              className={
                tipo === "titulo"
                  ? "mb-3 text-center text-[12pt] font-bold"
                  : tipo === "clausula"
                  ? "mt-2 text-justify"
                  : "mb-1.5 text-justify"
              }
            >
              {texto}
            </p>
          ))}
          <div className="mt-10 flex justify-between gap-10 text-center text-[10pt]">
            <div className="flex-1 border-t border-black pt-1">Contratada — Centro Educacional Modelo</div>
            <div className="flex-1 border-t border-black pt-1">Contratante — Responsável legal</div>
          </div>
          <p className="mt-6">Taubaté, ______ de ____________________ de ______.</p>
        </div>
      </main>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function C({
  k,
  label,
  campos,
  set,
  col2,
}: {
  k: string;
  label: string;
  campos: Record<string, string>;
  set: (k: string, v: string) => void;
  col2?: boolean;
}) {
  return (
    <div className={`space-y-1 ${col2 ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      <Input value={campos[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
    </div>
  );
}
