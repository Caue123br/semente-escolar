import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Portal dos responsáveis",
  description: "Acompanhe a vida escolar do seu filho",
};

export default function PaisLayout({ children }: { children: React.ReactNode }) {
  if (process.env.ENABLE_PARENT_PORTAL !== "true") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Portal dos responsáveis indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este ambiente ainda não habilitou o acesso externo das famílias. Procure a secretaria da escola.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Voltar ao site</Link>
          </Button>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}
