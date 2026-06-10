"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatBRL, cn } from "@/lib/utils";

interface Linha {
  rotulo: string;
  valor: number;
  tipo: "receita" | "deducao" | "custo" | "despesa" | "subtotal" | "resultado";
  indent?: number;
}

const linhas: Linha[] = [
  { rotulo: "RECEITA OPERACIONAL BRUTA", valor: 241200, tipo: "receita" },
  { rotulo: "Mensalidades", valor: 215000, tipo: "receita", indent: 1 },
  { rotulo: "Uniformes e materiais", valor: 18950, tipo: "receita", indent: 1 },
  { rotulo: "Eventos / festas", valor: 7250, tipo: "receita", indent: 1 },
  { rotulo: "(-) Deduções (impostos)", valor: -14200, tipo: "deducao" },
  { rotulo: "RECEITA LÍQUIDA", valor: 227000, tipo: "subtotal" },

  { rotulo: "(-) CUSTOS DOS SERVIÇOS", valor: -132400, tipo: "custo" },
  { rotulo: "Folha de pagamento docente", valor: -86200, tipo: "custo", indent: 1 },
  { rotulo: "Alimentação", valor: -28400, tipo: "custo", indent: 1 },
  { rotulo: "Material pedagógico", valor: -8200, tipo: "custo", indent: 1 },
  { rotulo: "Limpeza e higiene", valor: -9600, tipo: "custo", indent: 1 },

  { rotulo: "LUCRO BRUTO", valor: 94600, tipo: "subtotal" },

  { rotulo: "(-) DESPESAS OPERACIONAIS", valor: -68200, tipo: "despesa" },
  { rotulo: "Folha administrativa", valor: -38600, tipo: "despesa", indent: 1 },
  { rotulo: "Aluguel", valor: -18500, tipo: "despesa", indent: 1 },
  { rotulo: "Utilidades (água/luz/internet)", valor: -5900, tipo: "despesa", indent: 1 },
  { rotulo: "Marketing", valor: -2400, tipo: "despesa", indent: 1 },
  { rotulo: "Manutenção", valor: -2800, tipo: "despesa", indent: 1 },

  { rotulo: "RESULTADO LÍQUIDO DO MÊS", valor: 26400, tipo: "resultado" },
];

export function DreTab() {
  const receita = 241200;
  const margemBruta = (94600 / receita) * 100;
  const margemLiquida = (26400 / receita) * 100;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Receita líquida</div>
          <div className="mt-1 text-2xl font-bold">{formatBRL(227000)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Margem bruta</div>
          <div className="mt-1 text-2xl font-bold text-primary">
            {margemBruta.toFixed(1)}%
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Margem líquida</div>
          <div className="mt-1 text-2xl font-bold text-success">
            {margemLiquida.toFixed(1)}%
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DRE — Junho/2026</CardTitle>
          <CardDescription>Demonstrativo do Resultado do Exercício</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y border-y">
            {linhas.map((l, i) => {
              const isHeader = l.tipo === "receita" || l.tipo === "custo" || l.tipo === "despesa";
              const isSub = l.tipo === "subtotal";
              const isFinal = l.tipo === "resultado";
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between py-2.5 text-sm",
                    isHeader && "font-semibold uppercase text-xs tracking-wide",
                    isSub && "font-bold bg-muted/40 px-2",
                    isFinal && "font-bold bg-success/10 px-2 text-success border-y-2",
                    l.indent && "pl-6 text-muted-foreground"
                  )}
                >
                  <span>{l.rotulo}</span>
                  <span className={cn(l.valor < 0 && !isSub && !isFinal && "text-danger")}>
                    {formatBRL(l.valor)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
