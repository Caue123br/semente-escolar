import Link from "next/link";
import { Sprout, Heart, Target, Sparkles, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LandingFooter } from "@/components/landing/footer";

const valores = [
  {
    icon: Heart,
    cor: "from-rose-500 to-rose-700",
    titulo: "Acreditamos em educação infantil",
    desc: "Os primeiros 6 anos definem quem somos. Construímos um produto que respeita esse momento sagrado.",
  },
  {
    icon: Target,
    cor: "from-emerald-500 to-emerald-700",
    titulo: "Dados pra decidir, não pra impressionar",
    desc: "Não fazemos relatório bonito. Fazemos relatório que vira ação. Insight do dia é um exemplo disso.",
  },
  {
    icon: Sparkles,
    cor: "from-blue-500 to-blue-700",
    titulo: "Conectamos pedagógico e financeiro",
    desc: "Tratar essas áreas como ilhas é o erro do setor. Decisões boas vêm da visão completa.",
  },
  {
    icon: Users,
    cor: "from-amber-500 to-amber-700",
    titulo: "Time pequeno, foco enorme",
    desc: "Somos 12 pessoas. Falamos com cliente todo dia. Cada feature é debatida com escolas reais antes de existir.",
  },
];

const time = [
  { nome: "Cauê Oliveira", cargo: "CEO & Fundador", iniciais: "CO", cor: "bg-emerald-100 text-emerald-700" },
  { nome: "Mariana Silva", cargo: "CTO", iniciais: "MS", cor: "bg-blue-100 text-blue-700" },
  { nome: "Roberta Lima", cargo: "Head de Pedagógico", iniciais: "RL", cor: "bg-amber-100 text-amber-700" },
  { nome: "Pedro Andrade", cargo: "Head de Vendas", iniciais: "PA", cor: "bg-violet-100 text-violet-700" },
  { nome: "Camila Souza", cargo: "Customer Success", iniciais: "CS", cor: "bg-rose-100 text-rose-700" },
  { nome: "Lucas Rocha", cargo: "Engenharia", iniciais: "LR", cor: "bg-cyan-100 text-cyan-700" },
];

export default function SobrePage() {
  return (
    <div className="bg-background">
      {/* Navbar simplificada */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="font-bold">Semente</span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/sobre" className="text-foreground font-medium">Sobre</Link>
            <Link href="/cases" className="hover:text-foreground">Cases</Link>
            <Link href="/calculadora" className="hover:text-foreground">Calculadora</Link>
            <Link href="/ajuda" className="hover:text-foreground">Ajuda</Link>
          </nav>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/cockpit">Ver demonstração</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50/40 via-transparent to-transparent" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold mb-4">
            <Heart className="h-3 w-3" />
            Manifesto
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Existimos porque{" "}
            <span className="text-emerald-600">criança merece tempo de qualidade</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed">
            Em 2023, vimos dezenas de donas de escola infantil exaustas — virando até 1h
            da manhã pra fechar a planilha financeira e ao mesmo tempo tentando lembrar
            qual aluno precisa de atenção pedagógica especial. <strong className="text-foreground">Esse não
            deveria ser o trabalho delas.</strong> Trabalho delas é cuidar de criança.
          </p>
          <p className="mt-4 text-lg text-muted-foreground">
            A Semente nasceu pra ser o sistema operacional dessas escolas — devolvendo
            tempo, clareza e poder de decisão pra quem educa a próxima geração.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-muted/30 border-y">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: "2023", l: "Fundada em" },
            { v: "200+", l: "Escolas atendidas" },
            { v: "45 mil", l: "Crianças impactadas" },
            { v: "12", l: "Pessoas no time" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-3xl md:text-4xl font-bold text-emerald-700">{s.v}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Valores */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Nossos valores
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              O que nos guia todo dia
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {valores.map((v) => {
              const Icon = v.icon;
              return (
                <Card key={v.titulo} className="p-6 hover:shadow-lg transition-shadow">
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${v.cor} text-white shadow-md mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-xl">{v.titulo}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">{v.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Time */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Nosso time
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">
              Gente boa que ama educação
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {time.map((p) => (
              <Card key={p.nome} className="p-4 text-center">
                <div className={`h-16 w-16 rounded-full ${p.cor} flex items-center justify-center text-lg font-bold mx-auto mb-3`}>
                  {p.iniciais}
                </div>
                <div className="font-semibold text-sm">{p.nome}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.cargo}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Vamos cuidar da sua escola juntos?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Comece com 14 dias grátis. Sem cartão. Sem fidelidade.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/cockpit">
                Ver demonstração ao vivo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/calculadora">Calcular meu ROI</Link>
            </Button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
