"use client";

import * as React from "react";
import {
  Heart,
  Plus,
  Thermometer,
  Pill,
  AlertTriangle,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { initials, formatDateBR, formatDateLocalISO, cn } from "@/lib/utils";
import { SkeletonList } from "@/components/ui/skeleton";

interface Intercorrencia {
  id: string;
  alunoId: string;
  alunoNome: string;
  data: string;
  hora: string | null;
  tipo: string;
  descricao: string;
  temperatura: number | null;
  medicamentoNome: string | null;
  medicamentoDose: string | null;
  registradoPorNome: string | null;
  notificouPais: boolean;
  createdAt: string | null;
}

const TIPOS_INTERCORRENCIA = [
  { id: "febre", label: "Febre", icon: Thermometer, cor: "bg-rose-100 text-rose-700" },
  { id: "medicamento", label: "Medicamento", icon: Pill, cor: "bg-blue-100 text-blue-700" },
  { id: "queda", label: "Queda", icon: AlertTriangle, cor: "bg-amber-100 text-amber-700" },
  { id: "mal_estar", label: "Mal-estar", icon: Heart, cor: "bg-orange-100 text-orange-700" },
  { id: "alergia", label: "Alergia", icon: AlertTriangle, cor: "bg-rose-100 text-rose-700" },
  { id: "higiene", label: "Higiene", icon: Heart, cor: "bg-emerald-100 text-emerald-700" },
  { id: "comportamento", label: "Comportamento", icon: Heart, cor: "bg-violet-100 text-violet-700" },
  { id: "outros", label: "Outros", icon: Heart, cor: "bg-slate-100 text-slate-700" },
];

export default function SaudePage() {
  const { items: alunos } = useEntidade("alunos");
  const toast = useToast();
  const [intercorrencias, setIntercorrencias] = React.useState<Intercorrencia[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [filtroTipo, setFiltroTipo] = React.useState<string>("todos");

  const carregar = React.useCallback(async () => {
    try {
      const r = await fetch("/api/intercorrencias", { cache: "no-store" });
      const data = await r.json();
      setIntercorrencias(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setCarregando(false);
    }
  }, []);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const [filtroAluno, setFiltroAluno] = React.useState<string>("todos");
  const filtradas = intercorrencias.filter((i) => {
    if (filtroTipo !== "todos" && i.tipo !== filtroTipo) return false;
    if (filtroAluno !== "todos" && i.alunoId !== filtroAluno) return false;
    return true;
  });
  const hoje = formatDateLocalISO();
  const ocorrenciasHoje = intercorrencias.filter((i) => i.data === hoje);
  const febres = intercorrencias.filter((i) => i.tipo === "febre" && i.data === hoje).length;
  const medicamentos = intercorrencias.filter((i) => i.tipo === "medicamento" && i.data === hoje).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-rose-600">
            <Heart className="h-3.5 w-3.5" /> SAÚDE
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Intercorrências de saúde
          </h1>
          <p className="text-sm text-muted-foreground">
            Febre, queda, medicamento e alergia — registre o ocorrido e confirme separadamente qualquer aviso aos responsáveis.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="mr-2 h-4 w-4" /> Registrar intercorrência
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Hoje</div>
          <div className="mt-1 text-2xl font-bold">{ocorrenciasHoje.length}</div>
          <div className="text-xs text-muted-foreground">Registros do dia</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Febres hoje</div>
          <div className="mt-1 text-2xl font-bold text-rose-600">{febres}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Medicamentos hoje</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{medicamentos}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Total no histórico</div>
          <div className="mt-1 text-2xl font-bold">{intercorrencias.length}</div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filtroAluno}
          onChange={(e) => setFiltroAluno(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="todos">Todos os alunos</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>
        <button
          onClick={() => setFiltroTipo("todos")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
            filtroTipo === "todos" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
          )}
        >
          Todos
        </button>
        {TIPOS_INTERCORRENCIA.map((t) => {
          const Ic = t.icon;
          const ativo = filtroTipo === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setFiltroTipo(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
                ativo ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              <Ic className="h-3 w-3" />
              {t.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de intercorrências</CardTitle>
          <CardDescription>{filtradas.length} registro(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {carregando ? (
            <SkeletonList items={4} />
          ) : filtradas.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              {filtroTipo === "todos"
                ? "Nenhuma intercorrência registrada ainda. Clica em 'Registrar intercorrência' acima."
                : `Nenhuma intercorrência do tipo "${TIPOS_INTERCORRENCIA.find((t) => t.id === filtroTipo)?.label}".`}
            </div>
          ) : (
            filtradas.map((i) => {
              const tipo = TIPOS_INTERCORRENCIA.find((t) => t.id === i.tipo);
              const Ic = tipo?.icon ?? Heart;
              return (
                <div key={i.id} className="flex items-start gap-3 rounded-lg border p-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-rose-100 text-rose-700 text-xs">
                      {initials(i.alunoNome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{i.alunoNome}</span>
                      <Badge className={cn("text-[10px] border-transparent", tipo?.cor)}>
                        <Ic className="h-3 w-3 mr-1" />
                        {tipo?.label ?? i.tipo}
                      </Badge>
                      {i.temperatura && (
                        <Badge variant="danger" className="text-[10px]">
                          🌡️ {i.temperatura}°C
                        </Badge>
                      )}
                      <Badge variant={i.notificouPais ? "success" : "warning"} className="text-[10px]">
                        {i.notificouPais ? "✓ Aviso aos responsáveis confirmado" : "Aviso aos responsáveis pendente"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{i.descricao}</div>
                    {i.medicamentoNome && (
                      <div className="text-xs text-blue-700 mt-1">
                        💊 {i.medicamentoNome} {i.medicamentoDose && `· ${i.medicamentoDose}`}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      {formatDateBR(i.data)} {i.hora && `às ${i.hora.slice(0, 5)}`} · registrado por {i.registradoPorNome}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <NovaIntercorrenciaModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        alunos={alunos}
        onCriada={async () => {
          await carregar();
          toast.success("Intercorrência registrada!", "Histórico atualizado.");
          setModalAberto(false);
        }}
      />
    </div>
  );
}

function NovaIntercorrenciaModal({
  aberto,
  onFechar,
  alunos,
  onCriada,
}: {
  aberto: boolean;
  onFechar: () => void;
  alunos: Array<{ id: string; nome: string }>;
  onCriada: () => Promise<void>;
}) {
  const toast = useToast();
  const [alunoId, setAlunoId] = React.useState("");
  const [tipo, setTipo] = React.useState<string>("febre");
  const [descricao, setDescricao] = React.useState("");
  const [temperatura, setTemperatura] = React.useState<number | "">("");
  const [medicamentoNome, setMedicamentoNome] = React.useState("");
  const [medicamentoDose, setMedicamentoDose] = React.useState("");
  const [notificouPais, setNotificouPais] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);

  const fechar = () => {
    if (salvando) return;
    setNotificouPais(false);
    onFechar();
  };

  if (!aberto) return null;

  const aluno = alunos.find((a) => a.id === alunoId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aluno) {
      toast.error("Selecione um aluno", "");
      return;
    }
    setSalvando(true);
    try {
      const r = await fetch("/api/intercorrencias", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alunoId: aluno.id,
          alunoNome: aluno.nome,
          tipo,
          descricao,
          temperatura: temperatura === "" ? undefined : Number(temperatura),
          medicamentoNome: medicamentoNome || undefined,
          medicamentoDose: medicamentoDose || undefined,
          notificouPais,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error("Erro", d.error || "Tente de novo");
        return;
      }
      await onCriada();
      setAlunoId("");
      setDescricao("");
      setTemperatura("");
      setMedicamentoNome("");
      setMedicamentoDose("");
      setNotificouPais(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={fechar}>
      <div className="w-full max-w-xl bg-popover rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Nova intercorrência</h2>
              <p className="text-xs text-muted-foreground">Registro de saúde / bem-estar</p>
            </div>
          </div>
          <button onClick={fechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label>Aluno *</Label>
            <select
              value={alunoId}
              onChange={(e) => setAlunoId(e.target.value)}
              required
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Tipo *</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {TIPOS_INTERCORRENCIA.map((t) => {
                const Ic = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipo(t.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors",
                      tipo === t.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                    )}
                  >
                    <Ic className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          {tipo === "febre" && (
            <div>
              <Label>Temperatura (°C)</Label>
              <Input
                className="mt-1.5"
                type="number"
                step="0.1"
                min="35"
                max="42"
                value={temperatura}
                onChange={(e) => setTemperatura(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Ex: 38.5"
              />
            </div>
          )}
          {tipo === "medicamento" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Medicamento</Label>
                <Input className="mt-1.5" value={medicamentoNome} onChange={(e) => setMedicamentoNome(e.target.value)} placeholder="Ex: Paracetamol" />
              </div>
              <div>
                <Label>Dose</Label>
                <Input className="mt-1.5" value={medicamentoDose} onChange={(e) => setMedicamentoDose(e.target.value)} placeholder="Ex: 5ml" />
              </div>
            </div>
          )}
          <div>
            <Label>Descrição *</Label>
            <textarea
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={3}
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que aconteceu, como o aluno está agora, atitudes tomadas..."
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer rounded-lg border p-3 hover:bg-accent">
            <input
              type="checkbox"
              checked={notificouPais}
              onChange={(e) => setNotificouPais(e.target.checked)}
              className="rounded"
            />
            <div>
              <div className="text-sm font-medium">Responsáveis já foram avisados</div>
              <div className="text-xs text-muted-foreground">
                Marque somente após confirmar o contato manual por ligação, WhatsApp ou outro canal.
              </div>
            </div>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit" disabled={salvando} className="bg-rose-600 hover:bg-rose-700">
              {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Registrar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
