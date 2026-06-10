"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sprout,
  Search,
  Rocket,
  Banknote,
  GraduationCap,
  MessageSquare,
  Settings,
  Shield,
  PlayCircle,
  FileText,
  MessageCircle,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LandingFooter } from "@/components/landing/footer";

const categorias = [
  {
    icon: Rocket,
    cor: "from-emerald-500 to-emerald-700",
    titulo: "Primeiros passos",
    artigos: 12,
    desc: "Como começar a usar a Semente",
  },
  {
    icon: Banknote,
    cor: "from-blue-500 to-blue-700",
    titulo: "Financeiro",
    artigos: 24,
    desc: "Mensalidades, cobrança, NF-e",
  },
  {
    icon: GraduationCap,
    cor: "from-violet-500 to-violet-700",
    titulo: "Pedagógico",
    artigos: 18,
    desc: "Avaliações, evolução, boletins",
  },
  {
    icon: MessageSquare,
    cor: "from-green-500 to-green-700",
    titulo: "WhatsApp e Comunicação",
    artigos: 14,
    desc: "Grupos, cobrança automática, templates",
  },
  {
    icon: Settings,
    cor: "from-amber-500 to-amber-700",
    titulo: "Configurações",
    artigos: 9,
    desc: "Usuários, integrações, personalização",
  },
  {
    icon: Shield,
    cor: "from-rose-500 to-rose-700",
    titulo: "LGPD e segurança",
    artigos: 7,
    desc: "Conformidade, backup, auditoria",
  },
];

const populares = [
  { titulo: "Como migrar dados do Sponte para Semente?", categoria: "Primeiros passos" },
  { titulo: "Como configurar a régua de inadimplência?", categoria: "Financeiro" },
  { titulo: "Como criar a primeira avaliação bimestral?", categoria: "Pedagógico" },
  { titulo: "Como integrar com WhatsApp Business API?", categoria: "WhatsApp" },
  { titulo: "Como emitir NFS-e automaticamente?", categoria: "Financeiro" },
  { titulo: "Como adicionar um novo professor?", categoria: "Configurações" },
  { titulo: "Como funciona o alerta de estagnação?", categoria: "Pedagógico" },
  { titulo: "Como exportar relatório financeiro mensal?", categoria: "Financeiro" },
];

const videos = [
  { titulo: "Tour completo da Semente em 8 minutos", duracao: "8:32" },
  { titulo: "Setup inicial: importando seus alunos", duracao: "4:15" },
  { titulo: "Régua de inadimplência na prática", duracao: "6:48" },
  { titulo: "Avaliação pedagógica por psicogênese", duracao: "11:20" },
];

export default function AjudaPage() {
  const [busca, setBusca] = React.useState("");

  return (
    <div className="bg-background">
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="font-bold">Semente · Ajuda</span>
          </Link>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/cockpit">Voltar ao sistema</Link>
          </Button>
        </div>
      </header>

      {/* Hero com busca */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 via-background to-background">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Como podemos ajudar?
          </h1>
          <p className="mt-3 text-muted-foreground">
            Busque por uma dúvida ou explore as categorias abaixo.
          </p>
          <div className="mt-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Ex: como cobrar inadimplentes via WhatsApp?"
              className="h-14 pl-12 text-base shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-6">Explore por categoria</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorias.map((c) => {
              const Icon = c.icon;
              return (
                <Card
                  key={c.titulo}
                  className="p-6 hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5"
                >
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.cor} text-white shadow-md mb-4`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold">{c.titulo}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
                  <div className="mt-3 text-xs font-medium text-emerald-700">
                    {c.artigos} artigos →
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mais populares + Vídeos */}
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10">
          {/* Populares */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Artigos mais lidos</h2>
            <div className="space-y-2">
              {populares.map((p) => (
                <button
                  key={p.titulo}
                  className="w-full flex items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-accent hover:border-emerald-200 transition-colors"
                >
                  <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{p.titulo}</div>
                    <div className="text-[10px] text-muted-foreground">{p.categoria}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          {/* Vídeos */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Vídeo tutoriais</h2>
            <div className="space-y-3">
              {videos.map((v) => (
                <button
                  key={v.titulo}
                  className="w-full flex items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-accent transition-colors"
                >
                  <div className="h-16 w-24 rounded-md bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shrink-0">
                    <PlayCircle className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{v.titulo}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      ⏱ {v.duracao}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold">Não achou o que procurava?</h2>
          <p className="mt-2 text-muted-foreground">
            Time de suporte respondendo em até 2 horas em horário comercial.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-5 hover:shadow-md transition-shadow">
              <MessageCircle className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
              <div className="font-semibold text-sm">Chat ao vivo</div>
              <div className="text-xs text-muted-foreground mt-0.5">Resposta &lt; 5 min</div>
            </Card>
            <Card className="p-5 hover:shadow-md transition-shadow">
              <Mail className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
              <div className="font-semibold text-sm">E-mail</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                suporte@semente.com.br
              </div>
            </Card>
            <Card className="p-5 hover:shadow-md transition-shadow">
              <Phone className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
              <div className="font-semibold text-sm">Telefone</div>
              <div className="text-xs text-muted-foreground mt-0.5">(11) 3333-4444</div>
            </Card>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
