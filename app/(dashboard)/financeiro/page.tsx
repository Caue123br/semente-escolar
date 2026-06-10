"use client";

import { Banknote, Receipt, AlertTriangle, TrendingUp, LineChart, FileText } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KpiRow } from "@/components/financeiro/kpi-row";
import { FaturamentoChart } from "@/components/cockpit/faturamento-chart";
import { ComposicaoReceita } from "@/components/financeiro/composicao-receita";
import { MensalidadesTable } from "@/components/financeiro/mensalidades-table";
import { ReguaInadimplencia } from "@/components/financeiro/regua-inadimplencia";
import { DespesasTab } from "@/components/financeiro/despesas-tab";
import { FluxoCaixaTab } from "@/components/financeiro/fluxo-caixa-tab";
import { DreTab } from "@/components/financeiro/dre-tab";
import { BoletosTab } from "@/components/financeiro/boletos-tab";
import { ConciliacaoTab } from "@/components/financeiro/conciliacao-tab";

export default function FinanceiroPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Banknote className="h-3.5 w-3.5" /> FINANCEIRO
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Financeiro & Inadimplência
          </h1>
          <p className="text-sm text-muted-foreground">
            Faturamento, cobrança, despesas, fluxo de caixa e DRE.
          </p>
        </div>
      </div>

      <KpiRow />

      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="visao-geral">
            <TrendingUp className="mr-1.5 h-4 w-4" /> Visão geral
          </TabsTrigger>
          <TabsTrigger value="mensalidades">
            <Receipt className="mr-1.5 h-4 w-4" /> Mensalidades
          </TabsTrigger>
          <TabsTrigger value="inadimplencia">
            <AlertTriangle className="mr-1.5 h-4 w-4" /> Inadimplência
          </TabsTrigger>
          <TabsTrigger value="despesas">
            <Banknote className="mr-1.5 h-4 w-4" /> Despesas
          </TabsTrigger>
          <TabsTrigger value="fluxo">
            <LineChart className="mr-1.5 h-4 w-4" /> Fluxo de caixa
          </TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="boletos">Boletos / Pix</TabsTrigger>
          <TabsTrigger value="conciliacao">
            <FileText className="mr-1.5 h-4 w-4" /> Conciliação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FaturamentoChart />
            </div>
            <ComposicaoReceita />
          </div>
        </TabsContent>

        <TabsContent value="mensalidades">
          <MensalidadesTable />
        </TabsContent>

        <TabsContent value="inadimplencia">
          <ReguaInadimplencia />
        </TabsContent>

        <TabsContent value="despesas">
          <DespesasTab />
        </TabsContent>

        <TabsContent value="fluxo">
          <FluxoCaixaTab />
        </TabsContent>

        <TabsContent value="dre">
          <DreTab />
        </TabsContent>

        <TabsContent value="boletos">
          <BoletosTab />
        </TabsContent>

        <TabsContent value="conciliacao">
          <ConciliacaoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
