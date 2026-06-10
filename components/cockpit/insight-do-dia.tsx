"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, TrendingUp, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Insight {
  emoji: string;
  titulo: string;
  texto: React.ReactNode;
  acao: string;
  link: string;
  badge: string;
  badgeCor: string;
}

const insights: Insight[] = [
  {
    emoji: "🎯",
    titulo: "Oportunidade pedagógico + financeiro",
    texto: (
      <>
        Identifiquei que <strong>3 alunos estagnados pedagogicamente também
        estão inadimplentes</strong> há mais de 30 dias. Famílias em apuro
        financeiro tendem a esquecer reuniões de pais — proponho uma
        <strong> reunião conjunta com pedagógico + financeiro</strong> pra
        tratar as duas pontas. Posso preparar a pauta?
      </>
    ),
    acao: "Ver alunos e agendar reunião",
    link: "/pedagogico",
    badge: "Cruzamento de dados",
    badgeCor: "bg-violet-100 text-violet-700",
  },
  {
    emoji: "💡",
    titulo: "Sugestão de retenção",
    texto: (
      <>
        Sua taxa de evasão saltou pra <strong>2 alunos esse mês</strong> (vs
        média de 0,5/mês). Os dois pediram informações de transferência depois
        de aumentos de mensalidade. Que tal eu preparar uma{" "}
        <strong>campanha de fidelização</strong> com desconto progressivo para
        contratos de 24 meses?
      </>
    ),
    acao: "Configurar campanha",
    link: "/crm",
    badge: "Risco de evasão",
    badgeCor: "bg-amber-100 text-amber-700",
  },
  {
    emoji: "📈",
    titulo: "Hora de ajustar capacidade",
    texto: (
      <>
        Você está com <strong>88% de ocupação</strong> e 7 novas matrículas em
        junho. Maternal I e Jardim II já passaram dos 90%. Se mantiver esse
        ritmo, precisa <strong>contratar mais uma professora até agosto</strong>{" "}
        ou abrir lista de espera.
      </>
    ),
    acao: "Ver projeção",
    link: "/relatorios",
    badge: "Projeção de capacidade",
    badgeCor: "bg-blue-100 text-blue-700",
  },
];

export function InsightDoDia() {
  const [idx, setIdx] = React.useState(0);
  const insight = insights[idx];

  return (
    <Card className="relative overflow-hidden border-2 border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-card to-card p-5 shadow-md">
      {/* Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-400/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Semente AI · Insight do dia
              </div>
              <div className="text-xs text-muted-foreground">
                Gerado às 07:32 a partir de 12 fontes
              </div>
            </div>
          </div>
          <button
            onClick={() => setIdx((i) => (i + 1) % insights.length)}
            className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground"
            title="Próximo insight"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <Badge className={`${insight.badgeCor} border-transparent text-[10px] mb-2`}>
          {insight.badge}
        </Badge>

        <h3 className="font-bold text-lg flex items-center gap-2">
          <span className="text-2xl">{insight.emoji}</span>
          {insight.titulo}
        </h3>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {insight.texto}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Link href={insight.link}>
              {insight.acao}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIdx((i) => (i + 1) % insights.length)}
          >
            Mostrar outro
          </Button>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-1 mt-3">
          {insights.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1 rounded-full transition-all ${
                i === idx ? "w-6 bg-emerald-600" : "w-1.5 bg-muted-foreground/30"
              }`}
              aria-label={`Insight ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
