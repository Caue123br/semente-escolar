"use client";

import * as React from "react";
import { Megaphone, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntidade, type MuralPost } from "@/lib/data/store";
import { useToast } from "@/lib/toast";

interface Props {
  aberto: boolean;
  onClose: () => void;
}

export function NovoAvisoModal({ aberto, onClose }: Props) {
  const { add } = useEntidade("muralPosts");
  const toast = useToast();
  const [titulo, setTitulo] = React.useState("");
  const [conteudo, setConteudo] = React.useState("");
  const [tipo, setTipo] = React.useState<MuralPost["tipo"]>("Avisos");
  const [fixado, setFixado] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const novo: MuralPost = {
      id: `p-${Date.now()}`,
      autor: "Renata Andrade",
      cargo: "Direção",
      tipo,
      titulo,
      conteudo,
      data: new Date().toLocaleString("pt-BR"),
      likes: 0,
      comentarios: 0,
      fixado,
    };
    add(novo);
    toast.success("Aviso publicado!", `"${titulo}" foi publicado no mural da escola.`);
    onClose();
    setTitulo("");
    setConteudo("");
    setFixado(false);
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-popover rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 text-white flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Novo aviso no mural</h2>
              <p className="text-xs text-muted-foreground">
                Visível para toda a equipe e pais (se publicar como Importante)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label>Título *</Label>
            <Input
              className="mt-1.5"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Reunião de pais quinta-feira"
            />
          </div>
          <div>
            <Label>Mensagem *</Label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
              required
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Escreva o conteúdo do aviso..."
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as MuralPost["tipo"])}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="Importante">Importante</option>
              <option value="Pedagógico">Pedagógico</option>
              <option value="Atividade">Atividade</option>
              <option value="Evento">Evento</option>
              <option value="Avisos">Avisos gerais</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fixado}
              onChange={(e) => setFixado(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Fixar no topo do mural</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="mr-1.5 h-4 w-4" /> Publicar agora
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
