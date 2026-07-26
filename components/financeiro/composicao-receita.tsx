"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { useEntidade } from "@/lib/data/store";
import { usePeriodoContexto } from "@/lib/contexto-periodo";

export function ComposicaoReceita() {
  const { periodo } = usePeriodoContexto();
  const { items: mensalidades } = useEntidade("mensalidades");
  const { items: vendas } = useEntidade("vendas");

  const mensalidadesPagas = mensalidades
    .filter((m) => m.competencia === periodo.competencia && m.status === "Paga")
    .reduce((a, m) => a + (m.valorPago ?? m.valor), 0);

  const vendasDoMes = vendas.filter((v) => v.data >= periodo.inicio && v.data <= periodo.fim);

  const uniformes = vendasDoMes.filter((v) => v.tipo === "Uniforme").reduce((a, v) => a + v.total, 0);
  const alimentacao = vendasDoMes.filter((v) => v.tipo === "Alimentação Extra").reduce((a, v) => a + v.total, 0);
  const eventos = vendasDoMes.filter((v) => v.tipo === "Evento/Festa").reduce((a, v) => a + v.total, 0);
  const atividades = vendasDoMes.filter((v) => v.tipo === "Atividade Extra").reduce((a, v) => a + v.total, 0);
  const material = vendasDoMes.filter((v) => v.tipo === "Material").reduce((a, v) => a + v.total, 0);

  const dataChart = [
    { nome: "Mensalidades", valor: mensalidadesPagas, cor: "#3b82f6" },
    { nome: "Uniformes", valor: uniformes, cor: "#10b981" },
    { nome: "Alimentação extra", valor: alimentacao, cor: "#f59e0b" },
    { nome: "Eventos/festas", valor: eventos, cor: "#a855f7" },
    { nome: "Atividades extras", valor: atividades, cor: "#ef4444" },
    { nome: "Material escolar", valor: material, cor: "#ec4899" },
  ].filter((d) => d.valor > 0);

  const total = dataChart.reduce((a, b) => a + b.valor, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Composição da receita — {periodo.label}</CardTitle>
        <CardDescription>Total {formatBRL(total)}</CardDescription>
      </CardHeader>
      <CardContent>
        {dataChart.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            Sem receita registrada em {periodo.label}.
          </div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataChart}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {dataChart.map((e) => (
                    <Cell key={e.nome} fill={e.cor} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
