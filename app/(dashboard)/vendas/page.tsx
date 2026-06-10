"use client";

import * as React from "react";
import {
  ShoppingCart,
  Plus,
  TrendingUp,
  Package,
  Search,
  Receipt,
  Minus,
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { vendas, totalVendasMes } from "@/lib/mock-data/vendas";
import { itensEstoque } from "@/lib/mock-data/estoque";
import { formatBRL, formatDateBR } from "@/lib/utils";

export default function VendasPage() {
  const itensVenda = itensEstoque.filter((i) => i.categoria === "Venda");
  const [carrinho, setCarrinho] = React.useState<Record<string, number>>({});

  const totalCarrinho = Object.entries(carrinho).reduce((acc, [id, qtd]) => {
    const item = itensVenda.find((i) => i.id === id);
    return acc + (item?.precoVenda ?? 0) * qtd;
  }, 0);

  const totalItensCarrinho = Object.values(carrinho).reduce((a, b) => a + b, 0);

  const add = (id: string) => setCarrinho((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  const remove = (id: string) =>
    setCarrinho((p) => {
      const novo = { ...p };
      if (novo[id] && novo[id] > 1) novo[id]--;
      else delete novo[id];
      return novo;
    });

  const porTipo = vendas.reduce<Record<string, number>>((acc, v) => {
    acc[v.tipo] = (acc[v.tipo] ?? 0) + v.total;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <ShoppingCart className="h-3.5 w-3.5" /> VENDAS
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Vendas & PDV
          </h1>
          <p className="text-sm text-muted-foreground">
            Uniformes, alimentação e eventos — conecta com estoque e financeiro.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nova venda manual
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Vendas do mês</div>
          <div className="mt-1 text-2xl font-bold">{formatBRL(totalVendasMes)}</div>
          <div className="text-xs text-muted-foreground mt-1">{vendas.length} transações</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Uniformes</div>
          <div className="mt-1 text-2xl font-bold text-primary">
            {formatBRL(porTipo["Uniforme"] ?? 0)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Eventos / Festa</div>
          <div className="mt-1 text-2xl font-bold text-warning">
            {formatBRL(porTipo["Evento/Festa"] ?? 0)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Alimentação extra</div>
          <div className="mt-1 text-2xl font-bold text-success">
            {formatBRL(porTipo["Alimentação"] ?? 0)}
          </div>
        </Card>
      </div>

      <Tabs defaultValue="pdv" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pdv">
            <Receipt className="mr-1.5 h-4 w-4" /> PDV
          </TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório</TabsTrigger>
        </TabsList>

        <TabsContent value="pdv">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Produtos disponíveis</CardTitle>
                  <CardDescription>Clique para adicionar ao carrinho</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                    {itensVenda.map((item) => {
                      const noCarrinho = carrinho[item.id] ?? 0;
                      return (
                        <button
                          key={item.id}
                          onClick={() => add(item.id)}
                          className="group rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md"
                        >
                          <div className="flex h-16 items-center justify-center rounded bg-muted mb-2">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div className="font-semibold text-sm leading-tight line-clamp-2">
                            {item.nome}
                          </div>
                          {item.tamanho && (
                            <div className="text-xs text-muted-foreground">
                              Tam {item.tamanho}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="text-sm font-bold text-primary">
                              {item.precoVenda ? formatBRL(item.precoVenda) : "—"}
                            </div>
                            {noCarrinho > 0 && (
                              <Badge variant="info" className="text-[10px]">
                                {noCarrinho}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Em estoque: {item.quantidade}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="sticky top-20 h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrinho ({totalItensCarrinho})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(carrinho).length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Carrinho vazio
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(carrinho).map(([id, qtd]) => {
                      const item = itensVenda.find((i) => i.id === id)!;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatBRL(item.precoVenda ?? 0)} × {qtd}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => remove(id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-bold w-6 text-center">{qtd}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => add(id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
              <div className="border-t p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatBRL(totalCarrinho)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatBRL(totalCarrinho)}</span>
                </div>
                <Button className="w-full" disabled={totalCarrinho === 0}>
                  <Receipt className="mr-2 h-4 w-4" /> Finalizar venda
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de vendas</CardTitle>
              <CardDescription>{vendas.length} vendas registradas em junho</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>NF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendas.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">{formatDateBR(v.data)}</TableCell>
                      <TableCell className="font-medium">{v.itemNome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{v.tipo}</Badge>
                      </TableCell>
                      <TableCell>{v.quantidade}</TableCell>
                      <TableCell className="text-sm">{v.cliente}</TableCell>
                      <TableCell className="text-sm">{v.formaPagamento}</TableCell>
                      <TableCell className="font-semibold">{formatBRL(v.total)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {v.notaFiscal ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatorio">
          <Card>
            <CardHeader>
              <CardTitle>Vendas por categoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(porTipo).map(([tipo, valor]) => {
                const pct = (valor / totalVendasMes) * 100;
                return (
                  <div key={tipo} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{tipo}</span>
                      <span className="text-muted-foreground">
                        {formatBRL(valor)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
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
