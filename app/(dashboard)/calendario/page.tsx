"use client";

import * as React from "react";
import { Calendar, Plus, ChevronLeft, ChevronRight } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { TipoEvento } from "@/lib/mock-data/calendario";
import { useEntidade } from "@/lib/data/store";
import { NovoEventoModal } from "@/components/shared/novo-evento-modal";

const COR_TIPO: Record<TipoEvento, string> = {
  Aula: "bg-blue-100 text-blue-700 border-blue-300",
  Reunião: "bg-purple-100 text-purple-700 border-purple-300",
  Festa: "bg-pink-100 text-pink-700 border-pink-300",
  Passeio: "bg-amber-100 text-amber-700 border-amber-300",
  Avaliação: "bg-red-100 text-red-700 border-red-300",
  Feriado: "bg-slate-200 text-slate-700 border-slate-400",
  Recesso: "bg-slate-200 text-slate-700 border-slate-400",
  "Formação Docente": "bg-cyan-100 text-cyan-700 border-cyan-300",
  Visita: "bg-emerald-100 text-emerald-700 border-emerald-300",
  Outros: "bg-gray-100 text-gray-700 border-gray-300",
};

const NOMES_MES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function CalendarioPage() {
  const [mes, setMes] = React.useState(5); // junho
  const ano = 2026;
  const [modalAberto, setModalAberto] = React.useState(false);
  const { items: eventos } = useEntidade("eventos");

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const diasMes = Array.from({ length: ultimoDia }, (_, i) => i + 1);
  const offset = Array.from({ length: primeiroDia }, () => null);
  const cells = [...offset, ...diasMes];

  const eventosMes = eventos.filter((e) => {
    const d = new Date(e.data);
    return d.getMonth() === mes && d.getFullYear() === ano;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Calendar className="h-3.5 w-3.5" /> CALENDÁRIO
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Calendário escolar
          </h1>
          <p className="text-sm text-muted-foreground">
            Eventos, festas, reuniões, avaliações e feriados.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo evento
        </Button>
      </div>

      <NovoEventoModal aberto={modalAberto} onClose={() => setModalAberto(false)} />

      <Tabs defaultValue="mes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mes">Mês</TabsTrigger>
          <TabsTrigger value="lista">Próximos eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="mes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {NOMES_MES[mes]} {ano}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setMes((m) => (m > 0 ? m - 1 : 11))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setMes((m) => (m < 11 ? m + 1 : 0))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                  <div key={d} className="text-center text-xs font-bold uppercase text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((dia, i) => {
                  if (dia === null) {
                    return <div key={i} className="h-24" />;
                  }
                  const dataStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(
                    dia
                  ).padStart(2, "0")}`;
                  const eventosDia = eventos.filter((e) => e.data === dataStr);
                  const hoje = dia === 9 && mes === 5;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "border rounded-md p-1.5 min-h-[100px] hover:bg-accent/30 transition-colors",
                        hoje && "border-primary bg-primary/5"
                      )}
                    >
                      <div className={cn("text-xs font-semibold mb-1", hoje && "text-primary")}>
                        {dia}
                      </div>
                      <div className="space-y-0.5">
                        {eventosDia.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className={cn(
                              "text-[9px] rounded px-1 py-0.5 border truncate",
                              COR_TIPO[e.tipo]
                            )}
                            title={e.titulo}
                          >
                            {e.titulo}
                          </div>
                        ))}
                        {eventosDia.length > 3 && (
                          <div className="text-[9px] text-muted-foreground">
                            +{eventosDia.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lista">
          <Card>
            <CardHeader>
              <CardTitle>Eventos do mês</CardTitle>
              <CardDescription>{eventosMes.length} eventos em {NOMES_MES[mes]}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {eventosMes.map((e) => {
                const d = new Date(e.data);
                return (
                  <div key={e.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/30">
                    <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <span className="text-[10px] font-semibold uppercase">
                        {NOMES_MES[d.getMonth()].slice(0, 3)}
                      </span>
                      <span className="text-xl font-bold leading-none">{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-[10px] border", COR_TIPO[e.tipo])}>{e.tipo}</Badge>
                        {e.horaInicio && (
                          <span className="text-xs text-muted-foreground">
                            {e.horaInicio}{e.horaFim && ` — ${e.horaFim}`}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold mt-1">{e.titulo}</div>
                      {e.local && (
                        <div className="text-xs text-muted-foreground">📍 {e.local}</div>
                      )}
                      {e.descricao && (
                        <div className="text-xs text-muted-foreground mt-1">{e.descricao}</div>
                      )}
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
