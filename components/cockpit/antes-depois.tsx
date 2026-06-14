"use client";

import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

const metricas = [
  {
    label: "Inadimplência",
    antes: "R$ 78.400",
    depois: "R$ 42.800",
    delta: -45,
    direcao: "menor",
    icon: TrendingDown,
    cor: "text-emerald-600",
  },
  {
    label: "Horas/semana com planilhas",
    antes: "18h",
    depois: "3h",
    delta: -83,
    direcao: "menor",
    icon: Clock,
    cor: "text-emerald-600",
  },
  {
    label: "Satisfação dos pais (NPS)",
    antes: "32",
    depois: "71",
    delta: 122,
    direcao: "maior",
    icon: TrendingUp,
    cor: "text-emerald-600",
  },
  {
    label: "Conversão de matrículas",
    antes: "9%",
    depois: "22%",
    delta: 144,
    direcao: "maior",
    icon: TrendingUp,
    cor: "text-emerald-600",
  },
];

export function AntesDepois() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Resultados em 6 meses com a Semente
          </div>
          <h3 className="font-bold text-lg mt-0.5">Antes vs Agora</h3>
        </div>
        <span className="text-xs text-muted-foreground">Escola Modelo</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metricas.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="rounded-lg border bg-card p-3 relative overflow-hidden"
            >
              <div className="text-[10px] uppercase text-muted-foreground mb-1.5 font-medium">
                {m.label}
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground line-through">
                    {m.antes}
                  </div>
                  <div className="text-xl font-bold text-foreground">{m.depois}</div>
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-bold ${m.cor}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m.delta > 0 ? "+" : ""}
                  {m.delta}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground italic">
        Comparação: dezembro/2025 (antes) vs maio/2026 (com Semente).
      </p>
    </Card>
  );
}
