"use client";

import * as React from "react";
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
import { useEntidade } from "@/lib/data/store";
import { usePeriodoContexto } from "@/lib/contexto-periodo";
import { MESES_PT_ABREV } from "@/components/shared/seletor-mes";

export function FluxoCaixaTab() {
  const { periodo } = usePeriodoContexto();
  const { items: mensalidades } = useEntidade("mensalidades");
  const { items: vendas } = useEntidade("vendas");
  const { items: despesas } = useEntidade("despesas");
  const { items: funcionarios } = useEntidade("funcionarios");

  const folhaMensal = funcionarios.filter((f) => f.status === "Ativo").reduce((a, f) => a + f.salarioBruto, 0);
  // Encargos estimados (~28%)
  const folhaComEncargos = folhaMensal * 1.28;

  // Calcula 12 meses (incluindo o atual)
  const dados = React.useMemo(() => {
    const lista: Array<{ mes: string; competencia: string; entrada: number; saida: number; saldo: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(periodo.ano, periodo.mes - i, 1);
      const ano = d.getFullYear();
      const m = d.getMonth();
      const mm = String(m + 1).padStart(2, "0");
      const comp = `${ano}-${mm}`;
      const inicioMes = `${ano}-${mm}-01`;
      const ultimoDia = new Date(ano, m + 1, 0).getDate();
      const fimMes = `${ano}-${mm}-${String(ultimoDia).padStart(2, "0")}`;

      // Entradas: mensalidades pagas + vendas
      const entradaMens = mensalidades
        .filter((mn) => mn.competencia === comp && mn.status === "Paga")
        .reduce((a, mn) => a + (mn.valorPago ?? mn.valor), 0);
      const entradaVendas = vendas
        .filter((v) => v.data >= inicioMes && v.data <= fimMes)
        .reduce((a, v) => a + v.total, 0);
      const entrada = entradaMens + entradaVendas;

      // Saídas: despesas pagas + estimativa de folha
      const saidaDespesas = despesas
        .filter((dp) => dp.data >= inicioMes && dp.data <= fimMes && dp.status === "Paga")
        .reduce((a, dp) => a + dp.valor, 0);
      const saida = saidaDespesas + folhaComEncargos;

      lista.push({
        mes: `${MESES_PT_ABREV[m]}/${String(ano).slice(2)}`,
        competencia: comp,
        entrada,
        saida,
        saldo: entrada - saida,
      });
    }
    return lista;
  }, [periodo, mensalidades, vendas, despesas, folhaComEncargos]);

  const saldoMesAtual = dados[dados.length - 1]?.saldo ?? 0;
  const saldoAcumulado = dados.reduce((a, b) => a + b.saldo, 0);
  const mediaSaldo3m = dados.slice(-3).reduce((a, b) => a + b.saldo, 0) / 3;
  const projecao3m = mediaSaldo3m * 3;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Saldo de {periodo.label}</div>
          <div className={`mt-1 text-2xl font-bold ${saldoMesAtual >= 0 ? "text-success" : "text-danger"}`}>
            {formatBRL(saldoMesAtual)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Entradas - saídas (estimado)</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Saldo acumulado 12m</div>
          <div className={`mt-1 text-2xl font-bold ${saldoAcumulado >= 0 ? "text-foreground" : "text-danger"}`}>
            {formatBRL(saldoAcumulado)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Projeção próximos 3m</div>
          <div className={`mt-1 text-2xl font-bold ${projecao3m >= 0 ? "text-primary" : "text-danger"}`}>
            {formatBRL(projecao3m)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Com base na média móvel</div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fluxo de caixa — 12 meses até {periodo.label}</CardTitle>
          <CardDescription>
            Entradas (mensalidades + vendas), saídas (despesas + folha com encargos), saldo mensal.
          </CardDescription>
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
