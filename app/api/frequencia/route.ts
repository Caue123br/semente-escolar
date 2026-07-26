import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { rowToFrequencia } from "@/lib/db/mappers";
import {
  listarAlunosDoEscopoProfessor,
  professorPodeAcessarAluno,
  professorPodeAcessarTurma,
  resolverEscopoProfessor,
} from "@/lib/db/professor-scope";
import { seedFrequencia } from "@/lib/db/seed";
import { formatDateLocalISO } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FrequenciaInput {
  chamada?: unknown;
  turmaId?: unknown;
  registros?: unknown;
  alunoId?: unknown;
  data?: unknown;
  presente?: unknown;
  justificativa?: unknown;
}

interface RegistroChamada {
  alunoId: string;
  presente: boolean;
  justificativa: string | null;
}

function dataCivilValida(valor: string): boolean {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) return false;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano
    && data.getUTCMonth() === mes - 1
    && data.getUTCDate() === dia;
}

function normalizarRegistrosChamada(valor: unknown): RegistroChamada[] | null {
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > 200) return null;

  const registros: RegistroChamada[] = [];
  const alunoIds = new Set<string>();
  for (const item of valor) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const entrada = item as Record<string, unknown>;
    const alunoId = typeof entrada.alunoId === "string" ? entrada.alunoId.trim() : "";
    if (!alunoId || alunoIds.has(alunoId) || typeof entrada.presente !== "boolean") return null;
    if (
      entrada.justificativa !== undefined
      && entrada.justificativa !== null
      && typeof entrada.justificativa !== "string"
    ) return null;
    const justificativa = typeof entrada.justificativa === "string"
      ? entrada.justificativa.trim()
      : "";
    if (justificativa.length > 2_000) return null;
    alunoIds.add(alunoId);
    registros.push({ alunoId, presente: entrada.presente, justificativa: justificativa || null });
  }
  return registros;
}

export async function GET() {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  await seedFrequencia();
  const sb = getDatabase();
  let query = sb.from("frequencia").select("*").order("data", { ascending: false });
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (escopo.restrito) {
      query = query.in("aluno_id", await listarAlunosDoEscopoProfessor(escopo));
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await query;
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToFrequencia) });
}

export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  let f: FrequenciaInput;
  try {
    f = (await req.json()) as FrequenciaInput;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!f || typeof f !== "object" || Array.isArray(f)) return erros.dadosInvalidos();

  if (f.chamada === true || f.registros !== undefined) {
    const turmaId = typeof f.turmaId === "string" ? f.turmaId.trim() : "";
    const dataFrequencia = typeof f.data === "string" ? f.data.trim() : "";
    const registros = normalizarRegistrosChamada(f.registros);
    if (!turmaId) return erros.dadosInvalidos("turma");
    if (!dataCivilValida(dataFrequencia) || dataFrequencia > formatDateLocalISO()) {
      return erros.dadosInvalidos("data");
    }
    if (!registros) return erros.dadosInvalidos("registros da chamada");

    const sb = getDatabase();
    try {
      const escopo = await resolverEscopoProfessor(usuario);
      if (!professorPodeAcessarTurma(escopo, turmaId)) {
        return erros.semPermissao("registrar frequência fora das suas turmas");
      }

      const { data: turma, error: erroTurma } = await sb
        .from("turmas")
        .select("id")
        .eq("id", turmaId)
        .maybeSingle();
      if (erroTurma) return erros.servidorIndisponivel(erroTurma);
      if (!turma) return erroAPI("A turma informada não existe mais.", 422);

      const alunoIds = registros.map((registro) => registro.alunoId);
      const { data: alunos, error: erroAlunos } = await sb
        .from("alunos")
        .select("id,turma_id")
        .in("id", alunoIds);
      if (erroAlunos) return erros.servidorIndisponivel(erroAlunos);
      if (
        (alunos ?? []).length !== alunoIds.length
        || (alunos ?? []).some((aluno) => String(aluno.turma_id ?? "") !== turmaId)
      ) {
        return erroAPI("A chamada contém aluno que não pertence à turma selecionada.", 422);
      }

      const items = await sb.transaction(async (tx) => {
        const { data, error } = await tx.from("frequencia").upsert(
          registros.map((registro) => ({
            id: randomUUID(),
            aluno_id: registro.alunoId,
            turma_id: turmaId,
            data: dataFrequencia,
            presente: registro.presente,
            justificativa: registro.justificativa,
          })),
          { onConflict: "aluno_id,data" }
        ).select("*");
        if (error || !data || data.length !== registros.length) {
          const falha = new Error(error?.message ?? "Chamada incompleta no banco de dados") as Error & { code?: string };
          falha.code = error?.code;
          throw falha;
        }
        return data.map(rowToFrequencia);
      });

      await registrarAudit("editar", "frequencia", `${turmaId}:${dataFrequencia}`, {
        turmaId,
        data: dataFrequencia,
        total: registros.length,
      });
      return sucesso({ items });
    } catch (error) {
      const codigo = error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
      if (["22007", "23502", "23503", "23514"].includes(codigo)) {
        return erros.dadosInvalidos("registros da chamada");
      }
      return erros.servidorIndisponivel(error);
    }
  }

  const alunoId = typeof f?.alunoId === "string" ? f.alunoId.trim() : "";
  const dataFrequencia = typeof f.data === "string" ? f.data.trim() : "";
  const justificativa = typeof f.justificativa === "string" ? f.justificativa.trim() : "";
  if (!alunoId) return erros.dadosInvalidos("aluno");
  if (!dataCivilValida(dataFrequencia) || dataFrequencia > formatDateLocalISO()) {
    return erros.dadosInvalidos("data");
  }
  if (typeof f.presente !== "boolean") return erros.dadosInvalidos("presença");
  if (justificativa.length > 2_000) return erros.dadosInvalidos("justificativa");
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!(await professorPodeAcessarAluno(escopo, alunoId))) {
      return erros.semPermissao("registrar frequência de alunos fora das suas turmas");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const sb = getDatabase();
  const { data: aluno, error: erroAluno } = await sb
    .from("alunos")
    .select("id,turma_id")
    .eq("id", alunoId)
    .maybeSingle();
  if (erroAluno) return erros.servidorIndisponivel(erroAluno);
  if (!aluno) return erroAPI("O aluno informado não existe mais.", 422);
  const { data: existente, error: erroExistente } = await sb
    .from("frequencia")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("data", dataFrequencia)
    .maybeSingle();
  if (erroExistente) return erros.servidorIndisponivel(erroExistente);
  const id = existente ? String(existente.id) : randomUUID();
  const { data, error } = await sb.from("frequencia").upsert({
    id,
    aluno_id: alunoId,
    turma_id: aluno.turma_id ? String(aluno.turma_id) : null,
    data: dataFrequencia,
    presente: f.presente,
    justificativa: justificativa || null,
  }, { onConflict: "aluno_id,data" }).select("*").single();
  if (error || !data) {
    if (["22007", "23502", "23503", "23514"].includes(error?.code ?? "")) return erros.dadosInvalidos();
    return erros.servidorIndisponivel(error ?? new Error("UPSERT de frequência sem retorno"));
  }
  await registrarAudit(existente ? "editar" : "criar", "frequencia", id, { alunoId, data: dataFrequencia });
  return sucesso({ item: rowToFrequencia(data) }, existente ? 200 : 201);
}
