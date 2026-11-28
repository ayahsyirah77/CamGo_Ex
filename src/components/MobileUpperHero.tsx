import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  MapPin,
  Compass,
  Calendar,
  Building2,
  Globe,
  Bell,
  BellRing,
  Store,
  LogIn,
} from 'lucide-react';
import {
  Language,
  Place,
  EventNotification,
  Township,
  TrafficAlert,
  HazardAlert,
} from '../types';
import { UserProfile, firebaseService } from '../services/firebase';
import { safeSrc, DEFAULT_PLACE_IMAGE, DEFAULT_AVATAR_IMAGE } from '../utils/safeMedia';
import { WebSearchResultsBlock, useWebSearch } from './WebSearchResultsBlock';
import { CamLogo } from './CamLogo';

interface MobileUpperHeroProps {
  language: Language;
  currentUser: UserProfile | null;
  places: Place[];
  events: EventNotification[];
  trafficAlerts: TrafficAlert[];
  hazards: HazardAlert[];
  vendorAlertCount?: number;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  onOpenMap: () => void;
  onOpenTraffic: () => void;
  onOpenChat: () => void;
  onOpenDirectories: () => void;
  onOpenPortals: () => void;
  onOpenSos: () => void;
  onOpenVendorPortal?: () => void;
  onOpenVendorAlerts?: () => void;
  onSelectPlace?: (place: Place) => void;
  onSelectEvent?: (event: EventNotification) => void;
  onSelectTownship?: (township: Township) => void;
}

const ALL_TOWNSHIPS: Township[] = [
  'Ringlet',
  'Bertam Valley',
  'Habu',
  'Tanah Rata',
  'Brinchang',
  'Kea Farm',
  'Tringkap',
  'Kuala Terla',
  'Kampung Raja',
];

export const MobileUpperHero: React.FC<MobileUpperHeroProps> = ({
  language,
  currentUser,
  places,
  events,
  trafficAlerts,
  hazards,
  vendorAlertCount = 0,
  onOpenAuth,
  onOpenAdmin,
  onOpenMap,
  onOpenTraffic,
  onOpenChat,
  onOpenDirectories,
  onOpenPortals,
  onOpenSos,
  onOpenVendorPortal,
  onOpenVendorAlerts,
  onSelectPlace,
  onSelectEvent,
  onSelectTownship,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [headerBgUrl, setHeaderBgUrl] = useState<string>(
    () => firebaseService.getVisualBackgrounds().headerBackgroundUrl
  );
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);
  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef(0);

  const { webSearch, runWebSearch, clearWebSearch } = useWebSearch(language);

  useEffect(() => {
    const unsub = firebaseService.subscribeVisualBackgrounds((cfg) => {
      setHeaderBgUrl(cfg.headerBackgroundUrl || '');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleNewEvent = () => setHasUnread(true);
    window.addEventListener('new-live-event', handleNewEvent);
    window.addEventListener('socket-broadcast', handleNewEvent);
    return () => {
      window.removeEventListener('new-live-event', handleNewEvent);
      window.removeEventListener('socket-broadcast', handleNewEvent);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(e.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isBm = language === 'bm';
  const isUserAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.email === 'ayahsyirah77@gmail.com' ||
    currentUser?.email === 'asuypower7984@gmail.com' ||
    currentUser?.email?.toLowerCase().includes('admin');
  const isRegisteredVendor = isUserAdmin || currentUser?.role === 'vendor';

  const rawProfileName =
    currentUser?.displayName?.trim() || currentUser?.fullName?.trim() || '';
  const greetingName = rawProfileName || (isBm ? 'Tetamu' : 'Explorer');

  const handleTripleClickAdmin = () => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < 1000) {
      clickCountRef.current += 1;
    } else {
      clickCountRef.current = 1;
    }
    lastClickTimeRef.current = now;
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      onOpenAdmin();
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const matchingPlaces = q
    ? (places || [])
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
            p.township.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        )
        .slice(0, 5)
    : [];

  const matchingEvents = q
    ? (events || [])
        .filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.description && e.description.toLowerCase().includes(q)) ||
            (e.township && e.township.toLowerCase().includes(q)) ||
            (e.date && e.date.toLowerCase().includes(q))
        )
        .slice(0, 3)
    : [];

  const matchingTownships = q
    ? ALL_TOWNSHIPS.filter((t) => t.toLowerCase().includes(q)).slice(0, 3)
    : [];

  const totalResults =
    matchingPlaces.length + matchingEvents.length + matchingTownships.length;

  const notificationItems = [
    {
      id: 'sos-active',
      title: isBm ? 'Kecemasan SOS 24/7' : '24/7 SOS Emergency Ready',
      desc: isBm
        ? 'Talian terus Polis, Bomba & Hospital Cameron bersiap sedia.'
        : 'Direct hotlines to Police, Hospital & Civil Defence on standby.',
      tag: 'CRITICAL',
      tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      action: () => {
        setIsNotifOpen(false);
        onOpenSos();
      },
    },
    ...(hazards && hazards.length > 0
      ? hazards.slice(0, 2).map((h, i) => ({
          id: `hazard-${i}`,
          title: h.title || (isBm ? 'Amaran Bahaya Jalan' : 'Road Hazard Warning'),
          desc: h.description || `${h.location} - ${h.type}`,
          tag: 'HAZARD',
          tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          action: () => {
            setIsNotifOpen(false);
            onOpenTraffic();
          },
        }))
      : []),
    ...(trafficAlerts && trafficAlerts.length > 0
      ? trafficAlerts.slice(0, 2).map((a, i) => ({
          id: `traffic-${i}`,
          title:
            a.location ||
            a.roadName ||
            (isBm ? 'Amaran Trafik Tanah Tinggi' : 'Highland Traffic Alert'),
          desc: a.description || a.message || `${a.location}: ${a.status.toUpperCase()}`,
          tag: a.status.toUpperCase(),
          tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          action: () => {
            setIsNotifOpen(false);
            onOpenTraffic();
          },
        }))
      : []),
    {
      id: 'chat-update',
      title: isBm ? 'Lounge Komuniti Aktif' : 'Community Chat Active',
      desc: isBm
        ? 'Tips jalan raya & info pelancongan masa nyata.'
        : 'Live road tips & tea valley updates from fellow travelers.',
      tag: 'LIVE',
      tagColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      action: () => {
        setIsNotifOpen(false);
        onOpenChat();
      },
    },
    {
      id: 'dir-update',
      title: isBm ? 'Direktori Cameron Highlands' : 'Verified Highland Directories',
      desc: isBm
        ? 'Terokai tempat makan, ladang & penginapan disahkan.'
        : 'Browse verified farms, cafes, steamboat & homestays.',
      tag: 'PLACES',
      tagColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      action: () => {
        setIsNotifOpen(false);
        onOpenDirectories();
      },
    },
  ];

  return (
    <div className="block sm:hidden relative w-full z-30">
      {/* Upper Section Scenic Card Container (Image 3 Background + Image 2 Layout) */}
      <div className="relative w-full rounded-b-[28px] overflow-visible shadow-[0_14px_38px_rgba(0,0,0,0.6)]">
        {/* Clipped Background Image & Gradient Scrim */}
        <div className="absolute inset-0 rounded-b-[28px] overflow-hidden pointer-events-none">
          <img
            src={safeSrc(headerBgUrl, '/assets/aistudio/explore_c7c5621e.jpg')}
            alt="Cameron Highlands sunrise hills"
            className="w-full h-full object-cover object-center scale-105 transition-opacity duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/75 via-stone-950/55 to-stone-950/90" />
        </div>

        {/* Upper Section Foreground Content */}
        <div className="relative z-10 px-4 pt-4 pb-5 space-y-4">
          {/* Top Bar: CamGo Logo + Location (Left) + Bell / Vendor / User Avatar (Right) */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleTripleClickAdmin}
              className="flex flex-col items-start gap-1 py-0.5 pr-1 text-left cursor-pointer active:scale-95 transition-transform shrink-0"
              title="CamGo — Explore The Highlands"
            >
              <CamLogo size="hero" showTagline={false} className="pointer-events-none drop-shadow-md" />
              <span className="no-mobile-clamp text-[10px] font-bold tracking-[0.14em] uppercase text-stone-200/95 drop-shadow pl-0.5">
                Explore The Highlands
              </span>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              {/* Vendor Quick Action (Vendors/Admins only) */}
              {currentUser && isRegisteredVendor && onOpenVendorAlerts && (
                <button
                  type="button"
                  onClick={onOpenVendorAlerts}
                  aria-label="Vendor Booking Alerts"
                  className="relative w-10 h-10 rounded-full bg-amber-500/25 border border-amber-300/60 text-amber-200 flex items-center justify-center shadow-md active:scale-95 cursor-pointer"
                >
                  <BellRing className={`w-4 h-4 ${vendorAlertCount > 0 ? 'animate-bounce' : ''}`} />
                  {vendorAlertCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-stone-950">
                      {vendorAlertCount}
                    </span>
                  )}
                </button>
              )}

              {currentUser && isRegisteredVendor && onOpenVendorPortal && (
                <button
                  type="button"
                  onClick={onOpenVendorPortal}
                  aria-label="Vendor Dashboard"
                  className="h-10 px-2.5 rounded-full bg-amber-500/25 border border-amber-300/60 text-amber-100 text-[11px] font-extrabold flex items-center gap-1 shadow-md active:scale-95 cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Vendor</span>
                </button>
              )}

              {/* Notification Bell */}
              <div className="relative" ref={notifContainerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotifOpen((prev) => !prev);
                    setHasUnread(false);
                  }}
                  aria-label="Highland Notifications"
                  className="relative w-10 h-10 rounded-full bg-stone-950/55 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-md active:scale-95 cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {hasUnread && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-stone-950 animate-pulse" />
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute top-full right-0 mt-2 w-[84vw] max-w-xs rounded-2xl bg-stone-900/98 backdrop-blur-2xl border border-emerald-500/35 shadow-2xl p-3 z-50 text-stone-100 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isBm ? 'Info & Amaran' : 'Highland Updates'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsNotifOpen(false)}
                        className="text-[11px] text-emerald-400 font-bold cursor-pointer"
                      >
                        {isBm ? 'Tutup' : 'Close'}
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1.5">
                      {notificationItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          className="w-full p-2 rounded-xl bg-stone-950/75 hover:bg-stone-800 border border-white/5 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-bold text-xs text-white truncate">
                              {item.title}
                            </span>
                            <span
                              className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${item.tagColor}`}
                            >
                              {item.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-400 line-clamp-2">{item.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar (Opens Slide-Out Drawer) */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-drawer'))}
                aria-label="Open Menu & Profile"
                className="relative w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-emerald-400 via-teal-300 to-lime-300 shadow-lg active:scale-95 transition-transform cursor-pointer overflow-hidden shrink-0"
              >
                <img
                  src={safeSrc(currentUser?.photoURL, DEFAULT_AVATAR_IMAGE)}
                  alt={greetingName}
                  className="w-full h-full rounded-full object-cover bg-stone-950"
                />
                <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-stone-950" />
              </button>
            </div>
          </div>

          {/* Personalized Greeting */}
          <div className="pt-1 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="no-mobile-clamp text-[26px] leading-[1.12] font-heading font-black text-white tracking-tight drop-shadow-md truncate">
                Hi, {greetingName}!
              </h1>
              <p className="text-[14px] font-medium text-stone-200/95 leading-snug mt-0.5 drop-shadow">
                {isBm ? 'Ke mana anda ingin pergi?' : 'Tell us where you want to go'}
              </p>
            </div>

            {!currentUser && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="shrink-0 min-h-[36px] px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-stone-950 text-[11px] font-extrabold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-700" />
                <span>{isBm ? 'Log Masuk' : 'Sign In'}</span>
              </button>
            )}
          </div>

          {/* Embedded Frosted Search Pill */}
          <div ref={searchContainerRef} className="relative w-full pt-0.5">
            <div className="flex items-center">
              <div className="flex-1 min-h-[48px] flex items-center bg-stone-950/50 backdrop-blur-xl border border-white/25 focus-within:border-emerald-400 rounded-full px-3.5 py-2 shadow-lg transition-all">
                <Search className="w-4 h-4 text-stone-200 shrink-0 mr-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      e.preventDefault();
                      setIsSearchOpen(true);
                      runWebSearch(searchQuery);
                    }
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder={isBm ? 'Cari tempat di Cameron...' : 'Search places'}
                  aria-label={isBm ? 'Cari tempat' : 'Search places'}
                  className="w-full bg-transparent text-[13px] font-medium text-white placeholder-stone-300 outline-none"
                />
                {searchQuery && (
                  <div className="flex items-center gap-1 ml-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(true);
                        runWebSearch(searchQuery);
                      }}
                      disabled={webSearch.isSearching}
                      className="px-2 py-1 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Globe className="w-3 h-3" />
                      <span>Web</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        clearWebSearch();
                        setIsSearchOpen(false);
                      }}
                      aria-label="Clear search"
                      className="p-1 text-stone-300 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Live Autocomplete + Web Search Dropdown */}
            {isSearchOpen && q.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 max-h-[68vh] overflow-y-auto rounded-2xl bg-stone-900/98 backdrop-blur-2xl border border-emerald-500/35 shadow-2xl p-2.5 z-50 text-stone-100 space-y-2">
                {totalResults === 0 ? (
                  <div className="px-2 py-1.5 text-center text-xs text-stone-400">
                    <p className="font-medium text-stone-300">
                      {isBm
                        ? `Tiada padanan direktori untuk "${searchQuery}"`
                        : `No local directory matches for "${searchQuery}"`}
                    </p>
                  </div>
                ) : (
                  <>
                    {matchingPlaces.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 flex items-center gap-1 border-b border-white/5">
                          <Compass className="w-3 h-3" />
                          <span>Places ({matchingPlaces.length})</span>
                        </div>
                        {matchingPlaces.map((place) => (
                          <button
                            key={place.id}
                            type="button"
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery('');
                              clearWebSearch();
                              if (onSelectPlace) onSelectPlace(place);
                              else onOpenMap();
                            }}
                            className="w-full p-2 rounded-xl hover:bg-stone-800/90 text-left flex items-center gap-2 transition-colors cursor-pointer group"
                          >
                            <img
                              src={safeSrc(place.imageUrl, DEFAULT_PLACE_IMAGE)}
                              alt={place.name}
                              className="w-8 h-8 rounded-lg object-cover bg-stone-950 border border-white/10 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs text-stone-100 group-hover:text-emerald-300 truncate">
                                {place.name}
                              </div>
                              <div className="text-[10px] text-stone-400 truncate flex items-center gap-1 mt-0.5">
                                <span className="text-emerald-400 font-mono font-bold">
                                  {place.township}
                                </span>
                                <span>•</span>
                                <span className="capitalize">{place.category}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {matchingEvents.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 flex items-center gap-1 border-b border-white/5">
                          <Calendar className="w-3 h-3" />
                          <span>Events ({matchingEvents.length})</span>
                        </div>
                        {matchingEvents.map((evt) => (
                          <button
                            key={evt.id}
                            type="button"
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery('');
                              clearWebSearch();
                              if (onSelectEvent) onSelectEvent(evt);
                              else onOpenMap();
                            }}
                            className="w-full p-2 rounded-xl hover:bg-stone-800/90 text-left flex items-center gap-2 transition-colors cursor-pointer group"
                          >
                            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                              <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs text-stone-100 group-hover:text-amber-300 truncate">
                                {evt.title}
                              </div>
                              <div className="text-[10px] text-stone-400 truncate">
                                {evt.date} • {evt.township}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {matchingTownships.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 px-2 py-0.5 flex items-center gap-1 border-b border-white/5">
                          <Building2 className="w-3 h-3" />
                          <span>Townships ({matchingTownships.length})</span>
                        </div>
                        {matchingTownships.map((town) => (
                          <button
                            key={town}
                            type="button"
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery('');
                              clearWebSearch();
                              if (onSelectTownship) onSelectTownship(town);
                              else onOpenPortals();
                            }}
                            className="w-full p-2 rounded-xl hover:bg-stone-800/90 text-left flex items-center gap-2 transition-colors cursor-pointer group"
                          >
                            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 shrink-0">
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs text-stone-100 group-hover:text-teal-300 truncate">
                                {town}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <WebSearchResultsBlock
                  query={searchQuery}
                  language={language}
                  webSearch={webSearch}
                  onRunWebSearch={runWebSearch}
                  onClearWebSearch={clearWebSearch}
                  hasLocalResults={totalResults > 0}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
