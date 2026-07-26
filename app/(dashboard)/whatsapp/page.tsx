"use client";

import * as React from "react";
import {
  MessageSquare,
  Search,
  Save,
  Phone,
  Plus,
  X,
  Tag,
  UserCheck,
  ExternalLink,
  Loader2,
  ArrowDownToLine,
  CircleCheckBig,
  FileText,
  GraduationCap,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useEntidade } from "@/lib/data/store";
import { useToast } from "@/lib/toast";
import { cn, initials } from "@/lib/utils";

interface Conversa {
  id: string;
  responsavelNome: string;
  responsavelTelefone: string;
  responsavelEmail: string | null;
  alunoId: string | null;
  alunoNome: string | null;
  atendenteId: string | null;
  atendenteNome: string | null;
  status: "aberta" | "em_andamento" | "resolvida" | "arquivada";
  prioridade: "baixa" | "normal" | "alta" | "urgente";
  tags: string[];
  ultimaMensagem: string | null;
  ultimaMensagemEm: string | null;
  ultimaMensagemDirecao: "entrada" | "saida" | null;
  naoLidasCount: number;
}

interface Mensagem {
  id: string;
  direcao: "entrada" | "saida";
  texto: string;
  atendenteId: string | null;
  atendenteNome: string | null;
  status: string;
  createdAt: string;
}

interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  perfil: string;
}

const PRIO_COR: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-700",
  normal: "bg-blue-50 text-blue-700",
  alta: "bg-amber-100 text-amber-800",
  urgente: "bg-rose-100 text-rose-700 ring-1 ring-rose-300",
};

const TEMPLATES_RAPIDOS = [
  { titulo: "Cumprimento", texto: "Olá! Tudo bem? Aqui é da Escola Modelo, como posso te ajudar?" },
  { titulo: "Lembrete pagamento", texto: "Oi! Passando pra lembrar que a mensalidade vence em breve. Qualquer dúvida sobre boleto/Pix é só chamar 😊" },
  { titulo: "Confirmação reunião", texto: "Confirmando nossa reunião amanhã. Te espero na escola." },
  { titulo: "Aluno indo bem", texto: "Queria compartilhar que estamos vendo uma evolução muito legal. Parabéns pelo apoio em casa!" },
  { titulo: "Pedido de retorno", texto: "Bom dia! Pode me retornar quando puder? Preciso conversar sobre seu filho(a)." },
  { titulo: "Encerrar", texto: "Obrigada pelo contato! Qualquer outra coisa, chama a gente. Bom dia 🌻" },
];

export default function WhatsAppPage() {
  const toast = useToast();
  const { items: alunos } = useEntidade("alunos");
  const { items: turmas } = useEntidade("turmas");
  const { items: mensalidades } = useEntidade("mensalidades");
  const alunosPorId = React.useMemo(() => new Map(alunos.map((a) => [a.id, a])), [alunos]);
  const turmasPorId = React.useMemo(() => new Map(turmas.map((t) => [t.id, t])), [turmas]);

  const [usuario, setUsuario] = React.useState<UsuarioLogado | null>(null);
  const [conversas, setConversas] = React.useState<Conversa[]>([]);
  const [conversaAtivaId, setConversaAtivaId] = React.useState<string | null>(null);
  const [mensagens, setMensagens] = React.useState<Mensagem[]>([]);
  const [carregando, setCarregando] = React.useState(true);

  const [busca, setBusca] = React.useState("");
  const [filtroStatus, setFiltroStatus] = React.useState<string>("ativas");
  const [filtroAtendente, setFiltroAtendente] = React.useState<string>("todos");

  const [novaConversaAberta, setNovaConversaAberta] = React.useState(false);
  const [textoMsg, setTextoMsg] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [mostrarTemplates, setMostrarTemplates] = React.useState(false);

  const chatRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsuario(d.usuario))
      .catch(() => {});
  }, []);

  const previaContagemNaoLidas = React.useRef<number>(0);
  const somHabilitado = React.useRef<boolean>(true);

  const tocarSomNotificacao = React.useCallback(() => {
    if (!somHabilitado.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 740;
      g.gain.setValueAtTime(0.18, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      o.start();
      o.stop(ctx.currentTime + 0.2);
    } catch {
      // ignore — som é opcional
    }
  }, []);

  const carregarConversas = React.useCallback(async () => {
    try {
      const r = await fetch("/api/conversas", { cache: "no-store" });
      const data = await r.json();
      const items = data.items ?? [];
      const totalNaoLidas = items.reduce((acc: number, c: Conversa) => acc + (c.naoLidasCount ?? 0), 0);
      if (totalNaoLidas > previaContagemNaoLidas.current && previaContagemNaoLidas.current >= 0) {
        // Chegou conversa nova — toca som (só se já tinha carregado antes)
        if (previaContagemNaoLidas.current > 0 || totalNaoLidas > 0) {
          tocarSomNotificacao();
        }
      }
      previaContagemNaoLidas.current = totalNaoLidas;
      setConversas(items);
    } catch {
      // ignore
    } finally {
      setCarregando(false);
    }
  }, [tocarSomNotificacao]);

  React.useEffect(() => {
    carregarConversas();
    const tick = () => {
      if (!document.hidden) carregarConversas();
    };
    const interval = setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [carregarConversas]);

  const carregarMensagens = React.useCallback(async (convId: string) => {
    try {
      const r = await fetch(`/api/conversas/${convId}/mensagens`, { cache: "no-store" });
      const data = await r.json();
      setMensagens(data.items ?? []);
      await fetch(`/api/conversas/${convId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ naoLidasCount: 0 }),
      });
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (conversaAtivaId) carregarMensagens(conversaAtivaId);
    else setMensagens([]);
  }, [conversaAtivaId, carregarMensagens]);

  React.useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensagens]);

  const conversaAtiva = conversas.find((c) => c.id === conversaAtivaId) ?? null;

  const conversasFiltradas = React.useMemo(() => {
    return conversas
      .filter((c) => {
        if (filtroStatus === "ativas") return c.status === "aberta" || c.status === "em_andamento";
        if (filtroStatus === "arquivadas") return c.status === "arquivada";
        if (filtroStatus === "resolvidas") return c.status === "resolvida";
        if (filtroStatus !== "todas") return c.status === filtroStatus;
        return true;
      })
      .filter((c) => {
        if (filtroAtendente === "todos") return true;
        if (filtroAtendente === "minhas") return usuario && c.atendenteId === usuario.id;
        if (filtroAtendente === "nao_atribuidas") return !c.atendenteId;
        return c.atendenteId === filtroAtendente;
      })
      .filter((c) => {
        if (!busca.trim()) return true;
        const q = busca.toLowerCase();
        return (
          c.responsavelNome.toLowerCase().includes(q) ||
          (c.alunoNome ?? "").toLowerCase().includes(q) ||
          c.responsavelTelefone.includes(q) ||
          (c.ultimaMensagem ?? "").toLowerCase().includes(q)
        );
      });
  }, [conversas, filtroStatus, filtroAtendente, busca, usuario]);

  const salvarRascunho = async () => {
    if (!conversaAtivaId || !textoMsg.trim()) return;
    setEnviando(true);
    try {
      const r = await fetch(`/api/conversas/${conversaAtivaId}/mensagens`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto: textoMsg.trim(), direcao: "saida" }),
      });
      if (!r.ok) {
        toast.error("Erro ao salvar", "Não foi possível registrar o rascunho no histórico.");
        return;
      }
      setTextoMsg("");
      await Promise.all([carregarMensagens(conversaAtivaId), carregarConversas()]);
      toast.success("Rascunho registrado", "O texto foi salvo no histórico, mas não foi enviado por um provedor.");
    } finally {
      setEnviando(false);
    }
  };

  const simularRecebimento = async () => {
    if (!conversaAtivaId) return;
    const texto = prompt("Simular mensagem do responsável:");
    if (!texto?.trim()) return;
    await fetch(`/api/conversas/${conversaAtivaId}/mensagens`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texto: `[SIMULAÇÃO] ${texto.trim()}`, direcao: "entrada" }),
    });
    await Promise.all([carregarMensagens(conversaAtivaId), carregarConversas()]);
  };

  const atualizarConversa = async (campos: Record<string, unknown>) => {
    if (!conversaAtivaId) return;
    await fetch(`/api/conversas/${conversaAtivaId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(campos),
    });
    await carregarConversas();
  };

  const abrirNoWhatsApp = () => {
    if (!conversaAtiva || !textoMsg.trim()) {
      toast.error("Mensagem vazia", "Escreva o texto antes");
      return;
    }
    const telSemMais = conversaAtiva.responsavelTelefone.replace(/\D/g, "");
    const telComDDI = telSemMais.startsWith("55") ? telSemMais : `55${telSemMais}`;
    const texto = encodeURIComponent(textoMsg);
    const janela = window.open(`https://wa.me/${telComDDI}?text=${texto}`, "_blank");
    if (!janela) {
      toast.error("Não foi possível abrir o WhatsApp", "Libere pop-ups no navegador e tente novamente.");
      return;
    }
    toast.info("WhatsApp aberto", "Confirme o envio na janela externa; este sistema não recebe confirmação de entrega.");
  };

  const atendentesUnicos = Array.from(
    new Set(conversas.filter((c) => c.atendenteId).map((c) => `${c.atendenteId}|${c.atendenteNome}`))
  ).map((s) => {
    const [id, nome] = s.split("|");
    return { id, nome };
  });

  return (
    <div className="space-y-3 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-start justify-between gap-4 flex-wrap shrink-0">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <MessageSquare className="h-3.5 w-3.5" /> ATENDIMENTO
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight lg:text-2xl">Central de atendimento</h1>
          <p className="text-xs text-muted-foreground">
            Histórico interno e mensagens recebidas por webhook · {usuario?.perfil === "diretor" ? "Você vê todas" : "Você vê suas + não atribuídas"}
          </p>
        </div>
        <Button onClick={() => setNovaConversaAberta(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Novo atendimento
        </Button>
      </div>

      <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
        Sem provedor de envio configurado: <strong>Salvar rascunho</strong> registra somente o histórico.
        Para enviar, use <strong>Abrir WhatsApp</strong> e confirme na janela externa.
      </div>

      <Card className="flex-1 grid grid-cols-1 md:grid-cols-[360px_1fr] overflow-hidden p-0">
        {/* Lista de conversas */}
        <div className="border-r flex flex-col bg-muted/20 min-h-0">
          <div className="p-3 space-y-2 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex gap-2 text-xs">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="ativas">Ativas</option>
                <option value="aberta">Abertas</option>
                <option value="em_andamento">Em andamento</option>
                <option value="resolvidas">Resolvidas</option>
                <option value="arquivadas">Arquivadas</option>
                <option value="todas">Todas</option>
              </select>
              {usuario?.perfil === "diretor" ? (
                <select
                  value={filtroAtendente}
                  onChange={(e) => setFiltroAtendente(e.target.value)}
                  className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="todos">Todos atendentes</option>
                  <option value="nao_atribuidas">Não atribuídas</option>
                  {atendentesUnicos.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={filtroAtendente}
                  onChange={(e) => setFiltroAtendente(e.target.value)}
                  className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="todos">Minhas + não atribuídas</option>
                  <option value="minhas">Só minhas</option>
                  <option value="nao_atribuidas">Não atribuídas</option>
                </select>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {carregando ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : conversasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Sem conversas {busca ? "com esse filtro" : "ainda"}.<br />
                Clique em <strong>Novo atendimento</strong> pra começar.
              </div>
            ) : (
              <div className="divide-y">
                {conversasFiltradas.map((c) => {
                  const ativa = c.id === conversaAtivaId;
                  const minha = usuario && c.atendenteId === usuario.id;
                  const aluno = c.alunoId ? alunosPorId.get(c.alunoId) : null;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setConversaAtivaId(c.id)}
                      className={cn(
                        "w-full p-3 text-left hover:bg-accent/40 transition-colors flex gap-3 items-start",
                        ativa && "bg-accent/60"
                      )}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        {aluno?.foto && <AvatarImage src={aluno.foto} alt={aluno.nome} />}
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                          {initials(aluno?.nome ?? c.responsavelNome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-sm truncate flex-1">{c.responsavelNome}</div>
                          {c.ultimaMensagemEm && (
                            <div className="text-[10px] text-muted-foreground shrink-0">
                              {formatHorario(c.ultimaMensagemEm)}
                            </div>
                          )}
                        </div>
                        {c.alunoNome && (
                          <div className="text-[11px] text-muted-foreground truncate">👶 {c.alunoNome}</div>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          {c.ultimaMensagemDirecao === "saida" && <FileText className="h-3 w-3 text-muted-foreground shrink-0" />}
                          <div className="text-xs text-muted-foreground truncate flex-1">
                            {c.ultimaMensagemDirecao === "saida" && c.ultimaMensagem
                              ? `Rascunho: ${c.ultimaMensagem}`
                              : c.ultimaMensagem ?? <em>Sem mensagens</em>}
                          </div>
                          {c.naoLidasCount > 0 && (
                            <span className="bg-emerald-600 text-white text-[10px] font-bold rounded-full h-4 min-w-[1rem] px-1 flex items-center justify-center shrink-0">
                              {c.naoLidasCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full", PRIO_COR[c.prioridade])}>
                            {c.prioridade}
                          </span>
                          {c.atendenteNome ? (
                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border", minha && "border-primary text-primary")}>
                              👤 {c.atendenteNome.split(" ")[0]}
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                              Sem atendente
                            </span>
                          )}
                          {c.status === "resolvida" && <CircleCheckBig className="h-3 w-3 text-emerald-600" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="flex flex-col min-h-0 bg-gray-50">
          {conversaAtiva ? (
            <>
              <div className="border-b bg-card p-3 flex items-center gap-3 shrink-0 flex-wrap">
                {(() => {
                  const alunoAtivo = conversaAtiva.alunoId ? alunosPorId.get(conversaAtiva.alunoId) : null;
                  return (
                    <Avatar className="h-11 w-11">
                      {alunoAtivo?.foto && <AvatarImage src={alunoAtivo.foto} alt={alunoAtivo.nome} />}
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                        {initials(alunoAtivo?.nome ?? conversaAtiva.responsavelNome)}
                      </AvatarFallback>
                    </Avatar>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{conversaAtiva.responsavelNome}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <Phone className="h-3 w-3" />
                    {formatTelefone(conversaAtiva.responsavelTelefone)}
                    {conversaAtiva.alunoNome && (
                      <>
                        <span>·</span>
                        <span>Responsável de <strong>{conversaAtiva.alunoNome}</strong></span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {(!conversaAtiva.atendenteId || conversaAtiva.atendenteId !== usuario?.id) && usuario && (
                    <Button size="sm" variant="outline" onClick={() => atualizarConversa({ atribuirMim: true })} className="text-xs h-7">
                      <UserCheck className="mr-1 h-3 w-3" />
                      Atender
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      const novoCount = conversaAtiva.naoLidasCount > 0 ? 0 : 1;
                      await atualizarConversa({ naoLidasCount: novoCount });
                    }}
                    title={conversaAtiva.naoLidasCount > 0 ? "Marcar como lida" : "Marcar como não lida"}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs h-7 hover:bg-accent"
                  >
                    {conversaAtiva.naoLidasCount > 0 ? "✓ Marcar lida" : "○ Não lida"}
                  </button>
                  <select
                    value={conversaAtiva.status}
                    onChange={(e) => atualizarConversa({ status: e.target.value })}
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="aberta">Aberta</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="resolvida">Resolvida</option>
                    <option value="arquivada">Arquivada</option>
                  </select>
                  <select
                    value={conversaAtiva.prioridade}
                    onChange={(e) => atualizarConversa({ prioridade: e.target.value })}
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                    title="Prioridade"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {conversaAtiva.alunoId && (() => {
                const aluno = alunosPorId.get(conversaAtiva.alunoId);
                if (!aluno) return null;
                const turma = aluno.turmaId ? turmasPorId.get(aluno.turmaId) : null;
                const idade = aluno.dataNascimento ? calcularIdade(aluno.dataNascimento) : null;
                const alergias = aluno.fichaSaude?.alergias?.trim();
                const mensaAluno = mensalidades.filter((m) => m.alunoId === aluno.id);
                const atrasada = mensaAluno.find((m) => m.status === "Atrasada");
                return (
                  <div className="border-b bg-emerald-50/50 px-4 py-2.5 shrink-0 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 text-xs flex-1 min-w-0">
                      <GraduationCap className="h-4 w-4 text-emerald-700 shrink-0" />
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span><strong>{aluno.nome}</strong></span>
                        {turma && <span className="text-muted-foreground">· {turma.nome}</span>}
                        {idade !== null && <span className="text-muted-foreground">· {idade}a</span>}
                        {atrasada && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-semibold">
                            <AlertTriangle className="h-2.5 w-2.5" /> Inadimplente
                          </span>
                        )}
                        {alergias && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-semibold" title={alergias}>
                            ⚠️ Alergia: {alergias.length > 40 ? alergias.slice(0, 40) + "…" : alergias}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/alunos/${aluno.id}`} target="_blank" className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] hover:bg-accent">
                        <FileText className="h-3 w-3" /> Ficha
                      </Link>
                      <Link href={`/boletim/${aluno.id}`} target="_blank" className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] hover:bg-accent">
                        <GraduationCap className="h-3 w-3" /> Boletim
                      </Link>
                      <Link href={`/financeiro`} className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] hover:bg-accent">
                        <CreditCard className="h-3 w-3" /> Financeiro
                      </Link>
                    </div>
                  </div>
                );
              })()}

              <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {mensagens.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-12">
                    Sem mensagens ainda.
                    <br />
                    Comece escrevendo abaixo ou simulando uma recebida.
                  </div>
                ) : (
                  mensagens.map((m) => (
                    <div key={m.id} className={cn("flex", m.direcao === "saida" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                          m.direcao === "saida" ? "bg-emerald-100 rounded-br-sm" : "bg-white rounded-bl-sm"
                        )}
                      >
                        {m.direcao === "saida" && m.atendenteNome && (
                          <div className="text-[10px] font-semibold text-emerald-700 mb-0.5">{m.atendenteNome}</div>
                        )}
                        <div className="whitespace-pre-wrap">{m.texto}</div>
                        <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                          {formatHorario(m.createdAt)}
                          {m.direcao === "saida" && (
                            <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] text-amber-800">
                              {m.status === "rascunho" ? "Rascunho interno" : "Registro interno sem comprovante"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {mostrarTemplates && (
                <div className="border-t bg-card p-2 grid grid-cols-2 md:grid-cols-3 gap-2 shrink-0 max-h-32 overflow-y-auto">
                  {TEMPLATES_RAPIDOS.map((t) => (
                    <button
                      key={t.titulo}
                      onClick={() => {
                        setTextoMsg(t.texto);
                        setMostrarTemplates(false);
                      }}
                      className="text-left text-xs rounded-md border bg-background p-2 hover:bg-accent"
                    >
                      <div className="font-semibold">{t.titulo}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-2">{t.texto}</div>
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t bg-card p-3 space-y-2 shrink-0">
                <textarea
                  value={textoMsg}
                  onChange={(e) => setTextoMsg(e.target.value)}
                  placeholder="Escreva um rascunho... (Ctrl+Enter salva no histórico)"
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      salvarRascunho();
                    }
                  }}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setMostrarTemplates((v) => !v)} className="text-xs h-7">
                    <Tag className="mr-1 h-3 w-3" />
                    Templates
                  </Button>
                  <Button size="sm" variant="outline" onClick={simularRecebimento} className="text-xs h-7" title="Simular mensagem recebida do responsável">
                    <ArrowDownToLine className="mr-1 h-3 w-3" />
                    Simular recebida
                  </Button>
                  <Button size="sm" variant="outline" onClick={abrirNoWhatsApp} className="text-xs h-7" title="Abre uma janela externa; o envio deve ser confirmado no WhatsApp">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Abrir WhatsApp
                  </Button>
                  <div className="ml-auto" />
                  <Button
                    size="sm"
                    onClick={salvarRascunho}
                    disabled={!textoMsg.trim() || enviando}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {enviando ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    Salvar rascunho
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 p-8">
              <MessageSquare className="h-12 w-12" />
              <div className="text-center">
                Escolha uma conversa pra começar
                <br />
                <span className="text-xs">ou clique em &quot;Novo atendimento&quot; para registrar um contato.</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <NovaConversaModal
        aberto={novaConversaAberta}
        onFechar={() => setNovaConversaAberta(false)}
        alunos={alunos}
        onCriada={async (id) => {
          await carregarConversas();
          setConversaAtivaId(id);
        }}
      />
    </div>
  );
}

function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento + "T00:00:00");
  if (isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

function formatHorario(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ehHoje = d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  if (ehHoje) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatTelefone(s: string): string {
  const d = s.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return s;
}

function NovaConversaModal({
  aberto,
  onFechar,
  alunos,
  onCriada,
}: {
  aberto: boolean;
  onFechar: () => void;
  alunos: Array<{
    id: string;
    nome: string;
    responsaveis: Array<{ nome: string; telefone: string; email: string; parentesco?: string }>;
  }>;
  onCriada: (id: string) => void;
}) {
  const toast = useToast();
  const [tipo, setTipo] = React.useState<"do_aluno" | "manual">("do_aluno");
  const [alunoId, setAlunoId] = React.useState<string>("");
  const [respIdx, setRespIdx] = React.useState(0);
  const [nomeManual, setNomeManual] = React.useState("");
  const [telManual, setTelManual] = React.useState("");
  const [emailManual, setEmailManual] = React.useState("");
  const [prioridade, setPrioridade] = React.useState<"baixa" | "normal" | "alta" | "urgente">("normal");
  const [criando, setCriando] = React.useState(false);

  if (!aberto) return null;

  const aluno = alunos.find((a) => a.id === alunoId);
  const respDoAluno = aluno?.responsaveis ?? [];
  const respEscolhido = respDoAluno[respIdx];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCriando(true);
    try {
      const body =
        tipo === "do_aluno" && aluno && respEscolhido
          ? {
              responsavelNome: respEscolhido.nome,
              responsavelTelefone: respEscolhido.telefone,
              responsavelEmail: respEscolhido.email,
              alunoId: aluno.id,
              alunoNome: aluno.nome,
              prioridade,
            }
          : {
              responsavelNome: nomeManual,
              responsavelTelefone: telManual,
              responsavelEmail: emailManual || undefined,
              prioridade,
            };

      if (!body.responsavelNome || !body.responsavelTelefone) {
        toast.error("Dados incompletos", "Nome e telefone obrigatórios");
        return;
      }

      const r = await fetch("/api/conversas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error("Erro ao criar", d.error || "Tente de novo");
        return;
      }
      const data = await r.json();
      if (!data.existente) toast.success("Atendimento criado", body.responsavelNome);
      onCriada(data.id);
      onFechar();
      setNomeManual("");
      setTelManual("");
      setEmailManual("");
      setAlunoId("");
    } finally {
      setCriando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-lg bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-bold text-lg">Novo atendimento</h2>
            <p className="text-xs text-muted-foreground">Cria um atendimento interno; não inicia conversa no WhatsApp.</p>
          </div>
          <button onClick={onFechar} className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo("do_aluno")}
              className={cn("flex-1 rounded-md border p-2 text-sm", tipo === "do_aluno" && "border-primary bg-primary/5")}
            >
              Responsável de aluno cadastrado
            </button>
            <button
              type="button"
              onClick={() => setTipo("manual")}
              className={cn("flex-1 rounded-md border p-2 text-sm", tipo === "manual" && "border-primary bg-primary/5")}
            >
              Contato manual
            </button>
          </div>

          {tipo === "do_aluno" ? (
            <>
              <div>
                <Label>Aluno *</Label>
                <select
                  value={alunoId}
                  onChange={(e) => {
                    setAlunoId(e.target.value);
                    setRespIdx(0);
                  }}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Selecione...</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </div>
              {respDoAluno.length > 0 && (
                <div>
                  <Label>Responsável *</Label>
                  <select
                    value={respIdx}
                    onChange={(e) => setRespIdx(Number(e.target.value))}
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {respDoAluno.map((r, i) => (
                      <option key={i} value={i}>
                        {r.nome} {r.parentesco ? `(${r.parentesco})` : ""} — {r.telefone}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {respEscolhido && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                  <div><strong>Telefone:</strong> {respEscolhido.telefone}</div>
                  {respEscolhido.email && <div><strong>Email:</strong> {respEscolhido.email}</div>}
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <Label>Nome *</Label>
                <Input className="mt-1.5" required value={nomeManual} onChange={(e) => setNomeManual(e.target.value)} />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input className="mt-1.5" required value={telManual} onChange={(e) => setTelManual(e.target.value)} placeholder="(12) 91234-5678" />
              </div>
              <div>
                <Label>Email</Label>
                <Input className="mt-1.5" type="email" value={emailManual} onChange={(e) => setEmailManual(e.target.value)} />
              </div>
            </>
          )}

          <div>
            <Label>Prioridade</Label>
            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as typeof prioridade)}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="baixa">Baixa</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={criando} className="bg-emerald-600 hover:bg-emerald-700">
              {criando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar atendimento
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
