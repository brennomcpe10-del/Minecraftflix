import React, { useState, useMemo } from 'react';
import {
  X,
  Play,
  Plus,
  Search,
  CheckCircle2,
  Layers,
  Edit,
  Trash2,
  Filter,
} from 'lucide-react';
import { Series, Episode } from '../types';
import { EpisodeCard } from './EpisodeCard';

interface SeriesDetailModalProps {
  series: Series;
  onClose: () => void;
  onPlayEpisode: (series: Series, episode: Episode) => void;
  isEpisodeWatched: (episodeId: string) => boolean;
  onToggleWatched: (episodeId: string) => void;
  isAdmin: boolean;
  onOpenAddEpisodeModal: (series: Series, defaultSeason?: number) => void;
  onEditSeries?: (series: Series) => void;
  onDeleteSeries?: (seriesId: string) => void;
  onEditEpisode?: (episode: Episode) => void;
  onDeleteEpisode?: (episodeId: string) => void;
}

export const SeriesDetailModal: React.FC<SeriesDetailModalProps> = ({
  series,
  onClose,
  onPlayEpisode,
  isEpisodeWatched,
  onToggleWatched,
  isAdmin,
  onOpenAddEpisodeModal,
  onEditSeries,
  onDeleteSeries,
  onEditEpisode,
  onDeleteEpisode,
}) => {
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [watchedFilter, setWatchedFilter] = useState<'all' | 'unwatched' | 'watched'>('all');

  // Calcular temporadas existentes
  const seasonsList = useMemo(() => {
    const seasons = new Set<number>();
    const eps = series.episodes || [];
    eps.forEach((ep) => seasons.add(ep.seasonNumber));
    if (seasons.size === 0) {
      seasons.add(1);
    }
    return Array.from(seasons).sort((a, b) => a - b);
  }, [series.episodes]);

  // Contagem de assistidos
  const totalEpisodes = (series.episodes || []).length;
  const watchedCount = (series.episodes || []).filter((e) => isEpisodeWatched(e.id)).length;
  const progressPercent = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

  // Filtragem de episódios
  const filteredEpisodes = useMemo(() => {
    return (series.episodes || []).filter((ep) => {
      // Filtro de temporada
      if (selectedSeason !== 'all' && ep.seasonNumber !== selectedSeason) {
        return false;
      }
      // Filtro de assistido
      const watched = isEpisodeWatched(ep.id);
      if (watchedFilter === 'unwatched' && watched) return false;
      if (watchedFilter === 'watched' && !watched) return false;

      // Busca em tempo real
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = `t${String(ep.seasonNumber).padStart(2, '0')} e${String(ep.episodeNumber).padStart(2, '0')}`;
        const codeFull = `t${ep.seasonNumber} e${ep.episodeNumber}`;
        const matchTitle = ep.title.toLowerCase().includes(q);
        const matchDesc = ep.description.toLowerCase().includes(q);
        const matchCode = code.includes(q) || codeFull.includes(q);
        const matchNum = `episódio ${ep.episodeNumber}`.includes(q) || `ep ${ep.episodeNumber}`.includes(q);
        return matchTitle || matchDesc || matchCode || matchNum;
      }
      return true;
    }).sort((a, b) => {
      if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
      return a.episodeNumber - b.episodeNumber;
    });
  }, [series.episodes, selectedSeason, watchedFilter, searchQuery, isEpisodeWatched]);

  const handlePlayFirstUnwatched = () => {
    const eps = series.episodes || [];
    const unwatched = eps.find((e) => !isEpisodeWatched(e.id));
    if (unwatched) {
      onPlayEpisode(series, unwatched);
    } else if (eps.length > 0) {
      onPlayEpisode(series, eps[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 md:p-6 animate-fadeIn">
      <div className="relative w-full max-w-5xl rounded-3xl bg-[#0F0F11] border border-white/10 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header with Backdrop Banner */}
        <div className="relative w-full aspect-[21/9] sm:aspect-[24/8] min-h-[220px] max-h-[300px] overflow-hidden flex-shrink-0">
          <img
            src={series.bannerUrl || series.posterUrl}
            alt={series.title}
            className="w-full h-full object-cover object-center filter brightness-70"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F11] via-[#0F0F11]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F11] via-[#0F0F11]/70 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
            id="series-modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Content */}
          <div className="absolute bottom-4 left-4 right-4 sm:left-8 sm:right-8 z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-black shadow-sm uppercase tracking-wider">
                  {series.ageRating}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/90 border border-white/10 backdrop-blur-sm">
                  {series.releaseYear}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  series.status === 'Em Lançamento'
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  {series.status}
                </span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                {series.title}
              </h2>
              {series.originalTitle && (
                <p className="text-xs sm:text-sm text-white/50 italic">
                  {series.originalTitle}
                </p>
              )}
            </div>

            {/* Quick Play CTA */}
            <div className="flex items-center gap-2">
              {(series.episodes || []).length > 0 && (
                <button
                  onClick={handlePlayFirstUnwatched}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black hover:bg-blue-400 font-bold text-sm shadow-lg transition-colors hover:scale-105"
                  id="series-play-unwatched-btn"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{watchedCount > 0 ? 'Continuar Assistindo' : 'Começar a Assistir'}</span>
                </button>
              )}

              {isAdmin && (
                <>
                  {onEditSeries && (
                    <button
                      onClick={() => onEditSeries(series)}
                      className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-amber-400 border border-white/10 transition-colors"
                      title="Editar Série"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {onDeleteSeries && (
                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja excluir toda a série "${series.title}"?`)) {
                          onDeleteSeries(series.id);
                          onClose();
                        }
                      }}
                      className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-rose-400 border border-white/10 transition-colors"
                      title="Excluir Série"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Series Metadata & Synopsis Body */}
        <div className="px-4 sm:px-8 py-4 border-b border-white/5 bg-[#171719]/40">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <p className="text-sm text-white/60 max-w-3xl leading-relaxed">
              {series.synopsis}
            </p>

            {/* Progress pill */}
            <div className="w-full md:w-64 bg-[#121214] p-3 rounded-xl border border-white/5 flex-shrink-0">
              <div className="flex items-center justify-between text-xs text-white/60 mb-1.5 font-medium">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Progresso
                </span>
                <span className="text-white/80">{watchedCount}/{totalEpisodes} ({progressPercent}%)</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {(series.genres || []).map((g) => (
              <span
                key={g}
                className="text-[11px] text-white/60 bg-white/5 px-2.5 py-0.5 rounded-md border border-white/5"
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Season Tabs & Filter Bar */}
        <div className="px-4 sm:px-8 py-3 bg-[#0F0F11] border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-10">
          {/* Season Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedSeason('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedSeason === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
              }`}
              id="season-tab-all"
            >
              Todas as Temporadas ({totalEpisodes})
            </button>

            {seasonsList.map((seasonNum) => {
              const count = (series.episodes || []).filter((e) => e.seasonNumber === seasonNum).length;
              return (
                <button
                  key={seasonNum}
                  onClick={() => setSelectedSeason(seasonNum)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    selectedSeason === seasonNum
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                  id={`season-tab-${seasonNum}`}
                >
                  Temporada {seasonNum} ({count})
                </button>
              );
            })}
          </div>

          {/* Episode Search & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar episódios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#171719] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Watched Filter */}
            <select
              value={watchedFilter}
              onChange={(e) => setWatchedFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-[#171719] border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos</option>
              <option value="unwatched">Não Assistidos</option>
              <option value="watched">Assistidos</option>
            </select>

            {/* Admin Add Episode Button */}
            {isAdmin && (
              <button
                onClick={() =>
                  onOpenAddEpisodeModal(
                    series,
                    typeof selectedSeason === 'number' ? selectedSeason : 1
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all whitespace-nowrap"
                id="series-add-episode-btn"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Episódio</span>
              </button>
            )}
          </div>
        </div>

        {/* Episodes Grid List */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1">
          {filteredEpisodes.length === 0 ? (
            <div className="py-12 text-center text-white/40">
              <p className="text-base font-semibold mb-1 text-white/70">Nenhum episódio encontrado.</p>
              <p className="text-xs text-white/40">
                {isAdmin
                  ? 'Clique em "Adicionar Episódio" para publicar episódios via Google Drive ou Upload.'
                  : 'Tente ajustar sua busca ou filtro de temporada.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredEpisodes.map((ep) => (
                <EpisodeCard
                  key={ep.id}
                  episode={ep}
                  series={series}
                  isWatched={isEpisodeWatched(ep.id)}
                  onToggleWatched={onToggleWatched}
                  onPlay={onPlayEpisode}
                  isAdmin={isAdmin}
                  onEditEpisode={onEditEpisode}
                  onDeleteEpisode={onDeleteEpisode}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
