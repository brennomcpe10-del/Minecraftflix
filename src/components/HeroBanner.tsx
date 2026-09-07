import React from 'react';
import { Play, ListVideo, Sparkles, HardDrive, ShieldAlert } from 'lucide-react';
import { Series, Episode } from '../types';

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
  const firstEpisode = series.episodes[0];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-blue-950/40 via-[#0A0A0B] to-transparent shadow-2xl mb-10 group">
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
      <div className="relative z-10 p-6 sm:p-10 lg:p-12 max-w-3xl flex flex-col justify-end min-h-[380px] sm:min-h-[460px]">
        {/* Badges / Meta tags */}
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase shadow-sm">
            <Sparkles className="w-3 h-3" />
            DESTAQUE
          </span>

          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/90 border border-white/10 backdrop-blur-sm">
            {series.releaseYear}
          </span>

          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 backdrop-blur-sm">
            {series.ageRating}
          </span>

          <span className="text-xs font-medium text-white/60 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
            {series.totalSeasons} {series.totalSeasons > 1 ? 'Temporadas' : 'Temporada'} • {series.episodes.length} Episódios
          </span>

          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
            series.status === 'Em Lançamento'
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {series.status}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-2 leading-tight drop-shadow-md">
          {series.title}
        </h1>

        {/* Original Title if present */}
        {series.originalTitle && (
          <p className="text-xs sm:text-sm text-white/50 italic mb-3">
            {series.originalTitle}
          </p>
        )}

        {/* Genres */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {series.genres.map((g) => (
            <span
              key={g}
              className="text-[11px] text-white/70 bg-white/5 backdrop-blur-sm px-2.5 py-0.5 rounded-md border border-white/5"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Synopsis */}
        <p className="text-sm sm:text-base text-white/60 line-clamp-3 mb-6 max-w-xl leading-relaxed">
          {series.synopsis}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {firstEpisode && (
            <button
              onClick={() => onPlayEpisode(series, firstEpisode)}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black hover:bg-blue-400 font-bold text-sm sm:text-base shadow-lg transition-colors hover:scale-[1.02] active:scale-[0.98]"
              id="hero-play-first-btn"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Assistir Agora • T01 E01</span>
            </button>
          )}

          <button
            onClick={() => onOpenDetails(series)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm sm:text-base border border-white/10 backdrop-blur-md transition-colors hover:scale-[1.02] active:scale-[0.98]"
            id="hero-details-btn"
          >
            <ListVideo className="w-5 h-5 text-blue-400" />
            <span>Ver Temporadas ({series.episodes.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
