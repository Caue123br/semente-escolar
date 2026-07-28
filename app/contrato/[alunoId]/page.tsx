import { notFound } from "next/navigation";
import { getDatabase } from "@/lib/db/postgres";
import { rowToAluno } from "@/lib/db/mappers";
import { seedAlunos, seedTurmas } from "@/lib/db/seed";
import { ContratoEditor } from "./contrato-editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ alunoId: string }>;
}

export default async function ContratoPage({ params }: PageProps) {
  const { alunoId } = await params;
  await Promise.all([seedAlunos(), seedTurmas()]);
  const sb = getDatabase();

  const { data: alunoRaw } = await sb.from("alunos").select("*").eq("id", alunoId).maybeSingle();
  if (!alunoRaw) notFound();
  const aluno = rowToAluno(alunoRaw);

  const { data: turmaRaw } = await sb.from("turmas").select("*").eq("id", aluno.turmaId).maybeSingle();
  const turma = {
    nome: String(turmaRaw?.nome ?? ""),
    serie: String(turmaRaw?.serie ?? ""),
    turno: String(turmaRaw?.turno ?? ""),
  };

  const { data: escolaRaw } = await sb
    .from("escolas")
    .select("*")
    .eq("id", process.env.SCHOOL_ID ?? "default")
    .maybeSingle();
  const escola = {
    nome: String(escolaRaw?.nome ?? "Centro Educacional Modelo"),
    cnpj: String(escolaRaw?.cnpj ?? ""),
    endereco: String(escolaRaw?.endereco ?? ""),
    telefone: String(escolaRaw?.telefone ?? ""),
  };

  return <ContratoEditor aluno={aluno} turma={turma} escola={escola} />;
}
