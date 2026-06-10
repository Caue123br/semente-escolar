"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { turmas } from "@/lib/mock-data/turmas";
import { alunos } from "@/lib/mock-data/alunos";
import { pedagogicoPorAluno, alunosEstagnados } from "@/lib/mock-data/pedagogico";
import { NIVEIS_PSICOGENESE, NivelPsicogenese } from "@/lib/types";

const CORES_NIVEL: Record<NivelPsicogenese, string> = {
  "Pré-silábico": "#fb923c",
  Silábico: "#facc15",
  "Silábico-alfabético": "#84cc16",
  Alfabético: "#10b981",
};

export function VisaoTurma() {
  const turmasComAlunos = turmas.filter((t) =>
    alunos.some((a) => a.turmaId === t.id)
  );
  // t5 = Jardim II - A (turma rica em alunos para demonstrar a tela)
  const [turmaId, setTurmaId] = React.useState("t5");

  const turmaAtual = turmas.find((t) => t.id === turmaId);
  const alunosTurma = alunos.filter((a) => a.turmaId === turmaId);
  const estagnados = alunosEstagnados().filter((e) => e.turmaId === turmaId);

  // Distribuição de leitura na turma
  const dist: Record<NivelPsicogenese, number> = {
    "Pré-silábico": 0,
    Silábico: 0,
    "Silábico-alfabético": 0,
    Alfabético: 0,
  };
  for (const aluno of alunosTurma) {
    const ped = pedagogicoPorAluno.find((p) => p.alunoId === aluno.id);
    if (ped) {
      const atual = ped.avaliacoes[1] ?? ped.avaliacoes[ped.avaliacoes.length - 1];
      dist[atual.leituraNivel]++;
    }
  }

  // Média de competências
  const totais = { leitura: 0, escrita: 0, logicaMatematica: 0, oralidade: 0 };
  for (const aluno of alunosTurma) {
    const ped = pedagogicoPorAluno.find((p) => p.alunoId === aluno.id);
    if (ped) {
      const u = ped.avaliacoes[1] ?? ped.avaliacoes[ped.avaliacoes.length - 1];
      totais.leitura += u.leitura;
      totais.escrita += u.escrita;
      totais.logicaMatematica += u.logicaMatematica;
      totais.oralidade += u.oralidade;
    }
  }
  const n = alunosTurma.length || 1;
  const medias = [
    { competencia: "Leitura", media: +(totais.leitura / n).toFixed(2) },
    { competencia: "Escrita", media: +(totais.escrita / n).toFixed(2) },
    { competencia: "Lógica-Matemática", media: +(totais.logicaMatematica / n).toFixed(2) },
    { competencia: "Oralidade", media: +(totais.oralidade / n).toFixed(2) },
  ];

  const distArr = NIVEIS_PSICOGENESE.map((n) => ({
    nivel: n,
    quantidade: dist[n],
    cor: CORES_NIVEL[n],
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Visão da turma</CardTitle>
            <CardDescription>
              {turmaAtual?.nome} · {alunosTurma.length} alunos · {turmaAtual?.professorNome}
            </CardDescription>
          </div>
          <Select value={turmaId} onValueChange={setTurmaId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {turmasComAlunos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold mb-3">
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
                    {distArr.map((e, i) => (
                      <rect key={i} fill={e.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">
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

        {estagnados.length > 0 && (
          <div className="rounded-lg border-l-4 border-warning bg-warning/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning mb-1">
              ⚠️ {estagnados.length} aluno(s) em estagnação nesta turma
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {estagnados.map((e) => (
                <Badge key={e.alunoId} variant="warning" className="text-xs">
                  {e.alunoNome}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
