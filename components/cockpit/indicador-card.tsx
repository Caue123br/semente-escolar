"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { IndicadorCockpit } from "@/lib/mock-data/indicadores-cockpit";

const STATUS_RING: Record<string, string> = {
  verde: "border-l-4 border-l-success",
  amarelo: "border-l-4 border-l-warning",
  vermelho: "border-l-4 border-l-danger",
};

const STATUS_DOT: Record<string, string> = {
  verde: "bg-success",
  amarelo: "bg-warning",
  vermelho: "bg-danger",
};

const STATUS_ICONE_BG: Record<string, string> = {
  verde: "bg-success/10 text-success",
  amarelo: "bg-warning/10 text-warning",
  vermelho: "bg-danger/10 text-danger",
};

function IconeDinamico({ nome, className }: { nome: string; className?: string }) {
  const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[nome];
  if (!Icon) return null;
  return <Icon className={className} />;
}

export function IndicadorCard({ indicador }: { indicador: IndicadorCockpit }) {
  const VarIcon =
    indicador.variacaoTipo === "positiva"
      ? TrendingUp
      : indicador.variacaoTipo === "negativa"
      ? TrendingDown
      : Minus;

  const varColor =
    indicador.variacaoTipo === "positiva"
      ? "text-success"
      : indicador.variacaoTipo === "negativa"
      ? "text-danger"
      : "text-muted-foreground";

  return (
    <Link href={indicador.link} className="group block">
      <Card
        className={cn(
          "relative h-full overflow-hidden p-5 transition-all hover:shadow-md hover:-translate-y-0.5",
          STATUS_RING[indicador.status]
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[indicador.status])} />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {indicador.titulo}
              </p>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {indicador.valor}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{indicador.descricao}</p>
            {indicador.variacao && (
              <div className={cn("mt-3 inline-flex items-center gap-1 text-xs font-semibold", varColor)}>
                <VarIcon className="h-3.5 w-3.5" />
                {indicador.variacao}
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
              STATUS_ICONE_BG[indicador.status]
            )}
          >
            <IconeDinamico nome={indicador.icone} className="h-5 w-5" />
          </div>
        </div>
        <ArrowRight className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Card>
    </Link>
  );
}
