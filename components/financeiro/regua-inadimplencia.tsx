"use client";

import * as React from "react";
import { MessageCircle, Phone, FileText, RefreshCcw, AlertTriangle } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { inadimplentes } from "@/lib/mock-data/financeiro";
import { alunos } from "@/lib/mock-data/alunos";
import { templatesMensagens } from "@/lib/mock-data/whatsapp";
import { formatBRL, initials, cn } from "@/lib/utils";
import { useToast } from "@/lib/toast";
import type { Mensalidade } from "@/lib/types";

function faixaAtraso(dias: number): {
  label: string;
  cor: string;
  acao: string;
} {
  if (dias <= 7) return { label: "Recente", cor: "bg-warning", acao: "Lembrar via WhatsApp" };
  if (dias <= 15) return { label: "Atenção", cor: "bg-orange-500", acao: "Cobrança formal" };
  if (dias <= 30) return { label: "Crítico", cor: "bg-danger", acao: "Negociação direta" };
  return { label: "Grave", cor: "bg-red-700", acao: "Encaminhamento jurídico" };
}

export function ReguaInadimplencia() {
  const [aberta, setAberta] = React.useState<"cobranca" | "renegociar" | null>(null);
  const [selecionada, setSelecionada] = React.useState<Mensalidade | null>(null);
  const [template, setTemplate] = React.useState(templatesMensagens[0].id);
  const toast = useToast();

  const abrir = (tipo: "cobranca" | "renegociar", m: Mensalidade) => {
    setSelecionada(m);
    setAberta(tipo);
  };

  const responsavel = (alunoId: string) => {
    const a = alunos.find((al) => al.id === alunoId);
    return a?.responsaveis.find((r) => r.principal) ?? a?.responsaveis[0];
  };

  const totalInad = inadimplentes.reduce((acc, m) => acc + m.valor, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-danger" />
                Régua de Inadimplência
              </CardTitle>
              <CardDescription>
                {inadimplentes.length} famílias · total {formatBRL(totalInad)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <MessageCircle className="mr-2 h-4 w-4" /> Cobrar todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {inadimplentes.map((m) => {
            const f = faixaAtraso(m.diasAtraso);
            const resp = responsavel(m.alunoId);
            return (
              <div
                key={m.id}
                className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/15 text-primary text-xs">
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
                    <span className="font-medium">{resp?.nome}</span>
                  </div>

                  <div className="flex flex-col text-sm">
                    <span className="text-muted-foreground text-xs">Valor em aberto</span>
                    <span className="font-semibold">{formatBRL(m.valor)}</span>
                  </div>

                  <div className="flex flex-col text-sm">
                    <span className="text-muted-foreground text-xs">Dias em atraso</span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", f.cor)} />
                      <span className="font-semibold">
                        {m.diasAtraso} dias
                      </span>
                      <Badge variant="outline" className="ml-1 text-[10px]">
                        {f.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => abrir("cobranca", m)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <MessageCircle className="mr-1.5 h-4 w-4" /> Cobrar WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => abrir("renegociar", m)}>
                      <RefreshCcw className="mr-1.5 h-4 w-4" /> Renegociar
                    </Button>
                    <Button size="sm" variant="ghost" title="Ligar">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" title="Histórico">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Ação sugerida: <strong className="text-foreground">{f.acao}</strong></span>
                  <span>{resp?.telefone}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Dialog Cobrança */}
      <Dialog open={aberta === "cobranca"} onOpenChange={(v) => !v && setAberta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              Cobrar via WhatsApp
            </DialogTitle>
            <DialogDescription>
              Enviar mensagem para {selecionada && responsavel(selecionada.alunoId)?.nome} ·{" "}
              {selecionada && responsavel(selecionada.alunoId)?.telefone}
            </DialogDescription>
          </DialogHeader>
          {selecionada && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aluno:</span>
                  <span className="font-medium">{selecionada.alunoNome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-semibold">{formatBRL(selecionada.valor)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atraso:</span>
                  <span className="font-medium">{selecionada.diasAtraso} dias</span>
                </div>
              </div>

              <div>
                <Label>Template</Label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {templatesMensagens
                    .filter((t) => t.tipo === "Cobrança")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <Label>Mensagem (preview)</Label>
                <div className="mt-1.5 rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm leading-relaxed">
                  {templatesMensagens
                    .find((t) => t.id === template)
                    ?.texto.replace("{{responsavel}}", responsavel(selecionada.alunoId)?.nome ?? "")
                    .replace("{{aluno}}", selecionada.alunoNome)
                    .replace("{{competencia}}", "junho/2026")
                    .replace("{{dias}}", String(selecionada.diasAtraso))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberta(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const resp = selecionada && responsavel(selecionada.alunoId);
                toast.success(
                  "Cobrança enviada via WhatsApp",
                  `${resp?.nome} foi notificado sobre o débito de ${selecionada && formatBRL(selecionada.valor)}.`
                );
                setAberta(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Enviar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Renegociar */}
      <Dialog open={aberta === "renegociar"} onOpenChange={(v) => !v && setAberta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5 text-primary" />
              Renegociar mensalidade
            </DialogTitle>
            <DialogDescription>
              {selecionada?.alunoNome} · {selecionada && formatBRL(selecionada.valor)} em aberto
            </DialogDescription>
          </DialogHeader>
          {selecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade de parcelas</Label>
                  <Input type="number" defaultValue={3} min={1} max={12} className="mt-1.5" />
                </div>
                <div>
                  <Label>Primeira parcela</Label>
                  <Input type="date" defaultValue="2026-06-15" className="mt-1.5" />
                </div>
                <div>
                  <Label>Desconto (%)</Label>
                  <Input type="number" defaultValue={5} min={0} max={50} className="mt-1.5" />
                </div>
                <div>
                  <Label>Juros (%)</Label>
                  <Input type="number" defaultValue={0} min={0} className="mt-1.5" />
                </div>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                <div className="font-semibold mb-1">Resumo da proposta</div>
                <div className="text-muted-foreground">
                  3 parcelas de {formatBRL((selecionada.valor * 0.95) / 3)} · total{" "}
                  {formatBRL(selecionada.valor * 0.95)} (com 5% de desconto)
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberta(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                toast.success(
                  "Renegociação confirmada",
                  `Proposta de 3 parcelas enviada para ${selecionada?.alunoNome}.`
                );
                setAberta(null);
              }}
            >
              Confirmar renegociação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
