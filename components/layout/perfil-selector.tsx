"use client";

import * as React from "react";
import { Crown, ClipboardList, GraduationCap, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePerfil } from "@/lib/perfil-context";
import { initials } from "@/lib/utils";
import type { Perfil } from "@/lib/types";

const PERFIS: { id: Perfil; nome: string; cargo: string; icone: React.ComponentType<{ className?: string }>; cor: string }[] = [
  {
    id: "diretor",
    nome: "Renata Andrade",
    cargo: "Diretora / Dona",
    icone: Crown,
    cor: "text-amber-600",
  },
  {
    id: "coordenador",
    nome: "Cláudio Vasconcelos",
    cargo: "Coordenador Pedagógico",
    icone: ClipboardList,
    cor: "text-blue-600",
  },
  {
    id: "professor",
    nome: "Mariana Costa",
    cargo: "Professora — Jardim II / 1º Ano",
    icone: GraduationCap,
    cor: "text-emerald-600",
  },
];

export function PerfilSelector() {
  const { perfil, setPerfil } = usePerfil();
  const atual = PERFIS.find((p) => p.id === perfil)!;
  const Icon = atual.icone;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg border border-input bg-card px-3 py-1.5 transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
            {initials(atual.nome)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-left sm:block">
          <div className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
            <Icon className={`h-3.5 w-3.5 ${atual.cor}`} />
            {atual.nome}
          </div>
          <div className="text-xs text-muted-foreground leading-tight">{atual.cargo}</div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Simular perfil de acesso
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PERFIS.map((p) => {
          const Ic = p.icone;
          const ativo = p.id === perfil;
          return (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => setPerfil(p.id)}
              className={ativo ? "bg-accent" : ""}
            >
              <div className="flex w-full items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                    {initials(p.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Ic className={`h-3.5 w-3.5 ${p.cor}`} />
                    {p.nome}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.cargo}</div>
                </div>
                {ativo && (
                  <div className="h-2 w-2 rounded-full bg-success" aria-label="Perfil ativo" />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
