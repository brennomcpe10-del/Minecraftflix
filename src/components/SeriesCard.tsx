import React from 'react';
import { Play, ListVideo, Layers, Edit, Trash2 } from 'lucide-react';
import { Series, Episode } from '../types';
import { getEpisodeSourceUrl } from '../utils/drive';

interface SeriesCardProps {
  series: Series;
  watchedCount: number;
  onOpenDetails: (series: Series) => void;
  onPlayEpisode: (series: Series, episode: Episode) => void;
  isAdmin?: boolean;
  onEditSeries?: (series: Series) => void;
  onDeleteSeries?: (seriesId: string) => void;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({
  series,
  watchedCount,
  onOpenDetails,
  onPlayEpisode,
  isAdmin,
  onEditSeries,
  onDeleteSeries,
}) => {
  const episodes = series.episodes || [];
  const genres = series.genres || [];
  const totalEpisodes = episodes.length;
  const progressPercent = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

  // Encontrar o primeiro episódio não assistido ou o primeiro episódio
  const handleQuickPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalEpisodes === 0) {
      onOpenDetails(series);
      return;
    }
    try {
      const docEl = document.documentElement as any;
      if (!document.fullscreenElement && !docEl.webkitFullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen();
        }
      }
    } catch (err) {
      console.warn('Tentativa de fullscreen no clique series card:', err);
    }
    const epToPlay = episodes[0];
    const mediaUrl = getEpisodeSourceUrl(epToPlay);
    onPlayEpisode(series, {
      ...epToPlay,
      videoUrl: mediaUrl || epToPlay.videoUrl,
    });
  };

  return (
    <div
      onClick={() => onOpenDetails(series)}
      className="group relative rounded-2xl bg-[#171719] border border-white/5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between"
      id={`series-card-${series.id}`}
    >
      {/* Poster Image Area */}
      <div className="relative aspect-[16/10] sm:aspect-[3/4] w-full overflow-hidden bg-[#121214]">
        <img
          src={series.posterUrl}
          alt={series.title}
          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#171719] via-transparent to-transparent opacity-90 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border ${
            series.status === 'Em Lançamento'
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {series.status}
          </span>

          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-black shadow-sm uppercase tracking-wider">
            {series.ageRating}
          </span>
        </div>

        {/* Hover / Touch Quick Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <button
            onClick={handleQuickPlay}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md hover:bg-blue-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 active:scale-95 transition-all"
            title="Assistir agora"
          >
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          </button>
        </div>

        {/* Mobile Quick Play Indicator */}
        <div className="sm:hidden absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-md">
          <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
        </div>

        {/* Watch Progress Bar on image bottom */}
        {totalEpisodes > 0 && watchedCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-white/40 mb-1">
            <span>{series.releaseYear}</span>
            <div className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>{series.totalSeasons} {series.totalSeasons > 1 ? 'temporadas' : 'temporada'}</span>
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white/95 group-hover:text-blue-400 transition-colors line-clamp-1 mb-1">
            {series.title}
          </h3>

          <p className="text-xs text-white/50 line-clamp-2 leading-relaxed mb-3">
            {series.synopsis}
          </p>
        </div>

        <div>
          {/* Genre pills */}
          <div className="flex flex-wrap gap-1 mb-3">
            {genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="text-[10px] text-white/50 bg-white/5 border border-white/5 px-2 py-0.5 rounded"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Progress and Action Footer */}
          <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
            <span className="text-[11px] text-white/40 truncate">
              {watchedCount > 0
                ? `${watchedCount}/${totalEpisodes} assistidos (${progressPercent}%)`
                : `${totalEpisodes} episódios`}
            </span>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails(series);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                title="Ver Episódios"
              >
                <ListVideo className="w-4 h-4 text-blue-400" />
              </button>

              {isAdmin && (
                <>
                  {onEditSeries && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSeries(series);
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-amber-400 border border-white/5 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                      title="Editar Série"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onDeleteSeries && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Tem certeza que deseja excluir a série "${series.title}" e todos os seus episódios?`)) {
                          onDeleteSeries(series.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-rose-400 border border-white/5 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                      title="Excluir Série"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
