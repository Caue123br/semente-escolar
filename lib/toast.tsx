"use client";

import * as React from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTipo = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  tipo: ToastTipo;
  titulo: string;
  desc?: string;
  duracao?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
  success: (titulo: string, desc?: string) => void;
  error: (titulo: string, desc?: string) => void;
  warning: (titulo: string, desc?: string) => void;
  info: (titulo: string, desc?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

const ICONE: Record<ToastTipo, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const COR: Record<ToastTipo, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  error: "bg-rose-50 border-rose-200 text-rose-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  info: "bg-blue-50 border-blue-200 text-blue-900",
};

const ICONE_COR: Record<ToastTipo, string> = {
  success: "text-emerald-600",
  error: "text-rose-600",
  warning: "text-amber-600",
  info: "text-blue-600",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const remover = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast: ToastContextValue["toast"] = (t) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const duracao = t.duracao ?? 5000;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => remover(id), duracao);
  };

  const ctx: ToastContextValue = {
    toast,
    success: (titulo, desc) => toast({ tipo: "success", titulo, desc }),
    error: (titulo, desc) => toast({ tipo: "error", titulo, desc }),
    warning: (titulo, desc) => toast({ tipo: "warning", titulo, desc }),
    info: (titulo, desc) => toast({ tipo: "info", titulo, desc }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICONE[t.tipo];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto rounded-lg border p-4 shadow-lg w-[360px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-right fade-in duration-200",
                COR[t.tipo]
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", ICONE_COR[t.tipo])} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{t.titulo}</div>
                  {t.desc && (
                    <div className="text-xs mt-0.5 opacity-80">{t.desc}</div>
                  )}
                </div>
                <button
                  onClick={() => remover(t.id)}
                  className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}
