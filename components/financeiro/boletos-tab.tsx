"use client";

import { QrCode, FileDown, Copy, Plus, Receipt } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBRL } from "@/lib/utils";

const cobrancas = [
  { id: "c1", responsavel: "Mariana Almeida", aluno: "Sofia", valor: 2870, tipo: "Boleto", status: "Aguardando", venc: "2026-06-15" },
  { id: "c2", responsavel: "Patrícia Costa", aluno: "Manuela", valor: 2870, tipo: "Pix", status: "Pago", venc: "2026-06-05" },
  { id: "c3", responsavel: "Daniela Carvalho", aluno: "Bernardo", valor: 2670, tipo: "Pix", status: "Aguardando", venc: "2026-06-15" },
  { id: "c4", responsavel: "Roberta Martins", aluno: "Helena", valor: 2870, tipo: "Boleto", status: "Aguardando", venc: "2026-06-15" },
  { id: "c5", responsavel: "Camila Pereira", aluno: "Heitor", valor: 2290, tipo: "Pix", status: "Pago", venc: "2026-06-05" },
];

export function BoletosTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Boletos emitidos</div>
          <div className="mt-1 text-2xl font-bold">37</div>
          <div className="text-xs text-muted-foreground mt-1">Junho/2026</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Pix QR gerados</div>
          <div className="mt-1 text-2xl font-bold">42</div>
          <div className="text-xs text-muted-foreground mt-1">73% de adesão</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Taxa de pagamento via Pix</div>
          <div className="mt-1 text-2xl font-bold text-success">67%</div>
          <div className="text-xs text-muted-foreground mt-1">vs 33% boleto</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-4 w-4" /> Gerador Pix QR
            </CardTitle>
            <CardDescription>Crie cobrança com Pix dinâmico</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="aspect-square w-48 mx-auto rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30">
              <QrCode className="h-24 w-24 text-muted-foreground" />
            </div>
            <div className="rounded-md bg-muted p-2 text-xs font-mono break-all">
              00020126580014BR.GOV.BCB.PIX0136a3f2c5d7-b8e9-4c1a-9f0d-7e4b8c2a1d3f...
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" size="sm">
                <Copy className="mr-2 h-4 w-4" /> Copiar código
              </Button>
              <Button className="flex-1" size="sm">
                <FileDown className="mr-2 h-4 w-4" /> Baixar QR
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Cobranças recentes
            </CardTitle>
            <CardDescription>Boletos e Pix emitidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {cobrancas.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <div className="font-semibold">{c.responsavel}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.aluno} · {c.tipo} · vence {new Date(c.venc).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatBRL(c.valor)}</div>
                  <Badge variant={c.status === "Pago" ? "success" : "warning"} className="text-[10px]">
                    {c.status}
                  </Badge>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Nova cobrança
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
