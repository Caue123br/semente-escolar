"use client";

import * as React from "react";
import JsBarcode from "jsbarcode";
import { X, Printer, Tag, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/toast";
import { formatBRL } from "@/lib/utils";
import type { ItemEstoque } from "@/lib/types";

interface Props {
  aberto: boolean;
  onClose: () => void;
  itens: ItemEstoque[];
  onSalvarCodigo: (id: string, patch: Partial<ItemEstoque>) => Promise<void>;
}

// Gera um código interno numérico (prefixo 2 = uso interno na loja, padrão EAN).
function gerarCodigoInterno(): string {
  const n = Math.floor(Math.random() * 1e11);
  return "2" + String(n).padStart(11, "0");
}

function BarcodeSVG({ value }: { value: string }) {
  const ref = React.useRef<SVGSVGElement>(null);
  React.useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        width: 1.6,
        height: 44,
        fontSize: 13,
        margin: 2,
        displayValue: true,
      });
    } catch {
      /* valor inválido para o formato — ignora */
    }
  }, [value]);
  return <svg ref={ref} className="max-w-full" />;
}

export function EtiquetasModal({ aberto, onClose, itens, onSalvarCodigo }: Props) {
  const toast = useToast();
  const [quantidades, setQuantidades] = React.useState<Record<string, number>>({});
  const [gerandoId, setGerandoId] = React.useState<string | null>(null);

  // Ao abrir, começa com 1 etiqueta por item que já tem código.
  React.useEffect(() => {
    if (!aberto) return;
    const inicial: Record<string, number> = {};
    for (const i of itens) inicial[i.id] = i.codigoBarras ? 1 : 0;
    setQuantidades(inicial);
  }, [aberto, itens]);

  if (!aberto) return null;

  const setQtd = (id: string, v: number) =>
    setQuantidades((atual) => ({ ...atual, [id]: Math.max(0, Math.min(100, Math.trunc(v) || 0)) }));

  const gerarCodigo = async (item: ItemEstoque) => {
    setGerandoId(item.id);
    try {
      await onSalvarCodigo(item.id, { codigoBarras: gerarCodigoInterno() });
      setQuantidades((atual) => ({ ...atual, [item.id]: Math.max(1, atual[item.id] ?? 0) }));
      toast.success("Código gerado", `${item.nome} agora tem código de barras.`);
    } catch {
      /* store já mostra o erro (ex.: código duplicado) */
    } finally {
      setGerandoId(null);
    }
  };

  // Expande cada item na quantidade pedida (só os que têm código e qtd > 0).
  const etiquetas: ItemEstoque[] = [];
  for (const i of itens) {
    const q = quantidades[i.id] ?? 0;
    if (i.codigoBarras && q > 0) {
      for (let k = 0; k < q; k++) etiquetas.push(i);
    }
  }

  const totalEtiquetas = etiquetas.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8" onClick={onClose}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #folha-etiquetas, #folha-etiquetas * { visibility: visible !important; }
          #folha-etiquetas {
            position: fixed !important; inset: 0 !important; margin: 0 !important;
            padding: 8mm !important; background: #fff !important; display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important; gap: 4mm !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="w-full max-w-4xl rounded-2xl border bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="no-print flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Etiquetas de código de barras</h2>
              <p className="text-xs text-muted-foreground">Gere e imprima etiquetas para colar nos uniformes/produtos.</p>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Configuração: itens + quantidade */}
        <div className="no-print max-h-[40vh] space-y-2 overflow-y-auto px-6 py-4">
          {itens.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum produto de venda no estoque. Cadastre uniformes/produtos primeiro.
            </p>
          ) : (
            itens.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {i.nome} {i.tamanho ? <span className="text-muted-foreground">· Tam {i.tamanho}</span> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {i.codigoBarras ? `Código: ${i.codigoBarras}` : "Sem código de barras"}
                    {i.precoVenda ? ` · ${formatBRL(i.precoVenda)}` : ""}
                  </div>
                </div>
                {i.codigoBarras ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">etiquetas</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="h-9 w-20"
                      value={quantidades[i.id] ?? 0}
                      onChange={(e) => setQtd(i.id, Number(e.target.value))}
                    />
                  </div>
                ) : (
                  <Button size="sm" variant="outline" disabled={gerandoId === i.id} onClick={() => gerarCodigo(i)}>
                    {gerandoId === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Gerar código
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Ações */}
        <div className="no-print flex items-center justify-between border-t px-6 py-3">
          <span className="text-sm text-muted-foreground">
            {totalEtiquetas} etiqueta{totalEtiquetas === 1 ? "" : "s"} para imprimir
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button onClick={() => window.print()} disabled={totalEtiquetas === 0}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>

        {/* Prévia + folha de impressão */}
        {totalEtiquetas > 0 && (
          <div className="border-t px-6 py-4">
            <div className="no-print mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Prévia
            </div>
            <div
              id="folha-etiquetas"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              {etiquetas.map((i, idx) => (
                <div
                  key={`${i.id}-${idx}`}
                  className="flex flex-col items-center justify-between rounded-md border p-2 text-center"
                  style={{ breakInside: "avoid" }}
                >
                  <div className="w-full truncate text-[11px] font-semibold">{i.nome}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {i.tamanho ? `Tam ${i.tamanho}` : ""} {i.precoVenda ? formatBRL(i.precoVenda) : ""}
                  </div>
                  <BarcodeSVG value={i.codigoBarras as string} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
