"use client";

import * as React from "react";
import { Search, Filter, Download } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { mensalidadesJunho } from "@/lib/mock-data/financeiro";
import { formatBRL, formatDateBR, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptySearchState } from "@/components/shared/empty-state";
import type { StatusMensalidade } from "@/lib/types";

const STATUS_VARIANT: Record<
  StatusMensalidade,
  "success" | "warning" | "danger" | "info" | "secondary"
> = {
  Paga: "success",
  "A Vencer": "info",
  "Vence Hoje": "warning",
  Atrasada: "danger",
  Renegociada: "secondary",
};

export function MensalidadesTable() {
  const [busca, setBusca] = React.useState("");
  const [filtroStatus, setFiltroStatus] = React.useState<string>("todos");

  const filtradas = mensalidadesJunho.filter((m) => {
    const matchBusca = busca
      ? m.alunoNome.toLowerCase().includes(busca.toLowerCase()) ||
        m.turmaNome.toLowerCase().includes(busca.toLowerCase())
      : true;
    const matchStatus = filtroStatus === "todos" || m.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Mensalidades — Junho/2026</CardTitle>
            <CardDescription>
              {filtradas.length} de {mensalidadesJunho.length} mensalidades
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno ou turma..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-44">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="Paga">Pagas</SelectItem>
                <SelectItem value="A Vencer">A Vencer</SelectItem>
                <SelectItem value="Atrasada">Atrasadas</SelectItem>
                <SelectItem value="Renegociada">Renegociadas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {filtradas.length === 0 ? (
          <EmptySearchState busca={busca} />
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/15 text-primary text-xs">
                        {initials(m.alunoNome)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{m.alunoNome}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{m.turmaNome}</TableCell>
                <TableCell>{formatDateBR(m.vencimento)}</TableCell>
                <TableCell className="font-semibold">{formatBRL(m.valor)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {m.dataPagamento ? (
                    <>
                      {formatDateBR(m.dataPagamento)} · {m.formaPagamento}
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[m.status]}>
                    {m.status}
                    {m.diasAtraso > 0 && ` · ${m.diasAtraso}d`}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}
