"use client";

import * as React from "react";
import {
  Sparkles,
  Crown,
  ClipboardList,
  GraduationCap,
  ArrowRight,
  X,
  Sprout,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePerfil } from "@/lib/perfil-context";
import type { Perfil } from "@/lib/types";

const STORAGE_KEY = "semente:welcome-seen";

const passos = [
  {
    titulo: "Bem-vindo à demonstração ao vivo da Semente",
    desc: "Você está navegando pelo sistema completo com dados fictícios da Escola Semente Feliz (228 alunos, R$ 257K/mês). Explore à vontade — nada aqui é real.",
    cta: "Vamos lá",
    icon: Sprout,
  },
  {
    titulo: "Comece pelo Cockpit",
    desc: "Indicadores em tempo real, gráfico de faturamento, alertas inteligentes e o nosso diferencial: Insight do Dia gerado por IA cruzando todos os módulos.",
    cta: "Próximo",
    icon: Sparkles,
  },
  {
    titulo: "Troque de perfil quando quiser",
    desc: "No canto superior direito, abra o menu do usuário e simule a visão de Diretor(a), Coordenador(a) ou Professor(a). A sidebar e o conteúdo se adaptam.",
    cta: "Próximo",
    icon: Crown,
  },
  {
    titulo: "Busca rápida com ⌘K",
    desc: "Aperte Cmd+K (ou Ctrl+K) em qualquer tela para abrir a paleta de comandos. Busque alunos, turmas, ações ou navegue por qualquer módulo em segundos.",
    cta: "Quero começar",
    icon: Lightbulb,
  },
];

export function WelcomeModal() {
  const { perfil } = usePerfil();
  const [aberto, setAberto] = React.useState(false);
  const [passo, setPasso] = React.useState(0);

  React.useEffect(() => {
    const visto = localStorage.getItem(STORAGE_KEY);
    if (!visto) {
      const t = setTimeout(() => setAberto(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const fechar = () => {
    setAberto(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  if (!aberto) return null;

  const atual = passos[passo];
  const Icon = atual.icon;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-popover rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header com gradient */}
        <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-8 text-white">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <button
            onClick={fechar}
            className="absolute right-3 top-3 h-8 w-8 rounded-md hover:bg-white/20 flex items-center justify-center"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur shadow-lg mb-4">
              <Icon className="h-7 w-7" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              Tour rápido · {passo + 1} de {passos.length}
            </div>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight leading-tight">
              {atual.titulo}
            </h2>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-8">
          <p className="text-muted-foreground leading-relaxed">{atual.desc}</p>

          {/* Quick badges no primeiro passo */}
          {passo === 0 && (
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { v: "24", l: "módulos" },
                { v: "100+", l: "telas" },
                { v: "228", l: "alunos demo" },
              ].map((s) => (
                <div key={s.l} className="rounded-lg bg-muted p-3">
                  <div className="text-2xl font-bold text-emerald-700">{s.v}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Perfis no passo 2 */}
          {passo === 2 && (
            <div className="mt-5 space-y-2">
              {[
                { p: "diretor", i: Crown, l: "Diretora — Renata", c: "text-amber-600", d: "vê tudo (financeiro + pedagógico)" },
                { p: "coordenador", i: ClipboardList, l: "Coordenador — Cláudio", c: "text-blue-600", d: "vê pedagógico + administrativo" },
                { p: "professor", i: GraduationCap, l: "Professora — Mariana", c: "text-emerald-600", d: "vê só o pedagógico das suas turmas" },
              ].map((opt) => {
                const Ic = opt.i;
                const ativo = perfil === opt.p;
                return (
                  <div
                    key={opt.p}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
                      ativo ? "border-emerald-500 bg-emerald-50" : ""
                    }`}
                  >
                    <Ic className={`h-4 w-4 ${opt.c}`} />
                    <div className="flex-1">
                      <div className="font-medium">{opt.l}</div>
                      <div className="text-xs text-muted-foreground">{opt.d}</div>
                    </div>
                    {ativo && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ATIVO
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Atalho no passo 3 */}
          {passo === 3 && (
            <div className="mt-5 rounded-lg bg-gradient-to-br from-emerald-50 to-card border p-4">
              <div className="flex items-center gap-3 mb-2">
                <kbd className="rounded-md border-2 border-foreground/30 bg-card px-3 py-1.5 text-sm font-mono font-bold shadow-sm">
                  ⌘ K
                </kbd>
                <span className="text-sm font-medium">ou</span>
                <kbd className="rounded-md border-2 border-foreground/30 bg-card px-3 py-1.5 text-sm font-mono font-bold shadow-sm">
                  Ctrl K
                </kbd>
              </div>
              <p className="text-xs text-muted-foreground">
                Tenta agora! A paleta abre em qualquer tela do sistema.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-8 pb-6">
          <div className="flex gap-1.5">
            {passos.map((_, i) => (
              <button
                key={i}
                onClick={() => setPasso(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === passo ? "w-8 bg-emerald-600" : "w-1.5 bg-muted-foreground/30"
                }`}
                aria-label={`Passo ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {passo > 0 && (
              <Button variant="ghost" onClick={() => setPasso((p) => p - 1)}>
                Voltar
              </Button>
            )}
            <Button
              onClick={() => {
                if (passo === passos.length - 1) fechar();
                else setPasso((p) => p + 1);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {atual.cta}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Footer secundário */}
        <div className="border-t bg-muted/30 px-8 py-3 text-center">
          <button
            onClick={fechar}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Pular tour
          </button>
        </div>
      </div>
    </div>
  );
}
