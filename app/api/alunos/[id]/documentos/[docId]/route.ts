import { unlink } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { erros } from "@/lib/db/api-response";
import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { professorPodeAcessarAluno, resolverEscopoProfessor } from "@/lib/db/professor-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEGMENTO = /^[a-zA-Z0-9_.-]{1,120}$/;

function uploadsRoot(): string {
  const configured = process.env.UPLOADS_DIR;
  if (configured) {
    if (!path.isAbsolute(configured)) {
      throw new Error("UPLOADS_DIR deve ser um caminho absoluto");
    }
    return path.normalize(configured);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("UPLOADS_DIR não configurado em produção");
  }
  return path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "uploads");
}

/** Deriva o caminho físico da própria linha gravada — nunca de input do cliente. */
function caminhoDoDocumento(arquivoUrl: string): string | null {
  if (!arquivoUrl.startsWith("/api/uploads/")) return null;
  const partes = arquivoUrl
    .slice("/api/uploads/".length)
    .split("/")
    .map((parte) => decodeURIComponent(parte));
  if (partes.length !== 5 || partes[1] !== "alunos" || partes[3] !== "documentos") return null;
  if (partes.some((segmento) => !SEGMENTO.test(segmento))) return null;
  const root = uploadsRoot();
  const absoluto = path.join(/* turbopackIgnore: true */ root, ...partes);
  if (!absoluto.startsWith(`${root}${path.sep}`)) return null;
  return absoluto;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!(await professorPodeAcessarAluno(escopo, id))) {
      return erros.semPermissao("excluir documentos de um aluno fora das suas turmas");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }

  const db = getDatabase();
  const { data: documento, error: erroBusca } = await db
    .from("alunos_documentos")
    .select("*")
    .eq("id", docId)
    .eq("aluno_id", id)
    .maybeSingle();
  if (erroBusca) return erros.servidorIndisponivel(erroBusca);
  if (!documento) return erros.naoEncontrado("Documento");

  const { error: erroDelete } = await db.from("alunos_documentos").delete().eq("id", docId);
  if (erroDelete) return erros.servidorIndisponivel(erroDelete);

  // LGPD: o arquivo físico sai junto. Falha aqui não ressuscita o registro —
  // loga e segue (o arquivo pode já ter sido removido por fora).
  const caminho = caminhoDoDocumento(String(documento.arquivo_url ?? ""));
  if (caminho) {
    try {
      await unlink(/* turbopackIgnore: true */ caminho);
    } catch (error) {
      console.error("[documento-aluno] unlink falhou", error);
    }
  }

  await registrarAudit(
    "excluir",
    "alunos_documentos",
    docId,
    { alunoId: id, categoria: documento.categoria, arquivoUrl: documento.arquivo_url },
    usuario
  );
  return NextResponse.json({ ok: true });
}
