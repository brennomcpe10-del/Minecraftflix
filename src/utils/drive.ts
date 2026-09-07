/**
 * Utilitários para extração e manipulação de links do Google Drive
 */

export function extractGoogleDriveId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const trimmed = urlOrId.trim();

  // Se já for apenas o ID (ex: 28 a 45 caracteres alfanuméricos com traços e sublinhados)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
    return trimmed;
  }

  // Padrão /file/d/{ID}/
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // Padrão id={ID} ou ?id={ID}
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // Padrão drive.google.com/open?id={ID}
  const openMatch = trimmed.match(/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch && openMatch[1]) {
    return openMatch[1];
  }

  return null;
}

export function getGoogleDrivePreviewUrl(id: string): string {
  return `https://drive.google.com/file/d/${id}/preview`;
}

export function getGoogleDriveDownloadUrl(id: string): string {
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

export function getGoogleDriveThumbnailUrl(id: string): string {
  // O Google Drive disponibiliza thumbnails automáticas de arquivos através deste endpoint
  return `https://drive.google.com/thumbnail?id=${id}&sz=w1280`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Tamanho não especificado';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatEpisodeCode(season: number, episode: number): string {
  const s = String(season).padStart(2, '0');
  const e = String(episode).padStart(2, '0');
  return `T${s} • E${e}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
