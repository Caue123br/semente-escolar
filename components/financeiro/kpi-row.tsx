"use client";

import {
  TrendingUp,
  Wallet,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatBRL, cn, formatDateLocalISO } from "@/lib/utils";
import { useEntidade } from "@/lib/data/store";
import { usePeriodoContexto } from "@/lib/contexto-periodo";
import { ComparacaoMesAnterior, MESES_PT_ABREV } from "@/components/shared/seletor-mes";
import { dividaEmAberto, somaEmAberto, somaRecebida } from "@/lib/financeiro-mensalidades";
import type { Mensalidade } from "@/lib/types";

const soma = (lista: Mensalidade[]) => lista.reduce((a, m) => a + m.valor, 0);

export function KpiRow() {
  const { periodo, periodoAnterior } = usePeriodoContexto();
  const { items: mensalidades } = useEntidade("mensalidades");

  const hoje = formatDateLocalISO();

  // Atual
  const doMes = mensalidades.filter((m) => m.competencia === periodo.competencia);
  const recebido = somaRecebida(doMes);
  const { atrasadas, aVencer } = dividaEmAberto(doMes, hoje);
  const aReceber = somaEmAberto(aVencer);
  const inadimplencia = somaEmAberto(atrasadas);
  const faturado = soma(doMes);
  const inadimplentesQtd = atrasadas.length;

  const renegociadas = doMes.filter((m) => m.status === "Renegociada");
  const totalRenegociado = somaEmAberto(renegociadas);

  // Anterior pra comparação
  const doMesAnterior = mensalidades.filter((m) => m.competencia === periodoAnterior.competencia);
  const faturadoAnterior = soma(doMesAnterior);
  const recebidoAnterior = somaRecebida(doMesAnterior);
  const inadimplenciaAnterior = somaEmAberto(dividaEmAberto(doMesAnterior, hoje).atrasadas);

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
        rodape={`${aVencer.length} parcela${aVencer.length !== 1 ? "s" : ""} com vencimento a chegar`}
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
      {totalRenegociado > 0 && (
        <p className="text-xs text-muted-foreground md:col-span-2 xl:col-span-4">
          {renegociadas.length === 1
            ? `1 mensalidade renegociada de ${formatBRL(totalRenegociado)} está contada acima`
            : `${renegociadas.length} mensalidades renegociadas somando ${formatBRL(totalRenegociado)} estão contadas acima`}{" "}
          — em “a receber” ou em “inadimplência”, conforme o novo vencimento. O valor cobrado antes do acordo não fica
          guardado pelo sistema: anote-o no histórico do aluno antes de renegociar.
        </p>
      )}
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
