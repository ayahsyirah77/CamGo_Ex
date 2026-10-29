/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Place, MainCategory, SubCategory, Township, Language, FarmTicket } from '../types';
import { firebaseService } from '../services/firebase';
import { getTranslation } from '../services/i18n';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  isCurrentlyOpen,
  formatTimeTo12Hour,
  getTodayDaySchedule,
  getTodayDayName,
} from '../utils/highlandLogic';
import {
  Compass,
  Search,
  MapPin,
  Clock,
  Bookmark,
  Sparkles,
  ArrowUpRight,
  Filter,
  Wrench,
  KeyRound,
  Truck,
  Car,
  ShoppingBag,
  HeartPulse,
  Trees,
  X,
  Calendar,
  Ticket,
} from 'lucide-react';
import { FarmTicketMatrixModal } from './FarmTicketMatrixModal';
import { OperationalStatusBadges } from './OperationalStatusBadges';

interface DirectorySectionProps {
  places: Place[];
  language: Language;
  selectedCategory: MainCategory;
  selectedSubCategory?: SubCategory;
  onSelectCategory: (cat: MainCategory, sub?: SubCategory) => void;
  onSelectPlaceForMap: (place: Place) => void;
  bookmarkedIds: string[];
  onToggleBookmark: (placeId: string) => void;
  onOpenFarmMatrix: () => void;
}

export const DirectorySection: React.FC<DirectorySectionProps> = ({
  places,
  language,
  selectedCategory,
  selectedSubCategory,
  onSelectCategory,
  onSelectPlaceForMap,
  bookmarkedIds,
  onToggleBookmark,
  onOpenFarmMatrix,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTown, setSelectedTown] = useState<Township | 'all'>('all');
  const [scheduleModalPlace, setScheduleModalPlace] = useState<Place | null>(null);
  const [farmTickets, setFarmTickets] = useState<FarmTicket[]>(() => firebaseService.getFarmTickets());

  React.useEffect(() => {
    const handleTicketUpdate = (e: any) => {
      if (e.detail) setFarmTickets(e.detail);
      else setFarmTickets(firebaseService.getFarmTickets());
    };
    window.addEventListener('farm-tickets-updated', handleTicketUpdate);
    return () => window.removeEventListener('farm-tickets-updated', handleTicketUpdate);
  }, []);

  console.log('[Debug] DirectorySection props.places:', places);

  const mainCategories: { key: MainCategory; labelKey: any; icon: string }[] = [
    { key: 'food', labelKey: 'dir_food', icon: '🍲' },
    { key: 'travel_tourism', labelKey: 'dir_travel_highland_tourism', icon: '🌄' },
    { key: 'accommodation', labelKey: 'dir_accommodation', icon: '🏨' },
    { key: 'transport', labelKey: 'dir_transport', icon: '🚗' },
    { key: 'local_services', labelKey: 'dir_local_services', icon: '🏥' },
    { key: 'shopping', labelKey: 'dir_shopping', icon: '🛍️' },
    { key: 'services_utilities', labelKey: 'dir_services_utilities', icon: '🛠️' },
    { key: 'masjid_surau', labelKey: 'dir_masjid_surau', icon: '🕌' },
  ];

  // Subcategories with direct display labels and icons
  const subCategoryFilters: Record<string, { key: SubCategory; label: string; icon?: React.ReactNode }[]> = {
    food: [
      { key: 'dining', label: 'Restaurants & Dining' },
      { key: 'steamboats', label: 'Steamboat' },
      { key: 'cafes', label: 'Cafes & Bakeries' },
      { key: 'night_markets_street', label: 'Night Markets & Street Food' },
      { key: 'bars_nightlife', label: 'Bars & Nightlife' },
    ],
    travel_tourism: [
      { key: 'attractions_sightseeing', label: 'Attractions & Sightseeing' },
      { key: 'agrotourism_farms', label: 'Agrotourism & Farms' },
      { key: 'outdoor_adventure', label: 'Outdoor & Adventure' },
      { key: 'tour_agencies_guides', label: 'Tour Agencies & Guides' },
    ],
    accommodation: [
      { key: 'hotels_resorts', label: 'Hotels & Resorts' },
      { key: 'guesthouses', label: 'Guesthouses' },
      { key: 'chalets', label: 'Chalets' },
      { key: 'homestay', label: 'Homestays' },
      { key: 'camping_glamping', label: 'Camping & Glamping' },
    ],
    transport: [
      { key: 'car_bike_rentals', label: 'Car & Bike Rentals', icon: <Car className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'taxi_ehailing', label: 'Taxi & E-Hailing', icon: <Car className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'auto_repair_roadside', label: 'Auto Repair & Roadside', icon: <Wrench className="w-3.5 h-3.5 inline mr-1" /> },
    ],
    local_services: [
      { key: 'health_wellness', label: 'Health & Wellness', icon: <HeartPulse className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'banking_financial', label: 'Banking & Financial', icon: <KeyRound className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'logistics_freight', label: 'Logistics & Freight', icon: <Truck className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'property_real_estate', label: 'Property & Real Estate', icon: <Sparkles className="w-3.5 h-3.5 inline mr-1" /> },
    ],
    shopping: [
      { key: 'fresh_markets_produce', label: 'Fresh Markets & Produce', icon: <ShoppingBag className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'souvenirs_handicrafts', label: 'Souvenirs & Handicrafts', icon: <ShoppingBag className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'convenience_groceries', label: 'Convenience & Groceries', icon: <ShoppingBag className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'retail_apparel', label: 'Retail & Apparel', icon: <ShoppingBag className="w-3.5 h-3.5 inline mr-1" /> },
    ],
    services_utilities: [
      { key: 'plumbing_electrical', label: 'Plumbing & Electrical', icon: <Wrench className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'locksmith_access', label: 'Locksmith & Access Services', icon: <KeyRound className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'carpentry_construction', label: 'Carpentry & Construction', icon: <Wrench className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'pest_control', label: 'Pest Control & Fumigation', icon: <Wrench className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'laundry_dry_cleaning', label: 'Laundry & Dry Cleaning', icon: <Sparkles className="w-3.5 h-3.5 inline mr-1" /> },
      { key: 'housekeeping_maid', label: 'Housekeeping & Maid Services', icon: <Sparkles className="w-3.5 h-3.5 inline mr-1" /> },
    ],
    masjid_surau: [
       { key: 'masjid_surau', label: 'Masjid & Surau' }
    ],
  };

  const currentSubList = subCategoryFilters[selectedCategory] || [];

  const isCategoryMatch = (placeCat: string, selCat: string) => {
    if (placeCat === selCat) return true;
    if ((selCat === 'travel_tourism' || selCat === 'attraction') && (placeCat === 'attraction' || placeCat === 'travel_tourism')) return true;
    if ((selCat === 'shopping' || selCat === 'business') && (placeCat === 'business' || placeCat === 'shopping')) return true;
    return false;
  };

  // 2. Real-time Firestore Listener
  const [livePlaces, setLivePlaces] = useState<Place[]>(places);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'places'), (snap) => {
      const fetched = snap.docs.map(d => d.data() as Place);
      setLivePlaces(fetched);
      setIsLoading(false);
    }, (err) => {
      console.error('Firestore listener error:', err);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  // Use livePlaces for filtering
  const filteredPlaces = livePlaces.filter((p) => {
    if (!isCategoryMatch(p.category, selectedCategory)) return false;
    if (selectedSubCategory && p.subCategory !== selectedSubCategory) return false;
    if (selectedTown !== 'all' && p.township !== selectedTown) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q) || (p.nameBm && p.nameBm.toLowerCase().includes(q));
      const matchDesc = p.description.toLowerCase().includes(q) || (p.descriptionBm && p.descriptionBm.toLowerCase().includes(q));
      const matchTag = p.tags.some((t) => t.toLowerCase().includes(q));
      return matchName || matchDesc || matchTag;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center rounded-3xl bg-stone-900/40 border border-white/5">
        <p className="text-stone-400 text-sm">Loading verified highland places...</p>
      </div>
    );
  }

  console.log('[Debug] DirectorySection filteredPlaces:', filteredPlaces);

  return (
    <div className="space-y-6" id="directories-section">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {language === 'bm' ? 'DIREKTORI TANAH TINGGI' : 'VERIFIED HIGHLAND DIRECTORIES'}
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-100 tracking-tight mt-1">
            {language === 'bm' ? 'Panduan Tempat & Aktiviti Cameron' : 'Explore Cameron Highlands'}
          </h3>
          <p className="text-xs sm:text-sm text-stone-400">
            {language === 'bm'
              ? 'Pilih kategori, periksa status operasi dan semak analisis trafik masa nyata.'
              : 'Select category, check live operating hours, and inspect AI traffic routes.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={getTranslation(language, 'search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-900/90 border border-white/10 text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Farm Pass & Ticket Comparison Matrix Banner Button */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-teal-950/60 to-stone-900 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Ticket className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                PRICING &amp; INCLUSIONS
              </span>
              <span className="text-[10px] text-stone-300">Flora Park • Sheep Sanctuary • Lavender • BOH Tea</span>
            </div>
            <h4 className="text-base sm:text-lg font-heading font-extrabold text-stone-100 tracking-tight mt-0.5">
              {language === 'bm' ? 'Matriks Perbandingan Tiket & Pass Ladang' : 'Farm Pass & Ticket Comparison Matrix'}
            </h4>
            <p className="text-xs text-stone-300">
              {language === 'bm'
                ? 'Semak harga terus, waktu operasi, kemasukan percuma / berbayar, dan sambungkan terus ke kos bajet itinerari.'
                : 'Direct pricing, opening hours, free vs paid status, and direct integration with itinerary cost calculator.'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFarmMatrix}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span>Open Ticket Comparison Matrix</span>
        </button>
      </div>

      {/* Main Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {mainCategories.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => onSelectCategory(cat.key)}
              className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                isActive
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-950/50 text-white'
                  : 'bg-stone-900/70 border-white/5 hover:border-white/15 text-stone-400 hover:text-white'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <span className="text-xs sm:text-sm font-bold block">
                  {getTranslation(language, cat.labelKey)}
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  {places.filter((p) => p.category === cat.key).length} listings
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Subcategory & Township Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-stone-900/80 border border-white/5">
        {/* Subcategories */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onSelectCategory(selectedCategory, undefined)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              !selectedSubCategory
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            {language === 'bm' ? 'Semua Sub-Kategori' : 'All Types'}
          </button>
          {currentSubList.map((sub) => (
            <button
              key={sub.key}
              onClick={() => onSelectCategory(selectedCategory, sub.key)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center ${
                selectedSubCategory === sub.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {sub.icon}
              {sub.label}
            </button>
          ))}
        </div>

        {/* Town Select Filter */}
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <Filter className="w-3.5 h-3.5" />
          <select
            value={selectedTown}
            onChange={(e) => setSelectedTown(e.target.value as Township | 'all')}
            className="bg-stone-800 text-stone-200 px-2.5 py-1 rounded-xl border border-white/10 outline-none cursor-pointer"
          >
            <option value="all">{language === 'bm' ? 'Semua Pekan' : 'All Townships'}</option>
            <option value="Tanah Rata">Tanah Rata</option>
            <option value="Brinchang">Brinchang</option>
            <option value="Kea Farm">Kea Farm</option>
            <option value="Ringlet">Ringlet</option>
            <option value="Kampung Raja">Kampung Raja</option>
            <option value="Tringkap">Tringkap</option>
          </select>
        </div>
      </div>

      {/* Places Cards Grid */}
      {filteredPlaces.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-stone-900/40 border border-white/5">
          <p className="text-stone-400 text-sm">
            {language === 'bm'
              ? 'Tiada tempat dijumpai bagi carian ini.'
              : 'No places match the selected filters or search query.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlaces.map((place) => {
            const isBookmarked = bookmarkedIds.includes(place.id);
            const openStatus = isCurrentlyOpen(place.operatingHours);

            return (
              <div
                key={place.id}
                className="glass-card-hover group rounded-3xl overflow-hidden bg-stone-900/80 border border-white/5 flex flex-col justify-between"
              >
                {/* Photo & Badge */}
                <div className="h-48 relative overflow-hidden bg-stone-950">
                  <img
                    src={place.imageUrl}
                    alt={place.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />

                  {/* Elevation & Open Status */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-emerald-400 border border-white/10">
                      {place.elevation} ASL
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        openStatus
                          ? 'bg-emerald-500/80 text-white'
                          : 'bg-stone-800/90 text-stone-400'
                      }`}
                    >
                      {openStatus ? getTranslation(language, 'open_now') : getTranslation(language, 'closed')}
                    </span>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={() => onToggleBookmark(place.id)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white cursor-pointer transition-colors"
                    title={isBookmarked ? 'Remove Bookmark' : 'Save to Bookmarks'}
                  >
                    <Bookmark
                      className={`w-4 h-4 ${
                        isBookmarked ? 'fill-emerald-400 text-emerald-400' : 'text-stone-300'
                      }`}
                    />
                  </button>

                  {/* Rating Tag */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-xs font-bold text-amber-400">
                      ★ {place.rating}
                    </span>
                    <span className="text-[11px] text-stone-300">
                      ({place.reviewsCount} {language === 'bm' ? 'ulasan' : 'reviews'})
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{place.township}</span>
                      {place.priceRange && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">{place.priceRange}</span>
                        </>
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-stone-100 group-hover:text-emerald-300 transition-colors flex items-center justify-between gap-2">
                      <span>{language === 'bm' ? place.nameBm || place.name : place.name}</span>
                      {(() => {
                        const ticket = farmTickets.find(t => 
                          t.name.toLowerCase().includes(place.name.toLowerCase()) || 
                          place.name.toLowerCase().includes(t.name.toLowerCase())
                        );
                        if (!ticket) return null;
                        return (
                          <span className="flex flex-col items-end shrink-0">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${ticket.isFree ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                              {ticket.isFree ? 'FREE' : `RM ${ticket.adultPriceRm}`}
                            </span>
                          </span>
                        );
                      })()}
                    </h4>

                    <p className="text-xs text-stone-300 mt-2 line-clamp-2 leading-relaxed">
                      {language === 'bm' ? place.descriptionBm : place.description}
                    </p>

                    {/* Live Vendor Operational Status Badges */}
                    <div className="mt-2.5">
                      <OperationalStatusBadges
                        realTimeStatus={place.realTimeStatus}
                        diyHarvestStatus={place.diyHarvestStatus}
                        parkingStatus={place.parkingStatus}
                        roomAvailabilityStatus={place.roomAvailabilityStatus}
                        language={language}
                        compact
                      />
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {place.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-stone-800 text-[10px] text-stone-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer Action: View on Map & Traffic */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-1 text-[11px] text-stone-400 font-mono">
                      {(() => {
                        const todaySched = getTodayDaySchedule(place.operatingHours);
                        const hasWeekly = !!(place.operatingHours.weeklySchedule && place.operatingHours.weeklySchedule.length > 0);
                        const todayName = getTodayDayName();

                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Clock className="w-3 h-3 text-stone-500 shrink-0" />
                            {place.operatingHours.isOpen24Hours ? (
                              <span>{language === 'bm' ? '24 Jam' : '24 Hours'}</span>
                            ) : todaySched ? (
                              todaySched.isOpen ? (
                                <span className="text-stone-300">
                                  {todayName.slice(0, 3)}: {formatTimeTo12Hour(todaySched.from)} – {formatTimeTo12Hour(todaySched.to)}
                                </span>
                              ) : (
                                <span className="text-rose-400 font-semibold">
                                  {todayName.slice(0, 3)}: {language === 'bm' ? 'Tutup' : 'Closed'}
                                </span>
                              )
                            ) : (
                              <span>
                                {place.operatingHours.from} - {place.operatingHours.to}
                              </span>
                            )}

                            {hasWeekly && (
                              <button
                                type="button"
                                onClick={() => setScheduleModalPlace(place)}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline font-sans cursor-pointer bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
                                title="View 7-day schedule"
                              >
                                {language === 'bm' ? 'Jadual 7 Hari' : '7-Day Hours'}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                      {place.checkIn || place.checkOut ? (
                        <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5">
                          <span>{language === 'bm' ? 'Masuk' : 'In'}: {place.checkIn || '14:00'}</span>
                          <span>•</span>
                          <span>{language === 'bm' ? 'Keluar' : 'Out'}: {place.checkOut || '12:00'}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-stone-600 font-semibold flex items-center gap-1.5 opacity-40 select-none">
                          <span>{language === 'bm' ? 'Masuk' : 'In'}: --:--</span>
                          <span>•</span>
                          <span>{language === 'bm' ? 'Keluar' : 'Out'}: --:--</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectPlaceForMap(place)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950 flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{language === 'bm' ? 'Peta & Trafik' : 'Map & AI Route'}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7-Day Weekly Operating Schedule Modal */}
      {scheduleModalPlace && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-stone-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setScheduleModalPlace(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full bg-stone-800/80 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-base text-stone-100">
                {language === 'bm' ? 'Waktu Operasi Mingguan' : 'Weekly Operating Schedule'}
              </h3>
            </div>
            <p className="text-xs text-stone-400 mb-4">{scheduleModalPlace.name}</p>

            <div className="space-y-2">
              {scheduleModalPlace.operatingHours.weeklySchedule?.map((day) => {
                const isToday = day.day === getTodayDayName();
                return (
                  <div
                    key={day.day}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono border transition-colors ${
                      isToday
                        ? 'bg-emerald-500/10 border-emerald-500/30 font-semibold'
                        : 'bg-stone-800/60 border-white/5 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={isToday ? 'text-emerald-400 font-bold' : 'text-stone-200'}>
                        {day.day}
                      </span>
                      {isToday && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-sans uppercase font-bold">
                          Today
                        </span>
                      )}
                    </div>
                    {day.isOpen ? (
                      <span className="text-stone-300">
                        {formatTimeTo12Hour(day.from)} – {formatTimeTo12Hour(day.to)}
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                        CLOSED
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setScheduleModalPlace(null)}
                className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7-Day Weekly Operating Schedule Modal */}
    </div>
  );
};