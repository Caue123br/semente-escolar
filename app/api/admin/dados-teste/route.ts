import { NextResponse } from "next/server";

import { getUsuarioLogado, type Usuario } from "@/lib/db/auth";
import {
  carregarDadosTesteAdministrador,
  getDemoSeedStatus,
} from "@/lib/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function usuarioPermitido(usuario: Usuario | null): usuario is Usuario {
  const allowedEmail = process.env.DEMO_SEED_ALLOWED_EMAIL?.trim().toLowerCase();
  const schoolId = process.env.SCHOOL_ID ?? "default";
  return Boolean(
    process.env.ENABLE_ADMIN_DEMO_SEED === "true" &&
      allowedEmail &&
      usuario?.perfil === "diretor" &&
      usuario.escolaId === schoolId &&
      usuario.email.toLowerCase() === allowedEmail
  );
}

export async function GET() {
  const usuario = await getUsuarioLogado();
  if (!usuarioPermitido(usuario)) {
    return NextResponse.json({ enabled: false });
  }

  try {
    const status = await getDemoSeedStatus();
    return NextResponse.json({ enabled: true, ...status });
  } catch (error) {
    console.error("[dados-teste] status indisponível", error);
    return NextResponse.json(
      { error: "Não foi possível verificar os dados de teste" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuarioPermitido(usuario)) {
    return NextResponse.json({ error: "Ação não autorizada" }, { status: 403 });
  }

  let body: { confirmar?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Confirmação inválida" }, { status: 400 });
  }
  if (body.confirmar !== true) {
    return NextResponse.json({ error: "Confirmação obrigatória" }, { status: 400 });
  }

  try {
    const result = await carregarDadosTesteAdministrador(usuario);
    if (result.status === "dados_existentes") {
      return NextResponse.json(
        {
          error: "A carga foi bloqueada porque a escola já possui dados",
          tabelasComDados: result.tabelasComDados,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[dados-teste] carga falhou", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os dados de teste" },
      { status: 500 }
    );
  }
}
