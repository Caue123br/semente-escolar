"use client";

import * as React from "react";
import Link from "next/link";
import { Sprout, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { label: "Recursos", href: "#modulos" },
  { label: "Diferencial", href: "#diferencial" },
  { label: "Para quem", href: "#para-quem" },
  { label: "Preços", href: "#precos" },
  { label: "FAQ", href: "#faq" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [aberto, setAberto] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md transition-transform group-hover:scale-105">
              <Sprout className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-base tracking-tight">Semente</span>
              <span className="text-[10px] text-muted-foreground -mt-0.5">
                escolas conectadas
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/cockpit">Entrar</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md"
            >
              <Link href="/cockpit">Ver demonstração ao vivo</Link>
            </Button>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setAberto((v) => !v)}
            aria-label="Menu"
          >
            {aberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {aberto && (
          <div className="md:hidden border-t pb-4 pt-2 space-y-2">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setAberto(false)}
                className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <Button asChild className="w-full">
              <Link href="/cockpit">Ver demonstração</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
