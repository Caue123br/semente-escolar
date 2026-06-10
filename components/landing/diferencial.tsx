"use client";

import { TrendingUp, GraduationCap, ArrowRight, Sparkles } from "lucide-react";

export function LandingDiferencial() {
  return (
    <section id="diferencial" className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-emerald-50/30 to-background dark:via-emerald-950/10" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-700 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            O diferencial Semente
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-4xl mx-auto leading-tight">
            Pela 1ª vez, <span className="text-emerald-600">financeiro</span> e{" "}
            <span className="text-emerald-600">pedagógico</span>
            <br />conversam no mesmo dashboard
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            Enquanto outros sistemas tratam essas áreas como ilhas, na Semente elas estão
            entrelaçadas. Você decide com a foto completa.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-stretch">
          {/* Card Financeiro */}
          <div className="group relative rounded-2xl border bg-card p-8 shadow-sm hover:shadow-xl transition-all">
            <div className="absolute -top-3 left-8 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
              <TrendingUp className="h-3 w-3" /> ADMINISTRATIVO
            </div>
            <h3 className="text-2xl font-bold mt-2">Pare de descobrir tarde</h3>
            <p className="mt-2 text-muted-foreground">
              Régua de inadimplência automática, cobrança via WhatsApp em 1 clique,
              renegociação guiada — e o dono vê em tempo real o que entra e o que falta.
            </p>

            {/* Mini visual financeiro */}
            <div className="mt-6 space-y-2">
              {[
                { nome: "Mariana Almeida", aluno: "Sofia · Jardim II", dias: 45, cor: "bg-rose-500" },
                { nome: "Patrícia Costa", aluno: "Manuela · Jardim II", dias: 25, cor: "bg-orange-500" },
                { nome: "Camila Pereira", aluno: "Heitor · Jardim II", dias: 12, cor: "bg-amber-500" },
              ].map((p) => (
                <div key={p.nome} className="flex items-center gap-3 rounded-lg border bg-background p-3 group-hover:border-emerald-200 transition-colors">
                  <div className={`h-2 w-2 rounded-full ${p.cor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.nome}</div>
                    <div className="text-xs text-muted-foreground">{p.aluno}</div>
                  </div>
                  <div className="text-xs font-semibold text-rose-600">{p.dias} dias</div>
                  <button className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                    Cobrar
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Card Pedagógico */}
          <div className="group relative rounded-2xl border bg-card p-8 shadow-sm hover:shadow-xl transition-all">
            <div className="absolute -top-3 left-8 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
              <GraduationCap className="h-3 w-3" /> PEDAGÓGICO
            </div>
            <h3 className="text-2xl font-bold mt-2">Veja o crescimento de cada aluno</h3>
            <p className="mt-2 text-muted-foreground">
              Avaliação bimestral por competências, linha de evolução visual, alerta de
              estagnação — informações que professores entendem e pais valorizam.
            </p>

            {/* Mini visual pedagógico */}
            <div className="mt-6 rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold">Sofia Almeida</div>
                  <div className="text-xs text-muted-foreground">Jardim II - A</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-lime-100 text-lime-700 font-semibold">
                  Silábico-alfabético
                </span>
              </div>

              {/* Linha de evolução mini */}
              <div className="relative h-20">
                <div className="absolute inset-x-0 bottom-0 grid grid-cols-4 gap-2 items-end h-full">
                  {[
                    { bim: "1º", h: 25 },
                    { bim: "2º", h: 45 },
                    { bim: "3º", h: 65 },
                    { bim: "4º", h: 85 },
                  ].map((p) => (
                    <div key={p.bim} className="flex flex-col items-center justify-end h-full">
                      <div
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t"
                        style={{ height: `${p.h}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground mt-1">{p.bim} bim</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Competências */}
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[10px]">
                {[
                  { l: "Leitura", v: 3 },
                  { l: "Escrita", v: 3 },
                  { l: "Lógica", v: 4 },
                  { l: "Oralidade", v: 4 },
                ].map((c) => (
                  <div key={c.l}>
                    <div className="text-muted-foreground">{c.l}</div>
                    <div className="font-bold mt-0.5">{c.v}/4</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Conexão */}
        <div className="mt-12 max-w-3xl mx-auto rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 md:p-10 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold">
                E quando os dois lados conversam, decisões ficam óbvias
              </h3>
              <p className="mt-2 text-white/90 leading-relaxed">
                "A Heitor está estagnado pedagogicamente E os pais estão inadimplentes há 30 dias.
                A coordenação chama a família para uma reunião — pedagógica e financeira ao mesmo
                tempo." Esse é o tipo de insight que só a Semente entrega.
              </p>
              <a
                href="#modulos"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
              >
                Ver todos os módulos <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
