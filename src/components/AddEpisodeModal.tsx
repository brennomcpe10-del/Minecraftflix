import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  UploadCloud,
  Globe,
  Check,
  AlertCircle,
  Film,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { Episode, Series, VideoSourceType } from '../types';
import {
  extractGoogleDriveId,
  getGoogleDriveDownloadUrl,
  getGoogleDrivePreviewUrl,
  getGoogleDriveThumbnailUrl,
  formatFileSize,
} from '../utils/drive';
import { extractThumbnailFromVideoFile } from '../utils/videoThumbnail';
import { api } from '../services/api';

interface AddEpisodeModalProps {
  series: Series;
  initialSeasonNumber?: number;
  editingEpisode?: Episode | null;
  onClose: () => void;
  onSuccess: (savedEpisode: Episode) => void;
}

export const AddEpisodeModal: React.FC<AddEpisodeModalProps> = ({
  series,
  initialSeasonNumber = 1,
  editingEpisode,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(editingEpisode);

  // Tabs de publicação
  const [sourceType, setSourceType] = useState<VideoSourceType>(
    editingEpisode?.sourceType || 'google_drive'
  );

  // Campos do Google Drive
  const [driveInput, setDriveInput] = useState(
    editingEpisode?.sourceType === 'google_drive' ? editingEpisode.videoUrl : ''
  );
  const [detectedDriveId, setDetectedDriveId] = useState<string | null>(
    editingEpisode?.googleDriveId || null
  );

  // Campos de Upload Direto
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCompleteUrl, setUploadCompleteUrl] = useState<string>(
    editingEpisode?.sourceType === 'direct_upload' ? editingEpisode.videoUrl : ''
  );

  // Campos de Link Web Direto
  const [webUrlInput, setWebUrlInput] = useState(
    editingEpisode?.sourceType === 'web_url' ? editingEpisode.videoUrl : ''
  );

  // Metadados comuns
  const [seasonNumber, setSeasonNumber] = useState<number>(
    editingEpisode?.seasonNumber || initialSeasonNumber
  );

  // Calcular próximo número de episódio automaticamente
  const getNextEpisodeNumber = (season: number) => {
    const seasonEps = (series.episodes || []).filter((e) => e.seasonNumber === season);
    return seasonEps.length > 0 ? Math.max(...seasonEps.map((e) => e.episodeNumber)) + 1 : 1;
  };

  const [episodeNumber, setEpisodeNumber] = useState<number>(
    editingEpisode?.episodeNumber || getNextEpisodeNumber(initialSeasonNumber)
  );

  const [title, setTitle] = useState(
    editingEpisode?.title || `Episódio ${editingEpisode?.episodeNumber || getNextEpisodeNumber(initialSeasonNumber)}`
  );
  const [description, setDescription] = useState(editingEpisode?.description || '');
  const [durationMinutes, setDurationMinutes] = useState<number>(
    editingEpisode?.durationMinutes || 24
  );
  const [resolution, setResolution] = useState(editingEpisode?.resolution || '1080p HD');
  const [thumbnailUrl, setThumbnailUrl] = useState(
    editingEpisode?.thumbnailUrl || series.posterUrl
  );
  const [fileSizeBytes, setFileSizeBytes] = useState<number | undefined>(
    editingEpisode?.fileSizeBytes
  );
  const [fileSizeFormatted, setFileSizeFormatted] = useState<string | undefined>(
    editingEpisode?.fileSizeFormatted
  );

  const [isExtractingThumb, setIsExtractingThumb] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Atualizar detecção do Google Drive ID dinamicamente
  useEffect(() => {
    if (sourceType === 'google_drive') {
      const id = extractGoogleDriveId(driveInput);
      setDetectedDriveId(id);
      if (id && !isEditing && (!thumbnailUrl || thumbnailUrl === series.posterUrl)) {
        // Sugere a thumbnail do Google Drive
        const thumb = getGoogleDriveThumbnailUrl(id);
        setThumbnailUrl(thumb);
      }
    }
  }, [driveInput, sourceType, series.posterUrl, isEditing]);

  // Recalcular número do episódio se mudar de temporada
  const handleSeasonChange = (val: number) => {
    setSeasonNumber(val);
    if (!isEditing) {
      const nextNum = getNextEpisodeNumber(val);
      setEpisodeNumber(nextNum);
      setTitle(`Episódio ${nextNum}`);
    }
  };

  // Processamento de arquivo local selecionado para upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileSizeBytes(file.size);
    setFileSizeFormatted(formatFileSize(file.size));

    // Se o título for genérico, sugerir nome limpo do arquivo
    if (!isEditing && title.startsWith('Episódio')) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName);
    }

    // Extrair miniatura automaticamente via Canvas
    setIsExtractingThumb(true);
    try {
      const result = await extractThumbnailFromVideoFile(file);
      setThumbnailUrl(result.dataUrl);
      if (result.durationSeconds > 0) {
        setDurationMinutes(Math.round(result.durationSeconds / 60) || 1);
      }
    } catch (err) {
      console.warn('Não foi possível extrair miniatura localmente, usando pôster padrão:', err);
    } finally {
      setIsExtractingThumb(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      let finalVideoUrl = '';
      let finalGoogleDriveId: string | undefined = undefined;
      let finalDownloadUrl: string | undefined = undefined;

      if (sourceType === 'google_drive') {
        const driveId = extractGoogleDriveId(driveInput);
        if (!driveId) {
          throw new Error('Por favor, cole um link válido do Google Drive ou o ID do arquivo.');
        }
        finalGoogleDriveId = driveId;
        finalVideoUrl = driveInput.trim();
        finalDownloadUrl = getGoogleDriveDownloadUrl(driveId);
      } else if (sourceType === 'direct_upload') {
        if (selectedFile) {
          setIsUploading(true);
          const uploadRes = await api.uploadVideo(selectedFile, (pct) => {
            setUploadProgress(pct);
          });
          finalVideoUrl = uploadRes.fileUrl;
          finalDownloadUrl = uploadRes.fileUrl;
          setUploadCompleteUrl(uploadRes.fileUrl);
          setIsUploading(false);
        } else if (uploadCompleteUrl) {
          finalVideoUrl = uploadCompleteUrl;
          finalDownloadUrl = uploadCompleteUrl;
        } else {
          throw new Error('Selecione um arquivo de vídeo para enviar.');
        }
      } else {
        // Link Web Direto
        if (!webUrlInput.trim()) {
          throw new Error('Por favor, insira o link direto do vídeo.');
        }
        finalVideoUrl = webUrlInput.trim();
        finalDownloadUrl = webUrlInput.trim();
      }

      const payload: Partial<Episode> = {
        seasonNumber: Number(seasonNumber),
        episodeNumber: Number(episodeNumber),
        title: title.trim() || `Episódio ${episodeNumber}`,
        description: description.trim(),
        sourceType,
        videoUrl: finalVideoUrl,
        googleDriveId: finalGoogleDriveId,
        downloadUrl: finalDownloadUrl,
        thumbnailUrl: thumbnailUrl || series.posterUrl,
        durationMinutes: Number(durationMinutes) || 24,
        resolution,
        fileSizeBytes,
        fileSizeFormatted: fileSizeFormatted || formatFileSize(fileSizeBytes),
      };

      let saved: Episode;
      if (isEditing && editingEpisode) {
        saved = await api.updateEpisode(series.id, editingEpisode.id, payload);
      } else {
        saved = await api.addEpisode(series.id, payload);
      }

      onSuccess(saved);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocorreu um erro ao salvar o episódio.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-[#0F0F11] border border-white/10 shadow-2xl overflow-hidden my-auto max-h-[92vh] sm:max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#171719]/50">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
              <Film className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                {isEditing ? 'Editar Episódio' : 'Publicar Novo Episódio'}
              </h2>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                Série: <span className="text-white/80 font-medium">{series.title}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 flex items-center justify-center flex-shrink-0"
            id="add-episode-close-btn"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Escolha da Fonte de Publicação */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-2">
              1. Fonte do Vídeo
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {/* Opção Google Drive */}
              <button
                type="button"
                onClick={() => setSourceType('google_drive')}
                className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border text-center transition-all ${
                  sourceType === 'google_drive'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-md shadow-amber-500/5'
                    : 'bg-[#171719] border-white/5 text-white/50 hover:bg-white/5 hover:text-white'
                }`}
                id="source-google-drive-tab"
              >
                <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 mb-1 text-amber-400" />
                <span className="text-[11px] sm:text-xs font-bold leading-tight">Google Drive</span>
                <span className="text-[9px] sm:text-[10px] text-white/40 hidden sm:block">Link direto HD</span>
              </button>

              {/* Opção Upload Direto */}
              <button
                type="button"
                onClick={() => setSourceType('direct_upload')}
                className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl border text-center transition-all ${
                  sourceType === 'direct_upload'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-md shadow-cyan-500/5'
                    : 'bg-[#171719] border-white/5 text-white/50 hover:bg-white/5 hover:text-white'
                }`}
                id="source-upload-tab"
              >
                <UploadCloud className="w-5 h-5 mb-1 text-cyan-400" />
                <span className="text-xs font-bold">Upload Arquivo</span>
                <span className="text-[10px] text-white/40">MP4, MKV, WebM</span>
              </button>

              {/* Opção Link Web Direto */}
              <button
                type="button"
                onClick={() => setSourceType('web_url')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  sourceType === 'web_url'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-md shadow-blue-500/5'
                    : 'bg-[#171719] border-white/5 text-white/50 hover:bg-white/5 hover:text-white'
                }`}
                id="source-web-url-tab"
              >
                <Globe className="w-5 h-5 mb-1 text-blue-400" />
                <span className="text-xs font-bold">Link Web</span>
                <span className="text-[10px] text-white/40">URL Externa</span>
              </button>
            </div>
          </div>

          {/* 2. Campo específico da Fonte */}
          {sourceType === 'google_drive' && (
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1">
                  Link de Compartilhamento do Google Drive
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/file/d/SEU_ID_DO_ARQUIVO/view?usp=sharing"
                  value={driveInput}
                  onChange={(e) => setDriveInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121214] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500"
                  required
                  id="drive-url-input"
                />
              </div>

              {detectedDriveId ? (
                <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    Vídeo identificado! ID: <strong className="font-mono">{detectedDriveId}</strong>. O player em alta definição e links de download estão prontos.
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-white/50 leading-relaxed">
                  💡 Basta copiar o link gerado pelo Google Drive no menu &quot;Compartilhar &gt; Qualquer pessoa com o link&quot; e colar aqui.
                </p>
              )}
            </div>
          )}

          {sourceType === 'direct_upload' && (
            <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 space-y-3">
              <label className="block text-xs font-semibold text-cyan-300 mb-1">
                Selecione ou Arraste o Arquivo de Vídeo
              </label>
              <div className="border-2 border-dashed border-cyan-500/30 rounded-xl p-6 text-center bg-[#121214]/60 hover:bg-[#121214] transition-colors">
                <input
                  type="file"
                  accept="video/mp4,video/mkv,video/webm,video/quicktime,video/x-msvideo,.mkv,.mp4,.webm,.mov,.avi"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-file-input"
                />
                <label
                  htmlFor="video-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <UploadCloud className="w-10 h-10 text-cyan-400 animate-bounce" />
                  <span className="text-xs font-bold text-white">
                    {selectedFile ? selectedFile.name : 'Clique para escolher um vídeo do seu PC ou celular'}
                  </span>
                  <span className="text-[11px] text-white/40">
                    Suporta MP4, MKV, WebM, MOV, AVI (Até 1GB)
                  </span>
                </label>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between text-xs text-white/70 bg-[#171719] p-2.5 rounded-lg border border-white/5">
                  <span>Tamanho: <strong className="text-white">{fileSizeFormatted}</strong></span>
                  {isExtractingThumb ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-spin" /> Extraindo miniatura...
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Miniatura extraída do vídeo
                    </span>
                  )}
                </div>
              )}

              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-cyan-300">
                    <span>Enviando vídeo para o servidor...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {sourceType === 'web_url' && (
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-2">
              <label className="block text-xs font-semibold text-blue-300">
                URL Direta do Vídeo
              </label>
              <input
                type="url"
                placeholder="https://meu-servidor.com/videos/episodio01.mp4"
                value={webUrlInput}
                onChange={(e) => setWebUrlInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#121214] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
                required
                id="web-url-input"
              />
              <p className="text-[11px] text-white/50">
                Permite transmissões hospedadas em CDNs ou servidores web diretos.
              </p>
            </div>
          )}

          {/* 3. Numeração & Temporada */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Temporada
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={seasonNumber}
                onChange={(e) => handleSeasonChange(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Número do Episódio
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={episodeNumber}
                onChange={(e) => setEpisodeNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* 4. Título & Sinopse */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Título do Episódio
            </label>
            <input
              type="text"
              placeholder="Ex: O Despertar das Sombras"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Sinopse do Episódio
            </label>
            <textarea
              rows={2}
              placeholder="Breve descrição dos acontecimentos deste episódio..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 5. Metadados Técnicos (Duração & Resolução) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Duração (minutos)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 24)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Qualidade / Resolução
              </label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="1080p HD">1080p HD</option>
                <option value="4K Ultra HD">4K Ultra HD</option>
                <option value="720p HD">720p HD</option>
                <option value="HD">HD</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Tamanho Exibido
              </label>
              <input
                type="text"
                placeholder="Ex: 500 MB"
                value={fileSizeFormatted || ''}
                onChange={(e) => setFileSizeFormatted(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 6. Miniatura do Episódio */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              URL da Capa / Miniatura
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="https://..."
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
              {thumbnailUrl && (
                <div className="w-16 h-10 rounded-lg overflow-hidden border border-white/10 bg-black flex-shrink-0">
                  <img
                    src={thumbnailUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 sm:pt-4 border-t border-white/10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold border border-white/5 transition-colors text-center min-h-[44px] flex items-center justify-center"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
              id="submit-episode-btn"
            >
              {(isSubmitting || isUploading) && <Sparkles className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {isUploading
                  ? `Enviando (${uploadProgress}%)...`
                  : isSubmitting
                  ? 'Salvando...'
                  : isEditing
                  ? 'Salvar Alterações'
                  : 'Publicar Episódio'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
