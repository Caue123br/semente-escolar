"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Package,
  Calendar,
  CheckCheck,
  MessageSquare,
  Shield,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useEntidade } from "@/lib/data/store";
import { cn } from "@/lib/utils";
import { podeAcessarModulo } from "@/lib/access-control";
import { usePerfil } from "@/lib/perfil-context";

type TipoNotif = "inadimplencia" | "atendimento" | "estoque" | "evento" | "lgpd";

interface NotifDinamica {
  id: string;
  tipo: TipoNotif;
  titulo: string;
  desc: string;
  link: string;
  lida: boolean;
  ordem: number;
}

const ICONE: Record<TipoNotif, React.ComponentType<{ className?: string }>> = {
  inadimplencia: AlertTriangle,
  atendimento: MessageSquare,
  estoque: Package,
  evento: Calendar,
  lgpd: Shield,
};

const COR: Record<TipoNotif, string> = {
  inadimplencia: "bg-rose-100 text-rose-700",
  atendimento: "bg-emerald-100 text-emerald-700",
  estoque: "bg-amber-100 text-amber-700",
  evento: "bg-blue-100 text-blue-700",
  lgpd: "bg-violet-100 text-violet-700",
};

export function NotificacoesDropdown() {
  const { perfil, carregando: carregandoPerfil } = usePerfil();
  const [aberto, setAberto] = React.useState(false);
  const [lidasIds, setLidasIds] = React.useState<Set<string>>(new Set());
  const refContainer = React.useRef<HTMLDivElement>(null);

  // Carrega lidas do localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("modelo:notifs:lidas");
      if (stored) setLidasIds(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const podeFinanceiro = !carregandoPerfil && podeAcessarModulo(perfil, "financeiro");
  const podeEstoque = !carregandoPerfil && podeAcessarModulo(perfil, "estoque");
  const podeCalendario = !carregandoPerfil && podeAcessarModulo(perfil, "calendario");
  const podeWhatsapp = !carregandoPerfil && podeAcessarModulo(perfil, "whatsapp");
  const {
    items: mensalidades,
    carregando: carregandoMensalidades,
    erro: erroMensalidades,
  } = useEntidade("mensalidades", { habilitado: podeFinanceiro });
  const {
    items: estoque,
    carregando: carregandoEstoque,
    erro: erroEstoque,
  } = useEntidade("estoque", { habilitado: podeEstoque });
  const {
    items: eventos,
    carregando: carregandoEventos,
    erro: erroEventos,
  } = useEntidade("eventos", { habilitado: podeCalendario });

  // Conversas (carrega via fetch direto)
  const [conversasNaoLidas, setConversasNaoLidas] = React.useState<Array<{ id: string; responsavelNome: string; ultimaMensagem: string }>>([]);
  const [carregandoConversas, setCarregandoConversas] = React.useState(false);
  const [erroConversas, setErroConversas] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!podeWhatsapp) {
      setConversasNaoLidas([]);
      setErroConversas(null);
      setCarregandoConversas(false);
      return;
    }
    if (!aberto) return;
    let ativo = true;
    setCarregandoConversas(true);
    setErroConversas(null);
    fetch("/api/conversas", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Conversas indisponíveis");
        return data;
      })
      .then((d) => {
        if (!ativo) return;
        const ativas = (d.items ?? []).filter((c: { naoLidasCount: number }) => c.naoLidasCount > 0);
        setConversasNaoLidas(ativas);
        setCarregandoConversas(false);
      })
      .catch((error) => {
        if (!ativo) return;
        setConversasNaoLidas([]);
        setErroConversas(error instanceof Error ? error.message : "Conversas indisponíveis");
        setCarregandoConversas(false);
      });
    return () => {
      ativo = false;
    };
  }, [aberto, podeWhatsapp]);

  const carregandoFontes =
    carregandoPerfil ||
    (podeFinanceiro && carregandoMensalidades) ||
    (podeEstoque && carregandoEstoque) ||
    (podeCalendario && carregandoEventos) ||
    (aberto && podeWhatsapp && carregandoConversas);
  const errosFontes = [
    podeFinanceiro ? erroMensalidades : null,
    podeEstoque ? erroEstoque : null,
    podeCalendario ? erroEventos : null,
    aberto && podeWhatsapp ? erroConversas : null,
  ].filter((erro): erro is string => Boolean(erro));

  React.useEffect(() => {
    const onClickFora = (e: MouseEvent) => {
      if (!refContainer.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, []);

  const notificacoes: NotifDinamica[] = React.useMemo(() => {
    const lista: NotifDinamica[] = [];

    // Conversas não lidas
    for (const c of conversasNaoLidas) {
      lista.push({
        id: `conv-${c.id}`,
        tipo: "atendimento",
        titulo: `Nova mensagem · ${c.responsavelNome}`,
        desc: c.ultimaMensagem ?? "Mensagem recebida",
        link: "/whatsapp",
        lida: lidasIds.has(`conv-${c.id}`),
        ordem: 1,
      });
    }

    // Inadimplência crítica
    const inadCriticas = mensalidades.filter((m) => m.status === "Atrasada" && m.diasAtraso > 15);
    if (inadCriticas.length > 0) {
      lista.push({
        id: "inad-criticas",
        tipo: "inadimplencia",
        titulo: `${inadCriticas.length} mensalidade(s) atrasadas 15+ dias`,
        desc: "Vale priorizar contato hoje pra evitar evasão",
        link: "/financeiro",
        lida: lidasIds.has("inad-criticas"),
        ordem: 2,
      });
    }

    // Estoque baixo
    const baixo = estoque.filter((i) => i.quantidade <= (i.pontoReposicao ?? 0));
    if (baixo.length > 0) {
      lista.push({
        id: "estoque-baixo",
        tipo: "estoque",
        titulo: `${baixo.length} item(ns) em ponto de reposição`,
        desc: baixo.slice(0, 2).map((i) => i.nome).join(", "),
        link: "/estoque",
        lida: lidasIds.has("estoque-baixo"),
        ordem: 3,
      });
    }

    // Eventos próximos (próximos 7 dias)
    const hoje = new Date();
    const em7 = new Date();
    em7.setDate(em7.getDate() + 7);
    const proximos = eventos.filter((e) => {
      const d = new Date(e.data);
      return d >= hoje && d <= em7;
    });
    if (proximos.length > 0) {
      lista.push({
        id: "eventos-proximos",
        tipo: "evento",
        titulo: `${proximos.length} evento(s) nos próximos 7 dias`,
        desc: proximos.slice(0, 2).map((e) => e.titulo).join(", "),
        link: "/calendario",
        lida: lidasIds.has("eventos-proximos"),
        ordem: 4,
      });
    }

    return lista.sort((a, b) => a.ordem - b.ordem);
  }, [conversasNaoLidas, mensalidades, estoque, eventos, lidasIds]);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const marcarTodasLidas = () => {
    const todos = new Set([...lidasIds, ...notificacoes.map((n) => n.id)]);
    setLidasIds(todos);
    try {
      localStorage.setItem("modelo:notifs:lidas", JSON.stringify([...todos]));
    } catch {}
  };

  const marcarLida = (id: string) => {
    const nova = new Set([...lidasIds, id]);
    setLidasIds(nova);
    try {
      localStorage.setItem("modelo:notifs:lidas", JSON.stringify([...nova]));
    } catch {}
  };

  return (
    <div className="relative" ref={refContainer}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent transition-colors"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {naoLidas > 0 && (
          <>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger animate-pulse" />
            <span className="absolute right-1 top-1.5 min-w-[1rem] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
              {naoLidas}
            </span>
          </>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl bg-popover border shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <div className="font-semibold">Notificações</div>
              <div className="text-xs text-muted-foreground">
                {carregandoFontes
                  ? "Carregando fontes autorizadas..."
                  : errosFontes.length > 0
                    ? "Algumas fontes estão indisponíveis"
                    : naoLidas === 0
                      ? "Nenhuma pendência encontrada"
                      : `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}`}
              </div>
            </div>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodasLidas}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[480px] overflow-y-auto">
            {carregandoFontes && notificacoes.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando notificações...
              </div>
            ) : errosFontes.length > 0 && notificacoes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-10 w-10 text-warning" />
                Não foi possível verificar as notificações agora.
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 text-success" />
                Nenhuma notificação no momento
              </div>
            ) : (
              <>
              {errosFontes.length > 0 && (
                <div className="border-b border-warning/30 bg-warning/5 px-4 py-2 text-xs text-warning">
                  Dados parciais: uma ou mais fontes não responderam.
                </div>
              )}
              {notificacoes.map((n) => {
                const Icon = ICONE[n.tipo];
                return (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      setAberto(false);
                      marcarLida(n.id);
                    }}
                    className="group block"
                  >
                    <div
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent border-b last:border-0",
                        !n.lida && "bg-emerald-50/40"
                      )}
                    >
                      <div
                        className={cn(
                          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                          COR[n.tipo]
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-sm truncate">{n.titulo}</div>
                          {!n.lida && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.desc}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
              </>
            )}
          </div>

          <div className="border-t bg-muted/30 px-4 py-2.5 text-center">
            <Link
              href="/cockpit"
              onClick={() => setAberto(false)}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
            >
              Ver cockpit completo →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
