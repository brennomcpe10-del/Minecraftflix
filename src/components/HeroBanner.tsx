import React from 'react';
import { Play, ListVideo, Sparkles, HardDrive, ShieldAlert } from 'lucide-react';
import { Series, Episode } from '../types';
import { getEpisodeSourceUrl } from '../utils/drive';

interface HeroBannerProps {
  series: Series;
  onPlayEpisode: (series: Series, episode: Episode) => void;
  onOpenDetails: (series: Series) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  series,
  onPlayEpisode,
  onOpenDetails,
}) => {
  const episodes = series.episodes || [];
  const genres = series.genres || [];
  const firstEpisode = episodes[0];

  const handleHeroPlay = () => {
    if (!firstEpisode) return;
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
      console.warn('Tentativa de fullscreen no clique hero:', err);
    }
    const mediaUrl = getEpisodeSourceUrl(firstEpisode);
    onPlayEpisode(series, {
      ...firstEpisode,
      videoUrl: mediaUrl || firstEpisode.videoUrl,
    });
  };

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-blue-950/40 via-[#0A0A0B] to-transparent shadow-2xl mb-6 sm:mb-10 group">
      {/* Background Banner Image with Gradient Overlays */}
      <div className="absolute inset-0 z-0">
        <img
          src={series.bannerUrl || series.posterUrl}
          alt={series.title}
          className="w-full h-full object-cover object-center transform scale-105 filter brightness-70 group-hover:scale-100 transition-all duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B] via-[#0A0A0B]/80 to-transparent sm:max-w-2xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-8 lg:p-12 max-w-3xl flex flex-col justify-end min-h-[340px] sm:min-h-[440px]">
        {/* Badges / Meta tags */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2.5">
          <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3 h-3" />
            DESTAQUE
          </span>

          <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/90 border border-white/10 backdrop-blur-sm">
            {series.releaseYear}
          </span>

          <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 backdrop-blur-sm">
            {series.ageRating}
          </span>

          <span className="text-[11px] sm:text-xs font-medium text-white/60 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
            {series.totalSeasons || 1} {(series.totalSeasons || 1) > 1 ? 'Temporadas' : 'Temporada'} • {episodes.length} Eps
          </span>

          <span className={`text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded border ${
            series.status === 'Em Lançamento'
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {series.status}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-1.5 sm:mb-2 leading-tight drop-shadow-md line-clamp-2">
          {series.title}
        </h1>

        {/* Original Title if present */}
        {series.originalTitle && (
          <p className="text-xs sm:text-sm text-white/50 italic mb-2 sm:mb-3 truncate">
            {series.originalTitle}
          </p>
        )}

        {/* Genres */}
        <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-3 sm:mb-4">
          {genres.slice(0, 4).map((g) => (
            <span
              key={g}
              className="text-[10px] sm:text-[11px] text-white/70 bg-white/5 backdrop-blur-sm px-2 sm:px-2.5 py-0.5 rounded-md border border-white/5"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Synopsis */}
        <p className="text-xs sm:text-sm md:text-base text-white/60 line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-6 max-w-xl leading-relaxed">
          {series.synopsis}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {firstEpisode && (
            <button
              onClick={handleHeroPlay}
              className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl sm:rounded-full bg-white text-black hover:bg-blue-400 font-bold text-xs sm:text-base shadow-lg transition-all active:scale-95 min-h-[44px]"
              id="hero-play-first-btn"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>Assistir Agora • T01 E01</span>
            </button>
          )}

          <button
            onClick={() => onOpenDetails(series)}
            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl sm:rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-base border border-white/10 backdrop-blur-md transition-all active:scale-95 min-h-[44px]"
            id="hero-details-btn"
          >
            <ListVideo className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            <span>Ver Temporadas ({episodes.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
