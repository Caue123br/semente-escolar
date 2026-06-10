"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Banknote,
  GraduationCap,
  Users,
  MessageSquare,
  Trello,
  Package,
  ShoppingCart,
  FileText,
  Sparkles,
  Briefcase,
  Calendar,
  UtensilsCrossed,
  Bus,
  BookOpen,
  Baby,
  Target,
  Megaphone,
  BarChart3,
  Settings,
  Building2,
  CalendarCheck,
  Activity,
  Heart,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePerfil } from "@/lib/perfil-context";
import { escola } from "@/lib/mock-data/escola";
import type { Perfil } from "@/lib/types";

interface ItemNav {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  perfisVisivel: Perfil[];
  badge?: string;
}

interface GrupoNav {
  titulo: string;
  itens: ItemNav[];
}

const GRUPOS: GrupoNav[] = [
  {
    titulo: "Principal",
    itens: [
      { label: "Cockpit", href: "/cockpit", icon: LayoutDashboard, perfisVisivel: ["diretor", "coordenador", "professor"] },
    ],
  },
  {
    titulo: "Financeiro",
    itens: [
      { label: "Financeiro", href: "/financeiro", icon: Banknote, perfisVisivel: ["diretor", "coordenador"], badge: "3" },
      { label: "Vendas", href: "/vendas", icon: ShoppingCart, perfisVisivel: ["diretor", "coordenador"] },
      { label: "Nota Fiscal", href: "/nota-fiscal", icon: FileText, perfisVisivel: ["diretor"] },
    ],
  },
  {
    titulo: "Pedagógico",
    itens: [
      { label: "Pedagógico", href: "/pedagogico", icon: GraduationCap, perfisVisivel: ["diretor", "coordenador", "professor"] },
      { label: "Alunos", href: "/alunos", icon: Users, perfisVisivel: ["diretor", "coordenador", "professor"] },
      { label: "Kanban", href: "/kanban", icon: Trello, perfisVisivel: ["diretor", "coordenador", "professor"] },
      { label: "Biblioteca", href: "/biblioteca", icon: BookOpen, perfisVisivel: ["diretor", "coordenador", "professor"] },
      { label: "Berçário", href: "/bercario", icon: Baby, perfisVisivel: ["diretor", "coordenador", "professor"] },
    ],
  },
  {
    titulo: "Operacional",
    itens: [
      { label: "Calendário", href: "/calendario", icon: Calendar, perfisVisivel: ["diretor", "coordenador", "professor"] },
      { label: "Cardápio", href: "/cardapio", icon: UtensilsCrossed, perfisVisivel: ["diretor", "coordenador", "professor"] },
      { label: "Transporte", href: "/transporte", icon: Bus, perfisVisivel: ["diretor", "coordenador"] },
      { label: "Estoque", href: "/estoque", icon: Package, perfisVisivel: ["diretor", "coordenador"] },
      { label: "Reservas", href: "/reservas", icon: CalendarCheck, perfisVisivel: ["diretor", "coordenador", "professor"] },
      { label: "Patrimônio", href: "/patrimonio", icon: Building2, perfisVisivel: ["diretor", "coordenador"] },
    ],
  },
  {
    titulo: "Comunicação",
    itens: [
      { label: "WhatsApp", href: "/whatsapp", icon: MessageSquare, perfisVisivel: ["diretor", "coordenador", "professor"] },
      { label: "Mural", href: "/mural", icon: Megaphone, perfisVisivel: ["diretor", "coordenador", "professor"] },
      { label: "Portal dos Pais", href: "/portal-pais", icon: Heart, perfisVisivel: ["diretor", "coordenador"] },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { label: "RH & Equipe", href: "/rh", icon: Briefcase, perfisVisivel: ["diretor", "coordenador"] },
      { label: "Captação (CRM)", href: "/crm", icon: Target, perfisVisivel: ["diretor", "coordenador"] },
      { label: "Relatórios", href: "/relatorios", icon: BarChart3, perfisVisivel: ["diretor", "coordenador"] },
      { label: "Frequência", href: "/frequencia", icon: Activity, perfisVisivel: ["diretor", "coordenador", "professor"] },
    ],
  },
  {
    titulo: "Sistema",
    itens: [
      { label: "Configurações", href: "/configuracoes", icon: Settings, perfisVisivel: ["diretor"] },
      { label: "LGPD & Auditoria", href: "/lgpd", icon: Shield, perfisVisivel: ["diretor"] },
    ],
  },
];

interface SidebarContentProps {
  onLinkClick?: () => void;
}

function SidebarContent({ onLinkClick }: SidebarContentProps) {
  const pathname = usePathname();
  const { perfil } = usePerfil();

  return (
    <>
      <div className="flex h-16 items-center gap-3 border-b px-6 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
          {escola.logoTexto}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">{escola.nome}</span>
          <span className="text-xs text-muted-foreground">Sistema de Gestão</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {GRUPOS.map((grupo) => {
          const visiveis = grupo.itens.filter((i) => i.perfisVisivel.includes(perfil));
          if (visiveis.length === 0) return null;
          return (
            <div key={grupo.titulo}>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {grupo.titulo}
              </div>
              <div className="space-y-0.5">
                {visiveis.map((item) => {
                  const Icon = item.icon;
                  const ativo =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onLinkClick}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        ativo
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                            ativo
                              ? "bg-primary-foreground text-primary"
                              : "bg-danger text-danger-foreground"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t p-3 shrink-0 space-y-2">
        <button
          onClick={() => {
            const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
            window.dispatchEvent(ev);
            onLinkClick?.();
          }}
          className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <span className="flex-1 text-left">Busca rápida</span>
          <kbd className="inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono">
            ⌘K
          </kbd>
        </button>
        <button
          onClick={() => {
            const ev = new KeyboardEvent("keydown", { key: "?" });
            window.dispatchEvent(ev);
            onLinkClick?.();
          }}
          className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <span className="h-4 w-4 flex items-center justify-center font-bold text-emerald-600">?</span>
          <span className="flex-1 text-left">Atalhos</span>
          <kbd className="inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono">
            ?
          </kbd>
        </button>
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Protótipo navegável
          </div>
          <p className="mt-1 text-muted-foreground leading-snug">
            100+ telas com dados mockados para validação de fluxos.
          </p>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card max-h-screen sticky top-0">
      <SidebarContent />
    </aside>
  );
}

export function SidebarDrawer({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  if (!aberto) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onFechar}
      />
      <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-card border-r shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
        <button
          onClick={onFechar}
          className="absolute right-2 top-2 z-10 p-2 rounded-md hover:bg-accent"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onLinkClick={onFechar} />
      </aside>
    </div>
  );
}
