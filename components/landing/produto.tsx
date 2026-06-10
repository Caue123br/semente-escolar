"use client";

import {
  Banknote,
  GraduationCap,
  MessageCircle,
  Target,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const screenshots = [
  {
    id: "financeiro",
    icon: Banknote,
    titulo: "Régua de inadimplência",
    desc: "Veja quem deve, quantos dias, e cobre via WhatsApp num clique. Renegocie com a proposta sendo gerada na hora.",
    bullets: [
      "Disparo automático D+3, D+7, D+15",
      "Templates aprovados pelo WhatsApp",
      "Pix QR gerado por cobrança",
      "Renegociação com parcelas e desconto",
    ],
    visual: (
      <div className="rounded-xl border bg-card shadow-xl p-4 space-y-2">
        {[
          { nome: "Mariana Almeida", aluno: "Sofia · Jardim II - A", valor: "R$ 2.870", dias: 45, faixa: "Crítico", cor: "bg-rose-500", badge: "bg-rose-100 text-rose-700" },
          { nome: "Patrícia Costa", aluno: "Manuela · Jardim II - A", valor: "R$ 2.870", dias: 25, faixa: "Atenção", cor: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
          { nome: "Daniela Carvalho", aluno: "Bernardo · 1º Ano - A", valor: "R$ 2.670", dias: 12, faixa: "Recente", cor: "bg-amber-500", badge: "bg-amber-100 text-amber-700" },
        ].map((p) => (
          <div key={p.nome} className="flex items-center gap-3 rounded-lg border p-3">
            <div className={`h-9 w-9 rounded-full ${p.badge} flex items-center justify-center text-xs font-bold`}>
              {p.nome.split(" ").slice(0, 2).map((w) => w[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{p.nome}</div>
              <div className="text-xs text-muted-foreground">{p.aluno}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold">{p.valor}</div>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${p.cor}`} />
                <span className="text-xs text-muted-foreground">{p.dias}d · {p.faixa}</span>
              </div>
            </div>
            <button className="text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-md whitespace-nowrap">
              📱 Cobrar
            </button>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "pedagogico",
    icon: GraduationCap,
    titulo: "Evolução visual por aluno",
    desc: "Avaliação bimestral com 4 competências, gráfico de linha e radar. O pai entende, o professor explica.",
    bullets: [
      "Escala de psicogênese da escrita",
      "Linha de evolução por bimestre",
      "Radar comparativo de competências",
      "Alerta automático de estagnação",
    ],
    visual: (
      <div className="rounded-xl border bg-card shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-muted-foreground">Sofia Almeida Souza</div>
            <div className="text-lg font-bold">Linha de evolução</div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-lime-100 text-lime-700 font-semibold">
            Silábico-alfabético
          </span>
        </div>
        {/* Gráfico mock SVG */}
        <svg viewBox="0 0 320 140" className="w-full">
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {[0, 35, 70, 105].map((y) => (
            <line key={y} x1="30" x2="320" y1={y + 10} y2={y + 10} stroke="#e5e7eb" strokeDasharray="2 2" />
          ))}
          {/* Y labels */}
          {["Pleno", "Bom", "Em dsv.", "Iniciante"].map((l, i) => (
            <text key={l} x="2" y={i * 35 + 14} className="fill-muted-foreground" style={{ fontSize: 9 }}>
              {l}
            </text>
          ))}
          {/* Linhas */}
          <path d="M 50 90 L 130 70 L 210 45 L 290 20" stroke="#3b82f6" strokeWidth="2.5" fill="none" />
          <path d="M 50 90 L 130 70 L 210 45 L 290 20 L 290 110 L 50 110 Z" fill="url(#g1)" />
          <path d="M 50 75 L 130 55 L 210 30 L 290 15" stroke="#a855f7" strokeWidth="2" fill="none" strokeDasharray="3 2" />
          {/* Pontos */}
          {[[50, 90], [130, 70], [210, 45], [290, 20]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.5" fill="#3b82f6" />
          ))}
          {/* X labels */}
          {["1º bim", "2º bim", "3º bim", "4º bim"].map((l, i) => (
            <text key={l} x={50 + i * 80} y="130" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>
              {l}
            </text>
          ))}
        </svg>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Leitura</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500" /> Escrita</div>
        </div>
      </div>
    ),
  },
  {
    id: "whatsapp",
    icon: MessageCircle,
    titulo: "WhatsApp integrado de verdade",
    desc: "12 grupos de turma sincronizados, campanhas em massa e cobrança automática conectada à régua.",
    bullets: [
      "1 grupo por turma — todos sincronizados",
      "Campanhas em massa segmentadas",
      "Templates aprovados pelo WhatsApp",
      "Read receipts e taxa de entrega",
    ],
    visual: (
      <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-white shadow-xl p-5 space-y-2">
        {[
          { de: "Sistema", para: "Mariana Almeida", tipo: "Cobrança", texto: "Olá Mariana! A mensalidade de Sofia (R$ 2.870) venceu há 25 dias...", hora: "14:32", lida: true },
          { de: "Sistema", para: "Grupo Jardim II - A", tipo: "Comunicado", texto: "Boa noite famílias! Lembrete da reunião de pais quinta-feira às 19h...", hora: "13:15", lida: true },
          { de: "Sistema", para: "Grupo 1º Ano - A", tipo: "Aviso", texto: "Famílias, passeio ao Zoológico dia 19/06. Confirmem presença...", hora: "10:20", lida: false },
        ].map((m, i) => (
          <div key={i} className="rounded-lg bg-card border p-3 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                {m.tipo}
              </span>
              <span className="font-semibold text-xs">{m.para}</span>
              <span className="ml-auto text-xs text-muted-foreground">{m.hora}</span>
            </div>
            <div className="text-xs text-muted-foreground line-clamp-1">{m.texto}</div>
            <div className="text-xs mt-1 text-emerald-600 font-semibold">
              {m.lida ? "✓✓ Lida" : "✓ Entregue"}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "crm",
    icon: Target,
    titulo: "Captação que vira matrícula",
    desc: "Funil de 7 estágios, origem dos leads, e conversão acompanhada — sua escola enche sozinha.",
    bullets: [
      "Funil Kanban com 7 estágios",
      "Origem (Instagram, indicação, etc)",
      "Pipeline de R$ potencial em tempo real",
      "Follow-up automático",
    ],
    visual: (
      <div className="rounded-xl border bg-card shadow-xl p-4">
        <div className="grid grid-cols-7 gap-1.5 text-[10px]">
          {[
            { label: "Lead", count: 2, bg: "bg-slate-100", border: "border-slate-400" },
            { label: "Contato", count: 1, bg: "bg-blue-50", border: "border-blue-400" },
            { label: "Visita", count: 1, bg: "bg-cyan-50", border: "border-cyan-400" },
            { label: "Realizada", count: 1, bg: "bg-purple-50", border: "border-purple-400" },
            { label: "Proposta", count: 1, bg: "bg-amber-50", border: "border-amber-400" },
            { label: "Matr.", count: 1, bg: "bg-emerald-50", border: "border-emerald-500" },
            { label: "Perdido", count: 1, bg: "bg-rose-50", border: "border-rose-400" },
          ].map((s) => (
            <div key={s.label} className={`rounded border-t-2 ${s.border} ${s.bg} p-2 min-h-[120px]`}>
              <div className="text-[9px] font-bold uppercase">{s.label}</div>
              <div className="text-lg font-bold mt-1">{s.count}</div>
              <div className="mt-2 space-y-1">
                {Array.from({ length: s.count }).map((_, i) => (
                  <div key={i} className="rounded bg-white border p-1.5 text-[9px]">
                    <div className="font-semibold truncate">Lead {i + 1}</div>
                    <div className="text-muted-foreground">3 anos</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 mt-4 gap-2 text-center text-xs">
          <div className="rounded-lg bg-muted/40 p-2">
            <div className="font-bold text-lg text-emerald-600">22%</div>
            <div className="text-[10px] text-muted-foreground">Conversão</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <div className="font-bold text-lg">R$ 2.820</div>
            <div className="text-[10px] text-muted-foreground">Ticket médio</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <div className="font-bold text-lg">8</div>
            <div className="text-[10px] text-muted-foreground">Visitas/mês</div>
          </div>
        </div>
      </div>
    ),
  },
];

export function LandingProduto() {
  return (
    <section className="py-24 lg:py-32 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Tour pelo produto
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
            Conheça as telas que mais
            <br />
            <span className="text-emerald-600">salvam o seu dia</span>
          </h2>
        </div>

        <div className="space-y-24 lg:space-y-32">
          {screenshots.map((s, i) => {
            const Icon = s.icon;
            const reverse = i % 2 === 1;
            return (
              <div
                key={s.id}
                className={`grid lg:grid-cols-2 gap-10 items-center ${reverse ? "lg:[direction:rtl]" : ""}`}
              >
                <div className="lg:[direction:ltr]">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold">
                    <Icon className="h-3.5 w-3.5" />
                    {s.titulo}
                  </div>
                  <h3 className="mt-4 text-2xl md:text-4xl font-bold tracking-tight">
                    {s.titulo}
                  </h3>
                  <p className="mt-3 text-lg text-muted-foreground">{s.desc}</p>
                  <ul className="mt-6 space-y-2.5">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm">
                        <Sparkles className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/cockpit"
                    className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Ver na demonstração <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="lg:[direction:ltr]">{s.visual}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
