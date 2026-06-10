export interface RotaTransporte {
  id: string;
  nome: string;
  motorista: string;
  monitora: string;
  veiculo: string;
  placa: string;
  capacidade: number;
  alunosAtuais: number;
  bairros: string[];
  horarioSaida: string;
  horarioRetorno: string;
}

export const rotasTransporte: RotaTransporte[] = [
  { id: "r1", nome: "Rota 1 — Vila Mariana", motorista: "Sr. Roberto Andrade", monitora: "Dona Ivete Souza", veiculo: "Van Renault Master", placa: "ABC-1234", capacidade: 18, alunosAtuais: 14, bairros: ["Vila Mariana", "Vila Clementino"], horarioSaida: "06:40", horarioRetorno: "12:15" },
  { id: "r2", nome: "Rota 2 — Saúde/Aclimação", motorista: "Sr. Paulo Henrique", monitora: "Dona Lúcia Pereira", veiculo: "Van Iveco Daily", placa: "DEF-5678", capacidade: 20, alunosAtuais: 16, bairros: ["Saúde", "Aclimação", "Cambuci"], horarioSaida: "06:30", horarioRetorno: "12:20" },
  { id: "r3", nome: "Rota 3 — Ipiranga", motorista: "Sr. Antônio Lima", monitora: "Dona Marisa Costa", veiculo: "Van Mercedes Sprinter", placa: "GHI-9012", capacidade: 18, alunosAtuais: 11, bairros: ["Ipiranga", "Cursino"], horarioSaida: "06:35", horarioRetorno: "12:18" },
];

export const alunosTransportePorRota: Record<string, string[]> = {
  r1: ["a1", "a2", "a3", "a4", "a5", "a6", "a7"],
  r2: ["a8", "a9", "a10", "a11", "a12", "a13", "a14"],
  r3: ["a15", "a16", "a17", "a18", "a19", "a20"],
};
