"use client";

import * as React from "react";
import { X, Calendar, Clock, Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Props {
  aberto: boolean;
  onClose: () => void;
}

// Datas disponíveis (próximos 5 dias úteis)
const datas = [
  { dia: "10", mes: "JUN", semana: "Qua" },
  { dia: "11", mes: "JUN", semana: "Qui" },
  { dia: "12", mes: "JUN", semana: "Sex" },
  { dia: "15", mes: "JUN", semana: "Seg" },
  { dia: "16", mes: "JUN", semana: "Ter" },
];

const horarios = ["09:00", "10:30", "14:00", "15:30", "17:00"];

export function AgendarDemoModal({ aberto, onClose }: Props) {
  const [passo, setPasso] = React.useState<"form" | "horario" | "sucesso">("form");
  const [data, setData] = React.useState(datas[2]);
  const [hora, setHora] = React.useState(horarios[1]);

  React.useEffect(() => {
    if (!aberto) setPasso("form");
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-popover rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 h-8 w-8 rounded-md bg-card hover:bg-accent flex items-center justify-center z-10"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {passo === "form" && (
          <FormPasso onContinue={() => setPasso("horario")} />
        )}
        {passo === "horario" && (
          <HorarioPasso
            data={data}
            hora={hora}
            onData={setData}
            onHora={setHora}
            onContinue={() => setPasso("sucesso")}
            onVoltar={() => setPasso("form")}
          />
        )}
        {passo === "sucesso" && (
          <SucessoPasso data={data} hora={hora} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function FormPasso({ onContinue }: { onContinue: () => void }) {
  return (
    <div>
      <div className="p-8 border-b">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold mb-3">
          <Calendar className="h-3 w-3" />
          Agendar demonstração ao vivo
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Vamos conversar 30 minutos?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Um especialista Semente entende sua escola e mostra como a gente pode ajudar.
          Sem compromisso, sem pressão.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onContinue();
        }}
        className="p-8 space-y-4"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Seu nome</Label>
            <Input className="mt-1.5" required placeholder="Como devo te chamar?" />
          </div>
          <div>
            <Label>Cargo na escola</Label>
            <Input className="mt-1.5" required placeholder="Diretora, sócia, dona..." />
          </div>
        </div>
        <div>
          <Label>Nome da escola</Label>
          <Input className="mt-1.5" required placeholder="Escola Semente Feliz" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>WhatsApp</Label>
            <Input className="mt-1.5" required placeholder="(11) 99999-9999" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" className="mt-1.5" required placeholder="seu@email.com.br" />
          </div>
        </div>
        <div>
          <Label>Quantos alunos sua escola tem?</Label>
          <select
            className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="100-250"
          >
            <option>Até 80</option>
            <option>80–150</option>
            <option>150–250</option>
            <option>250–500</option>
            <option>Acima de 500</option>
          </select>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
        >
          Escolher data e hora
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function HorarioPasso({
  data,
  hora,
  onData,
  onHora,
  onContinue,
  onVoltar,
}: {
  data: typeof datas[0];
  hora: string;
  onData: (d: typeof datas[0]) => void;
  onHora: (h: string) => void;
  onContinue: () => void;
  onVoltar: () => void;
}) {
  return (
    <div>
      <div className="p-8 border-b">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
          Passo 2 de 2
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Escolha um horário
        </h2>
        <p className="mt-2 text-muted-foreground">
          Conversa por Google Meet · ~30 minutos.
        </p>
      </div>

      <div className="p-8">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Data
        </Label>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {datas.map((d) => {
            const ativo = data.dia === d.dia;
            return (
              <button
                key={d.dia}
                onClick={() => onData(d)}
                className={cn(
                  "rounded-lg border-2 p-3 text-center transition-all",
                  ativo
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-border hover:border-emerald-200"
                )}
              >
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {d.semana}
                </div>
                <div className="text-xl font-bold mt-0.5">{d.dia}</div>
                <div className="text-[10px] text-muted-foreground">{d.mes}</div>
              </button>
            );
          })}
        </div>

        <Label className="text-xs uppercase tracking-wider text-muted-foreground mt-6 block">
          Horário disponível
        </Label>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {horarios.map((h) => {
            const ativo = hora === h;
            return (
              <button
                key={h}
                onClick={() => onHora(h)}
                className={cn(
                  "rounded-lg border-2 py-3 text-center transition-all",
                  ativo
                    ? "border-emerald-500 bg-emerald-50 font-semibold"
                    : "border-border hover:border-emerald-200"
                )}
              >
                {h}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mt-8">
          <Button variant="outline" onClick={onVoltar}>
            Voltar
          </Button>
          <Button
            onClick={onContinue}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
          >
            Confirmar agendamento
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SucessoPasso({
  data,
  hora,
  onClose,
}: {
  data: typeof datas[0];
  hora: string;
  onClose: () => void;
}) {
  return (
    <div className="text-center p-8 md:p-12">
      <div className="relative inline-flex">
        <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-2xl animate-pulse" />
        <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-xl">
          <Check className="h-10 w-10 text-white" strokeWidth={3} />
        </div>
      </div>

      <h2 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight">
        Demonstração agendada! 🎉
      </h2>
      <p className="mt-3 text-muted-foreground">
        A gente vai te encontrar dia <strong>{data.dia} de junho</strong> ({data.semana}.) às{" "}
        <strong>{hora}</strong>.
      </p>

      <div className="mt-6 inline-flex flex-col items-start text-left rounded-lg bg-muted/40 border p-4 text-sm">
        <div className="font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-600" />
          {data.dia} de junho ({data.semana}.)
        </div>
        <div className="text-muted-foreground flex items-center gap-2 mt-1.5">
          <Clock className="h-3.5 w-3.5" />
          {hora} · Google Meet · ~30min
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Convite no Google Calendar foi enviado pro seu e-mail.
        <br />
        Em até 2h um especialista Semente confirma no WhatsApp.
      </p>

      <Button onClick={onClose} size="lg" className="mt-6 bg-emerald-600 hover:bg-emerald-700">
        <Sparkles className="mr-2 h-4 w-4" />
        Explorar a demo enquanto isso
      </Button>
    </div>
  );
}
