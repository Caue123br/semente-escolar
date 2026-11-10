"use client";

import * as React from "react";
import { ExternalLink, FileText, Image as ImagemIcone, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { podeGerenciarAlunos } from "@/lib/access-control";
import { usePerfil } from "@/lib/perfil-context";
import { useToast } from "@/lib/toast";
import { formatDateBR } from "@/lib/utils";
import {
  CATEGORIAS_DOCUMENTO,
  TAMANHO_MAXIMO_DOCUMENTO,
  formatarTamanho,
  type DocumentoAluno as Documento,
} from "@/lib/documentos-aluno";

interface Props {
  alunoId: string;
}

const selectCls =
  "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/** Arquivo digital da aba Documentos: enviar, listar, abrir e excluir. */
export function DocumentosAluno({ alunoId }: Props) {
  const { perfil } = usePerfil();
  const podeGerenciar = podeGerenciarAlunos(perfil);
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [documentos, setDocumentos] = React.useState<Documento[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);
  const [tentativa, setTentativa] = React.useState(0);
  const [categoria, setCategoria] = React.useState<string>(CATEGORIAS_DOCUMENTO[0]);
  const [descricao, setDescricao] = React.useState("");
  const [arquivo, setArquivo] = React.useState<File | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = React.useState<Documento | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro(null);
    fetch(`/api/alunos/${alunoId}/documentos`, { cache: "no-store", signal: controller.signal })
      .then(async (resposta) => {
        const corpo = (await resposta.json().catch(() => ({}))) as { items?: unknown; error?: unknown };
        if (!resposta.ok || !Array.isArray(corpo.items)) {
          throw new Error(typeof corpo.error === "string" ? corpo.error : "Não foi possível listar os documentos.");
        }
        if (!controller.signal.aborted) setDocumentos(corpo.items as Documento[]);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setErro(error instanceof Error ? error.message : "Não foi possível listar os documentos.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [alunoId, tentativa]);

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!arquivo) {
      toast.error("Escolha o arquivo", "PDF, JPG, PNG ou WEBP até 10 MB.");
      return;
    }
    if (arquivo.size > TAMANHO_MAXIMO_DOCUMENTO) {
      toast.error("Arquivo grande demais", "O limite é 10 MB.");
      return;
    }
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.set("alunoId", alunoId);
      fd.set("categoria", categoria);
      if (descricao.trim()) fd.set("descricao", descricao.trim());
      fd.set("file", arquivo);
      const resposta = await fetch("/api/upload/documento-aluno", { method: "POST", body: fd });
      const corpo = (await resposta.json().catch(() => ({}))) as { error?: unknown };
      if (!resposta.ok) {
        toast.error("Não foi possível arquivar", typeof corpo.error === "string" ? corpo.error : "Tente de novo");
        return;
      }
      toast.success("Documento arquivado", `${categoria} salvo na ficha.`);
      setDescricao("");
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      setTentativa((valor) => valor + 1);
    } catch {
      toast.error("Erro de conexão", "Verifique sua conexão e tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  const excluir = async () => {
    if (!confirmarExcluir) return;
    try {
      const resposta = await fetch(`/api/alunos/${alunoId}/documentos/${confirmarExcluir.id}`, {
        method: "DELETE",
      });
      const corpo = (await resposta.json().catch(() => ({}))) as { error?: unknown };
      if (!resposta.ok) {
        throw new Error(typeof corpo.error === "string" ? corpo.error : "Tente de novo");
      }
      toast.success("Documento excluído", confirmarExcluir.categoria);
      setConfirmarExcluir(null);
      setTentativa((valor) => valor + 1);
    } catch (error) {
      // Mensagem do servidor já vem em PT-BR (Error que nós mesmos lançamos);
      // falha de rede (TypeError do fetch) ganha texto fixo em português.
      const mensagem =
        error instanceof Error && !(error instanceof TypeError)
          ? error.message
          : "Verifique sua conexão e tente de novo.";
      toast.error("Não foi possível excluir", mensagem);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
        <CardDescription>Cópias digitalizadas e contratos arquivados na ficha do aluno</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {podeGerenciar && (
          <form onSubmit={enviar} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <Label htmlFor="doc-categoria">Categoria</Label>
              <select
                id="doc-categoria"
                className={selectCls}
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                disabled={enviando}
              >
                {CATEGORIAS_DOCUMENTO.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <Label htmlFor="doc-descricao" className="mt-3 block">Descrição (opcional)</Label>
              <Input
                id="doc-descricao"
                className="mt-1.5"
                value={descricao}
                maxLength={300}
                onChange={(event) => setDescricao(event.target.value)}
                placeholder="Ex.: via atualizada 2026"
                disabled={enviando}
              />
            </div>
            <div>
              <Label htmlFor="doc-arquivo">Arquivo (PDF, JPG, PNG ou WEBP · até 10 MB)</Label>
              <input
                id="doc-arquivo"
                ref={inputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90"
                onChange={(event) => setArquivo(event.target.files?.[0] ?? null)}
                disabled={enviando}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={enviando || !arquivo}>
                {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Arquivar
              </Button>
            </div>
          </form>
        )}

        {carregando && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos…
          </p>
        )}
        {erro && (
          <div role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            <p>{erro}</p>
            <Button type="button" variant="outline" className="mt-2" onClick={() => setTentativa((valor) => valor + 1)}>
              Tentar de novo
            </Button>
          </div>
        )}
        {!carregando && !erro && documentos.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="mt-3 text-sm font-medium">Nenhum documento anexado</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {podeGerenciar
                ? "Use o formulário acima para arquivar a primeira cópia digitalizada."
                : "A gestão ainda não arquivou documentos para este aluno."}
            </p>
          </div>
        )}
        {!carregando && documentos.length > 0 && (
          <ul className="divide-y rounded-xl border">
            {documentos.map((documento) => (
              <li key={documento.id} className="flex flex-wrap items-center gap-3 p-3">
                {documento.mime === "application/pdf" ? (
                  <FileText className="h-5 w-5 shrink-0 text-rose-600" />
                ) : (
                  <ImagemIcone className="h-5 w-5 shrink-0 text-emerald-600" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{documento.categoria}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {documento.descricao ? `${documento.descricao} · ` : ""}
                    {formatarTamanho(documento.tamanhoBytes)} · {formatDateBR(documento.criadoEm)}
                    {documento.enviadoPorNome ? ` · por ${documento.enviadoPorNome}` : ""}
                  </div>
                </div>
                <a
                  href={documento.arquivoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir
                </a>
                {podeGerenciar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-rose-600 hover:text-rose-700"
                    onClick={() => setConfirmarExcluir(documento)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        aberto={confirmarExcluir !== null}
        titulo="Excluir documento?"
        descricao={
          confirmarExcluir
            ? `O arquivo de ${confirmarExcluir.categoria} será removido da ficha e do servidor. Essa ação não pode ser desfeita.`
            : ""
        }
        variante="danger"
        textoBotaoConfirmar="Sim, excluir"
        onConfirmar={excluir}
        onFechar={() => setConfirmarExcluir(null)}
      />
    </Card>
  );
}
