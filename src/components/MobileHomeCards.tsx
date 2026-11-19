// MobileHomeCards.tsx
import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  MobileHomeCard,
  Language,
  WeatherData,
  TrafficAlert,
  HazardAlert,
  AccommodationListing,
  Township,
} from '../types';
import { firebaseService } from '../services/firebase';
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
  onSelectTownshipOnMap,
  weatherList = [],
  hazards = [],
}) => {
  const [cards, setCards] = useState<MobileHomeCard[]>(() => firebaseService.getHomeCards());
  const [accommodations, setAccommodations] = useState<AccommodationListing[]>(() =>
    firebaseService.getAccommodationListings()
  );
  const [desktopWeatherIdx, setDesktopWeatherIdx] = useState(0);

  useEffect(() => {
    const handleCardsUpdated = (e: any) => {
      const updated = e?.detail || firebaseService.getHomeCards();
      setCards(updated);
    };
    const handleAccomUpdated = (e: any) => {
      const updated = Array.isArray(e?.detail) ? e.detail : firebaseService.getAccommodationListings();
      setAccommodations(updated);
    };
    window.addEventListener('home-cards-updated', handleCardsUpdated);
    window.addEventListener('accommodation-listings-updated', handleAccomUpdated);
    const interval = setInterval(() => {
      setCards(firebaseService.getHomeCards());
    }, 2000);
    return () => {
      window.removeEventListener('home-cards-updated', handleCardsUpdated);
      window.removeEventListener('accommodation-listings-updated', handleAccomUpdated);
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
      label: language === 'bm' ? 'Laluan' : 'Trails',
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

  return (
    <>
      {/* =====================================================================
          MOBILE VIEW (< 640px): Thumb-ergonomic Mobile Cards Layout
         ===================================================================== */}
      <div className="block sm:hidden px-3 mb-8 space-y-3">
        {/* Row 1: Weather (Top Left) & Live Notice/Hazard (Top Right) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Cameron Highlands Weather */}
          {weatherCard && weatherCard.isActive && (
            <div
              onClick={() => handleCardClick(weatherCard)}
              className="rounded-2xl p-3 bg-stone-900/95 backdrop-blur-xl border-2 border-cyan-400/60 hover:border-cyan-300 active:border-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] flex flex-col justify-between min-h-[148px] cursor-pointer active:scale-[0.96] hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
            >
              {safeSrc(weatherCard.imageUrl) ? (
                <div className="absolute inset-0 z-0">
                  <img
                    src={safeSrc(weatherCard.imageUrl)}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-stone-950/70 via-cyan-950/20 to-stone-950/80" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/95 via-cyan-950/40 to-stone-900/95" />
              )}

              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-cyan-400/20 blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between gap-1">
                <span className="text-[9.5px] min-[360px]:text-[10.5px] font-black text-stone-100 tracking-tight leading-tight whitespace-normal drop-shadow group-hover:text-cyan-200 transition-colors">
                  {weatherCard.title || 'Cameron Highlands'}
                </span>
                <span className="flex items-center gap-0.5 text-[8px] font-mono font-bold text-cyan-300 bg-cyan-950/90 border border-cyan-400/50 px-1.5 py-0.5 rounded-full shrink-0 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>{weatherCard.badge || weatherCard.tag || 'LIVE'}</span>
                </span>
              </div>

              <div className="relative z-10 flex items-center justify-between my-auto py-1">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-2xl min-[360px]:text-3xl font-black text-white tracking-tight drop-shadow-md leading-none group-hover:scale-105 transition-transform origin-left tabular-nums">
                    {tempDisplay}
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-1">
                    <div className="flex items-center gap-1 font-bold text-stone-200 shrink-0">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="leading-none whitespace-nowrap">
                        {weatherCard.subtitle || currentWeather?.township || 'Tanah Rata'}
                      </span>
                    </div>
                    <span className="text-[8.5px] font-mono font-bold text-cyan-300 bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-500/40 whitespace-nowrap shrink-0 shadow-sm">
                      {conditionDisplay}
                    </span>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600/30 via-sky-500/25 to-teal-400/30 border-2 border-cyan-400/50 flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ml-1">
                  {getWeatherIcon(conditionDisplay)}
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Live Notice/Hazard */}
          {hazardCard && hazardCard.isActive && (
            <div
              onClick={() => handleCardClick(hazardCard)}
              className="rounded-2xl p-3 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-400/60 hover:border-emerald-300 active:border-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.2)] hover:shadow-[0_0_30px_rgba(52,211,153,0.4)] flex flex-col justify-between min-h-[148px] cursor-pointer active:scale-[0.96] hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between gap-1 mb-1">
                <span className="text-[9.5px] min-[360px]:text-[10.5px] font-black text-stone-100 tracking-tight leading-tight whitespace-normal drop-shadow group-hover:text-emerald-200 transition-colors">
                  {hazardCard.title === 'Live Traffic/Hazard' ? 'Live Notice/Hazard' : hazardCard.title || 'Live Notice/Hazard'}
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-mono font-black text-[8px] shadow-md flex items-center gap-0.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>{hazardCard.badge || hazardCard.tag || 'LIVE'}</span>
                </span>
              </div>

              <div className="relative rounded-xl overflow-hidden my-auto aspect-[16/10] bg-stone-950 border-2 border-white/15 group-hover:border-emerald-400/60 transition-colors shadow-inner">
                <img
                  src={safeSrc(hazardCard.imageUrl, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80')}
                  alt={hazardCard.title || 'Live Notice/Hazard'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-110 group-active:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-transparent to-transparent" />
                {hazards.some((h) => h.agency === 'PDRM') && (
                  <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-sky-600/90 text-white text-[8px] font-mono font-black tracking-wide border border-sky-300/40">
                    PDRM LIVE
                  </span>
                )}
              </div>

              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-stone-200 z-10 gap-1">
                <span className="leading-tight truncate">
                  {hazardCard.subtitle && hazardCard.subtitle !== 'Kea Farm' ? hazardCard.subtitle : 'PDRM • JKR • MDCH'}
                </span>
                <span className="text-[9px] text-emerald-400 font-mono font-bold shrink-0">
                  {hazards.length > 0 ? `${hazards.length} Active` : hazardCard.buttonText || 'Monitored'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Card 3: Highland Map (Full-Width Banner) */}
        {mapCard && mapCard.isActive && (
          <div
            onClick={() => handleCardClick(mapCard)}
            className="rounded-2xl p-3.5 bg-gradient-to-r from-emerald-950/80 via-stone-900/95 to-teal-950/80 backdrop-blur-xl border-2 border-emerald-400/70 hover:border-teal-300 active:border-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] relative overflow-hidden cursor-pointer active:scale-[0.96] hover:-translate-y-1 transition-all duration-300 ease-out group min-h-[120px] flex flex-col justify-between select-none"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

            <div className="absolute inset-0 z-0">
              <img
                src={safeSrc(mapCard.imageUrl, 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80')}
                alt={mapCard.title === 'Plan Your Highland Escape' || !mapCard.title ? 'Highland Map' : mapCard.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover opacity-30 group-hover:opacity-45 group-hover:scale-108 group-active:scale-105 transition-all duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/80 to-transparent" />
            </div>

            <div className="relative z-10">
              <h4 className="text-base font-black text-white tracking-tight leading-tight group-hover:text-emerald-200 transition-colors">
                {mapCard.title === 'Plan Your Highland Escape' || !mapCard.title ? 'Highland Map' : mapCard.title}
              </h4>
              {mapCard.subtitle && (
                <p className="text-xs text-stone-300 mt-0.5 font-medium">{mapCard.subtitle}</p>
              )}
            </div>

            <div className="relative z-10 pt-2 flex items-center justify-between">
              <button
                type="button"
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 hover:from-orange-400 hover:to-emerald-400 text-white font-black text-xs shadow-lg flex items-center gap-1.5 group-hover:scale-105 group-hover:gap-2 transition-all duration-300 cursor-pointer"
              >
                <span>{mapCard.buttonText || 'Explore Now'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-[9.5px] text-emerald-300 font-mono font-bold bg-emerald-950/90 px-2 py-0.5 rounded-full border border-emerald-400/50 shadow-sm">
                {mapCard.badge || mapCard.tag || 'GPS Active'}
              </span>
            </div>
          </div>
        )}

        {/* Row 3: Card 4: Plan Your Trip (Wide Card) */}
        {itineraryCard && itineraryCard.isActive && (
          <div
            onClick={() => handleCardClick(itineraryCard)}
            className="rounded-2xl p-3 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-400/50 hover:border-emerald-300 active:border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] cursor-pointer active:scale-[0.96] hover:-translate-y-1 transition-all duration-300 ease-out group flex items-center gap-3 min-h-[85px] select-none relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-stone-950 shrink-0 border-2 border-white/15 group-hover:border-emerald-400/60 transition-colors shadow-md">
              <img
                src={safeSrc(
                  itineraryCard.imageUrl &&
                    itineraryCard.imageUrl !== 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80'
                    ? itineraryCard.imageUrl
                    : undefined,
                  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80'
                )}
                alt={itineraryCard.title || 'Plan Your Trip'}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover group-hover:scale-110 group-active:scale-105 transition-transform duration-500 ease-out"
              />
              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-stone-950/85 backdrop-blur-md text-[8.5px] font-mono font-bold text-emerald-300 border border-white/10">
                {itineraryCard.badge || itineraryCard.tag || 'Trip'}
              </span>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 h-full relative z-10">
              <div>
                <h5 className="text-sm font-black text-white tracking-tight group-hover:text-emerald-300 transition-colors leading-tight">
                  {itineraryCard.title || 'Plan Your Trip'}
                </h5>
                {itineraryCard.subtitle && (
                  <p className="text-[10px] text-stone-400 line-clamp-1 mt-0.5">{itineraryCard.subtitle}</p>
                )}
              </div>

              <div className="pt-1.5 flex items-center justify-between">
                <button
                  type="button"
                  className="px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-stone-950 font-black text-xs shadow-md group-hover:scale-105 transition-all duration-300 cursor-pointer flex items-center gap-1"
                >
                  <span>{itineraryCard.buttonText || 'Where to?'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Plan</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Row 4: Card 5: Find My Party (Left) & Card 6: Motorbike Rentals (Right) */}
        <div className="grid grid-cols-2 gap-2.5">
          {partyCard && partyCard.isActive && (
            <div
              onClick={() => handleCardClick(partyCard)}
              className="rounded-2xl p-3 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-400/50 hover:border-emerald-300 active:border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] flex flex-col justify-between min-h-[155px] cursor-pointer active:scale-[0.96] hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

              <div className="flex items-center gap-1 relative z-10">
                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black text-white tracking-tight leading-tight truncate group-hover:text-emerald-200 transition-colors">
                  {partyCard.title || 'Find My Party'}
                </span>
              </div>

              <div className="relative rounded-xl overflow-hidden my-auto aspect-[16/10] bg-stone-950 border-2 border-white/15 group-hover:border-emerald-400/60 transition-colors shadow-inner">
                <img
                  src={safeSrc(partyCard.imageUrl, 'https://images.unsplash.com/photo-1528543606781-2f6e6857f318?auto=format&fit=crop&w=600&q=80')}
                  alt={partyCard.title || 'Find My Party'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-110 group-active:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
              </div>

              <div className="pt-1 flex items-center justify-between relative z-10">
                <button
                  type="button"
                  className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-[10.5px] shadow-sm group-hover:scale-105 transition-all cursor-pointer"
                >
                  {partyCard.buttonText || 'Explore'}
                </button>
                <span className="text-[9.5px] text-emerald-400 font-mono font-bold shrink-0">{partyCard.badge || partyCard.tag || 'Groups'}</span>
              </div>
            </div>
          )}

          {bikeCard && bikeCard.isActive && (
            <div
              onClick={() => handleCardClick(bikeCard)}
              className="rounded-2xl p-3 bg-stone-900/90 backdrop-blur-xl border-2 border-cyan-400/60 hover:border-cyan-300 active:border-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] flex flex-col justify-between min-h-[155px] cursor-pointer active:scale-[0.96] hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

              <div className="flex items-center gap-1 relative z-10">
                <Bike className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform" />
                <span className="text-[11px] font-black text-white tracking-tight leading-tight truncate group-hover:text-cyan-200 transition-colors">
                  {bikeCard.title || 'Motorbike Rentals'}
                </span>
              </div>

              <div className="relative rounded-xl overflow-hidden my-auto aspect-[16/10] bg-stone-950 border-2 border-white/15 group-hover:border-cyan-400/60 transition-colors shadow-inner">
                <img
                  src={safeSrc(
                    bikeCard.imageUrl &&
                      bikeCard.imageUrl !== 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80'
                      ? bikeCard.imageUrl
                      : undefined,
                    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80'
                  )}
                  alt={bikeCard.title || 'Motorbike Rentals'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-110 group-active:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
              </div>

              <div className="pt-1 flex items-center justify-between relative z-10">
                <button
                  type="button"
                  className="px-3 py-1 rounded-full bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black text-[10.5px] shadow-sm group-hover:scale-105 transition-all cursor-pointer"
                >
                  {bikeCard.buttonText || 'Rent Ride'}
                </button>
                <span className="text-[9.5px] text-cyan-400 font-mono font-bold shrink-0">{bikeCard.badge || bikeCard.tag || 'Rides'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Row 5: Verified Homestays & Stays */}
        <div
          onClick={() => onOpenAccommodation && onOpenAccommodation()}
          className="rounded-2xl p-3.5 bg-stone-900/95 backdrop-blur-xl border-2 border-emerald-500/50 hover:border-emerald-400 active:border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-all group relative overflow-hidden select-none"
        >
          <div className="absolute inset-0 z-0">
            <img
              src={safeSrc(
                accommodations[0]?.coverImage,
                'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
              )}
              alt="Verified Homestays & Stays"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-900/90 to-emerald-950/80" />
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-stone-950 shrink-0 border-2 border-emerald-400/40 group-hover:border-emerald-300 transition-colors shadow-md">
              <img
                src={safeSrc(
                  accommodations[0]?.coverImage,
                  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
                )}
                alt="Cameron Highlands Verified Homestays"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
              <div className="absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-emerald-500 text-stone-950 flex items-center justify-center shadow-md">
                <BedDouble className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors leading-snug whitespace-normal">
                Verified Homestays &amp; Stays
              </h5>
              <p className="text-[11px] text-stone-300 leading-snug mt-0.5 whitespace-normal">
                Direct Host Portals · Pay Balance at Door
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 relative z-10">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/35 text-emerald-300 text-[9.5px] font-black uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                <span>RM30 Lock</span>
              </span>
              <span className="text-[10px] font-mono text-stone-400">
                {accommodations.length > 0 ? `${accommodations.length} Verified` : 'Vendor Direct'}
              </span>
            </div>

            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs shadow-md shrink-0 flex items-center gap-1 group-hover:scale-105 transition-transform cursor-pointer"
            >
              <span>Browse</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
        {/* PC Quick-Launch Utility Bar (Matches Mobile Row 3 + Mobile Bottom Nav) */}
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

        {/* Row 1: 12-Col Hero Map + Interactive Weather + Live Notice/Hazard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
          {/* Card 1 (Hero): Highland Map */}
          {mapCard && mapCard.isActive && (
            <div
              onClick={() => handleCardClick(mapCard)}
              className="md:col-span-2 lg:col-span-6 rounded-3xl p-6 bg-gradient-to-br from-emerald-950/85 via-stone-900/95 to-teal-950/85 backdrop-blur-xl border-2 border-emerald-400/65 hover:border-teal-300 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_45px_rgba(16,185,129,0.38)] relative overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group min-h-[250px] flex flex-col justify-between select-none"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />
              <div className="absolute inset-0 z-0">
                <img
                  src={safeSrc(mapCard.imageUrl, 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80')}
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

          {/* Card 2: Interactive Cameron Highlands Weather */}
          {weatherCard && weatherCard.isActive && (
            <div
              onClick={() => handleCardClick(weatherCard)}
              className="lg:col-span-3 rounded-3xl p-5 bg-stone-900/95 backdrop-blur-xl border-2 border-cyan-400/60 hover:border-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.18)] hover:shadow-[0_0_36px_rgba(34,211,238,0.36)] flex flex-col justify-between min-h-[250px] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
            >
              {safeSrc(weatherCard.imageUrl) ? (
                <div className="absolute inset-0 z-0">
                  <img
                    src={safeSrc(weatherCard.imageUrl)}
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
                  <span className="text-cyan-300 font-bold">Forecast →</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Live Notice / Hazard Camera Feed */}
          {hazardCard && hazardCard.isActive && (
            <div
              onClick={() => handleCardClick(hazardCard)}
              className="lg:col-span-3 rounded-3xl p-5 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-400/60 hover:border-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.18)] hover:shadow-[0_0_36px_rgba(52,211,153,0.36)] flex flex-col justify-between min-h-[250px] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
            >
              <div className="relative z-10 flex items-center justify-between gap-2 mb-2.5">
                <span className="text-xs font-black text-stone-100 tracking-tight group-hover:text-emerald-200 transition-colors">
                  {hazardCard.title === 'Live Traffic/Hazard' ? 'Live Notice/Hazard' : hazardCard.title || 'Live Notice/Hazard'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono font-black text-[9px] shadow-md flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>{hazardCard.badge || hazardCard.tag || 'LIVE'}</span>
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-stone-950 border-2 border-white/15 group-hover:border-emerald-400/60 transition-colors shadow-inner">
                <img
                  src={safeSrc(hazardCard.imageUrl, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80')}
                  alt={hazardCard.title || 'Live Notice/Hazard'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />
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
                  {hazardCard.subtitle && hazardCard.subtitle !== 'Kea Farm' ? hazardCard.subtitle : 'PDRM · JKR · MDCH'}
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-bold shrink-0 tabular-nums">
                  {hazards.length > 0 ? `${hazards.length} Active` : hazardCard.buttonText || 'Monitored'} →
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Row 2: 12-Col Verified Homestays & Plan Your Trip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Card 4: Verified Homestays & Stays */}
          <div
            onClick={() => onOpenAccommodation && onOpenAccommodation()}
            className="lg:col-span-7 rounded-3xl p-6 bg-stone-900/95 backdrop-blur-xl border-2 border-emerald-500/50 hover:border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.18)] hover:shadow-[0_0_38px_rgba(16,185,129,0.34)] flex flex-col justify-between gap-4 cursor-pointer hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden select-none min-h-[210px]"
          >
            <div className="absolute inset-0 z-0">
              <img
                src={safeSrc(
                  accommodations[0]?.coverImage,
                  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80'
                )}
                alt="Verified Homestays & Stays"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-900/90 to-emerald-950/80" />
            </div>

            <div className="flex items-start justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-stone-950 shrink-0 border-2 border-emerald-400/40 group-hover:border-emerald-300 transition-colors shadow-lg">
                  <img
                    src={safeSrc(
                      accommodations[0]?.coverImage,
                      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
                    )}
                    alt="Cameron Highlands Verified Homestays"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-lg bg-emerald-500 text-stone-950 flex items-center justify-center shadow-md">
                    <BedDouble className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <h4 className="text-xl font-heading font-black text-white group-hover:text-emerald-300 transition-colors">
                    Verified Homestays &amp; Stays
                  </h4>
                  <p className="text-xs sm:text-sm text-stone-300 mt-1">
                    Direct Host Portals · Pay Balance at Door · Anti-Scam Protected
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-emerald-300 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      RM30 Lock Deposit
                    </span>
                    <span className="text-stone-500">·</span>
                    <span className="text-stone-300 font-mono tabular-nums">
                      {accommodations.length > 0 ? `${accommodations.length} Verified Listings` : 'Vendor Direct'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 relative z-10">
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-300">
                {accommodations.slice(0, 2).map((stay) => (
                  <span
                    key={stay.id}
                    className="px-2.5 py-1 rounded-lg bg-stone-950/75 border border-white/10 text-[11px] font-medium truncate max-w-[240px]"
                  >
                    {stay.maskedTitle} · <strong className="text-emerald-300 tabular-nums">RM{stay.pricePerNight}</strong>
                  </span>
                ))}
              </div>

              <button
                type="button"
                className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs shadow-lg shrink-0 flex items-center gap-1.5 group-hover:scale-105 transition-transform cursor-pointer ml-auto"
              >
                <span>Browse Stays</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 5: Plan Your Trip */}
          {itineraryCard && itineraryCard.isActive && (
            <div
              onClick={() => handleCardClick(itineraryCard)}
              className="lg:col-span-5 rounded-3xl p-6 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-400/50 hover:border-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.18)] hover:shadow-[0_0_36px_rgba(16,185,129,0.34)] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group flex flex-col justify-between select-none relative overflow-hidden min-h-[210px]"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={safeSrc(
                    itineraryCard.imageUrl &&
                      itineraryCard.imageUrl !== 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80'
                      ? itineraryCard.imageUrl
                      : undefined,
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
                      itineraryCard.imageUrl &&
                        itineraryCard.imageUrl !== 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80'
                        ? itineraryCard.imageUrl
                        : undefined,
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
                  <h4 className="text-xl font-heading font-black text-white tracking-tight group-hover:text-emerald-300 transition-colors mt-0.5">
                    {itineraryCard.title || 'Plan Your Trip'}
                  </h4>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed">
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

        {/* Row 3: 12-Col Find My Party + Motorbike Rentals + Community Chat Lounge */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-5 items-stretch">
          {/* Card 6: Find My Party */}
          {partyCard && partyCard.isActive && (
            <div
              onClick={() => handleCardClick(partyCard)}
              className="lg:col-span-4 rounded-3xl p-5 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-400/50 hover:border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.18)] hover:shadow-[0_0_32px_rgba(16,185,129,0.34)] flex flex-col justify-between min-h-[215px] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
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
                <span className="text-xs text-stone-400 truncate pr-2">Live group beacons &amp; convoy tracking</span>
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs shadow-sm group-hover:scale-105 transition-all cursor-pointer shrink-0"
                >
                  {partyCard.buttonText || 'Explore'}
                </button>
              </div>
            </div>
          )}

          {/* Card 7: Motorbike Rentals */}
          {bikeCard && bikeCard.isActive && (
            <div
              onClick={() => handleCardClick(bikeCard)}
              className="lg:col-span-4 rounded-3xl p-5 bg-stone-900/90 backdrop-blur-xl border-2 border-cyan-400/60 hover:border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.18)] hover:shadow-[0_0_32px_rgba(34,211,238,0.36)] flex flex-col justify-between min-h-[215px] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
            >
              <div className="flex items-center justify-between gap-2 relative z-10 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                    <Bike className="w-4 h-4" />
                  </div>
                  <h4 className="text-base font-heading font-black text-white truncate group-hover:text-cyan-200 transition-colors">
                    {bikeCard.title || 'Motorbike Rentals'}
                  </h4>
                </div>
                <span className="text-[11px] text-cyan-400 font-mono font-bold shrink-0">
                  {bikeCard.badge || bikeCard.tag || 'Rides'}
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden my-auto aspect-[16/9] bg-stone-950 border border-white/15 group-hover:border-cyan-400/60 transition-colors shadow-inner">
                <img
                  src={safeSrc(
                    bikeCard.imageUrl &&
                      bikeCard.imageUrl !== 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80'
                      ? bikeCard.imageUrl
                      : undefined,
                    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80'
                  )}
                  alt={bikeCard.title || 'Motorbike Rentals'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
              </div>

              <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between relative z-10">
                <span className="text-xs text-stone-400 truncate pr-2">Verified two-wheel highland fleets</span>
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black text-xs shadow-sm group-hover:scale-105 transition-all cursor-pointer shrink-0"
                >
                  {bikeCard.buttonText || 'Rent Ride'}
                </button>
              </div>
            </div>
          )}

          {/* Card 8: Community Chat Lounge & Walkie-Talkie */}
          <div
            onClick={() => onOpenChat && onOpenChat()}
            className="lg:col-span-4 rounded-3xl p-5 bg-stone-900/90 backdrop-blur-xl border-2 border-indigo-400/50 hover:border-indigo-300 shadow-[0_0_20px_rgba(129,140,248,0.18)] hover:shadow-[0_0_32px_rgba(129,140,248,0.34)] flex flex-col justify-between min-h-[215px] cursor-pointer hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between gap-2 relative z-10 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h4 className="text-base font-heading font-black text-white truncate group-hover:text-indigo-200 transition-colors">
                  Community Chat Lounge
                </h4>
              </div>
              <span className="text-[11px] text-indigo-300 font-mono font-bold shrink-0">PTT + Chat</span>
            </div>

            <div className="space-y-2 my-auto relative z-10">
              <p className="text-xs text-stone-300 leading-relaxed">
                Live road reports, hiker trail buddies &amp; convoy Push-to-Talk channels.
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
                    className="px-2.5 py-1 rounded-lg bg-stone-950/80 hover:bg-indigo-500/25 border border-white/10 hover:border-indigo-400/50 text-[11px] font-mono text-indigo-200 transition-colors cursor-pointer"
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between relative z-10">
              <span className="text-xs text-stone-400 truncate pr-2">Real-time community channels</span>
              <button
                type="button"
                className="px-4 py-1.5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs shadow-sm group-hover:scale-105 transition-all cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>Open Lounge</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

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
