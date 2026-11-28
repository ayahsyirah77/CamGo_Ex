// MobileStickyFooter.tsx
import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Home,
  MessageSquare,
  ScanText,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Language } from '../types';

interface MobileStickyFooterProps {
  onGoHome: () => void;
  onOpenDirectories?: () => void;
  onOpenChat: () => void;
  onOpenTranslator: () => void;
  onOpenAi: () => void;
  onOpenSos: () => void;
  activeModal?: string | null;
  hasNewChat?: boolean;
  language?: Language;
}

export const MobileStickyFooter: React.FC<MobileStickyFooterProps> = ({
  onGoHome,
  onOpenChat,
  onOpenTranslator,
  onOpenAi,
  onOpenSos,
  activeModal,
  hasNewChat = true,
  language = 'en',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [sosActive, setSosActive] = useState(false);

  useEffect(() => {
    if (activeModal) {
      setSosActive(false);
    }
  }, [activeModal]);

  const activeKey = sosActive ? 'sos' : activeModal || 'home';
  const isBm = language === 'bm';

  return (
    <motion.nav
      aria-label="Mobile Bottom Navigation"
      initial={prefersReducedMotion ? false : { y: 64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden h-16 bg-stone-950/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.65)] px-1 pb-safe"
    >
      <div className="grid grid-cols-5 items-center h-full max-w-lg mx-auto">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => {
            setSosActive(false);
            onGoHome();
          }}
          aria-label="Home"
          className={`relative flex flex-col items-center justify-center gap-0.5 h-full py-1 cursor-pointer select-none active:scale-95 transition-all ${
            activeKey === 'home' ? 'text-emerald-400' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          {activeKey === 'home' && (
            <span className="absolute top-0 w-7 h-0.5 rounded-full bg-emerald-400" />
          )}
          <Home className="w-[18px] h-[18px]" strokeWidth={activeKey === 'home' ? 2.3 : 1.8} />
          <span className="no-mobile-clamp text-[10px] font-bold leading-none tracking-tight">
            {isBm ? 'Utama' : 'Home'}
          </span>
        </button>

        {/* 2. Community Chat */}
        <button
          type="button"
          onClick={() => {
            setSosActive(false);
            onOpenChat();
          }}
          aria-label="Community Chat"
          className={`relative flex flex-col items-center justify-center gap-0.5 h-full py-1 cursor-pointer select-none active:scale-95 transition-all ${
            activeKey === 'chat' ? 'text-emerald-400' : 'text-stone-300 hover:text-white'
          }`}
        >
          {activeKey === 'chat' && (
            <span className="absolute top-0 w-7 h-0.5 rounded-full bg-emerald-400" />
          )}
          <div className="relative">
            <MessageSquare className="w-[18px] h-[18px]" strokeWidth={activeKey === 'chat' ? 2.3 : 1.8} />
            {hasNewChat && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-stone-950 animate-pulse" />
            )}
          </div>
          <span className="no-mobile-clamp text-[10px] font-bold leading-none tracking-tight">
            {isBm ? 'Sembang' : 'Chat'}
          </span>
        </button>

        {/* 3. Translator (Menu & Signboard Translator) */}
        <button
          type="button"
          onClick={() => {
            setSosActive(false);
            onOpenTranslator();
          }}
          aria-label="Menu and Signboard Translator"
          className={`relative flex flex-col items-center justify-center gap-0.5 h-full py-1 cursor-pointer select-none active:scale-95 transition-all ${
            activeKey === 'translator' ? 'text-teal-400' : 'text-stone-300 hover:text-teal-300'
          }`}
        >
          {activeKey === 'translator' && (
            <span className="absolute top-0 w-7 h-0.5 rounded-full bg-teal-400" />
          )}
          <ScanText className="w-[18px] h-[18px]" strokeWidth={activeKey === 'translator' ? 2.3 : 1.8} />
          <span className="no-mobile-clamp text-[10px] font-bold leading-none tracking-tight">
            Translator
          </span>
        </button>

        {/* 4. CamGo AI */}
        <button
          type="button"
          onClick={() => {
            setSosActive(false);
            onOpenAi();
          }}
          aria-label="CamGo AI"
          className={`relative flex flex-col items-center justify-center gap-0.5 h-full py-1 cursor-pointer select-none active:scale-95 transition-all ${
            activeKey === 'ai' ? 'text-sky-400' : 'text-stone-400 hover:text-sky-300'
          }`}
        >
          {activeKey === 'ai' && (
            <span className="absolute top-0 w-7 h-0.5 rounded-full bg-sky-400" />
          )}
          <Sparkles className="w-[18px] h-[18px]" strokeWidth={activeKey === 'ai' ? 2.3 : 1.8} />
          <span className="no-mobile-clamp text-[10px] font-bold leading-none tracking-tight">
            CamGo AI
          </span>
        </button>

        {/* 5. SOS */}
        <button
          type="button"
          onClick={() => {
            setSosActive(true);
            onOpenSos();
            setTimeout(() => setSosActive(false), 1800);
          }}
          aria-label="Emergency SOS"
          className={`relative flex flex-col items-center justify-center gap-0.5 h-full py-1 cursor-pointer select-none active:scale-95 transition-all ${
            activeKey === 'sos'
              ? 'text-rose-300 bg-rose-500/15'
              : 'text-rose-400 hover:text-rose-300'
          }`}
        >
          {activeKey === 'sos' && (
            <span className="absolute top-0 w-7 h-0.5 rounded-full bg-rose-500" />
          )}
          <div className="relative">
            <ShieldAlert className="w-[18px] h-[18px]" strokeWidth={2.2} />
            {activeKey !== 'sos' && (
              <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <span className="no-mobile-clamp text-[10px] font-extrabold leading-none tracking-tight">
            SOS
          </span>
        </button>
      </div>
    </motion.nav>
  );
};
