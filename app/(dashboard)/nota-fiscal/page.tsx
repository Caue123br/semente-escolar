"use client";

import * as React from "react";
import {
  FileText,
  Plus,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Search,
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { notasFiscais } from "@/lib/mock-data/notas-fiscais";
import { formatBRL, formatDateBR } from "@/lib/utils";

export default function NotaFiscalPage() {
  const emitidas = notasFiscais.filter((n) => n.status === "Emitida");
  const totalEmitido = emitidas.reduce((a, n) => a + n.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <FileText className="h-3.5 w-3.5" /> NOTA FISCAL
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Notas Fiscais (NFS-e)
          </h1>
          <p className="text-sm text-muted-foreground">
            Emissão automática integrada com a prefeitura de São Paulo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="px-3 py-1">
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            Certificado A1 ativo
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Emitidas no mês</div>
          <div className="mt-1 text-2xl font-bold">{emitidas.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Total faturado</div>
          <div className="mt-1 text-2xl font-bold">{formatBRL(totalEmitido)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Pendentes</div>
          <div className="mt-1 text-2xl font-bold text-warning">
            {notasFiscais.filter((n) => n.status === "Pendente").length}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Próximo número</div>
          <div className="mt-1 text-2xl font-bold text-primary">2026/0248</div>
        </Card>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista de NF-e</TabsTrigger>
          <TabsTrigger value="emitir">
            <Plus className="mr-1.5 h-4 w-4" /> Emitir nova
          </TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Notas fiscais emitidas</CardTitle>
                  <CardDescription>{notasFiscais.length} notas no histórico</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar NF..." className="pl-9 w-56" />
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" /> Exportar XML
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notasFiscais.map((n) => {
                    const StatusIcon =
                      n.status === "Emitida"
                        ? CheckCircle
                        : n.status === "Cancelada" || n.status === "Rejeitada"
                        ? XCircle
                        : Clock;
                    return (
                      <TableRow key={n.id}>
                        <TableCell className="font-mono text-xs">{n.numero}</TableCell>
                        <TableCell className="text-sm">{formatDateBR(n.data)}</TableCell>
                        <TableCell className="font-medium">{n.cliente}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {n.cpfCnpj}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {n.servico}
                        </TableCell>
                        <TableCell className="font-semibold">{formatBRL(n.valor)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              n.status === "Emitida"
                                ? "success"
                                : n.status === "Pendente"
                                ? "warning"
                                : "danger"
                            }
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {n.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emitir">
          <Card>
            <CardHeader>
              <CardTitle>Emitir nova NFS-e</CardTitle>
              <CardDescription>
                Preencha os dados — emissão automática ao confirmar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Tomador (cliente)</Label>
                  <Input className="mt-1.5" placeholder="Nome do responsável" />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input className="mt-1.5" placeholder="000.000.000-00" />
                </div>
                <div>
                  <Label>E-mail para envio</Label>
                  <Input className="mt-1.5" type="email" placeholder="email@exemplo.com" />
                </div>
                <div>
                  <Label>Tipo de serviço</Label>
                  <Select defaultValue="ensino">
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ensino">Ensino regular (mensalidade)</SelectItem>
                      <SelectItem value="venda">Venda de uniforme</SelectItem>
                      <SelectItem value="evento">Material de festa</SelectItem>
                      <SelectItem value="alimentacao">Alimentação extra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Descrição do serviço</Label>
                <textarea
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Ex: Mensalidade escolar — Junho/2026 — Aluno: ..."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Valor</Label>
                  <Input className="mt-1.5" type="number" placeholder="0,00" />
                </div>
                <div>
                  <Label>ISS (%)</Label>
                  <Input className="mt-1.5" type="number" defaultValue={5} />
                </div>
                <div>
                  <Label>Código de serviço</Label>
                  <Input className="mt-1.5" defaultValue="08.01" />
                </div>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm">
                <div className="font-semibold mb-1">Próximo número</div>
                <div className="text-2xl font-mono font-bold text-primary">NF-2026/0248</div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Salvar rascunho</Button>
                <Button>
                  <Send className="mr-2 h-4 w-4" /> Emitir e enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações NF-e</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ConfigRow label="Prefeitura" value="São Paulo / SP" />
              <ConfigRow label="Inscrição Municipal" value="3.456.789-0" />
              <ConfigRow label="Regime tributário" value="Simples Nacional" />
              <ConfigRow label="Código CNAE" value="8512-1/00 — Educação infantil" />
              <ConfigRow label="Alíquota ISS padrão" value="5,00%" />
              <ConfigRow label="Certificado digital" value="A1 — válido até 12/01/2027" />
              <ConfigRow label="E-mail para envio automático" value="Sim — após cada venda" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  );
}
