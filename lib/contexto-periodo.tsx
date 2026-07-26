"use client";

import * as React from "react";
import { type PeriodoFiltro, periodoMes, mesAnterior } from "@/components/shared/seletor-mes";

interface PeriodoContextValue {
  periodo: PeriodoFiltro;
  periodoAnterior: PeriodoFiltro;
}

const PeriodoContext = React.createContext<PeriodoContextValue | null>(null);

export function PeriodoProvider({
  periodo,
  children,
}: {
  periodo: PeriodoFiltro;
  children: React.ReactNode;
}) {
  const value = React.useMemo(
    () => ({ periodo, periodoAnterior: mesAnterior(periodo) }),
    [periodo]
  );
  return <PeriodoContext.Provider value={value}>{children}</PeriodoContext.Provider>;
}

export function usePeriodoContexto(): PeriodoContextValue {
  const ctx = React.useContext(PeriodoContext);
  if (!ctx) {
    // Fallback pro mês atual se usado fora do provider
    const hoje = new Date();
    const p = periodoMes(hoje.getMonth(), hoje.getFullYear());
    return { periodo: p, periodoAnterior: mesAnterior(p) };
  }
  return ctx;
}
