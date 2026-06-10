import type { GrupoWhatsApp, MensagemWhatsApp } from "@/lib/types";
import { turmas } from "@/lib/mock-data/turmas";

export const gruposWhatsApp: GrupoWhatsApp[] = turmas.map((t, i) => ({
  id: `g${i + 1}`,
  turmaId: t.id,
  turmaNome: t.nome,
  totalMembros: t.totalAlunos + 2, // pais + professores
  ativo: true,
  ultimaMensagem:
    i % 3 === 0
      ? "Lembrete: amanhã passeio ao parque, levar agasalho."
      : i % 3 === 1
      ? "Reunião de pais quinta-feira às 19h."
      : "Boa noite, famílias!",
  dataUltimaMensagem: new Date(Date.now() - i * 1000 * 60 * 60 * 3).toISOString(),
}));

export const mensagensRecentes: MensagemWhatsApp[] = [
  {
    id: "msg1",
    grupoId: "g5",
    destinatario: "Grupo Jardim II - A",
    tipo: "Comunicado",
    assunto: "Reunião de pais",
    preview: "Boa noite! Reunião de pais será na quinta-feira (12/06) às 19h...",
    enviadaEm: "2026-06-08T19:42:00",
    status: "Lida",
  },
  {
    id: "msg2",
    destinatario: "Mariana Almeida",
    tipo: "Cobrança",
    assunto: "Mensalidade em atraso",
    preview: "Olá Mariana, identificamos que a mensalidade de junho ainda...",
    enviadaEm: "2026-06-08T14:30:00",
    status: "Entregue",
  },
  {
    id: "msg3",
    grupoId: "g7",
    destinatario: "Grupo 1º Ano - A",
    tipo: "Aviso",
    assunto: "Passeio ao Zoológico",
    preview: "Famílias, o passeio ao Zoológico será dia 20/06...",
    enviadaEm: "2026-06-08T10:15:00",
    status: "Lida",
  },
  {
    id: "msg4",
    grupoId: "g9",
    destinatario: "Grupo 2º Ano - A",
    tipo: "Evento",
    assunto: "Festa Junina da Escola",
    preview: "Famílias, neste sábado teremos nossa Festa Junina...",
    enviadaEm: "2026-06-07T16:20:00",
    status: "Lida",
  },
  {
    id: "msg5",
    destinatario: "Patrícia Costa",
    tipo: "Cobrança",
    assunto: "Renegociação de mensalidade",
    preview: "Patrícia, conforme conversamos, segue a proposta de renegociação...",
    enviadaEm: "2026-06-07T11:00:00",
    status: "Lida",
  },
];

export const templatesMensagens = [
  {
    id: "tpl1",
    nome: "Cobrança gentil — 1ª via",
    tipo: "Cobrança" as const,
    texto:
      "Olá, {{responsavel}}! Tudo bem? Identificamos que a mensalidade de {{competencia}} do(a) {{aluno}} ainda não foi quitada. Caso já tenha sido paga, favor desconsiderar.",
  },
  {
    id: "tpl2",
    nome: "Cobrança firme — 2ª via",
    tipo: "Cobrança" as const,
    texto:
      "Prezado(a) {{responsavel}}, a mensalidade de {{competencia}} do(a) {{aluno}} encontra-se em atraso há {{dias}} dias. Solicitamos a regularização ou contato com o financeiro.",
  },
  {
    id: "tpl3",
    nome: "Reunião de pais",
    tipo: "Comunicado" as const,
    texto:
      "Famílias da {{turma}}, lembramos que nossa reunião de pais será {{data}} às {{horario}}. Sua presença é fundamental!",
  },
  {
    id: "tpl4",
    nome: "Lembrete diário",
    tipo: "Aviso" as const,
    texto:
      "Boa noite, famílias da {{turma}}! Amanhã teremos {{atividade}}. Por favor, enviar {{material}}.",
  },
];
