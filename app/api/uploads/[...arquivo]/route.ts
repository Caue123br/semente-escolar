import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getUsuarioLogado } from "@/lib/db/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEGMENTO = /^[a-zA-Z0-9_.-]{1,120}$/;
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ arquivo: string[] }> }
) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return new NextResponse(null, { status: 401 });

  const { arquivo } = await params;
  const escolaId = process.env.SCHOOL_ID ?? "default";
  if (
    arquivo.length !== 4 ||
    arquivo[0] !== escolaId ||
    arquivo[1] !== "alunos" ||
    arquivo.some((segmento) => !SEGMENTO.test(segmento))
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const root = uploadsRoot();
  const absolutePath = path.join(/* turbopackIgnore: true */ root, ...arquivo);
  if (!absolutePath.startsWith(`${root}${path.sep}`)) {
    return new NextResponse(null, { status: 404 });
  }

  const contentType = CONTENT_TYPES[path.extname(absolutePath).toLowerCase()];
  if (!contentType) return new NextResponse(null, { status: 404 });

  try {
    const file = await readFile(/* turbopackIgnore: true */ absolutePath);
    return new NextResponse(file, {
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=300, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
