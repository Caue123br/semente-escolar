"use client";

import * as React from "react";
import { Activity, Check, X, Clock, Calendar, Loader2 } from "lucide-react";
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
import { useEntidade } from "@/lib/data/store";
import { formatarErro } from "@/lib/format-error";
import { useToast } from "@/lib/toast";
import { initials, cn, formatDateLocalISO } from "@/lib/utils";

type StatusFreq = "presente" | "ausente" | "atrasado" | "falta_justificada" | "atestado";

function statusDoRegistro(presente: boolean, justificativa?: string): StatusFreq {
  if (!presente) {
    if (justificativa === "Atestado") return "atestado";
    if (justificativa === "Justificada") return "falta_justificada";
    return "ausente";
  }
  if (justificativa === "Atrasado") return "atrasado";
  return "presente";
}

function justificativaDoStatus(status: StatusFreq): string | undefined {
  if (status === "atrasado") return "Atrasado";
  if (status === "atestado") return "Atestado";
  if (status === "falta_justificada") return "Justificada";
  return undefined;
}

export default function FrequenciaPage() {
  const toast = useToast();
  const { items: alunos } = useEntidade("alunos");
  const { items: turmas } = useEntidade("turmas");
  const { items: frequenciaItems, reset } = useEntidade("frequencia");

  const turmasComAlunos = React.useMemo(
    () => turmas.filter((turma) => alunos.some((aluno) => aluno.turmaId === turma.id)),
    [alunos, turmas]
  );
  const [turmaId, setTurmaId] = React.useState<string>("");
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    if (turmasComAlunos.length === 0 && turmaId) setTurmaId("");
    else if (turmasComAlunos.length > 0 && !turmasComAlunos.some((turma) => turma.id === turmaId)) {
      setTurmaId(turmasComAlunos[0].id);
    }
  }, [turmasComAlunos, turmaId]);

  const hoje = formatDateLocalISO();

  // Calcula estado inicial baseado no que está no banco pra hoje
  const [registros, setRegistros] = React.useState<Record<string, StatusFreq>>({});

  React.useEffect(() => {
    const r: Record<string, StatusFreq> = {};
    for (const a of alunos) {
      const reg = frequenciaItems.find((f) => f.alunoId === a.id && f.data === hoje);
      if (reg) {
        r[a.id] = statusDoRegistro(reg.presente, reg.justificativa);
      } else {
        r[a.id] = "presente"; // padrão: presente
      }
    }
    setRegistros(r);
  }, [alunos, frequenciaItems, hoje]);

  const alunosTurma = alunos.filter((a) => a.turmaId === turmaId);
  const presentes = alunosTurma.filter((a) => registros[a.id] === "presente").length;
  const ausentes = alunosTurma.filter((a) => registros[a.id] === "ausente").length;
  const atrasados = alunosTurma.filter((a) => registros[a.id] === "atrasado").length;

  const salvarChamada = async () => {
    if (!turmaId || alunosTurma.length === 0) return;
    setSalvando(true);
    try {
      const response = await fetch("/api/frequencia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chamada: true,
          turmaId,
          data: hoje,
          registros: alunosTurma.map((aluno) => {
            const status = registros[aluno.id] ?? "presente";
            return {
              alunoId: aluno.id,
              presente: status === "presente" || status === "atrasado",
              justificativa: justificativaDoStatus(status),
            };
          }),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: unknown;
        items?: unknown;
      };
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Não foi possível salvar a chamada.");
      }
      if (!Array.isArray(payload.items) || payload.items.length !== alunosTurma.length) {
        throw new Error("O servidor não confirmou a chamada completa.");
      }
      reset();
      toast.success("Chamada salva!", `${presentes} presentes, ${ausentes} ausentes, ${atrasados} atrasados.`);
    } catch (e) {
      toast.error("Erro ao salvar", formatarErro(e));
    } finally {
      setSalvando(false);
    }
  };

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
            Chamada digital · {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
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
          <Button onClick={salvarChamada} disabled={salvando || alunosTurma.length === 0}>
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar chamada
          </Button>
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
              <CardDescription>
                Clique nos botões para alterar o status. Não esqueça de salvar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alunosTurma.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Selecione uma turma com alunos.
                  </div>
                ) : (
                  alunosTurma.map((a) => {
                    const status = registros[a.id] ?? "presente";
                    return (
                      <div
                        key={a.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 flex-wrap",
                          status === "presente" && "bg-success/5 border-success/30",
                          status === "ausente" && "bg-danger/5 border-danger/30",
                          status === "atrasado" && "bg-warning/5 border-warning/30",
                          status === "falta_justificada" && "bg-blue-50 border-blue-300",
                          status === "atestado" && "bg-purple-50 border-purple-300"
                        )}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/15 text-primary text-xs">
                            {initials(a.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 font-medium text-sm">{a.nome}</div>
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" variant={status === "presente" ? "success" : "ghost"} onClick={() => setRegistros((p) => ({ ...p, [a.id]: "presente" }))} title="Presente">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant={status === "atrasado" ? "warning" : "ghost"} onClick={() => setRegistros((p) => ({ ...p, [a.id]: "atrasado" }))} title="Atrasado">
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant={status === "ausente" ? "destructive" : "ghost"} onClick={() => setRegistros((p) => ({ ...p, [a.id]: "ausente" }))} title="Ausente">
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={status === "falta_justificada" ? "secondary" : "ghost"}
                            onClick={() => setRegistros((p) => ({ ...p, [a.id]: "falta_justificada" }))}
                            title="Falta justificada"
                            className="text-[10px] px-2"
                          >
                            J
                          </Button>
                          <Button
                            size="sm"
                            variant={status === "atestado" ? "outline" : "ghost"}
                            onClick={() => setRegistros((p) => ({ ...p, [a.id]: "atestado" }))}
                            title="Atestado médico"
                            className="text-[10px] px-2"
                          >
                            ⚕
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mensal">
          <Card>
            <CardHeader>
              <CardTitle>Frequência mensal</CardTitle>
              <CardDescription>% de presença por aluno nos últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {alunosTurma.map((a) => {
                // Calcula percentual baseado nos registros reais dos últimos 30 dias
                const ate = new Date();
                const de = new Date();
                de.setDate(de.getDate() - 30);
                const deStr = formatDateLocalISO(de);
                const ateStr = formatDateLocalISO(ate);
                const regsAluno = frequenciaItems.filter(
                  (f) => f.alunoId === a.id && f.data >= deStr && f.data <= ateStr
                );
                const presentesAluno = regsAluno.filter((f) => f.presente).length;
                const pct = regsAluno.length === 0
                  ? null
                  : Math.round((presentesAluno / regsAluno.length) * 100);
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials(a.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{a.nome}</span>
                        <Badge variant={pct === null ? "secondary" : pct >= 90 ? "success" : pct >= 75 ? "warning" : "danger"}>
                          {pct === null ? "Sem registros" : `${pct}%`}
                        </Badge>
                      </div>
                      <Progress
                        value={pct ?? 0}
                        indicatorClassName={pct === null ? "bg-muted" : pct >= 90 ? "bg-success" : pct >= 75 ? "bg-warning" : "bg-danger"}
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
