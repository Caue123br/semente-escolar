"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, GraduationCap, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { podeGerenciarAlunos } from "@/lib/access-control";
import { usePerfil } from "@/lib/perfil-context";
import { useToast } from "@/lib/toast";
import type { Turma } from "@/lib/types";

interface Props {
  aberto: boolean;
  onClose: () => void;
  turmas: Turma[];
  onSalvar: (id: string, patch: Partial<Turma>) => Promise<void>;
}

type Professora = { id: string; nome: string };
const selectClass = "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function GerenciarTurmasModal({ aberto, onClose, turmas, onSalvar }: Props) {
  const { perfil, carregando: carregandoPerfil } = usePerfil();
  const podeGerenciar = podeGerenciarAlunos(perfil);
  const [professoras, setProfessoras] = React.useState<Professora[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [erroProfessoras, setErroProfessoras] = React.useState<string | null>(null);
  const [salvandoId, setSalvandoId] = React.useState<string | null>(null);
  const [tentativa, setTentativa] = React.useState(0);

  React.useEffect(() => {
    if (!aberto || carregandoPerfil || !podeGerenciar) return;
    const controller = new AbortController();
    setCarregando(true);
    setProfessoras([]);
    setErroProfessoras(null);
    fetch("/api/professores", { cache: "no-store", signal: controller.signal })
      .then(async (resposta) => {
        const corpo = await resposta.json().catch(() => ({}));
        if (!resposta.ok || !Array.isArray(corpo.items)) {
          throw new Error(corpo.error || "Não foi possível listar as professoras com acesso.");
        }
        if (!controller.signal.aborted) setProfessoras(corpo.items);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setErroProfessoras(error instanceof Error ? error.message : "Não foi possível listar as professoras com acesso.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [aberto, carregandoPerfil, podeGerenciar, tentativa]);

  const fechar = React.useCallback(() => {
    if (!salvandoId) onClose();
  }, [salvandoId, onClose]);

  React.useEffect(() => {
    if (!aberto) return;
    const tecla = (event: KeyboardEvent) => {
      if (event.key === "Escape") fechar();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aberto, fechar]);

  if (!aberto || carregandoPerfil || !podeGerenciar) return null;

  const pendentes = turmas.filter((turma) => !turma.professorNome?.trim()).length;
  const salvar = async (id: string, patch: Partial<Turma>) => {
    if (salvandoId) return;
    setSalvandoId(id);
    try {
      await onSalvar(id, patch);
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={fechar}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gerenciar-turmas-titulo"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-popover shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b p-5">
          <div className="flex gap-3">
            <GraduationCap className="mt-1 h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <h2 id="gerenciar-turmas-titulo" className="text-lg font-bold">Turmas, salas e professoras</h2>
              <p className="mt-1 text-sm text-muted-foreground">{turmas.length} turma(s) · {pendentes} sem professora atribuída</p>
              <p className="mt-1 text-xs text-muted-foreground">Cada turma tem uma responsável. Uma professora pode cuidar de mais de uma turma.</p>
            </div>
          </div>
          <button type="button" onClick={fechar} disabled={Boolean(salvandoId)} className="rounded-md p-2 hover:bg-accent disabled:opacity-50" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto p-5">
          <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">Informe o nome da responsável sem acesso ao sistema ou vincule uma professora com acesso já cadastrado. Informar o nome não cria uma conta.</p>
          {carregando && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando professoras com acesso…</p>}
          {erroProfessoras && (
            <div role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
              <p>{erroProfessoras} Você ainda pode informar a responsável pelo nome.</p>
              <Button type="button" variant="outline" className="mt-2" onClick={() => setTentativa((valor) => valor + 1)}>Tentar listar novamente</Button>
            </div>
          )}
          {!carregando && !erroProfessoras && professoras.length === 0 && (
            <p className="rounded-lg border p-3 text-sm text-muted-foreground">
              Nenhuma professora com acesso cadastrada. Informe o nome da responsável para organizar as salas.
              {perfil === "diretor" ? <> Para vincular um acesso, cadastre o perfil Professor em <Link href="/configuracoes" className="font-medium text-primary underline">Configurações &gt; Usuários</Link>.</> : " Se precisar de acesso ao sistema, peça à direção para cadastrar o perfil Professor em Configurações > Usuários."}
            </p>
          )}
          {turmas.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma turma cadastrada. Use “Nova turma” na tela de Alunos para criar a primeira sala.</p>
          ) : turmas.map((turma) => (
            <LinhaTurma key={turma.id} turma={turma} professoras={professoras} carregandoProfessoras={carregando} desabilitada={Boolean(salvandoId)} salvando={salvandoId === turma.id} onSalvar={salvar} />
          ))}
        </div>

        <footer className="flex justify-end border-t p-4"><Button type="button" variant="outline" onClick={fechar} disabled={Boolean(salvandoId)}>Fechar</Button></footer>
      </section>
    </div>
  );
}

function LinhaTurma({ turma, professoras, carregandoProfessoras, desabilitada, salvando, onSalvar }: {
  turma: Turma;
  professoras: Professora[];
  carregandoProfessoras: boolean;
  desabilitada: boolean;
  salvando: boolean;
  onSalvar: Props["onSalvar"];
}) {
  const toast = useToast();
  const [nome, setNome] = React.useState(turma.nome);
  const [capacidade, setCapacidade] = React.useState(String(turma.capacidade));
  const [modo, setModo] = React.useState<"nome" | "usuario">(turma.professorId ? "usuario" : "nome");
  const [professorId, setProfessorId] = React.useState(turma.professorId ?? "");
  const [professorNome, setProfessorNome] = React.useState(turma.professorNome ?? "");
  const [mudouProfessora, setMudouProfessora] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNome(turma.nome);
  }, [turma.id, turma.nome]);

  React.useEffect(() => {
    setCapacidade(String(turma.capacidade));
  }, [turma.id, turma.capacidade]);

  React.useEffect(() => {
    setModo(turma.professorId ? "usuario" : "nome");
    setProfessorId(turma.professorId ?? "");
    setProfessorNome(turma.professorNome ?? "");
    setMudouProfessora(false);
  }, [turma.id, turma.professorId, turma.professorNome]);

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    const capacidadeNumero = Number(capacidade);
    if (nome.trim().length < 2 || nome.trim().length > 120) {
      setErro("Informe o nome da sala/turma com 2 a 120 caracteres.");
      return;
    }
    if (!Number.isInteger(capacidadeNumero) || capacidadeNumero < 1 || capacidadeNumero > 100) {
      setErro("A capacidade deve estar entre 1 e 100 alunos.");
      return;
    }
    const patch: Partial<Turma> = { nome: nome.trim(), capacidade: capacidadeNumero };
    if (mudouProfessora) {
      if (modo === "usuario") {
        if (!professoras.some((professora) => professora.id === professorId)) {
          setErro("Escolha uma professora com acesso ativo ou informe o nome da responsável.");
          return;
        }
        patch.professorId = professorId;
      } else {
        if (professorNome.trim().length < 2 || professorNome.trim().length > 200) {
          setErro("Informe o nome da responsável com 2 a 200 caracteres. Para deixar a turma sem professora, use “Remover atribuição”.");
          return;
        }
        patch.professorId = "";
        patch.professorNome = professorNome.trim();
      }
    }
    try {
      await onSalvar(turma.id, patch);
      setMudouProfessora(false);
      toast.success("Turma atualizada", `${nome.trim()} foi salva.`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar a turma. Tente novamente.");
    }
  };

  const remover = async () => {
    setErro(null);
    try {
      await onSalvar(turma.id, { professorId: "", professorNome: "" });
      setProfessorId("");
      setProfessorNome("");
      setModo("nome");
      setMudouProfessora(false);
      toast.success("Atribuição removida", "A turma está sem professora responsável.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível remover a atribuição.");
    }
  };

  const id = `gerenciar-${turma.id}`;
  const professoraIndisponivel = professorId && !professoras.some((professora) => professora.id === professorId);

  return (
    <form onSubmit={salvar} className="rounded-xl border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{turma.nome}</h3>
        <span className="text-xs text-muted-foreground">{turma.serie} · {turma.turno} · {turma.totalAlunos} aluno(s)</span>
      </div>
      <p className={`mb-4 text-sm ${turma.professorNome?.trim() ? "text-muted-foreground" : "text-amber-700 dark:text-amber-400"}`}>
        {turma.professorNome?.trim() || "Sem professora atribuída"}
      </p>
      <fieldset disabled={desabilitada} className="space-y-3 disabled:opacity-60">
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <div><Label htmlFor={`${id}-nome`}>Nome da sala/turma</Label><Input id={`${id}-nome`} className="mt-1.5" value={nome} onChange={(event) => setNome(event.target.value)} minLength={2} maxLength={120} required /></div>
          <div><Label htmlFor={`${id}-capacidade`}>Capacidade</Label><Input id={`${id}-capacidade`} className="mt-1.5" type="number" min={1} max={100} value={capacidade} onChange={(event) => setCapacidade(event.target.value)} required /></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${id}-modo`}>Professora responsável</Label>
            <select id={`${id}-modo`} className={selectClass} value={modo} onChange={(event) => { setModo(event.target.value as "nome" | "usuario"); setMudouProfessora(true); }}>
              <option value="nome">Informar nome sem acesso</option>
              <option value="usuario">Vincular professora com acesso</option>
            </select>
          </div>
          <div>
            {modo === "nome" ? <>
              <Label htmlFor={`${id}-professora-nome`}>Nome da responsável</Label>
              <Input id={`${id}-professora-nome`} className="mt-1.5" value={professorNome} maxLength={200} onChange={(event) => { setProfessorNome(event.target.value); setMudouProfessora(true); }} placeholder="Nome da professora" />
            </> : <>
              <Label htmlFor={`${id}-professora-id`}>Professora com acesso</Label>
              <select id={`${id}-professora-id`} className={selectClass} value={professorId} disabled={carregandoProfessoras} onChange={(event) => { setProfessorId(event.target.value); setMudouProfessora(true); }}>
                <option value="">Selecione uma professora</option>
                {professoraIndisponivel && <option value={professorId} disabled>{turma.professorNome || "Atribuição atual"} — acesso indisponível</option>}
                {professoras.map((professora) => <option key={professora.id} value={professora.id}>{professora.nome}</option>)}
              </select>
            </>}
          </div>
        </div>
        {erro && <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{erro}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {turma.professorNome?.trim() && <Button type="button" variant="ghost" onClick={() => void remover()}>Remover atribuição</Button>}
          <Button type="submit">{salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar turma</Button>
        </div>
      </fieldset>
    </form>
  );
}
