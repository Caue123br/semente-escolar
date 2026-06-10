"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";

const dados = [
  { mes: "Jul/25", entrada: 184200, saida: 152400, saldo: 31800 },
  { mes: "Ago/25", entrada: 191800, saida: 158200, saldo: 33600 },
  { mes: "Set/25", entrada: 196200, saida: 163800, saldo: 32400 },
  { mes: "Out/25", entrada: 199400, saida: 165400, saldo: 34000 },
  { mes: "Nov/25", entrada: 198700, saida: 168200, saldo: 30500 },
  { mes: "Dez/25", entrada: 207800, saida: 178500, saldo: 29300 },
  { mes: "Jan/26", entrada: 215300, saida: 172800, saldo: 42500 },
  { mes: "Fev/26", entrada: 218400, saida: 174300, saldo: 44100 },
  { mes: "Mar/26", entrada: 220500, saida: 176200, saldo: 44300 },
  { mes: "Abr/26", entrada: 219800, saida: 178600, saldo: 41200 },
  { mes: "Mai/26", entrada: 215200, saida: 179800, saldo: 35400 },
  { mes: "Jun/26", entrada: 198400, saida: 183300, saldo: 15100 },
];

export function FluxoCaixaTab() {
  const saldoAcumulado = dados.reduce((a, b) => a + b.saldo, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Saldo do mês</div>
          <div className="mt-1 text-2xl font-bold text-success">
            {formatBRL(dados[dados.length - 1].saldo)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Junho · entrada - saída
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Saldo acumulado 12m</div>
          <div className="mt-1 text-2xl font-bold">{formatBRL(saldoAcumulado)}</div>
          <div className="text-xs text-muted-foreground mt-1">Jul/25 → Jun/26</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Projeção próximos 3m</div>
          <div className="mt-1 text-2xl font-bold text-primary">{formatBRL(132400)}</div>
          <div className="text-xs text-muted-foreground mt-1">Com base na média móvel</div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fluxo de caixa — 12 meses</CardTitle>
          <CardDescription>Entradas, saídas e saldo mensal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entrada" name="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saida" name="Saídas" fill="hsl(var(--danger))" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
