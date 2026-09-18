import { NextResponse } from "next/server";
import { objetoSimples } from "@/lib/api-input";
import { erroAPI, erros } from "@/lib/db/api-response";
import { getDatabase } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { registrarAudit } from "@/lib/db/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
  nome: "nome",
  cargo: "cargo",
  cpf: "cpf",
  email: "email",
  telefone: "telefone",
  admissao: "admissao",
  salarioBruto: "salario_bruto",
  vinculo: "vinculo",
  status: "status",
};

/** CPF e salário são folha de pagamento: só o diretor lê e só o diretor grava. */
const CAMPOS_FOLHA = ["cpf", "salarioBruto"];

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  // Desligar funcionário é mudança de status (PATCH). Tirar a ficha da lista é
  // decisão da direção, porque leva a folha de pagamento junto.
  if (usuario.perfil !== "diretor") return erros.semPermissao("excluir funcionário");
  const sb = getDatabase();
  const { data, error } = await sb
    .from("funcionarios")
    .update({ deleted_at: new Date().toISOString(), deleted_by: usuario.id })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  await registrarAudit("excluir", "funcionarios", id, undefined, usuario);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!objetoSimples(body)) return erros.dadosInvalidos("corpo da requisição");
  const patch = body;

  // GET /api/funcionarios devolve CPF e salário redigidos para quem não é
  // diretor, e a tela de RH regrava a ficha inteira ao salvar. Ignorar esses
  // dois campos aqui é o que impede uma edição da coordenação de gravar
  // cpf = '' e salário = 0 por cima do valor real.
  const ehDiretor = usuario.perfil === "diretor";
  const update: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(patch)) {
    const coluna = MAPA[campo];
    if (!coluna || valor === undefined) continue;
    if (!ehDiretor && CAMPOS_FOLHA.includes(campo)) continue;
    update[coluna] = valor;
  }
  if (patch.turmasAtuacao !== undefined) update.turmas_atuacao_json = patch.turmasAtuacao;
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });
  const sb = getDatabase();
  const { data, error } = await sb
    .from("funcionarios")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  // funcionarios_cpf_unique (migration 0007) só vale entre fichas não
  // excluídas: trocar o CPF por um que já está em uso cai aqui, e sem esta
  // linha a tela recebia o texto cru do Postgres em um 500.
  if (error?.code === "23505") {
    return erroAPI(
      "Já existe um funcionário ativo com este CPF. Confira o CPF digitado ou procure o colaborador no quadro de pessoal.",
      409
    );
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  await registrarAudit("editar", "funcionarios", id, { campos: Object.keys(update) }, usuario);
  return NextResponse.json({ ok: true });
}
