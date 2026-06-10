export type CargoFuncionario =
  | "Diretor"
  | "Coordenador Pedagógico"
  | "Professor"
  | "Auxiliar de Sala"
  | "Secretária"
  | "Cozinheira"
  | "Auxiliar de Limpeza"
  | "Porteiro"
  | "Psicopedagoga";

export interface Funcionario {
  id: string;
  nome: string;
  cargo: CargoFuncionario;
  cpf: string;
  email: string;
  telefone: string;
  admissao: string;
  salarioBruto: number;
  vinculo: "CLT" | "PJ" | "Estagiário";
  turmasAtuacao?: string[];
  status: "Ativo" | "Férias" | "Afastado" | "Desligado";
  foto?: string;
}

export const funcionarios: Funcionario[] = [
  { id: "f1", nome: "Renata Andrade", cargo: "Diretor", cpf: "111.111.111-11", email: "renata@semente.com.br", telefone: "(11) 99999-1111", admissao: "2018-01-15", salarioBruto: 14500, vinculo: "PJ", status: "Ativo" },
  { id: "f2", nome: "Cláudio Vasconcelos", cargo: "Coordenador Pedagógico", cpf: "222.222.222-22", email: "claudio@semente.com.br", telefone: "(11) 98888-2222", admissao: "2019-02-01", salarioBruto: 8900, vinculo: "CLT", status: "Ativo" },
  { id: "f3", nome: "Vanessa Oliveira", cargo: "Professor", cpf: "333.333.333-33", email: "vanessa@semente.com.br", telefone: "(11) 97777-3333", admissao: "2020-02-10", salarioBruto: 4800, vinculo: "CLT", turmasAtuacao: ["t1"], status: "Ativo" },
  { id: "f4", nome: "Carolina Ribeiro", cargo: "Professor", cpf: "444.444.444-44", email: "carolina@semente.com.br", telefone: "(11) 96666-4444", admissao: "2020-08-01", salarioBruto: 5200, vinculo: "CLT", turmasAtuacao: ["t2"], status: "Ativo" },
  { id: "f5", nome: "Patrícia Lima", cargo: "Professor", cpf: "555.555.555-55", email: "patricia@semente.com.br", telefone: "(11) 95555-5555", admissao: "2021-02-15", salarioBruto: 5400, vinculo: "CLT", turmasAtuacao: ["t3"], status: "Ativo" },
  { id: "f6", nome: "Beatriz Sousa", cargo: "Professor", cpf: "666.666.666-66", email: "beatriz@semente.com.br", telefone: "(11) 94444-6666", admissao: "2021-08-01", salarioBruto: 5600, vinculo: "CLT", turmasAtuacao: ["t4"], status: "Ativo" },
  { id: "f7", nome: "Mariana Costa", cargo: "Professor", cpf: "777.777.777-77", email: "mariana@semente.com.br", telefone: "(11) 93333-7777", admissao: "2019-02-01", salarioBruto: 6200, vinculo: "CLT", turmasAtuacao: ["t5"], status: "Ativo" },
  { id: "f8", nome: "Renata Almeida", cargo: "Professor", cpf: "888.888.888-88", email: "renata.a@semente.com.br", telefone: "(11) 92222-8888", admissao: "2022-01-15", salarioBruto: 5800, vinculo: "CLT", turmasAtuacao: ["t6"], status: "Férias" },
  { id: "f9", nome: "Cláudia Martins", cargo: "Professor", cpf: "999.999.999-99", email: "claudia@semente.com.br", telefone: "(11) 91111-9999", admissao: "2018-08-01", salarioBruto: 6800, vinculo: "CLT", turmasAtuacao: ["t7"], status: "Ativo" },
  { id: "f10", nome: "Rodrigo Pereira", cargo: "Professor", cpf: "121.212.121-21", email: "rodrigo@semente.com.br", telefone: "(11) 90000-1010", admissao: "2022-08-01", salarioBruto: 6400, vinculo: "CLT", turmasAtuacao: ["t8"], status: "Ativo" },
  { id: "f11", nome: "Luciana Souza", cargo: "Professor", cpf: "131.313.131-31", email: "luciana@semente.com.br", telefone: "(11) 90000-1011", admissao: "2017-02-01", salarioBruto: 7200, vinculo: "CLT", turmasAtuacao: ["t9"], status: "Ativo" },
  { id: "f12", nome: "Adriana Ferreira", cargo: "Professor", cpf: "141.414.141-41", email: "adriana@semente.com.br", telefone: "(11) 90000-1012", admissao: "2018-02-01", salarioBruto: 7400, vinculo: "CLT", turmasAtuacao: ["t10"], status: "Ativo" },
  { id: "f13", nome: "Eduardo Santos", cargo: "Professor", cpf: "151.515.151-51", email: "eduardo@semente.com.br", telefone: "(11) 90000-1013", admissao: "2019-08-01", salarioBruto: 7000, vinculo: "CLT", turmasAtuacao: ["t11"], status: "Ativo" },
  { id: "f14", nome: "Fernanda Dias", cargo: "Professor", cpf: "161.616.161-61", email: "fernanda@semente.com.br", telefone: "(11) 90000-1014", admissao: "2016-02-01", salarioBruto: 7600, vinculo: "CLT", turmasAtuacao: ["t12"], status: "Ativo" },
  { id: "f15", nome: "Karina Lopes", cargo: "Auxiliar de Sala", cpf: "171.717.171-71", email: "karina@semente.com.br", telefone: "(11) 90000-1015", admissao: "2023-02-01", salarioBruto: 2400, vinculo: "CLT", status: "Ativo" },
  { id: "f16", nome: "Pedro Augusto", cargo: "Auxiliar de Sala", cpf: "181.818.181-81", email: "pedro@semente.com.br", telefone: "(11) 90000-1016", admissao: "2023-08-01", salarioBruto: 2400, vinculo: "CLT", status: "Ativo" },
  { id: "f17", nome: "Aline Camargo", cargo: "Secretária", cpf: "191.919.191-91", email: "secretaria@semente.com.br", telefone: "(11) 90000-1017", admissao: "2021-02-01", salarioBruto: 3800, vinculo: "CLT", status: "Ativo" },
  { id: "f18", nome: "Dona Marlene", cargo: "Cozinheira", cpf: "212.121.212-12", email: "—", telefone: "(11) 90000-1018", admissao: "2018-02-01", salarioBruto: 2800, vinculo: "CLT", status: "Ativo" },
  { id: "f19", nome: "Sandra Lima", cargo: "Auxiliar de Limpeza", cpf: "222.222.323-23", email: "—", telefone: "(11) 90000-1019", admissao: "2020-04-01", salarioBruto: 1900, vinculo: "CLT", status: "Ativo" },
  { id: "f20", nome: "Seu Joaquim", cargo: "Porteiro", cpf: "232.323.434-34", email: "—", telefone: "(11) 90000-1020", admissao: "2017-09-01", salarioBruto: 2100, vinculo: "CLT", status: "Ativo" },
  { id: "f21", nome: "Dra. Bianca Soares", cargo: "Psicopedagoga", cpf: "242.424.545-45", email: "bianca@semente.com.br", telefone: "(11) 90000-1021", admissao: "2022-02-01", salarioBruto: 5500, vinculo: "PJ", status: "Ativo" },
];

export const totalFolhaBruta = funcionarios.reduce((a, f) => a + f.salarioBruto, 0);
export const totalEncargos = totalFolhaBruta * 0.32; // INSS, FGTS, etc
export const totalFolhaLiquida = totalFolhaBruta * 0.78;
