import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Compass,
  Calendar,
  Building2,
  MapPin,
} from 'lucide-react';
import { Language, Place, EventNotification, Township } from '../types';
import { safeSrc, DEFAULT_PLACE_IMAGE } from '../utils/safeMedia';

interface HeroSearchBarProps {
  language: Language;
  places: Place[];
  events: EventNotification[];
  onSelectPlace?: (place: Place) => void;
  onSelectEvent?: (event: EventNotification) => void;
  onSelectTownship?: (township: Township) => void;
  onOpenMap?: () => void;
  onOpenPortalsModal?: () => void;
}

const ALL_TOWNSHIPS: Township[] = [
  'Tanah Rata',
  'Brinchang',
  'Kea Farm',
  'Ringlet',
  'Kampung Raja',
  'Tringkap',
  'Kuala Terla',
  'Bertam Valley',
  'Blue Valley',
];

export const HeroSearchBar: React.FC<HeroSearchBarProps> = ({
  language,
  places,
  events,
  onSelectPlace,
  onSelectEvent,
  onSelectTownship,
  onOpenMap,
  onOpenPortalsModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
        .slice(0, 6)
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

  const handleSelectPlace = (place: Place) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onSelectPlace) {
      onSelectPlace(place);
    } else if (onOpenMap) {
      onOpenMap();
    }
  };

  const handleSelectEvent = (event: EventNotification) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onSelectEvent) {
      onSelectEvent(event);
    } else if (onOpenMap) {
      onOpenMap();
    }
  };

  const handleSelectTownship = (township: Township) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onSelectTownship) {
      onSelectTownship(township);
    } else if (onOpenPortalsModal) {
      onOpenPortalsModal();
    }
  };

  return (
    <div className="hidden sm:block relative z-30 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 -mt-1">
      <div ref={containerRef} className="relative w-full">
        <div className="relative flex items-center bg-stone-900/85 backdrop-blur-xl border border-white/15 focus-within:border-emerald-400/80 rounded-2xl px-4 py-2.5 shadow-2xl shadow-black/50 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20">
          <Search className="w-4 h-4 text-emerald-400 shrink-0 mr-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder={
              language === 'bm'
                ? 'Cari penginapan, ladang strawberi, skuter sewa, acara atau pekan (cth. Tanah Rata, Brinchang)...'
                : 'Search stays, attractions, motorbike rentals, events, or townships (e.g. Tanah Rata, Kea Farm)...'
            }
            aria-label={language === 'bm' ? 'Cari tempat dan acara' : 'Search places, stays, and events'}
            className="w-full bg-transparent text-sm text-stone-100 placeholder-stone-400 outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onOpenMap) onOpenMap();
              }}
              className="ml-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {language === 'bm' ? 'Peta Langsung' : 'Explore Map'}
            </button>
          )}
        </div>

        {/* Live Autocomplete Dropdown */}
        {isSearchOpen && q.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl bg-stone-900/98 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl p-2.5 z-50 text-stone-100 space-y-2.5">
            {totalResults === 0 ? (
              <div className="p-4 text-center text-xs text-stone-400 space-y-1">
                <p className="font-medium text-stone-300">
                  {language === 'bm'
                    ? `Tiada hasil untuk "${searchQuery}"`
                    : `No results found for "${searchQuery}"`}
                </p>
                <p className="text-[11px] text-stone-500">
                  {language === 'bm'
                    ? 'Cuba cari "Steamboat", "Mossy Forest", "Tanah Rata", atau "Pasar Malam".'
                    : 'Try searching for "Steamboat", "Mossy Forest", "Tanah Rata", or "Night Market".'}
                </p>
              </div>
            ) : (
              <>
                {matchingPlaces.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 px-2 py-1 flex items-center justify-between border-b border-white/5">
                      <span className="flex items-center gap-1.5">
                        <Compass className="w-3 h-3" />
                        <span>Places &amp; Listings ({matchingPlaces.length})</span>
                      </span>
                    </div>
                    {matchingPlaces.map((place) => (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => handleSelectPlace(place)}
                        className="w-full p-2 rounded-xl hover:bg-stone-800/90 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                      >
                        <img
                          src={safeSrc(place.imageUrl, DEFAULT_PLACE_IMAGE)}
                          alt={place.name}
                          className="w-10 h-10 rounded-lg object-cover bg-stone-950 border border-white/10 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-stone-100 group-hover:text-emerald-300 truncate">
                            {place.name}
                          </div>
                          <div className="text-[11px] text-stone-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span className="text-emerald-400 font-mono font-bold">{place.township}</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{place.category.replace('_', ' ')}</span>
                            {place.rating && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-amber-400 font-bold tabular-nums">★ {place.rating}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {matchingEvents.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 px-2 py-1 flex items-center justify-between border-b border-white/5">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>Highland Events ({matchingEvents.length})</span>
                      </span>
                    </div>
                    {matchingEvents.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleSelectEvent(event)}
                        className="w-full p-2 rounded-xl hover:bg-stone-800/90 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-stone-100 group-hover:text-amber-300 truncate">
                            {event.title}
                          </div>
                          <div className="text-[11px] text-stone-400 truncate mt-0.5">
                            {event.date} · <span className="text-amber-300">{event.township}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {matchingTownships.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 px-2 py-1 flex items-center justify-between border-b border-white/5">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3" />
                        <span>Highland Townships ({matchingTownships.length})</span>
                      </span>
                    </div>
                    {matchingTownships.map((town) => (
                      <button
                        key={town}
                        type="button"
                        onClick={() => handleSelectTownship(town)}
                        className="w-full p-2 rounded-xl hover:bg-stone-800/90 text-left flex items-center gap-3 transition-colors cursor-pointer group"
                      >
                        <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-stone-100 group-hover:text-teal-300 truncate">
                            {town} Township Hub
                          </div>
                          <div className="text-[11px] text-stone-400 truncate">
                            Highland Portal &amp; Map Explorer
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
