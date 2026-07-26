"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  Calendar,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { LinhaEvolucao } from "@/components/pedagogico/linha-evolucao";
import { NovaAvaliacaoModal } from "@/components/pedagogico/nova-avaliacao-modal";
import { RadarCompetencias } from "@/components/pedagogico/radar-competencias";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useEntidade } from "@/lib/data/store";
import {
  avaliacoesDoAluno,
  estaEstagnado,
  ultimasDuasAvaliacoes,
} from "@/lib/pedagogico";
import { formatDateBR, initials } from "@/lib/utils";

const CORES_NIVEL: Record<string, string> = {
  "Pré-silábico": "bg-orange-100 text-orange-700",
  Silábico: "bg-amber-100 text-amber-700",
  "Silábico-alfabético": "bg-lime-100 text-lime-700",
  Alfabético: "bg-emerald-100 text-emerald-700",
};

export default function AlunoPedagogicoPage() {
  const params = useParams<{ alunoId: string }>();
  const [modalAberto, setModalAberto] = React.useState(false);
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
    add: salvarAvaliacao,
    carregando: carregandoAvaliacoes,
    erro: erroAvaliacoes,
  } = useEntidade("avaliacoes");

  const carregando = carregandoAlunos || carregandoTurmas || carregandoAvaliacoes;
  const erros = [erroAlunos, erroTurmas, erroAvaliacoes].filter(Boolean);
  const aluno = alunos.find((item) => item.id === params.alunoId);

  if (carregando) {
    return (
      <div className="space-y-6">
        <Link
          href="/pedagogico"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para Pedagógico
        </Link>
        <Card className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando acompanhamento do aluno...
        </Card>
      </div>
    );
  }

  if (!aluno) return notFound();

  const turma = turmas.find((item) => item.id === aluno.turmaId);
  const avaliacoesAluno = avaliacoesDoAluno(avaliacoes, aluno.id);
  const registrosAluno = avaliacoes.filter(
    (avaliacao) => avaliacao.alunoId === aluno.id
  );
  const { atual: ultima, anterior: penultima } =
    ultimasDuasAvaliacoes(avaliacoesAluno);
  const isEstagnado = Boolean(
    ultima && penultima && estaEstagnado(ultima, penultima)
  );
  const corTurma = turma?.cor ?? "#64748b";

  return (
    <div className="space-y-6">
      <Link
        href="/pedagogico"
        className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para Pedagógico
      </Link>

      {erros.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar todos os dados: {erros.join(" · ")}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar className="h-20 w-20">
              <AvatarFallback
                className="text-xl font-bold"
                style={{ backgroundColor: `${corTurma}30`, color: corTurma }}
              >
                {initials(aluno.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{aluno.nome}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>{turma?.nome ?? "Turma não encontrada"}</span>
                {turma?.professorNome && (
                  <>
                    <span>•</span>
                    <span>{turma.professorNome}</span>
                  </>
                )}
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

      {!ultima ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">Nenhuma avaliação registrada</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Lance o primeiro bimestre para iniciar a linha de evolução de {aluno.nome}.
              </p>
            </div>
            <Button onClick={() => setModalAberto(true)}>Lançar primeira avaliação</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs uppercase text-muted-foreground">Leitura (atual)</div>
              <Badge className={`${CORES_NIVEL[ultima.leituraNivel]} mt-2 border-transparent`}>
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
            <LinhaEvolucao avaliacoes={avaliacoesAluno} nome={aluno.nome.split(" ")[0]} />
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
              <CardDescription>
                Todas as avaliações persistidas para este aluno
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...avaliacoesAluno].reverse().map((avaliacao) => (
                  <div
                    key={`${avaliacao.ano}-${avaliacao.bimestre}`}
                    className="rounded-lg border p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="font-semibold">
                        {avaliacao.bimestre}º bimestre de {avaliacao.ano}
                      </div>
                      <Badge
                        className={`${CORES_NIVEL[avaliacao.leituraNivel]} border-transparent`}
                      >
                        {avaliacao.leituraNivel}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Leitura</div>
                        <div className="font-semibold">{avaliacao.leitura}/4</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Escrita</div>
                        <div className="font-semibold">{avaliacao.escrita}/4</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Lógica</div>
                        <div className="font-semibold">{avaliacao.logicaMatematica}/4</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Oralidade</div>
                        <div className="font-semibold">{avaliacao.oralidade}/4</div>
                      </div>
                    </div>
                    {avaliacao.observacao && (
                      <div className="mt-3 border-t pt-3 text-sm italic text-muted-foreground">
                        “{avaliacao.observacao}”
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {ultima && (
          <Button onClick={() => setModalAberto(true)}>Lançar nova avaliação</Button>
        )}
        <Link href={`/boletim/${aluno.id}`} target="_blank">
          <Button variant="outline">Imprimir boletim PDF</Button>
        </Link>
      </div>

      <NovaAvaliacaoModal
        aberto={modalAberto}
        aluno={aluno}
        avaliacoes={registrosAluno}
        onClose={() => setModalAberto(false)}
        onSalvar={salvarAvaliacao}
      />
    </div>
  );
}
