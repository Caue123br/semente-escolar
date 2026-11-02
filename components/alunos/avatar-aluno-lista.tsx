"use client";

import * as React from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import type { Aluno } from "@/lib/types";

type AlunoResumo = Pick<Aluno, "id" | "nome" | "foto">;

interface Props {
  aluno: AlunoResumo;
  /** Destino do clique quando há foto (perfil ou visão pedagógica). */
  href: string;
  cor?: string;
  podeGerenciar: boolean;
  onCapturar: (aluno: AlunoResumo) => void;
}

/**
 * Avatar da listagem: mostra a foto de quem tem; para aluno sem foto, quem
 * gerencia vê um botão de captura rápida (webcam/arquivo) sem sair da lista.
 */
export function AvatarAlunoLista({ aluno, href, cor, podeGerenciar, onCapturar }: Props) {
  const fallback = (
    <AvatarFallback
      className="text-xs"
      style={{ backgroundColor: (cor ?? "#888") + "30", color: cor ?? "#888" }}
    >
      {initials(aluno.nome)}
    </AvatarFallback>
  );

  if (aluno.foto) {
    return (
      <Link href={href} tabIndex={-1} aria-hidden="true" className="shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={aluno.foto} alt="" />
          {fallback}
        </Avatar>
      </Link>
    );
  }

  if (!podeGerenciar) {
    return <Avatar className="h-8 w-8 shrink-0">{fallback}</Avatar>;
  }

  return (
    <button
      type="button"
      onClick={() => onCapturar(aluno)}
      title="Tirar foto do aluno"
      aria-label={`Tirar foto de ${aluno.nome}`}
      className="relative shrink-0"
    >
      <Avatar className="h-8 w-8">{fallback}</Avatar>
      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
        <Camera className="h-2.5 w-2.5" />
      </span>
    </button>
  );
}
