"use client";

import * as React from "react";
import { Shield, Power, RotateCcw, Loader2, Save, Server, Database } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/toast";
import { useModulos } from "@/lib/modulos-context";
import { cn } from "@/lib/utils";

export default function SuperAdminPage() {
  const { modulos, carregando, recarregar } = useModulos();
  const toast = useToast();
  const [busca, setBusca] = React.useState("");
  const [salvando, setSalvando] = React.useState<string | null>(null);

  const toggleModulo = async (id: string, ativo: boolean) => {
    setSalvando(id);
    try {
      const r = await fetch("/api/admin/modulos", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ativo }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        toast.error("Erro", d.error || "Tente de novo");
        return;
      }
      await recarregar();
      toast.success(ativo ? "Módulo ativado" : "Módulo desativado", id);
    } finally {
      setSalvando(null);
    }
  };

  const ativarTodos = async () => {
    setSalvando("__all__");
    try {
      await Promise.all(
        modulos.filter((m) => !m.ativo).map((m) =>
          fetch("/api/admin/modulos", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: m.id, ativo: true }),
          })
        )
      );
      await recarregar();
      toast.success("Todos os módulos ativados", "");
    } finally {
      setSalvando(null);
    }
  };

  const filtrados = modulos.filter((m) =>
    busca ? m.nome.toLowerCase().includes(busca.toLowerCase()) : true
  );

  const porGrupo: Record<string, typeof modulos> = {};
  for (const m of filtrados) {
    const g = m.grupo ?? "Outros";
    if (!porGrupo[g]) porGrupo[g] = [];
    porGrupo[g].push(m);
  }

  const totalAtivos = modulos.filter((m) => m.ativo).length;
  const totalInativos = modulos.length - totalAtivos;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-rose-600">
          <Shield className="h-3.5 w-3.5" /> SUPER ADMIN
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">Controle de módulos</h1>
        <p className="text-sm text-muted-foreground">
          Liga/desliga funcionalidades do sistema. Módulos desativados somem do menu e ficam bloqueados.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Total módulos</div>
          <div className="mt-1 text-2xl font-bold">{modulos.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Ativos</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{totalAtivos}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Desativados</div>
          <div className="mt-1 text-2xl font-bold text-rose-600">{totalInativos}</div>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={salvando === "__all__" || totalInativos === 0}
            onClick={ativarTodos}
          >
            {salvando === "__all__" ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-2" />}
            Ativar todos
          </Button>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Módulos
              </CardTitle>
              <CardDescription>Clica no switch pra ativar/desativar</CardDescription>
            </div>
            <Input
              placeholder="Buscar módulo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {carregando ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : Object.keys(porGrupo).length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhum módulo cadastrado. Rode o SQL primeiro.
            </div>
          ) : (
            Object.entries(porGrupo).map(([grupo, mods]) => (
              <div key={grupo}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {grupo}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {mods.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3",
                        m.ativo ? "bg-card" : "bg-muted/30 opacity-70"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{m.nome}</div>
                        <div className="text-xs text-muted-foreground">/{m.id}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleModulo(m.id, !m.ativo)}
                        disabled={salvando === m.id}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          m.ativo ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700",
                          salvando === m.id && "opacity-50"
                        )}
                        aria-label={m.ativo ? "Desativar" : "Ativar"}
                      >
                        <span
                          className={cn(
                            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                            m.ativo ? "translate-x-5" : "translate-x-0.5"
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4" /> Status do sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Next.js / PM2" status="online" />
            <Row label="PostgreSQL exclusivo" status="warn" texto="Validado pelo health check do servidor" />
            <Row label="Arquivos privados na VPS" status="warn" texto="Incluídos no plano de backup" />
            <Row label="Build" status="online" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" /> Atalhos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link href="/lgpd" className="block rounded-md border p-3 hover:bg-accent">
              <div className="font-medium">LGPD & Auditoria</div>
              <div className="text-xs text-muted-foreground">Logs e solicitações</div>
            </Link>
            <Link href="/configuracoes" className="block rounded-md border p-3 hover:bg-accent">
              <div className="font-medium">Configurações da escola</div>
              <div className="text-xs text-muted-foreground">Nome, logo, usuários, integrações</div>
            </Link>
            <a
              href="/api/exportar"
              className="block rounded-md border p-3 hover:bg-accent"
              target="_blank"
              rel="noreferrer"
            >
              <div className="font-medium flex items-center gap-2">
                <Save className="h-3.5 w-3.5" /> Baixar exportação operacional (JSON)
              </div>
              <div className="text-xs text-muted-foreground">Dados operacionais; não substitui o backup da infraestrutura</div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, status, texto }: { label: string; status: "online" | "warn" | "offline"; texto?: string }) {
  const cor = status === "online" ? "success" : status === "warn" ? "warning" : "danger";
  const labelStatus = status === "online" ? "Online" : status === "warn" ? "Atenção" : "Offline";
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="font-medium">{label}</div>
        {texto && <div className="text-xs text-muted-foreground">{texto}</div>}
      </div>
      <Badge variant={cor}>{labelStatus}</Badge>
    </div>
  );
}
