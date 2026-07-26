"use client";

import * as React from "react";
import {
  X,
  Calendar,
  Clock,
  Check,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/api-endpoints";
import { cn, formatDateLocalISO } from "@/lib/utils";

interface Props {
  aberto: boolean;
  onClose: () => void;
}

interface DataSugerida {
  iso: string;
  dia: string;
  mes: string;
  semana: string;
  extenso: string;
}

interface DadosContato {
  nome: string;
  cargo: string;
  escola: string;
  telefone: string;
  email: string;
  faixaAlunos: string;
  website: string;
}

const CONTATO_INICIAL: DadosContato = {
  nome: "",
  cargo: "",
  escola: "",
  telefone: "",
  email: "",
  faixaAlunos: "150-250",
  website: "",
};

const horarios = ["09:00", "10:30", "14:00", "15:30", "17:00"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const formatadorExtenso = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function proximasDatasUteis(): DataSugerida[] {
  const [ano, mes, dia] = formatDateLocalISO().split("-").map(Number);
  const cursor = new Date(Date.UTC(ano, mes - 1, dia, 12));
  const resultado: DataSugerida[] = [];

  while (resultado.length < 5) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const semana = cursor.getUTCDay();
    if (semana === 0 || semana === 6) continue;
    const anoAtual = cursor.getUTCFullYear();
    const mesAtual = cursor.getUTCMonth();
    const diaAtual = cursor.getUTCDate();
    resultado.push({
      iso: `${anoAtual}-${String(mesAtual + 1).padStart(2, "0")}-${String(diaAtual).padStart(2, "0")}`,
      dia: String(diaAtual).padStart(2, "0"),
      mes: MESES[mesAtual],
      semana: DIAS_SEMANA[semana],
      extenso: formatadorExtenso.format(cursor),
    });
  }

  return resultado;
}

export function AgendarDemoModal({ aberto, onClose }: Props) {
  const datas = React.useMemo(() => proximasDatasUteis(), [aberto]);
  const [passo, setPasso] = React.useState<"form" | "horario" | "sucesso">("form");
  const [contato, setContato] = React.useState<DadosContato>(CONTATO_INICIAL);
  const [dataIso, setDataIso] = React.useState("");
  const [hora, setHora] = React.useState(horarios[1]);
  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState("");
  const [protocolo, setProtocolo] = React.useState("");

  React.useEffect(() => {
    if (aberto) {
      setDataIso(datas[0]?.iso ?? "");
      setHora(horarios[1]);
      return;
    }
    setPasso("form");
    setContato(CONTATO_INICIAL);
    setEnviando(false);
    setErro("");
    setProtocolo("");
  }, [aberto, datas]);

  const dataSelecionada =
    datas.find((data) => data.iso === dataIso) ?? datas[0];

  const atualizarContato = (campo: keyof DadosContato, valor: string) => {
    setContato((anterior) => ({ ...anterior, [campo]: valor }));
  };

  const enviarSolicitacao = async () => {
    if (!dataSelecionada) return;
    setEnviando(true);
    setErro("");
    try {
      const resposta = await fetch(API.solicitacoesDemo, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...contato,
          dataPreferida: dataSelecionada.iso,
          horaPreferida: hora,
        }),
      });
      const resultado = (await resposta.json().catch(() => ({}))) as {
        protocolo?: string;
        error?: string;
      };
      if (!resposta.ok || !resultado.protocolo) {
        throw new Error(resultado.error || "Não foi possível registrar a solicitação.");
      }
      setProtocolo(resultado.protocolo);
      setPasso("sucesso");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar a solicitação.");
    } finally {
      setEnviando(false);
    }
  };

  if (!aberto || !dataSelecionada) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => !enviando && onClose()}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-popover shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={enviando}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-card hover:bg-accent disabled:opacity-50"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        {passo === "form" && (
          <FormPasso
            dados={contato}
            onChange={atualizarContato}
            onContinue={() => {
              setErro("");
              setPasso("horario");
            }}
          />
        )}
        {passo === "horario" && (
          <HorarioPasso
            datas={datas}
            data={dataSelecionada}
            hora={hora}
            erro={erro}
            enviando={enviando}
            onData={(data) => setDataIso(data.iso)}
            onHora={setHora}
            onContinue={enviarSolicitacao}
            onVoltar={() => {
              setErro("");
              setPasso("form");
            }}
          />
        )}
        {passo === "sucesso" && (
          <SucessoPasso
            data={dataSelecionada}
            hora={hora}
            protocolo={protocolo}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function FormPasso({
  dados,
  onChange,
  onContinue,
}: {
  dados: DadosContato;
  onChange: (campo: keyof DadosContato, valor: string) => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <div className="border-b p-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          <Calendar className="h-3 w-3" />
          Solicitar demonstração ao vivo
        </div>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          Vamos conversar 30 minutos?
        </h2>
        <p className="mt-2 text-muted-foreground">
          Conte um pouco sobre sua escola e indique uma preferência de horário.
          O envio não confirma automaticamente a agenda.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onContinue();
        }}
        className="relative space-y-4 p-8"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="demo-nome">Seu nome</Label>
            <Input
              id="demo-nome"
              className="mt-1.5"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              placeholder="Como devemos te chamar?"
              value={dados.nome}
              onChange={(event) => onChange("nome", event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="demo-cargo">Cargo na escola</Label>
            <Input
              id="demo-cargo"
              className="mt-1.5"
              required
              minLength={2}
              maxLength={120}
              placeholder="Direção, coordenação, mantenedor(a)..."
              value={dados.cargo}
              onChange={(event) => onChange("cargo", event.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="demo-escola">Nome da escola</Label>
          <Input
            id="demo-escola"
            className="mt-1.5"
            required
            minLength={2}
            maxLength={160}
            autoComplete="organization"
            placeholder="Escola Semente Feliz"
            value={dados.escola}
            onChange={(event) => onChange("escola", event.target.value)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="demo-telefone">Telefone para contato</Label>
            <Input
              id="demo-telefone"
              className="mt-1.5"
              required
              type="tel"
              maxLength={24}
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              value={dados.telefone}
              onChange={(event) => onChange("telefone", event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="demo-email">E-mail</Label>
            <Input
              id="demo-email"
              type="email"
              className="mt-1.5"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="seu@email.com.br"
              value={dados.email}
              onChange={(event) => onChange("email", event.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="demo-faixa-alunos">Quantos alunos sua escola tem?</Label>
          <select
            id="demo-faixa-alunos"
            className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={dados.faixaAlunos}
            onChange={(event) => onChange("faixaAlunos", event.target.value)}
          >
            <option value="ate-80">Até 80</option>
            <option value="80-150">80–150</option>
            <option value="150-250">150–250</option>
            <option value="250-500">250–500</option>
            <option value="mais-500">Acima de 500</option>
          </select>
        </div>

        <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <Label htmlFor="demo-website">Website</Label>
          <Input
            id="demo-website"
            tabIndex={-1}
            autoComplete="off"
            value={dados.website}
            onChange={(event) => onChange("website", event.target.value)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Usaremos os dados somente para tratar esta solicitação. Veja a{" "}
          <a href="/privacidade" className="font-medium text-emerald-700 hover:underline">
            Política de Privacidade
          </a>.
        </p>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
        >
          Escolher preferência de data e hora
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function HorarioPasso({
  datas,
  data,
  hora,
  erro,
  enviando,
  onData,
  onHora,
  onContinue,
  onVoltar,
}: {
  datas: DataSugerida[];
  data: DataSugerida;
  hora: string;
  erro: string;
  enviando: boolean;
  onData: (data: DataSugerida) => void;
  onHora: (hora: string) => void;
  onContinue: () => void;
  onVoltar: () => void;
}) {
  return (
    <div>
      <div className="border-b p-8">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
          Passo 2 de 2
        </div>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          Indique sua preferência
        </h2>
        <p className="mt-2 text-muted-foreground">
          Estas são opções sugeridas para uma conversa online de aproximadamente 30 minutos.
          A disponibilidade será confirmada manualmente depois.
        </p>
      </div>

      <div className="p-8">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Próximos dias úteis
        </Label>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {datas.map((item) => {
            const ativo = data.iso === item.iso;
            return (
              <button
                type="button"
                key={item.iso}
                onClick={() => onData(item)}
                disabled={enviando}
                className={cn(
                  "rounded-lg border-2 p-3 text-center transition-all disabled:opacity-50",
                  ativo
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-border hover:border-emerald-200"
                )}
              >
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {item.semana}
                </div>
                <div className="mt-0.5 text-xl font-bold">{item.dia}</div>
                <div className="text-[10px] text-muted-foreground">{item.mes}</div>
              </button>
            );
          })}
        </div>

        <Label className="mt-6 block text-xs uppercase tracking-wider text-muted-foreground">
          Horário de preferência
        </Label>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {horarios.map((item) => {
            const ativo = hora === item;
            return (
              <button
                type="button"
                key={item}
                onClick={() => onHora(item)}
                disabled={enviando}
                className={cn(
                  "rounded-lg border-2 py-3 text-center transition-all disabled:opacity-50",
                  ativo
                    ? "border-emerald-500 bg-emerald-50 font-semibold"
                    : "border-border hover:border-emerald-200"
                )}
              >
                {item}
              </button>
            );
          })}
        </div>

        {erro && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {erro}
          </div>
        )}

        <div className="mt-8 flex gap-2">
          <Button type="button" variant="outline" onClick={onVoltar} disabled={enviando}>
            Voltar
          </Button>
          <Button
            type="button"
            onClick={onContinue}
            disabled={enviando}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
          >
            {enviando ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...
              </>
            ) : (
              <>
                Enviar solicitação
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SucessoPasso({
  data,
  hora,
  protocolo,
  onClose,
}: {
  data: DataSugerida;
  hora: string;
  protocolo: string;
  onClose: () => void;
}) {
  return (
    <div className="p-8 text-center md:p-12">
      <div className="relative inline-flex">
        <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-500/30 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl">
          <Check className="h-10 w-10 text-white" strokeWidth={3} />
        </div>
      </div>

      <h2 className="mt-6 text-2xl font-bold tracking-tight md:text-3xl">
        Solicitação registrada
      </h2>
      <p className="mt-3 text-muted-foreground">
        Recebemos sua preferência por <strong>{data.extenso}</strong>, às{" "}
        <strong>{hora}</strong>. O horário ainda depende de confirmação.
      </p>

      <div className="mt-6 inline-flex flex-col items-start rounded-lg border bg-muted/40 p-4 text-left text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <Calendar className="h-4 w-4 text-emerald-600" />
          Preferência: {data.dia} {data.mes} · {data.semana}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {hora} · conversa online · ~30 min
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Protocolo: <span className="font-mono font-semibold text-foreground">{protocolo}</span>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Nenhum convite de calendário ou mensagem de WhatsApp foi enviado automaticamente.
        Seus dados ficaram registrados para um retorno manual da equipe.
      </p>

      <Button
        type="button"
        onClick={onClose}
        size="lg"
        className="mt-6 bg-emerald-600 hover:bg-emerald-700"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Continuar explorando
      </Button>
    </div>
  );
}
