"use client";

import {
  LayoutDashboard,
  Banknote,
  GraduationCap,
  Users,
  MessageSquare,
  Trello,
  Package,
  ShoppingCart,
  FileText,
  Briefcase,
  Calendar,
  UtensilsCrossed,
  Bus,
  BookOpen,
  Baby,
  Target,
  Megaphone,
  BarChart3,
  Settings,
  Building2,
  CalendarCheck,
  Activity,
  Heart,
  Shield,
} from "lucide-react";

const modulos = [
  { icon: LayoutDashboard, nome: "Cockpit", desc: "Saúde do negócio num piscar de olhos", cor: "from-blue-500 to-cyan-500" },
  { icon: Banknote, nome: "Financeiro", desc: "Faturamento, fluxo de caixa e DRE", cor: "from-emerald-500 to-teal-500" },
  { icon: GraduationCap, nome: "Pedagógico", desc: "Avaliação por competências e psicogênese", cor: "from-violet-500 to-purple-500" },
  { icon: Users, nome: "Alunos", desc: "Cadastro, matrícula, responsáveis e saúde", cor: "from-pink-500 to-rose-500" },
  { icon: MessageSquare, nome: "WhatsApp", desc: "Grupos, avisos e cobrança automática", cor: "from-green-500 to-emerald-500" },
  { icon: Trello, nome: "Kanban", desc: "Quadro por turma com drag-and-drop", cor: "from-amber-500 to-orange-500" },
  { icon: Package, nome: "Estoque", desc: "Consumo + Venda em um só lugar", cor: "from-orange-500 to-red-500" },
  { icon: ShoppingCart, nome: "Vendas (PDV)", desc: "Uniforme, alimentação, eventos", cor: "from-fuchsia-500 to-pink-500" },
  { icon: FileText, nome: "Nota Fiscal", desc: "NFS-e automática com certificado A1", cor: "from-indigo-500 to-violet-500" },
  { icon: Briefcase, nome: "RH & Folha", desc: "Equipe, salários, férias, holerites", cor: "from-cyan-500 to-blue-500" },
  { icon: Target, nome: "Captação (CRM)", desc: "Funil de matrículas com 7 estágios", cor: "from-rose-500 to-pink-500" },
  { icon: Calendar, nome: "Calendário", desc: "Eventos, festas, reuniões, feriados", cor: "from-purple-500 to-fuchsia-500" },
  { icon: UtensilsCrossed, nome: "Cardápio", desc: "Refeições + restrições alimentares", cor: "from-amber-500 to-yellow-500" },
  { icon: Bus, nome: "Transporte", desc: "Rotas, motoristas e monitoras", cor: "from-yellow-500 to-amber-500" },
  { icon: BookOpen, nome: "Biblioteca", desc: "Acervo, empréstimos e atrasados", cor: "from-teal-500 to-cyan-500" },
  { icon: Baby, nome: "Berçário", desc: "Rotina dos bebês — sono, troca, comida", cor: "from-pink-400 to-pink-600" },
  { icon: Megaphone, nome: "Mural", desc: "Comunicados internos e da equipe", cor: "from-red-500 to-orange-500" },
  { icon: Heart, nome: "Portal dos Pais", desc: "App para responsáveis acompanharem", cor: "from-rose-400 to-pink-500" },
  { icon: BarChart3, nome: "Relatórios", desc: "Gerenciais, financeiros e pedagógicos", cor: "from-sky-500 to-blue-500" },
  { icon: Activity, nome: "Frequência", desc: "Chamada digital + relatório mensal", cor: "from-lime-500 to-green-500" },
  { icon: CalendarCheck, nome: "Reservas", desc: "Auditório, salas e brinquedoteca", cor: "from-violet-400 to-purple-500" },
  { icon: Building2, nome: "Patrimônio", desc: "Bens, manutenção e ordens de serviço", cor: "from-slate-500 to-gray-600" },
  { icon: Settings, nome: "Configurações", desc: "Escola, usuários, integrações", cor: "from-zinc-500 to-slate-600" },
  { icon: Shield, nome: "LGPD & Auditoria", desc: "Consentimentos e log completo", cor: "from-emerald-600 to-teal-700" },
];

export function LandingModulos() {
  return (
    <section id="modulos" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            24 módulos · 100+ telas
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
            Tudo que sua escola precisa.
            <br className="hidden md:inline" />
            <span className="text-muted-foreground">Sem precisar de mais nada.</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Você compra um único sistema, treina sua equipe uma única vez, e nunca mais
            precisa pular entre planilhas, apps e prestadores.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {modulos.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.nome}
                className="group relative rounded-xl border bg-card p-5 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer overflow-hidden"
              >
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-[0.04] bg-gradient-to-br ${m.cor} transition-opacity`}
                />
                <div
                  className={`relative h-11 w-11 rounded-lg bg-gradient-to-br ${m.cor} flex items-center justify-center text-white shadow-sm mb-3`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="relative font-semibold text-sm">{m.nome}</div>
                <div className="relative text-xs text-muted-foreground mt-1 leading-snug">
                  {m.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
