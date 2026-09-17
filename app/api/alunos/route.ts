import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase, getPostgresPool } from "@/lib/db/postgres";
import { rowToAluno } from "@/lib/db/mappers";
import { seedAlunos } from "@/lib/db/seed";
import { registrarAudit } from "@/lib/db/audit";
import { getUsuarioLogado } from "@/lib/db/auth";
import { erroAPI, erros, sucesso } from "@/lib/db/api-response";
import { limparCPF, validarCPF } from "@/lib/cpf";
import { resolverEscopoProfessor } from "@/lib/db/professor-scope";
import { formatDateLocalISO } from "@/lib/utils";
import type { Aluno, Responsavel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CorpoMatricula = Partial<Aluno> & {
  confirmarDuplicata?: boolean;
  confirmarLotacao?: boolean;
};

function dataISOValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

/**
 * Comparação de nomes só para procurar matrícula repetida: ignora acento,
 * caixa e espaço sobrando, porque o resultado é um pedido de confirmação e não
 * um bloqueio.
 */
function chaveNome(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

/**
 * Idempotência sem tabela nova: o id do aluno é derivado da chave que o cliente
 * gera ao abrir o formulário. Um retry depois de queda de internet colide na
 * chave primária (escola_id, id) em vez de criar uma segunda matrícula.
 */
function idDaChaveIdempotencia(chave: string): string {
  const escolaId = process.env.SCHOOL_ID ?? "default";
  const hash = createHash("sha256").update(`${escolaId}:${chave}`).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}

type ResponsaveisNormalizados =
  | { ok: true; lista: Responsavel[] }
  | { ok: false; mensagem: string };

/**
 * `responsaveis_json` não tem constraint no banco, então as regras da ficha
 * (contato da família e um único responsável financeiro) valem aqui.
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
    // Fichas antigas e o formulário atual podem marcar só o contato principal.
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

/**
 * Quem recebe a cobrança. Ficha antiga pode não ter a marca de financeiro: cai
 * no contato principal e, por último, no primeiro responsável cadastrado.
 */
function responsavelDaCobranca(lista: Responsavel[] | undefined): Responsavel | undefined {
  const responsaveis = lista ?? [];
  return (
    responsaveis.find((r) => r.responsavelFinanceiro === true) ??
    responsaveis.find((r) => r.principal === true) ??
    responsaveis[0]
  );
}

type LinhaAluno = Record<string, unknown>;

/**
 * Consulta crua de propósito: a chave primária é (escola_id, id) e não ignora
 * exclusão, mas o query builder força `deleted_at IS NULL`. Sem isto a ficha
 * excluída fica invisível aqui e o INSERT estoura na chave primária, virando
 * um "CPF repetido" que não existe.
 */
async function linhaDoIdDerivado(id: string): Promise<LinhaAluno | null> {
  const { rows } = await getPostgresPool().query<LinhaAluno>(
    `SELECT * FROM app.alunos WHERE escola_id = $1 AND id = $2`,
    [process.env.SCHOOL_ID ?? "default", id]
  );
  return rows[0] ?? null;
}

/**
 * Campos que a secretaria digita e este POST grava. Ficam de fora: a matrícula
 * (gerada aqui), o plano financeiro (que este POST não grava), a foto e a data
 * da matrícula — a data vira "hoje" quando o formulário não preenche, então
 * acusaria divergência num rascunho retomado no dia seguinte.
 */
const CAMPOS_DA_FICHA: readonly (keyof Aluno)[] = [
  "dataNascimento",
  "rg",
  "turmaId",
  "observacoes",
  "ra",
  "raca",
  "sexo",
  "naturalDe",
  "estado",
  "cep",
  "endereco",
  "bairro",
  "telefoneAluno",
  "religiao",
  "escolaAnteriorNome",
  "escolaAnteriorTempo",
];

// `principal` e `responsavelFinanceiro` não entram: a gravação reescreve os
// dois (normalizarResponsaveis), então nunca voltam iguais ao que foi enviado.
const CAMPOS_DO_RESPONSAVEL: readonly string[] = [
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
];

function textoDaFicha(valor: unknown): string {
  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  return "";
}

/**
 * Serialização estável: o jsonb devolve as chaves em outra ordem e o formulário
 * manda campos vazios que o banco às vezes não guarda, então `JSON.stringify`
 * direto acusaria diferença em retry honesto.
 */
function jsonDaFicha(valor: unknown, nivel = 0): string {
  if (nivel > 6) return "";
  if (Array.isArray(valor)) return `[${valor.map((i) => jsonDaFicha(i, nivel + 1)).join(",")}]`;
  if (valor && typeof valor === "object") {
    return `{${Object.entries(valor as Record<string, unknown>)
      .filter(([, conteudo]) => conteudo !== undefined && conteudo !== null && conteudo !== "")
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([chave, conteudo]) => `${chave}:${jsonDaFicha(conteudo, nivel + 1)}`)
      .join(",")}}`;
  }
  return textoDaFicha(valor);
}

function responsaveisDaFicha(valor: unknown): string {
  const lista = Array.isArray(valor) ? valor : [];
  return jsonDaFicha(
    lista
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object")
      // Mesmo corte da gravação: responsável sem nome utilizável não é gravado.
      .filter((r) => textoDaFicha(r.nome).length >= 2)
      .map((r) =>
        CAMPOS_DO_RESPONSAVEL.map((campo) =>
          campo === "cpf" ? limparCPF(textoDaFicha(r[campo])) : textoDaFicha(r[campo])
        )
      )
  );
}

/**
 * Assinatura do conteúdo da ficha: serve para dizer se o corpo que chegou agora
 * é o mesmo que está gravado. Comparar só nome e nascimento deixava passar
 * calada uma correção de CPF, RG, endereço, responsável ou ficha de saúde.
 */
function assinaturaDaFicha(ficha: Partial<Aluno>): string {
  const partes: string[] = [
    chaveNome(textoDaFicha(ficha.nome)),
    limparCPF(textoDaFicha(ficha.cpf)),
    ficha.bilingue === true ? "1" : "0",
  ];
  for (const campo of CAMPOS_DA_FICHA) partes.push(textoDaFicha(ficha[campo]));
  partes.push(responsaveisDaFicha(ficha.responsaveis));
  partes.push(jsonDaFicha(ficha.pessoasAutorizadas ?? []));
  partes.push(jsonDaFicha(ficha.fichaSaude ?? null));
  return JSON.stringify(partes);
}

/**
 * Chave de idempotência já usada devolve o aluno daquela chave sem gravar nada:
 * um retry em que a secretaria corrigiu um typo não pode virar segunda ficha da
 * mesma criança. Quando o corpo que chegou agora não é o que está gravado, o
 * aviso vai junto — a tela precisa dizer que a última correção não entrou, em
 * vez de anunciar "matrícula realizada".
 */
function respostaDaChaveJaUsada(linha: LinhaAluno, enviado: CorpoMatricula): NextResponse {
  if (linha.deleted_at != null) {
    return NextResponse.json(
      {
        error:
          "Esta matrícula foi salva e depois excluída. Peça à direção para restaurar a ficha, ou descarte este rascunho e comece uma matrícula nova.",
        codigo: "ficha_excluida",
      },
      { status: 409 }
    );
  }
  const item = rowToAluno(linha);
  const mesmaFicha = assinaturaDaFicha(item) === assinaturaDaFicha(enviado);
  return mesmaFicha ? sucesso({ item }) : sucesso({ item, avisoDadosDivergentes: true });
}

export async function GET(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();

  // Alunos excluídos não aparecem em nenhuma consulta normal. Sem esta lista o
  // diretor não teria como achar uma matrícula apagada por engano para mandar
  // o PATCH { restaurar: true }.
  if (new URL(req.url).searchParams.get("excluidos") === "1") {
    if (usuario.perfil !== "diretor") return erros.semPermissao("ver alunos excluídos");
    try {
      const { rows } = await getPostgresPool().query(
        `SELECT * FROM app.alunos
          WHERE escola_id = $1 AND deleted_at IS NOT NULL
          ORDER BY deleted_at DESC
          LIMIT 200`,
        [process.env.SCHOOL_ID ?? "default"]
      );
      // A lista mostra nome, CPF e responsáveis de crianças já excluídas: quem
      // consultou fica registrado como nas outras leituras sensíveis.
      await registrarAudit(
        "outros",
        "alunos",
        undefined,
        { operacao: "listar_excluidos", total: rows.length },
        usuario
      );
      return NextResponse.json({
        items: rows.map((linha) => ({
          ...rowToAluno(linha),
          excluidoEm: linha.deleted_at ?? null,
        })),
      });
    } catch (error) {
      return erros.servidorIndisponivel(error);
    }
  }

  await seedAlunos();
  const sb = getDatabase();
  let query = sb.from("alunos").select("*").order("created_at", { ascending: false });
  try {
    const escopo = await resolverEscopoProfessor(usuario);
    if (escopo.restrito) query = query.in("turma_id", escopo.turmaIds);
  } catch (error) {
    return erros.servidorIndisponivel(error);
  }
  const { data, error } = await query;
  if (error) return erros.servidorIndisponivel(error);
  const alunos = (data ?? []).map(rowToAluno);
  if (usuario.perfil === "professor") {
    return NextResponse.json({
      items: alunos.map((aluno) => ({
        id: aluno.id,
        nome: aluno.nome,
        dataNascimento: aluno.dataNascimento,
        cpf: "",
        turmaId: aluno.turmaId,
        bilingue: aluno.bilingue,
        matricula: aluno.matricula,
        dataMatricula: aluno.dataMatricula,
        status: aluno.status,
        responsaveis: [],
        foto: aluno.foto,
      })),
    });
  }
  // O financeiro usa a lista para a régua de inadimplência: precisa do aluno,
  // da turma e de quem recebe a cobrança — nada da ficha da criança.
  if (usuario.perfil === "financeiro") {
    return NextResponse.json({
      items: alunos.map((aluno) => {
        const cobranca = responsavelDaCobranca(aluno.responsaveis);
        return {
          id: aluno.id,
          nome: aluno.nome,
          turmaId: aluno.turmaId,
          matricula: aluno.matricula,
          status: aluno.status,
          responsaveis: cobranca
            ? [
                {
                  nome: cobranca.nome,
                  telefone: cobranca.telefone ?? "",
                  email: cobranca.email ?? "",
                },
              ]
            : [],
        };
      }),
    });
  }
  return NextResponse.json({ items: alunos });
}

export async function POST(req: Request) {
  const usuario = await getUsuarioLogado();
  if (!usuario) return erros.naoAutenticado();

  let a: CorpoMatricula;
  try {
    a = (await req.json()) as CorpoMatricula;
  } catch {
    return erros.dadosInvalidos("JSON inválido");
  }
  if (!a || typeof a !== "object" || Array.isArray(a)) {
    return erros.dadosInvalidos("corpo da requisição");
  }

  const nome = typeof a?.nome === "string" ? a.nome.trim() : "";
  const dataNascimento = typeof a?.dataNascimento === "string" ? a.dataNascimento : "";
  const turmaId = typeof a?.turmaId === "string" ? a.turmaId.trim() : "";
  const cpf = typeof a?.cpf === "string" ? limparCPF(a.cpf) : "";
  const hoje = formatDateLocalISO();

  // Antes de qualquer validação: chave já usada não cria nada, então o corpo do
  // retry não precisa passar pelas regras de novo. Recusar aqui devolveria a
  // secretaria ao formulário sem dizer que a ficha já está salva.
  const chave = (req.headers.get("Idempotency-Key") ?? "").trim();
  if (chave.length > 200) return erros.dadosInvalidos("identificação do formulário");
  const id = chave ? idDaChaveIdempotencia(chave) : randomUUID();
  if (chave) {
    let jaCriado: LinhaAluno | null;
    try {
      jaCriado = await linhaDoIdDerivado(id);
    } catch (error) {
      return erros.servidorIndisponivel(error);
    }
    if (jaCriado) return respostaDaChaveJaUsada(jaCriado, a);
  }

  if (nome.length < 2 || nome.length > 200) return erros.dadosInvalidos("nome completo");
  if (!dataISOValida(dataNascimento) || dataNascimento > hoje) {
    return erros.dadosInvalidos("data de nascimento");
  }
  if (!turmaId) return erros.dadosInvalidos("turma");
  if (cpf && !validarCPF(cpf)) return erros.dadosInvalidos("CPF");
  if (a.responsaveis !== undefined && !Array.isArray(a.responsaveis)) {
    return erros.dadosInvalidos("responsáveis");
  }
  if (a.pessoasAutorizadas !== undefined && !Array.isArray(a.pessoasAutorizadas)) {
    return erros.dadosInvalidos("pessoas autorizadas");
  }
  if (a.fichaSaude !== undefined && (typeof a.fichaSaude !== "object" || !a.fichaSaude)) {
    return erros.dadosInvalidos("ficha de saúde");
  }

  // Matrícula retroativa: as fichas de papel já assinadas entram com a data real.
  const dataMatricula =
    typeof a.dataMatricula === "string" && a.dataMatricula.trim() !== ""
      ? a.dataMatricula.trim()
      : hoje;
  if (!dataISOValida(dataMatricula) || dataMatricula > hoje) {
    return erroAPI("A data da matrícula precisa ser hoje ou uma data já passada.", 400);
  }
  if (dataMatricula < dataNascimento) {
    return erroAPI("A data da matrícula não pode ser anterior ao nascimento da criança.", 400);
  }

  const responsaveis = normalizarResponsaveis(a.responsaveis);
  if (!responsaveis.ok) return erroAPI(responsaveis.mensagem, 400);

  const sb = getDatabase();

  const { data: turma, error: erroTurma } = await sb
    .from("turmas")
    .select("id, nome, capacidade")
    .eq("id", turmaId)
    .maybeSingle();
  if (erroTurma) return erros.servidorIndisponivel(erroTurma);
  if (!turma) return erroAPI("A turma selecionada não existe mais. Atualize a página.", 422);

  if (a.confirmarDuplicata !== true) {
    // Consulta crua porque o query builder esconde ficha excluída — e é a ficha
    // excluída que a secretaria não tem como achar na lista de alunos: sem
    // olhar para ela, a criança que já teve matrícula ganharia uma ficha nova
    // em paralelo, com a antiga (e o histórico dela) invisível.
    let mesmaData: LinhaAluno[];
    try {
      const { rows } = await getPostgresPool().query<LinhaAluno>(
        `SELECT id, nome, data_nascimento, turma_id, matricula, deleted_at
           FROM app.alunos
          WHERE escola_id = $1 AND data_nascimento = $2`,
        [process.env.SCHOOL_ID ?? "default", dataNascimento]
      );
      mesmaData = rows;
    } catch (error) {
      return erros.servidorIndisponivel(error);
    }
    const mesmoNome = mesmaData.filter(
      (linha) => chaveNome(String(linha.nome)) === chaveNome(nome)
    );
    const candidatos = mesmoNome
      .filter((linha) => linha.deleted_at == null)
      .map((linha) => ({
        id: String(linha.id),
        nome: String(linha.nome),
        dataNascimento: String(linha.data_nascimento),
        turmaId: String(linha.turma_id),
      }));
    if (candidatos.length > 0) {
      return NextResponse.json(
        {
          error:
            "Já existe uma criança com este nome e esta data de nascimento. Confira se não é a mesma matrícula antes de continuar.",
          codigo: "duplicata",
          candidatos,
        },
        { status: 409 }
      );
    }
    const excluida = mesmoNome.find((linha) => linha.deleted_at != null);
    if (excluida) {
      // Mesmo código "duplicata" de propósito: a tela já sabe mostrar este
      // conflito e já tem a saída "é outra criança — matricular".
      const matriculaAntiga = String(excluida.matricula ?? "").trim();
      return NextResponse.json(
        {
          error: `${String(excluida.nome)} já teve matrícula nesta escola${
            matriculaAntiga ? ` (matrícula ${matriculaAntiga})` : ""
          } e a ficha está excluída — por isso não aparece na lista de alunos. Peça à direção para restaurar a ficha, que volta com o histórico. Se for outra criança, confirme para matricular.`,
          codigo: "duplicata",
          candidatos: [],
        },
        { status: 409 }
      );
    }
  }

  // Capacidade 0 é turma fechada, não turma sem limite: a coluna é NOT NULL com
  // default 25, então o zero foi escolha de alguém e vale como limite.
  const capacidade = Number(turma.capacidade ?? 0);
  if (a.confirmarLotacao !== true && Number.isFinite(capacidade) && capacidade >= 0) {
    const { count, error: erroOcupacao } = await sb
      .from("alunos")
      .select("id", { count: "exact", head: true })
      .eq("turma_id", turmaId)
      .eq("status", "Ativo");
    if (erroOcupacao) return erros.servidorIndisponivel(erroOcupacao);
    const ocupacao = count ?? 0;
    if (ocupacao >= capacidade) {
      return NextResponse.json(
        {
          error:
            capacidade === 0
              ? `A turma ${turma.nome} está com 0 vagas e não aceita matrícula. Defina a capacidade dela em Turmas ou confirme com a direção para matricular mesmo assim.`
              : `A turma ${turma.nome} já tem ${ocupacao} de ${capacidade} vagas ocupadas.`,
          codigo: "lotacao",
          ocupacao,
          capacidade,
          turmaNome: String(turma.nome),
        },
        { status: 422 }
      );
    }
  }

  const matricula = `${new Date().getFullYear()}/${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const { data, error } = await sb.from("alunos").insert({
    id,
    nome,
    data_nascimento: dataNascimento,
    cpf: cpf || null,
    rg: a.rg || null,
    turma_id: turmaId,
    bilingue: Boolean(a.bilingue),
    matricula,
    data_matricula: dataMatricula,
    status: "Ativo",
    observacoes: a.observacoes || null,
    foto: a.foto || null,
    responsaveis_json: responsaveis.lista,
    // Campos da ficha completa
    ra: a.ra || null,
    raca: a.raca || null,
    sexo: a.sexo || null,
    natural_de: a.naturalDe || null,
    estado: a.estado || null,
    cep: a.cep || null,
    endereco: a.endereco || null,
    bairro: a.bairro || null,
    telefone_aluno: a.telefoneAluno || null,
    religiao: a.religiao || null,
    escola_anterior_nome: a.escolaAnteriorNome || null,
    escola_anterior_tempo: a.escolaAnteriorTempo || null,
    pessoas_autorizadas_json: a.pessoasAutorizadas || [],
    ficha_saude_json: a.fichaSaude || null,
  }).select("*").single();

  if (error || !data) {
    if (error?.code === "23505") {
      // Dois cliques simultâneos com a mesma chave: o perdedor devolve o aluno
      // criado. Se a reconsulta falhar, é indisponibilidade de banco — dizer
      // "CPF repetido" mandaria a secretaria procurar um duplicado que não existe.
      if (chave) {
        let concorrente: LinhaAluno | null;
        try {
          concorrente = await linhaDoIdDerivado(id);
        } catch (erroConcorrente) {
          return erros.servidorIndisponivel(erroConcorrente);
        }
        if (concorrente) return respostaDaChaveJaUsada(concorrente, a);
      }
      return erroAPI("Já existe um aluno com o mesmo CPF, RA ou matrícula.", 409);
    }
    if (error?.code === "23503") {
      return erroAPI("A turma selecionada não existe mais. Atualize a página.", 422);
    }
    if (["22007", "23502", "23514"].includes(error?.code ?? "")) {
      return erros.dadosInvalidos();
    }
    return erros.servidorIndisponivel(error ?? new Error("INSERT de aluno sem retorno"));
  }

  await registrarAudit(
    "criar",
    "alunos",
    id,
    {
      turmaId,
      dataMatricula,
      duplicataConfirmada: a.confirmarDuplicata === true,
      lotacaoConfirmada: a.confirmarLotacao === true,
    },
    usuario
  );
  return sucesso({ item: rowToAluno(data) }, 201);
}
