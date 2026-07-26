"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sprout,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  Quote,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const destinoSolicitado = searchParams.get("voltar");
  const voltar =
    destinoSolicitado?.startsWith("/") && !destinoSolicitado.startsWith("//")
      ? destinoSolicitado
      : "/cockpit";

  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [mostrarSenha, setMostrarSenha] = React.useState(false);
  const [carregando, setCarregando] = React.useState(false);
  const [erro, setErro] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      if (!r.ok) {
        const { error } = await r.json().catch(() => ({ error: "Erro" }));
        setErro(error || "Login inválido");
        setCarregando(false);
        return;
      }
      // O PerfilProvider vive no layout raiz. Uma navegação cliente manteria o
      // perfil carregado antes do login ("professor") em memória. A navegação
      // completa remonta o provider e lê a sessão recém-criada no servidor.
      window.location.replace(voltar);
    } catch {
      setErro("Erro ao conectar. Tente novamente.");
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white p-12 flex-col justify-between">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500/30 rounded-full blur-3xl" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur shadow-lg">
              <Sprout className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg">Escola Modelo</span>
              <span className="text-xs text-emerald-200 -mt-0.5">Gestão escolar completa</span>
            </div>
          </Link>
        </div>

        <div className="relative">
          <Quote className="h-12 w-12 text-emerald-300/40 mb-4" />
          <blockquote className="text-2xl xl:text-3xl font-bold tracking-tight leading-tight">
            Cadastros, finanças e acompanhamento pedagógico no mesmo ambiente, com permissões por perfil e persistência no servidor.
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-lg shadow-lg">
              EM
            </div>
            <div>
              <div className="font-semibold">Escola Modelo</div>
              <div className="text-sm text-emerald-200">Ambiente de gestão escolar</div>
            </div>
          </div>
        </div>

          <div className="relative grid grid-cols-3 gap-4 text-center text-xs">
            {[
              { v: "4", l: "perfis de acesso" },
              { v: "PostgreSQL", l: "dados no servidor" },
              { v: "PT-BR", l: "rotina escolar" },
            ].map((s) => (
            <div key={s.l}>
              <div className="text-2xl font-bold bg-gradient-to-br from-white to-emerald-200 bg-clip-text text-transparent">
                {s.v}
              </div>
              <div className="text-emerald-200">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background relative">
        <Link href="/" className="absolute top-6 left-6 lg:hidden flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md">
            <Sprout className="h-5 w-5" />
          </div>
          <span className="font-bold">Escola Modelo</span>
        </Link>

        <div className="w-full max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-6">
            <Sparkles className="h-3 w-3" /> Sistema protegido
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Bem-vinda 👋</h1>
          <p className="mt-2 text-muted-foreground">Entre com seu email e senha pra acessar o sistema.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  className="pl-9 pr-10"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger">
                {erro}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={carregando}
              className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-600/30"
            >
              {carregando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar no sistema
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
            <div className="font-semibold mb-1">🔒 Acesso restrito</div>
            <div className="text-xs">
              Use seu email e senha cadastrados pela direção. Esqueceu? Contate o administrador.
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-600" />
              Sessão revogável
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-600" />
              Cookie httpOnly
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-600" />
              LGPD by design
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-600" />
              Auditoria completa
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
