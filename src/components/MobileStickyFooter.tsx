// MobileStickyFooter.tsx
import React from 'react';
import { Home, Compass, MessageSquare, Sparkles, ShieldAlert } from 'lucide-react';
import { Language } from '../types';

interface MobileStickyFooterProps {
  onGoHome: () => void;
  onOpenTrailEngine: () => void;
  onOpenChat: () => void;
  onOpenAi: () => void;
  onOpenSos: () => void;
  activeModal?: string | null;
  hasNewChat?: boolean;
  language?: Language;
}

export const MobileStickyFooter: React.FC<MobileStickyFooterProps> = ({
  onGoHome,
  onOpenTrailEngine,
  onOpenChat,
  onOpenAi,
  onOpenSos,
  activeModal,
  hasNewChat = true,
  language = 'en',
}) => {
  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden bg-stone-950/92 backdrop-blur-2xl border-t border-white/10 shadow-[0_-8px_25px_rgba(0,0,0,0.8)] px-2 pt-2 pb-3 pb-safe"
    >
      <div className="grid grid-cols-5 items-center justify-between max-w-md mx-auto">
        {/* 1. Home */}
        <button
          onClick={onGoHome}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer group active:scale-95 ${
            !activeModal
              ? 'text-emerald-400'
              : 'text-stone-400 hover:text-stone-200'
          }`}
          aria-label="Home"
        >
          <div className="relative">
            <Home className="w-5 h-5 transition-transform group-hover:scale-110" />
            {!activeModal && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-1 leading-none">
            {language === 'bm' ? 'Utama' : 'Home'}
          </span>
        </button>

        {/* 2. Offline Trail Engine */}
        <button
          onClick={onOpenTrailEngine}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer group active:scale-95 ${
            activeModal === 'trail'
              ? 'text-cyan-400'
              : 'text-stone-400 hover:text-stone-200'
          }`}
          aria-label="Offline Trail Engine"
        >
          <div className="relative">
            <Compass className="w-5 h-5 transition-transform group-hover:scale-110" />
            {activeModal === 'trail' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-1 leading-none">
            {language === 'bm' ? 'Laluan Jejak' : 'Trail'}
          </span>
        </button>

        {/* 3. Community Chat Lounge */}
        <button
          onClick={onOpenChat}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer group active:scale-95 ${
            activeModal === 'chat'
              ? 'text-indigo-400'
              : 'text-stone-400 hover:text-stone-200'
          }`}
          aria-label="Community Chat Lounge"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
            {/* Live Indicator or Unread Dot */}
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border-2 border-stone-950 animate-pulse" />
            {activeModal === 'chat' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-1 leading-none">
            {language === 'bm' ? 'Sembang' : 'Chat'}
          </span>
        </button>

        {/* 4. CamGo AI */}
        <button
          onClick={onOpenAi}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer group active:scale-95 ${
            activeModal === 'ai'
              ? 'text-teal-400'
              : 'text-stone-400 hover:text-stone-200'
          }`}
          aria-label="CamGo AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 transition-transform group-hover:scale-110" />
            {activeModal === 'ai' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.8)]" />
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-1 leading-none">
            CamGo AI
          </span>
        </button>

        {/* 5. SOS Emergency */}
        <button
          onClick={onOpenSos}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer group active:scale-95 ${
            activeModal === 'sos'
              ? 'text-rose-400'
              : 'text-rose-400/90 hover:text-rose-300'
          }`}
          aria-label="Emergency SOS"
        >
          <div className="relative">
            <div className="p-1 rounded-lg bg-rose-600/20 border border-rose-500/40 group-hover:bg-rose-600/30 transition-colors">
              <ShieldAlert className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          </div>
          <span className="text-[10px] font-black tracking-tight mt-1 leading-none text-rose-400">
            SOS
          </span>
        </button>
      </div>
    </nav>
  );
};
