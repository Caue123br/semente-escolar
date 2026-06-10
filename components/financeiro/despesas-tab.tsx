"use client";

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
import { Plus, Download } from "lucide-react";
import {
  despesas,
  totalDespesasMes,
  totalDespesasPagas,
  totalDespesasAPagar,
} from "@/lib/mock-data/despesas";
import { formatBRL, formatDateBR } from "@/lib/utils";

export function DespesasTab() {
  const kpis = [
    { label: "Total do mês", valor: totalDespesasMes, cor: "text-foreground" },
    { label: "Pagas", valor: totalDespesasPagas, cor: "text-success" },
    { label: "A pagar", valor: totalDespesasAPagar, cor: "text-warning" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              {k.label}
            </div>
            <div className={`mt-1 text-2xl font-bold ${k.cor}`}>{formatBRL(k.valor)}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Despesas — Junho/2026</CardTitle>
              <CardDescription>{despesas.length} lançamentos</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Nova despesa
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesas.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm">{formatDateBR(d.data)}</TableCell>
                  <TableCell className="font-medium">{d.descricao}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{d.categoria}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{d.fornecedor}</TableCell>
                  <TableCell className="font-semibold">{formatBRL(d.valor)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        d.status === "Paga"
                          ? "success"
                          : d.status === "Atrasada"
                          ? "danger"
                          : "warning"
                      }
                    >
                      {d.status}
                    </Badge>
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
