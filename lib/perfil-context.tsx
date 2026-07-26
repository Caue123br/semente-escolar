"use client";

import * as React from "react";
import type { Perfil } from "@/lib/types";
import { podeAcessarModulo } from "@/lib/access-control";

interface PerfilContextValue {
  perfil: Perfil;
  nome: string;
  carregando: boolean;
}

const PerfilContext = React.createContext<PerfilContextValue | undefined>(undefined);

function isPerfil(value: unknown): value is Perfil {
  return ["diretor", "coordenador", "professor", "financeiro"].includes(String(value));
}

export function PerfilProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PerfilContextValue>({
    perfil: "professor",
    nome: "Usuário",
    carregando: true,
  });

  React.useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Sessão indisponível");
        return response.json();
      })
      .then(({ usuario }) => {
        if (!active) return;
        if (!usuario || !isPerfil(usuario.perfil)) {
          setState({ perfil: "professor", nome: "Usuário", carregando: false });
          return;
        }
        setState({ perfil: usuario.perfil, nome: String(usuario.nome), carregando: false });
      })
      .catch(() => {
        if (active) setState((current) => ({ ...current, carregando: false }));
      });
    return () => {
      active = false;
    };
  }, []);

  return <PerfilContext.Provider value={state}>{children}</PerfilContext.Provider>;
}

export function usePerfil() {
  const context = React.useContext(PerfilContext);
  if (!context) throw new Error("usePerfil deve ser usado dentro de PerfilProvider");
  return context;
}

export function podeVer(perfil: Perfil, modulo: string): boolean {
  return podeAcessarModulo(perfil, modulo);
}
