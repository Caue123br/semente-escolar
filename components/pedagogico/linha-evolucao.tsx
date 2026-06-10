"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { AvaliacaoBimestre } from "@/lib/types";

const COMPS = [
  { key: "leitura", label: "Leitura", cor: "#3b82f6" },
  { key: "escrita", label: "Escrita", cor: "#a855f7" },
  { key: "logicaMatematica", label: "Lógica-Matemática", cor: "#f59e0b" },
  { key: "oralidade", label: "Oralidade", cor: "#10b981" },
];

export function LinhaEvolucao({
  avaliacoes,
  nome,
}: {
  avaliacoes: AvaliacaoBimestre[];
  nome: string;
}) {
  const dados = avaliacoes.map((a) => ({
    bim: `${a.bimestre}º bim`,
    Leitura: a.leitura,
    Escrita: a.escrita,
    "Lógica-Matemática": a.logicaMatematica,
    Oralidade: a.oralidade,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Linha de evolução — {nome}</CardTitle>
        <CardDescription>
          Crescimento por bimestre nas 4 competências (escala 1=Iniciante → 4=Pleno)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <ReferenceArea y1={0} y2={1.5} fill="#f8717115" />
              <ReferenceArea y1={1.5} y2={2.5} fill="#fbbf2415" />
              <ReferenceArea y1={2.5} y2={3.5} fill="#84cc1615" />
              <ReferenceArea y1={3.5} y2={4} fill="#10b98115" />
              <XAxis dataKey="bim" tick={{ fontSize: 12 }} />
              <YAxis
                domain={[1, 4]}
                ticks={[1, 2, 3, 4]}
                tick={{ fontSize: 12 }}
                tickFormatter={(v) =>
                  v === 1 ? "Iniciante" : v === 2 ? "Em desenv." : v === 3 ? "Bom" : "Pleno"
                }
                width={90}
              />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {COMPS.map((c) => (
                <Line
                  key={c.key}
                  type="monotone"
                  dataKey={c.label}
                  stroke={c.cor}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: c.cor }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
