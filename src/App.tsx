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
  VendorBookingAlert,
} from './types';
import { weatherService } from './services/weather';
import { firebaseService, UserProfile } from './services/firebase';
import { hazardFeedService } from './services/hazardFeedService';
import { fetchLiveWebHazards } from './services/webHazardFetcher';
import { pushNotificationService } from './services/pushNotificationService';
import { getTranslation } from './services/i18n';

import { LoadingScreen } from './components/LoadingScreen';
import { Navbar } from './components/Navbar';
import { HeroSearchBar } from './components/HeroSearchBar';
import { MobileUpperHero } from './components/MobileUpperHero';
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
import { MotorbikeRentalModal } from './components/MotorbikeRentalModal';
import { MasjidSurauModal } from './components/MasjidSurauModal';
import { OfflineTrailEngineModal } from './components/OfflineTrailEngineModal';
import { EmergencyContactTrackerView } from './components/EmergencyContactTrackerView';
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
import { ForeignerMedicalChargesModal } from './components/ForeignerMedicalChargesModal';
import { VendorBookingAlertModal } from './components/VendorBookingAlertModal';
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
  ArrowLeft,
  Navigation,
  Bike,
  Route,
  Megaphone,
  Camera,
  Smartphone,
  X,
  BedDouble,
  BellRing,
  CloudSun,
  Car,
  ShieldAlert,
  Calendar,
  Layers,
  Compass,
} from 'lucide-react';

function checkIsVendorRoute(): boolean {
  if (typeof window === 'undefined') return false;

  const pathname = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  return (
    pathname.startsWith('/vendor') ||
    search.includes('vendor=true') ||
    hash === '#vendor'
  );
}

function checkIsStandaloneChat(): boolean {
  if (typeof window === 'undefined') return false;
  if (checkIsVendorRoute()) return false;

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

function getInitialTrailTrackParams(): { sessionId: string; token: string | null } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('trailTrack')?.trim();
  if (!sessionId) return null;
  return {
    sessionId,
    token: params.get('token')?.trim() || null,
  };
}

export default function App() {
  usePwaAutoUpdate();
  const [language, setLanguage] = useState<Language>('en');
  const notificationCenter = useMultiChannelNotifications();
  const [places, setPlaces] = useState<Place[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [weatherList, setWeatherList] = useState<WeatherData[]>([]);
  const [trafficAlerts, setTrafficAlerts] = useState<TrafficAlert[]>([]);
  const [hazards, setHazards] = useState<HazardAlert[]>([]);
  const [events, setEvents] = useState<EventNotification[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(firebaseService.getCurrentUser());
  const [mainBgUrl, setMainBgUrl] = useState<string>(() => firebaseService.getMainPageBackground());
  const [headerBgUrl, setHeaderBgUrl] = useState<string>(
    () => firebaseService.getVisualBackgrounds().headerBackgroundUrl
  );

  useEffect(() => {
    const unsub = firebaseService.subscribeMainPageBackground((url) => {
      setMainBgUrl(url);
    });
    const unsubVisuals = firebaseService.subscribeVisualBackgrounds((cfg) => {
      setHeaderBgUrl(cfg.headerBackgroundUrl || '');
    });
    return () => {
      unsub();
      unsubVisuals();
    };
  }, []);

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
  const [trailTrackParams, setTrailTrackParams] = useState<{
    sessionId: string;
    token: string | null;
  } | null>(getInitialTrailTrackParams);
  const [isFindMyPartyOpen, setIsFindMyPartyOpen] = useState<boolean>(checkIsBeaconInvite);
  const [isMotorbikeRentalOpen, setIsMotorbikeRentalOpen] = useState(false);
  const [isAccommodationModalOpen, setIsAccommodationModalOpen] = useState(false);
  const [activeCapsuleModal, setActiveCapsuleModal] = useState<
    null | 'microclimate' | 'traffic' | 'hazard' | 'events'
  >(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isVendorPortalOpen, setIsVendorPortalOpen] = useState<boolean>(checkIsVendorRoute);
  const [isVendorAlertsModalOpen, setIsVendorAlertsModalOpen] = useState(false);
  const [vendorAlerts, setVendorAlerts] = useState<VendorBookingAlert[]>([]);
  const [activeVendorBannerAlert, setActiveVendorBannerAlert] = useState<VendorBookingAlert | null>(null);
  const lastRedirectedVendorUidRef = useRef<string | null>(null);
  const [isFarmMatrixOpen, setIsFarmMatrixOpen] = useState(false);
  const [isParkingEvOpen, setIsParkingEvOpen] = useState(false);
  const [isForeignerMedicalOpen, setIsForeignerMedicalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MainCategory>('food');
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | undefined>(undefined);

  // Helper to filter alerts for currently signed-in vendor (or all for admin)
  const getScopedVendorAlerts = useCallback((user: UserProfile | null): VendorBookingAlert[] => {
    if (!user || (user.role !== 'vendor' && user.role !== 'admin')) return [];
    const allAlerts = firebaseService.getVendorBookingAlerts();
    if (user.role === 'admin') return allAlerts;
    const normalizedEmail = user.email?.trim().toLowerCase();
    const ownedListings = firebaseService
      .getVendorListings()
      .filter(
        (l) =>
          (normalizedEmail && l.ownerEmail?.trim().toLowerCase() === normalizedEmail) ||
          (user.uid && l.ownerUid === user.uid)
      );
    const ownedListingIds = new Set(ownedListings.map((l) => l.id));
    const ownedBizNames = new Set(
      ownedListings.map((l) => l.businessName?.trim().toLowerCase()).filter(Boolean)
    );
    return allAlerts.filter((a) => {
      if (user.uid && a.vendorUid && a.vendorUid === user.uid) return true;
      if (normalizedEmail && a.vendorEmail?.trim().toLowerCase() === normalizedEmail) return true;
      if (a.vendorId && ownedListingIds.has(a.vendorId)) return true;
      if (a.vendorName && ownedBizNames.has(a.vendorName.trim().toLowerCase())) return true;
      return false;
    });
  }, []);

  // Lock body scroll when capsule modal is open
  useEffect(() => {
    const isAnyModalOpen = activeCapsuleModal || isDirectoriesModalOpen || isPortalsModalOpen || isMapModalOpen || isMasjidModalOpen || isTrailEngineOpen || isFindMyPartyOpen || isAccommodationModalOpen || isUserDashboardOpen || isAdminOpen || isAdminLoginOpen || isVendorPortalOpen || isVendorAlertsModalOpen || isGalleryOpen;
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
  }, [activeCapsuleModal, isDirectoriesModalOpen, isPortalsModalOpen, isMapModalOpen, isMasjidModalOpen, isTrailEngineOpen, isFindMyPartyOpen, isAccommodationModalOpen, isUserDashboardOpen, isAdminOpen, isAdminLoginOpen, isVendorPortalOpen, isVendorAlertsModalOpen, isGalleryOpen]);

  // Sync PWA manifest (/manifest-vendor.json), Apple web-app title, and /vendor URL when Vendor Portal is active
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const manifestLink =
      document.getElementById('camgo-manifest-link') ||
      document.querySelector('link[rel="manifest"]');
    const appleTitle =
      document.getElementById('camgo-apple-title') ||
      document.querySelector('meta[name="apple-mobile-web-app-title"]');

    if (isVendorPortalOpen) {
      if (manifestLink) manifestLink.setAttribute('href', '/manifest-vendor.json');
      if (appleTitle) appleTitle.setAttribute('content', 'CamGo Vendor');
      if (
        window.history?.replaceState &&
        !window.location.pathname.toLowerCase().startsWith('/vendor')
      ) {
        window.history.replaceState({}, document.title, '/vendor');
      }
    } else {
      if (manifestLink) manifestLink.setAttribute('href', '/manifest.json');
      if (appleTitle) appleTitle.setAttribute('content', 'CamGo');
      if (
        window.history?.replaceState &&
        window.location.pathname.toLowerCase().startsWith('/vendor')
      ) {
        window.history.replaceState({}, document.title, '/');
      }
    }
  }, [isVendorPortalOpen]);

  // Strict RBAC guard: Standard travelers ('user') cannot access Vendor Dashboard under any circumstances
  const handleOpenVendorPortal = useCallback(() => {
    const activeUser = firebaseService.getCurrentUser();
    if (activeUser && activeUser.role === 'user') {
      return;
    }
    setIsUserDashboardOpen(false);
    setIsAccommodationModalOpen(false);
    setIsPortalsModalOpen(false);
    setIsVendorPortalOpen(true);
  }, []);

  const refreshStorageData = () => {
    setPlaces(firebaseService.getPlaces());
    setGalleryItems(firebaseService.getGallery());
    setTrafficAlerts(firebaseService.getTrafficAlerts());
    setHazards(firebaseService.getHazardAlerts());
    setEvents(firebaseService.getEvents());
    const activeUser = firebaseService.getCurrentUser();
    setCurrentUser(activeUser);
    setVendorAlerts(getScopedVendorAlerts(activeUser));
  };

  // Automatically direct admin-registered or existing vendors straightaway to Vendor Dashboard upon sign in
  useEffect(() => {
    if (!currentUser) {
      lastRedirectedVendorUidRef.current = null;
      setVendorAlerts([]);
      setActiveVendorBannerAlert(null);
      return;
    }

    const scoped = getScopedVendorAlerts(currentUser);
    setVendorAlerts(scoped);

    const recentUnread = scoped.find(
      (a) => !a.isRead && Date.now() - new Date(a.createdAt || 0).getTime() < 15 * 60 * 1000
    );
    if (recentUnread) {
      setActiveVendorBannerAlert((prev) => prev || recentUnread);
    }

    if (currentUser.role === 'vendor' && lastRedirectedVendorUidRef.current !== currentUser.uid) {
      lastRedirectedVendorUidRef.current = currentUser.uid;
      setIsAuthOpen(false);
      setIsUserDashboardOpen(false);
      setIsAdminOpen(false);
      setIsVendorPortalOpen(true);
    }
  }, [currentUser, getScopedVendorAlerts]);

  // Real-time Vendor Booking & Payment Alerts listener (in-app phone banner + native push notification + chime)
  useEffect(() => {
    const syncVendorAlerts = () => {
      const user = firebaseService.getCurrentUser();
      setVendorAlerts(getScopedVendorAlerts(user));
    };

    const handleNewBookingAlert = (e: any) => {
      const alert = e?.detail as VendorBookingAlert | undefined;
      const user = firebaseService.getCurrentUser();
      syncVendorAlerts();
      if (!alert || !user || (user.role !== 'vendor' && user.role !== 'admin')) return;

      const scoped = getScopedVendorAlerts(user);
      const matchesUser = user.role === 'admin' || scoped.some((item) => item.id === alert.id);
      if (matchesUser && !alert.isRead) {
        setActiveVendorBannerAlert(alert);
        const proofNote = alert.paymentProofUrl
          ? 'Proof of payment attached.'
          : alert.paymentReference
          ? `Ref: ${alert.paymentReference}.`
          : 'Awaiting confirmation.';
        pushNotificationService
          .dispatchNotification({
            title: `New Booking: ${alert.vendorName} (${alert.bookingCode})`,
            body: `${alert.guestName} (${alert.guestPhone}) • ${alert.checkInOrStart} → ${alert.checkOutOrEnd} • ${proofNote}`,
            tag: alert.id,
            url: '/vendor',
          })
          .catch(() => {});
      }
    };

    window.addEventListener('vendor-booking-alert', handleNewBookingAlert);
    window.addEventListener('vendor-booking-alerts-updated', syncVendorAlerts);
    return () => {
      window.removeEventListener('vendor-booking-alert', handleNewBookingAlert);
      window.removeEventListener('vendor-booking-alerts-updated', syncVendorAlerts);
    };
  }, [getScopedVendorAlerts]);

  useEffect(() => {
    refreshStorageData();
    firebaseService.recordSiteVisit().catch(() => {});
    hazardFeedService.fetchLiveFeed(false).then((liveAlerts) => {
      if (Array.isArray(liveAlerts) && liveAlerts.length > 0) {
        setHazards(liveAlerts);
      }
    }).catch(() => {});
    fetchLiveWebHazards({ force: false }).catch(() => {});
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

    const handleOpenForeignerMedical = () => setIsForeignerMedicalOpen(true);
    window.addEventListener('open-foreigner-medical-charges', handleOpenForeignerMedical);

    const handleLocationChange = () => {
      if (checkIsVendorRoute()) {
        setIsStandaloneChatView(false);
        setIsChatOpen(false);
        setIsVendorPortalOpen(true);
        return;
      }

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

    if (checkIsVendorRoute()) {
      setIsStandaloneChatView(false);
      setIsChatOpen(false);
      setIsVendorPortalOpen(true);
    } else if (checkIsStandaloneChat()) {
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
    if (isVendorAlertsModalOpen) {
      setIsVendorAlertsModalOpen(false);
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
    isVendorAlertsModalOpen,
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

  // Dedicated Emergency Contact Live Footprint Map view (?trailTrack=<sessionId>&token=<token>)
  if (trailTrackParams?.sessionId) {
    return (
      <EmergencyContactTrackerView
        sessionId={trailTrackParams.sessionId}
        token={trailTrackParams.token}
        language={language}
        onExitTracker={() => {
          setTrailTrackParams(null);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('trailTrack');
            url.searchParams.delete('token');
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
          }
        }}
      />
    );
  }

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
    <div 
      className="min-h-screen text-stone-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white relative bg-stone-950 bg-cover bg-center bg-fixed"
      style={mainBgUrl ? { backgroundImage: `url(${mainBgUrl})` } : undefined}
    >
      {mainBgUrl && <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-[1px] pointer-events-none z-0" />}
      <div className="relative z-10 flex flex-col min-h-screen pb-24 sm:pb-14">
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
        onOpenVendorPortal={handleOpenVendorPortal}
        onOpenVendorAlerts={() => setIsVendorAlertsModalOpen(true)}
        vendorAlertCount={vendorAlerts.filter((a) => !a.isRead).length}
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

      {/* Sticky Live Vendor Booking & Payment Alert Banner */}
      {activeVendorBannerAlert && (
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[200] w-[95vw] max-w-2xl px-1 sm:px-2 animate-in slide-in-from-top-4 duration-300">
          <div className="rounded-2xl bg-gradient-to-r from-amber-950/95 via-stone-900/95 to-emerald-950/95 backdrop-blur-xl border-2 border-amber-400/80 shadow-[0_14px_45px_rgba(245,158,11,0.4)] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-stone-100">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-amber-500 text-stone-950 shrink-0 animate-bounce">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500 text-white">
                    {activeVendorBannerAlert.depositPaidRm > 0 ? 'New Paid Deposit' : 'New Booking Alert'}
                  </span>
                  <span className="font-mono text-xs font-black text-amber-300">
                    {activeVendorBannerAlert.bookingCode}
                  </span>
                  {activeVendorBannerAlert.paymentProofUrl && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Proof Attached
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                  {activeVendorBannerAlert.guestName} ({activeVendorBannerAlert.guestPhone}) • {activeVendorBannerAlert.itemSummary}
                </p>
                <p className="text-[11px] text-amber-200/80 truncate">
                  {activeVendorBannerAlert.checkInOrStart} → {activeVendorBannerAlert.checkOutOrEnd}
                  {activeVendorBannerAlert.depositPaidRm > 0
                    ? ` · RM${activeVendorBannerAlert.depositPaidRm} Deposit`
                    : ' · Direct Booking Confirmation'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              {(() => {
                const digits = (activeVendorBannerAlert.guestPhone || '').replace(/\D/g, '');
                const waGuestDigits = digits.startsWith('0') ? `60${digits.slice(1)}` : digits;
                if (!waGuestDigits) return null;
                const guestReplyText = `Hi ${activeVendorBannerAlert.guestName}, we received your booking ${activeVendorBannerAlert.bookingCode} (${activeVendorBannerAlert.itemSummary}) via CamGo!`;
                return (
                  <a
                    href={`https://wa.me/${waGuestDigits}?text=${encodeURIComponent(guestReplyText)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer whitespace-nowrap"
                  >
                    WhatsApp
                  </a>
                );
              })()}
              <button
                type="button"
                onClick={() => {
                  firebaseService.markVendorBookingAlertRead(activeVendorBannerAlert.id);
                  setActiveVendorBannerAlert(null);
                  setIsVendorAlertsModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black cursor-pointer whitespace-nowrap"
              >
                View Proof
              </button>
              <button
                type="button"
                onClick={() => setActiveVendorBannerAlert(null)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
                aria-label="Dismiss alert banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* PWA Double-Tap Back to Exit Toast */}
      <PreventExitToast
        isVisible={showExitToast}
        message={exitMessage}
        remainingSeconds={remainingSeconds}
        onDismiss={dismissToast}
      />

      {/* Mobile Upper Hero (Image 3 Scenic Background + Image 2 Greeting & Search) */}
      <MobileUpperHero
        language={language}
        currentUser={currentUser}
        places={places}
        events={events}
        trafficAlerts={trafficAlerts}
        hazards={hazards}
        vendorAlertCount={vendorAlerts.filter((a) => !a.isRead).length}
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
        onOpenMap={() => setIsMapModalOpen(true)}
        onOpenTraffic={() => setActiveCapsuleModal('traffic')}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenDirectories={() => setIsDirectoriesModalOpen(true)}
        onOpenPortals={() => setIsPortalsModalOpen(true)}
        onOpenSos={() => window.dispatchEvent(new CustomEvent('open-emergency-sos'))}
        onOpenVendorPortal={handleOpenVendorPortal}
        onOpenVendorAlerts={() => setIsVendorAlertsModalOpen(true)}
        onSelectPlace={handleSelectPlaceForMap}
        onSelectEvent={(evt) => {
          const match = places.find((p) => p.township === evt.township);
          if (match) handleSelectPlaceForMap(match);
          else setIsMapModalOpen(true);
        }}
        onSelectTownship={(town) => {
          const match = places.find((p) => p.township === town);
          if (match) handleSelectPlaceForMap(match);
          else setIsPortalsModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* 3. Desktop Hero Section */}
        <section id="hero-section" className="hidden sm:flex relative items-center justify-center pt-36 md:pt-40 lg:pt-44 pb-8 px-6 lg:px-8 overflow-hidden">
          {headerBgUrl && (
            <img
              src={headerBgUrl}
              alt="Cameron Highlands header background"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/60 to-stone-950/90 pointer-events-none" />

          <div className="relative z-10 max-w-5xl mx-auto text-center space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-black tracking-tight text-stone-50 leading-[1.1] [text-wrap:balance]">
              {getTranslation(language, 'hero_title')}{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
                Cameron Highlands
              </span>
            </h1>
            <p className="text-sm lg:text-base text-stone-300 max-w-2xl mx-auto leading-relaxed">
              {language === 'bm'
                ? 'Cuaca mikro tanah tinggi masa nyata, amaran trafik & bahaya secara langsung, navigasi denai luar talian, serta portal inap desa yang aktif.'
                : 'Real-time highland microclimates, live road & hazard alerts, offline trail navigation, and verified direct homestay portals.'}
            </p>
          </div>
        </section>

        {/* 3b. PC View Only Search Field under Hero Banner */}
        <HeroSearchBar
          language={language}
          places={places}
          events={events}
          onSelectPlace={handleSelectPlaceForMap}
          onSelectEvent={(evt) => {
            const match = places.find((p) => p.township === evt.township);
            if (match) handleSelectPlaceForMap(match);
            else setIsMapModalOpen(true);
          }}
          onSelectTownship={(town) => {
            const match = places.find((p) => p.township === town);
            if (match) handleSelectPlaceForMap(match);
            else setIsPortalsModalOpen(true);
          }}
          onOpenMap={() => setIsMapModalOpen(true)}
          onOpenPortalsModal={() => setIsPortalsModalOpen(true)}
        />

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
          onOpenDirectories={() => setIsDirectoriesModalOpen(true)}
          onOpenPortals={() => setIsPortalsModalOpen(true)}
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
                    Highland Events/Photo Gallery
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

      {/* Map Modal (Edge-to-Edge Viewport with Floating Glass HUD inside InteractiveMap) */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[110] bg-stone-950 flex flex-col">
          <div className="flex-1 min-h-0 relative">
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
        currentUser={currentUser}
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
        language={language}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(accountType) => {
          const user = firebaseService.getCurrentUser();
          setCurrentUser(user);
          if ((accountType === 'business' || user?.role === 'vendor') && user?.role !== 'user') {
            setIsUserDashboardOpen(false);
            setIsAdminOpen(false);
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
          onOpenAdmin={() => {
            if (currentUser?.role === 'admin') {
              setIsAdminOpen(true);
            }
          }}
          onOpenBookingAlerts={() => setIsVendorAlertsModalOpen(true)}
          unreadAlertCount={vendorAlerts.filter((a) => !a.isRead).length}
        />
      )}

      {/* Standalone Vendor Booking & Payment Alerts Modal */}
      <VendorBookingAlertModal
        isOpen={isVendorAlertsModalOpen}
        onClose={() => setIsVendorAlertsModalOpen(false)}
        alerts={vendorAlerts}
        currentUser={currentUser}
        onOpenVendorDashboard={handleOpenVendorPortal}
      />
      
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

      {/* Bottom Sticky Footer for Mobile: Home, Directories, Chat, CamGo AI, SOS */}
      <MobileStickyFooter
        language={language}
        activeModal={
          isDirectoriesModalOpen
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
      {/* Highland Photo Gallery Full-Page View */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-[140] bg-stone-950 flex flex-col overflow-hidden text-stone-100 animate-in fade-in duration-200">
          <div className="shrink-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-stone-950/95 backdrop-blur-md">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 cursor-pointer shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="no-mobile-clamp text-sm sm:text-xl font-heading font-black text-stone-100 truncate">
                  Highland Events/Photo Gallery
                </h3>
                <p className="text-[11px] sm:text-xs text-stone-400 truncate">
                  High-elevation photography, tea valley horizons, &amp; cultural spotlights
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsGalleryOpen(false)}
              className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-3.5 sm:p-6 pb-20"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="max-w-6xl mx-auto">
              <GalleryCarousel
                items={galleryItems}
                onSelectPlace={(place) => {
                  setIsGalleryOpen(false);
                  handleSelectPlaceForMap(place);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Directories Full-Page View */}
      {isDirectoriesModalOpen && (
        <div className="fixed inset-0 z-[130] bg-stone-950 flex flex-col overflow-hidden text-stone-100 animate-in fade-in duration-200">
          <div className="shrink-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-stone-950/95 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setIsDirectoriesModalOpen(false)}
                className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 cursor-pointer shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="no-mobile-clamp text-sm sm:text-lg font-heading font-black text-white truncate">
                {language === 'bm' ? 'Direktori Cameron Highlands' : 'Cameron Highlands Directory'}
              </h3>
            </div>
            <button
              onClick={() => setIsDirectoriesModalOpen(false)}
              className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-3.5 sm:p-6 pb-24"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="max-w-6xl mx-auto">
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
              />
            </div>
          </div>
        </div>
      )}

      {/* Portals / Hub Full-Page View */}
      {isPortalsModalOpen && (
        <div className="fixed inset-0 z-[130] bg-stone-950 flex flex-col overflow-hidden text-stone-100 animate-in fade-in duration-200">
          <div className="shrink-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-stone-950/95 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setIsPortalsModalOpen(false)}
                className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 cursor-pointer shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="no-mobile-clamp text-sm sm:text-lg font-heading font-black text-white truncate">
                {language === 'bm' ? 'Hab Portal Tanah Tinggi' : 'Cameron Highlands Hub & Portals'}
              </h3>
            </div>
            <button
              onClick={() => setIsPortalsModalOpen(false)}
              className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-3.5 sm:p-6 pb-24"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="max-w-6xl mx-auto">
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
                onOpenVendorPortal={handleOpenVendorPortal}
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
          onOpenPostClassified={() => {
            setIsClassifiedsModalOpen(false);
            setUserDashboardInitialTab('classifieds');
            if (currentUser) {
              setIsUserDashboardOpen(true);
            } else {
              setIsAuthOpen(true);
            }
          }}
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
          onOpenVendorPortal={handleOpenVendorPortal}
        />
      )}

      <ForeignerMedicalChargesModal
        isOpen={isForeignerMedicalOpen}
        onClose={() => setIsForeignerMedicalOpen(false)}
        language={language}
      />

      {/* Full-Page View: Microclimate (WeatherWidget) */}
      {activeCapsuleModal === 'microclimate' && (
        <div className="fixed inset-0 z-[130] bg-stone-950 flex flex-col overflow-hidden text-stone-100 animate-in fade-in duration-200">
          <div className="shrink-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-stone-950/95 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setActiveCapsuleModal(null)}
                className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 cursor-pointer shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                <CloudSun className="w-5 h-5" />
              </div>
              <h3 className="no-mobile-clamp text-sm sm:text-lg font-heading font-black text-white truncate">
                {language === 'bm' ? 'Cuaca Mikro Tanah Tinggi' : 'Highland Weather & Microclimate'}
              </h3>
            </div>
            <button
              onClick={() => setActiveCapsuleModal(null)}
              className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-3.5 sm:p-6 pb-20"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="max-w-4xl mx-auto">
              <WeatherWidget weatherList={weatherList} language={language} />
            </div>
          </div>
        </div>
      )}

      {/* Full-Page View: Traffic (TrafficWidget) */}
      {activeCapsuleModal === 'traffic' && (
        <div className="fixed inset-0 z-[130] bg-stone-950 flex flex-col overflow-hidden text-stone-100 animate-in fade-in duration-200">
          <div className="shrink-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-stone-950/95 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setActiveCapsuleModal(null)}
                className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 cursor-pointer shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <h3 className="no-mobile-clamp text-sm sm:text-lg font-heading font-black text-white truncate">
                {language === 'bm' ? 'Info Trafik Tanah Tinggi' : 'Live Highland Traffic'}
              </h3>
            </div>
            <button
              onClick={() => setActiveCapsuleModal(null)}
              className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-3.5 sm:p-6 pb-20"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="max-w-4xl mx-auto">
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

      {/* Full-Page View: Hazard & Slope Alerts (HazardWidget) */}
      {activeCapsuleModal === 'hazard' && (
        <div className="fixed inset-0 z-[130] bg-stone-950 flex flex-col overflow-hidden text-stone-100 animate-in fade-in duration-200">
          <div className="shrink-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-stone-950/95 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setActiveCapsuleModal(null)}
                className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 cursor-pointer shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="no-mobile-clamp text-sm sm:text-lg font-heading font-black text-white truncate">
                {language === 'bm' ? 'Notis / Amaran' : 'Notice / Alert'}
              </h3>
            </div>
            <button
              onClick={() => setActiveCapsuleModal(null)}
              className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-3.5 sm:p-6 pb-20"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="max-w-4xl mx-auto">
              <HazardWidget hazards={hazards} language={language} />
            </div>
          </div>
        </div>
      )}

      {/* Full-Page View: Highland Events (EventsWidget) */}
      {activeCapsuleModal === 'events' && (
        <div className="fixed inset-0 z-[130] bg-stone-950 flex flex-col overflow-hidden text-stone-100 animate-in fade-in duration-200">
          <div className="shrink-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-stone-950/95 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setActiveCapsuleModal(null)}
                className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 cursor-pointer shrink-0"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="no-mobile-clamp text-sm sm:text-lg font-heading font-black text-white truncate">
                {language === 'bm' ? 'Acara & Kalendar Tanah Tinggi' : 'Highland Events & Calendar'}
              </h3>
            </div>
            <button
              onClick={() => setActiveCapsuleModal(null)}
              className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-3.5 sm:p-6 pb-20"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="max-w-4xl mx-auto">
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
    </div>
  );
}
