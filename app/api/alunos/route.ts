import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db/sqlite";
import { rowToAluno } from "@/lib/db/mappers";
import type { Aluno } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const db = getDb();
  const r = await db.execute("SELECT * FROM alunos ORDER BY rowid DESC");
  const items = r.rows.map(rowToAluno);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  await initDb();
  const a = (await req.json()) as Aluno;
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO alunos (id, nome, data_nascimento, cpf, rg, turma_id, bilingue, matricula, data_matricula, status, observacoes, foto, responsaveis_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      a.id,
      a.nome,
      a.dataNascimento,
      a.cpf ?? null,
      a.rg ?? null,
      a.turmaId,
      a.bilingue ? 1 : 0,
      a.matricula,
      a.dataMatricula,
      a.status,
      a.observacoes ?? null,
      a.foto ?? null,
      JSON.stringify(a.responsaveis),
    ],
  });
  return NextResponse.json({ ok: true, item: a }, { status: 201 });
}
