import { SearchX, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  titulo?: string;
  desc?: string;
  icone?: React.ComponentType<{ className?: string }>;
  cta?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  titulo = "Nada por aqui ainda",
  desc = "Tente ajustar os filtros ou adicionar um novo item.",
  icone: Icon = Inbox,
  cta,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-emerald-200/30 blur-2xl" />
        <div className="relative h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
      <h3 className="font-semibold text-base">{titulo}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">{desc}</p>
      {cta && <div className="mt-5">{cta}</div>}
    </div>
  );
}

export function EmptySearchState({
  busca,
  cta,
}: {
  busca?: string;
  cta?: React.ReactNode;
}) {
  return (
    <EmptyState
      icone={SearchX}
      titulo="Nenhum resultado encontrado"
      desc={
        busca
          ? `Não encontramos nada para "${busca}". Tente outras palavras.`
          : "Tente ajustar os filtros ou usar outras palavras-chave."
      }
      cta={cta}
    />
  );
}
