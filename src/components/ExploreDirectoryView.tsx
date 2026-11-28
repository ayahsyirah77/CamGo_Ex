import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  MapPin,
  Star,
  ChevronRight,
  Building2,
  Phone,
  Clock,
  Heart,
  ExternalLink,
  ShieldCheck,
  Navigation,
  X,
  Utensils,
  Mountain,
  BedDouble,
  ShoppingBag,
  Stethoscope,
  Car,
  Landmark,
  Droplets,
  Fuel,
  Hospital,
  Siren,
  Filter,
} from 'lucide-react';
import { Place, Township, MainCategory, SubCategory, Language } from '../types';
import { TOWNSHIP_PORTALS, OFFICIAL_PORTALS } from '../data/initialData';
import { safeSrc } from '../utils/safeMedia';

import imgMicroclimate from '../assets/images/highland_microclimate_bg_1792858360291.jpg';
import imgDirectory from '../assets/images/highland_directory_bg_1792858363583.jpg';
import imgPortals from '../assets/images/highland_portals_hub_bg_1792858363332.jpg';
import imgCulture from '../assets/images/highland_culture_events_bg_1792858361533.jpg';
import imgTraffic from '../assets/images/highland_traffic_hub_bg_1792858360383.jpg';
import imgSafety from '../assets/images/highland_safety_hazard_bg_1792858360312.jpg';
import imgStrawberry from '../assets/images/vendor_cover_strawberry_1792917725766.jpg';
import imgSteamboat from '../assets/images/vendor_cover_steamboat_1792917728048.jpg';

export const ORDERED_9_TOWNSHIPS: Township[] = [
  'Ringlet',
  'Bertam Valley',
  'Habu',
  'Tanah Rata',
  'Brinchang',
  'Kea Farm',
  'Tringkap',
  'Kuala Terla',
  'Kampung Raja',
];

const TOWNSHIP_LOCAL_IMAGES: Record<string, string> = {
  Ringlet: imgTraffic,
  'Bertam Valley': imgMicroclimate,
  Habu: '/assets/aistudio/explore_c7c5621e.jpg',
  'Tanah Rata': imgPortals,
  Brinchang: '/assets/aistudio/pexels-limonovdigital-8796757_bb89a42f.jpg',
  'Kea Farm': imgStrawberry,
  Tringkap: imgDirectory,
  'Kuala Terla': imgCulture,
  'Kampung Raja': imgSafety,
};

export type ExploreCategoryKey =
  | 'food_beverages'
  | 'attractions_farms'
  | 'stays_homestays'
  | 'retail_markets'
  | 'essential_services'
  | 'transport_rentals';

interface SubFilterOption {
  id: string;
  label: string;
  labelBm: string;
  matcher: (p: Place) => boolean;
}

interface ExploreCategoryDef {
  id: ExploreCategoryKey;
  title: string;
  titleBm: string;
  mainCategories: MainCategory[];
  icon: React.ReactNode;
  accentBg: string;
  accentText: string;
  subFilters: SubFilterOption[];
}

export const EXPLORE_CATEGORIES: ExploreCategoryDef[] = [
  {
    id: 'food_beverages',
    title: 'Food & Beverages',
    titleBm: 'Makanan & Minuman',
    mainCategories: ['food'],
    icon: <Utensils className="w-4 h-4" />,
    accentBg: 'bg-amber-500/15',
    accentText: 'text-amber-400',
    subFilters: [
      { id: 'all', label: 'All', labelBm: 'Semua', matcher: () => true },
      {
        id: 'cafes',
        label: 'Cafes & Tea Houses',
        labelBm: 'Kafe & Rumah Teh',
        matcher: (p) =>
          p.subCategory === 'cafes' ||
          p.subCategory === 'fb_restaurants_cafes' ||
          /cafe|tea|teh|kopi|coffee/i.test(`${p.name} ${p.tags?.join(' ') || ''}`),
      },
      {
        id: 'steamboats',
        label: 'Steamboat & Grill',
        labelBm: 'Stimbot & Gril',
        matcher: (p) =>
          p.subCategory === 'steamboats' ||
          /steamboat|stimbot|grill|bbq|charcoal/i.test(`${p.name} ${p.tags?.join(' ') || ''}`),
      },
      {
        id: 'local_mamak',
        label: 'Local & Mamak',
        labelBm: 'Masakan Tempatan & Mamak',
        matcher: (p) =>
          p.subCategory === 'dining' ||
          p.subCategory === 'night_markets_street' ||
          p.subCategory === 'fb_fast_food' ||
          p.subCategory === 'fb_food_trucks' ||
          /mamak|nasi|goreng|halal|local|curry|warung|street/i.test(
            `${p.name} ${p.description} ${p.tags?.join(' ') || ''}`
          ),
      },
      {
        id: 'bakeries',
        label: 'Bakeries & Desserts',
        labelBm: 'Bakeri & Pencuci Mulut',
        matcher: (p) =>
          p.subCategory === 'fb_bakeries' ||
          /bakery|bakeri|scone|cake|pastry|dessert|ice cream|tart|waffle/i.test(
            `${p.name} ${p.description} ${p.tags?.join(' ') || ''}`
          ),
      },
    ],
  },
  {
    id: 'attractions_farms',
    title: 'Attractions & Farms',
    titleBm: 'Tarikan & Ladang',
    mainCategories: ['travel_tourism', 'attraction'],
    icon: <Mountain className="w-4 h-4" />,
    accentBg: 'bg-emerald-500/15',
    accentText: 'text-emerald-400',
    subFilters: [
      { id: 'all', label: 'All', labelBm: 'Semua', matcher: () => true },
      {
        id: 'agrotourism_farms',
        label: 'Tea & Berry Farms',
        labelBm: 'Ladang Teh & Strawberi',
        matcher: (p) =>
          p.subCategory === 'agrotourism_farms' ||
          p.subCategory === 'tourism_agritourism_farm' ||
          /farm|ladang|tea|teh|strawberry|strawberi|bee|lavender|cactus/i.test(
            `${p.name} ${p.tags?.join(' ') || ''}`
          ),
      },
      {
        id: 'attractions_sightseeing',
        label: 'Sightseeing & Parks',
        labelBm: 'Taman & Tinjauan',
        matcher: (p) =>
          p.subCategory === 'attractions_sightseeing' ||
          p.subCategory === 'tourism_ticketing_attractions' ||
          /park|flora|garden|view|temple|muzium|museum/i.test(`${p.name} ${p.tags?.join(' ') || ''}`),
      },
      {
        id: 'outdoor_adventure',
        label: 'Trails & Nature',
        labelBm: 'Denai & Alam Semula Jadi',
        matcher: (p) =>
          p.subCategory === 'outdoor_adventure' ||
          p.subCategory === 'tour_agencies_guides' ||
          /mossy|forest|trail|hiking|waterfall|tour|4x4/i.test(`${p.name} ${p.tags?.join(' ') || ''}`),
      },
    ],
  },
  {
    id: 'stays_homestays',
    title: 'Stays & Homestays',
    titleBm: 'Penginapan & Inap Desa',
    mainCategories: ['accommodation'],
    icon: <BedDouble className="w-4 h-4" />,
    accentBg: 'bg-sky-500/15',
    accentText: 'text-sky-400',
    subFilters: [
      { id: 'all', label: 'All', labelBm: 'Semua', matcher: () => true },
      {
        id: 'hotels_resorts',
        label: 'Hotels & Resorts',
        labelBm: 'Hotel & Resort',
        matcher: (p) => p.subCategory === 'hotels_resorts' || /hotel|resort/i.test(p.name),
      },
      {
        id: 'homestay',
        label: 'Homestays & Apartments',
        labelBm: 'Inap Desa & Pangsapuri',
        matcher: (p) =>
          p.subCategory === 'homestay' ||
          p.subCategory === 'homestay_apartment' ||
          p.subCategory === 'homestay_landed' ||
          p.subCategory === 'realestate_vacation_homestay' ||
          /homestay|apartment|villa|suite/i.test(p.name),
      },
      {
        id: 'chalets_glamping',
        label: 'Chalets & Glamping',
        labelBm: 'Chalet & Glamping',
        matcher: (p) =>
          p.subCategory === 'chalets' ||
          p.subCategory === 'camping_glamping' ||
          p.subCategory === 'guesthouses' ||
          /chalet|glamping|camp|cabin|lodge/i.test(p.name),
      },
    ],
  },
  {
    id: 'retail_markets',
    title: 'Retail & Markets',
    titleBm: 'Pasar & Runcit',
    mainCategories: ['shopping', 'business'],
    icon: <ShoppingBag className="w-4 h-4" />,
    accentBg: 'bg-rose-500/15',
    accentText: 'text-rose-400',
    subFilters: [
      { id: 'all', label: 'All', labelBm: 'Semua', matcher: () => true },
      {
        id: 'fresh_markets_produce',
        label: 'Fresh Produce & Markets',
        labelBm: 'Pasar & Hasil Segar',
        matcher: (p) =>
          p.subCategory === 'fresh_markets_produce' ||
          p.subCategory === 'retail_groceries_produce' ||
          /market|pasar|produce|veggie|farm/i.test(p.name),
      },
      {
        id: 'souvenirs_handicrafts',
        label: 'Souvenirs & Retail',
        labelBm: 'Cenderamata & Kedai',
        matcher: (p) =>
          p.subCategory === 'souvenirs_handicrafts' ||
          p.subCategory === 'convenience_groceries' ||
          p.subCategory === 'retail_apparel',
      },
    ],
  },
  {
    id: 'essential_services',
    title: 'Essential Services',
    titleBm: 'Perkhidmatan Penting',
    mainCategories: ['local_services', 'services_utilities', 'masjid_surau'],
    icon: <Stethoscope className="w-4 h-4" />,
    accentBg: 'bg-teal-500/15',
    accentText: 'text-teal-400',
    subFilters: [
      { id: 'all', label: 'All', labelBm: 'Semua', matcher: () => true },
      {
        id: 'clinic_hospital',
        label: 'Clinics & Medical',
        labelBm: 'Klinik & Hospital',
        matcher: (p) => p.subCategory === 'clinic_hospital' || p.subCategory === 'health_wellness',
      },
      {
        id: 'masjid_surau',
        label: 'Masjid & Surau',
        labelBm: 'Masjid & Surau',
        matcher: (p) =>
          p.category === 'masjid_surau' ||
          p.subCategory === 'masjid_surau' ||
          p.subCategory === 'jumaat_masjid' ||
          p.subCategory === 'other_surau',
      },
      {
        id: 'amenities_utilities',
        label: 'Banks, Laundry & Utilities',
        labelBm: 'Bank, Dobi & Utiliti',
        matcher: (p) =>
          p.subCategory !== 'clinic_hospital' &&
          p.category !== 'masjid_surau' &&
          p.subCategory !== 'masjid_surau',
      },
    ],
  },
  {
    id: 'transport_rentals',
    title: 'Transport & Rentals',
    titleBm: 'Pengangkutan & Sewaan',
    mainCategories: ['transport'],
    icon: <Car className="w-4 h-4" />,
    accentBg: 'bg-cyan-500/15',
    accentText: 'text-cyan-400',
    subFilters: [
      { id: 'all', label: 'All', labelBm: 'Semua', matcher: () => true },
      {
        id: 'rentals',
        label: 'Bike & Car Rentals',
        labelBm: 'Sewa Motosikal & Kereta',
        matcher: (p) =>
          p.subCategory === 'car_bike_rentals' ||
          p.subCategory === 'rental_motorcycle_scooter' ||
          p.subCategory === 'rental_car_van',
      },
      {
        id: 'fuel_ev_auto',
        label: 'Fuel, EV & Workshops',
        labelBm: 'Minyak, EV & Bengkel',
        matcher: (p) =>
          p.subCategory === 'fuel_ev_charging' ||
          p.subCategory === 'auto_repair_roadside' ||
          p.subCategory === 'tyre_shop' ||
          p.subCategory === 'car_battery_shop' ||
          p.subCategory === 'taxi_ehailing',
      },
    ],
  },
];

export function mapMainCategoryToExploreKey(cat?: MainCategory): ExploreCategoryKey {
  if (cat === 'food') return 'food_beverages';
  if (cat === 'travel_tourism' || cat === 'attraction') return 'attractions_farms';
  if (cat === 'accommodation') return 'stays_homestays';
  if (cat === 'shopping' || cat === 'business') return 'retail_markets';
  if (cat === 'transport') return 'transport_rentals';
  if (cat === 'local_services' || cat === 'services_utilities' || cat === 'masjid_surau') {
    return 'essential_services';
  }
  return 'food_beverages';
}

export function mapSubCategoryToFilterId(sub?: SubCategory): string {
  if (!sub) return 'all';
  if (sub === 'cafes' || sub === 'fb_restaurants_cafes') return 'cafes';
  if (sub === 'steamboats') return 'steamboats';
  if (sub === 'dining' || sub === 'night_markets_street' || sub === 'fb_fast_food') return 'local_mamak';
  if (sub === 'fb_bakeries') return 'bakeries';
  if (sub === 'agrotourism_farms' || sub === 'tourism_agritourism_farm') return 'agrotourism_farms';
  if (sub === 'attractions_sightseeing' || sub === 'tourism_ticketing_attractions') return 'attractions_sightseeing';
  if (sub === 'outdoor_adventure' || sub === 'tour_agencies_guides') return 'outdoor_adventure';
  if (sub === 'hotels_resorts') return 'hotels_resorts';
  if (sub === 'homestay' || sub === 'homestay_apartment' || sub === 'homestay_landed') return 'homestay';
  if (sub === 'chalets' || sub === 'camping_glamping' || sub === 'guesthouses') return 'chalets_glamping';
  if (sub === 'fresh_markets_produce' || sub === 'retail_groceries_produce') return 'fresh_markets_produce';
  if (sub === 'clinic_hospital' || sub === 'health_wellness') return 'clinic_hospital';
  if (sub === 'masjid_surau' || sub === 'jumaat_masjid' || sub === 'other_surau') return 'masjid_surau';
  if (sub === 'car_bike_rentals' || sub === 'rental_motorcycle_scooter' || sub === 'rental_car_van') return 'rentals';
  return 'all';
}

export interface ExploreInitialState {
  mode: 'main' | 'official' | 'township_detail' | 'category_detail';
  township?: Township;
  categoryKey?: ExploreCategoryKey;
  subFilterId?: string;
}

interface ExploreDirectoryViewProps {
  isOpen: boolean;
  onClose: () => void;
  places: Place[];
  language: Language;
  displayName?: string;
  bookmarkedIds: string[];
  onToggleBookmark: (placeId: string) => void;
  onSelectPlaceForMap: (place: Place) => void;
  onOpenAccommodation?: () => void;
  onOpenMotorbike?: () => void;
  onOpenFarmMatrix?: () => void;
  initialState?: ExploreInitialState;
}

const getPlaceFallbackImage = (cat: MainCategory): string => {
  if (cat === 'food') return imgSteamboat;
  if (cat === 'travel_tourism' || cat === 'attraction') return imgStrawberry;
  if (cat === 'accommodation') return imgPortals;
  if (cat === 'transport') return imgTraffic;
  if (cat === 'shopping' || cat === 'business') return imgDirectory;
  return imgCulture;
};

const formatEstimatedRate = (p: Place, isBm: boolean): string => {
  if (p.category === 'accommodation') return isBm ? 'Lihat Kadar' : 'Direct Lock';
  if (p.category === 'food') return 'RM15–45';
  if (p.category === 'travel_tourism' || p.category === 'attraction') return isBm ? 'Masuk / Tiket' : 'Visit / Entry';
  if (p.category === 'transport') return isBm ? 'Sewa / Servis' : 'Rental / Service';
  return isBm ? 'Disahkan' : 'Verified';
};

export const ExploreDirectoryView: React.FC<ExploreDirectoryViewProps> = ({
  isOpen,
  onClose,
  places,
  language,
  displayName,
  bookmarkedIds,
  onToggleBookmark,
  onSelectPlaceForMap,
  onOpenAccommodation,
  onOpenMotorbike,
  onOpenFarmMatrix,
  initialState,
}) => {
  const isBm = language === 'bm';

  const [topTab, setTopTab] = useState<'discover' | 'official'>('discover');
  const [subView, setSubView] = useState<'main' | 'all_townships' | 'township_detail' | 'category_detail'>('main');
  const [selectedTownship, setSelectedTownship] = useState<Township>('Tanah Rata');
  const [townshipCategoryKey, setTownshipCategoryKey] = useState<ExploreCategoryKey>('food_beverages');
  const [townshipSubFilter, setTownshipSubFilter] = useState<string>('all');
  const [showFacilitiesBox, setShowFacilitiesBox] = useState<boolean>(false);

  const [activeCategoryKey, setActiveCategoryKey] = useState<ExploreCategoryKey>('food_beverages');
  const [activeSubFilter, setActiveSubFilter] = useState<string>('all');
  const [categoryTownshipFilter, setCategoryTownshipFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDetailPlace, setActiveDetailPlace] = useState<Place | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (!initialState) {
      setTopTab('discover');
      setSubView('main');
      return;
    }
    if (initialState.mode === 'official') {
      setTopTab('official');
      setSubView('main');
    } else if (initialState.mode === 'township_detail' && initialState.township) {
      setTopTab('discover');
      setSelectedTownship(initialState.township);
      setTownshipCategoryKey('food_beverages');
      setTownshipSubFilter('all');
      setShowFacilitiesBox(false);
      setSubView('township_detail');
    } else if (initialState.mode === 'category_detail' && initialState.categoryKey) {
      setTopTab('discover');
      setActiveCategoryKey(initialState.categoryKey);
      setActiveSubFilter(initialState.subFilterId || 'all');
      setCategoryTownshipFilter('All');
      setSubView('category_detail');
    } else {
      setTopTab('discover');
      setSubView('main');
    }
  }, [isOpen, initialState]);

  const orderedTownshipItems = useMemo(() => {
    return ORDERED_9_TOWNSHIPS.map((townName) => {
      const found = TOWNSHIP_PORTALS.find((t) => t.name === townName) || TOWNSHIP_PORTALS[0];
      const count = places.filter((p) => p.township === townName).length;
      return {
        ...found,
        name: townName,
        placeCount: count,
        localImage: TOWNSHIP_LOCAL_IMAGES[townName] || imgPortals,
      };
    });
  }, [places]);

  const activeCategoryDef = useMemo(
    () => EXPLORE_CATEGORIES.find((c) => c.id === activeCategoryKey) || EXPLORE_CATEGORIES[0],
    [activeCategoryKey]
  );

  const townshipCategoryDef = useMemo(
    () => EXPLORE_CATEGORIES.find((c) => c.id === townshipCategoryKey) || EXPLORE_CATEGORIES[0],
    [townshipCategoryKey]
  );

  const searchFilteredPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return places;
    return places.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameBm && p.nameBm.toLowerCase().includes(q)) ||
        p.township.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [places, searchQuery]);

  const categoryDetailPlaces = useMemo(() => {
    const def = activeCategoryDef;
    const subDef = def.subFilters.find((s) => s.id === activeSubFilter) || def.subFilters[0];
    return searchFilteredPlaces.filter((p) => {
      if (!def.mainCategories.includes(p.category)) return false;
      if (categoryTownshipFilter !== 'All' && p.township !== categoryTownshipFilter) return false;
      return subDef.matcher(p);
    });
  }, [searchFilteredPlaces, activeCategoryDef, activeSubFilter, categoryTownshipFilter]);

  const townshipDetailPlaces = useMemo(() => {
    const def = townshipCategoryDef;
    const subDef = def.subFilters.find((s) => s.id === townshipSubFilter) || def.subFilters[0];
    return places.filter((p) => {
      if (p.township !== selectedTownship) return false;
      if (!def.mainCategories.includes(p.category)) return false;
      return subDef.matcher(p);
    });
  }, [places, selectedTownship, townshipCategoryDef, townshipSubFilter]);

  if (!isOpen) return null;

  const activeTownMeta =
    orderedTownshipItems.find((t) => t.name === selectedTownship) || orderedTownshipItems[0];

  const handleBackNavigation = () => {
    if (subView === 'township_detail' || subView === 'category_detail' || subView === 'all_townships') {
      setSubView('main');
      return;
    }
    onClose();
  };

  const renderPlaceRowCard = (place: Place) => {
    const isBookmarked = bookmarkedIds.includes(place.id);
    const thumb = safeSrc(place.imageUrl, getPlaceFallbackImage(place.category));
    return (
      <div
        key={place.id}
        onClick={() => setActiveDetailPlace(place)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setActiveDetailPlace(place);
        }}
        className="w-full bg-stone-900/90 rounded-2xl p-2.5 sm:p-3 border border-white/10 shadow-lg hover:border-emerald-400/50 transition-all cursor-pointer flex items-center gap-3 active:scale-[0.99] text-left"
      >
        <div className="w-24 h-20 sm:w-28 sm:h-22 rounded-xl overflow-hidden bg-stone-950 border border-white/10 shrink-0 relative">
          <img
            src={thumb}
            alt={isBm && place.nameBm ? place.nameBm : place.name}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = getPlaceFallbackImage(place.category);
            }}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-heading font-extrabold text-[14px] sm:text-[15px] text-white leading-snug line-clamp-1">
              {isBm && place.nameBm ? place.nameBm : place.name}
            </h4>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleBookmark(place.id);
              }}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark place'}
              className="p-1 text-stone-400 hover:text-rose-400 shrink-0 cursor-pointer"
            >
              <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-1 text-xs text-stone-400">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{place.township}</span>
            {place.elevation && (
              <span className="text-[11px] text-stone-500 shrink-0">· {place.elevation}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-bold text-stone-200 tabular-nums">
              {place.rating ? place.rating.toFixed(1) : '4.7'}
            </span>
            <span className="text-stone-400 text-[11px] tabular-nums">
              ({place.reviewsCount || 120} {isBm ? 'ulasan' : 'reviews'})
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-xs font-extrabold text-emerald-300">
              {formatEstimatedRate(place, isBm)}
            </span>
            <span
              className={`text-[10px] font-bold ${
                place.operatingHours?.isOpen === false ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {place.operatingHours?.isOpen === false
                ? isBm
                  ? 'Tutup'
                  : 'Closed'
                : place.operatingHours?.from && place.operatingHours?.to
                  ? `${place.operatingHours.from}–${place.operatingHours.to}`
                  : isBm
                    ? 'Dibuka'
                    : 'Open Now'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[130] bg-stone-950 text-stone-100 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Top Header Bar — Seamless dark bg-stone-950 matching the rest of CamGo */}
      <header className="shrink-0 bg-stone-950 border-b border-white/10 px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3.5 space-y-3 z-20">
        {/* Compact Top Controls Row */}
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="min-h-[42px] min-w-[42px] rounded-2xl bg-stone-900 hover:bg-stone-800 border border-white/10 shadow-sm text-stone-200 hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {subView === 'main' && (
              <div className="inline-flex p-1 rounded-xl bg-stone-900 border border-white/10 shadow-sm text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTopTab('discover')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    topTab === 'discover'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {isBm ? 'Teroka' : 'Discover'}
                </button>
                <button
                  type="button"
                  onClick={() => setTopTab('official')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    topTab === 'official'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {isBm ? 'Portal' : 'Portals'}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] min-w-[42px] rounded-2xl bg-stone-900 hover:bg-stone-800 border border-white/10 shadow-sm text-stone-300 hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full-Width Greeting & Page Heading — Always 100% visible on mobile & desktop */}
        <div className="max-w-5xl mx-auto space-y-0.5">
          <p className="text-xs sm:text-sm font-medium text-stone-400 leading-snug whitespace-normal break-words">
            {subView === 'main'
              ? `${isBm ? 'Hai' : 'Hi'}, ${
                  displayName || (isBm ? 'Pengembara Tanah Tinggi' : 'Highland Explorer')
                }`
              : subView === 'township_detail'
                ? `${isBm ? 'Pekan Cameron Highlands' : 'Cameron Highlands Township'}`
                : subView === 'all_townships'
                  ? `${isBm ? 'Semua 9 Pekan' : 'All 9 Townships'}`
                  : `${isBm ? 'Direktori Kategori' : 'Category Directory'}`}
          </p>
          <h2 className="no-mobile-clamp text-2xl sm:text-3xl font-heading font-black text-white leading-tight whitespace-normal break-words">
            {subView === 'main'
              ? topTab === 'official'
                ? isBm
                  ? 'Portal Rasmi'
                  : 'Official Portals'
                : isBm
                  ? 'Jom Teroka'
                  : "Let's Explore"
              : subView === 'township_detail'
                ? activeTownMeta.name
                : subView === 'all_townships'
                  ? isBm
                    ? '9 Pekan Tanah Tinggi'
                    : 'Highland Townships'
                  : isBm
                    ? activeCategoryDef.titleBm
                    : activeCategoryDef.title}
          </h2>
        </div>

        {/* Search Box (Visible in Main Discover & Category Directory views) */}
        {topTab === 'discover' && (subView === 'main' || subView === 'category_detail') && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 bg-stone-900/95 border border-white/15 shadow-sm focus-within:border-emerald-400 rounded-2xl px-3.5 py-2.5 transition-all">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isBm
                    ? 'Cari kafe, stimbot, ladang, inap desa atau pekan...'
                    : 'Search cafes, steamboat, farms, homestays or towns...'
                }
                className="w-full bg-transparent text-sm text-white placeholder:text-stone-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-stone-400 hover:text-white cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Scrollable Body */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pb-24"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* OFFICIAL PORTALS TAB */}
        {topTab === 'official' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4">
            <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 border border-emerald-500/30 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div>
                <h3 className="font-heading font-extrabold text-base">
                  {isBm ? 'Pautan Agensi & Tiket Ladang Rasmi' : 'Official Government Portals & Farm Tickets'}
                </h3>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  {isBm
                    ? 'MDCH, JKR FT59/FT185, Hospital Tanah Rata, Polis Daerah & senarai harga tiket tarikan.'
                    : 'MDCH, JKR FT59/FT185, Tanah Rata Hospital, District Police & attraction ticket matrix.'}
                </p>
              </div>
              {onOpenFarmMatrix && (
                <button
                  type="button"
                  onClick={onOpenFarmMatrix}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-extrabold shrink-0 transition-colors cursor-pointer"
                >
                  {isBm ? 'Lihat Harga Tiket Ladang' : 'View Farm Ticket Matrix'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OFFICIAL_PORTALS.map((portal) => (
                <div
                  key={portal.name}
                  className="bg-stone-900/90 rounded-2xl p-4 border border-white/10 shadow-lg flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-cyan-400">
                        {portal.type}
                      </span>
                      <Landmark className="w-4 h-4 text-stone-400 shrink-0" />
                    </div>
                    <h4 className="font-heading font-extrabold text-sm text-white">
                      {isBm && portal.nameBm ? portal.nameBm : portal.name}
                    </h4>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {isBm && portal.descriptionBm ? portal.descriptionBm : portal.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
                    <a
                      href={`tel:${portal.phone.replace(/[^+\d]/g, '')}`}
                      className="inline-flex items-center gap-1 font-bold text-stone-300 hover:text-emerald-400"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{portal.phone}</span>
                    </a>
                    <a
                      href={portal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-cyan-400 hover:underline"
                    >
                      <span>{isBm ? 'Buka Portal' : 'Visit Site'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAIN DISCOVER VIEW (Mockup Layout: Townships Carousel Top + Categorized Directory Bottom) */}
        {topTab === 'discover' && subView === 'main' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-6">
            {/* TOP SECTION: Horizontal Scrollable Township Carousel */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading font-extrabold text-base sm:text-lg text-white">
                  {isBm ? 'Pekan Tanah Tinggi (9)' : 'Highland Townships'}
                </h3>
                <button
                  type="button"
                  onClick={() => setSubView('all_townships')}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer py-1 px-2"
                >
                  {isBm ? 'Lihat semua' : 'See all'}
                </button>
              </div>

              <div
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {orderedTownshipItems.map((town) => (
                  <button
                    key={town.name}
                    type="button"
                    onClick={() => {
                      setSelectedTownship(town.name);
                      setTownshipCategoryKey('food_beverages');
                      setTownshipSubFilter('all');
                      setShowFacilitiesBox(false);
                      setSubView('township_detail');
                    }}
                    className="relative w-[172px] sm:w-[200px] h-[228px] sm:h-[248px] shrink-0 snap-start rounded-[22px] overflow-hidden shadow-lg border border-white/15 group text-left cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <img
                      src={safeSrc(town.localImage, imgPortals)}
                      alt={town.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = imgPortals;
                      }}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/25 to-stone-950/15" />

                    <div className="absolute inset-x-3 bottom-3 space-y-1">
                      <h4 className="font-heading font-extrabold text-sm sm:text-base text-white leading-tight drop-shadow">
                        {town.name}
                      </h4>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-stone-200">
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-cyan-300 shrink-0" />
                          <span className="truncate">{town.elevation}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-amber-300 shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{town.placeCount}</span>
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Quick Interactive Category Jump Bar */}
            <section className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {EXPLORE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryKey(cat.id);
                    setActiveSubFilter('all');
                    setCategoryTownshipFilter('All');
                    setSubView('category_detail');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-stone-900/90 border border-white/10 hover:border-cyan-400/60 text-stone-200 text-xs font-bold shadow-sm shrink-0 cursor-pointer min-h-[40px]"
                >
                  <span className={cat.accentText}>{cat.icon}</span>
                  <span>{isBm ? cat.titleBm : cat.title}</span>
                </button>
              ))}
            </section>

            {/* BOTTOM SECTION: Categorized Directory Feeds */}
            <div className="space-y-6">
              {EXPLORE_CATEGORIES.map((cat) => {
                const matching = searchFilteredPlaces.filter((p) =>
                  cat.mainCategories.includes(p.category)
                );
                if (matching.length === 0 && searchQuery.trim()) return null;

                return (
                  <section key={cat.id} className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-xl ${cat.accentBg} ${cat.accentText} flex items-center justify-center shrink-0`}
                        >
                          {cat.icon}
                        </span>
                        <h3 className="font-heading font-extrabold text-base text-white truncate">
                          {isBm ? cat.titleBm : cat.title}
                        </h3>
                        <span className="text-xs font-bold text-stone-400 tabular-nums">
                          ({matching.length})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {cat.id === 'stays_homestays' && onOpenAccommodation && (
                          <button
                            type="button"
                            onClick={onOpenAccommodation}
                            className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                          >
                            {isBm ? 'Tempah Bilik' : 'Lock Room'}
                          </button>
                        )}
                        {cat.id === 'transport_rentals' && onOpenMotorbike && (
                          <button
                            type="button"
                            onClick={onOpenMotorbike}
                            className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
                          >
                            {isBm ? 'Sewa Motor' : 'Rent Motorbike'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCategoryKey(cat.id);
                            setActiveSubFilter('all');
                            setCategoryTownshipFilter('All');
                            setSubView('category_detail');
                          }}
                          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer py-1 px-1.5"
                        >
                          {isBm ? 'Lihat semua' : 'See all'}
                        </button>
                      </div>
                    </div>

                    {matching.length === 0 ? (
                      <div className="bg-stone-900/90 rounded-2xl p-4 border border-white/10 text-xs text-stone-400">
                        {isBm ? 'Tiada penyenaraian ditemui.' : 'No listings available in this category yet.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {matching.slice(0, 3).map(renderPlaceRowCard)}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {/* ALL TOWNSHIPS FULL GRID ("See all" from Townships Carousel) */}
        {topTab === 'discover' && subView === 'all_townships' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {orderedTownshipItems.map((town, index) => (
              <button
                key={town.name}
                type="button"
                onClick={() => {
                  setSelectedTownship(town.name);
                  setTownshipCategoryKey('food_beverages');
                  setTownshipSubFilter('all');
                  setShowFacilitiesBox(false);
                  setSubView('township_detail');
                }}
                className="relative h-[210px] sm:h-[235px] rounded-[22px] overflow-hidden shadow-lg border border-white/15 text-left group cursor-pointer active:scale-[0.98] transition-transform"
              >
                <img
                  src={safeSrc(town.localImage, imgPortals)}
                  alt={town.name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-transparent" />
                <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-stone-950/85 text-white border border-white/20 text-[11px] font-black flex items-center justify-center shadow">
                  {index + 1}
                </div>
                <div className="absolute inset-x-3 bottom-3 space-y-1">
                  <h4 className="font-heading font-extrabold text-sm sm:text-base text-white leading-tight">
                    {town.name}
                  </h4>
                  <p className="text-[11px] text-stone-300 line-clamp-1">{town.vibe}</p>
                  <div className="flex items-center justify-between text-[11px] text-stone-200 pt-0.5">
                    <span>{town.elevation}</span>
                    <span className="font-bold text-amber-300">
                      {town.placeCount} {isBm ? 'tempat' : 'places'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* TOWNSHIP DETAIL PAGE */}
        {topTab === 'discover' && subView === 'township_detail' && (
          <div className="max-w-5xl mx-auto pb-12">
            {/* Hero Image Banner */}
            <div className="relative h-52 sm:h-64 overflow-hidden bg-stone-900">
              <img
                src={safeSrc(activeTownMeta.localImage, imgPortals)}
                alt={activeTownMeta.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/40 to-transparent" />
              <div className="absolute inset-x-4 sm:inset-x-6 bottom-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{activeTownMeta.elevation}</span>
                    <span>·</span>
                    <span>{activeTownMeta.vibe}</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-heading font-black leading-tight">
                    {activeTownMeta.name}
                  </h3>
                  <p className="text-xs text-stone-200 max-w-xl line-clamp-2">
                    {isBm && activeTownMeta.descriptionBm
                      ? activeTownMeta.descriptionBm
                      : activeTownMeta.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFacilitiesBox((v) => !v)}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-stone-900/95 hover:bg-stone-800 border border-white/15 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 shadow cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    {showFacilitiesBox
                      ? isBm
                        ? 'Tutup Kemudahan'
                        : 'Hide Facilities'
                      : isBm
                        ? 'Kemudahan Asas'
                        : 'Town Facilities'}
                  </span>
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-6 pt-4 space-y-4">
              {/* Collapsible Township Essential Facilities (Preserved from Hub) */}
              {showFacilitiesBox && (
                <div className="bg-stone-900/90 rounded-2xl p-4 border border-white/10 shadow-lg grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Hospital className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">
                        {isBm ? 'Klinik / Hospital' : 'Clinic / Hospital'}
                      </span>
                      <span className="text-stone-400">{activeTownMeta.hospital}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Siren className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">
                        {isBm ? 'Balai Polis' : 'Police Station'}
                      </span>
                      <span className="text-stone-400">{activeTownMeta.police}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Fuel className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">
                        {isBm ? 'Stesen Minyak' : 'Petrol Station'}
                      </span>
                      <span className="text-stone-400">{activeTownMeta.gasStation}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Droplets className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">
                        {isBm ? 'Tandas Awam' : 'Public Restroom'}
                      </span>
                      <span className="text-stone-400">{activeTownMeta.publicToilet}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Tabs Inside Selected Township */}
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {EXPLORE_CATEGORIES.map((cat) => {
                  const isActive = townshipCategoryKey === cat.id;
                  const countInTown = places.filter(
                    (p) => p.township === selectedTownship && cat.mainCategories.includes(p.category)
                  ).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setTownshipCategoryKey(cat.id);
                        setTownshipSubFilter('all');
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold border shrink-0 transition-all cursor-pointer min-h-[40px] ${
                        isActive
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-stone-900 text-stone-300 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{isBm ? cat.titleBm : cat.title}</span>
                      <span className={`text-[11px] ${isActive ? 'text-emerald-100' : 'text-stone-400'}`}>
                        ({countInTown})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Subcategory Filter Chips */}
              {townshipCategoryDef.subFilters.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {townshipCategoryDef.subFilters.map((sub) => {
                    const isSubActive = townshipSubFilter === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setTownshipSubFilter(sub.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border shrink-0 transition-colors cursor-pointer min-h-[34px] ${
                          isSubActive
                            ? 'bg-cyan-600 text-white border-cyan-500'
                            : 'bg-stone-900 text-stone-300 border-white/10 hover:border-cyan-400/60'
                        }`}
                      >
                        {isBm ? sub.labelBm : sub.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Places Listed Inside This Township */}
              {townshipDetailPlaces.length === 0 ? (
                <div className="bg-stone-900/90 rounded-2xl p-6 border border-white/10 text-center space-y-2">
                  <p className="text-sm font-bold text-stone-200">
                    {isBm
                      ? `Tiada tempat untuk kategori ini di ${selectedTownship} buat masa ini.`
                      : `No listings in this category for ${selectedTownship} yet.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategoryKey(townshipCategoryKey);
                      setActiveSubFilter('all');
                      setCategoryTownshipFilter('All');
                      setSubView('category_detail');
                    }}
                    className="text-xs font-bold text-cyan-400 hover:underline cursor-pointer"
                  >
                    {isBm ? 'Lihat semua pekan untuk kategori ini' : 'Browse all townships for this category'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {townshipDetailPlaces.map(renderPlaceRowCard)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CATEGORY DIRECTORY PAGE ("See all" from Category Section or Mega Menu) */}
        {topTab === 'discover' && subView === 'category_detail' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-4">
            {/* Category Switcher Strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {EXPLORE_CATEGORIES.map((cat) => {
                const isSelected = cat.id === activeCategoryKey;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategoryKey(cat.id);
                      setActiveSubFilter('all');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border shrink-0 transition-all cursor-pointer min-h-[40px] ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-stone-900 text-stone-300 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{isBm ? cat.titleBm : cat.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Township Dropdown + Subcategory Filter Chips */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {activeCategoryDef.subFilters.map((sub) => {
                  const isActive = activeSubFilter === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setActiveSubFilter(sub.id)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border shrink-0 transition-colors cursor-pointer min-h-[36px] ${
                        isActive
                          ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs'
                          : 'bg-stone-900 text-stone-300 border-white/10 hover:border-cyan-400/60'
                      }`}
                    >
                      {isBm ? sub.labelBm : sub.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Filter className="w-4 h-4 text-stone-400 shrink-0" />
                <select
                  value={categoryTownshipFilter}
                  onChange={(e) => setCategoryTownshipFilter(e.target.value)}
                  aria-label="Filter by Township"
                  className="bg-stone-900 border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-stone-100 outline-none focus:border-emerald-400 min-h-[40px]"
                >
                  <option value="All">{isBm ? 'Semua Pekan (9)' : 'All Townships (9)'}</option>
                  {ORDERED_9_TOWNSHIPS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtered Category Listings */}
            {categoryDetailPlaces.length === 0 ? (
              <div className="bg-stone-900/90 rounded-2xl p-8 border border-white/10 text-center space-y-2">
                <p className="text-sm font-bold text-stone-200">
                  {isBm
                    ? 'Tiada penyenaraian yang sepadan dengan penapis anda.'
                    : 'No places matched your current filters.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSubFilter('all');
                    setCategoryTownshipFilter('All');
                    setSearchQuery('');
                  }}
                  className="text-xs font-bold text-cyan-400 hover:underline cursor-pointer"
                >
                  {isBm ? 'Set semula penapis' : 'Reset filters'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryDetailPlaces.map(renderPlaceRowCard)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PLACE DETAIL MODAL SHEET */}
      {activeDetailPlace && (
        <div className="fixed inset-0 z-[160] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-stone-900 text-stone-100 border border-white/15 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90dvh] flex flex-col">
            <div className="relative h-52 sm:h-60 bg-stone-950 shrink-0">
              <img
                src={safeSrc(activeDetailPlace.imageUrl, getPlaceFallbackImage(activeDetailPlace.category))}
                alt={activeDetailPlace.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = getPlaceFallbackImage(activeDetailPlace.category);
                }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-black/30" />
              <button
                type="button"
                onClick={() => setActiveDetailPlace(null)}
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/70 text-white border border-white/15 flex items-center justify-center hover:bg-black/90 cursor-pointer"
                aria-label="Close detail"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <h3 className="text-lg sm:text-xl font-heading font-black leading-snug">
                  {isBm && activeDetailPlace.nameBm ? activeDetailPlace.nameBm : activeDetailPlace.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-stone-200 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span>{activeDetailPlace.township}</span>
                  <span>·</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  <span className="font-bold">
                    {activeDetailPlace.rating?.toFixed(1) || '4.7'} ({activeDetailPlace.reviewsCount || 120})
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              <p className="text-stone-300 leading-relaxed text-xs sm:text-sm">
                {isBm && activeDetailPlace.descriptionBm
                  ? activeDetailPlace.descriptionBm
                  : activeDetailPlace.description}
              </p>

              <div className="space-y-2 text-xs text-stone-300 bg-stone-950/85 rounded-2xl p-3.5 border border-white/10">
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  <span>{activeDetailPlace.location}</span>
                </div>
                {activeDetailPlace.operatingHours?.from && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>
                      {activeDetailPlace.operatingHours.from} – {activeDetailPlace.operatingHours.to}
                    </span>
                  </div>
                )}
                {activeDetailPlace.contact && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                    <a
                      href={`tel:${activeDetailPlace.contact.replace(/[^+\d]/g, '')}`}
                      className="font-bold text-cyan-400 hover:underline"
                    >
                      {activeDetailPlace.contact}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const target = activeDetailPlace;
                    setActiveDetailPlace(null);
                    onClose();
                    onSelectPlaceForMap(target);
                  }}
                  className="flex-1 min-h-[46px] rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{isBm ? 'Lihat di Peta Interaktif' : 'View On Interactive Map'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleBookmark(activeDetailPlace.id)}
                  className="min-h-[46px] px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-white/10 text-stone-100 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      bookmarkedIds.includes(activeDetailPlace.id)
                        ? 'fill-rose-500 text-rose-500'
                        : 'text-stone-300'
                    }`}
                  />
                  <span>{isBm ? 'Simpan' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
