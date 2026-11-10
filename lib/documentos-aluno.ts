/** Categorias fixas do arquivo de documentos do aluno (validadas na API). */
export const CATEGORIAS_DOCUMENTO = [
  "Certidão de nascimento",
  "RG",
  "CPF",
  "Comprovante de residência",
  "Carteira de vacinação",
  "Laudo/relatório médico",
  "Contrato",
  "Outro",
] as const;

export type CategoriaDocumento = (typeof CATEGORIAS_DOCUMENTO)[number];

export const TAMANHO_MAXIMO_DOCUMENTO = 10 * 1024 * 1024;

export interface DocumentoAluno {
  id: string;
  alunoId: string;
  categoria: string;
  descricao: string | null;
  arquivoUrl: string;
  mime: string;
  tamanhoBytes: number;
  enviadoPorNome: string;
  criadoEm: string;
}

export function formatarTamanho(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const texto = (valor: unknown): string => (typeof valor === "string" ? valor : String(valor ?? ""));

export function linhaParaDocumentoAluno(linha: Record<string, unknown>): DocumentoAluno {
  const descricao = typeof linha.descricao === "string" ? linha.descricao.trim() : "";
  // Duck-typing em vez de instanceof: o Date do driver pg pode vir de outro
  // realm (e nos testes via vm sempre vem).
  const criadoEm = linha.criado_em as { toISOString?: () => string } | string | null | undefined;
  return {
    id: texto(linha.id),
    alunoId: texto(linha.aluno_id),
    categoria: texto(linha.categoria),
    descricao: descricao || null,
    arquivoUrl: texto(linha.arquivo_url),
    mime: texto(linha.mime),
    tamanhoBytes: Number(linha.tamanho_bytes ?? 0) || 0,
    enviadoPorNome: texto(linha.enviado_por_nome),
    criadoEm:
      criadoEm && typeof criadoEm === "object" && typeof criadoEm.toISOString === "function"
        ? criadoEm.toISOString()
        : texto(criadoEm),
  };
}
