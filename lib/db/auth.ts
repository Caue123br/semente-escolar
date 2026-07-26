import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { isIP } from "node:net";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { getDatabase, getPostgresPool } from "./postgres";
import { MODULOS_POR_PERFIL, podeAcessarModulo } from "@/lib/access-control";

export type Perfil = "diretor" | "coordenador" | "professor" | "financeiro";

export interface Usuario {
  id: string;
  escolaId: string;
  email: string;
  nome: string;
  perfil: Perfil;
  ativo: boolean;
  authVersion: number;
  sessaoId?: string;
}

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-semente_session" : "semente_session";

const PERFIS = new Set<Perfil>(["diretor", "coordenador", "professor", "financeiro"]);

function sessionHours(): number {
  const configured = Number(process.env.SESSION_TTL_HOURS ?? 12);
  if (!Number.isFinite(configured)) return 12;
  return Math.min(Math.max(Math.trunc(configured), 1), 24 * 7);
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function schoolId(): string {
  return process.env.SCHOOL_ID ?? "default";
}

function perfilValido(value: unknown): Perfil | null {
  return typeof value === "string" && PERFIS.has(value as Perfil) ? (value as Perfil) : null;
}

function usuarioFromRow(row: Record<string, unknown>): Usuario | null {
  const perfil = perfilValido(row.perfil);
  if (!perfil) return null;
  return {
    id: String(row.id),
    escolaId: String(row.escola_id),
    email: String(row.email),
    nome: String(row.nome),
    perfil,
    ativo: Boolean(row.ativo),
    authVersion: Number(row.auth_version),
    sessaoId: row.sessao_id ? String(row.sessao_id) : undefined,
  };
}

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12);
}

export async function checarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export async function buscarUsuarioPorEmail(
  email: string
): Promise<(Usuario & { senhaHash: string }) | null> {
  const db = getDatabase();
  const { data, error } = await db
    .from("usuarios")
    .select("id, escola_id, email, nome, perfil, ativo, auth_version, senha_hash")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) throw new Error("Falha ao consultar usuário");
  if (!data) return null;
  const usuario = usuarioFromRow(data);
  if (!usuario) return null;
  return { ...usuario, senhaHash: String(data.senha_hash) };
}

export async function criarSessao(
  usuario: Usuario,
  requestInfo?: { ip?: string | null; userAgent?: string | null }
): Promise<{ token: string; maxAge: number }> {
  const token = randomBytes(32).toString("base64url");
  const maxAge = sessionHours() * 60 * 60;
  const ip = requestInfo?.ip && isIP(requestInfo.ip) ? requestInfo.ip : null;
  const userAgent = requestInfo?.userAgent?.slice(0, 500) ?? null;

  await getPostgresPool().query(
    `INSERT INTO iam.sessoes
      (id, escola_id, usuario_id, token_hash, auth_version, expires_at, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, NOW() + ($6 * INTERVAL '1 second'), $7, $8)`,
    [
      randomUUID(),
      usuario.escolaId,
      usuario.id,
      tokenHash(token),
      usuario.authVersion,
      maxAge,
      ip,
      userAgent,
    ]
  );

  return { token, maxAge };
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function validarSessaoToken(token: string | undefined): Promise<Usuario | null> {
  if (!token || token.length < 32 || token.length > 128) return null;

  const { rows } = await getPostgresPool().query(
    `SELECT
       u.id, u.escola_id, u.email, u.nome, u.perfil, u.ativo, u.auth_version,
       s.id AS sessao_id
     FROM iam.sessoes s
     JOIN iam.usuarios u
       ON u.escola_id = s.escola_id AND u.id = s.usuario_id
     WHERE s.escola_id = $1
       AND s.token_hash = $2
       AND s.revoked_at IS NULL
       AND s.expires_at > NOW()
       AND u.ativo = TRUE
       AND u.auth_version = s.auth_version
     LIMIT 1`,
    [schoolId(), tokenHash(token)]
  );

  const usuario = rows[0] ? usuarioFromRow(rows[0]) : null;
  if (!usuario?.sessaoId) return null;

  void getPostgresPool()
    .query(
      `UPDATE iam.sessoes
       SET last_seen_at = NOW()
       WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '5 minutes')`,
      [usuario.sessaoId]
    )
    .catch((error) => console.error("[auth] last_seen falhou", error));

  return usuario;
}

export async function getUsuarioLogado(): Promise<Usuario | null> {
  const cookieStore = await cookies();
  return validarSessaoToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function revogarSessaoToken(token: string | undefined): Promise<void> {
  if (!token || token.length < 32 || token.length > 128) return;
  await getPostgresPool().query(
    `UPDATE iam.sessoes
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE escola_id = $1 AND token_hash = $2`,
    [schoolId(), tokenHash(token)]
  );
}

export async function revogarTodasSessoes(usuarioId: string): Promise<void> {
  await getPostgresPool().query(
    `UPDATE iam.sessoes
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE escola_id = $1 AND usuario_id = $2`,
    [schoolId(), usuarioId]
  );
}

export const PERMISSOES = MODULOS_POR_PERFIL;

export function temPermissao(perfil: Perfil, modulo: string): boolean {
  return podeAcessarModulo(perfil, modulo);
}
