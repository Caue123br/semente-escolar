"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  avaliacoesDoAluno,
  listarAlunosEstagnados,
} from "@/lib/pedagogico";
import {
  NIVEIS_PSICOGENESE,
  type Aluno,
  type AvaliacaoPedagogica,
  type NivelPsicogenese,
  type Turma,
} from "@/lib/types";

const CORES_NIVEL: Record<NivelPsicogenese, string> = {
  "Pré-silábico": "#fb923c",
  Silábico: "#facc15",
  "Silábico-alfabético": "#84cc16",
  Alfabético: "#10b981",
};

interface Props {
  alunos: Aluno[];
  turmas: Turma[];
  avaliacoes: AvaliacaoPedagogica[];
}

export function VisaoTurma({ alunos, turmas, avaliacoes }: Props) {
  const alunosAtivos = alunos.filter((aluno) => aluno.status === "Ativo");
  const turmasComAlunos = turmas.filter((turma) =>
    alunosAtivos.some((aluno) => aluno.turmaId === turma.id)
  );
  const [turmaId, setTurmaId] = React.useState("");

  React.useEffect(() => {
    if (!turmasComAlunos.some((turma) => turma.id === turmaId)) {
      setTurmaId(turmasComAlunos[0]?.id ?? "");
    }
  }, [turmaId, turmasComAlunos]);

  const turmaAtual = turmas.find((turma) => turma.id === turmaId);
  const alunosTurma = alunosAtivos.filter((aluno) => aluno.turmaId === turmaId);
  const avaliacoesAtuais = alunosTurma.flatMap((aluno) => {
    const ultima = avaliacoesDoAluno(avaliacoes, aluno.id).at(-1);
    return ultima ? [ultima] : [];
  });
  const estagnados = listarAlunosEstagnados(alunosTurma, avaliacoes);

  const distribuicao: Record<NivelPsicogenese, number> = {
    "Pré-silábico": 0,
    Silábico: 0,
    "Silábico-alfabético": 0,
    Alfabético: 0,
  };
  const totais = { leitura: 0, escrita: 0, logicaMatematica: 0, oralidade: 0 };
  for (const avaliacao of avaliacoesAtuais) {
    distribuicao[avaliacao.leituraNivel] += 1;
    totais.leitura += avaliacao.leitura;
    totais.escrita += avaliacao.escrita;
    totais.logicaMatematica += avaliacao.logicaMatematica;
    totais.oralidade += avaliacao.oralidade;
  }

  const quantidadeAvaliada = avaliacoesAtuais.length;
  const medias = [
    {
      competencia: "Leitura",
      media: quantidadeAvaliada
        ? +(totais.leitura / quantidadeAvaliada).toFixed(2)
        : 0,
    },
    {
      competencia: "Escrita",
      media: quantidadeAvaliada
        ? +(totais.escrita / quantidadeAvaliada).toFixed(2)
        : 0,
    },
    {
      competencia: "Lógica-Matemática",
      media: quantidadeAvaliada
        ? +(totais.logicaMatematica / quantidadeAvaliada).toFixed(2)
        : 0,
    },
    {
      competencia: "Oralidade",
      media: quantidadeAvaliada
        ? +(totais.oralidade / quantidadeAvaliada).toFixed(2)
        : 0,
    },
  ];

  const distArr = NIVEIS_PSICOGENESE.map((nivel) => ({
    nivel,
    quantidade: distribuicao[nivel],
    cor: CORES_NIVEL[nivel],
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Visão da turma</CardTitle>
            <CardDescription>
              {turmaAtual ? (
                <>
                  {turmaAtual.nome} · {quantidadeAvaliada} avaliados de {alunosTurma.length}
                  {turmaAtual.professorNome ? ` · ${turmaAtual.professorNome}` : ""}
                </>
              ) : (
                "Nenhuma turma com alunos ativos"
              )}
            </CardDescription>
          </div>
          <Select
            value={turmaId || undefined}
            onValueChange={setTurmaId}
            disabled={turmasComAlunos.length === 0}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecione uma turma" />
            </SelectTrigger>
            <SelectContent>
              {turmasComAlunos.map((turma) => (
                <SelectItem key={turma.id} value={turma.id}>
                  {turma.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!turmaAtual ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Cadastre uma turma e vincule alunos para visualizar os indicadores pedagógicos.
          </div>
        ) : quantidadeAvaliada === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Esta turma ainda não possui avaliações completas registradas.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-semibold">
                Distribuição por nível de leitura (psicogênese)
              </h4>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distArr} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="nivel"
                      tick={{ fontSize: 11 }}
                      width={120}
                    />
                    <Tooltip />
                    <Bar dataKey="quantidade" radius={[0, 6, 6, 0]}>
                      {distArr.map((item) => (
                        <Cell key={item.nivel} fill={item.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold">
                Média da turma por competência (escala 1-4)
              </h4>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={medias}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="competencia" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 4]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="media"
                      fill="hsl(var(--primary))"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {estagnados.length > 0 && (
          <div className="rounded-lg border-l-4 border-warning bg-warning/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-warning">
              ⚠️ {estagnados.length} aluno(s) em estagnação nesta turma
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {estagnados.map((item) => (
                <Badge key={item.alunoId} variant="warning" className="text-xs">
                  {item.alunoNome}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
