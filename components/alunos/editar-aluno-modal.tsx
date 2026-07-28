"use client";

import * as React from "react";
import { Pencil, X, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import type { Aluno, Responsavel, Turma } from "@/lib/types";

interface Props {
  aberto: boolean;
  aluno: Aluno | null;
  turmas: Turma[];
  onClose: () => void;
  onSalvar: (id: string, patch: Partial<Aluno>) => Promise<void>;
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
  }, [aberto, aluno]);

  if (!aberto || !aluno) return null;

  const setResp = (i: number, campo: keyof Responsavel, valor: string | boolean) => {
    setResponsaveis((atual) => atual.map((r, idx) => (idx === i ? ({ ...r, [campo]: valor } as Responsavel) : r)));
  };
  const addResp = () =>
    setResponsaveis((atual) => [
      ...atual,
      { nome: "", parentesco: "Outro", cpf: "", telefone: "", email: "", endereco: "", principal: false },
    ]);
  const removeResp = (i: number) => setResponsaveis((atual) => atual.filter((_, idx) => idx !== i));

  const salvar = async () => {
    if (!nome.trim()) {
      toast.error("Nome obrigatório", "O aluno precisa de um nome.");
      return;
    }
    if (!turmaId) {
      toast.error("Turma obrigatória", "Selecione a turma do aluno.");
      return;
    }
    setSalvando(true);
    try {
      const limpo = (s: string) => {
        const t = s.trim();
        return t === "" ? undefined : t;
      };
      await onSalvar(aluno.id, {
        nome: nome.trim(),
        dataNascimento,
        sexo: sexo || undefined,
        cpf: cpf.trim(),
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
        responsaveis: responsaveis.filter((r) => r.nome.trim()),
      });
      toast.success("Aluno atualizado", `Os dados de ${nome.split(" ")[0]} foram salvos.`);
      onClose();
    } catch {
      /* a store já mostra o erro; mantém o modal aberto */
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8" onClick={onClose}>
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
                <Input id="ed-nasc" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
              </div>
              <Campo label="CPF" value={cpf} onChange={setCpf} />
              <Campo label="RG" value={rg} onChange={setRg} />
              <Campo label="RA (registro acadêmico)" value={ra} onChange={setRa} />
              <Campo label="Raça/Cor" value={raca} onChange={setRaca} />
              <Campo label="Natural de" value={naturalDe} onChange={setNaturalDe} />
              <Campo label="Estado (UF)" value={estado} onChange={setEstado} />
              <Campo label="Telefone" value={telefoneAluno} onChange={setTelefoneAluno} />
              <Campo label="Religião" value={religiao} onChange={setReligiao} />
            </div>
          </section>

          {/* Endereço */}
          <section>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Endereço</div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Campo label="CEP" value={cep} onChange={setCep} />
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
                      <Campo label="CPF" value={r.cpf ?? ""} onChange={(v) => setResp(i, "cpf", v)} />
                      <Campo label="Telefone" value={r.telefone ?? ""} onChange={(v) => setResp(i, "telefone", v)} />
                      <Campo label="Email" value={r.email ?? ""} onChange={(v) => setResp(i, "email", v)} />
                      <Campo label="Profissão" value={r.profissao ?? ""} onChange={(v) => setResp(i, "profissao", v)} />
                    </div>
                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={Boolean(r.responsavelFinanceiro)}
                        onChange={(e) => setResp(i, "responsavelFinanceiro", e.target.checked)}
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
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar alterações
          </Button>
        </div>
      </div>
    </div>
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
