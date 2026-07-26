"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  GraduationCap,
  ClipboardCheck,
  ListTodo,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { AlertasList } from "@/components/cockpit/alertas-list";
import { AntesDepois } from "@/components/cockpit/antes-depois";
import { DadosTesteButton } from "@/components/cockpit/dados-teste-button";
import { FaturamentoChart } from "@/components/cockpit/faturamento-chart";
import { IndicadorCard } from "@/components/cockpit/indicador-card";
import { InsightDoDia } from "@/components/cockpit/insight-do-dia";
import { ResumoPedagogico } from "@/components/cockpit/resumo-pedagogico";
import { Card } from "@/components/ui/card";
import { SeletorMes, usePeriodoMes } from "@/components/shared/seletor-mes";
import { podeAcessarModulo } from "@/lib/access-control";
import { PeriodoProvider } from "@/lib/contexto-periodo";
import { useEntidade } from "@/lib/data/store";
import { ultimasAvaliacoesPorAluno } from "@/lib/pedagogico";
import { usePerfil } from "@/lib/perfil-context";
import type { IndicadorCockpit } from "@/lib/mock-data/indicadores-cockpit";

const fmtBRL = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export default function CockpitPage() {
  const { perfil, nome, carregando: carregandoPerfil } = usePerfil();
  const perfilPronto = !carregandoPerfil;
  const ehProfessor = perfil === "professor";
  const podeFinanceiro = perfilPronto && podeAcessarModulo(perfil, "financeiro");
  const podeVendas = perfilPronto && podeAcessarModulo(perfil, "vendas");
  const podeDespesas = perfilPronto && podeAcessarModulo(perfil, "despesas");
  const podeAlunosGlobais =
    perfilPronto && !ehProfessor && podeAcessarModulo(perfil, "alunos");
  const podeKanbanGlobal =
    perfilPronto && !ehProfessor && podeAcessarModulo(perfil, "kanban");
  const podePedagogicoGlobal =
    perfilPronto && !ehProfessor && podeAcessarModulo(perfil, "pedagogico");

  const {
    items: alunos,
    carregando: carregandoAlunos,
    erro: erroAlunos,
    reset: recarregarAlunos,
  } = useEntidade("alunos", { habilitado: podeAlunosGlobais });
  const {
    items: mensalidades,
    carregando: carregandoMensalidades,
    erro: erroMensalidades,
    reset: recarregarMensalidades,
  } = useEntidade("mensalidades", { habilitado: podeFinanceiro });
  const {
    items: despesas,
    carregando: carregandoDespesas,
    erro: erroDespesas,
    reset: recarregarDespesas,
  } = useEntidade("despesas", { habilitado: podeDespesas });
  const {
    items: vendas,
    carregando: carregandoVendas,
    erro: erroVendas,
    reset: recarregarVendas,
  } = useEntidade("vendas", { habilitado: podeVendas });
  const {
    items: kanban,
    carregando: carregandoKanban,
    erro: erroKanban,
    reset: recarregarKanban,
  } = useEntidade("kanban", { habilitado: podeKanbanGlobal });
  const {
    items: avaliacoes,
    carregando: carregandoAvaliacoes,
    erro: erroAvaliacoes,
    reset: recarregarAvaliacoes,
  } = useEntidade("avaliacoes", { habilitado: podePedagogicoGlobal });

  const { periodo, setPeriodo, proximoMes, mesAnteriorAcao, irHoje } = usePeriodoMes();

  const alunosAtivos = alunos.filter((aluno) => aluno.status === "Ativo").length;
  const mensalidadesMes = mensalidades.filter(
    (mensalidade) => mensalidade.competencia === periodo.competencia
  );
  const vendasMes = vendas.filter(
    (venda) => venda.data >= periodo.inicio && venda.data <= periodo.fim
  );
  const despesasMes = despesas.filter(
    (despesa) => despesa.data >= periodo.inicio && despesa.data <= periodo.fim
  );
  const totalRecebido = mensalidadesMes
    .filter((mensalidade) => mensalidade.status === "Paga")
    .reduce((total, mensalidade) => total + (mensalidade.valorPago ?? mensalidade.valor), 0);
  const totalAReceber = mensalidadesMes
    .filter(
      (mensalidade) =>
        mensalidade.status === "A Vencer" || mensalidade.status === "Vence Hoje"
    )
    .reduce((total, mensalidade) => total + mensalidade.valor, 0);
  const mensalidadesAtrasadas = mensalidadesMes.filter(
    (mensalidade) => mensalidade.status === "Atrasada"
  );
  const totalInadimplencia = mensalidadesAtrasadas.reduce(
    (total, mensalidade) => total + mensalidade.valor,
    0
  );
  const totalFaturado = totalRecebido + totalAReceber + totalInadimplencia;
  const totalDespesas = despesasMes.reduce((total, despesa) => total + despesa.valor, 0);
  const totalVendasMes = vendasMes.reduce((total, venda) => total + venda.total, 0);
  const novasMatriculas = alunos.filter(
    (aluno) =>
      aluno.dataMatricula &&
      aluno.dataMatricula >= periodo.inicio &&
      aluno.dataMatricula <= periodo.fim
  ).length;

  const indicadoresFinanceiros: IndicadorCockpit[] = [
    {
      id: "faturamento",
      titulo: "Faturamento do mês",
      valor: fmtBRL(totalFaturado),
      valorNumerico: totalFaturado,
      status: totalRecebido / Math.max(totalFaturado, 1) > 0.85 ? "verde" : "amarelo",
      descricao: `${mensalidadesMes.length} mensalidades no período`,
      link: "/financeiro",
      icone: "TrendingUp",
    },
    {
      id: "recebido",
      titulo: "Recebido",
      valor: fmtBRL(totalRecebido),
      valorNumerico: totalRecebido,
      variacao: `${totalFaturado > 0 ? ((totalRecebido / totalFaturado) * 100).toFixed(0) : 0}%`,
      variacaoTipo: "positiva",
      status: totalRecebido / Math.max(totalFaturado, 1) > 0.85 ? "verde" : "amarelo",
      descricao: "do faturamento previsto",
      link: "/financeiro",
      icone: "Wallet",
    },
    {
      id: "a-receber",
      titulo: "A receber",
      valor: fmtBRL(totalAReceber),
      valorNumerico: totalAReceber,
      status: "amarelo",
      descricao: "Mensalidades no prazo",
      link: "/financeiro",
      icone: "Clock",
    },
    {
      id: "inadimplencia",
      titulo: "Inadimplência",
      valor: fmtBRL(totalInadimplencia),
      valorNumerico: totalInadimplencia,
      variacao: `${mensalidadesAtrasadas.length} fam.`,
      variacaoTipo: "negativa",
      status:
        totalInadimplencia > 30_000
          ? "vermelho"
          : totalInadimplencia > 0
            ? "amarelo"
            : "verde",
      descricao: `${totalFaturado > 0 ? ((totalInadimplencia / totalFaturado) * 100).toFixed(1) : 0}% do faturamento`,
      link: "/financeiro",
      icone: "AlertTriangle",
    },
    {
      id: "vendas",
      titulo: "Vendas no mês",
      valor: fmtBRL(totalVendasMes),
      valorNumerico: totalVendasMes,
      variacao: `${vendasMes.length} transações`,
      variacaoTipo: "positiva",
      status: "verde",
      descricao: "Uniformes, festa e alimentação",
      link: "/vendas",
      icone: "ShoppingCart",
    },
    {
      id: "despesas",
      titulo: "Despesas no mês",
      valor: fmtBRL(totalDespesas),
      valorNumerico: totalDespesas,
      variacao: `${despesasMes.length} contas`,
      variacaoTipo: totalDespesas > totalRecebido ? "negativa" : "neutra",
      status:
        totalDespesas > totalRecebido
          ? "vermelho"
          : totalDespesas > totalRecebido * 0.7
            ? "amarelo"
            : "verde",
      descricao: "A pagar + pagas",
      link: "/financeiro",
      icone: "Receipt",
    },
  ];

  const cardsTodo = kanban.filter((card) => card.colunaId === "c-todo").length;
  const cardsDoing = kanban.filter((card) => card.colunaId === "c-doing").length;
  const pendenciasKanban = cardsTodo + cardsDoing;
  const indicadoresOperacionais: IndicadorCockpit[] = [
    ...(podeAlunosGlobais
      ? [
          {
            id: "alunos-ativos",
            titulo: "Alunos ativos",
            valor: alunosAtivos.toString(),
            valorNumerico: alunosAtivos,
            variacao: `+${novasMatriculas} no mês`,
            variacaoTipo: "positiva" as const,
            status: "verde" as const,
            descricao: "Matrículas vigentes",
            link: "/alunos",
            icone: "Users",
          },
        ]
      : []),
    ...(podeKanbanGlobal
      ? [
          {
            id: "kanban-pendencias",
            titulo: "Pendências no Kanban",
            valor: pendenciasKanban.toString(),
            valorNumerico: pendenciasKanban,
            variacao: `${cardsDoing} em andamento`,
            variacaoTipo: "neutra" as const,
            status: (pendenciasKanban > 10 ? "amarelo" : "verde") as "amarelo" | "verde",
            descricao: `${cardsTodo} a fazer`,
            link: "/kanban",
            icone: "ListTodo",
          },
        ]
      : []),
  ];

  const carregandoFinanceiro =
    (podeFinanceiro && carregandoMensalidades) ||
    (podeVendas && carregandoVendas) ||
    (podeDespesas && carregandoDespesas);
  const errosFinanceiros = [
    podeFinanceiro ? erroMensalidades : null,
    podeVendas ? erroVendas : null,
    podeDespesas ? erroDespesas : null,
  ].filter((erro): erro is string => Boolean(erro));
  const carregandoOperacional =
    (podeAlunosGlobais && carregandoAlunos) ||
    (podeKanbanGlobal && carregandoKanban);
  const errosOperacionais = [
    podeAlunosGlobais ? erroAlunos : null,
    podeKanbanGlobal ? erroKanban : null,
  ].filter((erro): erro is string => Boolean(erro));
  const carregandoPedagogico =
    (podePedagogicoGlobal && carregandoAvaliacoes) ||
    (podePedagogicoGlobal && carregandoAlunos);
  const erroPedagogico = podePedagogicoGlobal
    ? erroAvaliacoes || erroAlunos
    : null;
  const avaliacoesAtuais = ultimasAvaliacoesPorAluno(alunos, avaliacoes);

  const recarregarFinanceiro = () => {
    if (podeFinanceiro) recarregarMensalidades();
    if (podeVendas) recarregarVendas();
    if (podeDespesas) recarregarDespesas();
  };
  const recarregarOperacional = () => {
    if (podeAlunosGlobais) recarregarAlunos();
    if (podeKanbanGlobal) recarregarKanban();
  };
  const recarregarPedagogico = () => {
    if (podeAlunosGlobais) recarregarAlunos();
    if (podePedagogicoGlobal) recarregarAvaliacoes();
  };

  return (
    <PeriodoProvider periodo={periodo}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> COCKPIT
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
              Bom dia, {nome.split(" ")[0]} <span className="wave-emoji">👋</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {carregandoPerfil
                ? "Preparando sua área..."
                : ehProfessor
                  ? "Acesso rápido às ferramentas da sua rotina pedagógica."
                  : podeFinanceiro && !podeAlunosGlobais
                    ? `Visão financeira · ${periodo.label}`
                    : podeFinanceiro
                      ? `Visão geral autorizada · ${periodo.label}`
                      : "Visão pedagógica e operacional autorizada."}
            </p>
          </div>
          <DadosTesteButton />
        </div>

        {carregandoPerfil ? (
          <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Identificando permissões...
          </Card>
        ) : ehProfessor ? (
          <AtalhosProfessor />
        ) : (
          <>
            {podeFinanceiro && (
              <SeletorMes
                periodo={periodo}
                onSetPeriodo={setPeriodo}
                onProximoMes={proximoMes}
                onMesAnterior={mesAnteriorAcao}
                onIrHoje={irHoje}
              />
            )}

            <InsightDoDia />

            {(podeAlunosGlobais || podeKanbanGlobal) && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Operação escolar
                </h2>
                <EstadoDados
                  carregando={carregandoOperacional}
                  erros={errosOperacionais}
                  onRecarregar={recarregarOperacional}
                  titulo="Os indicadores operacionais estão indisponíveis."
                >
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {indicadoresOperacionais.map((indicador) => (
                      <IndicadorCard key={indicador.id} indicador={indicador} />
                    ))}
                  </div>
                </EstadoDados>
              </section>
            )}

            {podeFinanceiro && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Financeiro
                </h2>
                <EstadoDados
                  carregando={carregandoFinanceiro}
                  erros={errosFinanceiros}
                  onRecarregar={recarregarFinanceiro}
                  titulo="Os indicadores financeiros estão indisponíveis."
                >
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {indicadoresFinanceiros.slice(0, 4).map((indicador) => (
                      <IndicadorCard key={indicador.id} indicador={indicador} />
                    ))}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {indicadoresFinanceiros.slice(4).map((indicador) => (
                      <IndicadorCard key={indicador.id} indicador={indicador} />
                    ))}
                  </div>
                </EstadoDados>
              </section>
            )}

            <div className={cnGrid(podeFinanceiro)}>
              {podeFinanceiro && <FaturamentoChart />}
              <AlertasList />
            </div>

            {podeFinanceiro && <AntesDepois />}

            {podePedagogicoGlobal && (
              <EstadoDados
                carregando={carregandoPedagogico}
                erros={erroPedagogico ? [erroPedagogico] : []}
                onRecarregar={recarregarPedagogico}
                titulo="O resumo pedagógico está indisponível."
              >
                <ResumoPedagogico avaliacoesAtuais={avaliacoesAtuais} />
              </EstadoDados>
            )}
          </>
        )}
      </div>
    </PeriodoProvider>
  );
}

function cnGrid(comFinanceiro: boolean): string {
  return comFinanceiro ? "grid gap-6 lg:grid-cols-3 [&>*:first-child]:lg:col-span-2" : "grid gap-6";
}

function EstadoDados({
  carregando,
  erros,
  onRecarregar,
  titulo,
  children,
}: {
  carregando: boolean;
  erros: string[];
  onRecarregar: () => void;
  titulo: string;
  children: React.ReactNode;
}) {
  if (carregando) {
    return (
      <Card className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados autorizados...
      </Card>
    );
  }
  if (erros.length > 0) {
    return (
      <Card className="flex flex-col items-center gap-2 border-warning/30 p-8 text-center text-sm text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-warning" />
        <span>{titulo}</span>
        <button
          type="button"
          onClick={onRecarregar}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
        </button>
      </Card>
    );
  }
  return <>{children}</>;
}

function AtalhosProfessor() {
  const atalhos = [
    {
      href: "/pedagogico",
      titulo: "Acompanhamento pedagógico",
      descricao: "Consulte e registre avaliações conforme suas permissões.",
      Icone: GraduationCap,
    },
    {
      href: "/frequencia",
      titulo: "Frequência",
      descricao: "Abra a chamada e acompanhe os registros do dia.",
      Icone: ClipboardCheck,
    },
    {
      href: "/kanban",
      titulo: "Kanban",
      descricao: "Organize atividades e pendências pedagógicas.",
      Icone: ListTodo,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {atalhos.map(({ href, titulo, descricao, Icone }) => (
        <Link key={href} href={href} className="group">
          <Card className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icone className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-semibold">{titulo}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
