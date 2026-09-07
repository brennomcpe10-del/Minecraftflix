import React from 'react';
import { Film, Shield, ShieldCheck, Plus, Search, Info, RotateCcw, LogOut } from 'lucide-react';

interface NavbarProps {
  isAdmin: boolean;
  onOpenAdminModal: () => void;
  onLogoutAdmin: () => void;
  onOpenNewSeriesModal: () => void;
  onResetData: () => void;
  onOpenAboutModal: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeView: 'home' | 'all-series' | 'watching';
  onSelectView: (view: 'home' | 'all-series' | 'watching') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAdmin,
  onOpenAdminModal,
  onLogoutAdmin,
  onOpenNewSeriesModal,
  onResetData,
  onOpenAboutModal,
  searchQuery,
  onSearchChange,
  activeView,
  onSelectView,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0A0A0B]/85 backdrop-blur-md border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onSelectView('home')}
            className="flex items-center gap-3 group text-left focus:outline-none"
            id="brand-logo-btn"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white block leading-tight">
                  Portal de Episódios
                </span>
                {isAdmin && (
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase rounded border border-amber-500/20 tracking-wider hidden sm:inline-block">
                    Modo Admin
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase block">
                Streaming & Drive Hub
              </span>
            </div>
          </button>

          {/* Navigation links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => onSelectView('home')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeView === 'home'
                  ? 'text-white bg-white/10 border border-white/10 font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              id="nav-home-btn"
            >
              Início
            </button>
            <button
              onClick={() => onSelectView('all-series')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeView === 'all-series'
                  ? 'text-white bg-white/10 border border-white/10 font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              id="nav-series-btn"
            >
              Todas as Séries
            </button>
            <button
              onClick={() => onSelectView('watching')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeView === 'watching'
                  ? 'text-white bg-white/10 border border-white/10 font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              id="nav-watching-btn"
            >
              Meu Progresso
            </button>
            <button
              onClick={onOpenAboutModal}
              className="px-3.5 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
              id="nav-about-btn"
            >
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>O que é?</span>
            </button>
          </nav>
        </div>

        {/* Search Bar & Actions */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-md justify-end">
          {/* Real-time Search */}
          <div className="relative w-full max-w-xs group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-blue-400 pointer-events-none transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar episódio ou série..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-[#171719] border border-white/5 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              id="search-episodes-input"
            />
          </div>

          {/* Admin Mode Controls */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenNewSeriesModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all"
                id="admin-new-series-btn"
                title="Adicionar nova série ao portal"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Série</span>
              </button>

              <div className="sm:hidden flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin</span>
              </div>

              <button
                onClick={onResetData}
                title="Restaurar dados de exemplo"
                className="p-2 rounded-lg bg-[#171719] border border-white/5 text-white/60 hover:text-amber-400 hover:bg-white/5 transition-colors"
                id="admin-reset-data-btn"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={onLogoutAdmin}
                title="Sair do Modo Administrador"
                className="p-2 rounded-lg bg-[#171719] border border-white/5 text-white/60 hover:text-rose-400 hover:bg-white/5 transition-colors"
                id="admin-logout-btn"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAdminModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#171719] hover:bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all"
              id="admin-login-trigger-btn"
              title="Acessar Modo Administrador com senha"
            >
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Modo Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
