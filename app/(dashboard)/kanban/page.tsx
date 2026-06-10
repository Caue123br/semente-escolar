"use client";

import * as React from "react";
import {
  Trello,
  Plus,
  MoreVertical,
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
import { colunasKanbanPadrao, cardsKanban } from "@/lib/mock-data/kanban";
import { turmas, turmasDoProfessor } from "@/lib/mock-data/turmas";
import { usePerfil } from "@/lib/perfil-context";
import { cn, formatDateBR } from "@/lib/utils";
import type { KanbanCard } from "@/lib/types";

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
  const { perfil } = usePerfil();
  const turmasComCards = turmas.filter((t) => cardsKanban.some((c) => c.turmaId === t.id));
  const turmasDisponiveis =
    perfil === "professor"
      ? turmasComCards.filter((t) => turmasDoProfessor.includes(t.id))
      : turmasComCards;

  const [turmaSelecionada, setTurmaSelecionada] = React.useState(
    turmasDisponiveis[0]?.id ?? "t5"
  );
  const [cards, setCards] = React.useState<KanbanCard[]>(cardsKanban);
  const [arrastando, setArrastando] = React.useState<string | null>(null);

  const turmaAtual = turmas.find((t) => t.id === turmaSelecionada);
  const cardsDaTurma = cards.filter((c) => c.turmaId === turmaSelecionada);

  const onDragStart = (e: React.DragEvent, cardId: string) => {
    setArrastando(cardId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (colunaId: string) => {
    if (!arrastando) return;
    setCards((prev) =>
      prev.map((c) => (c.id === arrastando ? { ...c, colunaId } : c))
    );
    setArrastando(null);
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
          <Select value={turmaSelecionada} onValueChange={setTurmaSelecionada}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {turmasDisponiveis.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button>
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
                <Button size="icon" variant="ghost" className="h-6 w-6">
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
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
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
    </div>
  );
}
