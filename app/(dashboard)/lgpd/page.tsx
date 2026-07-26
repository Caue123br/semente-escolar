"use client";

import * as React from "react";
import { Shield, FileCheck, Activity, Download, ExternalLink, Loader2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { formatDateBR } from "@/lib/utils";

interface AuditLog {
  id: string;
  usuario_nome: string | null;
  usuario_email: string | null;
  acao: string;
  entidade: string;
  registro_id: string | null;
  created_at: string;
}

interface SolicitacaoLgpd {
  id: string;
  tipo: "acesso" | "exclusao" | "correcao" | "portabilidade";
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  detalhes?: string;
  status: "pendente" | "em_analise" | "concluida" | "rejeitada";
  created_at: string;
}

const TIPO_SOLICITACAO_LABEL: Record<string, string> = {
  acesso: "Acesso aos dados",
  exclusao: "Exclusão de dados",
  correcao: "Correção de dados",
  portabilidade: "Portabilidade",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  concluida: "Concluída",
  rejeitada: "Rejeitada",
};

const ACAO_LABEL: Record<string, string> = {
  criar: "Criou",
  editar: "Editou",
  excluir: "Excluiu",
  login: "Logou",
  logout: "Saiu",
  exportar: "Exportou",
  outros: "Ação",
};

export default function LgpdPage() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [solicitacoes, setSolicitacoes] = React.useState<SolicitacaoLgpd[]>([]);
  const [carregando, setCarregando] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/audit-logs", { cache: "no-store" }).then((r) => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      fetch("/api/lgpd/solicitacao", { cache: "no-store" }).then((r) => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
    ]).then(([logsData, solData]) => {
      setLogs(logsData.items ?? []);
      setSolicitacoes(solData.items ?? []);
      setCarregando(false);
    });
  }, []);

  const pendentes = solicitacoes.filter((s) => s.status === "pendente").length;
  const totalLogs = logs.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Shield className="h-3.5 w-3.5" /> LGPD & AUDITORIA
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            LGPD & Auditoria
          </h1>
          <p className="text-sm text-muted-foreground">
            Conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
          </p>
        </div>
        <a
          href="/api/exportar"
          download
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium shadow"
        >
          <Download className="h-4 w-4" />
          Exportar dados operacionais (JSON)
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Solicitações LGPD</div>
          <div className="mt-1 text-2xl font-bold">{solicitacoes.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Recebidas no formulário público</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Pendentes</div>
          <div className={`mt-1 text-2xl font-bold ${pendentes > 0 ? "text-warning" : "text-success"}`}>{pendentes}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {pendentes > 0 ? "Aguardam resposta em até 15 dias" : "Tudo respondido"}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Registros de auditoria</div>
          <div className="mt-1 text-2xl font-bold">{totalLogs}</div>
          <div className="text-xs text-muted-foreground mt-1">Ações registradas no sistema</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Política pública</div>
          <a
            href="/privacidade"
            target="_blank"
            className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            /privacidade <ExternalLink className="h-3 w-3" />
          </a>
          <div className="text-xs text-muted-foreground mt-1">URL pública pra pais</div>
        </Card>
      </div>

      <Tabs defaultValue="solicitacoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="solicitacoes">
            <FileCheck className="mr-1.5 h-4 w-4" /> Solicitações ({solicitacoes.length})
          </TabsTrigger>
          <TabsTrigger value="auditoria">
            <Activity className="mr-1.5 h-4 w-4" /> Auditoria
          </TabsTrigger>
          <TabsTrigger value="info">Conformidade</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações de titulares</CardTitle>
              <CardDescription>
                Pais e responsáveis podem exercer direitos pela página pública /privacidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 overflow-x-auto">
              {carregando ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : solicitacoes.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8 px-6">
                  Nenhuma solicitação recebida ainda. Quando alguém preencher o formulário em /privacidade, aparece aqui.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solicitacoes.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm">{formatDateBR(s.created_at.slice(0, 10))}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TIPO_SOLICITACAO_LABEL[s.tipo] ?? s.tipo}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{s.nome}</div>
                          {s.cpf && <div className="text-xs text-muted-foreground">CPF: {s.cpf}</div>}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{s.email}</div>
                          {s.telefone && <div className="text-xs text-muted-foreground">{s.telefone}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              s.status === "concluida" ? "success"
                              : s.status === "rejeitada" ? "danger"
                              : s.status === "em_analise" ? "info"
                              : "warning"
                            }
                          >
                            {STATUS_LABEL[s.status] ?? s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria">
          <Card>
            <CardHeader>
              <CardTitle>Trilha de auditoria</CardTitle>
              <CardDescription>
                Últimas {Math.min(logs.length, 50)} ações registradas no sistema.
                <br />
                Ações sensíveis instrumentadas, como login, cadastros críticos e exportação,
                aparecem aqui; a cobertura deve ser revisada a cada novo fluxo.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 overflow-x-auto">
              {carregando ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma ação registrada ainda. Comece a usar o sistema pra popular esse log.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.slice(0, 50).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-sm">
                          {new Date(l.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{l.usuario_nome ?? "Sistema"}</div>
                          {l.usuario_email && <div className="text-xs text-muted-foreground">{l.usuario_email}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {ACAO_LABEL[l.acao] ?? l.acao}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="font-mono text-xs">{l.entidade}</span>
                          {l.registro_id && (
                            <span className="text-muted-foreground text-xs ml-1">
                              · {l.registro_id}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Conformidade LGPD</CardTitle>
              <CardDescription>Checklist e medidas implementadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { ok: true, item: "Política de Privacidade pública", detalhe: "Acessível em /privacidade" },
                { ok: true, item: "Formulário pra exercer direitos LGPD", detalhe: "Acesso, exclusão, correção, portabilidade" },
                { ok: false, item: "Cobertura completa de auditoria", detalhe: "Ampliar para todos os módulos críticos" },
                { ok: true, item: "Login individual por usuário", detalhe: "Cada acesso identificado, sem senha compartilhada" },
                { ok: true, item: "Exportação completa dos dados", detalhe: "Botão acima — JSON com todas as tabelas" },
                { ok: true, item: "Criptografia em trânsito", detalhe: "HTTPS forçado em produção" },
                { ok: false, item: "Criptografia em repouso", detalhe: "Confirmar criptografia do volume e dos backups" },
                { ok: false, item: "Restauração de backup testada", detalhe: "Executar e documentar teste periódico" },
                { ok: false, item: "Termo de consentimento na matrícula", detalhe: "Implementar checkbox de aceite ao matricular" },
                { ok: false, item: "Encarregado de dados (DPO) formalizado", detalhe: "Indicar pessoa responsável" },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <Badge variant={c.ok ? "success" : "warning"} className="text-[10px] mt-0.5">
                    {c.ok ? "✓ Feito" : "⏳ Pendente"}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{c.item}</div>
                    <div className="text-xs text-muted-foreground">{c.detalhe}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
