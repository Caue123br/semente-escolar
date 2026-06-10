"use client";

import { Check, X, AlertCircle, Upload } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateBR } from "@/lib/utils";

const lancamentos = [
  { id: "l1", data: "2026-06-08", descricao: "PIX recebido — Mariana Almeida", valor: 2870, banco: "Sicredi", status: "Conciliado", origem: "Mensalidade Sofia" },
  { id: "l2", data: "2026-06-08", descricao: "PIX recebido — Camila Pereira", valor: 2290, banco: "Sicredi", status: "Conciliado", origem: "Mensalidade Heitor" },
  { id: "l3", data: "2026-06-07", descricao: "TED recebido — Patrícia Costa", valor: 2870, banco: "Itaú", status: "Conciliado", origem: "Mensalidade Manuela" },
  { id: "l4", data: "2026-06-08", descricao: "PIX recebido — Origem desconhecida", valor: 150, banco: "Sicredi", status: "Pendente", origem: "—" },
  { id: "l5", data: "2026-06-07", descricao: "Boleto liquidado — 89200012345", valor: 2870, banco: "Sicredi", status: "Conciliado", origem: "Mensalidade Helena" },
  { id: "l6", data: "2026-06-06", descricao: "PIX recebido — R. T. Martins", valor: 245, banco: "Sicredi", status: "Divergência", origem: "Esperado: R$ 2.870" },
];

export function ConciliacaoTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Conciliado</div>
          <div className="mt-1 text-2xl font-bold text-success">87%</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Pendentes</div>
          <div className="mt-1 text-2xl font-bold text-warning">5</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Divergências</div>
          <div className="mt-1 text-2xl font-bold text-danger">2</div>
        </Card>
        <Card className="p-5 flex flex-col items-start justify-center">
          <Button size="sm" className="w-full">
            <Upload className="mr-2 h-4 w-4" /> Importar OFX
          </Button>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conciliação bancária</CardTitle>
          <CardDescription>Lançamentos do extrato vs. sistema</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentos.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{formatDateBR(l.data)}</TableCell>
                  <TableCell className="font-medium">{l.descricao}</TableCell>
                  <TableCell className="text-muted-foreground">{l.banco}</TableCell>
                  <TableCell className="font-semibold">{formatBRL(l.valor)}</TableCell>
                  <TableCell className="text-sm">{l.origem}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        l.status === "Conciliado"
                          ? "success"
                          : l.status === "Divergência"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {l.status === "Conciliado" && <Check className="mr-1 h-3 w-3" />}
                      {l.status === "Divergência" && <X className="mr-1 h-3 w-3" />}
                      {l.status === "Pendente" && <AlertCircle className="mr-1 h-3 w-3" />}
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {l.status !== "Conciliado" && (
                      <Button variant="outline" size="sm">
                        Vincular
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
