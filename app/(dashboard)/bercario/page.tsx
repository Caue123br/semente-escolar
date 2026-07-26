"use client";

import * as React from "react";
import { Baby, Moon, Droplet, Utensils, Sparkles, Plus, Clock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEntidade } from "@/lib/data/store";
import { NovoRegistroBercarioModal } from "@/components/shared/novo-registro-bercario-modal";
import { initials, cn } from "@/lib/utils";

const ICONE_TIPO: Record<string, React.ComponentType<{ className?: string }>> = {
  Sono: Moon,
  Troca: Droplet,
  Alimentação: Utensils,
  Banho: Droplet,
  Observação: Sparkles,
};

const COR_TIPO: Record<string, string> = {
  Sono: "bg-purple-100 text-purple-700",
  Troca: "bg-cyan-100 text-cyan-700",
  Alimentação: "bg-amber-100 text-amber-700",
  Banho: "bg-blue-100 text-blue-700",
  Observação: "bg-pink-100 text-pink-700",
};

const ROTINA_REFERENCIA = [
  { horario: "07:00 - 08:00", atividade: "Acolhida e café da manhã", cor: "bg-amber-100 text-amber-700" },
  { horario: "08:00 - 09:00", atividade: "Atividades sensoriais", cor: "bg-blue-100 text-blue-700" },
  { horario: "09:00 - 09:30", atividade: "Lanche da manhã", cor: "bg-amber-100 text-amber-700" },
  { horario: "09:30 - 10:30", atividade: "Soneca da manhã", cor: "bg-purple-100 text-purple-700" },
  { horario: "10:30 - 11:30", atividade: "Música e movimento", cor: "bg-pink-100 text-pink-700" },
  { horario: "11:30 - 12:30", atividade: "Almoço", cor: "bg-amber-100 text-amber-700" },
  { horario: "12:30 - 14:00", atividade: "Banho e descanso", cor: "bg-cyan-100 text-cyan-700" },
  { horario: "14:00 - 15:00", atividade: "Soneca da tarde", cor: "bg-purple-100 text-purple-700" },
  { horario: "15:00 - 15:30", atividade: "Lanche da tarde", cor: "bg-amber-100 text-amber-700" },
  { horario: "15:30 - 17:00", atividade: "Brincadeiras livres e parque", cor: "bg-emerald-100 text-emerald-700" },
  { horario: "17:00 - 18:30", atividade: "Saída — entrega aos responsáveis", cor: "bg-slate-100 text-slate-700" },
] as const;

export default function BercarioPage() {
  const { items: bebesBercario } = useEntidade("bercarioBebes");
  const { items: registrosBercarioHoje } = useEntidade("bercarioRegistros");
  const [modalAberto, setModalAberto] = React.useState(false);

  const getBebe = (id: string) => bebesBercario.find((b) => b.id === id);
  const trocas = registrosBercarioHoje.filter((r) => r.tipo === "Troca").length;
  const soninhos = registrosBercarioHoje.filter((r) => r.tipo === "Sono").length;
  const refeicoes = registrosBercarioHoje.filter((r) => r.tipo === "Alimentação").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-pink-600">
            <Baby className="h-3.5 w-3.5" /> BERÇÁRIO
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Berçário — Rotina dos bebês
          </h1>
          <p className="text-sm text-muted-foreground">
            Sono, troca, alimentação e observações em tempo real.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo registro
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Bebês hoje</div>
          <div className="mt-1 text-2xl font-bold">{bebesBercario.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Trocas hoje</div>
          <div className="mt-1 text-2xl font-bold text-cyan-600">{trocas}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Soninhos</div>
          <div className="mt-1 text-2xl font-bold text-purple-600">{soninhos}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Refeições</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{refeicoes}</div>
        </Card>
      </div>

      <Tabs defaultValue="hoje" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hoje">Registros de hoje</TabsTrigger>
          <TabsTrigger value="bebes">Por bebê</TabsTrigger>
          <TabsTrigger value="rotina">Rotina do dia</TabsTrigger>
        </TabsList>

        <TabsContent value="hoje">
          <Card>
            <CardHeader>
              <CardTitle>Linha do tempo — Hoje</CardTitle>
              <CardDescription>Todos os registros da turma de berçário</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {registrosBercarioHoje.map((r) => {
                  const Ic = ICONE_TIPO[r.tipo];
                  const bebe = getBebe(r.bebeId);
                  return (
                    <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                          COR_TIPO[r.tipo]
                        )}
                      >
                        <Ic className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{bebe?.nome}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {r.tipo}
                          </Badge>
                          {bebe && (
                            <span className="text-[10px] text-muted-foreground">
                              {bebe.idadeMeses} meses
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{r.detalhes}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {r.hora} · por {r.registradoPor}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bebes">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {bebesBercario.map((bebe) => {
              const regs = registrosBercarioHoje.filter((r) => r.bebeId === bebe.id);
              return (
                <Card key={bebe.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-pink-100 text-pink-700 text-xs">
                          {initials(bebe.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{bebe.nome.split(" ")[0]}</CardTitle>
                        <CardDescription>
                          {bebe.idadeMeses} meses
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {regs.length === 0 && (
                      <div className="text-xs text-muted-foreground italic">
                        Sem registros hoje
                      </div>
                    )}
                    {regs.map((r) => {
                      const Ic = ICONE_TIPO[r.tipo];
                      return (
                        <div key={r.id} className="flex items-start gap-2 text-xs">
                          <div
                            className={cn(
                              "h-6 w-6 rounded flex items-center justify-center shrink-0",
                              COR_TIPO[r.tipo]
                            )}
                          >
                            <Ic className="h-3 w-3" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{r.detalhes}</div>
                            <div className="text-muted-foreground">{r.hora}</div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="rotina">
          <Card>
            <CardHeader>
              <CardTitle>Rotina diária de referência</CardTitle>
              <CardDescription>Modelo visual fixo; ainda não é editável nem salvo no banco.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ROTINA_REFERENCIA.map((r, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                  <Badge variant="outline" className="font-mono text-xs">
                    {r.horario}
                  </Badge>
                  <div className={cn("flex-1 rounded-md px-3 py-1.5 text-sm font-medium", r.cor)}>
                    {r.atividade}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NovoRegistroBercarioModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        bebes={bebesBercario}
      />
    </div>
  );
}
