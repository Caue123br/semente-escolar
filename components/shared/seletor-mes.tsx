"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const MESES_PT_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export interface PeriodoFiltro {
  mes: number; // 0-11
  ano: number;
  inicio: string; // YYYY-MM-DD
  fim: string; // YYYY-MM-DD
  competencia: string; // YYYY-MM
  label: string; // "Junho/2026"
}

export function periodoMes(mes: number, ano: number): PeriodoFiltro {
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  const mm = String(mes + 1).padStart(2, "0");
  return {
    mes,
    ano,
    inicio: `${ano}-${mm}-01`,
    fim: `${ano}-${mm}-${String(ultimo).padStart(2, "0")}`,
    competencia: `${ano}-${mm}`,
    label: `${MESES_PT[mes]}/${ano}`,
  };
}

export function mesAnterior(p: PeriodoFiltro): PeriodoFiltro {
  return p.mes === 0 ? periodoMes(11, p.ano - 1) : periodoMes(p.mes - 1, p.ano);
}

export function usePeriodoMes(inicial?: { mes: number; ano: number }): {
  periodo: PeriodoFiltro;
  setPeriodo: (mes: number, ano: number) => void;
  proximoMes: () => void;
  mesAnteriorAcao: () => void;
  irHoje: () => void;
} {
  const hoje = new Date();
  const [mes, setMes] = React.useState(inicial?.mes ?? hoje.getMonth());
  const [ano, setAno] = React.useState(inicial?.ano ?? hoje.getFullYear());

  const periodo = React.useMemo(() => periodoMes(mes, ano), [mes, ano]);

  const proximoMes = () => {
    if (mes === 11) {
      setMes(0);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
  };

  const mesAnteriorAcao = () => {
    if (mes === 0) {
      setMes(11);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const irHoje = () => {
    setMes(hoje.getMonth());
    setAno(hoje.getFullYear());
  };

  return {
    periodo,
    setPeriodo: (m, a) => {
      setMes(m);
      setAno(a);
    },
    proximoMes,
    mesAnteriorAcao,
    irHoje,
  };
}

interface SeletorMesProps {
  periodo: PeriodoFiltro;
  onSetPeriodo: (mes: number, ano: number) => void;
  onProximoMes: () => void;
  onMesAnterior: () => void;
  onIrHoje: () => void;
  anosDisponiveis?: number[];
}

export function SeletorMes({
  periodo,
  onSetPeriodo,
  onProximoMes,
  onMesAnterior,
  onIrHoje,
  anosDisponiveis,
}: SeletorMesProps) {
  const hoje = new Date();
  const anos = anosDisponiveis ?? [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1];
  const ehHoje = periodo.mes === hoje.getMonth() && periodo.ano === hoje.getFullYear();

  const selectBase =
    "appearance-none cursor-pointer bg-transparent py-1.5 pl-2.5 pr-7 text-sm font-medium rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMesAnterior}
        aria-label="Mês anterior"
        className="h-9 w-9 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center">
        <div className="relative">
          <select
            value={periodo.mes}
            onChange={(e) => onSetPeriodo(Number(e.target.value), periodo.ano)}
            className={selectBase}
            aria-label="Mês"
          >
            {MESES_PT.map((nome, i) => (
              <option key={i} value={i}>{nome}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="relative">
          <select
            value={periodo.ano}
            onChange={(e) => onSetPeriodo(periodo.mes, Number(e.target.value))}
            className={selectBase}
            aria-label="Ano"
          >
            {anos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onProximoMes}
        aria-label="Próximo mês"
        className="h-9 w-9 text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!ehHoje && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onIrHoje}
          className="ml-1 h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Hoje
        </Button>
      )}
    </div>
  );
}

interface ComparacaoProps {
  atual: number;
  anterior: number;
  formato?: "moeda" | "numero" | "percentual";
}

export function ComparacaoMesAnterior({ atual, anterior, formato = "moeda" }: ComparacaoProps) {
  const delta = atual - anterior;
  const pct = anterior === 0 ? (atual === 0 ? 0 : 100) : (delta / anterior) * 100;
  const positivo = delta >= 0;
  const cor = positivo ? "text-emerald-600" : "text-rose-600";

  const fmt = (n: number) =>
    formato === "moeda"
      ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
      : formato === "percentual"
        ? `${n.toFixed(1)}%`
        : n.toLocaleString("pt-BR");

  if (anterior === 0 && atual === 0) {
    return <span className="text-xs text-muted-foreground">Sem dados</span>;
  }

  return (
    <span className={`text-xs font-medium ${cor}`}>
      {positivo ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% vs mês anterior ({fmt(anterior)})
    </span>
  );
}
