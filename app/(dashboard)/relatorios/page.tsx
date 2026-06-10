"use client";

import { BarChart3, Download, FileText, TrendingUp, Users, GraduationCap, Banknote } from "lucide-react";
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
  Legend,
  Cell,
} from "recharts";
import { turmas } from "@/lib/mock-data/turmas";

const relatoriosPre = [
  { id: "r1", nome: "Boletim do 2º bimestre", desc: "Notas individuais de todos os alunos", icon: GraduationCap, formato: "PDF" },
  { id: "r2", nome: "Relatório financeiro mensal", desc: "DRE, fluxo, inadimplência e despesas", icon: Banknote, formato: "PDF/Excel" },
  { id: "r3", nome: "Frequência por turma", desc: "Presenças e faltas detalhadas", icon: Users, formato: "Excel" },
  { id: "r4", nome: "Inadimplência analítica", desc: "Por aluno, turma e tempo de atraso", icon: TrendingUp, formato: "PDF/Excel" },
  { id: "r5", nome: "Captação (CRM)", desc: "Funil de matrículas, origem e conversão", icon: FileText, formato: "PDF" },
  { id: "r6", nome: "Relatório pedagógico anual", desc: "Evolução das 4 competências por aluno", icon: GraduationCap, formato: "PDF" },
];

const ocupacaoPorTurma = turmas.map((t) => ({
  turma: t.nome.replace(" - ", "/"),
  ocupacao: (t.totalAlunos / t.capacidade) * 100,
  cor: t.cor,
}));

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <BarChart3 className="h-3.5 w-3.5" /> RELATÓRIOS
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Relatórios gerenciais
          </h1>
          <p className="text-sm text-muted-foreground">
            Análises consolidadas para tomada de decisão.
          </p>
        </div>
      </div>

      <Tabs defaultValue="financeiro" className="space-y-4">
        <TabsList>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="ocupacao">Ocupação de turmas</TabsTrigger>
          <TabsTrigger value="pedagogico">Pedagógico</TabsTrigger>
          <TabsTrigger value="exportar">Exportar relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="financeiro" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FaturamentoChart />
            </div>
            <ComposicaoReceita />
          </div>
        </TabsContent>

        <TabsContent value="ocupacao">
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
                    <XAxis dataKey="turma" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(0)}%`} />
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
        </TabsContent>

        <TabsContent value="pedagogico">
          <ResumoPedagogico />
        </TabsContent>

        <TabsContent value="exportar">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {relatoriosPre.map((r) => {
              const Ic = r.icon;
              return (
                <Card key={r.id} className="p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Ic className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{r.nome}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">Formato: {r.formato}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    <Download className="mr-2 h-4 w-4" /> Gerar
                  </Button>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
