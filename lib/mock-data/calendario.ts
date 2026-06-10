export type TipoEvento =
  | "Aula"
  | "Reunião"
  | "Festa"
  | "Passeio"
  | "Avaliação"
  | "Feriado"
  | "Recesso"
  | "Formação Docente"
  | "Visita"
  | "Outros";

export interface EventoCalendario {
  id: string;
  titulo: string;
  data: string;
  horaInicio?: string;
  horaFim?: string;
  tipo: TipoEvento;
  local?: string;
  turmas?: string[];
  responsavel?: string;
  descricao?: string;
}

export const eventos: EventoCalendario[] = [
  { id: "ev1", titulo: "Festa Junina da Escola", data: "2026-06-22", horaInicio: "10:00", horaFim: "16:00", tipo: "Festa", local: "Pátio principal", responsavel: "Coordenação geral", descricao: "Quadrilha, comidas típicas, barracas. Aberto às famílias." },
  { id: "ev2", titulo: "Reunião de pais — 2º bimestre", data: "2026-06-12", horaInicio: "19:00", horaFim: "21:00", tipo: "Reunião", local: "Auditório", responsavel: "Cláudio Vasconcelos", turmas: ["t5", "t6", "t7", "t8"] },
  { id: "ev3", titulo: "Passeio Zoológico — 1º Ano", data: "2026-06-19", horaInicio: "08:00", horaFim: "17:00", tipo: "Passeio", local: "Zoológico de São Paulo", turmas: ["t7", "t8"], responsavel: "Profa. Cláudia Martins" },
  { id: "ev4", titulo: "Conselho de Classe", data: "2026-06-26", horaInicio: "13:00", horaFim: "17:00", tipo: "Reunião", local: "Sala de coordenação", responsavel: "Coordenação" },
  { id: "ev5", titulo: "Corpus Christi", data: "2026-06-04", tipo: "Feriado" },
  { id: "ev6", titulo: "Avaliação Bimestral — Português", data: "2026-06-18", horaInicio: "08:00", tipo: "Avaliação", turmas: ["t7", "t8", "t9", "t10", "t11", "t12"] },
  { id: "ev7", titulo: "Avaliação Bimestral — Matemática", data: "2026-06-20", horaInicio: "08:00", tipo: "Avaliação", turmas: ["t7", "t8", "t9", "t10", "t11", "t12"] },
  { id: "ev8", titulo: "Formação Pedagógica — BNCC", data: "2026-06-14", horaInicio: "09:00", horaFim: "16:00", tipo: "Formação Docente", responsavel: "Cláudio Vasconcelos", local: "Auditório" },
  { id: "ev9", titulo: "Visita técnica — Bombeiros", data: "2026-06-11", tipo: "Visita", turmas: ["t5", "t6"], responsavel: "Mariana Costa" },
  { id: "ev10", titulo: "Recesso escolar — meio do ano", data: "2026-07-13", tipo: "Recesso", descricao: "13/07 a 24/07" },
  { id: "ev11", titulo: "Festa Dia dos Pais", data: "2026-08-08", tipo: "Festa", local: "Pátio principal" },
  { id: "ev12", titulo: "Sarau Literário", data: "2026-06-27", horaInicio: "15:00", tipo: "Festa", local: "Biblioteca" },
];
