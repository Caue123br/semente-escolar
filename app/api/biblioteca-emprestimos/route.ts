import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { dataCivilValida, objetoSimples, texto, textoOpcional } from "@/lib/api-input";
import { registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { rowToEmprestimo } from "@/lib/db/mappers";
import { getDatabase, getPostgresPool } from "@/lib/db/postgres";
import { seedBiblioteca } from "@/lib/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await seedBiblioteca();
  const { data, error } = await getDatabase()
    .from("biblioteca_emprestimos")
    .select("*")
    .order("data_emprestimo", { ascending: false });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToEmprestimo) });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!objetoSimples(body)) return erros.dadosInvalidos("corpo da requisição");

  const livroId = texto(body.livroId);
  const alunoNome = texto(body.alunoNome);
  const turma = textoOpcional(body.turma);
  const dataEmprestimo = body.dataEmprestimo;
  const dataDevolucaoPrevista = body.dataDevolucaoPrevista;
  if (!livroId || livroId.length > 120) return erros.dadosInvalidos("livro");
  if (alunoNome.length < 2 || alunoNome.length > 200) return erros.dadosInvalidos("aluno");
  if (turma && turma.length > 160) return erros.dadosInvalidos("turma");
  if (!dataCivilValida(dataEmprestimo)) return erros.dadosInvalidos("data do empréstimo");
  if (!dataCivilValida(dataDevolucaoPrevista)) {
    return erros.dadosInvalidos("data prevista de devolução");
  }
  if (dataDevolucaoPrevista < dataEmprestimo) {
    return erros.dadosInvalidos("a devolução não pode ser anterior ao empréstimo");
  }

  const id = randomUUID();
  const escolaId = process.env.SCHOOL_ID ?? "default";
  const client = await getPostgresPool().connect();
  let registro: Record<string, unknown> | null = null;
  try {
    await client.query("BEGIN");
    const livroAtualizado = await client.query(
      `UPDATE app.biblioteca_livros
       SET disponiveis = disponiveis - 1,
           emprestados = emprestados + 1,
           updated_at = NOW()
       WHERE escola_id = $1 AND id = $2 AND disponiveis > 0
       RETURNING id`,
      [escolaId, livroId]
    );
    if (livroAtualizado.rowCount !== 1) {
      const livro = await client.query(
        `SELECT id FROM app.biblioteca_livros WHERE escola_id = $1 AND id = $2`,
        [escolaId, livroId]
      );
      throw new Error(livro.rowCount === 0 ? "LIVRO_NAO_ENCONTRADO" : "SEM_EXEMPLAR");
    }
    const inserido = await client.query(
      `INSERT INTO app.biblioteca_emprestimos
        (escola_id, id, livro_id, aluno_nome, turma, data_emprestimo,
         data_devolucao_prevista, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Em andamento')
       RETURNING *`,
      [escolaId, id, livroId, alunoNome, turma, dataEmprestimo, dataDevolucaoPrevista]
    );
    registro = inserido.rows[0] ?? null;
    if (!registro) throw new Error("INSERT de empréstimo sem retorno");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && error.message === "LIVRO_NAO_ENCONTRADO") {
      return erros.naoEncontrado("Livro");
    }
    if (error instanceof Error && error.message === "SEM_EXEMPLAR") {
      return erroAPI("Não há exemplar disponível para este livro.", 409);
    }
    return erros.servidorIndisponivel(error);
  } finally {
    client.release();
  }

  await registrarAudit("criar", "biblioteca_emprestimos", id, { livroId });
  return sucesso({ item: rowToEmprestimo(registro) }, 201);
}
