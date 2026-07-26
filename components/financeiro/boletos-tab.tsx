"use client";

import * as React from "react";
import { QrCode, Receipt } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDateBR } from "@/lib/utils";
import { useEntidade } from "@/lib/data/store";
import { usePeriodoContexto } from "@/lib/contexto-periodo";

export function BoletosTab() {
  const { periodo } = usePeriodoContexto();
  const { items: mensalidades } = useEntidade("mensalidades");
  const [busca, setBusca] = React.useState("");
  const [paginaAtual, setPaginaAtual] = React.useState(1);
  const POR_PAGINA = 10;

  const doMes = mensalidades.filter((m) => m.competencia === periodo.competencia);
  const filtrados = doMes.filter((m) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      m.alunoNome.toLowerCase().includes(q) ||
      m.turmaNome.toLowerCase().includes(q) ||
      String(m.valor).includes(q)
    );
  });
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visiveis = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  React.useEffect(() => {
    if (paginaAtual > totalPaginas) setPaginaAtual(totalPaginas);
  }, [paginaAtual, totalPaginas]);

  const pagas = doMes.filter((m) => m.status === "Paga");
  const pagasPix = pagas.filter((m) => m.formaPagamento === "Pix").length;
  const pagasBoleto = pagas.filter((m) => m.formaPagamento === "Boleto").length;

  const taxaPix = pagas.length > 0 ? (pagasPix / pagas.length) * 100 : 0;

  const aguardando = doMes.filter((m) => m.status === "A Vencer" || m.status === "Vence Hoje");

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Mensalidades cadastradas</div>
          <div className="mt-1 text-2xl font-bold">{doMes.length}</div>
          <div className="text-xs text-muted-foreground mt-1">{periodo.label}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Aguardando pagamento</div>
          <div className="mt-1 text-2xl font-bold text-warning">{aguardando.length}</div>
          <div className="text-xs text-muted-foreground mt-1">{formatBRL(aguardando.reduce((a, m) => a + m.valor, 0))} a receber</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Taxa de pagamento via Pix</div>
          <div className="mt-1 text-2xl font-bold text-success">{taxaPix.toFixed(0)}%</div>
          <div className="text-xs text-muted-foreground mt-1">{pagasPix} Pix · {pagasBoleto} boleto</div>
        </Card>
      </div>

      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <QrCode className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm text-amber-900">Integração Pix/Boleto automatizada — em breve</div>
            <div className="text-xs text-amber-800 mt-1">
              Pra gerar Pix QR e boletos automaticamente conforme as mensalidades, configure uma integração com banco/PSP
              (Sicredi, Banco do Brasil, ASAAS, Iugu, etc). Hoje você marca manualmente como paga em &quot;Mensalidades&quot;.
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Mensalidades de {periodo.label}
              </CardTitle>
              <CardDescription>{filtrados.length} de {doMes.length} mensalidades</CardDescription>
            </div>
            <input
              type="text"
              placeholder="Buscar aluno, turma ou valor..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }}
              className="h-9 w-64 rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtrados.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              {busca ? `Nenhuma mensalidade encontrada pra "${busca}".` : `Nenhuma mensalidade em ${periodo.label}.`}
            </div>
          ) : (
            visiveis.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm flex-wrap gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{m.alunoNome}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.turmaNome} · vence {formatDateBR(m.vencimento)}
                    {m.formaPagamento && ` · ${m.formaPagamento}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatBRL(m.valor)}</div>
                  <Badge
                    variant={
                      m.status === "Paga" ? "success"
                      : m.status === "Atrasada" ? "danger"
                      : "warning"
                    }
                    className="text-[10px]"
                  >
                    {m.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between gap-2 pt-3 text-xs">
              <button
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="rounded-md border px-3 py-1 hover:bg-accent disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-muted-foreground">
                Página {paginaAtual} de {totalPaginas}
              </span>
              <button
                onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
                className="rounded-md border px-3 py-1 hover:bg-accent disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
