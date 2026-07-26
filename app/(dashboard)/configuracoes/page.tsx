"use client";

import * as React from "react";
import {
  Settings,
  Users,
  Bell,
  Database,
  Palette,
  Globe,
  Cloud,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/lib/toast";
import { initials } from "@/lib/utils";

interface EscolaForm {
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  logoTexto: string;
  logoUrl: string | null;
}

export default function ConfiguracoesPage() {
  const toast = useToast();
  const [form, setForm] = React.useState<EscolaForm>({
    nome: "",
    cnpj: "",
    endereco: "",
    telefone: "",
    logoTexto: "EM",
    logoUrl: null,
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [carregando, setCarregando] = React.useState(true);
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/escola", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setForm({
          nome: data.nome ?? "",
          cnpj: data.cnpj ?? "",
          endereco: data.endereco ?? "",
          telefone: data.telefone ?? "",
          logoTexto: data.logoTexto ?? "EM",
          logoUrl: data.logoUrl ?? null,
        });
        setCarregando(false);
      })
      .catch(() => setCarregando(false));
  }, []);

  const salvar = async () => {
    setSalvando(true);
    try {
      const r = await fetch("/api/escola", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Erro ao salvar");
      toast.success("Configurações salvas!", "Dados da escola atualizados.");
    } catch (e) {
      toast.error("Erro ao salvar", String(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Settings className="h-3.5 w-3.5" /> CONFIGURAÇÕES
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">
            Configurações do sistema
          </h1>
          <p className="text-sm text-muted-foreground">
            Dados da escola, usuários, integrações e preferências.
          </p>
        </div>
      </div>

      <Tabs defaultValue="escola" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="escola">
            <Globe className="mr-1.5 h-4 w-4" /> Escola
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="mr-1.5 h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="notificacoes">
            <Bell className="mr-1.5 h-4 w-4" /> Notificações
          </TabsTrigger>
          <TabsTrigger value="integracoes">
            <Cloud className="mr-1.5 h-4 w-4" /> Integrações
          </TabsTrigger>
          <TabsTrigger value="aparencia">
            <Palette className="mr-1.5 h-4 w-4" /> Aparência
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="mr-1.5 h-4 w-4" /> Backup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="escola">
          <Card>
            <CardHeader>
              <CardTitle>Dados da escola</CardTitle>
              <CardDescription>
                Informações que aparecem em boletins e NFs. Salvas no PostgreSQL exclusivo da escola.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {carregando ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Razão Social</Label>
                      <Input
                        className="mt-1.5"
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>CNPJ</Label>
                      <Input
                        className="mt-1.5"
                        value={form.cnpj}
                        onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                        placeholder="00.000.000/0001-00"
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        className="mt-1.5"
                        value={form.telefone}
                        onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                        placeholder="(11) 3456-7890"
                      />
                    </div>
                    <div>
                      <Label>Logo (iniciais)</Label>
                      <Input
                        className="mt-1.5"
                        value={form.logoTexto}
                        maxLength={3}
                        onChange={(e) => setForm({ ...form, logoTexto: e.target.value.toUpperCase() })}
                        placeholder="EM"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Endereço</Label>
                      <Input
                        className="mt-1.5"
                        value={form.endereco}
                        onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                        placeholder="Rua, número, bairro, cidade"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={salvar} disabled={salvando}>
                      {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Salvar alterações
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <GerenciarUsuarios />
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>Notificações e rotinas</CardTitle>
              <CardDescription>
                Não há serviço de disparo agendado configurado neste ambiente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { titulo: "Inadimplência", desc: "Acompanhar manualmente no módulo Financeiro" },
                { titulo: "Evolução pedagógica", desc: "Acompanhar manualmente no módulo Pedagógico" },
                { titulo: "Estoque baixo", desc: "Acompanhar pelo ponto de reposição do Estoque" },
                { titulo: "Validade próxima", desc: "Acompanhar na lista de itens de consumo" },
                { titulo: "Aniversário de aluno", desc: "Acompanhar na listagem de alunos" },
                { titulo: "Backup", desc: "Configurar e monitorar na infraestrutura do servidor" },
              ].map((n) => (
                <div key={n.titulo} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-semibold text-sm">{n.titulo}</div>
                    <div className="text-xs text-muted-foreground">{n.desc}</div>
                  </div>
                  <Badge variant="secondary">Sem disparo automático</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes">
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { nome: "WhatsApp Business API", desc: "Sem conector de envio", status: "Não configurado" },
              { nome: "Pix bancário", desc: "Sem geração ou conciliação bancária", status: "Não configurado" },
              { nome: "Prefeitura / NFS-e", desc: "Controle interno; emissão externa", status: "Não configurado" },
              { nome: "Google Calendar", desc: "Sem sincronização de eventos", status: "Não configurado" },
              { nome: "E-mail marketing", desc: "Sem provedor de campanhas", status: "Não configurado" },
              { nome: "Open Finance", desc: "Sem importação de extrato", status: "Não configurado" },
            ].map((i) => (
              <Card key={i.nome} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{i.nome}</div>
                    <div className="text-xs text-muted-foreground">{i.desc}</div>
                  </div>
                  <Badge variant="secondary">{i.status}</Badge>
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full" disabled>
                  Conector indisponível
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="aparencia">
          <Card>
            <CardHeader>
              <CardTitle>Personalização visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Cor primária</Label>
                <div className="flex gap-2 mt-2">
                  {["#3b82f6", "#10b981", "#a855f7", "#f59e0b", "#ec4899"].map((c) => (
                    <span
                      key={c}
                      className="h-10 w-10 rounded-lg border-2 border-foreground"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Paleta de referência. A troca do tema ainda não está configurada.
                </p>
              </div>
              <div>
                <Label>Logotipo</Label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl overflow-hidden">
                    {form.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      form.logoTexto || "EM"
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 500_000) {
                        toast.error("Imagem muito grande", "Máximo 500KB");
                        return;
                      }
                      const dataUrl = await new Promise<string>((resolve, reject) => {
                        const r = new FileReader();
                        r.onload = () => resolve(String(r.result));
                        r.onerror = reject;
                        r.readAsDataURL(file);
                      });
                      setForm((f) => ({ ...f, logoUrl: dataUrl }));
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {form.logoUrl ? "Trocar imagem" : "Enviar imagem"}
                  </Button>
                  {form.logoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm((f) => ({ ...f, logoUrl: null }))}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  PNG, JPG ou SVG até 500KB. Não esqueça de clicar &quot;Salvar alterações&quot; na aba Escola depois.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Backup e exportação</CardTitle>
              <CardDescription>O aplicativo não consegue confirmar sozinho a rotina da infraestrutura.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium text-sm">Frequência</div>
                  <div className="text-xs text-muted-foreground">Defina no servidor e monitore a execução</div>
                </div>
                <Badge variant="warning">Verificar</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium text-sm">Retenção</div>
                  <div className="text-xs text-muted-foreground">Definida pela política da implantação</div>
                </div>
                <Badge variant="secondary">Infraestrutura</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium text-sm">Último backup</div>
                  <div className="text-xs text-muted-foreground">Consulte o monitoramento do servidor</div>
                </div>
                <Badge variant="warning">Infraestrutura</Badge>
              </div>
              <a
                href="/api/exportar"
                download
                className="inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                <Database className="mr-2 h-4 w-4" /> Baixar exportação operacional (JSON)
              </a>
              <p className="text-xs text-muted-foreground text-center">
                Não substitui o backup do PostgreSQL e dos arquivos privados. Salve o JSON em local seguro.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================
// Gerenciamento de Usuários do Sistema
// =====================================================

interface UsuarioSistema {
  id: string;
  email: string;
  nome: string;
  perfil: "diretor" | "coordenador" | "professor" | "financeiro";
  ativo: boolean;
  ultimoAcesso: string | null;
}

const PERFIL_LABEL: Record<string, string> = {
  diretor: "Diretor (acesso total)",
  coordenador: "Coordenador/Secretaria",
  professor: "Professor",
  financeiro: "Financeiro",
};

const PERFIL_BADGE: Record<string, "success" | "info" | "warning" | "secondary"> = {
  diretor: "success",
  coordenador: "info",
  professor: "warning",
  financeiro: "secondary",
};

function GerenciarUsuarios() {
  const toast = useToast();
  const [usuarios, setUsuarios] = React.useState<UsuarioSistema[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [editando, setEditando] = React.useState<UsuarioSistema | null>(null);

  const carregar = React.useCallback(async () => {
    try {
      const r = await fetch("/api/usuarios", { cache: "no-store" });
      const data = await r.json();
      setUsuarios(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setCarregando(false);
    }
  }, []);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const alternarAtivo = async (u: UsuarioSistema) => {
    await fetch(`/api/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ativo: !u.ativo }),
    });
    toast.success("Usuário atualizado", u.ativo ? `${u.nome} foi desativado` : `${u.nome} foi reativado`);
    carregar();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Usuários do sistema</CardTitle>
              <CardDescription>{usuarios.length} usuário(s) · Login individual com perfil</CardDescription>
            </div>
            <Button onClick={() => setModalAberto(true)}>
              + Novo usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {carregando ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : usuarios.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum usuário cadastrado.
            </p>
          ) : (
            usuarios.map((u) => (
              <div key={u.id} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${!u.ativo ? "opacity-50" : ""}`}>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">
                    {initials(u.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{u.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                <Badge variant={PERFIL_BADGE[u.perfil]}>{PERFIL_LABEL[u.perfil] ?? u.perfil}</Badge>
                <Badge variant={u.ativo ? "success" : "secondary"}>{u.ativo ? "Ativo" : "Desativado"}</Badge>
                <Button variant="ghost" size="sm" onClick={() => setEditando(u)}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => alternarAtivo(u)}>
                  {u.ativo ? "Desativar" : "Reativar"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <NovoUsuarioModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onCriado={carregar}
      />
      <EditarUsuarioModal
        usuario={editando}
        onFechar={() => setEditando(null)}
        onSalvo={carregar}
      />
    </>
  );
}

function EditarUsuarioModal({
  usuario,
  onFechar,
  onSalvo,
}: {
  usuario: UsuarioSistema | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const toast = useToast();
  const [nome, setNome] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [perfil, setPerfil] = React.useState<UsuarioSistema["perfil"]>("coordenador");
  const [senha, setSenha] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);

  React.useEffect(() => {
    if (usuario) {
      setNome(usuario.nome);
      setEmail(usuario.email);
      setPerfil(usuario.perfil);
      setSenha("");
    }
  }, [usuario]);

  if (!usuario) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const body: Record<string, unknown> = { nome, email, perfil };
      if (senha.trim()) body.senha = senha;
      const r = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        toast.error("Erro ao salvar", data.error || "Tente de novo");
        return;
      }
      toast.success("Usuário atualizado", senha ? `Senha trocada · ${nome}` : `Dados salvos · ${nome}`);
      onSalvo();
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-lg bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="font-bold text-lg">Editar usuário</h2>
          <p className="text-xs text-muted-foreground">Alterar nome, email, perfil ou senha</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label>Nome</Label>
            <Input className="mt-1.5" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-1.5" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Perfil</Label>
            <select
              value={perfil}
              onChange={(e) => setPerfil(e.target.value as UsuarioSistema["perfil"])}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="diretor">Diretor (acesso total)</option>
              <option value="coordenador">Coordenador/Secretaria</option>
              <option value="financeiro">Financeiro</option>
              <option value="professor">Professor</option>
            </select>
          </div>
          <div>
            <Label>Nova senha (deixe vazio pra manter atual)</Label>
            <Input
              className="mt-1.5"
              type="text"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={senha ? 6 : 0}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={salvando} className="bg-emerald-600 hover:bg-emerald-700">
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NovoUsuarioModal({
  aberto,
  onFechar,
  onCriado,
}: {
  aberto: boolean;
  onFechar: () => void;
  onCriado: () => void;
}) {
  const toast = useToast();
  const [nome, setNome] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [perfil, setPerfil] = React.useState<UsuarioSistema["perfil"]>("coordenador");
  const [senha, setSenha] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  if (!aberto) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome, email, perfil, senha }),
      });
      if (!r.ok) {
        const { error } = await r.json().catch(() => ({ error: "Erro" }));
        toast.error("Erro", error || "Não foi possível criar");
        setEnviando(false);
        return;
      }
      toast.success("Usuário criado!", `${nome} pode entrar com ${email}`);
      onCriado();
      onFechar();
      setNome("");
      setEmail("");
      setSenha("");
    } catch {
      toast.error("Erro", "Erro ao criar usuário");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-lg bg-popover rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="font-bold text-lg">Novo usuário</h2>
          <p className="text-xs text-muted-foreground">Será criado com login individual</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <Label>Nome completo *</Label>
            <Input className="mt-1.5" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input className="mt-1.5" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Perfil *</Label>
            <select
              value={perfil}
              onChange={(e) => setPerfil(e.target.value as UsuarioSistema["perfil"])}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="diretor">Diretor (acesso total)</option>
              <option value="coordenador">Coordenador/Secretaria</option>
              <option value="financeiro">Financeiro</option>
              <option value="professor">Professor</option>
            </select>
          </div>
          <div>
            <Label>Senha inicial *</Label>
            <Input
              className="mt-1.5"
              type="text"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Envie essa senha pro usuário em particular. Ele pode trocar depois.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={enviando} className="bg-emerald-600 hover:bg-emerald-700">
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar usuário
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
