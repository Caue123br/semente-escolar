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

const data = [
  { nome: "Mensalidades", valor: 198400, cor: "#3b82f6" },
  { nome: "Uniformes", valor: 18950, cor: "#10b981" },
  { nome: "Alimentação extra", valor: 12300, cor: "#f59e0b" },
  { nome: "Eventos/festas", valor: 8200, cor: "#a855f7" },
  { nome: "Material escolar", valor: 3350, cor: "#ec4899" },
];

export function ComposicaoReceita() {
  const total = data.reduce((a, b) => a + b.valor, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Composição da receita — Junho</CardTitle>
        <CardDescription>Total {formatBRL(total)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="valor"
                nameKey="nome"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((e) => (
                  <Cell key={e.nome} fill={e.cor} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
