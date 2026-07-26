import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NovaMensagemInput {
  texto: string;
  direcao: "entrada" | "saida";
  midiaUrl?: string;
  midiaTipo?: string;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = getDatabase();
  const { data, error } = await sb
    .from("mensagens")
    .select("*")
    .eq("conversa_id", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    items: (data ?? []).map((m) => ({
      id: String(m.id),
      direcao: String(m.direcao),
      texto: String(m.texto),
      atendenteId: m.atendente_id ? String(m.atendente_id) : null,
      atendenteNome: m.atendente_nome ? String(m.atendente_nome) : null,
      status: String(m.status),
      midiaUrl: m.midia_url ? String(m.midia_url) : null,
      midiaTipo: m.midia_tipo ? String(m.midia_tipo) : null,
      lidaEm: m.lida_em ? String(m.lida_em) : null,
      createdAt: m.created_at ? String(m.created_at) : null,
    })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as NovaMensagemInput;
  if (!body.texto?.trim() || !body.direcao) {
    return NextResponse.json({ error: "Texto e direção obrigatórios" }, { status: 400 });
  }

  const sb = getDatabase();
  const u = await getUsuarioLogado();

  // Confere se a conversa existe
  const { data: conv } = await sb.from("conversas").select("id, nao_lidas_count").eq("id", id).maybeSingle();
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

  const msgId = `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const insertMsg: Record<string, unknown> = {
    id: msgId,
    conversa_id: id,
    direcao: body.direcao,
    texto: body.texto,
    // Saídas criadas nesta rota são registros internos. Sem um provedor
    // outbound, nunca devemos marcá-las como enviadas ou entregues.
    status: body.direcao === "saida" ? "rascunho" : "enviada",
    midia_url: body.midiaUrl ?? null,
    midia_tipo: body.midiaTipo ?? null,
  };

  if (body.direcao === "saida" && u) {
    insertMsg.atendente_id = u.id;
    insertMsg.atendente_nome = u.nome;
  }

  const { error } = await sb.from("mensagens").insert(insertMsg);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Atualiza última mensagem na conversa
  const updateConv: Record<string, unknown> = {
    ultima_mensagem: body.texto.slice(0, 200),
    ultima_mensagem_em: new Date().toISOString(),
    ultima_mensagem_direcao: body.direcao,
    updated_at: new Date().toISOString(),
  };

  if (body.direcao === "entrada") {
    // Incrementa contador de não-lidas
    updateConv.nao_lidas_count = (Number(conv.nao_lidas_count) || 0) + 1;
    updateConv.status = "aberta";
  } else {
    // Saída: zera não-lidas + auto-atribui ao atendente que respondeu (se não tinha atendente)
    updateConv.nao_lidas_count = 0;
    updateConv.status = "em_andamento";
    if (u) {
      // Garante que o atendente fica atribuído à conversa
      const { data: convAtu } = await sb.from("conversas").select("atendente_id").eq("id", id).maybeSingle();
      if (!convAtu?.atendente_id) {
        updateConv.atendente_id = u.id;
        updateConv.atendente_nome = u.nome;
      }
    }
  }

  await sb.from("conversas").update(updateConv).eq("id", id);
  await registrarAudit("criar", "mensagens", msgId, { conversaId: id, direcao: body.direcao });
  return NextResponse.json({
    ok: true,
    id: msgId,
    status: body.direcao === "saida" ? "rascunho" : "enviada",
    enviadoPorProvedor: false,
  }, { status: 201 });
}
