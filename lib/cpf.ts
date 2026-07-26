/**
 * Validação e formatação de CPF brasileiro.
 */

export function limparCPF(cpf: string): string {
  return (cpf ?? "").replace(/\D/g, "");
}

export function formatarCPF(cpf: string): string {
  const limpo = limparCPF(cpf).slice(0, 11);
  if (limpo.length <= 3) return limpo;
  if (limpo.length <= 6) return `${limpo.slice(0, 3)}.${limpo.slice(3)}`;
  if (limpo.length <= 9) return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6)}`;
  return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9)}`;
}

export function validarCPF(cpf: string): boolean {
  const limpo = limparCPF(cpf);
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false; // 11111111111, 00000000000, etc

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(limpo[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(limpo[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(limpo[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(limpo[10], 10);
}

export function formatarTelefone(tel: string): string {
  const limpo = (tel ?? "").replace(/\D/g, "").slice(0, 11);
  if (limpo.length <= 2) return limpo;
  if (limpo.length <= 6) return `(${limpo.slice(0, 2)}) ${limpo.slice(2)}`;
  if (limpo.length <= 10) return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
}

export function validarTelefone(tel: string): boolean {
  const limpo = (tel ?? "").replace(/\D/g, "");
  return limpo.length === 10 || limpo.length === 11;
}

export function buscarCEP(cep: string): Promise<{
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
} | null> {
  const limpo = (cep ?? "").replace(/\D/g, "");
  if (limpo.length !== 8) return Promise.resolve(null);
  return fetch(`https://viacep.com.br/ws/${limpo}/json/`)
    .then((r) => r.json())
    .then((data) => (data.erro ? null : data))
    .catch(() => null);
}

export function formatarCEP(cep: string): string {
  const limpo = (cep ?? "").replace(/\D/g, "").slice(0, 8);
  if (limpo.length <= 5) return limpo;
  return `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
}
