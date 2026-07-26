import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const turmaId = url.searchParams.get("turmaId");
  const alunoId = url.searchParams.get("alunoId");
  const tipo = url.searchParams.get("tipo");
  const sb = getDatabase();
  let query = sb.from("recados").select("*").order("pinado", { ascending: false }).order("enviado_em", { ascending: false });
  if (turmaId) query = query.eq("turma_id", turmaId);
  if (alunoId) query = query.eq("aluno_id", alunoId);
  if (tipo) query = query.eq("tipo", tipo);
  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    items: (data ?? []).map((r) => ({
      id: String(r.id),
      autorNome: String(r.autor_nome),
      autorCargo: r.autor_cargo ? String(r.autor_cargo) : null,
      turmaId: r.turma_id ? String(r.turma_id) : null,
      alunoId: r.aluno_id ? String(r.aluno_id) : null,
      tipo: String(r.tipo),
      titulo: String(r.titulo),
      mensagem: String(r.mensagem),
      dataLimite: r.data_limite ? String(r.data_limite) : null,
      anexoUrl: r.anexo_url ? String(r.anexo_url) : null,
      urgente: Boolean(r.urgente),
      pinado: Boolean(r.pinado),
      // `enviado_em` é um nome legado da coluna; hoje representa apenas o
      // momento do registro interno, pois o portal ainda não publica recados.
      registradoEm: r.enviado_em ? String(r.enviado_em) : null,
    })),
  });
}

interface RecadoInput {
  turmaId?: string;
  alunoId?: string;
  tipo: "recado" | "licao_de_casa" | "comunicado" | "evento" | "lembrete";
  titulo: string;
  mensagem: string;
  dataLimite?: string;
  urgente?: boolean;
  pinado?: boolean;
}

export async function POST(req: Request) {
  const body = (await req.json()) as RecadoInput;
  if (!body.tipo || !body.titulo || !body.mensagem) {
    return NextResponse.json({ error: "Tipo, título e mensagem são obrigatórios" }, { status: 400 });
  }
  const u = await getUsuarioLogado();
  const id = `rc-${Date.now()}`;
  const sb = getDatabase();
  const { error } = await sb.from("recados").insert({
    id,
    autor_id: u?.id ?? null,
    autor_nome: u?.nome ?? "Sistema",
    autor_cargo: u?.perfil ?? null,
    turma_id: body.turmaId ?? null,
    aluno_id: body.alunoId ?? null,
    tipo: body.tipo,
    titulo: body.titulo,
    mensagem: body.mensagem,
    data_limite: body.dataLimite ?? null,
    urgente: body.urgente ?? false,
    pinado: body.pinado ?? false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await registrarAudit("criar", "recados", id, { tipo: body.tipo, turmaId: body.turmaId });
  return NextResponse.json({
    ok: true,
    id,
    publicadoNoPortal: false,
    notificacaoEnviada: false,
  }, { status: 201 });
}
