import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Download,
  Check,
  CheckCircle2,
  HardDrive,
  Globe,
  UploadCloud,
  ArrowLeft,
  Film,
  Search,
  Plus,
  Layers,
} from 'lucide-react';
import { Episode, Series } from '../types';
import {
  formatEpisodeCode,
  getEpisodeSourceUrl,
  getEpisodeDrivePreviewUrl,
} from '../utils/drive';
import { api } from '../services/api';
import { EpisodeCard } from './EpisodeCard';

interface VideoPlayerModalProps {
  series: Series;
  episode: Episode;
  onClose: () => void;
  onSelectEpisode: (episode: Episode) => void;
  isWatched: boolean;
  onToggleWatched: (episodeId: string) => void;
  isEpisodeWatched?: (episodeId: string) => boolean;
  allSeries?: Series[];
  onSelectSeries?: (series: Series) => void;
  isAdmin?: boolean;
  onOpenAddEpisodeModal?: (series: Series, defaultSeason?: number) => void;
  onEditEpisode?: (episode: Episode) => void;
  onDeleteEpisode?: (episodeId: string) => void;
  onEditSeries?: (series: Series) => void;
  onDeleteSeries?: (seriesId: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  series,
  episode,
  onClose,
  onSelectEpisode,
  isWatched,
  onToggleWatched,
  isEpisodeWatched,
  allSeries = [],
  onSelectSeries,
  isAdmin = false,
  onOpenAddEpisodeModal,
  onEditEpisode,
  onDeleteEpisode,
  onEditSeries,
  onDeleteSeries,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      const doc = document as any;
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
        return true;
      }
    }
    return false;
  });

  // Filtros de Episódios na lista inferior
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [watchedFilter, setWatchedFilter] = useState<'all' | 'unwatched' | 'watched'>('all');

  // Ordenar todos os episódios da série por temporada e número
  const allEpisodes = [...(series.episodes || [])].sort((a, b) => {
    if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
    return a.episodeNumber - b.episodeNumber;
  });

  // Lista única de temporadas disponíveis
  const seasonsList = Array.from(new Set(allEpisodes.map((e) => e.seasonNumber))).sort((a, b) => a - b);

  // Helper para verificar status de assistido de qualquer episódio
  const checkIsWatched = (epId: string) => {
    if (isEpisodeWatched) return isEpisodeWatched(epId);
    if (epId === episode.id) return isWatched;
    const progress = api.getProgressMap();
    return !!progress[epId]?.watched;
  };

  // Filtragem de episódios da lista
  const filteredEpisodes = allEpisodes.filter((ep) => {
    if (selectedSeason !== 'all' && ep.seasonNumber !== selectedSeason) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ep.title.toLowerCase().includes(q);
      const matchDesc = (ep.description || '').toLowerCase().includes(q);
      const matchCode = `t${ep.seasonNumber}e${ep.episodeNumber}`.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCode) return false;
    }
    if (watchedFilter === 'watched' && !checkIsWatched(ep.id)) return false;
    if (watchedFilter === 'unwatched' && checkIsWatched(ep.id)) return false;
    return true;
  });

  const currentIndex = allEpisodes.findIndex((e) => e.id === episode.id);
  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  const episodeCode = formatEpisodeCode(episode.seasonNumber, episode.episodeNumber);

  // Outras séries recomendadas do catálogo (excluindo a série atual)
  const otherSeries = allSeries.filter((s) => s.id !== series.id);

  // Rolar ao topo e registrar abertura do episódio
  useEffect(() => {
    api.saveProgress(
      episode.id,
      series.id,
      isWatched,
      0,
      (episode.durationMinutes || 24) * 60
    );
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [episode.id, series.id, isWatched]);

  // Sincronizar eventos de tela cheia do navegador
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Atalhos de teclado para desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        if (isFullscreen) {
          toggleFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  // Alternar tela cheia com suporte cross-browser
  const toggleFullscreen = async () => {
    const doc = document as any;
    const playerContainer = playerContainerRef.current as any;

    const isCurrentlyFs = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      isFullscreen
    );

    if (!isCurrentlyFs) {
      if (playerContainer) {
        if (playerContainer.requestFullscreen) {
          try {
            await playerContainer.requestFullscreen();
          } catch (e) {
            console.warn('requestFullscreen error', e);
          }
        } else if (playerContainer.webkitRequestFullscreen) {
          try {
            playerContainer.webkitRequestFullscreen();
          } catch (e) {
            console.warn('webkitRequestFullscreen error', e);
          }
        }
      }
      setIsFullscreen(true);
    } else {
      try {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        }
      } catch (err) {
        console.warn('Erro ao sair de tela cheia:', err);
      }
      setIsFullscreen(false);
    }
  };

  // Fonte oficial do episódio compartilhada entre o Player e o Download
  const getDownloadUrl = () => getEpisodeSourceUrl(episode);

  const handleDownload = () => {
    const url = getDownloadUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = `${series.title}-${episodeCode}-${episode.title}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Google Drive preview URL oficial
  const driveEmbedUrl = getEpisodeDrivePreviewUrl(episode);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-[#0A0A0B] text-white flex flex-col select-none"
      id="content-viewer-page"
    >
      {/* ========================================================================= */}
      {/* 1. BARRA SUPERIOR DE NAVEGAÇÃO (Sticky no topo, com botão Voltar e Fullscreen) */}
      {/* ========================================================================= */}
      {!isFullscreen && (
        <header className="sticky top-0 z-30 bg-[#0A0A0B]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 cursor-pointer"
              title="Voltar ao catálogo"
              id="player-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-blue-400 bg-blue-600/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                  {episodeCode}
                </span>
                <span className="text-xs text-white/50 truncate max-w-[140px] sm:max-w-none">
                  {series.title}
                </span>
              </div>
              <h1 className="text-xs sm:text-base font-bold text-white truncate">
                {episode.title}
              </h1>
            </div>
          </div>

          {/* Botão de Tela Cheia Imediato no Header */}
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/30 transition-all min-h-[44px] cursor-pointer flex-shrink-0"
            title="Colocar o vídeo em Tela Cheia"
            id="header-fullscreen-btn"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden xs:inline">Tela Cheia</span>
            <span className="text-sm font-mono">⛶</span>
          </button>
        </header>
      )}

      {/* ========================================================================= */}
      {/* 2. PLAYER DE VÍDEO GOOGLE DRIVE */}
      {/* ========================================================================= */}
      <div className={`w-full bg-black ${isFullscreen ? 'fixed inset-0 z-[99999] h-screen' : 'relative'}`}>
        <div
          ref={playerContainerRef}
          className={`relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden transition-all ${
            isFullscreen
              ? 'fixed inset-0 z-[99999] w-screen h-screen max-w-none aspect-auto'
              : 'max-w-5xl mx-auto shadow-2xl'
          }`}
          id="video-player-viewport"
        >
          {/* Top Bar inside Player in Fullscreen */}
          {isFullscreen && (
            <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 via-black/60 to-transparent pt-3 pb-6 px-3 sm:px-6 flex items-center justify-between gap-2 pointer-events-auto">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-blue-400 bg-blue-600/20 px-2 py-0.5 rounded border border-blue-500/30">
                  {episodeCode}
                </span>
                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-md">
                  {series.title} • {episode.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 border border-blue-400/40 min-h-[38px] cursor-pointer"
                  title="Sair da tela cheia (F ou Esc)"
                  id="player-fullscreen-exit-btn"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden xs:inline">Sair Tela Cheia</span>
                </button>

                <button
                  onClick={() => {
                    if (isFullscreen) toggleFullscreen();
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                  title="Fechar reprodutor"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Player Oficial Google Drive */}
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
            {driveEmbedUrl ? (
              <iframe
                key={episode.id}
                src={driveEmbedUrl}
                title={`${series.title} - ${episodeCode} - ${episode.title}`}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="text-center p-8 text-white/70 flex flex-col items-center gap-3">
                <HardDrive className="w-12 h-12 text-blue-400" />
                <p className="text-sm sm:text-base font-semibold">Vídeo do Google Drive não configurado</p>
                <p className="text-xs text-white/40">Vincule um link ou ID válido do Google Drive ao episódio.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. INFORMAÇÕES DO CONTEÚDO (Logo abaixo do player) */}
      {/* ========================================================================= */}
      {!isFullscreen && (
        <section className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 border-b border-white/5">
          {/* Tags & Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
            <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-600 text-white shadow-sm">
              {episodeCode}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-white/90 border border-white/10">
              {series.title}
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-black uppercase">
              {series.ageRating}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/5">
              {series.releaseYear}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                series.status === 'Em Lançamento'
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}
            >
              {series.status}
            </span>
            {(series.genres || []).map((genre) => (
              <span
                key={genre}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/5"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Episode Title */}
          <h2 className="text-base sm:text-2xl font-bold text-white mb-2">
            {episode.title}
          </h2>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm text-white/70 leading-relaxed mb-4 max-w-3xl">
            {episode.description || series.synopsis || 'Sem descrição cadastrada para este episódio.'}
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
            <button
              onClick={() => onToggleWatched(episode.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                isWatched
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/10'
                  : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isWatched ? 'Episódio Assistido' : 'Marcar como Assistido'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-black hover:bg-blue-400 font-bold text-xs shadow-md transition-all active:scale-95 min-h-[44px] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Episódio</span>
            </button>

            {/* Previous & Next Episode Navigation */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => prevEpisode && onSelectEpisode(prevEpisode)}
                disabled={!prevEpisode}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                  prevEpisode
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer'
                    : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                }`}
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <button
                onClick={() => nextEpisode && onSelectEpisode(nextEpisode)}
                disabled={!nextEpisode}
                className={`flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                  nextEpisode
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 cursor-pointer'
                    : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                }`}
              >
                <span>Próximo</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 4. LISTA DE EPISÓDIOS (Visível abaixo das informações, rolagem fluida) */}
      {/* ========================================================================= */}
      {!isFullscreen && (
        <section className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 border-b border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-blue-400" />
                <span>Episódios da Série</span>
                <span className="text-xs text-white/40 font-normal">
                  ({allEpisodes.length} disponíveis)
                </span>
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Toque em qualquer episódio abaixo para assistir imediatamente
              </p>
            </div>

            {/* Admin Add Episode */}
            {isAdmin && onOpenAddEpisodeModal && (
              <button
                onClick={() =>
                  onOpenAddEpisodeModal(
                    series,
                    typeof selectedSeason === 'number' ? selectedSeason : 1
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all min-h-[44px] w-full sm:w-auto cursor-pointer"
                id="content-add-episode-btn"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Episódio</span>
              </button>
            )}
          </div>

          {/* Abas de Temporadas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
            <button
              onClick={() => setSelectedSeason('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[36px] flex items-center cursor-pointer ${
                selectedSeason === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-[#171719] text-white/50 border border-white/5 hover:text-white'
              }`}
            >
              Todas as Temporadas ({allEpisodes.length})
            </button>

            {seasonsList.map((seasonNum) => {
              const count = allEpisodes.filter((e) => e.seasonNumber === seasonNum).length;
              return (
                <button
                  key={seasonNum}
                  onClick={() => setSelectedSeason(seasonNum)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[36px] flex items-center cursor-pointer ${
                    selectedSeason === seasonNum
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-[#171719] text-white/50 border border-white/5 hover:text-white'
                  }`}
                >
                  Temporada {seasonNum} ({count})
                </button>
              );
            })}
          </div>

          {/* Filtros e Busca de Episódios */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar episódio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#171719] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-500 min-h-[40px]"
              />
            </div>

            <select
              value={watchedFilter}
              onChange={(e) => setWatchedFilter(e.target.value as any)}
              className="px-3 py-2 text-xs bg-[#171719] border border-white/10 rounded-xl text-white/70 focus:outline-none focus:border-blue-500 min-h-[40px] cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="unwatched">Não Assistidos</option>
              <option value="watched">Assistidos</option>
            </select>
          </div>

          {/* Grid de Episódios: Renderização direta, fluida, sem overflow travando */}
          {filteredEpisodes.length === 0 ? (
            <div className="py-12 text-center text-white/40 bg-[#171719] rounded-2xl border border-white/5 p-6">
              <p className="text-sm font-semibold text-white/70 mb-1">Nenhum episódio encontrado.</p>
              <p className="text-xs text-white/40">Tente ajustar a busca ou o filtro de temporada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
              {filteredEpisodes.map((ep) => {
                const isCurrent = ep.id === episode.id;
                const isEpWatched = checkIsWatched(ep.id);
                return (
                  <div
                    key={ep.id}
                    className={`relative transition-all rounded-xl ${
                      isCurrent
                        ? 'ring-2 ring-blue-500 shadow-xl shadow-blue-600/20'
                        : ''
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-2.5 left-3 z-20 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Reproduzindo Agora</span>
                      </div>
                    )}
                    <EpisodeCard
                      episode={ep}
                      series={series}
                      isWatched={isEpWatched}
                      onToggleWatched={onToggleWatched}
                      onPlay={(_, selectedEp) => onSelectEpisode(selectedEp)}
                      isAdmin={isAdmin}
                      onEditEpisode={onEditEpisode}
                      onDeleteEpisode={onDeleteEpisode}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* 5. OUTROS CONTEÚDOS: MAIS SÉRIES RECOMENDADAS DO CATÁLOGO */}
      {/* ========================================================================= */}
      {!isFullscreen && otherSeries.length > 0 && (
        <section className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 pb-36 sm:pb-28">
          <h3 className="text-base sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <span>Outras Séries & Animes Recomendados</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {otherSeries.slice(0, 4).map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectSeries && onSelectSeries(s)}
                className="group relative rounded-xl bg-[#171719] border border-white/5 hover:border-white/20 p-2 sm:p-2.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="relative aspect-[16/10] sm:aspect-[3/4] rounded-lg overflow-hidden mb-2 bg-[#121214]">
                  <img
                    src={s.posterUrl}
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-blue-400">
                  {s.title}
                </h4>
                <p className="text-[10px] text-white/40 truncate">
                  {(s.episodes || []).length} episódios • {s.releaseYear}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
