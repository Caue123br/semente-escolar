"use client";

import * as React from "react";
import { UserPlus, X, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { turmas } from "@/lib/mock-data/turmas";
import type { Aluno } from "@/lib/types";

interface Props {
  aberto: boolean;
  onClose: () => void;
}

export function NovaMatriculaModal({ aberto, onClose }: Props) {
  const { add } = useEntidade("alunos");
  const toast = useToast();
  const [passo, setPasso] = React.useState<"aluno" | "responsavel" | "sucesso">("aluno");

  // Dados aluno
  const [nome, setNome] = React.useState("");
  const [dataNascimento, setDataNascimento] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [turmaId, setTurmaId] = React.useState(turmas[0]?.id ?? "");
  const [bilingue, setBilingue] = React.useState(false);

  // Dados responsável
  const [respNome, setRespNome] = React.useState("");
  const [respParentesco, setRespParentesco] = React.useState<"Mãe" | "Pai" | "Avó" | "Avô" | "Tio" | "Tia" | "Outro">("Mãe");
  const [respCpf, setRespCpf] = React.useState("");
  const [respTelefone, setRespTelefone] = React.useState("");
  const [respEmail, setRespEmail] = React.useState("");
  const [respEndereco, setRespEndereco] = React.useState("");

  const reset = () => {
    setPasso("aluno");
    setNome("");
    setDataNascimento("");
    setCpf("");
    setTurmaId(turmas[0]?.id ?? "");
    setBilingue(false);
    setRespNome("");
    setRespParentesco("Mãe");
    setRespCpf("");
    setRespTelefone("");
    setRespEmail("");
    setRespEndereco("");
  };

  const fechar = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const submitAluno = (e: React.FormEvent) => {
    e.preventDefault();
    setPasso("responsavel");
  };

  const submitResponsavel = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `a-${Date.now()}`;
    const matricula = `2026/${String(Math.floor(1000 + Math.random() * 9000))}`;
    const novo: Aluno = {
      id,
      nome,
      dataNascimento,
      cpf,
      turmaId,
      bilingue,
      matricula,
      dataMatricula: new Date().toISOString().split("T")[0],
      status: "Ativo",
      responsaveis: [
        {
          nome: respNome,
          parentesco: respParentesco,
          cpf: respCpf,
          telefone: respTelefone,
          email: respEmail,
          endereco: respEndereco,
          principal: true,
        },
      ],
    };
    add(novo);
    toast.success(
      "Matrícula realizada!",
      `${nome} foi matriculado(a) em ${turmas.find((t) => t.id === turmaId)?.nome}.`
    );
    setPasso("sucesso");
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={fechar}
    >
      <div
        className="w-full max-w-2xl bg-popover rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Nova matrícula</h2>
              <p className="text-xs text-muted-foreground">
                {passo === "aluno" && "Passo 1 de 2 · Dados do aluno"}
                {passo === "responsavel" && "Passo 2 de 2 · Responsável principal"}
                {passo === "sucesso" && "Cadastro concluído"}
              </p>
            </div>
          </div>
          <button
            onClick={fechar}
            className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Passo 1 - Aluno */}
        {passo === "aluno" && (
          <form onSubmit={submitAluno} className="p-6 space-y-4">
            <div>
              <Label>Nome completo *</Label>
              <Input
                className="mt-1.5"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Sofia Almeida Souza"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de nascimento *</Label>
                <Input
                  className="mt-1.5"
                  type="date"
                  required
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  className="mt-1.5"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div>
              <Label>Turma *</Label>
              <select
                value={turmaId}
                onChange={(e) => setTurmaId(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.totalAlunos}/{t.capacidade} vagas)
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bilingue}
                onChange={(e) => setBilingue(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">Aluno bilíngue (+R$ 580/mês)</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={fechar}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Continuar
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </form>
        )}

        {/* Passo 2 - Responsável */}
        {passo === "responsavel" && (
          <form onSubmit={submitResponsavel} className="p-6 space-y-4">
            <div>
              <Label>Nome do responsável *</Label>
              <Input
                className="mt-1.5"
                required
                value={respNome}
                onChange={(e) => setRespNome(e.target.value)}
                placeholder="Ex: Mariana Almeida"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Parentesco *</Label>
                <select
                  value={respParentesco}
                  onChange={(e) => setRespParentesco(e.target.value as typeof respParentesco)}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option>Mãe</option>
                  <option>Pai</option>
                  <option>Avó</option>
                  <option>Avô</option>
                  <option>Tio</option>
                  <option>Tia</option>
                  <option>Outro</option>
                </select>
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  className="mt-1.5"
                  value={respCpf}
                  onChange={(e) => setRespCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>WhatsApp *</Label>
                <Input
                  className="mt-1.5"
                  required
                  value={respTelefone}
                  onChange={(e) => setRespTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input
                  className="mt-1.5"
                  type="email"
                  required
                  value={respEmail}
                  onChange={(e) => setRespEmail(e.target.value)}
                  placeholder="seu@email.com.br"
                />
              </div>
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                className="mt-1.5"
                value={respEndereco}
                onChange={(e) => setRespEndereco(e.target.value)}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPasso("aluno")}>
                Voltar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Confirmar matrícula
                <Check className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </form>
        )}

        {/* Sucesso */}
        {passo === "sucesso" && (
          <div className="p-10 text-center">
            <div className="relative inline-flex">
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-2xl animate-pulse" />
              <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-xl">
                <Check className="h-10 w-10 text-white" strokeWidth={3} />
              </div>
            </div>
            <h3 className="mt-5 text-2xl font-bold tracking-tight">
              Matrícula concluída! 🎉
            </h3>
            <p className="mt-2 text-muted-foreground">
              <strong>{nome}</strong> agora faz parte da{" "}
              <strong>{turmas.find((t) => t.id === turmaId)?.nome}</strong>.
            </p>
            <div className="mt-6 flex gap-2 justify-center">
              <Button variant="outline" onClick={fechar}>
                Fechar
              </Button>
              <Button
                onClick={() => {
                  reset();
                  setPasso("aluno");
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Matricular outro aluno
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
