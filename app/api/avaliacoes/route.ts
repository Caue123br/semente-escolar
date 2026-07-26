import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";
import { getDatabase, type DatabaseRow } from "@/lib/db/postgres";
import {
  listarAlunosDoEscopoProfessor,
  professorPodeAcessarAluno,
  resolverEscopoProfessor,
} from "@/lib/db/professor-scope";
import {
  NIVEIS_PSICOGENESE,
  type AvaliacaoPedagogica,
  type NivelPsicogenese,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AvaliacaoInput {
  alunoId?: unknown;
  bimestre?: unknown;
  ano?: unknown;
  leituraNivel?: unknown;
  leitura?: unknown;
  escrita?: unknown;
  logicaMatematica?: unknown;
  oralidade?: unknown;
  observacao?: unknown;
}

function rowToAvaliacao(row: DatabaseRow): AvaliacaoPedagogica {
  return {
    id: String(row.id),
    alunoId: String(row.aluno_id),
    bimestre: Number(row.bimestre) as AvaliacaoPedagogica["bimestre"],
    ano: Number(row.ano),
    leituraNivel: row.leitura_nivel
      ? (String(row.leitura_nivel) as AvaliacaoPedagogica["leituraNivel"])
      : null,
    leitura: row.leitura != null
      ? (Number(row.leitura) as AvaliacaoPedagogica["leitura"])
      : null,
    escrita: row.escrita != null
      ? (Number(row.escrita) as AvaliacaoPedagogica["escrita"])
      : null,
    logicaMatematica: row.logica_matematica != null
      ? (Number(row.logica_matematica) as AvaliacaoPedagogica["logicaMatematica"])
      : null,
    oralidade: row.oralidade != null
      ? (Number(row.oralidade) as AvaliacaoPedagogica["oralidade"])
      : null,
    observacao: row.observacao ? String(row.observacao) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
  };
}

function competenciaValida(valor: unknown): valor is 1 | 2 | 3 | 4 {
  return Number.isInteger(valor) && Number(valor) >= 1 && Number(valor) <= 4;
}

export async function GET(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  const url = new URL(req.url);
  const alunoId = url.searchParams.get("alunoId")?.trim();
  const sb = getDatabase();
  let query = sb
    .from("avaliacoes")
    .select("*")
    .order("ano", { ascending: false })
    .order("bimestre", { ascending: false });
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (alunoId) {
      if (!(await professorPodeAcessarAluno(escopo, alunoId))) {
        return erros.semPermissao("acessar avaliações de alunos fora das suas turmas");
      }
      query = query.eq("aluno_id", alunoId);
    } else if (escopo.restrito) {
      query = query.in("aluno_id", await listarAlunosDoEscopoProfessor(escopo));
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await query;
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToAvaliacao) });
}

export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  let body: AvaliacaoInput;
  try {
    body = (await req.json()) as AvaliacaoInput;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return erros.dadosInvalidos("corpo da requisição");
  }

  const alunoId = typeof body.alunoId === "string" ? body.alunoId.trim() : "";
  const bimestre = Number(body.bimestre);
  const ano = Number(body.ano);
  const leituraNivel =
    typeof body.leituraNivel === "string" ? body.leituraNivel.trim() : "";
  const observacao =
    typeof body.observacao === "string" ? body.observacao.trim() : "";

  if (!alunoId) return erros.dadosInvalidos("aluno");
  if (!Number.isInteger(bimestre) || bimestre < 1 || bimestre > 4) {
    return erros.dadosInvalidos("bimestre");
  }
  if (!Number.isInteger(ano) || ano < 1900 || ano > 2200) {
    return erros.dadosInvalidos("ano letivo");
  }
  if (!NIVEIS_PSICOGENESE.includes(leituraNivel as NivelPsicogenese)) {
    return erros.dadosInvalidos("nível de leitura");
  }
  if (
    !competenciaValida(body.leitura) ||
    !competenciaValida(body.escrita) ||
    !competenciaValida(body.logicaMatematica) ||
    !competenciaValida(body.oralidade)
  ) {
    return erros.dadosInvalidos("as competências devem estar entre 1 e 4");
  }
  if (observacao.length > 4_000) return erros.dadosInvalidos("observação muito longa");

  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!(await professorPodeAcessarAluno(escopo, alunoId))) {
      return erros.semPermissao("registrar avaliações de alunos fora das suas turmas");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }

  const sb = getDatabase();
  const { data: aluno, error: erroAluno } = await sb
    .from("alunos")
    .select("id")
    .eq("id", alunoId)
    .maybeSingle();
  if (erroAluno) return erros.servidorIndisponivel(erroAluno);
  if (!aluno) return erroAPI("O aluno selecionado não existe mais. Atualize a página.", 422);

  const { data: existente, error: erroExistente } = await sb
    .from("avaliacoes")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("bimestre", bimestre)
    .eq("ano", ano)
    .maybeSingle();
  if (erroExistente) return erros.servidorIndisponivel(erroExistente);

  const id = existente?.id ? String(existente.id) : randomUUID();
  const { data, error } = await sb
    .from("avaliacoes")
    .upsert(
      {
        id,
        aluno_id: alunoId,
        bimestre,
        ano,
        leitura_nivel: leituraNivel,
        leitura: body.leitura,
        escrita: body.escrita,
        logica_matematica: body.logicaMatematica,
        oralidade: body.oralidade,
        observacao: observacao || null,
      },
      { onConflict: "aluno_id,bimestre,ano" }
    )
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23503") {
      return erroAPI("O aluno selecionado não existe mais. Atualize a página.", 422);
    }
    if (["22003", "23502", "23514"].includes(error?.code ?? "")) {
      return erros.dadosInvalidos();
    }
    return erros.servidorIndisponivel(
      error ?? new Error("UPSERT de avaliação sem retorno")
    );
  }

  await registrarAudit(existente ? "editar" : "criar", "avaliacoes", id, {
    alunoId,
    bimestre,
    ano,
  });
  return sucesso({ item: rowToAvaliacao(data) }, existente ? 200 : 201);
}
