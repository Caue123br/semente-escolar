"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  GraduationCap,
  Package,
  UserPlus,
  Calendar,
  Check,
  CheckCheck,
  Server,
} from "lucide-react";
import { notificacoes as initialNotifs } from "@/lib/mock-data/notificacoes";
import type { TipoNotif } from "@/lib/mock-data/notificacoes";
import { cn } from "@/lib/utils";

const ICONE: Record<TipoNotif, React.ComponentType<{ className?: string }>> = {
  inadimplencia: AlertTriangle,
  pedagogico: GraduationCap,
  estoque: Package,
  matricula: UserPlus,
  evento: Calendar,
  sistema: Server,
};

const COR: Record<TipoNotif, string> = {
  inadimplencia: "bg-rose-100 text-rose-700",
  pedagogico: "bg-violet-100 text-violet-700",
  estoque: "bg-amber-100 text-amber-700",
  matricula: "bg-emerald-100 text-emerald-700",
  evento: "bg-blue-100 text-blue-700",
  sistema: "bg-slate-100 text-slate-700",
};

export function NotificacoesDropdown() {
  const [aberto, setAberto] = React.useState(false);
  const [items, setItems] = React.useState(initialNotifs);
  const refContainer = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClickFora = (e: MouseEvent) => {
      if (!refContainer.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  const naoLidas = items.filter((n) => !n.lida).length;

  const marcarTodasLidas = () => {
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  const toggleLida = (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: !n.lida } : n))
    );
  };

  return (
    <div className="relative" ref={refContainer}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger animate-pulse" />
            <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-danger" />
          </>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl bg-popover border shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <div className="font-semibold">Notificações</div>
              <div className="text-xs text-muted-foreground">
                {naoLidas === 0
                  ? "Tudo em dia ✨"
                  : `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}`}
              </div>
            </div>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodasLidas}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-[480px] overflow-y-auto">
            {items.map((n) => {
              const Icon = ICONE[n.tipo];
              const conteudo = (
                <div
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent cursor-pointer border-b last:border-0",
                    !n.lida && "bg-emerald-50/40"
                  )}
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      COR[n.tipo]
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm truncate">{n.titulo}</div>
                      {!n.lida && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.desc}
                    </p>
                    <div className="text-[10px] text-muted-foreground mt-1.5">
                      {n.tempo}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleLida(n.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:bg-background rounded p-1"
                    title={n.lida ? "Marcar como não lida" : "Marcar como lida"}
                  >
                    <Check className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              );

              if (n.link) {
                return (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      setAberto(false);
                      toggleLida(n.id);
                    }}
                    className="group block"
                  >
                    {conteudo}
                  </Link>
                );
              }
              return (
                <div key={n.id} className="group">
                  {conteudo}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t bg-muted/30 px-4 py-2.5 text-center">
            <Link
              href="/cockpit"
              onClick={() => setAberto(false)}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
            >
              Ver todas no Cockpit →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
