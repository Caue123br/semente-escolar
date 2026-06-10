"use client";

import { Crown, ClipboardList, GraduationCap, Heart, Check } from "lucide-react";

const personas = [
  {
    icon: Crown,
    cor: "from-amber-500 to-amber-700",
    titulo: "Para você que é dona da escola",
    desc: "Quer profissionalizar a gestão sem virar refém de planilha e WhatsApp.",
    items: [
      "Cockpit com a saúde do negócio em 10 segundos",
      "Inadimplência sob controle pela primeira vez",
      "Decisões baseadas em dados, não em achismo",
      "Sua escola continua girando quando você não está",
    ],
  },
  {
    icon: ClipboardList,
    cor: "from-blue-500 to-blue-700",
    titulo: "Para você, coordenador(a) pedagógico",
    desc: "Quer visibilidade do pedagógico sem precisar abrir 10 abas e ligar pra 4 professoras.",
    items: [
      "Evolução de cada aluno em gráfico visual",
      "Alerta automático de estagnação",
      "Visão consolidada por turma e série",
      "Boletins prontos em 1 clique",
    ],
  },
  {
    icon: GraduationCap,
    cor: "from-emerald-500 to-emerald-700",
    titulo: "Para você, professor(a)",
    desc: "Quer tempo pra ensinar — não pra preencher relatório.",
    items: [
      "Avaliação bimestral em 5 minutos",
      "Kanban da turma sempre à mão",
      "Chamada digital com 1 toque",
      "Comunicação com pais centralizada",
    ],
  },
  {
    icon: Heart,
    cor: "from-rose-500 to-rose-700",
    titulo: "Para os pais e responsáveis",
    desc: "Querem acompanhar o filho sem terem que ir até a escola.",
    items: [
      "App próprio para os pais (incluso)",
      "Boletim, agenda e fotos em tempo real",
      "Chat direto com a professora",
      "Mensalidade no Pix com 1 clique",
    ],
  },
];

export function LandingParaQuem() {
  return (
    <section id="para-quem" className="py-24 lg:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Pra quem é
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
            Escolas <span className="text-emerald-600">infantis e fundamental I</span>
            <br />
            de 50 a 500 alunos
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Bilíngues, religiosas, montessorianas, tradicionais — a Semente se adapta ao
            seu projeto pedagógico.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {personas.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.titulo}
                className="rounded-2xl border bg-card p-7 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-12 w-12 rounded-xl bg-gradient-to-br ${p.cor} text-white flex items-center justify-center shadow-md`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg">{p.titulo}</h3>
                </div>
                <p className="mt-3 text-muted-foreground">{p.desc}</p>
                <ul className="mt-4 space-y-2">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
