"use client";

import * as React from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  aberto: boolean;
  titulo: string;
  descricao: string;
  textoBotaoConfirmar?: string;
  textoBotaoCancelar?: string;
  variante?: "danger" | "warning" | "info";
  onConfirmar: () => void | Promise<void>;
  onFechar: () => void;
}

export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  textoBotaoConfirmar = "Confirmar",
  textoBotaoCancelar = "Cancelar",
  variante = "warning",
  onConfirmar,
  onFechar,
}: Props) {
  const [processando, setProcessando] = React.useState(false);

  if (!aberto) return null;

  const cores = {
    danger: "from-rose-500 to-rose-700",
    warning: "from-amber-500 to-amber-700",
    info: "from-emerald-500 to-emerald-700",
  }[variante];

  const corBotao = {
    danger: "bg-rose-600 hover:bg-rose-700",
    warning: "bg-amber-600 hover:bg-amber-700",
    info: "bg-emerald-600 hover:bg-emerald-700",
  }[variante];

  const handleConfirmar = async () => {
    setProcessando(true);
    try {
      await onConfirmar();
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => !processando && onFechar()}
    >
      <div
        className="w-full max-w-md bg-popover rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-6 border-b">
          <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${cores} text-white flex items-center justify-center shrink-0`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">{titulo}</h2>
            <p className="text-sm text-muted-foreground mt-1">{descricao}</p>
          </div>
          <button
            onClick={onFechar}
            disabled={processando}
            className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 p-4 bg-muted/30">
          <Button
            type="button"
            variant="outline"
            onClick={onFechar}
            disabled={processando}
          >
            {textoBotaoCancelar}
          </Button>
          <Button
            type="button"
            className={corBotao}
            onClick={handleConfirmar}
            disabled={processando}
          >
            {processando ? "Processando..." : textoBotaoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
