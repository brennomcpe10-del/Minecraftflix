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
    <header className="sticky top-0 z-40 w-full bg-[#0A0A0B]/90 backdrop-blur-md border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <button
            onClick={() => onSelectView('home')}
            className="flex items-center gap-2.5 sm:gap-3 group text-left focus:outline-none min-w-0"
            id="brand-logo-btn"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <Film className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-lg font-bold tracking-tight text-white block leading-tight truncate">
                  Portal de Episódios
                </span>
                {isAdmin && (
                  <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[9px] sm:text-[10px] font-bold uppercase rounded border border-amber-500/20 tracking-wider flex-shrink-0">
                    Admin
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-medium text-white/40 tracking-wider uppercase block truncate">
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
        <div className="flex items-center gap-1.5 sm:gap-3 justify-end flex-shrink-0">
          {/* Search Box - responsive width */}
          <div className="relative group w-28 xs:w-36 sm:w-56 md:w-64">
            <Search className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 group-focus-within:text-blue-400 pointer-events-none transition-colors" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-2.5 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-[#171719] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              id="search-episodes-input"
            />
          </div>

          {/* Info Button on Mobile */}
          <button
            onClick={onOpenAboutModal}
            className="md:hidden p-2 rounded-xl bg-[#171719] border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Sobre o Portal"
            id="mobile-nav-about-btn"
          >
            <Info className="w-4 h-4 text-blue-400" />
          </button>

          {/* Admin Mode Controls */}
          {isAdmin ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={onOpenNewSeriesModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all"
                id="admin-new-series-btn"
                title="Adicionar nova série ao portal"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Série</span>
              </button>

              <button
                onClick={onResetData}
                title="Restaurar dados de exemplo"
                className="p-2 rounded-xl bg-[#171719] border border-white/10 text-white/60 hover:text-amber-400 hover:bg-white/5 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                id="admin-reset-data-btn"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                onClick={onLogoutAdmin}
                title="Sair do Modo Administrador"
                className="p-2 rounded-xl bg-[#171719] border border-white/10 text-white/60 hover:text-rose-400 hover:bg-white/5 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                id="admin-logout-btn"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAdminModal}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#171719] hover:bg-white/5 border border-white/10 text-white/70 hover:text-white text-xs font-medium transition-all min-h-[36px]"
              id="admin-login-trigger-btn"
              title="Acessar Modo Administrador"
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
