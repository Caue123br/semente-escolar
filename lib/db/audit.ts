import { headers } from "next/headers";
import { getDatabase } from "./postgres";
import { getUsuarioLogado, type Usuario } from "./auth";

export async function registrarAudit(
  acao: "criar" | "editar" | "excluir" | "login" | "logout" | "exportar" | "outros",
  entidade: string,
  registroId?: string,
  detalhes?: Record<string, unknown>,
  ator?: Pick<Usuario, "id" | "nome" | "email">
): Promise<void> {
  try {
    const u = ator ?? (await getUsuarioLogado());
    const h = await headers();
    const sb = getDatabase();
    const { error } = await sb.from("audit_logs").insert({
      id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      usuario_id: u?.id ?? null,
      usuario_nome: u?.nome ?? "Sistema",
      usuario_email: u?.email ?? null,
      acao,
      entidade,
      registro_id: registroId ?? null,
      detalhes: detalhes ?? null,
      ip: h.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
      user_agent: h.get("user-agent") ?? null,
    });
    if (error) console.warn("[audit] persistência falhou", error);
  } catch (e) {
    // Audit log é fire-and-forget. Não derruba a request.
    console.warn("[audit]", e);
  }
}
