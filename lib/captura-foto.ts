/**
 * Captura de foto pela webcam: recorte quadrado central do frame do vídeo.
 * Tipos estruturais mínimos para os testes stubarem vídeo e canvas sem DOM.
 */

export interface FonteVideo {
  videoWidth: number;
  videoHeight: number;
}

export interface ContextoCaptura {
  drawImage(
    fonte: FonteVideo,
    sx: number, sy: number, sw: number, sh: number,
    dx: number, dy: number, dw: number, dh: number
  ): void;
}

export interface CanvasCaptura {
  width: number;
  height: number;
  getContext(tipo: "2d"): ContextoCaptura | null;
  toBlob(callback: (blob: Blob | null) => void, tipo?: string, qualidade?: number): void;
}

export function recorteQuadrado(largura: number, altura: number): { sx: number; sy: number; lado: number } {
  const lado = Math.min(largura, altura);
  return {
    sx: Math.floor((largura - lado) / 2),
    sy: Math.floor((altura - lado) / 2),
    lado,
  };
}

/** Congela o frame atual do vídeo num JPEG quadrado (ladoDestino × ladoDestino). */
export function capturarQuadrado(
  video: FonteVideo,
  canvas: CanvasCaptura,
  ladoDestino = 512
): Promise<Blob> {
  const { sx, sy, lado } = recorteQuadrado(video.videoWidth, video.videoHeight);
  canvas.width = ladoDestino;
  canvas.height = ladoDestino;
  const contexto = canvas.getContext("2d");
  if (!contexto) return Promise.reject(new Error("Canvas 2D indisponível neste navegador"));
  contexto.drawImage(video, sx, sy, lado, lado, 0, 0, ladoDestino, ladoDestino);
  return new Promise((resolver, rejeitar) => {
    canvas.toBlob(
      (blob) => (blob ? resolver(blob) : rejeitar(new Error("Falha ao gerar a imagem"))),
      "image/jpeg",
      0.9
    );
  });
}
