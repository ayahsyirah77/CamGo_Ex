// Navbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CamLogo } from './CamLogo';
import { Language, MainCategory, SubCategory, Place, EventNotification, Township } from '../types';
import { getTranslation } from '../services/i18n';
import { UserProfile, firebaseService } from '../services/firebase';
import { PWAInstallButton } from './PWAInstallButton';
import {
  ChevronDown,
  Compass,
  MapPin,
  CloudSun,
  Camera,
  MessageSquare,
  Sparkles,
  User,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
  Briefcase,
  Building2,
  AlertTriangle,
  Layers,
  Route,
  LogIn,
  ChevronRight,
  Globe,
  Search,
  Calendar,
  Store,
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  onOpenAi: () => void;
  onOpenUserDashboard: () => void;
  onSelectCategory: (category: MainCategory, sub?: SubCategory) => void;
  onNavigateSection: (sectionId: string) => void;
  onOpenDirectoriesModal?: () => void;
  onOpenPortalsModal?: () => void;
  onOpenItinerary?: () => void;
  onOpenChat?: () => void;
  onOpenMap?: () => void;
  onOpenGalleryModal?: () => void;
  onOpenVendorPortal?: () => void;
  onOpenFarmMatrix?: () => void;
  places?: Place[];
  events?: EventNotification[];
  onSelectPlace?: (place: Place) => void;
  onSelectEvent?: (event: EventNotification) => void;
  onSelectTownship?: (town: Township) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageChange,
  currentUser,
  onOpenAuth,
  onOpenAdmin,
  onOpenAi,
  onOpenUserDashboard,
  onSelectCategory,
  onNavigateSection,
  onOpenDirectoriesModal = () => onNavigateSection('directories-section'),
  onOpenPortalsModal = () => onNavigateSection('portals-section'),
  onOpenItinerary,
  onOpenChat,
  onOpenMap,
  onOpenGalleryModal,
  onOpenVendorPortal,
  onOpenFarmMatrix,
  places = [],
  events = [],
  onSelectPlace,
  onSelectEvent,
  onSelectTownship,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [directoriesOpen, setDirectoriesOpen] = useState(false);
  const [portalsOpen, setPortalsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Header Search Bar States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close search dropdown and user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered search items
  const q = searchQuery.trim().toLowerCase();

  const matchingPlaces = q
    ? (places || []).filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
          p.township.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }).slice(0, 5)
    : [];

  const matchingEvents = q
    ? (events || []).filter((e) => {
        return (
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.township && e.township.toLowerCase().includes(q)) ||
          (e.date && e.date.toLowerCase().includes(q))
        );
      }).slice(0, 3)
    : [];

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

  const matchingTownships = q
    ? ALL_TOWNSHIPS.filter((t) => t.toLowerCase().includes(q)).slice(0, 3)
    : [];

  const totalResults =
    matchingPlaces.length + matchingEvents.length + matchingTownships.length;

  const handleSelectSearchResultPlace = (place: Place) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onSelectPlace) {
      onSelectPlace(place);
    } else if (onOpenMap) {
      onOpenMap();
    } else {
      onNavigateSection('interactive-map');
    }
  };

  const handleSelectSearchResultEvent = (event: EventNotification) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onSelectEvent) {
      onSelectEvent(event);
    }
  };

  const handleSelectSearchResultTownship = (township: Township) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onSelectTownship) {
      onSelectTownship(township);
    } else {
      onOpenPortalsModal();
    }
  };

  // Triple-click logo detection for admin trigger
  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef(0);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < 1000) {
      clickCountRef.current += 1;
    } else {
      clickCountRef.current = 1;
    }
    lastClickTimeRef.current = now;

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      onOpenAdmin();
    } else if (clickCountRef.current === 1) {
      // Normal click returns to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Hide on scroll down, reappear on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 60) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      if (currentScrollY > lastScrollY && currentScrollY > 120) {
        // Scrolling down -> hide navbar
        setIsVisible(false);
        setDirectoriesOpen(false);
        setPortalsOpen(false);
      } else {
        // Scrolling up -> show navbar
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      <nav
        aria-label="Main Navigation"
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 transform ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        } ${
          isScrolled
            ? 'glass-panel border-b border-white/10 shadow-xl shadow-black/40 py-2.5'
            : 'bg-gradient-to-b from-stone-950/90 via-stone-950/60 to-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo with Triple-Click hint */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div
              onClick={handleLogoClick}
              className="group relative cursor-pointer"
              title={
                language === 'bm'
                  ? 'Klik 3 kali untuk akses Pentadbir'
                  : 'Triple-click logo for Admin Access'
              }
            >
              <CamLogo size="md" />
            </div>
          </div>

          {/* Header Navigation Search Bar */}
          <div ref={searchRef} className="relative flex-1 max-w-[170px] sm:max-w-xs md:max-w-sm mx-2 sm:mx-4">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 absolute left-2.5 sm:left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={language === 'bm' ? 'Cari tempat, acara...' : 'Search places, events...'}
                className="w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 rounded-full bg-stone-900/90 border border-white/15 focus:border-emerald-400 text-[11px] sm:text-xs text-stone-100 placeholder-stone-400 outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-2 p-1 rounded-full text-stone-400 hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>

            {/* Live Autocomplete Search Results Dropdown */}
            {isSearchOpen && q.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 max-h-[75vh] overflow-y-auto rounded-2xl bg-stone-900/98 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl p-2 z-50 text-stone-100 space-y-2.5 min-w-[280px] sm:min-w-[340px]">
                {totalResults === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-400 space-y-1">
                    <p className="font-medium text-stone-300">
                      {language === 'bm' ? `Tiada hasil untuk "${searchQuery}"` : `No results found for "${searchQuery}"`}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {language === 'bm'
                        ? 'Cuba cari "Steamboat", "Mossy Forest", "Tanah Rata", atau "Pasar Malam".'
                        : 'Try searching for "Steamboat", "Mossy Forest", "Tanah Rata", or "Night Market".'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Matching Places */}
                    {matchingPlaces.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 px-2 py-1 flex items-center justify-between border-b border-white/5">
                          <span className="flex items-center gap-1">
                            <Compass className="w-3 h-3" />
                            <span>Places &amp; Listings ({matchingPlaces.length})</span>
                          </span>
                        </div>
                        {matchingPlaces.map((place) => (
                          <button
                            key={place.id}
                            onClick={() => handleSelectSearchResultPlace(place)}
                            className="w-full p-2 rounded-xl hover:bg-stone-800/90 text-left flex items-center gap-2.5 transition-colors cursor-pointer group"
                          >
                            <img
                              src={place.imageUrl}
                              alt={place.name}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover bg-stone-950 border border-white/10 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs text-stone-100 group-hover:text-emerald-300 truncate">
                                {place.name}
                              </div>
                              <div className="text-[10px] text-stone-400 truncate flex items-center gap-1.5 mt-0.5">
                                <span className="text-emerald-400 font-mono font-bold">{place.township}</span>
                                <span>•</span>
                                <span className="capitalize">{place.category}</span>
                                {place.rating && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-400 font-bold">★ {place.rating}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Matching Events */}
                    {matchingEvents.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 px-2 py-1 flex items-center justify-between border-b border-white/5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Highland Events ({matchingEvents.length})</span>
                          </span>
                        </div>
                        {matchingEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleSelectSearchResultEvent(event)}
                            className="w-full p-2 rounded-xl hover:bg-stone-800/90 text-left flex items-center gap-2.5 transition-colors cursor-pointer group"
                          >
                            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs text-stone-100 group-hover:text-amber-300 truncate">
                                {event.title}
                              </div>
                              <div className="text-[10px] text-stone-400 truncate mt-0.5">
                                {event.date} • <span className="text-amber-300">{event.township}</span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Matching Townships */}
                    {matchingTownships.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 px-2 py-1 flex items-center justify-between border-b border-white/5">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>Highland Townships ({matchingTownships.length})</span>
                          </span>
                        </div>
                        {matchingTownships.map((town) => (
                          <button
                            key={town}
                            onClick={() => handleSelectSearchResultTownship(town)}
                            className="w-full p-2 rounded-xl hover:bg-stone-800/90 text-left flex items-center gap-2.5 transition-colors cursor-pointer group"
                          >
                            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 shrink-0">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs text-stone-100 group-hover:text-teal-300 truncate">
                                {town} Township Hub
                              </div>
                              <div className="text-[10px] text-stone-400 truncate">
                                Highland Portal &amp; Emergency Hub
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

          {/* Desktop Navigation Links */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="hidden lg:flex items-center gap-1 text-xs font-medium text-stone-200"
          >
            {/* Directories Mega Menu */}
            <motion.div
              variants={itemVariants}
              className="relative"
              onMouseEnter={() => setDirectoriesOpen(true)}
              onMouseLeave={() => setDirectoriesOpen(false)}
            >
              <button
                onClick={() => {
                  setDirectoriesOpen(false);
                  onOpenDirectoriesModal();
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>{getTranslation(language, 'nav_directories')}</span>
              </button>

              {/* Directories Dropdown Menu */}
              {directoriesOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[880px] transition-all z-50">
                  <div className="glass-panel rounded-2xl p-5 shadow-2xl border border-emerald-500/20 grid grid-cols-4 gap-4 bg-stone-900/95 backdrop-blur-2xl">
                    {/* Food & Beverages */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-500/20 pb-1 flex items-center gap-1.5">
                        <span>🍲</span>
                        <span>{getTranslation(language, 'dir_food')}</span>
                      </div>
                      <ul className="space-y-1 text-xs">
                        {[
                          { key: 'dining', label: 'Restaurants & Dining' },
                          { key: 'steamboats', label: 'Steamboat' },
                          { key: 'cafes', label: 'Cafes & Bakeries' },
                          { key: 'night_markets_street', label: 'Night Markets & Street Food' },
                          { key: 'bars_nightlife', label: 'Bars & Nightlife' },
                        ].map((sub) => (
                          <li key={sub.key}>
                            <button
                              onClick={() => {
                                onSelectCategory('food', sub.key as SubCategory);
                                setDirectoriesOpen(false);
                              }}
                              className="text-stone-300 hover:text-emerald-300 hover:translate-x-1 transition-all block py-0.5 text-left w-full cursor-pointer"
                            >
                              {sub.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Travel & Highland Tourism */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-500/20 pb-1 flex items-center gap-1.5">
                        <span>🌄</span>
                        <span>{getTranslation(language, 'dir_travel_highland_tourism')}</span>
                      </div>
                      <ul className="space-y-1 text-xs">
                        {[
                          { key: 'attractions_sightseeing', label: 'Attractions & Sightseeing' },
                          { key: 'agrotourism_farms', label: 'Agrotourism & Farms' },
                          { key: 'outdoor_adventure', label: 'Outdoor & Adventure' },
                          { key: 'tour_agencies_guides', label: 'Tour Agencies & Guides' },
                        ].map((sub) => (
                          <li key={sub.key}>
                            <button
                              onClick={() => {
                                onSelectCategory('travel_tourism', sub.key as SubCategory);
                                setDirectoriesOpen(false);
                              }}
                              className="text-stone-300 hover:text-emerald-300 hover:translate-x-1 transition-all block py-0.5 text-left w-full cursor-pointer"
                            >
                              {sub.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Accommodation */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-500/20 pb-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{getTranslation(language, 'dir_accommodation')}</span>
                      </div>
                      <ul className="space-y-1 text-xs">
                        {[
                          { key: 'hotels_resorts', label: 'Hotels & Resorts' },
                          { key: 'guesthouses', label: 'Guesthouses' },
                          { key: 'chalets', label: 'Chalets' },
                          { key: 'homestay', label: 'Homestays' },
                          { key: 'camping_glamping', label: 'Camping & Glamping' },
                        ].map((sub) => (
                          <li key={sub.key}>
                            <button
                              onClick={() => {
                                onSelectCategory('accommodation', sub.key as SubCategory);
                                setDirectoriesOpen(false);
                              }}
                              className="text-stone-300 hover:text-emerald-300 hover:translate-x-1 transition-all block py-0.5 text-left w-full cursor-pointer"
                            >
                              {sub.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Transport & Mobility */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-500/20 pb-1 flex items-center gap-1.5">
                        <span>🚗</span>
                        <span>{getTranslation(language, 'dir_transport')}</span>
                      </div>
                      <ul className="space-y-1 text-xs">
                        {[
                          { key: 'car_bike_rentals', label: 'Car & Bike Rentals' },
                          { key: 'taxi_ehailing', label: 'Taxi & E-Hailing' },
                          { key: 'auto_repair_roadside', label: 'Auto Repair & Roadside' },
                          { key: 'fuel_ev_charging', label: 'Fuel & EV Charging' },
                        ].map((sub) => (
                          <li key={sub.key}>
                            <button
                              onClick={() => {
                                onSelectCategory('transport', sub.key as SubCategory);
                                setDirectoriesOpen(false);
                              }}
                              className="text-stone-300 hover:text-emerald-300 hover:translate-x-1 transition-all block py-0.5 text-left w-full cursor-pointer"
                            >
                              {sub.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Local Services & Amenities */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-500/20 pb-1 flex items-center gap-1.5">
                        <span>🏥</span>
                        <span>{getTranslation(language, 'dir_local_services')}</span>
                      </div>
                      <ul className="space-y-1 text-xs">
                        {[
                          { key: 'health_wellness', label: 'Health & Wellness' },
                          { key: 'banking_financial', label: 'Banking & Financial' },
                          { key: 'logistics_freight', label: 'Logistics & Freight' },
                          { key: 'property_real_estate', label: 'Property & Real Estate' },
                          { key: 'event_business_support', label: 'Event & Business Support' },
                        ].map((sub) => (
                          <li key={sub.key}>
                            <button
                              onClick={() => {
                                onSelectCategory('local_services', sub.key as SubCategory);
                                setDirectoriesOpen(false);
                              }}
                              className="text-stone-300 hover:text-emerald-300 hover:translate-x-1 transition-all block py-0.5 text-left w-full cursor-pointer"
                            >
                              {sub.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Shopping & Local Produce */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-500/20 pb-1 flex items-center gap-1.5">
                        <span>🛍️</span>
                        <span>{getTranslation(language, 'dir_shopping')}</span>
                      </div>
                      <ul className="space-y-1 text-xs">
                        {[
                          { key: 'fresh_markets_produce', label: 'Fresh Markets & Produce' },
                          { key: 'souvenirs_handicrafts', label: 'Souvenirs & Handicrafts' },
                          { key: 'convenience_groceries', label: 'Convenience & Groceries' },
                          { key: 'retail_apparel', label: 'Retail & Apparel' },
                        ].map((sub) => (
                          <li key={sub.key}>
                            <button
                              onClick={() => {
                                onSelectCategory('shopping', sub.key as SubCategory);
                                setDirectoriesOpen(false);
                              }}
                              className="text-stone-300 hover:text-emerald-300 hover:translate-x-1 transition-all block py-0.5 text-left w-full cursor-pointer"
                            >
                              {sub.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Services & Utilities */}
                    <div className="space-y-2 col-span-2 pt-2 border-t border-white/5">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-500/20 pb-1 flex items-center gap-1.5">
                        <span>🛠️</span>
                        <span>{getTranslation(language, 'dir_services_utilities')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 text-xs">
                        <ul className="space-y-1">
                          {[
                            { key: 'plumbing_electrical', label: 'Plumbing & Electrical' },
                            { key: 'locksmith_access', label: 'Locksmith & Access Services' },
                            { key: 'carpentry_construction', label: 'Carpentry & Construction' },
                            { key: 'pest_control', label: 'Pest Control & Fumigation' },
                          ].map((sub) => (
                            <li key={sub.key}>
                              <button
                                onClick={() => {
                                  onSelectCategory('services_utilities', sub.key as SubCategory);
                                  setDirectoriesOpen(false);
                                }}
                                className="text-stone-300 hover:text-emerald-300 hover:translate-x-1 transition-all block py-0.5 text-left w-full cursor-pointer"
                              >
                                {sub.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                        <ul className="space-y-1">
                          {[
                            { key: 'laundry_dry_cleaning', label: 'Laundry & Dry Cleaning' },
                            { key: 'housekeeping_maid', label: 'Housekeeping & Maid Services' },
                            { key: 'cooking_gas_delivery', label: 'Cooking Gas (LPG) Delivery' },
                          ].map((sub) => (
                            <li key={sub.key}>
                              <button
                                onClick={() => {
                                  onSelectCategory('services_utilities', sub.key as SubCategory);
                                  setDirectoriesOpen(false);
                                }}
                                className="text-stone-300 hover:text-emerald-300 hover:translate-x-1 transition-all block py-0.5 text-left w-full cursor-pointer"
                              >
                                {sub.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Hub (Renamed Portals) */}
            <motion.div
              variants={itemVariants}
              className="relative"
              onMouseEnter={() => setPortalsOpen(true)}
              onMouseLeave={() => setPortalsOpen(false)}
            >
              <button
                onClick={() => {
                  setPortalsOpen(false);
                  onOpenPortalsModal();
                }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hub</span>
              </button>
              
              {/* Hub Dropdown */}
              {portalsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-64 transition-all z-50">
                  <div className="glass-panel rounded-2xl p-2 shadow-2xl border border-emerald-500/20 bg-stone-900/95 backdrop-blur-2xl space-y-1">
                    <button
                      onClick={() => {
                        setPortalsOpen(false);
                        onOpenPortalsModal();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-600/20 text-left text-xs font-bold text-stone-200 hover:text-white transition-all cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <span>{language === 'bm' ? 'Pusat Portal & Info' : 'Portal & Info Hub'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setPortalsOpen(false);
                        if (onOpenFarmMatrix) onOpenFarmMatrix();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-600/20 text-left text-xs font-bold text-stone-200 hover:text-white transition-all cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                        <span>🎟️</span>
                      </div>
                      <span>{language === 'bm' ? 'Tiket & Harga Ladang' : 'Farm Tickets & Pricing'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setPortalsOpen(false);
                        if (onOpenVendorPortal) onOpenVendorPortal();
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-600/20 text-left text-xs font-bold text-amber-300 hover:text-white transition-all cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                      <span>{language === 'bm' ? 'Portal Peniaga & Rakan Niaga' : 'Business Vendor Portal'}</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
 
            {/* Map */}
            <motion.button
              variants={itemVariants}
              onClick={() => {
                if (onOpenMap) {
                  onOpenMap();
                } else {
                  onNavigateSection('interactive-map');
                }
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{getTranslation(language, 'nav_map')}</span>
            </motion.button>


            {/* Itinerary */}
            <motion.button
              variants={itemVariants}
              onClick={() => {
                if (onOpenItinerary) {
                  onOpenItinerary();
                } else {
                  onNavigateSection('interactive-map');
                }
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <Route className="w-3.5 h-3.5 text-emerald-400" />
              <span>Itinerary</span>
            </motion.button>

            {/* Gallery */}
            <motion.button
              variants={itemVariants}
              onClick={() => {
                if (onOpenGalleryModal) {
                  onOpenGalleryModal();
                } else {
                  onNavigateSection('interactive-gallery');
                }
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>{getTranslation(language, 'nav_gallery')}</span>
            </motion.button>

          </motion.div>

          {/* Right Action Container: User Profile & PWA Install (Aligned with Nav Links) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* PWA Install Button */}
            <div className="hidden sm:flex items-center shrink-0">
              <PWAInstallButton variant="button" />
            </div>

            {/* Desktop / PC View: User Profile / Sign In Button */}
            <div className="hidden sm:flex sm:items-center shrink-0 relative" ref={userMenuRef}>
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 h-8 px-3 rounded-full bg-stone-900 border border-white/10 text-stone-200 hover:border-emerald-500/50 transition-colors cursor-pointer shadow-sm shrink-0"
                    title={currentUser.displayName}
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-emerald-400 shrink-0 bg-stone-950 flex items-center justify-center">
                      <img
                        src={currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                        alt={currentUser.displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="max-w-[80px] sm:max-w-[100px] truncate font-bold text-xs leading-none text-stone-100">
                      {currentUser.displayName}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Logged in User Menu Dropdown */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-stone-900/98 border border-emerald-500/30 shadow-2xl p-2 z-50 text-xs backdrop-blur-xl space-y-1">
                      <div className="p-2 border-b border-white/10 mb-1">
                        <p className="font-bold text-white truncate">{currentUser.displayName}</p>
                        <p className="text-[10px] text-stone-400 truncate">{currentUser.email}</p>
                      </div>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenUserDashboard();
                        }}
                        className="w-full p-2 rounded-xl text-left hover:bg-stone-800 text-stone-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-emerald-400" />
                        <span>{language === 'bm' ? 'Papan Pemuka Pelawat & Tempatan' : 'Traveler & Local Dashboard'}</span>
                      </button>

                      {(currentUser.email === 'ayahsyirah77@gmail.com' || currentUser.role === 'admin') && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onOpenAdmin();
                          }}
                          className="w-full p-2 rounded-xl text-left hover:bg-stone-800 text-red-300 hover:text-red-200 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-red-400" />
                            <span>Admin Control Room</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/20 text-red-300 font-mono font-bold">Admin</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          if (onOpenVendorPortal) onOpenVendorPortal();
                        }}
                        className="w-full p-2 rounded-xl text-left hover:bg-stone-800 text-amber-300 hover:text-amber-200 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-amber-400" />
                          <span>{language === 'bm' ? 'Portal Peniaga (Vendor)' : 'Business Vendor Portal'}</span>
                        </div>
                        {(currentUser.email === 'ayahsyirah77@gmail.com' || currentUser.role === 'admin') && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 font-mono font-bold">Full Access</span>
                        )}
                      </button>

                      <div className="border-t border-white/10 pt-1 mt-1">
                        <button
                          onClick={async () => {
                            setUserDropdownOpen(false);
                            await firebaseService.signOut();
                            window.location.reload();
                          }}
                          className="w-full p-2 rounded-xl text-left hover:bg-rose-950/50 text-rose-300 hover:text-rose-100 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-rose-400" />
                          <span>{language === 'bm' ? 'Log Keluar' : 'Sign Out'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold text-emerald-300 hover:text-white transition-colors cursor-pointer shadow-sm shrink-0"
                  title="Sign In"
                >
                  <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="leading-none whitespace-nowrap">{getTranslation(language, 'nav_signin')}</span>
                </button>
              )}
            </div>

            {/* Mobile Hamburger Menu Icon in Top-Right Corner */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
              className="lg:hidden flex items-center justify-center p-2 rounded-xl min-h-[44px] min-w-[44px] bg-stone-900/90 border border-emerald-500/30 text-emerald-400 hover:text-white hover:bg-stone-800 transition-all cursor-pointer shrink-0 shadow-lg shadow-emerald-950/60 active:scale-95"
            >
              <Menu className="w-6 h-6 text-emerald-400" />
            </button>
          </div>
        </div>
      </nav>

      {/* Graphic & Unique Mobile Slide-Out Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Semi-transparent dark backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-stone-950/85 backdrop-blur-md cursor-pointer"
              aria-hidden="true"
            />

            {/* Graphic Slide-out Drawer Container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="fixed top-0 bottom-0 left-0 h-full w-[85vw] max-w-sm bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 border-r border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.25)] p-4 sm:p-5 flex flex-col justify-between overflow-y-auto touch-pan-y z-50 text-stone-100 relative pb-8"
            >
              {/* Background ambient glow effect */}
              <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-emerald-600/15 via-teal-500/5 to-transparent pointer-events-none" />

              <div className="space-y-4 relative z-10">
                {/* Top Header of Drawer: Logo & Glowing Close 'X' Button */}
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <CamLogo size="sm" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Explorer Portal
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label="Close menu"
                    className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-2xl bg-stone-900/90 border border-emerald-500/30 text-emerald-400 hover:text-white hover:bg-emerald-950/60 transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Graphic Profile Card with Small Circular Avatar & Username Below Icon - Unlinked Display Section */}
                <div
                  className="p-4 rounded-2xl bg-stone-900/90 border border-emerald-500/35 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden select-none"
                  aria-label="User Profile Info"
                >
                  {/* Small Circle Avatar Container with Ring */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-emerald-400 via-teal-300 to-emerald-500 shadow-md shadow-emerald-950">
                      <img
                        src={
                          currentUser?.photoURL ||
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
                        }
                        alt={currentUser?.displayName || 'User Avatar'}
                        className="w-full h-full rounded-full object-cover bg-stone-950"
                      />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-stone-950 shadow-sm animate-pulse" />
                  </div>

                  {/* Username & Info Placed Below Icon */}
                  <div className="mt-2.5 space-y-0.5 w-full">
                    <div className="flex items-center justify-center gap-1.5">
                      <p className="font-bold text-sm text-stone-100 truncate">
                        {currentUser?.displayName || (language === 'bm' ? 'Pelawat' : 'Guest Visitor')}
                      </p>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-[11px] text-stone-400 truncate">
                      {currentUser?.email || (language === 'bm' ? 'Pelawat Berdaftar' : 'Registered Visitor')}
                    </p>
                  </div>
                </div>

                {/* Graphic Highland Telemetry Widget */}
                <div className="p-3 rounded-2xl bg-stone-950/80 border border-white/10 flex items-center justify-between text-xs shadow-inner">
                  <div className="flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
                    <div>
                      <span className="font-bold text-stone-200 block leading-tight">18°C Misty Climate</span>
                      <span className="text-[10px] text-stone-400 font-mono">Elevation 1,440m</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                    Live Telemetry
                  </span>
                </div>

                {/* Mobile PWA Install Prompt */}
                <div className="pt-1">
                  <PWAInstallButton variant="fullWidth" />
                </div>

                {/* Section Title */}
                <div className="pt-2 flex items-center justify-between text-[10px] font-mono font-bold text-emerald-400 tracking-wider uppercase border-b border-white/5 pb-1">
                  <span>Explore Highlands</span>
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                </div>

                {/* Vertical Graphic Card Links */}
                <nav className="space-y-2">
                  {/* 1. User Sign In / Sign Up */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (currentUser) {
                        onOpenUserDashboard();
                      } else {
                        onOpenAuth();
                      }
                    }}
                    className="w-full p-2.5 rounded-2xl flex items-center gap-3 bg-stone-900/60 hover:bg-stone-800/90 text-stone-200 hover:text-white border border-white/5 hover:border-blue-500/40 transition-all cursor-pointer text-left group shadow-md"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {currentUser ? (
                        <User className="w-4 h-4 text-blue-400" />
                      ) : (
                        <LogIn className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-stone-100 block group-hover:text-blue-300 transition-colors">
                        {currentUser
                          ? (language === 'bm' ? 'Akaun Saya' : 'My Account')
                          : (language === 'bm' ? 'Daftar / Log Masuk' : 'User Sign In / Sign Up')}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>

                  {/* 2. Directories & Masjid / Surau Link */}
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenDirectoriesModal();
                      }}
                      className="w-full p-2.5 rounded-2xl flex items-center gap-3 bg-stone-900/60 hover:bg-stone-800/90 text-stone-200 hover:text-white border border-white/5 hover:border-emerald-500/40 transition-all cursor-pointer text-left group shadow-md"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Compass className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-stone-100 block group-hover:text-emerald-300 transition-colors">
                          Directories
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" />
                    </button>

                  </div>

                  {/* 3. Hub */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenPortalsModal();
                    }}
                    className="w-full p-2.5 rounded-2xl flex items-center gap-3 bg-stone-900/60 hover:bg-stone-800/90 text-stone-200 hover:text-white border border-white/5 hover:border-teal-500/40 transition-all cursor-pointer text-left group shadow-md"
                  >
                    <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Layers className="w-4 h-4 text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-stone-100 block group-hover:text-teal-300 transition-colors">
                        Hub
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>

                  {/* 4. Map */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (onOpenMap) onOpenMap();
                    }}
                    className="w-full p-2.5 rounded-2xl flex items-center gap-3 bg-stone-900/60 hover:bg-stone-800/90 text-stone-200 hover:text-white border border-white/5 hover:border-cyan-500/40 transition-all cursor-pointer text-left group shadow-md"
                  >
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-stone-100 block group-hover:text-cyan-300 transition-colors">
                        Map
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>


                  
                  {/* 5. Itinerary */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (onOpenItinerary) onOpenItinerary();
                    }}
                    className="w-full p-2.5 rounded-2xl flex items-center gap-3 bg-stone-900/60 hover:bg-stone-800/90 text-stone-200 hover:text-white border border-white/5 hover:border-emerald-500/40 transition-all cursor-pointer text-left group shadow-md"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Route className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-stone-100 block group-hover:text-emerald-300 transition-colors">
                        Itinerary Planner
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>

                  {/* 6. Gallery */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (onOpenGalleryModal) {
                        onOpenGalleryModal();
                      } else {
                        onNavigateSection('interactive-gallery');
                      }
                    }}
                    className="w-full p-2.5 rounded-2xl flex items-center gap-3 bg-stone-900/60 hover:bg-stone-800/90 text-stone-200 hover:text-white border border-white/5 hover:border-rose-500/40 transition-all cursor-pointer text-left group shadow-md"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Camera className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-stone-100 block group-hover:text-rose-300 transition-colors">
                        Gallery
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>

                  {/* 7. Chat */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (onOpenChat) {
                        onOpenChat();
                      } else {
                        onNavigateSection('interactive-gallery');
                      }
                    }}
                    className="w-full p-2.5 rounded-2xl flex items-center gap-3 bg-stone-900/60 hover:bg-stone-800/90 text-stone-200 hover:text-white border border-white/5 hover:border-amber-500/40 transition-all cursor-pointer text-left group shadow-md"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-stone-100 block group-hover:text-amber-300 transition-colors">
                        Chat
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>

                  {/* 8. AI Guide */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAi();
                    }}
                    className="w-full p-2.5 rounded-2xl flex items-center gap-3 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-white border border-emerald-500/40 transition-all cursor-pointer text-left group shadow-md"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Sparkles className="w-4 h-4 text-emerald-300 animate-spin duration-3000" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-emerald-200 block group-hover:text-white transition-colors">
                        AI Guide
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>

                  {/* 9. Business Vendor Portal */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (onOpenVendorPortal) onOpenVendorPortal();
                    }}
                    className="w-full p-2.5 rounded-2xl flex items-center gap-3 bg-amber-950/30 hover:bg-amber-900/50 text-amber-300 hover:text-white border border-amber-500/30 transition-all cursor-pointer text-left group shadow-md"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Store className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-200 block group-hover:text-white transition-colors">
                          Business Vendor Portal
                        </span>
                        {(currentUser?.email === 'ayahsyirah77@gmail.com' || currentUser?.role === 'admin') && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 font-mono font-bold">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-all shrink-0" />
                  </button>

                  {/* 10. Admin Control Room (if admin) */}
                  {(currentUser?.email === 'ayahsyirah77@gmail.com' || currentUser?.role === 'admin') && (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full p-2.5 rounded-2xl flex items-center gap-3 bg-red-950/30 hover:bg-red-900/50 text-red-300 hover:text-white border border-red-500/30 transition-all cursor-pointer text-left group shadow-md"
                    >
                      <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <ShieldCheck className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-red-200 block group-hover:text-white transition-colors">
                            Admin Control Room
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-500/20 text-red-300 font-mono font-bold">
                            Super
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-all shrink-0" />
                    </button>
                  )}

                  {currentUser && (
                    <button
                      onClick={async () => {
                        setIsMobileMenuOpen(false);
                        await firebaseService.signOut();
                        window.location.reload();
                      }}
                      className="w-full mt-2 p-2.5 rounded-2xl flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer text-xs font-bold shadow-md"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{language === 'bm' ? 'Log Keluar dari Akaun' : 'Sign Out of Account'}</span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Graphic Drawer Footer Area with Language Switcher */}
              <div className="pt-4 mt-auto border-t border-white/10 space-y-3 relative z-10">
                <div className="flex items-center justify-between p-2 rounded-2xl bg-stone-900/90 border border-white/10">
                  <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5 pl-2">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Language</span>
                  </span>
                  <div className="flex items-center p-0.5 rounded-xl bg-stone-950 border border-white/10 text-xs font-bold">
                    <button
                      onClick={() => onLanguageChange('en')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        language === 'en'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => onLanguageChange('bm')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        language === 'bm'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      BM
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[11px] text-stone-500 font-mono">
                    Cameron Highlands Portal v2.5 • Pahang, Malaysia
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};