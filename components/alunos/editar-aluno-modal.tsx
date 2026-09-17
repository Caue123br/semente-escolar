"use client";

import * as React from "react";
import { Pencil, X, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { InputCPF, InputTelefone, InputCEP } from "@/components/shared/campos-mascarados";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { limparCPF, validarCPF } from "@/lib/cpf";
import { formatDateLocalISO } from "@/lib/utils";
import { ErroApi, type OpcoesEscrita } from "@/lib/data/store";
import type { Aluno, Responsavel, Turma } from "@/lib/types";

interface Props {
  aberto: boolean;
  aluno: Aluno | null;
  turmas: Turma[];
  onClose: () => void;
  onSalvar: (id: string, patch: Partial<Aluno>, opcoes?: OpcoesEscrita) => Promise<void>;
}

/** Turma cheia na transferência: a tela decide se insiste (mesmo 422 da matrícula). */
interface ConflitoLotacao {
  mensagem: string;
  turmaNome: string;
  ocupacao: number;
  capacidade: number;
}

function numeroDoPayload(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

const selectCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const PARENTESCOS: Responsavel["parentesco"][] = ["Mãe", "Pai", "Avó", "Avô", "Tio", "Tia", "Outro"];

export function EditarAlunoModal({ aberto, aluno, turmas, onClose, onSalvar }: Props) {
  const toast = useToast();
  const [salvando, setSalvando] = React.useState(false);

  // Campos do aluno
  const [nome, setNome] = React.useState("");
  const [dataNascimento, setDataNascimento] = React.useState("");
  const [sexo, setSexo] = React.useState<"M" | "F" | "">("");
  const [cpf, setCpf] = React.useState("");
  const [rg, setRg] = React.useState("");
  const [ra, setRa] = React.useState("");
  const [raca, setRaca] = React.useState("");
  const [naturalDe, setNaturalDe] = React.useState("");
  const [estado, setEstado] = React.useState("");
  const [cep, setCep] = React.useState("");
  const [endereco, setEndereco] = React.useState("");
  const [bairro, setBairro] = React.useState("");
  const [telefoneAluno, setTelefoneAluno] = React.useState("");
  const [religiao, setReligiao] = React.useState("");
  const [turmaId, setTurmaId] = React.useState("");
  const [status, setStatus] = React.useState<Aluno["status"]>("Ativo");
  const [bilingue, setBilingue] = React.useState(false);
  const [observacoes, setObservacoes] = React.useState("");
  const [responsaveis, setResponsaveis] = React.useState<Responsavel[]>([]);
  const [cepStatus, setCepStatus] = React.useState<{
    estado: "vazio" | "buscando" | "ok" | "aviso";
    detalhe?: string;
  }>({ estado: "vazio" });
  const [conflitoLotacao, setConflitoLotacao] = React.useState<ConflitoLotacao | null>(null);
  const cepConsultado = React.useRef("");

  // Recarrega os campos sempre que abrir com um aluno.
  React.useEffect(() => {
    if (!aberto || !aluno) return;
    setNome(aluno.nome ?? "");
    setDataNascimento(aluno.dataNascimento ?? "");
    setSexo(aluno.sexo ?? "");
    setCpf(aluno.cpf ?? "");
    setRg(aluno.rg ?? "");
    setRa(aluno.ra ?? "");
    setRaca(aluno.raca ?? "");
    setNaturalDe(aluno.naturalDe ?? "");
    setEstado(aluno.estado ?? "");
    setCep(aluno.cep ?? "");
    setEndereco(aluno.endereco ?? "");
    setBairro(aluno.bairro ?? "");
    setTelefoneAluno(aluno.telefoneAluno ?? "");
    setReligiao(aluno.religiao ?? "");
    setTurmaId(aluno.turmaId ?? "");
    setStatus(aluno.status ?? "Ativo");
    setBilingue(Boolean(aluno.bilingue));
    setObservacoes(aluno.observacoes ?? "");
    setResponsaveis(aluno.responsaveis ? aluno.responsaveis.map((r) => ({ ...r })) : []);
    setCepStatus({ estado: "vazio" });
    setConflitoLotacao(null);
    cepConsultado.current = "";
  }, [aberto, aluno]);

  if (!aberto || !aluno) return null;

  // A consulta de CEP passa pelo servidor (/api/cep) e mostra o que aconteceu.
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
      };
      if (!resposta.ok || !dados.ok) {
        cepConsultado.current = "";
        setCepStatus({
          estado: "aviso",
          detalhe: dados.error || "Não foi possível buscar este CEP. Escreva o endereço à mão.",
        });
        return;
      }
      if (dados.endereco?.trim()) setEndereco(dados.endereco.trim());
      if (dados.bairro?.trim()) setBairro(dados.bairro.trim());
      setCepStatus({ estado: "ok" });
    } catch {
      cepConsultado.current = "";
      setCepStatus({ estado: "aviso", detalhe: "Sem conexão para buscar o CEP. Escreva o endereço à mão." });
    }
  };

  const setResp = (i: number, campo: keyof Responsavel, valor: string | boolean) => {
    setResponsaveis((atual) => atual.map((r, idx) => (idx === i ? ({ ...r, [campo]: valor } as Responsavel) : r)));
  };
  const addResp = () =>
    setResponsaveis((atual) => [
      ...atual,
      { nome: "", parentesco: "Outro", cpf: "", telefone: "", email: "", endereco: "", principal: false },
    ]);
  const removeResp = (i: number) => setResponsaveis((atual) => atual.filter((_, idx) => idx !== i));

  /**
   * Quem é o financeiro pode mudar (separação, troca de responsável). A eleição
   * move os dois campos juntos: `principal` guia cobrança/WhatsApp/CSV e
   * `responsavelFinanceiro` guia contrato e ficha.
   */
  const elegerFinanceiro = (i: number) => {
    setResponsaveis((atual) =>
      atual.map((r, idx) => ({ ...r, principal: idx === i, responsavelFinanceiro: idx === i }))
    );
  };

  const indiceFinanceiro = (() => {
    const porFinanceiro = responsaveis.findIndex((r) => r.responsavelFinanceiro);
    if (porFinanceiro >= 0) return porFinanceiro;
    const porPrincipal = responsaveis.findIndex((r) => r.principal);
    if (porPrincipal >= 0) return porPrincipal;
    return responsaveis.findIndex((r) => r.nome.trim());
  })();

  const salvar = async (confirmarLotacao = false) => {
    if (!nome.trim()) {
      toast.error("Nome obrigatório", "O aluno precisa de um nome.");
      return;
    }
    if (!turmaId) {
      toast.error("Turma obrigatória", "Selecione a turma do aluno.");
      return;
    }
    const cpfAluno = limparCPF(cpf);
    if (cpfAluno && !validarCPF(cpfAluno)) {
      toast.error("CPF do aluno inválido", "Confira os 11 números do documento ou deixe o campo em branco.");
      return;
    }
    if (dataNascimento && dataNascimento > formatDateLocalISO()) {
      toast.error("Data de nascimento no futuro", "Confira o dia, o mês e o ano de nascimento.");
      return;
    }
    const respCpfInvalido = responsaveis.find(
      (r) => r.nome.trim() && limparCPF(r.cpf ?? "") && !validarCPF(r.cpf ?? "")
    );
    if (respCpfInvalido) {
      toast.error(
        "CPF do responsável inválido",
        `Confira os 11 números do CPF de ${respCpfInvalido.nome.trim() || "um dos responsáveis"} ou deixe o campo em branco.`
      );
      return;
    }
    // Um único financeiro, sempre alguém com nome — cobrança e portal precisam de destino.
    const eleito = responsaveis[indiceFinanceiro];
    const preenchidos = responsaveis.filter((r) => r.nome.trim());
    const nomeCurto = preenchidos.find((r) => r.nome.trim().length < 2);
    if (nomeCurto) {
      toast.error("Nome do responsável incompleto", "Escreva o nome completo de cada responsável cadastrado.");
      return;
    }
    if (preenchidos.length > 0 && !preenchidos.some((r) => r.telefone?.trim() || r.email?.trim())) {
      toast.error(
        "Falta o contato da família",
        "Informe telefone ou e-mail de pelo menos um responsável."
      );
      return;
    }
    const financeiro = eleito && eleito.nome.trim() ? eleito : preenchidos[0];
    setSalvando(true);
    try {
      const limpo = (s: string) => {
        const t = s.trim();
        return t === "" ? undefined : t;
      };
      const patch: Partial<Aluno> = {
        nome: nome.trim(),
        dataNascimento,
        sexo: sexo || undefined,
        cpf: cpfAluno,
        rg: limpo(rg),
        ra: limpo(ra),
        raca: limpo(raca),
        naturalDe: limpo(naturalDe),
        estado: limpo(estado),
        cep: limpo(cep),
        endereco: limpo(endereco),
        bairro: limpo(bairro),
        telefoneAluno: limpo(telefoneAluno),
        religiao: limpo(religiao),
        turmaId,
        status,
        bilingue,
        observacoes: limpo(observacoes),
        responsaveis: preenchidos.map((r) => ({
          ...r,
          principal: r === financeiro,
          responsavelFinanceiro: r === financeiro,
        })),
      };
      await onSalvar(
        aluno.id,
        patch,
        confirmarLotacao ? { extras: { confirmarLotacao: true } } : {}
      );
      setConflitoLotacao(null);
      toast.success("Aluno atualizado", `Os dados de ${nome.split(" ")[0]} foram salvos.`);
      onClose();
    } catch (e) {
      // Turma na capacidade: a própria tela pergunta se insiste (a store não avisa).
      if (e instanceof ErroApi && e.codigo === "lotacao") {
        setConflitoLotacao({
          mensagem: e.message,
          turmaNome:
            typeof e.payload.turmaNome === "string"
              ? e.payload.turmaNome
              : turmas.find((t) => t.id === turmaId)?.nome ?? "a turma escolhida",
          ocupacao: numeroDoPayload(e.payload.ocupacao),
          capacidade: numeroDoPayload(e.payload.capacidade),
        });
        return;
      }
      // Outro erro: a store já mostrou a mensagem e o aviso de lotação sai da frente.
      setConflitoLotacao(null);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8"
      onClick={() => !salvando && onClose()}
    >
      <div className="w-full max-w-3xl rounded-2xl border bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Editar aluno</h2>
              <p className="text-xs text-muted-foreground">{aluno.nome} · matrícula {aluno.matricula}</p>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
          {/* Situação */}
          <section>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Situação</div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="ed-turma">Turma (período)</Label>
                <select id="ed-turma" className={selectCls} value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                  <option value="">— selecione —</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ed-status">Status</Label>
                <select id="ed-status" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as Aluno["status"])}>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Trancado">Trancado</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={bilingue} onChange={(e) => setBilingue(e.target.checked)} className="h-4 w-4" />
                  Programa bilíngue
                </label>
              </div>
            </div>
          </section>

          {/* Dados do aluno */}
          <section>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados do aluno</div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Campo label="Nome completo" value={nome} onChange={setNome} className="sm:col-span-2" />
              <div className="space-y-1.5">
                <Label htmlFor="ed-sexo">Sexo</Label>
                <select id="ed-sexo" className={selectCls} value={sexo} onChange={(e) => setSexo(e.target.value as "M" | "F" | "")}>
                  <option value="">—</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ed-nasc">Data de nascimento</Label>
                <Input
                  id="ed-nasc"
                  type="date"
                  max={formatDateLocalISO()}
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <InputCPF value={cpf} onChange={setCpf} />
              </div>
              <Campo label="RG" value={rg} onChange={setRg} />
              <Campo label="RA (registro acadêmico)" value={ra} onChange={setRa} />
              <Campo label="Raça/Cor" value={raca} onChange={setRaca} />
              <Campo label="Natural de" value={naturalDe} onChange={setNaturalDe} />
              <Campo label="Estado (UF)" value={estado} onChange={setEstado} />
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <InputTelefone value={telefoneAluno} onChange={setTelefoneAluno} />
              </div>
              <Campo label="Religião" value={religiao} onChange={setReligiao} />
            </div>
          </section>

          {/* Endereço */}
          <section>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Endereço</div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <InputCEP
                  value={cep}
                  onChange={(v) => {
                    setCep(v);
                    void buscarEnderecoPorCep(v);
                  }}
                />
                {cepStatus.estado === "buscando" && (
                  <p className="text-xs text-muted-foreground">Buscando endereço…</p>
                )}
                {cepStatus.estado === "ok" && <p className="text-xs text-emerald-700">Endereço preenchido</p>}
                {cepStatus.estado === "aviso" && (
                  <p className="text-xs text-amber-700">{cepStatus.detalhe}</p>
                )}
              </div>
              <Campo label="Endereço" value={endereco} onChange={setEndereco} className="sm:col-span-2" />
              <Campo label="Bairro" value={bairro} onChange={setBairro} />
            </div>
          </section>

          {/* Responsáveis */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responsáveis</div>
              <Button size="sm" variant="outline" onClick={addResp}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              O responsável financeiro recebe boleto, cobrança, WhatsApp e acesso ao Portal dos Pais.
              Trocou de responsável? Marque a pessoa certa abaixo.
            </p>
            {responsaveis.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum responsável cadastrado.</p>
            ) : (
              <div className="space-y-4">
                {responsaveis.map((r, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium">{r.nome || `Responsável ${i + 1}`}</span>
                      <button className="text-danger hover:opacity-80" onClick={() => removeResp(i)} aria-label="Remover">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Campo label="Nome" value={r.nome} onChange={(v) => setResp(i, "nome", v)} />
                      <div className="space-y-1.5">
                        <Label>Parentesco</Label>
                        <select className={selectCls} value={r.parentesco} onChange={(e) => setResp(i, "parentesco", e.target.value)}>
                          {PARENTESCOS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>CPF</Label>
                        <InputCPF value={r.cpf ?? ""} onChange={(v) => setResp(i, "cpf", v)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Telefone</Label>
                        <InputTelefone value={r.telefone ?? ""} onChange={(v) => setResp(i, "telefone", v)} />
                      </div>
                      <Campo label="Email" value={r.email ?? ""} onChange={(v) => setResp(i, "email", v)} />
                      <Campo label="Profissão" value={r.profissao ?? ""} onChange={(v) => setResp(i, "profissao", v)} />
                    </div>
                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="responsavel-financeiro"
                        className="h-4 w-4"
                        checked={i === indiceFinanceiro}
                        onChange={() => elegerFinanceiro(i)}
                      />
                      É o responsável financeiro
                    </label>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Observações */}
          <section>
            <Label htmlFor="ed-obs">Observações</Label>
            <textarea
              id="ed-obs"
              className="mt-1.5 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Anotações internas sobre o aluno…"
            />
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button onClick={() => void salvar()} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar alterações
          </Button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      aberto={conflitoLotacao !== null}
      titulo="A turma está na capacidade"
      descricao={
        conflitoLotacao
          ? conflitoLotacao.capacidade > 0
            ? `${conflitoLotacao.turmaNome} já tem ${conflitoLotacao.ocupacao} de ${conflitoLotacao.capacidade} vagas ocupadas. Você pode escolher outra turma, aumentar a capacidade dela em Turmas ou transferir mesmo assim — confirme só com a direção.`
            : conflitoLotacao.mensagem
          : ""
      }
      textoBotaoConfirmar="Transferir mesmo assim"
      textoBotaoCancelar="Escolher outra turma"
      onConfirmar={() => salvar(true)}
      onFechar={() => setConflitoLotacao(null)}
    />
    </>
  );
}

function Campo({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
