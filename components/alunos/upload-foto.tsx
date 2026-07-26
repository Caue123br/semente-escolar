"use client";

import * as React from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials, cn } from "@/lib/utils";
import { useToast } from "@/lib/toast";

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
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = React.useState(false);
  const [fotoLocal, setFotoLocal] = React.useState<string | null>(fotoAtual ?? null);
  const toast = useToast();

  React.useEffect(() => {
    setFotoLocal(fotoAtual ?? null);
  }, [fotoAtual]);

  const escolherFoto = () => inputRef.current?.click();

  const fazerUpload = async (file: File) => {
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.set("alunoId", alunoId);
      fd.set("file", file);
      const r = await fetch("/api/upload/foto-aluno", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) {
        toast.error("Erro ao subir foto", data.error || "Tente de novo");
        return;
      }
      setFotoLocal(data.url);
      toast.success("Foto atualizada!", nomeAluno);
      onAtualizado?.(data.url);
    } catch (e) {
      toast.error("Erro de conexão", String(e));
    } finally {
      setEnviando(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) fazerUpload(f);
    e.target.value = "";
  };

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
        onClick={escolherFoto}
        disabled={enviando}
        title="Trocar foto"
        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-60"
      >
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onPickFile}
      />
    </div>
  );
}
