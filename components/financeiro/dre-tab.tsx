"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatBRL, cn } from "@/lib/utils";
import { useEntidade } from "@/lib/data/store";
import { usePeriodoContexto } from "@/lib/contexto-periodo";
import { somaEmAberto, somaRecebida } from "@/lib/financeiro-mensalidades";

interface Linha {
  rotulo: string;
  valor: number;
  tipo: "receita" | "deducao" | "custo" | "despesa" | "subtotal" | "resultado" | "informativa";
  indent?: number;
}

// Categorias que já aparecem em linha própria — o resto cai em "Outras despesas".
const CATEGORIAS_DETALHADAS = [
  "Folha",
  "Alimentação",
  "Material Pedagógico",
  "Limpeza",
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Marketing",
  "Impostos",
  "Manutenção",
];

export function DreTab() {
  const { periodo } = usePeriodoContexto();
  const { items: mensalidades } = useEntidade("mensalidades");
  const { items: vendas } = useEntidade("vendas");
  const { items: despesas } = useEntidade("despesas");
  const { items: funcionarios } = useEntidade("funcionarios");

  // Receitas do período. Receita realizada = o que entrou (valor_pago), pelo critério
  // único de lib/financeiro-mensalidades; o que falta entrar aparece em linha
  // informativa, fora do resultado.
  // TODO(auditoria): o espelho de /api/cobrancas/gerar só copia cobranças de tipo
  // "mensalidade" — as taxas de matrícula recebidas não aparecem no DRE.
  const mensalidadesDoMes = mensalidades.filter((m) => m.competencia === periodo.competencia);
  const recMensalidades = somaRecebida(mensalidadesDoMes);
  const mensalidadesAReceber = somaEmAberto(mensalidadesDoMes);

  const vendasDoMes = vendas.filter((v) => v.data >= periodo.inicio && v.data <= periodo.fim);
  const recUniformes = vendasDoMes.filter((v) => v.tipo === "Uniforme" || v.tipo === "Material").reduce((a, v) => a + v.total, 0);
  const recEventos = vendasDoMes.filter((v) => v.tipo === "Evento/Festa" || v.tipo === "Atividade Extra").reduce((a, v) => a + v.total, 0);
  const recAlimentacao = vendasDoMes.filter((v) => v.tipo === "Alimentação Extra").reduce((a, v) => a + v.total, 0);

  const receitaBruta = recMensalidades + recUniformes + recEventos + recAlimentacao;

  // Despesas lançadas no período (pagas ou a pagar)
  const despesasDoMes = despesas.filter((d) => d.data >= periodo.inicio && d.data <= periodo.fim);
  const desPorCat = (cat: string) => -Math.abs(despesasDoMes.filter((d) => d.categoria === cat).reduce((a, d) => a + d.valor, 0));

  // Impostos: uma fonte só por rubrica. Fonte escolhida = o LANÇADO na categoria
  // "Impostos" (é o DAS que a escola pagou); a estimativa de 5,88% entra apenas
  // quando o mês ainda não tem lançamento. Diferente da folha, aqui não existe
  // fonte independente confiável para comparar — a faixa real do Simples pode ser
  // menor que o percentual aproximado, então não se pega o maior dos dois.
  // "Impostos" está em CATEGORIAS_DETALHADAS para o lançado não ser subtraído
  // outra vez dentro de "Outras despesas".
  const impostosLancados = Math.abs(
    despesasDoMes.filter((d) => d.categoria === "Impostos").reduce((a, d) => a + d.valor, 0)
  );
  const deducoes = -(impostosLancados > 0 ? impostosLancados : Math.round(receitaBruta * 0.0588));
  const origemDeducoes = impostosLancados > 0 ? "lançados no mês" : "estimativa ~5,88%";
  const receitaLiquida = receitaBruta + deducoes;

  // Folha: uma fonte só por rubrica. Fonte escolhida = a MAIOR entre o lançado na
  // categoria "Folha" e a soma dos salários dos ativos. Lançamento parcial
  // (adiantamento, um funcionário só, folha ainda não fechada) não pode apagar o
  // custo do mês e virar lucro no resultado; mês com 13º/rescisão lançado acima
  // da estimativa vale pelo lançado. "Folha" está em CATEGORIAS_DETALHADAS, então
  // o lançado não volta em "Outras despesas".
  const folhaLancada = Math.abs(
    despesasDoMes.filter((d) => d.categoria === "Folha").reduce((a, d) => a + d.valor, 0)
  );
  const folhaEstimada = funcionarios.filter((f) => f.status === "Ativo").reduce((a, f) => a + f.salarioBruto, 0);
  const folhaTotal = Math.max(folhaLancada, folhaEstimada);
  const origemFolha = folhaLancada >= folhaEstimada ? "lançada" : "estimada";
  const folhaParcial = folhaLancada > 0 && folhaLancada < folhaEstimada;
  // Estimativa: 70% docente, 30% admin
  const folhaDocente = -Math.round(folhaTotal * 0.7);
  const folhaAdmin = -Math.round(folhaTotal * 0.3);

  const custoAlimentacao = desPorCat("Alimentação");
  const custoMaterial = desPorCat("Material Pedagógico");
  const custoLimpeza = desPorCat("Limpeza");
  const totalCustos = folhaDocente + custoAlimentacao + custoMaterial + custoLimpeza;

  const lucroBruto = receitaLiquida + totalCustos;

  const aluguel = desPorCat("Aluguel");
  // Água, luz e internet são categorias separadas no lançamento da despesa.
  const utilidades = -Math.abs(
    despesasDoMes
      .filter((d) => d.categoria === "Energia" || d.categoria === "Água" || d.categoria === "Internet")
      .reduce((a, d) => a + d.valor, 0)
  );
  const marketing = desPorCat("Marketing");
  const manutencao = desPorCat("Manutenção");
  const outrasDespesas = -Math.abs(despesasDoMes.filter((d) => !CATEGORIAS_DETALHADAS.includes(d.categoria)).reduce((a, d) => a + d.valor, 0));
  const totalDespesas = folhaAdmin + aluguel + utilidades + marketing + manutencao + outrasDespesas;

  const resultado = lucroBruto + totalDespesas;

  const linhas: Linha[] = [
    { rotulo: "RECEITA OPERACIONAL BRUTA", valor: receitaBruta, tipo: "receita" },
    { rotulo: "Mensalidades recebidas", valor: recMensalidades, tipo: "receita", indent: 1 },
    {
      rotulo: "Mensalidades faturadas ainda não recebidas (fora do resultado)",
      valor: mensalidadesAReceber,
      tipo: "informativa",
      indent: 1,
    },
    { rotulo: "Uniformes e materiais", valor: recUniformes, tipo: "receita", indent: 1 },
    { rotulo: "Eventos / festas / atividades", valor: recEventos, tipo: "receita", indent: 1 },
    { rotulo: "Alimentação extra", valor: recAlimentacao, tipo: "receita", indent: 1 },
    { rotulo: `(-) Deduções — Simples Nacional (${origemDeducoes})`, valor: deducoes, tipo: "deducao" },
    { rotulo: "RECEITA LÍQUIDA", valor: receitaLiquida, tipo: "subtotal" },

    { rotulo: "(-) CUSTOS DOS SERVIÇOS", valor: totalCustos, tipo: "custo" },
    { rotulo: `Folha docente (70% da folha ${origemFolha})`, valor: folhaDocente, tipo: "custo", indent: 1 },
    ...(folhaParcial
      ? [
          {
            rotulo:
              "Folha lançada em despesas até agora (abaixo dos salários dos ativos — o resultado usa a folha estimada)",
            valor: folhaLancada,
            tipo: "informativa" as const,
            indent: 1,
          },
        ]
      : []),
    { rotulo: "Alimentação", valor: custoAlimentacao, tipo: "custo", indent: 1 },
    { rotulo: "Material pedagógico", valor: custoMaterial, tipo: "custo", indent: 1 },
    { rotulo: "Limpeza e higiene", valor: custoLimpeza, tipo: "custo", indent: 1 },

    { rotulo: "LUCRO BRUTO", valor: lucroBruto, tipo: "subtotal" },

    { rotulo: "(-) DESPESAS OPERACIONAIS", valor: totalDespesas, tipo: "despesa" },
    { rotulo: `Folha administrativa (30% da folha ${origemFolha})`, valor: folhaAdmin, tipo: "despesa", indent: 1 },
    { rotulo: "Aluguel", valor: aluguel, tipo: "despesa", indent: 1 },
    { rotulo: "Utilidades (água/luz/internet)", valor: utilidades, tipo: "despesa", indent: 1 },
    { rotulo: "Marketing", valor: marketing, tipo: "despesa", indent: 1 },
    { rotulo: "Manutenção", valor: manutencao, tipo: "despesa", indent: 1 },
    { rotulo: "Outras despesas", valor: outrasDespesas, tipo: "despesa", indent: 1 },

    { rotulo: "RESULTADO LÍQUIDO DO MÊS", valor: resultado, tipo: "resultado" },
  ];

  const margemBruta = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
  const margemLiquida = receitaLiquida > 0 ? (resultado / receitaLiquida) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Receita líquida</div>
          <div className="mt-1 text-2xl font-bold">{formatBRL(receitaLiquida)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Margem bruta</div>
          <div className={cn("mt-1 text-2xl font-bold", margemBruta >= 0 ? "text-primary" : "text-danger")}>
            {margemBruta.toFixed(1)}%
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Margem líquida</div>
          <div className={cn("mt-1 text-2xl font-bold", margemLiquida >= 0 ? "text-success" : "text-danger")}>
            {margemLiquida.toFixed(1)}%
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DRE — {periodo.label}</CardTitle>
          <CardDescription>
            Demonstrativo do Resultado do Exercício · receita pelo que foi recebido na competência, despesas pelo que
            foi lançado no mês. A folha entra pela maior entre a lançada e a soma dos salários dos ativos, para um
            lançamento parcial não sumir com o custo do mês.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y border-y">
            {linhas.map((l, i) => {
              const isHeader = l.tipo === "receita" || l.tipo === "custo" || l.tipo === "despesa";
              const isSub = l.tipo === "subtotal";
              const isFinal = l.tipo === "resultado";
              const isInfo = l.tipo === "informativa";
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between py-2.5 text-sm",
                    isHeader && "font-semibold uppercase text-xs tracking-wide",
                    isSub && "font-bold bg-muted/40 px-2",
                    isFinal && "font-bold px-2 border-y-2",
                    isFinal && resultado >= 0 && "bg-success/10 text-success",
                    isFinal && resultado < 0 && "bg-danger/10 text-danger",
                    l.indent && "pl-6 text-muted-foreground",
                    isInfo && "text-xs italic"
                  )}
                >
                  <span>{l.rotulo}</span>
                  <span className={cn(l.valor < 0 && !isSub && !isFinal && "text-danger")}>
                    {formatBRL(l.valor)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
