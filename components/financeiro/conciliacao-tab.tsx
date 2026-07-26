"use client";

import { Check, AlertCircle, Upload, Banknote } from "lucide-react";
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
import { formatBRL, formatDateBR } from "@/lib/utils";
import { useEntidade } from "@/lib/data/store";
import { usePeriodoContexto } from "@/lib/contexto-periodo";

export function ConciliacaoTab() {
  const { periodo } = usePeriodoContexto();
  const { items: mensalidades } = useEntidade("mensalidades");
  const { items: vendas } = useEntidade("vendas");

  // Lançamentos = mensalidades pagas + vendas no mês
  const mensPagas = mensalidades.filter(
    (m) => m.competencia === periodo.competencia && m.status === "Paga"
  );
  const vendasMes = vendas.filter((v) => v.data >= periodo.inicio && v.data <= periodo.fim);

  const lancamentos = [
    ...mensPagas.map((m) => ({
      id: m.id,
      data: m.dataPagamento ?? m.vencimento,
      descricao: `${m.formaPagamento ?? "Pagamento"} — ${m.alunoNome}`,
      valor: m.valorPago ?? m.valor,
      banco: m.formaPagamento === "Pix" ? "Pix" : m.formaPagamento === "Boleto" ? "Boleto" : "Conta",
      origem: `Mensalidade ${m.competencia} · ${m.alunoNome}`,
      status: "Conciliado" as const,
    })),
    ...vendasMes.map((v) => ({
      id: v.id,
      data: v.data,
      descricao: `Venda · ${v.itemNome}`,
      valor: v.total,
      banco: v.formaPagamento === "Pix" ? "Pix" : v.formaPagamento === "Boleto" ? "Boleto" : "Conta",
      origem: `Venda — ${v.cliente}`,
      status: "Conciliado" as const,
    })),
  ].sort((a, b) => b.data.localeCompare(a.data));

  const total = lancamentos.reduce((a, l) => a + l.valor, 0);
  const totalPix = lancamentos.filter((l) => l.banco === "Pix").reduce((a, l) => a + l.valor, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Lançamentos no mês</div>
          <div className="mt-1 text-2xl font-bold">{lancamentos.length}</div>
          <div className="text-xs text-muted-foreground mt-1">{periodo.label}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Total conciliado</div>
          <div className="mt-1 text-2xl font-bold text-success">{formatBRL(total)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Recebido via Pix</div>
          <div className="mt-1 text-2xl font-bold text-primary">{formatBRL(totalPix)}</div>
        </Card>
      </div>

      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Upload className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm text-amber-900">Importar OFX bancário — em breve</div>
            <div className="text-xs text-amber-800 mt-1">
              Por enquanto, considera-se que toda mensalidade marcada como paga e venda registrada
              é uma entrada bancária conciliada. Pra conciliar com extrato real do banco, configure
              integração com seu PSP / Open Finance.
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimentação financeira de {periodo.label}</CardTitle>
          <CardDescription>
            Entradas reconhecidas pelo sistema (mensalidades pagas + vendas)
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 overflow-x-auto">
          {lancamentos.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              Nenhuma movimentação registrada em {periodo.label}.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.slice(0, 30).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{formatDateBR(l.data)}</TableCell>
                    <TableCell className="font-medium">{l.descricao}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        <Banknote className="mr-1 h-3 w-3" />
                        {l.banco}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{formatBRL(l.valor)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.origem}</TableCell>
                    <TableCell>
                      <Badge variant="success" className="text-[10px]">
                        <Check className="mr-1 h-3 w-3" /> Conciliado
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
