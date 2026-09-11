import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Download,
  Check,
  CheckCircle2,
  HardDrive,
  Globe,
  UploadCloud,
  Tv,
  ArrowLeft,
  Film,
  Search,
  Plus,
  Layers,
} from 'lucide-react';
import { Episode, Series } from '../types';
import { formatEpisodeCode, getGoogleDriveDownloadUrl, getGoogleDrivePreviewUrl, getEpisodeSourceUrl } from '../utils/drive';
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
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      const doc = document as any;
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
        return true;
      }
    }
    return true; // O player abre diretamente em tela cheia por padrão
  });
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [activePlayerMode, setActivePlayerMode] = useState<'drive_iframe' | 'native_player'>('native_player');

  // Filtros de Episódios na lista inferior
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [watchedFilter, setWatchedFilter] = useState<'all' | 'unwatched' | 'watched'>('all');

  // Estado centralizado para controle de visibilidade da barra de controles
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const isDraggingSliderRef = useRef(false);
  isDraggingSliderRef.current = isDraggingSlider;
  const lastTapTimeRef = useRef(0);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpar timer de ocultação existente
  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  }, []);

  // Agendar desaparecimento dos controles após 3 segundos
  const scheduleControlsHide = useCallback((delay = 3000) => {
    clearControlsTimer();
    controlsTimerRef.current = setTimeout(() => {
      // Se o vídeo estiver pausado ou usuário interagindo com a barra de progresso, não esconder
      if (videoRef.current?.paused || isDraggingSliderRef.current) {
        return;
      }
      setShowControls(false);
      setShowSpeedMenu(false);
    }, delay);
  }, [clearControlsTimer]);

  // Mostrar controles e agendar desaparecimento automático em 3 segundos
  const showAndScheduleHide = useCallback((delay = 3000) => {
    setShowControls(true);
    scheduleControlsHide(delay);
  }, [scheduleControlsHide]);

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

  // Manter player nativo ativo com a mesma fonte do download ao trocar de episódio
  useEffect(() => {
    setActivePlayerMode('native_player');
    
    // Assegurar tela cheia caso o navegador suporte
    const doc = document as any;
    const isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
    if (!isFs && playerContainerRef.current) {
      const el = playerContainerRef.current as any;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    }
  }, [episode.id]);

  // Carregar progresso salvo e iniciar reprodução imediata do episódio
  useEffect(() => {
    const progressMap = api.getProgressMap();
    const saved = progressMap[episode.id];
    if (videoRef.current) {
      if (saved && saved.currentTimeSeconds > 0) {
        videoRef.current.currentTime = saved.currentTimeSeconds;
      } else {
        videoRef.current.currentTime = 0;
      }

      // Iniciar reprodução do vídeo imediatamente sem necessitar de segundo clique
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            showAndScheduleHide(3000);
          })
          .catch((err) => {
            console.warn('Autoplay aguardando interação do usuário:', err);
            setShowControls(true);
          });
      }
    }

    // Rolar suavemente a visualização para o topo do reprodutor
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    return () => {
      clearControlsTimer();
    };
  }, [episode.id, clearControlsTimer, showAndScheduleHide]);

  // Salvar progresso de reprodução periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        api.saveProgress(
          episode.id,
          series.id,
          isWatched,
          videoRef.current.currentTime,
          videoRef.current.duration || 0
        );
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [episode.id, series.id, isWatched]);

  // Sincronizar eventos de tela cheia do navegador e iOS WebKit
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

    const video = videoRef.current;
    const handleWebkitBegin = () => setIsFullscreen(true);
    const handleWebkitEnd = () => setIsFullscreen(false);
    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleWebkitBegin);
      video.addEventListener('webkitendfullscreen', handleWebkitEnd);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleWebkitBegin);
        video.removeEventListener('webkitendfullscreen', handleWebkitEnd);
      }
    };
  }, []);

  // Movimento de mouse no desktop: mostrar controles e agendar auto-hide
  const handlePlayerMouseMove = () => {
    if (!showControls) {
      setShowControls(true);
    }
    if (isPlaying && !isDraggingSliderRef.current) {
      scheduleControlsHide(3000);
    }
  };

  const handlePlayerMouseLeave = () => {
    if (isPlaying && !isDraggingSliderRef.current) {
      clearControlsTimer();
      setShowControls(false);
      setShowSpeedMenu(false);
    }
  };

  // Toque na área do player: alternar visibilidade sem piscar e sem disparos múltiplos
  const handlePlayerTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      return; // Prevenir disparo duplicado (touch + click no mobile)
    }
    lastTapTimeRef.current = now;

    // Se o clique foi em um elemento interativo (botão, slider, etc), renovar tempo dos controles
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button, input, select, a, .player-scrubber')) {
      if (isPlaying && !isDraggingSliderRef.current) {
        scheduleControlsHide(3000);
      }
      return;
    }

    if (showControls && isPlaying) {
      // Controles estavam visíveis durante a reprodução: toque esconde imediatamente
      clearControlsTimer();
      setShowControls(false);
      setShowSpeedMenu(false);
    } else {
      // Controles estavam ocultos: toque mostra e programa auto-hide em aproximadamente 3 segundos
      showAndScheduleHide(3000);
    }
  };

  // Manipuladores de arraste da linha do tempo para NUNCA ocultar enquanto arrasta
  const handleSliderDragStart = () => {
    setIsDraggingSlider(true);
    isDraggingSliderRef.current = true;
    clearControlsTimer();
    setShowControls(true);
  };

  const handleSliderDragEnd = () => {
    setIsDraggingSlider(false);
    isDraggingSliderRef.current = false;
    if (isPlaying) {
      scheduleControlsHide(3000);
    }
  };

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
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        skip(10);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skip(-10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFullscreen, isMuted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          showAndScheduleHide(3000);
        })
        .catch(console.warn);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      clearControlsTimer();
      setShowControls(true);
    }
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds)
    );
    showAndScheduleHide(3000);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    showAndScheduleHide(3000);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
    showAndScheduleHide(3000);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 0.5;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
    showAndScheduleHide(3000);
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
    showAndScheduleHide(3000);
  };

  // Detecção de iPhone / iPad / iPod
  const isIosDevice = () => {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  };

  // Alternar tela cheia com suporte cross-browser robusto (iOS Safari, Android Chrome, Desktop)
  const toggleFullscreen = async () => {
    const doc = document as any;
    const video = videoRef.current as any;
    const playerContainer = playerContainerRef.current as any;

    const isCurrentlyFs = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      video?.webkitDisplayingFullscreen ||
      isFullscreen
    );

    if (!isCurrentlyFs) {
      // 1. Prioridade no iPhone Safari: webkitEnterFullscreen diretamente no elemento <video>
      if (video && typeof video.webkitEnterFullscreen === 'function' && isIosDevice()) {
        try {
          video.webkitEnterFullscreen();
          setIsFullscreen(true);
          return;
        } catch (err) {
          console.warn('Erro ao chamar webkitEnterFullscreen:', err);
        }
      }

      // 2. Android Chrome / Desktop: requestFullscreen no container do player
      let requested = false;
      if (playerContainer) {
        if (playerContainer.requestFullscreen) {
          try {
            await playerContainer.requestFullscreen();
            requested = true;
          } catch (e) {
            console.warn('requestFullscreen error, trying vendor prefixes', e);
          }
        } else if (playerContainer.webkitRequestFullscreen) {
          try {
            playerContainer.webkitRequestFullscreen();
            requested = true;
          } catch (e) {
            console.warn('webkitRequestFullscreen error', e);
          }
        } else if (playerContainer.mozRequestFullScreen) {
          try {
            playerContainer.mozRequestFullScreen();
            requested = true;
          } catch (e) {
            console.warn('mozRequestFullScreen error', e);
          }
        }
      }

      // 3. Fallback no elemento <video> caso o container tenha sido rejeitado
      if (!requested && video && typeof video.webkitEnterFullscreen === 'function') {
        try {
          video.webkitEnterFullscreen();
          requested = true;
        } catch (e) {
          console.warn('Fallback webkitEnterFullscreen falhou:', e);
        }
      }

      // Ativar estado de tela cheia CSS (garante 100vw e 100vh em qualquer dispositivo)
      setIsFullscreen(true);
      showAndScheduleHide(3000);

      // No Android / navegadores compatíveis: tentar travar orientação horizontal (landscape)
      try {
        if (window.screen?.orientation && typeof (window.screen.orientation as any).lock === 'function') {
          await (window.screen.orientation as any).lock('landscape');
        }
      } catch {
        // Ignora caso não tenha permissão de lock
      }
    } else {
      // SAIR DE TELA CHEIA
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

      if (video && typeof video.webkitExitFullscreen === 'function') {
        try {
          video.webkitExitFullscreen();
        } catch {}
      }

      setIsFullscreen(false);
      showAndScheduleHide(3000);

      // Desbloquear orientação de tela
      try {
        if (window.screen?.orientation && typeof (window.screen.orientation as any).unlock === 'function') {
          (window.screen.orientation as any).unlock();
        }
      } catch {
        // Ignora
      }
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Fonte oficial do episódio compartilhada entre o Player e o Download
  const episodeMediaUrl = getEpisodeSourceUrl(episode) || episode.videoUrl;
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

  // Google Drive preview URL
  const driveEmbedUrl = episode.googleDriveId
    ? getGoogleDrivePreviewUrl(episode.googleDriveId)
    : episode.sourceType === 'google_drive'
    ? episode.videoUrl
    : '';

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
      {/* 2. PLAYER DE VÍDEO (No topo, aspect-video, com grande botão de Fullscreen) */}
      {/* ========================================================================= */}
      <div className={`w-full bg-black ${isFullscreen ? 'fixed inset-0 z-[99999] h-screen' : 'relative'}`}>
        <div
          ref={playerContainerRef}
          onMouseMove={handlePlayerMouseMove}
          onMouseLeave={handlePlayerMouseLeave}
          className={`relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden transition-all ${
            !showControls && isPlaying ? 'cursor-none' : 'cursor-default'
          } ${
            isFullscreen
              ? 'fixed inset-0 z-[99999] w-screen h-screen max-w-none aspect-auto'
              : 'max-w-5xl mx-auto shadow-2xl'
          }`}
          id="video-player-viewport"
        >
          {/* Top Bar inside Player (Overlaid controls) */}
          <div
            className={`absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 via-black/60 to-transparent pt-3 pb-6 px-3 sm:px-6 flex items-center justify-between gap-2 transition-opacity duration-300 ${
              showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-blue-400 bg-blue-600/20 px-2 py-0.5 rounded border border-blue-500/30">
                {episodeCode}
              </span>
              <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-md">
                {episode.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Alternador de Modo (Google Drive vs Player Direto) */}
              {episode.sourceType === 'google_drive' && (
                <button
                  onClick={() =>
                    setActivePlayerMode(activePlayerMode === 'drive_iframe' ? 'native_player' : 'drive_iframe')
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/15 text-white text-xs font-semibold transition-colors min-h-[36px]"
                  title="Alternar entre Player Oficial Google Drive e Player Direto"
                  id="player-toggle-mode-btn"
                >
                  <Tv className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">
                    {activePlayerMode === 'drive_iframe' ? 'Usar Player Direto' : 'Usar Google Drive'}
                  </span>
                </button>
              )}

              {/* Botão Superior de Fullscreen */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 border border-blue-400/40 min-h-[38px] cursor-pointer"
                title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia (F)'}
                id="player-top-fullscreen-btn"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="hidden xs:inline">{isFullscreen ? 'Sair' : 'Tela Cheia'}</span>
                <span className="text-xs">⛶</span>
              </button>

              {/* Botão Fechar se estiver em Fullscreen */}
              {isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                  title="Fechar tela cheia"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Área Principal de Exibição do Vídeo */}
          <div
            onClick={handlePlayerTap}
            className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer"
          >
            {/* MODO 1: Google Drive Iframe */}
            {activePlayerMode === 'drive_iframe' && driveEmbedUrl ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <iframe
                  src={driveEmbedUrl}
                  title={episode.title}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              /* MODO 2: HTML5 Video Nativo */
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={episodeMediaUrl}
                  poster={episode.thumbnailUrl || series.posterUrl}
                  className="max-w-full max-h-full w-full h-full object-contain"
                  autoPlay
                  playsInline
                  webkit-playsinline="true"
                  x5-playsinline="true"
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) setDuration(videoRef.current.duration);
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    clearControlsTimer();
                    setShowControls(true);
                    onToggleWatched(episode.id);
                    if (nextEpisode) {
                      onSelectEpisode(nextEpisode);
                    }
                  }}
                  onPlay={() => {
                    setIsPlaying(true);
                    scheduleControlsHide(3000);
                    if (isIosDevice() && videoRef.current && typeof (videoRef.current as any).webkitEnterFullscreen === 'function') {
                      try {
                        (videoRef.current as any).webkitEnterFullscreen();
                      } catch {}
                    }
                  }}
                  onPause={() => {
                    setIsPlaying(false);
                    clearControlsTimer();
                    setShowControls(true);
                  }}
                />

                {/* Controles Centrais Play/Pause/Skip */}
                <div
                  className={`absolute inset-0 flex items-center justify-center gap-6 sm:gap-10 transition-opacity duration-300 pointer-events-none ${
                    showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      skip(-10);
                    }}
                    className="pointer-events-auto p-3 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md transition-all shadow-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Voltar 10 segundos"
                  >
                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="pointer-events-auto w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-blue-600/95 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transition-all"
                    title={isPlaying ? 'Pausar' : 'Reproduzir'}
                    id="center-play-pause-btn"
                  >
                    {isPlaying ? (
                      <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
                    ) : (
                      <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current translate-x-0.5" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      skip(10);
                    }}
                    className="pointer-events-auto p-3 rounded-full bg-black/60 hover:bg-black/80 active:scale-95 text-white/90 border border-white/15 backdrop-blur-md transition-all shadow-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Avançar 10 segundos"
                  >
                    <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Barra de Controles Inferior do Player */}
          <div
            className={`absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-4 pb-3 px-3 sm:px-6 transition-opacity duration-300 ${
              showControls || !isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Scrubber / Linha do Tempo */}
            {activePlayerMode === 'native_player' && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[11px] font-mono text-white/70 min-w-[36px] text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  onMouseDown={handleSliderDragStart}
                  onMouseUp={handleSliderDragEnd}
                  onTouchStart={handleSliderDragStart}
                  onTouchEnd={handleSliderDragEnd}
                  className="player-scrubber flex-1 cursor-pointer"
                  id="player-timeline-slider"
                />
                <span className="text-[11px] font-mono text-white/40 min-w-[36px]">
                  {formatTime(duration || episode.durationMinutes * 60)}
                </span>
              </div>
            )}

            {/* Linha de Ações Inferiores */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {activePlayerMode === 'native_player' && (
                  <>
                    <button
                      onClick={togglePlay}
                      className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer shadow-md shadow-blue-600/20"
                      title={isPlaying ? 'Pausar' : 'Reproduzir'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
                    </button>

                    <div className="hidden sm:flex items-center gap-1.5 ml-1">
                      <button
                        onClick={toggleMute}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                        title={isMuted ? 'Ativar som' : 'Silenciar'}
                      >
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </>
                )}

                {/* Marcar Assistido no Player */}
                <button
                  onClick={() => onToggleWatched(episode.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[40px] cursor-pointer ${
                    isWatched
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                      : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white/80'
                  }`}
                  title={isWatched ? 'Episódio assistido' : 'Marcar como assistido'}
                  id="player-mark-watched-btn"
                >
                  <Check className={`w-3.5 h-3.5 ${isWatched ? 'text-emerald-400 stroke-[3]' : 'text-white/40'}`} />
                  <span className="hidden xs:inline">{isWatched ? 'Assistido' : 'Marcar Assistido'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Velocidade */}
                {activePlayerMode === 'native_player' && (
                  <div className="relative">
                    <button
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold min-h-[40px] cursor-pointer"
                      title="Velocidade"
                    >
                      {playbackRate}x
                    </button>
                    {showSpeedMenu && (
                      <div className="absolute bottom-full right-0 mb-2 py-1 bg-[#171719] border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col min-w-[70px]">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => changeSpeed(rate)}
                            className={`px-3 py-1.5 text-xs text-left hover:bg-white/10 ${
                              playbackRate === rate ? 'text-blue-400 font-bold bg-white/5' : 'text-white/70'
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white text-black hover:bg-blue-400 text-xs font-bold shadow-md transition-all active:scale-95 min-h-[40px] cursor-pointer"
                  title="Baixar vídeo original"
                  id="player-download-btn"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Baixar</span>
                </button>

                {/* Botão de Tela Cheia no rodapé dos controles */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-blue-600/90 hover:bg-blue-500 active:scale-95 text-white transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center gap-1 font-bold text-xs cursor-pointer shadow-md shadow-blue-600/20"
                  title={isFullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
                  id="player-fullscreen-btn"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isFullscreen ? 'Sair' : 'Tela Cheia'}</span>
                </button>
              </div>
            </div>
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
