// MobileHomeCards.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  CloudRain,
  CloudSun,
  CloudFog,
  CloudLightning,
  Sun,
  ArrowRight,
  Users,
  MapPin,
  Bike,
  BedDouble,
  ShieldCheck,
  Car,
  ArrowRightLeft,
  Briefcase,
  Compass,
  Zap,
  Sparkles,
  ShieldAlert,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Wind,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import {
  MobileHomeCard,
  Language,
  WeatherData,
  TrafficAlert,
  HazardAlert,
  AccommodationListing,
  MotorbikeRentalPartner,
  Township,
} from '../types';
import { firebaseService, VisualBackgroundsConfig } from '../services/firebase';
import { INITIAL_MOBILE_HOME_CARDS } from '../data/initialHomeCards';
import { safeSrc, DEFAULT_PLACE_IMAGE } from '../utils/safeMedia';
import { MasjidIcon } from './Navbar';

interface MobileHomeCardsProps {
  language: Language;
  onOpenWeather: () => void;
  onOpenHazard: () => void;
  onOpenMap: () => void;
  onOpenItinerary: () => void;
  onOpenParty: () => void;
  onOpenMotorbike?: () => void;
  onOpenAccommodation?: () => void;
  onOpenSos: () => void;
  onOpenChat?: (channelId?: string) => void;
  onOpenTrailEngine?: () => void;
  onOpenAi?: () => void;
  onOpenTraffic?: () => void;
  onOpenMasjid?: () => void;
  onOpenParkingEv?: () => void;
  onOpenCurrency?: () => void;
  onOpenClassifieds?: () => void;
  onOpenDirectories?: () => void;
  onOpenPortals?: () => void;
  onSelectTownshipOnMap?: (town: Township) => void;
  weatherList?: WeatherData[];
  trafficAlerts?: TrafficAlert[];
  hazards?: HazardAlert[];
}

export const MobileHomeCards: React.FC<MobileHomeCardsProps> = ({
  language,
  onOpenWeather,
  onOpenHazard,
  onOpenMap,
  onOpenItinerary,
  onOpenParty,
  onOpenMotorbike,
  onOpenAccommodation,
  onOpenSos,
  onOpenChat,
  onOpenTrailEngine,
  onOpenAi,
  onOpenTraffic,
  onOpenMasjid,
  onOpenParkingEv,
  onOpenCurrency,
  onOpenClassifieds,
  onOpenDirectories,
  onOpenPortals,
  onSelectTownshipOnMap,
  weatherList = [],
  hazards = [],
}) => {
  const [cards, setCards] = useState<MobileHomeCard[]>(() => firebaseService.getHomeCards());
  const [accommodations, setAccommodations] = useState<AccommodationListing[]>(() =>
    firebaseService.getAccommodationListings()
  );
  const [motorbikePartners, setMotorbikePartners] = useState<MotorbikeRentalPartner[]>(() =>
    firebaseService.getMotorbikePartners()
  );
  const [visualBackgrounds, setVisualBackgrounds] = useState<VisualBackgroundsConfig>(() =>
    firebaseService.getVisualBackgrounds()
  );
  const [desktopWeatherIdx, setDesktopWeatherIdx] = useState(0);
  const exploreScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleCardsUpdated = (e: any) => {
      const updated = e?.detail || firebaseService.getHomeCards();
      setCards(updated);
    };
    const handleAccomUpdated = (e: any) => {
      const updated = Array.isArray(e?.detail) ? e.detail : firebaseService.getAccommodationListings();
      setAccommodations(updated);
    };
    const handleBikeUpdated = (e: any) => {
      const updated = Array.isArray(e?.detail) ? e.detail : firebaseService.getMotorbikePartners();
      setMotorbikePartners(updated);
    };
    const handleVendorListingsUpdated = () => {
      setAccommodations(firebaseService.getAccommodationListings());
      setMotorbikePartners(firebaseService.getMotorbikePartners());
    };
    const unsubVisualBgs = firebaseService.subscribeVisualBackgrounds((cfg) => {
      setVisualBackgrounds(cfg);
    });
    window.addEventListener('home-cards-updated', handleCardsUpdated);
    window.addEventListener('accommodation-listings-updated', handleAccomUpdated);
    window.addEventListener('motorbike-partners-updated', handleBikeUpdated);
    window.addEventListener('vendor-listings-updated', handleVendorListingsUpdated);
    const interval = setInterval(() => {
      setCards(firebaseService.getHomeCards());
      setAccommodations(firebaseService.getAccommodationListings());
      setMotorbikePartners(firebaseService.getMotorbikePartners());
    }, 2500);
    return () => {
      unsubVisualBgs();
      window.removeEventListener('home-cards-updated', handleCardsUpdated);
      window.removeEventListener('accommodation-listings-updated', handleAccomUpdated);
      window.removeEventListener('motorbike-partners-updated', handleBikeUpdated);
      window.removeEventListener('vendor-listings-updated', handleVendorListingsUpdated);
      clearInterval(interval);
    };
  }, []);

  const safeWeatherIndex = weatherList.length > 0 ? desktopWeatherIdx % weatherList.length : 0;
  const currentWeather = weatherList[0];
  const desktopWeather = weatherList[safeWeatherIndex] || currentWeather;

  const rawTemp = currentWeather?.temp ?? currentWeather?.temperature;
  const tempDisplay = rawTemp !== undefined && rawTemp !== null ? `${rawTemp}°C` : '18°C';
  const conditionDisplay = currentWeather?.condition || 'Highland Mist';

  const desktopTemp =
    desktopWeather?.temp ?? desktopWeather?.temperature !== undefined
      ? `${desktopWeather?.temp ?? desktopWeather?.temperature}°C`
      : tempDisplay;
  const desktopCondition =
    language === 'bm'
      ? desktopWeather?.conditionBm || desktopWeather?.condition || conditionDisplay
      : desktopWeather?.condition || conditionDisplay;
  const desktopTownship = desktopWeather?.township || 'Tanah Rata';

  const getWeatherIcon = (conditionStr?: string, sizeClass = 'w-5 h-5') => {
    const cond = (conditionStr || '').toLowerCase();
    if (cond.includes('thunder') || cond.includes('lightning') || cond.includes('ribut')) {
      return <CloudLightning className={`${sizeClass} text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.7)]`} />;
    }
    if (cond.includes('sun') || cond.includes('clear') || cond.includes('cerah')) {
      return <Sun className={`${sizeClass} text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.7)]`} />;
    }
    if (cond.includes('fog') || cond.includes('mist') || cond.includes('kabus')) {
      return <CloudFog className={`${sizeClass} text-teal-300 drop-shadow-[0_0_6px_rgba(45,212,191,0.7)]`} />;
    }
    if (cond.includes('cloud') || cond.includes('berawan') || cond.includes('mendung')) {
      return <CloudSun className={`${sizeClass} text-cyan-200 drop-shadow-[0_0_6px_rgba(165,243,252,0.7)]`} />;
    }
    return <CloudRain className={`${sizeClass} text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]`} />;
  };

  const activeCards = cards.filter((c) => c.isActive !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const handleCardClick = (card: MobileHomeCard) => {
    switch (card.buttonAction) {
      case 'open-weather':
        onOpenWeather();
        break;
      case 'open-hazard':
        onOpenHazard();
        break;
      case 'open-map':
        onOpenMap();
        break;
      case 'open-itinerary':
        onOpenItinerary();
        break;
      case 'open-party':
        onOpenParty();
        break;
      case 'open-rentals':
      case 'open-bike':
      case 'open-motorbike':
        if (onOpenMotorbike) onOpenMotorbike();
        else onOpenParty();
        break;
      case 'open-accommodation':
      case 'open-homestays':
      case 'open-stays':
        if (onOpenAccommodation) onOpenAccommodation();
        break;
      case 'open-sos':
        onOpenSos();
        break;
      default:
        if (card.type === 'weather') onOpenWeather();
        else if (card.type === 'hazard') onOpenHazard();
        else if (card.type === 'map') onOpenMap();
        else if (card.type === 'itinerary') onOpenItinerary();
        else if (card.type === 'party') onOpenParty();
        else if (card.type === 'bike') {
          if (onOpenMotorbike) onOpenMotorbike();
          else onOpenParty();
        } else if (card.type === 'sos') onOpenSos();
        else if (card.buttonAction === 'open-accommodation' || card.id?.includes('accommodation')) {
          if (onOpenAccommodation) onOpenAccommodation();
        }
        break;
    }
  };

  // Standard cards from Firestore/localStorage or fallback
  const weatherCard =
    activeCards.find((c) => c.type === 'weather' || c.id === 'card-1-weather') ||
    cards.find((c) => c.type === 'weather') ||
    INITIAL_MOBILE_HOME_CARDS[0];
  const hazardCard =
    activeCards.find((c) => c.type === 'hazard' || c.id === 'card-2-hazard') ||
    cards.find((c) => c.type === 'hazard') ||
    INITIAL_MOBILE_HOME_CARDS[1];
  const mapCard =
    activeCards.find((c) => c.type === 'map' || c.id === 'card-3-map') ||
    cards.find((c) => c.type === 'map') ||
    INITIAL_MOBILE_HOME_CARDS[2];
  const itineraryCard =
    activeCards.find((c) => c.type === 'itinerary' || c.id === 'card-4-itinerary') ||
    cards.find((c) => c.type === 'itinerary') ||
    INITIAL_MOBILE_HOME_CARDS[3];
  const partyCard =
    activeCards.find((c) => c.type === 'party' || c.id === 'card-5-party') ||
    cards.find((c) => c.type === 'party') ||
    INITIAL_MOBILE_HOME_CARDS[4];
  const bikeCard =
    activeCards.find((c) => c.type === 'bike' || c.id === 'card-6-bike') ||
    cards.find((c) => c.type === 'bike') ||
    INITIAL_MOBILE_HOME_CARDS[5];

  // Any custom cards added by Admin beyond the standard 6 cards
  const standardIds = ['card-1-weather', 'card-2-hazard', 'card-3-map', 'card-4-itinerary', 'card-5-party', 'card-6-bike'];
  const standardTypes = ['weather', 'hazard', 'map', 'itinerary', 'party', 'bike', 'sos'];
  const customCards = activeCards.filter((c) => !standardTypes.includes(c.type) && !standardIds.includes(c.id));

  const quickDockItems = [
    {
      id: 'traffic',
      label: language === 'bm' ? 'Trafik' : 'Traffic',
      icon: <Car className="w-5 h-5 text-emerald-400" />,
      highlight: true,
      onClick: () => (onOpenTraffic ? onOpenTraffic() : onOpenHazard()),
    },
    {
      id: 'masjid',
      label: 'Masjid',
      icon: <MasjidIcon className="w-5 h-5 text-teal-400" />,
      onClick: () => onOpenMasjid && onOpenMasjid(),
    },
    {
      id: 'currency',
      label: language === 'bm' ? 'Mata Wang' : 'Currency',
      icon: <ArrowRightLeft className="w-5 h-5 text-amber-400" />,
      onClick: () => onOpenCurrency && onOpenCurrency(),
    },
    {
      id: 'jobs',
      label: language === 'bm' ? 'Kerja' : 'Classifieds',
      icon: <Briefcase className="w-5 h-5 text-rose-400" />,
      onClick: () => onOpenClassifieds && onOpenClassifieds(),
    },
    {
      id: 'trail',
      label: language === 'bm' ? 'Trails' : 'Trails',
      icon: <Compass className="w-5 h-5 text-emerald-400" />,
      onClick: () => onOpenTrailEngine && onOpenTrailEngine(),
    },
    {
      id: 'parking',
      label: 'Parking & EV',
      icon: <Zap className="w-5 h-5 text-cyan-400" />,
      onClick: () => onOpenParkingEv && onOpenParkingEv(),
    },
    {
      id: 'ai',
      label: 'CamGo AI',
      icon: <Sparkles className="w-5 h-5 text-teal-300" />,
      onClick: () => onOpenAi && onOpenAi(),
    },
    {
      id: 'sos',
      label: 'SOS 999',
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      danger: true,
      onClick: onOpenSos,
    },
  ];

  const featuredTownships: Township[] = ['Tanah Rata', 'Brinchang', 'Kea Farm', 'Ringlet'];

  const customStaysBg = safeSrc(visualBackgrounds.verifiedStaysBgUrl);
  const customBikesBg = safeSrc(visualBackgrounds.motorbikeRentalsBgUrl);

  const staysCardPreviewImg = safeSrc(
    customStaysBg || accommodations[0]?.coverImage,
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80'
  );

  const defaultBikeCardImg =
    bikeCard?.imageUrl &&
    bikeCard.imageUrl !==
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80'
      ? bikeCard.imageUrl
      : undefined;

  const bikesCardPreviewImg = safeSrc(
    customBikesBg || motorbikePartners[0]?.imageUrl || defaultBikeCardImg,
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80'
  );

  return (
    <>
      {/* =====================================================================
          MOBILE VIEW (< 640px): Redesigned Image-2 Layout on Dark Theme
         ===================================================================== */}
      <div className="block sm:hidden mt-3.5 mb-8 space-y-5">
        {/* 1. 5-Capsule Strip Fitting Cleanly Inside Mobile Viewport: Traffic, Masjid, Hub, Currency, Classifieds */}
        <div className="grid grid-cols-5 gap-1.5 w-full no-mobile-clamp">
          {/* 1. Traffic */}
          <button
            type="button"
            onClick={() => (onOpenTraffic ? onOpenTraffic() : onOpenHazard())}
            className="min-h-[54px] px-1 py-1.5 rounded-2xl bg-[#102e20] border border-emerald-400/65 text-white shadow-[0_4px_14px_rgba(16,185,129,0.22)] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer overflow-hidden"
          >
            <span className="w-6 h-6 rounded-full bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Car className="w-3.5 h-3.5 text-emerald-300" />
            </span>
            <span className="no-mobile-clamp text-[9px] min-[375px]:text-[9.5px] font-bold tracking-tight leading-none whitespace-nowrap text-center">
              Traffic
            </span>
          </button>

          {/* 2. Masjid */}
          <button
            type="button"
            onClick={() =>
              onOpenMasjid
                ? onOpenMasjid()
                : window.dispatchEvent(new CustomEvent('open-masjid-modal'))
            }
            className="min-h-[54px] px-1 py-1.5 rounded-2xl bg-stone-900/95 border border-white/15 hover:border-teal-400/50 text-stone-100 shadow-md flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer overflow-hidden"
          >
            <span className="w-6 h-6 rounded-full bg-stone-800 border border-white/10 flex items-center justify-center shrink-0">
              <MasjidIcon className="w-3.5 h-3.5 text-teal-400" />
            </span>
            <span className="no-mobile-clamp text-[9px] min-[375px]:text-[9.5px] font-bold tracking-tight leading-none whitespace-nowrap text-center">
              Masjid
            </span>
          </button>

          {/* 3. Hub */}
          <button
            type="button"
            onClick={() => onOpenPortals && onOpenPortals()}
            className="min-h-[54px] px-1 py-1.5 rounded-2xl bg-stone-900/95 border border-white/15 hover:border-indigo-400/50 text-stone-100 shadow-md flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer overflow-hidden"
          >
            <span className="w-6 h-6 rounded-full bg-stone-800 border border-white/10 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </span>
            <span className="no-mobile-clamp text-[9px] min-[375px]:text-[9.5px] font-bold tracking-tight leading-none whitespace-nowrap text-center">
              Hub
            </span>
          </button>

          {/* 4. Currency */}
          <button
            type="button"
            onClick={() =>
              onOpenCurrency
                ? onOpenCurrency()
                : window.dispatchEvent(new CustomEvent('open-currency-converter'))
            }
            className="min-h-[54px] px-1 py-1.5 rounded-2xl bg-stone-900/95 border border-white/15 hover:border-amber-400/50 text-stone-100 shadow-md flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer overflow-hidden"
          >
            <span className="w-6 h-6 rounded-full bg-stone-800 border border-white/10 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <span className="no-mobile-clamp text-[9px] min-[375px]:text-[9.5px] font-bold tracking-tight leading-none whitespace-nowrap text-center">
              Currency
            </span>
          </button>

          {/* 5. Classifieds */}
          <button
            type="button"
            onClick={() => onOpenClassifieds && onOpenClassifieds()}
            className="min-h-[54px] px-0.5 py-1.5 rounded-2xl bg-stone-900/95 border border-white/15 hover:border-rose-400/50 text-stone-100 shadow-md flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer overflow-hidden"
          >
            <span className="w-6 h-6 rounded-full bg-stone-800 border border-white/10 flex items-center justify-center shrink-0">
              <Briefcase className="w-3.5 h-3.5 text-rose-400" />
            </span>
            <span className="no-mobile-clamp text-[8.5px] min-[375px]:text-[9px] font-bold tracking-tight leading-none whitespace-nowrap text-center">
              Classifieds
            </span>
          </button>
        </div>

        {/* 2. "Explore" Section (Swipeable Carousel: Weather, Directory, Highland Maps, Itinerary — NO View link) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="no-mobile-clamp text-base font-extrabold text-white tracking-tight">
              Explore
            </h2>
          </div>

          <div className="relative">
            <div
              ref={exploreScrollRef}
              className="w-full flex gap-2.5 overflow-x-auto snap-x snap-mandatory touch-pan-x pb-1.5 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
            {/* Card 1: Weather */}
            <div
              onClick={() => (weatherCard ? handleCardClick(weatherCard) : onOpenWeather())}
              className="relative w-[42vw] min-w-[144px] max-w-[172px] aspect-[4/4.3] shrink-0 snap-start rounded-[22px] overflow-hidden border border-cyan-400/40 bg-stone-900 shadow-xl cursor-pointer active:scale-[0.97] transition-all group select-none"
            >
              <img
                src={safeSrc(
                  visualBackgrounds.exploreWeatherBgUrl || weatherCard?.imageUrl,
                  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80'
                )}
                alt="Weather"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-stone-950/45" />
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                <span className="px-2 py-0.5 rounded-full bg-stone-950/75 backdrop-blur-md border border-cyan-400/40 text-cyan-200 text-[10px] font-black tabular-nums">
                  {tempDisplay}
                </span>
                <span className="w-7 h-7 rounded-full bg-stone-950/75 backdrop-blur-md border border-white/15 flex items-center justify-center shrink-0">
                  {getWeatherIcon(conditionDisplay, 'w-3.5 h-3.5')}
                </span>
              </div>
              <div className="absolute inset-x-1.5 bottom-1.5 px-2.5 py-2 rounded-2xl bg-stone-950/75 backdrop-blur-md border border-white/15 flex items-center justify-between gap-1.5">
                <div className="min-w-0 flex-1">
                  <span className="no-mobile-clamp text-[11px] font-extrabold text-white block leading-tight whitespace-normal">
                    {language === 'bm' ? 'Cuaca' : 'Weather'}
                  </span>
                  <span className="no-mobile-clamp text-[9px] text-stone-300 block leading-snug mt-0.5 whitespace-normal">
                    {currentWeather?.township || 'Tanah Rata'} · {conditionDisplay}
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              </div>
            </div>

            {/* Card 2: Notice / Alert */}
            {hazardCard && hazardCard.isActive ? (
              <div
                onClick={() => handleCardClick(hazardCard)}
                className="relative w-[42vw] min-w-[144px] max-w-[172px] aspect-[4/4.3] shrink-0 snap-start rounded-[22px] overflow-hidden border border-rose-400/40 bg-stone-900 shadow-xl cursor-pointer active:scale-[0.97] transition-all group select-none"
              >
                <img
                  src={safeSrc(
                    visualBackgrounds.exploreNoticeAlertBgUrl || hazardCard.imageUrl,
                    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80'
                  )}
                  alt="Notice / Alert"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-stone-950/45" />
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-950/75 backdrop-blur-md border border-white/15 text-[9px] font-mono font-bold text-emerald-300 tabular-nums">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>{hazards.length > 0 ? `${hazards.length} ${language === 'bm' ? 'Aktif' : 'Active'}` : 'LIVE'}</span>
                  </span>
                  {hazards.some((h) => /pdrm/i.test(`${h.source || ''} ${h.title || ''}`)) && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-600/90 text-white text-[8px] font-black tracking-wider uppercase">
                      PDRM
                    </span>
                  )}
                </div>
                <div className="absolute inset-x-1.5 bottom-1.5 px-2.5 py-2 rounded-2xl bg-stone-950/80 backdrop-blur-md border border-white/15 flex items-center justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <span className="no-mobile-clamp text-[11px] font-extrabold text-white block leading-tight whitespace-normal">
                      {!hazardCard.title ||
                      hazardCard.title === 'Live Traffic/Hazard' ||
                      hazardCard.title === 'Live Notice/Hazard'
                        ? (language === 'bm' ? 'Notis / Amaran' : 'Notice / Alert')
                        : hazardCard.title}
                    </span>
                    <span className="no-mobile-clamp text-[9px] text-stone-300 block leading-snug mt-0.5 whitespace-normal line-clamp-1">
                      {hazards[0]
                        ? language === 'bm'
                          ? hazards[0].titleBm || hazards[0].title
                          : hazards[0].title
                        : language === 'bm'
                        ? 'Info jalan & cuaca terkini'
                        : 'Live road & weather updates'}
                    </span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#c9ef3d] shrink-0" />
                </div>
              </div>
            ) : (
              <div
                onClick={() => onOpenHazard()}
                className="relative w-[42vw] min-w-[144px] max-w-[172px] aspect-[4/4.3] shrink-0 snap-start rounded-[22px] overflow-hidden border border-rose-400/40 bg-stone-900 shadow-xl cursor-pointer active:scale-[0.97] transition-all group select-none"
              >
                <img
                  src={safeSrc(
                    visualBackgrounds.exploreNoticeAlertBgUrl,
                    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=900&q=80'
                  )}
                  alt="Notice / Alert"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-stone-950/45" />
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-950/75 backdrop-blur-md border border-white/15 text-[9px] font-mono font-bold text-emerald-300 tabular-nums">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>{hazards.length > 0 ? `${hazards.length} ${language === 'bm' ? 'Aktif' : 'Active'}` : 'LIVE'}</span>
                  </span>
                </div>
                <div className="absolute inset-x-1.5 bottom-1.5 px-2.5 py-2 rounded-2xl bg-stone-950/80 backdrop-blur-md border border-white/15 flex items-center justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <span className="no-mobile-clamp text-[11px] font-extrabold text-white block leading-tight whitespace-normal">
                      {language === 'bm' ? 'Notis / Amaran' : 'Notice / Alert'}
                    </span>
                    <span className="no-mobile-clamp text-[9px] text-stone-300 block leading-snug mt-0.5 whitespace-normal line-clamp-1">
                      {hazards[0]
                        ? language === 'bm'
                          ? hazards[0].titleBm || hazards[0].title
                          : hazards[0].title
                        : language === 'bm'
                        ? 'Info jalan & cuaca terkini'
                        : 'Live road & weather updates'}
                    </span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#c9ef3d] shrink-0" />
                </div>
              </div>
            )}

            {/* Card 3: Highland Maps */}
            <div
              onClick={() => (mapCard ? handleCardClick(mapCard) : onOpenMap())}
              className="relative w-[42vw] min-w-[144px] max-w-[172px] aspect-[4/4.3] shrink-0 snap-start rounded-[22px] overflow-hidden border border-white/15 bg-stone-900 shadow-xl cursor-pointer active:scale-[0.97] transition-all group select-none"
            >
              <img
                src={safeSrc(
                  visualBackgrounds.exploreHighlandMapsBgUrl || mapCard?.imageUrl,
                  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
                )}
                alt="Highland Maps"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/25 to-stone-950/35" />
              <div className="absolute inset-x-1.5 bottom-1.5 px-2.5 py-2 rounded-2xl bg-stone-950/75 backdrop-blur-md border border-white/15 flex items-center justify-between gap-1.5">
                <div className="min-w-0 flex-1">
                  <span className="no-mobile-clamp text-[11px] font-extrabold text-white block leading-tight whitespace-normal">
                    {language === 'bm' ? 'Peta Tanah Tinggi' : 'Highland Maps'}
                  </span>
                  <span className="no-mobile-clamp text-[9px] text-stone-300 block leading-snug mt-0.5 whitespace-normal">
                    {language === 'bm' ? 'GPS Langsung · 9 Pekan' : 'Live GPS & 9 Towns'}
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-white shrink-0" />
              </div>
            </div>

            {/* Card 4: Itinerary */}
            <div
              onClick={() => (itineraryCard ? handleCardClick(itineraryCard) : onOpenItinerary())}
              className="relative w-[42vw] min-w-[144px] max-w-[172px] aspect-[4/4.3] shrink-0 snap-start rounded-[22px] overflow-hidden border border-white/15 bg-stone-900 shadow-xl cursor-pointer active:scale-[0.97] transition-all group select-none"
            >
              <img
                src={safeSrc(
                  visualBackgrounds.exploreItineraryBgUrl ||
                    (itineraryCard?.imageUrl &&
                    itineraryCard.imageUrl !==
                      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80'
                      ? itineraryCard.imageUrl
                      : undefined),
                  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80'
                )}
                alt="Itinerary"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/25 to-stone-950/35" />
              <div className="absolute inset-x-1.5 bottom-1.5 px-2.5 py-2 rounded-2xl bg-stone-950/75 backdrop-blur-md border border-white/15 flex items-center justify-between gap-1.5">
                <div className="min-w-0 flex-1">
                  <span className="no-mobile-clamp text-[11px] font-extrabold text-white block leading-tight whitespace-normal">
                    {language === 'bm' ? 'Itinerari' : 'Itinerary'}
                  </span>
                  <span className="no-mobile-clamp text-[9px] text-stone-300 block leading-snug mt-0.5 whitespace-normal">
                    {language === 'bm' ? 'Perancang Percutian' : 'Smart Trip Planner'}
                  </span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-white shrink-0" />
              </div>
            </div>
            </div>
            <button
              type="button"
              onClick={() => {
                exploreScrollRef.current?.scrollBy({ left: 165, behavior: 'smooth' });
              }}
              aria-label="Scroll Explore right"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-stone-950/85 hover:bg-stone-900 border border-emerald-400/50 text-emerald-300 shadow-lg flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. Wide Featured Directory Card (swapped from Explore Card 2) */}
        <div
          onClick={() => onOpenDirectories && onOpenDirectories()}
          className="relative rounded-[24px] overflow-hidden border border-white/15 bg-stone-900 shadow-2xl min-h-[164px] p-4 flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all group select-none"
        >
          <div className="absolute inset-0 z-0">
            <img
              src={safeSrc(
                visualBackgrounds.directoryCardBgUrl,
                '/assets/aistudio/explore_c7c5621e.jpg'
              )}
              alt="Directory"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/50 to-stone-950/40" />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-950/65 backdrop-blur-md border border-white/15 text-[10px] font-bold text-stone-100">
              <MapPin className="w-3 h-3 text-[#c9ef3d] shrink-0" />
              <span>Cameron Highlands · 9 {language === 'bm' ? 'Pekan' : 'Towns'}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-950/65 backdrop-blur-md border border-emerald-400/35 text-[10px] font-mono font-bold text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{language === 'bm' ? 'DISAHKAN' : 'VERIFIED'}</span>
            </span>
          </div>

          <div className="relative z-10 flex items-end justify-between gap-3 pt-4">
            <div className="min-w-0">
              <h3 className="no-mobile-clamp text-sm font-extrabold text-white leading-snug">
                {language === 'bm' ? 'Direktori' : 'Directory'}
              </h3>
              <span className="no-mobile-clamp text-[10.5px] text-stone-300 block leading-snug mt-0.5 whitespace-normal">
                {language === 'bm'
                  ? 'Ladang, Makanan, Kafe, Tarikan & Penginapan'
                  : 'Farms, Food, Cafes, Attractions & Stays'}
              </span>
            </div>

            <button
              type="button"
              className="shrink-0 min-h-[36px] px-3.5 py-1.5 rounded-full bg-[#c9ef3d] hover:bg-[#d6f65c] text-stone-950 text-xs font-black shadow-lg cursor-pointer"
            >
              {language === 'bm' ? 'Terokai' : 'Browse'}
            </button>
          </div>
        </div>

        {/* 4. Compact Row: Highland Trails & Find My Party */}
        <div className="grid grid-cols-2 gap-2.5 no-mobile-clamp">
          {/* Highland Trails Shortcut Card */}
          <div
            onClick={() => onOpenTrailEngine && onOpenTrailEngine()}
            className="rounded-2xl p-2.5 bg-stone-900/95 backdrop-blur-xl border border-teal-400/40 hover:border-teal-300 shadow-lg flex flex-col justify-between min-h-[138px] cursor-pointer active:scale-[0.97] transition-all group relative overflow-hidden select-none"
          >
            <div className="flex items-center gap-1 relative z-10">
              <Compass className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="no-mobile-clamp text-[11px] font-extrabold text-white leading-tight whitespace-normal">
                Highland Trails
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden my-1.5 aspect-[16/10] bg-stone-950 border border-white/15 shadow-inner">
              <img
                src={safeSrc('https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=600&q=80')}
                alt="Highland Trails"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-transparent to-transparent" />
            </div>

            <div className="pt-0.5 flex items-center justify-between relative z-10">
              <span className="px-2 py-0.5 rounded-full bg-teal-400 text-stone-950 font-black text-[9.5px]">
                {language === 'bm' ? 'Buka' : 'Trails'}
              </span>
              <span className="text-[9px] text-teal-300 font-mono font-bold">GPS SOS</span>
            </div>
          </div>

          {/* Find My Party Compact Card */}
          {partyCard && partyCard.isActive && (
            <div
              onClick={() => handleCardClick(partyCard)}
              className="rounded-2xl p-2.5 bg-stone-900/95 backdrop-blur-xl border border-emerald-500/40 hover:border-emerald-400 shadow-lg flex flex-col justify-between min-h-[138px] cursor-pointer active:scale-[0.97] transition-all group relative overflow-hidden select-none"
            >
              <div className="flex items-center gap-1 relative z-10">
                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="no-mobile-clamp text-[11px] font-extrabold text-white leading-tight whitespace-normal">
                  {partyCard.title || 'Find My Party'}
                </span>
              </div>

              <div className="relative rounded-xl overflow-hidden my-1.5 aspect-[16/10] bg-stone-950 border border-white/15 shadow-inner">
                <img
                  src={safeSrc(partyCard.imageUrl, 'https://images.unsplash.com/photo-1528543606781-2f6e6857f318?auto=format&fit=crop&w=600&q=80')}
                  alt={partyCard.title || 'Find My Party'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-transparent to-transparent" />
              </div>

              <div className="pt-0.5 flex items-center justify-between relative z-10">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-stone-950 font-black text-[9.5px]">
                  {partyCard.buttonText || 'Open'}
                </span>
                <span className="text-[9px] text-emerald-300 font-mono font-bold">BEACON</span>
              </div>
            </div>
          )}
        </div>

        {/* Row 5: Verified Stays & Motorbike Rentals Side-by-Side Shortcut Cards */}
        <div className="grid grid-cols-2 gap-2.5 no-mobile-clamp">
          {/* Card 1: Verified Stays */}
          <div
            onClick={() => onOpenAccommodation && onOpenAccommodation()}
            className="rounded-2xl p-2.5 bg-stone-900/95 backdrop-blur-xl border border-emerald-400/40 hover:border-emerald-300 shadow-lg flex flex-col justify-between min-h-[138px] cursor-pointer active:scale-[0.97] transition-all group relative overflow-hidden select-none"
          >
            {customStaysBg && (
              <>
                <img
                  src={customStaysBg}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/55 to-stone-950/90 z-0 pointer-events-none" />
              </>
            )}

            <div className="flex items-center gap-1 relative z-10">
              <BedDouble className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="no-mobile-clamp text-[11px] font-extrabold text-white leading-tight whitespace-normal drop-shadow-sm">
                Verified Stays
              </span>
            </div>

            <div className="relative z-10 rounded-xl overflow-hidden my-1.5 aspect-[16/10] bg-stone-950 border border-white/15 shadow-inner">
              <img
                src={staysCardPreviewImg}
                alt="Verified Stays"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
            </div>

            <div className="pt-0.5 flex items-center justify-between gap-1 relative z-10">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-400 text-stone-950 font-black text-[9.5px] shrink-0">
                <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                <span>{language === 'bm' ? 'Disahkan' : 'Verified'}</span>
              </span>
              <span className="text-[9px] text-emerald-300 font-mono font-bold truncate drop-shadow-sm">
                {accommodations.length > 0 ? `${accommodations.length} Unit` : 'RM30 LOCK'}
              </span>
            </div>
          </div>

          {/* Card 2: Motorbike Rentals */}
          <div
            onClick={() => {
              if (bikeCard) handleCardClick(bikeCard);
              else if (onOpenMotorbike) onOpenMotorbike();
            }}
            className="rounded-2xl p-2.5 bg-stone-900/95 backdrop-blur-xl border border-cyan-400/40 hover:border-cyan-300 shadow-lg flex flex-col justify-between min-h-[138px] cursor-pointer active:scale-[0.97] transition-all group relative overflow-hidden select-none"
          >
            {customBikesBg && (
              <>
                <img
                  src={customBikesBg}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover z-0 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/55 to-stone-950/90 z-0 pointer-events-none" />
              </>
            )}

            <div className="flex items-center gap-1 relative z-10">
              <Bike className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="no-mobile-clamp text-[11px] font-extrabold text-white leading-tight whitespace-normal drop-shadow-sm">
                {language === 'bm' ? 'Sewa Motosikal' : 'Motorbike Rentals'}
              </span>
            </div>

            <div className="relative z-10 rounded-xl overflow-hidden my-1.5 aspect-[16/10] bg-stone-950 border border-white/15 shadow-inner">
              <img
                src={bikesCardPreviewImg}
                alt={language === 'bm' ? 'Sewa Motosikal' : 'Motorbike Rentals'}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
            </div>

            <div className="pt-0.5 flex items-center justify-between gap-1 relative z-10">
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-cyan-400 text-stone-950 font-black text-[9.5px] shrink-0">
                <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                <span>{language === 'bm' ? 'Disahkan' : 'Verified'}</span>
              </span>
              <span className="text-[9px] text-cyan-300 font-mono font-bold truncate drop-shadow-sm">
                {motorbikePartners.length > 0 ? `${motorbikePartners.length} ${language === 'bm' ? 'Rakan' : 'Fleets'}` : '2-WHEELS'}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Cards */}
        {customCards.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {customCards.map((card) => (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className="rounded-2xl p-3 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-500/50 hover:border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] flex flex-col justify-between min-h-[148px] cursor-pointer active:scale-[0.96] hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden"
              >
                <div className="relative z-10">
                  <span className="text-[11px] font-bold text-white block truncate group-hover:text-emerald-300 transition-colors">
                    {card.title}
                  </span>
                </div>

                {safeSrc(card.imageUrl) && (
                  <div className="rounded-xl overflow-hidden my-1.5 aspect-video bg-stone-950 border-2 border-white/10">
                    <img
                      src={safeSrc(card.imageUrl, DEFAULT_PLACE_IMAGE)}
                      alt={card.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                )}

                <div className="pt-1.5 flex items-center justify-between border-t border-white/10 text-[9.5px] relative z-10">
                  <span className="text-emerald-400 font-bold">{card.buttonText || 'Open'}</span>
                  <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-emerald-300 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          PC & TABLET VIEW (>= 640px): Responsive Interactive Highland Bento UI
          Mirrors Mobile View's glassmorphism & cards, elevated for desktop!
         ===================================================================== */}
      <div className="hidden sm:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 space-y-6">
        {/* PC Quick-Launch Utility Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {quickDockItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`group flex flex-col items-center justify-center p-2.5 rounded-2xl backdrop-blur-xl transition-all duration-200 cursor-pointer min-h-[68px] hover:-translate-y-0.5 active:scale-95 ${
                item.highlight
                  ? 'bg-emerald-500/15 border-2 border-emerald-400/75 shadow-[0_0_18px_rgba(52,211,153,0.22)] hover:border-emerald-300'
                  : item.danger
                  ? 'bg-rose-950/40 border border-rose-500/40 hover:border-rose-400 hover:bg-rose-950/60 shadow-lg'
                  : 'bg-stone-900/75 border border-white/10 hover:border-emerald-400/50 hover:bg-stone-800/80 shadow-lg'
              }`}
            >
              <div className="p-1 transition-transform duration-200 group-hover:scale-110">
                {item.icon}
              </div>
              <span
                className={`text-[11px] font-bold tracking-tight mt-1 whitespace-nowrap truncate max-w-full px-1 ${
                  item.highlight
                    ? 'text-emerald-300'
                    : item.danger
                    ? 'text-rose-300'
                    : 'text-stone-200 group-hover:text-white'
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Row 1: 12-Col Hero Highland Map + Plan Your Trip (Itinerary) Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Card 1 (Hero): Highland Map */}
          {mapCard && mapCard.isActive && (
            <div
              onClick={() => handleCardClick(mapCard)}
              className="lg:col-span-7 rounded-3xl p-6 bg-gradient-to-br from-emerald-950/85 via-stone-900/95 to-teal-950/85 backdrop-blur-xl border-2 border-emerald-400/65 hover:border-teal-300 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_45px_rgba(16,185,129,0.38)] relative overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group min-h-[240px] flex flex-col justify-between select-none"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />
              <div className="absolute inset-0 z-0">
                <img
                  src={safeSrc(
                    visualBackgrounds.exploreHighlandMapsBgUrl || mapCard.imageUrl,
                    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
                  )}
                  alt={mapCard.title || 'Highland Map'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover opacity-35 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-950/75 to-stone-950/35" />
              </div>

              {/* Top row */}
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{mapCard.badge || mapCard.tag || 'GPS Active'} · FT 59 &amp; FT 185</span>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-heading font-black text-white tracking-tight group-hover:text-emerald-200 transition-colors">
                    {mapCard.title === 'Plan Your Highland Escape' || !mapCard.title ? 'Highland Map' : mapCard.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    {mapCard.subtitle ||
                      (language === 'bm'
                        ? 'Navigasi satelit tanah tinggi, aliran trafik TomTom & profil altitud 9 pekan.'
                        : 'Interactive satellite navigation, live TomTom traffic flow, hazard pins & 9 township elevation hubs.')}
                  </p>
                </div>
              </div>

              {/* Interactive Township Jump Strip + Main CTA */}
              <div className="relative z-10 pt-4 mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-1.5">
                  {featuredTownships.map((town) => (
                    <button
                      key={town}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectTownshipOnMap) onSelectTownshipOnMap(town);
                        else onOpenMap();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-stone-900/85 hover:bg-emerald-600/30 border border-white/15 hover:border-emerald-400/60 text-[11px] font-semibold text-stone-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {town}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 hover:from-orange-400 hover:to-emerald-400 text-white font-black text-xs shadow-lg flex items-center gap-2 group-hover:scale-105 transition-all duration-300 cursor-pointer shrink-0"
                >
                  <span>{mapCard.buttonText || 'Explore Now'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Card 2: Plan Your Trip (Directly next to Highland Map) */}
          {itineraryCard && itineraryCard.isActive && (
            <div
              onClick={() => handleCardClick(itineraryCard)}
              className="lg:col-span-5 rounded-3xl p-6 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-400/50 hover:border-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.18)] hover:shadow-[0_0_36px_rgba(16,185,129,0.34)] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group flex flex-col justify-between select-none relative overflow-hidden min-h-[240px]"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={safeSrc(
                    visualBackgrounds.exploreItineraryBgUrl ||
                      (itineraryCard.imageUrl &&
                      itineraryCard.imageUrl !==
                        'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80'
                        ? itineraryCard.imageUrl
                        : undefined),
                    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80'
                  )}
                  alt={itineraryCard.title || 'Plan Your Trip'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover opacity-25 group-hover:opacity-35 group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-900/85 to-teal-950/75" />
              </div>

              <div className="relative z-10 flex items-start gap-4">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-stone-950 shrink-0 border-2 border-white/15 group-hover:border-emerald-400/60 transition-colors shadow-lg">
                  <img
                    src={safeSrc(
                      visualBackgrounds.exploreItineraryBgUrl ||
                        (itineraryCard.imageUrl &&
                        itineraryCard.imageUrl !==
                          'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80'
                          ? itineraryCard.imageUrl
                          : undefined),
                      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80'
                    )}
                    alt={itineraryCard.title || 'Plan Your Trip'}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-mono font-bold text-emerald-300">
                    {itineraryCard.badge || itineraryCard.tag || 'Trip Planner'}
                  </span>
                  <h4 className="text-xl lg:text-2xl font-heading font-black text-white tracking-tight group-hover:text-emerald-300 transition-colors mt-0.5">
                    {itineraryCard.title || 'Plan Your Trip'}
                  </h4>
                  <p className="text-xs sm:text-sm text-stone-300 mt-1 leading-relaxed">
                    {itineraryCard.subtitle ||
                      'Visual split-screen highland itinerary builder with waypoint timing & distance estimates.'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10">
                <span className="text-xs font-semibold text-stone-300">
                  Smart Route · Weather Sync
                </span>
                <button
                  type="button"
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-stone-950 font-black text-xs shadow-md group-hover:scale-105 transition-all duration-300 cursor-pointer flex items-center gap-1.5"
                >
                  <span>{itineraryCard.buttonText || 'Where to?'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Row 2: 12-Col Interactive Weather + Live Notice/Hazard + Find My Party + Community Chat Lounge */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
          {/* Card 3: Interactive Cameron Highlands Weather */}
          {weatherCard && weatherCard.isActive && (
            <div
              onClick={() => handleCardClick(weatherCard)}
              className="lg:col-span-3 rounded-3xl p-5 bg-stone-900/95 backdrop-blur-xl border-2 border-cyan-400/60 hover:border-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.18)] hover:shadow-[0_0_36px_rgba(34,211,238,0.36)] flex flex-col justify-between min-h-[240px] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
            >
              {safeSrc(visualBackgrounds.exploreWeatherBgUrl || weatherCard.imageUrl) ? (
                <div className="absolute inset-0 z-0">
                  <img
                    src={safeSrc(visualBackgrounds.exploreWeatherBgUrl || weatherCard.imageUrl)}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-stone-950/75 via-cyan-950/30 to-stone-950/90" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/95 via-cyan-950/40 to-stone-900/95" />
              )}

              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-cyan-400/20 blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="text-xs font-black text-stone-100 tracking-tight group-hover:text-cyan-200 transition-colors">
                  {weatherCard.title || 'Cameron Highlands'}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/90 border border-cyan-400/50 px-2 py-0.5 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>{weatherCard.badge || weatherCard.tag || 'LIVE'}</span>
                </span>
              </div>

              {/* Center Temp + 3D Icon */}
              <div className="relative z-10 flex items-center justify-between my-auto py-3">
                <div>
                  <div className="text-4xl font-black text-white tracking-tight leading-none tabular-nums group-hover:scale-105 transition-transform origin-left">
                    {desktopTemp}
                  </div>
                  <div className="text-xs font-bold text-cyan-300 mt-2">{desktopCondition}</div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600/30 via-sky-500/25 to-teal-400/30 border-2 border-cyan-400/50 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  {getWeatherIcon(desktopCondition, 'w-7 h-7')}
                </div>
              </div>

              {/* Interactive Township Cycle Footer */}
              <div className="relative z-10 pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-100 truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{desktopTownship}</span>
                  </div>
                  {weatherList.length > 1 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label="Previous township weather"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDesktopWeatherIdx((prev) => (prev - 1 + weatherList.length) % weatherList.length);
                        }}
                        className="p-1 rounded-lg bg-stone-800/90 hover:bg-cyan-500/30 border border-white/10 text-stone-300 hover:text-white cursor-pointer transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next township weather"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDesktopWeatherIdx((prev) => (prev + 1) % weatherList.length);
                        }}
                        className="p-1 rounded-lg bg-stone-800/90 hover:bg-cyan-500/30 border border-white/10 text-stone-300 hover:text-white cursor-pointer transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-cyan-400" />
                    {desktopWeather?.humidity ?? 85}%
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wind className="w-3 h-3 text-teal-400" />
                    {desktopWeather?.windSpeed ?? 12} km/h
                  </span>
                  <span className="text-cyan-300 font-bold">
                    {language === 'bm' ? 'Ramalan →' : 'Forecast →'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Notice / Alert Feed */}
          {hazardCard && hazardCard.isActive && (
            <div
              onClick={() => handleCardClick(hazardCard)}
              className="lg:col-span-3 rounded-3xl p-5 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-400/60 hover:border-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.18)] hover:shadow-[0_0_36px_rgba(52,211,153,0.36)] flex flex-col justify-between min-h-[240px] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
            >
              <div className="relative z-10 flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-black text-stone-100 tracking-tight group-hover:text-emerald-200 transition-colors">
                  {!hazardCard.title ||
                  hazardCard.title === 'Live Traffic/Hazard' ||
                  hazardCard.title === 'Live Notice/Hazard'
                    ? (language === 'bm' ? 'Notis / Amaran' : 'Notice / Alert')
                    : hazardCard.title}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono font-black text-[9px] shadow-md flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>{hazardCard.badge || hazardCard.tag || 'LIVE'}</span>
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-stone-950 border-2 border-white/15 group-hover:border-emerald-400/60 transition-colors shadow-inner">
                <img
                  src={safeSrc(
                    visualBackgrounds.exploreNoticeAlertBgUrl || hazardCard.imageUrl,
                    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'
                  )}
                  alt="Notice / Alert"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-transparent" />
                {hazards.some((h) => h.agency === 'PDRM') && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-sky-600/90 text-white text-[9px] font-mono font-black tracking-wide border border-sky-300/40">
                    PDRM LIVE
                  </span>
                )}
                {hazards[0] && (
                  <div className="absolute bottom-2 left-2.5 right-2.5 text-[11px] font-bold text-white truncate">
                    {language === 'bm' ? hazards[0].titleBm || hazards[0].title : hazards[0].title}
                  </div>
                )}
              </div>

              <div className="pt-3 mt-auto border-t border-white/10 flex items-center justify-between text-xs font-bold text-stone-200 z-10 gap-2">
                <span className="truncate text-[11px] text-stone-300">
                  {language === 'bm' ? 'Info jalan & cuaca terkini' : 'Live road & weather updates'}
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-bold shrink-0 tabular-nums">
                  {hazards.length > 0
                    ? `${hazards.length} ${language === 'bm' ? 'Aktif' : 'Active'}`
                    : hazardCard.buttonText || (language === 'bm' ? 'Dipantau' : 'Monitored')} →
                </span>
              </div>
            </div>
          )}

          {/* Card 5: Find My Party */}
          {partyCard && partyCard.isActive && (
            <div
              onClick={() => handleCardClick(partyCard)}
              className="lg:col-span-3 rounded-3xl p-5 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-400/50 hover:border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.18)] hover:shadow-[0_0_32px_rgba(16,185,129,0.34)] flex flex-col justify-between min-h-[240px] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
            >
              <div className="flex items-center justify-between gap-2 relative z-10 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="text-base font-heading font-black text-white truncate group-hover:text-emerald-200 transition-colors">
                    {partyCard.title || 'Find My Party'}
                  </h4>
                </div>
                <span className="text-[11px] text-emerald-400 font-mono font-bold shrink-0">
                  {partyCard.badge || partyCard.tag || 'Groups'}
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden my-auto aspect-[16/9] bg-stone-950 border border-white/15 group-hover:border-emerald-400/60 transition-colors shadow-inner">
                <img
                  src={safeSrc(partyCard.imageUrl, 'https://images.unsplash.com/photo-1528543606781-2f6e6857f318?auto=format&fit=crop&w=600&q=80')}
                  alt={partyCard.title || 'Find My Party'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
              </div>

              <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between relative z-10">
                <span className="text-xs text-stone-400 truncate pr-2">
                  {language === 'bm' ? 'Suar kumpulan langsung' : 'Live group beacons'}
                </span>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs shadow-sm group-hover:scale-105 transition-all cursor-pointer shrink-0"
                >
                  {partyCard.buttonText || (language === 'bm' ? 'Buka' : 'Explore')}
                </button>
              </div>
            </div>
          )}

          {/* Card 6: Community Chat Lounge & Walkie-Talkie */}
          <div
            onClick={() => onOpenChat && onOpenChat()}
            className="lg:col-span-3 rounded-3xl p-5 bg-stone-900/90 backdrop-blur-xl border-2 border-indigo-400/50 hover:border-indigo-300 shadow-[0_0_20px_rgba(129,140,248,0.18)] hover:shadow-[0_0_32px_rgba(129,140,248,0.34)] flex flex-col justify-between min-h-[240px] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between gap-2 relative z-10 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h4 className="text-base font-heading font-black text-white truncate group-hover:text-indigo-200 transition-colors">
                  {language === 'bm' ? 'Sembang Komuniti' : 'Community Chat Lounge'}
                </h4>
              </div>
              <span className="text-[11px] text-indigo-300 font-mono font-bold shrink-0">PTT</span>
            </div>

            <div className="space-y-2 my-auto relative z-10">
              <p className="text-xs text-stone-300 leading-relaxed">
                {language === 'bm'
                  ? 'Laporan jalan semasa, rakan denai & saluran radio PTT konvoi.'
                  : 'Live road reports, hiker trail buddies & convoy Push-to-Talk channels.'}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { id: 'traffic-updates', label: '#traffic-updates' },
                  { id: 'hikers-trails', label: '#hikers-trails' },
                  { id: 'foodies', label: '#foodies' },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenChat) onOpenChat(ch.id);
                    }}
                    className="px-2 py-1 rounded-lg bg-stone-950/80 hover:bg-indigo-500/25 border border-white/10 hover:border-indigo-400/50 text-[10.5px] font-mono text-indigo-200 transition-colors cursor-pointer"
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between relative z-10">
              <span className="text-xs text-stone-400 truncate pr-2">
                {language === 'bm' ? 'Saluran komuniti' : 'Community channels'}
              </span>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs shadow-sm group-hover:scale-105 transition-all cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>{language === 'bm' ? 'Buka' : 'Open'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Verified Stays & Motorbike Rentals Side-by-Side Shortcut Cards */}
        <section aria-label="Verified Stays and Motorbike Rentals" className="pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {/* Desktop Card 1: Verified Stays */}
            <div
              onClick={() => onOpenAccommodation && onOpenAccommodation()}
              className="rounded-3xl p-6 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-400/50 hover:border-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.18)] hover:shadow-[0_0_36px_rgba(16,185,129,0.34)] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group flex flex-col justify-between select-none relative overflow-hidden min-h-[210px]"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={staysCardPreviewImg}
                  alt="Verified Stays"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/92 via-stone-950/75 to-stone-950/55" />
              </div>

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shrink-0 shadow-lg">
                    <BedDouble className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10.5px] font-mono font-bold mb-1.5">
                      <ShieldCheck className="w-3 h-3" />
                      <span>
                        Verified Stays{accommodations.length > 0 ? ` · ${accommodations.length} Units` : ''}
                      </span>
                    </div>
                    <h3 className="text-xl lg:text-2xl font-heading font-black text-white tracking-tight group-hover:text-emerald-200 transition-colors">
                      Verified Stays
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-200 mt-1 leading-relaxed">
                      {language === 'bm'
                        ? 'Inap desa & apartmen terus daripada hos (CH-1+) dengan deposit kunci bilik RM30.'
                        : 'Direct host homestays & apartments (CH-1+) with RM30 anti-scam room lock.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-4 mt-4 border-t border-white/15 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-emerald-200">
                  {language === 'bm'
                    ? 'Deposit Kunci RM30 · Baki Bayar Di Pintu'
                    : 'RM30 Lock Deposit · Pay Balance at Door'}
                </span>
                <button
                  type="button"
                  className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs shadow-lg group-hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>{language === 'bm' ? 'Lihat Penginapan' : 'Browse Stays'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Desktop Card 2: Motorbike Rentals */}
            <div
              onClick={() => {
                if (bikeCard) handleCardClick(bikeCard);
                else if (onOpenMotorbike) onOpenMotorbike();
              }}
              className="rounded-3xl p-6 bg-stone-900/90 backdrop-blur-xl border-2 border-cyan-400/50 hover:border-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.18)] hover:shadow-[0_0_36px_rgba(34,211,238,0.34)] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group flex flex-col justify-between select-none relative overflow-hidden min-h-[210px]"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={bikesCardPreviewImg}
                  alt={language === 'bm' ? 'Sewa Motosikal' : 'Motorbike Rentals'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/92 via-stone-950/75 to-stone-950/55" />
              </div>

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shrink-0 shadow-lg">
                    <Bike className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10.5px] font-mono font-bold mb-1.5">
                      <ShieldCheck className="w-3 h-3" />
                      <span>
                        {language === 'bm' ? 'Rakan Disahkan' : 'Verified Fleets'}
                        {motorbikePartners.length > 0 ? ` · ${motorbikePartners.length} ${language === 'bm' ? 'Rakan' : 'Partners'}` : ''}
                      </span>
                    </div>
                    <h3 className="text-xl lg:text-2xl font-heading font-black text-white tracking-tight group-hover:text-cyan-200 transition-colors">
                      {language === 'bm' ? 'Sewa Motosikal' : 'Motorbike Rentals'}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-200 mt-1 leading-relaxed">
                      {language === 'bm'
                        ? 'Skuter & motosikal berdaftar untuk perjalanan lancar tanpa kesesakan.'
                        : 'Trusted scooters & motorcycles for hassle-free highland traffic navigation.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-4 mt-4 border-t border-white/15 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-cyan-200">
                  {language === 'bm'
                    ? 'Helmet Disediakan · Tempahan Terus Vendor'
                    : 'Helmets Included · Direct Vendor Booking'}
                </span>
                <button
                  type="button"
                  className="px-4 py-2 rounded-full bg-cyan-400 hover:bg-cyan-300 text-stone-950 font-black text-xs shadow-lg group-hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span>{language === 'bm' ? 'Lihat Motosikal' : 'Browse Rentals'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Custom Admin Cards on PC */}
        {customCards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {customCards.map((card) => (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className="rounded-2xl p-4 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-500/50 hover:border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.18)] hover:shadow-[0_0_30px_rgba(16,185,129,0.34)] flex flex-col justify-between min-h-[175px] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden"
              >
                <div className="relative z-10">
                  <span className="text-sm font-bold text-white block truncate group-hover:text-emerald-300 transition-colors">
                    {card.title}
                  </span>
                </div>

                {safeSrc(card.imageUrl) && (
                  <div className="rounded-xl overflow-hidden my-2 aspect-video bg-stone-950 border border-white/10">
                    <img
                      src={safeSrc(card.imageUrl, DEFAULT_PLACE_IMAGE)}
                      alt={card.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-white/10 text-xs relative z-10">
                  <span className="text-emerald-400 font-bold">{card.buttonText || 'Open'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-300 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
