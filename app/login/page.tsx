"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [mostrarSenha, setMostrarSenha] = React.useState(false);
  const [carregando, setCarregando] = React.useState(false);
  const [email, setEmail] = React.useState("renata@semente.com.br");
  const [senha, setSenha] = React.useState("demo-2026");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setTimeout(() => router.push("/cockpit"), 700);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Painel esquerdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white p-12 flex-col justify-between">
        {/* Pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Glows */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-400/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500/30 rounded-full blur-3xl" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur shadow-lg">
              <Sprout className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg">Semente</span>
              <span className="text-xs text-emerald-200 -mt-0.5">
                escolas conectadas
              </span>
            </div>
          </Link>
        </div>

        <div className="relative">
          <Quote className="h-12 w-12 text-emerald-300/40 mb-4" />
          <blockquote className="text-2xl xl:text-3xl font-bold tracking-tight leading-tight">
            "Em 6 meses cortamos a inadimplência em mais da metade e finalmente sei,
            todo dia, como está a saúde financeira da escola."
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-lg shadow-lg">
              RA
            </div>
            <div>
              <div className="font-semibold">Renata Andrade</div>
              <div className="text-sm text-emerald-200">
                Diretora · Escola Modelo · São Paulo
              </div>
            </div>
          </div>
          <div className="flex gap-0.5 text-amber-300 mt-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 text-center text-xs">
          {[
            { v: "+200", l: "escolas" },
            { v: "98%", l: "retenção" },
            { v: "R$ 4M+", l: "gerenciados/mês" },
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

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background relative">
        {/* Logo mobile */}
        <Link
          href="/"
          className="absolute top-6 left-6 lg:hidden flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md">
            <Sprout className="h-5 w-5" />
          </div>
          <span className="font-bold">Semente</span>
        </Link>

        <div className="w-full max-w-md">
          {/* Pill demo */}
          <div className="inline-flex items-center gap-2 rounded-full border bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-6">
            <Sparkles className="h-3 w-3" /> Modo demonstração ativo
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Bem-vinda de volta 👋
          </h1>
          <p className="mt-2 text-muted-foreground">
            Entre com sua conta para acessar o cockpit da sua escola.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  placeholder="seu@email.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <Link
                  href="#"
                  className="text-xs text-emerald-700 hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
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
                  {mostrarSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-input"
              />
              <span>Manter conectado neste dispositivo</span>
            </label>

            <Button
              type="submit"
              size="lg"
              disabled={carregando}
              className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-600/30"
            >
              {carregando ? (
                <>Entrando...</>
              ) : (
                <>
                  Entrar no sistema
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* SSO */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-11">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>
            <Button variant="outline" className="h-11">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z" />
                <path fill="#7FBA00" d="M13 1h10v10H13z" />
                <path fill="#00A4EF" d="M1 13h10v10H1z" />
                <path fill="#FFB900" d="M13 13h10v10H13z" />
              </svg>
              Microsoft
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link
              href="/"
              className="font-semibold text-emerald-700 hover:underline"
            >
              Comece grátis por 14 dias
            </Link>
          </p>

          {/* Garantias */}
          <div className="mt-6 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-600" />
              Sem cartão
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-600" />
              LGPD by design
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-600" />
              Implantação 1 dia
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-600" />
              Suporte 24/7
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
