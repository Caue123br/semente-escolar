"use client";

import * as React from "react";
import { Phone, RefreshCcw, AlertTriangle, ExternalLink } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { usePeriodoContexto } from "@/lib/contexto-periodo";
import { formatBRL, initials, cn } from "@/lib/utils";
import type { Mensalidade } from "@/lib/types";

function faixaAtraso(dias: number): { label: string; cor: string; acao: string } {
  if (dias <= 7) return { label: "Recente", cor: "bg-warning", acao: "Lembrar via WhatsApp" };
  if (dias <= 15) return { label: "Atenção", cor: "bg-orange-500", acao: "Cobrança formal" };
  if (dias <= 30) return { label: "Crítico", cor: "bg-danger", acao: "Negociação direta" };
  return { label: "Grave", cor: "bg-red-700", acao: "Encaminhamento jurídico" };
}

const TEMPLATES_COBRANCA: Record<string, (resp: string, aluno: string, valor: string, dias: number) => string> = {
  "Cordial (até 7 dias)": (resp, aluno, valor, dias) =>
    `Olá, ${resp}! Tudo bem? Passando pra lembrar que a mensalidade de ${aluno} (${valor}) está em aberto há ${dias} dia(s). Qualquer dúvida sobre boleto/Pix é só chamar 😊`,
  "Formal (até 15 dias)": (resp, aluno, valor, dias) =>
    `${resp}, a mensalidade de ${aluno} está com ${dias} dias de atraso (${valor}). Conseguimos resolver hoje? Posso te enviar 2ª via do boleto ou QR Pix.`,
  "Negociação (até 30 dias)": (resp, aluno, valor, dias) =>
    `Oi ${resp}, sou da escola e gostaria de conversar sobre a pendência de ${aluno} (${valor}, ${dias} dias). Se tiver dificuldade, podemos parcelar ou propor desconto à vista. Me responda quando puder.`,
  "Última (30+ dias)": (resp, aluno, valor, dias) =>
    `${resp}, a mensalidade de ${aluno} está com ${dias} dias de atraso e somos obrigados a tomar providências. Por favor entre em contato HOJE pra evitarmos suspensão ou encaminhamento jurídico.`,
};

export function ReguaInadimplencia() {
  const { items: mensalidades } = useEntidade("mensalidades");
  const { items: alunos } = useEntidade("alunos");
  const { periodo } = usePeriodoContexto();
  const toast = useToast();

  const inadimplentes = mensalidades
    .filter((m) => m.status === "Atrasada" && (!periodo.competencia || m.competencia === periodo.competencia))
    .sort((a, b) => b.diasAtraso - a.diasAtraso);

  const totalInad = inadimplentes.reduce((acc, m) => acc + m.valor, 0);

  const responsavel = (alunoId: string) => {
    const a = alunos.find((al) => al.id === alunoId);
    return a?.responsaveis.find((r) => r.principal) ?? a?.responsaveis[0];
  };

  const cobrarWhatsApp = (m: Mensalidade) => {
    const resp = responsavel(m.alunoId);
    if (!resp) {
      toast.error("Sem responsável cadastrado", "Cadastre o responsável principal na ficha do aluno");
      return;
    }
    const telSemMais = resp.telefone.replace(/\D/g, "");
    if (telSemMais.length < 10) {
      toast.error("Telefone inválido", "Revise o telefone do responsável antes de cobrar");
      return;
    }
    const templateKey =
      m.diasAtraso <= 7 ? "Cordial (até 7 dias)"
      : m.diasAtraso <= 15 ? "Formal (até 15 dias)"
      : m.diasAtraso <= 30 ? "Negociação (até 30 dias)"
      : "Última (30+ dias)";
    const texto = TEMPLATES_COBRANCA[templateKey](resp.nome, m.alunoNome, formatBRL(m.valor), m.diasAtraso);
    const telComDDI = telSemMais.startsWith("55") ? telSemMais : `55${telSemMais}`;
    const janela = window.open(
      `https://wa.me/${telComDDI}?text=${encodeURIComponent(texto)}`,
      "_blank",
      "noopener,noreferrer"
    );
    if (!janela) {
      toast.warning("Pop-up bloqueado", "Permita pop-ups para abrir a cobrança no WhatsApp");
      return;
    }
    toast.info("WhatsApp aberto", "Revise e confirme o envio na janela do WhatsApp.");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger" />
              Régua de Inadimplência
            </CardTitle>
            <CardDescription>
              {inadimplentes.length} família(s) em atraso · total {formatBRL(totalInad)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {inadimplentes.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            🎉 Nenhuma mensalidade em atraso em {periodo.label}. Bom trabalho!
          </div>
        ) : (
          inadimplentes.map((m) => {
            const resp = responsavel(m.alunoId);
            const f = faixaAtraso(m.diasAtraso);
            return (
              <div key={m.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-rose-100 text-rose-700 text-xs">
                        {initials(m.alunoNome)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-sm">{m.alunoNome}</div>
                      <div className="text-xs text-muted-foreground">{m.turmaNome}</div>
                    </div>
                  </div>

                  <div className="flex flex-col text-sm">
                    <span className="text-muted-foreground text-xs">Responsável</span>
                    <span className="font-medium">{resp?.nome ?? "—"}</span>
                  </div>

                  <div className="flex flex-col text-sm">
                    <span className="text-muted-foreground text-xs">Valor</span>
                    <span className="font-semibold">{formatBRL(m.valor)}</span>
                  </div>

                  <div className="flex flex-col text-sm">
                    <span className="text-muted-foreground text-xs">Atraso</span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", f.cor)} />
                      <span className="font-semibold">{m.diasAtraso} dias</span>
                      <Badge variant="outline" className="ml-1 text-[10px]">
                        {f.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => cobrarWhatsApp(m)}
                      disabled={!resp}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      Abrir WhatsApp
                    </Button>
                    {resp?.telefone && (
                      <a
                        href={`tel:${resp.telefone.replace(/\D/g, "")}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-accent"
                        title="Ligar"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    <Button size="sm" variant="ghost" title="Renegociar" disabled>
                      <RefreshCcw className="mr-1.5 h-4 w-4" /> Renegociar
                    </Button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                  <span>Ação sugerida: <strong className="text-foreground">{f.acao}</strong></span>
                  <span>{resp?.telefone ?? "—"}</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

    </Card>
  );
}
