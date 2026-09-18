import { notFound } from "next/navigation";
import { getUsuarioLogado } from "@/lib/db/auth";
import { getDatabase } from "@/lib/db/postgres";
import { rowToAluno } from "@/lib/db/mappers";
import { seedAlunos, seedTurmas } from "@/lib/db/seed";
import { podeAcessarFicha } from "@/lib/navigation-access";
import { ContratoEditor, type CobradoContrato, type PlanoContrato } from "./contrato-editor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ alunoId: string }>;
}

export default async function ContratoPage({ params }: PageProps) {
  const { alunoId } = await params;

  // O contrato reúne CPF/RG dos responsáveis, endereço e plano financeiro.
  // A trava fica aqui também, e não só no proxy: /contrato pertence ao módulo
  // de alunos, que o professor tem, e ninguém deve depender de um único gate.
  const usuario = await getUsuarioLogado();
  if (!usuario || !podeAcessarFicha(usuario.perfil)) notFound();

  await Promise.all([seedAlunos(), seedTurmas()]);
  const sb = getDatabase();

  const { data: alunoRaw } = await sb.from("alunos").select("*").eq("id", alunoId).maybeSingle();
  if (!alunoRaw) notFound();
  const aluno = rowToAluno(alunoRaw);

  const { data: turmaRaw } = await sb.from("turmas").select("*").eq("id", aluno.turmaId).maybeSingle();
  const turma = {
    nome: String(turmaRaw?.nome ?? ""),
    serie: String(turmaRaw?.serie ?? ""),
    turno: String(turmaRaw?.turno ?? ""),
  };

  const { data: escolaRaw } = await sb
    .from("escolas")
    .select("*")
    .eq("id", process.env.SCHOOL_ID ?? "default")
    .maybeSingle();
  const escola = {
    nome: String(escolaRaw?.nome ?? "Centro Educacional Modelo"),
    cnpj: String(escolaRaw?.cnpj ?? ""),
    endereco: String(escolaRaw?.endereco ?? ""),
    telefone: String(escolaRaw?.telefone ?? ""),
  };

  // Plano de pagamento: é o que preenche a cláusula 8ª. Sem ele o contrato sai
  // com os valores em branco, e o editor precisa saber disso para avisar.
  const plano: PlanoContrato = {
    matriculaTaxa: aluno.matriculaTaxa,
    matriculaModalidade: aluno.matriculaModalidade,
    matriculaParcelas: aluno.matriculaParcelas,
    matriculaForma: aluno.matriculaForma,
    mensalidadeValor: aluno.mensalidadeValor,
    mensalidadePeriodicidade: aluno.mensalidadePeriodicidade,
    diaVencimento: aluno.diaVencimento,
    dataMatricula: aluno.dataMatricula,
  };

  // O que a escola realmente vai cobrar são as cobranças já geradas. Levar o
  // resumo para a tela permite conferir papel x cobrança antes de imprimir.
  const { data: cobrancasRaw } = await sb
    .from("cobrancas")
    .select("tipo, valor, vencimento")
    .eq("aluno_id", alunoId)
    .order("vencimento", { ascending: true });

  const cobrancas = (cobrancasRaw ?? []).map((c) => ({
    tipo: String(c.tipo ?? ""),
    valor: Number(c.valor ?? 0),
    vencimento: String(c.vencimento ?? "").slice(0, 10),
  }));
  const daMatricula = cobrancas.filter((c) => c.tipo === "matricula");
  const daAnuidade = cobrancas.filter((c) => c.tipo === "mensalidade");
  const somar = (lista: typeof cobrancas) =>
    Math.round(lista.reduce((total, c) => total + c.valor * 100, 0)) / 100;

  const cobrado: CobradoContrato | null =
    cobrancas.length > 0
      ? {
          matriculaTotal: somar(daMatricula),
          matriculaParcelas: daMatricula.length,
          primeiroVencimentoMatricula: daMatricula[0]?.vencimento ?? null,
          anuidadeTotal: somar(daAnuidade),
          mensalidades: daAnuidade.length,
          primeiroVencimentoMensalidade: daAnuidade[0]?.vencimento ?? null,
        }
      : null;

  return (
    <ContratoEditor aluno={aluno} turma={turma} escola={escola} plano={plano} cobrado={cobrado} />
  );
}
