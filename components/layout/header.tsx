"use client";

import * as React from "react";
import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificacoesDropdown } from "@/components/layout/notificacoes-dropdown";
import { UserMenu } from "@/components/layout/user-menu";
import { escola } from "@/lib/mock-data/escola";

export function Header({ onAbrirSidebar }: { onAbrirSidebar?: () => void }) {
  const dataHoje = "Terça-feira, 9 de junho de 2026";

  const abrirCommandPalette = () => {
    const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
    window.dispatchEvent(ev);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Abrir menu"
        onClick={onAbrirSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden lg:flex flex-col">
        <span className="text-sm font-semibold leading-tight">{escola.nome}</span>
        <span className="text-xs text-muted-foreground capitalize leading-tight">
          {dataHoje}
        </span>
      </div>

      <button
        onClick={abrirCommandPalette}
        className="relative ml-auto hidden md:flex flex-1 max-w-md items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar aluno, responsável, turma...</span>
        <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
          ⌘K
        </kbd>
      </button>

      <NotificacoesDropdown />
      <UserMenu />
    </header>
  );
}
