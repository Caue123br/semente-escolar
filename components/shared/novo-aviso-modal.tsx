"use client";

import * as React from "react";
import { Megaphone, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntidade, type MuralPost } from "@/lib/data/store";
import { usePerfil } from "@/lib/perfil-context";
import { useToast } from "@/lib/toast";
import type { Perfil } from "@/lib/types";

interface Props {
  aberto: boolean;
  onClose: () => void;
}

const CARGO_POR_PERFIL: Record<Perfil, string> = {
  diretor: "Direção",
  coordenador: "Coordenação",
  professor: "Professor(a)",
  financeiro: "Financeiro",
};

export function NovoAvisoModal({ aberto, onClose }: Props) {
  const { add } = useEntidade("muralPosts");
  const { perfil, nome, carregando: carregandoPerfil } = usePerfil();
  const toast = useToast();
  const [titulo, setTitulo] = React.useState("");
  const [conteudo, setConteudo] = React.useState("");
  const [tipo, setTipo] = React.useState<MuralPost["tipo"]>("Avisos");
  const [fixado, setFixado] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando || carregandoPerfil) return;
    const novo: MuralPost = {
      id: `p-${Date.now()}`,
      autor: nome,
      cargo: CARGO_POR_PERFIL[perfil],
      tipo,
      titulo,
      conteudo,
      data: new Date().toLocaleString("pt-BR"),
      likes: 0,
      comentarios: 0,
      fixado,
    };
    setSalvando(true);
    try {
      await add(novo);
      toast.success("Aviso publicado!", `"${titulo}" foi publicado no mural interno.`);
      onClose();
      setTitulo("");
      setConteudo("");
      setFixado(false);
    } catch {
      // A store já exibe a mensagem retornada pela API. O formulário permanece
      // aberto e preenchido para a pessoa tentar novamente.
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => !salvando && onClose()}
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
                Registro interno da equipe; nenhuma notificação externa é enviada.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center disabled:opacity-50"
            aria-label="Fechar"
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
              disabled={salvando}
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
              disabled={salvando}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Escreva o conteúdo do aviso..."
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <select
              value={tipo}
              disabled={salvando}
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
              disabled={salvando}
              onChange={(e) => setFixado(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Fixar no topo do mural</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando || carregandoPerfil}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {salvando ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              {salvando ? "Publicando..." : "Publicar no mural"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
