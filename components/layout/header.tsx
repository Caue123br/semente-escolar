"use client";

import * as React from "react";
import { Search, Menu, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificacoesDropdown } from "@/components/layout/notificacoes-dropdown";
import { UserMenu } from "@/components/layout/user-menu";
import { useTema } from "@/lib/theme-context";

const MESES_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS_PT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function obterDataHoje(): string {
  const d = new Date();
  return `${DIAS_PT[d.getDay()]}, ${d.getDate()} de ${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

export function Header({ onAbrirSidebar }: { onAbrirSidebar?: () => void }) {
  const [escolaNome, setEscolaNome] = React.useState("Escola Modelo");
  const [dataHoje, setDataHoje] = React.useState(obterDataHoje);
  const { tema, setTema } = useTema();

  React.useEffect(() => {
    fetch("/api/escola", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setEscolaNome(d.nome ?? "Escola Modelo"))
      .catch(() => {});
    // Atualiza data uma vez por minuto
    const tick = setInterval(() => setDataHoje(obterDataHoje()), 60_000);
    return () => clearInterval(tick);
  }, []);

  const abrirCommandPalette = () => {
    const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
    window.dispatchEvent(ev);
  };

  const proximoTema = () => {
    if (tema === "light") setTema("dark");
    else if (tema === "dark") setTema("system");
    else setTema("light");
  };

  const TemaIcon = tema === "light" ? Sun : tema === "dark" ? Moon : Monitor;

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
        <span className="text-sm font-semibold leading-tight">{escolaNome}</span>
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

      <Button
        variant="ghost"
        size="icon"
        onClick={proximoTema}
        aria-label="Alternar tema"
        title={`Tema: ${tema} (clica pra alternar)`}
        className="hidden md:inline-flex"
      >
        <TemaIcon className="h-5 w-5" />
      </Button>

      <NotificacoesDropdown />
      <UserMenu />
    </header>
  );
}
