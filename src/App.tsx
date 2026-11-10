/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { MobileHomeCards } from './components/MobileHomeCards';
import { AiChatModal } from './components/AiChatModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginPage } from './components/AdminLoginPage';
import { UserDashboard } from './components/UserDashboard';
import { AuthModal } from './components/AuthModal';
import { VisualSplitItinerary } from './components/VisualSplitItinerary';
import { Footer } from './components/Footer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ReloadPrompt } from './components/ReloadPrompt';
import { MotorbikeRentalModal } from './components/MotorbikeRentalModal';
import { MasjidSurauModal } from './components/MasjidSurauModal';
import { OfflineTrailEngineModal } from './components/OfflineTrailEngineModal';
import { EmergencySosWidget } from './components/EmergencySosWidget';
import { MobileStickyFooter } from './components/MobileStickyFooter';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ClassifiedsModal } from './components/ClassifiedsModal';
import { DirectorySection } from './components/DirectorySection';
import { PortalsSection } from './components/PortalsSection';
import { FindMyPartyModal } from './components/FindMyPartyModal';
import { VendorDashboard } from './components/VendorDashboard';
import { FarmTicketMatrixModal } from './components/FarmTicketMatrixModal';
import { SmartParkingEvModal } from './components/SmartParkingEvModal';
import { CurrencyConverterModal } from './components/CurrencyConverterModal';
import { WeatherWidget } from './components/WeatherWidget';
import { TrafficWidget } from './components/TrafficWidget';
import { HazardWidget } from './components/HazardWidget';
import { EventsWidget } from './components/EventsWidget';
import { useMultiChannelNotifications } from './hooks/useMultiChannelNotifications';
import { usePreventAccidentalExit } from './hooks/usePreventAccidentalExit';
import { PreventExitToast } from './components/PreventExitToast';
import { NotificationCenter } from './components/NotificationCenter';
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

  const pathname = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  // Root domain ('/') strictly defaults to clean main homepage with chat closed
  if (pathname === '/' || pathname === '') {
    return (
      search.includes('chat=true') ||
      search.includes('standalone=true') ||
      hash === '#chat' ||
      hash === '#dms'
    );
  }

  // Dedicated routes like /chat or /dms open into standalone chat mode
  return (
    pathname.startsWith('/chat') ||
    pathname.startsWith('/dms') ||
    search.includes('chat=true') ||
    hash === '#chat' ||
    hash === '#dms'
  );
}

function checkIsBeaconInvite(): boolean {
  if (typeof window === 'undefined') return false;

  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  return (
    search.includes('beacon=') ||
    search.includes('party=') ||
    search.includes('code=') ||
    search.includes('tripcode=') ||
    search.includes('session=') ||
    hash.includes('beacon=') ||
    hash.includes('party=') ||
    hash.includes('code=')
  );
}

function checkIsMapRoute(): boolean {
  if (typeof window === 'undefined') return false;

  const pathname = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  return (
    pathname.startsWith('/map') ||
    search.includes('map=true') ||
    hash === '#map' ||
    hash === '#interactive-map'
  );
}

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const notificationCenter = useMultiChannelNotifications();
  const [places, setPlaces] = useState<Place[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [weatherList, setWeatherList] = useState<WeatherData[]>([]);
  const [trafficAlerts, setTrafficAlerts] = useState<TrafficAlert[]>([]);
  const [hazards, setHazards] = useState<HazardAlert[]>([]);
  const [events, setEvents] = useState<EventNotification[]>([]);
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
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(checkIsMapRoute);
  const [isMasjidModalOpen, setIsMasjidModalOpen] = useState(false);
  const [isTrailEngineOpen, setIsTrailEngineOpen] = useState(false);
  const [isFindMyPartyOpen, setIsFindMyPartyOpen] = useState<boolean>(checkIsBeaconInvite);
  const [isMotorbikeRentalOpen, setIsMotorbikeRentalOpen] = useState(false);
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
  const [activeCapsuleModal, setActiveCapsuleModal] = useState<
    null | 'microclimate' | 'traffic' | 'hazard' | 'events'
  >(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isVendorPortalOpen, setIsVendorPortalOpen] = useState(false);
  const [isFarmMatrixOpen, setIsFarmMatrixOpen] = useState(false);
  const [isParkingEvOpen, setIsParkingEvOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MainCategory>('food');
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | undefined>(undefined);

  // Lock body scroll when capsule modal is open
  useEffect(() => {
    const isAnyModalOpen = activeCapsuleModal || isDirectoriesModalOpen || isPortalsModalOpen || isMapModalOpen || isMasjidModalOpen || isTrailEngineOpen || isFindMyPartyOpen || isUserDashboardOpen || isAdminOpen || isAdminLoginOpen;
    if (isAnyModalOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [activeCapsuleModal, isDirectoriesModalOpen, isPortalsModalOpen, isMapModalOpen, isMasjidModalOpen, isTrailEngineOpen, isFindMyPartyOpen, isUserDashboardOpen, isAdminOpen, isAdminLoginOpen]);

  const refreshStorageData = () => {
    setPlaces(firebaseService.getPlaces());
    setGalleryItems(firebaseService.getGallery());
    setTrafficAlerts(firebaseService.getTrafficAlerts());
    setHazards(firebaseService.getHazardAlerts());
    setEvents(firebaseService.getEvents());
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
    
    const handleOpenMasjid = () => setIsMasjidModalOpen(true);
    window.addEventListener('open-masjid-modal', handleOpenMasjid);

    const handleOpenTrails = () => setIsTrailEngineOpen(true);
    window.addEventListener('open-offline-trails-modal', handleOpenTrails);

    const handleOpenParty = () => setIsFindMyPartyOpen(true);
    window.addEventListener('open-find-my-party', handleOpenParty);

    const handleOpenCurrency = () => setIsCurrencyOpen(true);
    window.addEventListener('open-currency-converter', handleOpenCurrency);

    const handleOpenParking = () => setIsParkingEvOpen(true);
    window.addEventListener('open-smart-parking-ev-modal', handleOpenParking);

    const handleOpenMap = () => setIsMapModalOpen(true);
    window.addEventListener('open-map-modal', handleOpenMap);
    window.addEventListener('open-map', handleOpenMap);
    window.addEventListener('open-interactive-map', handleOpenMap);

    const handleLocationChange = () => {
      const isChatRoute = checkIsStandaloneChat();
      setIsStandaloneChatView(isChatRoute);
      if (isChatRoute) {
        setIsChatOpen(true);
      } else {
        setIsChatOpen(false);
      }

      if (checkIsBeaconInvite()) {
        setIsFindMyPartyOpen(true);
      }

      if (checkIsMapRoute()) {
        setIsMapModalOpen(true);
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    if (checkIsStandaloneChat()) {
      setIsStandaloneChatView(true);
      setIsChatOpen(true);
    } else {
      setIsStandaloneChatView(false);
      setIsChatOpen(false);
    }

    if (checkIsBeaconInvite()) {
      setIsFindMyPartyOpen(true);
    }

    if (checkIsMapRoute()) {
      setIsMapModalOpen(true);
    }

    return () => {
      window.removeEventListener('open-chat-lounge', handleOpenChatLounge);
      window.removeEventListener('open-masjid-modal', handleOpenMasjid);
      window.removeEventListener('open-offline-trails-modal', handleOpenTrails);
      window.removeEventListener('open-find-my-party', handleOpenParty);
      window.removeEventListener('open-currency-converter', handleOpenCurrency);
      window.removeEventListener('open-smart-parking-ev-modal', handleOpenParking);
      window.removeEventListener('open-map-modal', handleOpenMap);
      window.removeEventListener('open-map', handleOpenMap);
      window.removeEventListener('open-interactive-map', handleOpenMap);
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      unsubUser();
    };
  }, []);

  const navigateToSection = (sectionId: string) => {
    if (sectionId === 'interactive-map' || sectionId === 'map' || sectionId === 'interactive-map-section') {
      setIsMapModalOpen(true);
      return;
    }
    if (sectionId === 'directories-section') {
      setIsDirectoriesModalOpen(true);
      return;
    }
    if (sectionId === 'portals-section') {
      setIsPortalsModalOpen(true);
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectCategory = (cat: MainCategory, sub?: SubCategory) => {
    setSelectedCategory(cat);
    setSelectedSubCategory(sub);
    setIsDirectoriesModalOpen(true);
  };

  const handleSelectPlaceForMap = (place: Place | null) => {
    setSelectedPlaceForMap(place);
    if (place) setIsMapModalOpen(true);
  };

  const handleCloseChat = () => {
    setIsStandaloneChatView(false);
    setIsChatOpen(false);
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, '/');
    }
  };

  // Close any open modal on back button press before showing exit prompt
  const handleModalCloseOnBack = useCallback((): boolean => {
    if (activeCapsuleModal) {
      setActiveCapsuleModal(null);
      return true;
    }
    if (isChatOpen) {
      handleCloseChat();
      return true;
    }
    if (isAiOpen) {
      setIsAiOpen(false);
      return true;
    }
    if (isMapModalOpen) {
      setIsMapModalOpen(false);
      return true;
    }
    if (isItineraryOpen) {
      setIsItineraryOpen(false);
      return true;
    }
    if (isDirectoriesModalOpen) {
      setIsDirectoriesModalOpen(false);
      return true;
    }
    if (isPortalsModalOpen) {
      setIsPortalsModalOpen(false);
      return true;
    }
    if (isClassifiedsModalOpen) {
      setIsClassifiedsModalOpen(false);
      return true;
    }
    if (isMasjidModalOpen) {
      setIsMasjidModalOpen(false);
      return true;
    }
    if (isTrailEngineOpen) {
      setIsTrailEngineOpen(false);
      return true;
    }
    if (isFindMyPartyOpen) {
      setIsFindMyPartyOpen(false);
      return true;
    }
    if (isMotorbikeRentalOpen) {
      setIsMotorbikeRentalOpen(false);
      return true;
    }
    if (isGalleryOpen) {
      setIsGalleryOpen(false);
      return true;
    }
    if (isCurrencyOpen) {
      setIsCurrencyOpen(false);
      return true;
    }
    if (isVendorPortalOpen) {
      setIsVendorPortalOpen(false);
      return true;
    }
    if (isFarmMatrixOpen) {
      setIsFarmMatrixOpen(false);
      return true;
    }
    if (isParkingEvOpen) {
      setIsParkingEvOpen(false);
      return true;
    }
    if (isUserDashboardOpen) {
      setIsUserDashboardOpen(false);
      return true;
    }
    if (isAdminOpen) {
      setIsAdminOpen(false);
      return true;
    }
    if (isAdminLoginOpen) {
      setIsAdminLoginOpen(false);
      return true;
    }
    if (isAuthOpen) {
      setIsAuthOpen(false);
      return true;
    }
    return false;
  }, [
    activeCapsuleModal,
    isChatOpen,
    isAiOpen,
    isMapModalOpen,
    isItineraryOpen,
    isDirectoriesModalOpen,
    isPortalsModalOpen,
    isClassifiedsModalOpen,
    isMasjidModalOpen,
    isTrailEngineOpen,
    isFindMyPartyOpen,
    isMotorbikeRentalOpen,
    isGalleryOpen,
    isCurrencyOpen,
    isVendorPortalOpen,
    isFarmMatrixOpen,
    isParkingEvOpen,
    isUserDashboardOpen,
    isAdminOpen,
    isAdminLoginOpen,
    isAuthOpen,
  ]);

  const { showExitToast, exitMessage, dismissToast, remainingSeconds } =
    usePreventAccidentalExit({
      enabled: true,
      timeoutMs: 2000,
      message: 'Press back again to exit CamGo',
      handleModalClose: handleModalCloseOnBack,
    });

  // If launched via shortcut (/?chat=true or standalone mode), render ONLY Chat Lounge full-screen
  if (isStandaloneChatView) {
    return (
      <div className="fixed inset-0 bg-stone-950 text-stone-100 flex flex-col font-sans overflow-hidden">
        <ChatLoungeModal
          isOpen={true}
          onClose={handleCloseChat}
          currentUser={currentUser}
          initialDmUserId={chatInitialDmUserId}
          initialChannelId={chatInitialChannelId}
        />
        <PreventExitToast
          isVisible={showExitToast}
          message={exitMessage}
          remainingSeconds={remainingSeconds}
          onDismiss={dismissToast}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-stone-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white relative bg-stone-950 pb-20 sm:pb-0">
      {/* 1. Intro Loading Screen */}
      <LoadingScreen language={language} onFinish={() => {}} />

      {/* 2. Navbar */}
      <Navbar
        language={language}
        onLanguageChange={setLanguage}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdmin={() => {
          if (
            currentUser?.role === 'admin' ||
            currentUser?.email === 'ayahsyirah77@gmail.com' ||
            currentUser?.email === 'asuypower7984@gmail.com'
          ) {
            setIsAdminOpen(true);
          } else {
            setIsAdminLoginOpen(true);
          }
        }}
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
        onOpenGalleryModal={() => setIsGalleryOpen(true)}
        onOpenCurrencyConverter={() => setIsCurrencyOpen(true)}
        onOpenVendorPortal={() => setIsVendorPortalOpen(true)}
        onOpenFarmMatrix={() => setIsFarmMatrixOpen(true)}
        onOpenParkingEvModal={() => setIsParkingEvOpen(true)}
        onOpenMasjidModal={() => setIsMasjidModalOpen(true)}
        onOpenTrailEngine={() => setIsTrailEngineOpen(true)}
        onOpenFindMyParty={() => setIsFindMyPartyOpen(true)}
        onOpenSos={() => window.dispatchEvent(new CustomEvent('open-emergency-sos'))}
        onOpenTraffic={() => setActiveCapsuleModal('traffic')}
        places={places}
        events={events}
        trafficAlerts={trafficAlerts}
        hazards={hazards}
        weatherList={weatherList}
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

      {/* PWA New Version Update Prompt */}
      <ReloadPrompt />

      {/* PWA Double-Tap Back to Exit Toast */}
      <PreventExitToast
        isVisible={showExitToast}
        message={exitMessage}
        remainingSeconds={remainingSeconds}
        onDismiss={dismissToast}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* 3. Hero Section */}
        <section id="hero-section" className="relative min-h-0 sm:min-h-[75vh] flex items-center justify-center pt-52 sm:pt-28 pb-4 sm:pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/60 to-stone-950/90 pointer-events-none" />

          <div className="relative z-10 max-w-5xl mx-auto text-center space-y-4 sm:space-y-6">
            <h1 className="text-3xl sm:text-6xl lg:text-7xl font-heading font-black tracking-tight text-stone-50 leading-[1.1]">
              {getTranslation(language, 'hero_title')}{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                Cameron Highlands
              </span>
            </h1>
          </div>
        </section>

        {/* Mobile Transparent Glass Cards matching screenshot (weather, hazard, map, itinerary, find my party, SOS) */}
        <MobileHomeCards
          language={language}
          onOpenWeather={() => setActiveCapsuleModal('microclimate')}
          onOpenHazard={() => setActiveCapsuleModal('hazard')}
          onOpenMap={() => setIsMapModalOpen(true)}
          onOpenItinerary={() => setIsItineraryOpen(true)}
          onOpenParty={() => setIsFindMyPartyOpen(true)}
          onOpenMotorbike={() => setIsMotorbikeRentalOpen(true)}
          onOpenSos={() => window.dispatchEvent(new CustomEvent('open-emergency-sos'))}
          weatherList={weatherList}
          trafficAlerts={trafficAlerts}
          hazards={hazards}
        />

        {/* Experience Cards (Desktop only) */}
        <section className="hidden sm:block max-w-6xl mx-auto px-3 sm:px-6 mb-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 max-w-6xl mx-auto">
            {/* Card 1: Motorbike Rental */}
            <div
              onClick={() => setIsMotorbikeRentalOpen(true)}
              className="group rounded-2xl bg-stone-900/90 border border-emerald-500/30 hover:border-emerald-400 p-3 sm:p-5 shadow-lg transition-all cursor-pointer flex flex-col justify-between text-left min-w-0"
            >
              <div>
                <div className="flex sm:block items-center gap-2 mb-1.5 sm:mb-3 min-w-0">
                  <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 sm:mb-3">
                    <Bike className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-xs sm:text-base font-extrabold text-white group-hover:text-emerald-300 leading-tight">
                    Motorbike Rental
                  </h3>
                </div>
                <p className="hidden sm:block text-xs text-stone-400 leading-relaxed line-clamp-2">
                  Explore winding mountain trails, farm bypasses &amp; tea valleys on two wheels with verified rental fleets.
                </p>
              </div>
              <div className="pt-2 sm:pt-4 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-xs font-bold text-emerald-400 mt-2 sm:mt-4">
                <span>Rentals</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2: GPS Map */}
            <div
              onClick={() => setIsMapModalOpen(true)}
              className="group rounded-2xl bg-stone-900/90 border border-cyan-500/30 hover:border-cyan-400 p-3 sm:p-5 shadow-lg transition-all cursor-pointer flex flex-col justify-between text-left min-w-0"
            >
              <div>
                <div className="flex sm:block items-center gap-2 mb-1.5 sm:mb-3 min-w-0">
                  <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 sm:mb-3">
                    <Navigation className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-xs sm:text-base font-extrabold text-white group-hover:text-cyan-300 leading-tight">
                    GPS Map
                  </h3>
                </div>
                <p className="hidden sm:block text-xs text-stone-400 leading-relaxed line-clamp-2">
                  Interactive satellite navigation, live traffic hotspots, hazard markers &amp; elevation profiles.
                </p>
              </div>
              <div className="pt-2 sm:pt-4 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-xs font-bold text-cyan-400 mt-2 sm:mt-4">
                <span>Open Map</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3: Route Itinerary */}
            <div
              onClick={() => setIsItineraryOpen(true)}
              className="group rounded-2xl bg-stone-900/90 border border-amber-500/30 hover:border-amber-400 p-3 sm:p-5 shadow-lg transition-all cursor-pointer flex flex-col justify-between text-left min-w-0"
            >
              <div>
                <div className="flex sm:block items-center gap-2 mb-1.5 sm:mb-3 min-w-0">
                  <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 sm:mb-3">
                    <Route className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-xs sm:text-base font-extrabold text-white group-hover:text-amber-300 leading-tight">
                    Itinerary
                  </h3>
                </div>
                <p className="hidden sm:block text-xs text-stone-400 leading-relaxed line-clamp-2">
                  Visual split-screen itinerary planner with real-time waypoint timing and distance estimates.
                </p>
              </div>
              <div className="pt-2 sm:pt-4 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-xs font-bold text-amber-400 mt-2 sm:mt-4">
                <span>Planner</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 4: Chat Lounge */}
            <div
              onClick={() => setIsChatOpen(true)}
              className="group rounded-2xl bg-stone-900/90 border border-indigo-500/30 hover:border-indigo-400 p-3 sm:p-5 shadow-lg transition-all cursor-pointer flex flex-col justify-between text-left min-w-0"
            >
              <div>
                <div className="flex sm:block items-center gap-2 mb-1.5 sm:mb-3 min-w-0">
                  <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 sm:mb-3">
                    <MessageSquare className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-xs sm:text-base font-extrabold text-white group-hover:text-indigo-300 leading-tight">
                    Chat Lounge
                  </h3>
                </div>
                <p className="hidden sm:block text-xs text-stone-400 leading-relaxed line-clamp-2">
                  Connect live with fellow highland travelers &amp; local community for instant road tips &amp; advice.
                </p>
              </div>
              <div className="pt-2 sm:pt-4 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-xs font-bold text-indigo-400 mt-2 sm:mt-4">
                <span>Open Lounge</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </section>

        {/* Highland Photo Gallery Smart Transparent Capsule */}
        <section className="max-w-6xl mx-auto px-3 sm:px-6 mb-12">
          <div
            onClick={() => setIsGalleryOpen(true)}
            className="group rounded-3xl bg-stone-900/80 backdrop-blur-xl border border-emerald-500/30 hover:border-emerald-400 p-5 sm:p-6 shadow-2xl transition-all cursor-pointer flex flex-wrap items-center justify-between gap-4 relative overflow-hidden text-left"
          >
            {/* Subtle ambient glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />
            
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-heading font-black text-white group-hover:text-emerald-300 transition-colors">
                    Highland Photo Gallery
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {galleryItems.length} Photos
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Tap to open visual lightbox with high-elevation photography &amp; scenic horizons.
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all shadow-md group-hover:translate-x-0.5">
              <span>View Gallery</span>
              <ArrowRight className="w-4 h-4" />
            </div>
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

      {/* Floating Circle Quick Links Widget at Bottom Right (PC only) */}
      <div className="hidden sm:flex fixed bottom-6 right-6 z-50 flex-col items-end">
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
                setIsMasjidModalOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-xl bg-stone-800/80 hover:bg-emerald-600/20 border border-white/5 transition-all text-left text-xs font-bold text-emerald-300 hover:text-emerald-100 cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Compass className="w-4 h-4" />
              </div>
              <span>Masjid & Surau</span>
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
        onClose={handleCloseChat}
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
      
      {/* Vendor Portal Modal */}
      {isVendorPortalOpen && (
        <VendorDashboard
          isOpen={isVendorPortalOpen}
          onClose={() => setIsVendorPortalOpen(false)}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenOnboarding={() => {}}
        />
      )}
      
      {/* Farm Matrix Modal */}
      {isFarmMatrixOpen && (
        <FarmTicketMatrixModal
          isOpen={isFarmMatrixOpen}
          onClose={() => setIsFarmMatrixOpen(false)}
          language={language}
        />
      )}
      
      {/* Parking EV Modal */}
      {isParkingEvOpen && (
        <SmartParkingEvModal
          isOpen={isParkingEvOpen}
          onClose={() => setIsParkingEvOpen(false)}
          language={language}
          places={places}
        />
      )}
      
      {/* Currency Modal */}
      {isCurrencyOpen && (
        <CurrencyConverterModal
          isOpen={isCurrencyOpen}
          onClose={() => setIsCurrencyOpen(false)}
          language={language}
        />
      )}
      
      {/* Emergency SOS Widget */}
      <EmergencySosWidget language={language} hideTriggerOnMobile={true} />

      {/* User Dashboard */}
      {isUserDashboardOpen && (
        <UserDashboard
          currentUser={currentUser}
          language={language}
          places={places}
          onClose={() => setIsUserDashboardOpen(false)}
          onSelectPlaceForMap={handleSelectPlaceForMap}
          onToggleBookmark={(id) => {}}
          initialTab={userDashboardInitialTab}
        />
      )}

      {/* Admin Dashboards */}
      {isAdminOpen && (
        <AdminDashboard
          language={language}
          currentUser={currentUser}
          onClose={() => setIsAdminOpen(false)}
          onRefreshData={refreshStorageData}
          places={places}
          gallery={galleryItems}
          events={[]}
        />
      )}
      {isAdminLoginOpen && (
        <AdminLoginPage
          onClose={() => setIsAdminLoginOpen(false)}
          onSuccess={(profile) => {
            setCurrentUser(profile);
            setIsAdminLoginOpen(false);
            setIsAdminOpen(true);
          }}
        />
      )}

      {/* Masjid & Trail Modals */}
      {isMasjidModalOpen && (
        <MasjidSurauModal
          isOpen={true}
          onClose={() => setIsMasjidModalOpen(false)}
          language={language}
          places={places}
          onSelectPlaceForMap={handleSelectPlaceForMap}
        />
      )}
      {isTrailEngineOpen && (
        <OfflineTrailEngineModal
          isOpen={true}
          onClose={() => setIsTrailEngineOpen(false)}
          language={language}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      )}

      {/* Bottom Sticky Footer for Mobile: Home, Trail, Directories, Chat, CamGo AI, SOS */}
      <MobileStickyFooter
        language={language}
        activeModal={
          isTrailEngineOpen
            ? 'trail'
            : isDirectoriesModalOpen
            ? 'directories'
            : isChatOpen
            ? 'chat'
            : isAiOpen
            ? 'ai'
            : null
        }
        onGoHome={() => {
          setIsMapModalOpen(false);
          setIsItineraryOpen(false);
          setIsChatOpen(false);
          setIsAiOpen(false);
          setIsTrailEngineOpen(false);
          setIsDirectoriesModalOpen(false);
          setIsPortalsModalOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenTrailEngine={() => {
          setIsChatOpen(false);
          setIsAiOpen(false);
          setIsDirectoriesModalOpen(false);
          setIsTrailEngineOpen(true);
        }}
        onOpenDirectories={() => {
          setIsChatOpen(false);
          setIsAiOpen(false);
          setIsTrailEngineOpen(false);
          setIsDirectoriesModalOpen(true);
        }}
        onOpenChat={() => {
          setIsTrailEngineOpen(false);
          setIsAiOpen(false);
          setIsDirectoriesModalOpen(false);
          setIsChatOpen(true);
        }}
        onOpenAi={() => {
          setIsTrailEngineOpen(false);
          setIsChatOpen(false);
          setIsDirectoriesModalOpen(false);
          setIsAiOpen(true);
        }}
        onOpenSos={() => {
          window.dispatchEvent(new CustomEvent('open-emergency-sos'));
        }}
      />
      {/* Highland Photo Gallery Popup Modal */}
      {isGalleryOpen && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
          onClick={() => setIsGalleryOpen(false)}
        >
          <div
            className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl bg-stone-950 border border-emerald-500/40 shadow-2xl p-4 sm:p-8 space-y-6 relative text-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-black text-stone-100">
                    Highland Photo Gallery
                  </h3>
                  <p className="text-xs text-stone-400">
                    High-elevation photography, tea valley horizons, &amp; cultural spotlights
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGalleryOpen(false)}
                className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <GalleryCarousel
              items={galleryItems}
              onSelectPlace={(place) => {
                setIsGalleryOpen(false);
                handleSelectPlaceForMap(place);
              }}
            />
          </div>
        </div>
      )}

      {/* Directories Modal Dialog Wrapper */}
      {isDirectoriesModalOpen && (
        <div className="fixed inset-0 z-[130] overflow-y-auto bg-stone-950/95 backdrop-blur-xl">
          <div className="min-h-full flex flex-col items-center justify-start p-3 sm:p-6 py-10 sm:py-16" onClick={() => setIsDirectoriesModalOpen(false)}>
            <div className="w-full max-w-6xl relative my-auto shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsDirectoriesModalOpen(false)}
                className="sticky top-2 right-2 float-right z-30 p-2.5 rounded-full bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 border border-emerald-500/30 shadow-xl cursor-pointer"
                aria-label="Close Directories"
              >
                <X className="w-5 h-5 text-emerald-400" />
              </button>
              <DirectorySection
                places={places}
                language={language}
                selectedCategory={selectedCategory}
                selectedSubCategory={selectedSubCategory}
                onSelectCategory={(cat, sub) => {
                  setSelectedCategory(cat);
                  setSelectedSubCategory(sub);
                }}
                onSelectPlaceForMap={(place) => {
                  setIsDirectoriesModalOpen(false);
                  handleSelectPlaceForMap(place);
                }}
                bookmarkedIds={currentUser?.bookmarks || []}
                onToggleBookmark={(placeId) => {
                  if (currentUser) {
                    firebaseService.toggleBookmark(placeId);
                    setCurrentUser(firebaseService.getCurrentUser());
                  } else {
                    setIsAuthOpen(true);
                  }
                }}
                onOpenFarmMatrix={() => {
                  setIsDirectoriesModalOpen(false);
                  setIsFarmMatrixOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Portals / Hub Modal Dialog Wrapper */}
      {isPortalsModalOpen && (
        <div className="fixed inset-0 z-[130] overflow-y-auto bg-stone-950/95 backdrop-blur-xl">
          <div className="min-h-full flex flex-col items-center justify-start p-3 sm:p-6 py-10 sm:py-16" onClick={() => setIsPortalsModalOpen(false)}>
            <div className="w-full max-w-6xl relative my-auto shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsPortalsModalOpen(false)}
                className="sticky top-2 right-2 float-right z-30 p-2.5 rounded-full bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 border border-teal-500/30 shadow-xl cursor-pointer"
                aria-label="Close Hub Portals"
              >
                <X className="w-5 h-5 text-teal-400" />
              </button>
              <PortalsSection
                language={language}
                onExploreTownOnMap={() => {
                  setIsPortalsModalOpen(false);
                  setIsMapModalOpen(true);
                }}
                onOpenFarmMatrix={() => {
                  setIsPortalsModalOpen(false);
                  setIsFarmMatrixOpen(true);
                }}
                onOpenVendorPortal={() => {
                  setIsPortalsModalOpen(false);
                  setIsVendorPortalOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {isClassifiedsModalOpen && (
        <ClassifiedsModal
          isOpen={isClassifiedsModalOpen}
          onClose={() => setIsClassifiedsModalOpen(false)}
          language={language}
          currentUser={currentUser}
          onOpenPostClassified={() => {}}
        />
      )}
      {isFindMyPartyOpen && (
        <FindMyPartyModal
          isOpen={isFindMyPartyOpen}
          onClose={() => setIsFindMyPartyOpen(false)}
          language={language}
        />
      )}

      {/* Capsule Modal: Microclimate (WeatherWidget) */}
      {activeCapsuleModal === 'microclimate' && (
        <div className="fixed inset-0 z-[130] overflow-y-auto bg-stone-950/95 backdrop-blur-xl">
          <div className="min-h-full flex flex-col items-center justify-center p-3 sm:p-6 py-10 sm:py-16" onClick={() => setActiveCapsuleModal(null)}>
            <div className="w-full max-w-4xl relative my-auto shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setActiveCapsuleModal(null)}
                className="sticky top-2 right-2 float-right z-30 p-2.5 rounded-full bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 border border-cyan-500/30 shadow-xl cursor-pointer"
                aria-label="Close Microclimate"
              >
                <X className="w-5 h-5 text-cyan-400" />
              </button>
              <WeatherWidget weatherList={weatherList} language={language} />
            </div>
          </div>
        </div>
      )}

      {/* Capsule Modal: Traffic (TrafficWidget) */}
      {activeCapsuleModal === 'traffic' && (
        <div className="fixed inset-0 z-[130] overflow-y-auto bg-stone-950/95 backdrop-blur-xl">
          <div className="min-h-full flex flex-col items-center justify-center p-3 sm:p-6 py-10 sm:py-16" onClick={() => setActiveCapsuleModal(null)}>
            <div className="w-full max-w-4xl relative my-auto shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setActiveCapsuleModal(null)}
                className="sticky top-2 right-2 float-right z-30 p-2.5 rounded-full bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 border border-amber-500/30 shadow-xl cursor-pointer"
                aria-label="Close Traffic Hub"
              >
                <X className="w-5 h-5 text-amber-400" />
              </button>
              <TrafficWidget
                alerts={trafficAlerts}
                language={language}
                onSelectRouteOnMap={() => {
                  setActiveCapsuleModal(null);
                  setIsMapModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Capsule Modal: Hazard & Slope Alerts (HazardWidget) */}
      {activeCapsuleModal === 'hazard' && (
        <div className="fixed inset-0 z-[130] overflow-y-auto bg-stone-950/95 backdrop-blur-xl">
          <div className="min-h-full flex flex-col items-center justify-center p-3 sm:p-6 py-10 sm:py-16" onClick={() => setActiveCapsuleModal(null)}>
            <div className="w-full max-w-4xl relative my-auto shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setActiveCapsuleModal(null)}
                className="sticky top-2 right-2 float-right z-30 p-2.5 rounded-full bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 border border-rose-500/30 shadow-xl cursor-pointer"
                aria-label="Close Hazard Alerts"
              >
                <X className="w-5 h-5 text-rose-400" />
              </button>
              <HazardWidget hazards={hazards} language={language} />
            </div>
          </div>
        </div>
      )}

      {/* Capsule Modal: Highland Events (EventsWidget) */}
      {activeCapsuleModal === 'events' && (
        <div className="fixed inset-0 z-[130] overflow-y-auto bg-stone-950/95 backdrop-blur-xl">
          <div className="min-h-full flex flex-col items-center justify-center p-3 sm:p-6 py-10 sm:py-16" onClick={() => setActiveCapsuleModal(null)}>
            <div className="w-full max-w-4xl relative my-auto shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setActiveCapsuleModal(null)}
                className="sticky top-2 right-2 float-right z-30 p-2.5 rounded-full bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 border border-purple-500/30 shadow-xl cursor-pointer"
                aria-label="Close Events"
              >
                <X className="w-5 h-5 text-purple-400" />
              </button>
              <EventsWidget events={events} language={language} />
            </div>
          </div>
        </div>
      )}

      {/* Real-Time WebSocket Multi-Channel Notification Grid Overlay */}
      <NotificationCenter
        activeSos={notificationCenter.activeSos}
        setActiveSos={notificationCenter.setActiveSos}
        activeWeatherBanner={notificationCenter.activeWeatherBanner}
        setActiveWeatherBanner={notificationCenter.setActiveWeatherBanner}
        activeChatPreview={notificationCenter.activeChatPreview}
        setActiveChatPreview={notificationCenter.setActiveChatPreview}
        toasts={notificationCenter.toasts}
        setToasts={notificationCenter.setToasts}
        isMuted={notificationCenter.isMuted}
        setIsMuted={notificationCenter.setIsMuted}
        isConnected={notificationCenter.isConnected}
        simulateEvent={notificationCenter.simulateEvent}
        language={language}
        onOpenChat={() => setIsChatOpen(true)}
      />
    </div>
  );
}
