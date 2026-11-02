"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";
import { CapturarFotoModal } from "@/components/alunos/capturar-foto-modal";

interface UploadFotoProps {
  alunoId: string;
  nomeAluno: string;
  fotoAtual?: string | null;
  cor?: string;
  size?: "md" | "lg" | "xl";
  onAtualizado?: (url: string) => void;
}

const SIZE_CLASSES = {
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-32 w-32 text-3xl",
};

export function UploadFotoAluno({
  alunoId,
  nomeAluno,
  fotoAtual,
  cor,
  size = "lg",
  onAtualizado,
}: UploadFotoProps) {
  const [modalAberto, setModalAberto] = React.useState(false);
  const [fotoLocal, setFotoLocal] = React.useState<string | null>(fotoAtual ?? null);

  React.useEffect(() => {
    setFotoLocal(fotoAtual ?? null);
  }, [fotoAtual]);

  return (
    <div className="relative inline-block group">
      <Avatar className={cn(SIZE_CLASSES[size], "ring-2 ring-background shadow")}>
        {fotoLocal && <AvatarImage src={fotoLocal} alt={nomeAluno} />}
        <AvatarFallback
          className="font-bold"
          style={cor ? { backgroundColor: cor + "30", color: cor } : undefined}
        >
          {initials(nomeAluno)}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        title="Tirar ou enviar foto"
        aria-label={`Tirar ou enviar foto de ${nomeAluno}`}
        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      >
        <Camera className="h-4 w-4" />
      </button>
      {modalAberto && (
        <CapturarFotoModal
          alunoId={alunoId}
          nomeAluno={nomeAluno}
          onClose={() => setModalAberto(false)}
          onAtualizado={(url) => {
            setFotoLocal(url);
            onAtualizado?.(url);
          }}
        />
      )}
    </div>
  );
}
