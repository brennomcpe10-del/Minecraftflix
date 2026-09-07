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
  Layers,
  Settings,
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
  const allEpisodes = [...series.episodes].sort((a, b) => {
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

  // Esconder controles após inatividade
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        onClose();
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
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const skip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
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
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
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
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none overflow-hidden"
      id="video-player-container"
    >
      {/* Top Header Controls Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-[#0A0A0B]/95 via-[#0A0A0B]/70 to-transparent p-4 sm:p-6 flex items-center justify-between gap-4 transition-opacity duration-300 border-b border-white/5 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Series & Episode Info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 backdrop-blur-md"
            title="Fechar player (Esc)"
            id="player-close-btn"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-400 bg-blue-600/10 px-2 py-0.5 rounded border border-blue-500/20">
                {episodeCode}
              </span>
              <span className="text-xs font-medium text-white/50 truncate hidden sm:inline">
                {series.title}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white truncate drop-shadow-md">
              {episode.title}
            </h2>
          </div>
        </div>

        {/* Technical Data & Smart Nav */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Transmission Source Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171719]/80 border border-white/5 text-xs backdrop-blur-md">
            {episode.sourceType === 'google_drive' ? (
              <>
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-amber-300">Transmissão: Google Drive HD</span>
              </>
            ) : episode.sourceType === 'direct_upload' ? (
              <>
                <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-cyan-300">Transmissão: Upload Servidor</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-bold text-blue-300">Transmissão: Link Web</span>
              </>
            )}
          </div>

          {/* Previous / Next Episode Smart Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => prevEpisode && onSelectEpisode(prevEpisode)}
              disabled={!prevEpisode}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                prevEpisode
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10 cursor-pointer'
                  : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
              }`}
              title={prevEpisode ? `Episódio Anterior: ${prevEpisode.title}` : 'Primeiro episódio'}
              id="player-prev-episode-btn"
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <button
              onClick={() => nextEpisode && onSelectEpisode(nextEpisode)}
              disabled={!nextEpisode}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                nextEpisode
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 cursor-pointer'
                  : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
              }`}
              title={nextEpisode ? `Próximo Episódio: ${nextEpisode.title}` : 'Último episódio'}
              id="player-next-episode-btn"
            >
              <span className="hidden sm:inline">Próximo</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black">
        {/* Mode A: Google Drive Preview Player (Iframe) */}
        {activePlayerMode === 'drive_iframe' && driveEmbedUrl ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <iframe
              src={driveEmbedUrl}
              title={episode.title}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          /* Mode B: HTML5 Video Player */
          <div
            onClick={togglePlay}
            className="relative w-full h-full flex items-center justify-center cursor-pointer"
          >
            <video
              ref={videoRef}
              src={episode.videoUrl}
              poster={episode.thumbnailUrl || series.posterUrl}
              className="max-w-full max-h-full w-full h-full object-contain"
              playsInline
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
            />

            {/* Center Play/Pause Overlay Animation */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <div className="w-20 h-20 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm transform scale-100 transition-transform">
                  <Play className="w-8 h-8 fill-current translate-x-1" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#0A0A0B]/95 via-[#0A0A0B]/85 to-transparent p-4 sm:p-6 transition-opacity duration-300 border-t border-white/5 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline Scrubber (Only active in HTML5 video mode) */}
        {activePlayerMode === 'native_player' && (
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xs font-mono text-white/70 min-w-[45px]">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
            />
            <span className="text-xs font-mono text-white/40 min-w-[45px]">
              {formatTime(duration || episode.durationMinutes * 60)}
            </span>
          </div>
        )}

        {/* Action Controls Line */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left Controls: Play/Pause, Skip, Volume */}
          <div className="flex items-center gap-2 sm:gap-3">
            {activePlayerMode === 'native_player' && (
              <>
                <button
                  onClick={togglePlay}
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-600/20"
                  title={isPlaying ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'}
                  id="player-play-toggle-btn"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
                </button>

                <button
                  onClick={() => skip(-10)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
                  title="Voltar 10s (←)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => skip(10)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
                  title="Avançar 10s (→)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5 group">
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
                    title={isMuted ? 'Ativar som (M)' : 'Silenciar (M)'}
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
                    className="w-16 sm:w-24 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </>
            )}

            {/* Watched Status Toggle in Player */}
            <button
              onClick={() => onToggleWatched(episode.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isWatched
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-white/10 hover:bg-white/20 border border-white/10 text-white/80'
              }`}
              id="player-mark-watched-btn"
            >
              <Check className={`w-4 h-4 ${isWatched ? 'text-emerald-400 stroke-[3]' : 'text-white/40'}`} />
              <span>{isWatched ? 'Assistido' : 'Marcar como Assistido'}</span>
            </button>

            {/* Toggle Player Engine (If Google Drive) */}
            {episode.sourceType === 'google_drive' && (
              <button
                onClick={() =>
                  setActivePlayerMode(activePlayerMode === 'drive_iframe' ? 'native_player' : 'drive_iframe')
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white/80 text-xs font-medium transition-colors"
                title="Alternar entre Player Oficial Google Drive e Player HTML5 Direto"
              >
                <Tv className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">
                  {activePlayerMode === 'drive_iframe' ? 'Mudar para Player Direto' : 'Mudar para Google Drive'}
                </span>
              </button>
            )}
          </div>

          {/* Right Controls: Technical Specs, Speed, Download, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Technical Specs Info */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/60 bg-[#171719]/80 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
              <span className="font-bold text-blue-400">{episode.resolution || '1080p HD'}</span>
              <span>•</span>
              <span>{episode.durationMinutes} min</span>
              {episode.fileSizeFormatted && (
                <>
                  <span>•</span>
                  <span>{episode.fileSizeFormatted}</span>
                </>
              )}
            </div>

            {/* Playback Speed Menu */}
            {activePlayerMode === 'native_player' && (
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-colors"
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

            {/* Direct Download Button */}
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-black hover:bg-blue-400 text-xs font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
              title="Baixar vídeo original no seu dispositivo"
              id="player-download-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Vídeo</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors"
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
