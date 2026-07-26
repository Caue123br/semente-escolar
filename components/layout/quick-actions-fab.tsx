"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  UserPlus,
  ShoppingCart,
  Megaphone,
  CalendarPlus,
  MessageCircle,
  FileText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NovaMatriculaModal } from "@/components/alunos/nova-matricula-modal";
import { NovoAvisoModal } from "@/components/shared/novo-aviso-modal";
import { NovoEventoModal } from "@/components/shared/novo-evento-modal";
import { useEntidade } from "@/lib/data/store";
import { useModulos } from "@/lib/modulos-context";
import { podeVer as podeVerModulo, usePerfil } from "@/lib/perfil-context";
import { podeGerenciarAlunos } from "@/lib/access-control";

interface AcaoRapida {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  modulo: string;
  href?: string;
  acao?: () => void;
  cor: string;
}

export function QuickActionsFab() {
  const { perfil } = usePerfil();
  const { isAtivo } = useModulos();
  const [aberto, setAberto] = React.useState(false);
  const [modalAtivo, setModalAtivo] = React.useState<
    "matricula" | "aviso" | "evento" | null
  >(null);
  const ref = React.useRef<HTMLDivElement>(null);

  const acoes: AcaoRapida[] = [
    {
      label: "Nova matrícula",
      icon: UserPlus,
      modulo: "alunos",
      acao: () => setModalAtivo("matricula"),
      cor: "bg-emerald-500",
    },
    {
      label: "Nova venda (PDV)",
      icon: ShoppingCart,
      modulo: "vendas",
      href: "/vendas",
      cor: "bg-blue-500",
    },
    {
      label: "Novo aviso no mural",
      icon: Megaphone,
      modulo: "mural",
      acao: () => setModalAtivo("aviso"),
      cor: "bg-purple-500",
    },
    {
      label: "Novo evento",
      icon: CalendarPlus,
      modulo: "calendario",
      acao: () => setModalAtivo("evento"),
      cor: "bg-amber-500",
    },
    {
      label: "Acompanhar inadimplentes",
      icon: MessageCircle,
      modulo: "financeiro",
      href: "/financeiro",
      cor: "bg-rose-500",
    },
    {
      label: "Novo registro fiscal",
      icon: FileText,
      modulo: "nota-fiscal",
      href: "/nota-fiscal",
      cor: "bg-indigo-500",
    },
  ].filter((acao) =>
    podeVerModulo(perfil, acao.modulo) &&
    isAtivo(acao.modulo) &&
    (acao.modulo !== "alunos" || podeGerenciarAlunos(perfil))
  );

  React.useEffect(() => {
    const onClickFora = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    };
    if (aberto) document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, [aberto]);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40" ref={ref}>
        {aberto && (
          <div className="absolute bottom-full right-0 mb-3 flex flex-col-reverse gap-2 items-end animate-in fade-in slide-in-from-bottom-2 duration-150">
            {acoes.map((a) => {
              const Icon = a.icon;
              const inner = (
                <div className="group flex items-center gap-3 cursor-pointer">
                  <span className="rounded-full bg-foreground/90 backdrop-blur text-background px-3 py-1.5 text-xs font-medium shadow-lg whitespace-nowrap">
                    {a.label}
                  </span>
                  <div
                    className={cn(
                      "h-12 w-12 rounded-full text-white shadow-lg flex items-center justify-center transition-all hover:scale-110",
                      a.cor
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              );
              if (a.href) {
                return (
                  <Link
                    key={a.label}
                    href={a.href}
                    onClick={() => setAberto(false)}
                  >
                    {inner}
                  </Link>
                );
              }
              return (
                <button
                  key={a.label}
                  onClick={() => {
                    a.acao?.();
                    setAberto(false);
                  }}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => setAberto((v) => !v)}
          className={cn(
            "h-14 w-14 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center transition-all hover:scale-110 hover:shadow-2xl hover:shadow-emerald-600/40",
            aberto && "rotate-45"
          )}
          aria-label={aberto ? "Fechar ações" : "Abrir ações rápidas"}
        >
          {aberto ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>

      {modalAtivo === "matricula" && (
        <MatriculaRapidaModal onClose={() => setModalAtivo(null)} />
      )}
      {modalAtivo === "aviso" && (
        <NovoAvisoModal aberto onClose={() => setModalAtivo(null)} />
      )}
      {modalAtivo === "evento" && (
        <NovoEventoModal aberto onClose={() => setModalAtivo(null)} />
      )}
    </>
  );
}

function MatriculaRapidaModal({ onClose }: { onClose: () => void }) {
  const { items: turmas } = useEntidade("turmas");
  const { add: addAluno } = useEntidade("alunos");
  return (
    <NovaMatriculaModal
      aberto
      onClose={onClose}
      turmas={turmas}
      onSalvar={addAluno}
    />
  );
}
