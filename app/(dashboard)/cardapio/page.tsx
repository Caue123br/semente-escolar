"use client";

import { UtensilsCrossed, AlertCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cardapioSemana, restricoesAlimentares } from "@/lib/mock-data/cardapio";
import { formatDateBR } from "@/lib/utils";

export default function CardapioPage() {
  const totalCalDia = (i: number) =>
    cardapioSemana[i].refeicoes.reduce((a, r) => a + r.caloriasAprox, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <UtensilsCrossed className="h-3.5 w-3.5" /> ALIMENTAÇÃO
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Cardápio escolar
          </h1>
          <p className="text-sm text-muted-foreground">
            Cardápio nutricionalmente balanceado · Aprovação da nutricionista Dra. Marta Silva.
          </p>
        </div>
      </div>

      <Tabs defaultValue="semana" className="space-y-4">
        <TabsList>
          <TabsTrigger value="semana">Cardápio da semana</TabsTrigger>
          <TabsTrigger value="restricoes">Restrições alimentares</TabsTrigger>
        </TabsList>

        <TabsContent value="semana">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {cardapioSemana.map((dia, i) => (
              <Card key={dia.data}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{dia.diaSemana}</CardTitle>
                      <CardDescription>{formatDateBR(dia.data)}</CardDescription>
                    </div>
                    <Badge variant="info">{totalCalDia(i)} kcal</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dia.refeicoes.map((r, j) => (
                    <div key={j} className="rounded-lg border bg-card p-3 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold uppercase tracking-wide">{r.refeicao}</span>
                        <span className="text-muted-foreground">{r.caloriasAprox} kcal</span>
                      </div>
                      <ul className="space-y-0.5 list-disc list-inside text-muted-foreground">
                        {r.itens.map((item, k) => (
                          <li key={k}>{item}</li>
                        ))}
                      </ul>
                      {r.observacoes && (
                        <div className="mt-2 text-[10px] text-warning flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {r.observacoes}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="restricoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-danger" />
                Restrições e alergias
              </CardTitle>
              <CardDescription>
                {restricoesAlimentares.length} alunos com restrições registradas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {restricoesAlimentares.map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg border-l-4 border-l-danger bg-danger/5 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{r.aluno}</div>
                    <Badge variant="danger">{r.restricao}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{r.obs}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
