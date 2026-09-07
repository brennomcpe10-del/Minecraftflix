import React from 'react';
import {
  X,
  Film,
  HardDrive,
  UploadCloud,
  Tv,
  Layers,
  CheckCircle2,
  Shield,
  Smartphone,
  Sparkles,
} from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-3xl rounded-2xl sm:rounded-3xl bg-[#0F0F11] border border-white/10 shadow-2xl overflow-hidden my-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#171719]/50">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shadow-lg flex-shrink-0">
              <Film className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-1.5 sm:gap-2 truncate">
                <span>Portal de Episódios</span>
                <span className="text-[10px] sm:text-xs bg-blue-600/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                  Streaming Hub
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-white/50 mt-0.5 truncate">
                Plataforma moderna inspirada nos principais serviços de streaming
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

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-sm text-white/70">
          <div className="p-4 rounded-2xl bg-[#171719] border border-white/5">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              O que é o Portal de Episódios?
            </h3>
            <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
              É uma plataforma web moderna inspirada nos principais serviços de streaming, desenvolvida para que você possa publicar, organizar, assistir e disponibilizar downloads de episódios de séries, animes ou produções próprias, com suporte a múltiplos dispositivos (PC, celular e tablet).
            </p>
          </div>

          {/* Grid de Funcionalidades */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Publicação Flexível */}
            <div className="p-4 rounded-2xl bg-[#171719] border border-white/5">
              <div className="flex items-center gap-2 text-amber-400 font-bold mb-2 text-sm">
                <HardDrive className="w-4 h-4" />
                <span>1. Publicação Flexível</span>
              </div>
              <ul className="text-xs text-white/50 space-y-1.5 list-disc pl-4">
                <li>
                  <strong className="text-white/80">Google Drive:</strong> Cole o link de compartilhamento. O sistema identifica o vídeo, gera a capa e ativa o player HD com download direto.
                </li>
                <li>
                  <strong className="text-white/80">Upload Direto:</strong> Envie MP4, MKV, WebM, MOV, AVI com barra de progresso em tempo real e extração automática de miniaturas via Canvas.
                </li>
                <li>
                  <strong className="text-white/80">Links Web:</strong> Adicione vídeos de qualquer servidor web externo.
                </li>
              </ul>
            </div>

            {/* 2. Player Completo */}
            <div className="p-4 rounded-2xl bg-[#171719] border border-white/5">
              <div className="flex items-center gap-2 text-blue-400 font-bold mb-2 text-sm">
                <Tv className="w-4 h-4" />
                <span>2. Player de Vídeo Completo</span>
              </div>
              <ul className="text-xs text-white/50 space-y-1.5 list-disc pl-4">
                <li>Tela cheia, volume, velocidade (0.5x até 2x) e memorização de ponto de parada.</li>
                <li>
                  <strong className="text-white/80">Navegação Inteligente:</strong> Botões de &quot;Próximo Episódio&quot; e &quot;Episódio Anterior&quot; integrados.
                </li>
                <li>
                  <strong className="text-white/80">Botão de Download:</strong> Baixe o arquivo de vídeo original com um clique.
                </li>
                <li>
                  <strong className="text-white/80">Dados Técnicos:</strong> Duração estimada, tamanho do arquivo e indicador de transmissão (Google Drive HD, Servidor, Web).
                </li>
              </ul>
            </div>

            {/* 3. Séries e Temporadas */}
            <div className="p-4 rounded-2xl bg-[#171719] border border-white/5">
              <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2 text-sm">
                <Layers className="w-4 h-4" />
                <span>3. Séries e Temporadas</span>
              </div>
              <ul className="text-xs text-white/50 space-y-1.5 list-disc pl-4">
                <li>
                  <strong className="text-white/80">Multi-séries:</strong> Gerenciamento com pôster, banner, ano, sinopse e status (Em Lançamento, Completo).
                </li>
                <li>
                  <strong className="text-white/80">Abas de Temporadas:</strong> Filtro rápido por temporadas com contadores de episódios.
                </li>
                <li>
                  <strong className="text-white/80">Busca em Tempo Real:</strong> Encontre episódios instantaneamente por título ou numeração (ex: T01 • E03).
                </li>
              </ul>
            </div>

            {/* 4. Progresso e Acesso */}
            <div className="p-4 rounded-2xl bg-[#171719] border border-white/5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>4. Progresso & Modo Admin</span>
              </div>
              <ul className="text-xs text-white/50 space-y-1.5 list-disc pl-4">
                <li>
                  <strong className="text-white/80">Acompanhamento:</strong> Marcação &quot;Assistido&quot; / &quot;Não assistido&quot; e barra de progresso por série.
                </li>
                <li>
                  <strong className="text-white/80">Badges Visuais:</strong> Indicadores HD, Assistido, Nuvem e Drive.
                </li>
                <li>
                  <strong className="text-white/80">Modo Administrador:</strong> Proteção por senha (padrão: <span className="font-mono text-amber-400 font-bold">admin123</span>) para criar, editar ou excluir.
                </li>
                <li>
                  <strong className="text-white/80">Multi-Aparelhos:</strong> Sincronizado via servidor para PC, celular e tablet.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-end bg-[#0F0F11]">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 min-h-[44px] flex items-center justify-center"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
