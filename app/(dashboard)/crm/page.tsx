"use client";

import * as React from "react";
import {
  Target,
  Plus,
  Phone,
  Mail,
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
import { useEntidade } from "@/lib/data/store";
import { NovoLeadModal } from "@/components/shared/novo-lead-modal";
import { formatBRL, formatDateBR, initials, cn } from "@/lib/utils";

type EstagioFunil =
  | "Lead"
  | "Contato Inicial"
  | "Visita Agendada"
  | "Visita Realizada"
  | "Proposta"
  | "Matriculado"
  | "Perdido";

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
  const { items: leads, update: updateLead } = useEntidade("crm");
  const [modalAberto, setModalAberto] = React.useState(false);
  const [leadParaMatricular, setLeadParaMatricular] = React.useState<typeof leads[number] | null>(null);
  const funilEstatisticas = React.useMemo(() => {
    const agora = new Date();
    const prefixoMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    const matriculados = leads.filter((lead) => lead.estagio === "Matriculado");
    const leadsComPotencial = leads.filter((lead) => lead.valorPotencial > 0);
    const potencialTotal = leadsComPotencial.reduce((total, lead) => total + lead.valorPotencial, 0);

    return {
      totalLeads: leads.length,
      novosMes: leads.filter((lead) => lead.dataPrimeiroContato.startsWith(prefixoMes)).length,
      visitasAgendadas: leads.filter((lead) => lead.estagio === "Visita Agendada").length,
      matriculados: matriculados.length,
      taxaConversao: leads.length > 0 ? (matriculados.length / leads.length) * 100 : 0,
      potencialMedio: leadsComPotencial.length > 0 ? potencialTotal / leadsComPotencial.length : 0,
    };
  }, [leads]);

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
        <Button onClick={() => setModalAberto(true)}>
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
          <div className="text-xs uppercase text-muted-foreground">Visitas agendadas (atuais)</div>
          <div className="mt-1 text-2xl font-bold text-warning">
            {funilEstatisticas.visitasAgendadas}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Matriculados (total)</div>
          <div className="mt-1 text-2xl font-bold text-success">
            {funilEstatisticas.matriculados}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Conversão</div>
          <div className="mt-1 text-2xl font-bold text-success">
            {funilEstatisticas.taxaConversao.toFixed(1)}%
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Potencial médio</div>
          <div className="mt-1 text-xl font-bold">{formatBRL(funilEstatisticas.potencialMedio)}</div>
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
                  <div className="flex gap-1 items-center flex-wrap">
                    <a
                      href={`tel:${lead.telefone.replace(/\D/g, "")}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-accent"
                      title="Ligar"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    <a
                      href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${lead.nomeResponsavel}, sou da Escola Modelo. Tudo bem?`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-accent"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <a
                      href={`mailto:${lead.email}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-accent"
                      title="Email"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                    {lead.estagio !== "Matriculado" && lead.estagio !== "Perdido" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="ml-1 bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                        onClick={() => setLeadParaMatricular(lead)}
                      >
                        Matricular →
                      </Button>
                    )}
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
              {leads.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum lead cadastrado para calcular as origens.
                </div>
              )}
              {Array.from(new Set(leads.map((l) => l.origem))).map((origem) => {
                const qtd = leads.filter((l) => l.origem === origem).length;
                const pct = leads.length > 0 ? (qtd / leads.length) * 100 : 0;
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

      <NovoLeadModal aberto={modalAberto} onFechar={() => setModalAberto(false)} />

      <MatricularLeadModal
        lead={leadParaMatricular}
        onFechar={() => setLeadParaMatricular(null)}
        onMatriculado={async () => {
          if (leadParaMatricular) {
            await updateLead(leadParaMatricular.id, { estagio: "Matriculado" });
          }
          setLeadParaMatricular(null);
        }}
      />
    </div>
  );
}

function MatricularLeadModal({
  lead,
  onFechar,
  onMatriculado,
}: {
  lead: { id: string; nomeResponsavel: string; nomeCrianca: string; idadeCrianca: number; serieInteresse: string; telefone: string; email: string } | null;
  onFechar: () => void;
  onMatriculado: () => Promise<void>;
}) {
  if (!lead) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-md bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="font-bold text-lg">Converter lead em aluno</h2>
          <p className="text-xs text-muted-foreground">
            Esta ação apenas marca o lead como &quot;Matriculado&quot;. O cadastro do aluno continua sendo uma etapa separada.
          </p>
        </div>
        <div className="p-6 space-y-3">
          <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
            <div><strong>Responsável:</strong> {lead.nomeResponsavel}</div>
            <div><strong>Criança:</strong> {lead.nomeCrianca} ({lead.idadeCrianca} anos)</div>
            <div><strong>Série interesse:</strong> {lead.serieInteresse}</div>
            <div><strong>Contato:</strong> {lead.telefone} · {lead.email}</div>
          </div>
          <div className="text-xs text-muted-foreground">
            👉 Próximo passo: vá em <strong>Alunos → Nova matrícula</strong> e preencha a ficha completa.
          </div>
        </div>
        <div className="border-t bg-muted/30 p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={onMatriculado} className="bg-emerald-600 hover:bg-emerald-700">
            Marcar como matriculado
          </Button>
        </div>
      </div>
    </div>
  );
}
