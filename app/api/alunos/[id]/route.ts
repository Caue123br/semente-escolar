import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";
import { erros } from "@/lib/db/api-response";
import {
  professorPodeAcessarAluno,
  professorPodeAcessarTurma,
  resolverEscopoProfessor,
} from "@/lib/db/professor-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
  nome: "nome",
  dataNascimento: "data_nascimento",
  cpf: "cpf",
  rg: "rg",
  turmaId: "turma_id",
  bilingue: "bilingue",
  matricula: "matricula",
  dataMatricula: "data_matricula",
  status: "status",
  observacoes: "observacoes",
  foto: "foto",
  // Ficha completa Escola Modelo
  ra: "ra",
  raca: "raca",
  sexo: "sexo",
  naturalDe: "natural_de",
  estado: "estado",
  cep: "cep",
  endereco: "endereco",
  bairro: "bairro",
  telefoneAluno: "telefone_aluno",
  religiao: "religiao",
  escolaAnteriorNome: "escola_anterior_nome",
  escolaAnteriorTempo: "escola_anterior_tempo",
};

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  const sb = getDatabase();
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!(await professorPodeAcessarAluno(escopo, id))) {
      return erros.semPermissao("excluir um aluno fora das suas turmas");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await sb
    .from("alunos")
    .update({ deleted_at: new Date().toISOString(), deleted_by: usuario.id })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Aluno");
  await registrarAudit("excluir", "alunos", id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  let patch: Record<string, unknown>;
  try {
    patch = (await req.json()) as Record<string, unknown>;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!(await professorPodeAcessarAluno(escopo, id))) {
      return erros.semPermissao("editar um aluno fora das suas turmas");
    }
    if (
      patch.turmaId !== undefined &&
      !professorPodeAcessarTurma(
        escopo,
        typeof patch.turmaId === "string" ? patch.turmaId.trim() : ""
      )
    ) {
      return erros.semPermissao("mover um aluno para uma turma não atribuída ao seu usuário");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = MAPA[k];
    if (col) update[col] = v;
  }
  if (patch.responsaveis !== undefined) update.responsaveis_json = patch.responsaveis;
  if (patch.pessoasAutorizadas !== undefined) update.pessoas_autorizadas_json = patch.pessoasAutorizadas;
  if (patch.fichaSaude !== undefined) update.ficha_saude_json = patch.fichaSaude;
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });
  const sb = getDatabase();
  const { error } = await sb.from("alunos").update(update).eq("id", id);
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ ok: true });
}
