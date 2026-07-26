"use client";

import * as React from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Check, X } from "lucide-react";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { usePeriodoContexto } from "@/lib/contexto-periodo";
import { formatBRL, formatDateBR, formatDateLocalISO } from "@/lib/utils";
import type { Despesa } from "@/lib/mock-data/despesas";

const CATEGORIAS_DESPESA: Despesa["categoria"][] = [
  "Folha",
  "Alimentação",
  "Material Pedagógico",
  "Limpeza",
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Marketing",
  "Impostos",
  "Manutenção",
  "Outros",
];

export function DespesasTab() {
  const { items: todasDespesas, add, update } = useEntidade("despesas");
  const { periodo } = usePeriodoContexto();
  const toast = useToast();
  const [modalAberto, setModalAberto] = React.useState(false);

  const despesasDoMes = todasDespesas.filter((d) => d.data >= periodo.inicio && d.data <= periodo.fim);
  const total = despesasDoMes.reduce((a, d) => a + d.valor, 0);
  const pagas = despesasDoMes.filter((d) => d.status === "Paga").reduce((a, d) => a + d.valor, 0);
  const aPagar = despesasDoMes.filter((d) => d.status !== "Paga").reduce((a, d) => a + d.valor, 0);

  const kpis = [
    { label: `Total ${periodo.label}`, valor: total, cor: "text-foreground" },
    { label: "Pagas", valor: pagas, cor: "text-success" },
    { label: "A pagar", valor: aPagar, cor: "text-warning" },
  ];

  const marcarPaga = async (d: Despesa) => {
    await update(d.id, { status: "Paga" });
    toast.success("Despesa paga", `${d.descricao} marcada como paga.`);
  };

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
              <CardTitle>Despesas — {periodo.label}</CardTitle>
              <CardDescription>{despesasDoMes.length} lançamentos neste mês</CardDescription>
            </div>
            <Button size="sm" onClick={() => setModalAberto(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova despesa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 overflow-x-auto">
          {despesasDoMes.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Sem despesas em {periodo.label}.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesasDoMes.map((d) => (
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
                    <TableCell className="text-right">
                      {d.status !== "Paga" && (
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => marcarPaga(d)}>
                          Marcar paga
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NovaDespesaModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onCriada={async (d) => {
          await add(d);
          toast.success("Despesa cadastrada", d.descricao);
          setModalAberto(false);
        }}
      />
    </div>
  );
}

function NovaDespesaModal({
  aberto,
  onFechar,
  onCriada,
}: {
  aberto: boolean;
  onFechar: () => void;
  onCriada: (d: Despesa) => Promise<void>;
}) {
  const [data, setData] = React.useState(() => formatDateLocalISO());
  const [descricao, setDescricao] = React.useState("");
  const [categoria, setCategoria] = React.useState<Despesa["categoria"]>("Outros");
  const [valor, setValor] = React.useState(0);
  const [fornecedor, setFornecedor] = React.useState("");
  const [formaPagamento, setFormaPagamento] = React.useState<Despesa["formaPagamento"]>("Pix");
  const [status, setStatus] = React.useState<Despesa["status"]>("A Pagar");
  const [salvando, setSalvando] = React.useState(false);

  if (!aberto) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await onCriada({
        id: `d-${Date.now()}`,
        data,
        descricao,
        categoria,
        valor,
        status,
        fornecedor,
        formaPagamento,
      });
      setDescricao("");
      setValor(0);
      setFornecedor("");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-lg bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-bold text-lg">Nova despesa</h2>
            <p className="text-xs text-muted-foreground">Registrar conta a pagar ou paga</p>
          </div>
          <button onClick={onFechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label>Descrição *</Label>
            <Input className="mt-1.5" required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Compra de material limpeza" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data</Label>
              <Input className="mt-1.5" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <Label>Categoria *</Label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Despesa["categoria"])}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORIAS_DESPESA.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Valor *</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={0}
                step="0.01"
                required
                value={valor || ""}
                onChange={(e) => setValor(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Input className="mt-1.5" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Mercado Bom Preço" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Despesa["status"])}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>A Pagar</option>
                <option>Paga</option>
                <option>Atrasada</option>
              </select>
            </div>
            <div>
              <Label>Forma pagamento</Label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as Despesa["formaPagamento"])}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Pix</option>
                <option>Boleto</option>
                <option>Cartão</option>
                <option>Dinheiro</option>
                <option>Débito</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700">
              {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Cadastrar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
