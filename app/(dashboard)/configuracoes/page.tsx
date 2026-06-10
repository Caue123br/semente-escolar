"use client";

import {
  Settings,
  Users,
  Bell,
  Database,
  Palette,
  Globe,
  Shield,
  Cloud,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { escola } from "@/lib/mock-data/escola";
import { funcionarios } from "@/lib/mock-data/rh";
import { initials } from "@/lib/utils";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Settings className="h-3.5 w-3.5" /> CONFIGURAÇÕES
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Configurações do sistema
          </h1>
          <p className="text-sm text-muted-foreground">
            Dados da escola, usuários, integrações e preferências.
          </p>
        </div>
      </div>

      <Tabs defaultValue="escola" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="escola">
            <Globe className="mr-1.5 h-4 w-4" /> Escola
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="mr-1.5 h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="notificacoes">
            <Bell className="mr-1.5 h-4 w-4" /> Notificações
          </TabsTrigger>
          <TabsTrigger value="integracoes">
            <Cloud className="mr-1.5 h-4 w-4" /> Integrações
          </TabsTrigger>
          <TabsTrigger value="aparencia">
            <Palette className="mr-1.5 h-4 w-4" /> Aparência
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="mr-1.5 h-4 w-4" /> Backup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="escola">
          <Card>
            <CardHeader>
              <CardTitle>Dados da escola</CardTitle>
              <CardDescription>Informações que aparecem em boletins e NFs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Razão Social</Label>
                  <Input className="mt-1.5" defaultValue={escola.nome} />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input className="mt-1.5" defaultValue={escola.cnpj} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input className="mt-1.5" defaultValue={escola.telefone} />
                </div>
                <div>
                  <Label>Site</Label>
                  <Input className="mt-1.5" defaultValue="www.sementefeliz.com.br" />
                </div>
                <div className="md:col-span-2">
                  <Label>Endereço</Label>
                  <Input className="mt-1.5" defaultValue={escola.endereco} />
                </div>
                <div>
                  <Label>Ano letivo atual</Label>
                  <Input className="mt-1.5" defaultValue="2026" />
                </div>
                <div>
                  <Label>Período</Label>
                  <Input className="mt-1.5" defaultValue="Anual / 4 bimestres" />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button>Salvar alterações</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle>Usuários do sistema</CardTitle>
              <CardDescription>Permissões e acessos por perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {funcionarios
                .filter((f) => f.email !== "—")
                .slice(0, 10)
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/15 text-primary text-xs">
                        {initials(f.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{f.nome}</div>
                      <div className="text-xs text-muted-foreground">{f.email}</div>
                    </div>
                    <Badge variant="outline">{f.cargo}</Badge>
                    <Badge variant="success">Ativo</Badge>
                    <Button variant="ghost" size="sm">Editar</Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>Notificações automáticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { titulo: "Alerta de inadimplência", desc: "Disparar quando aluno fica 3 dias em atraso", ativo: true },
                { titulo: "Alerta de estagnação pedagógica", desc: "Notificar coordenação ao detectar estagnação", ativo: true },
                { titulo: "Estoque baixo", desc: "Avisar quando item atinge ponto de reposição", ativo: true },
                { titulo: "Validade próxima", desc: "Notificar 14 dias antes do vencimento", ativo: true },
                { titulo: "Aniversário de aluno", desc: "Lembrete 1 dia antes", ativo: false },
                { titulo: "Backup diário", desc: "Confirmação às 02:00 da manhã", ativo: true },
              ].map((n) => (
                <div key={n.titulo} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-semibold text-sm">{n.titulo}</div>
                    <div className="text-xs text-muted-foreground">{n.desc}</div>
                  </div>
                  <Badge variant={n.ativo ? "success" : "secondary"}>
                    {n.ativo ? "Ativo" : "Desativado"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { nome: "WhatsApp Business API", desc: "Cobrança e comunicados", status: "Conectado", cor: "success" as const },
              { nome: "Pix QR (Sicredi)", desc: "Geração de QR e conciliação", status: "Conectado", cor: "success" as const },
              { nome: "Prefeitura SP - NFS-e", desc: "Emissão automática", status: "Conectado", cor: "success" as const },
              { nome: "Google Calendar", desc: "Sincronização de eventos", status: "Não conectado", cor: "secondary" as const },
              { nome: "Mailchimp", desc: "Newsletter aos pais", status: "Não conectado", cor: "secondary" as const },
              { nome: "Open Banking", desc: "Extrato bancário automático", status: "Conectado", cor: "success" as const },
            ].map((i) => (
              <Card key={i.nome} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{i.nome}</div>
                    <div className="text-xs text-muted-foreground">{i.desc}</div>
                  </div>
                  <Badge variant={i.cor}>{i.status}</Badge>
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  Configurar
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="aparencia">
          <Card>
            <CardHeader>
              <CardTitle>Personalização visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Cor primária</Label>
                <div className="flex gap-2 mt-2">
                  {["#3b82f6", "#10b981", "#a855f7", "#f59e0b", "#ec4899"].map((c) => (
                    <button
                      key={c}
                      className="h-10 w-10 rounded-lg border-2 border-foreground"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>Logotipo</Label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                    SF
                  </div>
                  <Button variant="outline" size="sm">Trocar imagem</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Backup automático</CardTitle>
              <CardDescription>Próximo backup: hoje às 02:00</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium text-sm">Frequência</div>
                  <div className="text-xs text-muted-foreground">Diário às 02:00</div>
                </div>
                <Badge variant="success">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium text-sm">Retenção</div>
                  <div className="text-xs text-muted-foreground">90 dias</div>
                </div>
                <Button variant="ghost" size="sm">Alterar</Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium text-sm">Último backup</div>
                  <div className="text-xs text-muted-foreground">09/06/2026 02:00 — 2,4 GB</div>
                </div>
                <Badge variant="success">OK</Badge>
              </div>
              <Button variant="outline" className="w-full">
                Fazer backup manual agora
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
