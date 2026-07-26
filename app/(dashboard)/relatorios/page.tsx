"use client";

import * as React from "react";
import Link from "next/link";
import { BarChart3, Download, FileText, Users, GraduationCap, Banknote, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FaturamentoChart } from "@/components/cockpit/faturamento-chart";
import { ComposicaoReceita } from "@/components/financeiro/composicao-receita";
import { ResumoPedagogico } from "@/components/cockpit/resumo-pedagogico";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { formatBRL, formatDateLocalISO } from "@/lib/utils";
import { usePerfil } from "@/lib/perfil-context";
import { ultimasAvaliacoesPorAluno } from "@/lib/pedagogico";

export default function RelatoriosPage() {
  const { perfil, carregando: carregandoPerfil } = usePerfil();
  const podeAcademico = perfil === "diretor" || perfil === "coordenador";
  const podeFinanceiro = perfil === "diretor" || perfil === "financeiro";
  const { items: alunos } = useEntidade("alunos", { habilitado: !carregandoPerfil && podeAcademico });
  const { items: turmas } = useEntidade("turmas", { habilitado: !carregandoPerfil && podeAcademico });
  const { items: avaliacoes } = useEntidade("avaliacoes", { habilitado: !carregandoPerfil && podeAcademico });
  const { items: mensalidades } = useEntidade("mensalidades", { habilitado: !carregandoPerfil && podeFinanceiro });
  const toast = useToast();

  // Ocupação real
  const ocupacaoPorTurma = turmas.map((t) => {
    const alunosNaTurma = alunos.filter((a) => a.turmaId === t.id).length;
    return {
      turma: t.nome,
      ocupacao: t.capacidade > 0 ? (alunosNaTurma / t.capacidade) * 100 : 0,
      alunosNaTurma,
      capacidade: t.capacidade,
      cor: t.cor,
    };
  });

  // Exportar CSV genérico
  const exportarCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório gerado!", `${filename} baixado.`);
  };

  const exportarListaAlunos = () => {
    exportarCSV(
      `alunos-${formatDateLocalISO()}.csv`,
      ["Matrícula", "Nome", "Turma", "Data nascimento", "CPF", "Responsável principal", "Telefone", "Status"],
      alunos.map((a) => {
        const turma = turmas.find((t) => t.id === a.turmaId);
        const resp = a.responsaveis.find((r) => r.principal) ?? a.responsaveis[0];
        return [
          a.matricula,
          a.nome,
          turma?.nome ?? "",
          a.dataNascimento,
          a.cpf,
          resp?.nome ?? "",
          resp?.telefone ?? "",
          a.status,
        ];
      })
    );
  };

  const exportarFinanceiro = () => {
    exportarCSV(
      `financeiro-${formatDateLocalISO()}.csv`,
      ["Competência", "Aluno", "Turma", "Vencimento", "Valor", "Pago em", "Forma", "Status", "Dias atraso"],
      mensalidades.map((m) => [
        m.competencia,
        m.alunoNome,
        m.turmaNome,
        m.vencimento,
        m.valor,
        m.dataPagamento ?? "",
        m.formaPagamento ?? "",
        m.status,
        m.diasAtraso,
      ])
    );
  };

  const exportarInadimplencia = () => {
    const atrasadas = mensalidades.filter((m) => m.status === "Atrasada");
    if (atrasadas.length === 0) {
      toast.info?.("Sem inadimplência", "Nenhuma mensalidade atrasada — show!");
      return;
    }
    exportarCSV(
      `inadimplencia-${formatDateLocalISO()}.csv`,
      ["Aluno", "Turma", "Competência", "Vencimento", "Valor", "Dias em atraso"],
      atrasadas.map((m) => [m.alunoNome, m.turmaNome, m.competencia, m.vencimento, m.valor, m.diasAtraso])
    );
  };

  const exportarOcupacao = () => {
    exportarCSV(
      `ocupacao-turmas-${formatDateLocalISO()}.csv`,
      ["Turma", "Matriculados", "Capacidade", "Ocupação %"],
      ocupacaoPorTurma.map((o) => [o.turma, o.alunosNaTurma, o.capacidade, o.ocupacao.toFixed(1)])
    );
  };

  const alunosAtivos = alunos.filter((a) => a.status === "Ativo").length;
  const totalMensalidadesPagas = mensalidades.filter((m) => m.status === "Paga").reduce((a, m) => a + (m.valorPago ?? m.valor), 0);
  const totalInadimplencia = mensalidades.filter((m) => m.status === "Atrasada").reduce((a, m) => a + m.valor, 0);
  const avaliacoesAtuais = ultimasAvaliacoesPorAluno(alunos, avaliacoes);

  if (carregandoPerfil) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando permissões...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <BarChart3 className="h-3.5 w-3.5" /> RELATÓRIOS
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Relatórios gerenciais
          </h1>
          <p className="text-sm text-muted-foreground">
            Análises consolidadas pra tomada de decisão.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {podeAcademico && (
          <Card className="p-5">
            <div className="text-xs uppercase text-muted-foreground">Alunos ativos</div>
            <div className="mt-1 text-2xl font-bold">{alunosAtivos}</div>
            <div className="text-xs text-muted-foreground mt-1">{alunos.length} cadastrados</div>
          </Card>
        )}
        {podeFinanceiro && (
          <Card className="p-5">
            <div className="text-xs uppercase text-muted-foreground">Recebido (total)</div>
            <div className="mt-1 text-2xl font-bold text-success">{formatBRL(totalMensalidadesPagas)}</div>
          </Card>
        )}
        {podeFinanceiro && (
          <Card className="p-5">
            <div className="text-xs uppercase text-muted-foreground">Inadimplência</div>
            <div className="mt-1 text-2xl font-bold text-danger">{formatBRL(totalInadimplencia)}</div>
          </Card>
        )}
        {podeAcademico && (
          <Card className="p-5">
            <div className="text-xs uppercase text-muted-foreground">Turmas ocupadas</div>
            <div className="mt-1 text-2xl font-bold">{ocupacaoPorTurma.filter((o) => o.alunosNaTurma > 0).length}/{turmas.length}</div>
          </Card>
        )}
      </div>

      <Tabs defaultValue="exportar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exportar">Exportar relatórios</TabsTrigger>
          {podeFinanceiro && <TabsTrigger value="financeiro">Financeiro</TabsTrigger>}
          {podeAcademico && <TabsTrigger value="ocupacao">Ocupação de turmas</TabsTrigger>}
          {podeAcademico && <TabsTrigger value="pedagogico">Pedagógico</TabsTrigger>}
        </TabsList>

        <TabsContent value="exportar">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {podeAcademico && <RelatorioCard
              icone={Users}
              nome="Lista de alunos"
              desc={`${alunos.length} alunos com matrícula, responsáveis e contatos`}
              formato="CSV"
              onGerar={exportarListaAlunos}
            />}
            {podeFinanceiro && <RelatorioCard
              icone={Banknote}
              nome="Financeiro completo"
              desc="Todas as mensalidades (pagas, em aberto, atrasadas)"
              formato="CSV"
              onGerar={exportarFinanceiro}
            />}
            {podeFinanceiro && <RelatorioCard
              icone={FileText}
              nome="Inadimplência analítica"
              desc="Por aluno, com dias de atraso"
              formato="CSV"
              onGerar={exportarInadimplencia}
            />}
            {podeAcademico && <RelatorioCard
              icone={BarChart3}
              nome="Ocupação das turmas"
              desc="Matriculados vs. capacidade"
              formato="CSV"
              onGerar={exportarOcupacao}
            />}
            {podeAcademico && <Card className="p-4 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">Boletim individual</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Página imprimível com avaliações e frequência</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Formato: impressão / PDF do navegador</div>
                </div>
              </div>
              <Link href="/alunos">
                <Button variant="outline" size="sm" className="w-full mt-3">
                  Escolher aluno <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Card>}
            {podeAcademico && <Card className="p-4 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">Ficha de matrícula</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Página imprimível com os dados cadastrados</div>
                  <div className="text-[10px] text-muted-foreground mt-1">Formato: impressão / PDF do navegador</div>
                </div>
              </div>
              <Link href="/alunos">
                <Button variant="outline" size="sm" className="w-full mt-3">
                  Escolher aluno <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Card>}
          </div>
        </TabsContent>

        {podeFinanceiro && <TabsContent value="financeiro" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FaturamentoChart />
            </div>
            <ComposicaoReceita />
          </div>
        </TabsContent>}

        {podeAcademico && <TabsContent value="ocupacao">
          <Card>
            <CardHeader>
              <CardTitle>Ocupação por turma</CardTitle>
              <CardDescription>Alunos matriculados vs. capacidade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ocupacaoPorTurma} margin={{ left: 20, right: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="turma" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(_v: number, _name, props) => {
                        const item = props.payload as typeof ocupacaoPorTurma[number];
                        return `${item.alunosNaTurma}/${item.capacidade} (${item.ocupacao.toFixed(0)}%)`;
                      }}
                    />
                    <Bar dataKey="ocupacao" radius={[6, 6, 0, 0]}>
                      {ocupacaoPorTurma.map((e, i) => (
                        <Cell key={i} fill={e.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>}

        {podeAcademico && <TabsContent value="pedagogico">
          <ResumoPedagogico avaliacoesAtuais={avaliacoesAtuais} />
        </TabsContent>}
      </Tabs>
    </div>
  );
}

function RelatorioCard({
  icone: Ic,
  nome,
  desc,
  formato,
  onGerar,
}: {
  icone: React.ComponentType<{ className?: string }>;
  nome: string;
  desc: string;
  formato: string;
  onGerar: () => void;
}) {
  return (
    <Card className="p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Ic className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{nome}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Formato: {formato}</div>
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full mt-3" onClick={onGerar}>
        <Download className="mr-2 h-4 w-4" /> Gerar
      </Button>
    </Card>
  );
}
