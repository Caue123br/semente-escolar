import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { erros } from "@/lib/db/api-response";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";
import {
  listarAlunosDoEscopoProfessor,
  professorPodeAcessarAluno,
  professorPodeAcessarTurma,
  resolverEscopoProfessor,
} from "@/lib/db/professor-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITE_RESPOSTA = 200;
// O recorte do professor é feito em memória (a consulta não tem OR), então
// busca mais linhas do que devolve pra não perder recado da turma dele no corte.
const LIMITE_BUSCA_RESTRITA = 1_000;

export async function GET(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();

  const url = new URL(req.url);
  const turmaId = url.searchParams.get("turmaId");
  const alunoId = url.searchParams.get("alunoId");
  const tipo = url.searchParams.get("tipo");

  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (escopo.restrito) {
      if (turmaId && !professorPodeAcessarTurma(escopo, turmaId)) {
        return erros.semPermissao("ver recados de outras turmas");
      }
      if (alunoId && !(await professorPodeAcessarAluno(escopo, alunoId))) {
        return erros.semPermissao("ver recados de alunos de outras turmas");
      }
    }

    const sb = getDatabase();
    let query = sb.from("recados").select("*").order("pinado", { ascending: false }).order("enviado_em", { ascending: false });
    if (turmaId) query = query.eq("turma_id", turmaId);
    if (alunoId) query = query.eq("aluno_id", alunoId);
    if (tipo) query = query.eq("tipo", tipo);
    const { data, error } = await query.limit(
      escopo.restrito ? LIMITE_BUSCA_RESTRITA : LIMITE_RESPOSTA
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let linhas = data ?? [];
    if (escopo.restrito) {
      const alunosDoEscopo = new Set(await listarAlunosDoEscopoProfessor(escopo));
      linhas = linhas
        .filter((r) => {
          const turma = r.turma_id ? String(r.turma_id) : null;
          const aluno = r.aluno_id ? String(r.aluno_id) : null;
          if (turma) return escopo.turmaIds.includes(turma);
          if (aluno) return alunosDoEscopo.has(aluno);
          return true; // comunicado geral da escola
        })
        .slice(0, LIMITE_RESPOSTA);
    }

    return NextResponse.json({
      items: linhas.map((r) => ({
        id: String(r.id),
        autorNome: String(r.autor_nome),
        autorCargo: r.autor_cargo ? String(r.autor_cargo) : null,
        turmaId: r.turma_id ? String(r.turma_id) : null,
        alunoId: r.aluno_id ? String(r.aluno_id) : null,
        tipo: String(r.tipo),
        titulo: String(r.titulo),
        mensagem: String(r.mensagem),
        dataLimite: r.data_limite ? String(r.data_limite) : null,
        anexoUrl: r.anexo_url ? String(r.anexo_url) : null,
        urgente: Boolean(r.urgente),
        pinado: Boolean(r.pinado),
        // `enviado_em` é um nome legado da coluna; hoje representa apenas o
        // momento do registro interno, pois o portal ainda não publica recados.
        registradoEm: r.enviado_em ? String(r.enviado_em) : null,
      })),
    });
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
}

interface RecadoInput {
  turmaId?: string;
  alunoId?: string;
  tipo: "recado" | "licao_de_casa" | "comunicado" | "evento" | "lembrete";
  titulo: string;
  mensagem: string;
  dataLimite?: string;
  urgente?: boolean;
  pinado?: boolean;
}

export async function POST(req: Request) {
  const body = (await req.json()) as RecadoInput;
  if (!body.tipo || !body.titulo || !body.mensagem) {
    return NextResponse.json({ error: "Tipo, título e mensagem são obrigatórios" }, { status: 400 });
  }
  const u = await getUsuarioLogado();
  if (!u) return erros.naoAutenticado();

  try {
    const escopo = await resolverEscopoProfessor(u);
    if (escopo.restrito) {
      if (body.turmaId && !professorPodeAcessarTurma(escopo, body.turmaId)) {
        return erros.semPermissao("registrar recado em outra turma");
      }
      if (body.alunoId && !(await professorPodeAcessarAluno(escopo, body.alunoId))) {
        return erros.semPermissao("registrar recado de aluno de outra turma");
      }
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }

  const id = `rc-${Date.now()}`;
  const sb = getDatabase();
  const { error } = await sb.from("recados").insert({
    id,
    autor_id: u.id,
    autor_nome: u.nome,
    autor_cargo: u.perfil,
    turma_id: body.turmaId ?? null,
    aluno_id: body.alunoId ?? null,
    tipo: body.tipo,
    titulo: body.titulo,
    mensagem: body.mensagem,
    data_limite: body.dataLimite ?? null,
    urgente: body.urgente ?? false,
    pinado: body.pinado ?? false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await registrarAudit("criar", "recados", id, { tipo: body.tipo, turmaId: body.turmaId }, u);
  return NextResponse.json({
    ok: true,
    id,
    publicadoNoPortal: false,
    notificacaoEnviada: false,
  }, { status: 201 });
}
