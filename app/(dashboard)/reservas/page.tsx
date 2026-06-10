"use client";

import { CalendarCheck, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const espacos = [
  { id: "e1", nome: "Auditório", capacidade: 80, ocupacaoSemana: 65, cor: "#3b82f6" },
  { id: "e2", nome: "Sala Multimídia", capacidade: 30, ocupacaoSemana: 80, cor: "#10b981" },
  { id: "e3", nome: "Pátio Externo", capacidade: 200, ocupacaoSemana: 45, cor: "#f59e0b" },
  { id: "e4", nome: "Sala de Música", capacidade: 20, ocupacaoSemana: 50, cor: "#a855f7" },
  { id: "e5", nome: "Brinquedoteca", capacidade: 25, ocupacaoSemana: 90, cor: "#ec4899" },
  { id: "e6", nome: "Biblioteca", capacidade: 35, ocupacaoSemana: 70, cor: "#06b6d4" },
];

const reservas = [
  { id: "rv1", espaco: "Auditório", responsavel: "Cláudio Vasconcelos", motivo: "Reunião de pais", data: "2026-06-12", horario: "19:00 - 21:00" },
  { id: "rv2", espaco: "Pátio Externo", responsavel: "Coordenação", motivo: "Festa Junina", data: "2026-06-22", horario: "10:00 - 16:00" },
  { id: "rv3", espaco: "Sala Multimídia", responsavel: "Profa. Cláudia Martins", motivo: "Aula de informática", data: "2026-06-10", horario: "14:00 - 15:30" },
  { id: "rv4", espaco: "Sala de Música", responsavel: "Prof. Eduardo Santos", motivo: "Aula de violão", data: "2026-06-11", horario: "10:00 - 11:00" },
  { id: "rv5", espaco: "Brinquedoteca", responsavel: "Profa. Mariana Costa", motivo: "Atividade sensorial", data: "2026-06-10", horario: "09:00 - 10:00" },
];

export default function ReservasPage() {
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
        <Button>
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
            </CardHeader>
            <CardContent className="space-y-2">
              {reservas.map((r) => (
                <div key={r.id} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <span className="text-[10px] font-semibold uppercase">JUN</span>
                    <span className="text-xl font-bold leading-none">{new Date(r.data).getDate()}</span>
                  </div>
                  <div className="flex-1">
                    <Badge variant="outline" className="text-[10px]">{r.espaco}</Badge>
                    <div className="font-semibold mt-1">{r.motivo}</div>
                    <div className="text-xs text-muted-foreground">{r.responsavel} · {r.horario}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
