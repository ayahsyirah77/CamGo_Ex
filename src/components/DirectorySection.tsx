/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Place, MainCategory, SubCategory, Township, Language, FarmTicket } from '../types';
import { firebaseService } from '../services/firebase';
import { getTranslation } from '../services/i18n';
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
  const [selectedPlacePopup, setSelectedPlacePopup] = useState<Place | null>(null);
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

  React.useEffect(() => {
    if (selectedPlacePopup) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [selectedPlacePopup]);

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

  // Deduplication check (filtering by ID) in rendering loop
  const uniquePlacesMap = new Map<string, Place>();
  for (const p of places) {
    if (p && p.id && !uniquePlacesMap.has(p.id)) {
      uniquePlacesMap.set(p.id, p);
    }
  }
  const dedupedPlaces = Array.from(uniquePlacesMap.values());

  const filteredPlaces = dedupedPlaces.filter((p) => {
    // Completely remove motorbike and scooter rentals from general directory listings
    if (p.category === 'transport' && p.subCategory === 'car_bike_rentals') return false;

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

      {/* Subcategory & Township Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-stone-900/80 border border-white/5">
        {/* Subcategories (Desktop Pills) */}
        <div className="hidden sm:flex flex-wrap items-center gap-1.5">
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

        {/* Mobile Subcategory Dropdown & Town Select Filter Row */}
        <div className="flex sm:hidden items-center justify-between gap-2 w-full text-xs text-stone-400">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={selectedSubCategory || 'all'}
              onChange={(e) => {
                const val = e.target.value;
                onSelectCategory(selectedCategory, val === 'all' ? undefined : (val as SubCategory));
              }}
              className="bg-stone-800 text-stone-200 px-2.5 py-1.5 rounded-xl border border-white/10 outline-none cursor-pointer w-full truncate"
            >
              <option value="all">{language === 'bm' ? 'Semua Sub-Kategori' : 'All Types'}</option>
              {currentSubList.map((sub) => (
                <option key={sub.key} value={sub.key}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={selectedTown}
              onChange={(e) => setSelectedTown(e.target.value as Township | 'all')}
              className="bg-stone-800 text-stone-200 px-2.5 py-1.5 rounded-xl border border-white/10 outline-none cursor-pointer"
            >
              <option value="all">{language === 'bm' ? 'Semua Pekan' : 'All Towns'}</option>
              <option value="Tanah Rata">Tanah Rata</option>
              <option value="Brinchang">Brinchang</option>
              <option value="Kea Farm">Kea Farm</option>
              <option value="Ringlet">Ringlet</option>
              <option value="Kampung Raja">Kampung Raja</option>
              <option value="Tringkap">Tringkap</option>
              <option value="Kuala Terla">Kuala Terla</option>
              <option value="Bertam Valley">Bertam Valley</option>
              <option value="Blue Valley">Blue Valley</option>
            </select>
          </div>
        </div>

        {/* Town Select Filter (Desktop) */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-stone-400">
          <Filter className="w-3.5 h-3.5" />
          <span className="font-semibold text-stone-200">Town:</span>
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
            <option value="Kuala Terla">Kuala Terla</option>
            <option value="Bertam Valley">Bertam Valley</option>
            <option value="Blue Valley">Blue Valley</option>
          </select>
        </div>
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
        <div className="grid no-mobile-clamp grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {filteredPlaces.map((place) => {
            const isBookmarked = bookmarkedIds.includes(place.id);
            const openStatus = isCurrentlyOpen(place.operatingHours);

            return (
              <div
                key={place.id}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'instant' });
                  setSelectedPlacePopup(place);
                }}
                className="glass-card-hover no-mobile-clamp group p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-stone-900/90 border border-white/10 hover:border-emerald-500/50 hover:bg-stone-850 flex flex-col justify-between gap-1.5 sm:gap-2 cursor-pointer transition-all shadow-md min-h-[78px] sm:min-h-[88px] text-left relative overflow-hidden"
              >
                {/* Top Row: Live Status Dot + Township badge & Bookmark */}
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        openStatus ? 'bg-emerald-500 animate-pulse' : 'bg-stone-600'
                      }`}
                      title={openStatus ? 'Open Now' : 'Closed'}
                    />
                    <span className="text-[9px] sm:text-[10px] text-emerald-400 font-mono font-medium truncate max-w-[80px] min-[380px]:max-w-none">
                      {place.township}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(place.id);
                    }}
                    className="p-0.5 -mr-1 rounded-md text-stone-400 hover:text-white transition-colors shrink-0"
                    title={isBookmarked ? 'Remove Bookmark' : 'Save to Bookmarks'}
                  >
                    <Bookmark
                      className={`w-3 h-3 ${
                        isBookmarked ? 'fill-emerald-400 text-emerald-400' : 'text-stone-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Business Name - compact, crisp, readable 2 lines */}
                <h4 className="no-mobile-clamp !text-[11px] sm:!text-xs font-semibold text-stone-100 group-hover:text-emerald-300 transition-colors line-clamp-2 !leading-tight break-words my-auto">
                  {language === 'bm' ? place.nameBm || place.name : place.name}
                </h4>

                {/* Bottom Row: Star Rating & Details trigger */}
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-stone-400 font-mono pt-1 border-t border-white/5">
                  <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                    ★ {place.rating}
                  </span>
                  <span className="text-[9px] text-stone-400 group-hover:text-emerald-400 transition-colors flex items-center gap-0.5">
                    <span>{language === 'bm' ? 'Lihat' : 'Details'}</span>
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Place Pop-up Modal (Image 2 style) */}
      {selectedPlacePopup &&
        createPortal(
          <div 
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
            onClick={() => setSelectedPlacePopup(null)}
          >
            <div 
              className="w-full max-w-xl bg-stone-900 border border-emerald-500/40 rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Cover Image & Floating Badges */}
              <div className="h-56 sm:h-64 relative overflow-hidden bg-stone-950 shrink-0">
                <img
                  src={selectedPlacePopup.imageUrl}
                  alt={selectedPlacePopup.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/30 to-transparent" />

                {/* Elevation & Open Status */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-xs font-mono font-bold text-emerald-400 border border-white/10 shadow-lg">
                    {selectedPlacePopup.elevation} ASL
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-lg ${
                      isCurrentlyOpen(selectedPlacePopup.operatingHours)
                        ? 'bg-emerald-500/90 text-white'
                        : 'bg-stone-800/90 text-stone-300'
                    }`}
                  >
                    {isCurrentlyOpen(selectedPlacePopup.operatingHours) ? getTranslation(language, 'open_now') : getTranslation(language, 'closed')}
                  </span>
                </div>

                {/* Bookmark Button */}
                <button
                  onClick={() => onToggleBookmark(selectedPlacePopup.id)}
                  className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/15 text-white cursor-pointer transition-colors shadow-lg"
                >
                  <Bookmark
                    className={`w-5 h-5 ${
                      bookmarkedIds.includes(selectedPlacePopup.id) ? 'fill-emerald-400 text-emerald-400' : 'text-stone-200'
                    }`}
                  />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedPlacePopup(null)}
                  className="absolute top-4 right-16 p-2.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/15 text-white cursor-pointer transition-colors shadow-lg"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Rating Tag */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md text-sm font-bold text-amber-400 border border-white/10 shadow-lg">
                    ★ {selectedPlacePopup.rating}
                  </span>
                  <span className="text-xs text-stone-200 font-medium">
                    ({selectedPlacePopup.reviewsCount} {language === 'bm' ? 'ulasan' : 'reviews'})
                  </span>
                </div>
              </div>

              {/* Modal Body Content */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1 font-medium">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>{selectedPlacePopup.township}</span>
                    {selectedPlacePopup.priceRange && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">{selectedPlacePopup.priceRange}</span>
                      </>
                    )}
                  </div>

                  <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-emerald-400 tracking-tight">
                    {language === 'bm' ? selectedPlacePopup.nameBm || selectedPlacePopup.name : selectedPlacePopup.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-stone-300 mt-2.5 leading-relaxed">
                    {language === 'bm' ? selectedPlacePopup.descriptionBm : selectedPlacePopup.description}
                  </p>

                  {/* Operational Status Badges */}
                  <div className="mt-3">
                    <OperationalStatusBadges
                      realTimeStatus={selectedPlacePopup.realTimeStatus}
                      diyHarvestStatus={selectedPlacePopup.diyHarvestStatus}
                      parkingStatus={selectedPlacePopup.parkingStatus}
                      roomAvailabilityStatus={selectedPlacePopup.roomAvailabilityStatus}
                      language={language}
                    />
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedPlacePopup.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-stone-800 text-xs text-stone-300 border border-white/5 font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-col gap-1 text-xs text-stone-300 font-mono">
                    {(() => {
                      const todaySched = getTodayDaySchedule(selectedPlacePopup.operatingHours);
                      const hasWeekly = !!(selectedPlacePopup.operatingHours.weeklySchedule && selectedPlacePopup.operatingHours.weeklySchedule.length > 0);
                      const todayName = getTodayDayName();

                      return (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                          {selectedPlacePopup.operatingHours.isOpen24Hours ? (
                            <span>{language === 'bm' ? '24 Jam' : '24 Hours'}</span>
                          ) : todaySched ? (
                            todaySched.isOpen ? (
                              <span className="text-stone-200 font-medium">
                                {todayName}: {formatTimeTo12Hour(todaySched.from)} – {formatTimeTo12Hour(todaySched.to)}
                              </span>
                            ) : (
                              <span className="text-rose-400 font-semibold">
                                {todayName}: {language === 'bm' ? 'Tutup' : 'Closed'}
                              </span>
                            )
                          ) : (
                            <span>
                              {selectedPlacePopup.operatingHours.from} - {selectedPlacePopup.operatingHours.to}
                            </span>
                          )}

                          {hasWeekly && (
                            <button
                              type="button"
                              onClick={() => setScheduleModalPlace(selectedPlacePopup)}
                              className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-sans cursor-pointer bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30 font-bold ml-2"
                            >
                              {language === 'bm' ? 'Jadual 7 Hari' : '7-Day Hours'}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPlacePopup(null);
                      onSelectPlaceForMap(selectedPlacePopup);
                    }}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 cursor-pointer transition-all active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>Map &amp; AI Route</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 7-Day Weekly Operating Schedule Modal */}
      {scheduleModalPlace &&
        createPortal(
          <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
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
          </div>,
          document.body
        )}

      {/* 7-Day Weekly Operating Schedule Modal */}
    </div>
  );
};