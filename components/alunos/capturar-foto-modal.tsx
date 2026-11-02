"use client";

import * as React from "react";
import { Camera, Loader2, RefreshCcw, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/toast";
import { capturarQuadrado } from "@/lib/captura-foto";

interface Props {
  alunoId: string;
  nomeAluno: string;
  onClose: () => void;
  onAtualizado?: (url: string) => void;
}

type EstadoCamera = "iniciando" | "ativa" | "erro";

function mensagemErroCamera(erro: unknown): string {
  const nome = (erro as { name?: string } | null)?.name;
  if (nome === "NotAllowedError") {
    return "O navegador bloqueou a câmera. Libere a permissão no cadeado da barra de endereço ou envie um arquivo.";
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") {
    return "Nenhuma câmera foi encontrada neste computador. Envie um arquivo.";
  }
  return "Não deu para abrir a câmera. Envie um arquivo.";
}

/**
 * Tira a foto do aluno pela webcam (recorte quadrado) ou recebe um arquivo —
 * os dois caminhos sobem pela mesma rota de upload já auditada. Montar o
 * componente abre o modal; a câmera desliga ao fechar/desmontar.
 */
export function CapturarFotoModal({ alunoId, nomeAluno, onClose, onAtualizado }: Props) {
  const toast = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [camera, setCamera] = React.useState<EstadoCamera>("iniciando");
  const [erroCamera, setErroCamera] = React.useState("");
  const [capturada, setCapturada] = React.useState<{ blob: Blob; url: string } | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  const montadoRef = React.useRef(true);

  React.useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    let ativo = true;
    const iniciar = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCamera("erro");
        setErroCamera("Este navegador não dá acesso à câmera. Envie um arquivo.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1024 }, height: { ideal: 1024 } },
          audio: false,
        });
        if (!ativo) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamera("ativa");
      } catch (erro) {
        if (!ativo) return;
        setCamera("erro");
        setErroCamera(mensagemErroCamera(erro));
      }
    };
    void iniciar();
    return () => {
      ativo = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  // A prévia congelada usa um object URL; sem revogar, cada captura vaza memória.
  React.useEffect(() => {
    return () => {
      if (capturada) URL.revokeObjectURL(capturada.url);
    };
  }, [capturada]);

  const tirarFoto = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    try {
      const blob = await capturarQuadrado(video, document.createElement("canvas"));
      // Modal fechado durante o toBlob: criar a object URL aqui vazaria memória
      // (o setState é descartado e o efeito de revogação nunca a registraria).
      if (!montadoRef.current) return;
      setCapturada({ blob, url: URL.createObjectURL(blob) });
    } catch {
      toast.error("Não foi possível capturar", "Tente de novo ou envie um arquivo.");
    }
  };

  const enviar = async (file: File) => {
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.set("alunoId", alunoId);
      fd.set("file", file);
      const resposta = await fetch("/api/upload/foto-aluno", { method: "POST", body: fd });
      const data = (await resposta.json().catch(() => ({}))) as { url?: unknown; error?: unknown };
      // 200 sem a url no corpo é contrato quebrado: tratar como erro em vez de
      // propagar "undefined" para o cadastro (o PATCH gravaria por cima da URL boa).
      if (!resposta.ok || typeof data.url !== "string") {
        toast.error("Erro ao salvar a foto", typeof data.error === "string" ? data.error : "Tente de novo");
        return;
      }
      toast.success("Foto atualizada!", nomeAluno);
      onAtualizado?.(data.url);
      onClose();
    } catch (erro) {
      toast.error("Erro de conexão", String(erro));
    } finally {
      setEnviando(false);
    }
  };

  const usarCapturada = () => {
    if (!capturada) return;
    void enviar(new File([capturada.blob], "webcam.jpg", { type: "image/jpeg" }));
  };

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void enviar(file as File);
    event.target.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => !enviando && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="capturar-foto-titulo"
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-popover shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h2 id="capturar-foto-titulo" className="font-bold">Foto de {nomeAluno}</h2>
          </div>
          <button
            type="button"
            onClick={() => !enviando && onClose()}
            className="rounded-md p-2 hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
            {/* Prévia espelhada como um espelho; a foto gravada sai sem espelho. */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover -scale-x-100"
            />
            {capturada && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capturada.url}
                alt="Prévia da foto capturada"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {camera === "iniciando" && !capturada && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white">
                <Loader2 className="h-4 w-4 animate-spin" /> Abrindo a câmera…
              </div>
            )}
            {camera === "erro" && !capturada && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
                {erroCamera}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {camera === "ativa" && !capturada && (
              <Button type="button" onClick={() => void tirarFoto()}>
                <Camera className="mr-2 h-4 w-4" /> Tirar foto
              </Button>
            )}
            {capturada && (
              <>
                <Button type="button" onClick={usarCapturada} disabled={enviando}>
                  {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Usar esta foto
                </Button>
                <Button type="button" variant="outline" onClick={() => setCapturada(null)} disabled={enviando}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Tirar outra
                </Button>
              </>
            )}
            <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()} disabled={enviando}>
              {enviando && !capturada && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" /> Enviar arquivo
            </Button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPickFile}
        />
      </div>
    </div>
  );
}
