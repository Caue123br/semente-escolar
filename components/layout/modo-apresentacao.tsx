"use client";

import * as React from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "semente:apresentacao";

export function ModoApresentacaoToggle() {
  const [ativo, setAtivo] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "1") {
      setAtivo(true);
      document.documentElement.classList.add("modo-apresentacao");
    }
  }, []);

  const toggle = () => {
    const novo = !ativo;
    setAtivo(novo);
    if (novo) {
      document.documentElement.classList.add("modo-apresentacao");
      localStorage.setItem(STORAGE_KEY, "1");
    } else {
      document.documentElement.classList.remove("modo-apresentacao");
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Atalho P
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.altKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "p"
      ) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <button
      onClick={toggle}
      className={cn(
        "fixed bottom-6 left-6 z-40 rounded-full px-3 py-2 text-xs font-medium shadow-lg transition-all flex items-center gap-2",
        ativo
          ? "bg-emerald-600 text-white"
          : "bg-card border hover:bg-accent text-muted-foreground"
      )}
      title={`Modo apresentação (${ativo ? "ATIVO" : "INATIVO"}) · ⌥⇧P`}
    >
      {ativo ? (
        <>
          <Minimize2 className="h-3.5 w-3.5" />
          Sair da apresentação
        </>
      ) : (
        <>
          <Maximize2 className="h-3.5 w-3.5" />
          Modo apresentação
        </>
      )}
    </button>
  );
}
