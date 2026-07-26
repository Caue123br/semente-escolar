"use client";

import * as React from "react";
import { Database, Sparkles } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { usePerfil } from "@/lib/perfil-context";
import { useToast } from "@/lib/toast";

const ENTIDADES_ATUALIZADAS = [
  "alunos",
  "turmas",
  "mensalidades",
  "despesas",
  "vendas",
  "estoque",
  "eventos",
  "funcionarios",
  "muralPosts",
  "kanban",
  "bibliotecaLivros",
  "bibliotecaEmprestimos",
  "bercarioBebes",
  "bercarioRegistros",
  "cardapio",
  "reservas",
  "transporte",
  "patrimonio",
  "crm",
  "notasFiscais",
] as const;

interface StatusResponse {
  enabled?: boolean;
  podeCarregar?: boolean;
}

interface LoadResponse {
  error?: string;
  counts?: Record<string, number>;
}

export function DadosTesteButton() {
  const { perfil, carregando: carregandoPerfil } = usePerfil();
  const toast = useToast();
  const [disponivel, setDisponivel] = React.useState(false);
  const [dialogAberto, setDialogAberto] = React.useState(false);

  React.useEffect(() => {
    if (carregandoPerfil || perfil !== "diretor") return;
    let active = true;
    fetch("/api/admin/dados-teste", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as StatusResponse;
      })
      .then((data) => {
        if (active) setDisponivel(Boolean(data?.enabled && data.podeCarregar));
      })
      .catch(() => {
        if (active) setDisponivel(false);
      });
    return () => {
      active = false;
    };
  }, [carregandoPerfil, perfil]);

  const carregar = async () => {
    try {
      const response = await fetch("/api/admin/dados-teste", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmar: true }),
      });
      const data = (await response.json().catch(() => ({}))) as LoadResponse;
      if (!response.ok) {
        if (response.status === 409) {
          setDisponivel(false);
          setDialogAberto(false);
        }
        toast.error("Não foi possível carregar", data.error || "Tente novamente.");
        return;
      }

      const total = Object.values(data.counts ?? {}).reduce((sum, count) => sum + count, 0);
      setDisponivel(false);
      setDialogAberto(false);
      for (const entidade of ENTIDADES_ATUALIZADAS) {
        window.dispatchEvent(new CustomEvent(`semente:changed:${entidade}`));
      }
      toast.success(
        "Dados de teste carregados",
        `${total || 210} registros fictícios foram adicionados para você conhecer o sistema.`
      );
    } catch {
      toast.error("Não foi possível carregar", "Confira sua conexão e tente novamente.");
    }
  };

  if (!disponivel) return null;

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setDialogAberto(true)}>
        <Database className="h-4 w-4" />
        Carregar dados de teste
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
      </Button>
      <ConfirmDialog
        aberto={dialogAberto}
        titulo="Carregar dados fictícios?"
        descricao="Serão adicionados alunos, mensalidades, despesas, vendas e outros registros de demonstração. Dados existentes nunca serão substituídos."
        textoBotaoConfirmar="Carregar dados"
        variante="info"
        onConfirmar={carregar}
        onFechar={() => setDialogAberto(false)}
      />
    </>
  );
}
