import React, { useState, useRef, useEffect } from 'react';
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
  HardDrive,
  Globe,
  UploadCloud,
  Tv,
} from 'lucide-react';
import { Episode, Series } from '../types';
import { formatEpisodeCode, getGoogleDriveDownloadUrl, getGoogleDrivePreviewUrl } from '../utils/drive';
import { api } from '../services/api';

interface VideoPlayerModalProps {
  series: Series;
  episode: Episode;
  onClose: () => void;
  onSelectEpisode: (episode: Episode) => void;
  isWatched: boolean;
  onToggleWatched: (episodeId: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  series,
  episode,
  onClose,
  onSelectEpisode,
  isWatched,
  onToggleWatched,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [activePlayerMode, setActivePlayerMode] = useState<'drive_iframe' | 'native_player'>(
    episode.sourceType === 'google_drive' ? 'drive_iframe' : 'native_player'
  );

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ordenar todos os episódios da série por temporada e número
  const allEpisodes = [...(series.episodes || [])].sort((a, b) => {
    if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
    return a.episodeNumber - b.episodeNumber;
  });

  const currentIndex = allEpisodes.findIndex((e) => e.id === episode.id);
  const prevEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null;

  const episodeCode = formatEpisodeCode(episode.seasonNumber, episode.episodeNumber);

  // Atualizar modo de player quando mudar de episódio
  useEffect(() => {
    if (episode.sourceType === 'google_drive') {
      setActivePlayerMode('drive_iframe');
    } else {
      setActivePlayerMode('native_player');
    }
  }, [episode.id, episode.sourceType]);

  // Carregar progresso salvo de reprodução
  useEffect(() => {
    const progressMap = api.getProgressMap();
    const saved = progressMap[episode.id];
    if (saved && saved.currentTimeSeconds > 0 && videoRef.current) {
      videoRef.current.currentTime = saved.currentTimeSeconds;
    }
  }, [episode.id]);

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

  // Esconder controles após 3.5 segundos de inatividade
  const triggerControlsVisibility = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
      }
    }, 3500);
  };

  const handleContainerMouseMove = () => {
    triggerControlsVisibility();
  };

  // Toque na tela do celular: alternar visibilidade dos controles
  const handleScreenTap = () => {
    if (showControls && isPlaying) {
      setShowControls(false);
      setShowSpeedMenu(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      triggerControlsVisibility();
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
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        triggerControlsVisibility();
      }).catch(console.warn);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
    triggerControlsVisibility();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    triggerControlsVisibility();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
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
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
    triggerControlsVisibility();
  };

  // Alternar tela cheia com suporte cross-browser (Android, iOS Safari, desktop)
  const toggleFullscreen = async () => {
    const doc = document as any;
    const isCurrentlyFs = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      isFullscreen
    );

    if (!isCurrentlyFs) {
      // Tentar fullscreen padrão no container
      const container = containerRef.current as any;
      let requested = false;

      if (container) {
        if (container.requestFullscreen) {
          try {
            await container.requestFullscreen();
            requested = true;
          } catch (e) {
            console.warn('requestFullscreen error, trying vendor prefixes', e);
          }
        } else if (container.webkitRequestFullscreen) {
          try {
            container.webkitRequestFullscreen();
            requested = true;
          } catch (e) {
            console.warn('webkitRequestFullscreen error', e);
          }
        }
      }

      // Se falhou no container (comum no iOS iPhone Safari para tags div), tentar no elemento <video>
      if (!requested && videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        try {
          (videoRef.current as any).webkitEnterFullscreen();
          requested = true;
        } catch (e) {
          console.warn('webkitEnterFullscreen error', e);
        }
      }

      // Ativar estado de tela cheia CSS (garante que ocupa 100vw e 100vh em qualquer celular)
      setIsFullscreen(true);

      // Em dispositivos móveis, tentar travar em modo paisagem (landscape) se suportado
      try {
        if (window.screen?.orientation && typeof (window.screen.orientation as any).lock === 'function') {
          await (window.screen.orientation as any).lock('landscape');
        }
      } catch {
        // Ignora caso não tenha permissão de lock
      }
    } else {
      // Sair de tela cheia
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      }

      setIsFullscreen(false);

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

  // Link de download original
  const getDownloadUrl = () => {
    if (episode.sourceType === 'google_drive' && episode.googleDriveId) {
      return getGoogleDriveDownloadUrl(episode.googleDriveId);
    }
    return episode.downloadUrl || episode.videoUrl;
  };

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
      onMouseMove={handleContainerMouseMove}
      className={`fixed inset-0 z-[9999] bg-black flex flex-col justify-between select-none overflow-hidden ${
        isFullscreen ? 'w-screen h-screen' : ''
      }`}
      id="video-player-container"
    >
      {/* Barra de Controles Superior com suporte a Safe-Area no celular */}
      <div
        className={`absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-[#0A0A0B]/95 via-[#0A0A0B]/80 to-transparent pt-[max(0.75rem,env(safe-area-inset-top))] pb-4 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] flex items-center justify-between gap-2 sm:gap-4 transition-opacity duration-300 border-b border-white/5 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Identificação da Série e Episódio */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors border border-white/10 backdrop-blur-md flex-shrink-0"
            title="Fechar player (Esc)"
            id="player-close-btn"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold text-blue-400 bg-blue-600/20 px-1.5 sm:px-2 py-0.5 rounded border border-blue-500/30">
                {episodeCode}
              </span>
              <span className="text-xs font-medium text-white/50 truncate max-w-[120px] sm:max-w-none">
                {series.title}
              </span>
            </div>
            <h2 className="text-xs sm:text-base font-bold text-white truncate drop-shadow-md">
              {episode.title}
            </h2>
          </div>
        </div>

        {/* Ações Rápidas no Topo */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Alternador de Modo (Player Google Drive vs HTML5 Direto) */}
          {episode.sourceType === 'google_drive' && (
            <button
              onClick={() =>
                setActivePlayerMode(activePlayerMode === 'drive_iframe' ? 'native_player' : 'drive_iframe')
              }
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/10 text-white text-xs font-medium transition-colors"
              title="Alternar entre Player Oficial Google Drive e Player HTML5 Direto"
              id="player-toggle-mode-btn"
            >
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {activePlayerMode === 'drive_iframe' ? 'Usar Player Direto' : 'Usar Google Drive'}
              </span>
            </button>
          )}

          {/* Botões de Episódio Anterior / Próximo */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => prevEpisode && onSelectEpisode(prevEpisode)}
              disabled={!prevEpisode}
              className={`flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold transition-all ${
                prevEpisode
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer'
                  : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
              }`}
              title={prevEpisode ? `Episódio Anterior: ${prevEpisode.title}` : 'Primeiro episódio'}
              id="player-prev-episode-btn"
            >
              <SkipBack className="w-4 h-4" />
              <span className="hidden md:inline ml-1">Anterior</span>
            </button>

            <button
              onClick={() => nextEpisode && onSelectEpisode(nextEpisode)}
              disabled={!nextEpisode}
              className={`flex items-center justify-center p-2 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-bold transition-all ${
                nextEpisode
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 cursor-pointer'
                  : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
              }`}
              title={nextEpisode ? `Próximo Episódio: ${nextEpisode.title}` : 'Último episódio'}
              id="player-next-episode-btn"
            >
              <span className="hidden md:inline mr-1">Próximo</span>
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Área Principal de Exibição do Vídeo (Viewport) */}
      <div
        onClick={handleScreenTap}
        className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden"
      >
        {/* MODO 1: Google Drive Iframe Oficial */}
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
          /* MODO 2: Player HTML5 Nativo com Controles Otimizados para Celular */
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              src={episode.videoUrl}
              poster={episode.thumbnailUrl || series.posterUrl}
              className="max-w-full max-h-full w-full h-full object-contain"
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
                onToggleWatched(episode.id);
                if (nextEpisode) {
                  onSelectEpisode(nextEpisode);
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Controles Centrais em Tela Cheia e Mobile (Estilo Netflix / YouTube) */}
            <div
              className={`absolute inset-0 flex items-center justify-center gap-6 sm:gap-12 transition-opacity duration-300 pointer-events-none ${
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Botão Voltar 10s */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skip(-10);
                }}
                className="pointer-events-auto p-3 sm:p-4 rounded-full bg-black/50 hover:bg-black/80 active:scale-95 text-white/90 hover:text-white backdrop-blur-md border border-white/10 transition-all shadow-xl"
                title="Voltar 10 segundos"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[9px] font-bold block mt-0.5">-10s</span>
              </button>

              {/* Botão Play / Pause Central */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="pointer-events-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/95 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transition-all"
                title={isPlaying ? 'Pausar' : 'Reproduzir'}
                id="center-play-pause-btn"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 sm:w-9 sm:h-9 fill-current" />
                ) : (
                  <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-current translate-x-0.5" />
                )}
              </button>

              {/* Botão Avançar 10s */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  skip(10);
                }}
                className="pointer-events-auto p-3 sm:p-4 rounded-full bg-black/50 hover:bg-black/80 active:scale-95 text-white/90 hover:text-white backdrop-blur-md border border-white/10 transition-all shadow-xl"
                title="Avançar 10 segundos"
              >
                <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[9px] font-bold block mt-0.5">+10s</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Controles Inferior (Otimizada para Mobile e Telas Cheias) */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#0A0A0B]/95 via-[#0A0A0B]/85 to-transparent pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] transition-opacity duration-300 border-t border-white/5 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Barra de Progresso / Linha do Tempo (Scrubber) */}
        {activePlayerMode === 'native_player' && (
          <div className="mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] sm:text-xs font-mono text-white/70 min-w-[38px] text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="player-scrubber flex-1 cursor-pointer"
              id="player-timeline-slider"
            />
            <span className="text-[11px] sm:text-xs font-mono text-white/40 min-w-[38px]">
              {formatTime(duration || episode.durationMinutes * 60)}
            </span>
          </div>
        )}

        {/* Linha de Ações Principais do Player */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Controles da Esquerda */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {activePlayerMode === 'native_player' && (
              <>
                <button
                  onClick={togglePlay}
                  className="p-2 sm:p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-colors shadow-lg shadow-blue-600/20 flex-shrink-0"
                  title={isPlaying ? 'Pausar' : 'Reproduzir'}
                  id="player-play-toggle-btn"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
                </button>

                <button
                  onClick={() => skip(-10)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/10 transition-colors hidden xs:flex items-center justify-center"
                  title="Voltar 10s"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => skip(10)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/10 transition-colors hidden xs:flex items-center justify-center"
                  title="Avançar 10s"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                {/* Controle de Volume (Oculto no celular onde botões físicos são usados) */}
                <div className="hidden sm:flex items-center gap-1.5 group ml-1">
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
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
                    className="w-16 sm:w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </>
            )}

            {/* Marcar como Assistido */}
            <button
              onClick={() => onToggleWatched(episode.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex-shrink-0 ${
                isWatched
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white/80'
              }`}
              title={isWatched ? 'Episódio já assistido' : 'Marcar como assistido'}
              id="player-mark-watched-btn"
            >
              <Check className={`w-3.5 h-3.5 ${isWatched ? 'text-emerald-400 stroke-[3]' : 'text-white/40'}`} />
              <span className="hidden sm:inline">{isWatched ? 'Assistido' : 'Marcar Assistido'}</span>
            </button>
          </div>

          {/* Controles da Direita: Velocidade, Download, Tela Cheia */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Seletor de Velocidade (Player HTML5) */}
            {activePlayerMode === 'native_player' && (
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/10 text-white text-xs font-bold transition-colors"
                  title="Velocidade de reprodução"
                >
                  {playbackRate}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 py-1 bg-[#171719] border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col min-w-[70px]">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeSpeed(rate)}
                        className={`px-3 py-1 text-xs text-left hover:bg-white/10 ${
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

            {/* Botão de Download */}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white text-black hover:bg-blue-400 text-xs font-bold shadow-md transition-all active:scale-95 flex-shrink-0"
              title="Baixar arquivo de vídeo original"
              id="player-download-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Baixar</span>
            </button>

            {/* Botão de Tela Cheia */}
            <button
              onClick={toggleFullscreen}
              className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/10 text-white transition-colors flex-shrink-0"
              title={isFullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
              id="player-fullscreen-btn"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
