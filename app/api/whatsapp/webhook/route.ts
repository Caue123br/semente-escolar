import { randomUUID, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/db/postgres";
import { registrarAudit } from "@/lib/db/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook genérico pra integração com Twilio / Evolution / Z-API.
 *
 * Quando configurar uma dessas integrações, aponte o webhook delas pra:
 *   POST https://SEU-DOMINIO/api/whatsapp/webhook
 *
 * Espera body JSON:
 * {
 *   "from": "5511912345678",     // telefone com DDI/DDD (só números)
 *   "name": "Mariana Almeida",    // (opcional) nome do contato
 *   "text": "Oi, recebi o boleto" // texto da mensagem
 * }
 *
 * Cria conversa (se não existir) e adiciona mensagem como "entrada".
 *
 * Validação: header `x-webhook-secret` deve conferir com WHATSAPP_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });
  }
  const headerSecret = req.headers.get("x-webhook-secret") ?? "";
  const expected = Buffer.from(secret);
  const received = Buffer.from(headerSecret);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: "Webhook unauthorized" }, { status: 401 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 64 * 1024) {
    return NextResponse.json({ error: "Body muito grande" }, { status: 413 });
  }

  let body: { from?: string; name?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido (esperado JSON)" }, { status: 400 });
  }

  const tel = (body.from ?? "").replace(/\D/g, "");
  const texto = (body.text ?? "").trim();
  if (tel.length < 8 || tel.length > 15 || !texto || texto.length > 5_000) {
    return NextResponse.json({ error: "Campos obrigatórios: from, text" }, { status: 400 });
  }

  const escolaId = process.env.SCHOOL_ID ?? "default";
  const conversaIdNovo = `c-${randomUUID()}`;
  const mensagemId = `m-${randomUUID()}`;
  const nome = (body.name?.trim() || `Contato ${tel.slice(-4)}`).slice(0, 200);
  const client = await getPostgresPool().connect();

  try {
    await client.query("BEGIN");
    const conversaResult = await client.query<{ id: string }>(
      `INSERT INTO app.conversas
        (escola_id, id, responsavel_nome, responsavel_telefone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (escola_id, responsavel_telefone)
       DO UPDATE SET responsavel_nome = COALESCE(NULLIF(EXCLUDED.responsavel_nome, ''), app.conversas.responsavel_nome)
       RETURNING id`,
      [escolaId, conversaIdNovo, nome, tel]
    );
    const conversaId = conversaResult.rows[0].id;

    await client.query(
      `INSERT INTO app.mensagens
        (escola_id, id, conversa_id, direcao, texto, status)
       VALUES ($1, $2, $3, 'entrada', $4, 'enviada')`,
      [escolaId, mensagemId, conversaId, texto]
    );
    await client.query(
      `UPDATE app.conversas
       SET ultima_mensagem = $3,
           ultima_mensagem_em = NOW(),
           ultima_mensagem_direcao = 'entrada',
           nao_lidas_count = nao_lidas_count + 1,
           status = 'aberta',
           updated_at = NOW()
       WHERE escola_id = $1 AND id = $2`,
      [escolaId, conversaId, texto.slice(0, 200)]
    );
    await client.query("COMMIT");

    await registrarAudit("criar", "mensagens", mensagemId, {
      webhook: true,
      conversaId,
    });
    return NextResponse.json({ ok: true, conversaId, mensagemId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[whatsapp-webhook] persistência falhou", error);
    return NextResponse.json({ error: "Não foi possível processar a mensagem" }, { status: 500 });
  } finally {
    client.release();
  }
}

// GET pra verificar saúde do webhook (útil pra Twilio testing)
export async function GET() {
  return NextResponse.json({
    ok: true,
    webhook: "whatsapp",
    info: "Envie POST { from, name?, text } pra criar conversa + mensagem",
  });
}
