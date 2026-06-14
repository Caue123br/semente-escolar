import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db/sqlite";
import { rowToFuncionario } from "@/lib/db/mappers";
import type { Funcionario } from "@/lib/mock-data/rh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const db = getDb();
  const r = await db.execute("SELECT * FROM funcionarios ORDER BY nome ASC");
  const items = r.rows.map(rowToFuncionario);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  await initDb();
  const f = (await req.json()) as Funcionario;
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO funcionarios (id, nome, cargo, cpf, email, telefone, admissao, salario_bruto, vinculo, status, turmas_atuacao_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      f.id,
      f.nome,
      f.cargo,
      f.cpf,
      f.email,
      f.telefone,
      f.admissao,
      f.salarioBruto,
      f.vinculo,
      f.status,
      f.turmasAtuacao ? JSON.stringify(f.turmasAtuacao) : null,
    ],
  });
  return NextResponse.json({ ok: true, item: f }, { status: 201 });
}
