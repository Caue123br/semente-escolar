"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  RotateCw,
  Package,
  Banknote,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEntidade } from "@/lib/data/store";
import { formatBRL } from "@/lib/utils";
import { podeAcessarModulo } from "@/lib/access-control";
import { usePerfil } from "@/lib/perfil-context";

interface Insight {
  icone: React.ComponentType<{ className?: string }>;
  cor: string;
  bg: string;
  titulo: string;
  texto: React.ReactNode;
  acao: string;
  link: string;
  badge: string;
  badgeCor: string;
}

export function InsightDoDia() {
  const { perfil, carregando: carregandoPerfil } = usePerfil();
  const podeFinanceiro = !carregandoPerfil && podeAcessarModulo(perfil, "financeiro");
  const podeEstoque = !carregandoPerfil && podeAcessarModulo(perfil, "estoque");
  const podeCrm = !carregandoPerfil && podeAcessarModulo(perfil, "crm");
  const podeAlunosGlobais =
    !carregandoPerfil && perfil !== "professor" && podeAcessarModulo(perfil, "alunos");
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
    items: estoque,
    carregando: carregandoEstoque,
    erro: erroEstoque,
    reset: recarregarEstoque,
  } = useEntidade("estoque", { habilitado: podeEstoque });
  const {
    items: leads,
    carregando: carregandoCrm,
    erro: erroCrm,
    reset: recarregarCrm,
  } = useEntidade("crm", { habilitado: podeCrm });
  const [idx, setIdx] = React.useState(0);
  const carregando =
    carregandoPerfil ||
    (podeAlunosGlobais && carregandoAlunos) ||
    (podeFinanceiro && carregandoMensalidades) ||
    (podeEstoque && carregandoEstoque) ||
    (podeCrm && carregandoCrm);
  const erros = [
    podeAlunosGlobais ? erroAlunos : null,
    podeFinanceiro ? erroMensalidades : null,
    podeEstoque ? erroEstoque : null,
    podeCrm ? erroCrm : null,
  ].filter((erro): erro is string => Boolean(erro));
  const totalFontes =
    Number(podeAlunosGlobais) + Number(podeFinanceiro) + Number(podeEstoque) + Number(podeCrm);

  const insights = React.useMemo(() => {
    const lista: Insight[] = [];
    const hoje = new Date();
    const comp = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

    // 1) Inadimplência crítica
    const atrasadas = mensalidades.filter((m) => m.status === "Atrasada");
    if (atrasadas.length > 0) {
      const valor = atrasadas.reduce((a, m) => a + m.valor, 0);
      lista.push({
        icone: Banknote,
        cor: "text-rose-700",
        bg: "from-rose-50",
        titulo: "Inadimplência precisa de atenção",
        texto: (
          <>
            Tem <strong>{atrasadas.length} mensalidade(s) em atraso</strong> somando{" "}
            <strong>{formatBRL(valor)}</strong>. Vale puxar uma régua de cobrança hoje —
            pai que recebe lembrete mais cedo paga 3x mais rápido.
          </>
        ),
        acao: "Ver régua de inadimplência",
        link: "/financeiro",
        badge: "Financeiro",
        badgeCor: "bg-rose-100 text-rose-700",
      });
    }

    // 2) Estoque baixo
    const baixo = estoque.filter((i) => i.quantidade <= (i.pontoReposicao ?? 0));
    if (baixo.length > 0) {
      lista.push({
        icone: Package,
        cor: "text-amber-700",
        bg: "from-amber-50",
        titulo: "Itens em ponto de reposição",
        texto: (
          <>
            <strong>{baixo.length} item(ns)</strong> chegaram no ponto de reposição:{" "}
            <strong>{baixo.slice(0, 3).map((i) => i.nome).join(", ")}</strong>
            {baixo.length > 3 && " e outros"}. Vale fazer o pedido antes de faltar.
          </>
        ),
        acao: "Ver estoque",
        link: "/estoque",
        badge: "Estoque",
        badgeCor: "bg-amber-100 text-amber-700",
      });
    }

    // 3) Leads pra trabalhar
    const leadsAtivos = leads.filter((l) => l.estagio !== "Matriculado" && l.estagio !== "Perdido");
    if (leadsAtivos.length > 0) {
      lista.push({
        icone: TrendingUp,
        cor: "text-blue-700",
        bg: "from-blue-50",
        titulo: "Captação aquecida",
        texto: (
          <>
            <strong>{leadsAtivos.length} lead(s)</strong> aguardando próximo passo no funil.
            Famílias interessadas decidem em 7-14 dias — vale agilizar contato esta semana.
          </>
        ),
        acao: "Ver funil CRM",
        link: "/crm",
        badge: "CRM",
        badgeCor: "bg-blue-100 text-blue-700",
      });
    }

    // 4) Tudo bem!
    if (lista.length === 0 && erros.length === 0 && totalFontes > 0) {
      const ativos = alunos.filter((a) => a.status === "Ativo").length;
      lista.push({
        icone: Sparkles,
        cor: "text-emerald-700",
        bg: "from-emerald-50",
        titulo: "Sem alertas críticos hoje 🌻",
        texto: podeAlunosGlobais ? (
          <>
            Nenhuma pendência crítica nas fontes autorizadas e <strong>{ativos} alunos ativos</strong>.
            Os indicadores disponíveis foram carregados normalmente.
          </>
        ) : (
          <>Nenhuma pendência crítica nas fontes financeiras e operacionais disponíveis.</>
        ),
        acao: podeAlunosGlobais ? "Ver visão pedagógica" : "Ver financeiro",
        link: podeAlunosGlobais ? "/pedagogico" : "/financeiro",
        badge: "Tudo certo",
        badgeCor: "bg-emerald-100 text-emerald-700",
      });
    }

    return lista;
  }, [mensalidades, estoque, alunos, leads, erros.length, totalFontes, podeAlunosGlobais]);

  const recarregar = () => {
    if (podeAlunosGlobais) recarregarAlunos();
    if (podeFinanceiro) recarregarMensalidades();
    if (podeEstoque) recarregarEstoque();
    if (podeCrm) recarregarCrm();
  };

  if (carregando) {
    return (
      <Card className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparando insight autorizado...
      </Card>
    );
  }

  if (totalFontes === 0) return null;

  if (erros.length > 0 && insights.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-warning" />
        <span>O insight do dia está temporariamente indisponível.</span>
        <button
          type="button"
          onClick={recarregar}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
        </button>
      </Card>
    );
  }

  const insight = insights[idx % insights.length];
  if (!insight) return null;

  const Ic = insight.icone;
  const proximo = () => setIdx((i) => (i + 1) % insights.length);

  return (
    <Card className={`relative overflow-hidden border-2 border-emerald-200/60 bg-gradient-to-br ${insight.bg} via-card to-card p-5 shadow-md`}>
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-400/15 rounded-full blur-3xl" />
      <div className="relative flex items-start gap-4 flex-wrap">
        <div className={`h-12 w-12 shrink-0 rounded-xl ${insight.bg} flex items-center justify-center shadow-sm`}>
          <Ic className={`h-6 w-6 ${insight.cor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Insight do dia
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${insight.badgeCor}`}>
              {insight.badge}
            </span>
            {insights.length > 1 && (
              <button
                onClick={proximo}
                title="Próximo insight"
                className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <RotateCw className="h-3 w-3" />
                Próximo
              </button>
            )}
          </div>
          <h3 className="font-bold text-lg mt-1">{insight.titulo}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{insight.texto}</p>
          {erros.length > 0 && (
            <p className="mt-2 text-xs text-warning">
              Algumas fontes autorizadas estão indisponíveis; este insight usa dados parciais.
            </p>
          )}
          <Link href={insight.link}>
            <Button className="mt-3 bg-emerald-600 hover:bg-emerald-700" size="sm">
              {insight.acao} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
