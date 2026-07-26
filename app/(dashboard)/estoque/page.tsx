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
  Loader2,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import type {
  CategoriaEstoque,
  ItemEstoque,
  SubcategoriaConsumo,
  SubcategoriaVenda,
} from "@/lib/types";
import { formatBRL, formatDateBR, diffDays, cn } from "@/lib/utils";

const SUBCATEGORIAS: Record<CategoriaEstoque, Array<SubcategoriaConsumo | SubcategoriaVenda>> = {
  Consumo: ["Alimentos", "Limpeza", "Material Pedagógico"],
  Venda: ["Uniforme", "Festa", "Material Escolar", "Alimentação Extra", "Atividade Extra"],
};

function diasAteValidade(validade: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return diffDays(hoje, `${validade}T00:00:00`);
}

export default function EstoquePage() {
  const { items: itensEstoque, add, carregando, erro } = useEntidade("estoque");
  const [busca, setBusca] = React.useState("");
  const [subFiltro, setSubFiltro] = React.useState("todas");
  const [novoItemAberto, setNovoItemAberto] = React.useState(false);
  const [itemReposicao, setItemReposicao] = React.useState<ItemEstoque | null>(null);

  const itensAbaixoPontoReposicao = itensEstoque.filter(
    (item) => item.quantidade <= item.pontoReposicao
  );
  const itensValidadeProxima = itensEstoque.filter((item) => {
    if (!item.validade) return false;
    return diasAteValidade(item.validade) <= 14;
  });

  const consumo = itensEstoque.filter((i) => i.categoria === "Consumo");
  const venda = itensEstoque.filter((i) => i.categoria === "Venda");

  const totalConsumo = consumo.reduce((a, i) => a + i.quantidade * i.custoUnitario, 0);
  const totalVendaCusto = venda.reduce((a, i) => a + i.quantidade * i.custoUnitario, 0);
  const totalVendaPotencial = venda.reduce(
    (a, i) => a + i.quantidade * (i.precoVenda ?? 0),
    0
  );

  const aplicaFiltros = (lista: ItemEstoque[]) =>
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
        <Button onClick={() => setNovoItemAberto(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo item
        </Button>
      </div>

      {erro && (
        <Card className="border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          Não foi possível carregar o estoque: {erro}
        </Card>
      )}

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
                {totalVendaCusto > 0
                  ? `${(((totalVendaPotencial - totalVendaCusto) / totalVendaCusto) * 100).toFixed(0)}% margem sobre o custo`
                  : "Sem itens de venda"}
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

      <div className="flex justify-end">
        <Select value={subFiltro} onValueChange={setSubFiltro}>
          <SelectTrigger className="w-64">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Todas as subcategorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as subcategorias</SelectItem>
            {Array.from(new Set(itensEstoque.map((item) => item.subcategoria)))
              .sort((a, b) => a.localeCompare(b, "pt-BR"))
              .map((subcategoria) => (
                <SelectItem key={subcategoria} value={subcategoria}>
                  {subcategoria}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
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
          <ItemTable itens={aplicaFiltros(itensEstoque)} busca={busca} setBusca={setBusca} carregando={carregando} />
        </TabsContent>
        <TabsContent value="consumo">
          <ItemTable itens={aplicaFiltros(consumo)} busca={busca} setBusca={setBusca} carregando={carregando} />
        </TabsContent>
        <TabsContent value="venda">
          <ItemTable itens={aplicaFiltros(venda)} busca={busca} setBusca={setBusca} carregando={carregando} mostraPreco />
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
              {!carregando && itensAbaixoPontoReposicao.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum item precisa de reposição.
                </div>
              )}
              {itensAbaixoPontoReposicao.map((i) => {
                const pct = i.pontoReposicao > 0
                  ? Math.min((i.quantidade / i.pontoReposicao) * 100, 100)
                  : 0;
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
                      <Button size="sm" variant="outline" onClick={() => setItemReposicao(i)}>
                        <Truck className="mr-2 h-3 w-3" /> Registrar entrada
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
                Validades próximas ou vencidas
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
                  {!carregando && itensValidadeProxima.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum item com validade próxima.
                      </TableCell>
                    </TableRow>
                  )}
                  {itensValidadeProxima.map((i) => {
                    const dias = diasAteValidade(i.validade!);
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.nome}</TableCell>
                        <TableCell>{i.quantidade} {i.unidade}</TableCell>
                        <TableCell>{formatDateBR(i.validade!)}</TableCell>
                        <TableCell>
                          <span className={cn("font-semibold", dias < 7 ? "text-danger" : "text-warning")}>
                            {dias < 0
                              ? `Vencido há ${Math.abs(dias)} dia(s)`
                              : dias === 0
                                ? "Vence hoje"
                                : `${dias} dia(s)`}
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

      <NovoItemEstoqueModal
        aberto={novoItemAberto}
        onFechar={() => setNovoItemAberto(false)}
        onSalvar={add}
      />
      <ReposicaoEstoqueModal
        item={itemReposicao}
        onFechar={() => setItemReposicao(null)}
      />
    </div>
  );
}

function ItemTable({
  itens,
  busca,
  setBusca,
  carregando,
  mostraPreco = false,
}: {
  itens: ItemEstoque[];
  busca: string;
  setBusca: (v: string) => void;
  carregando: boolean;
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
            {carregando && (
              <TableRow>
                <TableCell colSpan={mostraPreco ? 7 : 5} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando estoque...
                </TableCell>
              </TableRow>
            )}
            {!carregando && itens.length === 0 && (
              <TableRow>
                <TableCell colSpan={mostraPreco ? 7 : 5} className="py-8 text-center text-muted-foreground">
                  Nenhum item encontrado.
                </TableCell>
              </TableRow>
            )}
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

function NovoItemEstoqueModal({
  aberto,
  onFechar,
  onSalvar,
}: {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (item: ItemEstoque) => Promise<void>;
}) {
  const toast = useToast();
  const [nome, setNome] = React.useState("");
  const [categoria, setCategoria] = React.useState<CategoriaEstoque>("Consumo");
  const [subcategoria, setSubcategoria] = React.useState<SubcategoriaConsumo | SubcategoriaVenda>("Alimentos");
  const [quantidade, setQuantidade] = React.useState("0");
  const [unidade, setUnidade] = React.useState("un");
  const [pontoReposicao, setPontoReposicao] = React.useState("0");
  const [custoUnitario, setCustoUnitario] = React.useState("0");
  const [precoVenda, setPrecoVenda] = React.useState("");
  const [fornecedor, setFornecedor] = React.useState("");
  const [validade, setValidade] = React.useState("");
  const [tamanho, setTamanho] = React.useState("");
  const [codigoBarras, setCodigoBarras] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  const limpar = () => {
    setNome("");
    setCategoria("Consumo");
    setSubcategoria("Alimentos");
    setQuantidade("0");
    setUnidade("un");
    setPontoReposicao("0");
    setCustoUnitario("0");
    setPrecoVenda("");
    setFornecedor("");
    setValidade("");
    setTamanho("");
    setCodigoBarras("");
  };

  const fechar = () => {
    if (salvando) return;
    limpar();
    onFechar();
  };

  const trocarCategoria = (proxima: CategoriaEstoque) => {
    setCategoria(proxima);
    setSubcategoria(SUBCATEGORIAS[proxima][0] ?? "Alimentos");
    if (proxima === "Consumo") {
      setPrecoVenda("");
      setTamanho("");
    } else {
      setValidade("");
    }
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    const qtd = Number(quantidade);
    const reposicao = Number(pontoReposicao);
    const custo = Number(custoUnitario);
    const preco = precoVenda === "" ? undefined : Number(precoVenda);

    if (
      !nome.trim() ||
      !unidade.trim() ||
      !Number.isFinite(qtd) || qtd < 0 ||
      !Number.isFinite(reposicao) || reposicao < 0 ||
      !Number.isFinite(custo) || custo < 0 ||
      (preco !== undefined && (!Number.isFinite(preco) || preco < 0))
    ) {
      toast.warning("Revise os dados", "Preencha os campos obrigatórios com valores válidos e não negativos.");
      return;
    }

    setSalvando(true);
    try {
      const item: ItemEstoque = {
        id: "",
        nome: nome.trim(),
        categoria,
        subcategoria,
        quantidade: qtd,
        unidade: unidade.trim(),
        pontoReposicao: reposicao,
        custoUnitario: custo,
        precoVenda: categoria === "Venda" ? preco : undefined,
        fornecedor: fornecedor.trim() || undefined,
        validade: categoria === "Consumo" && validade ? validade : undefined,
        tamanho: categoria === "Venda" && tamanho.trim() ? tamanho.trim() : undefined,
        codigoBarras: codigoBarras.trim() || undefined,
      };
      await onSalvar(item);
      toast.success("Item cadastrado", `${item.nome} foi salvo no estoque.`);
      limpar();
      onFechar();
    } catch (error) {
      console.warn("[estoque] não foi possível cadastrar o item", error);
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={fechar}
    >
      <form
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-popover shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={salvar}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-popover p-5">
          <div>
            <h2 className="font-bold">Novo item de estoque</h2>
            <p className="text-xs text-muted-foreground">O cadastro será salvo no banco da escola.</p>
          </div>
          <button type="button" onClick={fechar} className="rounded-md p-2 hover:bg-accent" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <Label htmlFor="estoque-nome" required>Nome</Label>
            <Input id="estoque-nome" className="mt-1.5" value={nome} onChange={(event) => setNome(event.target.value)} required autoFocus />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="estoque-categoria" required>Categoria</Label>
              <select
                id="estoque-categoria"
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={categoria}
                onChange={(event) => trocarCategoria(event.target.value as CategoriaEstoque)}
              >
                <option>Consumo</option>
                <option>Venda</option>
              </select>
            </div>
            <div>
              <Label htmlFor="estoque-subcategoria" required>Subcategoria</Label>
              <select
                id="estoque-subcategoria"
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={subcategoria}
                onChange={(event) => setSubcategoria(event.target.value as SubcategoriaConsumo | SubcategoriaVenda)}
              >
                {SUBCATEGORIAS[categoria].map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="estoque-quantidade" required>Quantidade inicial</Label>
              <Input id="estoque-quantidade" className="mt-1.5" type="number" min="0" step="0.01" value={quantidade} onChange={(event) => setQuantidade(event.target.value)} required />
            </div>
            <div>
              <Label htmlFor="estoque-unidade" required>Unidade</Label>
              <Input id="estoque-unidade" className="mt-1.5" value={unidade} onChange={(event) => setUnidade(event.target.value)} placeholder="un, kg, L..." required />
            </div>
            <div>
              <Label htmlFor="estoque-reposicao" required>Ponto de reposição</Label>
              <Input id="estoque-reposicao" className="mt-1.5" type="number" min="0" step="0.01" value={pontoReposicao} onChange={(event) => setPontoReposicao(event.target.value)} required />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="estoque-custo" required>Custo unitário (R$)</Label>
              <Input id="estoque-custo" className="mt-1.5" type="number" min="0" step="0.01" value={custoUnitario} onChange={(event) => setCustoUnitario(event.target.value)} required />
            </div>
            {categoria === "Venda" && (
              <div>
                <Label htmlFor="estoque-preco">Preço de venda (R$)</Label>
                <Input id="estoque-preco" className="mt-1.5" type="number" min="0" step="0.01" value={precoVenda} onChange={(event) => setPrecoVenda(event.target.value)} />
              </div>
            )}
            {categoria === "Consumo" && (
              <div>
                <Label htmlFor="estoque-validade">Validade</Label>
                <Input id="estoque-validade" className="mt-1.5" type="date" value={validade} onChange={(event) => setValidade(event.target.value)} />
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="estoque-fornecedor">Fornecedor</Label>
              <Input id="estoque-fornecedor" className="mt-1.5" value={fornecedor} onChange={(event) => setFornecedor(event.target.value)} />
            </div>
            {categoria === "Venda" && (
              <div>
                <Label htmlFor="estoque-tamanho">Tamanho/variação</Label>
                <Input id="estoque-tamanho" className="mt-1.5" value={tamanho} onChange={(event) => setTamanho(event.target.value)} placeholder="Ex.: M" />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="estoque-codigo">Código de barras</Label>
            <Input id="estoque-codigo" className="mt-1.5" value={codigoBarras} onChange={(event) => setCodigoBarras(event.target.value)} />
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-popover p-4">
          <Button type="button" variant="outline" onClick={fechar} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando || !nome.trim()}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar item
          </Button>
        </div>
      </form>
    </div>
  );
}

function ReposicaoEstoqueModal({
  item,
  onFechar,
}: {
  item: ItemEstoque | null;
  onFechar: () => void;
}) {
  const toast = useToast();
  const [quantidadeRecebida, setQuantidadeRecebida] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    setQuantidadeRecebida("");
  }, [item]);

  if (!item) return null;

  const quantidade = Number(quantidadeRecebida);
  const novoSaldo = Number.isFinite(quantidade) && quantidade > 0
    ? item.quantidade + quantidade
    : item.quantidade;

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      toast.warning("Quantidade inválida", "Informe uma quantidade recebida maior que zero.");
      return;
    }

    setSalvando(true);
    try {
      const resposta = await fetch(`/api/estoque/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ incrementarQuantidade: quantidade }),
      });
      const dados = await resposta.json().catch(() => ({})) as {
        error?: string;
        item?: ItemEstoque;
      };
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível registrar a entrada");
      window.dispatchEvent(new CustomEvent("semente:changed:estoque"));
      const saldoConfirmado = dados.item?.quantidade ?? novoSaldo;
      toast.success("Entrada registrada", `${item.nome}: saldo atualizado para ${saldoConfirmado} ${item.unidade}.`);
      onFechar();
    } catch (error) {
      console.warn("[estoque] não foi possível registrar a entrada", error);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !salvando && onFechar()}
    >
      <form
        className="w-full max-w-md rounded-2xl bg-popover shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={salvar}
      >
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="font-bold">Registrar entrada</h2>
            <p className="text-xs text-muted-foreground">{item.nome}</p>
          </div>
          <button type="button" onClick={onFechar} disabled={salvando} className="rounded-md p-2 hover:bg-accent" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            Saldo atual: <strong>{item.quantidade} {item.unidade}</strong>
          </div>
          <div>
            <Label htmlFor="estoque-entrada" required>Quantidade recebida</Label>
            <Input
              id="estoque-entrada"
              className="mt-1.5"
              type="number"
              min="0.01"
              step="0.01"
              value={quantidadeRecebida}
              onChange={(event) => setQuantidadeRecebida(event.target.value)}
              required
              autoFocus
            />
          </div>
          {quantidade > 0 && (
            <div className="text-sm text-muted-foreground">
              Novo saldo: <strong className="text-foreground">{novoSaldo} {item.unidade}</strong>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t p-4">
          <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando || !quantidadeRecebida}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar entrada
          </Button>
        </div>
      </form>
    </div>
  );
}
