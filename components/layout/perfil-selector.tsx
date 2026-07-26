"use client";

import { Crown, ClipboardList, GraduationCap, Landmark } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePerfil } from "@/lib/perfil-context";
import type { Perfil } from "@/lib/types";
import { initials } from "@/lib/utils";

const PERFIL_META: Record<
  Perfil,
  { cargo: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  diretor: { cargo: "Direção", icon: Crown, color: "text-amber-600" },
  coordenador: { cargo: "Coordenação", icon: ClipboardList, color: "text-blue-600" },
  professor: { cargo: "Professor(a)", icon: GraduationCap, color: "text-emerald-600" },
  financeiro: { cargo: "Financeiro", icon: Landmark, color: "text-violet-600" },
};

export function PerfilSelector() {
  const { perfil, nome } = usePerfil();
  const current = PERFIL_META[perfil];
  const Icon = current.icon;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-input bg-card px-3 py-1.5">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
          {initials(nome)}
        </AvatarFallback>
      </Avatar>
      <div className="hidden text-left sm:block">
        <div className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
          <Icon className={`h-3.5 w-3.5 ${current.color}`} />
          {nome}
        </div>
        <div className="text-xs text-muted-foreground leading-tight">{current.cargo}</div>
      </div>
    </div>
  );
}
