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
import { MODULO_POR_ROTA, rotaSomenteDiretor } from "@/lib/navigation-access";
import { cn } from "@/lib/utils";
import { podeVer as podeVerModulo, usePerfil } from "@/lib/perfil-context";
import { useModulos } from "@/lib/modulos-context";

interface ItemNav {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
      { label: "Cockpit", href: "/cockpit", icon: LayoutDashboard },
    ],
  },
  {
    titulo: "Financeiro",
    itens: [
      { label: "Financeiro", href: "/financeiro", icon: Banknote },
      { label: "Vendas", href: "/vendas", icon: ShoppingCart },
      { label: "Nota Fiscal", href: "/nota-fiscal", icon: FileText },
    ],
  },
  {
    titulo: "Pedagógico",
    itens: [
      { label: "Pedagógico", href: "/pedagogico", icon: GraduationCap },
      { label: "Alunos", href: "/alunos", icon: Users },
      { label: "Kanban", href: "/kanban", icon: Trello },
      { label: "Biblioteca", href: "/biblioteca", icon: BookOpen },
      { label: "Berçário", href: "/bercario", icon: Baby },
      { label: "Saúde", href: "/saude", icon: Heart },
      { label: "Recados", href: "/recados", icon: Megaphone },
    ],
  },
  {
    titulo: "Operacional",
    itens: [
      { label: "Calendário", href: "/calendario", icon: Calendar },
      { label: "Cardápio", href: "/cardapio", icon: UtensilsCrossed },
      { label: "Transporte", href: "/transporte", icon: Bus },
      { label: "Estoque", href: "/estoque", icon: Package },
      { label: "Reservas", href: "/reservas", icon: CalendarCheck },
      { label: "Patrimônio", href: "/patrimonio", icon: Building2 },
    ],
  },
  {
    titulo: "Comunicação",
    itens: [
      { label: "Atendimento", href: "/whatsapp", icon: MessageSquare },
      { label: "Mural", href: "/mural", icon: Megaphone },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { label: "RH & Equipe", href: "/rh", icon: Briefcase },
      { label: "Captação (CRM)", href: "/crm", icon: Target },
      { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
      { label: "Frequência", href: "/frequencia", icon: Activity },
    ],
  },
  {
    titulo: "Sistema",
    itens: [
      { label: "Super Admin", href: "/super-admin", icon: Shield },
      { label: "Configurações", href: "/configuracoes", icon: Settings },
      { label: "LGPD & Auditoria", href: "/lgpd", icon: Shield },
    ],
  },
];

function podeVer(perfil: Parameters<typeof podeVerModulo>[0], item: ItemNav): boolean {
  const moduloId = MODULO_POR_ROTA[item.href];
  if (rotaSomenteDiretor(item.href)) return perfil === "diretor";
  return !moduloId || podeVerModulo(perfil, moduloId);
}

function moduloAtivo(href: string, isAtivo: (id: string) => boolean): boolean {
  // Super Admin sempre visível (não dá pra desligar a si mesmo)
  if (href === "/super-admin") return true;
  const moduloId = MODULO_POR_ROTA[href];
  if (!moduloId) return true;
  return isAtivo(moduloId);
}

interface SidebarContentProps {
  onLinkClick?: () => void;
}

function SidebarContent({ onLinkClick }: SidebarContentProps) {
  const pathname = usePathname();
  const { perfil } = usePerfil();
  const { isAtivo } = useModulos();
  const [escolaConfig, setEscolaConfig] = React.useState<{ nome: string; logoTexto: string; logoUrl: string | null }>({
    nome: "Escola",
    logoTexto: "ES",
    logoUrl: null,
  });

  React.useEffect(() => {
    fetch("/api/escola", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Não foi possível carregar a escola");
        return r.json();
      })
      .then((data) => {
        setEscolaConfig({
          nome: data.nome || "Escola",
          logoTexto: data.logoTexto || "ES",
          logoUrl: data.logoUrl || null,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="flex h-16 items-center gap-3 border-b px-6 shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm overflow-hidden">
          {escolaConfig.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={escolaConfig.logoUrl} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            escolaConfig.logoTexto
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold leading-tight truncate">{escolaConfig.nome}</span>
          <span className="text-xs text-muted-foreground">Sistema de Gestão</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {GRUPOS.map((grupo) => {
          const visiveis = grupo.itens.filter(
            (i) => podeVer(perfil, i) && moduloAtivo(i.href, isAtivo)
          );
          if (visiveis.length === 0) return null;
          return (
            <div key={grupo.titulo}>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {grupo.titulo}
              </div>
              <div className="space-y-0.5">
                {visiveis.map((item) => {
                  const Icon = item.icon;
                  const ativo = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onLinkClick}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                        ativo
                          ? "bg-primary text-primary-foreground font-medium shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className={cn(
                          "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold",
                          ativo ? "bg-primary-foreground/20" : "bg-rose-500 text-white"
                        )}>
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

      <div className="p-3 space-y-2 shrink-0 border-t">
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
        <form action="/api/auth/logout" method="POST" className="w-full">
          <button
            type="submit"
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <span className="h-4 w-4 flex items-center justify-center">⏻</span>
            <span className="flex-1 text-left">Sair</span>
          </button>
        </form>
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Sistema rodando
          </div>
          <p className="mt-1 text-muted-foreground leading-snug">
            Dados salvos no PostgreSQL exclusivo da VPS.
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
