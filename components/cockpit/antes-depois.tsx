"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEntidade } from "@/lib/data/store";
import { formatBRL, formatDateLocalISO } from "@/lib/utils";
import { MESES_PT_ABREV } from "@/components/shared/seletor-mes";

export function AntesDepois() {
  const {
    items: mensalidades,
    carregando: carregandoMensalidades,
    erro: erroMensalidades,
    reset: recarregarMensalidades,
  } = useEntidade("mensalidades");
  const {
    items: vendas,
    carregando: carregandoVendas,
    erro: erroVendas,
    reset: recarregarVendas,
  } = useEntidade("vendas");
  const {
    items: despesas,
    carregando: carregandoDespesas,
    erro: erroDespesas,
    reset: recarregarDespesas,
  } = useEntidade("despesas");

  const dados = React.useMemo(() => {
    const hoje = new Date();
    const compAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const mesAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const compAnt = `${mesAnt.getFullYear()}-${String(mesAnt.getMonth() + 1).padStart(2, "0")}`;

    const inicioMesAt = `${compAtual}-01`;
    const fimMesAt = formatDateLocalISO(
      new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    );
    const inicioMesAnt = `${compAnt}-01`;
    const fimMesAnt = formatDateLocalISO(
      new Date(mesAnt.getFullYear(), mesAnt.getMonth() + 1, 0)
    );

    const recebidoAt = mensalidades
      .filter((m) => m.competencia === compAtual && m.status === "Paga")
      .reduce((a, m) => a + (m.valorPago ?? m.valor), 0)
      + vendas.filter((v) => v.data >= inicioMesAt && v.data <= fimMesAt).reduce((a, v) => a + v.total, 0);

    const recebidoAnt = mensalidades
      .filter((m) => m.competencia === compAnt && m.status === "Paga")
      .reduce((a, m) => a + (m.valorPago ?? m.valor), 0)
      + vendas.filter((v) => v.data >= inicioMesAnt && v.data <= fimMesAnt).reduce((a, v) => a + v.total, 0);

    const inadimplenciaAt = mensalidades
      .filter((m) => m.competencia === compAtual && m.status === "Atrasada")
      .reduce((a, m) => a + m.valor, 0);
    const inadimplenciaAnt = mensalidades
      .filter((m) => m.competencia === compAnt && m.status === "Atrasada")
      .reduce((a, m) => a + m.valor, 0);

    const despesasAt = despesas.filter((d) => d.data >= inicioMesAt && d.data <= fimMesAt).reduce((a, d) => a + d.valor, 0);
    const despesasAnt = despesas.filter((d) => d.data >= inicioMesAnt && d.data <= fimMesAnt).reduce((a, d) => a + d.valor, 0);

    return {
      compAtual,
      compAnt,
      labelAt: `${MESES_PT_ABREV[hoje.getMonth()]}/${String(hoje.getFullYear()).slice(-2)}`,
      labelAnt: `${MESES_PT_ABREV[mesAnt.getMonth()]}/${String(mesAnt.getFullYear()).slice(-2)}`,
      recebidoAt,
      recebidoAnt,
      inadimplenciaAt,
      inadimplenciaAnt,
      despesasAt,
      despesasAnt,
    };
  }, [mensalidades, vendas, despesas]);

  const calcDelta = (atual: number, anterior: number) => {
    if (anterior === 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / anterior) * 100;
  };

  const metricas = [
    {
      label: "Receita do mês",
      anterior: dados.recebidoAnt,
      atual: dados.recebidoAt,
      delta: calcDelta(dados.recebidoAt, dados.recebidoAnt),
      melhorEhMaior: true,
      formato: "moeda" as const,
    },
    {
      label: "Inadimplência",
      anterior: dados.inadimplenciaAnt,
      atual: dados.inadimplenciaAt,
      delta: calcDelta(dados.inadimplenciaAt, dados.inadimplenciaAnt),
      melhorEhMaior: false,
      formato: "moeda" as const,
    },
    {
      label: "Despesas",
      anterior: dados.despesasAnt,
      atual: dados.despesasAt,
      delta: calcDelta(dados.despesasAt, dados.despesasAnt),
      melhorEhMaior: false,
      formato: "moeda" as const,
    },
  ];

  if (carregandoMensalidades || carregandoVendas || carregandoDespesas) {
    return (
      <Card className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando comparativo financeiro...
      </Card>
    );
  }

  if (erroMensalidades || erroVendas || erroDespesas) {
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-warning" />
        <span>O comparativo financeiro está temporariamente indisponível.</span>
        <button
          type="button"
          onClick={() => {
            recarregarMensalidades();
            recarregarVendas();
            recarregarDespesas();
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
        </button>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Comparativo mensal
          </div>
          <h3 className="font-bold text-lg mt-0.5">{dados.labelAnt} vs {dados.labelAt}</h3>
        </div>
        <span className="text-xs text-muted-foreground">Dados financeiros autorizados</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {metricas.map((m) => {
          const melhorou = m.melhorEhMaior ? m.delta >= 0 : m.delta <= 0;
          const Icon = m.delta === 0 ? Minus : m.delta > 0 ? TrendingUp : TrendingDown;
          const cor = melhorou ? "text-emerald-600" : "text-rose-600";
          return (
            <div key={m.label} className="rounded-lg border bg-card p-3">
              <div className="text-[10px] uppercase text-muted-foreground mb-1.5 font-medium">
                {m.label}
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground line-through">
                    {formatBRL(m.anterior)}
                  </div>
                  <div className="text-xl font-bold text-foreground">{formatBRL(m.atual)}</div>
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${cor}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {m.delta > 0 ? "+" : ""}
                  {m.delta.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground">
        Comparação automática: mês anterior vs mês atual · cálculo em tempo real
      </p>
    </Card>
  );
}
