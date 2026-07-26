"use client";

import * as React from "react";
import { Trello, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import type { KanbanCard } from "@/lib/types";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  turmaId: string;
  colunaId: string;
}

export function NovoCardKanbanModal({ aberto, onFechar, turmaId, colunaId }: Props) {
  const { add } = useEntidade("kanban");
  const toast = useToast();
  const [titulo, setTitulo] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [tipo, setTipo] = React.useState<KanbanCard["tipo"]>("Atividade");
  const [prazo, setPrazo] = React.useState("");
  const [responsavel, setResponsavel] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const novo: KanbanCard = {
      id: `kb-${Date.now()}`,
      colunaId,
      turmaId,
      titulo,
      descricao: descricao || undefined,
      tipo,
      prazo: prazo || undefined,
      responsavel: responsavel || undefined,
    };
    await add(novo);
    toast.success("Card criado!", `"${titulo}" foi adicionado.`);
    onFechar();
    setTitulo("");
    setDescricao("");
    setPrazo("");
    setResponsavel("");
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-xl bg-popover rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center">
              <Trello className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Novo card no Kanban</h2>
              <p className="text-xs text-muted-foreground">Atividade, evento ou pendência</p>
            </div>
          </div>
          <button onClick={onFechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
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
              placeholder="Ex: Preparar atividade de leitura"
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as KanbanCard["tipo"])}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Atividade</option>
                <option>Evento</option>
                <option>Pendência</option>
                <option>Avaliação</option>
              </select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input className="mt-1.5" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Responsável</Label>
            <Input
              className="mt-1.5"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Ex: Profa. Mariana Costa"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="mr-1.5 h-4 w-4" /> Adicionar card
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
