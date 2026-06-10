"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Crown,
  ClipboardList,
  GraduationCap,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePerfil } from "@/lib/perfil-context";
import { useTema, type Tema } from "@/lib/theme-context";
import { initials, cn } from "@/lib/utils";
import type { Perfil } from "@/lib/types";

const PERFIS: { id: Perfil; nome: string; cargo: string; icone: React.ComponentType<{ className?: string }>; cor: string }[] = [
  { id: "diretor", nome: "Renata Andrade", cargo: "Diretora / Dona", icone: Crown, cor: "text-amber-600" },
  { id: "coordenador", nome: "Cláudio Vasconcelos", cargo: "Coordenador Pedagógico", icone: ClipboardList, cor: "text-blue-600" },
  { id: "professor", nome: "Mariana Costa", cargo: "Professora — Jardim II / 1º Ano", icone: GraduationCap, cor: "text-emerald-600" },
];

const TEMAS: { id: Tema; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
  { id: "system", label: "Sistema", icon: Monitor },
];

export function UserMenu() {
  const router = useRouter();
  const { perfil, setPerfil } = usePerfil();
  const { tema, setTema } = useTema();
  const [aberto, setAberto] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClickFora = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  const atual = PERFIS.find((p) => p.id === perfil)!;
  const Icon = atual.icone;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-3 rounded-lg border border-input bg-card px-3 py-1.5 transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
            {initials(atual.nome)}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-left sm:block">
          <div className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
            <Icon className={`h-3.5 w-3.5 ${atual.cor}`} />
            {atual.nome.split(" ")[0]}
          </div>
          <div className="text-xs text-muted-foreground leading-tight truncate max-w-[180px]">
            {atual.cargo}
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-popover border shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header — usuário atual */}
          <div className="p-4 border-b bg-gradient-to-br from-emerald-50 to-transparent">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-emerald-600 text-white font-semibold">
                  {initials(atual.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{atual.nome}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Icon className={`h-3 w-3 ${atual.cor}`} />
                  {atual.cargo}
                </div>
              </div>
            </div>
          </div>

          {/* Trocar perfil (demo) */}
          <div className="p-2 border-b">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-emerald-600" />
              Simular perfil
            </div>
            <div className="space-y-0.5 mt-1">
              {PERFIS.map((p) => {
                const Ic = p.icone;
                const ativo = p.id === perfil;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPerfil(p.id)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      ativo ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    <Ic className={cn("h-3.5 w-3.5", p.cor)} />
                    <span className="flex-1 text-left truncate">{p.nome}</span>
                    {ativo && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ações */}
          <div className="p-2 border-b space-y-0.5">
            <MenuItem icon={User} label="Meu perfil" href="/configuracoes" onClick={() => setAberto(false)} />
            <MenuItem icon={Settings} label="Configurações" href="/configuracoes" onClick={() => setAberto(false)} />
            <MenuItem icon={HelpCircle} label="Central de ajuda" onClick={() => setAberto(false)} />
          </div>

          {/* Tema */}
          <div className="p-2 border-b">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Tema
            </div>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {TEMAS.map((t) => {
                const Ic = t.icon;
                const ativo = tema === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTema(t.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md py-2 px-2 text-xs transition-colors",
                      ativo
                        ? "bg-emerald-600 text-white"
                        : "hover:bg-accent text-muted-foreground"
                    )}
                  >
                    <Ic className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logout */}
          <div className="p-2">
            <button
              onClick={() => router.push("/login")}
              className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const conteudo = (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors cursor-pointer">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </div>
  );
  if (href) {
    return (
      <Link href={href} onClick={onClick}>
        {conteudo}
      </Link>
    );
  }
  return <button onClick={onClick} className="w-full text-left">{conteudo}</button>;
}
