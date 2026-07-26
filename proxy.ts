import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  temPermissao,
  validarSessaoToken,
} from "@/lib/db/auth";
import { verificarSessaoPais } from "@/lib/db/pais-session";
import { getDatabase } from "@/lib/db/postgres";
import { podeGerenciarAlunos } from "@/lib/access-control";
import {
  MODULO_POR_ROTA,
  podeAcessarFicha,
  rotaSomenteDiretor,
} from "@/lib/navigation-access";

const ROTAS_PROTEGIDAS = [
  "/cockpit",
  "/financeiro",
  "/vendas",
  "/nota-fiscal",
  "/pedagogico",
  "/alunos",
  "/kanban",
  "/biblioteca",
  "/bercario",
  "/frequencia",
  "/calendario",
  "/cardapio",
  "/mural",
  "/reservas",
  "/transporte",
  "/estoque",
  "/patrimonio",
  "/rh",
  "/crm",
  "/relatorios",
  "/configuracoes",
  "/lgpd",
  "/whatsapp",
  "/boletim",
  "/ficha",
  "/extrato",
  "/saude",
  "/recados",
  "/super-admin",
];

const API_PUBLICAS = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/pais/login",
  "/api/auth/pais/logout",
  "/api/whatsapp/webhook",
  "/api/health",
]);

const API_SOMENTE_DIRETOR = [
  "/api/admin",
  "/api/audit-logs",
  "/api/escola",
  "/api/exportar",
  "/api/lgpd",
  "/api/usuarios",
];

const MODULOS_API: Array<[string, string]> = [
  ["/api/notas-fiscais", "nota-fiscal"],
  ["/api/biblioteca-emprestimos", "biblioteca"],
  ["/api/biblioteca-livros", "biblioteca"],
  ["/api/bercario-registros", "bercario"],
  ["/api/bercario-bebes", "bercario"],
  ["/api/mural-posts", "mural"],
  ["/api/intercorrencias", "saude"],
  ["/api/mensalidades", "financeiro"],
  ["/api/funcionarios", "rh"],
  ["/api/professores", "alunos"],
  ["/api/conversas", "whatsapp"],
  ["/api/avaliacoes", "pedagogico"],
  ["/api/upload/foto-aluno", "alunos"],
  ["/api/uploads", "alunos"],
  ["/api/transporte", "transporte"],
  ["/api/patrimonio", "patrimonio"],
  ["/api/frequencia", "frequencia"],
  ["/api/cardapio", "cardapio"],
  ["/api/reservas", "reservas"],
  ["/api/despesas", "financeiro"],
  ["/api/estoque", "estoque"],
  ["/api/eventos", "calendario"],
  ["/api/recados", "recados"],
  ["/api/kanban", "kanban"],
  ["/api/turmas", "alunos"],
  ["/api/alunos", "alunos"],
  ["/api/vendas", "vendas"],
  ["/api/crm", "crm"],
];

function podeAcessarApi(
  pathname: string,
  perfil: Parameters<typeof temPermissao>[0],
  method: string
): boolean {
  if (pathname === "/api/admin/modulos" && method === "GET") return true;
  if (pathname === "/api/escola" && method === "GET") return true;
  if (pathInicia(pathname, API_SOMENTE_DIRETOR)) return perfil === "diretor";
  const somenteLeitura = method === "GET" || method === "HEAD" || method === "OPTIONS";
  if (
    !somenteLeitura &&
    pathInicia(pathname, ["/api/alunos", "/api/turmas", "/api/upload/foto-aluno"])
  ) {
    return podeGerenciarAlunos(perfil);
  }
  const modulo = moduloDaApi(pathname);
  return !modulo || temPermissao(perfil, modulo);
}

function moduloDaApi(pathname: string): string | null {
  return MODULOS_API.find(([prefixo]) => pathInicia(pathname, [prefixo]))?.[1] ?? null;
}

async function moduloEstaAtivo(modulo: string): Promise<boolean> {
  const { data, error } = await getDatabase()
    .from("modulos_config")
    .select("ativo")
    .eq("id", modulo)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível verificar o módulo ${modulo}`);
  // Instalações antigas podem ainda não ter o catálogo completo. A ausência de
  // configuração não deve derrubar uma funcionalidade que nunca foi desligada.
  return data ? Boolean(data.ativo) : true;
}

function podeAcessarPagina(pathname: string, perfil: Parameters<typeof temPermissao>[0]): boolean {
  if (rotaSomenteDiretor(pathname)) return perfil === "diretor";
  if (
    pathname.startsWith("/alunos/") &&
    !podeGerenciarAlunos(perfil)
  ) return false;
  const rota = ROTAS_PROTEGIDAS.find((prefixo) =>
    pathInicia(pathname, [prefixo])
  );
  if (rota === "/ficha" && !podeAcessarFicha(perfil)) return false;
  const modulo = rota ? MODULO_POR_ROTA[rota] ?? rota.slice(1) : null;
  return !modulo || temPermissao(perfil, modulo);
}

function pathInicia(pathname: string, prefixos: string[]): boolean {
  return prefixos.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
}

function apiPublica(req: NextRequest): boolean {
  if (API_PUBLICAS.has(req.nextUrl.pathname)) return true;
  if (req.nextUrl.pathname === "/api/solicitacoes-demo" && req.method === "POST") {
    return true;
  }
  return req.nextUrl.pathname === "/api/lgpd/solicitacao" && req.method === "POST";
}

function origemPermitida(req: NextRequest): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  return origin === req.nextUrl.origin;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (apiPublica(req)) return NextResponse.next();
    if (!origemPermitida(req)) {
      return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
    }

    if (pathname.startsWith("/api/pais/")) {
      if (process.env.ENABLE_PARENT_PORTAL !== "true") {
        return NextResponse.json({ error: "Portal dos responsáveis indisponível" }, { status: 503 });
      }
      const sessaoPais = req.cookies.get("pais_session")?.value;
      if (sessaoPais && verificarSessaoPais(sessaoPais)) return NextResponse.next();
      return NextResponse.json(
        { error: "Acesso restrito ao portal dos pais" },
        { status: 401 }
      );
    }

    try {
      const usuario = await validarSessaoToken(
        req.cookies.get(SESSION_COOKIE_NAME)?.value
      );
      if (usuario && podeAcessarApi(pathname, usuario.perfil, req.method)) {
        const modulo = moduloDaApi(pathname);
        if (modulo && !(await moduloEstaAtivo(modulo))) {
          return NextResponse.json({ error: "Módulo desativado" }, { status: 403 });
        }
        return NextResponse.next();
      }
      if (usuario) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    } catch (error) {
      console.error("[proxy] validação de sessão falhou", error);
      return NextResponse.json({ error: "Serviço temporariamente indisponível" }, { status: 503 });
    }
  }

  if (!pathInicia(pathname, ROTAS_PROTEGIDAS)) return NextResponse.next();

  try {
    const usuario = await validarSessaoToken(
      req.cookies.get(SESSION_COOKIE_NAME)?.value
    );
    if (usuario && podeAcessarPagina(pathname, usuario.perfil)) {
      const rota = ROTAS_PROTEGIDAS.find((prefixo) => pathInicia(pathname, [prefixo]));
      const modulo = rota ? MODULO_POR_ROTA[rota] ?? rota.slice(1) : null;
      if (modulo && !(await moduloEstaAtivo(modulo))) {
        return new NextResponse("Módulo desativado", { status: 403 });
      }
      return NextResponse.next();
    }
    if (usuario) return new NextResponse("Sem permissão", { status: 403 });
  } catch (error) {
    console.error("[proxy] validação de página falhou", error);
    return new NextResponse("Serviço temporariamente indisponível", { status: 503 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("voltar", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
