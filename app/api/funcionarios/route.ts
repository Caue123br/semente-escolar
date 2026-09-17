import { NextResponse } from "next/server";
import { getDatabase, getPostgresPool } from "@/lib/db/postgres";
import { erroAPI, erros } from "@/lib/db/api-response";
import { getUsuarioLogado } from "@/lib/db/auth";
import { rowToFuncionario } from "@/lib/db/mappers";
import { seedFuncionarios } from "@/lib/db/seed";
import type { Funcionario } from "@/lib/mock-data/rh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  await seedFuncionarios();
  const sb = getDatabase();
  const { data, error } = await sb.from("funcionarios").select("*").order("nome", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const items = (data ?? []).map(rowToFuncionario);
  if (usuario.perfil === "diretor") return NextResponse.json({ items });
  // CPF e salário são folha de pagamento: só o diretor recebe. Os outros
  // perfis recebem os campos redigidos, como /api/alunos já faz com o CPF.
  // A tela de RH regrava a ficha inteira ao salvar: o POST abaixo e o PATCH de
  // [id]/route.ts ignoram esses dois campos para quem não é diretor, senão a
  // primeira edição da coordenação gravaria o valor redigido por cima do real.
  return NextResponse.json({
    items: items.map((f) => ({ ...f, cpf: "", salarioBruto: 0 })),
    camposRestritos: ["cpf", "salarioBruto"],
  });
}

export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  let f: Funcionario;
  try {
    f = (await req.json()) as Funcionario;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!f || typeof f !== "object" || Array.isArray(f)) return erros.dadosInvalidos("funcionário");
  if (typeof f.id !== "string" || !f.id.trim()) return erros.dadosInvalidos("identificador");
  if (typeof f.nome !== "string" || !f.nome.trim()) return erros.dadosInvalidos("nome");

  const ehDiretor = usuario.perfil === "diretor";
  const sb = getDatabase();
  // undefined = chave ausente no upsert: cleanRecord a descarta, a coluna fica
  // fora do ON CONFLICT DO UPDATE e o valor gravado é preservado. Trocar por
  // null aqui apagaria CPF/salário de quem já está cadastrado.
  let cpf: string | null | undefined = f.cpf;
  let salarioBruto: number | null | undefined = f.salarioBruto;

  // Consulta crua de propósito: a chave primária é (escola_id, id) e o upsert
  // conflita nela mesmo quando a ficha está excluída, mas o query builder força
  // `deleted_at IS NULL` e esconderia justamente essa linha. Sem enxergá-la, um
  // POST com o id de uma ficha excluída cairia no caminho de cadastro novo,
  // sobrescreveria CPF e salário dela e não limparia deleted_at: a ficha
  // seguiria fora das listas, com a folha adulterada.
  let linhaAtual: { deleted_at: unknown } | null = null;
  try {
    const { rows } = await getPostgresPool().query<{ deleted_at: unknown }>(
      `SELECT deleted_at FROM app.funcionarios WHERE escola_id = $1 AND id = $2`,
      [process.env.SCHOOL_ID ?? "default", f.id]
    );
    linhaAtual = rows[0] ?? null;
  } catch (erroConsulta) {
    return erros.servidorIndisponivel(erroConsulta);
  }
  if (linhaAtual && linhaAtual.deleted_at != null) {
    return erroAPI(
      "Este identificador já pertence a uma ficha de funcionário excluída. Cadastre o colaborador pela tela de RH, que gera um identificador novo.",
      409
    );
  }
  // Quem não vê CPF/salário recebe os campos redigidos no GET: gravar o que
  // volta do formulário apagaria os valores reais. Num cadastro novo o
  // formulário é a única fonte, então aí os campos passam.
  if (!ehDiretor && linhaAtual) {
    cpf = undefined;
    salarioBruto = undefined;
  }

  const { error } = await sb.from("funcionarios").upsert({
    id: f.id,
    nome: f.nome,
    cargo: f.cargo,
    cpf,
    email: f.email,
    telefone: f.telefone,
    admissao: f.admissao,
    salario_bruto: salarioBruto,
    vinculo: f.vinculo,
    status: f.status,
    turmas_atuacao_json: f.turmasAtuacao ?? null,
  });
  // O conflito de id já é resolvido pelo ON CONFLICT do upsert, então o único
  // índice único que sobra aqui é funcionarios_cpf_unique (CPF de funcionário
  // não excluído, migration 0007). Sem esta linha a tela recebia o texto cru do
  // Postgres em um 500.
  if (error?.code === "23505") {
    return erroAPI(
      "Já existe um funcionário ativo com este CPF. Confira o CPF digitado ou procure o colaborador no quadro de pessoal.",
      409
    );
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const item = ehDiretor
    ? { ...f, cpf: cpf ?? "", salarioBruto: salarioBruto ?? 0 }
    : { ...f, cpf: "", salarioBruto: 0 };
  return NextResponse.json({ ok: true, item }, { status: 201 });
}
