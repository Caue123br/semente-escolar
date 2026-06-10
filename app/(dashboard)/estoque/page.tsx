"use client";

import * as React from "react";
import {
  Package,
  Plus,
  AlertTriangle,
  Calendar,
  TrendingUp,
  ShoppingBag,
  Truck,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  itensEstoque,
  itensAbaixoPontoReposicao,
  itensValidadeProxima,
} from "@/lib/mock-data/estoque";
import { formatBRL, formatDateBR, diffDays, cn } from "@/lib/utils";

export default function EstoquePage() {
  const [busca, setBusca] = React.useState("");
  const [subFiltro, setSubFiltro] = React.useState("todas");

  const consumo = itensEstoque.filter((i) => i.categoria === "Consumo");
  const venda = itensEstoque.filter((i) => i.categoria === "Venda");

  const totalConsumo = consumo.reduce((a, i) => a + i.quantidade * i.custoUnitario, 0);
  const totalVendaCusto = venda.reduce((a, i) => a + i.quantidade * i.custoUnitario, 0);
  const totalVendaPotencial = venda.reduce(
    (a, i) => a + i.quantidade * (i.precoVenda ?? 0),
    0
  );

  const aplicaFiltros = (lista: typeof itensEstoque) =>
    lista.filter((i) => {
      const mB = busca ? i.nome.toLowerCase().includes(busca.toLowerCase()) : true;
      const mS = subFiltro === "todas" || i.subcategoria === subFiltro;
      return mB && mS;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Package className="h-3.5 w-3.5" /> ESTOQUE
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Estoque unificado
          </h1>
          <p className="text-sm text-muted-foreground">
            Consumo (alimentos / limpeza) e Venda (uniformes / festa).
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo item
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Valor consumo</div>
              <div className="mt-1 text-2xl font-bold">{formatBRL(totalConsumo)}</div>
              <div className="text-xs text-muted-foreground mt-1">{consumo.length} itens</div>
            </div>
            <ShoppingBag className="h-5 w-5 text-primary" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Valor venda (custo)</div>
              <div className="mt-1 text-2xl font-bold">{formatBRL(totalVendaCusto)}</div>
              <div className="text-xs text-muted-foreground mt-1">{venda.length} itens</div>
            </div>
            <Package className="h-5 w-5 text-primary" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Receita potencial</div>
              <div className="mt-1 text-2xl font-bold text-success">
                {formatBRL(totalVendaPotencial)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                +{(((totalVendaPotencial - totalVendaCusto) / totalVendaCusto) * 100).toFixed(0)}% margem
              </div>
            </div>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Itens em alerta</div>
              <div className="mt-1 text-2xl font-bold text-danger">
                {itensAbaixoPontoReposicao.length + itensValidadeProxima.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Estoque baixo + validade
              </div>
            </div>
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todos">Todos ({itensEstoque.length})</TabsTrigger>
          <TabsTrigger value="consumo">
            <ShoppingBag className="mr-1.5 h-4 w-4" /> Consumo ({consumo.length})
          </TabsTrigger>
          <TabsTrigger value="venda">
            <Package className="mr-1.5 h-4 w-4" /> Venda ({venda.length})
          </TabsTrigger>
          <TabsTrigger value="reposicao">
            <AlertTriangle className="mr-1.5 h-4 w-4 text-warning" /> Reposição (
            {itensAbaixoPontoReposicao.length})
          </TabsTrigger>
          <TabsTrigger value="validade">
            <Calendar className="mr-1.5 h-4 w-4 text-danger" /> Validades (
            {itensValidadeProxima.length})
          </TabsTrigger>
          <TabsTrigger value="fornecedores">
            <Truck className="mr-1.5 h-4 w-4" /> Fornecedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos">
          <ItemTable itens={aplicaFiltros(itensEstoque)} busca={busca} setBusca={setBusca} />
        </TabsContent>
        <TabsContent value="consumo">
          <ItemTable itens={aplicaFiltros(consumo)} busca={busca} setBusca={setBusca} />
        </TabsContent>
        <TabsContent value="venda">
          <ItemTable itens={aplicaFiltros(venda)} busca={busca} setBusca={setBusca} mostraPreco />
        </TabsContent>
        <TabsContent value="reposicao">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Itens para repor urgentemente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {itensAbaixoPontoReposicao.map((i) => {
                const pct = (i.quantidade / i.pontoReposicao) * 100;
                return (
                  <div key={i.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold">{i.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {i.fornecedor} · {i.subcategoria}
                        </div>
                      </div>
                      <Badge variant="warning">
                        {i.quantidade} {i.unidade}
                      </Badge>
                    </div>
                    <Progress
                      value={pct}
                      indicatorClassName="bg-warning"
                      className="h-2"
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>Ponto de reposição: {i.pontoReposicao} {i.unidade}</span>
                      <Button size="sm" variant="outline">
                        <Truck className="mr-2 h-3 w-3" /> Pedir reposição
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="validade">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-danger" />
                Validades próximas (14 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Dias restantes</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensValidadeProxima.map((i) => {
                    const dias = diffDays(new Date(), i.validade!);
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.nome}</TableCell>
                        <TableCell>{i.quantidade} {i.unidade}</TableCell>
                        <TableCell>{formatDateBR(i.validade!)}</TableCell>
                        <TableCell>
                          <span className={cn("font-semibold", dias < 7 ? "text-danger" : "text-warning")}>
                            {dias} dias
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={dias < 7 ? "danger" : "warning"}>
                            {dias < 7 ? "Crítico" : "Atenção"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fornecedores">
          <Card>
            <CardHeader>
              <CardTitle>Fornecedores cadastrados</CardTitle>
              <CardDescription>Contatos e produtos vinculados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from(new Set(itensEstoque.map((i) => i.fornecedor).filter(Boolean))).map(
                  (f) => {
                    const itens = itensEstoque.filter((i) => i.fornecedor === f);
                    return (
                      <Card key={f} className="p-4">
                        <div className="font-semibold">{f}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {itens.length} item(ns) fornecido(s)
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Valor médio:{" "}
                          {formatBRL(
                            itens.reduce((a, i) => a + i.custoUnitario, 0) / itens.length
                          )}
                        </div>
                      </Card>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ItemTable({
  itens,
  busca,
  setBusca,
  mostraPreco = false,
}: {
  itens: typeof itensEstoque;
  busca: string;
  setBusca: (v: string) => void;
  mostraPreco?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Itens ({itens.length})</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar item..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Custo unit.</TableHead>
              {mostraPreco && <TableHead>Preço</TableHead>}
              {mostraPreco && <TableHead>Margem</TableHead>}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.map((i) => {
              const baixo = i.quantidade <= i.pontoReposicao;
              const margem = i.precoVenda
                ? ((i.precoVenda - i.custoUnitario) / i.precoVenda) * 100
                : 0;
              return (
                <TableRow key={i.id}>
                  <TableCell>
                    <div className="font-medium">{i.nome}</div>
                    {i.tamanho && (
                      <div className="text-xs text-muted-foreground">Tam: {i.tamanho}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {i.subcategoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {i.quantidade} {i.unidade}
                  </TableCell>
                  <TableCell>{formatBRL(i.custoUnitario)}</TableCell>
                  {mostraPreco && (
                    <TableCell className="font-semibold">
                      {i.precoVenda ? formatBRL(i.precoVenda) : "—"}
                    </TableCell>
                  )}
                  {mostraPreco && (
                    <TableCell>
                      {i.precoVenda && (
                        <Badge variant="success" className="text-[10px]">
                          {margem.toFixed(0)}%
                        </Badge>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    {baixo ? (
                      <Badge variant="warning">Repor</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
