import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Heart,
  GraduationCap,
  Banknote,
  UtensilsCrossed,
  Calendar,
  Megaphone,
  LogOut,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getDatabase } from "@/lib/db/postgres";
import { seedAlunos, seedMensalidades, seedEventos, seedMuralPosts, seedCardapio } from "@/lib/db/seed";
import { verificarSessaoPais } from "@/lib/db/pais-session";
import { initials, formatBRL, formatDateBR, formatDateLocalISO } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normaliza(s: string): string {
  return s.replace(/\D/g, "");
}

interface AlunoPortal {
  id: string;
  nome: string;
  turmaId: string;
  dataNascimento: string;
  bilingue: boolean;
  status: string;
}

export default async function PortalPaisPage() {
  if (process.env.ENABLE_PARENT_PORTAL !== "true") return null;
  const c = await cookies();
  const sessao = verificarSessaoPais(c.get("pais_session")?.value);

  if (!sessao) redirect("/pais/login");

  const email = sessao.email;
  const cpf = sessao.cpf;

  await Promise.all([
    seedAlunos(),
    seedMensalidades(),
    seedEventos(),
    seedMuralPosts(),
    seedCardapio(),
  ]);

  const sb = getDatabase();

  const { data: alunosRaw } = await sb.from("alunos").select("*");
  type RespJsonItem = { email?: string; cpf?: string; nome?: string };
  type AlunoRow = {
    id: string;
    nome: string;
    turma_id: string;
    data_nascimento: string;
    bilingue: boolean;
    status: string;
    responsaveis_json: RespJsonItem[] | null;
  };

  const meusAlunos: AlunoPortal[] = ((alunosRaw ?? []) as AlunoRow[])
    .filter((a) => {
      const resps = Array.isArray(a.responsaveis_json) ? a.responsaveis_json : [];
      return resps.some(
        (r) =>
          (r.email ?? "").trim().toLowerCase() === email &&
          normaliza(r.cpf ?? "") === cpf
      );
    })
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      turmaId: a.turma_id,
      dataNascimento: a.data_nascimento,
      bilingue: a.bilingue,
      status: a.status,
    }));

  if (meusAlunos.length === 0) redirect("/pais/login");

  const respNome = (() => {
    const a = (alunosRaw ?? [])[0] as AlunoRow | undefined;
    const resps = a?.responsaveis_json ?? [];
    const r = resps.find(
      (r: RespJsonItem) =>
        (r.email ?? "").trim().toLowerCase() === email &&
        normaliza(r.cpf ?? "") === cpf
    );
    return r?.nome ?? "Responsável";
  })();

  const alunoIds = meusAlunos.map((a) => a.id);

  // Mensalidades dos meus filhos
  const { data: mensRaw } = await sb
    .from("mensalidades")
    .select("*")
    .in("aluno_id", alunoIds)
    .order("vencimento", { ascending: false });
  const mensalidades = (mensRaw ?? []).map((m) => ({
    id: String(m.id),
    alunoId: String(m.aluno_id),
    alunoNome: String(m.aluno_nome ?? ""),
    competencia: String(m.competencia ?? ""),
    vencimento: String(m.vencimento ?? ""),
    valor: Number(m.valor ?? 0),
    status: String(m.status ?? "A Vencer"),
    diasAtraso: Number(m.dias_atraso ?? 0),
  }));

  // Próximos eventos
  const hoje = formatDateLocalISO();
  const { data: eventosRaw } = await sb
    .from("eventos")
    .select("*")
    .gte("data", hoje)
    .order("data", { ascending: true })
    .limit(5);
  const eventos = (eventosRaw ?? []).map((e) => ({
    id: String(e.id),
    titulo: String(e.titulo ?? ""),
    data: String(e.data ?? ""),
    tipo: String(e.tipo ?? ""),
    local: e.local ? String(e.local) : "",
  }));

  // Mural posts
  const { data: postsRaw } = await sb
    .from("mural_posts")
    .select("*")
    .order("fixado", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);
  const posts = (postsRaw ?? []).map((p) => ({
    id: String(p.id),
    titulo: String(p.titulo ?? ""),
    conteudo: String(p.conteudo ?? ""),
    autor: String(p.autor ?? ""),
    tipo: String(p.tipo ?? ""),
    fixado: Boolean(p.fixado),
  }));

  // Cardápio próximos dias
  const { data: cardapioRaw } = await sb
    .from("cardapio_semana")
    .select("*")
    .gte("data", hoje)
    .order("data", { ascending: true })
    .limit(3);
  interface RefeicaoItem { refeicao: string; itens: string[] }
  const cardapio = ((cardapioRaw ?? []) as Array<{ data: string; dia_semana: string; refeicoes_json: RefeicaoItem[] }>)
    .map((c) => ({
      data: String(c.data ?? ""),
      diaSemana: String(c.dia_semana ?? ""),
      refeicoes: Array.isArray(c.refeicoes_json) ? c.refeicoes_json : [],
    }));

  // Total a pagar
  const totalAPagar = mensalidades
    .filter((m) => m.status !== "Paga")
    .reduce((a, m) => a + m.valor, 0);
  const proximas = mensalidades.filter((m) => m.status !== "Paga").slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold leading-tight">Portal dos Pais</div>
              <div className="text-xs text-muted-foreground">Olá, {respNome.split(" ")[0]}!</div>
            </div>
          </div>
          <form action="/api/auth/pais/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Filhos */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Seu(s) filho(s)
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {meusAlunos.map((a) => (
              <Card key={a.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-pink-100 text-pink-700">
                      {initials(a.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{a.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      Nascido em {formatDateBR(a.dataNascimento)}
                    </div>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="success" className="text-[10px]">{a.status}</Badge>
                      {a.bilingue && <Badge variant="info" className="text-[10px]">Bilíngue</Badge>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Mensalidades */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Mensalidades
            </h2>
            <div className="flex items-center gap-2">
              {totalAPagar > 0 && (
                <Badge variant="warning" className="text-xs">
                  A pagar: {formatBRL(totalAPagar)}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{mensalidades.length} total</span>
            </div>
          </div>
          <Card>
            <CardContent className="p-0 divide-y">
              {mensalidades.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center">Sem mensalidades registradas.</p>
              ) : (
                mensalidades.slice(0, 12).map((m) => {
                  const Icon = m.status === "Paga" ? CheckCircle : m.status === "Atrasada" ? AlertTriangle : Clock;
                  const corIcon = m.status === "Paga" ? "text-success" : m.status === "Atrasada" ? "text-danger" : "text-warning";
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-4">
                      <Icon className={`h-5 w-5 shrink-0 ${corIcon}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {m.alunoNome} · Competência {m.competencia}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Vencimento {formatDateBR(m.vencimento)}
                          {m.diasAtraso > 0 && ` · ${m.diasAtraso} dias em atraso`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatBRL(m.valor)}</div>
                        <Badge
                          variant={
                            m.status === "Paga" ? "success" : m.status === "Atrasada" ? "danger" : "warning"
                          }
                          className="text-[10px]"
                        >
                          {m.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </section>

        {/* 2 colunas: Cardápio + Eventos */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Cardápio */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" /> Cardápio
            </h2>
            <Card>
              <CardContent className="p-0 divide-y">
                {cardapio.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-6 text-center">Sem cardápio para os próximos dias.</p>
                ) : (
                  cardapio.map((dia) => (
                    <div key={dia.data} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm">{dia.diaSemana}</div>
                        <div className="text-xs text-muted-foreground">{formatDateBR(dia.data)}</div>
                      </div>
                      <div className="space-y-1">
                        {dia.refeicoes.slice(0, 3).map((r: RefeicaoItem, i: number) => (
                          <div key={i} className="text-xs">
                            <span className="font-medium">{r.refeicao}:</span>{" "}
                            <span className="text-muted-foreground">
                              {r.itens.slice(0, 3).join(", ")}
                              {r.itens.length > 3 ? "…" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          {/* Eventos */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Próximos eventos
            </h2>
            <Card>
              <CardContent className="p-0 divide-y">
                {eventos.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-6 text-center">Nenhum evento próximo.</p>
                ) : (
                  eventos.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 p-4">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-pink-100 text-pink-700 shrink-0">
                        <span className="text-[10px] font-semibold">
                          {new Date(e.data + "T00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {new Date(e.data + "T00:00").getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{e.titulo}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.tipo} {e.local && `· ${e.local}`}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Mural / Avisos */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Avisos da escola
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {posts.length === 0 ? (
              <Card className="p-6">
                <p className="text-sm text-muted-foreground text-center">Sem avisos no momento.</p>
              </Card>
            ) : (
              posts.map((p) => (
                <Card key={p.id} className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[10px]">{p.tipo}</Badge>
                    {p.fixado && <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Fixado</Badge>}
                  </div>
                  <h3 className="font-semibold text-sm leading-snug">{p.titulo}</h3>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{p.conteudo}</p>
                  <div className="mt-3 text-[10px] text-muted-foreground">por {p.autor}</div>
                </Card>
              ))
            )}
          </div>
        </section>

        <div className="text-center pt-4">
          <Link
            href="/pais/login"
            className="text-xs text-muted-foreground hover:underline"
          >
            Trocar de conta
          </Link>
        </div>
      </main>
    </div>
  );
}
