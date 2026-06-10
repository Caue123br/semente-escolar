"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  cockpit: "Cockpit",
  financeiro: "Financeiro",
  vendas: "Vendas",
  "nota-fiscal": "Nota Fiscal",
  pedagogico: "Pedagógico",
  alunos: "Alunos",
  kanban: "Kanban",
  biblioteca: "Biblioteca",
  bercario: "Berçário",
  calendario: "Calendário",
  cardapio: "Cardápio",
  transporte: "Transporte",
  estoque: "Estoque",
  reservas: "Reservas",
  patrimonio: "Patrimônio",
  whatsapp: "WhatsApp",
  mural: "Mural",
  "portal-pais": "Portal dos Pais",
  rh: "RH & Equipe",
  crm: "CRM",
  relatorios: "Relatórios",
  frequencia: "Frequência",
  configuracoes: "Configurações",
  lgpd: "LGPD & Auditoria",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  if (!pathname || pathname === "/" || pathname === "/cockpit") return null;

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const items = parts.map((p, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    const isLast = i === parts.length - 1;
    // Detalhe: se for ID dinâmico (não está no LABELS), mostra placeholder
    const label = LABELS[p] ?? (p.length > 8 ? "Detalhes" : p);
    return { href, label, isLast };
  });

  return (
    <nav
      aria-label="Caminho"
      className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4"
    >
      <Link href="/cockpit" className="hover:text-foreground transition-colors flex items-center">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((it) => (
        <div key={it.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5" />
          {it.isLast ? (
            <span className="font-medium text-foreground">{it.label}</span>
          ) : (
            <Link
              href={it.href}
              className="hover:text-foreground transition-colors"
            >
              {it.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
