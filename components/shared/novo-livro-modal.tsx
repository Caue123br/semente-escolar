"use client";

import * as React from "react";
import { BookOpen, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import type { Livro } from "@/lib/mock-data/biblioteca";

interface Props {
  aberto: boolean;
  onFechar: () => void;
}

export function NovoLivroModal({ aberto, onFechar }: Props) {
  const { add } = useEntidade("bibliotecaLivros");
  const toast = useToast();
  const [titulo, setTitulo] = React.useState("");
  const [autor, setAutor] = React.useState("");
  const [isbn, setIsbn] = React.useState("");
  const [categoria, setCategoria] = React.useState<Livro["categoria"]>("Infantil");
  const [faixaEtaria, setFaixaEtaria] = React.useState("");
  const [exemplares, setExemplares] = React.useState(1);
  const [salvando, setSalvando] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando) return;
    const novo: Livro = {
      id: `lv-${Date.now()}`,
      titulo,
      autor,
      isbn,
      categoria,
      faixaEtaria: faixaEtaria || "Todas",
      exemplares,
      disponiveis: exemplares,
      emprestados: 0,
    };
    setSalvando(true);
    try {
      await add(novo);
      toast.success("Livro cadastrado!", `"${titulo}" adicionado ao acervo.`);
      onFechar();
      setTitulo("");
      setAutor("");
      setIsbn("");
      setFaixaEtaria("");
      setExemplares(1);
    } catch {
      // A store exibe a mensagem amigável retornada pela API e mantém o formulário aberto.
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !salvando && onFechar()}>
      <div className="w-full max-w-xl bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Novo livro</h2>
              <p className="text-xs text-muted-foreground">Cadastrar livro no acervo</p>
            </div>
          </div>
          <button type="button" onClick={onFechar} disabled={salvando} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label>Título *</Label>
            <Input className="mt-1.5" required disabled={salvando} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label>Autor *</Label>
            <Input className="mt-1.5" required disabled={salvando} value={autor} onChange={(e) => setAutor(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ISBN</Label>
              <Input className="mt-1.5" disabled={salvando} value={isbn} onChange={(e) => setIsbn(e.target.value)} />
            </div>
            <div>
              <Label>Categoria</Label>
              <select
                value={categoria}
                disabled={salvando}
                onChange={(e) => setCategoria(e.target.value as Livro["categoria"])}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Infantil</option>
                <option>Didático</option>
                <option>Literário</option>
                <option>Pedagógico</option>
                <option>Quadrinhos</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Faixa etária</Label>
              <Input className="mt-1.5" disabled={salvando} value={faixaEtaria} onChange={(e) => setFaixaEtaria(e.target.value)} placeholder="Ex: 5+" />
            </div>
            <div>
              <Label>Exemplares *</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={1}
                disabled={salvando}
                value={exemplares}
                onChange={(e) => setExemplares(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
            <Button type="submit" disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700">
              {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              {salvando ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
