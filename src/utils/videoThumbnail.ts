/**
 * Utilitário para extração automática de miniaturas de arquivos de vídeo locais via HTML5 Canvas
 */
export async function extractThumbnailFromVideoFile(file: File): Promise<{
  dataUrl: string;
  durationSeconds: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    // Timeout de segurança para caso o formato de vídeo não seja suportado diretamente pelo navegador
    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Tempo limite excedido ao processar vídeo para miniatura.'));
    }, 15000);

    video.onloadedmetadata = () => {
      // Seek para 20% do vídeo ou 3 segundos para pegar uma cena interessante
      const seekTime = Math.min(3, Math.max(1, video.duration * 0.15));
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        const targetWidth = 640;
        const scale = targetWidth / (video.videoWidth || 640);
        const targetHeight = Math.round((video.videoHeight || 360) * scale);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Falha ao obter contexto 2D do Canvas.'));
          return;
        }

        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        const durationSeconds = video.duration || 0;
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

        URL.revokeObjectURL(url);
        resolve({
          dataUrl,
          durationSeconds,
          width,
          height,
        });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler o arquivo de vídeo no navegador.'));
    };
  });
}
