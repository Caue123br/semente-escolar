"use client";

import Link from "next/link";
import { GraduationCap, TrendingUp, AlertTriangle, Users } from "lucide-react";

import { ResumoPedagogico } from "@/components/cockpit/resumo-pedagogico";
import { ListaAlunosPedagogica } from "@/components/pedagogico/lista-alunos-pedagogica";
import { VisaoTurma } from "@/components/pedagogico/visao-turma";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEntidade } from "@/lib/data/store";
import {
  avaliacoesDoAluno,
  houveEvolucao,
  listarAlunosEstagnados,
  ultimasAvaliacoesPorAluno,
  ultimasDuasAvaliacoes,
} from "@/lib/pedagogico";

export default function PedagogicoPage() {
  const {
    items: alunos,
    carregando: carregandoAlunos,
    erro: erroAlunos,
  } = useEntidade("alunos");
  const {
    items: turmas,
    carregando: carregandoTurmas,
    erro: erroTurmas,
  } = useEntidade("turmas");
  const {
    items: avaliacoes,
    carregando: carregandoAvaliacoes,
    erro: erroAvaliacoes,
  } = useEntidade("avaliacoes");

  const alunosAtivos = alunos.filter((aluno) => aluno.status === "Ativo");
  const estagnados = listarAlunosEstagnados(alunosAtivos, avaliacoes);
  const avaliados = new Set(
    alunosAtivos
      .filter((aluno) => avaliacoesDoAluno(avaliacoes, aluno.id).length > 0)
      .map((aluno) => aluno.id)
  );
  const comparacoes = alunosAtivos.flatMap((aluno) => {
    const { atual, anterior } = ultimasDuasAvaliacoes(
      avaliacoesDoAluno(avaliacoes, aluno.id)
    );
    return atual && anterior ? [{ atual, anterior }] : [];
  });
  const evoluiram = comparacoes.filter(({ atual, anterior }) =>
    houveEvolucao(atual, anterior)
  ).length;
  const taxaEvolucao = comparacoes.length
    ? `${Math.round((evoluiram / comparacoes.length) * 100)}%`
    : "—";
  const avaliacoesAtuais = ultimasAvaliacoesPorAluno(alunosAtivos, avaliacoes);
  const carregando = carregandoAlunos || carregandoTurmas || carregandoAvaliacoes;
  const erros = [erroAlunos, erroTurmas, erroAvaliacoes].filter(Boolean);

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
            Avaliação bimestral, evolução individual e visão de turma.
          </p>
        </div>
      </div>

      {carregando && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Carregando dados pedagógicos do banco...
        </div>
      )}
      {erros.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar todos os dados pedagógicos: {erros.join(" · ")}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Alunos avaliados</div>
              <div className="mt-1 text-2xl font-bold">{avaliados.size}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                de {alunosAtivos.length} alunos ativos
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Taxa de evolução</div>
              <div className="mt-1 text-2xl font-bold text-success">{taxaEvolucao}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {comparacoes.length} com 2+ avaliações
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Estagnação</div>
              <div className="mt-1 text-2xl font-bold text-warning">{estagnados.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">Precisam acompanhamento</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Avaliações registradas</div>
              <div className="mt-1 text-2xl font-bold">{avaliacoes.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">Registros persistidos no banco</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
            <AlertTriangle className="mr-1.5 h-4 w-4 text-warning" /> Estagnados ({estagnados.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alunos">
          <ListaAlunosPedagogica
            alunos={alunos}
            turmas={turmas}
            avaliacoes={avaliacoes}
          />
        </TabsContent>

        <TabsContent value="turmas">
          <VisaoTurma alunos={alunos} turmas={turmas} avaliacoes={avaliacoes} />
        </TabsContent>

        <TabsContent value="resumo">
          <ResumoPedagogico avaliacoesAtuais={avaliacoesAtuais} />
        </TabsContent>

        <TabsContent value="estagnados">
          <Card className="space-y-4 p-6">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Alunos em alerta de estagnação ({estagnados.length})
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Não apresentaram avanço entre as duas avaliações mais recentes e ainda não
                atingiram nível pleno em todas as competências.
              </p>
            </div>
            {estagnados.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum alerta calculável. São necessárias pelo menos duas avaliações completas
                por aluno.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {estagnados.map((item) => (
                  <Card key={item.alunoId} className="border-warning/40 p-4">
                    <div className="text-sm font-semibold">{item.alunoNome}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Sem evolução nas quatro competências
                    </div>
                    <Link
                      href={`/pedagogico/${item.alunoId}`}
                      className="mt-3 inline-flex items-center text-xs font-medium text-primary hover:underline"
                    >
                      Ver evolução completa →
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
