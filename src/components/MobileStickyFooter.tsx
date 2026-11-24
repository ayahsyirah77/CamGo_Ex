// MobileStickyFooter.tsx
import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Home, MessageSquare, Sparkles, ShieldAlert, BookOpen, Languages } from 'lucide-react';
import { Language } from '../types';

interface MobileStickyFooterProps {
  onGoHome: () => void;
  onOpenTrailEngine?: () => void;
  onOpenDirectories: () => void;
  onOpenChat: () => void;
  onOpenTranslator?: () => void;
  onOpenAi: () => void;
  onOpenSos: () => void;
  activeModal?: string | null;
  hasNewChat?: boolean;
  language?: Language;
}

export const MobileStickyFooter: React.FC<MobileStickyFooterProps> = ({
  onGoHome,
  onOpenDirectories,
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
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useEffect(() => {
    if (activeModal) {
      setSosActive(false);
    }
  }, [activeModal]);

  const activeKey = sosActive ? 'sos' : activeModal || 'home';
  const orbTargetKey = hoveredKey || activeKey;

  const items = [
    {
      key: 'home',
      onClick: () => {
        setSosActive(false);
        onGoHome();
      },
      label: language === 'bm' ? 'Utama' : 'Home',
      ariaLabel: 'Home',
      icon: Home,
      activeText: 'text-emerald-300',
      orbColor: 'bg-emerald-500/35 border-emerald-400/75 shadow-[0_0_18px_rgba(52,211,153,0.55)]',
    },
    {
      key: 'directories',
      onClick: () => {
        setSosActive(false);
        onOpenDirectories();
      },
      label: language === 'bm' ? 'Direktori' : 'Dir',
      ariaLabel: 'Highland Directories',
      icon: BookOpen,
      activeText: 'text-amber-300',
      orbColor: 'bg-amber-500/35 border-amber-400/75 shadow-[0_0_18px_rgba(251,191,36,0.55)]',
    },
    {
      key: 'chat',
      onClick: () => {
        setSosActive(false);
        onOpenChat();
      },
      label: language === 'bm' ? 'Sembang' : 'Chat',
      ariaLabel: 'Community Chat Lounge',
      icon: MessageSquare,
      activeText: 'text-indigo-300',
      orbColor: 'bg-indigo-500/35 border-indigo-400/75 shadow-[0_0_18px_rgba(129,140,248,0.55)]',
      hasBadge: hasNewChat,
    },
    {
      key: 'translator',
      onClick: () => {
        setSosActive(false);
        onOpenTranslator && onOpenTranslator();
      },
      label: 'Translator',
      ariaLabel: 'AI Menu & Signboard Translator',
      icon: Languages,
      activeText: 'text-amber-300',
      orbColor: 'bg-amber-500/35 border-amber-400/75 shadow-[0_0_18px_rgba(251,191,36,0.55)]',
    },
    {
      key: 'ai',
      onClick: () => {
        setSosActive(false);
        onOpenAi();
      },
      label: 'CamGo AI',
      ariaLabel: 'CamGo AI Assistant',
      icon: Sparkles,
      activeText: 'text-teal-300',
      orbColor: 'bg-teal-500/35 border-teal-400/75 shadow-[0_0_18px_rgba(45,212,191,0.55)]',
    },
    {
      key: 'sos',
      onClick: () => {
        setSosActive(true);
        onOpenSos();
        setTimeout(() => setSosActive(false), 1800);
      },
      label: 'SOS',
      ariaLabel: 'Emergency SOS',
      icon: ShieldAlert,
      activeText: 'text-rose-300',
      inactiveText: 'text-rose-400/90',
      orbColor: 'bg-rose-500/35 border-rose-400/80 shadow-[0_0_18px_rgba(244,63,94,0.6)]',
      isSos: true,
    },
  ];

  return (
    <motion.nav
      aria-label="Mobile Bottom Navigation"
      initial={prefersReducedMotion ? false : { y: 64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      onMouseLeave={() => setHoveredKey(null)}
      className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden bg-stone-950/95 backdrop-blur-2xl border-t border-white/15 shadow-[0_-8px_25px_rgba(0,0,0,0.8)] px-1 h-16 pb-safe overflow-hidden"
    >
      <div className="grid grid-cols-6 items-center h-full max-w-lg mx-auto relative">
        {items.map((item) => {
          const isActive = activeKey === item.key;
          const isOrbHere = orbTargetKey === item.key;
          const isHighlighted = isActive || isOrbHere;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              onMouseEnter={() => setHoveredKey(item.key)}
              onFocus={() => setHoveredKey(item.key)}
              onBlur={() => setHoveredKey(null)}
              onTouchStart={() => setHoveredKey(item.key)}
              onTouchEnd={() => setHoveredKey(null)}
              onTouchCancel={() => setHoveredKey(null)}
              aria-label={item.ariaLabel}
              className="relative flex flex-col items-center justify-center h-full py-1 px-0.5 cursor-pointer select-none focus:outline-none group"
            >
              {/* Contained Icon Slot with Visibly Gliding Circular Orb Inside Footer */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                {isOrbHere && (
                  <motion.div
                    layoutId="stickyNavActiveDome"
                    transition={
                      prefersReducedMotion
                        ? { duration: 0.12 }
                        : {
                            type: 'spring',
                            stiffness: 340,
                            damping: 26,
                          }
                    }
                    className={`pointer-events-none absolute inset-0 rounded-full border-2 ${item.orbColor} z-0`}
                  />
                )}

                <motion.div
                  animate={
                    prefersReducedMotion
                      ? { scale: isHighlighted ? 1.08 : 1 }
                      : {
                          y: isHighlighted ? -1.5 : 0,
                          scale: isHighlighted ? 1.15 : 1,
                        }
                  }
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.86 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 24,
                  }}
                  className={`relative z-10 flex items-center justify-center transition-colors duration-200 ${
                    isHighlighted
                      ? item.activeText
                      : item.inactiveText || 'text-stone-400 group-hover:text-stone-200'
                  }`}
                >
                  <Icon
                    className="w-[19px] h-[19px]"
                    strokeWidth={isHighlighted ? 2.3 : 1.75}
                  />

                  {/* Live indicator dot on Chat */}
                  {item.hasBadge && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 border border-stone-950" />
                    </span>
                  )}

                  {/* Subtle emergency beacon on SOS */}
                  {item.isSos && !isHighlighted && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  )}
                </motion.div>
              </div>

              {/* Tab Label */}
              <motion.span
                animate={{
                  opacity: isHighlighted ? 1 : 0.78,
                }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`relative z-10 text-[8.5px] min-[375px]:text-[9px] leading-none tracking-tight mt-0.5 truncate max-w-[54px] ${
                  isHighlighted
                    ? `font-extrabold ${item.activeText}`
                    : item.isSos
                    ? 'font-bold text-rose-400/90'
                    : 'font-semibold text-stone-400'
                }`}
              >
                {item.label}
              </motion.span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
};
