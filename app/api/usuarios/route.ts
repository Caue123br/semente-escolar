import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/db/postgres";
import { hashSenha, getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const logado = await getUsuarioLogado();
  if (logado?.perfil !== "diretor") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const sb = getDatabase();
  const { data, error } = await sb
    .from("usuarios")
    .select("id, email, nome, perfil, ativo, ultimo_acesso, created_at")
    .order("nome", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    items: (data ?? []).map((u) => ({
      id: String(u.id),
      email: String(u.email),
      nome: String(u.nome),
      perfil: String(u.perfil),
      ativo: Boolean(u.ativo),
      ultimoAcesso: u.ultimo_acesso ? String(u.ultimo_acesso) : null,
      criadoEm: u.created_at ? String(u.created_at) : null,
    })),
  });
}

interface NovoUsuarioInput {
  nome: string;
  email: string;
  perfil: "diretor" | "coordenador" | "professor" | "financeiro";
  senha: string;
}

export async function POST(req: Request) {
  const logado = await getUsuarioLogado();
  if (logado?.perfil !== "diretor") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  let body: NovoUsuarioInput;
  try {
    body = (await req.json()) as NovoUsuarioInput;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return erros.dadosInvalidos();
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const senha = typeof body.senha === "string" ? body.senha : "";
  if (nome.length < 2 || nome.length > 120) return erros.dadosInvalidos("nome");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return erros.dadosInvalidos("e-mail");
  }
  if (!["diretor", "coordenador", "professor", "financeiro"].includes(body.perfil)) {
    return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
  }
  if (senha.length < 12 || Buffer.byteLength(senha, "utf8") > 72) {
    return NextResponse.json({ error: "A senha deve ter entre 12 e 72 bytes" }, { status: 400 });
  }
  const sb = getDatabase();
  const senhaHash = await hashSenha(senha);
  const id = `usr-${randomUUID()}`;
  const { data, error } = await sb.from("usuarios").insert({
    id,
    nome,
    email,
    perfil: body.perfil,
    senha_hash: senhaHash,
    ativo: true,
  }).select("id, email, nome, perfil, ativo").single();
  if (error || !data) {
    if (error?.code === "23505") return erroAPI("Já existe um usuário com este e-mail.", 409);
    return erros.servidorIndisponivel(error ?? new Error("INSERT de usuário sem retorno"));
  }
  await registrarAudit("criar", "usuarios", id, { perfil: body.perfil });
  return sucesso({ id, item: data }, 201);
}
