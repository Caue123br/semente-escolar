"use client";

import { Quote, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

const depos = [
  {
    nome: "Renata Andrade",
    cargo: "Diretora — Escola Semente Feliz",
    cidade: "São Paulo / SP",
    alunos: "228 alunos",
    texto:
      "Em 6 meses cortamos a inadimplência em mais da metade e finalmente sei, todo dia, como está a saúde financeira da escola. O cockpit virou meu café da manhã.",
    nota: 5,
    cor: "bg-emerald-100 text-emerald-700",
  },
  {
    nome: "Cláudio Vasconcelos",
    cargo: "Coordenador Pedagógico — Mundo Encantado",
    cidade: "Belo Horizonte / MG",
    alunos: "140 alunos",
    texto:
      "Pela 1ª vez consigo mostrar aos pais a evolução real do filho com gráficos que eles entendem. O alerta de estagnação me ajuda a agir antes do problema crescer.",
    nota: 5,
    cor: "bg-blue-100 text-blue-700",
  },
  {
    nome: "Patrícia Mendonça",
    cargo: "Dona — Pequeno Mestre Bilíngue",
    cidade: "Curitiba / PR",
    alunos: "95 alunos",
    texto:
      "Saí de 7 sistemas diferentes para 1 só. Minha equipe ganhou tempo, os pais elogiam o app, e eu durmo tranquila sabendo que tudo está sincronizado.",
    nota: 5,
    cor: "bg-amber-100 text-amber-700",
  },
];

export function LandingDepoimentos() {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            O que dizem nossas escolas
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
            Resultados reais.
            <br />
            <span className="text-muted-foreground">Não promessas.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {depos.map((d) => (
            <div
              key={d.nome}
              className="relative rounded-2xl border bg-card p-7 hover:shadow-xl transition-all"
            >
              <Quote className="absolute top-5 right-5 h-8 w-8 text-emerald-100" />

              <div className="flex gap-0.5 text-amber-500">
                {Array.from({ length: d.nota }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>

              <p className="mt-4 text-foreground leading-relaxed">"{d.texto}"</p>

              <div className="mt-6 pt-5 border-t flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className={d.cor + " font-semibold"}>
                    {initials(d.nome)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">{d.nome}</div>
                  <div className="text-xs text-muted-foreground">{d.cargo}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.cidade} · {d.alunos}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
