import React from 'react';
import { Play, Download, Check, Clock, HardDrive, Globe, UploadCloud, Edit, Trash2 } from 'lucide-react';
import { Episode, Series } from '../types';
import { formatEpisodeCode, getGoogleDriveDownloadUrl } from '../utils/drive';

interface EpisodeCardProps {
  episode: Episode;
  series: Series;
  isWatched: boolean;
  onToggleWatched: (episodeId: string) => void;
  onPlay: (series: Series, episode: Episode) => void;
  isAdmin?: boolean;
  onEditEpisode?: (episode: Episode) => void;
  onDeleteEpisode?: (episodeId: string) => void;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  series,
  isWatched,
  onToggleWatched,
  onPlay,
  isAdmin,
  onEditEpisode,
  onDeleteEpisode,
}) => {
  const code = formatEpisodeCode(episode.seasonNumber, episode.episodeNumber);

  // Determinar link de download
  const getDownloadHref = () => {
    if (episode.sourceType === 'google_drive' && episode.googleDriveId) {
      return getGoogleDriveDownloadUrl(episode.googleDriveId);
    }
    return episode.downloadUrl || episode.videoUrl;
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getDownloadHref();
    if (!url) return;
    // Abrir download
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = `${series.title}-${code}-${episode.title}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`group relative rounded-xl bg-[#171719] border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
        isWatched
          ? 'border-emerald-500/30 shadow-sm shadow-emerald-500/5'
          : 'border-white/5 hover:border-white/20 hover:shadow-xl hover:shadow-black/40'
      }`}
      id={`episode-card-${episode.id}`}
    >
      {/* Thumbnail Area */}
      <div
        onClick={() => onPlay(series, episode)}
        className="relative aspect-video w-full overflow-hidden bg-[#121214] cursor-pointer"
      >
        <img
          src={episode.thumbnailUrl || series.posterUrl}
          alt={episode.title}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Play Icon Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-blue-600 transition-all">
            <Play className="w-4 h-4 fill-current translate-x-0.5" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1 border border-white/10">
          <Clock className="w-3 h-3 text-white/60" />
          <span>{episode.durationMinutes}m</span>
        </div>

        {/* Source Badge */}
        <div className="absolute top-2 left-2">
          {episode.sourceType === 'google_drive' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider shadow-sm">
              <HardDrive className="w-3 h-3" />
              Drive HD
            </span>
          ) : episode.sourceType === 'direct_upload' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500 text-black text-[9px] font-black uppercase tracking-wider shadow-sm">
              <UploadCloud className="w-3 h-3" />
              Upload
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
              <Globe className="w-3 h-3" />
              Link Web
            </span>
          )}
        </div>

        {/* Watched Badge */}
        {isWatched && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-emerald-400 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-500/30 shadow-sm">
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Assistido</span>
          </div>
        )}
      </div>

      {/* Details Area */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Episode Number and Resolution */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold text-blue-400 tracking-wider">
              {code}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/5 text-white/70 border border-white/10">
                {episode.resolution || '1080p HD'}
              </span>
              {episode.fileSizeFormatted && (
                <span className="text-[10px] font-medium text-white/40">
                  {episode.fileSizeFormatted}
                </span>
              )}
            </div>
          </div>

          {/* Episode Title */}
          <h3
            onClick={() => onPlay(series, episode)}
            className="text-sm sm:text-base font-bold text-white/90 group-hover:text-blue-400 transition-colors cursor-pointer line-clamp-1 mb-1.5"
            title={episode.title}
          >
            {episode.title}
          </h3>

          {/* Episode Synopsis */}
          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed mb-3 sm:mb-4">
            {episode.description || 'Nenhuma descrição fornecida para este episódio.'}
          </p>
        </div>

        {/* Action Controls Footer */}
        <div className="pt-2.5 sm:pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
          {/* Watched toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatched(episode.id);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-medium transition-all active:scale-95 min-h-[36px] ${
              isWatched
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-white/5 text-white/60 border border-white/5 hover:text-white hover:bg-white/10'
            }`}
            title={isWatched ? 'Marcar como não assistido' : 'Marcar como assistido'}
            id={`toggle-watched-${episode.id}`}
          >
            <Check className={`w-3.5 h-3.5 ${isWatched ? 'text-emerald-400 stroke-[2.5]' : 'text-white/40'}`} />
            <span>{isWatched ? 'Assistido' : 'Marcar'}</span>
          </button>

          {/* Play & Download Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleDownloadClick}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-blue-400 border border-white/5 transition-all active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Baixar arquivo de vídeo original"
              id={`download-ep-${episode.id}`}
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => onPlay(series, episode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95 min-h-[36px]"
              id={`play-ep-${episode.id}`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Assistir</span>
            </button>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="flex items-center gap-1 border-l border-white/10 pl-1.5 ml-0.5">
                {onEditEpisode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditEpisode(episode);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-amber-400 border border-white/5 transition-all active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Editar Episódio"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDeleteEpisode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Tem certeza que deseja excluir o episódio "${episode.title}"?`)) {
                        onDeleteEpisode(episode.id);
                      }
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-rose-400 border border-white/5 transition-all active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Excluir Episódio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
