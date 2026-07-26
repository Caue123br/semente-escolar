import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NovaConversaInput {
  responsavelNome: string;
  responsavelTelefone: string;
  responsavelEmail?: string;
  alunoId?: string;
  alunoNome?: string;
  prioridade?: "baixa" | "normal" | "alta" | "urgente";
  tags?: string[];
}

function normalizaTelefone(s: string): string {
  return s.replace(/\D/g, "");
}

export async function GET(req: Request) {
  const u = await getUsuarioLogado();
  if (!u) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const sb = getDatabase();
  const url = new URL(req.url);
  const filtroStatus = url.searchParams.get("status");
  const filtroAtendente = url.searchParams.get("atendente");

  let query = sb.from("conversas").select("*").order("ultima_mensagem_em", { ascending: false, nullsFirst: false });

  // Permissões: diretor vê tudo. Outros veem suas + não atribuídas.
  if (u && u.perfil !== "diretor") {
    query = query.eqOrNull("atendente_id", u.id);
  }

  if (filtroStatus) query = query.eq("status", filtroStatus);
  if (filtroAtendente) {
    if (filtroAtendente === "nao_atribuidas") query = query.is("atendente_id", null);
    else query = query.eq("atendente_id", filtroAtendente);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: (data ?? []).map((c) => ({
      id: String(c.id),
      responsavelNome: String(c.responsavel_nome),
      responsavelTelefone: String(c.responsavel_telefone),
      responsavelEmail: c.responsavel_email ? String(c.responsavel_email) : null,
      alunoId: c.aluno_id ? String(c.aluno_id) : null,
      alunoNome: c.aluno_nome ? String(c.aluno_nome) : null,
      atendenteId: c.atendente_id ? String(c.atendente_id) : null,
      atendenteNome: c.atendente_nome ? String(c.atendente_nome) : null,
      status: String(c.status),
      prioridade: String(c.prioridade),
      tags: Array.isArray(c.tags) ? c.tags : [],
      ultimaMensagem: c.ultima_mensagem ? String(c.ultima_mensagem) : null,
      ultimaMensagemEm: c.ultima_mensagem_em ? String(c.ultima_mensagem_em) : null,
      ultimaMensagemDirecao: c.ultima_mensagem_direcao ? String(c.ultima_mensagem_direcao) : null,
      naoLidasCount: Number(c.nao_lidas_count ?? 0),
      createdAt: c.created_at ? String(c.created_at) : null,
    })),
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as NovaConversaInput;
  if (!body.responsavelNome || !body.responsavelTelefone) {
    return NextResponse.json({ error: "Nome e telefone obrigatórios" }, { status: 400 });
  }
  const sb = getDatabase();
  const telefoneNorm = normalizaTelefone(body.responsavelTelefone);
  if (telefoneNorm.length < 8 || telefoneNorm.length > 15) {
    return NextResponse.json({ error: "Telefone deve ter entre 8 e 15 dígitos" }, { status: 400 });
  }

  // Procura conversa existente com mesmo telefone
  const { data: existente, error: erroConsulta } = await sb
    .from("conversas")
    .select("id")
    .eq("responsavel_telefone", telefoneNorm)
    .maybeSingle();
  if (erroConsulta) {
    return NextResponse.json({ error: "Não foi possível consultar a conversa" }, { status: 500 });
  }

  if (existente?.id) {
    return NextResponse.json({ ok: true, id: String(existente.id), existente: true });
  }

  const id = `c-${randomUUID()}`;
  const { error } = await sb.from("conversas").insert({
    id,
    responsavel_nome: body.responsavelNome,
    responsavel_telefone: telefoneNorm,
    responsavel_email: body.responsavelEmail ?? null,
    aluno_id: body.alunoId ?? null,
    aluno_nome: body.alunoNome ?? null,
    prioridade: body.prioridade ?? "normal",
    tags: body.tags ?? [],
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await registrarAudit("criar", "conversas", id, { telefone: telefoneNorm });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
