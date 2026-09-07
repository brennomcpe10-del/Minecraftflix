import { Series, Episode, WatchProgress } from '../types';

const PROGRESS_STORAGE_KEY = 'portal_watch_progress_v1';
const ADMIN_TOKEN_KEY = 'portal_admin_authenticated';

export const api = {
  // --- SÉRIES & EPISÓDIOS ---
  async getSeries(): Promise<Series[]> {
    const res = await fetch('/api/series');
    if (!res.ok) throw new Error('Falha ao buscar séries');
    return res.json();
  },

  async getSeriesById(id: string): Promise<Series> {
    const res = await fetch(`/api/series/${id}`);
    if (!res.ok) throw new Error('Falha ao buscar série');
    return res.json();
  },

  async createSeries(data: Partial<Series>): Promise<Series> {
    const res = await fetch('/api/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao criar série');
    return res.json();
  },

  async updateSeries(id: string, data: Partial<Series>): Promise<Series> {
    const res = await fetch(`/api/series/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao atualizar série');
    return res.json();
  },

  async deleteSeries(id: string): Promise<void> {
    const res = await fetch(`/api/series/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir série');
  },

  async addEpisode(seriesId: string, data: Partial<Episode>): Promise<Episode> {
    const res = await fetch(`/api/series/${seriesId}/episodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao adicionar episódio');
    return res.json();
  },

  async updateEpisode(seriesId: string, episodeId: string, data: Partial<Episode>): Promise<Episode> {
    const res = await fetch(`/api/series/${seriesId}/episodes/${episodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao atualizar episódio');
    return res.json();
  },

  async deleteEpisode(seriesId: string, episodeId: string): Promise<void> {
    const res = await fetch(`/api/series/${seriesId}/episodes/${episodeId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Falha ao excluir episódio');
  },

  // --- UPLOAD DE ARQUIVO ---
  async uploadVideo(file: File, onProgress?: (percent: number) => void): Promise<{
    fileUrl: string;
    originalName: string;
    sizeBytes: number;
    sizeFormatted: string;
  }> {
    return new Promise((resolve, reject) => {
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
            reject(new Error('Resposta inválida do servidor.'));
          }
        } else {
          reject(new Error(`Falha no upload: status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Erro de conexão durante o upload.'));
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  },

  // --- MODO ADMINISTRADOR ---
  async loginAdmin(password: string): Promise<boolean> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      localStorage.setItem(ADMIN_TOKEN_KEY, 'true');
      return true;
    }
    const err = await res.json();
    throw new Error(err.message || 'Senha incorreta');
  },

  logoutAdmin(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  isAdminAuthenticated(): boolean {
    return localStorage.getItem(ADMIN_TOKEN_KEY) === 'true';
  },

  async resetData(): Promise<void> {
    const res = await fetch('/api/reset-data', { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao resetar dados');
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
