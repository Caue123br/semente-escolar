"use client";

import * as React from "react";
import { Loader2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/lib/toast";
import type { Turma } from "@/lib/types";

interface Props {
  /** Ids dos alunos marcados na listagem (já restritos ao filtro atual). */
  selecionados: string[];
  turmas: Turma[];
  ocupacaoPorTurma: ReadonlyMap<string, number>;
  onLimpar: () => void;
}

const selectCls =
  "flex h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm";

/**
 * Barra fixa que aparece com 1+ alunos selecionados. Chama o endpoint de
 * movimentação em massa; lotação vem como UMA confirmação para o lote.
 */
export function MoverAlunosEmMassa({ selecionados, turmas, ocupacaoPorTurma, onLimpar }: Props) {
  const toast = useToast();
  const [turmaId, setTurmaId] = React.useState("");
  const [movendo, setMovendo] = React.useState(false);
  const [conflitoLotacao, setConflitoLotacao] = React.useState<string | null>(null);

  if (selecionados.length === 0) return null;

  const mover = async (confirmarLotacao: boolean) => {
    if (!turmaId) return;
    setMovendo(true);
    try {
      const resposta = await fetch("/api/alunos/mover-sala", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alunoIds: selecionados,
          turmaId,
          ...(confirmarLotacao ? { confirmarLotacao: true } : {}),
        }),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as Record<string, unknown>;
      if (!resposta.ok) {
        if (corpo.codigo === "lotacao" && typeof corpo.error === "string") {
          setConflitoLotacao(corpo.error);
          return;
        }
        throw new Error(
          typeof corpo.error === "string" ? corpo.error : `O servidor respondeu com status ${resposta.status}`
        );
      }
      setConflitoLotacao(null);
      const destino = turmas.find((t) => t.id === turmaId);
      const movidos = typeof corpo.movidos === "number" ? corpo.movidos : selecionados.length;
      toast.success(
        "Alunos movidos",
        `${movidos} aluno(s) agora em ${destino?.nome ?? "nova sala"}${
          destino?.professorNome?.trim() ? ` com ${destino.professorNome.trim()}` : ""
        }.`
      );
      window.dispatchEvent(new CustomEvent("semente:changed:alunos"));
      setTurmaId("");
      onLimpar();
    } catch (e) {
      setConflitoLotacao(null);
      toast.error("Não foi possível mover", e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setMovendo(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 shadow-xl">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          <Users className="h-4 w-4 text-primary" />
          {selecionados.length} selecionado(s)
        </span>
        <label className="sr-only" htmlFor="mover-sala-destino">Mover para sala</label>
        <select
          id="mover-sala-destino"
          className={selectCls}
          value={turmaId}
          onChange={(event) => setTurmaId(event.target.value)}
          disabled={movendo}
        >
          <option value="">Mover para sala…</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} — {t.professorNome?.trim() || "Sem professora"} ({ocupacaoPorTurma.get(t.id) ?? 0}/{t.capacidade})
            </option>
          ))}
        </select>
        <Button type="button" size="sm" onClick={() => void mover(false)} disabled={movendo || !turmaId}>
          {movendo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Mover
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onLimpar} disabled={movendo}>
          <X className="mr-1 h-4 w-4" /> Limpar seleção
        </Button>
      </div>

      <ConfirmDialog
        aberto={conflitoLotacao !== null}
        titulo="Sala cheia"
        descricao={conflitoLotacao ?? ""}
        variante="warning"
        textoBotaoConfirmar="Mover mesmo assim"
        onConfirmar={() => void mover(true)}
        onFechar={() => setConflitoLotacao(null)}
      />
    </>
  );
}
