import { NextResponse } from "next/server";
import { getDatabase, getPostgresPool } from "@/lib/db/postgres";
import { getUsuarioLogado } from "@/lib/db/auth";
import { diffAudit, registrarAudit } from "@/lib/db/audit";
import { erroAPI, erros } from "@/lib/db/api-response";
import { limparCPF, validarCPF } from "@/lib/cpf";
import { formatDateLocalISO } from "@/lib/utils";
import { normalizarPessoasAutorizadas, PERIODOS_MATRICULA } from "@/lib/periodos-matricula";
import {
  professorPodeAcessarAluno,
  professorPodeAcessarTurma,
  resolverEscopoProfessor,
} from "@/lib/db/professor-scope";
import type { Responsavel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAPA: Record<string, string> = {
  nome: "nome",
  dataNascimento: "data_nascimento",
  cpf: "cpf",
  rg: "rg",
  turmaId: "turma_id",
  periodo: "periodo",
  bilingue: "bilingue",
  matricula: "matricula",
  dataMatricula: "data_matricula",
  status: "status",
  observacoes: "observacoes",
  foto: "foto",
  // Ficha completa Escola Modelo
  ra: "ra",
  raca: "raca",
  sexo: "sexo",
  naturalDe: "natural_de",
  estado: "estado",
  cep: "cep",
  endereco: "endereco",
  numeroResidencia: "numero_residencia",
  bairro: "bairro",
  telefoneAluno: "telefone_aluno",
  religiao: "religiao",
  escolaAnteriorNome: "escola_anterior_nome",
  escolaAnteriorTempo: "escola_anterior_tempo",
  // Plano financeiro
  matriculaTaxa: "matricula_taxa",
  matriculaForma: "matricula_forma",
  matriculaModalidade: "matricula_modalidade",
  matriculaParcelas: "matricula_parcelas",
  mensalidadeValor: "mensalidade_valor",
  mensalidadePeriodicidade: "mensalidade_periodicidade",
  diaVencimento: "dia_vencimento",
};

// Texto opcional: em branco grava NULL, senão o campo vazio ocupa índice único
// (CPF, RA, matrícula) e some da busca por "não preenchido".
const CAMPOS_TEXTO: readonly string[] = [
  "rg",
  "matricula",
  "observacoes",
  "foto",
  "ra",
  "raca",
  "naturalDe",
  "estado",
  "cep",
  "endereco",
  "bairro",
  "telefoneAluno",
  "religiao",
  "escolaAnteriorNome",
  "escolaAnteriorTempo",
  "matriculaForma",
];

const STATUS_VALIDOS: readonly string[] = ["Ativo", "Inativo", "Trancado"];

const OPCOES: Record<string, { lista: readonly string[]; mensagem: string }> = {
  periodo: {
    lista: PERIODOS_MATRICULA.map((periodo) => periodo.valor),
    mensagem: "Escolha um período válido para a matrícula.",
  },
  sexo: { lista: ["M", "F"], mensagem: "Escolha o sexo: masculino ou feminino." },
  matriculaModalidade: {
    lista: ["avista", "parcelado"],
    mensagem: "Escolha como a matrícula será paga: à vista ou parcelada.",
  },
  mensalidadePeriodicidade: {
    lista: ["mensal", "anual"],
    mensagem: "Escolha a periodicidade da mensalidade: mensal ou anual.",
  },
};

const NUMEROS: Record<
  string,
  { min: number; max: number; inteiro?: boolean; mensagem: string }
> = {
  matriculaTaxa: {
    min: 0,
    max: 1_000_000,
    mensagem: "A taxa de matrícula precisa ser um valor igual ou maior que zero.",
  },
  mensalidadeValor: {
    min: 0,
    max: 1_000_000,
    mensagem: "O valor da mensalidade precisa ser igual ou maior que zero.",
  },
  matriculaParcelas: {
    min: 1,
    max: 48,
    inteiro: true,
    mensagem: "O número de parcelas precisa ser de 1 a 48.",
  },
  diaVencimento: {
    min: 1,
    max: 28,
    inteiro: true,
    mensagem: "O dia de vencimento precisa ser um número de 1 a 28.",
  },
};

function dataISOValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function textoOuNulo(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  return limpo === "" ? null : limpo;
}

type ResponsaveisNormalizados =
  | { ok: true; lista: Responsavel[] }
  | { ok: false; mensagem: string };

/**
 * Mesmas regras do cadastro (POST /api/alunos): `responsaveis_json` não tem
 * constraint no banco, então contato da família e responsável financeiro único
 * são garantidos aqui.
 */
function normalizarResponsaveis(valor: unknown): ResponsaveisNormalizados {
  const recebidos = Array.isArray(valor) ? (valor as Responsavel[]) : [];
  const comNome = recebidos.filter(
    (r) => r && typeof r === "object" && typeof r.nome === "string" && r.nome.trim().length >= 2
  );
  if (comNome.length === 0) {
    return {
      ok: false,
      mensagem: "Cadastre ao menos um responsável com nome e telefone ou e-mail.",
    };
  }
  const temContato = comNome.some(
    (r) =>
      (typeof r.telefone === "string" && r.telefone.trim() !== "") ||
      (typeof r.email === "string" && r.email.trim() !== "")
  );
  if (!temContato) {
    return {
      ok: false,
      mensagem: "Informe telefone ou e-mail de um responsável — é o contato da família.",
    };
  }

  const financeiros = comNome.filter((r) => r.responsavelFinanceiro === true);
  if (financeiros.length > 1) {
    return {
      ok: false,
      mensagem: "Marque só um responsável financeiro — é quem vai receber as cobranças.",
    };
  }
  let financeiro = financeiros[0];
  if (!financeiro) {
    const principais = comNome.filter((r) => r.principal === true);
    if (principais.length === 1) financeiro = principais[0];
    else if (comNome.length === 1) financeiro = comNome[0];
  }
  if (!financeiro) {
    return {
      ok: false,
      mensagem: "Marque qual responsável é o financeiro — é quem vai receber as cobranças.",
    };
  }

  const temPrincipal = comNome.some((r) => r.principal === true);
  return {
    ok: true,
    lista: comNome.map((r) => ({
      ...r,
      nome: r.nome.trim(),
      responsavelFinanceiro: r === financeiro,
      principal: r === financeiro && !temPrincipal ? true : Boolean(r.principal),
    })),
  };
}

// Campos da ficha do responsável que contam como mudança na lista. `principal`
// e `responsavelFinanceiro` entram como booleano porque ficha antiga guarda o
// campo ausente e o formulário manda false.
const CAMPOS_RESPONSAVEL: readonly string[] = [
  "nome",
  "parentesco",
  "cpf",
  "rg",
  "telefone",
  "email",
  "endereco",
  "profissao",
  "localTrabalho",
  "dataNascimento",
  "principal",
  "responsavelFinanceiro",
];

const FLAGS_RESPONSAVEL = new Set(["principal", "responsavelFinanceiro"]);

function assinaturaResponsaveis(valor: unknown): string {
  const lista = Array.isArray(valor) ? valor : [];
  return JSON.stringify(
    lista
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
      .map((r) =>
        CAMPOS_RESPONSAVEL.map((campo) => {
          const conteudo = r[campo];
          if (FLAGS_RESPONSAVEL.has(campo)) return conteudo === true;
          return typeof conteudo === "string" ? conteudo.trim() : "";
        })
      )
  );
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  const sb = getDatabase();
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!(await professorPodeAcessarAluno(escopo, id))) {
      return erros.semPermissao("excluir um aluno fora das suas turmas");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data: atual, error: erroAtual } = await sb
    .from("alunos")
    .select("id, nome, matricula, turma_id, status")
    .eq("id", id)
    .maybeSingle();
  if (erroAtual) return erros.servidorIndisponivel(erroAtual);
  if (!atual) return erros.naoEncontrado("Aluno");

  const excluidoEm = new Date().toISOString();
  const { data, error } = await sb
    .from("alunos")
    .update({ deleted_at: excluidoEm, deleted_by: usuario.id })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return erros.servidorIndisponivel(error);
  if (!data) return erros.naoEncontrado("Aluno");
  // O registro do aluno continua no banco (exclusão reversível): a auditoria
  // precisa dizer quem tirou da lista, quando e qual criança era.
  await registrarAudit(
    "excluir",
    "alunos",
    id,
    {
      nome: atual.nome,
      matricula: atual.matricula,
      turmaId: atual.turma_id,
      status: atual.status,
      excluidoEm,
    },
    usuario
  );
  return NextResponse.json({ ok: true, restauravel: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();
  let patch: Record<string, unknown>;
  try {
    patch = (await req.json()) as Record<string, unknown>;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return erros.dadosInvalidos("corpo da requisição");
  }
  const sb = getDatabase();

  // Desfazer exclusão: o aluno excluído não aparece nas consultas normais, por
  // isso a restauração é feita direto no banco e só pelo diretor.
  if (patch.restaurar === true) {
    if (usuario.perfil !== "diretor") {
      return erros.semPermissao("restaurar um aluno excluído");
    }
    try {
      const { rows } = await getPostgresPool().query<{ nome: string; turma_id: string }>(
        `UPDATE app.alunos
            SET deleted_at = NULL, deleted_by = NULL
          WHERE escola_id = $1 AND id = $2 AND deleted_at IS NOT NULL
          RETURNING nome, turma_id`,
        [process.env.SCHOOL_ID ?? "default", id]
      );
      const restaurado = rows[0];
      if (!restaurado) {
        return erroAPI("Este aluno não está na lista de excluídos. Atualize a página.", 404);
      }
      await registrarAudit(
        "editar",
        "alunos",
        id,
        { operacao: "restaurar", nome: restaurado.nome, turmaId: restaurado.turma_id },
        usuario
      );
      return NextResponse.json({ ok: true, restaurado: true });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        return erroAPI(
          "Outro aluno já usa o mesmo CPF, RA ou matrícula desta ficha. Ajuste o outro cadastro antes de restaurar.",
          409
        );
      }
      return erros.servidorIndisponivel(error);
    }
  }

  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (!(await professorPodeAcessarAluno(escopo, id))) {
      return erros.semPermissao("editar um aluno fora das suas turmas");
    }
    if (
      patch.turmaId !== undefined &&
      !professorPodeAcessarTurma(
        escopo,
        typeof patch.turmaId === "string" ? patch.turmaId.trim() : ""
      )
    ) {
      return erros.semPermissao("mover um aluno para uma turma não atribuída ao seu usuário");
    }
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }

  const { data: atual, error: erroAtual } = await sb
    .from("alunos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (erroAtual) return erros.servidorIndisponivel(erroAtual);
  if (!atual) return erros.naoEncontrado("Aluno");

  const hoje = formatDateLocalISO();
  const update: Record<string, unknown> = {};

  for (const [campo, valor] of Object.entries(patch)) {
    const coluna = MAPA[campo];
    if (!coluna) continue;

    if (campo === "nome") {
      const nome = typeof valor === "string" ? valor.trim() : "";
      if (nome.length < 2 || nome.length > 200) {
        return erroAPI("Informe o nome do aluno — entre 2 e 200 letras.", 400);
      }
      update.nome = nome;
      continue;
    }
    if (campo === "dataNascimento" || campo === "dataMatricula") {
      const data = typeof valor === "string" ? valor.trim() : "";
      const rotulo = campo === "dataNascimento" ? "de nascimento" : "da matrícula";
      if (!dataISOValida(data)) {
        return erroAPI(`Preencha a data ${rotulo} no formato dia/mês/ano.`, 400);
      }
      if (data > hoje) {
        return erroAPI(`A data ${rotulo} não pode ser uma data futura.`, 400);
      }
      update[coluna] = data;
      continue;
    }
    if (campo === "turmaId") {
      const turmaId = typeof valor === "string" ? valor.trim() : "";
      if (!turmaId) return erroAPI("Selecione a turma do aluno.", 400);
      update.turma_id = turmaId;
      continue;
    }
    if (campo === "cpf") {
      // A criação grava só dígitos; a edição precisa gravar igual, senão o
      // mesmo CPF entra duas vezes e o índice único não segura.
      if (valor === null || (typeof valor === "string" && valor.trim() === "")) {
        update.cpf = null;
        continue;
      }
      const cpf = typeof valor === "string" ? limparCPF(valor) : "";
      if (!validarCPF(cpf)) {
        return erroAPI("O CPF informado não é válido. Confira os números.", 400);
      }
      update.cpf = cpf;
      continue;
    }
    if (campo === "bilingue") {
      if (typeof valor !== "boolean") {
        return erroAPI("Marque ou desmarque o programa bilíngue.", 400);
      }
      update.bilingue = valor;
      continue;
    }
    if (campo === "status") {
      if (typeof valor !== "string" || !STATUS_VALIDOS.includes(valor)) {
        return erroAPI("Escolha a situação do aluno: Ativo, Inativo ou Trancado.", 400);
      }
      update.status = valor;
      continue;
    }
    if (campo === "numeroResidencia") {
      if (valor !== null && typeof valor !== "string") {
        return erros.dadosInvalidos("número da residência");
      }
      const numeroResidencia = textoOuNulo(valor);
      if (numeroResidencia !== null && numeroResidencia.length > 30) {
        return erroAPI("O número da residência deve ter até 30 caracteres.", 400);
      }
      update[coluna] = numeroResidencia;
      continue;
    }
    const opcoes = OPCOES[campo];
    if (opcoes) {
      if (valor === null || valor === "") {
        update[coluna] = null;
        continue;
      }
      if (typeof valor !== "string" || !opcoes.lista.includes(valor)) {
        return erroAPI(opcoes.mensagem, 400);
      }
      update[coluna] = valor;
      continue;
    }
    const numero = NUMEROS[campo];
    if (numero) {
      if (valor === null || valor === "") {
        update[coluna] = null;
        continue;
      }
      const convertido = typeof valor === "number" ? valor : Number(valor);
      if (
        !Number.isFinite(convertido) ||
        convertido < numero.min ||
        convertido > numero.max ||
        (numero.inteiro && !Number.isInteger(convertido))
      ) {
        return erroAPI(numero.mensagem, 400);
      }
      update[coluna] = convertido;
      continue;
    }
    if (CAMPOS_TEXTO.includes(campo)) {
      if (valor !== null && valor !== undefined && typeof valor !== "string") {
        return erroAPI("Dados inválidos: confira os campos preenchidos.", 400);
      }
      update[coluna] = textoOuNulo(valor);
      continue;
    }
  }

  const nascimento = String(update.data_nascimento ?? atual.data_nascimento ?? "");
  const matriculaEm = update.data_matricula ?? atual.data_matricula;
  if (typeof matriculaEm === "string" && nascimento && matriculaEm < nascimento) {
    return erroAPI("A data da matrícula não pode ser anterior ao nascimento da criança.", 400);
  }

  if (patch.responsaveis !== undefined) {
    if (!Array.isArray(patch.responsaveis)) return erros.dadosInvalidos("responsáveis");
    const gravados = Array.isArray(atual.responsaveis_json) ? atual.responsaveis_json : [];
    // A tela de edição manda a lista inteira mesmo quando ninguém mexeu nela.
    // Sem comparar, uma ficha antiga sem responsável (ou com responsável sem
    // telefone e sem e-mail) ficaria impossível de editar — nem um typo no nome
    // do aluno passaria.
    const mudouLista =
      assinaturaResponsaveis(patch.responsaveis) !== assinaturaResponsaveis(gravados);
    if (mudouLista) {
      const vaiZerar = !patch.responsaveis.some(
        (r) =>
          r &&
          typeof r === "object" &&
          typeof (r as Responsavel).nome === "string" &&
          (r as Responsavel).nome.trim() !== ""
      );
      if (gravados.length > 0 && vaiZerar) {
        return erroAPI(
          "Este aluno já tem responsável cadastrado. Cadastre o novo responsável antes de remover o atual — a ficha não pode ficar sem contato da família.",
          422
        );
      }
      const responsaveis = normalizarResponsaveis(patch.responsaveis);
      if (!responsaveis.ok) {
        return erroAPI(
          `${responsaveis.mensagem} As outras alterações desta ficha não foram gravadas.`,
          400
        );
      }
      update.responsaveis_json = responsaveis.lista;
    }
  }
  if (patch.pessoasAutorizadas !== undefined) {
    const autorizadas = normalizarPessoasAutorizadas(patch.pessoasAutorizadas);
    if (!autorizadas.ok) return erroAPI(autorizadas.mensagem, 400);
    update.pessoas_autorizadas_json = autorizadas.lista;
  }
  if (patch.fichaSaude !== undefined) {
    if (
      patch.fichaSaude !== null &&
      (typeof patch.fichaSaude !== "object" || Array.isArray(patch.fichaSaude))
    ) {
      return erros.dadosInvalidos("ficha de saúde");
    }
    update.ficha_saude_json = patch.fichaSaude;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

  if (update.turma_id !== undefined && update.turma_id !== atual.turma_id) {
    const turmaDestino = String(update.turma_id);
    const { data: turma, error: erroTurma } = await sb
      .from("turmas")
      .select("id, nome, capacidade")
      .eq("id", turmaDestino)
      .maybeSingle();
    if (erroTurma) return erros.servidorIndisponivel(erroTurma);
    if (!turma) return erroAPI("A turma selecionada não existe mais. Atualize a página.", 422);

    // Capacidade 0 é turma fechada, não turma sem limite (coluna NOT NULL com
    // default 25): o aluno só entra com confirmação da direção.
    const capacidade = Number(turma.capacidade ?? 0);
    const statusFinal = String(update.status ?? atual.status ?? "Ativo");
    if (
      patch.confirmarLotacao !== true &&
      Number.isFinite(capacidade) &&
      capacidade >= 0 &&
      statusFinal === "Ativo"
    ) {
      const { count, error: erroOcupacao } = await sb
        .from("alunos")
        .select("id", { count: "exact", head: true })
        .eq("turma_id", turmaDestino)
        .eq("status", "Ativo");
      if (erroOcupacao) return erros.servidorIndisponivel(erroOcupacao);
      const ocupacao = count ?? 0;
      if (ocupacao >= capacidade) {
        return NextResponse.json(
          {
            error:
              capacidade === 0
                ? `A turma ${turma.nome} está com 0 vagas e não aceita aluno. Escolha outra turma ou defina a capacidade dela em Turmas.`
                : `A turma ${turma.nome} já tem ${ocupacao} de ${capacidade} vagas ocupadas. Escolha outra turma ou aumente a capacidade dela em Turmas.`,
            codigo: "lotacao",
            ocupacao,
            capacidade,
            turmaNome: String(turma.nome),
          },
          { status: 422 }
        );
      }
    }
  }

  const { data: salvo, error } = await sb
    .from("alunos")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return erroAPI("Já existe outro aluno com o mesmo CPF, RA ou matrícula.", 409);
    }
    if (error.code === "23503") {
      return erroAPI("A turma selecionada não existe mais. Atualize a página.", 422);
    }
    if (["22007", "22P02", "23502", "23514"].includes(error.code ?? "")) {
      return erros.dadosInvalidos("confira os campos preenchidos");
    }
    return erros.servidorIndisponivel(error);
  }
  if (!salvo) return erros.naoEncontrado("Aluno");

  const antes: Record<string, unknown> = {};
  for (const coluna of Object.keys(update)) antes[coluna] = atual[coluna] ?? null;
  await registrarAudit("editar", "alunos", id, diffAudit(antes, update), usuario);
  return NextResponse.json({ ok: true });
}
