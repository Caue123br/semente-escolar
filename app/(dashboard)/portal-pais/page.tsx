"use client";

import { Heart, Smartphone, MessageCircle, Bell, Calendar, GraduationCap } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { alunos } from "@/lib/mock-data/alunos";
import { initials } from "@/lib/utils";

export default function PortalPaisPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-pink-600">
            <Heart className="h-3.5 w-3.5" /> PORTAL DOS PAIS
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Portal dos Pais (preview)
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize como os responsáveis veem a vida escolar dos filhos.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <div className="text-xs uppercase text-muted-foreground">App ativos</div>
          </div>
          <div className="mt-2 text-2xl font-bold">38</div>
          <div className="text-xs text-muted-foreground mt-1">95% das famílias</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-warning" />
            <div className="text-xs uppercase text-muted-foreground">Notificações 7d</div>
          </div>
          <div className="mt-2 text-2xl font-bold">218</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            <div className="text-xs uppercase text-muted-foreground">Mensagens</div>
          </div>
          <div className="mt-2 text-2xl font-bold">87</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            <div className="text-xs uppercase text-muted-foreground">Eventos vistos</div>
          </div>
          <div className="mt-2 text-2xl font-bold">12</div>
        </Card>
      </div>

      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preview">Preview do app</TabsTrigger>
          <TabsTrigger value="engajamento">Engajamento</TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Mobile preview */}
            <Card>
              <CardHeader>
                <CardTitle>Como aparece no app dos pais</CardTitle>
                <CardDescription>Tela inicial do responsável</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mx-auto max-w-[320px] rounded-3xl border-4 border-foreground p-4 bg-gradient-to-b from-primary/5 to-background space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">SA</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-xs text-muted-foreground">Bom dia,</div>
                      <div className="font-semibold text-sm">Mariana Almeida</div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-card p-3 border">
                    <div className="text-[10px] uppercase text-muted-foreground">Sofia · Jardim II-A</div>
                    <div className="font-bold mt-1">Bem-vinda à escola! 🌱</div>
                    <div className="text-xs text-muted-foreground mt-1">Hoje tem atividade de pintura</div>
                  </div>

                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                    <div className="text-[10px] font-semibold uppercase text-emerald-700">Aviso</div>
                    <div className="text-sm mt-0.5">Reunião de pais quinta 19h</div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { icon: "💰", label: "Financ." },
                      { icon: "📊", label: "Notas" },
                      { icon: "📅", label: "Agenda" },
                      { icon: "💬", label: "Chat" },
                    ].map((b) => (
                      <div key={b.label} className="rounded-lg bg-card border p-2">
                        <div className="text-2xl">{b.icon}</div>
                        <div className="text-[9px] font-medium mt-1">{b.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg bg-warning/10 border border-warning/30 p-3">
                    <div className="text-[10px] font-semibold uppercase text-warning">Próximo</div>
                    <div className="text-sm font-semibold mt-0.5">Festa Junina</div>
                    <div className="text-xs text-muted-foreground">22/06 · 10h–16h</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>O que o pai pode ver</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: GraduationCap, label: "Evolução pedagógica do filho", desc: "Boletins, linha do tempo, observações" },
                  { icon: Calendar, label: "Calendário e eventos", desc: "Festas, reuniões, passeios, feriados" },
                  { icon: MessageCircle, label: "Chat direto com a professora", desc: "Mensagens individuais ou em grupo" },
                  { icon: Bell, label: "Avisos e notificações", desc: "Push em tempo real" },
                  { icon: Heart, label: "Ficha de saúde do filho", desc: "Alergias, restrições, contatos de emergência" },
                ].map((item) => {
                  const I = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3 rounded-lg border p-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <I className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engajamento">
          <Card>
            <CardHeader>
              <CardTitle>Engajamento por família</CardTitle>
              <CardDescription>% de acesso ao app no mês</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {alunos.slice(0, 10).map((a, i) => {
                const pct = 95 - i * 4;
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{initials(a.responsaveis[0].nome)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{a.responsaveis[0].nome}</span>
                        <span className="text-muted-foreground">{pct}%</span>
                      </div>
                      <Progress
                        value={pct}
                        indicatorClassName={pct > 80 ? "bg-success" : pct > 50 ? "bg-warning" : "bg-danger"}
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
