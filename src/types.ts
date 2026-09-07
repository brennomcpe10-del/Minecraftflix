export type VideoSourceType = 'google_drive' | 'direct_upload' | 'web_url';

export type SeriesStatus = 'Em Lançamento' | 'Completo' | 'Em Pausa';

export interface Episode {
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description: string;
  sourceType: VideoSourceType;
  videoUrl: string; // Google Drive link, uploaded file url, or direct web url
  googleDriveId?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  durationMinutes: number;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  resolution?: string; // e.g., '1080p HD', '4K Ultra HD', '720p'
  createdAt: string;
}

export interface Series {
  id: string;
  title: string;
  originalTitle?: string;
  synopsis: string;
  posterUrl: string;
  bannerUrl: string;
  releaseYear: number;
  genres: string[];
  status: SeriesStatus;
  totalSeasons: number;
  ageRating: string; // 'Livre', '12+', '14+', '16+', '18+'
  featured?: boolean;
  episodes: Episode[];
  createdAt: string;
}

export interface WatchProgress {
  episodeId: string;
  seriesId: string;
  watched: boolean;
  currentTimeSeconds: number;
  durationSeconds: number;
  lastWatchedAt: string;
}

export interface UserStats {
  totalEpisodesWatched: number;
  totalTimeMinutes: number;
}
