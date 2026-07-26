import { NextResponse } from "next/server";
import { getDatabase, type DatabaseTable } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";
import { erros } from "@/lib/db/api-response";
import { formatDateLocalISO } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABELAS: readonly DatabaseTable[] = [
  "escolas",
  "turmas",
  "alunos",
  "responsaveis",
  "mensalidades",
  "despesas",
  "vendas",
  "estoque",
  "avaliacoes",
  "eventos",
  "funcionarios",
  "mural_posts",
  "frequencia",
  "notas_fiscais",
  "kanban_cards",
  "biblioteca_livros",
  "biblioteca_emprestimos",
  "bercario_bebes",
  "bercario_registros",
  "cardapio_semana",
  "reservas",
  "transporte_rotas",
  "patrimonio",
  "crm_leads",
  "solicitacoes_demo",
  "conversas",
  "mensagens",
  "intercorrencias",
  "recados",
  "lgpd_solicitacoes",
  "modulos_config",
];

export async function GET() {
  const u = await getUsuarioLogado();
  if (u?.perfil !== "diretor") {
    return NextResponse.json(
      { error: "Apenas a diretora pode exportar dados sensíveis." },
      { status: 403 }
    );
  }
  const sb = getDatabase();
  const exportacao: Record<string, unknown[]> = {};

  for (const tabela of TABELAS) {
    const query = sb.from(tabela).select("*");
    if (tabela === "escolas") query.eq("id", u.escolaId);
    const { data, error } = await query;
    if (error) {
      return erros.servidorIndisponivel({ tabela, code: error.code });
    }
    exportacao[tabela] = data ?? [];
  }

  await registrarAudit("exportar", "sistema", undefined, {
    tabelas: TABELAS.length,
    totalRegistros: Object.values(exportacao).reduce((a, b) => a + b.length, 0),
  });

  const json = JSON.stringify(
    {
      exportadoEm: new Date().toISOString(),
      tipo: "exportacao_operacional",
      versao: "1.1",
      aviso:
        "Esta exportação não substitui o backup do PostgreSQL e dos arquivos privados da infraestrutura.",
      escopo:
        "Tabelas operacionais da escola; não inclui credenciais, sessões, logs de auditoria nem arquivos enviados.",
      dados: exportacao,
    },
    null,
    2
  );

  const data = formatDateLocalISO();
  return new NextResponse(json, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="escola-modelo-exportacao-operacional-${data}.json"`,
      "cache-control": "no-store",
    },
  });
}
