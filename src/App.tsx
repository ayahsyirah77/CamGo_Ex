/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Place,
  WeatherData,
  TrafficAlert,
  HazardAlert,
  EventNotification,
  GalleryItem,
  Language,
  MainCategory,
  SubCategory,
  Township,
} from './types';
import { weatherService } from './services/weather';
import { firebaseService, UserProfile } from './services/firebase';
import { getTranslation } from './services/i18n';

import { LoadingScreen } from './components/LoadingScreen';
import { Navbar } from './components/Navbar';
import { BackToTop } from './components/BackToTop';
import { InteractiveMap } from './components/InteractiveMap';
import { GalleryCarousel } from './components/GalleryCarousel';
import { ChatLoungeModal } from './components/ChatLoungeModal';
import { GsapLoopGallery } from './components/GsapLoopGallery';
import { AiChatModal } from './components/AiChatModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginPage } from './components/AdminLoginPage';
import { UserDashboard } from './components/UserDashboard';
import { AuthModal } from './components/AuthModal';
import { VisualSplitItinerary } from './components/VisualSplitItinerary';
import { Footer } from './components/Footer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MotorbikeRentalModal } from './components/MotorbikeRentalModal';
import { MasjidSurauModal } from './components/MasjidSurauModal';
import { OfflineTrailEngineModal } from './components/OfflineTrailEngineModal';
import { EmergencySosWidget } from './components/EmergencySosWidget';
import { MobileRadialMenu } from './components/MobileRadialMenu';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  Sparkles,
  Compass,
  MapPin,
  MessageSquare,
  ArrowRight,
  Navigation,
  Bike,
  Route,
  Megaphone,
  Camera,
  Smartphone,
  X,
  Menu,
  ShieldAlert,
  Users,
} from 'lucide-react';

function checkIsStandaloneChat(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check browser display mode FIRST
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  if (isStandalone) return true;

  // 2. Check URL query parameters and hash
  const href = window.location.href.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  return (
    search.includes('chat') ||
    hash.includes('chat') ||
    hash.includes('dms') ||
    href.includes('chat')
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [places, setPlaces] = useState<Place[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [weatherList, setWeatherList] = useState<WeatherData[]>([]);
  const [trafficAlerts, setTrafficAlerts] = useState<TrafficAlert[]>([]);
  const [hazards, setHazards] = useState<HazardAlert[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(firebaseService.getCurrentUser());

  const [selectedPlaceForMap, setSelectedPlaceForMap] = useState<Place | null>(null);

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [userDashboardInitialTab, setUserDashboardInitialTab] = useState<
    'bookmarks' | 'itinerary' | 'classifieds' | 'profile' | 'emergency-card' | 'online-payment'
  >('bookmarks');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isStandaloneChatView, setIsStandaloneChatView] = useState<boolean>(checkIsStandaloneChat);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(checkIsStandaloneChat);
  const [chatInitialDmUserId, setChatInitialDmUserId] = useState<string | null>(null);
  const [chatInitialChannelId, setChatInitialChannelId] = useState<string | null>(null);
  const [isDirectoriesModalOpen, setIsDirectoriesModalOpen] = useState(false);
  const [isPortalsModalOpen, setIsPortalsModalOpen] = useState(false);
  const [isClassifiedsModalOpen, setIsClassifiedsModalOpen] = useState(false);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isMasjidModalOpen, setIsMasjidModalOpen] = useState(false);
  const [isTrailEngineOpen, setIsTrailEngineOpen] = useState(false);
  const [isFindMyPartyOpen, setIsFindMyPartyOpen] = useState(false);
  const [isMotorbikeRentalOpen, setIsMotorbikeRentalOpen] = useState(false);
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
  const [activeCapsuleModal, setActiveCapsuleModal] = useState<
    null | 'microclimate' | 'traffic' | 'hazard' | 'events'
  >(null);

  const refreshStorageData = () => {
    setPlaces(firebaseService.getPlaces());
    setGalleryItems(firebaseService.getGallery());
    setTrafficAlerts(firebaseService.getTrafficAlerts());
    setHazards(firebaseService.getHazardAlerts());
    setCurrentUser(firebaseService.getCurrentUser());
  };

  useEffect(() => {
    refreshStorageData();
    weatherService.fetchLiveWeather().then((res) => {
      if (res.length > 0) setWeatherList(res);
    });

    const unsubUser = firebaseService.subscribeUser(() => {
      setCurrentUser(firebaseService.getCurrentUser());
      refreshStorageData();
    });

    const handleOpenChatLounge = (e: any) => {
      if (e?.detail?.channelId) setChatInitialChannelId(e.detail.channelId);
      if (e?.detail?.dmUserId) setChatInitialDmUserId(e.detail.dmUserId);
      setIsChatOpen(true);
    };
    window.addEventListener('open-chat-lounge', handleOpenChatLounge);

    if (checkIsStandaloneChat()) {
      setIsStandaloneChatView(true);
      setIsChatOpen(true);
    }

    return () => {
      window.removeEventListener('open-chat-lounge', handleOpenChatLounge);
      unsubUser();
    };
  }, []);

  const navigateToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectCategory = (cat: MainCategory, sub?: SubCategory) => {
    setIsDirectoriesModalOpen(true);
    navigateToSection('directories-section');
  };

  const handleSelectPlaceForMap = (place: Place | null) => {
    setSelectedPlaceForMap(place);
    if (place) setIsMapModalOpen(true);
  };

  // If launched via shortcut (/?chat=true or standalone mode), render ONLY Chat Lounge full-screen
  if (isStandaloneChatView) {
    return (
      <div className="fixed inset-0 bg-stone-950 text-stone-100 flex flex-col font-sans overflow-hidden">
        <ChatLoungeModal
          isOpen={true}
          onClose={() => {
            setIsStandaloneChatView(false);
            setIsChatOpen(false);
          }}
          currentUser={currentUser}
          initialDmUserId={chatInitialDmUserId}
          initialChannelId={chatInitialChannelId}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-stone-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white relative bg-stone-950">
      {/* 1. Intro Loading Screen */}
      <LoadingScreen language={language} onFinish={() => {}} />

      {/* 2. Navbar */}
      <Navbar
        language={language}
        onLanguageChange={setLanguage}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdmin={() => setIsAdminLoginOpen(true)}
        onOpenAi={() => setIsAiOpen(true)}
        onOpenUserDashboard={() => setIsUserDashboardOpen(true)}
        onSelectCategory={handleSelectCategory}
        onNavigateSection={navigateToSection}
        onOpenDirectoriesModal={() => setIsDirectoriesModalOpen(true)}
        onOpenPortalsModal={() => setIsPortalsModalOpen(true)}
        onOpenClassifiedsModal={() => setIsClassifiedsModalOpen(true)}
        onOpenItinerary={() => setIsItineraryOpen(true)}
        onOpenMap={() => setIsMapModalOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenGalleryModal={() => {}}
        onOpenCurrencyConverter={() => {}}
        onOpenVendorPortal={() => {}}
        onOpenFarmMatrix={() => {}}
        onOpenParkingEvModal={() => {}}
        places={places}
        events={[]}
        onSelectPlace={handleSelectPlaceForMap}
      />

      {/* Offline Status Bar */}
      <OfflineIndicator
        onOpenOfflineTrailsModal={() => setIsTrailEngineOpen(true)}
        onOpenEmergencyModal={() => {
          setUserDashboardInitialTab('emergency-card');
          setIsUserDashboardOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* 3. Hero Section */}
        <section id="hero-section" className="relative min-h-0 sm:min-h-[75vh] flex items-center justify-center pt-24 sm:pt-28 pb-4 sm:pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/60 to-stone-950/90 pointer-events-none" />

          <div className="relative z-10 max-w-5xl mx-auto text-center space-y-4 sm:space-y-6">
            <h1 className="text-3xl sm:text-6xl lg:text-7xl font-heading font-black tracking-tight text-stone-50 leading-[1.1]">
              {getTranslation(language, 'hero_title')}{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                Cameron Highlands
              </span>
            </h1>

            <p className="text-xs sm:text-lg text-stone-300 max-w-2xl mx-auto leading-relaxed">
              {getTranslation(language, 'hero_subtitle')}
            </p>
          </div>
        </section>

        {/* GSAP Loop Gallery */}
        <section className="my-4">
          <GsapLoopGallery
            language={language}
            onOpenDirectoriesModal={() => setIsDirectoriesModalOpen(true)}
            onOpenPortalsModal={() => setIsPortalsModalOpen(true)}
            setActiveCapsuleModal={setActiveCapsuleModal}
            activeCapsuleModal={activeCapsuleModal}
          />
        </section>

        {/* Experience Cards in 2x2 Grid (100% Fully Visible Titles) */}
        <section className="max-w-4xl mx-auto px-2 sm:px-6 mb-12">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 max-w-4xl mx-auto">
            {/* Card 1: Motorbike Rental */}
            <div
              onClick={() => setIsMotorbikeRentalOpen(true)}
              className="group rounded-xl sm:rounded-2xl bg-stone-900 border border-emerald-500/30 p-2.5 sm:p-4 shadow-lg hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between gap-2 text-left min-w-0"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Bike className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h3 className="text-[10px] sm:text-xs font-extrabold text-white group-hover:text-emerald-300 leading-tight min-w-0">
                  Motorbike Rental
                </h3>
              </div>
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] sm:text-[11px] font-bold text-emerald-400">
                <span>Rentals</span>
                <ArrowRight className="w-3 h-3 shrink-0" />
              </div>
            </div>

            {/* Card 2: GPS Map */}
            <div
              onClick={() => setIsMapModalOpen(true)}
              className="group rounded-xl sm:rounded-2xl bg-stone-900 border border-cyan-500/30 p-2.5 sm:p-4 shadow-lg hover:border-cyan-400 transition-all cursor-pointer flex flex-col justify-between gap-2 text-left min-w-0"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h3 className="text-[10px] sm:text-xs font-extrabold text-white group-hover:text-cyan-300 leading-tight min-w-0">
                  GPS Map
                </h3>
              </div>
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] sm:text-[11px] font-bold text-cyan-400">
                <span>Open Map</span>
                <ArrowRight className="w-3 h-3 shrink-0" />
              </div>
            </div>

            {/* Card 3: Route Itinerary */}
            <div
              onClick={() => setIsItineraryOpen(true)}
              className="group rounded-xl sm:rounded-2xl bg-stone-900 border border-amber-500/30 p-2.5 sm:p-4 shadow-lg hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between gap-2 text-left min-w-0"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Route className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h3 className="text-[10px] sm:text-xs font-extrabold text-white group-hover:text-amber-300 leading-tight min-w-0">
                  Itinerary
                </h3>
              </div>
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] sm:text-[11px] font-bold text-amber-400">
                <span>Planner</span>
                <ArrowRight className="w-3 h-3 shrink-0" />
              </div>
            </div>

            {/* Card 4: Chat Lounge */}
            <div
              onClick={() => setIsChatOpen(true)}
              className="group rounded-xl sm:rounded-2xl bg-stone-900 border border-indigo-500/30 p-2.5 sm:p-4 shadow-lg hover:border-indigo-400 transition-all cursor-pointer flex flex-col justify-between gap-2 text-left min-w-0"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h3 className="text-[10px] sm:text-xs font-extrabold text-white group-hover:text-indigo-300 leading-tight min-w-0">
                  Chat Lounge
                </h3>
              </div>
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] sm:text-[11px] font-bold text-indigo-400">
                <span>Open Lounge</span>
                <ArrowRight className="w-3 h-3 shrink-0" />
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Carousel */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="rounded-3xl bg-stone-900 border border-emerald-500/30 p-6 shadow-2xl">
            <h3 className="text-lg font-heading font-black text-white mb-4">Highland Photo Gallery</h3>
            <GalleryCarousel items={galleryItems} onSelectPlace={handleSelectPlaceForMap} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer
        language={language}
        onLanguageChange={setLanguage}
        onSelectTown={(town) => {
          const match = places.find((p) => p.township === town);
          if (match) setSelectedPlaceForMap(match);
          setIsMapModalOpen(true);
        }}
        onOpenAdmin={() => {
          if (currentUser?.role === 'admin') setIsAdminOpen(true);
          else setIsAdminLoginOpen(true);
        }}
      />

      {/* Floating Circle Quick Links Widget at Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isWidgetMenuOpen && (
          <div className="mb-3 w-60 rounded-2xl bg-stone-900/95 backdrop-blur-xl border border-emerald-500/30 p-3 shadow-2xl space-y-2 text-stone-100 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider px-2 pt-1 pb-1 border-b border-white/10 flex items-center justify-between">
              <span>Quick Links</span>
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </div>

            <button
              onClick={() => {
                setIsWidgetMenuOpen(false);
                setIsChatOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-xl bg-stone-800/80 hover:bg-emerald-600/20 border border-white/5 transition-all text-left text-xs font-bold text-stone-200 hover:text-white cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span>Community Chat</span>
            </button>

            <button
              onClick={() => {
                setIsWidgetMenuOpen(false);
                setIsAiOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-xl bg-stone-800/80 hover:bg-teal-600/20 border border-white/5 transition-all text-left text-xs font-bold text-stone-200 hover:text-white cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <span>CamGo AI</span>
            </button>

            <button
              onClick={() => {
                setIsWidgetMenuOpen(false);
                setIsFindMyPartyOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-xl bg-stone-800/80 hover:bg-emerald-600/20 border border-white/5 transition-all text-left text-xs font-bold text-emerald-300 hover:text-emerald-100 cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
              <span>Find My Party</span>
            </button>

            <button
              onClick={() => {
                setIsWidgetMenuOpen(false);
                setIsTrailEngineOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-xl bg-stone-800/80 hover:bg-indigo-600/20 border border-white/5 transition-all text-left text-xs font-bold text-indigo-300 hover:text-indigo-100 cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Compass className="w-4 h-4" />
              </div>
              <span>Offline Trail Engine</span>
            </button>

            <button
              onClick={() => {
                setIsWidgetMenuOpen(false);
                window.dispatchEvent(new CustomEvent('open-emergency-sos'));
              }}
              className="w-full flex items-center gap-3 p-2 rounded-xl bg-stone-800/80 hover:bg-rose-600/20 border border-white/5 transition-all text-left text-xs font-bold text-rose-300 hover:text-rose-100 cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span>SOS Emergency</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsWidgetMenuOpen(!isWidgetMenuOpen)}
          aria-label="Toggle Quick Navigation Menu"
          className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl shadow-emerald-950/80 border border-emerald-400/40 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
          title="Quick Links"
        >
          {isWidgetMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Standalone Chat Lounge Modal */}
      <ChatLoungeModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={currentUser}
        initialDmUserId={chatInitialDmUserId}
        initialChannelId={chatInitialChannelId}
      />

      {/* AI Chat Modal */}
      <AiChatModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} language={language} />

      {/* Map Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[110] bg-stone-950 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-800">
            <h3 className="font-bold text-emerald-400 text-sm">Cameron Highlands Interactive Map</h3>
            <button onClick={() => setIsMapModalOpen(false)} className="p-1.5 rounded-lg bg-stone-800 text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 relative">
            <InteractiveMap
              places={places}
              language={language}
              selectedPlace={selectedPlaceForMap}
              onSelectPlace={(p) => setSelectedPlaceForMap(p)}
              onClose={() => setIsMapModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Motorbike Rental Modal */}
      <MotorbikeRentalModal
        isOpen={isMotorbikeRentalOpen}
        onClose={() => setIsMotorbikeRentalOpen(false)}
        language={language}
      />

      {/* Itinerary Modal */}
      {isItineraryOpen && (
        <VisualSplitItinerary
          places={places}
          weatherList={weatherList}
          trafficAlerts={trafficAlerts}
          hazards={hazards}
          language={language}
          onClose={() => setIsItineraryOpen(false)}
          onSelectPlaceForMap={handleSelectPlaceForMap}
        />
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onSuccess={() => setCurrentUser(firebaseService.getCurrentUser())} />
    </div>
  );
}
