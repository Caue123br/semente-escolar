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
import { alunos } from "@/lib/mock-data/alunos";
import { turmas } from "@/lib/mock-data/turmas";
import { pedagogicoPorAluno, alunosEstagnados } from "@/lib/mock-data/pedagogico";
import { initials, cn } from "@/lib/utils";

const CORES_NIVEL: Record<string, string> = {
  "Pré-silábico": "bg-orange-100 text-orange-700",
  Silábico: "bg-amber-100 text-amber-700",
  "Silábico-alfabético": "bg-lime-100 text-lime-700",
  Alfabético: "bg-emerald-100 text-emerald-700",
};

export function ListaAlunosPedagogica() {
  const [busca, setBusca] = React.useState("");
  const [turmaFiltro, setTurmaFiltro] = React.useState("todas");

  const estagnados = new Set(alunosEstagnados().map((e) => e.alunoId));

  const filtrados = alunos.filter((a) => {
    const matchBusca = busca ? a.nome.toLowerCase().includes(busca.toLowerCase()) : true;
    const matchTurma = turmaFiltro === "todas" || a.turmaId === turmaFiltro;
    return matchBusca && matchTurma;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Acompanhamento individual</CardTitle>
            <CardDescription>
              {filtrados.length} alunos · clique em um para ver a linha de evolução
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 w-56"
              />
            </div>
            <Select value={turmaFiltro} onValueChange={setTurmaFiltro}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as turmas</SelectItem>
                {turmas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2">
          {filtrados.map((aluno) => {
            const ped = pedagogicoPorAluno.find((p) => p.alunoId === aluno.id);
            const turma = turmas.find((t) => t.id === aluno.turmaId);
            if (!ped || !turma) return null;
            const ultima = ped.avaliacoes[1] ?? ped.avaliacoes[ped.avaliacoes.length - 1];
            const isEstagnado = estagnados.has(aluno.id);
            return (
              <Link
                key={aluno.id}
                href={`/pedagogico/${aluno.id}`}
                className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:shadow-sm hover:border-primary/40"
              >
                <Avatar className="h-11 w-11">
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{ backgroundColor: turma.cor + "20", color: turma.cor }}
                  >
                    {initials(aluno.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{aluno.nome}</span>
                    {isEstagnado && (
                      <Badge variant="warning" className="text-[10px]">
                        <AlertTriangle className="mr-1 h-3 w-3" /> Estagnação
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{turma.nome}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge
                      className={cn(
                        "text-[10px] border-transparent",
                        CORES_NIVEL[ultima.leituraNivel]
                      )}
                    >
                      <GraduationCap className="mr-1 h-3 w-3" />
                      {ultima.leituraNivel}
                    </Badge>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
