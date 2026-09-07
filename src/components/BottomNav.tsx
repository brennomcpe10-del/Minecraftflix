import React from 'react';
import { Home, Film, CheckCircle2, Shield, Plus } from 'lucide-react';

interface BottomNavProps {
  activeView: 'home' | 'all-series' | 'watching';
  onSelectView: (view: 'home' | 'all-series' | 'watching') => void;
  isAdmin: boolean;
  onOpenAdminModal: () => void;
  onOpenNewSeriesModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onSelectView,
  isAdmin,
  onOpenAdminModal,
  onOpenNewSeriesModal,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0B]/95 backdrop-blur-md border-t border-white/5 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around">
      <button
        onClick={() => onSelectView('home')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] transition-colors ${
          activeView === 'home' ? 'text-blue-400 font-bold' : 'text-white/40 hover:text-white/80'
        }`}
        id="bottom-nav-home"
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span>Início</span>
      </button>

      <button
        onClick={() => onSelectView('all-series')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] transition-colors ${
          activeView === 'all-series' ? 'text-blue-400 font-bold' : 'text-white/40 hover:text-white/80'
        }`}
        id="bottom-nav-series"
      >
        <Film className="w-5 h-5 mb-0.5" />
        <span>Séries</span>
      </button>

      <button
        onClick={() => onSelectView('watching')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] transition-colors ${
          activeView === 'watching' ? 'text-blue-400 font-bold' : 'text-white/40 hover:text-white/80'
        }`}
        id="bottom-nav-watching"
      >
        <CheckCircle2 className="w-5 h-5 mb-0.5" />
        <span>Progresso</span>
      </button>

      {isAdmin ? (
        <button
          onClick={onOpenNewSeriesModal}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] text-amber-400 font-bold"
          id="bottom-nav-new-series"
        >
          <Plus className="w-5 h-5 mb-0.5" />
          <span>+ Série</span>
        </button>
      ) : (
        <button
          onClick={onOpenAdminModal}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] text-white/40 hover:text-white"
          id="bottom-nav-admin"
        >
          <Shield className="w-5 h-5 mb-0.5 text-blue-500" />
          <span>Admin</span>
        </button>
      )}
    </div>
  );
};
