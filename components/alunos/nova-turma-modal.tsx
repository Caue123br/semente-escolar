"use client";

import * as React from "react";
import { GraduationCap, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import type { SerieEnum, Turma, Turno } from "@/lib/types";

const SERIES: SerieEnum[] = ["Mini Maternal", "Maternal", "Maternal 1", "Jardim", "Pré"];
const TURNOS: Turno[] = ["Manhã", "Tarde", "Integral"];

interface Props {
  aberto: boolean;
  onClose: () => void;
  onSalvar: (turma: Turma) => Promise<void>;
}

export function NovaTurmaModal({ aberto, onClose, onSalvar }: Props) {
  const toast = useToast();
  const [nome, setNome] = React.useState("");
  const [serie, setSerie] = React.useState<SerieEnum>("Maternal");
  const [turno, setTurno] = React.useState<Turno>("Manhã");
  const [professorId, setProfessorId] = React.useState("");
  const [professores, setProfessores] = React.useState<Array<{ id: string; nome: string }>>([]);
  const [erroProfessores, setErroProfessores] = React.useState<string | null>(null);
  const [capacidade, setCapacidade] = React.useState("20");
  const [cor, setCor] = React.useState("#059669");
  const [salvando, setSalvando] = React.useState(false);

  const limpar = () => {
    setNome("");
    setSerie("Maternal");
    setTurno("Manhã");
    setProfessorId("");
    setCapacidade("20");
    setCor("#059669");
  };

  React.useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    setErroProfessores(null);
    fetch("/api/professores", { cache: "no-store" })
      .then(async (resposta) => {
        const corpo = (await resposta.json().catch(() => ({}))) as {
          items?: Array<{ id: string; nome: string }>;
          error?: string;
        };
        if (!resposta.ok || !Array.isArray(corpo.items)) {
          throw new Error(corpo.error || "Não foi possível listar professores");
        }
        if (ativo) setProfessores(corpo.items);
      })
      .catch((error) => {
        if (ativo) {
          setProfessores([]);
          setErroProfessores(error instanceof Error ? error.message : "Lista indisponível");
        }
      });
    return () => {
      ativo = false;
    };
  }, [aberto]);

  const fechar = () => {
    if (salvando) return;
    onClose();
    limpar();
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    const capacidadeNumero = Number(capacidade);
    if (!nome.trim() || !Number.isInteger(capacidadeNumero) || capacidadeNumero < 1) return;

    setSalvando(true);
    try {
      await onSalvar({
        id: "",
        nome: nome.trim(),
        serie,
        turno,
        professorId,
        professorNome: professores.find((professor) => professor.id === professorId)?.nome ?? "",
        totalAlunos: 0,
        capacidade: capacidadeNumero,
        cor,
      });
      toast.success("Turma criada", `${nome.trim()} já está disponível para matrículas.`);
      onClose();
      limpar();
    } catch (error) {
      // A store já exibiu o erro retornado pelo servidor.
      console.warn("[turma] não foi possível salvar", error);
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={fechar}
    >
      <form
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-popover shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={salvar}
      >
        <div className="flex items-center justify-between border-b p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold">Nova turma</h2>
              <p className="text-xs text-muted-foreground">Crie uma turma real antes de matricular alunos.</p>
            </div>
          </div>
          <button type="button" onClick={fechar} className="rounded-md p-2 hover:bg-accent" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <Label htmlFor="turma-nome">Nome da turma *</Label>
            <Input
              id="turma-nome"
              className="mt-1.5"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Jardim II - A"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="turma-serie">Série *</Label>
              <select
                id="turma-serie"
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={serie}
                onChange={(event) => setSerie(event.target.value as SerieEnum)}
              >
                {SERIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="turma-turno">Turno *</Label>
              <select
                id="turma-turno"
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={turno}
                onChange={(event) => setTurno(event.target.value as Turno)}
              >
                {TURNOS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_72px]">
            <div>
              <Label htmlFor="turma-professor">Professor(a)</Label>
              <select
                id="turma-professor"
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={professorId}
                onChange={(event) => setProfessorId(event.target.value)}
              >
                <option value="">Sem professor atribuído</option>
                {professores.map((professor) => (
                  <option key={professor.id} value={professor.id}>{professor.nome}</option>
                ))}
              </select>
              {erroProfessores && (
                <p className="mt-1 text-xs text-warning">{erroProfessores}</p>
              )}
            </div>
            <div>
              <Label htmlFor="turma-capacidade">Capacidade *</Label>
              <Input
                id="turma-capacidade"
                className="mt-1.5"
                type="number"
                min={1}
                max={100}
                value={capacidade}
                onChange={(event) => setCapacidade(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="turma-cor">Cor</Label>
              <Input
                id="turma-cor"
                className="mt-1.5 p-1"
                type="color"
                value={cor}
                onChange={(event) => setCor(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/30 p-4">
          <Button type="button" variant="outline" onClick={fechar} disabled={salvando}>Cancelar</Button>
          <Button type="submit" disabled={salvando || !nome.trim()}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar turma
          </Button>
        </div>
      </form>
    </div>
  );
}
