/**
 * Converte erros técnicos em mensagens claras pro usuário final.
 */
export function formatarErro(e: unknown): string {
  if (!e) return "Erro desconhecido";
  if (typeof e === "string") return mensagemAmigavel(e);
  if (e instanceof Error) return mensagemAmigavel(e.message);
  if (typeof e === "object" && "error" in e && typeof (e as { error: unknown }).error === "string") {
    return mensagemAmigavel((e as { error: string }).error);
  }
  return "Erro inesperado. Tente de novo.";
}

function mensagemAmigavel(s: string): string {
  const lower = s.toLowerCase();
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Sem conexão. Verifique a internet.";
  }
  if (lower.includes("401") || lower.includes("não autenticado") || lower.includes("unauthorized")) {
    return "Sua sessão expirou. Faça login de novo.";
  }
  if (lower.includes("403") || lower.includes("forbidden")) {
    return "Você não tem permissão pra essa ação.";
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return "Item não encontrado.";
  }
  if (lower.includes("duplicate") || lower.includes("unique constraint")) {
    return "Esse item já existe.";
  }
  if (lower.includes("violates check constraint")) {
    return "Dados inválidos. Verifique os valores.";
  }
  if (lower.includes("foreign key")) {
    return "Esse item está sendo usado em outro lugar. Não dá pra apagar.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Demorou demais. Tente de novo.";
  }
  if (lower.includes("500") || lower.includes("internal server")) {
    return "Erro no servidor. Tente em alguns segundos.";
  }
  // Mensagens em português já amigáveis passam direto
  if (/[áéíóúçãõ]/.test(s) && s.length < 200) return s;
  // Mensagens curtas em inglês não traduzidas
  if (s.length < 100 && !lower.includes("error")) return s;
  return "Erro inesperado. Tente de novo.";
}
