"use client";

import * as React from "react";
import { CalendarCheck, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEntidade, type Reserva } from "@/lib/data/store";
import { NovaReservaModal } from "@/components/shared/nova-reserva-modal";

const espacos = [
  { id: "e1", nome: "Auditório", capacidade: 80, ocupacaoSemana: 65, cor: "#3b82f6" },
  { id: "e2", nome: "Sala Multimídia", capacidade: 30, ocupacaoSemana: 80, cor: "#10b981" },
  { id: "e3", nome: "Pátio Externo", capacidade: 200, ocupacaoSemana: 45, cor: "#f59e0b" },
  { id: "e4", nome: "Sala de Música", capacidade: 20, ocupacaoSemana: 50, cor: "#a855f7" },
  { id: "e5", nome: "Brinquedoteca", capacidade: 25, ocupacaoSemana: 90, cor: "#ec4899" },
  { id: "e6", nome: "Biblioteca", capacidade: 35, ocupacaoSemana: 70, cor: "#06b6d4" },
];

function formatHorario(r: Reserva): string {
  if (r.horaInicio && r.horaFim) return `${r.horaInicio} - ${r.horaFim}`;
  if (r.horaInicio) return r.horaInicio;
  return "—";
}

export default function ReservasPage() {
  const [modalAberto, setModalAberto] = React.useState(false);
  const { items: reservas } = useEntidade("reservas");

  // Ordena por data crescente
  const reservasOrdenadas = [...reservas].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <CalendarCheck className="h-3.5 w-3.5" /> RESERVAS
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Reservas de espaços
          </h1>
          <p className="text-sm text-muted-foreground">
            Agende salas, auditório, pátio e brinquedoteca.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova reserva
        </Button>
      </div>

      <Tabs defaultValue="espacos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="espacos">Espaços</TabsTrigger>
          <TabsTrigger value="reservas">Próximas reservas</TabsTrigger>
        </TabsList>

        <TabsContent value="espacos">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {espacos.map((e) => (
              <Card key={e.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{e.nome}</CardTitle>
                      <CardDescription>Capacidade: {e.capacidade} pessoas</CardDescription>
                    </div>
                    <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: e.cor }} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-1">Ocupação esta semana</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${e.ocupacaoSemana}%` }} />
                    </div>
                    <span className="text-sm font-semibold">{e.ocupacaoSemana}%</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">Ver agenda</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reservas">
          <Card>
            <CardHeader>
              <CardTitle>Próximas reservas</CardTitle>
              <CardDescription>{reservasOrdenadas.length} reserva(s) agendadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {reservasOrdenadas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma reserva agendada ainda.</p>
              ) : (
                reservasOrdenadas.map((r) => {
                  const d = new Date(r.data + "T00:00");
                  return (
                    <div key={r.id} className="flex items-center gap-4 rounded-lg border p-3">
                      <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <span className="text-[10px] font-semibold uppercase">
                          {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                        </span>
                        <span className="text-xl font-bold leading-none">{d.getDate()}</span>
                      </div>
                      <div className="flex-1">
                        <Badge variant="outline" className="text-[10px]">{r.espaco}</Badge>
                        <div className="font-semibold mt-1">{r.motivo ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.responsavel ?? "—"} · {formatHorario(r)}
                        </div>
                      </div>
                      <Badge variant={r.status === "Confirmada" ? "success" : "outline"}>{r.status}</Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NovaReservaModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        espacosDisponiveis={espacos.map((e) => e.nome)}
      />
    </div>
  );
}
