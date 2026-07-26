"use client";

import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  NIVEIS_PSICOGENESE,
  type AvaliacaoPedagogica,
  type NivelPsicogenese,
} from "@/lib/types";

type AvaliacaoComLeitura = Pick<AvaliacaoPedagogica, "leituraNivel">;

function distribuicaoLeitura(avaliacoesAtuais: readonly AvaliacaoComLeitura[]) {
  const contagem: Record<NivelPsicogenese, number> = {
    "Pré-silábico": 0,
    Silábico: 0,
    "Silábico-alfabético": 0,
    Alfabético: 0,
  };
  for (const atual of avaliacoesAtuais) {
    if (atual.leituraNivel !== null) contagem[atual.leituraNivel]++;
  }
  return contagem;
}

const CORES_NIVEL: Record<NivelPsicogenese, string> = {
  "Pré-silábico": "bg-orange-400",
  Silábico: "bg-amber-400",
  "Silábico-alfabético": "bg-lime-400",
  Alfabético: "bg-emerald-500",
};

export function ResumoPedagogico({
  avaliacoesAtuais = [],
}: {
  avaliacoesAtuais?: readonly AvaliacaoComLeitura[];
} = {}) {
  const dist = distribuicaoLeitura(avaliacoesAtuais);
  const total = Object.values(dist).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Pedagógico — Leitura (psicogênese)
            </CardTitle>
            <CardDescription>
              Distribuição atual dos {total} alunos por nível
            </CardDescription>
          </div>
          <Link
            href="/pedagogico"
            className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline"
          >
            Ver detalhes <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 && (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Nenhuma avaliação completa foi registrada para esta visão.
          </p>
        )}
        {NIVEIS_PSICOGENESE.map((nivel) => {
          const qtd = dist[nivel];
          const pct = total > 0 ? (qtd / total) * 100 : 0;
          return (
            <div key={nivel} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{nivel}</span>
                <span className="text-muted-foreground">
                  {qtd} aluno{qtd !== 1 ? "s" : ""} ({pct.toFixed(0)}%)
                </span>
              </div>
              <Progress
                value={pct}
                indicatorClassName={CORES_NIVEL[nivel]}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
