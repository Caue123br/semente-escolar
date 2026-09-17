"use client";

import * as React from "react";
import { Wallet, Sparkles, Check, Loader2, CircleDollarSign, X, Undo2, ShieldAlert, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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

// Nome que /api/cobrancas/[id] dá à cobrança aberta com o que faltou de um
// recebimento parcial.
const SUFIXO_SALDO = / — saldo restante$/;
const descricaoBase = (descricao: string) => descricao.replace(/( — saldo restante)+$/, "");

/** Mantém no campo de dinheiro apenas dígitos, ponto e vírgula. */
function limparEntradaValor(texto: string): string {
  return texto.replace(/[^\d.,]/g, "");
}

/**
 * Lê o valor como a secretaria digita: "1200", "1200,50", "1200.50", "1.200,50".
 * O ponto só é separador de milhar quando não há vírgula e o último grupo tem 3
 * dígitos ("1.200" = mil e duzentos); "1200.50" e "900.00" valem como decimal.
 */
function valorDigitado(texto: string): number {
  const limpo = limparEntradaValor(texto);
  if (!limpo) return 0;
  const temVirgula = limpo.includes(",");
  const partes = limpo.split(temVirgula ? "," : ".");
  let inteiro = partes[0];
  let centavos = "";
  if (partes.length > 1) {
    const ultima = partes[partes.length - 1];
    if (!temVirgula && ultima.length === 3) {
      inteiro = partes.join("");
    } else {
      inteiro = partes.slice(0, -1).join("");
      centavos = ultima;
    }
  }
  const n = Number(`${inteiro.replace(/\D/g, "") || "0"}.${centavos.replace(/\D/g, "") || "0"}`);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Devolve o valor no formato do campo: 1200.5 -> "1.200,50". */
function formatarCampoValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Traduz a falha de carregamento das cobranças em aviso para quem opera. */
function motivoFalhaCobrancas(erro: string): { titulo: string; detalhe: string; bloqueio: boolean } {
  const e = erro.toLowerCase();
  if (e.includes("permiss")) {
    return {
      titulo: "Seu perfil não tem acesso ao financeiro",
      detalhe: "Peça para a direção gerar o plano de pagamento deste aluno.",
      bloqueio: true,
    };
  }
  if (e.includes("sessão") || e.includes("autentic")) {
    return {
      titulo: "Sua sessão expirou",
      detalhe: "Entre de novo no sistema para ver as cobranças deste aluno.",
      bloqueio: true,
    };
  }
  if (e.includes("módulo desativado")) {
    return {
      titulo: "O módulo financeiro está desativado",
      detalhe: "Peça para a direção ativar o módulo financeiro em Configurações.",
      bloqueio: true,
    };
  }
  return {
    titulo: "Não foi possível carregar as cobranças",
    detalhe: `${erro} O que aparece abaixo pode estar desatualizado.`,
    bloqueio: false,
  };
}

export function FichaFinanceiraAluno({ aluno }: { aluno: Aluno }) {
  const { update: updateAluno } = useEntidade("alunos");
  const {
    items: cobrancas,
    update: updateCobranca,
    reset: recarregarCobrancas,
    carregando: carregandoCobrancas,
    erro: erroCobrancas,
  } = useEntidade("cobrancas");
  const toast = useToast();

  const falhaCobrancas = erroCobrancas ? motivoFalhaCobrancas(erroCobrancas) : null;

  const cobrancasAluno = React.useMemo(
    () =>
      cobrancas
        .filter((c) => c.alunoId === aluno.id)
        .sort((a, b) => (a.tipo === b.tipo ? a.vencimento.localeCompare(b.vencimento) : a.tipo === "matricula" ? -1 : 1)),
    [cobrancas, aluno.id]
  );

  // ---- Formulário do plano (tudo em branco para preencher) ----
  const [taxa, setTaxa] = React.useState(aluno.matriculaTaxa != null ? formatarCampoValor(aluno.matriculaTaxa) : "");
  const [forma, setForma] = React.useState<FormaPagamento | "">(aluno.matriculaForma ?? "");
  const [modalidade, setModalidade] = React.useState<"avista" | "parcelado">(aluno.matriculaModalidade ?? "avista");
  const [parcelas, setParcelas] = React.useState(aluno.matriculaParcelas != null ? String(aluno.matriculaParcelas) : "3");
  const [mensalidade, setMensalidade] = React.useState(
    aluno.mensalidadeValor != null ? formatarCampoValor(aluno.mensalidadeValor) : ""
  );
  const [periodicidade, setPeriodicidade] = React.useState<"mensal" | "anual">(aluno.mensalidadePeriodicidade ?? "mensal");
  const [diaVenc, setDiaVenc] = React.useState(aluno.diaVencimento != null ? String(aluno.diaVencimento) : "10");

  const [salvando, setSalvando] = React.useState(false);
  const [gerando, setGerando] = React.useState(false);

  const valorTaxa = valorDigitado(taxa);
  const valorMensalidade = valorDigitado(mensalidade);
  const qtdParcelas = Math.max(1, Math.min(48, Math.trunc(valorDigitado(parcelas)) || 1));

  async function persistPlano() {
    await updateAluno(aluno.id, {
      matriculaTaxa: taxa.trim() === "" ? undefined : valorTaxa,
      matriculaForma: forma || undefined,
      matriculaModalidade: modalidade,
      matriculaParcelas: modalidade === "parcelado" ? qtdParcelas : 1,
      mensalidadeValor: mensalidade.trim() === "" ? undefined : valorMensalidade,
      mensalidadePeriodicidade: periodicidade,
      diaVencimento: Math.min(28, Math.max(1, Math.trunc(valorDigitado(diaVenc)) || 10)),
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
    if (valorTaxa <= 0 && valorMensalidade <= 0) {
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

  // ---- Estornar pagamento lançado por engano ----
  const [estornando, setEstornando] = React.useState<Cobranca | null>(null);

  // Recebimento parcial deixa a parcela reduzida ao valor recebido e abre uma
  // cobrança "— saldo restante" (nome dado por /api/cobrancas/[id]). Estornar a
  // reduzida deixa as duas linhas em aberto, então o aviso precisa dizer isso.
  const saldoRestanteDe = (c: Cobranca) =>
    cobrancasAluno.find(
      (outra) =>
        outra.id !== c.id &&
        outra.status !== "Pago" &&
        SUFIXO_SALDO.test(outra.descricao) &&
        descricaoBase(outra.descricao) === descricaoBase(c.descricao)
    );

  // TODO(auditoria): o PATCH de /api/cobrancas/[id] zera data_pagamento e
  // forma_pagamento ao sair de "Pago", mas o registrarAudit da rota guarda em
  // `antes` apenas {status, valor, valorPago} — a data e a forma originais somem
  // e um estorno feito por engano não pode ser refeito pela trilha. Incluir
  // dataPagamento, formaPagamento e o id da cobrança de saldo relacionada no
  // `antes` é alteração em app/api/cobrancas/[id]/route.ts.
  const confirmarEstorno = async () => {
    if (!estornando) return;
    const cobranca = estornando;
    // A cobrança volta a ser dívida: atrasada se o vencimento já passou.
    const novoStatus = cobranca.vencimento && cobranca.vencimento < hojeISO() ? "Atrasada" : "Pendente";
    try {
      // O PATCH de /api/cobrancas/[id] limpa valor pago, data e forma ao sair de "Pago",
      // grava a trilha de auditoria e refaz o espelho em mensalidades.
      await updateCobranca(cobranca.id, { status: novoStatus });
      toast.success(
        "Pagamento estornado",
        `${cobranca.descricao} voltou para ${novoStatus === "Atrasada" ? "atrasada" : "pendente"}.`
      );
      setEstornando(null);
    } catch {
      /* updateCobranca já mostra o erro */
    }
  };

  const saldoDoEstorno = estornando ? saldoRestanteDe(estornando) : undefined;

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
                <Input
                  id="ff-taxa"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={taxa}
                  onChange={(e) => setTaxa(limparEntradaValor(e.target.value))}
                  onBlur={() => setTaxa(taxa.trim() === "" ? "" : formatarCampoValor(valorTaxa))}
                />
                <p className="text-xs text-muted-foreground">
                  {taxa.trim() === "" ? (
                    "Deixe em branco se não houver taxa."
                  ) : matriculaCobrancas.length === 0 ? (
                    <>
                      Vai gerar <strong>{formatBRL(valorTaxa)}</strong>
                      {modalidade === "parcelado" ? ` em ${qtdParcelas} parcelas` : " à vista"}
                    </>
                  ) : (
                    /* Com parcela de matrícula já na lista, gerar cobra só a diferença
                       (taxa − já cobrado) — prometer o total em N parcelas seria falso. */
                    <>
                      Taxa total de <strong>{formatBRL(valorTaxa)}</strong>
                      {modalidade === "parcelado" ? ` em até ${qtdParcelas} parcelas` : " à vista"}. Já há{" "}
                      {matriculaCobrancas.length === 1 ? "1 parcela" : `${matriculaCobrancas.length} parcelas`} de
                      matrícula na lista: gerar de novo cobra só o que falta.
                    </>
                  )}
                </p>
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
                <Input
                  id="ff-mensalidade"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={mensalidade}
                  onChange={(e) => setMensalidade(limparEntradaValor(e.target.value))}
                  onBlur={() => setMensalidade(mensalidade.trim() === "" ? "" : formatarCampoValor(valorMensalidade))}
                />
                <p className="text-xs text-muted-foreground">
                  {mensalidade.trim() === "" ? (
                    "Deixe em branco se não houver mensalidade."
                  ) : (
                    <>
                      Vai gerar <strong>{formatBRL(valorMensalidade)}</strong>
                      {periodicidade === "anual" ? " em parcela única" : " por mês"}
                    </>
                  )}
                </p>
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
            <Button onClick={gerarCobrancas} disabled={gerando || salvando || falhaCobrancas?.bloqueio === true}>
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar cobranças
            </Button>
          </div>
          {falhaCobrancas?.bloqueio && (
            <p className="text-xs text-amber-700">
              {falhaCobrancas.titulo}. {falhaCobrancas.detalhe}
            </p>
          )}
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
        <CardContent className="space-y-4">
          {/* Lista vazia e falha de carregamento são coisas diferentes — não misturar. */}
          {falhaCobrancas && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{falhaCobrancas.titulo}</div>
                <p className="mt-1">{falhaCobrancas.detalhe}</p>
                {!falhaCobrancas.bloqueio && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={recarregarCobrancas}>
                    <RefreshCw className="h-4 w-4" /> Tentar de novo
                  </Button>
                )}
              </div>
            </div>
          )}
          {/* Cada baixa recarrega a lista (o store marca carregando em toda recarga):
              só mostra o spinner quando não há nada para manter na tela, senão a
              lista pisca e a página salta a cada "Pagar". */}
          {carregandoCobrancas && cobrancasAluno.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando cobranças…
            </div>
          ) : cobrancasAluno.length === 0 ? (
            !falhaCobrancas && (
              <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                Nenhuma cobrança ainda. Preencha o plano acima e clique em <strong>“Gerar cobranças”</strong>.
              </div>
            )
          ) : (
            <div className="space-y-6">
              {matriculaCobrancas.length > 0 && (
                <GrupoCobrancas
                  titulo="Matrícula"
                  itens={matriculaCobrancas}
                  onPagar={abrirPagamento}
                  onEstornar={setEstornando}
                />
              )}
              {mensalidadeCobrancas.length > 0 && (
                <GrupoCobrancas
                  titulo="Mensalidades"
                  itens={mensalidadeCobrancas}
                  onPagar={abrirPagamento}
                  onEstornar={setEstornando}
                />
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

      <ConfirmDialog
        aberto={estornando !== null}
        titulo="Estornar pagamento?"
        descricao={
          estornando
            ? [
                `${estornando.descricao} — ${formatBRL(estornando.valorPago ?? estornando.valor)} volta a ficar em aberto e o recebimento sai do financeiro do mês. Use isso quando o pagamento foi lançado por engano.`,
                saldoDoEstorno
                  ? `Esta parcela foi recebida em parte: o saldo de ${formatBRL(saldoDoEstorno.valor)} já está numa cobrança separada. Depois do estorno as duas linhas ficam em aberto — confira os valores e ajuste se precisar.`
                  : "",
              ]
                .filter(Boolean)
                .join(" ")
            : ""
        }
        textoBotaoConfirmar="Estornar"
        variante="danger"
        onConfirmar={confirmarEstorno}
        onFechar={() => setEstornando(null)}
      />
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
  onEstornar,
}: {
  titulo: string;
  itens: Cobranca[];
  onPagar: (c: Cobranca) => void;
  onEstornar: (c: Cobranca) => void;
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
                {c.status === "Pago" ? (
                  <Button size="sm" variant="outline" onClick={() => onEstornar(c)}>
                    <Undo2 className="h-4 w-4" /> Estornar
                  </Button>
                ) : (
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
