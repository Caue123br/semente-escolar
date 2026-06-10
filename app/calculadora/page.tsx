"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calculator,
  TrendingUp,
  Clock,
  Heart,
  Sprout,
  ArrowRight,
  Sparkles,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";

export default function CalculadoraPage() {
  const [alunos, setAlunos] = React.useState(150);
  const [ticket, setTicket] = React.useState(2500);
  const [inadimAtual, setInadimAtual] = React.useState(12);
  const [horasPlanilha, setHorasPlanilha] = React.useState(15);

  // Cálculos
  const faturamentoMensal = alunos * ticket;
  const faturamentoAnual = faturamentoMensal * 12;

  // Redução de 45% na inadimplência (média Semente)
  const inadimReducao = inadimAtual * 0.45;
  const ganhoInadimAnual = (faturamentoAnual * (inadimReducao / 100));

  // Horas economizadas → R$ 50/hora coordenação
  const horasEconomizadas = horasPlanilha * 0.8;
  const ganhoHorasAnual = horasEconomizadas * 4 * 12 * 50;

  // Aumento de retenção/captação (3% extras)
  const ganhoRetencaoAnual = faturamentoAnual * 0.03;

  // Custo da Semente (plano Pro)
  const custoSementeAnual =
    alunos <= 80 ? 397 * 12 : alunos <= 250 ? 897 * 12 : alunos * 12 * 4;

  // ROI
  const ganhoTotalAnual = ganhoInadimAnual + ganhoHorasAnual + ganhoRetencaoAnual;
  const lucroLiquido = ganhoTotalAnual - custoSementeAnual;
  const roiPercent = (lucroLiquido / custoSementeAnual) * 100;
  const paybackMeses = (custoSementeAnual / (ganhoTotalAnual / 12)).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-emerald-50/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="font-bold">Semente</span>
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/">Voltar</Link>
            </Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/cockpit">Ver demonstração</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold mb-3">
            <Calculator className="h-3.5 w-3.5" />
            Calculadora de ROI
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Quanto sua escola vai{" "}
            <span className="text-emerald-600">economizar/ganhar</span> com a
            Semente?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Preencha os dados da sua escola e veja a estimativa em tempo real.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form */}
          <Card className="lg:col-span-2 p-6">
            <h2 className="font-bold text-lg mb-4">Dados da sua escola</h2>
            <div className="space-y-4">
              <Field
                label="Número de alunos"
                value={alunos}
                onChange={setAlunos}
                min={20}
                max={1000}
                step={10}
                sufixo="alunos"
              />
              <Field
                label="Mensalidade média"
                value={ticket}
                onChange={setTicket}
                min={500}
                max={5000}
                step={50}
                sufixo="R$"
                prefixo
              />
              <Field
                label="Inadimplência atual"
                value={inadimAtual}
                onChange={setInadimAtual}
                min={0}
                max={50}
                step={1}
                sufixo="%"
              />
              <Field
                label="Horas/semana com planilhas"
                value={horasPlanilha}
                onChange={setHorasPlanilha}
                min={0}
                max={60}
                step={1}
                sufixo="h"
              />
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="text-xs text-muted-foreground">Faturamento atual</div>
              <div className="text-2xl font-bold mt-1">
                {formatBRL(faturamentoMensal)}
                <span className="text-sm text-muted-foreground font-normal"> /mês</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {formatBRL(faturamentoAnual)} no ano
              </div>
            </div>
          </Card>

          {/* Resultados */}
          <Card className="lg:col-span-3 p-6 bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Sua projeção anual com Semente
                </span>
              </div>

              <div className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-white to-emerald-200 bg-clip-text text-transparent">
                {formatBRL(lucroLiquido)}
              </div>
              <div className="text-sm text-emerald-200 mt-1">
                de lucro líquido extra por ano
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <ResultItem
                  icon={Banknote}
                  label="Recuperação de inadimplência"
                  valor={ganhoInadimAnual}
                  desc={`Redução média de ${inadimReducao.toFixed(0)}%`}
                />
                <ResultItem
                  icon={Clock}
                  label="Horas economizadas (R$ 50/h)"
                  valor={ganhoHorasAnual}
                  desc={`${horasEconomizadas.toFixed(0)}h/semana → ${(horasEconomizadas * 4).toFixed(0)}h/mês`}
                />
                <ResultItem
                  icon={Heart}
                  label="Retenção + captação"
                  valor={ganhoRetencaoAnual}
                  desc="3% a mais no faturamento"
                />
                <ResultItem
                  icon={TrendingUp}
                  label="−"
                  isCusto
                  valor={custoSementeAnual}
                  desc="Investimento Semente Pro/ano"
                />
              </div>

              <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-emerald-200">ROI</div>
                  <div className="text-3xl font-bold">{roiPercent.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-xs text-emerald-200">Payback</div>
                  <div className="text-3xl font-bold">{paybackMeses} meses</div>
                </div>
              </div>

              <Button
                asChild
                size="lg"
                className="mt-6 w-full bg-white text-emerald-700 hover:bg-emerald-50"
              >
                <Link href="/cockpit">
                  Ver o sistema funcionando
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted-foreground mt-8 max-w-2xl mx-auto">
          ⚠️ Estimativa baseada na média das escolas Semente nos primeiros 12 meses.
          Resultados reais variam conforme tamanho, perfil das famílias e adesão da equipe.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
  step,
  sufixo,
  prefixo,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  sufixo: string;
  prefixo?: boolean;
}) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="mt-1.5 flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="text-base font-semibold"
        />
        <span className="text-sm text-muted-foreground min-w-[40px]">
          {sufixo}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 accent-emerald-600"
      />
    </div>
  );
}

function ResultItem({
  icon: Icon,
  label,
  valor,
  desc,
  isCusto,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valor: number;
  desc: string;
  isCusto?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase text-emerald-200 font-semibold">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-xl font-bold mt-1">
        {isCusto ? "−" : "+"}
        {formatBRL(valor)}
      </div>
      <div className="text-[10px] text-emerald-200 mt-0.5">{desc}</div>
    </div>
  );
}
