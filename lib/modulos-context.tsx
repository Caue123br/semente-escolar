"use client";

import * as React from "react";

interface Modulo {
  id: string;
  nome: string;
  ativo: boolean;
  grupo: string | null;
  ordem: number;
}

interface ModulosContextValue {
  modulos: Modulo[];
  ativos: Set<string>;
  carregando: boolean;
  recarregar: () => Promise<void>;
  isAtivo: (id: string) => boolean;
}

const ModulosContext = React.createContext<ModulosContextValue | null>(null);

export function ModulosProvider({ children }: { children: React.ReactNode }) {
  const [modulos, setModulos] = React.useState<Modulo[]>([]);
  const [carregando, setCarregando] = React.useState(true);

  const carregar = React.useCallback(async () => {
    try {
      const r = await fetch("/api/admin/modulos", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      setModulos(data.items ?? []);
    } catch {
      // silencioso — fallback é mostrar tudo
    } finally {
      setCarregando(false);
    }
  }, []);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const ativos = React.useMemo(
    () => new Set(modulos.filter((m) => m.ativo).map((m) => m.id)),
    [modulos]
  );

  // Se ainda carregando OU sem modulos retornados, considera todos ativos (fail-open pra UX)
  const isAtivo = React.useCallback(
    (id: string) => {
      if (carregando || modulos.length === 0) return true;
      return ativos.has(id);
    },
    [ativos, carregando, modulos.length]
  );

  return (
    <ModulosContext.Provider value={{ modulos, ativos, carregando, recarregar: carregar, isAtivo }}>
      {children}
    </ModulosContext.Provider>
  );
}

export function useModulos() {
  const ctx = React.useContext(ModulosContext);
  if (!ctx) throw new Error("useModulos deve ser usado dentro de ModulosProvider");
  return ctx;
}
