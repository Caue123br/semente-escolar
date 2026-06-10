"use client";

import {
  TrendingUp,
  Wallet,
  Clock,
  AlertTriangle,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatBRL, cn } from "@/lib/utils";
import {
  totalFaturadoMes,
  totalRecebidoMes,
  totalInadimplenteMes,
  totalAReceberMes,
  variacaoFaturamentoMesAnterior,
  inadimplentes,
} from "@/lib/mock-data/financeiro";

interface KPI {
  label: string;
  valor: string;
  rodape: string;
  icon: React.ComponentType<{ className?: string }>;
  cor: string;
  bg: string;
}

const kpis: KPI[] = [
  {
    label: "Faturado em junho",
    valor: formatBRL(totalFaturadoMes),
    rodape: `${variacaoFaturamentoMesAnterior >= 0 ? "+" : ""}${variacaoFaturamentoMesAnterior.toFixed(1)}% vs maio`,
    icon: TrendingUp,
    cor: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Recebido",
    valor: formatBRL(totalRecebidoMes),
    rodape: `${((totalRecebidoMes / totalFaturadoMes) * 100).toFixed(1)}% do faturamento`,
    icon: Wallet,
    cor: "text-success",
    bg: "bg-success/10",
  },
  {
    label: "A receber (no prazo)",
    valor: formatBRL(totalAReceberMes),
    rodape: "Vence em 0–10 dias",
    icon: Clock,
    cor: "text-amber-500",
    bg: "bg-amber-100",
  },
  {
    label: "Inadimplência",
    valor: formatBRL(totalInadimplenteMes),
    rodape: `${inadimplentes.length} famílias em atraso`,
    icon: AlertTriangle,
    cor: "text-danger",
    bg: "bg-danger/10",
  },
];

export function KpiRow() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <Card key={k.label} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{k.valor}</p>
                <p className="mt-1 text-xs text-muted-foreground">{k.rodape}</p>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", k.bg)}>
                <Icon className={cn("h-5 w-5", k.cor)} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
