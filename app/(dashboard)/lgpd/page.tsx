"use client";

import { Shield, FileCheck, Lock, Activity, Download, Eye } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const eventosLog = [
  { id: "l1", quando: "09/06/2026 14:32", usuario: "Renata Andrade", acao: "Visualizou financeiro", recurso: "Mensalidades junho/2026", ip: "192.168.1.45" },
  { id: "l2", quando: "09/06/2026 14:15", usuario: "Cláudio Vasconcelos", acao: "Editou avaliação pedagógica", recurso: "Aluno Sofia Almeida", ip: "192.168.1.32" },
  { id: "l3", quando: "09/06/2026 13:58", usuario: "Aline Camargo", acao: "Emitiu NF-e", recurso: "NF-2026/0247", ip: "192.168.1.18" },
  { id: "l4", quando: "09/06/2026 12:30", usuario: "Renata Andrade", acao: "Login realizado", recurso: "Sistema", ip: "192.168.1.45" },
  { id: "l5", quando: "09/06/2026 11:45", usuario: "Mariana Costa", acao: "Marcou frequência", recurso: "Jardim II - A", ip: "192.168.1.55" },
  { id: "l6", quando: "09/06/2026 10:12", usuario: "Sistema", acao: "Backup automático concluído", recurso: "Base completa (2,4 GB)", ip: "—" },
];

const consentimentos = [
  { titulo: "Uso de imagem em redes sociais", base: "Lei 13.709 — Art. 7º, I", aderencia: 38, total: 40 },
  { titulo: "Compartilhamento com plano de saúde", base: "Consentimento expresso", aderencia: 32, total: 40 },
  { titulo: "Comunicação via WhatsApp", base: "Lei 13.709 — Art. 11", aderencia: 40, total: 40 },
  { titulo: "Avaliação pedagógica externa", base: "Interesse legítimo", aderencia: 40, total: 40 },
];

export default function LgpdPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Shield className="h-3.5 w-3.5" /> LGPD & AUDITORIA
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            LGPD & Auditoria
          </h1>
          <p className="text-sm text-muted-foreground">
            Conformidade com a Lei Geral de Proteção de Dados.
          </p>
        </div>
        <Badge variant="success" className="px-3 py-1.5">
          <FileCheck className="mr-1.5 h-3.5 w-3.5" />
          Conforme
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-success" />
            <div className="text-xs uppercase text-muted-foreground">Status LGPD</div>
          </div>
          <div className="mt-2 text-2xl font-bold text-success">Conforme</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <div className="text-xs uppercase text-muted-foreground">Dados criptografados</div>
          </div>
          <div className="mt-2 text-2xl font-bold">100%</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-warning" />
            <div className="text-xs uppercase text-muted-foreground">Logs (7 dias)</div>
          </div>
          <div className="mt-2 text-2xl font-bold">2.847</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary" />
            <div className="text-xs uppercase text-muted-foreground">Solicitações</div>
          </div>
          <div className="mt-2 text-2xl font-bold">3</div>
          <div className="text-xs text-muted-foreground mt-1">2 atendidas, 1 pendente</div>
        </Card>
      </div>

      <Tabs defaultValue="consentimentos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="consentimentos">Consentimentos</TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="mr-1.5 h-4 w-4" /> Log de auditoria
          </TabsTrigger>
          <TabsTrigger value="direitos">Direitos do titular</TabsTrigger>
        </TabsList>

        <TabsContent value="consentimentos">
          <Card>
            <CardHeader>
              <CardTitle>Termos de consentimento</CardTitle>
              <CardDescription>Adesão das famílias aos termos LGPD</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {consentimentos.map((c) => {
                const pct = (c.aderencia / c.total) * 100;
                return (
                  <div key={c.titulo} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold">{c.titulo}</div>
                        <div className="text-xs text-muted-foreground">{c.base}</div>
                      </div>
                      <Badge variant={pct === 100 ? "success" : "warning"}>
                        {c.aderencia}/{c.total} aderiram
                      </Badge>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={pct === 100 ? "h-full bg-success" : "h-full bg-warning"}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Log de auditoria</CardTitle>
                  <CardDescription>Todas as ações realizadas no sistema</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" /> Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventosLog.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs font-mono">{e.quando}</TableCell>
                      <TableCell className="font-medium text-sm">{e.usuario}</TableCell>
                      <TableCell className="text-sm">{e.acao}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.recurso}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{e.ip}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="direitos">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { titulo: "Acesso aos dados", desc: "Listar todos os dados pessoais armazenados", icone: Eye },
              { titulo: "Portabilidade", desc: "Exportar dados em formato aberto (JSON/CSV)", icone: Download },
              { titulo: "Correção", desc: "Solicitar correção de informação incorreta", icone: FileCheck },
              { titulo: "Eliminação", desc: "Direito ao esquecimento (com restrições legais)", icone: Lock },
              { titulo: "Anonimização", desc: "Tornar dados não identificáveis", icone: Shield },
              { titulo: "Revogação de consentimento", desc: "Cancelar autorização concedida", icone: Activity },
            ].map((d) => {
              const Ic = d.icone;
              return (
                <Card key={d.titulo} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Ic className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{d.titulo}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{d.desc}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    Iniciar solicitação
                  </Button>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
