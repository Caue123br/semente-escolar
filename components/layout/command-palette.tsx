"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  GraduationCap,
  Banknote,
  Trello,
  MessageSquare,
  Calendar,
  Package,
  Target,
  Building2,
  ShoppingCart,
  Plus,
  FileText,
  Sparkles,
  ArrowRight,
  Activity,
  BookOpen,
  Baby,
  Bus,
  UtensilsCrossed,
  Briefcase,
  BarChart3,
  Settings,
  Heart,
  Megaphone,
  Shield,
  CalendarCheck,
} from "lucide-react";
import { alunos } from "@/lib/mock-data/alunos";
import { turmas } from "@/lib/mock-data/turmas";
import { cn } from "@/lib/utils";

interface Comando {
  id: string;
  label: string;
  desc?: string;
  href?: string;
  acao?: () => void;
  grupo: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [busca, setBusca] = React.useState("");
  const [destaque, setDestaque] = React.useState(0);

  // Cmd+K / Ctrl+K
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setAberto((v) => !v);
        setBusca("");
        setDestaque(0);
      }
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const comandos: Comando[] = React.useMemo(() => {
    const navegacao: Comando[] = [
      { id: "nav-cockpit", label: "Cockpit", desc: "Visão geral do negócio", href: "/cockpit", grupo: "Navegação", icon: Sparkles, keywords: "dashboard home início" },
      { id: "nav-financeiro", label: "Financeiro", desc: "Faturamento, mensalidades, inadimplência", href: "/financeiro", grupo: "Navegação", icon: Banknote, keywords: "dinheiro money" },
      { id: "nav-vendas", label: "Vendas (PDV)", desc: "Uniformes, alimentação, eventos", href: "/vendas", grupo: "Navegação", icon: ShoppingCart },
      { id: "nav-nf", label: "Nota Fiscal", desc: "NFS-e automática", href: "/nota-fiscal", grupo: "Navegação", icon: FileText, keywords: "nfse" },
      { id: "nav-ped", label: "Pedagógico", desc: "Avaliação e evolução por aluno", href: "/pedagogico", grupo: "Navegação", icon: GraduationCap },
      { id: "nav-alunos", label: "Alunos", desc: "Cadastro e matrículas", href: "/alunos", grupo: "Navegação", icon: Users },
      { id: "nav-kanban", label: "Kanban", desc: "Quadro por turma", href: "/kanban", grupo: "Navegação", icon: Trello },
      { id: "nav-biblio", label: "Biblioteca", desc: "Acervo e empréstimos", href: "/biblioteca", grupo: "Navegação", icon: BookOpen },
      { id: "nav-berc", label: "Berçário", desc: "Rotina dos bebês", href: "/bercario", grupo: "Navegação", icon: Baby },
      { id: "nav-cal", label: "Calendário", desc: "Eventos e feriados", href: "/calendario", grupo: "Navegação", icon: Calendar },
      { id: "nav-card", label: "Cardápio", desc: "Refeições da semana", href: "/cardapio", grupo: "Navegação", icon: UtensilsCrossed },
      { id: "nav-trans", label: "Transporte", desc: "Rotas escolares", href: "/transporte", grupo: "Navegação", icon: Bus },
      { id: "nav-estoque", label: "Estoque", desc: "Consumo e venda", href: "/estoque", grupo: "Navegação", icon: Package },
      { id: "nav-reserva", label: "Reservas", desc: "Espaços da escola", href: "/reservas", grupo: "Navegação", icon: CalendarCheck },
      { id: "nav-patr", label: "Patrimônio", desc: "Bens e manutenção", href: "/patrimonio", grupo: "Navegação", icon: Building2 },
      { id: "nav-wpp", label: "WhatsApp", desc: "Grupos e cobrança", href: "/whatsapp", grupo: "Navegação", icon: MessageSquare, keywords: "zap whats" },
      { id: "nav-mural", label: "Mural", desc: "Comunicados internos", href: "/mural", grupo: "Navegação", icon: Megaphone },
      { id: "nav-portal", label: "Portal dos Pais", desc: "App dos responsáveis", href: "/portal-pais", grupo: "Navegação", icon: Heart },
      { id: "nav-rh", label: "RH & Equipe", desc: "Folha, férias, avaliação", href: "/rh", grupo: "Navegação", icon: Briefcase },
      { id: "nav-crm", label: "Captação (CRM)", desc: "Funil de matrículas", href: "/crm", grupo: "Navegação", icon: Target, keywords: "leads vendas" },
      { id: "nav-relat", label: "Relatórios", desc: "Análises gerenciais", href: "/relatorios", grupo: "Navegação", icon: BarChart3 },
      { id: "nav-freq", label: "Frequência", desc: "Chamada digital", href: "/frequencia", grupo: "Navegação", icon: Activity, keywords: "presença chamada" },
      { id: "nav-conf", label: "Configurações", desc: "Sistema e usuários", href: "/configuracoes", grupo: "Navegação", icon: Settings },
      { id: "nav-lgpd", label: "LGPD & Auditoria", desc: "Conformidade e logs", href: "/lgpd", grupo: "Navegação", icon: Shield },
    ];

    const acoes: Comando[] = [
      { id: "ac-aluno", label: "Nova matrícula", desc: "Cadastrar aluno novo", href: "/alunos", grupo: "Ações rápidas", icon: Plus, keywords: "criar adicionar" },
      { id: "ac-venda", label: "Nova venda no PDV", desc: "Registrar uma venda", href: "/vendas", grupo: "Ações rápidas", icon: Plus },
      { id: "ac-aviso", label: "Novo aviso no mural", desc: "Publicar comunicado", href: "/mural", grupo: "Ações rápidas", icon: Plus },
      { id: "ac-evento", label: "Novo evento no calendário", desc: "Agendar atividade", href: "/calendario", grupo: "Ações rápidas", icon: Plus },
      { id: "ac-cob", label: "Cobrar inadimplentes", desc: "Disparar régua de cobrança", href: "/financeiro", grupo: "Ações rápidas", icon: MessageSquare },
      { id: "ac-nf", label: "Emitir NFS-e", desc: "Nova nota fiscal", href: "/nota-fiscal", grupo: "Ações rápidas", icon: FileText },
    ];

    const alunosCmds: Comando[] = alunos.map((a) => {
      const turma = turmas.find((t) => t.id === a.turmaId);
      return {
        id: `aluno-${a.id}`,
        label: a.nome,
        desc: `${turma?.nome ?? "—"} · matrícula ${a.matricula}`,
        href: `/alunos/${a.id}`,
        grupo: "Alunos",
        icon: Users,
        keywords: a.responsaveis.map((r) => r.nome).join(" "),
      };
    });

    const turmasCmds: Comando[] = turmas.map((t) => ({
      id: `turma-${t.id}`,
      label: t.nome,
      desc: `${t.totalAlunos} alunos · ${t.professorNome}`,
      href: "/pedagogico",
      grupo: "Turmas",
      icon: GraduationCap,
    }));

    return [...navegacao, ...acoes, ...alunosCmds, ...turmasCmds];
  }, []);

  const filtrados = React.useMemo(() => {
    if (!busca.trim()) {
      // Sem busca → mostra ações rápidas + navegação principal
      return comandos.filter(
        (c) => c.grupo === "Ações rápidas" || c.grupo === "Navegação"
      );
    }
    const q = busca.toLowerCase();
    return comandos.filter((c) =>
      [c.label, c.desc, c.keywords]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q))
    );
  }, [busca, comandos]);

  // Agrupar por grupo (mantendo ordem)
  const agrupados = React.useMemo(() => {
    const map = new Map<string, Comando[]>();
    for (const c of filtrados) {
      if (!map.has(c.grupo)) map.set(c.grupo, []);
      map.get(c.grupo)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtrados]);

  // Lista plana para navegação
  const plana = React.useMemo(
    () => agrupados.flatMap(([, items]) => items),
    [agrupados]
  );

  React.useEffect(() => {
    setDestaque(0);
  }, [busca]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestaque((d) => Math.min(d + 1, plana.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestaque((d) => Math.max(d - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const sel = plana[destaque];
      if (sel) executar(sel);
    }
  };

  const executar = (c: Comando) => {
    setAberto(false);
    if (c.acao) c.acao();
    else if (c.href) router.push(c.href);
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setAberto(false)}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-2xl bg-popover border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar alunos, turmas, módulos, ações..."
            className="flex-1 h-14 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {agrupados.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-2">🔍</div>
              <div className="text-sm font-semibold">Nada encontrado</div>
              <div className="text-xs text-muted-foreground mt-1">
                Tente "Sofia", "Jardim", "inadimplência"...
              </div>
            </div>
          ) : (
            agrupados.map(([grupo, items]) => (
              <div key={grupo} className="mb-2 last:mb-0">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {grupo}
                </div>
                <div className="space-y-0.5">
                  {items.map((c) => {
                    const Icon = c.icon;
                    const planaIndex = plana.indexOf(c);
                    const ativo = planaIndex === destaque;
                    return (
                      <button
                        key={c.id}
                        onClick={() => executar(c)}
                        onMouseEnter={() => setDestaque(planaIndex)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                          ativo ? "bg-emerald-50 text-emerald-900" : "hover:bg-accent"
                        )}
                      >
                        <div
                          className={cn(
                            "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                            ativo ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{c.label}</div>
                          {c.desc && (
                            <div className="text-xs text-muted-foreground truncate">
                              {c.desc}
                            </div>
                          )}
                        </div>
                        {ativo && (
                          <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-2.5 text-[11px] text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border bg-background px-1 font-mono">↑↓</kbd>
              navegar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border bg-background px-1 font-mono">↵</kbd>
              selecionar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border bg-background px-1 font-mono">esc</kbd>
              fechar
            </span>
          </div>
          <div className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-600" />
            Powered by Semente
          </div>
        </div>
      </div>
    </div>
  );
}
