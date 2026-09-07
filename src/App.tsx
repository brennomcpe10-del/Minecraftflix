/**
 * Portal de Episódios - Plataforma moderna de Streaming e Gerenciamento de Séries
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Film,
  Sparkles,
  Plus,
  Layers,
  CheckCircle2,
  Tv,
  Clock,
  HardDrive,
  Shield,
  Search,
  Filter,
  Play,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { Series, Episode } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { HeroBanner } from './components/HeroBanner';
import { SeriesCard } from './components/SeriesCard';
import { EpisodeCard } from './components/EpisodeCard';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { SeriesDetailModal } from './components/SeriesDetailModal';
import { AddEpisodeModal } from './components/AddEpisodeModal';
import { SeriesFormModal } from './components/SeriesFormModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AboutModal } from './components/AboutModal';

export default function App() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navegação e Busca
  const [activeView, setActiveView] = useState<'home' | 'all-series' | 'watching'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Todos');

  // Modais de Reprodução & Detalhes
  const [selectedSeriesForDetail, setSelectedSeriesForDetail] = useState<Series | null>(null);
  const [activePlayingSeries, setActivePlayingSeries] = useState<Series | null>(null);
  const [activePlayingEpisode, setActivePlayingEpisode] = useState<Episode | null>(null);

  // Modo Administrador
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);

  // Modais de Criação e Edição
  const [showSeriesFormModal, setShowSeriesFormModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);

  const [showAddEpisodeModal, setShowAddEpisodeModal] = useState(false);
  const [addEpisodeSeries, setAddEpisodeSeries] = useState<Series | null>(null);
  const [addEpisodeSeason, setAddEpisodeSeason] = useState<number>(1);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);

  // Modal Informativo
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Gatilho de re-renderização para progresso local
  const [watchedRevision, setWatchedRevision] = useState(0);

  // Carregar dados de séries e estado de autenticação
  const loadSeries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getSeries();
      setSeriesList(data);
    } catch (err: any) {
      console.error('Erro ao carregar séries:', err);
      setError('Não foi possível conectar ao servidor. Verifique a conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSeries();
    setIsAdmin(api.isAdminAuthenticated());
  }, [loadSeries]);

  // Logout admin
  const handleLogoutAdmin = () => {
    api.logoutAdmin();
    setIsAdmin(false);
  };

  // Resetar dados de demonstração
  const handleResetData = async () => {
    if (confirm('Deseja restaurar todas as séries e episódios para o estado inicial padrão?')) {
      try {
        await api.resetData();
        await loadSeries();
        setSelectedSeriesForDetail(null);
      } catch (err: any) {
        alert(err.message || 'Erro ao restaurar dados');
      }
    }
  };

  // Verificação de episódio assistido
  const isEpisodeWatched = useCallback(
    (episodeId: string) => {
      // watchedRevision serve como dependência reativa
      void watchedRevision;
      return api.isEpisodeWatched(episodeId);
    },
    [watchedRevision]
  );

  // Alternar status assistido
  const handleToggleWatched = (episodeId: string) => {
    // Achar a série correspondente
    let targetSeriesId = '';
    for (const s of seriesList) {
      if (s.episodes.some((e) => e.id === episodeId)) {
        targetSeriesId = s.id;
        break;
      }
    }
    api.toggleEpisodeWatched(episodeId, targetSeriesId);
    setWatchedRevision((prev) => prev + 1);
  };

  // Contagem de assistidos por série
  const getWatchedCountForSeries = useCallback(
    (series: Series) => {
      void watchedRevision;
      return series.episodes.filter((e) => api.isEpisodeWatched(e.id)).length;
    },
    [watchedRevision]
  );

  // Séries em destaque
  const featuredSeries = useMemo(() => {
    return seriesList.find((s) => s.featured) || seriesList[0] || null;
  }, [seriesList]);

  // Todos os gêneros disponíveis
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    seriesList.forEach((s) => s.genres.forEach((g) => set.add(g)));
    return ['Todos', ...Array.from(set)];
  }, [seriesList]);

  // Lista de episódios recentemente assistidos ou em progresso
  const recentlyWatchedEpisodes = useMemo(() => {
    void watchedRevision;
    const progressMap = api.getProgressMap();
    const list: { series: Series; episode: Episode; lastWatchedAt: string }[] = [];

    seriesList.forEach((s) => {
      s.episodes.forEach((ep) => {
        const prog = progressMap[ep.id];
        if (prog) {
          list.push({
            series: s,
            episode: ep,
            lastWatchedAt: prog.lastWatchedAt || '',
          });
        }
      });
    });

    return list.sort(
      (a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime()
    );
  }, [seriesList, watchedRevision]);

  // Filtragem de séries para a aba "Todas as Séries"
  const filteredSeriesList = useMemo(() => {
    return seriesList.filter((s) => {
      if (selectedGenre !== 'Todos' && !s.genres.includes(selectedGenre)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchOriginal = s.originalTitle?.toLowerCase().includes(q) || false;
        const matchSynopsis = s.synopsis.toLowerCase().includes(q);
        const matchGenre = s.genres.some((g) => g.toLowerCase().includes(q));
        const matchEp = s.episodes.some(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            `t${e.seasonNumber} e${e.episodeNumber}`.toLowerCase().includes(q)
        );
        return matchTitle || matchOriginal || matchSynopsis || matchGenre || matchEp;
      }
      return true;
    });
  }, [seriesList, selectedGenre, searchQuery]);

  // Reproduzir episódio
  const handlePlayEpisode = (series: Series, episode: Episode) => {
    setActivePlayingSeries(series);
    setActivePlayingEpisode(episode);
  };

  // Abrir detalhes da série
  const handleOpenDetails = (series: Series) => {
    setSelectedSeriesForDetail(series);
  };

  // Sucesso ao salvar série
  const handleSeriesSaved = (saved: Series) => {
    setSeriesList((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    if (selectedSeriesForDetail?.id === saved.id) {
      setSelectedSeriesForDetail(saved);
    }
  };

  // Sucesso ao excluir série
  const handleDeleteSeries = async (seriesId: string) => {
    try {
      await api.deleteSeries(seriesId);
      setSeriesList((prev) => prev.filter((s) => s.id !== seriesId));
      if (selectedSeriesForDetail?.id === seriesId) {
        setSelectedSeriesForDetail(null);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir série');
    }
  };

  // Sucesso ao salvar episódio
  const handleEpisodeSaved = (savedEpisode: Episode) => {
    setSeriesList((prev) => {
      return prev.map((s) => {
        if (s.id !== savedEpisode.seriesId) return s;
        const epIndex = s.episodes.findIndex((e) => e.id === savedEpisode.id);
        let nextEpisodes: Episode[];
        if (epIndex >= 0) {
          nextEpisodes = [...s.episodes];
          nextEpisodes[epIndex] = savedEpisode;
        } else {
          nextEpisodes = [...s.episodes, savedEpisode];
        }
        return {
          ...s,
          episodes: nextEpisodes,
          totalSeasons: Math.max(s.totalSeasons, savedEpisode.seasonNumber),
        };
      });
    });

    // Atualizar série selecionada no modal se aberto
    if (selectedSeriesForDetail && selectedSeriesForDetail.id === savedEpisode.seriesId) {
      setSelectedSeriesForDetail((prev) => {
        if (!prev) return null;
        const epIndex = prev.episodes.findIndex((e) => e.id === savedEpisode.id);
        const nextEpisodes =
          epIndex >= 0
            ? prev.episodes.map((e) => (e.id === savedEpisode.id ? savedEpisode : e))
            : [...prev.episodes, savedEpisode];
        return {
          ...prev,
          episodes: nextEpisodes,
          totalSeasons: Math.max(prev.totalSeasons, savedEpisode.seasonNumber),
        };
      });
    }

    // Se estiver reproduzindo este episódio, atualizar player
    if (activePlayingEpisode?.id === savedEpisode.id) {
      setActivePlayingEpisode(savedEpisode);
    }
  };

  // Excluir episódio
  const handleDeleteEpisode = async (episodeId: string) => {
    if (!selectedSeriesForDetail) return;
    try {
      await api.deleteEpisode(selectedSeriesForDetail.id, episodeId);
      setSelectedSeriesForDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          episodes: prev.episodes.filter((e) => e.id !== episodeId),
        };
      });
      setSeriesList((prev) => {
        return prev.map((s) => {
          if (s.id !== selectedSeriesForDetail.id) return s;
          return {
            ...s,
            episodes: s.episodes.filter((e) => e.id !== episodeId),
          };
        });
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir episódio');
    }
  };

  // Abrir modal de adicionar episódio
  const handleOpenAddEpisodeModal = (series: Series, seasonNum = 1) => {
    setAddEpisodeSeries(series);
    setAddEpisodeSeason(seasonNum);
    setEditingEpisode(null);
    setShowAddEpisodeModal(true);
  };

  // Abrir modal de editar episódio
  const handleOpenEditEpisodeModal = (episode: Episode) => {
    const parent = seriesList.find((s) => s.id === episode.seriesId);
    if (!parent) return;
    setAddEpisodeSeries(parent);
    setAddEpisodeSeason(episode.seasonNumber);
    setEditingEpisode(episode);
    setShowAddEpisodeModal(true);
  };

  // Estatísticas do Usuário
  const totalWatchedCount = useMemo(() => {
    void watchedRevision;
    return seriesList.reduce((acc, s) => {
      return acc + s.episodes.filter((e) => api.isEpisodeWatched(e.id)).length;
    }, 0);
  }, [seriesList, watchedRevision]);

  const totalEpisodesCount = useMemo(() => {
    return seriesList.reduce((acc, s) => acc + s.episodes.length, 0);
  }, [seriesList]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E5E7EB] flex flex-col pb-16 md:pb-0">
      {/* Navbar Superior */}
      <Navbar
        isAdmin={isAdmin}
        onOpenAdminModal={() => setShowAdminLoginModal(true)}
        onLogoutAdmin={handleLogoutAdmin}
        onOpenNewSeriesModal={() => {
          setEditingSeries(null);
          setShowSeriesFormModal(true);
        }}
        onResetData={handleResetData}
        onOpenAboutModal={() => setShowAboutModal(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={activeView}
        onSelectView={setActiveView}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading & Error States */}
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center text-white/40">
            <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin mb-4" />
            <p className="text-sm font-semibold text-white/60">Carregando catálogo do Portal de Episódios...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-center my-8 max-w-md mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <h3 className="font-bold text-base mb-1">Aviso de Conexão</h3>
            <p className="text-xs text-rose-300/80 mb-4">{error}</p>
            <button
              onClick={loadSeries}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* VIEW 1: INÍCIO (HOME) */}
            {activeView === 'home' && (
              <div className="space-y-10">
                {/* Hero Banner do Destaque */}
                {featuredSeries && (
                  <HeroBanner
                    series={featuredSeries}
                    onPlayEpisode={handlePlayEpisode}
                    onOpenDetails={handleOpenDetails}
                  />
                )}

                {/* Continuar Assistindo Shelf (se houver histórico) */}
                {recentlyWatchedEpisodes.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-400" />
                        <span>Continuar Assistindo</span>
                      </h2>
                      <button
                        onClick={() => setActiveView('watching')}
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                      >
                        Ver todos ({recentlyWatchedEpisodes.length}) →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recentlyWatchedEpisodes.slice(0, 3).map(({ series, episode }) => (
                        <EpisodeCard
                          key={episode.id}
                          episode={episode}
                          series={series}
                          isWatched={isEpisodeWatched(episode.id)}
                          onToggleWatched={handleToggleWatched}
                          onPlay={handlePlayEpisode}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Catálogo de Séries e Animes */}
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <Film className="w-5 h-5 text-blue-400" />
                        <span>Catálogo Disponível</span>
                      </h2>
                      <p className="text-xs text-white/50 mt-0.5">
                        Assista online ou baixe os episódios originais direto do Google Drive ou Servidor
                      </p>
                    </div>

                    {/* Admin Add Series Quick Button */}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setEditingSeries(null);
                          setShowSeriesFormModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
                        id="home-new-series-btn"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Nova Série</span>
                      </button>
                    )}
                  </div>

                  {/* Grid de Séries */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {seriesList.map((series) => (
                      <SeriesCard
                        key={series.id}
                        series={series}
                        watchedCount={getWatchedCountForSeries(series)}
                        onOpenDetails={handleOpenDetails}
                        onPlayEpisode={handlePlayEpisode}
                        isAdmin={isAdmin}
                        onEditSeries={(s) => {
                          setEditingSeries(s);
                          setShowSeriesFormModal(true);
                        }}
                        onDeleteSeries={handleDeleteSeries}
                      />
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* VIEW 2: TODAS AS SÉRIES */}
            {activeView === 'all-series' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Todas as Séries & Animes</h1>
                    <p className="text-xs text-white/50 mt-1">
                      Explore as temporadas, filtre por gênero e pesquise por títulos ou episódios
                    </p>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setEditingSeries(null);
                        setShowSeriesFormModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Série</span>
                    </button>
                  )}
                </div>

                {/* Genre Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {allGenres.map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGenre(g)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedGenre === g
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'bg-[#0F0F11] text-white/50 border border-white/5 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                {/* Grid */}
                {filteredSeriesList.length === 0 ? (
                  <div className="py-20 text-center text-white/40">
                    <p className="text-base font-semibold mb-1 text-white/60">Nenhuma série encontrada.</p>
                    <p className="text-xs text-white/40">
                      Tente alterar os termos de busca ou selecionar outro gênero.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSeriesList.map((series) => (
                      <SeriesCard
                        key={series.id}
                        series={series}
                        watchedCount={getWatchedCountForSeries(series)}
                        onOpenDetails={handleOpenDetails}
                        onPlayEpisode={handlePlayEpisode}
                        isAdmin={isAdmin}
                        onEditSeries={(s) => {
                          setEditingSeries(s);
                          setShowSeriesFormModal(true);
                        }}
                        onDeleteSeries={handleDeleteSeries}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: MEU PROGRESSO (WATCHING) */}
            {activeView === 'watching' && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-5">
                  <h1 className="text-2xl font-bold text-white">Meu Progresso</h1>
                  <p className="text-xs text-white/50 mt-1">
                    Acompanhe os episódios marcados como assistidos e retome de onde parou
                  </p>
                </div>

                {/* Overview Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-[#0F0F11] border border-white/10">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-semibold">Episódios Assistidos</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">
                      {totalWatchedCount}{' '}
                      <span className="text-xs text-white/40 font-normal">/ {totalEpisodesCount}</span>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0F0F11] border border-white/10">
                    <div className="flex items-center gap-2 text-blue-400 mb-1.5">
                      <Tv className="w-4 h-4" />
                      <span className="text-xs font-semibold">Total de Séries</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">
                      {seriesList.length}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0F0F11] border border-white/10 col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2 text-amber-400 mb-1.5">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-semibold">Taxa de Conclusão</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">
                      {totalEpisodesCount > 0
                        ? `${Math.round((totalWatchedCount / totalEpisodesCount) * 100)}%`
                        : '0%'}
                    </div>
                  </div>
                </div>

                {/* List of episodes with progress */}
                {recentlyWatchedEpisodes.length === 0 ? (
                  <div className="py-20 text-center text-white/40 bg-[#0F0F11] rounded-3xl border border-white/10 p-8">
                    <CheckCircle2 className="w-10 h-10 text-white/20 mx-auto mb-3" />
                    <p className="text-base font-semibold text-white/70 mb-1">
                      Você ainda não marcou nenhum episódio como assistido.
                    </p>
                    <p className="text-xs text-white/40 max-w-sm mx-auto mb-4">
                      Ao assistir vídeos ou clicar em &quot;Marcar como Assistido&quot;, seus episódios e tempo de reprodução serão exibidos aqui.
                    </p>
                    <button
                      onClick={() => setActiveView('home')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-600/20"
                    >
                      Explorar Catálogo
                    </button>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-base font-bold text-white mb-4">
                      Histórico e Episódios Salvos ({recentlyWatchedEpisodes.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {recentlyWatchedEpisodes.map(({ series, episode }) => (
                        <EpisodeCard
                          key={episode.id}
                          episode={episode}
                          series={series}
                          isWatched={isEpisodeWatched(episode.id)}
                          onToggleWatched={handleToggleWatched}
                          onPlay={handlePlayEpisode}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeView={activeView}
        onSelectView={setActiveView}
        isAdmin={isAdmin}
        onOpenAdminModal={() => setShowAdminLoginModal(true)}
        onOpenNewSeriesModal={() => {
          setEditingSeries(null);
          setShowSeriesFormModal(true);
        }}
      />

      {/* --- MODAIS DO SISTEMA --- */}

      {/* 1. Modal do Player de Vídeo Completo */}
      {activePlayingSeries && activePlayingEpisode && (
        <VideoPlayerModal
          series={activePlayingSeries}
          episode={activePlayingEpisode}
          onClose={() => {
            setActivePlayingSeries(null);
            setActivePlayingEpisode(null);
          }}
          onSelectEpisode={(ep) => setActivePlayingEpisode(ep)}
          isWatched={isEpisodeWatched(activePlayingEpisode.id)}
          onToggleWatched={handleToggleWatched}
        />
      )}

      {/* 2. Modal de Detalhes da Série (Abas de Temporadas e Lista) */}
      {selectedSeriesForDetail && (
        <SeriesDetailModal
          series={selectedSeriesForDetail}
          onClose={() => setSelectedSeriesForDetail(null)}
          onPlayEpisode={handlePlayEpisode}
          isEpisodeWatched={isEpisodeWatched}
          onToggleWatched={handleToggleWatched}
          isAdmin={isAdmin}
          onOpenAddEpisodeModal={(s, seasonNum) => handleOpenAddEpisodeModal(s, seasonNum)}
          onEditSeries={(s) => {
            setEditingSeries(s);
            setShowSeriesFormModal(true);
          }}
          onDeleteSeries={handleDeleteSeries}
          onEditEpisode={handleOpenEditEpisodeModal}
          onDeleteEpisode={handleDeleteEpisode}
        />
      )}

      {/* 3. Modal de Publicação Flexível de Episódios (Google Drive, Upload, Web) */}
      {showAddEpisodeModal && addEpisodeSeries && (
        <AddEpisodeModal
          series={addEpisodeSeries}
          initialSeasonNumber={addEpisodeSeason}
          editingEpisode={editingEpisode}
          onClose={() => {
            setShowAddEpisodeModal(false);
            setEditingEpisode(null);
          }}
          onSuccess={handleEpisodeSaved}
        />
      )}

      {/* 4. Modal de Criação e Edição de Série */}
      {showSeriesFormModal && (
        <SeriesFormModal
          editingSeries={editingSeries}
          onClose={() => {
            setShowSeriesFormModal(false);
            setEditingSeries(null);
          }}
          onSuccess={handleSeriesSaved}
        />
      )}

      {/* 5. Modal de Login do Modo Administrador */}
      {showAdminLoginModal && (
        <AdminLoginModal
          onClose={() => setShowAdminLoginModal(false)}
          onSuccess={() => setIsAdmin(true)}
        />
      )}

      {/* 6. Modal Informativo "O que é o Portal de Episódios?" */}
      {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
    </div>
  );
}
