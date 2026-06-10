"use client";

import * as React from "react";
import type { Perfil } from "@/lib/types";

interface PerfilContextValue {
  perfil: Perfil;
  setPerfil: (p: Perfil) => void;
  nome: string;
}

const PERFIL_INFO: Record<Perfil, { nome: string }> = {
  diretor: { nome: "Renata Andrade" },
  coordenador: { nome: "Cláudio Vasconcelos" },
  professor: { nome: "Mariana Costa" },
};

const PerfilContext = React.createContext<PerfilContextValue | undefined>(undefined);

export function PerfilProvider({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = React.useState<Perfil>("diretor");
  return (
    <PerfilContext.Provider
      value={{ perfil, setPerfil, nome: PERFIL_INFO[perfil].nome }}
    >
      {children}
    </PerfilContext.Provider>
  );
}

export function usePerfil() {
  const ctx = React.useContext(PerfilContext);
  if (!ctx) throw new Error("usePerfil deve ser usado dentro de PerfilProvider");
  return ctx;
}

export function podeVer(perfil: Perfil, modulo: string): boolean {
  if (perfil === "diretor") return true;
  if (perfil === "coordenador") {
    // Coordenador vê tudo menos talvez nota fiscal/vendas?
    // Spec diz: pedagógico + administrativo (acesso amplo, exceto talvez decisões financeiras finais)
    return modulo !== "nota-fiscal";
  }
  // Professor: só pedagógico, kanban (das suas turmas), whatsapp (das suas turmas), alunos (das suas turmas)
  return ["cockpit-professor", "pedagogico", "kanban", "whatsapp", "alunos"].includes(modulo);
}
