"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgendarDemoModal } from "@/components/landing/agendar-demo-modal";

export function LandingCtaFinal() {
  const [modal, setModal] = React.useState(false);

  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 px-8 py-16 md:py-24 text-white shadow-2xl">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500/30 rounded-full blur-3xl" />

          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Pronto para começar?
            </div>
            <h2 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight">
              Sua escola merece ser
              <br />
              um{" "}
              <span className="bg-gradient-to-r from-amber-200 to-emerald-200 bg-clip-text text-transparent">
                negócio profissional
              </span>
            </h2>
            <p className="mt-5 text-lg text-emerald-100 max-w-2xl mx-auto">
              Comece grátis. Sem cartão. Em 7 dias você já estará tomando decisões
              melhores com mais clareza.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                asChild
                className="h-12 px-8 text-base bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg"
              >
                <Link href="/cockpit">
                  Ver demonstração ao vivo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setModal(true)}
                className="h-12 px-8 text-base bg-transparent border-white/40 text-white hover:bg-white/10"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Agendar demonstração 1:1
              </Button>
            </div>

            <p className="mt-6 text-xs text-emerald-200">
              💚 14 dias grátis · sem cartão · cancele quando quiser
            </p>
          </div>
        </div>
      </div>

      <AgendarDemoModal aberto={modal} onClose={() => setModal(false)} />
    </section>
  );
}
