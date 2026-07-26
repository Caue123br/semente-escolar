"use client";

import Link from "next/link";
import { Sprout, Mail } from "lucide-react";

const grupos = [
  {
    titulo: "Produto",
    links: [
      { l: "Recursos", h: "/#modulos" },
      { l: "Diferencial", h: "/#diferencial" },
      { l: "Para quem", h: "/#para-quem" },
      { l: "Ver todos os módulos", h: "#modulos" },
    ],
  },
  {
    titulo: "Acesso",
    links: [
      { l: "Entrar no sistema", h: "/login" },
      { l: "Solicitar demonstração", h: "/#agendar-demonstracao" },
      { l: "Perguntas frequentes", h: "/#faq" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { l: "Política de privacidade", h: "/privacidade" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-6 gap-10 lg:gap-8">
          {/* Logo + descrição */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md">
                <Sprout className="h-5 w-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-base">Semente</span>
                <span className="text-[10px] text-muted-foreground -mt-0.5">
                  escolas conectadas
                </span>
              </div>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              O sistema operacional da sua escola infantil. Gestão administrativa,
              financeira e pedagógica num só lugar.
            </p>

            <div className="mt-5 space-y-2 text-sm">
              <a href="mailto:oi@semente.com.br" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <Mail className="h-4 w-4" /> oi@semente.com.br
              </a>
            </div>
          </div>

          {/* Grupos de links */}
          {grupos.map((g) => (
            <div key={g.titulo}>
              <h4 className="font-semibold text-sm mb-4">{g.titulo}</h4>
              <ul className="space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.l}>
                    <Link
                      href={l.h}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>© 2026 Semente · Sistema de gestão escolar</div>
          <div className="flex items-center gap-4">
            <span>🇧🇷 Português (BR)</span>
            <span>·</span>
            <span>Privacidade e responsabilidades documentadas na implantação</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
