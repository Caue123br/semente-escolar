"use client";

import * as React from "react";
import { CalendarCheck, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntidade, type Reserva } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { formatDateLocalISO } from "@/lib/utils";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onSalvar?: (r: Reserva) => Promise<void> | void;
  espacosDisponiveis: string[];
}

export function NovaReservaModal({ aberto, onFechar, onSalvar, espacosDisponiveis }: Props) {
  const { add } = useEntidade("reservas");
  const toast = useToast();
  const [espaco, setEspaco] = React.useState(espacosDisponiveis[0] ?? "");
  const [data, setData] = React.useState(() => formatDateLocalISO());
  const [horaInicio, setHoraInicio] = React.useState("");
  const [horaFim, setHoraFim] = React.useState("");
  const [responsavel, setResponsavel] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    if (espacosDisponiveis[0] && !espaco) setEspaco(espacosDisponiveis[0]);
  }, [espacosDisponiveis, espaco]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando) return;
    const nova: Reserva = {
      id: `rsv-${Date.now()}`,
      espaco,
      data,
      horaInicio: horaInicio || undefined,
      horaFim: horaFim || undefined,
      responsavel: responsavel || undefined,
      motivo: motivo || undefined,
      status: "Confirmada",
    };
    setSalvando(true);
    try {
      if (onSalvar) await onSalvar(nova);
      else await add(nova);
      toast.success("Reserva criada!", `${espaco} reservada pra ${data}.`);
      onFechar();
      setHoraInicio("");
      setHoraFim("");
      setResponsavel("");
      setMotivo("");
    } catch {
      // A store mantém o modal aberto e informa o erro retornado pela API.
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => !salvando && onFechar()}
    >
      <div
        className="w-full max-w-xl bg-popover rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 text-white flex items-center justify-center">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Nova reserva</h2>
              <p className="text-xs text-muted-foreground">Reservar espaço da escola</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label>Espaço *</Label>
            <select
              value={espaco}
              disabled={salvando}
              onChange={(e) => setEspaco(e.target.value)}
              required
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {espacosDisponiveis.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data *</Label>
              <Input className="mt-1.5" type="date" required disabled={salvando} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <Label>Início</Label>
              <Input className="mt-1.5" type="time" disabled={salvando} value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>
            <div>
              <Label>Fim</Label>
              <Input className="mt-1.5" type="time" disabled={salvando} value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Responsável</Label>
            <Input
              className="mt-1.5"
              value={responsavel}
              disabled={salvando}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Ex: Profa. Mariana Costa"
            />
          </div>
          <div>
            <Label>Motivo</Label>
            <Input
              className="mt-1.5"
              value={motivo}
              disabled={salvando}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Reunião de pais"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700">
              {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              {salvando ? "Salvando..." : "Confirmar reserva"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
