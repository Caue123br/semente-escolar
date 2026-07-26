import { NextResponse } from "next/server";

import { dataCivilValida, objetoSimples, texto, textoOpcional } from "@/lib/api-input";
import { registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { rowToEmprestimo } from "@/lib/db/mappers";
import { getPostgresPool } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS = new Set(["Em andamento", "Devolvido", "Atrasado"]);

function ativo(status: unknown): boolean {
  return status === "Em andamento" || status === "Atrasado";
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const escolaId = process.env.SCHOOL_ID ?? "default";
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const atual = await client.query(
      `SELECT * FROM app.biblioteca_emprestimos
       WHERE escola_id = $1 AND id = $2
       FOR UPDATE`,
      [escolaId, id]
    );
    const emprestimo = atual.rows[0];
    if (!emprestimo) {
      await client.query("ROLLBACK");
      return erros.naoEncontrado("Empréstimo");
    }
    if (ativo(emprestimo.status)) {
      await client.query(
        `UPDATE app.biblioteca_livros
         SET disponiveis = LEAST(exemplares, disponiveis + 1),
             emprestados = GREATEST(0, emprestados - 1),
             updated_at = NOW()
         WHERE escola_id = $1 AND id = $2`,
        [escolaId, emprestimo.livro_id]
      );
    }
    await client.query(
      `DELETE FROM app.biblioteca_emprestimos WHERE escola_id = $1 AND id = $2`,
      [escolaId, id]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    return erros.servidorIndisponivel(error);
  } finally {
    client.release();
  }
  await registrarAudit("excluir", "biblioteca_emprestimos", id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!objetoSimples(body)) return erros.dadosInvalidos("corpo da requisição");

  const update: Record<string, unknown> = {};
  if (Object.hasOwn(body, "alunoNome")) {
    const alunoNome = texto(body.alunoNome);
    if (alunoNome.length < 2 || alunoNome.length > 200) return erros.dadosInvalidos("aluno");
    update.aluno_nome = alunoNome;
  }
  if (Object.hasOwn(body, "turma")) {
    const turma = textoOpcional(body.turma);
    if (turma && turma.length > 160) return erros.dadosInvalidos("turma");
    update.turma = turma;
  }
  if (Object.hasOwn(body, "dataEmprestimo")) {
    if (!dataCivilValida(body.dataEmprestimo)) return erros.dadosInvalidos("data do empréstimo");
    update.data_emprestimo = body.dataEmprestimo;
  }
  if (Object.hasOwn(body, "dataDevolucaoPrevista")) {
    if (!dataCivilValida(body.dataDevolucaoPrevista)) {
      return erros.dadosInvalidos("data prevista de devolução");
    }
    update.data_devolucao_prevista = body.dataDevolucaoPrevista;
  }
  if (Object.hasOwn(body, "status")) {
    const status = texto(body.status);
    if (!STATUS.has(status)) return erros.dadosInvalidos("status");
    update.status = status;
  }
  if (Object.keys(update).length === 0) {
    return erros.dadosInvalidos("nenhum campo editável foi enviado");
  }

  const escolaId = process.env.SCHOOL_ID ?? "default";
  const client = await getPostgresPool().connect();
  let registro: Record<string, unknown> | null = null;
  try {
    await client.query("BEGIN");
    const busca = await client.query(
      `SELECT * FROM app.biblioteca_emprestimos
       WHERE escola_id = $1 AND id = $2
       FOR UPDATE`,
      [escolaId, id]
    );
    const atual = busca.rows[0];
    if (!atual) throw new Error("EMPRESTIMO_NAO_ENCONTRADO");

    const dataEmprestimo = String(update.data_emprestimo ?? atual.data_emprestimo);
    const devolucao = String(update.data_devolucao_prevista ?? atual.data_devolucao_prevista);
    if (devolucao < dataEmprestimo) throw new Error("DATAS_INVALIDAS");
    const statusNovo = String(update.status ?? atual.status);
    if (atual.status === "Devolvido" && ativo(statusNovo)) {
      throw new Error("EMPRESTIMO_JA_DEVOLVIDO");
    }
    if (ativo(atual.status) && statusNovo === "Devolvido") {
      const livro = await client.query(
        `UPDATE app.biblioteca_livros
         SET disponiveis = LEAST(exemplares, disponiveis + 1),
             emprestados = GREATEST(0, emprestados - 1),
             updated_at = NOW()
         WHERE escola_id = $1 AND id = $2
         RETURNING id`,
        [escolaId, atual.livro_id]
      );
      if (livro.rowCount !== 1) throw new Error("LIVRO_NAO_ENCONTRADO");
    }

    const colunas = Object.keys(update);
    const valores = Object.values(update);
    const atribuicoes = colunas.map((coluna, index) => `"${coluna}" = $${index + 3}`);
    const atualizado = await client.query(
      `UPDATE app.biblioteca_emprestimos
       SET ${atribuicoes.join(", ")}, updated_at = NOW()
       WHERE escola_id = $1 AND id = $2
       RETURNING *`,
      [escolaId, id, ...valores]
    );
    registro = atualizado.rows[0] ?? null;
    if (!registro) throw new Error("UPDATE de empréstimo sem retorno");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && error.message === "EMPRESTIMO_NAO_ENCONTRADO") {
      return erros.naoEncontrado("Empréstimo");
    }
    if (error instanceof Error && error.message === "DATAS_INVALIDAS") {
      return erros.dadosInvalidos("a devolução não pode ser anterior ao empréstimo");
    }
    if (error instanceof Error && error.message === "EMPRESTIMO_JA_DEVOLVIDO") {
      return erroAPI("Um empréstimo já devolvido não pode ser reaberto.", 422);
    }
    if (error instanceof Error && error.message === "LIVRO_NAO_ENCONTRADO") {
      return erroAPI("O livro vinculado ao empréstimo não existe mais.", 409);
    }
    return erros.servidorIndisponivel(error);
  } finally {
    client.release();
  }

  await registrarAudit("editar", "biblioteca_emprestimos", id, { campos: Object.keys(update) });
  return sucesso({ item: rowToEmprestimo(registro) });
}
