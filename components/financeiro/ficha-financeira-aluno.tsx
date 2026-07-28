"use client";

import * as React from "react";
import { Wallet, Sparkles, Check, Loader2, CircleDollarSign, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { formatBRL, formatDateBR } from "@/lib/utils";
import type { Aluno, Cobranca, FormaPagamento } from "@/lib/types";

const FORMAS: FormaPagamento[] = ["Dinheiro", "Pix", "Cartão", "Boleto"];
const selectCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Status exibido: cobrança vencida e não paga aparece como "Atrasada".
function statusExibido(c: Cobranca): "Pago" | "Atrasada" | "Pendente" {
  if (c.status === "Pago") return "Pago";
  if (c.vencimento && c.vencimento < hojeISO()) return "Atrasada";
  return "Pendente";
}

export function FichaFinanceiraAluno({ aluno }: { aluno: Aluno }) {
  const { update: updateAluno } = useEntidade("alunos");
  const { items: cobrancas, update: updateCobranca, reset: recarregarCobrancas } = useEntidade("cobrancas");
  const toast = useToast();

  const cobrancasAluno = React.useMemo(
    () =>
      cobrancas
        .filter((c) => c.alunoId === aluno.id)
        .sort((a, b) => (a.tipo === b.tipo ? a.vencimento.localeCompare(b.vencimento) : a.tipo === "matricula" ? -1 : 1)),
    [cobrancas, aluno.id]
  );

  // ---- Formulário do plano (tudo em branco para preencher) ----
  const [taxa, setTaxa] = React.useState(aluno.matriculaTaxa != null ? String(aluno.matriculaTaxa) : "");
  const [forma, setForma] = React.useState<FormaPagamento | "">(aluno.matriculaForma ?? "");
  const [modalidade, setModalidade] = React.useState<"avista" | "parcelado">(aluno.matriculaModalidade ?? "avista");
  const [parcelas, setParcelas] = React.useState(aluno.matriculaParcelas != null ? String(aluno.matriculaParcelas) : "3");
  const [mensalidade, setMensalidade] = React.useState(aluno.mensalidadeValor != null ? String(aluno.mensalidadeValor) : "");
  const [periodicidade, setPeriodicidade] = React.useState<"mensal" | "anual">(aluno.mensalidadePeriodicidade ?? "mensal");
  const [diaVenc, setDiaVenc] = React.useState(aluno.diaVencimento != null ? String(aluno.diaVencimento) : "10");

  const [salvando, setSalvando] = React.useState(false);
  const [gerando, setGerando] = React.useState(false);

  const num = (s: string) => {
    const n = Number(String(s).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  async function persistPlano() {
    await updateAluno(aluno.id, {
      matriculaTaxa: taxa.trim() === "" ? undefined : num(taxa),
      matriculaForma: forma || undefined,
      matriculaModalidade: modalidade,
      matriculaParcelas: modalidade === "parcelado" ? Math.max(1, Math.min(48, Math.trunc(num(parcelas)) || 1)) : 1,
      mensalidadeValor: mensalidade.trim() === "" ? undefined : num(mensalidade),
      mensalidadePeriodicidade: periodicidade,
      diaVencimento: Math.min(28, Math.max(1, Math.trunc(num(diaVenc)) || 10)),
    });
  }

  const salvarPlano = async () => {
    setSalvando(true);
    try {
      await persistPlano();
      toast.success("Plano salvo", "As condições de pagamento foram gravadas.");
    } catch {
      /* updateAluno já mostra o erro */
    } finally {
      setSalvando(false);
    }
  };

  const gerarCobrancas = async () => {
    if (num(taxa) <= 0 && num(mensalidade) <= 0) {
      toast.error("Preencha os valores", "Informe a taxa de matrícula e/ou o valor da mensalidade.");
      return;
    }
    setGerando(true);
    try {
      await persistPlano();
      const r = await fetch("/api/cobrancas/gerar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alunoId: aluno.id }),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string; items?: Cobranca[] };
      if (!r.ok) {
        toast.error("Não foi possível gerar", data.error || "Tente novamente.");
        return;
      }
      recarregarCobrancas();
      window.dispatchEvent(new CustomEvent("semente:changed:cobrancas"));
      toast.success("Cobranças geradas", `${data.items?.length ?? 0} cobranças criadas.`);
    } catch {
      toast.error("Não foi possível gerar", "Confira a conexão e tente de novo.");
    } finally {
      setGerando(false);
    }
  };

  // ---- Marcar como pago ----
  const [pagando, setPagando] = React.useState<Cobranca | null>(null);
  const [pagoForma, setPagoForma] = React.useState<FormaPagamento>("Dinheiro");
  const [pagoData, setPagoData] = React.useState(hojeISO());

  const abrirPagamento = (c: Cobranca) => {
    setPagando(c);
    setPagoForma((aluno.matriculaForma as FormaPagamento) || "Dinheiro");
    setPagoData(hojeISO());
  };

  const confirmarPagamento = async () => {
    if (!pagando) return;
    try {
      await updateCobranca(pagando.id, {
        status: "Pago",
        valorPago: pagando.valor,
        dataPagamento: pagoData,
        formaPagamento: pagoForma,
      });
      toast.success("Pagamento registrado", `${pagando.descricao} — ${formatBRL(pagando.valor)}.`);
      setPagando(null);
    } catch {
      /* updateCobranca já mostra o erro */
    }
  };

  // ---- Resumo ----
  const totalContrato = cobrancasAluno.reduce((s, c) => s + c.valor, 0);
  const totalPago = cobrancasAluno.filter((c) => c.status === "Pago").reduce((s, c) => s + (c.valorPago ?? c.valor), 0);
  const emAberto = totalContrato - totalPago;
  const proximo = cobrancasAluno
    .filter((c) => c.status !== "Pago")
    .map((c) => c.vencimento)
    .sort()[0];

  const matriculaCobrancas = cobrancasAluno.filter((c) => c.tipo === "matricula");
  const mensalidadeCobrancas = cobrancasAluno.filter((c) => c.tipo === "mensalidade");

  return (
    <div className="space-y-6">
      {/* Plano de pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Plano de pagamento
          </CardTitle>
          <CardDescription>
            Defina a taxa de matrícula e a mensalidade. Depois clique em “Gerar cobranças” para criar as parcelas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Matrícula */}
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Taxa de matrícula</div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="ff-taxa">Valor (R$)</Label>
                <Input id="ff-taxa" inputMode="decimal" placeholder="0,00" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ff-forma">Forma de pagamento</Label>
                <select id="ff-forma" className={selectCls} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento | "")}>
                  <option value="">—</option>
                  {FORMAS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ff-modalidade">Modalidade</Label>
                <select id="ff-modalidade" className={selectCls} value={modalidade} onChange={(e) => setModalidade(e.target.value as "avista" | "parcelado")}>
                  <option value="avista">À vista</option>
                  <option value="parcelado">Parcelado</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ff-parcelas">Nº de parcelas</Label>
                <Input
                  id="ff-parcelas"
                  type="number"
                  min={1}
                  max={48}
                  disabled={modalidade !== "parcelado"}
                  value={parcelas}
                  onChange={(e) => setParcelas(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Mensalidade */}
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mensalidade</div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="ff-mensalidade">{periodicidade === "anual" ? "Valor anual (R$)" : "Valor mensal (R$)"}</Label>
                <Input id="ff-mensalidade" inputMode="decimal" placeholder="0,00" value={mensalidade} onChange={(e) => setMensalidade(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ff-periodicidade">Cobrança</Label>
                <select id="ff-periodicidade" className={selectCls} value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value as "mensal" | "anual")}>
                  <option value="mensal">Mensal (12 meses)</option>
                  <option value="anual">Anual (pagamento único)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ff-dia">Dia de vencimento</Label>
                <Input id="ff-dia" type="number" min={1} max={28} value={diaVenc} onChange={(e) => setDiaVenc(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button variant="outline" onClick={salvarPlano} disabled={salvando || gerando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar plano
            </Button>
            <Button onClick={gerarCobrancas} disabled={gerando || salvando}>
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar cobranças
            </Button>
          </div>
          {cobrancasAluno.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Gerar novamente substitui as cobranças <strong>em aberto</strong> deste aluno. As já pagas são preservadas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resumo */}
      {cobrancasAluno.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ResumoCard rotulo="Total do contrato" valor={formatBRL(totalContrato)} />
          <ResumoCard rotulo="Total pago" valor={formatBRL(totalPago)} cor="text-emerald-600" />
          <ResumoCard rotulo="Em aberto" valor={formatBRL(emAberto)} cor={emAberto > 0 ? "text-amber-600" : "text-emerald-600"} />
          <ResumoCard rotulo="Próximo vencimento" valor={proximo ? formatDateBR(proximo) : "—"} />
        </div>
      )}

      {/* Cobranças */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" /> Cobranças do aluno
          </CardTitle>
          <CardDescription>Parcelas da matrícula e mensalidades. Marque cada uma como paga ao receber.</CardDescription>
        </CardHeader>
        <CardContent>
          {cobrancasAluno.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Nenhuma cobrança ainda. Preencha o plano acima e clique em <strong>“Gerar cobranças”</strong>.
            </div>
          ) : (
            <div className="space-y-6">
              {matriculaCobrancas.length > 0 && (
                <GrupoCobrancas titulo="Matrícula" itens={matriculaCobrancas} onPagar={abrirPagamento} />
              )}
              {mensalidadeCobrancas.length > 0 && (
                <GrupoCobrancas titulo="Mensalidades" itens={mensalidadeCobrancas} onPagar={abrirPagamento} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal marcar pago */}
      {pagando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPagando(null)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Registrar pagamento</h3>
                <p className="mt-1 text-sm text-muted-foreground">{pagando.descricao}</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setPagando(null)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3 text-center">
              <div className="text-xs uppercase text-muted-foreground">Valor</div>
              <div className="text-2xl font-bold">{formatBRL(pagando.valor)}</div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pg-forma">Forma de pagamento</Label>
                <select id="pg-forma" className={selectCls} value={pagoForma} onChange={(e) => setPagoForma(e.target.value as FormaPagamento)}>
                  {FORMAS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pg-data">Data do pagamento</Label>
                <Input id="pg-data" type="date" value={pagoData} onChange={(e) => setPagoData(e.target.value)} />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPagando(null)}>Cancelar</Button>
              <Button className="flex-1" onClick={confirmarPagamento}>
                <Check className="h-4 w-4" /> Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResumoCard({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</div>
        <div className={`mt-1 text-xl font-bold ${cor ?? ""}`}>{valor}</div>
      </CardContent>
    </Card>
  );
}

function GrupoCobrancas({
  titulo,
  itens,
  onPagar,
}: {
  titulo: string;
  itens: Cobranca[];
  onPagar: (c: Cobranca) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</div>
      <div className="divide-y rounded-lg border">
        {itens.map((c) => {
          const st = statusExibido(c);
          return (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{c.descricao}</div>
                <div className="text-xs text-muted-foreground">
                  Vencimento: {formatDateBR(c.vencimento)}
                  {c.status === "Pago" && c.dataPagamento ? ` · Pago em ${formatDateBR(c.dataPagamento)}${c.formaPagamento ? ` (${c.formaPagamento})` : ""}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-semibold">{formatBRL(c.valor)}</div>
                  <Badge variant={st === "Pago" ? "success" : st === "Atrasada" ? "danger" : "warning"}>{st}</Badge>
                </div>
                {c.status !== "Pago" && (
                  <Button size="sm" variant="outline" onClick={() => onPagar(c)}>
                    <Check className="h-4 w-4" /> Pagar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
