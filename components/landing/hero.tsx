"use client";

import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  PlayCircle,
  Check,
  TrendingUp,
  Users,
  Banknote,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-gradient-radial from-emerald-100/40 via-transparent to-transparent blur-3xl" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute top-40 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          {/* Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 backdrop-blur px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Novo · O 1º sistema que une financeiro + pedagógico
          </div>

          {/* Headline */}
          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            O <span className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-700 bg-clip-text text-transparent">sistema operacional</span>
            <br />
            da sua escola infantil
          </h1>

          {/* Subheadline */}
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
            Pare de viver entre planilhas, WhatsApp e mil sistemas.
            <br className="hidden sm:inline" />
            <strong className="text-foreground">
              Gestão administrativa, financeira e acompanhamento pedagógico
            </strong>{" "}
            no mesmo lugar.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center gap-3">
            <Button
              size="lg"
              asChild
              className="h-12 px-6 text-base bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 transition-all"
            >
              <Link href="/cockpit">
                Ver demonstração ao vivo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-6 text-base">
              <PlayCircle className="mr-2 h-4 w-4" />
              Assistir vídeo de 2 min
            </Button>
          </div>

          {/* Garantias */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              14 dias grátis
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Sem cartão de crédito
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Implantação em 1 dia
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              LGPD by design
            </span>
          </div>

          {/* Hero Mockup */}
          <div className="mt-16 w-full max-w-6xl">
            <HeroMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-x-20 -inset-y-10 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-emerald-500/20 blur-3xl opacity-40 -z-10" />

      {/* Browser frame */}
      <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
        {/* Window controls */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 rounded-md bg-background border text-xs text-muted-foreground font-mono">
              🔒 app.semente.com.br/cockpit
            </div>
          </div>
        </div>

        {/* Faux app preview */}
        <div className="grid grid-cols-[60px_1fr] md:grid-cols-[200px_1fr] bg-background min-h-[420px]">
          {/* Mini sidebar */}
          <div className="hidden md:flex flex-col gap-1 p-3 border-r bg-muted/20">
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Principal
            </div>
            <div className="flex items-center gap-2 rounded-md px-3 py-2 bg-emerald-600 text-white text-xs font-medium shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> Cockpit
            </div>
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground text-xs">
              <Banknote className="h-3.5 w-3.5" /> Financeiro
            </div>
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground text-xs">
              <GraduationCap className="h-3.5 w-3.5" /> Pedagógico
            </div>
            <div className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground text-xs">
              <Users className="h-3.5 w-3.5" /> Alunos
            </div>
          </div>
          <div className="md:hidden p-2 border-r bg-muted/20 space-y-2">
            <div className="h-8 rounded bg-emerald-600/20" />
            <div className="h-8 rounded bg-muted" />
            <div className="h-8 rounded bg-muted" />
          </div>

          {/* Main content */}
          <div className="p-4 md:p-6 space-y-4">
            <div>
              <div className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">
                Cockpit
              </div>
              <h3 className="text-xl md:text-2xl font-bold mt-0.5">Bom dia, Renata 👋</h3>
              <div className="text-xs text-muted-foreground">
                Visão geral do dia · 09 de junho de 2026
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <KpiMini cor="border-l-emerald-500" titulo="Faturamento" valor="R$ 257K" icon={TrendingUp} iconBg="bg-emerald-100 text-emerald-600" />
              <KpiMini cor="border-l-emerald-500" titulo="Recebido" valor="R$ 198K" icon={Banknote} iconBg="bg-emerald-100 text-emerald-600" />
              <KpiMini cor="border-l-amber-500" titulo="A receber" valor="R$ 16K" icon={Users} iconBg="bg-amber-100 text-amber-600" />
              <KpiMini cor="border-l-rose-500" titulo="Inadimplência" valor="R$ 42K" icon={AlertTriangle} iconBg="bg-rose-100 text-rose-600" />
            </div>

            {/* Chart + alertas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 rounded-lg border bg-card p-3">
                <div className="text-xs font-semibold mb-2">Faturamento — últimos 12 meses</div>
                <div className="flex items-end gap-1 h-24">
                  {[55, 60, 64, 67, 65, 70, 72, 76, 80, 78, 74, 88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-rose-500" /> Alertas
                </div>
                <div className="rounded border-l-2 border-rose-500 bg-rose-50/50 px-2 py-1.5">
                  <div className="text-[10px] font-semibold text-rose-700">Inadimplência</div>
                  <div className="text-[10px] text-muted-foreground">3 famílias 30+ dias</div>
                </div>
                <div className="rounded border-l-2 border-amber-500 bg-amber-50/50 px-2 py-1.5">
                  <div className="text-[10px] font-semibold text-amber-700">Pedagógico</div>
                  <div className="text-[10px] text-muted-foreground">Heitor estagnado</div>
                </div>
                <div className="rounded border-l-2 border-rose-500 bg-rose-50/50 px-2 py-1.5">
                  <div className="text-[10px] font-semibold text-rose-700">Estoque baixo</div>
                  <div className="text-[10px] text-muted-foreground">Iogurte: 30 un</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiMini({
  cor,
  titulo,
  valor,
  icon: Icon,
  iconBg,
}: {
  cor: string;
  titulo: string;
  valor: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}) {
  return (
    <div className={`rounded-md border-l-4 ${cor} bg-card border p-2.5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">
            {titulo}
          </div>
          <div className="font-bold text-sm mt-0.5">{valor}</div>
        </div>
        <div className={`h-6 w-6 rounded ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
