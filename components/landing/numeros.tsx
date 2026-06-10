"use client";

import * as React from "react";

interface Stat {
  valor: string;
  label: string;
  destaque?: string;
}

const stats: Stat[] = [
  { valor: "+200", label: "escolas usando", destaque: "↑ 38% no ano" },
  { valor: "R$ 4M+", label: "em mensalidades gerenciadas/mês" },
  { valor: "98%", label: "taxa de retenção dos clientes" },
  { valor: "−42%", label: "média de inadimplência após 3 meses" },
];

export function LandingNumeros() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white relative overflow-hidden">
      {/* Pattern */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            Resultados que falam por si
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
            Escolas que mudaram de patamar
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-white to-emerald-200 bg-clip-text text-transparent">
                {s.valor}
              </div>
              <div className="mt-2 text-sm text-emerald-100">{s.label}</div>
              {s.destaque && (
                <div className="mt-2 inline-block text-xs font-semibold text-emerald-300 bg-white/10 px-2 py-0.5 rounded-full">
                  {s.destaque}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
