import { NextResponse } from "next/server";

import { podeGerenciarAlunos } from "@/lib/access-control";
import { erros } from "@/lib/db/api-response";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { professorPodeAcessarAluno, resolverEscopoProfessor } from "@/lib/db/professor-scope";
import { linhaParaDocumentoAluno } from "@/lib/documentos-aluno";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  // O proxy libera GET de /api/alunos para o financeiro (cobrança), mas
  // documento pessoal não participa da cobrança: só gestão e professora.
  if (!podeGerenciarAlunos(usuario.perfil) && usuario.perfil !== "professor") {
    return erros.semPermissao("ver os documentos do aluno");
  }
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!(await professorPodeAcessarAluno(escopo, id))) {
      return erros.semPermissao("ver documentos de um aluno fora das suas turmas");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await getDatabase()
    .from("alunos_documentos")
    .select("*")
    .eq("aluno_id", id)
    .order("criado_em", { ascending: false });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(linhaParaDocumentoAluno) });
}
