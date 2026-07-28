"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONTRATOS, type PeriodoContrato } from "@/lib/contrato-modelo";
import type { Aluno } from "@/lib/types";

const PERIODO_LABEL: Record<PeriodoContrato, string> = {
  parcial: "Parcial",
  semi: "Semi-integral",
  intermediario: "Intermediário",
  integral: "Integral",
};
const selectCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function brl(n?: number): string {
  return n != null && Number.isFinite(n)
    ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
}

interface Props {
  aluno: Aluno;
  turma: { nome: string; serie: string; turno: string };
  escola: { nome: string; cnpj: string; endereco: string; telefone: string };
}

export function ContratoEditor({ aluno, turma }: Props) {
  const [periodo, setPeriodo] = React.useState<PeriodoContrato>("parcial");

  const [campos, setCampos] = React.useState<Record<string, string>>(() => {
    const resp = aluno.responsaveis ?? [];
    const pai = resp.find((r) => r.parentesco === "Pai");
    const mae = resp.find((r) => r.parentesco === "Mãe");
    const fin = resp.find((r) => r.responsavelFinanceiro) || resp.find((r) => r.principal) || pai || mae;
    const mens = aluno.mensalidadeValor;
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
      HORARIO: "",
      ANUIDADE: mens ? brl(mens * 12) : "",
      N_PARC: "12",
      PRIM_PARC: "",
      MES_INICIO: "",
      N_PARC2: "11",
      DIA_VENC: aluno.diaVencimento ? String(aluno.diaVencimento) : "",
      VALOR_PARC: mens ? brl(mens) : "",
      DESC_MENS: "",
      DESC_PONT: "",
      RESP_NOME: fin?.nome ?? "",
    };
  });

  const set = (k: string, v: string) => setCampos((c) => ({ ...c, [k]: v }));

  const preencher = React.useCallback(
    (p: string): string =>
      p.replace(/\{\{(\w+)\}\}/g, (_m, tk: string) => {
        if (tk === "PERIODO") return PERIODO_LABEL[periodo];
        const v = campos[tk];
        return v && v.trim() ? v : "____________";
      }),
    [campos, periodo]
  );

  const corpo = CONTRATOS[periodo].corpo;

  const imprimir = () => {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    const paras = corpo
      .map((p) => {
        const t = preencher(p);
        const esc = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const isTitulo = /CONTRATO DE PRESTA/i.test(p);
        const isClausula = /^CL[ÁA]USU/i.test(p.trim());
        const cls = isTitulo ? "titulo" : isClausula ? "clausula" : "";
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
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as PeriodoContrato)}
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
        </div>
      </div>

      <main className="mx-auto max-w-[210mm] px-4 py-6">
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

          <Secao titulo="Financeiro (cláusula 8ª)">
            <C k="ANUIDADE" label="Anuidade R$" campos={campos} set={set} />
            <C k="N_PARC" label="Nº de parcelas" campos={campos} set={set} />
            <C k="VALOR_PARC" label="Valor da parcela R$" campos={campos} set={set} />
            <C k="PRIM_PARC" label="1ª parcela R$" campos={campos} set={set} />
            <C k="MES_INICIO" label="Mês de início" campos={campos} set={set} />
            <C k="DIA_VENC" label="Dia de vencimento" campos={campos} set={set} />
            <C k="DESC_MENS" label="Desconto mensalidade" campos={campos} set={set} />
            <C k="DESC_PONT" label="Desconto pontualidade" campos={campos} set={set} />
          </Secao>
        </div>

        {/* Prévia A4 do contrato */}
        <div className="bg-white p-10 font-serif text-[11pt] leading-relaxed shadow-2xl print:shadow-none">
          {corpo.map((p, i) => {
            const t = preencher(p);
            const isTitulo = /CONTRATO DE PRESTA/i.test(p);
            const isClausula = /^CL[ÁA]USU/i.test(p.trim());
            return (
              <p
                key={i}
                className={
                  isTitulo
                    ? "mb-3 text-center text-[12pt] font-bold"
                    : isClausula
                    ? "mt-2 text-justify"
                    : "mb-1.5 text-justify"
                }
              >
                {t}
              </p>
            );
          })}
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
