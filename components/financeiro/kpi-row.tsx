"use client";

import {
  TrendingUp,
  Wallet,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatBRL, cn } from "@/lib/utils";
import { useEntidade } from "@/lib/data/store";
import { usePeriodoContexto } from "@/lib/contexto-periodo";
import { ComparacaoMesAnterior, MESES_PT_ABREV } from "@/components/shared/seletor-mes";

export function KpiRow() {
  const { periodo, periodoAnterior } = usePeriodoContexto();
  const { items: mensalidades } = useEntidade("mensalidades");

  // Atual
  const doMes = mensalidades.filter((m) => m.competencia === periodo.competencia);
  const recebido = doMes.filter((m) => m.status === "Paga").reduce((a, m) => a + (m.valorPago ?? m.valor), 0);
  const aReceber = doMes.filter((m) => m.status === "A Vencer" || m.status === "Vence Hoje").reduce((a, m) => a + m.valor, 0);
  const inadimplencia = doMes.filter((m) => m.status === "Atrasada").reduce((a, m) => a + m.valor, 0);
  const faturado = doMes.reduce((a, m) => a + m.valor, 0);
  const inadimplentesQtd = doMes.filter((m) => m.status === "Atrasada").length;

  // Anterior pra comparação
  const doMesAnterior = mensalidades.filter((m) => m.competencia === periodoAnterior.competencia);
  const faturadoAnterior = doMesAnterior.reduce((a, m) => a + m.valor, 0);
  const recebidoAnterior = doMesAnterior.filter((m) => m.status === "Paga").reduce((a, m) => a + (m.valorPago ?? m.valor), 0);
  const inadimplenciaAnterior = doMesAnterior.filter((m) => m.status === "Atrasada").reduce((a, m) => a + m.valor, 0);

  const mesNome = MESES_PT_ABREV[periodo.mes];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label={`Faturado em ${mesNome}`}
        valor={faturado}
        icone={TrendingUp}
        cor="text-primary"
        bg="bg-primary/10"
        comparacaoAnterior={faturadoAnterior}
        rodape={`${doMes.length} mensalidades`}
      />
      <KpiCard
        label="Recebido"
        valor={recebido}
        icone={Wallet}
        cor="text-success"
        bg="bg-success/10"
        comparacaoAnterior={recebidoAnterior}
        rodape={faturado > 0 ? `${((recebido / faturado) * 100).toFixed(1)}% do faturamento` : "—"}
      />
      <KpiCard
        label="A receber (no prazo)"
        valor={aReceber}
        icone={Clock}
        cor="text-amber-500"
        bg="bg-amber-100"
        rodape="Vence ainda neste mês"
      />
      <KpiCard
        label="Inadimplência"
        valor={inadimplencia}
        icone={AlertTriangle}
        cor="text-danger"
        bg="bg-danger/10"
        comparacaoAnterior={inadimplenciaAnterior}
        rodape={`${inadimplentesQtd} fam${inadimplentesQtd !== 1 ? "ílias" : "ília"} em atraso`}
      />
    </div>
  );
}

function KpiCard({
  label,
  valor,
  icone: Icon,
  cor,
  bg,
  rodape,
  comparacaoAnterior,
}: {
  label: string;
  valor: number;
  icone: React.ComponentType<{ className?: string }>;
  cor: string;
  bg: string;
  rodape: string;
  comparacaoAnterior?: number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{formatBRL(valor)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{rodape}</p>
          {comparacaoAnterior !== undefined && (
            <div className="mt-2">
              <ComparacaoMesAnterior atual={valor} anterior={comparacaoAnterior} />
            </div>
          )}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bg)}>
          <Icon className={cn("h-5 w-5", cor)} />
        </div>
      </div>
    </Card>
  );
}
