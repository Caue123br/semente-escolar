export interface Despesa {
  id: string;
  data: string;
  descricao: string;
  categoria:
    | "Folha"
    | "Aluguel"
    | "Energia"
    | "Água"
    | "Internet"
    | "Alimentação"
    | "Limpeza"
    | "Material Pedagógico"
    | "Marketing"
    | "Impostos"
    | "Manutenção"
    | "Outros";
  valor: number;
  status: "Paga" | "A Pagar" | "Atrasada";
  fornecedor: string;
  formaPagamento?: "Pix" | "Boleto" | "Cartão" | "Transferência";
}

export const despesas: Despesa[] = [
  { id: "d1", data: "2026-06-05", descricao: "Folha de pagamento — Junho", categoria: "Folha", valor: 124800, status: "Paga", fornecedor: "Equipe", formaPagamento: "Transferência" },
  { id: "d2", data: "2026-06-10", descricao: "Aluguel imóvel matriz", categoria: "Aluguel", valor: 18500, status: "A Pagar", fornecedor: "Imobiliária Centro" },
  { id: "d3", data: "2026-06-08", descricao: "Energia elétrica", categoria: "Energia", valor: 4320, status: "A Pagar", fornecedor: "ENEL" },
  { id: "d4", data: "2026-06-08", descricao: "Conta de água", categoria: "Água", valor: 980, status: "A Pagar", fornecedor: "SABESP" },
  { id: "d5", data: "2026-06-05", descricao: "Internet fibra 1Gbps", categoria: "Internet", valor: 599, status: "Paga", fornecedor: "Vivo Fibra", formaPagamento: "Boleto" },
  { id: "d6", data: "2026-06-07", descricao: "Compra mensal alimentos", categoria: "Alimentação", valor: 8430, status: "Paga", fornecedor: "Distribuidora Bom Preço", formaPagamento: "Pix" },
  { id: "d7", data: "2026-06-03", descricao: "Material limpeza", categoria: "Limpeza", valor: 1240, status: "Paga", fornecedor: "Atacadão Central", formaPagamento: "Pix" },
  { id: "d8", data: "2026-06-12", descricao: "Material pedagógico — 2º bim", categoria: "Material Pedagógico", valor: 3680, status: "A Pagar", fornecedor: "Papelaria Escolar Plus" },
  { id: "d9", data: "2026-06-15", descricao: "Anúncios Instagram + Google", categoria: "Marketing", valor: 2400, status: "A Pagar", fornecedor: "Agência Plural" },
  { id: "d10", data: "2026-06-20", descricao: "Simples Nacional + ISS", categoria: "Impostos", valor: 14200, status: "A Pagar", fornecedor: "Receita Federal" },
  { id: "d11", data: "2026-06-04", descricao: "Manutenção ar-condicionado", categoria: "Manutenção", valor: 820, status: "Paga", fornecedor: "Refrigeração SP", formaPagamento: "Pix" },
  { id: "d12", data: "2026-05-30", descricao: "Pintura sala de aula", categoria: "Manutenção", valor: 3100, status: "Atrasada", fornecedor: "João Reformas" },
];

export const totalDespesasMes = despesas.reduce((a, b) => a + b.valor, 0);
export const totalDespesasPagas = despesas.filter((d) => d.status === "Paga").reduce((a, b) => a + b.valor, 0);
export const totalDespesasAPagar = despesas.filter((d) => d.status === "A Pagar").reduce((a, b) => a + b.valor, 0);
