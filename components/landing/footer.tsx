"use client";

import Link from "next/link";
import { Sprout, Instagram, Linkedin, Youtube, Mail, Phone } from "lucide-react";

const grupos = [
  {
    titulo: "Produto",
    links: [
      { l: "Cockpit", h: "/cockpit" },
      { l: "Financeiro", h: "/financeiro" },
      { l: "Pedagógico", h: "/pedagogico" },
      { l: "WhatsApp", h: "/whatsapp" },
      { l: "CRM Captação", h: "/crm" },
      { l: "Ver todos os módulos", h: "#modulos" },
    ],
  },
  {
    titulo: "Empresa",
    links: [
      { l: "Sobre a Semente", h: "#" },
      { l: "Carreira", h: "#" },
      { l: "Blog", h: "#" },
      { l: "Imprensa", h: "#" },
      { l: "Parcerias", h: "#" },
    ],
  },
  {
    titulo: "Recursos",
    links: [
      { l: "Central de ajuda", h: "#" },
      { l: "Documentação", h: "#" },
      { l: "API", h: "#" },
      { l: "Webinars", h: "#" },
      { l: "Comunidade", h: "#" },
    ],
  },
  {
    titulo: "Legal",
    links: [
      { l: "Termos de uso", h: "#" },
      { l: "Política de privacidade", h: "#" },
      { l: "LGPD", h: "/lgpd" },
      { l: "Cookies", h: "#" },
      { l: "Status do sistema", h: "#" },
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
              <a href="tel:+551133334444" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <Phone className="h-4 w-4" /> (11) 3333-4444
              </a>
            </div>

            <div className="mt-6 flex gap-3">
              <a href="#" className="h-9 w-9 rounded-full bg-card border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-emerald-500 transition-colors" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-full bg-card border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-emerald-500 transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-full bg-card border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-emerald-500 transition-colors" aria-label="YouTube">
                <Youtube className="h-4 w-4" />
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
          <div>© 2026 Semente Tecnologia LTDA · CNPJ 00.000.000/0001-00 · São Paulo, Brasil</div>
          <div className="flex items-center gap-4">
            <span>🇧🇷 Português (BR)</span>
            <span>·</span>
            <span>Operando 100% em conformidade com a LGPD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
