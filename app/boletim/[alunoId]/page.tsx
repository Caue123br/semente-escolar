import { notFound } from "next/navigation";
import { getDatabase } from "@/lib/db/postgres";
import { seedAlunos, seedTurmas, seedFrequencia } from "@/lib/db/seed";
import { initials, formatDateBR, formatDateLocalISO } from "@/lib/utils";
import { BoletimImprimir } from "./boletim-imprimir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ alunoId: string }>;
}

export default async function BoletimPage({ params }: PageProps) {
  const { alunoId } = await params;
  await Promise.all([seedAlunos(), seedTurmas(), seedFrequencia()]);
  const sb = getDatabase();

  const { data: alunoRaw } = await sb.from("alunos").select("*").eq("id", alunoId).maybeSingle();
  if (!alunoRaw) notFound();

  const aluno = {
    id: String(alunoRaw.id),
    nome: String(alunoRaw.nome),
    dataNascimento: String(alunoRaw.data_nascimento),
    turmaId: String(alunoRaw.turma_id),
    matricula: String(alunoRaw.matricula ?? ""),
    bilingue: Boolean(alunoRaw.bilingue),
    responsaveis: Array.isArray(alunoRaw.responsaveis_json) ? alunoRaw.responsaveis_json : [],
  };

  // A turma precisa vir do banco; não inventamos dados quando o vínculo está ausente.
  const { data: turmaRaw } = await sb.from("turmas").select("*").eq("id", aluno.turmaId).maybeSingle();
  const turma = turmaRaw
    ? {
        nome: String(turmaRaw.nome),
        serie: String(turmaRaw.serie),
        turno: String(turmaRaw.turno),
        professorNome: String(turmaRaw.professor_nome ?? ""),
      }
    : { nome: "—", serie: "—", turno: "—", professorNome: "—" };

  // Busca avaliações
  const { data: avaliacoes } = await sb
    .from("avaliacoes")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("ano", { ascending: false })
    .order("bimestre", { ascending: false });

  // Busca frequência dos últimos 60 dias
  const ate = formatDateLocalISO();
  const deDate = new Date();
  deDate.setDate(deDate.getDate() - 60);
  const de = formatDateLocalISO(deDate);
  const { data: frequencias } = await sb
    .from("frequencia")
    .select("*")
    .eq("aluno_id", alunoId)
    .gte("data", de)
    .lte("data", ate);
  const totalFreq = frequencias?.length ?? 0;
  const presentesFreq = (frequencias ?? []).filter((f) => f.presente).length;
  const pctFreq = totalFreq === 0 ? null : Math.round((presentesFreq / totalFreq) * 100);

  // Busca escola
  const { data: escolaRaw } = await sb
    .from("escolas")
    .select("*")
    .eq("id", process.env.SCHOOL_ID ?? "default")
    .maybeSingle();
  const escola = {
    nome: String(escolaRaw?.nome ?? "Escola"),
    cnpj: String(escolaRaw?.cnpj ?? "—"),
    endereco: String(escolaRaw?.endereco ?? "—"),
    telefone: String(escolaRaw?.telefone ?? "—"),
    logoTexto: String(escolaRaw?.logo_texto ?? "EM"),
  };

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <BoletimImprimir />

      {/* Boletim — layout A4 */}
      <main className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:max-w-full p-10 print:p-8 my-6 print:my-0">
        {/* Cabeçalho */}
        <header className="flex items-center justify-between border-b-2 border-emerald-600 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xl">
              {escola.logoTexto}
            </div>
            <div>
              <h1 className="text-xl font-bold">{escola.nome}</h1>
              <div className="text-xs text-gray-600">
                {escola.endereco}
                <br />
                {escola.telefone} · CNPJ {escola.cnpj}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase">Boletim Escolar</div>
            <div className="font-bold text-lg">Ano letivo {new Date().getFullYear()}</div>
            <div className="text-xs text-gray-600">Emitido em {formatDateBR(formatDateLocalISO())}</div>
          </div>
        </header>

        {/* Dados do aluno */}
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">
            Dados do aluno
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-2xl">
                {initials(aluno.nome)}
              </div>
            </div>
            <div className="col-span-2 space-y-1 text-sm">
              <div>
                <span className="text-gray-500">Nome:</span> <strong>{aluno.nome}</strong>
              </div>
              <div>
                <span className="text-gray-500">Nascimento:</span> {formatDateBR(aluno.dataNascimento)}
              </div>
              <div>
                <span className="text-gray-500">Matrícula:</span> {aluno.matricula || "—"}
              </div>
              <div>
                <span className="text-gray-500">Turma:</span> {turma.nome} · {turma.turno}
              </div>
              <div>
                <span className="text-gray-500">Professor(a):</span> {turma.professorNome}
              </div>
              {aluno.bilingue && (
                <div className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs mt-1">
                  Programa Bilíngue
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Avaliações por bimestre */}
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">
            Avaliações pedagógicas
          </h2>
          {(!avaliacoes || avaliacoes.length === 0) ? (
            <div className="text-sm text-gray-500 italic border rounded-lg p-4">
              Sem avaliações registradas até o momento.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Bimestre</th>
                  <th className="border p-2">Leitura (nível)</th>
                  <th className="border p-2">Leitura</th>
                  <th className="border p-2">Escrita</th>
                  <th className="border p-2">Lógica-Mat.</th>
                  <th className="border p-2">Oralidade</th>
                  <th className="border p-2">Média</th>
                </tr>
              </thead>
              <tbody>
                {avaliacoes.map((a) => {
                  const media =
                    (Number(a.leitura ?? 0) +
                      Number(a.escrita ?? 0) +
                      Number(a.logica_matematica ?? 0) +
                      Number(a.oralidade ?? 0)) /
                    4;
                  return (
                    <tr key={String(a.id)}>
                      <td className="border p-2 font-semibold">
                        {a.bimestre}º bim · {a.ano}
                      </td>
                      <td className="border p-2 text-center text-xs">{a.leitura_nivel ?? "—"}</td>
                      <td className="border p-2 text-center">{a.leitura ?? "—"}/4</td>
                      <td className="border p-2 text-center">{a.escrita ?? "—"}/4</td>
                      <td className="border p-2 text-center">{a.logica_matematica ?? "—"}/4</td>
                      <td className="border p-2 text-center">{a.oralidade ?? "—"}/4</td>
                      <td className="border p-2 text-center font-bold">{media.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="text-xs text-gray-500 mt-2">
            Escala: 1 = Iniciante · 2 = Em desenvolvimento · 3 = Adequado · 4 = Pleno
          </div>
        </section>

        {/* Frequência */}
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">
            Frequência (últimos 60 dias)
          </h2>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-500">Total registros</div>
              <div className="text-xl font-bold">{totalFreq}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-500">Presenças</div>
              <div className="text-xl font-bold text-emerald-600">{presentesFreq}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-500">Ausências</div>
              <div className="text-xl font-bold text-rose-600">{totalFreq - presentesFreq}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-gray-500">% de presença</div>
              <div className="text-xl font-bold text-emerald-700">
                {pctFreq === null ? "—" : `${pctFreq}%`}
              </div>
            </div>
          </div>
          {pctFreq !== null && pctFreq < 75 && (
            <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
              ⚠️ Atenção: frequência abaixo de 75%. Recomendamos conversa com a família.
            </div>
          )}
        </section>

        {/* Observação da escola */}
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">
            Considerações da escola
          </h2>
          <div className="border rounded-lg p-4 min-h-[80px] text-sm">
            {avaliacoes && avaliacoes[0]?.observacao
              ? String(avaliacoes[0].observacao)
              : "—"}
          </div>
        </section>

        {/* Responsáveis */}
        {aluno.responsaveis.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">
              Responsáveis cadastrados
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {(aluno.responsaveis as Array<{ nome: string; parentesco: string; telefone: string; email: string }>).map(
                (r, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="font-semibold">{r.nome}</div>
                    <div className="text-gray-500">{r.parentesco}</div>
                    <div className="mt-1">{r.telefone}</div>
                    <div className="text-gray-600">{r.email}</div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* Assinaturas */}
        <section className="mt-12 grid grid-cols-2 gap-12 text-center text-xs text-gray-600">
          <div>
            <div className="border-t-2 border-gray-300 pt-2">
              <div className="font-semibold">{turma.professorNome || "Professor(a)"}</div>
              <div className="text-[10px]">Professor(a) responsável</div>
            </div>
          </div>
          <div>
            <div className="border-t-2 border-gray-300 pt-2">
              <div className="font-semibold">Direção pedagógica</div>
              <div className="text-[10px]">{escola.nome}</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
