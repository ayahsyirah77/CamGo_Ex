// MobileHomeCards.tsx
import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  CloudSun,
  CloudFog,
  CloudLightning,
  Sun,
  ArrowRight,
  Route,
  Users,
  MapPin,
  Bike,
  Sparkles,
  Droplets,
  BedDouble,
  ShieldCheck,
} from 'lucide-react';
import { MobileHomeCard, Language, WeatherData, TrafficAlert, HazardAlert, AccommodationListing } from '../types';
import { firebaseService } from '../services/firebase';
import { INITIAL_MOBILE_HOME_CARDS } from '../data/initialHomeCards';

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
  weatherList = [],
  trafficAlerts = [],
  hazards = [],
}) => {
  const [cards, setCards] = useState<MobileHomeCard[]>(() => firebaseService.getHomeCards());
  const [accommodations, setAccommodations] = useState<AccommodationListing[]>(() =>
    firebaseService.getAccommodationListings()
  );

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

  const currentWeather = weatherList[0];
  const rawTemp = currentWeather?.temp ?? currentWeather?.temperature;
  const tempDisplay = rawTemp !== undefined && rawTemp !== null ? `${rawTemp}°C` : '18°C';
  const conditionDisplay = currentWeather?.condition || 'Highland Mist';

  const getWeatherIcon = (conditionStr?: string) => {
    const cond = (conditionStr || '').toLowerCase();
    if (cond.includes('thunder') || cond.includes('lightning') || cond.includes('ribut')) {
      return <CloudLightning className="w-5 h-5 text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.7)]" />;
    }
    if (cond.includes('sun') || cond.includes('clear') || cond.includes('cerah')) {
      return <Sun className="w-5 h-5 text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.7)]" />;
    }
    if (cond.includes('fog') || cond.includes('mist') || cond.includes('kabus')) {
      return <CloudFog className="w-5 h-5 text-teal-300 drop-shadow-[0_0_6px_rgba(45,212,191,0.7)]" />;
    }
    if (cond.includes('cloud') || cond.includes('berawan') || cond.includes('mendung')) {
      return <CloudSun className="w-5 h-5 text-cyan-200 drop-shadow-[0_0_6px_rgba(165,243,252,0.7)]" />;
    }
    return <CloudRain className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]" />;
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
        }
        else if (card.type === 'sos') onOpenSos();
        else if (card.buttonAction === 'open-accommodation' || card.id?.includes('accommodation')) {
          if (onOpenAccommodation) onOpenAccommodation();
        }
        break;
    }
  };

  // Find standard cards from the array or fallback
  const weatherCard = activeCards.find((c) => c.type === 'weather' || c.id === 'card-1-weather') || cards.find((c) => c.type === 'weather') || INITIAL_MOBILE_HOME_CARDS[0];
  const hazardCard = activeCards.find((c) => c.type === 'hazard' || c.id === 'card-2-hazard') || cards.find((c) => c.type === 'hazard') || INITIAL_MOBILE_HOME_CARDS[1];
  const mapCard = activeCards.find((c) => c.type === 'map' || c.id === 'card-3-map') || cards.find((c) => c.type === 'map') || INITIAL_MOBILE_HOME_CARDS[2];
  const itineraryCard = activeCards.find((c) => c.type === 'itinerary' || c.id === 'card-4-itinerary') || cards.find((c) => c.type === 'itinerary') || INITIAL_MOBILE_HOME_CARDS[3];
  const partyCard = activeCards.find((c) => c.type === 'party' || c.id === 'card-5-party') || cards.find((c) => c.type === 'party') || INITIAL_MOBILE_HOME_CARDS[4];
  const bikeCard = activeCards.find((c) => c.type === 'bike' || c.id === 'card-6-bike') || cards.find((c) => c.type === 'bike') || INITIAL_MOBILE_HOME_CARDS[5];

  // Any custom cards added by Admin beyond the standard 6 cards
  const standardIds = ['card-1-weather', 'card-2-hazard', 'card-3-map', 'card-4-itinerary', 'card-5-party', 'card-6-bike'];
  const standardTypes = ['weather', 'hazard', 'map', 'itinerary', 'party', 'bike', 'sos'];
  const customCards = activeCards.filter((c) => !standardTypes.includes(c.type) && !standardIds.includes(c.id));

  return (
    <div className="block sm:hidden px-3 mb-8 space-y-3">
      {/* Row 1: Weather (Top Left) & Live Notice/Hazard (Top Right) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Cameron Highlands Weather */}
        {weatherCard && weatherCard.isActive && (
          <div
            onClick={() => handleCardClick(weatherCard)}
            className="rounded-2xl p-3 bg-stone-900/95 backdrop-blur-xl border-2 border-cyan-400/60 hover:border-cyan-300 active:border-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] flex flex-col justify-between min-h-[148px] cursor-pointer active:scale-[0.96] hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
          >
            {/* Background Image with robust rendering */}
            {weatherCard.imageUrl ? (
              <div className="absolute inset-0 z-0">
                <img
                  src={weatherCard.imageUrl}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-stone-950/70 via-cyan-950/20 to-stone-950/80" />
              </div>
            ) : (
              /* Fallback glass gradient if no image */
              <div className="absolute inset-0 bg-gradient-to-b from-stone-900/95 via-cyan-950/40 to-stone-900/95" />
            )}

            {/* Soft atmospheric background glow */}
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-cyan-400/20 blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            {/* Glass specular shimmer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Top Row: Title & Badge */}
            <div className="relative z-10 flex items-center justify-between gap-1">
              <span className="text-[9.5px] min-[360px]:text-[10.5px] font-black text-stone-100 tracking-tight leading-tight whitespace-normal drop-shadow group-hover:text-cyan-200 transition-colors">
                {weatherCard.title || 'Cameron Highlands'}
              </span>
              <span className="flex items-center gap-0.5 text-[8px] font-mono font-bold text-cyan-300 bg-cyan-950/90 border border-cyan-400/50 px-1.5 py-0.5 rounded-full shrink-0 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>{weatherCard.badge || weatherCard.tag || 'LIVE'}</span>
              </span>
            </div>

            {/* Temperature & Weather Info */}
            <div className="relative z-10 flex items-center justify-between my-auto py-1">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-2xl min-[360px]:text-3xl font-black text-white tracking-tight drop-shadow-md leading-none group-hover:scale-105 transition-transform origin-left">
                  {tempDisplay}
                </span>

                {/* Map Pin + Township + Condition badge */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-1">
                  <div className="flex items-center gap-1 font-bold text-stone-200 shrink-0">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="leading-none whitespace-nowrap">{weatherCard.subtitle || currentWeather?.township || 'Tanah Rata'}</span>
                  </div>
                  <span className="text-[8.5px] font-mono font-bold text-cyan-300 bg-cyan-950/90 px-1.5 py-0.5 rounded border border-cyan-500/40 whitespace-nowrap shrink-0 shadow-sm">
                    {conditionDisplay}
                  </span>
                </div>
              </div>

              {/* Clean 3D Weather Icon Container */}
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
            {/* Glass specular shimmer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Header: Title & Red LIVE Pulse */}
            <div className="relative z-10 flex items-center justify-between gap-1 mb-1">
              <span className="text-[9.5px] min-[360px]:text-[10.5px] font-black text-stone-100 tracking-tight leading-tight whitespace-normal drop-shadow group-hover:text-emerald-200 transition-colors">
                {hazardCard.title === 'Live Traffic/Hazard' ? 'Live Notice/Hazard' : (hazardCard.title || 'Live Notice/Hazard')}
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-mono font-black text-[8px] shadow-md flex items-center gap-0.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>{hazardCard.badge || hazardCard.tag || 'LIVE'}</span>
              </span>
            </div>

            {/* Live camera thumbnail */}
            <div className="relative rounded-xl overflow-hidden my-auto aspect-[16/10] bg-stone-950 border-2 border-white/15 group-hover:border-emerald-400/60 transition-colors shadow-inner">
              <img
                src={hazardCard.imageUrl || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'}
                alt={hazardCard.title || 'Live Notice/Hazard'}
                className="w-full h-full object-cover group-hover:scale-110 group-active:scale-105 transition-transform duration-500 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-transparent to-transparent" />
              {hazards.some((h) => h.agency === 'PDRM') && (
                <span className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-sky-600/90 text-white text-[8px] font-mono font-black tracking-wide border border-sky-300/40">
                  PDRM LIVE
                </span>
              )}
            </div>

            {/* Footer: Location & Status */}
            <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-stone-200 z-10 gap-1">
              <span className="leading-tight truncate">
                {hazardCard.subtitle && hazardCard.subtitle !== 'Kea Farm' ? hazardCard.subtitle : 'PDRM • JKR • MDCH'}
              </span>
              <span className="text-[9px] text-emerald-400 font-mono font-bold shrink-0">
                {hazards.length > 0 ? `${hazards.length} Active` : (hazardCard.buttonText || 'Monitored')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Card 3: Plan Your Highland Escape (Full-Width Banner) */}
      {mapCard && mapCard.isActive && (
        <div
          onClick={() => handleCardClick(mapCard)}
          className="rounded-2xl p-3.5 bg-gradient-to-r from-emerald-950/80 via-stone-900/95 to-teal-950/80 backdrop-blur-xl border-2 border-emerald-400/70 hover:border-teal-300 active:border-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] relative overflow-hidden cursor-pointer active:scale-[0.96] hover:-translate-y-1 transition-all duration-300 ease-out group min-h-[120px] flex flex-col justify-between select-none"
        >
          {/* Glass specular shimmer */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

          {/* Background image overlay with soft gradient */}
          <div className="absolute inset-0 z-0">
            <img
              src={mapCard.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'}
              alt={mapCard.title || 'Highland Escape'}
              className="w-full h-full object-cover opacity-30 group-hover:opacity-45 group-hover:scale-108 group-active:scale-105 transition-all duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/80 to-transparent" />
          </div>

          <div className="relative z-10">
            <h4 className="text-base font-black text-white tracking-tight leading-tight group-hover:text-emerald-200 transition-colors">
              {mapCard.title || 'Plan Your Highland Escape'}
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
          {/* Glass specular shimmer */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

          {/* Thumbnail preview */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-stone-950 shrink-0 border-2 border-white/15 group-hover:border-emerald-400/60 transition-colors shadow-md">
            <img
              src={
                itineraryCard.imageUrl && itineraryCard.imageUrl !== 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80'
                  ? itineraryCard.imageUrl
                  : 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80'
              }
              alt={itineraryCard.title || 'Plan Your Trip'}
              className="w-full h-full object-cover group-hover:scale-110 group-active:scale-105 transition-transform duration-500 ease-out"
            />
            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-stone-950/85 backdrop-blur-md text-[8.5px] font-mono font-bold text-emerald-300 border border-white/10">
              {itineraryCard.badge || itineraryCard.tag || 'Trip'}
            </span>
          </div>

          {/* Clean "Plan Your Trip" title */}
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
        {/* Card 5: Find My Party */}
        {partyCard && partyCard.isActive && (
          <div
            onClick={() => handleCardClick(partyCard)}
            className="rounded-2xl p-3 bg-stone-900/90 backdrop-blur-xl border-2 border-emerald-400/50 hover:border-emerald-300 active:border-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] flex flex-col justify-between min-h-[155px] cursor-pointer active:scale-[0.96] hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
          >
            {/* Glass specular shimmer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

            <div className="flex items-center gap-1 relative z-10">
              <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-black text-white tracking-tight leading-tight truncate group-hover:text-emerald-200 transition-colors">
                {partyCard.title || 'Find My Party'}
              </span>
            </div>

            {/* Trail gathering image */}
            <div className="relative rounded-xl overflow-hidden my-auto aspect-[16/10] bg-stone-950 border-2 border-white/15 group-hover:border-emerald-400/60 transition-colors shadow-inner">
              <img
                src={partyCard.imageUrl || 'https://images.unsplash.com/photo-1528543606781-2f6e6857f318?auto=format&fit=crop&w=600&q=80'}
                alt={partyCard.title || 'Find My Party'}
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

        {/* Card 6: Motorbike Rentals */}
        {bikeCard && bikeCard.isActive && (
          <div
            onClick={() => handleCardClick(bikeCard)}
            className="rounded-2xl p-3 bg-stone-900/90 backdrop-blur-xl border-2 border-cyan-400/60 hover:border-cyan-300 active:border-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] flex flex-col justify-between min-h-[155px] cursor-pointer active:scale-[0.96] hover:-translate-y-1 transition-all duration-300 ease-out group relative overflow-hidden select-none"
          >
            {/* Glass specular shimmer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

            <div className="flex items-center gap-1 relative z-10">
              <Bike className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform" />
              <span className="text-[11px] font-black text-white tracking-tight leading-tight truncate group-hover:text-cyan-200 transition-colors">
                {bikeCard.title || 'Motorbike Rentals'}
              </span>
            </div>

            {/* Motorbike scenic image */}
            <div className="relative rounded-xl overflow-hidden my-auto aspect-[16/10] bg-stone-950 border-2 border-white/15 group-hover:border-cyan-400/60 transition-colors shadow-inner">
              <img
                src={
                  bikeCard.imageUrl && bikeCard.imageUrl !== 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80'
                    ? bikeCard.imageUrl
                    : 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80'
                }
                alt={bikeCard.title || 'Motorbike Rentals'}
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

      {/* Row 5: Verified Homestays & Stays (Pay-to-Reveal Anti-Bypass) */}
      <div
        onClick={() => onOpenAccommodation && onOpenAccommodation()}
        className="rounded-2xl p-3.5 bg-stone-900/95 backdrop-blur-xl border-2 border-emerald-500/50 hover:border-emerald-400 active:border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-all group relative overflow-hidden select-none"
      >
        {/* Subtle scenic background overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={
              accommodations[0]?.coverImage ||
              'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
            }
            alt="Verified Homestays & Stays"
            className="w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/95 via-stone-900/90 to-emerald-950/80" />
        </div>

        {/* Top Row: Photo Thumbnail + Icon Badge + Full Unclipped Title */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-stone-950 shrink-0 border-2 border-emerald-400/40 group-hover:border-emerald-300 transition-colors shadow-md">
            <img
              src={
                accommodations[0]?.coverImage ||
                'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'
              }
              alt="Cameron Highlands Verified Homestays"
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

        {/* Bottom Row: Badges + Browse Action */}
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

      {/* Any Additional Custom Cards created by Admin */}
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

              {card.imageUrl && (
                <div className="rounded-xl overflow-hidden my-1.5 aspect-video bg-stone-950 border-2 border-white/10">
                  <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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
  );
};
