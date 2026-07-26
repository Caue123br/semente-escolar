import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { registrarAudit } from "@/lib/db/audit";
import { rowToTurma } from "@/lib/db/mappers";
import {
  professorPodeAcessarTurma,
  resolverEscopoProfessor,
} from "@/lib/db/professor-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
  nome: "nome", serie: "serie", turno: "turno",
  capacidade: "capacidade", cor: "cor",
};

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!professorPodeAcessarTurma(escopo, id)) {
      return erros.semPermissao("excluir uma turma não atribuída ao seu usuário");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await getDatabase().from("turmas").delete().eq("id", id).select("id").maybeSingle();
  if (error) {
    if (error.code === "23503") return erroAPI("A turma possui registros vinculados e não pode ser excluída.", 409);
    return erros.servidorIndisponivel(error);
  }
  if (!data) return erros.naoEncontrado("Turma");
  await registrarAudit("excluir", "turmas", id);
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
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!professorPodeAcessarTurma(escopo, id)) {
      return erros.semPermissao("editar uma turma não atribuída ao seu usuário");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return erros.dadosInvalidos();
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = MAPA[k];
    if (col) update[col] = v;
  }
  if (update.nome !== undefined) {
    update.nome = typeof update.nome === "string" ? update.nome.trim() : "";
    if (String(update.nome).length < 2 || String(update.nome).length > 120) return erros.dadosInvalidos("nome");
  }
  if (update.serie !== undefined && !["Mini Maternal", "Maternal", "Maternal 1", "Jardim", "Pré"].includes(String(update.serie))) {
    return erros.dadosInvalidos("série");
  }
  if (update.turno !== undefined && !["Manhã", "Tarde", "Integral"].includes(String(update.turno))) {
    return erros.dadosInvalidos("turno");
  }
  if (update.capacidade !== undefined) {
    const capacidade = Number(update.capacidade);
    if (!Number.isInteger(capacidade) || capacidade < 1 || capacidade > 100) return erros.dadosInvalidos("capacidade");
    update.capacidade = capacidade;
  }
  if (update.cor !== undefined && !/^#[0-9a-f]{6}$/i.test(String(update.cor))) return erros.dadosInvalidos("cor");

  if (patch.professorId !== undefined) {
    if (typeof patch.professorId !== "string") return erros.dadosInvalidos("professor");
    const professorId = patch.professorId.trim();
    if (!professorId) {
      update.professor_usuario_id = null;
      update.professor_id = null;
      update.professor_nome = null;
    } else {
      const { data: professor, error: erroProfessor } = await getDatabase()
        .from("usuarios")
        .select("id,nome,perfil,ativo")
        .eq("id", professorId)
        .maybeSingle();
      if (erroProfessor) return erros.servidorIndisponivel(erroProfessor);
      if (!professor || professor.perfil !== "professor" || !professor.ativo) {
        return erroAPI("O professor selecionado não está disponível.", 422);
      }
      update.professor_usuario_id = professorId;
      update.professor_id = professorId;
      update.professor_nome = String(professor.nome);
    }
  }

  if (Object.keys(update).length === 0) return erros.dadosInvalidos("nenhum campo editável");
  const { data, error } = await getDatabase().from("turmas").update(update).eq("id", id).select("*").maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Turma");
  await registrarAudit("editar", "turmas", id, { campos: Object.keys(update) });
  return sucesso({ item: rowToTurma(data) });
}
