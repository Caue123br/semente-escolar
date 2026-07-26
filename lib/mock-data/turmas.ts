import type { Turma } from "@/lib/types";

// Turmas da Escola Modelo Taubaté.
// 5 séries de educação infantil: Mini Maternal → Maternal → Maternal 1 → Jardim → Pré
// Cada série tem 1 turma manhã e 1 turma tarde por padrão.
export const turmas: Turma[] = [
  // ===== MINI MATERNAL =====
  {
    id: "t-mm-m",
    nome: "Mini Maternal - Manhã",
    serie: "Mini Maternal",
    turno: "Manhã",
    professorId: "p1",
    professorNome: "Profa. Vanessa Oliveira",
    totalAlunos: 0,
    capacidade: 12,
    cor: "#fb923c",
  },
  {
    id: "t-mm-t",
    nome: "Mini Maternal - Tarde",
    serie: "Mini Maternal",
    turno: "Tarde",
    professorId: "p2",
    professorNome: "Profa. Carolina Ribeiro",
    totalAlunos: 0,
    capacidade: 12,
    cor: "#f97316",
  },

  // ===== MATERNAL =====
  {
    id: "t-m-m",
    nome: "Maternal - Manhã",
    serie: "Maternal",
    turno: "Manhã",
    professorId: "p3",
    professorNome: "Profa. Patrícia Lima",
    totalAlunos: 0,
    capacidade: 15,
    cor: "#facc15",
  },
  {
    id: "t-m-t",
    nome: "Maternal - Tarde",
    serie: "Maternal",
    turno: "Tarde",
    professorId: "p4",
    professorNome: "Profa. Beatriz Sousa",
    totalAlunos: 0,
    capacidade: 15,
    cor: "#eab308",
  },

  // ===== MATERNAL 1 =====
  {
    id: "t-m1-m",
    nome: "Maternal 1 - Manhã",
    serie: "Maternal 1",
    turno: "Manhã",
    professorId: "p5",
    professorNome: "Profa. Mariana Costa",
    totalAlunos: 0,
    capacidade: 18,
    cor: "#84cc16",
  },
  {
    id: "t-m1-t",
    nome: "Maternal 1 - Tarde",
    serie: "Maternal 1",
    turno: "Tarde",
    professorId: "p6",
    professorNome: "Profa. Renata Almeida",
    totalAlunos: 0,
    capacidade: 18,
    cor: "#22c55e",
  },

  // ===== JARDIM =====
  {
    id: "t-j-m",
    nome: "Jardim - Manhã",
    serie: "Jardim",
    turno: "Manhã",
    professorId: "p7",
    professorNome: "Profa. Cláudia Martins",
    totalAlunos: 0,
    capacidade: 20,
    cor: "#10b981",
  },
  {
    id: "t-j-t",
    nome: "Jardim - Tarde",
    serie: "Jardim",
    turno: "Tarde",
    professorId: "p8",
    professorNome: "Profa. Luciana Souza",
    totalAlunos: 0,
    capacidade: 20,
    cor: "#06b6d4",
  },

  // ===== PRÉ =====
  {
    id: "t-p-m",
    nome: "Pré - Manhã",
    serie: "Pré",
    turno: "Manhã",
    professorId: "p9",
    professorNome: "Profa. Adriana Ferreira",
    totalAlunos: 0,
    capacidade: 22,
    cor: "#3b82f6",
  },
  {
    id: "t-p-t",
    nome: "Pré - Tarde",
    serie: "Pré",
    turno: "Tarde",
    professorId: "p10",
    professorNome: "Profa. Fernanda Dias",
    totalAlunos: 0,
    capacidade: 22,
    cor: "#6366f1",
  },
];

// Turmas que o "Professor" logado vê (mock - assumimos professor de Jardim - Manhã)
export const turmasDoProfessor: string[] = ["t-j-m"];

export function getTurma(id: string): Turma | undefined {
  return turmas.find((t) => t.id === id);
}
