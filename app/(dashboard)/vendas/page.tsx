"use client";

import * as React from "react";
import {
  ShoppingCart,
  Plus,
  Package,
  Receipt,
  Minus,
  Loader2,
  Shirt,
  PartyPopper,
  Apple,
  Sparkles,
  BookOpen,
  Search,
  X,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  FileText,
  ScanBarcode,
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { SeletorMes, usePeriodoMes, ComparacaoMesAnterior } from "@/components/shared/seletor-mes";
import { mesAnterior } from "@/components/shared/seletor-mes";
import type { Venda, TipoVenda, SubcategoriaVenda } from "@/lib/types";
import { formatBRL, formatDateBR, formatDateLocalISO, cn } from "@/lib/utils";
import { SortHeader } from "@/components/ui/sort-header";
import { useSort } from "@/lib/use-sort";

const CATEGORIAS: { id: SubcategoriaVenda; label: string; tipoVenda: TipoVenda; icon: React.ComponentType<{ className?: string }>; cor: string }[] = [
  { id: "Uniforme", label: "Uniformes", tipoVenda: "Uniforme", icon: Shirt, cor: "text-blue-600" },
  { id: "Festa", label: "Festas", tipoVenda: "Evento/Festa", icon: PartyPopper, cor: "text-purple-600" },
  { id: "Alimentação Extra", label: "Alimentação", tipoVenda: "Alimentação Extra", icon: Apple, cor: "text-emerald-600" },
  { id: "Atividade Extra", label: "Atividades", tipoVenda: "Atividade Extra", icon: Sparkles, cor: "text-amber-600" },
  { id: "Material Escolar", label: "Material Escolar", tipoVenda: "Material", icon: BookOpen, cor: "text-slate-600" },
];

const PAGAMENTOS: { id: Venda["formaPagamento"]; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "Pix", label: "Pix", icon: QrCode },
  { id: "Cartão", label: "Cartão", icon: CreditCard },
  { id: "Dinheiro", label: "Dinheiro", icon: Banknote },
  { id: "Boleto", label: "Boleto", icon: FileText },
];

export default function VendasPage() {
  const toast = useToast();
  const { items: vendas } = useEntidade("vendas");
  const { items: itensEstoque } = useEntidade("estoque");
  const { items: alunos } = useEntidade("alunos");

  const itensVenda = React.useMemo(
    () => itensEstoque.filter((i) => i.categoria === "Venda"),
    [itensEstoque]
  );
  const itensMap = React.useMemo(() => new Map(itensVenda.map((i) => [i.id, i])), [itensVenda]);
  const codigosMap = React.useMemo(() => {
    const m = new Map<string, typeof itensVenda[number]>();
    for (const i of itensVenda) {
      if (i.codigoBarras) m.set(i.codigoBarras.trim(), i);
    }
    return m;
  }, [itensVenda]);

  const { periodo, setPeriodo, proximoMes, mesAnteriorAcao, irHoje } = usePeriodoMes();
  const periodoAnterior = mesAnterior(periodo);

  const [categoriaAtiva, setCategoriaAtiva] = React.useState<SubcategoriaVenda>("Uniforme");
  const [busca, setBusca] = React.useState("");
  const [carrinho, setCarrinho] = React.useState<Record<string, number>>({});
  const [cliente, setCliente] = React.useState("");
  const [formaPagamento, setFormaPagamento] = React.useState<Venda["formaPagamento"]>("Pix");
  const [finalizando, setFinalizando] = React.useState(false);
  const [modalVendaAberto, setModalVendaAberto] = React.useState(false);
  const [mostraSugestoesCliente, setMostraSugestoesCliente] = React.useState(false);
  const [codigoBipado, setCodigoBipado] = React.useState("");
  const [descontoPct, setDescontoPct] = React.useState(0);
  const [valorRecebido, setValorRecebido] = React.useState(0);
  const [confirmarLimpar, setConfirmarLimpar] = React.useState(false);
  const [reciboVenda, setReciboVenda] = React.useState<{ itens: Array<{ nome: string; qtd: number; preco: number; total: number }>; total: number; desconto: number; cliente: string; forma: string; data: string } | null>(null);
  const buscaRef = React.useRef<HTMLInputElement>(null);
  const bipRef = React.useRef<HTMLInputElement>(null);

  const bipar = (codigo: string) => {
    const cod = codigo.trim();
    if (!cod) return;
    const item = codigosMap.get(cod);
    if (!item) {
      toast.error("Código não cadastrado", `"${cod}" — cadastra no produto antes.`);
      return;
    }
    const atual = carrinho[item.id] ?? 0;
    if (atual + 1 > item.quantidade) {
      toast.error("Sem estoque", `Apenas ${item.quantidade} disponíveis de ${item.nome}.`);
      return;
    }
    setCarrinho((p) => ({ ...p, [item.id]: atual + 1 }));
    toast.success("Adicionado!", `${item.nome} (${atual + 1})`);
  };

  const cadastrarCodigoProduto = async (itemId: string, nomeItem: string) => {
    const cod = window.prompt(`Cadastrar código de barras para "${nomeItem}":`);
    if (!cod || !cod.trim()) return;
    const item = itensMap.get(itemId);
    if (!item) return;
    try {
      const r = await fetch(`/api/estoque/${itemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigoBarras: cod.trim() }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error("Erro", d.error || "Tente de novo");
        return;
      }
      toast.success("Código cadastrado!", `${nomeItem}: ${cod.trim()}`);
      // recarregar estoque
      window.location.reload();
    } catch {
      toast.error("Erro de rede", "Tenta de novo");
    }
  };

  // Atalhos teclado: "/" foca busca, "b" foca bipar, "Esc" limpa
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ativo = document.activeElement as HTMLElement | null;
      const ehInput = ativo?.tagName === "INPUT" || ativo?.tagName === "TEXTAREA";
      if (e.key === "/" && !ehInput) {
        e.preventDefault();
        buscaRef.current?.focus();
      }
      if (e.key === "b" && !ehInput) {
        e.preventDefault();
        bipRef.current?.focus();
      }
      if (e.key === "Escape" && ehInput) {
        if (ativo === buscaRef.current) setBusca("");
        if (ativo === bipRef.current) setCodigoBipado("");
        ativo?.blur();
      }
      // Ctrl+Enter finaliza venda (se carrinho preenchido)
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        if (Object.keys(carrinho).length > 0 && cliente.trim() && !finalizando) {
          e.preventDefault();
          finalizarVenda();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrinho, cliente, finalizando]);

  const produtosDaCategoria = React.useMemo(() => {
    const buscaLower = busca.trim().toLowerCase();
    return itensVenda.filter((i) => {
      if (i.subcategoria !== categoriaAtiva) return false;
      if (!buscaLower) return true;
      return (
        i.nome.toLowerCase().includes(buscaLower) ||
        (i.tamanho ?? "").toLowerCase().includes(buscaLower)
      );
    });
  }, [itensVenda, categoriaAtiva, busca]);

  const vendasDoMes = React.useMemo(
    () => vendas.filter((v) => v.data >= periodo.inicio && v.data <= periodo.fim),
    [vendas, periodo]
  );
  const vendasDoMesAnterior = React.useMemo(
    () => vendas.filter((v) => v.data >= periodoAnterior.inicio && v.data <= periodoAnterior.fim),
    [vendas, periodoAnterior]
  );
  const totalVendasMes = vendasDoMes.reduce((a, v) => a + v.total, 0);
  const totalVendasMesAnterior = vendasDoMesAnterior.reduce((a, v) => a + v.total, 0);
  const porTipoMes: Record<string, number> = vendasDoMes.reduce<Record<string, number>>((acc, v) => {
    acc[v.tipo] = (acc[v.tipo] ?? 0) + v.total;
    return acc;
  }, {});

  const subtotalCarrinho = Object.entries(carrinho).reduce((acc, [id, qtd]) => {
    const item = itensMap.get(id);
    return acc + (item?.precoVenda ?? 0) * qtd;
  }, 0);
  const valorDesconto = subtotalCarrinho * (descontoPct / 100);
  const totalCarrinho = subtotalCarrinho - valorDesconto;
  const totalItensCarrinho = Object.values(carrinho).reduce((a, b) => a + b, 0);
  const troco = formaPagamento === "Dinheiro" && valorRecebido > 0 ? valorRecebido - totalCarrinho : 0;

  const addAoCarrinho = (id: string) => {
    const item = itensMap.get(id);
    if (!item) return;
    const atual = carrinho[id] ?? 0;
    if (atual + 1 > item.quantidade) {
      toast.error("Sem estoque", `Apenas ${item.quantidade} ${item.nome} disponíveis.`);
      return;
    }
    setCarrinho((p) => ({ ...p, [id]: atual + 1 }));
  };
  const setQtdNoCarrinho = (id: string, qtd: number) => {
    const item = itensMap.get(id);
    if (!item) return;
    const q = Math.max(0, Math.floor(qtd));
    if (q > item.quantidade) {
      toast.error("Sem estoque", `Apenas ${item.quantidade} ${item.nome} disponíveis.`);
      setCarrinho((p) => ({ ...p, [id]: item.quantidade }));
      return;
    }
    setCarrinho((p) => {
      const novo = { ...p };
      if (q === 0) delete novo[id];
      else novo[id] = q;
      return novo;
    });
  };
  const removeDoCarrinho = (id: string) =>
    setCarrinho((p) => {
      const novo = { ...p };
      if (novo[id] && novo[id] > 1) novo[id]--;
      else delete novo[id];
      return novo;
    });
  const limparCarrinhoAcao = () => {
    setCarrinho({});
    setCliente("");
    setDescontoPct(0);
    setValorRecebido(0);
  };

  const limparCarrinho = () => {
    if (Object.keys(carrinho).length > 2) {
      setConfirmarLimpar(true);
    } else {
      limparCarrinhoAcao();
    }
  };

  const alunosSugeridos = React.useMemo(() => {
    if (!cliente.trim() || !mostraSugestoesCliente) return [];
    const q = cliente.trim().toLowerCase();
    return alunos
      .filter((a) => a.nome.toLowerCase().includes(q))
      .slice(0, 5);
  }, [alunos, cliente, mostraSugestoesCliente]);

  const finalizarVenda = async () => {
    if (Object.keys(carrinho).length === 0) return;
    if (!cliente.trim()) {
      toast.error("Cliente obrigatório", "Informe quem está comprando");
      return;
    }
    if (formaPagamento === "Dinheiro" && valorRecebido > 0 && valorRecebido < totalCarrinho) {
      toast.error("Valor recebido insuficiente", `Falta ${formatBRL(totalCarrinho - valorRecebido)}`);
      return;
    }
    setFinalizando(true);
    try {
      const response = await fetch("/api/vendas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checkout: true,
          cliente: cliente.trim(),
          formaPagamento,
          descontoPct,
          itens: Object.entries(carrinho).map(([itemId, quantidade]) => ({ itemId, quantidade })),
        }),
      });
      const resultado = await response.json().catch(() => ({})) as {
        error?: string;
        recibo?: Array<{ nome: string; qtd: number; preco: number; total: number }>;
        total?: number;
      };
      if (!response.ok) {
        throw new Error(resultado.error || "Não foi possível finalizar a venda");
      }
      const itensRecibo = resultado.recibo ?? [];
      setReciboVenda({
        itens: itensRecibo,
        total: resultado.total ?? totalCarrinho,
        desconto: valorDesconto,
        cliente,
        forma: formaPagamento,
        data: new Date().toLocaleString("pt-BR"),
      });
      window.dispatchEvent(new CustomEvent("semente:changed:vendas"));
      window.dispatchEvent(new CustomEvent("semente:changed:estoque"));
      toast.success("Venda finalizada!", `${formatBRL(resultado.total ?? totalCarrinho)} — ${cliente}`);
      limparCarrinhoAcao();
      buscaRef.current?.focus();
    } catch (e) {
      toast.error("Erro ao finalizar venda", String(e));
    } finally {
      setFinalizando(false);
    }
  };

  const imprimirRecibo = () => {
    if (!reciboVenda) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const html = `<!DOCTYPE html><html><head><title>Recibo de venda</title>
<style>
@page { size: 80mm auto; margin: 5mm; }
body { font-family: monospace; max-width: 80mm; font-size: 11pt; }
h1 { font-size: 14pt; text-align: center; margin: 0 0 4px; }
.h { text-align: center; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
table { width: 100%; font-size: 10pt; border-collapse: collapse; }
td { padding: 2px 0; vertical-align: top; }
.r { text-align: right; }
.tot { font-size: 12pt; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
.f { margin-top: 12px; text-align: center; font-size: 9pt; }
</style></head><body>
<div class="h"><h1>ESCOLA MODELO</h1><div>${reciboVenda.data}</div></div>
<div><b>Cliente:</b> ${reciboVenda.cliente}</div>
<div><b>Pagamento:</b> ${reciboVenda.forma}</div>
<table>
<tr><td colspan="3" style="border-bottom: 1px dashed #000; padding-top: 6px;"></td></tr>
${reciboVenda.itens.map(i => `<tr><td>${i.qtd}x ${i.nome}</td><td class="r">${formatBRL(i.total)}</td></tr>`).join("")}
</table>
${reciboVenda.desconto > 0 ? `<div style="margin-top:6px;">Desconto: ${formatBRL(reciboVenda.desconto)}</div>` : ""}
<div class="tot">
<table><tr><td>TOTAL</td><td class="r">${formatBRL(reciboVenda.total)}</td></tr></table>
</div>
<div class="f">Obrigada pela compra!<br>Escola Modelo Taubaté</div>
<script>window.print(); setTimeout(()=>window.close(), 500);</script>
</body></html>`;
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <ShoppingCart className="h-3.5 w-3.5" /> VENDAS
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">Vendas & PDV</h1>
          <p className="text-sm text-muted-foreground">
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">/</kbd> busca ·{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">b</kbd> bipar ·{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Esc</kbd> limpa
          </p>
        </div>
        <Button onClick={() => setModalVendaAberto(true)} variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Venda manual
        </Button>
      </div>

      <SeletorMes
        periodo={periodo}
        onSetPeriodo={setPeriodo}
        onProximoMes={proximoMes}
        onMesAnterior={mesAnteriorAcao}
        onIrHoje={irHoje}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Total no mês</div>
          <div className="mt-1 text-xl font-bold">{formatBRL(totalVendasMes)}</div>
          <div className="text-[10px] text-muted-foreground">{vendasDoMes.length} vendas</div>
          <div className="mt-1.5">
            <ComparacaoMesAnterior atual={totalVendasMes} anterior={totalVendasMesAnterior} />
          </div>
        </Card>
        {CATEGORIAS.map((c) => {
          const valor = porTipoMes[c.tipoVenda] ?? 0;
          const valorAnterior = vendasDoMesAnterior.filter((v) => v.tipo === c.tipoVenda).reduce((a, v) => a + v.total, 0);
          const Ic = c.icon;
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase text-muted-foreground">{c.label}</div>
                <Ic className={`h-4 w-4 ${c.cor}`} />
              </div>
              <div className={`mt-1 text-xl font-bold ${c.cor}`}>{formatBRL(valor)}</div>
              <div className="mt-1.5">
                <ComparacaoMesAnterior atual={valor} anterior={valorAnterior} />
              </div>
            </Card>
          );
        })}
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
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={buscaRef}
                        placeholder="Buscar produto por nome ou tamanho..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="pl-9 pr-9"
                      />
                      {busca && (
                        <button
                          onClick={() => setBusca("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="relative w-full sm:w-56">
                      <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      <Input
                        ref={bipRef}
                        placeholder="Bipar código de barras..."
                        value={codigoBipado}
                        onChange={(e) => setCodigoBipado(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && codigoBipado.trim()) {
                            e.preventDefault();
                            bipar(codigoBipado);
                            setCodigoBipado("");
                          }
                        }}
                        className="pl-9 border-emerald-200 focus-visible:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-2">
                    {CATEGORIAS.map((c) => {
                      const Ic = c.icon;
                      const ativo = categoriaAtiva === c.id;
                      const qtd = itensVenda.filter((i) => i.subcategoria === c.id).length;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setCategoriaAtiva(c.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                            ativo
                              ? "bg-primary text-primary-foreground shadow"
                              : "border bg-muted/40 hover:bg-muted"
                          )}
                        >
                          <Ic className={`h-3.5 w-3.5 ${ativo ? "" : c.cor}`} />
                          {c.label}
                          <span className={`ml-1 text-[10px] ${ativo ? "opacity-80" : "text-muted-foreground"}`}>
                            ({qtd})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {produtosDaCategoria.length === 0 ? (
                    <div className="text-center py-10 text-sm text-muted-foreground">
                      {busca ? `Nenhum produto encontrado pra "${busca}".` : "Nenhum produto nessa categoria."}
                    </div>
                  ) : (
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                      {produtosDaCategoria.map((item) => {
                        const noCarrinho = carrinho[item.id] ?? 0;
                        const semEstoque = item.quantidade <= 0;
                        const semPreco = !item.precoVenda;
                        const desabilitado = semEstoque || semPreco;
                        return (
                          <div
                            key={item.id}
                            onClick={() => !desabilitado && addAoCarrinho(item.id)}
                            className={cn(
                              "group relative rounded-lg border bg-card p-3 text-left transition-all cursor-pointer",
                              desabilitado ? "opacity-40 cursor-not-allowed" : "hover:border-primary/40 hover:shadow-md",
                              noCarrinho > 0 && "border-primary/60 ring-1 ring-primary/30"
                            )}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                cadastrarCodigoProduto(item.id, item.nome);
                              }}
                              title={item.codigoBarras ? `Código: ${item.codigoBarras}` : "Cadastrar código de barras"}
                              className={cn(
                                "absolute top-1.5 right-1.5 h-6 w-6 rounded-md flex items-center justify-center transition-colors",
                                item.codigoBarras ? "text-emerald-600 hover:bg-emerald-50" : "text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100"
                              )}
                            >
                              <ScanBarcode className="h-3.5 w-3.5" />
                            </button>
                            <div className="flex h-14 items-center justify-center rounded bg-muted mb-2 relative">
                              <Package className="h-7 w-7 text-muted-foreground" />
                              {noCarrinho > 0 && (
                                <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow">
                                  {noCarrinho}
                                </div>
                              )}
                            </div>
                            <div className="font-semibold text-sm leading-tight line-clamp-2 pr-4">{item.nome}</div>
                            {item.tamanho && (
                              <div className="text-xs text-muted-foreground">Tam {item.tamanho}</div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <div className="text-sm font-bold text-primary">
                                {item.precoVenda ? formatBRL(item.precoVenda) : "—"}
                              </div>
                            </div>
                            <div className={cn(
                              "text-[10px] mt-1",
                              semEstoque ? "text-destructive font-semibold" : item.quantidade < 5 ? "text-amber-600 font-medium" : "text-muted-foreground"
                            )}>
                              {semEstoque ? "Sem estoque" : semPreco ? "Sem preço" : `${item.quantidade} em estoque`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="sticky top-20 h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingCart className="h-5 w-5" />
                    Carrinho ({totalItensCarrinho})
                  </CardTitle>
                  {totalItensCarrinho > 0 && (
                    <button
                      onClick={limparCarrinho}
                      className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Limpar
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {Object.keys(carrinho).length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Carrinho vazio.<br/>Clica nos produtos pra adicionar.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {Object.entries(carrinho).map(([id, qtd]) => {
                      const item = itensMap.get(id);
                      if (!item) return null;
                      const subtotal = (item.precoVenda ?? 0) * qtd;
                      return (
                        <div key={id} className="rounded-lg border p-2">
                          <div className="flex items-start gap-2 mb-1.5">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{item.nome}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatBRL(item.precoVenda ?? 0)} cada
                              </div>
                            </div>
                            <button
                              onClick={() => setQtdNoCarrinho(id, 0)}
                              className="text-muted-foreground hover:text-destructive p-1"
                              title="Remover"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="inline-flex items-center rounded-md border">
                              <button
                                className="h-7 w-7 flex items-center justify-center hover:bg-muted rounded-l-md"
                                onClick={() => removeDoCarrinho(id)}
                                aria-label="Diminuir"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={item.quantidade}
                                value={qtd}
                                onChange={(e) => setQtdNoCarrinho(id, Number(e.target.value))}
                                className="h-7 w-12 text-center text-sm font-semibold bg-transparent border-x outline-none focus:bg-muted/50"
                              />
                              <button
                                className="h-7 w-7 flex items-center justify-center hover:bg-muted rounded-r-md"
                                onClick={() => addAoCarrinho(id)}
                                aria-label="Aumentar"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="font-bold text-sm text-primary">{formatBRL(subtotal)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>

              {Object.keys(carrinho).length > 0 && (
                <div className="border-t p-4 space-y-3">
                  <div className="relative">
                    <Label htmlFor="venda-cliente" className="text-xs">Cliente *</Label>
                    <Input
                      id="venda-cliente"
                      className="mt-1"
                      placeholder="Nome do responsável ou aluno"
                      value={cliente}
                      onChange={(e) => {
                        setCliente(e.target.value);
                        setMostraSugestoesCliente(true);
                      }}
                      onFocus={() => setMostraSugestoesCliente(true)}
                      onBlur={() => setTimeout(() => setMostraSugestoesCliente(false), 150)}
                      autoComplete="off"
                    />
                    {alunosSugeridos.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
                        {alunosSugeridos.map((a) => (
                          <button
                            key={a.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setCliente(a.nome);
                              setMostraSugestoesCliente(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                          >
                            {a.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Forma de pagamento</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PAGAMENTOS.map((p) => {
                        const Ic = p.icon;
                        const ativo = formaPagamento === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setFormaPagamento(p.id)}
                            className={cn(
                              "inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                              ativo
                                ? "bg-primary text-primary-foreground border-primary"
                                : "hover:bg-muted"
                            )}
                          >
                            <Ic className="h-3.5 w-3.5" />
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="desconto-pct" className="text-xs whitespace-nowrap">Desconto %</Label>
                      <Input
                        id="desconto-pct"
                        type="number"
                        min={0}
                        max={50}
                        step={1}
                        className="h-8 flex-1 text-right"
                        value={descontoPct || ""}
                        onChange={(e) => setDescontoPct(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                        placeholder="0"
                      />
                      <div className="flex gap-1">
                        {[5, 10, 15].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setDescontoPct(p)}
                            className="px-1.5 py-0.5 text-[10px] rounded border hover:bg-accent"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    {formaPagamento === "Dinheiro" && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="vlr-recebido" className="text-xs whitespace-nowrap">Recebido</Label>
                        <Input
                          id="vlr-recebido"
                          type="number"
                          min={0}
                          step={0.01}
                          className="h-8 flex-1 text-right"
                          value={valorRecebido || ""}
                          onChange={(e) => setValorRecebido(Number(e.target.value) || 0)}
                          placeholder="0,00"
                        />
                      </div>
                    )}
                  </div>
                  {valorDesconto > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatBRL(subtotalCarrinho)}</span>
                    </div>
                  )}
                  {valorDesconto > 0 && (
                    <div className="flex items-center justify-between text-xs text-emerald-700">
                      <span>Desconto ({descontoPct}%)</span>
                      <span>− {formatBRL(valorDesconto)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-primary">{formatBRL(totalCarrinho)}</span>
                  </div>
                  {troco > 0 && (
                    <div className="flex items-center justify-between text-sm font-semibold rounded-md bg-emerald-50 text-emerald-700 px-2 py-1.5">
                      <span>Troco</span>
                      <span>{formatBRL(troco)}</span>
                    </div>
                  )}
                  {troco < 0 && (
                    <div className="text-xs text-rose-600">
                      Falta {formatBRL(-troco)}
                    </div>
                  )}
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={totalCarrinho === 0 || finalizando || !cliente.trim()}
                    onClick={finalizarVenda}
                  >
                    {finalizando ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Receipt className="mr-2 h-4 w-4" />
                    )}
                    Finalizar venda
                  </Button>
                  <div className="text-[10px] text-muted-foreground text-center">
                    <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">Ctrl+Enter</kbd> finaliza
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <HistoricoVendas vendasDoMes={vendasDoMes} periodoLabel={periodo.label} />
        </TabsContent>

        <TabsContent value="relatorio">
          <Card>
            <CardHeader>
              <CardTitle>Vendas por categoria em {periodo.label}</CardTitle>
              <CardDescription>
                Total: {formatBRL(totalVendasMes)} · {vendasDoMes.length} transações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {CATEGORIAS.map((c) => {
                const valor = porTipoMes[c.tipoVenda] ?? 0;
                const valorAnt = vendasDoMesAnterior.filter((v) => v.tipo === c.tipoVenda).reduce((a, v) => a + v.total, 0);
                const pct = totalVendasMes > 0 ? (valor / totalVendasMes) * 100 : 0;
                const Ic = c.icon;
                return (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <Ic className={`h-4 w-4 ${c.cor}`} />
                        {c.label}
                      </span>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatBRL(valor)} <span className="text-xs text-muted-foreground">({pct.toFixed(1)}%)</span>
                        </div>
                        <ComparacaoMesAnterior atual={valor} anterior={valorAnt} />
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NovaVendaManualModal
        aberto={modalVendaAberto}
        onFechar={() => setModalVendaAberto(false)}
      />

      {confirmarLimpar && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70" onClick={() => setConfirmarLimpar(false)}>
          <div className="w-full max-w-sm bg-popover rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-2">Limpar carrinho?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {Object.keys(carrinho).length} produto(s) no carrinho serão removidos. Não tem como desfazer.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmarLimpar(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => { limparCarrinhoAcao(); setConfirmarLimpar(false); }}>
                Sim, limpar
              </Button>
            </div>
          </div>
        </div>
      )}

      {reciboVenda && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70" onClick={() => setReciboVenda(null)}>
          <div className="w-full max-w-md bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-emerald-600 text-white p-6 text-center">
              <div className="text-5xl mb-2">✓</div>
              <h2 className="font-bold text-xl">Venda registrada!</h2>
              <p className="text-emerald-100 text-sm">{reciboVenda.cliente} · {reciboVenda.forma}</p>
              <div className="text-3xl font-bold mt-3">{formatBRL(reciboVenda.total)}</div>
            </div>
            <div className="p-6 space-y-3">
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {reciboVenda.itens.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{i.qtd}x {i.nome}</span>
                    <span className="font-medium">{formatBRL(i.total)}</span>
                  </div>
                ))}
              </div>
              {reciboVenda.desconto > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 pt-2 border-t">
                  <span>Desconto aplicado</span>
                  <span>− {formatBRL(reciboVenda.desconto)}</span>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setReciboVenda(null)}>
                  Fechar
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={imprimirRecibo}>
                  <Receipt className="mr-2 h-4 w-4" /> Imprimir recibo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoricoVendas({ vendasDoMes, periodoLabel }: { vendasDoMes: Venda[]; periodoLabel: string }) {
  type VendaSortKey = "data" | "item" | "tipo" | "quantidade" | "cliente" | "pagamento" | "total";
  const { sort, toggle, sorted } = useSort<Venda, VendaSortKey>(
    vendasDoMes,
    (v, k) => {
      if (k === "data") return v.data;
      if (k === "item") return v.itemNome.toLowerCase();
      if (k === "tipo") return v.tipo;
      if (k === "quantidade") return v.quantidade;
      if (k === "cliente") return (v.cliente ?? "").toLowerCase();
      if (k === "pagamento") return v.formaPagamento;
      if (k === "total") return v.total;
      return "";
    },
    { key: "data", direction: "desc" }
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de {periodoLabel}</CardTitle>
        <CardDescription>{vendasDoMes.length} vendas registradas neste mês</CardDescription>
      </CardHeader>
      <CardContent className="px-0 overflow-x-auto max-h-[60vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader active={sort.key === "data"} direction={sort.direction} onClick={() => toggle("data")}>Data</SortHeader>
              <SortHeader active={sort.key === "item"} direction={sort.direction} onClick={() => toggle("item")}>Item</SortHeader>
              <SortHeader active={sort.key === "tipo"} direction={sort.direction} onClick={() => toggle("tipo")}>Categoria</SortHeader>
              <SortHeader active={sort.key === "quantidade"} direction={sort.direction} onClick={() => toggle("quantidade")} align="center">Qtd</SortHeader>
              <SortHeader active={sort.key === "cliente"} direction={sort.direction} onClick={() => toggle("cliente")}>Cliente</SortHeader>
              <SortHeader active={sort.key === "pagamento"} direction={sort.direction} onClick={() => toggle("pagamento")}>Pagamento</SortHeader>
              <SortHeader active={sort.key === "total"} direction={sort.direction} onClick={() => toggle("total")} align="right">Total</SortHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  Nenhuma venda em {periodoLabel}.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-sm whitespace-nowrap">{formatDateBR(v.data)}</TableCell>
                  <TableCell className="font-medium">{v.itemNome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{v.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{v.quantidade}</TableCell>
                  <TableCell className="text-sm">{v.cliente}</TableCell>
                  <TableCell className="text-sm">{v.formaPagamento}</TableCell>
                  <TableCell className="font-semibold text-right">{formatBRL(v.total)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NovaVendaManualModal({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { add } = useEntidade("vendas");
  const toast = useToast();
  const [itemNome, setItemNome] = React.useState("");
  const [tipo, setTipo] = React.useState<TipoVenda>("Material");
  const [quantidade, setQuantidade] = React.useState(1);
  const [precoUnitario, setPrecoUnitario] = React.useState(0);
  const [cliente, setCliente] = React.useState("");
  const [formaPagamento, setFormaPagamento] = React.useState<Venda["formaPagamento"]>("Pix");
  const [salvando, setSalvando] = React.useState(false);

  if (!aberto) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (precoUnitario <= 0 || quantidade <= 0) {
      toast.error("Valores inválidos", "Preço e quantidade têm que ser maiores que zero.");
      return;
    }
    setSalvando(true);
    try {
      const nova: Venda = {
        id: `vd-${Date.now()}`,
        data: formatDateLocalISO(),
        itemNome,
        tipo,
        quantidade,
        precoUnitario,
        total: quantidade * precoUnitario,
        cliente,
        formaPagamento,
      };
      await add(nova);
      toast.success("Venda registrada!", `${itemNome} — ${formatBRL(nova.total)}`);
      onFechar();
      setItemNome("");
      setQuantidade(1);
      setPrecoUnitario(0);
      setCliente("");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-xl bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-bold text-lg">Nova venda manual</h2>
            <p className="text-xs text-muted-foreground">Registrar venda sem usar o PDV e sem movimentar o estoque</p>
          </div>
          <button onClick={onFechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="manual-item">Item *</Label>
            <Input id="manual-item" className="mt-1.5" required value={itemNome} onChange={(e) => setItemNome(e.target.value)} placeholder="Ex: Camiseta P" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="manual-categoria">Categoria</Label>
              <select
                id="manual-categoria"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoVenda)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Uniforme</option>
                <option>Evento/Festa</option>
                <option>Alimentação Extra</option>
                <option>Atividade Extra</option>
                <option>Material</option>
              </select>
            </div>
            <div>
              <Label htmlFor="manual-qtd">Qtd *</Label>
              <Input id="manual-qtd" className="mt-1.5" type="number" min={1} required value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="manual-preco">Preço *</Label>
              <Input id="manual-preco" className="mt-1.5" type="number" min={0.01} step="0.01" required value={precoUnitario} onChange={(e) => setPrecoUnitario(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label htmlFor="manual-cliente">Cliente *</Label>
            <Input id="manual-cliente" className="mt-1.5" required value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="manual-pgto">Forma pagamento</Label>
            <select
              id="manual-pgto"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value as Venda["formaPagamento"])}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option>Pix</option>
              <option>Cartão</option>
              <option>Dinheiro</option>
              <option>Boleto</option>
            </select>
          </div>
          <div className="rounded-lg bg-primary/5 p-3 text-sm flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-primary text-lg">{formatBRL(quantidade * precoUnitario)}</span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700">
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar venda
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
