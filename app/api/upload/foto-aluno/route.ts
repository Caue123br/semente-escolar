import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALUNO_ID = /^[a-zA-Z0-9_-]{1,100}$/;

const FORMATOS = [
  {
    mime: "image/jpeg",
    extension: "jpg",
    matches: (buffer: Buffer) =>
      buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mime: "image/png",
    extension: "png",
    matches: (buffer: Buffer) =>
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: "image/webp",
    extension: "webp",
    matches: (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP",
  },
] as const;

function uploadsRoot(): string {
  const configured = process.env.UPLOADS_DIR;
  if (configured) {
    if (!path.isAbsolute(configured)) {
      throw new Error("UPLOADS_DIR deve ser um caminho absoluto");
    }
    return path.normalize(configured);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("UPLOADS_DIR não configurado em produção");
  }
  return path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "uploads");
}

export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Envie como multipart/form-data" }, { status: 400 });
  }

  const alunoId = form.get("alunoId");
  const file = form.get("file");

  if (typeof alunoId !== "string" || !ALUNO_ID.test(alunoId)) {
    return NextResponse.json({ error: "alunoId inválido" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem vazia ou maior que 5 MB" }, { status: 400 });
  }

  const db = getDatabase();
  const { data: aluno, error: erroAluno } = await db
    .from("alunos")
    .select("id")
    .eq("id", alunoId)
    .maybeSingle();
  if (erroAluno) {
    console.error("[upload-aluno] consulta falhou", erroAluno);
    return NextResponse.json({ error: "Não foi possível validar o aluno" }, { status: 500 });
  }
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const formato = FORMATOS.find((item) => item.mime === file.type && item.matches(buffer));
  if (!formato) {
    return NextResponse.json({ error: "O conteúdo do arquivo não é JPG, PNG ou WEBP válido" }, { status: 400 });
  }

  const escolaId = process.env.SCHOOL_ID ?? "default";
  const fileName = `${randomUUID()}.${formato.extension}`;
  const relativeParts = [escolaId, "alunos", alunoId, fileName];
  const directory = path.join(
    /* turbopackIgnore: true */ uploadsRoot(),
    ...relativeParts.slice(0, -1)
  );
  const destination = path.join(/* turbopackIgnore: true */ directory, fileName);
  const url = `/api/uploads/${relativeParts.map(encodeURIComponent).join("/")}`;

  try {
    await mkdir(/* turbopackIgnore: true */ directory, { recursive: true, mode: 0o700 });
    await writeFile(/* turbopackIgnore: true */ destination, buffer, { flag: "wx", mode: 0o600 });
  } catch (error) {
    console.error("[upload-aluno] gravação falhou", error);
    return NextResponse.json({ error: "Não foi possível armazenar a imagem" }, { status: 500 });
  }

  const { error: erroUpdate } = await db.from("alunos").update({ foto: url }).eq("id", alunoId);
  if (erroUpdate) {
    console.error("[upload-aluno] atualização falhou", erroUpdate);
    try {
      await unlink(/* turbopackIgnore: true */ destination);
    } catch (cleanupError) {
      console.error("[upload-aluno] limpeza compensatória falhou", cleanupError);
    }
    return NextResponse.json({ error: "Não foi possível atualizar a foto do aluno" }, { status: 500 });
  }

  await registrarAudit("editar", "alunos", alunoId, { foto: true });
  return NextResponse.json({ ok: true, url });
}
