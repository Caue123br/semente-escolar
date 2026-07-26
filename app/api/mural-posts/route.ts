import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { getUsuarioLogado, type Perfil } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";
import { erros, sucesso } from "@/lib/db/api-response";
import { getDatabase } from "@/lib/db/postgres";
import { rowToMuralPost } from "@/lib/db/mappers";
import { seedMuralPosts } from "@/lib/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS = new Set(["Importante", "Pedagógico", "Atividade", "Avisos", "Evento"]);
const CARGO_POR_PERFIL: Record<Perfil, string> = {
  diretor: "Direção",
  coordenador: "Coordenação",
  professor: "Professor(a)",
  financeiro: "Financeiro",
};

interface MuralPostInput {
  tipo?: unknown;
  titulo?: unknown;
  conteudo?: unknown;
  fixado?: unknown;
}

export async function GET() {
  await seedMuralPosts();
  const sb = getDatabase();
  const { data, error } = await sb
    .from("mural_posts")
    .select("*")
    .order("fixado", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return erros.servidorIndisponivel(error);
  return NextResponse.json({ items: (data ?? []).map(rowToMuralPost) });
}

export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) {
    return erros.naoAutenticado();
  }

  let p: MuralPostInput;
  try {
    p = (await req.json()) as MuralPostInput;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }

  const titulo = typeof p.titulo === "string" ? p.titulo.trim() : "";
  const conteudo = typeof p.conteudo === "string" ? p.conteudo.trim() : "";
  const tipo = typeof p.tipo === "string" ? p.tipo : "";
  if (!titulo || titulo.length > 200) {
    return NextResponse.json(
      { error: "Informe um título com até 200 caracteres" },
      { status: 400 }
    );
  }
  if (!conteudo || conteudo.length > 5_000) {
    return NextResponse.json(
      { error: "Informe uma mensagem com até 5.000 caracteres" },
      { status: 400 }
    );
  }
  if (!TIPOS.has(tipo)) {
    return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
  }

  const registro = {
    id: randomUUID(),
    autor: usuario.nome,
    cargo: CARGO_POR_PERFIL[usuario.perfil],
    tipo,
    titulo,
    conteudo,
    data: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    fixado: p.fixado === true,
    likes: 0,
    comentarios: 0,
  };
  const sb = getDatabase();
  const { data, error } = await sb
    .from("mural_posts")
    .insert(registro)
    .select("*")
    .single();
  if (error || !data) {
    return erros.servidorIndisponivel(error ?? new Error("INSERT de aviso sem retorno"));
  }
  await registrarAudit("criar", "mural_posts", registro.id, { tipo, fixado: registro.fixado });
  return sucesso({ item: rowToMuralPost(data) }, 201);
}
