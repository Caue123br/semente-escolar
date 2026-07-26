"use client";

import * as React from "react";
import {
  Megaphone,
  Plus,
  Pin,
  AlertTriangle,
  Calendar,
  BookOpen,
  Bell,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/ui/skeleton";

interface Recado {
  id: string;
  autorNome: string;
  autorCargo: string | null;
  turmaId: string | null;
  alunoId: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  dataLimite: string | null;
  anexoUrl: string | null;
  urgente: boolean;
  pinado: boolean;
  registradoEm: string | null;
}

const TIPOS_RECADO = [
  { id: "recado", label: "Recado", icon: Megaphone, cor: "bg-blue-100 text-blue-700" },
  { id: "licao_de_casa", label: "Lição de casa", icon: BookOpen, cor: "bg-purple-100 text-purple-700" },
  { id: "comunicado", label: "Comunicado", icon: Bell, cor: "bg-amber-100 text-amber-700" },
  { id: "evento", label: "Evento", icon: Calendar, cor: "bg-emerald-100 text-emerald-700" },
  { id: "lembrete", label: "Lembrete", icon: AlertTriangle, cor: "bg-rose-100 text-rose-700" },
];

const TEMPLATES_RECADO: { titulo: string; mensagem: string; tipo?: string }[] = [
  { tipo: "recado", titulo: "Reunião de pais", mensagem: "Comunicamos que haverá reunião de pais na sexta-feira às 18h30 na escola. Sua presença é muito importante. Aguardamos vocês!" },
  { tipo: "recado", titulo: "Material individual", mensagem: "Por favor enviar o material individual atualizado (cadernos, lápis e estojo) na próxima segunda. Obrigado!" },
  { tipo: "licao_de_casa", titulo: "Lição de casa diária", mensagem: "Pedimos que ajude seu filho(a) a fazer a lição de casa enviada hoje. A entrega é amanhã pela manhã." },
  { tipo: "comunicado", titulo: "Feriado escolar", mensagem: "Lembramos que na próxima [DATA] não haverá aula devido a feriado. Retornaremos normalmente no dia seguinte." },
  { tipo: "comunicado", titulo: "Lembrete pagamento", mensagem: "Lembrete amigável: a mensalidade vence em breve. Qualquer dúvida sobre boleto ou Pix é só chamar a secretaria. Obrigada!" },
  { tipo: "evento", titulo: "Festa junina", mensagem: "Está chegando nossa Festa Junina! Será no sábado das 14h às 18h. Pedimos contribuição de [ITEM]. Vamos arrasar! 🎉" },
  { tipo: "evento", titulo: "Saída pedagógica", mensagem: "Comunicamos saída pedagógica na próxima quinta. Saída 8h, retorno 16h. Necessário autorização assinada e lanche extra." },
  { tipo: "lembrete", titulo: "Reposição vacina", mensagem: "Verificamos a carteira de vacinação e identificamos atrasos. Por favor atualize o quanto antes e envie cópia atualizada à escola." },
  { tipo: "lembrete", titulo: "Saída antecipada", mensagem: "Atenção: amanhã teremos saída antecipada às 12h em virtude de [MOTIVO]. Por favor providenciem busca no horário." },
];

export default function RecadosPage() {
  const { items: turmas } = useEntidade("turmas");
  const toast = useToast();
  const [recados, setRecados] = React.useState<Recado[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [filtroTipo, setFiltroTipo] = React.useState<string>("todos");

  const carregar = React.useCallback(async () => {
    try {
      const r = await fetch("/api/recados", { cache: "no-store" });
      const data = await r.json();
      setRecados(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setCarregando(false);
    }
  }, []);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const filtrados = recados.filter((r) => filtroTipo === "todos" || r.tipo === filtroTipo);
  const urgentes = recados.filter((r) => r.urgente && !r.pinado).length;
  const pinados = recados.filter((r) => r.pinado).length;
  const licoes = recados.filter((r) => r.tipo === "licao_de_casa").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-violet-600">
            <Megaphone className="h-3.5 w-3.5" /> RECADOS
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Recados, lições e comunicados
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro interno de avisos por turma. A publicação no Portal dos Pais ainda não está habilitada.
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="mr-2 h-4 w-4" /> Novo recado
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Total</div>
          <div className="mt-1 text-2xl font-bold">{recados.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Pinados</div>
          <div className="mt-1 text-2xl font-bold text-violet-600">{pinados}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Urgentes</div>
          <div className="mt-1 text-2xl font-bold text-rose-600">{urgentes}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Lições registradas</div>
          <div className="mt-1 text-2xl font-bold text-purple-600">{licoes}</div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroTipo("todos")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
            filtroTipo === "todos" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
          )}
        >
          Todos
        </button>
        {TIPOS_RECADO.map((t) => {
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
          <CardTitle>Recados registrados</CardTitle>
          <CardDescription>{filtrados.length} registro(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {carregando ? (
            <SkeletonList items={4} />
          ) : filtrados.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              Nenhum recado registrado ainda. Clica em &quot;Novo recado&quot; pra começar.
            </div>
          ) : (
            filtrados.map((r) => {
              const tipo = TIPOS_RECADO.find((t) => t.id === r.tipo);
              const Ic = tipo?.icon ?? Megaphone;
              const turma = turmas.find((t) => t.id === r.turmaId);
              return (
                <div key={r.id} className={cn("rounded-lg border p-4", r.urgente && "border-rose-200 bg-rose-50")}>
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn("text-[10px] border-transparent", tipo?.cor)}>
                        <Ic className="h-3 w-3 mr-1" />
                        {tipo?.label ?? r.tipo}
                      </Badge>
                      {r.pinado && (
                        <Badge variant="warning" className="text-[10px]">
                          <Pin className="h-3 w-3 mr-1" /> Fixado
                        </Badge>
                      )}
                      {r.urgente && (
                        <Badge variant="danger" className="text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Urgente
                        </Badge>
                      )}
                      {turma && (
                        <Badge variant="outline" className="text-[10px]">
                          {turma.nome}
                        </Badge>
                      )}
                      {r.dataLimite && (
                        <Badge variant="info" className="text-[10px]">
                          <Calendar className="h-3 w-3 mr-1" />
                          Entrega: {new Date(r.dataLimite + "T00:00:00").toLocaleDateString("pt-BR")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="font-semibold mb-1">{r.titulo}</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{r.mensagem}</div>
                  <div className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                    Registrado por {r.autorNome}{r.autorCargo && ` (${r.autorCargo})`} ·{" "}
                    {r.registradoEm && new Date(r.registradoEm).toLocaleString("pt-BR")}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <NovoRecadoModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        turmas={turmas}
        onCriado={async () => {
          await carregar();
          toast.success("Recado registrado", "Salvo nesta central interna; nenhuma notificação foi enviada.");
          setModalAberto(false);
        }}
      />
    </div>
  );
}

function NovoRecadoModal({
  aberto,
  onFechar,
  turmas,
  onCriado,
}: {
  aberto: boolean;
  onFechar: () => void;
  turmas: Array<{ id: string; nome: string }>;
  onCriado: () => Promise<void>;
}) {
  const toast = useToast();
  const [tipo, setTipo] = React.useState<string>("recado");
  const [turmaId, setTurmaId] = React.useState<string>("");
  const [titulo, setTitulo] = React.useState("");
  const [mensagem, setMensagem] = React.useState("");
  const [dataLimite, setDataLimite] = React.useState<string>("");
  const [urgente, setUrgente] = React.useState(false);
  const [pinado, setPinado] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);

  if (!aberto) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !mensagem.trim()) {
      toast.error("Preencha título e mensagem", "");
      return;
    }
    setSalvando(true);
    try {
      const r = await fetch("/api/recados", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tipo,
          turmaId: turmaId || undefined,
          titulo,
          mensagem,
          dataLimite: dataLimite || undefined,
          urgente,
          pinado,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error("Erro", d.error || "Tente de novo");
        return;
      }
      await onCriado();
      setTitulo("");
      setMensagem("");
      setDataLimite("");
      setUrgente(false);
      setPinado(false);
      setTurmaId("");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-xl bg-popover rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Novo recado</h2>
              <p className="text-xs text-muted-foreground">Registro interno para uso da equipe</p>
            </div>
          </div>
          <button onClick={onFechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Este formulário salva um registro interno. Ele não publica no Portal dos Pais nem envia notificação.
          </div>
          <div>
            <Label>Tipo *</Label>
            <div className="grid grid-cols-5 gap-2 mt-1.5">
              {TIPOS_RECADO.map((t) => {
                const Ic = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipo(t.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border p-2 text-[11px] transition-colors",
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
          <div>
            <Label>Turma (opcional)</Label>
            <select
              value={turmaId}
              onChange={(e) => setTurmaId(e.target.value)}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas as turmas</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Templates rápidos</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TEMPLATES_RECADO.filter((t) => t.tipo === tipo || !t.tipo).map((t) => (
                <button
                  key={t.titulo}
                  type="button"
                  onClick={() => {
                    setTitulo(t.titulo);
                    setMensagem(t.mensagem);
                  }}
                  className="text-[10px] rounded-full border bg-background px-2 py-0.5 hover:bg-accent"
                  title={t.mensagem}
                >
                  {t.titulo}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="recado-titulo">Título *</Label>
            <Input id="recado-titulo" className="mt-1.5" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Reunião de pais sexta-feira" />
          </div>
          <div>
            <Label htmlFor="recado-mensagem">Mensagem *</Label>
            <textarea
              id="recado-mensagem"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Detalhes do recado..."
            />
          </div>
          {tipo === "licao_de_casa" && (
            <div>
              <Label htmlFor="recado-data-limite">Data de entrega</Label>
              <Input id="recado-data-limite" type="date" className="mt-1.5" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border p-3 hover:bg-accent">
              <input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} className="rounded" />
              <div>
                <div className="text-sm font-medium">Urgente</div>
                <div className="text-xs text-muted-foreground">Destaca a prioridade somente nesta central</div>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border p-3 hover:bg-accent">
              <input type="checkbox" checked={pinado} onChange={(e) => setPinado(e.target.checked)} className="rounded" />
              <div>
                <div className="text-sm font-medium">Fixar no topo</div>
                <div className="text-xs text-muted-foreground">Aparece em destaque somente nesta central</div>
              </div>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={salvando} className="bg-violet-600 hover:bg-violet-700">
              {salvando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
              Salvar recado
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
