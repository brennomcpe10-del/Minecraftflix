import React, { useState } from 'react';
import { X, Film, AlertCircle, Sparkles } from 'lucide-react';
import { Series, SeriesStatus } from '../types';
import { api } from '../services/api';

interface SeriesFormModalProps {
  editingSeries?: Series | null;
  onClose: () => void;
  onSuccess: (saved: Series) => void;
}

const COMMON_GENRES = [
  'Anime',
  'Ficção Científica',
  'Ação',
  'Fantasia',
  'Aventura',
  'Produção Própria',
  'Drama',
  'Comédia',
  'Mistério',
  'Suspense',
  'Documentário',
  'Cyberpunk',
];

export const SeriesFormModal: React.FC<SeriesFormModalProps> = ({
  editingSeries,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(editingSeries);

  const [title, setTitle] = useState(editingSeries?.title || '');
  const [originalTitle, setOriginalTitle] = useState(editingSeries?.originalTitle || '');
  const [synopsis, setSynopsis] = useState(editingSeries?.synopsis || '');
  const [releaseYear, setReleaseYear] = useState(editingSeries?.releaseYear || new Date().getFullYear());
  const [status, setStatus] = useState<SeriesStatus>(editingSeries?.status || 'Em Lançamento');
  const [ageRating, setAgeRating] = useState(editingSeries?.ageRating || '14+');
  const [posterUrl, setPosterUrl] = useState(
    editingSeries?.posterUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80'
  );
  const [bannerUrl, setBannerUrl] = useState(
    editingSeries?.bannerUrl || 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80'
  );
  const [genres, setGenres] = useState<string[]>(editingSeries?.genres || ['Anime', 'Ficção Científica']);
  const [genreInput, setGenreInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleGenre = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter((g) => g !== genre));
    } else {
      setGenres([...genres, genre]);
    }
  };

  const handleAddCustomGenre = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && genreInput.trim()) {
      e.preventDefault();
      const val = genreInput.trim();
      if (!genres.includes(val)) {
        setGenres([...genres, val]);
      }
      setGenreInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (!title.trim()) {
        throw new Error('O título da série é obrigatório.');
      }

      const payload: Partial<Series> = {
        title: title.trim(),
        originalTitle: originalTitle.trim(),
        synopsis: synopsis.trim(),
        releaseYear: Number(releaseYear),
        status,
        ageRating,
        posterUrl: posterUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        genres: genres.length > 0 ? genres : ['Série'],
      };

      let saved: Series;
      if (isEditing && editingSeries) {
        saved = await api.updateSeries(editingSeries.id, payload);
      } else {
        saved = await api.createSeries(payload);
      }

      onSuccess(saved);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar série');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-[#0F0F11] border border-white/10 shadow-2xl overflow-hidden my-auto max-h-[92vh] sm:max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#171719]/50">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
              <Film className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                {isEditing ? 'Editar Série' : 'Criar Nova Série / Anime'}
              </h2>
              <p className="text-[11px] sm:text-xs text-white/50 truncate">
                Configure os dados e pôsteres para os visitantes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 flex items-center justify-center flex-shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 sm:space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Título e Título Original */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Título da Série / Anime
              </label>
              <input
                type="text"
                placeholder="Ex: Cyber Neon: Crônicas de Tóquio"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Título Original (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Cyber Neon: Tokyo Chronicles"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Sinopse */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1">
              Sinopse
            </label>
            <textarea
              rows={3}
              placeholder="Descreva o enredo da série, anime ou produção própria..."
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Metadados: Ano, Status, Classificação */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Ano de Lançamento
              </label>
              <input
                type="number"
                min="1950"
                max="2035"
                value={releaseYear}
                onChange={(e) => setReleaseYear(parseInt(e.target.value) || 2024)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SeriesStatus)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Em Lançamento">Em Lançamento</option>
                <option value="Completo">Completo</option>
                <option value="Em Pausa">Em Pausa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                Classificação
              </label>
              <select
                value={ageRating}
                onChange={(e) => setAgeRating(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Livre">Livre</option>
                <option value="10+">10+</option>
                <option value="12+">12+</option>
                <option value="14+">14+</option>
                <option value="16+">16+</option>
                <option value="18+">18+</option>
              </select>
            </div>
          </div>

          {/* Gêneros com tags interativas */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              Gêneros
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_GENRES.map((g) => {
                const selected = genres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      selected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-[#171719] text-white/60 border-white/5 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              placeholder="Digite outro gênero e aperte Enter..."
              value={genreInput}
              onChange={(e) => setGenreInput(e.target.value)}
              onKeyDown={handleAddCustomGenre}
              className="w-full px-3 py-1.5 bg-[#171719] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* URLs de Pôster e Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                URL do Pôster Vertical (3:4)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1">
                URL do Banner Horizontal (16:9)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#171719] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Footer */}
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
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isSubmitting && <Sparkles className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Salvar Alterações' : 'Criar Série'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
