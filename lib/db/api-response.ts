import { NextResponse } from "next/server";

/**
 * Resposta de erro padronizada — mantém mensagem amigável pro usuário
 * e loga detalhes técnicos no server (sem vazar pro client).
 */
export function erroAPI(
  mensagemUsuario: string,
  status: number = 500,
  detalheTecnico?: unknown
): NextResponse {
  if (detalheTecnico && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(`[API erro ${status}] ${mensagemUsuario}`, detalheTecnico);
  }
  return NextResponse.json(
    {
      error: mensagemUsuario,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export const erros = {
  naoAutenticado: () => erroAPI("Sessão expirou. Faça login de novo.", 401),
  semPermissao: (acao = "essa ação") => erroAPI(`Sem permissão para ${acao}.`, 403),
  naoEncontrado: (entidade = "Item") => erroAPI(`${entidade} não encontrado.`, 404),
  dadosInvalidos: (campo?: string) =>
    erroAPI(campo ? `Dados inválidos: ${campo}` : "Dados inválidos.", 400),
  jaExiste: (campo = "Item") => erroAPI(`${campo} já existe.`, 409),
  servidorIndisponivel: (detalhe?: unknown) =>
    erroAPI("Erro interno do servidor. Tente em alguns segundos.", 500, detalhe),
  rateLimit: (resetIn?: number) =>
    NextResponse.json(
      {
        error: "Muitas tentativas. Espere alguns segundos.",
        resetIn,
      },
      { status: 429 }
    ),
};

export function sucesso<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status });
}
