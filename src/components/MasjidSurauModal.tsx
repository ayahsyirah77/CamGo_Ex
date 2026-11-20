import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  MapPin,
  Compass,
  Phone,
  Navigation,
  Clock,
  CheckCircle2,
  Search,
  Sparkles,
  Mountain,
  Share2,
  RefreshCw,
} from 'lucide-react';
import { Place, Language, Township } from '../types';
import { firebaseService } from '../services/firebase';
import { safeSrc, DEFAULT_PLACE_IMAGE } from '../utils/safeMedia';

interface MasjidSurauModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  places?: Place[];
  onSelectPlaceForMap?: (place: Place) => void;
}

interface LivePrayerApiPayload {
  zone: string;
  region: string;
  date: string;
  hijri?: string | null;
  bearing?: string;
  source: string;
  fetchedAt?: string;
  prayerTimes: {
    imsak?: string;
    subuh: string;
    syuruk: string;
    dhuha?: string;
    zohor: string;
    asar: string;
    maghrib: string;
    isyak: string;
  };
}

// Cameron Highlands officially falls under JAKIM Zone PHG06 (Cameron Highlands, Genting Highlands, Bukit Fraser)
const PHG06_FALLBACK_24H = {
  subuh: '05:50',
  syuruk: '06:56',
  zohor: '13:02',
  asar: '16:23',
  maghrib: '19:03',
  isyak: '20:11',
};

const to12HourDisplay = (time24: string) => {
  if (!time24 || !time24.includes(':')) return time24;
  const [h, m] = time24.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export const MasjidSurauModal: React.FC<MasjidSurauModalProps> = ({
  isOpen,
  onClose,
  language,
  places = [],
  onSelectPlaceForMap = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTownFilter, setSelectedTownFilter] = useState<string>('all');
  const [onlyJumaat, setOnlyJumaat] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [townshipHubs, setTownshipHubs] = useState<Record<string, any>>({});
  const [livePrayerData, setLivePrayerData] = useState<LivePrayerApiPayload | null>(null);
  const [isRefreshingPrayers, setIsRefreshingPrayers] = useState(false);

  const fetchLivePrayerTimes = useCallback(async (forceRefresh = false) => {
    setIsRefreshingPrayers(true);
    try {
      const resp = await fetch(`/api/prayer-times${forceRefresh ? '?refresh=true' : ''}`);
      if (resp.ok) {
        const data: LivePrayerApiPayload = await resp.json();
        if (data?.prayerTimes?.subuh) {
          setLivePrayerData(data);
        }
      }
    } catch {
      // Fallback gracefully to Township Hub or PHG06 baseline
    } finally {
      setIsRefreshingPrayers(false);
    }
  }, []);

  // Fetch township hubs & live JAKIM PHG06 prayer times on open
  useEffect(() => {
    if (!isOpen) return;
    firebaseService.getTownshipHubs && setTownshipHubs(firebaseService.getTownshipHubs());
    fetchLivePrayerTimes(false);
  }, [isOpen, fetchLivePrayerTimes]);

  const { currentPrayerTimes, nextPrayerKey, nextPrayerCountdown } = useMemo(() => {
    const townKey = selectedTownFilter !== 'all' ? selectedTownFilter : 'Tanah Rata';
    const hub = townshipHubs[townKey];
    const sourceTimes = livePrayerData?.prayerTimes || hub?.prayerTimes || PHG06_FALLBACK_24H;

    const rawList = [
      { key: 'subuh', nameEn: 'Subuh', nameBm: 'Subuh', time24: sourceTimes.subuh || PHG06_FALLBACK_24H.subuh, icon: '🌅' },
      { key: 'syuruk', nameEn: 'Syuruk', nameBm: 'Syuruk', time24: sourceTimes.syuruk || PHG06_FALLBACK_24H.syuruk, icon: '☀️' },
      { key: 'zohor', nameEn: 'Zohor', nameBm: 'Zohor', time24: sourceTimes.zohor || PHG06_FALLBACK_24H.zohor, icon: '☀️' },
      { key: 'asar', nameEn: 'Asar', nameBm: 'Asar', time24: sourceTimes.asar || PHG06_FALLBACK_24H.asar, icon: '🌤️' },
      { key: 'maghrib', nameEn: 'Maghrib', nameBm: 'Maghrib', time24: sourceTimes.maghrib || PHG06_FALLBACK_24H.maghrib, icon: '🌇' },
      { key: 'isyak', nameEn: 'Isyak', nameBm: 'Isyak', time24: sourceTimes.isyak || PHG06_FALLBACK_24H.isyak, icon: '🌙' },
    ];

    // Compute upcoming prayer in Malaysia Standard Time (Asia/Kuala_Lumpur)
    const nowKl = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
    const nowMins = nowKl.getHours() * 60 + nowKl.getMinutes();

    let foundNextKey = 'subuh';
    let minDiff = Number.MAX_SAFE_INTEGER;
    rawList.forEach((p) => {
      const [hh, mm] = String(p.time24).split(':').map(Number);
      if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
        let diff = hh * 60 + mm - nowMins;
        if (diff <= 0) diff += 24 * 60;
        if (diff < minDiff) {
          minDiff = diff;
          foundNextKey = p.key;
        }
      }
    });

    const hrsLeft = Math.floor(minDiff / 60);
    const minsLeft = minDiff % 60;
    const countdownLabel =
      minDiff < 24 * 60
        ? hrsLeft > 0
          ? `${hrsLeft}h ${minsLeft}m`
          : `${minsLeft}m`
        : '';

    return {
      currentPrayerTimes: rawList.map((p) => ({
        ...p,
        time: to12HourDisplay(p.time24),
      })),
      nextPrayerKey: foundNextKey,
      nextPrayerCountdown: countdownLabel,
    };
  }, [livePrayerData, townshipHubs, selectedTownFilter]);

  // Filter only masjid_surau places
  const allMasjidPlaces = useMemo(() => {
    return (places || []).filter(
      (p) =>
        p.subCategory === 'masjid_surau' ||
        p.subCategory === 'jumaat_masjid' ||
        p.subCategory === 'other_surau' ||
        p.tags?.some((t) => t.toLowerCase().includes('masjid') || t.toLowerCase().includes('surau'))
    );
  }, [places]);

  const filteredPlaces = useMemo(() => {
    return allMasjidPlaces.filter((place) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = place.name.toLowerCase().includes(q) || (place.nameBm?.toLowerCase().includes(q) ?? false);
        const matchesTown = place.township.toLowerCase().includes(q);
        const matchesDesc = place.description.toLowerCase().includes(q) || (place.descriptionBm?.toLowerCase().includes(q) ?? false);
        const matchesTags = place.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesTown && !matchesDesc && !matchesTags) return false;
      }

      // Township filter
      if (selectedTownFilter !== 'all' && place.township !== selectedTownFilter) {
        return false;
      }

      // Friday prayer filter
      if (onlyJumaat) {
        const hasJumaat =
          place.subCategory === 'jumaat_masjid' ||
          place.tags?.some((t) => t.toLowerCase().includes('jumaat')) ||
          place.description.toLowerCase().includes('jumaat') ||
          place.description.toLowerCase().includes('friday');
        if (!hasJumaat) return false;
      }

      return true;
    });
  }, [allMasjidPlaces, searchQuery, selectedTownFilter, onlyJumaat]);

  const townships = useMemo(() => {
    const set = new Set<string>();
    allMasjidPlaces.forEach((p) => set.add(p.township));
    return Array.from(set);
  }, [allMasjidPlaces]);

  const handleCopyAddress = (place: Place) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(`${place.name}, ${place.location}`);
      setCopiedId(place.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1400] overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="min-h-full flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4" onClick={onClose}>
        <div
          className="w-full max-w-4xl h-[92dvh] sm:h-[88vh] max-h-[94dvh] sm:max-h-[88vh] bg-stone-900 border-t sm:border border-emerald-500/40 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col min-h-0 overflow-hidden relative my-auto shrink-0"
          onClick={(e) => e.stopPropagation()}
        >

        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-stone-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-stone-900/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 border border-emerald-400/40 shrink-0 text-xl">
              🕌
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-heading font-black text-stone-100 leading-tight">
                  {language === 'bm' ? 'Direktori Masjid & Surau' : 'Mosques & Prayer Halls'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  {allMasjidPlaces.length} Lokasi
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden xs:block">
                {language === 'bm'
                  ? 'Kemudahan wuduk, ruang solat selesa & jadual waktu solat Cameron Highlands'
                  : 'Ablution amenities, serene prayer halls & Highland prayer schedule'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div 
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4 space-y-4 touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Cameron Highlands JAKIM PHG06 Live Prayer Times Ribbon */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-stone-900/90 to-teal-950/80 border border-emerald-500/30 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">✨</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-300">
                      {language === 'bm' ? 'Waktu Solat JAKIM PHG06' : 'Prayer Times (JAKIM PHG06)'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-200">
                      {livePrayerData?.source || 'JAKIM PHG06'}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-400 truncate mt-0.5">
                    Cameron Highlands, Genting & Fraser
                    {livePrayerData?.date ? ` • ${livePrayerData.date}` : ''}
                    {livePrayerData?.hijri ? ` (${livePrayerData.hijri}H)` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-300 font-mono bg-stone-900/80 px-2 py-1 rounded-lg border border-white/5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{livePrayerData?.bearing ? `Kiblat: ${livePrayerData.bearing}` : 'Kiblat: 291° 56′ BL'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchLivePrayerTimes(true)}
                  disabled={isRefreshingPrayers}
                  title={language === 'bm' ? 'Muat semula waktu solat JAKIM' : 'Refresh live JAKIM times'}
                  className="p-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPrayers ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Prayer Times Badges */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {currentPrayerTimes.map((prayer) => {
                const isNext = prayer.key === nextPrayerKey;
                return (
                  <div
                    key={prayer.nameEn}
                    className={`rounded-xl p-2 text-center shadow-sm transition-all ${
                      isNext
                        ? 'bg-emerald-900/60 border border-emerald-400/60 ring-1 ring-emerald-400/30'
                        : 'bg-stone-900/90 border border-emerald-500/20'
                    }`}
                  >
                    <div className="text-[10px] text-stone-300 font-medium flex items-center justify-center gap-1">
                      <span>{language === 'bm' ? prayer.nameBm : prayer.nameEn}</span>
                    </div>
                    <div className={`text-xs font-bold font-mono mt-0.5 ${isNext ? 'text-white' : 'text-emerald-300'}`}>
                      {prayer.time}
                    </div>
                    {isNext && nextPrayerCountdown && (
                      <div className="text-[9px] font-mono text-emerald-300 mt-0.5">
                        {language === 'bm' ? `±${nextPrayerCountdown}` : `in ${nextPrayerCountdown}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search Bar & Filters */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'bm'
                    ? 'Cari masjid, surau atau pekan (cth: Tanah Rata, Brinchang, Kea Farm)...'
                    : 'Search mosque, surau, or township...'
                }
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-stone-800/90 border border-stone-700 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
              <button
                onClick={() => setSelectedTownFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTownFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700 border border-stone-700/60'
                }`}
              >
                {language === 'bm' ? 'Semua Kawasan' : 'All Townships'} ({allMasjidPlaces.length})
              </button>

              <button
                onClick={() => setOnlyJumaat((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  onlyJumaat
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700 border border-stone-700/60'
                }`}
              >
                <span>🕌</span>
                <span>{language === 'bm' ? 'Solat Jumaat Sahaja' : 'Friday Prayer Only'}</span>
              </button>

              {townships.map((town) => (
                <button
                  key={town}
                  onClick={() => setSelectedTownFilter(town)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedTownFilter === town
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700 border border-stone-700/60'
                  }`}
                >
                  {town}
                </button>
              ))}
            </div>
          </div>

          {/* Mosque & Surau Cards Grid */}
          {filteredPlaces.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-stone-800/40 border border-stone-800">
              <p className="text-stone-400 text-sm">
                {language === 'bm'
                  ? 'Tiada masjid atau surau dijumpai dengan carian tersebut.'
                  : 'No mosques or suraus match your search.'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTownFilter('all');
                  setOnlyJumaat(false);
                }}
                className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                {language === 'bm' ? 'Set Semula Carian' : 'Reset Filters'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredPlaces.map((place) => {
                const isJumaat =
                  place.tags?.some((t) => t.toLowerCase().includes('jumaat')) ||
                  place.description.toLowerCase().includes('jumaat');
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.coordinates.lat},${place.coordinates.lng}`;

                return (
                  <div
                    key={place.id}
                    className="p-3.5 rounded-2xl bg-stone-800/70 border border-stone-700 hover:border-emerald-500/40 transition-all flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      {/* Top Image + Badges */}
                      <div className="relative h-36 rounded-xl overflow-hidden mb-3 bg-stone-900">
                        <img
                          src={safeSrc(place.imageUrl, DEFAULT_PLACE_IMAGE)}
                          alt={place.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-transparent" />

                        {/* Top Left Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-stone-900/90 text-stone-200 text-[10px] font-bold border border-white/10 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {place.township}
                          </span>
                          {place.elevation && (
                            <span className="px-2 py-0.5 rounded-md bg-stone-900/90 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 flex items-center gap-1">
                              <Mountain className="w-3 h-3" />
                              {place.elevation}
                            </span>
                          )}
                        </div>

                        {/* Top Right Jumaat / Status Badge */}
                        <div className="absolute top-2.5 right-2.5">
                          {isJumaat ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                              <span>🕌</span>
                              <span>Solat Jumaat</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-teal-600/90 text-white text-[10px] font-bold shadow-md">
                              Surau Fardu
                            </span>
                          )}
                        </div>

                        {/* Bottom Image Overlay Title */}
                        <div className="absolute bottom-2 left-2.5 right-2.5">
                          <h3 className="text-sm font-bold text-white leading-tight drop-shadow-md">
                            {language === 'bm' && place.nameBm ? place.nameBm : place.name}
                          </h3>
                        </div>
                      </div>

                      {/* Details & Description */}
                      <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed mb-2.5">
                        {language === 'bm' && place.descriptionBm
                          ? place.descriptionBm
                          : place.description}
                      </p>

                      {/* Amenities / Key Highlights */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {place.tags?.map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[10px] border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            {tag}
                          </span>
                        ))}
                        {place.operatingHours?.isOpen24Hours ? (
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 text-[10px] border border-sky-500/20 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-400" />
                            {language === 'bm' ? 'Dibuka 24 Jam' : 'Open 24 Hours'}
                          </span>
                        ) : place.operatingHours?.from && place.operatingHours?.from !== '-' ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/20 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            {place.operatingHours.from} - {place.operatingHours.to}
                          </span>
                        ) : null}
                      </div>

                      {/* Address string */}
                      <div className="text-[11px] text-stone-400 flex items-start gap-1.5 mb-3 bg-stone-900/60 p-2 rounded-xl border border-stone-700/50">
                        <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                        <span className="flex-1 leading-snug">{place.location}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyAddress(place)}
                          title="Salin alamat"
                          className="text-stone-400 hover:text-emerald-400 p-0.5"
                        >
                          {copiedId === place.id ? (
                            <span className="text-[9px] text-emerald-400 font-bold">Disalin!</span>
                          ) : (
                            <Share2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-700/60">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 text-center"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>{language === 'bm' ? 'Pandu Arah' : 'Directions'}</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectPlaceForMap(place);
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold text-xs transition-all active:scale-95"
                      >
                        <Compass className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'bm' ? 'Lihat Peta' : 'View on Map'}</span>
                      </button>

                      {place.contact && place.contact.trim() !== '+' && place.contact.trim() !== '-' && place.contact.trim().length > 1 && (
                        <a
                          href={`tel:${place.contact.replace(/\s+/g, '')}`}
                          className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-900 text-stone-300 text-[11px] border border-stone-700 hover:text-white"
                        >
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>{language === 'bm' ? 'Hubungi' : 'Contact'}: {place.contact}</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Highland Musafir Tips */}
          <div className="p-3.5 rounded-2xl bg-stone-800/40 border border-stone-700/60 text-stone-400 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-stone-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Panduan Ibadah Musafir di Cameron Highlands</span>
            </div>
            <p className="leading-relaxed">
              Air paip di tanah tinggi bersuhu sejuk (14°C - 18°C). Kebanyakan masjid utama seperti Masjid Daerah Tanah Rata menyediakan ruang wuduk yang selesa. Pelancong yang bermusafir melebihi 2 marhalah (81km) dibolehkan Solat Jamak & Qasar mengikut panduan syarak.
            </p>
          </div>
        </div>

        {/* Modal Bottom Close Bar */}
        <div className="shrink-0 p-3 bg-stone-900 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-stone-400 font-mono">
            {language === 'bm' ? 'JAKIM PHG06 (Cameron Highlands) • Waktu Malaysia' : 'JAKIM PHG06 (Cameron Highlands) • MYT'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 cursor-pointer active:scale-95"
          >
            {language === 'bm' ? 'Tutup' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  </div>
);
};
