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
} from 'lucide-react';
import { MobileHomeCard, Language, WeatherData, TrafficAlert, HazardAlert } from '../types';
import { firebaseService } from '../services/firebase';

interface MobileHomeCardsProps {
  language: Language;
  onOpenWeather: () => void;
  onOpenHazard: () => void;
  onOpenMap: () => void;
  onOpenItinerary: () => void;
  onOpenParty: () => void;
  onOpenMotorbike?: () => void;
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
  onOpenSos,
  weatherList = [],
  trafficAlerts = [],
  hazards = [],
}) => {
  const [cards, setCards] = useState<MobileHomeCard[]>(() => firebaseService.getHomeCards());

  useEffect(() => {
    const handleCardsUpdated = (e: any) => {
      const updated = e?.detail || firebaseService.getHomeCards();
      setCards(updated);
    };
    window.addEventListener('home-cards-updated', handleCardsUpdated);
    return () => window.removeEventListener('home-cards-updated', handleCardsUpdated);
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

  const activeCards = cards.filter((c) => c.isActive).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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
        break;
    }
  };

  // Find standard cards from the array or fallback
  const weatherCard = activeCards.find((c) => c.type === 'weather') || cards.find((c) => c.type === 'weather');
  const hazardCard = activeCards.find((c) => c.type === 'hazard') || cards.find((c) => c.type === 'hazard');
  const mapCard = activeCards.find((c) => c.type === 'map') || cards.find((c) => c.type === 'map');
  const itineraryCard = activeCards.find((c) => c.type === 'itinerary') || cards.find((c) => c.type === 'itinerary');
  const partyCard = activeCards.find((c) => c.type === 'party') || cards.find((c) => c.type === 'party');
  // Card 6 is Motorbike Rentals
  const bikeCard = activeCards.find((c) => c.type === 'bike') || activeCards.find((c) => c.type === 'sos') || cards.find((c) => c.type === 'bike');

  // Any custom cards added by Admin beyond the standard 6 cards
  const standardTypes = ['weather', 'hazard', 'map', 'itinerary', 'party', 'bike', 'sos'];
  const customCards = activeCards.filter((c) => !standardTypes.includes(c.type));

  return (
    <div className="block sm:hidden px-3 mb-8 space-y-3">
      {/* Row 1: Weather (Top Left) & Live Traffic/Hazard (Top Right) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Cameron Highlands Weather */}
        {weatherCard && weatherCard.isActive && (
          <div
            onClick={() => handleCardClick(weatherCard)}
            className="rounded-2xl p-3 bg-gradient-to-b from-stone-900/90 via-cyan-950/30 to-stone-900/95 backdrop-blur-xl border border-cyan-500/25 hover:border-cyan-400/50 shadow-lg flex flex-col justify-between min-h-[148px] cursor-pointer active:scale-98 transition-all group relative overflow-hidden select-none"
          >
            {/* Soft atmospheric background glow */}
            <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-cyan-500/10 blur-xl pointer-events-none" />

            {/* Top Row: Title & LIVE Beacon */}
            <div className="relative z-10 flex items-center justify-between gap-1">
              <span className="text-[9.5px] min-[360px]:text-[10.5px] font-black text-stone-100 tracking-tight leading-tight whitespace-normal drop-shadow">
                Cameron Highlands
              </span>
              <span className="flex items-center gap-0.5 text-[8px] font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-400/30 px-1.5 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>LIVE</span>
              </span>
            </div>

            {/* Temperature & Weather Info */}
            <div className="relative z-10 flex items-center justify-between my-auto py-1">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-2xl min-[360px]:text-3xl font-black text-white tracking-tight drop-shadow-md leading-none">
                  {tempDisplay}
                </span>

                {/* Map Pin + Tanah Rata + Condition badge directly below 19°C */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-1">
                  <div className="flex items-center gap-1 font-bold text-stone-200 shrink-0">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="leading-none whitespace-nowrap">{currentWeather?.township || 'Tanah Rata'}</span>
                  </div>
                  <span className="text-[8.5px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30 whitespace-nowrap shrink-0">
                    {conditionDisplay}
                  </span>
                </div>
              </div>

              {/* Clean 3D Weather Icon Container */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600/25 via-sky-500/20 to-teal-400/25 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform ml-1">
                {getWeatherIcon(conditionDisplay)}
              </div>
            </div>
          </div>
        )}

        {/* Card 2: Live Traffic/Hazard */}
        {hazardCard && hazardCard.isActive && (
          <div
            onClick={() => handleCardClick(hazardCard)}
            className="rounded-2xl p-3 bg-stone-900/85 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 shadow-lg flex flex-col justify-between min-h-[148px] cursor-pointer active:scale-98 transition-all group relative overflow-hidden select-none"
          >
            {/* Header: Title & Red LIVE Pulse */}
            <div className="relative z-10 flex items-center justify-between gap-1 mb-1">
              <span className="text-[9.5px] min-[360px]:text-[10.5px] font-black text-stone-100 tracking-tight leading-tight whitespace-normal drop-shadow">
                Live Traffic/Hazard
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-mono font-black text-[8px] shadow-md flex items-center gap-0.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>LIVE</span>
              </span>
            </div>

            {/* Live camera thumbnail */}
            <div className="relative rounded-xl overflow-hidden my-auto aspect-[16/10] bg-stone-950 border border-white/10 group-hover:border-emerald-500/40 transition-colors shadow-inner">
              <img
                src={hazardCard.imageUrl || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'}
                alt="Live Traffic & Hazard"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
            </div>

            {/* Footer: Location & Status */}
            <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-stone-200 z-10">
              <span className="leading-tight truncate">{hazardCard.subtitle || 'Kea Farm'}</span>
              <span className="text-[9px] text-emerald-400 font-mono font-bold shrink-0">Monitored</span>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Card 3: Plan Your Highland Escape (Full-Width Banner) */}
      {mapCard && mapCard.isActive && (
        <div
          onClick={() => handleCardClick(mapCard)}
          className="rounded-2xl p-3.5 bg-gradient-to-r from-emerald-950/70 via-stone-900/90 to-teal-950/70 backdrop-blur-xl border border-emerald-500/30 hover:border-emerald-400 shadow-lg relative overflow-hidden cursor-pointer active:scale-98 transition-all group min-h-[120px] flex flex-col justify-between select-none"
        >
          {/* Background image overlay with soft gradient */}
          <div className="absolute inset-0 z-0">
            <img
              src={mapCard.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'}
              alt="Highland Escape"
              className="w-full h-full object-cover opacity-25 group-hover:scale-105 group-hover:opacity-30 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/80 to-transparent" />
          </div>

          <div className="relative z-10">
            <h4 className="text-base font-black text-white tracking-tight leading-tight">
              Plan Your Highland Escape
            </h4>
          </div>

          <div className="relative z-10 pt-2 flex items-center justify-between">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 text-white font-black text-xs shadow-md flex items-center gap-1 group-hover:gap-1.5 transition-all cursor-pointer"
            >
              <span>Explore Now</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-[9.5px] text-emerald-300 font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
              GPS Active
            </span>
          </div>
        </div>
      )}

      {/* Row 3: Card 4: Plan Your Trip (Wide Card) */}
      {itineraryCard && itineraryCard.isActive && (
        <div
          onClick={() => handleCardClick(itineraryCard)}
          className="rounded-2xl p-3 bg-stone-900/85 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 shadow-lg cursor-pointer active:scale-98 transition-all group flex items-center gap-3 min-h-[85px] select-none"
        >
          {/* Thumbnail preview */}
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-stone-950 shrink-0 border border-white/10 group-hover:border-emerald-400/50 transition-colors shadow-md">
            <img
              src={
                itineraryCard.imageUrl && itineraryCard.imageUrl !== 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80'
                  ? itineraryCard.imageUrl
                  : 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80'
              }
              alt="Plan Your Trip"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-stone-950/85 backdrop-blur-md text-[8.5px] font-mono font-bold text-emerald-300 border border-white/10">
              Trip
            </span>
          </div>

          {/* Clean "Plan Your Trip" title */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 h-full">
            <div>
              <h5 className="text-sm font-black text-white tracking-tight group-hover:text-emerald-300 transition-colors leading-tight">
                Plan Your Trip
              </h5>
            </div>

            <div className="pt-1.5 flex items-center justify-between">
              <button
                type="button"
                className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-stone-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Where to?</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
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
            className="rounded-2xl p-3 bg-stone-900/85 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 shadow-lg flex flex-col justify-between min-h-[155px] cursor-pointer active:scale-98 transition-all group relative overflow-hidden select-none"
          >
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-black text-white tracking-tight leading-tight truncate">
                Find My Party
              </span>
            </div>

            {/* Trail gathering image */}
            <div className="relative rounded-xl overflow-hidden my-auto aspect-[16/10] bg-stone-950 border border-white/10 shadow-inner">
              <img
                src={partyCard.imageUrl || 'https://images.unsplash.com/photo-1528543606781-2f6e6857f318?auto=format&fit=crop&w=600&q=80'}
                alt="Find My Party"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
            </div>

            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-[10.5px] shadow-sm transition-colors cursor-pointer"
              >
                Explore
              </button>
              <span className="text-[9.5px] text-emerald-400 font-mono font-bold shrink-0">Groups</span>
            </div>
          </div>
        )}

        {/* Card 6: Motorbike Rentals */}
        {bikeCard && bikeCard.isActive && (
          <div
            onClick={() => handleCardClick(bikeCard)}
            className="rounded-2xl p-3 bg-stone-900/85 backdrop-blur-xl border border-cyan-500/25 hover:border-cyan-400/50 shadow-lg flex flex-col justify-between min-h-[155px] cursor-pointer active:scale-98 transition-all group relative overflow-hidden select-none"
          >
            <div className="flex items-center gap-1">
              <Bike className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-[11px] font-black text-white tracking-tight leading-tight truncate">
                Motorbike Rentals
              </span>
            </div>

            {/* Motorbike scenic image */}
            <div className="relative rounded-xl overflow-hidden my-auto aspect-[16/10] bg-stone-950 border border-white/10 shadow-inner">
              <img
                src={
                  bikeCard.imageUrl && bikeCard.imageUrl !== 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=600&q=80'
                    ? bikeCard.imageUrl
                    : 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80'
                }
                alt="Motorbike Rentals"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent" />
            </div>

            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                className="px-2.5 py-1 rounded-full bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black text-[10.5px] shadow-sm transition-colors cursor-pointer"
              >
                Rent Ride
              </button>
              <span className="text-[9.5px] text-cyan-400 font-mono font-bold shrink-0">Rides</span>
            </div>
          </div>
        )}
      </div>

      {/* Any Additional Custom Cards created by Admin */}
      {customCards.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {customCards.map((card) => (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className="rounded-2xl p-3 bg-stone-900/80 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 shadow-lg flex flex-col justify-between min-h-[148px] cursor-pointer active:scale-98 transition-all group relative overflow-hidden"
            >
              <div>
                <span className="text-[11px] font-bold text-white block truncate">
                  {card.title}
                </span>
              </div>

              {card.imageUrl && (
                <div className="rounded-xl overflow-hidden my-1.5 aspect-video bg-stone-950 border border-white/5">
                  <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="pt-1.5 flex items-center justify-between border-t border-white/5 text-[9.5px]">
                <span className="text-emerald-400 font-bold">{card.buttonText || 'Open'}</span>
                <ArrowRight className="w-3 h-3 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
