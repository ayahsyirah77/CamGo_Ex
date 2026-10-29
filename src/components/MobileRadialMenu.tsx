import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Sparkles,
  MessageSquare,
  Plus,
  Compass,
  Users,
  Menu,
} from 'lucide-react';
import { Language } from '../types';

interface MobileRadialMenuProps {
  language: Language;
  onOpenSos: () => void;
  onOpenMasjidSurau: () => void;
  onOpenAiChat: () => void;
  onOpenChatLounge: () => void;
  onOpenTrailEngine: () => void;
  onOpenFindMyParty: () => void;
  hasNewChat?: boolean;
  onClearNewChat?: () => void;
  hasUrgentSos?: boolean;
  isBeaconActive?: boolean;
  isTrailActive?: boolean;
}

// Crisp Mosque SVG for Masjid & Surau link
const MosqueIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Main Dome Arch */}
    <path d="M7 13c0-3.5 2.2-6 5-6s5 2.5 5 6" />
    {/* Dome Finial Crescent */}
    <path d="M12 4v3" />
    <circle cx="12" cy="3.5" r="1.5" />
    {/* Building Body & Archway Door */}
    <rect x="5" y="13" width="14" height="8" rx="1" />
    <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
    {/* Left Minaret */}
    <path d="M2.5 11h2v10h-2z" />
    <path d="M3.5 8l1 3h-2z" />
    {/* Right Minaret */}
    <path d="M19.5 11h2v10h-2z" />
    <path d="M20.5 8l1 3h-2z" />
  </svg>
);

export const MobileRadialMenu: React.FC<MobileRadialMenuProps> = ({
  language,
  onOpenSos,
  onOpenMasjidSurau,
  onOpenAiChat,
  onOpenChatLounge,
  onOpenTrailEngine,
  onOpenFindMyParty,
  hasNewChat = false,
  onClearNewChat,
  hasUrgentSos = false,
  isBeaconActive = false,
  isTrailActive = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [localBeaconActive, setLocalBeaconActive] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if live beacon session is active in local storage
  useEffect(() => {
    const checkActiveBeacon = () => {
      try {
        const beaconCode = localStorage.getItem('camgo_party_active_session_code');
        setLocalBeaconActive(Boolean(beaconCode));
      } catch (e) {
        setLocalBeaconActive(false);
      }
    };

    checkActiveBeacon();
    const interval = setInterval(checkActiveBeacon, 3000);
    return () => clearInterval(interval);
  }, []);

  // When a new notification/service triggers, reset hasBeenOpened so the logo blinks
  const prevAlertState = useRef({
    hasNewChat: false,
    hasUrgentSos: false,
    beacon: false,
  });

  const isPartyBeaconRunning = Boolean(isBeaconActive || localBeaconActive);
  const isEmergencySosRunning = Boolean(hasUrgentSos);
  const isChatRunning = Boolean(hasNewChat);
  const isTrailRunning = Boolean(isTrailActive);

  useEffect(() => {
    if (
      (!prevAlertState.current.hasNewChat && isChatRunning) ||
      (!prevAlertState.current.hasUrgentSos && isEmergencySosRunning) ||
      (!prevAlertState.current.beacon && isPartyBeaconRunning)
    ) {
      setHasBeenOpened(false);
    }

    prevAlertState.current = {
      hasNewChat: isChatRunning,
      hasUrgentSos: isEmergencySosRunning,
      beacon: isPartyBeaconRunning,
    };
  }, [isChatRunning, isEmergencySosRunning, isPartyBeaconRunning]);

  // Qualified active services (masjid and ai explicitly excluded)
  const isAnyServiceRunning =
    isChatRunning || isPartyBeaconRunning || isEmergencySosRunning || isTrailRunning;

  // The logo icon blinks ONLY if a service is running AND the user has not opened it yet
  const isBlinkingActive = !isOpen && !hasBeenOpened && isAnyServiceRunning;

  // Close menu on outside click or tap
  useEffect(() => {
    const handleOutsideInteraction = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideInteraction);
      document.addEventListener('touchstart', handleOutsideInteraction, { passive: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction);
      document.removeEventListener('touchstart', handleOutsideInteraction);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggleMenu = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    // Once open, the blinks stop!
    if (!isOpen) {
      setHasBeenOpened(true);
      if (hasNewChat && onClearNewChat) {
        onClearNewChat();
      }
    }
  };

  const handleItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
    setHasBeenOpened(true);
  };

  const labels = {
    sos: language === 'bm' ? 'Kecemasan SOS' : 'Emergency SOS',
    party: language === 'bm' ? 'Cari Rakan Kumpulan' : 'Find My Party',
    masjid: language === 'bm' ? 'Masjid & Surau' : 'Masjid / Surau',
    trail: language === 'bm' ? 'Enjin Trail Luar Talian' : 'Offline Trail Engine',
    ai: language === 'bm' ? 'AI CamGo Chat' : 'CamGo AI Chat',
    chat: language === 'bm' ? 'Ruang Sembang' : 'Chat Lounge',
  };

  const menuItems = [
    {
      id: 'sos',
      label: isEmergencySosRunning
        ? language === 'bm'
          ? 'Kecemasan (Amaran Aktif!)'
          : 'Emergency SOS (Alert!)'
        : labels.sos,
      action: onOpenSos,
      x: 0,
      y: -275,
      delay: 20,
      badge: isEmergencySosRunning ? (
        <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block shrink-0" />
      ) : (
        <span className="w-2 h-2 rounded-full bg-red-500/70 inline-block shrink-0" />
      ),
      icon: (
        <ShieldAlert
          className={`w-5 h-5 text-white ${isEmergencySosRunning ? 'animate-pulse' : ''}`}
        />
      ),
      borderClass: isEmergencySosRunning ? 'border-red-400 ring-2 ring-red-500/50' : 'border-red-500/50',
      bgClass: 'bg-gradient-to-tr from-red-600 via-rose-600 to-red-500',
      buttonBorderClass: 'border-red-400/80',
      shadowClass: 'shadow-red-950/80',
    },
    {
      id: 'party',
      label: isPartyBeaconRunning
        ? language === 'bm'
          ? 'Cari Rakan (Suar Aktif)'
          : 'Find My Party (Active Beacon)'
        : labels.party,
      action: onOpenFindMyParty,
      x: -22,
      y: -225,
      delay: 50,
      badge: isPartyBeaconRunning ? (
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
      ) : (
        <span className="w-2 h-2 rounded-full bg-emerald-500/70 inline-block shrink-0" />
      ),
      icon: (
        <Users
          className={`w-5 h-5 text-emerald-100 ${isPartyBeaconRunning ? 'animate-pulse' : ''}`}
        />
      ),
      borderClass: isPartyBeaconRunning
        ? 'border-emerald-400 ring-2 ring-emerald-400/50'
        : 'border-emerald-500/50',
      bgClass: 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600',
      buttonBorderClass: 'border-emerald-400/80',
      shadowClass: 'shadow-emerald-950/80',
    },
    {
      id: 'masjid',
      label: labels.masjid,
      action: onOpenMasjidSurau,
      x: -44,
      y: -175,
      delay: 80,
      badge: <span className="text-sm">🕌</span>,
      icon: <MosqueIcon className="w-5 h-5 text-emerald-100" />,
      borderClass: 'border-emerald-500/50',
      bgClass: 'bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-600',
      buttonBorderClass: 'border-emerald-400/80',
      shadowClass: 'shadow-emerald-950/80',
    },
    {
      id: 'trail',
      label: isTrailRunning
        ? language === 'bm'
          ? 'Trail Engine (Merekod)'
          : 'Trail Engine (Recording)'
        : labels.trail,
      action: onOpenTrailEngine,
      x: -66,
      y: -125,
      delay: 110,
      badge: isTrailRunning ? (
        <Compass className="w-3.5 h-3.5 text-indigo-300 shrink-0 animate-spin" />
      ) : (
        <Compass className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
      ),
      icon: (
        <Compass
          className={`w-5 h-5 text-indigo-100 ${isTrailRunning ? 'animate-pulse' : ''}`}
        />
      ),
      borderClass: isTrailRunning ? 'border-indigo-400 ring-2 ring-indigo-400/50' : 'border-indigo-500/50',
      bgClass: 'bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-600',
      buttonBorderClass: 'border-indigo-400/80',
      shadowClass: 'shadow-indigo-950/80',
    },
    {
      id: 'ai',
      label: labels.ai,
      action: onOpenAiChat,
      x: -88,
      y: -75,
      delay: 140,
      badge: <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
      icon: <Sparkles className="w-5 h-5 text-cyan-100" />,
      borderClass: 'border-cyan-500/50',
      bgClass: 'bg-gradient-to-tr from-teal-600 via-cyan-600 to-emerald-500',
      buttonBorderClass: 'border-cyan-400/80',
      shadowClass: 'shadow-teal-950/80',
    },
    {
      id: 'chat',
      label: isChatRunning
        ? language === 'bm'
          ? 'Ruang Sembang (Mesej Baharu!)'
          : 'Chat Lounge (New Messages!)'
        : labels.chat,
      action: () => {
        if (onClearNewChat) onClearNewChat();
        onOpenChatLounge();
      },
      x: -110,
      y: -25,
      delay: 170,
      badge: isChatRunning ? (
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0 inline-block" />
      ) : (
        <MessageSquare className="w-3.5 h-3.5 text-sky-400 shrink-0" />
      ),
      icon: (
        <MessageSquare
          className={`w-5 h-5 text-sky-100 ${isChatRunning ? 'animate-pulse' : ''}`}
        />
      ),
      borderClass: isChatRunning
        ? 'border-sky-400 ring-2 ring-sky-400/60 shadow-sky-500/40'
        : 'border-sky-500/50',
      bgClass: isChatRunning
        ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-400 animate-pulse'
        : 'bg-gradient-to-tr from-sky-600 via-indigo-600 to-sky-500',
      buttonBorderClass: 'border-sky-400/80',
      shadowClass: 'shadow-indigo-950/80',
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[89] bg-black/45 backdrop-blur-[2px] sm:hidden transition-opacity duration-300 animate-in fade-in"
        />
      )}

      <div
        ref={menuRef}
        className="fixed bottom-6 right-4 z-[90] sm:hidden flex items-center justify-center pointer-events-auto select-none"
      >
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`absolute right-1.5 flex items-center justify-end transition-all duration-300 ease-out ${
              isOpen
                ? 'opacity-100 pointer-events-auto scale-100'
                : 'opacity-0 pointer-events-none scale-50'
            }`}
            style={{
              transform: isOpen ? `translate(${item.x}px, ${item.y}px)` : 'translate(0px, 0px)',
              transitionDelay: isOpen ? `${item.delay}ms` : '0ms',
            }}
          >
            <button
              type="button"
              onClick={() => handleItemClick(item.action)}
              className="flex items-center gap-2 focus:outline-none active:scale-95 transition-transform group cursor-pointer"
            >
              <span
                className={`px-2.5 py-1 rounded-xl bg-stone-900/95 backdrop-blur-md text-stone-100 text-[10px] font-bold border ${item.borderClass} shadow-xl shadow-black/80 whitespace-nowrap flex items-center gap-1 transition-all group-hover:scale-105 select-none`}
              >
                {item.badge}
                <span>{item.label}</span>
              </span>

              <div
                className={`w-11 h-11 rounded-full ${item.bgClass} text-white shadow-xl ${item.shadowClass} border-2 ${item.buttonBorderClass} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
              >
                {item.icon}
              </div>
            </button>
          </div>
        ))}

        {/* Floating Circle Button with Three Horizontal Lines */}
        <button
          onClick={handleToggleMenu}
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close Quick Menu' : 'Open Navigation Menu'}
          className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-all duration-300 focus:outline-none active:scale-95 z-20 ${
            isOpen
              ? 'bg-stone-900 border-2 border-stone-600 text-stone-100 shadow-stone-950/90 rotate-45'
              : isBlinkingActive
              ? isEmergencySosRunning
                ? 'bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 border-2 border-red-300 text-white shadow-red-950/90 ring-4 ring-red-400/60 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse'
                : 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 border-2 border-emerald-300 text-white shadow-emerald-950/90 ring-4 ring-emerald-400/60 shadow-[0_0_25px_rgba(16,185,129,0.8)] animate-pulse'
              : 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 border-2 border-emerald-400/60 text-white shadow-emerald-950/90 hover:scale-105'
          }`}
        >
          {/* Active Ping Beacon Dot (Only visible when a service is actively running and NOT yet opened) */}
          {!isOpen && isBlinkingActive && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-90 ${
                  isEmergencySosRunning ? 'bg-red-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-4 w-4 border-2 border-stone-950 ${
                  isEmergencySosRunning ? 'bg-red-500' : 'bg-emerald-400'
                }`}
              />
            </span>
          )}

          {isOpen ? (
            <Plus className="w-7 h-7 text-stone-200 transition-transform duration-300" />
          ) : (
            <div className="flex items-center justify-center text-center">
              {/* Three horizontal lines icon - blinks if any function/service is running, stops once opened */}
              <Menu
                className={`w-6 h-6 text-white stroke-[2.5] transition-all duration-300 ${
                  isBlinkingActive ? 'animate-pulse scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]' : ''
                }`}
              />
            </div>
          )}
        </button>
      </div>
    </>
  );
};
