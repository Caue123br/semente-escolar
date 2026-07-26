"use client";

import * as React from "react";
import {
  Trello,
  Plus,
  Calendar,
  AlertCircle,
  GraduationCap,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { colunasKanbanPadrao } from "@/lib/mock-data/kanban";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { NovoCardKanbanModal } from "@/components/shared/novo-card-kanban-modal";
import { cn, formatDateBR } from "@/lib/utils";

const TIPO_ICONE: Record<string, React.ComponentType<{ className?: string }>> = {
  Atividade: GraduationCap,
  Evento: Calendar,
  Pendência: AlertCircle,
  Avaliação: GraduationCap,
};

const TIPO_COR: Record<string, string> = {
  Atividade: "bg-blue-100 text-blue-700",
  Evento: "bg-purple-100 text-purple-700",
  Pendência: "bg-amber-100 text-amber-700",
  Avaliação: "bg-emerald-100 text-emerald-700",
};

export default function KanbanPage() {
  const toast = useToast();
  const { items: cards, update } = useEntidade("kanban");
  const { items: turmas } = useEntidade("turmas");
  const turmasDisponiveis = turmas;

  const [turmaSelecionada, setTurmaSelecionada] = React.useState<string>("");
  const [arrastando, setArrastando] = React.useState<string | null>(null);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [colunaParaNovo, setColunaParaNovo] = React.useState("c-todo");

  React.useEffect(() => {
    if (turmasDisponiveis.length === 0 && turmaSelecionada) setTurmaSelecionada("");
    else if (
      turmasDisponiveis.length > 0 &&
      !turmasDisponiveis.some((turma) => turma.id === turmaSelecionada)
    ) {
      setTurmaSelecionada(turmasDisponiveis[0].id);
    }
  }, [turmasDisponiveis, turmaSelecionada]);

  const turmaAtual = turmasDisponiveis.find((t) => t.id === turmaSelecionada);
  const cardsDaTurma = cards.filter((c) => c.turmaId === turmaSelecionada);

  const onDragStart = (e: React.DragEvent, cardId: string) => {
    setArrastando(cardId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = async (colunaId: string) => {
    if (!arrastando) return;
    const cardArrastado = cards.find((c) => c.id === arrastando);
    setArrastando(null);
    if (!cardArrastado || cardArrastado.colunaId === colunaId) return;
    await update(arrastando, { colunaId });
    const colunaNome = colunasKanbanPadrao.find((co) => co.id === colunaId)?.nome ?? "";
    toast.success("Card movido", `"${cardArrastado.titulo}" → ${colunaNome}`);
  };

  const abrirNovoCard = (colunaId: string) => {
    setColunaParaNovo(colunaId);
    setModalAberto(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Trello className="h-3.5 w-3.5" /> KANBAN
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Quadros por turma
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize atividades, eventos e pendências. Arraste os cards entre colunas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={turmaSelecionada}
            onValueChange={setTurmaSelecionada}
            disabled={turmasDisponiveis.length === 0}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Nenhuma turma atribuída" />
            </SelectTrigger>
            <SelectContent>
              {turmasDisponiveis.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => abrirNovoCard("c-todo")} disabled={!turmaSelecionada}>
            <Plus className="mr-2 h-4 w-4" /> Novo card
          </Button>
        </div>
      </div>

      {turmaAtual && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: turmaAtual.cor }}
              />
              {turmaAtual.nome}
            </CardTitle>
            <CardDescription>
              {turmaAtual.professorNome} · {cardsDaTurma.length} cards
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {turmasDisponiveis.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">Nenhuma turma atribuída ao seu usuário</p>
            <p className="max-w-lg text-sm text-muted-foreground">
              Peça à direção para conferir o nome do professor no cadastro da turma.
              Até o vínculo ser confirmado, nenhum quadro de outras turmas será exibido.
            </p>
          </CardContent>
        </Card>
      )}

      {turmaAtual && (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {colunasKanbanPadrao.map((coluna) => {
          const cardsCol = cardsDaTurma.filter((c) => c.colunaId === coluna.id);
          return (
            <div
              key={coluna.id}
              className="rounded-lg bg-muted/40 p-3 min-h-[400px]"
              onDragOver={onDragOver}
              onDrop={() => onDrop(coluna.id)}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: coluna.cor }}
                  />
                  <h3 className="font-semibold text-sm">{coluna.nome}</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {cardsCol.length}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => abrirNovoCard(coluna.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {cardsCol.map((card) => {
                  const Ic = TIPO_ICONE[card.tipo];
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, card.id)}
                      className={cn(
                        "group cursor-grab active:cursor-grabbing rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-all",
                        arrastando === card.id && "opacity-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge
                          className={cn(
                            "text-[10px] border-transparent flex items-center gap-1",
                            TIPO_COR[card.tipo]
                          )}
                        >
                          <Ic className="h-3 w-3" />
                          {card.tipo}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm leading-snug mb-1">
                        {card.titulo}
                      </h4>
                      {card.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {card.descricao}
                        </p>
                      )}
                      {(card.prazo || card.responsavel) && (
                        <div className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-muted-foreground">
                          {card.prazo && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDateBR(card.prazo)}
                            </div>
                          )}
                          {card.responsavel && (
                            <div className="text-[10px] truncate max-w-[120px]">
                              {card.responsavel}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {cardsCol.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-8 italic">
                    Nenhum card aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      <NovoCardKanbanModal
        aberto={modalAberto && Boolean(turmaSelecionada)}
        onFechar={() => setModalAberto(false)}
        turmaId={turmaSelecionada}
        colunaId={colunaParaNovo}
      />
    </div>
  );
}
