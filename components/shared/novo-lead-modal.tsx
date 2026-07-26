"use client";

import * as React from "react";
import { Target, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { formatDateLocalISO } from "@/lib/utils";
import type { Lead, EstagioFunil } from "@/lib/mock-data/crm";

interface Props {
  aberto: boolean;
  onFechar: () => void;
}

export function NovoLeadModal({ aberto, onFechar }: Props) {
  const { add } = useEntidade("crm");
  const toast = useToast();
  const [nomeResponsavel, setNomeResponsavel] = React.useState("");
  const [nomeCrianca, setNomeCrianca] = React.useState("");
  const [idadeCrianca, setIdadeCrianca] = React.useState(3);
  const [serieInteresse, setSerieInteresse] = React.useState("Maternal");
  const [telefone, setTelefone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [origem, setOrigem] = React.useState<Lead["origem"]>("Indicação");
  const [estagio, setEstagio] = React.useState<EstagioFunil>("Lead");
  const [valorPotencial, setValorPotencial] = React.useState(2500);
  const [observacoes, setObservacoes] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hoje = formatDateLocalISO();
    const novo: Lead = {
      id: `ld-${Date.now()}`,
      nomeResponsavel,
      nomeCrianca,
      idadeCrianca,
      serieInteresse,
      telefone,
      email,
      origem,
      estagio,
      dataPrimeiroContato: hoje,
      proximaAcao: "Primeiro contato",
      proximaData: hoje,
      responsavelComercial: "Aline Camargo",
      valorPotencial,
      observacoes: observacoes || undefined,
    };
    await add(novo);
    toast.success("Lead cadastrado!", `${nomeResponsavel} adicionado ao funil.`);
    onFechar();
    setNomeResponsavel("");
    setNomeCrianca("");
    setTelefone("");
    setEmail("");
    setObservacoes("");
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-2xl bg-popover rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Novo lead</h2>
              <p className="text-xs text-muted-foreground">Cadastrar interessado no funil</p>
            </div>
          </div>
          <button onClick={onFechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome do responsável *</Label>
              <Input className="mt-1.5" required value={nomeResponsavel} onChange={(e) => setNomeResponsavel(e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input className="mt-1.5" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 91234-5678" />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Nome da criança</Label>
              <Input className="mt-1.5" value={nomeCrianca} onChange={(e) => setNomeCrianca(e.target.value)} />
            </div>
            <div>
              <Label>Idade</Label>
              <Input className="mt-1.5" type="number" min={0} max={18} value={idadeCrianca} onChange={(e) => setIdadeCrianca(Number(e.target.value))} />
            </div>
            <div>
              <Label>Série interesse</Label>
              <select
                value={serieInteresse}
                onChange={(e) => setSerieInteresse(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Mini Maternal</option>
                <option>Maternal</option>
                <option>Maternal 1</option>
                <option>Jardim</option>
                <option>Pré</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Origem</Label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value as Lead["origem"])}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Indicação</option>
                <option>Instagram</option>
                <option>Google Ads</option>
                <option>Site</option>
                <option>Outdoor</option>
                <option>Walk-in</option>
              </select>
            </div>
            <div>
              <Label>Estágio</Label>
              <select
                value={estagio}
                onChange={(e) => setEstagio(e.target.value as EstagioFunil)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option>Lead</option>
                <option>Contato Inicial</option>
                <option>Visita Agendada</option>
                <option>Visita Realizada</option>
                <option>Proposta</option>
                <option>Matriculado</option>
                <option>Perdido</option>
              </select>
            </div>
            <div>
              <Label>Valor potencial (R$)</Label>
              <Input className="mt-1.5" type="number" min={0} value={valorPotencial} onChange={(e) => setValorPotencial(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="mr-1.5 h-4 w-4" /> Cadastrar lead
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
