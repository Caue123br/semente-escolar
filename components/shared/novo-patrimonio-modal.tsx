"use client";

import * as React from "react";
import { Building2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntidade, type ItemPatrimonio } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { formatDateLocalISO } from "@/lib/utils";

interface Props {
  aberto: boolean;
  onFechar: () => void;
}

export function NovoPatrimonioModal({ aberto, onFechar }: Props) {
  const { add } = useEntidade("patrimonio");
  const toast = useToast();
  const [item, setItem] = React.useState("");
  const [categoria, setCategoria] = React.useState("Equipamento");
  const [local, setLocal] = React.useState("");
  const [valor, setValor] = React.useState(0);
  const [dataCompra, setDataCompra] = React.useState(() => formatDateLocalISO());
  const [estado, setEstado] = React.useState("Bom");
  const [responsavel, setResponsavel] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const novo: ItemPatrimonio = {
      id: `pt-${Date.now()}`,
      item,
      categoria,
      local,
      valor,
      dataCompra,
      estado,
      responsavel,
    };
    await add(novo);
    toast.success("Bem cadastrado!", `"${item}" adicionado ao patrimônio.`);
    onFechar();
    setItem("");
    setLocal("");
    setValor(0);
    setResponsavel("");
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-xl bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Cadastrar bem</h2>
              <p className="text-xs text-muted-foreground">Adicionar item ao patrimônio</p>
            </div>
          </div>
          <button onClick={onFechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label>Item *</Label>
            <Input className="mt-1.5" required value={item} onChange={(e) => setItem(e.target.value)} placeholder="Ex: Notebook Dell Inspiron" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Equipamento</option>
                <option>Mobiliário</option>
                <option>Eletrodoméstico</option>
                <option>Climatização</option>
                <option>Lúdico</option>
                <option>Outro</option>
              </select>
            </div>
            <div>
              <Label>Estado</Label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Ótimo</option>
                <option>Bom</option>
                <option>Regular</option>
                <option>Defeito</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Local</Label>
              <Input className="mt-1.5" value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: Secretaria" />
            </div>
            <div>
              <Label>Responsável</Label>
              <Input className="mt-1.5" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input className="mt-1.5" type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} />
            </div>
            <div>
              <Label>Data da compra</Label>
              <Input className="mt-1.5" type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="mr-1.5 h-4 w-4" /> Cadastrar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
