import { NextResponse } from "next/server";

import { podeGerenciarAlunos } from "@/lib/access-control";
import { erros } from "@/lib/db/api-response";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  if (!podeGerenciarAlunos(usuario.perfil)) {
    return erros.semPermissao("listar professores para atribuição");
  }

  const { data, error } = await getDatabase()
    .from("usuarios")
    .select("id,nome")
    .eq("perfil", "professor")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) return erros.servidorIndisponivel(error);

  return NextResponse.json({
    items: (data ?? []).map((professor) => ({
      id: String(professor.id),
      nome: String(professor.nome),
    })),
  });
}
