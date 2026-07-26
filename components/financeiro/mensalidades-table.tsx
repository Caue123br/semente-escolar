"use client";

import * as React from "react";
import { Search, Filter, Download, Check, X, Handshake, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { formatBRL, formatDateBR, formatDateLocalISO, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptySearchState } from "@/components/shared/empty-state";
import { usePeriodoContexto } from "@/lib/contexto-periodo";
import { SortHeader } from "@/components/ui/sort-header";
import { useSort } from "@/lib/use-sort";
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

function mesmoValorEmCentavos(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.round(a * 100) === Math.round(b * 100);
}

export function MensalidadesTable() {
  const { items: todasMensalidades, update } = useEntidade("mensalidades");
  const { periodo } = usePeriodoContexto();
  const toast = useToast();
  const [busca, setBusca] = React.useState("");
  const [filtroStatus, setFiltroStatus] = React.useState<string>("todos");
  const [pagarModal, setPagarModal] = React.useState<{ id: string; valor: number; nome: string } | null>(null);
  const [renegociarModal, setRenegociarModal] = React.useState<{ id: string; valor: number; nome: string; vencimento: string } | null>(null);

  // Filtra pela competência do período selecionado
  const mensalidadesDoMes = todasMensalidades.filter((m) => m.competencia === periodo.competencia);

  const filtradas = mensalidadesDoMes.filter((m) => {
    const matchBusca = busca
      ? m.alunoNome.toLowerCase().includes(busca.toLowerCase()) ||
        m.turmaNome.toLowerCase().includes(busca.toLowerCase())
      : true;
    const matchStatus = filtroStatus === "todos" || m.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  type MensSortKey = "aluno" | "turma" | "vencimento" | "valor" | "status";
  const { sort, toggle, sorted } = useSort<typeof filtradas[number], MensSortKey>(
    filtradas,
    (m, k) => {
      if (k === "aluno") return m.alunoNome.toLowerCase();
      if (k === "turma") return m.turmaNome;
      if (k === "vencimento") return m.vencimento;
      if (k === "valor") return m.valor;
      if (k === "status") return m.status;
      return "";
    },
    { key: "vencimento", direction: "asc" }
  );

  const confirmarMarcarPaga = async (forma: "Pix" | "Cartão" | "Dinheiro" | "Boleto", valorPago: number) => {
    if (!pagarModal) return;
    const { id, nome, valor } = pagarModal;
    if (!mesmoValorEmCentavos(valorPago, valor)) {
      toast.error(
        "Valor diferente da mensalidade",
        `Informe exatamente ${formatBRL(valor)}. O sistema ainda não controla pagamentos parciais, juros ou troco.`
      );
      return;
    }
    const hoje = formatDateLocalISO();
    await update(id, {
      status: "Paga",
      valorPago: valor,
      dataPagamento: hoje,
      formaPagamento: forma,
      diasAtraso: 0,
    });
    toast.success("Pagamento registrado!", `${nome} — ${formatBRL(valorPago)} via ${forma}`);
    setPagarModal(null);
  };

  const confirmarRenegociar = async (novoValor: number, novoVencimento: string) => {
    if (!renegociarModal) return;
    const { id, nome } = renegociarModal;
    await update(id, {
      status: "Renegociada",
      valor: novoValor,
      vencimento: novoVencimento,
      diasAtraso: 0,
    });
    toast.success("Renegociação aplicada!", `${nome}: ${formatBRL(novoValor)} para ${formatDateBR(novoVencimento)}.`);
    setRenegociarModal(null);
  };

  const exportarCSV = () => {
    if (filtradas.length === 0) return;
    const linhas = [
      ["Aluno", "Turma", "Competência", "Vencimento", "Valor", "Valor pago", "Data do pagamento", "Forma", "Status", "Dias em atraso"],
      ...filtradas.map((m) => [
        m.alunoNome,
        m.turmaNome,
        m.competencia,
        m.vencimento,
        m.valor,
        m.valorPago ?? "",
        m.dataPagamento ?? "",
        m.formaPagamento ?? "",
        m.status,
        m.diasAtraso,
      ]),
    ];
    const csv = linhas
      .map((linha) => linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `mensalidades-${periodo.competencia}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório gerado", `${filtradas.length} mensalidade(s) exportada(s).`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Mensalidades — {periodo.label}</CardTitle>
            <CardDescription>
              {filtradas.length} de {mensalidadesDoMes.length} mensalidades neste mês
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
            <Button variant="outline" size="sm" onClick={exportarCSV} disabled={filtradas.length === 0}>
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
              <SortHeader active={sort.key === "aluno"} direction={sort.direction} onClick={() => toggle("aluno")}>Aluno</SortHeader>
              <SortHeader active={sort.key === "turma"} direction={sort.direction} onClick={() => toggle("turma")}>Turma</SortHeader>
              <SortHeader active={sort.key === "vencimento"} direction={sort.direction} onClick={() => toggle("vencimento")}>Vencimento</SortHeader>
              <SortHeader active={sort.key === "valor"} direction={sort.direction} onClick={() => toggle("valor")}>Valor</SortHeader>
              <TableHead>Pagamento</TableHead>
              <SortHeader active={sort.key === "status"} direction={sort.direction} onClick={() => toggle("status")}>Status</SortHeader>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((m) => (
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
                <TableCell className="text-right">
                  {m.status !== "Paga" && (
                    <div className="inline-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPagarModal({ id: m.id, valor: m.valor, nome: m.alunoNome })}
                        className="text-xs h-7"
                      >
                        <Check className="mr-1 h-3 w-3" /> Pagar
                      </Button>
                      {(m.status === "Atrasada" || m.status === "Vence Hoje") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRenegociarModal({ id: m.id, valor: m.valor, nome: m.alunoNome, vencimento: m.vencimento })}
                          className="text-xs h-7"
                        >
                          <Handshake className="mr-1 h-3 w-3" /> Renegociar
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </CardContent>

      {pagarModal && (
        <RegistrarPagamentoModal
          info={pagarModal}
          onFechar={() => setPagarModal(null)}
          onConfirmar={confirmarMarcarPaga}
        />
      )}
      {renegociarModal && (
        <RenegociarModal
          info={renegociarModal}
          onFechar={() => setRenegociarModal(null)}
          onConfirmar={confirmarRenegociar}
        />
      )}
    </Card>
  );
}

function RegistrarPagamentoModal({
  info,
  onFechar,
  onConfirmar,
}: {
  info: { id: string; valor: number; nome: string };
  onFechar: () => void;
  onConfirmar: (forma: "Pix" | "Cartão" | "Dinheiro" | "Boleto", valorPago: number) => Promise<void>;
}) {
  const [forma, setForma] = React.useState<"Pix" | "Cartão" | "Dinheiro" | "Boleto">("Pix");
  const [valorPago, setValorPago] = React.useState(info.valor);
  const [salvando, setSalvando] = React.useState(false);
  const valorExato = mesmoValorEmCentavos(valorPago, info.valor);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await onConfirmar(forma, valorPago);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-md bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg">Registrar pagamento</h2>
            <p className="text-xs text-muted-foreground">{info.nome}</p>
          </div>
          <button onClick={onFechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <Label className="text-xs">Forma de pagamento</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {(["Pix", "Cartão", "Dinheiro", "Boleto"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForma(f)}
                  className={`rounded-md border p-2 text-xs font-medium transition-colors ${
                    forma === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="valor-pago" className="text-xs">Valor recebido (R$)</Label>
            <Input
              id="valor-pago"
              type="number"
              step="0.01"
              min={0.01}
              className="mt-1.5"
              value={valorPago}
              onChange={(e) => setValorPago(Number(e.target.value))}
            />
            {!valorExato && (
              <div className="mt-1 text-xs text-danger">
                Informe exatamente {formatBRL(info.valor)}. Pagamentos parciais, juros e troco ainda não são controlados por este cadastro.
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={salvando || !valorExato} className="bg-emerald-600 hover:bg-emerald-700">
              {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
              Confirmar pagamento
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RenegociarModal({
  info,
  onFechar,
  onConfirmar,
}: {
  info: { id: string; valor: number; nome: string; vencimento: string };
  onFechar: () => void;
  onConfirmar: (novoValor: number, novoVencimento: string) => Promise<void>;
}) {
  const [desconto, setDesconto] = React.useState(0);
  const [novoVencimento, setNovoVencimento] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return formatDateLocalISO(d);
  });
  const [salvando, setSalvando] = React.useState(false);

  const novoValor = Math.round(info.valor * (1 - desconto / 100) * 100) / 100;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await onConfirmar(novoValor, novoVencimento);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !salvando && onFechar()}>
      <div className="w-full max-w-md bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg">Renegociar mensalidade</h2>
            <p className="text-xs text-muted-foreground">{info.nome} · {formatBRL(info.valor)}</p>
          </div>
          <button type="button" onClick={onFechar} disabled={salvando} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <Label htmlFor="desconto" className="text-xs">Desconto (%)</Label>
            <Input
              id="desconto"
              type="number"
              min={0}
              max={50}
              disabled={salvando}
              className="mt-1.5"
              value={desconto}
              onChange={(e) => setDesconto(Number(e.target.value))}
            />
            <div className="flex gap-1 mt-1.5">
              {[0, 5, 10, 15, 20].map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={salvando}
                  onClick={() => setDesconto(p)}
                  className="px-2 py-0.5 text-[10px] rounded border hover:bg-accent"
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="novo-venc" className="text-xs">Nova data de vencimento</Label>
            <Input id="novo-venc" type="date" required disabled={salvando} className="mt-1.5" value={novoVencimento} onChange={(e) => setNovoVencimento(e.target.value)} />
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-sm border border-emerald-200">
            <div className="flex justify-between">
              <span className="text-emerald-900">Novo valor</span>
              <span className="font-bold text-emerald-900">{formatBRL(novoValor)}</span>
            </div>
            {desconto > 0 && (
              <div className="text-xs text-emerald-700 mt-1">
                Desconto aplicado: {formatBRL(info.valor - novoValor)} ({desconto}%)
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
            <Button type="submit" disabled={salvando || !novoVencimento || novoValor <= 0} className="bg-emerald-600 hover:bg-emerald-700">
              {salvando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Handshake className="mr-1 h-4 w-4" />}
              Confirmar renegociação
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
