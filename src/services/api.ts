import { Series, Episode, WatchProgress } from '../types';
import { INITIAL_SERIES } from '../data/defaultData';

const SERIES_STORAGE_KEY = 'portal_series_data_v2';
const PROGRESS_STORAGE_KEY = 'portal_watch_progress_v1';
const ADMIN_TOKEN_KEY = 'portal_admin_authenticated';
const ADMIN_PASSWORD_DEFAULT = 'admin123';

/**
 * Utilitários de Persistência Local (Offline-First e Fallback Imediato)
 */
function getLocalSeries(): Series[] {
  try {
    const raw = localStorage.getItem(SERIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Erro ao ler séries do localStorage:', err);
  }
  // Se não existir ou estiver corrompido, inicializa com o catálogo padrão
  saveLocalSeries(INITIAL_SERIES);
  return INITIAL_SERIES;
}

function saveLocalSeries(series: Series[]): void {
  try {
    localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(series));
  } catch (err) {
    console.warn('Erro ao salvar séries no localStorage:', err);
  }
}

/**
 * Tenta fazer uma requisição JSON segura para o servidor Express.
 * Se o servidor estiver offline, retornar 404, retornar HTML ou falhar na rede,
 * retorna null em vez de quebrar a aplicação.
 */
async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Recebeu HTML (típico de SPA redirect em servidor estático)
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

export const api = {
  // --- SÉRIES & EPISÓDIOS ---

  async getSeries(): Promise<Series[]> {
    // 1. Tentar carregar do servidor Express se estiver disponível
    const serverData = await safeFetchJson<Series[]>('/api/series');
    if (serverData && Array.isArray(serverData) && serverData.length > 0) {
      saveLocalSeries(serverData);
      return serverData;
    }

    // 2. Fallback imediato para os dados locais ou catálogo inicial integrado
    // Isso garante que o site NUNCA fique travado com "Aviso de Conexão"
    return getLocalSeries();
  },

  async getSeriesById(id: string): Promise<Series> {
    const serverItem = await safeFetchJson<Series>(`/api/series/${id}`);
    if (serverItem) return serverItem;

    const localList = getLocalSeries();
    const found = localList.find((s) => s.id === id);
    if (found) return found;

    throw new Error('Série não encontrada');
  },

  async createSeries(data: Partial<Series>): Promise<Series> {
    const localList = getLocalSeries();
    const newSeries: Series = {
      id: data.id || `series-${Date.now()}`,
      title: data.title || 'Sem Título',
      originalTitle: data.originalTitle || '',
      synopsis: data.synopsis || '',
      posterUrl: data.posterUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      bannerUrl: data.bannerUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
      releaseYear: Number(data.releaseYear) || new Date().getFullYear(),
      genres: Array.isArray(data.genres) && data.genres.length > 0 ? data.genres : ['Série'],
      status: data.status || 'Em Lançamento',
      totalSeasons: Number(data.totalSeasons) || 1,
      ageRating: data.ageRating || '14+',
      featured: Boolean(data.featured),
      createdAt: new Date().toISOString(),
      episodes: data.episodes || [],
    };

    localList.unshift(newSeries);
    saveLocalSeries(localList);

    // Tentar sincronizar em segundo plano com o servidor Express
    safeFetchJson('/api/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSeries),
    }).catch(() => {});

    return newSeries;
  },

  async updateSeries(id: string, data: Partial<Series>): Promise<Series> {
    const localList = getLocalSeries();
    const index = localList.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Série não encontrada');

    const updated: Series = {
      ...localList[index],
      ...data,
    };
    localList[index] = updated;
    saveLocalSeries(localList);

    // Sincronizar com servidor se disponível
    safeFetchJson(`/api/series/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});

    return updated;
  },

  async deleteSeries(id: string): Promise<void> {
    const localList = getLocalSeries();
    const filtered = localList.filter((s) => s.id !== id);
    saveLocalSeries(filtered);

    // Sincronizar com servidor se disponível
    safeFetchJson(`/api/series/${id}`, { method: 'DELETE' }).catch(() => {});
  },

  async addEpisode(seriesId: string, data: Partial<Episode>): Promise<Episode> {
    const localList = getLocalSeries();
    const seriesIndex = localList.findIndex((s) => s.id === seriesId);
    if (seriesIndex === -1) throw new Error('Série não encontrada');

    const series = localList[seriesIndex];
    const newEpisode: Episode = {
      id: data.id || `ep-${Date.now()}`,
      seriesId: series.id,
      seasonNumber: Number(data.seasonNumber) || 1,
      episodeNumber: Number(data.episodeNumber) || (series.episodes.length + 1),
      title: data.title || `Episódio ${data.episodeNumber || series.episodes.length + 1}`,
      description: data.description || '',
      sourceType: data.sourceType || 'web_url',
      videoUrl: data.videoUrl || '',
      googleDriveId: data.googleDriveId,
      downloadUrl: data.downloadUrl || data.videoUrl,
      thumbnailUrl: data.thumbnailUrl || series.posterUrl,
      durationMinutes: Number(data.durationMinutes) || 24,
      fileSizeBytes: data.fileSizeBytes ? Number(data.fileSizeBytes) : undefined,
      fileSizeFormatted: data.fileSizeFormatted,
      resolution: data.resolution || '1080p HD',
      createdAt: new Date().toISOString(),
    };

    series.episodes.push(newEpisode);
    if (newEpisode.seasonNumber > series.totalSeasons) {
      series.totalSeasons = newEpisode.seasonNumber;
    }

    saveLocalSeries(localList);

    // Sincronizar com servidor se disponível
    safeFetchJson(`/api/series/${seriesId}/episodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEpisode),
    }).catch(() => {});

    return newEpisode;
  },

  async updateEpisode(seriesId: string, episodeId: string, data: Partial<Episode>): Promise<Episode> {
    const localList = getLocalSeries();
    const series = localList.find((s) => s.id === seriesId);
    if (!series) throw new Error('Série não encontrada');

    const epIndex = series.episodes.findIndex((e) => e.id === episodeId);
    if (epIndex === -1) throw new Error('Episódio não encontrado');

    const updated: Episode = {
      ...series.episodes[epIndex],
      ...data,
    };
    series.episodes[epIndex] = updated;
    saveLocalSeries(localList);

    // Sincronizar com servidor se disponível
    safeFetchJson(`/api/series/${seriesId}/episodes/${episodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});

    return updated;
  },

  async deleteEpisode(seriesId: string, episodeId: string): Promise<void> {
    const localList = getLocalSeries();
    const series = localList.find((s) => s.id === seriesId);
    if (!series) throw new Error('Série não encontrada');

    series.episodes = series.episodes.filter((e) => e.id !== episodeId);
    saveLocalSeries(localList);

    // Sincronizar com servidor se disponível
    safeFetchJson(`/api/series/${seriesId}/episodes/${episodeId}`, {
      method: 'DELETE',
    }).catch(() => {});
  },

  // --- UPLOAD DE ARQUIVO ---
  async uploadVideo(file: File, onProgress?: (percent: number) => void): Promise<{
    fileUrl: string;
    originalName: string;
    sizeBytes: number;
    sizeFormatted: string;
  }> {
    // Tenta upload no servidor Express
    try {
      const serverResult = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('videoFile', file);

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch {
              reject(new Error('Resposta inválida do servidor'));
            }
          } else {
            reject(new Error(`Status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Erro de conexão no upload')));
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

      return serverResult;
    } catch {
      // Fallback para quando publicado em hospedagem estática ou sem backend ativo
      const objectUrl = URL.createObjectURL(file);
      const size = file.size;
      const units = ['B', 'KB', 'MB', 'GB'];
      let formattedSize = size;
      let uIndex = 0;
      while (formattedSize >= 1024 && uIndex < units.length - 1) {
        formattedSize /= 1024;
        uIndex++;
      }

      return {
        fileUrl: objectUrl,
        originalName: file.name,
        sizeBytes: size,
        sizeFormatted: `${formattedSize.toFixed(1)} ${units[uIndex]}`,
      };
    }
  },

  // --- MODO ADMINISTRADOR ---
  async loginAdmin(password: string): Promise<boolean> {
    const trimmed = password.trim();

    // 1. Tentar validar com o endpoint do servidor Express
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          localStorage.setItem(ADMIN_TOKEN_KEY, 'true');
          return true;
        }
      } else if (res.status === 401 && contentType.includes('application/json')) {
        throw new Error('Senha incorreta. A senha padrão para administração é admin123');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Senha incorreta')) {
        throw err;
      }
      // Se deu erro de conexão, 404, ou o servidor não respondeu, faz a validação local abaixo
    }

    // 2. Validação local (Garante que entra no Modo Admin sempre, inclusive no site publicado estático)
    if (trimmed === ADMIN_PASSWORD_DEFAULT) {
      localStorage.setItem(ADMIN_TOKEN_KEY, 'true');
      return true;
    }

    throw new Error('Senha incorreta. A senha padrão para administração é admin123');
  },

  logoutAdmin(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  isAdminAuthenticated(): boolean {
    return localStorage.getItem(ADMIN_TOKEN_KEY) === 'true';
  },

  async resetData(): Promise<void> {
    saveLocalSeries(INITIAL_SERIES);
    safeFetchJson('/api/reset-data', { method: 'POST' }).catch(() => {});
  },

  // --- PROGRESSO LOCAL DE VISUALIZAÇÃO ---
  getProgressMap(): Record<string, WatchProgress> {
    try {
      const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  saveProgress(episodeId: string, seriesId: string, watched: boolean, currentTimeSeconds = 0, durationSeconds = 0): void {
    const map = this.getProgressMap();
    map[episodeId] = {
      episodeId,
      seriesId,
      watched,
      currentTimeSeconds,
      durationSeconds,
      lastWatchedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('Erro ao salvar progresso no localStorage:', e);
    }
  },

  isEpisodeWatched(episodeId: string): boolean {
    const map = this.getProgressMap();
    return Boolean(map[episodeId]?.watched);
  },

  toggleEpisodeWatched(episodeId: string, seriesId: string): boolean {
    const current = this.isEpisodeWatched(episodeId);
    const next = !current;
    this.saveProgress(episodeId, seriesId, next);
    return next;
  },
};
