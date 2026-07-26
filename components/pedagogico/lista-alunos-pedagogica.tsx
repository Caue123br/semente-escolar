"use client";

import * as React from "react";
import Link from "next/link";
import { Search, AlertTriangle, GraduationCap, ArrowRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  avaliacoesDoAluno,
  listarAlunosEstagnados,
} from "@/lib/pedagogico";
import type { Aluno, AvaliacaoPedagogica, Turma } from "@/lib/types";
import { initials, cn } from "@/lib/utils";

const CORES_NIVEL: Record<string, string> = {
  "Pré-silábico": "bg-orange-100 text-orange-700",
  Silábico: "bg-amber-100 text-amber-700",
  "Silábico-alfabético": "bg-lime-100 text-lime-700",
  Alfabético: "bg-emerald-100 text-emerald-700",
};

interface Props {
  alunos: Aluno[];
  turmas: Turma[];
  avaliacoes: AvaliacaoPedagogica[];
}

export function ListaAlunosPedagogica({ alunos, turmas, avaliacoes }: Props) {
  const [busca, setBusca] = React.useState("");
  const [turmaFiltro, setTurmaFiltro] = React.useState("todas");

  const alunosAtivos = alunos.filter((aluno) => aluno.status === "Ativo");
  const estagnados = new Set(
    listarAlunosEstagnados(alunosAtivos, avaliacoes).map((item) => item.alunoId)
  );

  const filtrados = alunosAtivos.filter((aluno) => {
    const matchBusca = busca
      ? aluno.nome.toLowerCase().includes(busca.toLowerCase())
      : true;
    const matchTurma = turmaFiltro === "todas" || aluno.turmaId === turmaFiltro;
    return matchBusca && matchTurma;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Acompanhamento individual</CardTitle>
            <CardDescription>
              {filtrados.length} alunos · clique em um para ver e lançar avaliações
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                className="w-56 pl-9"
              />
            </div>
            <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as turmas</SelectItem>
                {turmas.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtrados.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {alunosAtivos.length === 0
              ? "Nenhum aluno ativo cadastrado."
              : "Nenhum aluno corresponde aos filtros escolhidos."}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtrados.map((aluno) => {
              const turma = turmas.find((item) => item.id === aluno.turmaId);
              const ultima = avaliacoesDoAluno(avaliacoes, aluno.id).at(-1);
              const isEstagnado = estagnados.has(aluno.id);
              const corTurma = turma?.cor ?? "#64748b";
              return (
                <Link
                  key={aluno.id}
                  href={`/pedagogico/${aluno.id}`}
                  className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <Avatar className="h-11 w-11">
                    <AvatarFallback
                      className="text-xs font-semibold"
                      style={{ backgroundColor: `${corTurma}20`, color: corTurma }}
                    >
                      {initials(aluno.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{aluno.nome}</span>
                      {isEstagnado && (
                        <Badge variant="warning" className="text-[10px]">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Estagnação
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {turma?.nome ?? "Turma não encontrada"}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {ultima ? (
                        <Badge
                          className={cn(
                            "border-transparent text-[10px]",
                            CORES_NIVEL[ultima.leituraNivel]
                          )}
                        >
                          <GraduationCap className="mr-1 h-3 w-3" />
                          {ultima.leituraNivel} · {ultima.bimestre}º/{ultima.ano}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Sem avaliação registrada
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
