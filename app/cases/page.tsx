import Link from "next/link";
import {
  Sprout,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Clock,
  Heart,
  Star,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LandingFooter } from "@/components/landing/footer";

const cases = [
  {
    escola: "Escola Semente Feliz",
    cidade: "São Paulo / SP",
    porte: "228 alunos · Berçário ao 5º Ano",
    iniciais: "SF",
    cor: "bg-emerald-500",
    desafio:
      "Inadimplência crescente (R$ 78K/mês), 3 sistemas separados (Excel, Sponte e ClassApp), zero visibilidade pedagógica entre coordenação e direção.",
    solucao:
      "Migração completa para Semente em 5 dias. Régua de inadimplência ativa em dia 1. Avaliação pedagógica digitalizada por bimestre. App dos pais lançado em 30 dias.",
    resultado: [
      { icon: TrendingDown, label: "Inadimplência", valor: "−45%", cor: "text-emerald-600" },
      { icon: Clock, label: "Tempo em planilhas", valor: "−83%", cor: "text-emerald-600" },
      { icon: Heart, label: "NPS dos pais", valor: "+39 pts", cor: "text-emerald-600" },
      { icon: TrendingUp, label: "Conversão de matrículas", valor: "+144%", cor: "text-emerald-600" },
    ],
    citacao:
      "A coordenação me trazia ‘achismo’. Hoje me traz dados. Aprovei contratar mais uma professora para o Maternal só de ver a projeção de capacidade do Semente.",
    autor: "Renata Andrade",
    cargo: "Diretora",
    foto: "RA",
    fotoCor: "bg-emerald-100 text-emerald-700",
    estrelas: 5,
  },
  {
    escola: "Mundo Encantado",
    cidade: "Belo Horizonte / MG",
    porte: "140 alunos · Berçário ao Jardim II",
    iniciais: "ME",
    cor: "bg-blue-500",
    desafio:
      "Coordenação pedagógica gastava 12h/semana montando boletim manual. Direção não conseguia explicar aos pais por que alguns alunos não evoluíam.",
    solucao:
      "Implantação do módulo Pedagógico com avaliação por psicogênese. Linha de evolução visual gerada automaticamente. Alerta de estagnação ativo desde o início.",
    resultado: [
      { icon: Clock, label: "Tempo de boletins", valor: "−92%", cor: "text-emerald-600" },
      { icon: TrendingUp, label: "Reuniões de pais", valor: "+60% adesão", cor: "text-emerald-600" },
      { icon: Heart, label: "Famílias engajadas", valor: "94%", cor: "text-emerald-600" },
      { icon: TrendingDown, label: "Estagnação não detectada", valor: "−100%", cor: "text-emerald-600" },
    ],
    citacao:
      "Pela 1ª vez consigo mostrar pra família como o filho dela está progredindo de verdade. Antes era ‘ele tá bem, fica tranquila’. Hoje é gráfico, dado e plano de ação.",
    autor: "Cláudio Vasconcelos",
    cargo: "Coordenador Pedagógico",
    foto: "CV",
    fotoCor: "bg-blue-100 text-blue-700",
    estrelas: 5,
  },
  {
    escola: "Pequeno Mestre Bilíngue",
    cidade: "Curitiba / PR",
    porte: "95 alunos · Maternal ao 3º Ano · Bilíngue",
    iniciais: "PM",
    cor: "bg-amber-500",
    desafio:
      "Usavam 7 sistemas diferentes (Sponte, ClassApp, Conta Azul, Bling, Trello, Google Drive, WhatsApp). Equipe perdia 20h/semana copiando dado de um pro outro.",
    solucao:
      "Consolidação total no Semente. CRM de captação ativado, app dos pais lançado, NFS-e automatizada. Treinamento presencial de 1 dia para a equipe inteira.",
    resultado: [
      { icon: TrendingDown, label: "Sistemas em uso", valor: "7 → 1", cor: "text-emerald-600" },
      { icon: Clock, label: "Horas/semana economizadas", valor: "20h", cor: "text-emerald-600" },
      { icon: TrendingUp, label: "Novas matrículas/mês", valor: "+180%", cor: "text-emerald-600" },
      { icon: Heart, label: "Satisfação equipe interna", valor: "9,4/10", cor: "text-emerald-600" },
    ],
    citacao:
      "Eu durmo tranquila agora. Antes era pesadelo: ‘será que emiti todas as NF?’, ‘será que cobrei todo mundo?’. Hoje o Semente faz isso sozinho.",
    autor: "Patrícia Mendonça",
    cargo: "Dona",
    foto: "PM",
    fotoCor: "bg-amber-100 text-amber-700",
    estrelas: 5,
  },
];

export default function CasesPage() {
  return (
    <div className="bg-background">
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
            <Link href="/sobre" className="hover:text-foreground">Sobre</Link>
            <Link href="/cases" className="text-foreground font-medium">Cases</Link>
            <Link href="/calculadora" className="hover:text-foreground">Calculadora</Link>
            <Link href="/ajuda" className="hover:text-foreground">Ajuda</Link>
          </nav>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/cockpit">Ver demonstração</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-28 text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold mb-4">
            <Star className="h-3 w-3" />
            Casos de sucesso
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Escolas que mudaram de patamar com a Semente
          </h1>
          <p className="mt-4 text-muted-foreground text-lg">
            Histórias reais, com números reais, contadas por quem viveu.
          </p>
        </div>
      </section>

      {/* Cases */}
      <section className="pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          {cases.map((c) => (
            <Card key={c.escola} className="overflow-hidden">
              {/* Header */}
              <div className="p-6 md:p-8 border-b">
                <div className="flex flex-wrap items-center gap-4">
                  <div className={`h-14 w-14 rounded-xl ${c.cor} text-white flex items-center justify-center text-lg font-bold shadow-md`}>
                    {c.iniciais}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold tracking-tight">{c.escola}</h2>
                    <div className="text-sm text-muted-foreground">
                      {c.cidade} · {c.porte}
                    </div>
                  </div>
                  <div className="flex gap-0.5 text-amber-500">
                    {Array.from({ length: c.estrelas }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Desafio / Solução / Resultados */}
              <div className="grid md:grid-cols-2 gap-6 p-6 md:p-8 border-b">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-2">
                    🚨 O desafio
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {c.desafio}
                  </p>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                    ✨ A solução Semente
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {c.solucao}
                  </p>
                </div>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 md:p-8 bg-muted/30 border-b">
                {c.resultado.map((r) => {
                  const Icon = r.icon;
                  return (
                    <div key={r.label} className="text-center">
                      <Icon className={`h-5 w-5 mx-auto ${r.cor}`} />
                      <div className={`mt-2 text-2xl font-bold ${r.cor}`}>{r.valor}</div>
                      <div className="text-[10px] uppercase text-muted-foreground mt-0.5">
                        {r.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Citação */}
              <div className="p-6 md:p-8 relative">
                <Quote className="absolute top-6 left-6 h-8 w-8 text-emerald-100" />
                <blockquote className="pl-10 italic text-lg leading-relaxed">
                  "{c.citacao}"
                </blockquote>
                <div className="mt-4 pl-10 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full ${c.fotoCor} flex items-center justify-center font-bold text-sm`}>
                    {c.foto}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{c.autor}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.cargo} · {c.escola}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white text-center">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Sua escola pode ser o próximo case
          </h2>
          <p className="mt-4 text-emerald-100">
            Resultados parecidos em 90 dias. Sem cartão de crédito pra começar.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50">
              <Link href="/cockpit">
                Ver demonstração ao vivo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10">
              <Link href="/calculadora">Calcular meu ROI</Link>
            </Button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
