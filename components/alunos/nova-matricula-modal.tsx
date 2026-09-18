"use client";

import * as React from "react";
import {
  UserPlus,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  GraduationCap,
  Users,
  Heart,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputCPF, InputTelefone, InputCEP } from "@/components/shared/campos-mascarados";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useToast } from "@/lib/toast";
import { usePerfil } from "@/lib/perfil-context";
import { cn, formatDateBR, formatDateLocalISO, formatRelative } from "@/lib/utils";
import { limparCPF, validarCPF, validarTelefone } from "@/lib/cpf";
import {
  ErroApi,
  apagarRascunhoMatricula,
  RASCUNHO_MATRICULA_CHAVE,
  RASCUNHO_MATRICULA_CHAVE_ANTIGA,
  type OpcoesEscrita,
} from "@/lib/data/store";
import type { Aluno, Responsavel, PessoaAutorizada, FichaSaude, Turma } from "@/lib/types";

/** Pré-preenchimento vindo de outra tela (ex.: lead do CRM virando matrícula). */
export interface DadosIniciaisMatricula {
  nome?: string;
  dataNascimento?: string;
  responsaveis?: Array<{ nome: string; telefone?: string; email?: string; cpf?: string }>;
}

interface Props {
  aberto: boolean;
  onClose: () => void;
  turmas: Turma[];
  onSalvar: (aluno: Aluno, opcoes: OpcoesEscrita) => Promise<unknown>;
  dadosIniciais?: DadosIniciaisMatricula;
  /**
   * Chamado quando a secretária retoma um rascunho por cima do
   * pré-preenchimento: o formulário passou a ser de outra criança, então a tela
   * de origem (ex.: o lead do CRM) precisa soltar o vínculo para não registrar
   * a matrícula de uma criança no cadastro de outra família.
   */
  onDesvincularOrigem?: () => void;
}

type PassoNumero = 1 | 2 | 3 | 4 | 5 | 6;

const PASSOS: { id: PassoNumero; titulo: string; icone: React.ComponentType<{ className?: string }> }[] = [
  { id: 1, titulo: "Aluno", icone: GraduationCap },
  { id: 2, titulo: "Pai", icone: UserPlus },
  { id: 3, titulo: "Mãe", icone: UserPlus },
  { id: 4, titulo: "Autorizados", icone: Users },
  { id: 5, titulo: "Saúde", icone: Heart },
  { id: 6, titulo: "Conclusão", icone: Check },
];

/**
 * Rascunho local: protege a digitação de refresh/queda, nunca substitui o banco.
 * Fica sob o prefixo "semente:data:" (o mesmo que resetTudo() varre), vale só
 * para o usuário que o escreveu, dura poucas horas e NÃO guarda a ficha de
 * saúde — dado de saúde de criança não vai para o disco do computador da
 * secretaria só para evitar redigitação.
 * As chaves e o apagador vivem em lib/data/store.ts: o logout também apaga.
 */
const RASCUNHO_VALIDADE_MS = 2 * 60 * 60 * 1000;
const RASCUNHO_VALIDADE_TEXTO = "2 horas";
const IDADE_MAXIMA_ANOS = 25;
const MATRICULA_RETROATIVA_ANOS = 5;

type Erros = Record<string, string>;

interface ResponsavelForm {
  nome: string;
  rg: string;
  cpf: string;
  profissao: string;
  localTrabalho: string;
  dataNascimento: string;
  telefone: string;
  email: string;
  responsavelFinanceiro: boolean;
}

interface AlunoForm {
  nome: string;
  dataNascimento: string;
  sexo: "M" | "F" | "";
  cpf: string;
  rg: string;
  ra: string;
  raca: string;
  naturalDe: string;
  estado: string;
  cep: string;
  endereco: string;
  bairro: string;
  telefoneAluno: string;
  turmaId: string;
  bilingue: boolean;
  religiao: string;
  escolaAnteriorNome: string;
  escolaAnteriorTempo: string;
  dataMatricula: string;
}

interface CandidatoDuplicata {
  id: string;
  nome: string;
  dataNascimento: string;
  turmaId: string;
}

/** Feedback do autofill de CEP: "aviso" carrega a mensagem que a API devolveu. */
interface CepStatus {
  estado: "vazio" | "buscando" | "ok" | "aviso";
  detalhe?: string;
}

type Conflito =
  | { tipo: "duplicata"; mensagem: string; candidatos: CandidatoDuplicata[] }
  | { tipo: "lotacao"; mensagem: string; ocupacao: number; capacidade: number; turmaNome: string };

interface Rascunho {
  salvoEm: number;
  /** Quem digitou. Rascunho de outro usuário não é oferecido nem lido. */
  dono: string;
  chave: string;
  passo: PassoNumero;
  aluno: AlunoForm;
  pai: ResponsavelForm;
  mae: ResponsavelForm;
  autorizadas: PessoaAutorizada[];
}

function novoResponsavel(): ResponsavelForm {
  return {
    nome: "",
    rg: "",
    cpf: "",
    profissao: "",
    localTrabalho: "",
    dataNascimento: "",
    telefone: "",
    email: "",
    responsavelFinanceiro: false,
  };
}

function novaFichaSaude(): FichaSaude {
  return {
    doencas: {},
    doencasOutras: "",
    desmaioSim: false,
    desmaioMotivo: "",
    internadoSim: false,
    internadoMotivo: "",
    alergias: "",
    tratamentoMedicoSim: false,
    tratamentoMotivo: "",
    traumaFobia: "",
    medicamentoFebreSim: false,
    medicamentoFebreQual: "",
    medicoNome: "",
    medicoTelefone: "",
    convenioSim: false,
    convenioQual: "",
    informacoesComplementares: "",
  };
}

function novoAlunoForm(turmaId: string): AlunoForm {
  return {
    nome: "",
    dataNascimento: "",
    sexo: "",
    cpf: "",
    rg: "",
    ra: "",
    raca: "",
    naturalDe: "",
    estado: "SP",
    cep: "",
    endereco: "",
    bairro: "",
    telefoneAluno: "",
    turmaId,
    bilingue: false,
    religiao: "",
    escolaAnteriorNome: "",
    escolaAnteriorTempo: "",
    dataMatricula: formatDateLocalISO(),
  };
}

function autorizadasVazias(): PessoaAutorizada[] {
  return Array.from({ length: 5 }, () => ({ nome: "", parentesco: "" }));
}

function normalizarAutorizadas(lista: unknown): PessoaAutorizada[] {
  const base = autorizadasVazias();
  if (!Array.isArray(lista)) return base;
  lista.slice(0, 5).forEach((item, i) => {
    const p = (item ?? {}) as Partial<PessoaAutorizada>;
    base[i] = { nome: String(p.nome ?? ""), parentesco: String(p.parentesco ?? "") };
  });
  return base;
}

function novaChaveIdempotencia(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `matricula-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Data limite mais antiga aceitável, em YYYY-MM-DD (comparação de string basta em ISO). */
function recuarAnos(isoHoje: string, anos: number): string {
  return `${Number(isoHoje.slice(0, 4)) - anos}${isoHoje.slice(4)}`;
}

function responsavelPreenchido(r: ResponsavelForm): boolean {
  return Boolean(
    r.nome.trim() || r.cpf.trim() || r.telefone.trim() || r.email.trim() || r.rg.trim() ||
    r.profissao.trim() || r.localTrabalho.trim() || r.dataNascimento
  );
}

function fichaSaudePreenchida(f: FichaSaude): boolean {
  const doencas = f.doencas ?? {};
  if (Object.values(doencas).some((v) => (typeof v === "string" ? v.trim() !== "" : Boolean(v)))) return true;
  const textos = [
    f.doencasOutras, f.desmaioMotivo, f.internadoMotivo, f.alergias, f.tratamentoMotivo,
    f.traumaFobia, f.medicamentoFebreQual, f.medicoNome, f.medicoTelefone, f.convenioQual,
    f.informacoesComplementares,
  ];
  if (textos.some((t) => (t ?? "").trim() !== "")) return true;
  return Boolean(
    f.desmaioSim || f.internadoSim || f.tratamentoMedicoSim || f.medicamentoFebreSim || f.convenioSim
  );
}

function emailValido(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/** Rascunho só volta para quem digitou: outro dono é apagado na hora da leitura. */
function lerRascunho(dono: string): Rascunho | null {
  if (typeof window === "undefined" || !dono) return null;
  try {
    const bruto = window.localStorage.getItem(RASCUNHO_MATRICULA_CHAVE);
    if (!bruto) return null;
    const r = JSON.parse(bruto) as Partial<Rascunho>;
    if (!r || typeof r !== "object" || typeof r.salvoEm !== "number") {
      apagarRascunhoMatricula();
      return null;
    }
    if (r.dono !== dono || Date.now() - r.salvoEm > RASCUNHO_VALIDADE_MS) {
      apagarRascunhoMatricula();
      return null;
    }
    if (!r.aluno || typeof r.aluno !== "object") {
      apagarRascunhoMatricula();
      return null;
    }
    const passo = Number(r.passo);
    return {
      salvoEm: r.salvoEm,
      dono,
      chave: typeof r.chave === "string" ? r.chave : "",
      passo: passo >= 1 && passo <= 6 ? (passo as PassoNumero) : 1,
      aluno: { ...novoAlunoForm(""), ...r.aluno },
      pai: { ...novoResponsavel(), ...(r.pai ?? {}) },
      mae: { ...novoResponsavel(), ...(r.mae ?? {}) },
      autorizadas: normalizarAutorizadas(r.autorizadas),
    };
  } catch {
    apagarRascunhoMatricula();
    return null;
  }
}

/**
 * Rascunho vencido, corrompido ou da versão antiga sai do computador da
 * secretaria mesmo que a matrícula não seja reaberta — ele guarda CPF e
 * endereço de criança. Rodada na abertura da tela de alunos.
 */
export function limparRascunhoMatriculaVencido() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RASCUNHO_MATRICULA_CHAVE_ANTIGA);
    const bruto = window.localStorage.getItem(RASCUNHO_MATRICULA_CHAVE);
    if (!bruto) return;
    const r = JSON.parse(bruto) as { salvoEm?: number; dono?: unknown };
    if (
      typeof r?.salvoEm !== "number" ||
      typeof r?.dono !== "string" ||
      Date.now() - r.salvoEm > RASCUNHO_VALIDADE_MS
    ) {
      apagarRascunhoMatricula();
    }
  } catch {
    apagarRascunhoMatricula();
  }
}


function candidatosDoPayload(payload: Record<string, unknown>): CandidatoDuplicata[] {
  const brutos = Array.isArray(payload.candidatos) ? payload.candidatos : [];
  return brutos.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const c = item as Record<string, unknown>;
    if (typeof c.id !== "string" || typeof c.nome !== "string") return [];
    return [{
      id: c.id,
      nome: c.nome,
      dataNascimento: typeof c.dataNascimento === "string" ? c.dataNascimento : "",
      turmaId: typeof c.turmaId === "string" ? c.turmaId : "",
    }];
  });
}

function numeroDoPayload(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Ficha que este mesmo envio já havia gravado, quando o que foi digitado agora
 * é de outra criança (resposta 200 com avisoDadosDivergentes).
 */
interface FichaJaSalva {
  id: string;
  nome: string;
  dataNascimento: string;
}

function fichaJaSalvaDoPayload(payload: Record<string, unknown>): FichaJaSalva {
  const item = (payload.item ?? {}) as Record<string, unknown>;
  return {
    id: typeof item.id === "string" ? item.id : "",
    nome: typeof item.nome === "string" ? item.nome : "",
    dataNascimento: typeof item.dataNascimento === "string" ? item.dataNascimento : "",
  };
}

export function NovaMatriculaModal({
  aberto,
  onClose,
  turmas,
  onSalvar,
  dadosIniciais,
  onDesvincularOrigem,
}: Props) {
  const toast = useToast();
  const { nome: nomeUsuario, perfil, carregando: carregandoPerfil } = usePerfil();
  // Dono do rascunho: vazio enquanto a sessão não carregou (nada é lido nem gravado).
  const donoRascunho = carregandoPerfil ? "" : `${perfil}:${nomeUsuario}`;
  const [passo, setPasso] = React.useState<PassoNumero>(1);
  const [salvando, setSalvando] = React.useState(false);
  const [erros, setErros] = React.useState<Erros>({});

  const [aluno, setAluno] = React.useState<AlunoForm>(() => novoAlunoForm(""));
  const [pai, setPai] = React.useState<ResponsavelForm>(novoResponsavel);
  const [mae, setMae] = React.useState<ResponsavelForm>(novoResponsavel);
  const [autorizadas, setAutorizadas] = React.useState<PessoaAutorizada[]>(autorizadasVazias);
  const [saude, setSaude] = React.useState<FichaSaude>(novaFichaSaude);

  // Mesma chave em toda retentativa do mesmo preenchimento: o retry não cria outra ficha.
  const [chaveIdempotencia, setChaveIdempotencia] = React.useState("");
  const [confirmacoes, setConfirmacoes] = React.useState({ duplicata: false, lotacao: false });
  const [conflito, setConflito] = React.useState<Conflito | null>(null);
  const [jaSalva, setJaSalva] = React.useState<FichaJaSalva | null>(null);
  const [confirmarDescarte, setConfirmarDescarte] = React.useState(false);
  const [rascunhoOferta, setRascunhoOferta] = React.useState<Rascunho | null>(null);
  const [rascunhoSalvo, setRascunhoSalvo] = React.useState(false);
  const [cepStatus, setCepStatus] = React.useState<CepStatus>({ estado: "vazio" });
  const cepConsultado = React.useRef("");
  const iniciaisAplicadas = React.useRef(false);
  const ofertaLida = React.useRef(false);

  const hojeISO = formatDateLocalISO();
  const nascimentoMinimo = recuarAnos(hojeISO, IDADE_MAXIMA_ANOS);
  const matriculaMinima = recuarAnos(hojeISO, MATRICULA_RETROATIVA_ANOS);

  const temDados = React.useMemo(() => {
    const preenchidoAluno = [
      aluno.nome, aluno.dataNascimento, aluno.sexo, aluno.cpf, aluno.rg, aluno.ra, aluno.raca,
      aluno.naturalDe, aluno.cep, aluno.endereco, aluno.bairro, aluno.telefoneAluno,
      aluno.religiao, aluno.escolaAnteriorNome, aluno.escolaAnteriorTempo,
    ].some((v) => v.trim() !== "");
    if (preenchidoAluno || aluno.bilingue) return true;
    if (responsavelPreenchido(pai) || responsavelPreenchido(mae)) return true;
    if (autorizadas.some((p) => p.nome.trim() || p.parentesco.trim())) return true;
    return fichaSaudePreenchida(saude);
  }, [aluno, pai, mae, autorizadas, saude]);

  const reset = React.useCallback(() => {
    setPasso(1);
    setErros({});
    setAluno(novoAlunoForm(turmas[0]?.id ?? ""));
    setPai(novoResponsavel());
    setMae(novoResponsavel());
    setAutorizadas(autorizadasVazias());
    setSaude(novaFichaSaude());
    setChaveIdempotencia(novaChaveIdempotencia());
    setConfirmacoes({ duplicata: false, lotacao: false });
    setConflito(null);
    setJaSalva(null);
    setConfirmarDescarte(false);
    setRascunhoOferta(null);
    setRascunhoSalvo(false);
    setCepStatus({ estado: "vazio" });
    cepConsultado.current = "";
  }, [turmas]);

  // Ao abrir: garante chave de idempotência e aplica pré-preenchimento.
  React.useEffect(() => {
    if (!aberto) {
      iniciaisAplicadas.current = false;
      return;
    }
    if (iniciaisAplicadas.current) return;
    iniciaisAplicadas.current = true;
    setChaveIdempotencia((atual) => atual || novaChaveIdempotencia());
    if (!dadosIniciais) return;
    setAluno((atual) => ({
      ...atual,
      nome: dadosIniciais.nome?.trim() || atual.nome,
      dataNascimento: dadosIniciais.dataNascimento || atual.dataNascimento,
    }));
    const [primeiro, segundo] = dadosIniciais.responsaveis ?? [];
    if (primeiro) {
      setPai((atual) => ({
        ...atual,
        nome: primeiro.nome ?? atual.nome,
        telefone: primeiro.telefone ?? atual.telefone,
        email: primeiro.email ?? atual.email,
        cpf: primeiro.cpf ?? atual.cpf,
      }));
    }
    if (segundo) {
      setMae((atual) => ({
        ...atual,
        nome: segundo.nome ?? atual.nome,
        telefone: segundo.telefone ?? atual.telefone,
        email: segundo.email ?? atual.email,
        cpf: segundo.cpf ?? atual.cpf,
      }));
    }
  }, [aberto, dadosIniciais]);

  // Oferece o rascunho do próprio usuário. Espera a sessão carregar para saber de quem é.
  React.useEffect(() => {
    if (!aberto) {
      ofertaLida.current = false;
      return;
    }
    if (ofertaLida.current || !donoRascunho) return;
    ofertaLida.current = true;
    setRascunhoOferta(lerRascunho(donoRascunho));
  }, [aberto, donoRascunho]);

  React.useEffect(() => {
    if (!aberto) return;
    if (!turmas.some((turma) => turma.id === aluno.turmaId)) {
      setAluno((atual) => ({ ...atual, turmaId: turmas[0]?.id ?? "" }));
      setConfirmacoes((atual) => (atual.lotacao ? { ...atual, lotacao: false } : atual));
    }
  }, [aberto, aluno.turmaId, turmas]);

  // Grava o rascunho enquanto digita. Some no salvamento e no descarte proposital.
  // Enquanto há oferta pendente na tela nada é gravado: o pré-preenchimento do
  // CRM não pode sobrescrever a matrícula que alguém deixou pela metade.
  React.useEffect(() => {
    if (!aberto || !temDados || rascunhoOferta || !donoRascunho) return;
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      const rascunho: Rascunho = {
        salvoEm: Date.now(),
        dono: donoRascunho,
        chave: chaveIdempotencia,
        passo,
        aluno,
        pai,
        mae,
        autorizadas,
      };
      try {
        window.localStorage.setItem(RASCUNHO_MATRICULA_CHAVE, JSON.stringify(rascunho));
        setRascunhoSalvo(true);
      } catch {
        // Storage cheio ou bloqueado: segue sem rascunho, o formulário continua válido.
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [
    aberto,
    temDados,
    rascunhoOferta,
    donoRascunho,
    passo,
    aluno,
    pai,
    mae,
    autorizadas,
    chaveIdempotencia,
  ]);

  const fechar = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const descartar = () => {
    apagarRascunhoMatricula();
    setConfirmarDescarte(false);
    fechar();
  };

  // Fundo escuro e "X" não podem apagar seis etapas sem aviso.
  const pedirParaFechar = () => {
    if (salvando) return;
    if (temDados) {
      setConfirmarDescarte(true);
      return;
    }
    fechar();
  };

  const retomarRascunho = () => {
    const r = rascunhoOferta;
    if (!r) return;
    // O rascunho é de outro preenchimento: se esta matrícula tinha sido aberta a
    // partir de um lead, o vínculo cai aqui. Senão o funil marcaria aquele lead
    // como "Matriculado" por causa da matrícula de outra criança.
    const veioDeOutraTela = Boolean(dadosIniciais);
    if (veioDeOutraTela) onDesvincularOrigem?.();
    setAluno({ ...r.aluno, turmaId: turmas.some((t) => t.id === r.aluno.turmaId) ? r.aluno.turmaId : turmas[0]?.id ?? "" });
    setPai(r.pai);
    setMae(r.mae);
    setAutorizadas(r.autorizadas);
    // A ficha de saúde não vai para o rascunho: começa em branco para não
    // misturar dados de saúde de outra criança com esta identidade.
    setSaude(novaFichaSaude());
    setPasso(r.passo);
    if (r.chave) setChaveIdempotencia(r.chave);
    setConfirmacoes({ duplicata: false, lotacao: false });
    setRascunhoOferta(null);
    setRascunhoSalvo(true);
    toast.info(
      "Rascunho retomado",
      veioDeOutraTela
        ? "Esta matrícula deixou de estar ligada ao lead do funil, porque o rascunho é de outro preenchimento — mova o lead à mão depois, se precisar. A ficha de saúde não é guardada no rascunho: preencha a etapa Saúde de novo antes de finalizar."
        : "A ficha de saúde não é guardada no rascunho: preencha a etapa Saúde de novo antes de finalizar."
    );
  };

  const atualizarAluno = <K extends keyof AlunoForm>(campo: K, valor: AlunoForm[K]) => {
    setAluno((atual) => ({ ...atual, [campo]: valor }));
    // A confirmação vale para o dado que ela cobriu: mudar nome/nascimento ou
    // turma religa a checagem de duplicata / de lotação na próxima tentativa.
    if (campo === "nome" || campo === "dataNascimento") {
      setConfirmacoes((atual) => (atual.duplicata ? { ...atual, duplicata: false } : atual));
    }
    if (campo === "turmaId") {
      setConfirmacoes((atual) => (atual.lotacao ? { ...atual, lotacao: false } : atual));
    }
    setErros((atuais) => {
      if (!(campo in atuais)) return atuais;
      const resto = { ...atuais };
      delete resto[campo as string];
      return resto;
    });
  };

  const atualizarResponsavel = (
    qual: "pai" | "mae",
    campo: keyof ResponsavelForm,
    valor: string | boolean
  ) => {
    const setar = qual === "pai" ? setPai : setMae;
    const setarOutro = qual === "pai" ? setMae : setPai;
    setar((atual) => ({ ...atual, [campo]: valor }) as ResponsavelForm);
    // O financeiro é um só: marcar um desmarca o outro.
    if (campo === "responsavelFinanceiro" && valor === true) {
      setarOutro((atual) => (atual.responsavelFinanceiro ? { ...atual, responsavelFinanceiro: false } : atual));
    }
    setErros({});
  };

  const buscarEnderecoPorCep = async (cepDigitado: string) => {
    const digitos = cepDigitado.replace(/\D/g, "");
    if (digitos.length !== 8) {
      setCepStatus({ estado: "vazio" });
      return;
    }
    if (cepConsultado.current === digitos) return;
    cepConsultado.current = digitos;
    setCepStatus({ estado: "buscando" });
    try {
      const resposta = await fetch(`/api/cep?cep=${digitos}`, { cache: "no-store" });
      const dados = (await resposta.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        endereco?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
      };
      if (!resposta.ok || !dados.ok) {
        // Libera a chave pra secretária poder tentar de novo no mesmo CEP.
        cepConsultado.current = "";
        setCepStatus({
          estado: "aviso",
          detalhe: dados.error || "Não foi possível buscar este CEP. Escreva o endereço à mão.",
        });
        return;
      }
      setAluno((atual) => ({
        ...atual,
        endereco: dados.endereco?.trim() ? dados.endereco.trim() : atual.endereco,
        bairro: dados.bairro?.trim() ? dados.bairro.trim() : atual.bairro,
      }));
      const local = [dados.cidade, dados.estado].filter(Boolean).join("/");
      setCepStatus({ estado: "ok", detalhe: local });
    } catch {
      cepConsultado.current = "";
      setCepStatus({ estado: "aviso", detalhe: "Sem conexão para buscar o CEP. Escreva o endereço à mão." });
    }
  };

  const paiPreenchido = responsavelPreenchido(pai);
  const maePreenchida = responsavelPreenchido(mae);

  const validarEtapa = React.useCallback(
    (etapa: PassoNumero): Erros => {
      const e: Erros = {};
      if (etapa === 1) {
        const nome = aluno.nome.trim();
        if (nome.length < 2) e.nome = "Escreva o nome da criança.";
        else if (!nome.includes(" ")) e.nome = "Escreva o nome e o sobrenome da criança.";
        else if (nome.length > 200) e.nome = "O nome está longo demais. Use o nome de registro.";

        if (!aluno.dataNascimento) e.dataNascimento = "Informe a data de nascimento.";
        else if (aluno.dataNascimento > hojeISO) e.dataNascimento = "A data de nascimento não pode ser no futuro.";
        else if (aluno.dataNascimento < nascimentoMinimo) {
          e.dataNascimento = `Confira a data: a criança teria mais de ${IDADE_MAXIMA_ANOS} anos.`;
        }

        if (!aluno.turmaId) e.turmaId = "Escolha a turma da criança.";

        const cpfDigitos = limparCPF(aluno.cpf);
        if (cpfDigitos && cpfDigitos.length !== 11) e.cpf = "O CPF tem 11 números. Complete ou deixe em branco.";
        else if (cpfDigitos && !validarCPF(cpfDigitos)) e.cpf = "Esse CPF não existe. Confira os números do documento.";

        if (aluno.telefoneAluno.trim() && !validarTelefone(aluno.telefoneAluno)) {
          e.telefoneAluno = "Telefone incompleto: informe DDD e número.";
        }
        if (aluno.cep.trim() && aluno.cep.replace(/\D/g, "").length !== 8) {
          e.cep = "O CEP tem 8 números. Complete ou deixe em branco.";
        }
        if (aluno.estado.trim() && aluno.estado.trim().length !== 2) {
          e.estado = "Use a sigla do estado (ex.: SP).";
        }
      }

      if (etapa === 2 || etapa === 3) {
        const dados = etapa === 2 ? pai : mae;
        if (responsavelPreenchido(dados)) {
          if (dados.nome.trim().length < 2) e.nome = "Escreva o nome completo do responsável.";
          if (!validarTelefone(dados.telefone)) {
            e.telefone = "Informe o telefone com DDD — é o contato da escola com a família.";
          }
          const cpfDigitos = limparCPF(dados.cpf);
          if (cpfDigitos && cpfDigitos.length !== 11) e.cpf = "O CPF tem 11 números. Complete ou deixe em branco.";
          else if (cpfDigitos && !validarCPF(cpfDigitos)) e.cpf = "Esse CPF não existe. Confira os números do documento.";
          if (dados.email.trim() && !emailValido(dados.email)) {
            e.email = "Confira o e-mail: ele é o login do Portal dos Pais.";
          }
          if (dados.dataNascimento && dados.dataNascimento > hojeISO) {
            e.dataNascimentoResp = "A data de nascimento não pode ser no futuro.";
          }
        }
        if (etapa === 3) {
          if (!paiPreenchido && !maePreenchida) {
            e.geral = "Cadastre o pai ou a mãe com nome e telefone — é o contato da família.";
          } else if (
            paiPreenchido && maePreenchida &&
            !pai.responsavelFinanceiro && !mae.responsavelFinanceiro
          ) {
            e.financeiro = "Marque quem é o responsável financeiro. Se for o pai, volte à etapa Pai e marque lá.";
          }
        }
      }

      if (etapa === 4) {
        autorizadas.forEach((p, i) => {
          if (p.nome.trim() && !p.parentesco.trim()) {
            e[`autorizada-${i}`] = "Informe o parentesco de quem pode buscar a criança.";
          }
          if (!p.nome.trim() && p.parentesco.trim()) {
            e[`autorizada-${i}`] = "Informe o nome completo dessa pessoa.";
          }
        });
      }

      if (etapa === 6) {
        if (!aluno.dataMatricula) e.dataMatricula = "Informe a data da matrícula.";
        else if (aluno.dataMatricula > hojeISO) e.dataMatricula = "A matrícula não pode começar no futuro.";
        else if (aluno.dataMatricula < matriculaMinima) {
          e.dataMatricula = `Confira a data: ela é de mais de ${MATRICULA_RETROATIVA_ANOS} anos atrás.`;
        }
      }

      return e;
    },
    [aluno, pai, mae, autorizadas, paiPreenchido, maePreenchida, hojeISO, nascimentoMinimo, matriculaMinima]
  );

  const proximo = () => {
    const encontrados = validarEtapa(passo);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    if (passo < 6) setPasso((p) => (p + 1) as PassoNumero);
  };

  const anterior = () => {
    setErros({});
    if (passo > 1) setPasso((p) => (p - 1) as PassoNumero);
  };

  const montarAluno = (): Aluno => {
    // Financeiro explícito quando há dois responsáveis; automático quando há um só.
    const financeiroEhPai = pai.responsavelFinanceiro || (paiPreenchido && !maePreenchida);
    const financeiroEhMae = !financeiroEhPai && maePreenchida;
    const enderecoFamilia = [aluno.endereco.trim(), aluno.bairro.trim()].filter(Boolean).join(", ");
    const responsaveis: Responsavel[] = [];

    if (paiPreenchido) {
      responsaveis.push({
        nome: pai.nome.trim(),
        parentesco: "Pai",
        cpf: limparCPF(pai.cpf) ? pai.cpf.trim() : "",
        rg: pai.rg.trim() || undefined,
        telefone: pai.telefone.trim(),
        email: pai.email.trim(),
        endereco: enderecoFamilia,
        principal: financeiroEhPai,
        profissao: pai.profissao.trim() || undefined,
        localTrabalho: pai.localTrabalho.trim() || undefined,
        dataNascimento: pai.dataNascimento || undefined,
        responsavelFinanceiro: financeiroEhPai,
      });
    }
    if (maePreenchida) {
      responsaveis.push({
        nome: mae.nome.trim(),
        parentesco: "Mãe",
        cpf: limparCPF(mae.cpf) ? mae.cpf.trim() : "",
        rg: mae.rg.trim() || undefined,
        telefone: mae.telefone.trim(),
        email: mae.email.trim(),
        endereco: enderecoFamilia,
        principal: financeiroEhMae,
        profissao: mae.profissao.trim() || undefined,
        localTrabalho: mae.localTrabalho.trim() || undefined,
        dataNascimento: mae.dataNascimento || undefined,
        responsavelFinanceiro: financeiroEhMae,
      });
    }

    return {
      id: "",
      nome: aluno.nome.trim(),
      dataNascimento: aluno.dataNascimento,
      // Sem máscara: é o que o índice único de CPF do banco compara.
      cpf: limparCPF(aluno.cpf),
      rg: aluno.rg.trim() || undefined,
      turmaId: aluno.turmaId,
      bilingue: aluno.bilingue,
      matricula: "",
      dataMatricula: aluno.dataMatricula || formatDateLocalISO(),
      status: "Ativo",
      responsaveis,
      ra: aluno.ra.trim() || undefined,
      raca: aluno.raca.trim() || undefined,
      sexo: aluno.sexo || undefined,
      naturalDe: aluno.naturalDe.trim() || undefined,
      estado: aluno.estado.trim() || undefined,
      cep: aluno.cep.trim() || undefined,
      endereco: aluno.endereco.trim() || undefined,
      bairro: aluno.bairro.trim() || undefined,
      telefoneAluno: aluno.telefoneAluno.trim() || undefined,
      religiao: aluno.religiao.trim() || undefined,
      escolaAnteriorNome: aluno.escolaAnteriorNome.trim() || undefined,
      escolaAnteriorTempo: aluno.escolaAnteriorTempo.trim() || undefined,
      pessoasAutorizadas: autorizadas.filter((p) => p.nome.trim()),
      fichaSaude: saude,
    };
  };

  const finalizar = async (novasConfirmacoes?: Partial<{ duplicata: boolean; lotacao: boolean }>) => {
    for (const etapa of [1, 2, 3, 4, 6] as PassoNumero[]) {
      const encontrados = validarEtapa(etapa);
      if (Object.keys(encontrados).length > 0) {
        setPasso(etapa);
        setErros(encontrados);
        setConflito(null);
        toast.error(
          "Faltam dados para concluir",
          `Confira os campos marcados na etapa ${PASSOS[etapa - 1].titulo}.`
        );
        return;
      }
    }
    setErros({});

    const confirmado = { ...confirmacoes, ...novasConfirmacoes };
    setConfirmacoes(confirmado);
    const extras: Record<string, unknown> = {};
    if (confirmado.duplicata) extras.confirmarDuplicata = true;
    if (confirmado.lotacao) extras.confirmarLotacao = true;

    setSalvando(true);
    try {
      await onSalvar(montarAluno(), { idempotencyKey: chaveIdempotencia, extras });
      apagarRascunhoMatricula();
      setConflito(null);
      toast.success("Matrícula realizada!", `${aluno.nome.trim()} cadastrado(a) com sucesso.`);
      fechar();
    } catch (e) {
      // Este envio já havia gravado uma ficha e o que está na tela é de outra
      // criança: nada foi criado agora. Não dizer "matrícula realizada", não
      // apagar o rascunho e não fechar — a secretária decide o que fazer.
      if (e instanceof ErroApi && e.codigo === "dados_divergentes") {
        setConflito(null);
        setJaSalva(fichaJaSalvaDoPayload(e.payload));
        return;
      }
      if (e instanceof ErroApi && e.codigo === "duplicata") {
        setConflito({ tipo: "duplicata", mensagem: e.message, candidatos: candidatosDoPayload(e.payload) });
        return;
      }
      if (e instanceof ErroApi && e.codigo === "lotacao") {
        const turmaNome = typeof e.payload.turmaNome === "string"
          ? e.payload.turmaNome
          : turmas.find((t) => t.id === aluno.turmaId)?.nome ?? "a turma";
        setConflito({
          tipo: "lotacao",
          mensagem: e.message,
          ocupacao: numeroDoPayload(e.payload.ocupacao),
          capacidade: numeroDoPayload(e.payload.capacidade),
          turmaNome,
        });
        return;
      }
      // A store já mostrou a mensagem da API. O modal fica aberto e a chave de
      // idempotência é a mesma, então tentar de novo não cria uma segunda ficha.
      console.warn("[matricula] não foi possível salvar", e);
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  const turmaSelecionada = turmas.find((t) => t.id === aluno.turmaId);

  return (
    <>
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={pedirParaFechar}
      >
        <div
          className="w-full max-w-4xl bg-popover rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabeçalho com progresso */}
          <div className="p-5 border-b shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Nova matrícula</h2>
                  <p className="text-xs text-muted-foreground">Ficha individual completa</p>
                </div>
              </div>
              <button onClick={pedirParaFechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between gap-1">
              {PASSOS.map((p, i) => {
                const Ic = p.icone;
                const ativo = passo === p.id;
                const concluido = passo > p.id;
                return (
                  <React.Fragment key={p.id}>
                    <div
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded text-xs font-medium transition-colors",
                        ativo && "bg-emerald-100 text-emerald-700",
                        concluido && "text-emerald-700",
                        !ativo && !concluido && "text-muted-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                          ativo && "bg-emerald-600 text-white",
                          concluido && "bg-emerald-500 text-white",
                          !ativo && !concluido && "bg-muted"
                        )}
                      >
                        {concluido ? <Check className="h-3 w-3" /> : <Ic className="h-3 w-3" />}
                      </div>
                      <span className="hidden sm:inline">{p.titulo}</span>
                    </div>
                    {i < PASSOS.length - 1 && (
                      <div className={cn("flex-1 h-0.5", concluido ? "bg-emerald-500" : "bg-muted")} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Aparece mesmo com o formulário já preenchido (ex.: matrícula aberta
                de um lead do CRM): senão o rascunho seria sobrescrito calado. */}
            {rascunhoOferta && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <div>
                  <div className="font-semibold">
                    Tem uma matrícula começada neste computador
                    {rascunhoOferta.aluno.nome.trim() ? ` (${rascunhoOferta.aluno.nome.trim()})` : ""}
                  </div>
                  <div className="text-xs">
                    Salva {formatRelative(new Date(rascunhoOferta.salvoEm))}. Retomar troca o que está nesta tela pelos
                    dados do rascunho — a ficha de saúde não é guardada.
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { apagarRascunhoMatricula(); setRascunhoOferta(null); }}>
                    {temDados ? "Descartar rascunho" : "Começar do zero"}
                  </Button>
                  <Button size="sm" onClick={retomarRascunho}>Retomar</Button>
                </div>
              </div>
            )}

            {passo === 1 && (
              <PassoAluno
                dados={aluno}
                atualizar={atualizarAluno}
                turmas={turmas}
                erros={erros}
                nascimentoMinimo={nascimentoMinimo}
                nascimentoMaximo={hojeISO}
                cepStatus={cepStatus}
                onCepChange={(v) => { atualizarAluno("cep", v); void buscarEnderecoPorCep(v); }}
              />
            )}
            {passo === 2 && (
              <PassoResponsavel
                titulo="Dados do Pai"
                tipo="Pai"
                dados={pai}
                atualizar={(campo, valor) => atualizarResponsavel("pai", campo, valor)}
                erros={erros}
                nascimentoMaximo={hojeISO}
                preenchidoDeFora={Boolean(dadosIniciais?.responsaveis?.length)}
              />
            )}
            {passo === 3 && (
              <PassoResponsavel
                titulo="Dados da Mãe"
                tipo="Mãe"
                dados={mae}
                atualizar={(campo, valor) => atualizarResponsavel("mae", campo, valor)}
                erros={erros}
                nascimentoMaximo={hojeISO}
                preenchidoDeFora={Boolean(dadosIniciais?.responsaveis?.length)}
              />
            )}
            {passo === 4 && (
              <PassoAutorizadas
                autorizadas={autorizadas}
                setAutorizadas={setAutorizadas}
                erros={erros}
                onLimparErros={() => setErros({})}
              />
            )}
            {passo === 5 && <PassoSaude saude={saude} setSaude={setSaude} />}
            {passo === 6 && (
              <PassoConclusao
                nome={aluno.nome}
                turmaNome={turmaSelecionada?.nome}
                pai={pai}
                mae={mae}
                paiPreenchido={paiPreenchido}
                maePreenchida={maePreenchida}
                dataMatricula={aluno.dataMatricula}
                onDataMatricula={(v) => atualizarAluno("dataMatricula", v)}
                matriculaMinima={matriculaMinima}
                matriculaMaxima={hojeISO}
                erros={erros}
              />
            )}
          </div>

          {/* Footer com botões */}
          <div className="border-t p-4 flex items-center justify-between shrink-0 bg-muted/30">
            <div className="text-xs text-muted-foreground">
              Etapa {passo} de {PASSOS.length}
              {rascunhoOferta ? (
                <span className="ml-2">· responda o aviso acima para guardar este rascunho</span>
              ) : rascunhoSalvo ? (
                <span className="ml-2">· rascunho guardado neste computador, sem a ficha de saúde</span>
              ) : null}
            </div>
            <div className="flex gap-2">
              {passo > 1 && (
                <Button type="button" variant="outline" onClick={anterior} disabled={salvando}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
                </Button>
              )}
              {passo < 6 ? (
                <Button type="button" onClick={proximo} disabled={salvando}>
                  Próximo <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void finalizar()}
                  disabled={salvando}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-1.5 h-4 w-4" /> Finalizar matrícula
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        aberto={confirmarDescarte}
        titulo="Descartar esta matrícula?"
        descricao={`Os dados de identificação ficam guardados como rascunho neste computador por ${RASCUNHO_VALIDADE_TEXTO}, só para você. Descartar apaga o rascunho também.`}
        variante="danger"
        textoBotaoConfirmar="Descartar tudo"
        textoBotaoCancelar="Continuar preenchendo"
        onConfirmar={descartar}
        onFechar={() => setConfirmarDescarte(false)}
      />

      {jaSalva && (
        <DialogoFichaJaSalva
          ficha={jaSalva}
          nomeDigitado={aluno.nome.trim()}
          onFechar={() => setJaSalva(null)}
          onMatriculaNova={() => {
            setJaSalva(null);
            // Chave nova: o próximo Finalizar cria uma ficha de verdade em vez de
            // receber de volta a que já estava salva. A checagem de duplicata
            // volta a valer, então a mesma criança não passa duas vezes.
            setChaveIdempotencia(novaChaveIdempotencia());
            setConfirmacoes({ duplicata: false, lotacao: false });
            toast.info(
              "Pronto para salvar como ficha nova",
              "Confira os dados e clique em Finalizar matrícula: agora vai criar uma ficha nova."
            );
          }}
        />
      )}

      {conflito && (
        <DialogoConflito
          conflito={conflito}
          turmas={turmas}
          salvando={salvando}
          onFechar={() => setConflito(null)}
          onVoltarParaTurma={() => { setConflito(null); setPasso(1); }}
          onConfirmar={() =>
            void finalizar(conflito.tipo === "duplicata" ? { duplicata: true } : { lotacao: true })
          }
        />
      )}
    </>
  );
}

function ErroCampo({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-rose-600">{msg}</p>;
}

const bordaErro = (msg?: string) => (msg ? "border-rose-500 focus-visible:ring-rose-500" : undefined);

// ===== ETAPA 1: ALUNO =====
function PassoAluno({
  dados,
  atualizar,
  turmas,
  erros,
  nascimentoMinimo,
  nascimentoMaximo,
  cepStatus,
  onCepChange,
}: {
  dados: AlunoForm;
  atualizar: <K extends keyof AlunoForm>(campo: K, valor: AlunoForm[K]) => void;
  turmas: Turma[];
  erros: Erros;
  nascimentoMinimo: string;
  nascimentoMaximo: string;
  cepStatus: CepStatus;
  onCepChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-emerald-600" /> Dados do aluno
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Label>Nome completo *</Label>
          <Input
            className={cn("mt-1.5", bordaErro(erros.nome))}
            value={dados.nome}
            onChange={(e) => atualizar("nome", e.target.value)}
          />
          <ErroCampo msg={erros.nome} />
        </div>
        <div>
          <Label>Sexo</Label>
          <select
            value={dados.sexo}
            onChange={(e) => atualizar("sexo", e.target.value as "M" | "F" | "")}
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label>Data nascimento *</Label>
          <Input
            className={cn("mt-1.5", bordaErro(erros.dataNascimento))}
            type="date"
            min={nascimentoMinimo}
            max={nascimentoMaximo}
            value={dados.dataNascimento}
            onChange={(e) => atualizar("dataNascimento", e.target.value)}
          />
          <ErroCampo msg={erros.dataNascimento} />
        </div>
        <div>
          <Label>RA</Label>
          <Input className="mt-1.5" value={dados.ra} onChange={(e) => atualizar("ra", e.target.value)} placeholder="Registro acadêmico" />
        </div>
        <div>
          <Label>CPF</Label>
          <InputCPF className="mt-1.5" value={dados.cpf} onChange={(v) => atualizar("cpf", v)} />
          <ErroCampo msg={erros.cpf} />
        </div>
        <div>
          <Label>RG</Label>
          <Input className="mt-1.5" value={dados.rg} onChange={(e) => atualizar("rg", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Raça/Cor</Label>
          <Input className="mt-1.5" value={dados.raca} onChange={(e) => atualizar("raca", e.target.value)} placeholder="Branca, Parda, etc" />
        </div>
        <div>
          <Label>Natural de</Label>
          <Input className="mt-1.5" value={dados.naturalDe} onChange={(e) => atualizar("naturalDe", e.target.value)} placeholder="Cidade natal" />
        </div>
        <div>
          <Label>Estado</Label>
          <Input
            className={cn("mt-1.5", bordaErro(erros.estado))}
            maxLength={2}
            value={dados.estado}
            onChange={(e) => atualizar("estado", e.target.value.toUpperCase())}
          />
          <ErroCampo msg={erros.estado} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label>CEP</Label>
          <InputCEP className={cn("mt-1.5", bordaErro(erros.cep))} value={dados.cep} onChange={onCepChange} />
          <ErroCampo msg={erros.cep} />
          {cepStatus.estado === "buscando" && (
            <p className="mt-1 text-xs text-muted-foreground">Buscando endereço…</p>
          )}
          {cepStatus.estado === "ok" && (
            <p className="mt-1 text-xs text-emerald-700">
              Endereço preenchido{cepStatus.detalhe ? ` · ${cepStatus.detalhe}` : ""}
            </p>
          )}
          {cepStatus.estado === "aviso" && (
            <p className="mt-1 text-xs text-amber-700">{cepStatus.detalhe}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <Label>Endereço</Label>
          <Input className="mt-1.5" value={dados.endereco} onChange={(e) => atualizar("endereco", e.target.value)} placeholder="Rua, número" />
        </div>
        <div>
          <Label>Telefone</Label>
          <InputTelefone className={cn("mt-1.5", bordaErro(erros.telefoneAluno))} value={dados.telefoneAluno} onChange={(v) => atualizar("telefoneAluno", v)} />
          <ErroCampo msg={erros.telefoneAluno} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Bairro</Label>
          <Input className="mt-1.5" value={dados.bairro} onChange={(e) => atualizar("bairro", e.target.value)} />
        </div>
        <div>
          <Label>Turma *</Label>
          <select
            value={dados.turmaId}
            onChange={(e) => atualizar("turmaId", e.target.value)}
            disabled={turmas.length === 0}
            className={cn(
              "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              bordaErro(erros.turmaId)
            )}
          >
            {turmas.length === 0 && <option value="">Nenhuma turma cadastrada</option>}
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.nome} ({t.turno})</option>
            ))}
          </select>
          <ErroCampo msg={erros.turmaId} />
          {turmas.length === 0 && (
            <p className="mt-1 text-xs text-amber-700">Crie uma turma antes de concluir a matrícula.</p>
          )}
        </div>
        <div>
          <Label>Religião</Label>
          <Input className="mt-1.5" value={dados.religiao} onChange={(e) => atualizar("religiao", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={dados.bilingue}
            onChange={(e) => atualizar("bilingue", e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Programa bilíngue</span>
        </label>
      </div>

      <div className="rounded-lg bg-muted/50 p-4 space-y-3">
        <div className="text-sm font-medium">Histórico escolar</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Escola anterior</Label>
            <Input className="mt-1.5" value={dados.escolaAnteriorNome} onChange={(e) => atualizar("escolaAnteriorNome", e.target.value)} placeholder="Deixe vazio se não houve" />
          </div>
          <div>
            <Label>Tempo na escola anterior</Label>
            <Input className="mt-1.5" value={dados.escolaAnteriorTempo} onChange={(e) => atualizar("escolaAnteriorTempo", e.target.value)} placeholder="Ex: 2 anos" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== ETAPAS 2 e 3: PAI / MÃE =====
function PassoResponsavel({
  titulo,
  tipo,
  dados,
  atualizar,
  erros,
  nascimentoMaximo,
  preenchidoDeFora,
}: {
  titulo: string;
  tipo: "Pai" | "Mãe";
  dados: ResponsavelForm;
  atualizar: (campo: keyof ResponsavelForm, valor: string | boolean) => void;
  erros: Erros;
  nascimentoMaximo: string;
  preenchidoDeFora: boolean;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-emerald-600" /> {titulo}
      </h3>
      <p className="text-xs text-muted-foreground">
        Se {tipo === "Pai" ? "não houver pai cadastrado" : "não houver mãe cadastrada"}, pode deixar em branco e avançar.
        Preenchendo, o telefone com DDD é obrigatório.
      </p>
      {preenchidoDeFora && (
        <p className="text-xs text-amber-700">
          Parte destes dados veio do atendimento. Confirme com a família se é mesmo {tipo === "Pai" ? "o pai" : "a mãe"}.
        </p>
      )}

      {erros.geral && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">{erros.geral}</div>
      )}

      <div>
        <Label>Nome completo</Label>
        <Input
          className={cn("mt-1.5", bordaErro(erros.nome))}
          value={dados.nome}
          onChange={(e) => atualizar("nome", e.target.value)}
        />
        <ErroCampo msg={erros.nome} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>CPF</Label>
          <InputCPF className="mt-1.5" value={dados.cpf} onChange={(v) => atualizar("cpf", v)} />
          <ErroCampo msg={erros.cpf} />
        </div>
        <div>
          <Label>RG</Label>
          <Input className="mt-1.5" value={dados.rg} onChange={(e) => atualizar("rg", e.target.value)} />
        </div>
        <div>
          <Label>Data nascimento</Label>
          <Input
            className={cn("mt-1.5", bordaErro(erros.dataNascimentoResp))}
            type="date"
            max={nascimentoMaximo}
            value={dados.dataNascimento}
            onChange={(e) => atualizar("dataNascimento", e.target.value)}
          />
          <ErroCampo msg={erros.dataNascimentoResp} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Profissão</Label>
          <Input className="mt-1.5" value={dados.profissao} onChange={(e) => atualizar("profissao", e.target.value)} />
        </div>
        <div>
          <Label>Local de trabalho</Label>
          <Input className="mt-1.5" value={dados.localTrabalho} onChange={(e) => atualizar("localTrabalho", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Telefone</Label>
          <InputTelefone className={cn("mt-1.5", bordaErro(erros.telefone))} value={dados.telefone} onChange={(v) => atualizar("telefone", v)} />
          <ErroCampo msg={erros.telefone} />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            className={cn("mt-1.5", bordaErro(erros.email))}
            type="email"
            value={dados.email}
            onChange={(e) => atualizar("email", e.target.value)}
            placeholder="Usado pra login no Portal dos Pais"
          />
          <ErroCampo msg={erros.email} />
        </div>
      </div>

      <label
        className={cn(
          "flex items-center gap-2 cursor-pointer rounded-lg border p-3 hover:bg-accent",
          erros.financeiro && "border-rose-500 bg-rose-50"
        )}
      >
        <input
          type="checkbox"
          checked={dados.responsavelFinanceiro}
          onChange={(e) => atualizar("responsavelFinanceiro", e.target.checked)}
          className="rounded"
        />
        <span className="text-sm font-medium">É o responsável financeiro</span>
      </label>
      <p className="text-xs text-muted-foreground">
        O responsável financeiro recebe boleto, cobrança e acesso ao Portal dos Pais.
      </p>
      <ErroCampo msg={erros.financeiro} />
    </div>
  );
}

// ===== ETAPA 4: PESSOAS AUTORIZADAS =====
function PassoAutorizadas({
  autorizadas,
  setAutorizadas,
  erros,
  onLimparErros,
}: {
  autorizadas: PessoaAutorizada[];
  setAutorizadas: React.Dispatch<React.SetStateAction<PessoaAutorizada[]>>;
  erros: Erros;
  onLimparErros: () => void;
}) {
  const upd = (i: number, campo: keyof PessoaAutorizada, valor: string) => {
    setAutorizadas((atual) => atual.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));
    onLimparErros();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base flex items-center gap-2">
        <Users className="h-4 w-4 text-emerald-600" /> Pessoas autorizadas a buscar o aluno
      </h3>
      <p className="text-xs text-muted-foreground">
        Liste até 5 pessoas que podem buscar a criança na escola. Pais já estão automaticamente autorizados — preencha apenas terceiros (avós, tios, motorista, etc).
      </p>

      <div className="space-y-2">
        {autorizadas.map((p, i) => {
          const erro = erros[`autorizada-${i}`];
          return (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:items-center">
              <div className="md:col-span-1 text-xs text-muted-foreground font-mono text-center">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="md:col-span-7">
                <Input
                  placeholder="Nome completo"
                  className={bordaErro(erro)}
                  value={p.nome}
                  onChange={(e) => upd(i, "nome", e.target.value)}
                />
              </div>
              <div className="md:col-span-4">
                <Input
                  placeholder="Parentesco (avó, tio, etc)"
                  className={bordaErro(erro)}
                  value={p.parentesco}
                  onChange={(e) => upd(i, "parentesco", e.target.value)}
                />
              </div>
              {erro && <div className="md:col-span-12 md:pl-[8.333%]"><ErroCampo msg={erro} /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== ETAPA 5: FICHA DE SAÚDE =====
function PassoSaude({
  saude,
  setSaude,
}: {
  saude: FichaSaude;
  setSaude: (s: FichaSaude) => void;
}) {
  const updD = (k: keyof NonNullable<FichaSaude["doencas"]>, v: boolean) =>
    setSaude({ ...saude, doencas: { ...saude.doencas, [k]: v } });
  const upd = <K extends keyof FichaSaude>(k: K, v: FichaSaude[K]) =>
    setSaude({ ...saude, [k]: v });

  const doencasList: Array<{ k: keyof NonNullable<FichaSaude["doencas"]>; label: string }> = [
    { k: "bronquite", label: "Bronquite" },
    { k: "catapora", label: "Catapora" },
    { k: "caxumba", label: "Caxumba" },
    { k: "convulsao", label: "Convulsão" },
    { k: "coqueluche", label: "Coqueluche" },
    { k: "diabete", label: "Diabete" },
    { k: "hepatite", label: "Hepatite" },
    { k: "pneumonia", label: "Pneumonia" },
    { k: "problemasCoracao", label: "Problemas no coração" },
    { k: "rubeola", label: "Rubéola" },
    { k: "sarampo", label: "Sarampo" },
  ];

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-base flex items-center gap-2">
        <Heart className="h-4 w-4 text-rose-600" /> Ficha individual de saúde
      </h3>

      <div className="rounded-lg bg-muted/40 p-4">
        <div className="text-sm font-medium mb-3">Doenças que a criança já teve ou tem:</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {doencasList.map((d) => (
            <label key={d.k} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={Boolean(saude.doencas?.[d.k])}
                onChange={(e) => updD(d.k, e.target.checked)}
                className="rounded"
              />
              <span>{d.label}</span>
            </label>
          ))}
        </div>
        {saude.doencas?.hepatite && (
          <div className="mt-3">
            <Label className="text-xs">Hepatite — qual tipo?</Label>
            <Input
              className="mt-1"
              value={saude.doencas.hepatiteTipo ?? ""}
              onChange={(e) => setSaude({ ...saude, doencas: { ...saude.doencas, hepatiteTipo: e.target.value } })}
              placeholder="A, B, C..."
            />
          </div>
        )}
        <div className="mt-3">
          <Label className="text-xs">Outras doenças</Label>
          <Input className="mt-1" value={saude.doencasOutras ?? ""} onChange={(e) => upd("doencasOutras", e.target.value)} />
        </div>
      </div>

      <SimNaoMotivo
        label="O aluno já desmaiou alguma vez?"
        sim={saude.desmaioSim}
        motivo={saude.desmaioMotivo ?? ""}
        onChangeSim={(v) => upd("desmaioSim", v)}
        onChangeMotivo={(v) => upd("desmaioMotivo", v)}
      />

      <SimNaoMotivo
        label="O aluno já esteve internado?"
        sim={saude.internadoSim}
        motivo={saude.internadoMotivo ?? ""}
        onChangeSim={(v) => upd("internadoSim", v)}
        onChangeMotivo={(v) => upd("internadoMotivo", v)}
      />

      <div>
        <Label>Apresenta algum tipo de alergia? (medicamentos, alimentação)</Label>
        <textarea
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          rows={2}
          value={saude.alergias ?? ""}
          onChange={(e) => upd("alergias", e.target.value)}
        />
      </div>

      <SimNaoMotivo
        label="Está em tratamento médico?"
        sim={saude.tratamentoMedicoSim}
        motivo={saude.tratamentoMotivo ?? ""}
        onChangeSim={(v) => upd("tratamentoMedicoSim", v)}
        onChangeMotivo={(v) => upd("tratamentoMotivo", v)}
      />

      <div>
        <Label>Possui algum trauma ou fobia?</Label>
        <Input className="mt-1.5" value={saude.traumaFobia ?? ""} onChange={(e) => upd("traumaFobia", e.target.value)} />
      </div>

      <SimNaoMotivo
        label="Em caso de febre, pode ser dado algum medicamento? Qual?"
        sim={saude.medicamentoFebreSim}
        motivo={saude.medicamentoFebreQual ?? ""}
        labelMotivo="Qual medicamento?"
        onChangeSim={(v) => upd("medicamentoFebreSim", v)}
        onChangeMotivo={(v) => upd("medicamentoFebreQual", v)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Médico responsável</Label>
          <Input className="mt-1.5" value={saude.medicoNome ?? ""} onChange={(e) => upd("medicoNome", e.target.value)} />
        </div>
        <div>
          <Label>Telefone do médico</Label>
          <Input className="mt-1.5" value={saude.medicoTelefone ?? ""} onChange={(e) => upd("medicoTelefone", e.target.value)} />
        </div>
      </div>

      <SimNaoMotivo
        label="Possui convênio médico?"
        sim={saude.convenioSim}
        motivo={saude.convenioQual ?? ""}
        labelMotivo="Qual convênio?"
        onChangeSim={(v) => upd("convenioSim", v)}
        onChangeMotivo={(v) => upd("convenioQual", v)}
      />

      <div>
        <Label>Informações complementares</Label>
        <textarea
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          rows={3}
          value={saude.informacoesComplementares ?? ""}
          onChange={(e) => upd("informacoesComplementares", e.target.value)}
        />
      </div>
    </div>
  );
}

function SimNaoMotivo({
  label,
  sim,
  motivo,
  labelMotivo = "Motivo",
  onChangeSim,
  onChangeMotivo,
}: {
  label: string;
  sim?: boolean;
  motivo: string;
  labelMotivo?: string;
  onChangeSim: (v: boolean) => void;
  onChangeMotivo: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1.5">
        <Label className="shrink-0">{label}</Label>
        <div className="flex gap-3 text-xs">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" checked={sim === true} onChange={() => onChangeSim(true)} />
            Sim
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" checked={sim === false} onChange={() => onChangeSim(false)} />
            Não
          </label>
        </div>
      </div>
      {sim && (
        <Input
          placeholder={labelMotivo}
          value={motivo}
          onChange={(e) => onChangeMotivo(e.target.value)}
        />
      )}
    </div>
  );
}

// ===== ETAPA 6: CONCLUSÃO =====
function PassoConclusao({
  nome,
  turmaNome,
  pai,
  mae,
  paiPreenchido,
  maePreenchida,
  dataMatricula,
  onDataMatricula,
  matriculaMinima,
  matriculaMaxima,
  erros,
}: {
  nome: string;
  turmaNome?: string;
  pai: ResponsavelForm;
  mae: ResponsavelForm;
  paiPreenchido: boolean;
  maePreenchida: boolean;
  dataMatricula: string;
  onDataMatricula: (v: string) => void;
  matriculaMinima: string;
  matriculaMaxima: string;
  erros: Erros;
}) {
  const financeiroEhPai = pai.responsavelFinanceiro || (paiPreenchido && !maePreenchida);
  const financeiro = financeiroEhPai ? pai : maePreenchida ? mae : null;

  return (
    <div className="space-y-4">
      <div className="text-center py-6">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-3">
          <Check className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold">Tudo certo!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Revisa os dados abaixo e clica em &quot;Finalizar matrícula&quot;.
        </p>
      </div>

      <div className="rounded-lg border divide-y">
        <div className="p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Aluno</span>
          <span className="font-semibold">{nome.trim() || "—"}</span>
        </div>
        <div className="p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Turma</span>
          <span className="font-semibold">{turmaNome ?? "—"}</span>
        </div>
        <div className="p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Pai</span>
          <span className="font-semibold">{pai.nome.trim() || "—"}</span>
        </div>
        <div className="p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Mãe</span>
          <span className="font-semibold">{mae.nome.trim() || "—"}</span>
        </div>
        <div className="p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Responsável financeiro</span>
          <span className="font-semibold">{financeiro?.nome.trim() || "—"}</span>
        </div>
      </div>

      <div className="max-w-xs">
        <Label>Data da matrícula</Label>
        <Input
          className={cn("mt-1.5", bordaErro(erros.dataMatricula))}
          type="date"
          min={matriculaMinima}
          max={matriculaMaxima}
          value={dataMatricula}
          onChange={(e) => onDataMatricula(e.target.value)}
        />
        <ErroCampo msg={erros.dataMatricula} />
        <p className="mt-1 text-xs text-muted-foreground">
          Vem preenchida com hoje. Mude só se a criança entrou em outra data.
        </p>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-900">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          Depois de finalizar, voc&ecirc; pode imprimir a ficha completa em PDF na p&aacute;gina do aluno.
        </div>
      </div>
    </div>
  );
}

// ===== CONFLITOS DA API (duplicata / lotação) =====
/**
 * A chave deste envio já gravou uma ficha e o que está na tela é de outra
 * criança: a última correção digitada não entrou em lugar nenhum. A tela diz
 * isso e oferece os dois caminhos reais — corrigir na ficha que existe, ou
 * salvar o que está na tela como uma matrícula nova.
 */
function DialogoFichaJaSalva({
  ficha,
  nomeDigitado,
  onFechar,
  onMatriculaNova,
}: {
  ficha: FichaJaSalva;
  nomeDigitado: string;
  onFechar: () => void;
  onMatriculaNova: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onFechar}
    >
      <div className="w-full max-w-lg bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-6 border-b">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">A ficha já estava salva — sua correção não entrou</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Este envio já havia gravado uma ficha, com outros dados. Nada do que está nesta tela foi
              cadastrado agora.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div className="rounded-lg border p-3">
            <div className="text-sm">
              <div className="text-xs text-muted-foreground">Ficha que está salva</div>
              <div className="font-semibold">{ficha.nome || "sem nome"}</div>
              {ficha.dataNascimento && (
                <div className="text-xs text-muted-foreground">
                  nascida(o) em {formatDateBR(ficha.dataNascimento)}
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Se for a mesma criança, abra a ficha salva e corrija por lá — o que você digitou aqui não vai
            entrar por este envio. Se {nomeDigitado || "quem está nesta tela"} for outra criança, use
            &ldquo;é outra criança&rdquo;: aí sim uma ficha nova é criada e a de cima continua como está.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 p-4 bg-muted/30">
          <Button type="button" variant="outline" onClick={onFechar}>
            Voltar aos dados
          </Button>
          <Button type="button" variant="outline" onClick={onMatriculaNova}>
            É outra criança — matrícula nova
          </Button>
          {ficha.id && (
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <a href={`/alunos/${ficha.id}`} target="_blank" rel="noreferrer">
                Abrir a ficha salva <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DialogoConflito({
  conflito,
  turmas,
  salvando,
  onFechar,
  onVoltarParaTurma,
  onConfirmar,
}: {
  conflito: Conflito;
  turmas: Turma[];
  salvando: boolean;
  onFechar: () => void;
  onVoltarParaTurma: () => void;
  onConfirmar: () => void;
}) {
  const duplicata = conflito.tipo === "duplicata";
  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={() => !salvando && onFechar()}
    >
      <div className="w-full max-w-lg bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-6 border-b">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">
              {duplicata ? "Já existe uma ficha parecida" : "A turma está na capacidade"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{conflito.mensagem}</p>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {duplicata && conflito.candidatos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Procure a criança na lista de alunos antes de criar outra ficha.
            </p>
          )}
          {duplicata &&
            conflito.candidatos.map((c) => {
              const turma = turmas.find((t) => t.id === c.turmaId);
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="text-sm">
                    <div className="font-semibold">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.dataNascimento ? `nascida(o) em ${formatDateBR(c.dataNascimento)}` : "sem data de nascimento"}
                      {turma ? ` · ${turma.nome}` : ""}
                    </div>
                  </div>
                  <a
                    href={`/alunos/${c.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                  >
                    Abrir ficha existente <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              );
            })}
          {!duplicata && (
            <div className="rounded-lg border p-3 text-sm">
              <div className="font-semibold">{conflito.turmaNome}</div>
              <div className="text-xs text-muted-foreground">
                {conflito.ocupacao} de {conflito.capacidade} vagas ocupadas. Confirme só com a direção.
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 p-4 bg-muted/30">
          <Button type="button" variant="outline" onClick={duplicata ? onFechar : onVoltarParaTurma} disabled={salvando}>
            {duplicata ? "Revisar os dados" : "Escolher outra turma"}
          </Button>
          <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={onConfirmar} disabled={salvando}>
            {salvando ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : duplicata ? (
              "É outra criança — matricular"
            ) : (
              "Confirmar mesmo assim"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
