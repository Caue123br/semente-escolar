import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db/sqlite";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const { id } = await params;
  const db = getDb();
  await db.execute({ sql: "DELETE FROM alunos WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const { id } = await params;
  const patch = await req.json();
  const db = getDb();

  const setClauses: string[] = [];
  const args: (string | number | null)[] = [];

  const mapa: Record<string, string> = {
    nome: "nome",
    dataNascimento: "data_nascimento",
    cpf: "cpf",
    rg: "rg",
    turmaId: "turma_id",
    bilingue: "bilingue",
    matricula: "matricula",
    dataMatricula: "data_matricula",
    status: "status",
    observacoes: "observacoes",
    foto: "foto",
  };

  for (const [k, v] of Object.entries(patch)) {
    const col = mapa[k];
    if (!col) continue;
    setClauses.push(`${col} = ?`);
    if (k === "bilingue") args.push(v ? 1 : 0);
    else args.push(v as string | number | null);
  }

  if (patch.responsaveis) {
    setClauses.push("responsaveis_json = ?");
    args.push(JSON.stringify(patch.responsaveis));
  }

  if (setClauses.length === 0) return NextResponse.json({ ok: true });
  args.push(id);
  await db.execute({
    sql: `UPDATE alunos SET ${setClauses.join(", ")} WHERE id = ?`,
    args,
  });
  return NextResponse.json({ ok: true });
}
