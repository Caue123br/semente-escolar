import { NextResponse } from "next/server";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { rowToKanban } from "@/lib/db/mappers";
import {
  professorPodeAcessarTurma,
  resolverEscopoProfessor,
} from "@/lib/db/professor-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
  colunaId: "coluna_id", turmaId: "turma_id",
  titulo: "titulo", descricao: "descricao", tipo: "tipo",
  prazo: "prazo", responsavel: "responsavel", cor: "cor",
};

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  const sb = getDatabase();
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (escopo.restrito) {
      const { data: card, error: erroCard } = await sb
        .from("kanban_cards")
        .select("turma_id")
        .eq("id", id)
        .maybeSingle();
      if (erroCard) return erros.servidorIndisponivel(erroCard);
      if (!card) return erros.naoEncontrado("Card");
      if (!professorPodeAcessarTurma(escopo, String(card.turma_id))) {
        return erros.semPermissao("excluir cards de turmas não atribuídas ao seu usuário");
      }
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await sb.from("kanban_cards").delete().eq("id", id).select("id").maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Card");
  await registrarAudit("excluir", "kanban", id);
  return sucesso({ id });
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
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return erros.dadosInvalidos();
  const sb = getDatabase();
  const { data: cardAtual, error: erroCardAtual } = await sb
    .from("kanban_cards")
    .select("turma_id")
    .eq("id", id)
    .maybeSingle();
  if (erroCardAtual) return erros.servidorIndisponivel(erroCardAtual);
  if (!cardAtual) return erros.naoEncontrado("Card");
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (escopo.restrito) {
      if (!professorPodeAcessarTurma(escopo, String(cardAtual.turma_id))) {
        return erros.semPermissao("editar cards de turmas não atribuídas ao seu usuário");
      }
      if (
        patch.turmaId !== undefined &&
        !professorPodeAcessarTurma(
          escopo,
          typeof patch.turmaId === "string" ? patch.turmaId.trim() : ""
        )
      ) {
        return erros.semPermissao("mover cards para turmas não atribuídas ao seu usuário");
      }
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = MAPA[k];
    if (col) update[col] = v;
  }
  const colunas = new Set(["c-todo", "c-doing", "c-review", "c-done"]);
  const tipos = new Set(["Atividade", "Evento", "Pendência", "Avaliação"]);
  if (update.coluna_id !== undefined && !colunas.has(String(update.coluna_id))) return erros.dadosInvalidos("coluna");
  if (update.tipo !== undefined && !tipos.has(String(update.tipo))) return erros.dadosInvalidos("tipo");
  if (update.titulo !== undefined) {
    update.titulo = typeof update.titulo === "string" ? update.titulo.trim() : "";
    if (String(update.titulo).length < 2 || String(update.titulo).length > 200) return erros.dadosInvalidos("título");
  }
  for (const campo of ["descricao", "responsavel"] as const) {
    if (update[campo] !== undefined) {
      if (update[campo] !== null && typeof update[campo] !== "string") return erros.dadosInvalidos(campo);
      const texto = typeof update[campo] === "string" ? update[campo].trim() : "";
      const limite = campo === "descricao" ? 4_000 : 160;
      if (texto.length > limite) return erros.dadosInvalidos(campo);
      update[campo] = texto || null;
    }
  }
  if (update.prazo !== undefined && update.prazo !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(update.prazo))) return erros.dadosInvalidos("prazo");
  if (update.cor !== undefined && update.cor !== null && !/^#[0-9a-f]{6}$/i.test(String(update.cor))) return erros.dadosInvalidos("cor");
  if (update.turma_id !== undefined) {
    const turmaId = typeof update.turma_id === "string" ? update.turma_id.trim() : "";
    const { data: turma, error: erroTurma } = await sb.from("turmas").select("id").eq("id", turmaId).maybeSingle();
    if (erroTurma) return erros.servidorIndisponivel(erroTurma);
    if (!turma) return erroAPI("A turma informada não existe mais.", 422);
    update.turma_id = turmaId;
  }
  if (Object.keys(update).length === 0) return erros.dadosInvalidos("nenhuma alteração editável");
  const { data, error } = await sb.from("kanban_cards").update(update).eq("id", id).select("*").maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Card");
  await registrarAudit("editar", "kanban", id, { campos: Object.keys(update) });
  return sucesso({ item: rowToKanban(data) });
}
