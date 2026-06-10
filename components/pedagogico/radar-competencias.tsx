"use client";

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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
import type { AvaliacaoBimestre } from "@/lib/types";

export function RadarCompetencias({
  bimestre,
  bimestreAnterior,
  nome,
}: {
  bimestre: AvaliacaoBimestre;
  bimestreAnterior?: AvaliacaoBimestre;
  nome: string;
}) {
  const dados = [
    {
      competencia: "Leitura",
      atual: bimestre.leitura,
      anterior: bimestreAnterior?.leitura ?? 0,
    },
    {
      competencia: "Escrita",
      atual: bimestre.escrita,
      anterior: bimestreAnterior?.escrita ?? 0,
    },
    {
      competencia: "Lógica-Matemática",
      atual: bimestre.logicaMatematica,
      anterior: bimestreAnterior?.logicaMatematica ?? 0,
    },
    {
      competencia: "Oralidade",
      atual: bimestre.oralidade,
      anterior: bimestreAnterior?.oralidade ?? 0,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Radar de competências — {nome}</CardTitle>
        <CardDescription>
          Equilíbrio das 4 competências no {bimestre.bimestre}º bimestre
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={dados}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="competencia" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 4]} tick={{ fontSize: 10 }} />
              {bimestreAnterior && (
                <Radar
                  name={`${bimestreAnterior.bimestre}º bimestre`}
                  dataKey="anterior"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.15}
                />
              )}
              <Radar
                name={`${bimestre.bimestre}º bimestre`}
                dataKey="atual"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.4}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
