"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Mail,
  IdCard,
  ArrowRight,
  Loader2,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPaisPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [erro, setErro] = React.useState("");
  const [carregando, setCarregando] = React.useState(false);

  const formatCpf = (v: string): string => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro("");
    try {
      const r = await fetch("/api/auth/pais/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, cpf }),
      });
      if (!r.ok) {
        const { error } = await r.json().catch(() => ({ error: "Erro" }));
        setErro(error || "Email ou CPF não conferem");
        setCarregando(false);
        return;
      }
      router.push("/pais");
      router.refresh();
    } catch {
      setErro("Erro ao conectar. Tente de novo.");
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-pink-500 via-pink-600 to-rose-700 text-white p-12 flex-col justify-between">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-pink-400/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-rose-500/30 rounded-full blur-3xl" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur shadow-lg">
              <Heart className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg">Portal dos Pais</span>
              <span className="text-xs text-pink-200 -mt-0.5">
                Acompanhe seus filhos
              </span>
            </div>
          </Link>
        </div>

        <div className="relative">
          <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight">
            Tudo sobre seu(s) filho(s) em um só lugar
          </h2>
          <p className="mt-4 text-pink-100">
            Acompanhe boletim, mensalidades, cardápio, eventos e avisos da escola direto pelo celular.
          </p>
          <div className="mt-6 space-y-2">
            {[
              "Alunos vinculados ao responsável",
              "Mensalidades e situação de pagamento",
              "Cardápio semanal e eventos",
              "Mural com avisos da escola",
            ].map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-pink-200" />
                {b}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-pink-100">
          Para acessar, use o email e CPF cadastrados na matrícula.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700 mb-6">
            <Sparkles className="h-3 w-3" /> Acesso seguro
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Bem-vindo(a) 💛
          </h1>
          <p className="mt-2 text-muted-foreground">
            Entre com seu email e CPF cadastrados na matrícula do seu filho.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email cadastrado</Label>
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
              <Label htmlFor="cpf">CPF</Label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  className="pl-9"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  required
                />
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
              className="w-full h-12 text-base bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 shadow-lg shadow-pink-600/30"
            >
              {carregando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Acessar portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
            <div className="font-semibold mb-1">💡 Primeiro acesso?</div>
            <div className="text-xs">
              Use exatamente o email e CPF que você forneceu no momento da matrícula do seu filho.
              Se esqueceu, entre em contato com a secretaria da escola.
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/" className="font-semibold text-pink-700 hover:underline">
              ← Voltar para o site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
