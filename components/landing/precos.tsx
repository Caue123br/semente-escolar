"use client";

import * as React from "react";
import Link from "next/link";
import { Check, X, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const planos = [
  {
    nome: "Pequena",
    desc: "Até 80 alunos",
    precoMensal: 397,
    precoAnual: 327,
    cor: "border-border",
    cta: "Começar grátis",
    features: [
      { v: true, t: "Cockpit, Financeiro e Pedagógico" },
      { v: true, t: "Alunos, Responsáveis e Matrículas" },
      { v: true, t: "WhatsApp (até 5 grupos)" },
      { v: true, t: "Calendário e Cardápio" },
      { v: true, t: "Suporte por chat" },
      { v: false, t: "CRM de captação" },
      { v: false, t: "RH & Folha de pagamento" },
      { v: false, t: "Portal dos Pais (app)" },
      { v: false, t: "Nota Fiscal automática" },
      { v: false, t: "Implantação dedicada" },
    ],
  },
  {
    nome: "Pro",
    desc: "Até 250 alunos",
    precoMensal: 897,
    precoAnual: 747,
    destaque: true,
    cor: "border-emerald-500 ring-4 ring-emerald-500/10",
    cta: "Falar com vendas",
    features: [
      { v: true, t: "Tudo do plano Pequena" },
      { v: true, t: "WhatsApp ilimitado" },
      { v: true, t: "CRM completo (funil + leads)" },
      { v: true, t: "RH & Folha de pagamento" },
      { v: true, t: "Portal dos Pais (app)" },
      { v: true, t: "Nota Fiscal NFS-e automática" },
      { v: true, t: "Estoque, Vendas e PDV" },
      { v: true, t: "Berçário e Transporte" },
      { v: true, t: "Implantação dedicada" },
      { v: true, t: "Suporte prioritário" },
    ],
  },
  {
    nome: "Enterprise",
    desc: "Acima de 250 alunos",
    precoMensal: null,
    precoAnual: null,
    cor: "border-border",
    cta: "Falar com vendas",
    features: [
      { v: true, t: "Tudo do plano Pro" },
      { v: true, t: "Multi-unidade (várias escolas)" },
      { v: true, t: "Integrações personalizadas" },
      { v: true, t: "API REST completa" },
      { v: true, t: "SLA contratual" },
      { v: true, t: "Customer Success dedicado" },
      { v: true, t: "Treinamento presencial" },
      { v: true, t: "Migração de sistema antigo" },
      { v: true, t: "Logo e cor personalizadas" },
      { v: true, t: "Onboarding executivo" },
    ],
  },
];

export function LandingPrecos() {
  const [anual, setAnual] = React.useState(true);

  return (
    <section id="precos" className="py-24 lg:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Planos transparentes
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
            Sem letras miúdas.
            <br />
            <span className="text-muted-foreground">Sem surpresa na fatura.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Comece com 14 dias grátis. Sem cartão de crédito.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border bg-card p-1 shadow-sm">
            <button
              onClick={() => setAnual(false)}
              className={cn(
                "px-5 py-1.5 rounded-full text-sm font-semibold transition-colors",
                !anual ? "bg-foreground text-background" : "text-muted-foreground"
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnual(true)}
              className={cn(
                "px-5 py-1.5 rounded-full text-sm font-semibold transition-colors inline-flex items-center gap-1.5",
                anual ? "bg-foreground text-background" : "text-muted-foreground"
              )}
            >
              Anual
              <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                −18%
              </span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {planos.map((p) => (
            <div
              key={p.nome}
              className={cn(
                "relative rounded-3xl border-2 bg-card p-8 shadow-sm",
                p.cor,
                p.destaque && "lg:scale-105 lg:-my-2 shadow-xl"
              )}
            >
              {p.destaque && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-1 text-xs font-bold shadow-md">
                  <Sparkles className="h-3 w-3" />
                  MAIS POPULAR
                </div>
              )}

              <div>
                <h3 className="text-2xl font-bold">{p.nome}</h3>
                <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
              </div>

              <div className="mt-6 mb-6">
                {p.precoMensal === null ? (
                  <div>
                    <div className="text-4xl font-bold tracking-tight">
                      Sob consulta
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Preço baseado no nº de alunos
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-muted-foreground">R$</span>
                      <span className="text-5xl font-bold tracking-tight">
                        {anual ? p.precoAnual : p.precoMensal}
                      </span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                    {anual && (
                      <div className="text-xs text-emerald-600 mt-1 font-semibold">
                        Economize R$ {((p.precoMensal - p.precoAnual!) * 12).toLocaleString("pt-BR")}/ano
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                asChild
                className={cn(
                  "w-full",
                  p.destaque
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md"
                    : ""
                )}
                variant={p.destaque ? "default" : "outline"}
              >
                <Link href="/cockpit">
                  {p.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>

              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li
                    key={f.t}
                    className={cn(
                      "flex items-start gap-2 text-sm",
                      !f.v && "text-muted-foreground/60"
                    )}
                  >
                    {f.v ? (
                      <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                    )}
                    {f.t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          💚 Pagamento via Pix, boleto ou cartão · Sem fidelidade · Cancele quando quiser
        </p>
      </div>
    </section>
  );
}
