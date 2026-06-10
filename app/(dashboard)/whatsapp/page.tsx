"use client";

import * as React from "react";
import {
  MessageCircle,
  Users,
  Send,
  Megaphone,
  FileText,
  Calendar,
  Search,
  Check,
  CheckCheck,
  Clock,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  gruposWhatsApp,
  mensagensRecentes,
  templatesMensagens,
} from "@/lib/mock-data/whatsapp";
import { turmas } from "@/lib/mock-data/turmas";
import { inadimplentes } from "@/lib/mock-data/financeiro";
import { initials, formatBRL } from "@/lib/utils";

export default function WhatsappPage() {
  const [textoCampanha, setTextoCampanha] = React.useState(
    templatesMensagens[2].texto
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
            <MessageCircle className="h-3.5 w-3.5" /> WHATSAPP
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            WhatsApp Business
          </h1>
          <p className="text-sm text-muted-foreground">
            Grupos por turma, avisos, comunicados e régua de cobrança.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Grupos ativos</div>
          <div className="mt-1 text-2xl font-bold">{gruposWhatsApp.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Um por turma</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Mensagens hoje</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">42</div>
          <div className="text-xs text-muted-foreground mt-1">98% entregues</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Taxa de leitura</div>
          <div className="mt-1 text-2xl font-bold text-primary">87%</div>
          <div className="text-xs text-muted-foreground mt-1">Média 7 dias</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Cobranças pendentes</div>
          <div className="mt-1 text-2xl font-bold text-danger">{inadimplentes.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Aguardando envio</div>
        </Card>
      </div>

      <Tabs defaultValue="grupos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grupos">
            <Users className="mr-1.5 h-4 w-4" /> Grupos
          </TabsTrigger>
          <TabsTrigger value="historico">
            <MessageCircle className="mr-1.5 h-4 w-4" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="campanha">
            <Megaphone className="mr-1.5 h-4 w-4" /> Campanha em massa
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="mr-1.5 h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="cobranca">Régua de cobrança</TabsTrigger>
        </TabsList>

        <TabsContent value="grupos">
          <Card>
            <CardHeader>
              <CardTitle>Grupos por turma</CardTitle>
              <CardDescription>
                {gruposWhatsApp.length} grupos · todos sincronizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {gruposWhatsApp.map((g) => {
                const t = turmas.find((tu) => tu.id === g.turmaId);
                return (
                  <div
                    key={g.id}
                    className="flex items-center gap-4 rounded-lg border p-3 hover:bg-accent/30 transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback
                        className="text-xs font-semibold"
                        style={{ backgroundColor: t?.cor + "30", color: t?.cor }}
                      >
                        {t && initials(t.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Grupo {g.turmaNome}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {g.totalMembros} membros
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {g.ultimaMensagem}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {new Date(g.dataUltimaMensagem).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <Button size="sm" variant="ghost" className="mt-1">
                        Abrir
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens recentes</CardTitle>
              <CardDescription>Últimas mensagens enviadas pelo sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {mensagensRecentes.map((m) => {
                const StatusIcon =
                  m.status === "Lida" ? CheckCheck : m.status === "Entregue" ? Check : Clock;
                return (
                  <div key={m.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {m.tipo}
                          </Badge>
                          <span className="font-semibold text-sm">{m.assunto}</span>
                        </div>
                        <div className="text-sm mt-1 text-muted-foreground">
                          Para: <span className="text-foreground">{m.destinatario}</span>
                        </div>
                        <div className="text-sm mt-2 text-muted-foreground italic">
                          "{m.preview}"
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
                        <span>
                          {new Date(m.enviadaEm).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <StatusIcon
                            className={`h-3.5 w-3.5 ${
                              m.status === "Lida" ? "text-primary" : ""
                            }`}
                          />
                          {m.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campanha">
          <Card>
            <CardHeader>
              <CardTitle>Nova campanha em massa</CardTitle>
              <CardDescription>
                Envie comunicado para múltiplos grupos ou contatos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Destinatários</Label>
                  <Select defaultValue="todos">
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os grupos (12)</SelectItem>
                      <SelectItem value="infantil">Educação infantil (6 grupos)</SelectItem>
                      <SelectItem value="fund">Fundamental I (6 grupos)</SelectItem>
                      <SelectItem value="inad">Apenas inadimplentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select defaultValue="comunicado">
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comunicado">Comunicado</SelectItem>
                      <SelectItem value="aviso">Aviso</SelectItem>
                      <SelectItem value="evento">Evento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Mensagem</Label>
                <textarea
                  value={textoCampanha}
                  onChange={(e) => setTextoCampanha(e.target.value)}
                  rows={6}
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm">
                <div className="font-semibold mb-1 text-emerald-800">
                  Preview no WhatsApp
                </div>
                <div className="bg-white rounded p-3 text-sm">{textoCampanha}</div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Agendar envio</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Send className="mr-2 h-4 w-4" /> Enviar agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Templates de mensagens</CardTitle>
              <CardDescription>
                Modelos com variáveis para cobrança, eventos e avisos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {templatesMensagens.map((t) => (
                <div key={t.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Badge variant="outline" className="text-[10px] mb-1">
                        {t.tipo}
                      </Badge>
                      <div className="font-semibold">{t.nome}</div>
                    </div>
                    <Button size="sm" variant="outline">
                      Editar
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground bg-muted/40 rounded p-2 font-mono">
                    {t.texto}
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                + Novo template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cobranca">
          <Card>
            <CardHeader>
              <CardTitle>Régua de cobrança automatizada</CardTitle>
              <CardDescription>
                Configure mensagens automáticas baseadas em dias de atraso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { dia: 3, mensagem: "Lembrete amigável", cor: "text-warning", auto: true },
                { dia: 7, mensagem: "1ª cobrança formal", cor: "text-warning", auto: true },
                { dia: 15, mensagem: "2ª cobrança + opção renegociação", cor: "text-orange-500", auto: true },
                { dia: 30, mensagem: "Última tentativa antes de jurídico", cor: "text-danger", auto: false },
              ].map((r) => (
                <div
                  key={r.dia}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center font-bold ${r.cor}`}>
                      D+{r.dia}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{r.mensagem}</div>
                      <div className="text-xs text-muted-foreground">
                        Disparado automaticamente após {r.dia} dias do vencimento
                      </div>
                    </div>
                  </div>
                  <Badge variant={r.auto ? "success" : "warning"}>
                    {r.auto ? "Automático" : "Manual"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
