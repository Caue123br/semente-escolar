"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ATALHOS_NAV: Record<string, string> = {
  c: "/cockpit",
  f: "/financeiro",
  p: "/pedagogico",
  a: "/alunos",
  k: "/kanban",
  w: "/whatsapp",
  r: "/relatorios",
  m: "/mural",
  b: "/biblioteca",
  e: "/estoque",
  v: "/vendas",
  n: "/nota-fiscal",
  h: "/rh",
  q: "/calendario", // q de "quando"
};

const ATALHOS_LISTA = [
  {
    secao: "Geral",
    items: [
      { k: ["⌘", "K"], desc: "Abrir busca rápida" },
      { k: ["?"], desc: "Ver atalhos de teclado" },
      { k: ["⌥", "⇧", "P"], desc: "Modo apresentação" },
      { k: ["Esc"], desc: "Fechar diálogos" },
    ],
  },
  {
    secao: "Navegação (digite G + tecla)",
    items: [
      { k: ["G", "C"], desc: "Cockpit" },
      { k: ["G", "F"], desc: "Financeiro" },
      { k: ["G", "P"], desc: "Pedagógico" },
      { k: ["G", "A"], desc: "Alunos" },
      { k: ["G", "K"], desc: "Kanban" },
      { k: ["G", "W"], desc: "WhatsApp" },
      { k: ["G", "R"], desc: "Relatórios" },
      { k: ["G", "M"], desc: "Mural" },
      { k: ["G", "B"], desc: "Biblioteca" },
      { k: ["G", "E"], desc: "Estoque" },
      { k: ["G", "V"], desc: "Vendas" },
      { k: ["G", "H"], desc: "RH & Equipe" },
      { k: ["G", "Q"], desc: "Calendário" },
    ],
  },
];

export function KeyboardShortcuts() {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [aguardandoG, setAguardandoG] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignora se está digitando em campo
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setAberto((v) => !v);
        return;
      }

      if (e.key === "Escape") {
        setAberto(false);
        setAguardandoG(false);
        return;
      }

      // Atalho G+letra
      if (aguardandoG) {
        const key = e.key.toLowerCase();
        const dest = ATALHOS_NAV[key];
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
        setAguardandoG(false);
        return;
      }

      if (e.key === "g" || e.key === "G") {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        setAguardandoG(true);
        setTimeout(() => setAguardandoG(false), 1500);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aguardandoG, router]);

  return (
    <>
      {/* Toast de "aguardando G+" */}
      {aguardandoG && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-foreground text-background px-4 py-2 text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
          ⌨️ Aguardando segunda tecla... (ex: G + F = Financeiro)
        </div>
      )}

      {/* Painel de atalhos */}
      {aberto && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-2xl bg-popover rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Keyboard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold">Atalhos de teclado</h2>
                  <p className="text-xs text-muted-foreground">
                    Para dominar a Semente em segundos
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {ATALHOS_LISTA.map((s) => (
                <div key={s.secao} className="mb-5 last:mb-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-2">
                    {s.secao}
                  </div>
                  <div className="space-y-1">
                    {s.items.map((a) => (
                      <div
                        key={a.desc}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50"
                      >
                        <span className="text-sm">{a.desc}</span>
                        <div className="flex items-center gap-1">
                          {a.k.map((tecla, i) => (
                            <React.Fragment key={i}>
                              {i > 0 && (
                                <span className="text-[10px] text-muted-foreground">+</span>
                              )}
                              <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded border-2 border-foreground/20 bg-card text-xs font-mono font-bold shadow-sm">
                                {tecla}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t bg-muted/30 text-center text-xs text-muted-foreground">
              Aperte{" "}
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded border bg-card text-[10px] font-mono mx-1">
                ?
              </kbd>{" "}
              em qualquer tela para abrir essa janela
            </div>
          </div>
        </div>
      )}
    </>
  );
}
