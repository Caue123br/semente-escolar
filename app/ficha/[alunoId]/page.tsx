import { notFound } from "next/navigation";
import { getDatabase } from "@/lib/db/postgres";
import { seedAlunos, seedTurmas } from "@/lib/db/seed";
import { rowToAluno } from "@/lib/db/mappers";
import { formatDateBR } from "@/lib/utils";
import { FichaImprimir } from "./ficha-imprimir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ alunoId: string }>;
}

export default async function FichaPage({ params }: PageProps) {
  const { alunoId } = await params;
  await Promise.all([seedAlunos(), seedTurmas()]);
  const sb = getDatabase();

  const { data: alunoRaw } = await sb.from("alunos").select("*").eq("id", alunoId).maybeSingle();
  if (!alunoRaw) notFound();

  const aluno = rowToAluno(alunoRaw as Record<string, unknown>);

  const { data: turmaRaw } = await sb.from("turmas").select("*").eq("id", aluno.turmaId).maybeSingle();
  const turma = turmaRaw
    ? {
        nome: String(turmaRaw.nome),
        serie: String(turmaRaw.serie),
        turno: String(turmaRaw.turno),
        professorNome: String(turmaRaw.professor_nome ?? ""),
      }
    : { nome: "—", serie: "—", turno: "—", professorNome: "—" };

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
    logoUrl: escolaRaw?.logo_url ? String(escolaRaw.logo_url) : null,
  };

  const pai = aluno.responsaveis.find((r) => r.parentesco === "Pai");
  const mae = aluno.responsaveis.find((r) => r.parentesco === "Mãe");
  const saude = aluno.fichaSaude;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <FichaImprimir />

      {/* PÁGINA 1 — Ficha de Matrícula */}
      <main className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:max-w-full p-10 print:p-8 my-6 print:my-0 print:break-after-page">
        {/* Cabeçalho */}
        <header className="flex items-start gap-4 mb-6">
          <div className="w-24 h-32 border-2 border-orange-400 rounded flex flex-col items-center justify-center text-orange-600 text-xs">
            <span>foto</span>
            <span>3x4</span>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-blue-900">Ficha Individual de Matrícula</h1>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-orange-500 text-white font-bold overflow-hidden">
                {escola.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={escola.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  escola.logoTexto
                )}
              </div>
              <div>
                <div className="font-bold text-orange-600">{escola.nome}</div>
                <div className="text-[10px] text-gray-600 leading-tight">
                  {escola.endereco}
                </div>
                <div className="text-[10px] text-gray-600">{escola.telefone}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Dados do aluno */}
        <section className="space-y-1 text-sm border-b border-gray-300 pb-3 mb-3">
          <Linha label="Nome" value={aluno.nome} secLabel="Raça" secValue={aluno.raca} />
          <Linha label="RA" value={aluno.ra} secLabel="Sexo" secValue={aluno.sexo === "M" ? "Masculino" : aluno.sexo === "F" ? "Feminino" : ""} />
          <Linha label="Data de nascimento" value={formatDateBR(aluno.dataNascimento)} secLabel="Estado" secValue={aluno.estado} />
          <Linha label="Natural de" value={aluno.naturalDe} secLabel="Período" secValue={turma.turno} />
          <Linha label="Nível" value={turma.serie} secLabel="CEP" secValue={aluno.cep} />
          <Linha label="Endereço" value={aluno.endereco} secLabel="Fone" secValue={aluno.telefoneAluno} />
          <Linha label="Bairro" value={aluno.bairro} />
        </section>

        {/* Dados do pai */}
        <section className="space-y-1 text-sm border-b border-gray-300 pb-3 mb-3">
          <div className="font-bold text-gray-700 mb-1">Pai</div>
          <Linha label="Nome do pai" value={pai?.nome} />
          <Linha label="R.G." value={pai?.rg} secLabel="C.P.F." secValue={pai?.cpf} />
          <Linha label="Profissão" value={pai?.profissao} />
          <Linha label="Local de trabalho" value={pai?.localTrabalho} />
          <Linha
            label="Data de nascimento"
            value={pai?.dataNascimento ? formatDateBR(pai.dataNascimento) : ""}
            secLabel="Responsável Financeiro"
            secValue={pai?.responsavelFinanceiro ? "Sim" : "Não"}
          />
          <Linha label="Fone" value={pai?.telefone} />
          <Linha label="E-mail" value={pai?.email} />
        </section>

        {/* Dados da mãe */}
        <section className="space-y-1 text-sm border-b border-gray-300 pb-3 mb-3">
          <div className="font-bold text-gray-700 mb-1">Mãe</div>
          <Linha label="Nome da mãe" value={mae?.nome} />
          <Linha label="R.G." value={mae?.rg} secLabel="C.P.F." secValue={mae?.cpf} />
          <Linha label="Profissão" value={mae?.profissao} />
          <Linha label="Local de trabalho" value={mae?.localTrabalho} />
          <Linha
            label="Data de nascimento"
            value={mae?.dataNascimento ? formatDateBR(mae.dataNascimento) : ""}
            secLabel="Responsável Financeiro"
            secValue={mae?.responsavelFinanceiro ? "Sim" : "Não"}
          />
          <Linha label="Fone" value={mae?.telefone} />
          <Linha label="E-mail" value={mae?.email} />
        </section>

        {/* Pessoas autorizadas */}
        <section className="text-sm border-b border-gray-300 pb-3 mb-3">
          <div className="grid grid-cols-2 gap-x-8 mb-2">
            <div className="font-bold text-gray-700">Pessoas autorizadas a sair com o aluno:</div>
            <div className="font-bold text-gray-700">Grau de parentesco:</div>
          </div>
          {[0, 1, 2, 3, 4].map((i) => {
            const p = aluno.pessoasAutorizadas?.[i];
            return (
              <div key={i} className="grid grid-cols-2 gap-x-8">
                <div className="border-b border-gray-300 py-1">
                  <span className="text-xs text-gray-500 mr-2">{String(i + 1).padStart(2, "0")}</span>
                  {p?.nome ?? ""}
                </div>
                <div className="border-b border-gray-300 py-1">{p?.parentesco ?? ""}</div>
              </div>
            );
          })}
        </section>

        {/* Histórico escolar */}
        <section className="space-y-1 text-sm">
          <Linha
            label="O aluno já freqüentou outra escola?"
            value={aluno.escolaAnteriorNome ? "Sim" : "Não"}
            secLabel="Por quanto tempo"
            secValue={aluno.escolaAnteriorTempo}
          />
          <Linha label="Qual escola" value={aluno.escolaAnteriorNome} />
          <Linha label="Qual a religião do aluno" value={aluno.religiao} />
        </section>
      </main>

      {/* PÁGINA 2 — Ficha de Saúde */}
      <main className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:max-w-full p-10 print:p-8 my-6 print:my-0">
        <header className="border-b-2 border-blue-700 pb-4 mb-4">
          <h1 className="text-xl font-bold text-blue-900">Ficha Individual de Saúde</h1>
          <div className="text-xs text-gray-600 mt-1">Aluno: {aluno.nome}</div>
        </header>

        {/* Doenças */}
        <section className="bg-gray-100 p-3 mb-3 text-sm">
          <div className="font-bold mb-2">Doenças que a criança já teve e/ou tenha:</div>
          <div className="grid grid-cols-3 gap-1 text-xs">
            <Check label="bronquite" v={saude?.doencas?.bronquite} />
            <Check label="coqueluche" v={saude?.doencas?.coqueluche} />
            <Check label="problemas no coração" v={saude?.doencas?.problemasCoracao} />
            <Check label="catapora" v={saude?.doencas?.catapora} />
            <Check label="diabete" v={saude?.doencas?.diabete} />
            <Check label="rubéola" v={saude?.doencas?.rubeola} />
            <Check label="caxumba" v={saude?.doencas?.caxumba} />
            <Check label={`hepatite tipo ${saude?.doencas?.hepatiteTipo ?? "___"}`} v={saude?.doencas?.hepatite} />
            <Check label="sarampo" v={saude?.doencas?.sarampo} />
            <Check label="convulsão" v={saude?.doencas?.convulsao} />
            <Check label="pneumonia" v={saude?.doencas?.pneumonia} />
          </div>
        </section>

        <section className="space-y-3 text-sm">
          <Linha label="Outras" value={saude?.doencasOutras} />
          <SimNaoLinha label="O aluno(a) já desmaiou alguma vez?" sim={saude?.desmaioSim} motivo={saude?.desmaioMotivo} />
          <SimNaoLinha label="O aluno(a) já esteve internado(a)?" sim={saude?.internadoSim} motivo={saude?.internadoMotivo} />
          <div>
            <div className="text-sm">O aluno(a) apresenta algum tipo de alergia? (Medicamentos, alimentação, etc.)</div>
            <div className="border-b border-gray-400 py-1 min-h-[20px]">{saude?.alergias ?? ""}</div>
          </div>
          <SimNaoLinha label="O aluno(a) está em tratamento médico?" sim={saude?.tratamentoMedicoSim} motivo={saude?.tratamentoMotivo} />
          <Linha label="O aluno(a) possui algum trauma ou fobia?" value={saude?.traumaFobia} />
          <SimNaoLinha
            label="Em caso de febre, pode ser dado algum medicamento ao(a) aluno(a)?"
            sim={saude?.medicamentoFebreSim}
            motivo={saude?.medicamentoFebreQual}
            labelMotivo="Qual"
          />
          <Linha label="Quem é o(a) médico(a) do(a) aluno(a)" value={saude?.medicoNome} />
          <Linha label="Fone" value={saude?.medicoTelefone} />
          <SimNaoLinha
            label="O aluno(a) possui algum convênio médico?"
            sim={saude?.convenioSim}
            motivo={saude?.convenioQual}
            labelMotivo="Qual"
          />
        </section>

        <section className="mt-5 bg-orange-50 p-3 text-sm">
          <div className="font-semibold mb-1">Informações complementares:</div>
          <div className="border-b border-gray-400 min-h-[60px] py-1">
            {saude?.informacoesComplementares ?? ""}
          </div>
        </section>

        <section className="mt-10 text-sm text-center">
          <div className="text-gray-700">
            ____________________, ___ de ___________________ de _______
          </div>
          <div className="mt-12 max-w-md mx-auto">
            <div className="border-t-2 border-gray-700 pt-1 text-xs">Assinatura do responsável</div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Linha({
  label,
  value,
  secLabel,
  secValue,
}: {
  label: string;
  value?: string;
  secLabel?: string;
  secValue?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-8 items-baseline">
      <div className="flex items-baseline gap-2 border-b border-gray-300 py-1">
        <span className="text-gray-700 text-xs whitespace-nowrap">{label}:</span>
        <span className="flex-1 truncate">{value || ""}</span>
      </div>
      {secLabel ? (
        <div className="flex items-baseline gap-2 border-b border-gray-300 py-1">
          <span className="text-gray-700 text-xs whitespace-nowrap">{secLabel}:</span>
          <span className="flex-1 truncate">{secValue || ""}</span>
        </div>
      ) : (
        <div className="border-b border-gray-300 py-1" />
      )}
    </div>
  );
}

function Check({ label, v }: { label: string; v?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`inline-block w-3 h-3 border ${v ? "bg-gray-700" : ""}`} />
      <span>{label}</span>
    </div>
  );
}

function SimNaoLinha({
  label,
  sim,
  motivo,
  labelMotivo = "Motivo",
}: {
  label: string;
  sim?: boolean;
  motivo?: string;
  labelMotivo?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span>{label}</span>
        <span>Sim ({sim === true ? "X" : " "})</span>
        <span>Não ({sim === false ? "X" : " "})</span>
        <span>{labelMotivo}:</span>
        <span className="flex-1 border-b border-gray-400 px-1 min-h-[18px]">{motivo ?? ""}</span>
      </div>
    </div>
  );
}
