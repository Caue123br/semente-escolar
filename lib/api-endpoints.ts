/**
 * Lista central de endpoints da API.
 * Use isso ao invés de strings literais espalhadas.
 */
export const API = {
  // Auth
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  me: "/api/auth/me",
  paisLogin: "/api/auth/pais/login",
  paisLogout: "/api/auth/pais/logout",

  // Entidades
  alunos: "/api/alunos",
  aluno: (id: string) => `/api/alunos/${id}`,
  turmas: "/api/turmas",
  professores: "/api/professores",
  funcionarios: "/api/funcionarios",
  mensalidades: "/api/mensalidades",
  despesas: "/api/despesas",
  vendas: "/api/vendas",
  estoque: "/api/estoque",
  notasFiscais: "/api/notas-fiscais",
  patrimonio: "/api/patrimonio",
  reservas: "/api/reservas",
  transporte: "/api/transporte",
  cardapio: "/api/cardapio",
  eventos: "/api/eventos",
  mural: "/api/mural",
  bercario: "/api/bercario",
  biblioteca: "/api/biblioteca",
  kanban: "/api/kanban",
  frequencia: "/api/frequencia",
  crm: "/api/crm",
  avaliacoes: "/api/avaliacoes",
  solicitacoesDemo: "/api/solicitacoes-demo",

  // Comunicação
  conversas: "/api/conversas",
  conversa: (id: string) => `/api/conversas/${id}`,
  mensagens: (conversaId: string) => `/api/conversas/${conversaId}/mensagens`,
  whatsappWebhook: "/api/whatsapp/webhook",

  // Saúde + Recados
  intercorrencias: "/api/intercorrencias",
  recados: "/api/recados",

  // Admin / Sistema
  escola: "/api/escola",
  usuarios: "/api/usuarios",
  usuario: (id: string) => `/api/usuarios/${id}`,
  auditLogs: "/api/audit-logs",
  modulos: "/api/admin/modulos",
  exportar: "/api/exportar",
  lgpdSolicitacao: "/api/lgpd/solicitacao",
  uploadFotoAluno: "/api/upload/foto-aluno",
} as const;
