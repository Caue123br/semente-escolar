// Autorização de borda. Este proxy decide por MÓDULO (MODULOS_API para as APIs,
// MODULO_POR_ROTA para as páginas) e, em poucos casos, por método de escrita.
// Ele não sabe de quem é o dado: aluno, turma e responsável têm dono, e o
// recorte por turma ou por vínculo com o responsável precisa ser checado dentro
// do próprio handler/página (resolverEscopoProfessor de lib/db/professor-scope).
// Passar por aqui significa "este perfil usa este módulo", nunca "este perfil
// pode ver este aluno".
import { NextRequest, NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  temPermissao,
  validarSessaoToken,
} from "@/lib/db/auth";
import { verificarSessaoPais } from "@/lib/db/pais-session";
import { getDatabase } from "@/lib/db/postgres";
import {
  podeGerenciarAlunos,
  podeLerCadastroDeAlunos,
  podeVerFinanceiroDoAluno,
} from "@/lib/access-control";
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
  "/contrato",
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
  ["/api/cobrancas", "financeiro"],
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
    pathInicia(pathname, [
      "/api/alunos",
      "/api/turmas",
      "/api/upload/foto-aluno",
      // Cadastro de bebê é cadastro de criança, como o de aluno; os registros
      // do dia (/api/bercario-registros) seguem abertos a quem cuida da turma.
      "/api/bercario-bebes",
    ])
  ) {
    return podeGerenciarAlunos(perfil);
  }
  // O financeiro entra aqui porque cobra: precisa da turma e do responsável
  // financeiro. Ele NÃO recebe a ficha inteira — GET /api/alunos projeta para
  // esse perfil um recorte (id, nome, turma, matrícula, status e o responsável
  // financeiro). Esta liberação e essa projeção andam juntas: sem ela o
  // financeiro passa a ver CPF/RG, endereço e ficha de saúde da criança.
  if (somenteLeitura && pathInicia(pathname, ["/api/alunos", "/api/turmas"])) {
    return podeLerCadastroDeAlunos(perfil);
  }
  // A ficha financeira do aluno é parte da matrícula: a coordenação monta o
  // plano de pagamento e registra o recebimento — ou seja, ler a ficha, gerar
  // as cobranças do plano e dar baixa numa cobrança. Fora disso continua sendo
  // do módulo financeiro: DELETE apaga a linha de verdade (não é exclusão
  // reversível) e POST /api/cobrancas cria cobrança que não entra no espelho de
  // mensalidades. Mensalidades a coordenação só lê.
  const cobrancaDaMatricula =
    (somenteLeitura && pathInicia(pathname, ["/api/cobrancas"])) ||
    (method === "POST" && pathname === "/api/cobrancas/gerar") ||
    (method === "PATCH" && pathname.startsWith("/api/cobrancas/"));
  if (cobrancaDaMatricula) {
    return podeVerFinanceiroDoAluno(perfil);
  }
  if (somenteLeitura && pathInicia(pathname, ["/api/mensalidades"])) {
    return podeVerFinanceiroDoAluno(perfil);
  }
  const modulo = moduloDaApi(pathname);
  return !modulo || temPermissao(perfil, modulo);
}

function moduloDaApi(pathname: string): string | null {
  return MODULOS_API.find(([prefixo]) => pathInicia(pathname, [prefixo]))?.[1] ?? null;
}

// Toda requisição passa por aqui e o pool tem poucas conexões: sem cache, ler
// modulos_config a cada chamada derruba o app numa rajada. Janela curta para
// ligar/desligar módulo continuar valendo quase na hora. A sessão fica de fora
// de propósito — revogação de acesso tem que valer no mesmo instante.
const MODULOS_CACHE_MS = 30_000;
// O que dói no cache não é o desligamento (o módulo fica no ar um pouco mais),
// é o LIGAMENTO: a diretora ativa em /configuracoes, a tela de configuração já
// mostra ligado (o GET de /api/admin/modulos não passa por aqui) e a página do
// módulo segue respondendo "Módulo desativado" — lê como botão que não
// funcionou. Módulo desligado recebe pouca requisição, então reconsultar com
// janela curta não pesa no pool.
// TODO(auditoria): trocar a janela por invalidação explícita. Exportar
// `invalidarCacheModulos(modulo)` de um módulo server-only (NÃO de
// lib/access-control.ts, que é importado por client component e levaria estado
// de servidor para o bundle) e chamá-lo no PATCH de
// app/api/admin/modulos/route.ts, logo depois do registrarAudit.
const MODULOS_CACHE_DESATIVADO_MS = 3_000;
const cacheModulos = new Map<string, { ativo: boolean; expiraEm: number }>();

async function moduloEstaAtivo(modulo: string): Promise<boolean> {
  const agora = Date.now();
  const emCache = cacheModulos.get(modulo);
  if (emCache && emCache.expiraEm > agora) return emCache.ativo;

  const { data, error } = await getDatabase()
    .from("modulos_config")
    .select("ativo")
    .eq("id", modulo)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível verificar o módulo ${modulo}`);
  // Instalações antigas podem ainda não ter o catálogo completo. A ausência de
  // configuração não deve derrubar uma funcionalidade que nunca foi desligada.
  const ativo = data ? Boolean(data.ativo) : true;
  cacheModulos.set(modulo, {
    ativo,
    expiraEm: agora + (ativo ? MODULOS_CACHE_MS : MODULOS_CACHE_DESATIVADO_MS),
  });
  return ativo;
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
  // Ficha e contrato expõem o mesmo conjunto: CPF/RG dos responsáveis,
  // endereço, saúde e plano financeiro. Mesma trava para os dois.
  if ((rota === "/ficha" || rota === "/contrato") && !podeAcessarFicha(perfil)) {
    return false;
  }
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
  // Atrás de um reverse proxy (nginx) o app recebe a requisição em HTTP, então
  // req.nextUrl.origin pode ser http:// enquanto o navegador envia Origin https://.
  // Comparar o host (mesma-origem por host) evita falso "Origem não permitida"
  // sem enfraquecer a proteção CSRF. O Host chega via proxy_set_header Host $host.
  try {
    const originHost = new URL(origin).host;
    const hostEsperado =
      req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
    return originHost === hostEsperado;
  } catch {
    return false;
  }
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
