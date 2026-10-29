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
  LoungePost,
  Language,
  MainCategory,
  SubCategory,
  Township,
} from './types';
import {
  INITIAL_PLACES,
  INITIAL_WEATHER,
  INITIAL_TRAFFIC,
  INITIAL_HAZARDS,
  INITIAL_EVENTS,
  INITIAL_GALLERY,
  INITIAL_LOUNGE,
} from './data/initialData';
import { weatherService } from './services/weather';
import { firebaseService, UserProfile } from './services/firebase';
import { hazardFeedService } from './services/hazardFeedService';
import { getTranslation } from './services/i18n';

import { LoadingScreen } from './components/LoadingScreen';
import { Navbar } from './components/Navbar';
import { BackToTop } from './components/BackToTop';
import { WeatherWidget } from './components/WeatherWidget';
import { TrafficWidget } from './components/TrafficWidget';
import { HazardWidget } from './components/HazardWidget';
import { EventsWidget } from './components/EventsWidget';
import { InteractiveMap } from './components/InteractiveMap';
import { GalleryCarousel } from './components/GalleryCarousel';
import { DirectorySection } from './components/DirectorySection';
import { PortalsSection } from './components/PortalsSection';
import { UserLounge } from './components/UserLounge';
import { GsapLoopGallery } from './components/GsapLoopGallery';
import { AiChatModal } from './components/AiChatModal';
import { MobileFooterNav } from './components/MobileFooterNav';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginPage } from './components/AdminLoginPage';
import { UserDashboard } from './components/UserDashboard';
import { AuthModal } from './components/AuthModal';
import { VisualSplitItinerary } from './components/VisualSplitItinerary';
import { Footer } from './components/Footer';
import { CamLogo } from './components/CamLogo';
import { EmergencySosWidget } from './components/EmergencySosWidget';
import { MobileRadialMenu } from './components/MobileRadialMenu';
import { MasjidSurauModal } from './components/MasjidSurauModal';
import { OfflineTrailEngineModal } from './components/OfflineTrailEngineModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { VendorDashboard } from './components/VendorDashboard';
import { VendorOnboardingModal } from './components/VendorOnboardingModal';
import { FarmTicketMatrixModal } from './components/FarmTicketMatrixModal';
import { FindMyPartyModal } from './components/FindMyPartyModal';
import { MotorbikeRentalModal } from './components/MotorbikeRentalModal';
import {
  Sparkles,
  Compass,
  MapPin,
  CloudSun,
  Sun,
  ShieldAlert,
  Calendar,
  MessageSquare,
  ArrowRight,
  Navigation,
  CheckCircle,
  Mountain,
  Car,
  X,
  Layers,
  Route,
  Menu,
  Users,
  Bike,
} from 'lucide-react';

export default function App() {
  // Localization
  const [language, setLanguage] = useState<Language>('en');

  // Loading Screen State
  const [loadingFinished, setLoadingFinished] = useState(false);

  // App Data (synced with Firebase / Local Storage)
  const [places, setPlaces] = useState<Place[]>([]);
  const [weatherList, setWeatherList] = useState<WeatherData[]>([]);
  const [trafficAlerts, setTrafficAlerts] = useState<TrafficAlert[]>([]);
  const [hazards, setHazards] = useState<HazardAlert[]>([]);
  const [events, setEvents] = useState<EventNotification[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loungePosts, setLoungePosts] = useState<LoungePost[]>([]);
  const [hasNewChat, setHasNewChat] = useState(false);
  const loungeCountRef = useRef(0);

  // User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(firebaseService.getCurrentUser());

  // Navigation & Selection States
  const [selectedCategory, setSelectedCategory] = useState<MainCategory>('attraction');
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | undefined>(undefined);
  const [selectedPlaceForMap, setSelectedPlaceForMap] = useState<Place | null>(null);

  // Modals & Capsule Popups
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [userDashboardInitialTab, setUserDashboardInitialTab] = useState<
    'bookmarks' | 'itinerary' | 'classifieds' | 'profile' | 'emergency-card' | 'online-payment'
  >('bookmarks');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDirectoriesModalOpen, setIsDirectoriesModalOpen] = useState(false);
  const [isPortalsModalOpen, setIsPortalsModalOpen] = useState(false);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isMasjidModalOpen, setIsMasjidModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
  const [isTrailEngineOpen, setIsTrailEngineOpen] = useState(false);
  const [isFindMyPartyOpen, setIsFindMyPartyOpen] = useState(false);
  const [isVendorDashboardOpen, setIsVendorDashboardOpen] = useState(false);
  const [isVendorOnboardingOpen, setIsVendorOnboardingOpen] = useState(false);
  const [isFarmMatrixOpen, setIsFarmMatrixOpen] = useState(false);
  const [isMotorbikeRentalOpen, setIsMotorbikeRentalOpen] = useState(false);
  const [activeCapsuleModal, setActiveCapsuleModal] = useState<
    null | 'microclimate' | 'traffic' | 'hazard' | 'events'
  >(null);

  // Refresh data from storage
  const refreshStorageData = () => {
    setPlaces(firebaseService.getPlaces());
    setGalleryItems(firebaseService.getGallery());
    setEvents(firebaseService.getEvents());
    setLoungePosts(firebaseService.getLoungePosts());
    setTrafficAlerts(firebaseService.getTrafficAlerts());
    setHazards(firebaseService.getHazardAlerts());
    setCurrentUser(firebaseService.getCurrentUser());
  };

  const fetchLiveWeather = async () => {
    const liveWeather = await weatherService.fetchLiveWeather();
    if (liveWeather.length > 0) {
      setWeatherList(liveWeather);
    }
  };

  useEffect(() => {
    refreshStorageData();
    fetchLiveWeather();
    const handlePlacesUpdated = (e: any) => {
      const updated = e?.detail || firebaseService.getPlaces();
      console.log('[Debug] App.tsx handlePlacesUpdated updated:', updated);
      setPlaces(updated);
    };
    const handleGalleryUpdated = (e: any) => {
      const updated = e?.detail || firebaseService.getGallery();
      setGalleryItems(updated);
    };
    const handleEventsUpdated = (e: any) => {
      const updated = e?.detail || firebaseService.getEvents();
      setEvents(updated);
    };
    const handleGsapImagesUpdated = () => {
      refreshStorageData();
    };
    const handleTownshipHubUpdated = () => {
      refreshStorageData();
    };

    const handleVendorListingsUpdated = () => {
      refreshStorageData();
    };

    const handleHazardsUpdated = (e: any) => {
      const updated = e?.detail || firebaseService.getHazardAlerts();
      setHazards(updated);
    };

    // Trigger initial background sync with official JKR & MDCH feeds
    hazardFeedService.syncFeeds().then((res) => {
      if (res.success && res.alerts.length > 0) {
        setHazards(res.alerts);
      }
    });

    window.addEventListener('places-updated', handlePlacesUpdated);
    window.addEventListener('gallery-updated', handleGalleryUpdated);
    window.addEventListener('events-updated', handleEventsUpdated);
    window.addEventListener('gsap-images-updated', handleGsapImagesUpdated);
    window.addEventListener('township-hub-updated', handleTownshipHubUpdated);
    window.addEventListener('vendor-listings-updated', handleVendorListingsUpdated);
    window.addEventListener('hazard-alerts-updated', handleHazardsUpdated);

    const unsubUser = firebaseService.subscribeUser(() => {
      setCurrentUser(firebaseService.getCurrentUser());
      refreshStorageData();
    });
    const unsubLounge = firebaseService.subscribeLoungePosts((livePosts) => {
      if (loungeCountRef.current > 0 && livePosts.length > loungeCountRef.current) {
        setHasNewChat(true);
      }
      loungeCountRef.current = livePosts.length;
      setLoungePosts(livePosts);
    });

    console.log('[Debug] App.tsx places state:', places);
    const handleOpenEmergencyCard = () => {
      let user = firebaseService.getCurrentUser();
      if (!user) {
        firebaseService.signInWithEmail('traveler@camgo.my', 'Highland Explorer');
        user = firebaseService.getCurrentUser();
      }
      setCurrentUser(user);
      setUserDashboardInitialTab('emergency-card');
      setIsUserDashboardOpen(true);
    };
    window.addEventListener('open-emergency-card', handleOpenEmergencyCard);
    const handleOpenTrafficAlerts = () => {
      setActiveCapsuleModal('traffic');
    };
    window.addEventListener('open-traffic-alerts-modal', handleOpenTrafficAlerts);
    const handleOpenMotorbikeRental = () => {
      setIsMotorbikeRentalOpen(true);
    };
    window.addEventListener('open-motorbike-rental', handleOpenMotorbikeRental);

    return () => {
      window.removeEventListener('places-updated', handlePlacesUpdated);
      window.removeEventListener('gallery-updated', handleGalleryUpdated);
      window.removeEventListener('events-updated', handleEventsUpdated);
      window.removeEventListener('gsap-images-updated', handleGsapImagesUpdated);
      window.removeEventListener('township-hub-updated', handleTownshipHubUpdated);
      window.removeEventListener('vendor-listings-updated', handleVendorListingsUpdated);
      window.removeEventListener('hazard-alerts-updated', handleHazardsUpdated);
      window.removeEventListener('open-emergency-card', handleOpenEmergencyCard);
      window.removeEventListener('open-traffic-alerts-modal', handleOpenTrafficAlerts);
      window.removeEventListener('open-motorbike-rental', handleOpenMotorbikeRental);
      unsubUser();
      unsubLounge();
    };
  }, []);

  const handleOpenVendorPortal = () => {
    setIsVendorDashboardOpen(true);
  };

  // Smooth scroll helper
  const navigateToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Directory Category Selection Handler
  const handleSelectCategory = (cat: MainCategory, sub?: SubCategory) => {
    setSelectedCategory(cat);
    setSelectedSubCategory(sub);
    setIsDirectoriesModalOpen(true);
    navigateToSection('directories-section');
  };

  // Place Selection for Map
  const handleSelectPlaceForMap = (place: Place | null) => {
    setSelectedPlaceForMap(place);
    if (place) {
      setIsMapModalOpen(true);
    }
  };

  // Bookmark Toggle
  const handleToggleBookmark = (placeId: string) => {
    firebaseService.toggleBookmark(placeId);
    setCurrentUser(firebaseService.getCurrentUser());
  };

  return (
    <div className="min-h-screen text-stone-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white relative">


      {/* 1. Intro Loading Screen with CamGo Logo Animation */}
      <LoadingScreen
        language={language}
        onFinish={() => setLoadingFinished(true)}
      />

      {/* 2. Transparent / Glassmorphism Animated Navbar */}
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
        onOpenDirectoriesModal={() => {
          setIsDirectoriesModalOpen(true);
          navigateToSection('directories-section');
        }}
        onOpenPortalsModal={() => {
          setIsPortalsModalOpen(true);
          navigateToSection('portals-section');
        }}
        onOpenItinerary={() => setIsItineraryOpen(true)}
        onOpenMap={() => setIsMapModalOpen(true)}
        onOpenChat={() => {
          setHasNewChat(false);
          setIsChatOpen(true);
        }}
        onOpenGalleryModal={() => setIsGalleryModalOpen(true)}
        onOpenVendorPortal={handleOpenVendorPortal}
        onOpenFarmMatrix={() => setIsFarmMatrixOpen(true)}
        places={places}
        events={events}
        onSelectPlace={handleSelectPlaceForMap}
        onSelectEvent={() => setActiveCapsuleModal('events')}
        onSelectTownship={(town) => {
          const match = places.find((p) => p.township === town);
          if (match) setSelectedPlaceForMap(match);
          setIsMapModalOpen(true);
        }}
      />

      {/* Offline Status Bar & Quick Actions */}
      <OfflineIndicator
        onOpenOfflineTrailsModal={() => setIsTrailEngineOpen(true)}
        onOpenEmergencyModal={() => {
          setUserDashboardInitialTab('emergency-card');
          setIsUserDashboardOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 break-words">
        {/* 3. Hero Section: Cinematic Highlands Mist & Live Telemetry */}
        <section id="hero-section" className="relative min-h-0 sm:min-h-[85vh] flex items-center justify-center pt-24 sm:pt-24 pb-4 sm:pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Subtle gradient overlay to enhance glass text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/60 to-stone-950/90 pointer-events-none" />

          <div className="relative z-10 max-w-5xl mx-auto text-center space-y-4 sm:space-y-6">
            {/* Main Headline */}
            <h1 className="text-3xl sm:text-6xl lg:text-7xl font-heading font-black tracking-tight text-stone-50 leading-[1.1]">
              {getTranslation(language, 'hero_title')}{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                Cameron Highlands
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-lg text-stone-300 max-w-2xl mx-auto leading-relaxed">
              {getTranslation(language, 'hero_subtitle')}
            </p>
          </div>
        </section>

        {/* Advanced GSAP Infinitely Looping Gallery replacing old separate capsule sections */}
        <section id="loop-gallery-section" className="mt-1 sm:mt-6 mb-6 sm:mb-8">
          <GsapLoopGallery
            language={language}
            onOpenDirectoriesModal={() => setIsDirectoriesModalOpen(true)}
            onOpenPortalsModal={() => setIsPortalsModalOpen(true)}
            setActiveCapsuleModal={setActiveCapsuleModal}
            activeCapsuleModal={activeCapsuleModal}
          />
        </section>

        {/* Dedicated Cameron Highlands Experience Hub Link Banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <div
            onClick={() => setIsMotorbikeRentalOpen(true)}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 border border-emerald-500/40 p-5 sm:p-8 shadow-2xl hover:border-emerald-400 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 text-center sm:text-left"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent_50%)] pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 z-10 text-center sm:text-left w-full sm:w-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform mx-auto sm:mx-0">
                <Bike className="w-7 h-7" />
              </div>
              <div className="space-y-1 flex flex-col items-center sm:items-start text-center sm:text-left w-full sm:w-auto">
                <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 block text-center sm:text-left w-full">
                  Cameron Highlands Experience Hub
                </span>
                <h3 className="text-lg sm:text-2xl font-heading font-black text-white group-hover:text-emerald-300 transition-colors leading-snug sm:leading-tight text-center sm:text-left w-full">
                  Motorbike &amp; Scooter Rental Marketplace
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 max-w-xl text-center sm:text-left mx-auto sm:mx-0">
                  Explore Tanah Rata, Brinchang, and Kea Farm on two wheels. Compare live fleet availability, select packages, and book instantly with WhatsApp notification!
                </p>
              </div>
            </div>

            <div className="z-10 w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-emerald-950/80 flex items-center justify-center gap-2 shrink-0 transition-transform group-hover:translate-x-1">
              <span>Explore Rental Hub</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </section>

        {/* 7. Interactive Lightbox Gallery (Hidden inline, opens via hamburger menu modal) */}
        <section id="interactive-gallery" className="hidden">
          <GalleryCarousel items={galleryItems} onSelectPlace={handleSelectPlaceForMap} />
        </section>

        {/* Back To Top */}
        <div className="flex justify-center my-8">
            <BackToTop />
        </div>
      </main>

      {/* 10. Rich Footer with Townships, Emergency Contacts, Official Portals, Language Toggle */}
      <footer id="footer-section">
        <Footer
          language={language}
          onLanguageChange={setLanguage}
          onSelectTown={(town) => {
            const match = places.find((p) => p.township === town);
            if (match) setSelectedPlaceForMap(match);
            navigateToSection('interactive-map');
          }}
          onOpenAdmin={() => {
            if (currentUser?.role === 'admin') {
              setIsAdminOpen(true);
            } else {
              setIsAdminLoginOpen(true);
            }
          }}
        />
      </footer>

      {/* PC View Floating Circle Widget (Bottom Right) with Three Horizontal Lines */}
      <div className="fixed bottom-6 right-6 z-50 hidden sm:flex flex-col items-end">
        {/* Expanded Floating Popover Menu */}
        {isWidgetMenuOpen && (
          <div className="mb-3 w-60 rounded-2xl bg-stone-900/95 backdrop-blur-xl border border-emerald-500/30 p-3 shadow-2xl space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-200 text-stone-100">
            <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider px-2 pt-1 pb-1 border-b border-white/10 flex items-center justify-between">
              <span>Quick Links</span>
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </div>

            {/* 1. Community Chat */}
            <button
              onClick={() => {
                setIsWidgetMenuOpen(false);
                setHasNewChat(false);
                setIsChatOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-stone-800/80 hover:bg-emerald-600/20 hover:border-emerald-500/40 border border-white/5 transition-all text-left text-xs font-bold text-stone-200 hover:text-white cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span>Community Chat</span>
                {hasNewChat && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
              </div>
            </button>

            {/* 2. CamGo AI */}
            <button
              onClick={() => {
                setIsWidgetMenuOpen(false);
                setIsAiOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-stone-800/80 hover:bg-teal-600/20 hover:border-teal-500/40 border border-white/5 transition-all text-left text-xs font-bold text-stone-200 hover:text-white cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 group-hover:bg-teal-500 group-hover:text-black transition-colors">
                <Sparkles className="w-4 h-4 animate-spin duration-3000" />
              </div>
              <span>CamGo AI</span>
            </button>

            {/* 3. Find My Party / Group Beacon */}
            <button
              onClick={() => {
                setIsWidgetMenuOpen(false);
                setIsFindMyPartyOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-stone-800/80 hover:bg-emerald-600/20 hover:border-emerald-500/40 border border-white/5 transition-all text-left text-xs font-bold text-emerald-300 hover:text-emerald-100 cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span>Find My Party</span>
                <span className="block text-[10px] text-stone-400 font-normal">Live Group Beacon &amp; Map</span>
              </div>
            </button>

            {/* 4. Trail Engine */}
            <button
              onClick={() => {
                setIsWidgetMenuOpen(false);
                setIsTrailEngineOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-stone-800/80 hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-white/5 transition-all text-left text-xs font-bold text-indigo-300 hover:text-indigo-100 cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <Compass className="w-4 h-4" />
              </div>
              <span>Offline Trail Engine</span>
            </button>

            {/* 5. SOS */}
            <button
              onClick={() => {
                setIsWidgetMenuOpen(false);
                window.dispatchEvent(new CustomEvent('open-emergency-sos'));
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-stone-800/80 hover:bg-rose-600/20 hover:border-rose-500/40 border border-white/5 transition-all text-left text-xs font-bold text-rose-300 hover:text-rose-100 cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <ShieldAlert className="w-4 h-4 animate-pulse" />
              </div>
              <span>SOS Emergency</span>
            </button>
          </div>
        )}

        {/* Floating Circle Button with 3 Horizontal Lines */}
        <button
          onClick={() => setIsWidgetMenuOpen(!isWidgetMenuOpen)}
          aria-label="Toggle Quick Navigation Menu"
          className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl shadow-emerald-950/80 border border-emerald-400/40 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
          title="Quick Links: Community Chat, CamGo AI, Find My Party, SOS"
        >
          {isWidgetMenuOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Menu className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Emergency SOS Widget Controller */}
      <EmergencySosWidget language={language} hideTriggerOnMobile={true} />

      {/* Mobile-Only Radial Circle Menu Widget */}
      <MobileRadialMenu
        language={language}
        onOpenSos={() => window.dispatchEvent(new CustomEvent('open-emergency-sos'))}
        onOpenFindMyParty={() => setIsFindMyPartyOpen(true)}
        onOpenMasjidSurau={() => setIsMasjidModalOpen(true)}
        onOpenAiChat={() => setIsAiOpen(true)}
        onOpenChatLounge={() => {
          setHasNewChat(false);
          setIsChatOpen(true);
        }}
        onOpenTrailEngine={() => setIsTrailEngineOpen(true)}
        hasNewChat={hasNewChat}
        onClearNewChat={() => setHasNewChat(false)}
        hasUrgentSos={hazards.some(h => h.severity === 'critical' || h.type === 'landslide')}
      />

      {/* Masjid & Surau Dedicated Scrollable Modal */}
      <MasjidSurauModal
        isOpen={isMasjidModalOpen}
        onClose={() => setIsMasjidModalOpen(false)}
        language={language}
        places={places}
        onSelectPlaceForMap={handleSelectPlaceForMap}
      />

      {/* Chat Modal */}
      {isChatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200"
          onClick={() => setIsChatOpen(false)}
        >
          <div
            className="w-full max-w-2xl h-[92vh] sm:h-[86vh] bg-stone-900 rounded-3xl border border-emerald-500/30 shadow-2xl flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <UserLounge
              posts={loungePosts}
              language={language}
              currentUser={currentUser}
              onPostUpdate={refreshStorageData}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      <AiChatModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        language={language}
      />

     {/* Admin Login Gateway Modal */}
{isAdminLoginOpen && (
  <AdminLoginPage
    onClose={() => setIsAdminLoginOpen(false)}
    onSuccess={(user) => {
      // 1. Explicitly store admin user profile
      setCurrentUser(user);
      
      // 2. Close gateway modal and open full Control Room
      setIsAdminLoginOpen(false);
      setIsAdminOpen(true);
      
      // 3. Sync local storage state
      refreshStorageData();
    }}
  />
)}

{/* Full Admin Dashboard Control Room */}
{isAdminOpen && (
  <AdminDashboard
    language={language}
    currentUser={currentUser || {
      uid: 'admin-hazry-01',
      email: 'ayahsyirah77@gmail.com',
      displayName: 'Muhammad Hazry (Admin)',
      role: 'admin',
      bookmarks: [],
      createdAt: new Date().toISOString(),
    }}
    onClose={() => setIsAdminOpen(false)}
    onRefreshData={refreshStorageData}
    places={places}
    gallery={galleryItems}
    events={events}
  />
)}
      {/* User Profile & Itinerary Dashboard Modal */}
      {isUserDashboardOpen && currentUser && (
        <UserDashboard
          currentUser={currentUser}
          language={language}
          places={places}
          initialTab={userDashboardInitialTab}
          onClose={() => setIsUserDashboardOpen(false)}
          onSelectPlaceForMap={handleSelectPlaceForMap}
          onToggleBookmark={handleToggleBookmark}
        />
      )}

      {/* Visual Split-Screen Itinerary & Interactive Mapping */}
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

      {/* Full-Screen Map Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[110] bg-stone-950 flex flex-col animate-in fade-in duration-200">
          <div className={`sticky top-0 z-50 flex items-center justify-between p-4 border-b border-white/10 bg-stone-900/95 backdrop-blur-md ${selectedPlaceForMap ? 'hidden sm:flex' : 'flex'}`}>
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Intelligent Map Navigator</h2>
            <button
              onClick={() => setIsMapModalOpen(false)}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close map"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedPlaceForMap && (
              <div className="p-4 border-b border-white/10 bg-stone-900 hidden sm:block">
                <img
                  src={selectedPlaceForMap.imageUrl}
                  alt={selectedPlaceForMap.name}
                  className="w-full h-40 object-cover rounded-xl mb-3"
                />
                <h3 className="text-lg font-bold text-white">{selectedPlaceForMap.name}</h3>
                <div className="flex items-center justify-between text-xs text-stone-300 mt-1">
                  <span>{selectedPlaceForMap.township} • {selectedPlaceForMap.elevation}</span>
                  <span className="font-bold text-amber-400">★ {selectedPlaceForMap.rating} <span className="text-stone-500 font-normal">({selectedPlaceForMap.reviewsCount} reviews)</span></span>
                </div>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <InteractiveMap
                places={places}
                language={language}
                selectedPlace={selectedPlaceForMap}
                onSelectPlace={(place) => {
                  setSelectedPlaceForMap(place);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* User Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        language={language}
        onSuccess={(accountType) => {
          const user = firebaseService.getCurrentUser();
          setCurrentUser(user);
          setIsAuthOpen(false);
          refreshStorageData();

          if (accountType === 'business') {
            if (user) {
              const userListings = firebaseService.getVendorListings().filter(
                (l) => l.ownerUid === user.uid || l.ownerEmail === user.email
              );
              if (userListings.length > 0 || user.role === 'admin') {
                setIsVendorDashboardOpen(true);
              } else {
                setIsVendorOnboardingOpen(true);
              }
            } else {
              setIsVendorOnboardingOpen(true);
            }
          }
        }}
      />

      {/* Capsule Popup Modal */}
      {activeCapsuleModal && (
        <div
          className="fixed inset-0 z-[120] p-2 sm:p-4 overflow-y-auto bg-black/90 backdrop-blur-2xl flex justify-center items-start sm:items-center py-4 sm:py-8"
          onClick={() => setActiveCapsuleModal(null)}
        >
          <div
            className="glass-panel w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl p-4 sm:p-6 bg-stone-900/95 border border-emerald-500/50 shadow-[0_0_60px_rgba(16,185,129,0.25)] relative backdrop-blur-2xl my-auto overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Always-visible Sticky Top Header with Close Button */}
            <div className="sticky top-0 z-30 flex items-center justify-between pb-3 mb-3 border-b border-white/10 bg-stone-900/95 backdrop-blur-md">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                {activeCapsuleModal === 'traffic'
                  ? (language === 'bm' ? 'Pusat Trafik & Status Jalan Raya' : 'Highlands Traffic Hub & Telemetry')
                  : activeCapsuleModal === 'microclimate'
                  ? (language === 'bm' ? 'Mikroiklim & Ketinggian' : 'Highlands Microclimate & Altitude')
                  : activeCapsuleModal === 'hazard'
                  ? (language === 'bm' ? 'Amaran Bahaya & Keselamatan' : 'Highlands Hazard Alerts & Safety')
                  : (language === 'bm' ? 'Acara & Festival Tanah Tinggi' : 'Highland Events & Festivals')}
              </span>
              <button
                onClick={() => setActiveCapsuleModal(null)}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto touch-pan-y space-y-6 pr-1">

            {/* Microclimate (Includes Altitude) */}
            {activeCapsuleModal === 'microclimate' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Mountain className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-heading font-extrabold text-stone-100">
                      Microclimate & Altitude (1,440m - 2,032m ASL)
                    </h3>
                  </div>
                </div>
                <WeatherWidget weatherList={weatherList} language={language} />
              </div>
            )}

            {/* Traffic Modal Content */}
            {activeCapsuleModal === 'traffic' && (
              <div className="space-y-6">
                <TrafficWidget
                  alerts={trafficAlerts}
                  language={language}
                  onSelectRouteOnMap={(roadName, coords) => {
                    setActiveCapsuleModal(null);
                    setIsMapModalOpen(true);
                    if (coords) {
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('focus-hotspot-on-map', { detail: coords }));
                      }, 250);
                    } else {
                      window.dispatchEvent(new CustomEvent('focus-approach-routes'));
                    }
                  }}
                />
              </div>
            )}

            {/* Hazard Modal Content */}
            {activeCapsuleModal === 'hazard' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-stone-100">Live Hazard Alerts</h3>
                <HazardWidget hazards={hazards} language={language} />
              </div>
            )}

            {/* Events Modal Content */}
            {activeCapsuleModal === 'events' && (
              <div className="space-y-4">
                <EventsWidget events={events} language={language} />
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* Verified Directories Modal Popup (click outside to close) */}
      {isDirectoriesModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/85 backdrop-blur-md p-2 overflow-y-auto"
          onClick={() => setIsDirectoriesModalOpen(false)}
        >
          <div
            className="glass-panel w-full max-w-7xl mt-16 mb-20 pb-28 overflow-y-auto rounded-3xl p-4 sm:p-6 bg-stone-900 border border-emerald-500/30 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Top Close Bar */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 sticky top-0 bg-stone-900/95 backdrop-blur-md z-30 pt-1">
              <span className="text-xs font-mono font-bold text-emerald-400">Verified Highland Directories</span>
              <button
                onClick={() => setIsDirectoriesModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
              onToggleBookmark={handleToggleBookmark}
              onOpenFarmMatrix={() => setIsFarmMatrixOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Portals Hub Modal Popup (click outside to close) */}
      {isPortalsModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/85 backdrop-blur-md p-2 overflow-y-auto"
          onClick={() => setIsPortalsModalOpen(false)}
        >
          <div
            className="glass-panel w-full max-w-7xl mt-16 mb-20 pb-28 overflow-y-auto rounded-3xl p-4 sm:p-6 bg-stone-900 border border-teal-500/30 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Top Close Bar */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 sticky top-0 bg-stone-900/95 backdrop-blur-md z-30 pt-1">
              <span className="text-xs font-mono font-bold text-teal-400">Highlands Portal Hub</span>
              <button
                onClick={() => setIsPortalsModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <PortalsSection
              language={language}
              onExploreTownOnMap={(town) => {
                setIsPortalsModalOpen(false);
                const match = places.find((p) => p.township === town);
                if (match) setSelectedPlaceForMap(match);
                navigateToSection('interactive-map');
              }}
              onOpenFarmMatrix={() => setIsFarmMatrixOpen(true)}
              onOpenVendorPortal={() => {
                setIsPortalsModalOpen(false);
                handleOpenVendorPortal();
              }}
            />
          </div>
        </div>
      )}
      {/* Interactive Gallery Modal Popup (click outside to close) */}
      {isGalleryModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsGalleryModalOpen(false)}
        >
          <div
            className="glass-panel w-full max-w-7xl mt-12 mb-20 pb-12 overflow-y-auto rounded-3xl p-4 sm:p-6 bg-stone-900 border border-emerald-500/30 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Top Close Bar */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 sticky top-0 bg-stone-900/95 backdrop-blur-md z-30 pt-1">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Visual Highlights &amp; Highland Horizons
              </span>
              <button
                onClick={() => setIsGalleryModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <GalleryCarousel items={galleryItems} onSelectPlace={handleSelectPlaceForMap} />
          </div>
        </div>
      )}

      {/* Offline Trail Engine Modal */}
      <OfflineTrailEngineModal
        isOpen={isTrailEngineOpen}
        onClose={() => setIsTrailEngineOpen(false)}
        language={language}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Vendor Management Dashboard Modal */}
      <VendorDashboard
        isOpen={isVendorDashboardOpen}
        onClose={() => setIsVendorDashboardOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenOnboarding={() => {
          setIsVendorDashboardOpen(false);
          setIsVendorOnboardingOpen(true);
        }}
        onSignOut={() => {
          setCurrentUser(null);
          refreshStorageData();
        }}
        onOpenAdmin={() => {
          if (currentUser?.role === 'admin' || currentUser?.email === 'ayahsyirah77@gmail.com') {
            setIsAdminOpen(true);
          } else {
            setIsAdminLoginOpen(true);
          }
        }}
      />

      {/* Vendor Onboarding Modal */}
      <VendorOnboardingModal
        isOpen={isVendorOnboardingOpen}
        onClose={() => setIsVendorOnboardingOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOnboardingComplete={() => {
          setIsVendorOnboardingOpen(false);
          setIsVendorDashboardOpen(true);
        }}
      />

      {/* Farm Pass & Ticket Comparison Matrix Modal */}
      <FarmTicketMatrixModal
        isOpen={isFarmMatrixOpen}
        onClose={() => setIsFarmMatrixOpen(false)}
        language={language}
        onAddAttractionCost={(ticket) => {
          window.dispatchEvent(
            new CustomEvent('add-itinerary-budget-item', {
              detail: {
                title: ticket.name,
                estimatedCost: ticket.adultPriceRm,
                township: ticket.township,
              },
            })
          );
        }}
      />

      {/* Find My Party (Group Beacon) Modal */}
      <FindMyPartyModal
        isOpen={isFindMyPartyOpen}
        onClose={() => setIsFindMyPartyOpen(false)}
        language={language}
      />

      {/* Motorbike & Scooter Rental Marketplace Modal */}
      <MotorbikeRentalModal
        isOpen={isMotorbikeRentalOpen}
        onClose={() => setIsMotorbikeRentalOpen(false)}
        language={language}
        currentUser={currentUser}
      />

      {/* Back To Top Floating Action */}
      <BackToTop />
    </div>
  );
}
