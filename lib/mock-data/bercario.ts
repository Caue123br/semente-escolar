export interface BebeBercario {
  id: string;
  nome: string;
  idadeMeses: number;
  responsavel: string;
  professora: string;
}

export const bebesBercario: BebeBercario[] = [
  { id: "bb1", nome: "Antonella Cardoso", idadeMeses: 11, responsavel: "Renata Cardoso", professora: "Profa. Vanessa" },
  { id: "bb2", nome: "Gael Andrade", idadeMeses: 14, responsavel: "Larissa Andrade", professora: "Profa. Vanessa" },
  { id: "bb3", nome: "Helena Ribeiro", idadeMeses: 9, responsavel: "Camila Ribeiro", professora: "Profa. Vanessa" },
  { id: "bb4", nome: "Bento Lima", idadeMeses: 16, responsavel: "Patrícia Lima", professora: "Profa. Vanessa" },
  { id: "bb5", nome: "Aurora Souza", idadeMeses: 13, responsavel: "Aline Souza", professora: "Profa. Vanessa" },
  { id: "bb6", nome: "Davi Mendes", idadeMeses: 18, responsavel: "Daniela Mendes", professora: "Profa. Vanessa" },
  { id: "bb7", nome: "Liz Pereira", idadeMeses: 10, responsavel: "Mariana Pereira", professora: "Profa. Vanessa" },
  { id: "bb8", nome: "Theo Oliveira", idadeMeses: 17, responsavel: "Juliana Oliveira", professora: "Profa. Vanessa" },
];

export function getBebe(id: string): BebeBercario | undefined {
  return bebesBercario.find((b) => b.id === id);
}

export interface RegistroBercario {
  id: string;
  bebeId: string;
  data: string;
  hora: string;
  tipo: "Sono" | "Troca" | "Alimentação" | "Banho" | "Observação";
  detalhes: string;
  registradoPor: string;
}

export const registrosBercarioHoje: RegistroBercario[] = [
  { id: "b1", bebeId: "bb1", data: "2026-06-09", hora: "08:30", tipo: "Alimentação", detalhes: "Mamou 180ml de fórmula", registradoPor: "Profa. Vanessa" },
  { id: "b2", bebeId: "bb1", data: "2026-06-09", hora: "09:15", tipo: "Troca", detalhes: "Fralda — xixi", registradoPor: "Aux. Karina" },
  { id: "b3", bebeId: "bb1", data: "2026-06-09", hora: "10:00", tipo: "Sono", detalhes: "Dormiu por 1h20", registradoPor: "Profa. Vanessa" },
  { id: "b4", bebeId: "bb2", data: "2026-06-09", hora: "08:45", tipo: "Alimentação", detalhes: "Almoçou: papinha de batata-doce e frango", registradoPor: "Profa. Vanessa" },
  { id: "b5", bebeId: "bb2", data: "2026-06-09", hora: "09:30", tipo: "Troca", detalhes: "Fralda — coco normal", registradoPor: "Aux. Karina" },
  { id: "b6", bebeId: "bb2", data: "2026-06-09", hora: "11:00", tipo: "Banho", detalhes: "Banho rápido após comida", registradoPor: "Aux. Karina" },
  { id: "b7", bebeId: "bb3", data: "2026-06-09", hora: "09:00", tipo: "Observação", detalhes: "Bem-humorada, brincou bastante no parque interno", registradoPor: "Profa. Vanessa" },
  { id: "b8", bebeId: "bb3", data: "2026-06-09", hora: "10:30", tipo: "Sono", detalhes: "Soneca 40min", registradoPor: "Profa. Vanessa" },
  { id: "b9", bebeId: "bb4", data: "2026-06-09", hora: "09:45", tipo: "Alimentação", detalhes: "Tomou fruta amassada (banana + maçã)", registradoPor: "Aux. Karina" },
  { id: "b10", bebeId: "bb4", data: "2026-06-09", hora: "10:45", tipo: "Troca", detalhes: "Fralda — xixi", registradoPor: "Profa. Vanessa" },
  { id: "b11", bebeId: "bb5", data: "2026-06-09", hora: "11:30", tipo: "Sono", detalhes: "Dormindo desde 11h25", registradoPor: "Profa. Vanessa" },
  { id: "b12", bebeId: "bb6", data: "2026-06-09", hora: "08:50", tipo: "Observação", detalhes: "Chorou um pouco na chegada — acolhido com música", registradoPor: "Profa. Vanessa" },
];

export interface RotinaBercario {
  horario: string;
  atividade: string;
  cor: string;
}

export const rotinaBercario: RotinaBercario[] = [
  { horario: "07:00 - 08:00", atividade: "Acolhida e café da manhã", cor: "bg-amber-100 text-amber-700" },
  { horario: "08:00 - 09:00", atividade: "Atividades sensoriais", cor: "bg-blue-100 text-blue-700" },
  { horario: "09:00 - 09:30", atividade: "Lanche da manhã", cor: "bg-amber-100 text-amber-700" },
  { horario: "09:30 - 10:30", atividade: "Soneca da manhã", cor: "bg-purple-100 text-purple-700" },
  { horario: "10:30 - 11:30", atividade: "Música e movimento", cor: "bg-pink-100 text-pink-700" },
  { horario: "11:30 - 12:30", atividade: "Almoço", cor: "bg-amber-100 text-amber-700" },
  { horario: "12:30 - 14:00", atividade: "Banho e descanso", cor: "bg-cyan-100 text-cyan-700" },
  { horario: "14:00 - 15:00", atividade: "Soneca da tarde", cor: "bg-purple-100 text-purple-700" },
  { horario: "15:00 - 15:30", atividade: "Lanche da tarde", cor: "bg-amber-100 text-amber-700" },
  { horario: "15:30 - 17:00", atividade: "Brincadeiras livres e parque", cor: "bg-emerald-100 text-emerald-700" },
  { horario: "17:00 - 18:30", atividade: "Saída — entrega aos responsáveis", cor: "bg-slate-100 text-slate-700" },
];
