"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const perguntas = [
  {
    p: "Como posso conhecer o sistema?",
    r: "Solicite uma demonstração e escolha uma preferência de data e horário. O pedido fica registrado para confirmação da equipe; ele não cria sozinho um convite de calendário nem envia WhatsApp.",
  },
  {
    p: "Vocês fazem a migração dos meus dados?",
    r: "O sistema oferece exportação de dados e pode receber uma migração planejada. Formato, prazo e validação devem ser combinados antes da implantação; não há importação automática nesta instalação.",
  },
  {
    p: "Preciso instalar alguma coisa?",
    r: "Não. A interface é web e responsiva, acessada pelo navegador. A compatibilidade final deve ser validada nos aparelhos e navegadores usados pela escola.",
  },
  {
    p: "Meus dados ficam seguros?",
    r: "Esta instalação usa PostgreSQL, sessões protegidas e trilha de auditoria. Criptografia, localização do servidor, rotina de backup e retenção dependem da infraestrutura de publicação e precisam ser verificadas antes de colocar dados reais em produção.",
  },
  {
    p: "O sistema envia mensagens pelo WhatsApp?",
    r: "Sem um conector oficial configurado, o sistema salva rascunhos e abre o WhatsApp para o usuário concluir o envio. Ele não confirma entrega, leitura ou disparo automático.",
  },
  {
    p: "E se eu precisar cancelar?",
    r: "Condições comerciais, cancelamento e retenção devem constar no contrato da implantação. A instalação possui exportação de dados, mas a política de guarda e exclusão depende da operação responsável pelo servidor.",
  },
  {
    p: "Vocês emitem nota fiscal pela minha escola?",
    r: "O módulo atual mantém um controle fiscal interno e exporta os registros para conferência. Sem um conector municipal homologado, a emissão e a validação da NFS-e continuam no sistema da prefeitura.",
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
