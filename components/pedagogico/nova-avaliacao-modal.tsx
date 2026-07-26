"use client";

import * as React from "react";
import { GraduationCap, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { avaliacaoEstaCompleta } from "@/lib/pedagogico";
import { useToast } from "@/lib/toast";
import {
  NIVEIS_PSICOGENESE,
  type Aluno,
  type AvaliacaoPedagogica,
  type NivelCompetencia,
  type NivelPsicogenese,
} from "@/lib/types";

interface Props {
  aberto: boolean;
  aluno: Aluno;
  avaliacoes: AvaliacaoPedagogica[];
  onClose: () => void;
  onSalvar: (avaliacao: AvaliacaoPedagogica) => Promise<void>;
}

const BIMESTRES = [1, 2, 3, 4] as const;
const COMPETENCIAS = [
  { campo: "leitura", label: "Leitura" },
  { campo: "escrita", label: "Escrita" },
  { campo: "logicaMatematica", label: "Lógica-Matemática" },
  { campo: "oralidade", label: "Oralidade" },
] as const;

type CampoCompetencia = (typeof COMPETENCIAS)[number]["campo"];
type Pontuacoes = Record<CampoCompetencia, NivelCompetencia>;

const PONTUACAO_PADRAO: Pontuacoes = {
  leitura: 2,
  escrita: 2,
  logicaMatematica: 2,
  oralidade: 2,
};

function periodoInicial(avaliacoes: AvaliacaoPedagogica[]) {
  const ano = new Date().getFullYear();
  const primeiroLivre = BIMESTRES.find(
    (bimestre) =>
      !avaliacoes.some(
        (avaliacao) => avaliacao.ano === ano && avaliacao.bimestre === bimestre
      )
  );
  return { ano, bimestre: primeiroLivre ?? 4 };
}

export function NovaAvaliacaoModal({
  aberto,
  aluno,
  avaliacoes,
  onClose,
  onSalvar,
}: Props) {
  const toast = useToast();
  const [ano, setAno] = React.useState(new Date().getFullYear());
  const [bimestre, setBimestre] = React.useState<1 | 2 | 3 | 4>(1);
  const [leituraNivel, setLeituraNivel] =
    React.useState<NivelPsicogenese>("Silábico");
  const [pontuacoes, setPontuacoes] = React.useState<Pontuacoes>(PONTUACAO_PADRAO);
  const [observacao, setObservacao] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  const existente = avaliacoes.find(
    (avaliacao) => avaliacao.ano === ano && avaliacao.bimestre === bimestre
  );

  const preencherPeriodo = React.useCallback(
    (novoAno: number, novoBimestre: 1 | 2 | 3 | 4) => {
      const registro = avaliacoes.find(
        (avaliacao) =>
          avaliacao.ano === novoAno && avaliacao.bimestre === novoBimestre
      );
      if (registro && avaliacaoEstaCompleta(registro)) {
        setLeituraNivel(registro.leituraNivel);
        setPontuacoes({
          leitura: registro.leitura,
          escrita: registro.escrita,
          logicaMatematica: registro.logicaMatematica,
          oralidade: registro.oralidade,
        });
        setObservacao(registro.observacao ?? "");
        return;
      }
      setLeituraNivel("Silábico");
      setPontuacoes(PONTUACAO_PADRAO);
      setObservacao("");
    },
    [avaliacoes]
  );

  React.useEffect(() => {
    if (!aberto) return;
    const periodo = periodoInicial(avaliacoes);
    setAno(periodo.ano);
    setBimestre(periodo.bimestre);
    preencherPeriodo(periodo.ano, periodo.bimestre);
  }, [aberto, avaliacoes, preencherPeriodo]);

  const alterarAno = (novoAno: number) => {
    setAno(novoAno);
    preencherPeriodo(novoAno, bimestre);
  };

  const alterarBimestre = (novoBimestre: 1 | 2 | 3 | 4) => {
    setBimestre(novoBimestre);
    preencherPeriodo(ano, novoBimestre);
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isInteger(ano) || ano < 1900 || ano > 2200) {
      toast.error("Ano letivo inválido", "Informe um ano entre 1900 e 2200.");
      return;
    }

    setSalvando(true);
    try {
      await onSalvar({
        id: existente?.id ?? "",
        alunoId: aluno.id,
        bimestre,
        ano,
        leituraNivel,
        ...pontuacoes,
        observacao: observacao.trim() || null,
      });
      toast.success(
        existente ? "Avaliação atualizada" : "Avaliação registrada",
        `${bimestre}º bimestre de ${ano} salvo para ${aluno.nome}.`
      );
      onClose();
    } catch (error) {
      // A store já mostra a mensagem amigável devolvida pelo servidor.
      console.warn("[avaliacao] não foi possível salvar", error);
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !salvando && onClose()}
    >
      <form
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-popover shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={salvar}
      >
        <div className="flex items-center justify-between border-b p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold">Lançar avaliação</h2>
              <p className="text-xs text-muted-foreground">{aluno.nome}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="rounded-md p-2 hover:bg-accent disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="avaliacao-bimestre">Bimestre *</Label>
              <select
                id="avaliacao-bimestre"
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bimestre}
                onChange={(event) =>
                  alterarBimestre(Number(event.target.value) as 1 | 2 | 3 | 4)
                }
              >
                {BIMESTRES.map((item) => (
                  <option key={item} value={item}>{item}º bimestre</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="avaliacao-ano">Ano letivo *</Label>
              <Input
                id="avaliacao-ano"
                className="mt-1.5"
                type="number"
                min={1900}
                max={2200}
                value={ano}
                onChange={(event) => alterarAno(Number(event.target.value))}
                required
              />
            </div>
          </div>

          {existente && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Já existe uma avaliação neste período. Salvar atualizará o registro existente.
            </div>
          )}

          <div>
            <Label htmlFor="avaliacao-nivel">Nível de leitura (psicogênese) *</Label>
            <select
              id="avaliacao-nivel"
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={leituraNivel}
              onChange={(event) =>
                setLeituraNivel(event.target.value as NivelPsicogenese)
              }
            >
              {NIVEIS_PSICOGENESE.map((nivel) => (
                <option key={nivel} value={nivel}>{nivel}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Competências *</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {COMPETENCIAS.map(({ campo, label }) => (
                <div key={campo}>
                  <Label htmlFor={`avaliacao-${campo}`}>{label}</Label>
                  <select
                    id={`avaliacao-${campo}`}
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={pontuacoes[campo]}
                    onChange={(event) =>
                      setPontuacoes((anteriores) => ({
                        ...anteriores,
                        [campo]: Number(event.target.value) as NivelCompetencia,
                      }))
                    }
                  >
                    <option value={1}>1 — Iniciante</option>
                    <option value={2}>2 — Em desenvolvimento</option>
                    <option value={3}>3 — Adequado</option>
                    <option value={4}>4 — Pleno</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="avaliacao-observacao">Observação</Label>
            <textarea
              id="avaliacao-observacao"
              className="mt-1.5 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
              maxLength={4_000}
              placeholder="Descreva avanços, dificuldades e recomendações..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/30 p-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existente ? "Atualizar avaliação" : "Salvar avaliação"}
          </Button>
        </div>
      </form>
    </div>
  );
}
