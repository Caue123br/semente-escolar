export interface Livro {
  id: string;
  titulo: string;
  autor: string;
  isbn: string;
  categoria: "Infantil" | "Didático" | "Literário" | "Pedagógico" | "Quadrinhos";
  faixaEtaria: string;
  exemplares: number;
  disponiveis: number;
  emprestados: number;
}

export const livros: Livro[] = [
  { id: "lv1", titulo: "O Pequeno Príncipe", autor: "Antoine de Saint-Exupéry", isbn: "978-8574067394", categoria: "Literário", faixaEtaria: "8+", exemplares: 8, disponiveis: 5, emprestados: 3 },
  { id: "lv2", titulo: "A Bolsa Amarela", autor: "Lygia Bojunga", isbn: "978-8501062239", categoria: "Literário", faixaEtaria: "9+", exemplares: 6, disponiveis: 4, emprestados: 2 },
  { id: "lv3", titulo: "Reinações de Narizinho", autor: "Monteiro Lobato", isbn: "978-8525044464", categoria: "Literário", faixaEtaria: "7+", exemplares: 10, disponiveis: 7, emprestados: 3 },
  { id: "lv4", titulo: "Marcelo, Marmelo, Martelo", autor: "Ruth Rocha", isbn: "978-8532287618", categoria: "Infantil", faixaEtaria: "5+", exemplares: 12, disponiveis: 9, emprestados: 3 },
  { id: "lv5", titulo: "Bom-Dia, Todas as Cores!", autor: "Ruth Rocha", isbn: "978-8506069257", categoria: "Infantil", faixaEtaria: "4+", exemplares: 10, disponiveis: 8, emprestados: 2 },
  { id: "lv6", titulo: "A Casa Sonolenta", autor: "Audrey Wood", isbn: "978-8516068011", categoria: "Infantil", faixaEtaria: "3+", exemplares: 8, disponiveis: 5, emprestados: 3 },
  { id: "lv7", titulo: "O Menino Maluquinho", autor: "Ziraldo", isbn: "978-8579308352", categoria: "Quadrinhos", faixaEtaria: "8+", exemplares: 15, disponiveis: 10, emprestados: 5 },
  { id: "lv8", titulo: "Coleção Folclore Brasileiro", autor: "Vários", isbn: "978-8506074626", categoria: "Pedagógico", faixaEtaria: "Todas", exemplares: 6, disponiveis: 4, emprestados: 2 },
  { id: "lv9", titulo: "Como Trabalhar a Psicogênese (BNCC)", autor: "Telma Weisz", isbn: "978-8525040000", categoria: "Pedagógico", faixaEtaria: "Educadores", exemplares: 4, disponiveis: 3, emprestados: 1 },
  { id: "lv10", titulo: "ABC e Outros Risquinhos", autor: "Ana Maria Machado", isbn: "978-8506074000", categoria: "Infantil", faixaEtaria: "5+", exemplares: 10, disponiveis: 8, emprestados: 2 },
];

export interface Emprestimo {
  id: string;
  livroId: string;
  alunoNome: string;
  turma: string;
  dataEmprestimo: string;
  dataDevolucaoPrevista: string;
  status: "Em andamento" | "Devolvido" | "Atrasado";
}

export const emprestimosAtivos: Emprestimo[] = [
  { id: "emp1", livroId: "lv1", alunoNome: "Maria Júlia Dias Castro", turma: "2º Ano - A", dataEmprestimo: "2026-06-02", dataDevolucaoPrevista: "2026-06-12", status: "Em andamento" },
  { id: "emp2", livroId: "lv7", alunoNome: "Gael Moraes Pacheco", turma: "3º Ano - A", dataEmprestimo: "2026-05-28", dataDevolucaoPrevista: "2026-06-07", status: "Atrasado" },
  { id: "emp3", livroId: "lv3", alunoNome: "Isabella Nogueira Castro", turma: "4º Ano - A", dataEmprestimo: "2026-06-05", dataDevolucaoPrevista: "2026-06-15", status: "Em andamento" },
  { id: "emp4", livroId: "lv4", alunoNome: "Sofia Almeida Souza", turma: "Jardim II - A", dataEmprestimo: "2026-06-03", dataDevolucaoPrevista: "2026-06-13", status: "Em andamento" },
  { id: "emp5", livroId: "lv2", alunoNome: "Enzo Magalhães Brito", turma: "5º Ano - A", dataEmprestimo: "2026-06-01", dataDevolucaoPrevista: "2026-06-11", status: "Em andamento" },
];
