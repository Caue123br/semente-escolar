export type EstagioFunil =
  | "Lead"
  | "Contato Inicial"
  | "Visita Agendada"
  | "Visita Realizada"
  | "Proposta"
  | "Matriculado"
  | "Perdido";

export interface Lead {
  id: string;
  nomeResponsavel: string;
  nomeCrianca: string;
  idadeCrianca: number;
  serieInteresse: string;
  telefone: string;
  email: string;
  origem: "Indicação" | "Instagram" | "Google Ads" | "Site" | "Outdoor" | "Walk-in";
  estagio: EstagioFunil;
  dataPrimeiroContato: string;
  proximaAcao: string;
  proximaData: string;
  responsavelComercial: string;
  valorPotencial: number;
  observacoes?: string;
}

export const leads: Lead[] = [
  { id: "ld1", nomeResponsavel: "Carolina Schmidt", nomeCrianca: "Luiza", idadeCrianca: 3, serieInteresse: "Maternal II", telefone: "(11) 96123-4567", email: "carolina.schmidt@gmail.com", origem: "Instagram", estagio: "Visita Agendada", dataPrimeiroContato: "2026-06-02", proximaAcao: "Visita guiada", proximaData: "2026-06-12", responsavelComercial: "Aline Camargo", valorPotencial: 2490 },
  { id: "ld2", nomeResponsavel: "Roberto Yamamoto", nomeCrianca: "Pedro", idadeCrianca: 5, serieInteresse: "Jardim II", telefone: "(11) 95234-5678", email: "roberto.yamamoto@uol.com.br", origem: "Indicação", estagio: "Proposta", dataPrimeiroContato: "2026-05-28", proximaAcao: "Follow-up proposta", proximaData: "2026-06-10", responsavelComercial: "Aline Camargo", valorPotencial: 2870 },
  { id: "ld3", nomeResponsavel: "Juliana Penteado", nomeCrianca: "Beatriz", idadeCrianca: 6, serieInteresse: "1º Ano", telefone: "(11) 94345-6789", email: "juliana.p@hotmail.com", origem: "Google Ads", estagio: "Visita Realizada", dataPrimeiroContato: "2026-06-04", proximaAcao: "Enviar proposta", proximaData: "2026-06-11", responsavelComercial: "Renata Andrade", valorPotencial: 2670 },
  { id: "ld4", nomeResponsavel: "Marcelo Tavares", nomeCrianca: "Lucas", idadeCrianca: 4, serieInteresse: "Jardim I", telefone: "(11) 93456-7890", email: "marcelo.t@empresa.com.br", origem: "Site", estagio: "Contato Inicial", dataPrimeiroContato: "2026-06-07", proximaAcao: "Ligar para qualificar", proximaData: "2026-06-10", responsavelComercial: "Aline Camargo", valorPotencial: 2870 },
  { id: "ld5", nomeResponsavel: "Patrícia Bittencourt", nomeCrianca: "Manoela", idadeCrianca: 2, serieInteresse: "Maternal I", telefone: "(11) 92567-8901", email: "patricia.b@gmail.com", origem: "Indicação", estagio: "Lead", dataPrimeiroContato: "2026-06-08", proximaAcao: "Primeiro contato", proximaData: "2026-06-09", responsavelComercial: "Aline Camargo", valorPotencial: 3240 },
  { id: "ld6", nomeResponsavel: "Eduarda Faria", nomeCrianca: "Henrique", idadeCrianca: 7, serieInteresse: "2º Ano", telefone: "(11) 91678-9012", email: "eduarda.faria@yahoo.com.br", origem: "Walk-in", estagio: "Matriculado", dataPrimeiroContato: "2026-05-20", proximaAcao: "—", proximaData: "—", responsavelComercial: "Renata Andrade", valorPotencial: 2670, observacoes: "Matriculado em 02/06. Início no 2º bimestre." },
  { id: "ld7", nomeResponsavel: "Felipe Rocha", nomeCrianca: "Olivia", idadeCrianca: 5, serieInteresse: "Jardim II", telefone: "(11) 90789-0123", email: "felipe.rocha@gmail.com", origem: "Indicação", estagio: "Perdido", dataPrimeiroContato: "2026-05-15", proximaAcao: "—", proximaData: "—", responsavelComercial: "Aline Camargo", valorPotencial: 2870, observacoes: "Família escolheu escola mais perto de casa." },
  { id: "ld8", nomeResponsavel: "Cristina Veloso", nomeCrianca: "João Pedro", idadeCrianca: 8, serieInteresse: "3º Ano", telefone: "(11) 99890-1234", email: "cristina.veloso@gmail.com", origem: "Instagram", estagio: "Lead", dataPrimeiroContato: "2026-06-09", proximaAcao: "Apresentar escola", proximaData: "2026-06-11", responsavelComercial: "Aline Camargo", valorPotencial: 2790 },
];

export const funilEstatisticas = {
  totalLeads: leads.length,
  novosMes: 6,
  visitasAgendadasMes: 8,
  matriculadosMes: 4,
  taxaConversao: 22,
  ticketMedio: 2820,
};
