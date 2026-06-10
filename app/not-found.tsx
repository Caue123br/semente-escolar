import Link from "next/link";
import { Sprout, ArrowLeft, Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-emerald-50/30 to-background p-6">
      {/* Logo */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md">
          <Sprout className="h-5 w-5" />
        </div>
        <span className="font-bold">Semente</span>
      </Link>

      <div className="max-w-md text-center">
        {/* Ilustração ASCII art */}
        <div className="text-9xl md:text-[12rem] font-black bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 bg-clip-text text-transparent leading-none">
          404
        </div>

        <h1 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight">
          Página não encontrada
        </h1>
        <p className="mt-3 text-muted-foreground">
          Hmm... parece que essa página foi pro recreio e ainda não voltou.
          <br />
          Que tal voltar para um lugar conhecido?
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild>
            <Link href="/cockpit">
              <Home className="mr-2 h-4 w-4" />
              Ir para o Cockpit
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a home
            </Link>
          </Button>
        </div>

        <div className="mt-10 pt-8 border-t text-sm text-muted-foreground">
          <p>Sugestões rápidas:</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {[
              { l: "Alunos", h: "/alunos" },
              { l: "Financeiro", h: "/financeiro" },
              { l: "Pedagógico", h: "/pedagogico" },
              { l: "WhatsApp", h: "/whatsapp" },
              { l: "Configurações", h: "/configuracoes" },
            ].map((s) => (
              <Link
                key={s.l}
                href={s.h}
                className="px-3 py-1 rounded-full border bg-card hover:border-emerald-500 hover:text-emerald-700 transition-colors text-xs font-medium"
              >
                {s.l}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Search className="h-3 w-3" />
          Dica: aperte{" "}
          <kbd className="rounded border bg-card px-1.5 py-0.5 font-mono text-[10px]">⌘ K</kbd>{" "}
          para buscar em qualquer lugar.
        </div>
      </div>
    </div>
  );
}
