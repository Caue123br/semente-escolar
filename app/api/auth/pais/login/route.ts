import { NextResponse } from "next/server";
import { isIP } from "node:net";
import { limparCPF } from "@/lib/cpf";
import { getDatabase } from "@/lib/db/postgres";
import { seedAlunos } from "@/lib/db/seed";
import {
  assinarSessaoPais,
  PAIS_SESSION_COOKIE,
  paisSessionCookieOptions,
} from "@/lib/db/pais-session";
import {
  esperaLegivel,
  registrarFalhaLogin,
  registrarSucessoLogin,
  verificarBloqueioConta,
  verificarLimiteIpLogin,
} from "@/lib/db/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Uma única mensagem para qualquer recusa de credencial: dizer "esse email
// existe, mas está sem CPF" viraria consulta de cadastro pra quem tenta.
const RECUSA =
  "Email e CPF não conferem com o cadastro. Se o seu CPF não foi informado na matrícula, procure a secretaria da escola para atualizar o cadastro.";

function clientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;
  const forwarded = req.headers.get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .at(-1);
  return forwarded && isIP(forwarded) ? forwarded : "unknown";
}

export async function POST(req: Request) {
  if (process.env.ENABLE_PARENT_PORTAL !== "true") {
    return NextResponse.json(
      { error: "Portal dos responsáveis temporariamente indisponível" },
      { status: 503 }
    );
  }

  // Login das famílias é só email+CPF (sem senha). O limite por IP é folgado
  // (uma família inteira pode sair do mesmo lugar) e o que segura tentativa de
  // adivinhar CPF é o bloqueio progressivo por email e origem.
  const ip = clientIp(req);
  const limiteIp = verificarLimiteIpLogin("pais-login", ip);
  if (!limiteIp.ok) {
    return NextResponse.json(
      { error: `Muitas tentativas vindas desta rede. Tente novamente em ${esperaLegivel(limiteIp.resetIn)}.` },
      { status: 429 }
    );
  }

  let email: string | undefined;
  let cpf: string | undefined;
  try {
    ({ email, cpf } = (await req.json()) as { email?: string; cpf?: string });
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }
  if (!email || !cpf) {
    return NextResponse.json({ error: "Email e CPF são obrigatórios" }, { status: 400 });
  }

  const emailLower = email.trim().toLowerCase();
  const cpfNorm = limparCPF(cpf);
  if (cpfNorm.length !== 11) {
    return NextResponse.json(
      { error: "Informe o CPF completo do responsável, com os 11 números." },
      { status: 400 }
    );
  }
  // Aqui não se valida dígito verificador: quem confere é o cadastro. CPF
  // digitado errado na matrícula é um cadastro para a secretaria arrumar, e
  // recusar por dígito deixaria a família sem acesso e sem saída. O que fecha
  // o furo do responsável sem CPF é a exigência dos 11 números dos dois lados,
  // no predicado `confere` abaixo.

  const bloqueio = verificarBloqueioConta("pais-login", emailLower, ip);
  if (!bloqueio.ok) {
    return NextResponse.json(
      {
        error: `Por segurança, o acesso com este email está bloqueado por ${esperaLegivel(bloqueio.resetIn)} depois de várias tentativas desta rede. Espere esse tempo ou fale com a secretaria.`,
      },
      { status: 429 }
    );
  }

  await seedAlunos();
  const sb = getDatabase();
  const { data: alunos, error } = await sb.from("alunos").select("id, nome, turma_id, responsaveis_json");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  interface RespJsonItem { email?: string; cpf?: string; nome?: string }
  type AlunoRow = { id: string; nome: string; turma_id: string; responsaveis_json: RespJsonItem[] | null };

  // Responsável cadastrado sem CPF não casa com ninguém: exigir os 11 números
  // dos dois lados impede que um CPF sem dígito ("-") vire string vazia e
  // acerte o cadastro de quem só tem o nome preenchido.
  const confere = (r: RespJsonItem): boolean => {
    const rCpf = limparCPF(r.cpf ?? "");
    return (r.email ?? "").trim().toLowerCase() === emailLower
      && rCpf.length === 11
      && rCpf === cpfNorm;
  };

  const alunosTipados = (alunos ?? []) as AlunoRow[];
  const vinculados = alunosTipados.filter((a) =>
    (Array.isArray(a.responsaveis_json) ? a.responsaveis_json : []).some(confere)
  );

  if (vinculados.length === 0) {
    registrarFalhaLogin("pais-login", emailLower, ip);
    return NextResponse.json({ error: RECUSA }, { status: 401 });
  }
  registrarSucessoLogin("pais-login", emailLower, ip);

  const primeiroAluno = vinculados[0] as AlunoRow;
  const resps = Array.isArray(primeiroAluno.responsaveis_json)
    ? primeiroAluno.responsaveis_json
    : [];
  const respDados = resps.find(confere);

  const sessaoAssinada = assinarSessaoPais({ email: emailLower, cpf: cpfNorm });

  const res = NextResponse.json({
    ok: true,
    nome: respDados?.nome ?? "Responsável",
    alunos: vinculados.map((a) => ({ id: a.id, nome: a.nome })),
  });
  res.cookies.set(PAIS_SESSION_COOKIE, sessaoAssinada, paisSessionCookieOptions());
  return res;
}
