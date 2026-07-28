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
  const [gerandoTodos, setGerandoTodos] = React.useState(false);
  const [aplicarN, setAplicarN] = React.useState(10);

  // Ao abrir, define 1 etiqueta por item com código — mas SEM sobrescrever o que
  // o usuário já ajustou (merge). Preserva as quantidades quando a lista de itens
  // é refeita (ex.: após "Gerar código" disparar um refetch). Limpa ao fechar.
  React.useEffect(() => {
    if (!aberto) {
      setQuantidades({});
      return;
    }
    setQuantidades((atual) => {
      const merged = { ...atual };
      for (const i of itens) {
        if (merged[i.id] === undefined) merged[i.id] = i.codigoBarras ? 1 : 0;
      }
      return merged;
    });
  }, [aberto, itens]);

  if (!aberto) return null;

  const setQtd = (id: string, v: number) =>
    setQuantidades((atual) => ({ ...atual, [id]: Math.max(0, Math.min(999, Math.trunc(v) || 0)) }));

  const comCodigo = itens.filter((i) => i.codigoBarras);
  const semCodigo = itens.filter((i) => !i.codigoBarras);

  // Ações em massa
  const aplicarTodos = (n: number) =>
    setQuantidades((atual) => {
      const m = { ...atual };
      const q = Math.max(0, Math.min(999, Math.trunc(n) || 0));
      for (const i of comCodigo) m[i.id] = q;
      return m;
    });
  const porEstoque = () =>
    setQuantidades((atual) => {
      const m = { ...atual };
      for (const i of comCodigo) m[i.id] = Math.max(0, Math.min(999, Math.trunc(i.quantidade) || 0));
      return m;
    });
  const limparTodos = () =>
    setQuantidades((atual) => {
      const m = { ...atual };
      for (const i of itens) m[i.id] = 0;
      return m;
    });
  const gerarTodosFaltantes = async () => {
    if (semCodigo.length === 0) return;
    setGerandoTodos(true);
    const okIds: string[] = [];
    for (const i of semCodigo) {
      try {
        await onSalvarCodigo(i.id, { codigoBarras: gerarCodigoInterno() });
        okIds.push(i.id);
      } catch {
        /* código duplicado — ignora e segue */
      }
    }
    // marca 1 etiqueta só para os que realmente ganharam código
    setQuantidades((atual) => {
      const m = { ...atual };
      for (const id of okIds) m[id] = Math.max(1, m[id] ?? 0);
      return m;
    });
    setGerandoTodos(false);
    toast.success("Códigos gerados", `${okIds.length} de ${semCodigo.length} produto(s) ganharam código de barras.`);
  };

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

  // Impressão em janela isolada — pagina corretamente em várias páginas e não
  // sofre interferência da UI do app (evita etiquetas cortadas / páginas em branco).
  const imprimir = () => {
    if (etiquetas.length === 0) return;
    if (etiquetas.length > 3000) {
      toast.error("Muitas etiquetas", "Máximo 3.000 por impressão. Reduza as quantidades ou imprima em lotes.");
      return;
    }
    if (
      etiquetas.length > 1000 &&
      !window.confirm(
        `Você vai gerar ${etiquetas.length} etiquetas. Isso pode deixar o navegador lento por alguns segundos. Continuar?`
      )
    ) {
      return;
    }
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      toast.error("Pop-up bloqueado", "Permita pop-ups deste site para imprimir as etiquetas.");
      return;
    }
    w.document.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas</title><style>' +
        "@page{margin:8mm}*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;margin:0}" +
        ".grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}" +
        ".lbl{border:1px solid #e5e7eb;border-radius:6px;padding:6px 4px;text-align:center;page-break-inside:avoid;break-inside:avoid}" +
        ".nome{font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
        ".sub{font-size:10px;color:#666;margin-bottom:2px;min-height:12px}svg{max-width:100%}" +
        "</style></head><body><div class='grid' id='g'></div></body></html>"
    );
    w.document.close();
    const g = w.document.getElementById("g");
    if (!g) return;
    const SVGNS = "http://www.w3.org/2000/svg";
    for (const i of etiquetas) {
      const cell = w.document.createElement("div");
      cell.className = "lbl";
      const nome = w.document.createElement("div");
      nome.className = "nome";
      nome.textContent = i.nome;
      cell.appendChild(nome);
      const sub = w.document.createElement("div");
      sub.className = "sub";
      sub.textContent = [i.tamanho ? `Tam ${i.tamanho}` : "", i.precoVenda ? formatBRL(i.precoVenda) : ""]
        .filter(Boolean)
        .join(" · ");
      cell.appendChild(sub);
      const svg = w.document.createElementNS(SVGNS, "svg");
      cell.appendChild(svg);
      try {
        JsBarcode(svg, i.codigoBarras as string, {
          format: "CODE128",
          width: 1.6,
          height: 44,
          fontSize: 13,
          margin: 2,
          displayValue: true,
        });
      } catch {
        /* ignora valor inválido */
      }
      g.appendChild(cell);
    }
    w.focus();
    window.setTimeout(() => {
      w.print();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8" onClick={onClose}>
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

        {/* Ações em massa */}
        {itens.length > 0 && (
          <div className="no-print flex flex-wrap items-center gap-2 border-b bg-muted/30 px-6 py-2.5">
            <span className="text-xs font-semibold text-muted-foreground">Em massa:</span>
            <Button size="sm" variant="outline" onClick={() => aplicarTodos(1)}>
              Marcar todos (1)
            </Button>
            <Button size="sm" variant="outline" onClick={porEstoque}>
              1 por unidade em estoque
            </Button>
            {semCodigo.length > 0 && (
              <Button size="sm" variant="outline" disabled={gerandoTodos} onClick={gerarTodosFaltantes}>
                {gerandoTodos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar código p/ todos ({semCodigo.length})
              </Button>
            )}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={999}
                className="h-8 w-16"
                value={aplicarN}
                onChange={(e) => setAplicarN(Math.max(0, Math.min(999, Math.trunc(Number(e.target.value)) || 0)))}
              />
              <Button size="sm" variant="outline" onClick={() => aplicarTodos(aplicarN)}>
                a todos
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={limparTodos}>
              Limpar
            </Button>
          </div>
        )}

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
                      max={999}
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
            {totalEtiquetas > 500 && (
              <span className="ml-2 text-amber-600">
                · muitas etiquetas — o navegador pode travar por alguns segundos; considere imprimir em lotes
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button onClick={imprimir} disabled={totalEtiquetas === 0}>
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {etiquetas.slice(0, 60).map((i, idx) => (
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
            {etiquetas.length > 60 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                + {etiquetas.length - 60} etiqueta(s) — a prévia mostra as primeiras 60, mas <strong>todas</strong> serão impressas.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
