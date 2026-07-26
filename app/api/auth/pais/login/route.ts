import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/postgres";
import { seedAlunos } from "@/lib/db/seed";
import { assinarSessaoPais } from "@/lib/db/pais-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normaliza(s: string): string {
  return s.replace(/\D/g, "");
}

export async function POST(req: Request) {
  if (process.env.ENABLE_PARENT_PORTAL !== "true") {
    return NextResponse.json(
      { error: "Portal dos responsáveis temporariamente indisponível" },
      { status: 503 }
    );
  }
  const { email, cpf } = (await req.json()) as { email?: string; cpf?: string };
  if (!email || !cpf) {
    return NextResponse.json({ error: "Email e CPF são obrigatórios" }, { status: 400 });
  }
  await seedAlunos();
  const sb = getDatabase();
  const { data: alunos, error } = await sb.from("alunos").select("id, nome, turma_id, responsaveis_json");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emailLower = email.trim().toLowerCase();
  const cpfNorm = normaliza(cpf);

  interface RespJsonItem { email?: string; cpf?: string; nome?: string }
  type AlunoRow = { id: string; nome: string; turma_id: string; responsaveis_json: RespJsonItem[] | null };

  const alunosTipados = (alunos ?? []) as AlunoRow[];
  const vinculados = alunosTipados.filter((a) => {
    const resps = Array.isArray(a.responsaveis_json) ? a.responsaveis_json : [];
    return resps.some((r) => {
      const rEmail = (r.email ?? "").trim().toLowerCase();
      const rCpf = normaliza(r.cpf ?? "");
      return rEmail === emailLower && rCpf === cpfNorm;
    });
  });

  if (vinculados.length === 0) {
    return NextResponse.json(
      { error: "Email e CPF não conferem. Confirme com a secretaria." },
      { status: 401 }
    );
  }

  const primeiroAluno = vinculados[0] as AlunoRow;
  const resps = Array.isArray(primeiroAluno.responsaveis_json)
    ? primeiroAluno.responsaveis_json
    : [];
  const respDados = resps.find(
    (r) =>
      (r.email ?? "").trim().toLowerCase() === emailLower &&
      normaliza(r.cpf ?? "") === cpfNorm
  );

  const sessaoAssinada = assinarSessaoPais({ email: emailLower, cpf: cpfNorm });

  const res = NextResponse.json({
    ok: true,
    nome: respDados?.nome ?? "Responsável",
    alunos: vinculados.map((a) => ({ id: a.id, nome: a.nome })),
  });
  res.cookies.set("pais_session", sessaoAssinada, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
