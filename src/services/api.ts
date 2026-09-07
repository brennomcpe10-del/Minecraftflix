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
const PROGRESS_STORAGE_KEY = 'portal_watch_progress_v1';
const ADMIN_TOKEN_KEY = 'portal_admin_authenticated';
const ADMIN_PASSWORD_DEFAULT = 'admin123';

/**
 * Utilitários de Persistência Local (Offline-First e Caching)
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
 * Sincroniza séries criadas no notebook antes da ativação do Firestore
 */
async function syncLocalCustomSeriesToCloud(firestoreList: Series[]): Promise<Series[]> {
  const localList = getLocalSeries();
  const firestoreIds = new Set(firestoreList.map((s) => s.id));
  const missingInCloud = localList.filter((s) => !firestoreIds.has(s.id));

  if (missingInCloud.length > 0) {
    console.info(`Sincronizando ${missingInCloud.length} séries locais do notebook para o Firebase Firestore...`);
    for (const item of missingInCloud) {
      try {
        await setDoc(doc(db, 'series', item.id), item);
        firestoreList.unshift(item);
      } catch (err) {
        console.warn('Erro ao subir série local para a nuvem:', err);
      }
    }
    saveLocalSeries(firestoreList);
  }

  return firestoreList;
}

/**
 * Popula o Firestore com o catálogo padrão se a base estiver vazia
 */
async function seedInitialSeriesToCloud(): Promise<Series[]> {
  const localList = getLocalSeries();
  const listToSeed = localList.length > 0 ? localList : INITIAL_SERIES;

  for (const s of listToSeed) {
    try {
      await setDoc(doc(db, 'series', s.id), s);
    } catch (e) {
      console.warn('Erro ao semear série no Firestore:', e);
    }
  }
  return listToSeed;
}

export const api = {
  // --- SINCRONIZAÇÃO EM TEMPO REAL FIRESTORE ---

  /**
   * Assina atualizações em tempo real do Firestore para que mudanças feitas no notebook
   * apareçam instantaneamente no celular sem precisar recarregar.
   */
  subscribeSeries(callback: (series: Series[]) => void): () => void {
    try {
      const colRef = collection(db, 'series');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Series[] = [];
            snapshot.forEach((d) => {
              list.push(d.data() as Series);
            });
            saveLocalSeries(list);
            callback(list);
          }
        },
        (error) => {
          console.warn('Aviso no listener do Firestore (modo offline/espera):', error);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Não foi possível iniciar o listener Firestore:', err);
      return () => {};
    }
  },

  // --- SÉRIES & EPISÓDIOS (NUVEM FIRESTORE + LOCAL CACHE) ---

  async getSeries(): Promise<Series[]> {
    try {
      // 1. Tentar buscar direto do banco de dados na nuvem (Firestore)
      const colRef = collection(db, 'series');
      const snapshot = await getDocs(colRef);

      if (!snapshot.empty) {
        let list: Series[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Series);
        });

        // Sincronizar séries que estavam salvas apenas no notebook
        list = await syncLocalCustomSeriesToCloud(list);

        saveLocalSeries(list);
        return list;
      } else {
        // Banco novo/vazio: faz o seed inicial com as séries locais/padrão
        const seeded = await seedInitialSeriesToCloud();
        saveLocalSeries(seeded);
        return seeded;
      }
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
        return snapshot.data() as Series;
      }
    } catch (err) {
      console.warn('Erro ao buscar série no Firestore:', err);
    }

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

    // 1. Salvar no Firestore (Nuvem compartilhada entre todos os aparelhos)
    try {
      await setDoc(doc(db, 'series', newSeries.id), newSeries);
    } catch (cloudErr) {
      console.warn('Aviso: Falha ao salvar no Firestore, mantendo local:', cloudErr);
    }

    // 2. Salvar localmente
    localList.unshift(newSeries);
    saveLocalSeries(localList);

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

    // 1. Atualizar no Firestore
    try {
      await setDoc(doc(db, 'series', id), updated, { merge: true });
    } catch (cloudErr) {
      console.warn('Aviso: Falha ao atualizar no Firestore:', cloudErr);
    }

    // 2. Salvar localmente
    localList[index] = updated;
    saveLocalSeries(localList);

    return updated;
  },

  async deleteSeries(id: string): Promise<void> {
    // 1. Excluir do Firestore
    try {
      await deleteDoc(doc(db, 'series', id));
    } catch (cloudErr) {
      console.warn('Aviso: Falha ao excluir do Firestore:', cloudErr);
    }

    // 2. Atualizar localmente
    const localList = getLocalSeries();
    const filtered = localList.filter((s) => s.id !== id);
    saveLocalSeries(filtered);
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

    // 1. Atualizar a série com o novo episódio no Firestore
    try {
      await setDoc(doc(db, 'series', seriesId), series, { merge: true });
    } catch (cloudErr) {
      console.warn('Aviso: Falha ao adicionar episódio no Firestore:', cloudErr);
    }

    // 2. Salvar localmente
    saveLocalSeries(localList);

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

    // 1. Atualizar no Firestore
    try {
      await setDoc(doc(db, 'series', seriesId), series, { merge: true });
    } catch (cloudErr) {
      console.warn('Aviso: Falha ao atualizar episódio no Firestore:', cloudErr);
    }

    // 2. Salvar localmente
    saveLocalSeries(localList);

    return updated;
  },

  async deleteEpisode(seriesId: string, episodeId: string): Promise<void> {
    const localList = getLocalSeries();
    const series = localList.find((s) => s.id === seriesId);
    if (!series) throw new Error('Série não encontrada');

    series.episodes = series.episodes.filter((e) => e.id !== episodeId);

    // 1. Atualizar no Firestore
    try {
      await setDoc(doc(db, 'series', seriesId), series, { merge: true });
    } catch (cloudErr) {
      console.warn('Aviso: Falha ao deletar episódio no Firestore:', cloudErr);
    }

    // 2. Salvar localmente
    saveLocalSeries(localList);
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
    saveLocalSeries(INITIAL_SERIES);
    for (const s of INITIAL_SERIES) {
      try {
        await setDoc(doc(db, 'series', s.id), s);
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
