"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
} from "recharts";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { useEntidade } from "@/lib/data/store";
import { MESES_PT_ABREV } from "@/components/shared/seletor-mes";

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border bg-popover p-3 shadow-md">
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="ml-auto font-semibold">{formatBRL(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FaturamentoChart() {
  const {
    items: mensalidades,
    carregando: carregandoMensalidades,
    erro: erroMensalidades,
    reset: recarregarMensalidades,
  } = useEntidade("mensalidades");
  const {
    items: vendas,
    carregando: carregandoVendas,
    erro: erroVendas,
    reset: recarregarVendas,
  } = useEntidade("vendas");

  // 12 meses até o atual
  const data = React.useMemo(() => {
    const hoje = new Date();
    const lista: Array<{ mes: string; Faturado: number; Recebido: number; Inadimplência: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = d.getFullYear();
      const m = d.getMonth();
      const mm = String(m + 1).padStart(2, "0");
      const comp = `${ano}-${mm}`;
      const inicioMes = `${ano}-${mm}-01`;
      const ultDia = new Date(ano, m + 1, 0).getDate();
      const fimMes = `${ano}-${mm}-${String(ultDia).padStart(2, "0")}`;

      const doMes = mensalidades.filter((mn) => mn.competencia === comp);
      const faturado = doMes.reduce((a, mn) => a + mn.valor, 0)
        + vendas.filter((v) => v.data >= inicioMes && v.data <= fimMes).reduce((a, v) => a + v.total, 0);
      const recebido = doMes.filter((mn) => mn.status === "Paga").reduce((a, mn) => a + (mn.valorPago ?? mn.valor), 0)
        + vendas.filter((v) => v.data >= inicioMes && v.data <= fimMes).reduce((a, v) => a + v.total, 0);
      const inad = doMes.filter((mn) => mn.status === "Atrasada").reduce((a, mn) => a + mn.valor, 0);

      lista.push({
        mes: `${MESES_PT_ABREV[m]}/${String(ano).slice(2)}`,
        Faturado: faturado,
        Recebido: recebido,
        Inadimplência: inad,
      });
    }
    return lista;
  }, [mensalidades, vendas]);

  if (carregandoMensalidades || carregandoVendas) {
    return (
      <Card className="flex min-h-[420px] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando faturamento...
      </Card>
    );
  }

  if (erroMensalidades || erroVendas) {
    return (
      <Card className="flex min-h-[420px] flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-warning" />
        <span>O gráfico financeiro está temporariamente indisponível.</span>
        <button
          type="button"
          onClick={() => {
            recarregarMensalidades();
            recarregarVendas();
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Faturamento — últimos 12 meses</CardTitle>
            <CardDescription>
              Valor faturado vs. recebido vs. inadimplência mensal · calculado em tempo real
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Faturado
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-success" /> Recebido
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-danger" /> Inadimplência
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} />
              <Bar
                dataKey="Faturado"
                fill="url(#gradPrimary)"
                radius={[6, 6, 0, 0]}
                barSize={28}
              />
              <Line
                type="monotone"
                dataKey="Recebido"
                stroke="hsl(var(--success))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(var(--success))" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="Inadimplência"
                stroke="hsl(var(--danger))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(var(--danger))" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
