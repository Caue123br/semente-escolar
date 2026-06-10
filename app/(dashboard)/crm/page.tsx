"use client";

import * as React from "react";
import {
  Target,
  Plus,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  MessageCircle,
} from "lucide-react";
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
import { leads, funilEstatisticas } from "@/lib/mock-data/crm";
import type { EstagioFunil } from "@/lib/mock-data/crm";
import { formatBRL, formatDateBR, initials, cn } from "@/lib/utils";

const ESTAGIOS: { id: EstagioFunil; cor: string; bg: string }[] = [
  { id: "Lead", cor: "border-slate-400", bg: "bg-slate-100" },
  { id: "Contato Inicial", cor: "border-blue-400", bg: "bg-blue-50" },
  { id: "Visita Agendada", cor: "border-cyan-400", bg: "bg-cyan-50" },
  { id: "Visita Realizada", cor: "border-purple-400", bg: "bg-purple-50" },
  { id: "Proposta", cor: "border-amber-400", bg: "bg-amber-50" },
  { id: "Matriculado", cor: "border-emerald-500", bg: "bg-emerald-50" },
  { id: "Perdido", cor: "border-red-400", bg: "bg-red-50" },
];

export default function CrmPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Target className="h-3.5 w-3.5" /> CAPTAÇÃO
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            CRM — Funil de matrículas
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe leads desde o primeiro contato até a matrícula.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo lead
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Total leads</div>
          <div className="mt-1 text-2xl font-bold">{funilEstatisticas.totalLeads}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Novos no mês</div>
          <div className="mt-1 text-2xl font-bold text-primary">{funilEstatisticas.novosMes}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Visitas agendadas</div>
          <div className="mt-1 text-2xl font-bold text-warning">
            {funilEstatisticas.visitasAgendadasMes}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Matriculados</div>
          <div className="mt-1 text-2xl font-bold text-success">
            {funilEstatisticas.matriculadosMes}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Conversão</div>
          <div className="mt-1 text-2xl font-bold text-success">
            {funilEstatisticas.taxaConversao}%
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Ticket médio</div>
          <div className="mt-1 text-xl font-bold">{formatBRL(funilEstatisticas.ticketMedio)}</div>
        </Card>
      </div>

      <Tabs defaultValue="funil" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funil">Kanban do Funil</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="origem">Origem dos leads</TabsTrigger>
        </TabsList>

        <TabsContent value="funil">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3 xl:grid-cols-7 overflow-x-auto">
            {ESTAGIOS.map((e) => {
              const leadsEstagio = leads.filter((l) => l.estagio === e.id);
              return (
                <div key={e.id} className={cn("rounded-lg border-t-4 p-2 min-h-[400px]", e.cor, e.bg)}>
                  <div className="px-2 py-1 mb-2">
                    <div className="text-xs font-bold uppercase tracking-wider">{e.id}</div>
                    <div className="text-2xl font-bold mt-1">{leadsEstagio.length}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBRL(leadsEstagio.reduce((a, l) => a + l.valorPotencial, 0))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {leadsEstagio.map((lead) => (
                      <Card key={lead.id} className="p-3 cursor-pointer hover:shadow-md transition-all">
                        <div className="flex items-start gap-2">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                              {initials(lead.nomeResponsavel)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate">{lead.nomeResponsavel}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {lead.nomeCrianca} ({lead.idadeCrianca}a) — {lead.serieInteresse}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t flex items-center justify-between text-[10px]">
                          <Badge variant="outline" className="text-[9px]">
                            {lead.origem}
                          </Badge>
                          <span className="font-semibold">{formatBRL(lead.valorPotencial)}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="lista">
          <Card>
            <CardHeader>
              <CardTitle>Todos os leads</CardTitle>
              <CardDescription>{leads.length} leads no pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-wrap items-center gap-4 rounded-lg border p-4 hover:bg-accent/30 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs">
                      {initials(lead.nomeResponsavel)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{lead.nomeResponsavel}</div>
                    <div className="text-xs text-muted-foreground">
                      {lead.nomeCrianca} ({lead.idadeCrianca}a) — {lead.serieInteresse}
                    </div>
                  </div>
                  <div>
                    <Badge variant="outline">{lead.estagio}</Badge>
                  </div>
                  <div className="text-sm">
                    <div className="text-xs text-muted-foreground">Próx. ação</div>
                    <div className="font-medium">{lead.proximaAcao}</div>
                    {lead.proximaData !== "—" && (
                      <div className="text-xs text-muted-foreground">{formatDateBR(lead.proximaData)}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Potencial</div>
                    <div className="font-bold text-primary">{formatBRL(lead.valorPotencial)}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost"><Phone className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost"><MessageCircle className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost"><Mail className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="origem">
          <Card>
            <CardHeader>
              <CardTitle>Leads por origem</CardTitle>
              <CardDescription>De onde vêm seus novos alunos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from(new Set(leads.map((l) => l.origem))).map((origem) => {
                const qtd = leads.filter((l) => l.origem === origem).length;
                const pct = (qtd / leads.length) * 100;
                return (
                  <div key={origem}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{origem}</span>
                      <span className="text-muted-foreground">{qtd} leads ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
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
