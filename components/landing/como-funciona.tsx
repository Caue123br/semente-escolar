"use client";

import {
  ClipboardCheck,
  Database,
  GraduationCap,
  Rocket,
} from "lucide-react";

const passos = [
  {
    n: "01",
    icon: ClipboardCheck,
    titulo: "Diagnóstico em 30 minutos",
    desc: "Nosso time analisa o tamanho da sua escola, sua dor atual e desenha um plano de implantação sob medida.",
    duracao: "30 min · gratuito",
  },
  {
    n: "02",
    icon: Database,
    titulo: "Importação dos seus dados",
    desc: "Trazemos alunos, responsáveis, contratos e histórico de mensalidades de qualquer planilha ou sistema antigo.",
    duracao: "1–3 dias úteis",
  },
  {
    n: "03",
    icon: GraduationCap,
    titulo: "Treinamento ao vivo da equipe",
    desc: "Sessões online ou presenciais (capital SP) para direção, coordenação, secretaria e professores. Material em PT-BR.",
    duracao: "4–8h, dividido por papel",
  },
  {
    n: "04",
    icon: Rocket,
    titulo: "Go-live com suporte dedicado",
    desc: "Na primeira semana, um especialista Semente acompanha sua escola de perto. Em 30 dias, você opera sozinho.",
    duracao: "30 dias com sucesso garantido",
  },
];

export function LandingComoFunciona() {
  return (
    <section id="como-funciona" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Implantação simples
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
            Do "sim" ao primeiro insight
            <br />
            em <span className="text-emerald-600">menos de 7 dias</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {passos.map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.n} className="relative">
                {/* linha conectora */}
                {i < passos.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[calc(100%-1rem)] w-8 h-px bg-gradient-to-r from-emerald-300 to-transparent" />
                )}
                <div className="relative rounded-2xl border bg-card p-6 hover:shadow-lg transition-all h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-3xl font-black text-muted/40">{p.n}</span>
                  </div>
                  <h3 className="font-bold text-lg">{p.titulo}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {p.desc}
                  </p>
                  <div className="mt-4 pt-4 border-t inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    ⏱️ {p.duracao}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
