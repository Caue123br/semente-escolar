import React from "react";
import Link from "next/link";
import {
  Sprout,
  Check,
  X,
  Minus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LandingFooter } from "@/components/landing/footer";

const concorrentes = ["Semente", "Sponte", "ClassApp", "EduConnect", "Planilha Excel"];

const features = [
  {
    grupo: "Diferenciais Semente",
    itens: [
      { f: "Cockpit unificado financeiro + pedagógico", v: ["yes", "no", "no", "no", "no"] },
      { f: "Insight do dia com IA (cruzamento de dados)", v: ["yes", "no", "no", "no", "no"] },
      { f: "Alerta automático de estagnação", v: ["yes", "no", "partial", "no", "no"] },
      { f: "Antes vs Depois — medindo impacto real", v: ["yes", "no", "no", "no", "no"] },
    ],
  },
  {
    grupo: "Financeiro",
    itens: [
      { f: "Régua de inadimplência com WhatsApp", v: ["yes", "partial", "yes", "partial", "no"] },
      { f: "Conciliação bancária automática", v: ["yes", "no", "no", "no", "no"] },
      { f: "NFS-e automática", v: ["yes", "yes", "no", "yes", "no"] },
      { f: "Pix QR dinâmico", v: ["yes", "no", "yes", "partial", "no"] },
      { f: "DRE e fluxo de caixa", v: ["yes", "yes", "no", "partial", "manual"] },
    ],
  },
  {
    grupo: "Pedagógico",
    itens: [
      { f: "Avaliação por competências", v: ["yes", "partial", "yes", "yes", "no"] },
      { f: "Psicogênese da escrita", v: ["yes", "no", "no", "no", "no"] },
      { f: "Linha de evolução visual", v: ["yes", "no", "yes", "no", "no"] },
      { f: "Gráfico radar de competências", v: ["yes", "no", "no", "no", "no"] },
      { f: "Visão consolidada por turma", v: ["yes", "yes", "partial", "yes", "manual"] },
    ],
  },
  {
    grupo: "Operacional",
    itens: [
      { f: "WhatsApp Business oficial integrado", v: ["yes", "no", "yes", "no", "no"] },
      { f: "Kanban por turma com drag-and-drop", v: ["yes", "no", "no", "no", "no"] },
      { f: "Cardápio + restrições alimentares", v: ["yes", "no", "partial", "no", "no"] },
      { f: "Gestão de transporte escolar", v: ["yes", "no", "no", "no", "no"] },
      { f: "Berçário com rotina dos bebês", v: ["yes", "no", "yes", "no", "no"] },
    ],
  },
  {
    grupo: "Vendas & Captação",
    itens: [
      { f: "CRM de matrículas com funil completo", v: ["yes", "no", "no", "no", "no"] },
      { f: "Análise de origem dos leads", v: ["yes", "no", "no", "no", "no"] },
      { f: "PDV para uniformes e eventos", v: ["yes", "partial", "no", "no", "no"] },
    ],
  },
  {
    grupo: "Suporte & Implantação",
    itens: [
      { f: "Implantação em 1 dia", v: ["yes", "no", "no", "no", "manual"] },
      { f: "Migração de dados sem custo", v: ["yes", "partial", "no", "partial", "n/a"] },
      { f: "Suporte em PT-BR (WhatsApp)", v: ["yes", "partial", "yes", "no", "n/a"] },
      { f: "Treinamento ao vivo da equipe", v: ["yes", "partial", "no", "partial", "n/a"] },
    ],
  },
  {
    grupo: "Compliance",
    itens: [
      { f: "100% LGPD by design", v: ["yes", "yes", "yes", "partial", "no"] },
      { f: "Log de auditoria detalhado", v: ["yes", "partial", "no", "no", "no"] },
      { f: "Backup automático diário", v: ["yes", "yes", "yes", "yes", "no"] },
      { f: "Servidores no Brasil (LGPD)", v: ["yes", "yes", "yes", "partial", "n/a"] },
    ],
  },
];

const ICON_MAP = {
  yes: <Check className="h-4 w-4 text-emerald-600 mx-auto" />,
  no: <X className="h-4 w-4 text-rose-400 mx-auto" />,
  partial: <Minus className="h-4 w-4 text-amber-500 mx-auto" />,
  manual: <span className="text-[9px] text-muted-foreground">manual</span>,
  "n/a": <span className="text-[9px] text-muted-foreground">—</span>,
};

export default function ComparativoPage() {
  return (
    <div className="bg-background">
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="font-bold">Semente</span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/sobre" className="hover:text-foreground">Sobre</Link>
            <Link href="/cases" className="hover:text-foreground">Cases</Link>
            <Link href="/comparativo" className="text-foreground font-medium">Comparativo</Link>
          </nav>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/cockpit">Ver demonstração</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold mb-4">
            <Sparkles className="h-3 w-3" />
            Comparativo honesto
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Semente vs <span className="text-muted-foreground">outros sistemas</span>
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Comparação detalhada com Sponte, ClassApp, EduConnect e planilhas Excel.
            <br />Sem maquiagem.
          </p>
        </div>
      </section>

      {/* Tabela */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-16 z-10">
                  <tr>
                    <th className="text-left p-4 font-bold text-sm w-[35%]">Recurso</th>
                    {concorrentes.map((c, i) => (
                      <th
                        key={c}
                        className={`text-center p-4 font-bold text-sm ${
                          i === 0
                            ? "bg-gradient-to-b from-emerald-600 to-emerald-700 text-white"
                            : "text-muted-foreground"
                        }`}
                      >
                        {c}
                        {i === 0 && (
                          <div className="text-[9px] font-normal text-emerald-100 mt-0.5">
                            ⭐ recomendado
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {features.map((g) => (
                    <React.Fragment key={g.grupo}>
                      <tr className="bg-emerald-50/50 border-y">
                        <td
                          colSpan={6}
                          className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700"
                        >
                          {g.grupo}
                        </td>
                      </tr>
                      {g.itens.map((item, i) => (
                        <tr
                          key={item.f}
                          className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                        >
                          <td className="p-3 text-sm">{item.f}</td>
                          {item.v.map((v, j) => (
                            <td
                              key={j}
                              className={`p-3 text-center ${j === 0 ? "bg-emerald-50/40" : ""}`}
                            >
                              {ICON_MAP[v as keyof typeof ICON_MAP]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t bg-muted/30 text-xs text-muted-foreground flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" /> Inclui
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Minus className="h-3.5 w-3.5 text-amber-500" /> Parcial
              </span>
              <span className="inline-flex items-center gap-1.5">
                <X className="h-3.5 w-3.5 text-rose-400" /> Não inclui
              </span>
              <span className="ml-auto">
                Comparativo atualizado em junho/2026 com base em documentação pública.
              </span>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white text-center">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            A diferença está no detalhe
          </h2>
          <p className="mt-4 text-emerald-100">
            Veja você mesma. Demonstração ao vivo, sem cadastro.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50">
              <Link href="/cockpit">
                Testar Semente agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
