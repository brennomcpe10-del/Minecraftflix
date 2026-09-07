import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Series, Episode, WatchProgress } from '../types';
import { INITIAL_SERIES } from '../data/defaultData';

const SERIES_STORAGE_KEY = 'portal_series_data_v2';
const DELETED_SERIES_STORAGE_KEY = 'portal_deleted_series_ids_v1';
const PROGRESS_STORAGE_KEY = 'portal_watch_progress_v1';
const ADMIN_TOKEN_KEY = 'portal_admin_authenticated';
const ADMIN_PASSWORD_DEFAULT = 'admin123';

/**
 * Remove com precisão valores 'undefined' antes de enviar ao Firestore.
 * O Firestore rejeita objetos contendo campos com valor 'undefined'.
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (value === undefined) return null;
      return value;
    })
  );
}

/**
 * Conjunto de IDs de séries excluídas pelo usuário para impedir qualquer ressuscitação indesejada
 */
function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_SERIES_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch (err) {
    console.warn('Erro ao ler séries excluídas do localStorage:', err);
  }
  return new Set();
}

function markAsDeletedLocally(id: string): void {
  try {
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(DELETED_SERIES_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Erro ao salvar ID deletado:', err);
  }
}

/**
 * Garante que todo objeto Series retornado ou processado seja válido e possua arrays definidos
 */
export function normalizeSeries(item: any): Series {
  if (!item || typeof item !== 'object') {
    return {
      id: `series-${Date.now()}`,
      title: 'Sem Título',
      originalTitle: '',
      synopsis: '',
      posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
      releaseYear: new Date().getFullYear(),
      genres: ['Série'],
      status: 'Em Lançamento',
      totalSeasons: 1,
      ageRating: '14+',
      featured: false,
      createdAt: new Date().toISOString(),
      episodes: [],
    };
  }

  return {
    id: item.id || `series-${Date.now()}`,
    title: item.title || 'Sem Título',
    originalTitle: item.originalTitle || '',
    synopsis: item.synopsis || '',
    posterUrl: item.posterUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    bannerUrl: item.bannerUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
    releaseYear: Number(item.releaseYear) || new Date().getFullYear(),
    genres: Array.isArray(item.genres) && item.genres.length > 0 ? item.genres : ['Série'],
    status: item.status || 'Em Lançamento',
    totalSeasons: Number(item.totalSeasons) || 1,
    ageRating: item.ageRating || '14+',
    featured: Boolean(item.featured),
    createdAt: item.createdAt || new Date().toISOString(),
    episodes: Array.isArray(item.episodes)
      ? item.episodes.map((ep: any) => ({
          ...ep,
          seasonNumber: Number(ep.seasonNumber) || 1,
          episodeNumber: Number(ep.episodeNumber) || 1,
          title: ep.title || `Episódio ${ep.episodeNumber || 1}`,
          description: ep.description || '',
          sourceType: ep.sourceType || 'web_url',
          videoUrl: ep.videoUrl || '',
          resolution: ep.resolution || '1080p HD',
          durationMinutes: Number(ep.durationMinutes) || 24,
        }))
      : [],
  };
}

/**
 * Utilitários de Persistência Local (Offline-First e Caching)
 */
function getLocalSeries(): Series[] {
  try {
    const raw = localStorage.getItem(SERIES_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const deleted = getDeletedIds();
        return parsed.filter((s) => s && !deleted.has(s.id)).map(normalizeSeries);
      }
    }
  } catch (err) {
    console.warn('Erro ao ler séries do localStorage:', err);
  }
  return [];
}

function saveLocalSeries(series: Series[]): void {
  try {
    const deleted = getDeletedIds();
    const filtered = series.filter((s) => s && !deleted.has(s.id)).map(normalizeSeries);
    localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Erro ao salvar séries no localStorage:', err);
  }
}

export const api = {
  // --- SINCRONIZAÇÃO EM TEMPO REAL FIRESTORE ---

  /**
   * Assina atualizações em tempo real do Firestore para que qualquer mudança feita
   * no notebook apareça instantaneamente no celular (e vice-versa) sem precisar recarregar a página.
   */
  subscribeSeries(callback: (series: Series[]) => void): () => void {
    try {
      const colRef = collection(db, 'series');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const deleted = getDeletedIds();
          const list: Series[] = [];
          snapshot.forEach((d) => {
            const rawItem = d.data();
            if (rawItem && !deleted.has(rawItem.id || d.id)) {
              list.push(normalizeSeries({ ...rawItem, id: rawItem.id || d.id }));
            }
          });
          saveLocalSeries(list);
          callback(list);
        },
        (error) => {
          console.warn('Aviso no listener do Firestore:', error);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Não foi possível iniciar o listener Firestore:', err);
      return () => {};
    }
  },

  // --- SÉRIES & EPISÓDIOS (NUVEM FIRESTORE COMO FONTE DE VERDADE) ---

  async getSeries(): Promise<Series[]> {
    try {
      const colRef = collection(db, 'series');
      const snapshot = await getDocs(colRef);
      const deleted = getDeletedIds();

      const list: Series[] = [];
      snapshot.forEach((d) => {
        const rawItem = d.data();
        if (rawItem && !deleted.has(rawItem.id || d.id)) {
          list.push(normalizeSeries({ ...rawItem, id: rawItem.id || d.id }));
        }
      });

      saveLocalSeries(list);
      return list;
    } catch (firestoreError) {
      console.warn('Firestore indisponível temporariamente, carregando dados locais:', firestoreError);
      return getLocalSeries();
    }
  },

  async getSeriesById(id: string): Promise<Series> {
    try {
      const docRef = doc(db, 'series', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return normalizeSeries({ ...snapshot.data(), id: snapshot.id });
      }
    } catch (err) {
      console.warn('Erro ao buscar série no Firestore:', err);
    }

    const localList = getLocalSeries();
    const found = localList.find((s) => s.id === id);
    if (found) return normalizeSeries(found);

    throw new Error('Série não encontrada');
  },

  async createSeries(data: Partial<Series>): Promise<Series> {
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
      episodes: Array.isArray(data.episodes) ? data.episodes : [],
    };

    const clean = sanitizeForFirestore(normalizeSeries(newSeries));

    // 1. Salvar no Firestore (Nuvem compartilhada entre todos os aparelhos)
    try {
      await setDoc(doc(db, 'series', newSeries.id), clean);
    } catch (cloudErr) {
      console.error('Erro ao salvar série no Firestore:', cloudErr);
    }

    // 2. Salvar localmente
    const localList = getLocalSeries();
    localList.unshift(clean);
    saveLocalSeries(localList);

    return clean;
  },

  async updateSeries(id: string, data: Partial<Series>): Promise<Series> {
    const localList = getLocalSeries();
    const index = localList.findIndex((s) => s.id === id);
    const existing = index !== -1 ? localList[index] : (await this.getSeriesById(id));

    const updated: Series = {
      ...existing,
      ...data,
    };

    const clean = sanitizeForFirestore(normalizeSeries(updated));

    // 1. Atualizar no Firestore
    try {
      await setDoc(doc(db, 'series', id), clean);
    } catch (cloudErr) {
      console.error('Erro ao atualizar no Firestore:', cloudErr);
    }

    // 2. Salvar localmente
    if (index !== -1) {
      localList[index] = clean;
    } else {
      localList.push(clean);
    }
    saveLocalSeries(localList);

    return clean;
  },

  async deleteSeries(id: string): Promise<void> {
    // 1. Registrar imediatamente como deletada para impedir retorno da série
    markAsDeletedLocally(id);

    // 2. Excluir permanentemente do Firestore
    try {
      await deleteDoc(doc(db, 'series', id));
    } catch (cloudErr) {
      console.warn('Aviso: Falha ao excluir do Firestore:', cloudErr);
    }

    // 3. Atualizar localmente
    const localList = getLocalSeries();
    const filtered = localList.filter((s) => s.id !== id);
    saveLocalSeries(filtered);
  },

  async addEpisode(seriesId: string, data: Partial<Episode>): Promise<Episode> {
    // 1. Buscar a série mais recente do Firestore para evitar conflito de estado
    let series: Series | null = null;
    try {
      const docRef = doc(db, 'series', seriesId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        series = snap.data() as Series;
      }
    } catch (e) {
      console.warn('Aviso ao consultar série no Firestore:', e);
    }

    if (!series) {
      const localList = getLocalSeries();
      series = localList.find((s) => s.id === seriesId) || null;
    }

    if (!series) throw new Error('Série não encontrada');

    if (!Array.isArray(series.episodes)) {
      series.episodes = [];
    }

    const newEpisode: Episode = {
      id: data.id || `ep-${Date.now()}`,
      seriesId: series.id,
      seasonNumber: Number(data.seasonNumber) || 1,
      episodeNumber: Number(data.episodeNumber) || (series.episodes.length + 1),
      title: data.title || `Episódio ${data.episodeNumber || series.episodes.length + 1}`,
      description: data.description || '',
      sourceType: data.sourceType || 'web_url',
      videoUrl: data.videoUrl || '',
      googleDriveId: data.googleDriveId || undefined,
      downloadUrl: data.downloadUrl || data.videoUrl || undefined,
      thumbnailUrl: data.thumbnailUrl || series.posterUrl || undefined,
      durationMinutes: Number(data.durationMinutes) || 24,
      fileSizeBytes: data.fileSizeBytes ? Number(data.fileSizeBytes) : undefined,
      fileSizeFormatted: data.fileSizeFormatted || undefined,
      resolution: data.resolution || '1080p HD',
      createdAt: new Date().toISOString(),
    };

    series.episodes.push(newEpisode);
    if (newEpisode.seasonNumber > (series.totalSeasons || 1)) {
      series.totalSeasons = newEpisode.seasonNumber;
    }

    // Sanitizar todo o objeto da série removendo undefined antes de salvar no Firestore
    const cleanSeries = sanitizeForFirestore(series);

    // 1. Salvar no Firestore e aguardar confirmação
    try {
      await setDoc(doc(db, 'series', seriesId), cleanSeries);
    } catch (cloudErr: any) {
      console.error('Erro crítico ao salvar episódio no Firestore:', cloudErr);
      throw new Error('Falha ao salvar episódio na nuvem: ' + (cloudErr?.message || 'Erro desconhecido'));
    }

    // 2. Salvar no cache local
    const localList = getLocalSeries();
    const seriesIndex = localList.findIndex((s) => s.id === seriesId);
    if (seriesIndex !== -1) {
      localList[seriesIndex] = cleanSeries;
    } else {
      localList.push(cleanSeries);
    }
    saveLocalSeries(localList);

    return newEpisode;
  },

  async updateEpisode(seriesId: string, episodeId: string, data: Partial<Episode>): Promise<Episode> {
    let series: Series | null = null;
    try {
      const docRef = doc(db, 'series', seriesId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        series = snap.data() as Series;
      }
    } catch (e) {
      console.warn('Aviso ao consultar série para atualização:', e);
    }

    if (!series) {
      const localList = getLocalSeries();
      series = localList.find((s) => s.id === seriesId) || null;
    }

    if (!series) throw new Error('Série não encontrada');

    if (!Array.isArray(series.episodes)) {
      series.episodes = [];
    }

    const epIndex = series.episodes.findIndex((e) => e.id === episodeId);
    if (epIndex === -1) throw new Error('Episódio não encontrado');

    const updated: Episode = {
      ...series.episodes[epIndex],
      ...data,
    };
    series.episodes[epIndex] = updated;

    const cleanSeries = sanitizeForFirestore(series);

    // 1. Atualizar no Firestore
    try {
      await setDoc(doc(db, 'series', seriesId), cleanSeries);
    } catch (cloudErr: any) {
      console.error('Erro ao atualizar episódio no Firestore:', cloudErr);
      throw new Error('Falha ao atualizar episódio na nuvem: ' + (cloudErr?.message || ''));
    }

    // 2. Salvar localmente
    const localList = getLocalSeries();
    const sIndex = localList.findIndex((s) => s.id === seriesId);
    if (sIndex !== -1) {
      localList[sIndex] = cleanSeries;
      saveLocalSeries(localList);
    }

    return updated;
  },

  async deleteEpisode(seriesId: string, episodeId: string): Promise<void> {
    let series: Series | null = null;
    try {
      const docRef = doc(db, 'series', seriesId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        series = snap.data() as Series;
      }
    } catch (e) {
      console.warn('Aviso ao consultar série para exclusão de ep:', e);
    }

    if (!series) {
      const localList = getLocalSeries();
      series = localList.find((s) => s.id === seriesId) || null;
    }

    if (!series) throw new Error('Série não encontrada');

    series.episodes = (series.episodes || []).filter((e) => e.id !== episodeId);
    const cleanSeries = sanitizeForFirestore(series);

    // 1. Atualizar no Firestore
    try {
      await setDoc(doc(db, 'series', seriesId), cleanSeries);
    } catch (cloudErr) {
      console.warn('Aviso: Falha ao deletar episódio no Firestore:', cloudErr);
    }

    // 2. Salvar localmente
    const localList = getLocalSeries();
    const sIndex = localList.findIndex((s) => s.id === seriesId);
    if (sIndex !== -1) {
      localList[sIndex] = cleanSeries;
      saveLocalSeries(localList);
    }
  },

  // --- UPLOAD DE ARQUIVO ---
  async uploadVideo(file: File, onProgress?: (percent: number) => void): Promise<{
    fileUrl: string;
    originalName: string;
    sizeBytes: number;
    sizeFormatted: string;
  }> {
    // Tenta upload via backend Express se disponível
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
      // Fallback para arquivo local via object URL
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

    // 1. Tenta validar no endpoint se disponível
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
    }

    // 2. Validação local garantida em qualquer dispositivo (celular ou notebook)
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
    // Limpar IDs marcados como deletados
    localStorage.removeItem(DELETED_SERIES_STORAGE_KEY);
    saveLocalSeries(INITIAL_SERIES);

    for (const s of INITIAL_SERIES) {
      try {
        await setDoc(doc(db, 'series', s.id), sanitizeForFirestore(s));
      } catch (e) {
        console.warn('Erro ao resetar no Firestore:', e);
      }
    }
  },

  // --- PROGRESSO DE VISUALIZAÇÃO ---
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
      console.warn('Erro ao salvar progresso:', e);
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
