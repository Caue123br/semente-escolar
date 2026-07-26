import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { rowToAluno } from "@/lib/db/mappers";
import { seedAlunos } from "@/lib/db/seed";
import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { limparCPF, validarCPF } from "@/lib/cpf";
import { resolverEscopoProfessor } from "@/lib/db/professor-scope";
import { formatDateLocalISO } from "@/lib/utils";
import type { Aluno } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  await seedAlunos();
  const sb = getDatabase();
  let query = sb.from("alunos").select("*").order("created_at", { ascending: false });
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (escopo.restrito) query = query.in("turma_id", escopo.turmaIds);
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await query;
  if (error) return erros.servidorIndisponivel(error);
  const alunos = (data ?? []).map(rowToAluno);
  if (usuario.perfil === "professor") {
    return NextResponse.json({
      items: alunos.map((aluno) => ({
        id: aluno.id,
        nome: aluno.nome,
        dataNascimento: aluno.dataNascimento,
        cpf: "",
        turmaId: aluno.turmaId,
        bilingue: aluno.bilingue,
        matricula: aluno.matricula,
        dataMatricula: aluno.dataMatricula,
        status: aluno.status,
        responsaveis: [],
        foto: aluno.foto,
      })),
    });
  }
  return NextResponse.json({ items: alunos });
}

export async function POST(req: Request) {
  let a: Aluno;
  try {
    a = (await req.json()) as Aluno;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!a || typeof a !== "object" || Array.isArray(a)) {
    return erros.dadosInvalidos("corpo da requisição");
  }

  const nome = typeof a?.nome === "string" ? a.nome.trim() : "";
  const dataNascimento = typeof a?.dataNascimento === "string" ? a.dataNascimento : "";
  const turmaId = typeof a?.turmaId === "string" ? a.turmaId.trim() : "";
  const cpf = typeof a?.cpf === "string" ? limparCPF(a.cpf) : "";
  const dataNascimentoObj = new Date(`${dataNascimento}T00:00:00Z`);
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)
    && !Number.isNaN(dataNascimentoObj.getTime())
    && dataNascimentoObj.toISOString().slice(0, 10) === dataNascimento
    && dataNascimento <= formatDateLocalISO();

  if (nome.length < 2 || nome.length > 200) return erros.dadosInvalidos("nome completo");
  if (!dataValida) return erros.dadosInvalidos("data de nascimento");
  if (!turmaId) return erros.dadosInvalidos("turma");
  if (cpf && !validarCPF(cpf)) return erros.dadosInvalidos("CPF");
  if (a.responsaveis !== undefined && !Array.isArray(a.responsaveis)) {
    return erros.dadosInvalidos("responsáveis");
  }
  if (a.pessoasAutorizadas !== undefined && !Array.isArray(a.pessoasAutorizadas)) {
    return erros.dadosInvalidos("pessoas autorizadas");
  }
  if (a.fichaSaude !== undefined && (typeof a.fichaSaude !== "object" || !a.fichaSaude)) {
    return erros.dadosInvalidos("ficha de saúde");
  }

  const sb = getDatabase();

  const { data: turma, error: erroTurma } = await sb
    .from("turmas")
    .select("id")
    .eq("id", turmaId)
    .maybeSingle();
  if (erroTurma) return erros.servidorIndisponivel(erroTurma);
  if (!turma) return erroAPI("A turma selecionada não existe mais. Atualize a página.", 422);

  const id = randomUUID();
  const matricula = `${new Date().getFullYear()}/${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const { data, error } = await sb.from("alunos").insert({
    id,
    nome,
    data_nascimento: dataNascimento,
    cpf: cpf || null,
    rg: a.rg || null,
    turma_id: turmaId,
    bilingue: Boolean(a.bilingue),
    matricula,
    data_matricula: formatDateLocalISO(),
    status: "Ativo",
    observacoes: a.observacoes || null,
    foto: a.foto || null,
    responsaveis_json: a.responsaveis,
    // Campos da ficha completa
    ra: a.ra || null,
    raca: a.raca || null,
    sexo: a.sexo || null,
    natural_de: a.naturalDe || null,
    estado: a.estado || null,
    cep: a.cep || null,
    endereco: a.endereco || null,
    bairro: a.bairro || null,
    telefone_aluno: a.telefoneAluno || null,
    religiao: a.religiao || null,
    escola_anterior_nome: a.escolaAnteriorNome || null,
    escola_anterior_tempo: a.escolaAnteriorTempo || null,
    pessoas_autorizadas_json: a.pessoasAutorizadas || [],
    ficha_saude_json: a.fichaSaude || null,
  }).select("*").single();

  if (error || !data) {
    if (error?.code === "23505") {
      return erroAPI("Já existe um aluno com o mesmo CPF, RA ou matrícula.", 409);
    }
    if (error?.code === "23503") {
      return erroAPI("A turma selecionada não existe mais. Atualize a página.", 422);
    }
    if (["22007", "23502", "23514"].includes(error?.code ?? "")) {
      return erros.dadosInvalidos();
    }
    return erros.servidorIndisponivel(error ?? new Error("INSERT de aluno sem retorno"));
  }

  await registrarAudit("criar", "alunos", id, { turmaId });
  return sucesso({ item: rowToAluno(data) }, 201);
}
