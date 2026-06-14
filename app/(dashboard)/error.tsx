"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Semente · dashboard] erro:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md w-full rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-rose-100 text-rose-600 mb-5">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h2 className="text-xl font-semibold tracking-tight">
          Esse módulo travou
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Não conseguimos renderizar essa tela. O resto do sistema continua
          funcionando — tente recarregar essa seção.
        </p>

        {error.digest && (
          <p className="mt-3 inline-block rounded-md border bg-muted/40 px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Button size="sm" onClick={() => reset()}>
            <RotateCw className="mr-2 h-3.5 w-3.5" />
            Recarregar módulo
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/cockpit">
              <LayoutDashboard className="mr-2 h-3.5 w-3.5" />
              Ir para o Cockpit
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
