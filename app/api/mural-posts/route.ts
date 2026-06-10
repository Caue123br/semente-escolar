import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db/sqlite";
import { rowToMuralPost } from "@/lib/db/mappers";
import type { MuralPost } from "@/lib/data/store";

export async function GET() {
  await initDb();
  const r = await getDb().execute(
    "SELECT * FROM mural_posts ORDER BY fixado DESC, rowid DESC"
  );
  return NextResponse.json({ items: r.rows.map(rowToMuralPost) });
}

export async function POST(req: Request) {
  await initDb();
  const p = (await req.json()) as MuralPost;
  await getDb().execute({
    sql: `INSERT INTO mural_posts (id, autor, cargo, tipo, titulo, conteudo, data, likes, comentarios, fixado) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    args: [
      p.id,
      p.autor,
      p.cargo,
      p.tipo,
      p.titulo,
      p.conteudo,
      p.data,
      p.likes ?? 0,
      p.comentarios ?? 0,
      p.fixado ? 1 : 0,
    ],
  });
  return NextResponse.json({ ok: true, item: p }, { status: 201 });
}
