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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { cn, formatDateLocalISO } from "@/lib/utils";
import type { Aluno, Responsavel, PessoaAutorizada, FichaSaude, Turma } from "@/lib/types";

interface Props {
  aberto: boolean;
  onClose: () => void;
  turmas: Turma[];
  onSalvar: (aluno: Aluno) => Promise<void>;
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

export function NovaMatriculaModal({ aberto, onClose, turmas, onSalvar }: Props) {
  const toast = useToast();
  const [passo, setPasso] = React.useState<PassoNumero>(1);
  const [salvando, setSalvando] = React.useState(false);

  // ===== Dados do aluno =====
  const [nome, setNome] = React.useState("");
  const [dataNascimento, setDataNascimento] = React.useState("");
  const [sexo, setSexo] = React.useState<"M" | "F" | "">("");
  const [cpf, setCpf] = React.useState("");
  const [rg, setRg] = React.useState("");
  const [ra, setRa] = React.useState("");
  const [raca, setRaca] = React.useState("");
  const [naturalDe, setNaturalDe] = React.useState("");
  const [estado, setEstado] = React.useState("SP");
  const [cep, setCep] = React.useState("");
  const [endereco, setEndereco] = React.useState("");
  const [bairro, setBairro] = React.useState("");
  const [telefoneAluno, setTelefoneAluno] = React.useState("");
  const [turmaId, setTurmaId] = React.useState("");
  const [bilingue, setBilingue] = React.useState(false);
  const [religiao, setReligiao] = React.useState("");
  const [escolaAnteriorNome, setEscolaAnteriorNome] = React.useState("");
  const [escolaAnteriorTempo, setEscolaAnteriorTempo] = React.useState("");

  // ===== Dados do pai e mãe =====
  const [pai, setPai] = React.useState<ResponsavelForm>(novoResponsavel);
  const [mae, setMae] = React.useState<ResponsavelForm>(novoResponsavel);

  // ===== Pessoas autorizadas =====
  const [autorizadas, setAutorizadas] = React.useState<PessoaAutorizada[]>([
    { nome: "", parentesco: "" },
    { nome: "", parentesco: "" },
    { nome: "", parentesco: "" },
    { nome: "", parentesco: "" },
    { nome: "", parentesco: "" },
  ]);

  // ===== Ficha de saúde =====
  const [saude, setSaude] = React.useState<FichaSaude>(novaFichaSaude);

  const reset = React.useCallback(() => {
    setPasso(1);
    setNome("");
    setDataNascimento("");
    setSexo("");
    setCpf("");
    setRg("");
    setRa("");
    setRaca("");
    setNaturalDe("");
    setEstado("SP");
    setCep("");
    setEndereco("");
    setBairro("");
    setTelefoneAluno("");
    setTurmaId(turmas[0]?.id ?? "");
    setBilingue(false);
    setReligiao("");
    setEscolaAnteriorNome("");
    setEscolaAnteriorTempo("");
    setPai(novoResponsavel());
    setMae(novoResponsavel());
    setAutorizadas([
      { nome: "", parentesco: "" },
      { nome: "", parentesco: "" },
      { nome: "", parentesco: "" },
      { nome: "", parentesco: "" },
      { nome: "", parentesco: "" },
    ]);
    setSaude(novaFichaSaude());
  }, [turmas]);

  React.useEffect(() => {
    if (!aberto) return;
    if (!turmas.some((turma) => turma.id === turmaId)) {
      setTurmaId(turmas[0]?.id ?? "");
    }
  }, [aberto, turmaId, turmas]);

  const fechar = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const proximo = () => {
    if (passo < 6) setPasso((p) => (p + 1) as PassoNumero);
  };

  const anterior = () => {
    if (passo > 1) setPasso((p) => (p - 1) as PassoNumero);
  };

  const finalizar = async () => {
    if (!turmaId) {
      toast.error("Cadastre uma turma primeiro", "A matrícula precisa estar vinculada a uma turma real.");
      return;
    }
    setSalvando(true);
    try {
      const responsaveis: Responsavel[] = [];

      if (pai.nome) {
        responsaveis.push({
          nome: pai.nome,
          parentesco: "Pai",
          cpf: pai.cpf,
          rg: pai.rg || undefined,
          telefone: pai.telefone,
          email: pai.email,
          endereco: `${endereco}, ${bairro}`,
          principal: pai.responsavelFinanceiro,
          profissao: pai.profissao || undefined,
          localTrabalho: pai.localTrabalho || undefined,
          dataNascimento: pai.dataNascimento || undefined,
          responsavelFinanceiro: pai.responsavelFinanceiro,
        });
      }
      if (mae.nome) {
        responsaveis.push({
          nome: mae.nome,
          parentesco: "Mãe",
          cpf: mae.cpf,
          rg: mae.rg || undefined,
          telefone: mae.telefone,
          email: mae.email,
          endereco: `${endereco}, ${bairro}`,
          principal: mae.responsavelFinanceiro || !pai.responsavelFinanceiro,
          profissao: mae.profissao || undefined,
          localTrabalho: mae.localTrabalho || undefined,
          dataNascimento: mae.dataNascimento || undefined,
          responsavelFinanceiro: mae.responsavelFinanceiro,
        });
      }

      const aluno: Aluno = {
        id: "",
        nome: nome.trim(),
        dataNascimento,
        cpf,
        rg: rg || undefined,
        turmaId,
        bilingue,
        matricula: "",
        dataMatricula: formatDateLocalISO(),
        status: "Ativo",
        responsaveis,
        ra: ra || undefined,
        raca: raca || undefined,
        sexo: sexo || undefined,
        naturalDe: naturalDe || undefined,
        estado: estado || undefined,
        cep: cep || undefined,
        endereco: endereco || undefined,
        bairro: bairro || undefined,
        telefoneAluno: telefoneAluno || undefined,
        religiao: religiao || undefined,
        escolaAnteriorNome: escolaAnteriorNome || undefined,
        escolaAnteriorTempo: escolaAnteriorTempo || undefined,
        pessoasAutorizadas: autorizadas.filter((a) => a.nome.trim()),
        fichaSaude: saude,
      };

      await onSalvar(aluno);
      toast.success("Matrícula realizada!", `${nome} cadastrado(a) com sucesso.`);
      fechar();
    } catch (e) {
      // A store já mostra a mensagem retornada pela API. Manter o modal aberto
      // permite corrigir os dados e tentar de novo sem perder o preenchimento.
      console.warn("[matricula] não foi possível salvar", e);
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={() => !salvando && fechar()}
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
            <button onClick={fechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
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
          {passo === 1 && (
            <PassoAluno
              nome={nome} setNome={setNome}
              dataNascimento={dataNascimento} setDataNascimento={setDataNascimento}
              sexo={sexo} setSexo={setSexo}
              cpf={cpf} setCpf={setCpf}
              rg={rg} setRg={setRg}
              ra={ra} setRa={setRa}
              raca={raca} setRaca={setRaca}
              naturalDe={naturalDe} setNaturalDe={setNaturalDe}
              estado={estado} setEstado={setEstado}
              cep={cep} setCep={setCep}
              endereco={endereco} setEndereco={setEndereco}
              bairro={bairro} setBairro={setBairro}
              telefoneAluno={telefoneAluno} setTelefoneAluno={setTelefoneAluno}
              turmaId={turmaId} setTurmaId={setTurmaId}
              bilingue={bilingue} setBilingue={setBilingue}
              religiao={religiao} setReligiao={setReligiao}
              escolaAnteriorNome={escolaAnteriorNome} setEscolaAnteriorNome={setEscolaAnteriorNome}
              escolaAnteriorTempo={escolaAnteriorTempo} setEscolaAnteriorTempo={setEscolaAnteriorTempo}
              turmas={turmas}
            />
          )}
          {passo === 2 && <PassoResponsavel titulo="Dados do Pai" tipo="Pai" dados={pai} setDados={setPai} />}
          {passo === 3 && <PassoResponsavel titulo="Dados da Mãe" tipo="Mãe" dados={mae} setDados={setMae} />}
          {passo === 4 && <PassoAutorizadas autorizadas={autorizadas} setAutorizadas={setAutorizadas} />}
          {passo === 5 && <PassoSaude saude={saude} setSaude={setSaude} />}
          {passo === 6 && (
            <PassoConclusao
              nome={nome}
              turmaId={turmaId}
              turmas={turmas}
              pai={pai}
              mae={mae}
            />
          )}
        </div>

        {/* Footer com botões */}
        <div className="border-t p-4 flex items-center justify-between shrink-0 bg-muted/30">
          <div className="text-xs text-muted-foreground">
            Etapa {passo} de {PASSOS.length}
          </div>
          <div className="flex gap-2">
            {passo > 1 && (
              <Button type="button" variant="outline" onClick={anterior} disabled={salvando}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
              </Button>
            )}
            {passo < 6 ? (
              <Button
                type="button"
                onClick={proximo}
                disabled={passo === 1 && (!nome.trim() || !dataNascimento || !turmaId)}
              >
                Próximo <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={finalizar}
                disabled={salvando || !nome.trim() || !dataNascimento || !turmaId}
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
  );
}

// ===== ETAPA 1: ALUNO =====
function PassoAluno(props: {
  nome: string; setNome: (v: string) => void;
  dataNascimento: string; setDataNascimento: (v: string) => void;
  sexo: "M" | "F" | ""; setSexo: (v: "M" | "F" | "") => void;
  cpf: string; setCpf: (v: string) => void;
  rg: string; setRg: (v: string) => void;
  ra: string; setRa: (v: string) => void;
  raca: string; setRaca: (v: string) => void;
  naturalDe: string; setNaturalDe: (v: string) => void;
  estado: string; setEstado: (v: string) => void;
  cep: string; setCep: (v: string) => void;
  endereco: string; setEndereco: (v: string) => void;
  bairro: string; setBairro: (v: string) => void;
  telefoneAluno: string; setTelefoneAluno: (v: string) => void;
  turmaId: string; setTurmaId: (v: string) => void;
  bilingue: boolean; setBilingue: (v: boolean) => void;
  religiao: string; setReligiao: (v: string) => void;
  escolaAnteriorNome: string; setEscolaAnteriorNome: (v: string) => void;
  escolaAnteriorTempo: string; setEscolaAnteriorTempo: (v: string) => void;
  turmas: Turma[];
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-emerald-600" /> Dados do aluno
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Label>Nome completo *</Label>
          <Input className="mt-1.5" required value={props.nome} onChange={(e) => props.setNome(e.target.value)} />
        </div>
        <div>
          <Label>Sexo</Label>
          <select
            value={props.sexo}
            onChange={(e) => props.setSexo(e.target.value as "M" | "F" | "")}
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
          <Input className="mt-1.5" type="date" required value={props.dataNascimento} onChange={(e) => props.setDataNascimento(e.target.value)} />
        </div>
        <div>
          <Label>RA</Label>
          <Input className="mt-1.5" value={props.ra} onChange={(e) => props.setRa(e.target.value)} placeholder="Registro acadêmico" />
        </div>
        <div>
          <Label>CPF</Label>
          <Input className="mt-1.5" value={props.cpf} onChange={(e) => props.setCpf(e.target.value)} />
        </div>
        <div>
          <Label>RG</Label>
          <Input className="mt-1.5" value={props.rg} onChange={(e) => props.setRg(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Raça/Cor</Label>
          <Input className="mt-1.5" value={props.raca} onChange={(e) => props.setRaca(e.target.value)} placeholder="Branca, Parda, etc" />
        </div>
        <div>
          <Label>Natural de</Label>
          <Input className="mt-1.5" value={props.naturalDe} onChange={(e) => props.setNaturalDe(e.target.value)} placeholder="Cidade natal" />
        </div>
        <div>
          <Label>Estado</Label>
          <Input className="mt-1.5" maxLength={2} value={props.estado} onChange={(e) => props.setEstado(e.target.value.toUpperCase())} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label>CEP</Label>
          <Input className="mt-1.5" value={props.cep} onChange={(e) => props.setCep(e.target.value)} placeholder="00000-000" />
        </div>
        <div className="md:col-span-2">
          <Label>Endereço</Label>
          <Input className="mt-1.5" value={props.endereco} onChange={(e) => props.setEndereco(e.target.value)} placeholder="Rua, número" />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input className="mt-1.5" value={props.telefoneAluno} onChange={(e) => props.setTelefoneAluno(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>Bairro</Label>
          <Input className="mt-1.5" value={props.bairro} onChange={(e) => props.setBairro(e.target.value)} />
        </div>
        <div>
          <Label>Turma</Label>
          <select
            value={props.turmaId}
            onChange={(e) => props.setTurmaId(e.target.value)}
            disabled={props.turmas.length === 0}
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {props.turmas.length === 0 && <option value="">Nenhuma turma cadastrada</option>}
            {props.turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.nome} ({t.turno})</option>
            ))}
          </select>
          {props.turmas.length === 0 && (
            <p className="mt-1 text-xs text-amber-700">Crie uma turma antes de concluir a matrícula.</p>
          )}
        </div>
        <div>
          <Label>Religião</Label>
          <Input className="mt-1.5" value={props.religiao} onChange={(e) => props.setReligiao(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={props.bilingue}
            onChange={(e) => props.setBilingue(e.target.checked)}
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
            <Input className="mt-1.5" value={props.escolaAnteriorNome} onChange={(e) => props.setEscolaAnteriorNome(e.target.value)} placeholder="Deixe vazio se não houve" />
          </div>
          <div>
            <Label>Tempo na escola anterior</Label>
            <Input className="mt-1.5" value={props.escolaAnteriorTempo} onChange={(e) => props.setEscolaAnteriorTempo(e.target.value)} placeholder="Ex: 2 anos" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== ETAPAS 2 e 3: PAI / MÃE =====
function PassoResponsavel(props: {
  titulo: string;
  tipo: "Pai" | "Mãe";
  dados: ResponsavelForm;
  setDados: (d: ResponsavelForm) => void;
}) {
  const upd = <K extends keyof ResponsavelForm>(k: K, v: ResponsavelForm[K]) =>
    props.setDados({ ...props.dados, [k]: v });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-emerald-600" /> {props.titulo}
      </h3>
      <p className="text-xs text-muted-foreground">
        Se {props.tipo === "Pai" ? "não houver pai cadastrado" : "não houver mãe cadastrada"}, pode deixar em branco e avançar.
      </p>

      <div>
        <Label>Nome completo</Label>
        <Input className="mt-1.5" value={props.dados.nome} onChange={(e) => upd("nome", e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label>CPF</Label>
          <Input className="mt-1.5" value={props.dados.cpf} onChange={(e) => upd("cpf", e.target.value)} placeholder="000.000.000-00" />
        </div>
        <div>
          <Label>RG</Label>
          <Input className="mt-1.5" value={props.dados.rg} onChange={(e) => upd("rg", e.target.value)} />
        </div>
        <div>
          <Label>Data nascimento</Label>
          <Input className="mt-1.5" type="date" value={props.dados.dataNascimento} onChange={(e) => upd("dataNascimento", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Profissão</Label>
          <Input className="mt-1.5" value={props.dados.profissao} onChange={(e) => upd("profissao", e.target.value)} />
        </div>
        <div>
          <Label>Local de trabalho</Label>
          <Input className="mt-1.5" value={props.dados.localTrabalho} onChange={(e) => upd("localTrabalho", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label>Telefone</Label>
          <Input className="mt-1.5" value={props.dados.telefone} onChange={(e) => upd("telefone", e.target.value)} placeholder="(12) 91234-5678" />
        </div>
        <div>
          <Label>Email</Label>
          <Input className="mt-1.5" type="email" value={props.dados.email} onChange={(e) => upd("email", e.target.value)} placeholder="Usado pra login no Portal dos Pais" />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer rounded-lg border p-3 hover:bg-accent">
        <input
          type="checkbox"
          checked={props.dados.responsavelFinanceiro}
          onChange={(e) => upd("responsavelFinanceiro", e.target.checked)}
          className="rounded"
        />
        <span className="text-sm font-medium">É o responsável financeiro</span>
      </label>
    </div>
  );
}

// ===== ETAPA 4: PESSOAS AUTORIZADAS =====
function PassoAutorizadas({
  autorizadas,
  setAutorizadas,
}: {
  autorizadas: PessoaAutorizada[];
  setAutorizadas: (p: PessoaAutorizada[]) => void;
}) {
  const upd = (i: number, campo: keyof PessoaAutorizada, valor: string) => {
    const novo = [...autorizadas];
    novo[i] = { ...novo[i], [campo]: valor };
    setAutorizadas(novo);
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
        {autorizadas.map((p, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
            <div className="md:col-span-1 text-xs text-muted-foreground font-mono text-center">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="md:col-span-7">
              <Input
                placeholder="Nome completo"
                value={p.nome}
                onChange={(e) => upd(i, "nome", e.target.value)}
              />
            </div>
            <div className="md:col-span-4">
              <Input
                placeholder="Parentesco (avó, tio, etc)"
                value={p.parentesco}
                onChange={(e) => upd(i, "parentesco", e.target.value)}
              />
            </div>
          </div>
        ))}
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
  turmaId,
  turmas,
  pai,
  mae,
}: {
  nome: string;
  turmaId: string;
  turmas: Turma[];
  pai: ResponsavelForm;
  mae: ResponsavelForm;
}) {
  const turma = turmas.find((t) => t.id === turmaId);
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
          <span className="font-semibold">{nome || "—"}</span>
        </div>
        <div className="p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Turma</span>
          <span className="font-semibold">{turma?.nome ?? "—"}</span>
        </div>
        <div className="p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Pai</span>
          <span className="font-semibold">{pai.nome || "—"}</span>
        </div>
        <div className="p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Mãe</span>
          <span className="font-semibold">{mae.nome || "—"}</span>
        </div>
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
