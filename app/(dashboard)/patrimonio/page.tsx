"use client";

import { Building2, Wrench, AlertTriangle, Plus } from "lucide-react";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { formatBRL, formatDateBR } from "@/lib/utils";

const patrimonio = [
  { id: "pt1", item: "Ar-condicionado Split 12.000 BTUs", local: "Sala Jardim II - A", valor: 2890, dataCompra: "2023-02-15", status: "Operacional", responsavel: "Manutenção" },
  { id: "pt2", item: "Lousa interativa 75pol", local: "Sala 1º Ano - A", valor: 8500, dataCompra: "2024-01-20", status: "Operacional", responsavel: "TI" },
  { id: "pt3", item: "Mesa retangular 8 lugares", local: "Sala dos professores", valor: 1200, dataCompra: "2020-08-10", status: "Operacional", responsavel: "—" },
  { id: "pt4", item: "Notebook Dell i5 16GB", local: "Secretaria", valor: 4200, dataCompra: "2023-09-01", status: "Operacional", responsavel: "Aline Camargo" },
  { id: "pt5", item: "Brinquedoteca — Casinha de madeira", local: "Brinquedoteca", valor: 3400, dataCompra: "2022-03-15", status: "Em manutenção", responsavel: "—" },
  { id: "pt6", item: "Geladeira 450L", local: "Cozinha", valor: 3890, dataCompra: "2021-06-22", status: "Operacional", responsavel: "Dona Marlene" },
  { id: "pt7", item: "Forno industrial 4 bocas", local: "Cozinha", valor: 5200, dataCompra: "2019-01-15", status: "Operacional", responsavel: "Dona Marlene" },
  { id: "pt8", item: "Projetor multimídia", local: "Auditório", valor: 3100, dataCompra: "2022-08-01", status: "Defeito", responsavel: "TI" },
];

const ordensManutencao = [
  { id: "om1", item: "Brinquedoteca — Casinha", descricao: "Reparar telhado da casinha", prioridade: "Média", status: "Em andamento", dataAbertura: "2026-06-05" },
  { id: "om2", item: "Projetor auditório", descricao: "Lâmpada queimada", prioridade: "Alta", status: "Aberta", dataAbertura: "2026-06-07" },
  { id: "om3", item: "Portão principal", descricao: "Motor falhando ao abrir", prioridade: "Alta", status: "Em andamento", dataAbertura: "2026-06-06" },
  { id: "om4", item: "Banheiro infantil 2", descricao: "Vaso entupido", prioridade: "Baixa", status: "Concluída", dataAbertura: "2026-06-04" },
];

export default function PatrimonioPage() {
  const totalPatrimonio = patrimonio.reduce((a, p) => a + p.valor, 0);
  const operacionais = patrimonio.filter((p) => p.status === "Operacional").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Building2 className="h-3.5 w-3.5" /> PATRIMÔNIO
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Patrimônio & Manutenção
          </h1>
          <p className="text-sm text-muted-foreground">
            Bens da escola e ordens de serviço.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Cadastrar bem
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Total de bens</div>
          <div className="mt-1 text-2xl font-bold">{patrimonio.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Valor total</div>
          <div className="mt-1 text-2xl font-bold">{formatBRL(totalPatrimonio)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Operacionais</div>
          <div className="mt-1 text-2xl font-bold text-success">{operacionais}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">OS abertas</div>
          <div className="mt-1 text-2xl font-bold text-warning">
            {ordensManutencao.filter((o) => o.status !== "Concluída").length}
          </div>
        </Card>
      </div>

      <Tabs defaultValue="bens" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bens">Bens cadastrados</TabsTrigger>
          <TabsTrigger value="manutencao">
            <Wrench className="mr-1.5 h-4 w-4" /> Manutenção
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bens">
          <Card>
            <CardContent className="px-0 pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Compra</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patrimonio.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.item}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.local}</TableCell>
                      <TableCell className="font-semibold">{formatBRL(p.valor)}</TableCell>
                      <TableCell className="text-sm">{formatDateBR(p.dataCompra)}</TableCell>
                      <TableCell className="text-sm">{p.responsavel}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === "Operacional"
                              ? "success"
                              : p.status === "Em manutenção"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manutencao">
          <Card>
            <CardHeader>
              <CardTitle>Ordens de Serviço</CardTitle>
              <CardDescription>Manutenções abertas e em andamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ordensManutencao.map((o) => (
                <div
                  key={o.id}
                  className={`rounded-lg border-l-4 p-4 ${
                    o.prioridade === "Alta"
                      ? "border-l-danger bg-danger/5"
                      : o.prioridade === "Média"
                      ? "border-l-warning bg-warning/5"
                      : "border-l-muted-foreground bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <div className="font-semibold">{o.item}</div>
                      <div className="text-sm text-muted-foreground">{o.descricao}</div>
                    </div>
                    <Badge
                      variant={
                        o.status === "Concluída"
                          ? "success"
                          : o.status === "Em andamento"
                          ? "info"
                          : "warning"
                      }
                    >
                      {o.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>Aberta em {formatDateBR(o.dataAbertura)}</span>
                    <span>Prioridade: <strong>{o.prioridade}</strong></span>
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
