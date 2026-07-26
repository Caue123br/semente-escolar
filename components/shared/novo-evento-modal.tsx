"use client";

import * as React from "react";
import { Calendar, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { formatDateLocalISO } from "@/lib/utils";
import type { EventoCalendario, TipoEvento } from "@/lib/mock-data/calendario";

interface Props {
  aberto: boolean;
  onClose: () => void;
}

export function NovoEventoModal({ aberto, onClose }: Props) {
  const { add } = useEntidade("eventos");
  const toast = useToast();
  const [titulo, setTitulo] = React.useState("");
  const [data, setData] = React.useState(() => formatDateLocalISO());
  const [horaInicio, setHoraInicio] = React.useState("");
  const [horaFim, setHoraFim] = React.useState("");
  const [tipo, setTipo] = React.useState<TipoEvento>("Reunião");
  const [local, setLocal] = React.useState("");
  const [descricao, setDescricao] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando) return;
    const novo: EventoCalendario = {
      id: `ev-${Date.now()}`,
      titulo,
      data,
      horaInicio: horaInicio || undefined,
      horaFim: horaFim || undefined,
      tipo,
      local: local || undefined,
      descricao: descricao || undefined,
    };
    setSalvando(true);
    try {
      await add(novo);
      toast.success("Evento criado!", `"${titulo}" adicionado ao calendário.`);
      onClose();
      setTitulo("");
      setLocal("");
      setDescricao("");
      setHoraInicio("");
      setHoraFim("");
    } catch {
      // A store já mostra o erro da API. Manter os campos permite corrigir os
      // dados ou repetir a tentativa sem perder o preenchimento.
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
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Novo evento</h2>
              <p className="text-xs text-muted-foreground">Calendário escolar</p>
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
            <Label>Título do evento *</Label>
            <Input
              className="mt-1.5"
              required
              disabled={salvando}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Festa Junina 2026"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data *</Label>
              <Input
                className="mt-1.5"
                type="date"
                required
                disabled={salvando}
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div>
              <Label>Início</Label>
              <Input
                className="mt-1.5"
                type="time"
                disabled={salvando}
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                className="mt-1.5"
                type="time"
                disabled={salvando}
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Tipo</Label>
            <select
              value={tipo}
              disabled={salvando}
              onChange={(e) => setTipo(e.target.value as TipoEvento)}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option>Aula</option>
              <option>Reunião</option>
              <option>Festa</option>
              <option>Passeio</option>
              <option>Avaliação</option>
              <option>Feriado</option>
              <option>Recesso</option>
              <option>Formação Docente</option>
              <option>Visita</option>
              <option>Outros</option>
            </select>
          </div>
          <div>
            <Label>Local</Label>
            <Input
              className="mt-1.5"
              disabled={salvando}
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Auditório, sala de música, etc."
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={2}
              disabled={salvando}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {salvando ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              {salvando ? "Salvando..." : "Adicionar ao calendário"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
