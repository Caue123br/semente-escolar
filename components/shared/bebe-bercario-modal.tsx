"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import type { BebeBercario } from "@/lib/mock-data/bercario";
import type { Turma } from "@/lib/types";

interface Props {
  bebe: BebeBercario | null;
  turmas: Turma[];
  onFechar: () => void;
}

export function BebeBercarioModal({ bebe, turmas, onFechar }: Props) {
  const { add, update } = useEntidade("bercarioBebes");
  const toast = useToast();
  const [nome, setNome] = React.useState(bebe?.nome ?? "");
  const [idade, setIdade] = React.useState(String(bebe?.idadeMeses ?? ""));
  const [responsavel, setResponsavel] = React.useState(bebe?.responsavel ?? "");
  const [professora, setProfessora] = React.useState(bebe?.professora ?? "");
  const [turmaId, setTurmaId] = React.useState(bebe?.turmaId ?? "");
  const [salvando, setSalvando] = React.useState(false);

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (salvando) return;
    setSalvando(true);
    const dados = { nome: nome.trim(), idadeMeses: Number(idade), responsavel: responsavel.trim(), professora: professora.trim(), turmaId: turmaId || null };
    try {
      if (bebe) await update(bebe.id, dados);
      else await add({ id: `bebe-${Date.now()}`, ...dados });
      toast.success(bebe ? "Cadastro atualizado" : "Bebê cadastrado");
      onFechar();
    } catch {
      // A store apresenta a falha; mantenha o formulário para nova tentativa.
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !salvando && onFechar()}>
      <section role="dialog" aria-modal="true" aria-labelledby="bebe-modal-titulo" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-popover shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-6">
          <h2 id="bebe-modal-titulo" className="text-lg font-bold">{bebe ? "Cadastro e turma do bebê" : "Cadastrar bebê"}</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" disabled={salvando} onClick={onFechar}><X className="h-4 w-4" /></Button>
        </div>
        <form onSubmit={salvar} className="space-y-4 p-6">
          <div><Label htmlFor="bebe-nome">Nome completo *</Label><Input id="bebe-nome" className="mt-1.5" value={nome} onChange={(event) => setNome(event.target.value)} minLength={2} maxLength={200} required disabled={salvando} /></div>
          <div><Label htmlFor="bebe-idade">Idade em meses *</Label><Input id="bebe-idade" className="mt-1.5" type="number" min={0} max={72} step={1} value={idade} onChange={(event) => setIdade(event.target.value)} required disabled={salvando} /></div>
          <div><Label htmlFor="bebe-responsavel">Responsável</Label><Input id="bebe-responsavel" className="mt-1.5" value={responsavel} onChange={(event) => setResponsavel(event.target.value)} maxLength={200} disabled={salvando} /></div>
          <div>
            <Label htmlFor="bebe-turma">Turma com acesso à rotina</Label>
            <select id="bebe-turma" className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={turmaId} onChange={(event) => setTurmaId(event.target.value)} disabled={salvando}>
              <option value="">Sem turma — atribuição pendente</option>
              {turmas.map((turma) => <option key={turma.id} value={turma.id}>{turma.nome}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">Professores vinculados à turma poderão consultar e registrar a rotina. Sem turma, o cadastro e o histórico ficam disponíveis à direção e à coordenação.</p>
          </div>
          <div>
            <Label htmlFor="bebe-professora">Nome da responsável na equipe</Label>
            <Input id="bebe-professora" className="mt-1.5" value={professora} onChange={(event) => setProfessora(event.target.value)} maxLength={200} disabled={salvando} />
            <p className="mt-1.5 text-xs text-muted-foreground">Informação do cadastro. O acesso é definido pela turma selecionada.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" disabled={salvando} onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{salvando ? "Salvando..." : "Salvar cadastro"}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
