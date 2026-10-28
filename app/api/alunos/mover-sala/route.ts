import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { diffAudit, registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros } from "@/lib/db/api-response";
import { professorPodeAcessarTurma, resolverEscopoProfessor } from "@/lib/db/professor-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Movimentação em massa: a secretaria seleciona N alunos na listagem e manda
 * todos para outra sala de uma vez (ex.: desmembrar uma turma cheia em duas
 * salas do mesmo nível). A professora "muda" junto porque pertence à sala.
 * Uma única checagem de lotação para o lote — confirmável, como no PATCH
 * individual — em vez de N erros um por um.
 */
export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();

  let corpo: Record<string, unknown>;
  try {
    corpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
    return erros.dadosInvalidos("corpo da requisição");
  }

  const turmaId = typeof corpo.turmaId === "string" ? corpo.turmaId.trim() : "";
  if (!turmaId) return erroAPI("Selecione a sala de destino.", 400);
  if (!Array.isArray(corpo.alunoIds)) return erros.dadosInvalidos("alunos selecionados");
  const ids = [...new Set(
    corpo.alunoIds
      .filter((id): id is string => typeof id === "string" && id.trim() !== "")
      .map((id) => id.trim())
  )];
  if (ids.length === 0) return erroAPI("Selecione ao menos um aluno para mover.", 400);
  if (ids.length > 500) return erroAPI("Mova até 500 alunos por vez.", 400);

  const sb = getDatabase();
  let escopo;
  try {
    escopo = await resolverEscopoProfessor(usuario);
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  if (!professorPodeAcessarTurma(escopo, turmaId)) {
    return erros.semPermissao("mover alunos para uma turma não atribuída ao seu usuário");
  }

  const { data: turma, error: erroTurma } = await sb
    .from("turmas")
    .select("id, nome, capacidade")
    .eq("id", turmaId)
    .maybeSingle();
  if (erroTurma) return erros.servidorIndisponivel(erroTurma);
  if (!turma) return erroAPI("A sala selecionada não existe mais. Atualize a página.", 422);

  let consulta = sb
    .from("alunos")
    .select("id, turma_id, status")
    .in("id", ids)
    .is("deleted_at", null);
  if (escopo.restrito) consulta = consulta.in("turma_id", escopo.turmaIds);
  const { data: encontrados, error: erroAlunos } = await consulta;
  if (erroAlunos) return erros.servidorIndisponivel(erroAlunos);
  const alunos = encontrados ?? [];
  if (alunos.length !== ids.length) {
    return erroAPI(
      "Alguns alunos selecionados não foram encontrados. Atualize a página e tente de novo.",
      422
    );
  }

  const movendo = alunos.filter((aluno) => aluno.turma_id !== turmaId);
  if (movendo.length === 0) {
    return NextResponse.json({ ok: true, movidos: 0, turmaNome: String(turma.nome) });
  }

  // Mesma regra do PATCH individual: só aluno Ativo ocupa vaga; capacidade 0 é
  // sala fechada; a direção pode confirmar por cima.
  const capacidade = Number(turma.capacidade ?? 0);
  const ativosMovendo = movendo.filter((aluno) => aluno.status === "Ativo").length;
  if (
    corpo.confirmarLotacao !== true &&
    Number.isFinite(capacidade) &&
    capacidade >= 0 &&
    ativosMovendo > 0
  ) {
    const { count, error: erroOcupacao } = await sb
      .from("alunos")
      .select("id", { count: "exact", head: true })
      .eq("turma_id", turmaId)
      .eq("status", "Ativo");
    if (erroOcupacao) return erros.servidorIndisponivel(erroOcupacao);
    const ocupacao = count ?? 0;
    if (ocupacao + ativosMovendo > capacidade) {
      return NextResponse.json(
        {
          error: `A turma ${turma.nome} tem ${ocupacao} de ${capacidade} vagas ocupadas e receberia mais ${ativosMovendo} aluno(s). Confirme para mover mesmo assim ou aumente a capacidade dela em Turmas.`,
          codigo: "lotacao",
          ocupacao,
          capacidade,
          turmaNome: String(turma.nome),
          quantidade: ativosMovendo,
        },
        { status: 422 }
      );
    }
  }

  const { error: erroUpdate } = await sb
    .from("alunos")
    .update({ turma_id: turmaId })
    .in("id", movendo.map((aluno) => aluno.id))
    .select("id");
  if (erroUpdate) {
    if ((erroUpdate as { code?: string }).code === "23503") {
      return erroAPI("A sala selecionada não existe mais. Atualize a página.", 422);
    }
    return erros.servidorIndisponivel(erroUpdate);
  }

  for (const aluno of movendo) {
    await registrarAudit(
      "editar",
      "alunos",
      String(aluno.id),
      { ...diffAudit({ turma_id: aluno.turma_id }, { turma_id: turmaId }), operacao: "mover-sala" },
      usuario
    );
  }
  return NextResponse.json({ ok: true, movidos: movendo.length, turmaNome: String(turma.nome) });
}
