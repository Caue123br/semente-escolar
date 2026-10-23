interface EnderecoResidencial {
  endereco?: string | null;
  numeroResidencia?: string | null;
}

/** Mantém endereços antigos inteiros e acrescenta o número apenas se informado. */
export function formatarEnderecoResidencial(dados: EnderecoResidencial): string {
  const endereco = dados.endereco?.trim() ?? "";
  const numero = dados.numeroResidencia?.trim() ?? "";
  return [endereco, numero ? `nº ${numero}` : ""].filter(Boolean).join(", ");
}
