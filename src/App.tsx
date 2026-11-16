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
  CamgoHazard,
} from './types';
import { weatherService } from './services/weather';
import { firebaseService, UserProfile } from './services/firebase';
import { hazardFeedService } from './services/hazardFeedService';
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
import { VoiceLanguageManager } from './components/VoiceLanguageManager';
import { MobileStickyFooter } from './components/MobileStickyFooter';
import { CommunityTicker } from './components/CommunityTicker';
import { CommunityReportModal } from './components/CommunityReportModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ClassifiedsModal } from './components/ClassifiedsModal';
import { DirectorySection } from './components/DirectorySection';
import { PortalsSection } from './components/PortalsSection';
import { FindMyPartyModal } from './components/FindMyPartyModal';
import { VendorDashboard } from './components/VendorDashboard';
import { AccommodationListModal } from './components/AccommodationListModal';
import { FarmTicketMatrixModal } from './components/FarmTicketMatrixModal';
import { SmartParkingEvModal } from './components/SmartParkingEvModal';
import { CurrencyConverterModal } from './components/CurrencyConverterModal';
import { WeatherWidget } from './components/WeatherWidget';
import { TrafficWidget } from './components/TrafficWidget';
import { HazardWidget } from './components/HazardWidget';
import { EventsWidget } from './components/EventsWidget';
import { useMultiChannelNotifications } from './hooks/useMultiChannelNotifications';
import { usePreventAccidentalExit } from './hooks/usePreventAccidentalExit';
import { usePwaAutoUpdate } from './hooks/usePwaAutoUpdate';
import { PreventExitToast } from './components/PreventExitToast';
import { NotificationCenter } from './components/NotificationCenter';
import {
  MapPin,
  ArrowRight,
  Navigation,
  Bike,
  Route,
  Megaphone,
  Camera,
  Smartphone,
  X,
  BedDouble,
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
  const [selectedHazardForMap, setSelectedHazardForMap] = useState<CamgoHazard | null>(null);

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isCommunityReportOpen, setIsCommunityReportOpen] = useState(false);
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
  const [isAccommodationModalOpen, setIsAccommodationModalOpen] = useState(false);
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
    const isAnyModalOpen = activeCapsuleModal || isDirectoriesModalOpen || isPortalsModalOpen || isMapModalOpen || isMasjidModalOpen || isTrailEngineOpen || isFindMyPartyOpen || isAccommodationModalOpen || isUserDashboardOpen || isAdminOpen || isAdminLoginOpen;
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
  }, [activeCapsuleModal, isDirectoriesModalOpen, isPortalsModalOpen, isMapModalOpen, isMasjidModalOpen, isTrailEngineOpen, isFindMyPartyOpen, isAccommodationModalOpen, isUserDashboardOpen, isAdminOpen, isAdminLoginOpen]);

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
    firebaseService.recordSiteVisit().catch(() => {});
    hazardFeedService.fetchLiveFeed(false).then((liveAlerts) => {
      if (Array.isArray(liveAlerts) && liveAlerts.length > 0) {
        setHazards(liveAlerts);
      }
    }).catch(() => {});
    weatherService.fetchLiveWeather().then((res) => {
      if (res.length > 0) setWeatherList(res);
    });

    const handleHazardsUpdated = (e: any) => {
      if (Array.isArray(e?.detail)) {
        setHazards(e.detail);
      } else {
        setHazards(firebaseService.getHazardAlerts());
      }
    };
    window.addEventListener('hazard-alerts-updated', handleHazardsUpdated);

    const unsubUser = firebaseService.subscribeUser(() => {
      setCurrentUser(firebaseService.getCurrentUser());
      refreshStorageData();
    });

    const handleOpenChatLounge = (e: any) => {
      setChatInitialChannelId(e?.detail?.channelId || null);
      setChatInitialDmUserId(e?.detail?.dmUserId || null);
      setIsChatOpen(true);
    };
    window.addEventListener('open-chat-lounge', handleOpenChatLounge);
    window.addEventListener('open-chat', handleOpenChatLounge);
    
    const handleOpenMasjid = () => setIsMasjidModalOpen(true);
    window.addEventListener('open-masjid-modal', handleOpenMasjid);

    const handleOpenTrails = () => setIsTrailEngineOpen(true);
    window.addEventListener('open-offline-trails-modal', handleOpenTrails);

    const handleOpenParty = () => setIsFindMyPartyOpen(true);
    window.addEventListener('open-find-my-party', handleOpenParty);

    const handleOpenAccommodation = () => setIsAccommodationModalOpen(true);
    window.addEventListener('open-accommodation', handleOpenAccommodation);
    window.addEventListener('open-homestays', handleOpenAccommodation);

    const handleOpenCurrency = () => setIsCurrencyOpen(true);
    window.addEventListener('open-currency-converter', handleOpenCurrency);

    const handleOpenParking = () => setIsParkingEvOpen(true);
    window.addEventListener('open-smart-parking-ev-modal', handleOpenParking);

    const handleOpenMap = () => setIsMapModalOpen(true);
    window.addEventListener('open-map-modal', handleOpenMap);
    window.addEventListener('open-map', handleOpenMap);
    window.addEventListener('open-interactive-map', handleOpenMap);

    const handleOpenCommunityReport = () => setIsCommunityReportOpen(true);
    window.addEventListener('open-community-report', handleOpenCommunityReport);

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
      window.removeEventListener('open-chat', handleOpenChatLounge);
      window.removeEventListener('open-masjid-modal', handleOpenMasjid);
      window.removeEventListener('open-offline-trails-modal', handleOpenTrails);
      window.removeEventListener('open-find-my-party', handleOpenParty);
      window.removeEventListener('open-accommodation', handleOpenAccommodation);
      window.removeEventListener('open-homestays', handleOpenAccommodation);
      window.removeEventListener('open-currency-converter', handleOpenCurrency);
      window.removeEventListener('open-smart-parking-ev-modal', handleOpenParking);
      window.removeEventListener('open-map-modal', handleOpenMap);
      window.removeEventListener('open-map', handleOpenMap);
      window.removeEventListener('open-interactive-map', handleOpenMap);
      window.removeEventListener('open-community-report', handleOpenCommunityReport);
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('hazard-alerts-updated', handleHazardsUpdated);
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
    if (cat === 'accommodation') {
      setIsAccommodationModalOpen(true);
      return;
    }
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
    if (isAccommodationModalOpen) {
      setIsAccommodationModalOpen(false);
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
    <div className="min-h-screen text-stone-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white relative bg-stone-950 pb-24 sm:pb-14">
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

      {/* ms-MY Voice Localization Prompt Banner */}
      <VoiceLanguageManager language={language} />

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
        <section id="hero-section" className="relative flex items-center justify-center pt-52 sm:pt-28 pb-4 sm:pb-7 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/60 to-stone-950/90 pointer-events-none" />

          <div className="relative z-10 max-w-5xl mx-auto text-center space-y-3 sm:space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black tracking-tight text-stone-50 leading-[1.1] [text-wrap:balance]">
              {getTranslation(language, 'hero_title')}{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                Cameron Highlands
              </span>
            </h1>
            <p className="hidden sm:block text-sm lg:text-base text-stone-300 max-w-2xl mx-auto leading-relaxed">
              {language === 'bm'
                ? 'Cuaca mikro masa nyata, amaran trafik & bahaya jalan, navigasi laluan hutan luar talian dan penginapan disahkan.'
                : 'Real-time highland microclimates, live road & hazard alerts, offline trail navigation, and verified direct homestay portals.'}
            </p>
          </div>
        </section>

        {/* Unified Responsive Glass Bento Grid (Mobile Cards + PC Desktop Dashboard) */}
        <MobileHomeCards
          language={language}
          onOpenWeather={() => setActiveCapsuleModal('microclimate')}
          onOpenHazard={() => setActiveCapsuleModal('hazard')}
          onOpenMap={() => setIsMapModalOpen(true)}
          onOpenItinerary={() => setIsItineraryOpen(true)}
          onOpenParty={() => setIsFindMyPartyOpen(true)}
          onOpenMotorbike={() => setIsMotorbikeRentalOpen(true)}
          onOpenAccommodation={() => setIsAccommodationModalOpen(true)}
          onOpenSos={() => window.dispatchEvent(new CustomEvent('open-emergency-sos'))}
          onOpenChat={(channelId) => {
            setChatInitialChannelId(channelId || null);
            setIsChatOpen(true);
          }}
          onOpenTrailEngine={() => setIsTrailEngineOpen(true)}
          onOpenAi={() => setIsAiOpen(true)}
          onOpenTraffic={() => setActiveCapsuleModal('traffic')}
          onOpenMasjid={() => setIsMasjidModalOpen(true)}
          onOpenParkingEv={() => setIsParkingEvOpen(true)}
          onOpenCurrency={() => setIsCurrencyOpen(true)}
          onOpenClassifieds={() => setIsClassifiedsModalOpen(true)}
          onSelectTownshipOnMap={(town) => {
            const match = places.find((p) => p.township === town);
            if (match) setSelectedPlaceForMap(match);
            setIsMapModalOpen(true);
          }}
          weatherList={weatherList}
          trafficAlerts={trafficAlerts}
          hazards={hazards}
        />

        {/* Highland Photo Gallery Smart Transparent Capsule */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-12">
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
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tabular-nums">
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
          <div className="hidden sm:flex items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-800">
            <h3 className="font-bold text-emerald-400 text-sm">Cameron Highlands Interactive Map</h3>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setIsMapModalOpen(false);
                setSelectedHazardForMap(null);
              }}
              className="p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 relative">
            <InteractiveMap
              places={places}
              language={language}
              selectedPlace={selectedPlaceForMap}
              onSelectPlace={(p) => setSelectedPlaceForMap(p)}
              focusedHazard={selectedHazardForMap}
              onClearFocusedHazard={() => setSelectedHazardForMap(null)}
              onClose={() => {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setIsMapModalOpen(false);
                setSelectedHazardForMap(null);
              }}
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
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(accountType) => {
          const user = firebaseService.getCurrentUser();
          setCurrentUser(user);
          if (accountType === 'business') {
            setIsVendorPortalOpen(true);
          } else {
            setIsVendorPortalOpen(false);
          }
        }}
      />
      
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

      {/* Live Community Rolling Marquee Ticker */}
      <CommunityTicker
        language={language}
        onOpenReportModal={() => setIsCommunityReportOpen(true)}
        onSelectHazard={(hazard) => {
          setSelectedHazardForMap(hazard);
          setSelectedPlaceForMap(null);
          setIsMapModalOpen(true);
        }}
      />

      {/* Community Report Submission Modal / Drawer */}
      <CommunityReportModal
        language={language}
        isOpen={isCommunityReportOpen}
        onClose={() => setIsCommunityReportOpen(false)}
      />

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
                className="p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Close"
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
                className="sticky top-2 right-2 float-right z-30 p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
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
                className="sticky top-2 right-2 float-right z-30 p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
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
      {isAccommodationModalOpen && (
        <AccommodationListModal
          isOpen={isAccommodationModalOpen}
          onClose={() => setIsAccommodationModalOpen(false)}
          language={language}
          onOpenVendorPortal={() => {
            setIsAccommodationModalOpen(false);
            setIsVendorPortalOpen(true);
          }}
        />
      )}

      {/* Capsule Modal: Microclimate (WeatherWidget) */}
      {activeCapsuleModal === 'microclimate' && (
        <div className="fixed inset-0 z-[130] overflow-y-auto bg-stone-950/95 backdrop-blur-xl">
          <div className="min-h-full flex flex-col items-center justify-center p-3 sm:p-6 py-10 sm:py-16" onClick={() => setActiveCapsuleModal(null)}>
            <div className="w-full max-w-4xl relative my-auto shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setActiveCapsuleModal(null)}
                className="sticky top-2 right-2 float-right z-30 p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
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
                className="sticky top-2 right-2 float-right z-30 p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
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
                className="sticky top-2 right-2 float-right z-30 p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
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
                className="sticky top-2 right-2 float-right z-30 p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
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
