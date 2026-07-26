"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Package,
  UserMinus,
  GraduationCap,
  ChevronRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEntidade } from "@/lib/data/store";
import { podeAcessarModulo } from "@/lib/access-control";
import { usePerfil } from "@/lib/perfil-context";

type Severidade = "vermelho" | "amarelo" | "verde";
type TipoAlerta = "inadimplencia" | "estagnacao" | "estoque" | "validade" | "evasao";

interface AlertaDinamico {
  id: string;
  tipo: TipoAlerta;
  severidade: Severidade;
  titulo: string;
  descricao: string;
  link: string;
}

const ICONE_TIPO: Record<TipoAlerta, React.ComponentType<{ className?: string }>> = {
  inadimplencia: AlertTriangle,
  estagnacao: GraduationCap,
  estoque: Package,
  validade: AlertCircle,
  evasao: UserMinus,
};

const COR_SEVERIDADE: Record<Severidade, string> = {
  vermelho: "bg-danger/10 text-danger ring-danger/20",
  amarelo: "bg-warning/10 text-warning ring-warning/20",
  verde: "bg-success/10 text-success ring-success/20",
};

const ROTULO_TIPO: Record<TipoAlerta, string> = {
  inadimplencia: "Inadimplência",
  estagnacao: "Pedagógico",
  estoque: "Estoque",
  validade: "Validade",
  evasao: "Evasão",
};

function AlertaItem({ alerta }: { alerta: AlertaDinamico }) {
  const Icon = ICONE_TIPO[alerta.tipo];
  return (
    <Link
      href={alerta.link}
      className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:bg-accent/50 hover:shadow-sm"
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg ring-1 shrink-0",
          COR_SEVERIDADE[alerta.severidade]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
            {ROTULO_TIPO[alerta.tipo]}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm font-semibold text-foreground truncate">
          {alerta.titulo}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1">{alerta.descricao}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export function AlertasList() {
  const { perfil, carregando: carregandoPerfil } = usePerfil();
  const podeFinanceiro = !carregandoPerfil && podeAcessarModulo(perfil, "financeiro");
  const podeEstoque = !carregandoPerfil && podeAcessarModulo(perfil, "estoque");
  const podeAlunosGlobais =
    !carregandoPerfil && perfil !== "professor" && podeAcessarModulo(perfil, "alunos");
  const {
    items: mensalidades,
    carregando: carregandoMensalidades,
    erro: erroMensalidades,
    reset: recarregarMensalidades,
  } = useEntidade("mensalidades", { habilitado: podeFinanceiro });
  const {
    items: alunos,
    carregando: carregandoAlunos,
    erro: erroAlunos,
    reset: recarregarAlunos,
  } = useEntidade("alunos", { habilitado: podeAlunosGlobais });
  const {
    items: estoque,
    carregando: carregandoEstoque,
    erro: erroEstoque,
    reset: recarregarEstoque,
  } = useEntidade("estoque", { habilitado: podeEstoque });

  const carregando =
    carregandoPerfil ||
    (podeFinanceiro && carregandoMensalidades) ||
    (podeAlunosGlobais && carregandoAlunos) ||
    (podeEstoque && carregandoEstoque);
  const erros = [
    podeFinanceiro ? erroMensalidades : null,
    podeAlunosGlobais ? erroAlunos : null,
    podeEstoque ? erroEstoque : null,
  ].filter((erro): erro is string => Boolean(erro));
  const totalFontes = Number(podeFinanceiro) + Number(podeAlunosGlobais) + Number(podeEstoque);

  const recarregar = () => {
    if (podeFinanceiro) recarregarMensalidades();
    if (podeAlunosGlobais) recarregarAlunos();
    if (podeEstoque) recarregarEstoque();
  };

  const alertas: AlertaDinamico[] = React.useMemo(() => {
    const lista: AlertaDinamico[] = [];

    // Inadimplência
    const atrasadas = mensalidades.filter((m) => m.status === "Atrasada");
    if (atrasadas.length > 0) {
      const valor = atrasadas.reduce((a, m) => a + m.valor, 0);
      lista.push({
        id: "inad",
        tipo: "inadimplencia",
        severidade: atrasadas.length >= 5 ? "vermelho" : "amarelo",
        titulo: `${atrasadas.length} mensalidade(s) em atraso`,
        descricao: `Total ${valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} — pais a cobrar`,
        link: "/financeiro",
      });
    }

    // Estoque baixo
    const baixoEstoque = estoque.filter((i) => i.quantidade <= (i.pontoReposicao ?? 0));
    if (baixoEstoque.length > 0) {
      lista.push({
        id: "est",
        tipo: "estoque",
        severidade: baixoEstoque.length >= 5 ? "vermelho" : "amarelo",
        titulo: `${baixoEstoque.length} item(ns) em ponto de reposição`,
        descricao: `Repor: ${baixoEstoque.slice(0, 3).map((i) => i.nome).join(", ")}${baixoEstoque.length > 3 ? "…" : ""}`,
        link: "/estoque",
      });
    }

    // Validade próxima (próximos 14 dias)
    const hoje = new Date();
    const em14 = new Date();
    em14.setDate(em14.getDate() + 14);
    const proximoVencimento = estoque.filter((i) => {
      if (!i.validade) return false;
      const v = new Date(i.validade);
      return v >= hoje && v <= em14;
    });
    if (proximoVencimento.length > 0) {
      lista.push({
        id: "val",
        tipo: "validade",
        severidade: "amarelo",
        titulo: `${proximoVencimento.length} item(ns) próximo(s) do vencimento`,
        descricao: "Vencimento em até 14 dias — usar com prioridade",
        link: "/estoque",
      });
    }

    // Status: alunos inativos no mês corrente
    const inativos = alunos.filter((a) => a.status === "Trancado" || a.status === "Inativo");
    if (inativos.length > 0) {
      lista.push({
        id: "ev",
        tipo: "evasao",
        severidade: inativos.length >= 3 ? "vermelho" : "amarelo",
        titulo: `${inativos.length} aluno(s) inativo(s) ou trancado(s)`,
        descricao: "Considerar contato pra reativação",
        link: "/alunos",
      });
    }

    return lista;
  }, [mensalidades, alunos, estoque]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-danger" />
              Alertas que pedem ação
            </CardTitle>
            <CardDescription>
              {carregando
                ? "Verificando fontes autorizadas..."
                : erros.length > 0
                  ? alertas.length > 0
                    ? `${alertas.length} alerta(s) · dados parciais`
                    : "Não foi possível verificar todas as fontes"
                  : totalFontes === 0
                    ? "Sem fontes globais para este perfil"
                    : alertas.length > 0
                ? `${alertas.length} item(ns) precisam de atenção`
                : "Tudo em ordem por aqui ✓"}
            </CardDescription>
          </div>
          {alertas.length > 0 && <Badge variant="danger">{alertas.length}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando alertas...
          </div>
        ) : totalFontes === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Este perfil não possui acesso a indicadores globais de alerta.
          </div>
        ) : erros.length > 0 && alertas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-10 w-10 text-warning" />
            <span>Os alertas estão temporariamente indisponíveis.</span>
            <button
              type="button"
              onClick={recarregar}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
          </div>
        ) : alertas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-success" />
            Sem alertas. Bom trabalho!
          </div>
        ) : (
          <>
            {erros.length > 0 && (
              <div className="mb-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                Parte das fontes não pôde ser carregada; a lista abaixo pode estar incompleta.
              </div>
            )}
            {alertas.map((a) => <AlertaItem key={a.id} alerta={a} />)}
          </>
        )}
      </CardContent>
    </Card>
  );
}
