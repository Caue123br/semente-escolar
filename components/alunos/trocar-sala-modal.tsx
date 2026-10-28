"use client";

import * as React from "react";
import { ArrowRightLeft, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/lib/toast";
import { ErroApi, type OpcoesEscrita } from "@/lib/data/store";
import type { Aluno, Turma } from "@/lib/types";

interface Props {
  aluno: Aluno | null;
  turmas: Turma[];
  /** Alunos Ativos por turma, calculado na página a partir da lista carregada. */
  ocupacaoPorTurma: ReadonlyMap<string, number>;
  onClose: () => void;
  onSalvar: (id: string, patch: Partial<Aluno>, opcoes?: OpcoesEscrita) => Promise<void>;
  /** Abre o modal "Turmas e professoras" para trocar a professora da sala inteira. */
  onGerenciarTurmas: () => void;
}

const selectCls =
  "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/**
 * Atalho da listagem: troca só a sala do aluno (a professora acompanha a sala).
 * Reusa o PATCH existente, inclusive a confirmação de lotação.
 */
export function TrocarSalaModal({ aluno, turmas, ocupacaoPorTurma, onClose, onSalvar, onGerenciarTurmas }: Props) {
  const toast = useToast();
  const [turmaId, setTurmaId] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  const [conflitoLotacao, setConflitoLotacao] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (aluno) {
      setTurmaId(aluno.turmaId);
      setConflitoLotacao(null);
    }
  }, [aluno]);

  if (!aluno) return null;

  const turmaAtual = turmas.find((t) => t.id === aluno.turmaId);
  const turmaNova = turmas.find((t) => t.id === turmaId);
  const primeiroNome = aluno.nome.split(" ")[0];
  const rotulo = (t: Turma) =>
    `${t.nome} — ${t.professorNome?.trim() || "Sem professora"} (${ocupacaoPorTurma.get(t.id) ?? 0}/${t.capacidade})`;

  const salvar = async (confirmarLotacao: boolean) => {
    if (!turmaId || turmaId === aluno.turmaId) return;
    setSalvando(true);
    try {
      await onSalvar(aluno.id, { turmaId }, confirmarLotacao ? { extras: { confirmarLotacao: true } } : {});
      setConflitoLotacao(null);
      toast.success(
        "Sala atualizada",
        `${primeiroNome} agora está em ${turmaNova?.nome ?? "outra sala"}${
          turmaNova?.professorNome?.trim() ? ` com ${turmaNova.professorNome.trim()}` : ""
        }.`
      );
      onClose();
    } catch (e) {
      // Sala na capacidade: a própria tela pergunta se insiste (a store não avisa).
      if (e instanceof ErroApi && e.codigo === "lotacao") {
        setConflitoLotacao(e.message);
        return;
      }
      setConflitoLotacao(null);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={() => !salvando && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="trocar-sala-titulo"
          className="w-full max-w-md overflow-hidden rounded-2xl bg-popover shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b p-5">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <h2 id="trocar-sala-titulo" className="font-bold">Trocar sala e professora</h2>
                <p className="text-xs text-muted-foreground">{aluno.nome}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !salvando && onClose()}
              className="rounded-md p-2 hover:bg-accent"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 p-5">
            <p className="text-sm text-muted-foreground">
              Hoje: {turmaAtual?.nome ?? "sala não informada"} —{" "}
              {turmaAtual?.professorNome?.trim() || "sem professora vinculada"}.
            </p>
            <div>
              <Label htmlFor="trocar-sala-destino">Nova sala</Label>
              <select
                id="trocar-sala-destino"
                className={selectCls}
                value={turmaId}
                onChange={(event) => setTurmaId(event.target.value)}
                disabled={salvando}
              >
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{rotulo(t)}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                A professora responsável é a da sala: ao trocar a sala, a professora muda junto.
              </p>
            </div>
            <button
              type="button"
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => {
                onClose();
                onGerenciarTurmas();
              }}
            >
              Trocar a professora desta sala (afeta todos os alunos dela)
            </button>
          </div>

          <div className="flex justify-end gap-2 border-t bg-muted/30 p-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void salvar(false)} disabled={salvando || !turmaId || turmaId === aluno.turmaId}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        aberto={conflitoLotacao !== null}
        titulo="Sala cheia"
        descricao={conflitoLotacao ? `${conflitoLotacao} Mover ${primeiroNome} mesmo assim?` : ""}
        variante="warning"
        textoBotaoConfirmar="Mover mesmo assim"
        onConfirmar={() => void salvar(true)}
        onFechar={() => setConflitoLotacao(null)}
      />
    </>
  );
}
