"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Mail, Send, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

type TipoSolicitacao = "acesso" | "exclusao" | "correcao" | "portabilidade";

const TIPOS_LABEL: Record<TipoSolicitacao, string> = {
  acesso: "Acessar meus dados",
  exclusao: "Excluir meus dados",
  correcao: "Corrigir meus dados",
  portabilidade: "Portabilidade (receber em outro formato)",
};

export default function PrivacidadePage() {
  const [tipo, setTipo] = React.useState<TipoSolicitacao>("acesso");
  const [nome, setNome] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [detalhes, setDetalhes] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [sucesso, setSucesso] = React.useState(false);
  const [erro, setErro] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const r = await fetch("/api/lgpd/solicitacao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo, nome, email, cpf: cpf || undefined, telefone: telefone || undefined, detalhes: detalhes || undefined }),
      });
      if (!r.ok) {
        const { error } = await r.json().catch(() => ({ error: "Erro" }));
        setErro(error || "Erro ao enviar");
        setEnviando(false);
        return;
      }
      setSucesso(true);
      setEnviando(false);
    } catch {
      setErro("Erro ao conectar");
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">Privacidade & LGPD</div>
              <div className="text-xs text-muted-foreground">Escola Modelo</div>
            </div>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        {/* Hero */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 mb-4">
            <ShieldCheck className="h-3 w-3" /> Lei Geral de Proteção de Dados (LGPD)
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Seus dados e os dados do seu filho são seus
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Levamos a sério a proteção das informações que você nos confia.
            Conheça abaixo nossa política de privacidade e exerça seus direitos a qualquer momento.
          </p>
        </section>

        {/* Política de privacidade resumida */}
        <section>
          <h2 className="text-xl font-bold mb-4">Política de privacidade</h2>
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              <strong>1. O que coletamos.</strong> Para prestar o serviço educacional, coletamos
              dados pessoais dos alunos (nome, data de nascimento, CPF, RG quando aplicável, foto, observações pedagógicas)
              e dos responsáveis legais (nome, CPF, endereço, telefone, email). Coletamos também
              registros de frequência, avaliações pedagógicas, mensalidades e pagamentos.
            </p>
            <p>
              <strong>2. Base legal.</strong> O tratamento dos dados ocorre com base na execução do contrato
              educacional, no cumprimento de obrigações legais (LDB, Constituição Federal, MEC)
              e, em casos específicos, no consentimento informado dos responsáveis legais.
            </p>
            <p>
              <strong>3. Para que usamos.</strong> Os dados são utilizados exclusivamente para:
              prestação do serviço educacional, gestão acadêmica e financeira, comunicação com responsáveis,
              cumprimento de obrigações fiscais (NFS-e) e regulatórias (MEC, censo escolar).
            </p>
            <p>
              <strong>4. Com quem compartilhamos.</strong> Não vendemos nem comercializamos dados pessoais.
              Compartilhamos apenas com autoridades quando obrigados por lei (MEC, Receita Federal, prefeitura municipal)
              e com prestadores de serviço estritamente necessários (processamento de pagamento, NFS-e, hospedagem),
              sempre sob acordos de confidencialidade.
            </p>
            <p>
              <strong>5. Por quanto tempo.</strong> Mantemos os dados pelo tempo necessário para cumprir nossas
              obrigações legais e contratuais. Após o desligamento do aluno, mantemos histórico escolar conforme
              legislação educacional (mínimo 5 anos para registros pedagógicos e 10 anos para registros fiscais).
            </p>
            <p>
              <strong>6. Segurança.</strong> Os dados são armazenados em infraestrutura privada contratada, com
              criptografia em trânsito (HTTPS), banco isolado e acesso restrito por login individual. A política de
              backup, retenção e localização do tratamento é documentada pela escola e seus operadores.
            </p>
            <p>
              <strong>7. Seus direitos.</strong> Você pode solicitar acesso, correção, exclusão, portabilidade ou
              informações sobre o tratamento dos seus dados (ou do seu filho) a qualquer momento, usando o formulário abaixo.
              Responderemos em até 15 dias úteis.
            </p>
            <p>
              <strong>8. Encarregado (DPO).</strong> Em caso de dúvidas, entre em contato com nosso responsável pela
              proteção de dados pelo email <a href="mailto:privacidade@escolamodelo.com" className="text-emerald-700 underline">privacidade@escolamodelo.com</a>.
            </p>
          </div>
        </section>

        {/* Formulário de solicitação */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-emerald-600" />
                Exerça seus direitos LGPD
              </CardTitle>
              <CardDescription>
                Preencha o formulário abaixo. Vamos responder em até 15 dias úteis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sucesso ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-6 text-center">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="font-semibold text-emerald-800">Solicitação recebida!</div>
                  <p className="text-sm text-emerald-700 mt-1">
                    Vamos analisar e responder no email informado em até 15 dias úteis.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <Label>Tipo de solicitação *</Label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as TipoSolicitacao)}
                      className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {Object.entries(TIPOS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Seu nome completo *</Label>
                      <Input className="mt-1.5" required value={nome} onChange={(e) => setNome(e.target.value)} />
                    </div>
                    <div>
                      <Label>Seu email *</Label>
                      <Input className="mt-1.5" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <Label>CPF</Label>
                      <Input className="mt-1.5" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input className="mt-1.5" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 91234-5678" />
                    </div>
                  </div>
                  <div>
                    <Label>Detalhes da solicitação</Label>
                    <textarea
                      className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      rows={4}
                      value={detalhes}
                      onChange={(e) => setDetalhes(e.target.value)}
                      placeholder="Ex: Sou pai do aluno João Silva. Quero saber quais dados do meu filho estão armazenados."
                    />
                  </div>
                  {erro && (
                    <div className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger">
                      {erro}
                    </div>
                  )}
                  <Button type="submit" disabled={enviando} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Enviar solicitação
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </section>

        <div className="text-center text-xs text-muted-foreground py-8">
          Última atualização desta política: {new Date().toLocaleDateString("pt-BR")}
        </div>
      </main>
    </div>
  );
}
