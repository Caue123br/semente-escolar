import { NextResponse } from "next/server";
import { getDatabase, getPostgresPool } from "@/lib/db/postgres";
import {
  hashSenha,
  getUsuarioLogado,
  revogarTodasSessoes,
} from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const logado = await getUsuarioLogado();
  if (logado?.perfil !== "diretor") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  let patch: Record<string, unknown>;
  try {
    patch = (await req.json()) as Record<string, unknown>;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return erros.dadosInvalidos();
  const sb = getDatabase();
  const { data: alvo, error: erroAlvo } = await sb
    .from("usuarios")
    .select("id,perfil,ativo")
    .eq("id", id)
    .maybeSingle();
  if (erroAlvo) return erros.servidorIndisponivel(erroAlvo);
  if (!alvo) return erros.naoEncontrado("Usuário");
  if (id === logado.id && (patch.ativo === false || (patch.perfil !== undefined && patch.perfil !== "diretor"))) {
    return erroAPI("Você não pode remover o próprio acesso de direção.", 400);
  }
  const removeAcessoDiretor =
    alvo.perfil === "diretor" &&
    alvo.ativo === true &&
    (patch.ativo === false || (patch.perfil !== undefined && patch.perfil !== "diretor"));
  if (removeAcessoDiretor) {
    const { data: diretores, error: erroDiretores } = await sb
      .from("usuarios")
      .select("id")
      .eq("perfil", "diretor")
      .eq("ativo", true);
    if (erroDiretores) return erros.servidorIndisponivel(erroDiretores);
    if ((diretores ?? []).length <= 1) {
      return erroAPI("Cadastre outro diretor ativo antes de remover este acesso.", 409);
    }
  }
  const update: Record<string, unknown> = {};
  if (patch.nome !== undefined) {
    const nome = typeof patch.nome === "string" ? patch.nome.trim() : "";
    if (nome.length < 2 || nome.length > 120) return erros.dadosInvalidos("nome");
    update.nome = nome;
  }
  if (patch.email !== undefined) {
    const email = typeof patch.email === "string" ? patch.email.toLowerCase().trim() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return erros.dadosInvalidos("e-mail");
    }
    update.email = email;
  }
  if (patch.perfil !== undefined) {
    if (
      typeof patch.perfil !== "string" ||
      !["diretor", "coordenador", "professor", "financeiro"].includes(patch.perfil)
    ) {
      return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
    }
    update.perfil = patch.perfil;
  }
  if (patch.ativo !== undefined) {
    if (typeof patch.ativo !== "boolean") return erros.dadosInvalidos("status ativo");
    update.ativo = patch.ativo;
  }
  if (patch.senha !== undefined && typeof patch.senha !== "string") {
    return erros.dadosInvalidos("senha");
  }
  if (typeof patch.senha === "string" && patch.senha) {
    if (
      String(patch.senha).length < 12 ||
      Buffer.byteLength(String(patch.senha), "utf8") > 72
    ) {
      return NextResponse.json({ error: "A senha deve ter entre 12 e 72 bytes" }, { status: 400 });
    }
    update.senha_hash = await hashSenha(String(patch.senha));
  }
  update.updated_at = new Date().toISOString();

  const { data, error } = await sb.from("usuarios").update(update).eq("id", id).select("id").maybeSingle();
  if (error) {
    if (error.code === "23505") return erroAPI("Já existe um usuário com este e-mail.", 409);
    return erros.servidorIndisponivel(error);
  }
  if (!data) return erros.naoEncontrado("Usuário");
  if (patch.senha || patch.perfil !== undefined || patch.ativo !== undefined) {
    await getPostgresPool().query(
      "UPDATE iam.usuarios SET auth_version = auth_version + 1 WHERE escola_id = $1 AND id = $2",
      [process.env.SCHOOL_ID ?? "default", id]
    );
    await revogarTodasSessoes(id);
  }
  await registrarAudit("editar", "usuarios", id, { campos: Object.keys(patch) });
  return sucesso({ id });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const logado = await getUsuarioLogado();
  if (logado?.perfil !== "diretor") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const { id } = await params;
  if (id === logado.id) {
    return NextResponse.json({ error: "Você não pode desativar a própria conta" }, { status: 400 });
  }
  // Soft delete: marca como inativo em vez de remover
  const sb = getDatabase();
  const { error } = await sb.from("usuarios").update({ ativo: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await revogarTodasSessoes(id);
  await registrarAudit("excluir", "usuarios", id);
  return NextResponse.json({ ok: true });
}
