"use client";

import { GraduationCap, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { VisaoTurma } from "@/components/pedagogico/visao-turma";
import { ListaAlunosPedagogica } from "@/components/pedagogico/lista-alunos-pedagogica";
import { ResumoPedagogico } from "@/components/cockpit/resumo-pedagogico";
import { alunosEstagnados } from "@/lib/mock-data/pedagogico";
import { alunos } from "@/lib/mock-data/alunos";

export default function PedagogicoPage() {
  const totalAlunos = alunos.length;
  const estag = alunosEstagnados();
  const ativosAvaliados = totalAlunos;
  const taxaEvolucao = (((totalAlunos - estag.length) / totalAlunos) * 100).toFixed(0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <GraduationCap className="h-3.5 w-3.5" /> PEDAGÓGICO
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Acompanhamento Pedagógico
          </h1>
          <p className="text-sm text-muted-foreground">
            Avaliação bimestral, evolução individual e visão de turma — o diferencial do sistema.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Alunos avaliados</div>
              <div className="mt-1 text-2xl font-bold">{ativosAvaliados}</div>
              <div className="text-xs text-muted-foreground mt-1">2º bimestre/2026</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Taxa de evolução</div>
              <div className="mt-1 text-2xl font-bold text-success">{taxaEvolucao}%</div>
              <div className="text-xs text-muted-foreground mt-1">Avançaram no bimestre</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Estagnação</div>
              <div className="mt-1 text-2xl font-bold text-warning">{estag.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Precisam acompanhamento</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Avaliações registradas</div>
              <div className="mt-1 text-2xl font-bold">{totalAlunos * 4}</div>
              <div className="text-xs text-muted-foreground mt-1">4 bimestres × {totalAlunos} alunos</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="alunos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alunos">Acompanhamento individual</TabsTrigger>
          <TabsTrigger value="turmas">Visão por turma</TabsTrigger>
          <TabsTrigger value="resumo">Resumo geral</TabsTrigger>
          <TabsTrigger value="estagnados">
            <AlertTriangle className="mr-1.5 h-4 w-4 text-warning" /> Estagnados ({estag.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alunos">
          <ListaAlunosPedagogica />
        </TabsContent>

        <TabsContent value="turmas">
          <VisaoTurma />
        </TabsContent>

        <TabsContent value="resumo">
          <ResumoPedagogico />
        </TabsContent>

        <TabsContent value="estagnados">
          <Card className="p-6 space-y-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Alunos em alerta de estagnação ({estag.length})
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Não apresentaram avanço em 3+ competências entre o 1º e 2º bimestre.
                Recomenda-se reunião com a família e plano individual.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {estag.map((e) => (
                <Card key={e.alunoId} className="p-4 border-warning/40">
                  <div className="font-semibold text-sm">{e.alunoNome}</div>
                  <div className="text-xs text-muted-foreground mt-1">Sem evolução em 3 competências</div>
                  <a
                    href={`/pedagogico/${e.alunoId}`}
                    className="mt-3 inline-flex items-center text-xs font-medium text-primary hover:underline"
                  >
                    Ver evolução completa →
                  </a>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
