"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, GraduationCap, Calendar, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LinhaEvolucao } from "@/components/pedagogico/linha-evolucao";
import { RadarCompetencias } from "@/components/pedagogico/radar-competencias";
import { getAluno } from "@/lib/mock-data/alunos";
import { getTurma } from "@/lib/mock-data/turmas";
import { getPedagogicoAluno, alunosEstagnados } from "@/lib/mock-data/pedagogico";
import { initials, formatDateBR } from "@/lib/utils";

const CORES_NIVEL: Record<string, string> = {
  "Pré-silábico": "bg-orange-100 text-orange-700",
  Silábico: "bg-amber-100 text-amber-700",
  "Silábico-alfabético": "bg-lime-100 text-lime-700",
  Alfabético: "bg-emerald-100 text-emerald-700",
};

export default function AlunoPedagogicoPage() {
  const params = useParams<{ alunoId: string }>();
  const aluno = getAluno(params.alunoId);
  if (!aluno) return notFound();

  const turma = getTurma(aluno.turmaId);
  const ped = getPedagogicoAluno(aluno.id);
  if (!turma || !ped) return notFound();

  // O "atual" no protótipo é o 2º bimestre (junho/2026)
  const ultima = ped.avaliacoes[1] ?? ped.avaliacoes[ped.avaliacoes.length - 1];
  const penultima = ped.avaliacoes[0];
  const isEstagnado = alunosEstagnados().some((e) => e.alunoId === aluno.id);

  return (
    <div className="space-y-6">
      <Link
        href="/pedagogico"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para Pedagógico
      </Link>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar className="h-20 w-20">
              <AvatarFallback
                className="text-xl font-bold"
                style={{ backgroundColor: turma.cor + "30", color: turma.cor }}
              >
                {initials(aluno.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{aluno.nome}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{turma.nome}</span>
                <span>•</span>
                <span>{turma.professorNome}</span>
                <span>•</span>
                <span>Matrícula {aluno.matricula}</span>
                {aluno.bilingue && (
                  <Badge variant="info" className="text-[10px]">
                    Bilíngue
                  </Badge>
                )}
                {isEstagnado && (
                  <Badge variant="warning" className="text-[10px]">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Estagnação
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Nascimento</div>
              <div className="font-semibold">{formatDateBR(aluno.dataNascimento)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Leitura (atual)</div>
          <Badge className={`${CORES_NIVEL[ultima.leituraNivel]} border-transparent mt-2`}>
            <GraduationCap className="mr-1 h-3 w-3" />
            {ultima.leituraNivel}
          </Badge>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Escrita</div>
          <div className="mt-1 text-2xl font-bold">{ultima.escrita}/4</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Lógica-Matemática</div>
          <div className="mt-1 text-2xl font-bold">{ultima.logicaMatematica}/4</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Oralidade</div>
          <div className="mt-1 text-2xl font-bold">{ultima.oralidade}/4</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LinhaEvolucao avaliacoes={ped.avaliacoes} nome={aluno.nome.split(" ")[0]} />
        <RadarCompetencias
          bimestre={ultima}
          bimestreAnterior={penultima}
          nome={aluno.nome.split(" ")[0]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Histórico bimestral
          </CardTitle>
          <CardDescription>Detalhes de todas as avaliações de {ped.avaliacoes[0].ano}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ped.avaliacoes.map((av) => (
              <div key={av.bimestre} className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold">
                    {av.bimestre}º bimestre de {av.ano}
                  </div>
                  <Badge className={`${CORES_NIVEL[av.leituraNivel]} border-transparent`}>
                    {av.leituraNivel}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Leitura</div>
                    <div className="font-semibold">{av.leitura}/4</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Escrita</div>
                    <div className="font-semibold">{av.escrita}/4</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Lógica</div>
                    <div className="font-semibold">{av.logicaMatematica}/4</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Oralidade</div>
                    <div className="font-semibold">{av.oralidade}/4</div>
                  </div>
                </div>
                {av.observacao && (
                  <div className="mt-3 pt-3 border-t text-sm text-muted-foreground italic">
                    "{av.observacao}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button>Lançar nova avaliação</Button>
        <Button variant="outline">Imprimir boletim</Button>
        <Button variant="outline">Compartilhar com responsáveis</Button>
      </div>
    </div>
  );
}
