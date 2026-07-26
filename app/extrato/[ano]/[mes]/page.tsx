import { getDatabase } from "@/lib/db/postgres";
import { ExtratoImprimir } from "./extrato-imprimir";
import { formatDateBR, formatBRL, formatDateLocalISO } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

interface PageProps {
  params: Promise<{ ano: string; mes: string }>;
}

export default async function ExtratoPage({ params }: PageProps) {
  const { ano: anoStr, mes: mesStr } = await params;
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10); // 1-12

  if (!ano || !mes || mes < 1 || mes > 12) {
    return <div className="p-8">Período inválido. Use /extrato/2026/06</div>;
  }

  const mm = String(mes).padStart(2, "0");
  const comp = `${ano}-${mm}`;
  const inicio = `${ano}-${mm}-01`;
  const ultDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${mm}-${String(ultDia).padStart(2, "0")}`;

  const sb = getDatabase();
  const [mensRes, vendRes, despRes, escolaRes] = await Promise.all([
    sb.from("mensalidades").select("*").eq("competencia", comp),
    sb.from("vendas").select("*").gte("data", inicio).lte("data", fim),
    sb.from("despesas").select("*").gte("data", inicio).lte("data", fim),
    sb.from("escolas").select("*").eq("id", process.env.SCHOOL_ID ?? "default").maybeSingle(),
  ]);

  const mensalidades = mensRes.data ?? [];
  const vendas = vendRes.data ?? [];
  const despesas = despRes.data ?? [];
  const escola = {
    nome: String(escolaRes.data?.nome ?? "Escola Modelo"),
    cnpj: String(escolaRes.data?.cnpj ?? "—"),
    endereco: String(escolaRes.data?.endereco ?? "Largo da Inconfidência, 56 — Vila São José — Taubaté/SP"),
    telefone: String(escolaRes.data?.telefone ?? "12 3632.6128"),
    logoTexto: String(escolaRes.data?.logo_texto ?? "EM"),
    logoUrl: escolaRes.data?.logo_url ? String(escolaRes.data.logo_url) : null,
  };

  // Cálculos
  const recebido = mensalidades.filter((m) => m.status === "Paga").reduce((a, m) => a + (Number(m.valor_pago) || Number(m.valor)), 0);
  const aReceber = mensalidades.filter((m) => m.status === "A Vencer" || m.status === "Vence Hoje").reduce((a, m) => a + Number(m.valor), 0);
  const inad = mensalidades.filter((m) => m.status === "Atrasada").reduce((a, m) => a + Number(m.valor), 0);
  const vendasMes = vendas.reduce((a, v) => a + Number(v.total), 0);
  const despesasPagas = despesas.filter((d) => d.status === "Paga").reduce((a, d) => a + Number(d.valor), 0);
  const despesasAPagar = despesas.filter((d) => d.status !== "Paga").reduce((a, d) => a + Number(d.valor), 0);

  const entradaTotal = recebido + vendasMes;
  const saidaTotal = despesasPagas;
  const saldoMes = entradaTotal - saidaTotal;

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <ExtratoImprimir periodo={`${MESES[mes - 1]}/${ano}`} />

      <main className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none print:max-w-full p-10 print:p-8 my-6 print:my-0">
        {/* Cabeçalho */}
        <header className="flex items-start justify-between border-b-2 border-emerald-600 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xl overflow-hidden">
              {escola.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={escola.logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                escola.logoTexto
              )}
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
            <div className="text-xs text-gray-500 uppercase">Extrato Financeiro</div>
            <div className="font-bold text-lg">{MESES[mes - 1]}/{ano}</div>
            <div className="text-xs text-gray-600">Emitido em {formatDateBR(formatDateLocalISO())}</div>
          </div>
        </header>

        {/* Resumo */}
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">Resumo do mês</h2>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="border-2 border-emerald-300 rounded-lg p-3 bg-emerald-50">
              <div className="text-xs text-emerald-700 uppercase">Entradas</div>
              <div className="text-xl font-bold text-emerald-700">{formatBRL(entradaTotal)}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">
                Mensalidades + vendas
              </div>
            </div>
            <div className="border-2 border-rose-300 rounded-lg p-3 bg-rose-50">
              <div className="text-xs text-rose-700 uppercase">Saídas</div>
              <div className="text-xl font-bold text-rose-700">{formatBRL(saidaTotal)}</div>
              <div className="text-[10px] text-rose-600 mt-0.5">Despesas pagas</div>
            </div>
            <div className="border-2 border-amber-300 rounded-lg p-3 bg-amber-50">
              <div className="text-xs text-amber-700 uppercase">A receber</div>
              <div className="text-xl font-bold text-amber-700">{formatBRL(aReceber)}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Mensalidades em aberto</div>
            </div>
            <div className={`border-2 rounded-lg p-3 ${saldoMes >= 0 ? "border-blue-300 bg-blue-50" : "border-rose-300 bg-rose-50"}`}>
              <div className={`text-xs uppercase ${saldoMes >= 0 ? "text-blue-700" : "text-rose-700"}`}>Saldo do mês</div>
              <div className={`text-xl font-bold ${saldoMes >= 0 ? "text-blue-700" : "text-rose-700"}`}>{formatBRL(saldoMes)}</div>
              <div className="text-[10px] mt-0.5 text-gray-600">Entrada - saída</div>
            </div>
          </div>
        </section>

        {/* Mensalidades pagas */}
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">
            Mensalidades pagas ({formatBRL(recebido)})
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-1.5 text-left text-xs">Aluno</th>
                <th className="border p-1.5 text-left text-xs">Vencimento</th>
                <th className="border p-1.5 text-left text-xs">Pago em</th>
                <th className="border p-1.5 text-left text-xs">Forma</th>
                <th className="border p-1.5 text-right text-xs">Valor</th>
              </tr>
            </thead>
            <tbody>
              {mensalidades.filter((m) => m.status === "Paga").map((m) => (
                <tr key={String(m.id)}>
                  <td className="border p-1.5">{String(m.aluno_nome)}</td>
                  <td className="border p-1.5 text-xs">{formatDateBR(String(m.vencimento))}</td>
                  <td className="border p-1.5 text-xs">{m.data_pagamento ? formatDateBR(String(m.data_pagamento)) : "—"}</td>
                  <td className="border p-1.5 text-xs">{m.forma_pagamento ?? "—"}</td>
                  <td className="border p-1.5 text-right font-semibold">{formatBRL(Number(m.valor_pago) || Number(m.valor))}</td>
                </tr>
              ))}
              {mensalidades.filter((m) => m.status === "Paga").length === 0 && (
                <tr>
                  <td colSpan={5} className="border p-3 text-center text-gray-500 text-xs">Nenhuma mensalidade paga neste mês</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Vendas */}
        {vendas.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">
              Vendas ({formatBRL(vendasMes)})
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-1.5 text-left text-xs">Data</th>
                  <th className="border p-1.5 text-left text-xs">Item</th>
                  <th className="border p-1.5 text-left text-xs">Categoria</th>
                  <th className="border p-1.5 text-left text-xs">Cliente</th>
                  <th className="border p-1.5 text-right text-xs">Total</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((v) => (
                  <tr key={String(v.id)}>
                    <td className="border p-1.5 text-xs">{formatDateBR(String(v.data))}</td>
                    <td className="border p-1.5">{String(v.item_nome)}</td>
                    <td className="border p-1.5 text-xs">{String(v.tipo)}</td>
                    <td className="border p-1.5 text-xs">{String(v.cliente)}</td>
                    <td className="border p-1.5 text-right font-semibold">{formatBRL(Number(v.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Despesas */}
        {despesas.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">
              Despesas pagas ({formatBRL(despesasPagas)}) e a pagar ({formatBRL(despesasAPagar)})
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-1.5 text-left text-xs">Data</th>
                  <th className="border p-1.5 text-left text-xs">Descrição</th>
                  <th className="border p-1.5 text-left text-xs">Categoria</th>
                  <th className="border p-1.5 text-left text-xs">Status</th>
                  <th className="border p-1.5 text-right text-xs">Valor</th>
                </tr>
              </thead>
              <tbody>
                {despesas.map((d) => (
                  <tr key={String(d.id)} className={d.status !== "Paga" ? "bg-amber-50" : ""}>
                    <td className="border p-1.5 text-xs">{formatDateBR(String(d.data))}</td>
                    <td className="border p-1.5">{String(d.descricao)}</td>
                    <td className="border p-1.5 text-xs">{String(d.categoria)}</td>
                    <td className="border p-1.5 text-xs">{String(d.status)}</td>
                    <td className="border p-1.5 text-right font-semibold">{formatBRL(Number(d.valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Inadimplência */}
        {inad > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-wider text-rose-700 font-semibold mb-2">
              Mensalidades em atraso ({formatBRL(inad)})
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-rose-100">
                  <th className="border p-1.5 text-left text-xs">Aluno</th>
                  <th className="border p-1.5 text-left text-xs">Vencimento</th>
                  <th className="border p-1.5 text-right text-xs">Dias atraso</th>
                  <th className="border p-1.5 text-right text-xs">Valor</th>
                </tr>
              </thead>
              <tbody>
                {mensalidades.filter((m) => m.status === "Atrasada").map((m) => (
                  <tr key={String(m.id)}>
                    <td className="border p-1.5">{String(m.aluno_nome)}</td>
                    <td className="border p-1.5 text-xs">{formatDateBR(String(m.vencimento))}</td>
                    <td className="border p-1.5 text-right text-rose-700 font-semibold">{m.dias_atraso} dias</td>
                    <td className="border p-1.5 text-right font-semibold text-rose-700">{formatBRL(Number(m.valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mt-10 text-xs text-center text-gray-500 border-t pt-4">
          Documento gerado automaticamente pelo sistema da {escola.nome}.
          <br />
          Não tem valor fiscal — apenas pra acompanhamento gerencial.
        </section>
      </main>
    </div>
  );
}
