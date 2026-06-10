"use client";

import { Sparkles } from "lucide-react";
import { IndicadorCard } from "@/components/cockpit/indicador-card";
import { FaturamentoChart } from "@/components/cockpit/faturamento-chart";
import { AlertasList } from "@/components/cockpit/alertas-list";
import { ResumoPedagogico } from "@/components/cockpit/resumo-pedagogico";
import { InsightDoDia } from "@/components/cockpit/insight-do-dia";
import { AntesDepois } from "@/components/cockpit/antes-depois";
import { indicadoresCockpit } from "@/lib/mock-data/indicadores-cockpit";
import { usePerfil } from "@/lib/perfil-context";

export default function CockpitPage() {
  const { perfil, nome } = usePerfil();

  // Para professor: mostra cockpit "leve" focado no pedagógico
  const ehProfessor = perfil === "professor";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            COCKPIT
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Bom dia, {nome.split(" ")[0]} <span className="wave-emoji">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {ehProfessor
              ? "Sua visão pedagógica do dia, das suas turmas."
              : "Visão geral da saúde do negócio — terça, 09 de junho de 2026."}
          </p>
        </div>
      </div>

      {!ehProfessor && (
        <>
          {/* Insight do dia */}
          <InsightDoDia />

          {/* Indicadores topo */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {indicadoresCockpit.slice(0, 4).map((ind) => (
              <IndicadorCard key={ind.id} indicador={ind} />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {indicadoresCockpit.slice(4).map((ind) => (
              <IndicadorCard key={ind.id} indicador={ind} />
            ))}
          </div>

          {/* Linha principal: gráfico + alertas */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FaturamentoChart />
            </div>
            <AlertasList />
          </div>

          {/* Antes vs Depois */}
          <AntesDepois />

          {/* Resumo pedagógico */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ResumoPedagogico />
            <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                Diferencial
              </div>
              <h3 className="mt-2 text-lg font-semibold">
                Gestão financeira e pedagógica num só lugar
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Acompanhe quem está em atraso e, ao mesmo tempo, veja como cada aluno
                está evoluindo nas competências fundamentais. Decisões mais rápidas,
                ações mais eficazes.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-card p-3 border">
                  <div className="text-xs text-muted-foreground">Maior nível atingido</div>
                  <div className="mt-1 font-semibold">Alfabético</div>
                  <div className="text-xs text-muted-foreground">
                    Por 1 aluno (Maria Júlia)
                  </div>
                </div>
                <div className="rounded-md bg-card p-3 border">
                  <div className="text-xs text-muted-foreground">Alunos estagnados</div>
                  <div className="mt-1 font-semibold text-warning">3 alunos</div>
                  <div className="text-xs text-muted-foreground">
                    Precisam acompanhamento
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {ehProfessor && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <IndicadorCard indicador={indicadoresCockpit.find((i) => i.id === "alunos-ativos")!} />
            <div className="rounded-lg border bg-card p-5">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Suas turmas
              </div>
              <div className="mt-2 text-2xl font-bold">2</div>
              <div className="text-xs text-muted-foreground">Jardim II - A · 1º Ano - A</div>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                Tarefas no Kanban
              </div>
              <div className="mt-2 text-2xl font-bold">9</div>
              <div className="text-xs text-muted-foreground">3 em andamento, 6 a fazer</div>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ResumoPedagogico />
            <AlertasList />
          </div>
        </>
      )}
    </div>
  );
}
