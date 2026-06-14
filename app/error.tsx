"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Semente] erro não tratado:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-rose-50/30 to-background p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-6">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Algo deu errado por aqui
        </h1>
        <p className="mt-3 text-muted-foreground">
          Tivemos um tropeço inesperado ao carregar essa página. Nossa equipe já
          foi avisada — tente de novo ou volte ao início.
        </p>

        {error.digest && (
          <p className="mt-3 inline-block rounded-md border bg-card px-3 py-1 font-mono text-[11px] text-muted-foreground">
            Código: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => reset()}>
            <RotateCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Voltar para a home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
