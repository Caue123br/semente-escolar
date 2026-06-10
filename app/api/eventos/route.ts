import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db/sqlite";
import { rowToEvento } from "@/lib/db/mappers";
import type { EventoCalendario } from "@/lib/mock-data/calendario";

export async function GET() {
  await initDb();
  const r = await getDb().execute("SELECT * FROM eventos ORDER BY data ASC");
  return NextResponse.json({ items: r.rows.map(rowToEvento) });
}

export async function POST(req: Request) {
  await initDb();
  const e = (await req.json()) as EventoCalendario;
  await getDb().execute({
    sql: `INSERT INTO eventos (id, titulo, data, hora_inicio, hora_fim, tipo, local, responsavel, descricao, turmas_json) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    args: [
      e.id,
      e.titulo,
      e.data,
      e.horaInicio ?? null,
      e.horaFim ?? null,
      e.tipo,
      e.local ?? null,
      e.responsavel ?? null,
      e.descricao ?? null,
      e.turmas ? JSON.stringify(e.turmas) : null,
    ],
  });
  return NextResponse.json({ ok: true, item: e }, { status: 201 });
}
