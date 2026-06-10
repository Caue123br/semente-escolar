export interface RefeicaoDia {
  refeicao: "Café da manhã" | "Lanche da manhã" | "Almoço" | "Lanche da tarde" | "Jantar";
  itens: string[];
  caloriasAprox: number;
  observacoes?: string;
}

export interface DiaCardapio {
  data: string;
  diaSemana: string;
  refeicoes: RefeicaoDia[];
}

export const cardapioSemana: DiaCardapio[] = [
  {
    data: "2026-06-09",
    diaSemana: "Terça-feira",
    refeicoes: [
      { refeicao: "Café da manhã", itens: ["Leite com achocolatado", "Pão francês com manteiga", "Banana"], caloriasAprox: 380 },
      { refeicao: "Lanche da manhã", itens: ["Maçã fatiada", "Biscoito de polvilho"], caloriasAprox: 150 },
      { refeicao: "Almoço", itens: ["Arroz branco", "Feijão carioca", "Frango grelhado", "Brócolis ao vapor", "Salada de alface e tomate", "Suco natural de laranja"], caloriasAprox: 620 },
      { refeicao: "Lanche da tarde", itens: ["Iogurte natural", "Bolo simples caseiro"], caloriasAprox: 280 },
      { refeicao: "Jantar", itens: ["Macarrão integral ao alho e óleo", "Frango desfiado", "Beterraba cozida"], caloriasAprox: 480 },
    ],
  },
  {
    data: "2026-06-10",
    diaSemana: "Quarta-feira",
    refeicoes: [
      { refeicao: "Café da manhã", itens: ["Leite com café (descafeinado)", "Pão integral com queijo", "Mamão"], caloriasAprox: 360 },
      { refeicao: "Lanche da manhã", itens: ["Mexerica", "Pipoca natural"], caloriasAprox: 140 },
      { refeicao: "Almoço", itens: ["Arroz integral", "Feijão preto", "Carne moída refogada", "Cenoura cozida", "Salada de pepino", "Suco de uva"], caloriasAprox: 640 },
      { refeicao: "Lanche da tarde", itens: ["Vitamina de banana com aveia", "Pão de queijo"], caloriasAprox: 320 },
      { refeicao: "Jantar", itens: ["Sopa de legumes com macarrão", "Pão"], caloriasAprox: 380 },
    ],
  },
  {
    data: "2026-06-11",
    diaSemana: "Quinta-feira",
    refeicoes: [
      { refeicao: "Café da manhã", itens: ["Leite com achocolatado", "Pão francês com geleia", "Pera"], caloriasAprox: 370 },
      { refeicao: "Lanche da manhã", itens: ["Banana", "Bolacha de água e sal"], caloriasAprox: 160 },
      { refeicao: "Almoço", itens: ["Arroz", "Feijão", "Peixe assado", "Purê de batata", "Salada de cenoura ralada", "Suco de maracujá"], caloriasAprox: 600 },
      { refeicao: "Lanche da tarde", itens: ["Suco de frutas", "Pão de leite com requeijão"], caloriasAprox: 280 },
      { refeicao: "Jantar", itens: ["Risoto de legumes", "Salada verde"], caloriasAprox: 450 },
    ],
  },
  {
    data: "2026-06-12",
    diaSemana: "Sexta-feira",
    refeicoes: [
      { refeicao: "Café da manhã", itens: ["Iogurte", "Granola", "Frutas vermelhas"], caloriasAprox: 320 },
      { refeicao: "Lanche da manhã", itens: ["Maçã", "Castanhas"], caloriasAprox: 180 },
      { refeicao: "Almoço", itens: ["Lasanha de espinafre (feijoada light)", "Salada completa", "Suco de abacaxi com hortelã"], caloriasAprox: 650, observacoes: "Opção sem glúten disponível para 3 alunos" },
      { refeicao: "Lanche da tarde", itens: ["Bolo de cenoura com cobertura", "Leite"], caloriasAprox: 340 },
      { refeicao: "Jantar", itens: ["Wrap de frango com salada", "Suco"], caloriasAprox: 420 },
    ],
  },
];

export const restricoesAlimentares = [
  { aluno: "Sofia Almeida Souza", restricao: "Glúten e lactose", obs: "Trazer marmita ou usar opções da escola" },
  { aluno: "Manuela Costa Ribeiro", restricao: "Amendoim (anafilática)", obs: "ATENÇÃO: anafilaxia. Bombinha disponível na enfermaria." },
  { aluno: "Heitor Pereira Lima", restricao: "Frutos do mar", obs: "—" },
  { aluno: "Liz Cardoso Vasconcelos", restricao: "Lactose", obs: "Substituto: bebida vegetal" },
];
