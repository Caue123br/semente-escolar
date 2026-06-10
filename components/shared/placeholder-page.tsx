"use client";

import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({
  titulo,
  descricao,
  proximoPasso,
}: {
  titulo: string;
  descricao: string;
  proximoPasso?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
            <Construction className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Módulo em construção</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {proximoPasso ??
              "Esta tela será construída na próxima etapa do protótipo. A navegação está disponível para validação do fluxo."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
