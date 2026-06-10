"use client";

import * as React from "react";
import { Megaphone, Pin, Plus, ThumbsUp, MessageCircle } from "lucide-react";
import { useEntidade } from "@/lib/data/store";
import { NovoAvisoModal } from "@/components/shared/novo-aviso-modal";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";

const CORES_TIPO: Record<string, string> = {
  Importante: "bg-danger/15 text-danger",
  Pedagógico: "bg-primary/15 text-primary",
  Atividade: "bg-warning/15 text-warning",
  Evento: "bg-purple-100 text-purple-700",
  Avisos: "bg-secondary text-secondary-foreground",
};

export default function MuralPage() {
  const { items: posts } = useEntidade("muralPosts");
  const [modalAberto, setModalAberto] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Megaphone className="h-3.5 w-3.5" /> MURAL
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Mural de avisos
          </h1>
          <p className="text-sm text-muted-foreground">
            Comunicados, novidades e atividades da escola.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo aviso
        </Button>
      </div>

      <NovoAvisoModal aberto={modalAberto} onClose={() => setModalAberto(false)} />

      <div className="space-y-4 max-w-3xl">
        {posts
          .sort((a, b) => (b.fixado ? 1 : 0) - (a.fixado ? 1 : 0))
          .map((p) => (
            <Card key={p.id} className={p.fixado ? "border-primary/40 bg-primary/5" : ""}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/15 text-primary text-xs">
                      {initials(p.autor)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.autor}</span>
                      <span className="text-xs text-muted-foreground">{p.cargo}</span>
                      <Badge className={CORES_TIPO[p.tipo]}>{p.tipo}</Badge>
                      {p.fixado && (
                        <Badge variant="outline" className="text-[10px]">
                          <Pin className="h-3 w-3 mr-1" /> Fixado
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.data}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-bold mb-2">{p.titulo}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.conteudo}</p>

                <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm">
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                    <ThumbsUp className="h-4 w-4" /> {p.likes}
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                    <MessageCircle className="h-4 w-4" /> {p.comentarios} comentários
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
