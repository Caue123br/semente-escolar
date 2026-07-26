"use client";

import * as React from "react";
import { Baby, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { formatDateLocalISO } from "@/lib/utils";
import { usePerfil } from "@/lib/perfil-context";
import type { RegistroBercario, BebeBercario } from "@/lib/mock-data/bercario";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  bebes: BebeBercario[];
}

export function NovoRegistroBercarioModal({ aberto, onFechar, bebes }: Props) {
  const { add } = useEntidade("bercarioRegistros");
  const { nome } = usePerfil();
  const toast = useToast();
  const [bebeId, setBebeId] = React.useState(bebes[0]?.id ?? "");
  const [tipo, setTipo] = React.useState<RegistroBercario["tipo"]>("Alimentação");
  const [detalhes, setDetalhes] = React.useState("");
  const [hora, setHora] = React.useState(() => new Date().toTimeString().slice(0, 5));
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    if (bebes[0] && !bebeId) setBebeId(bebes[0].id);
  }, [bebes, bebeId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando) return;
    const hoje = formatDateLocalISO();
    const novo: RegistroBercario = {
      id: `bc-${Date.now()}`,
      bebeId,
      data: hoje,
      hora,
      tipo,
      detalhes,
      registradoPor: nome,
    };
    setSalvando(true);
    try {
      await add(novo);
      toast.success("Registro adicionado!", `${tipo} de ${bebes.find((b) => b.id === bebeId)?.nome}.`);
      onFechar();
      setDetalhes("");
    } catch {
      // A store exibe a falha e preserva os dados preenchidos para nova tentativa.
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
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-700 text-white flex items-center justify-center">
              <Baby className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Novo registro</h2>
              <p className="text-xs text-muted-foreground">Rotina do berçário</p>
            </div>
          </div>
          <button type="button" onClick={onFechar} disabled={salvando} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center disabled:opacity-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bebê *</Label>
              <select
                value={bebeId}
                disabled={salvando}
                onChange={(e) => setBebeId(e.target.value)}
                required
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {bebes.map((b) => (
                  <option key={b.id} value={b.id}>{b.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Tipo *</Label>
              <select
                value={tipo}
                disabled={salvando}
                onChange={(e) => setTipo(e.target.value as RegistroBercario["tipo"])}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Alimentação</option>
                <option>Sono</option>
                <option>Troca</option>
                <option>Banho</option>
                <option>Observação</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Hora</Label>
            <Input className="mt-1.5" type="time" disabled={salvando} value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div>
            <Label>Detalhes *</Label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={2}
              required
              disabled={salvando}
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value)}
              placeholder="Ex: Mamou 180ml de fórmula"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>Cancelar</Button>
            <Button type="submit" disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700">
              {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              {salvando ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
