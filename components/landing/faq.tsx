"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const perguntas = [
  {
    p: "Como funciona o teste gratuito de 14 dias?",
    r: "Você acessa o sistema completo, sem cartão de crédito. Pode cadastrar alunos, lançar mensalidades e testar todos os módulos. Ao final dos 14 dias, decide se quer continuar — sem cobrança automática.",
  },
  {
    p: "Vocês fazem a migração dos meus dados?",
    r: "Sim. Independente de onde estejam (planilhas Excel, Google Sheets, sistemas como Sponte, EduConnect, ClassApp), nossa equipe importa alunos, responsáveis, contratos e histórico financeiro — sem custo adicional nos planos Pro e Enterprise.",
  },
  {
    p: "Preciso instalar alguma coisa?",
    r: "Não. Semente é 100% web. Funciona em qualquer navegador, computador, tablet ou celular. O app dos pais é disponibilizado como Progressive Web App (PWA), sem necessidade de baixar na loja.",
  },
  {
    p: "Meus dados ficam seguros?",
    r: "Sim. Operamos em infraestrutura AWS no Brasil (São Paulo), com criptografia em trânsito (TLS 1.3) e em repouso (AES-256). Conformidade total com a LGPD, logs de auditoria de todas as ações e backup diário automatizado com retenção de 90 dias.",
  },
  {
    p: "A integração com WhatsApp é oficial?",
    r: "Sim. Usamos a WhatsApp Business API oficial (Meta), com templates pré-aprovados para cobrança, comunicados e avisos. Mensagens chegam pelo WhatsApp Business da sua escola, não pelo nosso.",
  },
  {
    p: "E se eu precisar cancelar?",
    r: "Sem fidelidade. Você cancela a qualquer momento, com aviso de 30 dias. Exportamos todos os seus dados em formato aberto (CSV/JSON/PDF) e mantemos backup por 12 meses após o cancelamento, conforme a LGPD.",
  },
  {
    p: "Vocês emitem nota fiscal pela minha escola?",
    r: "Não emitimos pela sua escola — facilitamos. Você configura sua inscrição municipal e certificado digital A1, e o sistema emite NFS-e automaticamente nos principais municípios brasileiros (SP, RJ, BH, Curitiba, Porto Alegre, e mais 80 cidades).",
  },
  {
    p: "Funciona para escolas bilíngues, montessorianas, religiosas?",
    r: "Sim. A Semente é agnóstica de método pedagógico. Você customiza as competências avaliadas, a escala, a periodicidade dos boletins e os relatórios. Atendemos escolas tradicionais, bilíngues, montessorianas, Waldorf, religiosas e construtivistas.",
  },
];

export function LandingFaq() {
  const [aberto, setAberto] = React.useState<number | null>(0);

  return (
    <section id="faq" className="py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Dúvidas frequentes
          </div>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight">
            Tudo que você precisa saber
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Ainda em dúvida? Fale com a gente em{" "}
            <a href="mailto:oi@semente.com.br" className="text-emerald-700 font-semibold underline">
              oi@semente.com.br
            </a>
          </p>
        </div>

        <div className="space-y-3">
          {perguntas.map((q, i) => {
            const isOpen = aberto === i;
            return (
              <div
                key={q.p}
                className={cn(
                  "rounded-xl border bg-card transition-all",
                  isOpen && "shadow-sm border-emerald-200"
                )}
              >
                <button
                  onClick={() => setAberto(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="font-semibold">{q.p}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground shrink-0 transition-transform",
                      isOpen && "rotate-180 text-emerald-600"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-muted-foreground leading-relaxed">
                    {q.r}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
