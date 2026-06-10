"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Sprout,
  ArrowRight,
  Crown,
  ClipboardList,
  GraduationCap,
  Banknote,
  Building2,
  Building,
  AlertTriangle,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Cenario = "pequena" | "media" | "grande" | "crise";
type Perfil = "diretor" | "coordenador" | "professor";

const cenarios = [
  {
    id: "pequena" as Cenario,
    nome: "Escola pequena",
    desc: "50–80 alunos. Só dona, 1 coordenadora, 4 professoras.",
    icon: Building,
    cor: "border-emerald-300 bg-emerald-50",
    detalhe: "Foque em: simplicidade, financeiro básico, WhatsApp.",
  },
  {
    id: "media" as Cenario,
    nome: "Escola média (ideal)",
    desc: "150–250 alunos. Diretora, 2 coordenadoras, 12 professoras.",
    icon: Building2,
    cor: "border-blue-300 bg-blue-50",
    detalhe: "Mostre: cockpit + insight, CRM, RH, app dos pais.",
    destaque: true,
  },
  {
    id: "grande" as Cenario,
    nome: "Escola grande",
    desc: "300–500 alunos. Multi-coordenação, equipe completa.",
    icon: Building,
    cor: "border-violet-300 bg-violet-50",
    detalhe: "Mostre: relatórios, integrações, multi-unidade.",
  },
  {
    id: "crise" as Cenario,
    nome: "Em crise (inadimplência alta)",
    desc: "Mostra como a Semente salva uma escola com 25% de inadimplência.",
    icon: AlertTriangle,
    cor: "border-rose-300 bg-rose-50",
    detalhe: "Régua de inadimplência, renegociação, conciliação.",
  },
];

const perfis = [
  {
    id: "diretor" as Perfil,
    nome: "Diretora / Dona",
    icone: Crown,
    cor: "text-amber-600",
    desc: "Vê tudo: financeiro, pedagógico, RH, captação.",
  },
  {
    id: "coordenador" as Perfil,
    nome: "Coordenadora Pedagógica",
    icone: ClipboardList,
    cor: "text-blue-600",
    desc: "Vê pedagógico + administrativo, sem decisão financeira.",
  },
  {
    id: "professor" as Perfil,
    nome: "Professora",
    icone: GraduationCap,
    cor: "text-emerald-600",
    desc: "Vê só o pedagógico das suas turmas + kanban + chat com pais.",
  },
];

const fluxos = [
  { titulo: "Tour Cockpit (5 min)", desc: "Visão geral + insight do dia + alertas", url: "/cockpit" },
  { titulo: "Financeiro completo (8 min)", desc: "Inadimplência → cobrar → conciliar", url: "/financeiro" },
  { titulo: "Pedagógico diferencial (6 min)", desc: "Evolução visual de aluno + radar", url: "/pedagogico" },
  { titulo: "WhatsApp Business (4 min)", desc: "Grupos, campanha e templates", url: "/whatsapp" },
  { titulo: "CRM de matrículas (5 min)", desc: "Funil de captação + origem", url: "/crm" },
  { titulo: "RH & Folha (4 min)", desc: "Equipe, salários, avaliação", url: "/rh" },
];

export default function DemoPage() {
  const [cenario, setCenario] = React.useState<Cenario>("media");
  const [perfil, setPerfil] = React.useState<Perfil>("diretor");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md">
              <Sprout className="h-5 w-5" />
            </div>
            <span className="font-bold">Semente · Demo</span>
          </Link>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/cockpit">Entrar no sistema agora</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold mb-4">
            <Sparkles className="h-3 w-3" />
            Modo demonstração
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Configure sua demonstração
          </h1>
          <p className="mt-3 text-muted-foreground">
            Escolha o cenário e o perfil que mais combina com sua escola. A demonstração
            se adapta — você vê exatamente o que faria sentido no seu dia a dia.
          </p>
        </div>

        {/* Passo 1 - cenário */}
        <Card className="p-6 mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">
            Passo 1 · Tamanho da escola
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cenarios.map((c) => {
              const Icon = c.icon;
              const ativo = cenario === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCenario(c.id)}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all relative",
                    ativo
                      ? "border-emerald-500 shadow-md bg-emerald-50/50"
                      : "border-border hover:border-emerald-200"
                  )}
                >
                  {c.destaque && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-md">
                      <Sparkles className="h-2.5 w-2.5" /> Recomendado
                    </span>
                  )}
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                        c.cor
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{c.nome}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.desc}
                      </div>
                      {ativo && (
                        <div className="mt-2 text-xs text-emerald-700 font-medium">
                          ✓ {c.detalhe}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Passo 2 - perfil */}
        <Card className="p-6 mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">
            Passo 2 · Seu papel na escola
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {perfis.map((p) => {
              const Ic = p.icone;
              const ativo = perfil === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPerfil(p.id)}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    ativo
                      ? "border-emerald-500 shadow-md bg-emerald-50/50"
                      : "border-border hover:border-emerald-200"
                  )}
                >
                  <Ic className={cn("h-5 w-5 mb-2", p.cor)} />
                  <div className="font-semibold text-sm">{p.nome}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Passo 3 - fluxo */}
        <Card className="p-6 mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
            Passo 3 · Por onde começar
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Sugestões de tour. Cada item leva direto pra tela escolhida.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {fluxos.map((f) => (
              <Link
                key={f.titulo}
                href={f.url}
                className="flex items-center gap-3 rounded-lg border p-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors group"
              >
                <div className="h-9 w-9 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{f.titulo}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-700 transition-colors" />
              </Link>
            ))}
          </div>
        </Card>

        {/* CTA Grande */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white p-8 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold">Pronto pra começar?</h2>
            <p className="mt-2 text-emerald-100">
              Cenário: <strong>{cenarios.find((c) => c.id === cenario)?.nome}</strong> ·
              Perfil: <strong>{perfis.find((p) => p.id === perfil)?.nome}</strong>
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 bg-white text-emerald-700 hover:bg-emerald-50"
            >
              <Link href="/cockpit">
                Entrar na demonstração
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
