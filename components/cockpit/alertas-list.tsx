"use client";

import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Package,
  Calendar,
  UserMinus,
  GraduationCap,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Alerta, TipoAlerta } from "@/lib/types";
import { alertasCockpit } from "@/lib/mock-data/alertas";

const ICONE_TIPO: Record<TipoAlerta, React.ComponentType<{ className?: string }>> = {
  inadimplencia: AlertTriangle,
  estagnacao: GraduationCap,
  estoque: Package,
  validade: Calendar,
  evasao: UserMinus,
  matricula: AlertCircle,
};

const COR_SEVERIDADE: Record<string, string> = {
  vermelho: "bg-danger/10 text-danger ring-danger/20",
  amarelo: "bg-warning/10 text-warning ring-warning/20",
  verde: "bg-success/10 text-success ring-success/20",
};

const ROTULO_TIPO: Record<TipoAlerta, string> = {
  inadimplencia: "Inadimplência",
  estagnacao: "Pedagógico",
  estoque: "Estoque",
  validade: "Validade",
  evasao: "Evasão",
  matricula: "Matrícula",
};

function AlertaItem({ alerta }: { alerta: Alerta }) {
  const Icon = ICONE_TIPO[alerta.tipo];
  return (
    <Link
      href={alerta.link}
      className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all hover:bg-accent/50 hover:shadow-sm"
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg ring-1 shrink-0",
          COR_SEVERIDADE[alerta.severidade]
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
            {ROTULO_TIPO[alerta.tipo]}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm font-semibold text-foreground truncate">
          {alerta.titulo}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1">{alerta.descricao}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export function AlertasList() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-danger" />
              Alertas que pedem ação
            </CardTitle>
            <CardDescription>
              {alertasCockpit.length} itens precisam de atenção
            </CardDescription>
          </div>
          <Badge variant="danger">{alertasCockpit.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alertasCockpit.map((a) => (
          <AlertaItem key={a.id} alerta={a} />
        ))}
      </CardContent>
    </Card>
  );
}
