"use client";

import * as React from "react";
import { Activity, Check, X, Clock, Calendar } from "lucide-react";
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
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { turmas } from "@/lib/mock-data/turmas";
import { alunos } from "@/lib/mock-data/alunos";
import { initials, cn } from "@/lib/utils";

type StatusFreq = "presente" | "ausente" | "atrasado";

export default function FrequenciaPage() {
  const turmasComAlunos = turmas.filter((t) => alunos.some((a) => a.turmaId === t.id));
  // t5 = Jardim II - A (turma com 7 alunos, boa para demonstração)
  const [turmaId, setTurmaId] = React.useState("t5");
  const [registros, setRegistros] = React.useState<Record<string, StatusFreq>>(() => {
    const r: Record<string, StatusFreq> = {};
    alunos.forEach((a, i) => {
      r[a.id] = i % 11 === 0 ? "ausente" : i % 13 === 0 ? "atrasado" : "presente";
    });
    return r;
  });

  const alunosTurma = alunos.filter((a) => a.turmaId === turmaId);
  const presentes = alunosTurma.filter((a) => registros[a.id] === "presente").length;
  const ausentes = alunosTurma.filter((a) => registros[a.id] === "ausente").length;
  const atrasados = alunosTurma.filter((a) => registros[a.id] === "atrasado").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Activity className="h-3.5 w-3.5" /> FREQUÊNCIA
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Frequência diária
          </h1>
          <p className="text-sm text-muted-foreground">
            Chamada digital · 09 de junho de 2026
          </p>
        </div>
        <div className="flex gap-2">
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
          <Button>Salvar chamada</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Total turma</div>
          <div className="mt-1 text-2xl font-bold">{alunosTurma.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Presentes</div>
          <div className="mt-1 text-2xl font-bold text-success">{presentes}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Ausentes</div>
          <div className="mt-1 text-2xl font-bold text-danger">{ausentes}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Atrasados</div>
          <div className="mt-1 text-2xl font-bold text-warning">{atrasados}</div>
        </Card>
      </div>

      <Tabs defaultValue="hoje" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hoje">Chamada de hoje</TabsTrigger>
          <TabsTrigger value="mensal">
            <Calendar className="mr-1.5 h-4 w-4" /> Mensal por aluno
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoje">
          <Card>
            <CardHeader>
              <CardTitle>Marcar presença</CardTitle>
              <CardDescription>Clique nos botões para alterar o status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alunosTurma.map((a) => {
                  const status = registros[a.id];
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3",
                        status === "presente" && "bg-success/5 border-success/30",
                        status === "ausente" && "bg-danger/5 border-danger/30",
                        status === "atrasado" && "bg-warning/5 border-warning/30"
                      )}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs">
                          {initials(a.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 font-medium text-sm">{a.nome}</div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={status === "presente" ? "success" : "ghost"}
                          onClick={() => setRegistros((p) => ({ ...p, [a.id]: "presente" }))}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={status === "atrasado" ? "warning" : "ghost"}
                          onClick={() => setRegistros((p) => ({ ...p, [a.id]: "atrasado" }))}
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={status === "ausente" ? "destructive" : "ghost"}
                          onClick={() => setRegistros((p) => ({ ...p, [a.id]: "ausente" }))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mensal">
          <Card>
            <CardHeader>
              <CardTitle>Frequência mensal — Junho/2026</CardTitle>
              <CardDescription>% de presença por aluno</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {alunosTurma.map((a, i) => {
                const pct = 100 - (i * 3) % 30;
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials(a.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{a.nome}</span>
                        <Badge variant={pct >= 90 ? "success" : pct >= 75 ? "warning" : "danger"}>
                          {pct}%
                        </Badge>
                      </div>
                      <Progress
                        value={pct}
                        indicatorClassName={pct >= 90 ? "bg-success" : pct >= 75 ? "bg-warning" : "bg-danger"}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
