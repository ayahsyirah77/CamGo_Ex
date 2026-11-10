import React, { useState, useMemo } from 'react';
import { Place, Language } from '../types';
import {
  Car,
  Zap,
  MapPin,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Search,
  Navigation,
  ShieldCheck,
  BatteryCharging,
  Clock,
  Info,
  Users,
  Eye,
  Filter,
  ArrowUpRight,
  Loader2,
  RotateCcw
} from 'lucide-react';

export interface ParkingEvHub {
  id: string;
  name: string;
  nameBm?: string;
  township: string;
  totalBays: number;
  availableBays: number;
  status: 'Critical / Nearly Full' | 'High Demand' | 'Moderate' | 'Good Availability' | 'Locals Bypass Recommended';
  evChargers: {
    type: string;
    powerKw: number;
    total: number;
    available: number;
    operator: string;
    plugType: string;
  }[];
  nearbySpots: string[];
  localTipEn: string;
  localTipBm: string;
  isLocalBypassZone?: boolean;
  coordinates: { lat: number; lng: number };
}

interface SmartParkingEvModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  places: Place[];
  onSelectOnMap?: (lat: number, lng: number, title: string) => void;
}

const mapPlaceToParkingEvHub = (place: Place): ParkingEvHub => {
  const isEv = place.subCategory === 'fuel_ev_charging' || 
               place.tags.some(t => {
                 const low = t.toLowerCase();
                 return low.includes('ev') || low.includes('pengecas') || low.includes('charging') || low.includes('charger');
               });
  
  // Use real data from Admin if available, otherwise default to 0 (as per user "leave empty" request)
  let totalBays = place.totalBays ?? 0;
  let availableBays = place.availableBays ?? 0;

  // Map parkingStatus to ParkingEvHub status for visual feedback
  let status: ParkingEvHub['status'] = 'Moderate';
  
  if (place.parkingStatus === 'private_available') {
    status = 'Good Availability';
  } else if (place.parkingStatus === 'street_busy') {
    status = 'High Demand';
  } else if (place.parkingStatus === 'valet_only') {
    status = 'Moderate';
  }

  const availabilityRatio = totalBays > 0 ? availableBays / totalBays : 0;
  if (totalBays > 0 && availabilityRatio < 0.1) status = 'Critical / Nearly Full';

  // EV Chargers
  const evChargers: ParkingEvHub['evChargers'] = [];
  if (isEv) {
    const powerTag = place.tags.find(t => t.includes('kW'));
    const power = powerTag ? parseInt(powerTag.match(/\d+/)?.[0] || '22') : 22;
    
    evChargers.push({
      type: power > 50 ? 'DC Fast Charger' : 'AC Destination Charger',
      powerKw: power,
      total: 2, // These could also be made dynamic later if needed
      available: Math.min(2, availableBays > 0 ? 1 : 0), // Basic logic: if bays available, maybe 1 charger is too
      operator: 'CamGo Verified Hub',
      plugType: power > 50 ? 'CCS2' : 'Type 2'
    });
  }

  return {
    id: place.id,
    name: place.name,
    nameBm: place.nameBm,
    township: place.township,
    totalBays,
    availableBays,
    status: (place.tags.some(t => t.toLowerCase().includes('bypass')) ? 'Locals Bypass Recommended' : status) as any,
    evChargers,
    nearbySpots: place.tags.slice(0, 3),
    localTipEn: place.description,
    localTipBm: place.descriptionBm || place.description,
    isLocalBypassZone: place.tags.some(t => t.toLowerCase().includes('bypass') || t.toLowerCase().includes('quiet')),
    coordinates: place.coordinates
  };
};

export const SmartParkingEvModal: React.FC<SmartParkingEvModalProps> = ({
  isOpen,
  onClose,
  language,
  places,
  onSelectOnMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ev' | 'bypass' | 'available'>('all');
  const [selectedTownship, setSelectedTownship] = useState<string>('all');

  const realHubs = useMemo(() => {
    return places
      .filter(p => {
        // Strict filter to ensure we only show intentional parking/EV hubs
        const isEvSubcat = p.subCategory === 'fuel_ev_charging';
        const hasIntentionalTag = p.tags.some(t => {
          const low = t.toLowerCase();
          return low === 'smart parking' || low === 'ev charging' || low === 'public parking complex' || low === 'ev fast charger';
        });
        const hasIntentionalName = p.name.toLowerCase().includes('parking complex') || 
                                  p.name.toLowerCase().includes('charging station') ||
                                  p.name.toLowerCase().includes('ev station');
        
        return isEvSubcat || hasIntentionalTag || hasIntentionalName;
      })
      .map(mapPlaceToParkingEvHub);
  }, [places]);

  if (!isOpen) return null;

  const q = searchQuery.toLowerCase().trim();

  const filteredHubs = realHubs.filter((hub) => {
    // Search query
    const matchSearch =
      !q ||
      hub.name.toLowerCase().includes(q) ||
      (hub.nameBm && hub.nameBm.toLowerCase().includes(q)) ||
      hub.township.toLowerCase().includes(q) ||
      hub.nearbySpots.some((s) => s.toLowerCase().includes(q));

    // Township filter
    const matchTown = selectedTownship === 'all' || hub.township === selectedTownship;

    // Type filter
    let matchType = true;
    if (filterType === 'ev') {
      matchType = hub.evChargers.length > 0 && hub.evChargers.some((c) => c.available > 0);
    } else if (filterType === 'bypass') {
      matchType = !!hub.isLocalBypassZone;
    } else if (filterType === 'available') {
      matchType = hub.availableBays > 30;
    }

    return matchSearch && matchTown && matchType;
  });

  const totalAvailableBays = realHubs.reduce((acc, h) => acc + h.availableBays, 0);
  const totalEvPorts = realHubs.reduce(
    (acc, h) => acc + h.evChargers.reduce((cAcc, c) => cAcc + c.available, 0),
    0
  );

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="min-h-full flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
        <div
          className="w-full max-w-5xl h-[92vh] sm:h-[90vh] bg-stone-900 border border-emerald-500/40 rounded-3xl shadow-2xl flex flex-col min-h-0 overflow-hidden relative my-auto shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-stone-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Sticky Header with Visible Close Button */}
        <div className="shrink-0 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-white/10 bg-stone-900/98 backdrop-blur-md z-30 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <span className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 shadow-inner">
              <Car className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
                <span className="text-[8.5px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                  REAL-TIME TELEMETRY
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-bold">
                  ⚡ EV &amp; PARKING FINDER
                </span>
              </div>
              <h2 className="text-[11px] min-[360px]:text-xs sm:text-lg font-heading font-black text-stone-100 leading-tight break-words sm:truncate">
                {language === 'bm'
                  ? 'Carian Petak Letak Kereta & Stesen Pengecas EV'
                  : 'Smart Parking & EV Charging Bay Finder'}
              </h2>
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

        {/* Scrollable Main Content */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-5 touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Dual Benefit Banner (Locals vs Tourists) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Benefit for Locals */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-stone-950 to-stone-900 border border-emerald-500/30 shadow-xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{language === 'bm' ? 'Manfaat Penduduk Tempatan:' : 'Beneficial for Locals:'}</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                {language === 'bm'
                  ? 'Membantu penduduk elak zon komersial sesak sepenuhnya waktu musim cuti sekolah & hujung minggu.'
                  : 'Helps residents avoid crowded commercial zones entirely during peak holiday seasons with verified Local Bypass Hubs.'}
              </p>
            </div>

            {/* Benefit for Tourists */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-950/80 via-stone-950 to-stone-900 border border-teal-500/30 shadow-xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{language === 'bm' ? 'Manfaat Pelancong:' : 'Beneficial for Tourists:'}</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                {language === 'bm'
                  ? 'Menghilangkan tekanan carian parking 30 minit berhampiran kedai steamboat & ladang strawberi popular.'
                  : 'Eliminates the stressful 30-minute search for a parking spot near popular steamboat restaurants or strawberry farms.'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Counter Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-stone-950 border border-white/10 space-y-0.5">
              <span className="text-[10px] text-stone-400 block uppercase font-sans font-bold">Total Monitored Hubs</span>
              <span className="text-lg font-black text-stone-100">{realHubs.length} Zones</span>
            </div>
            <div className="p-3 rounded-2xl bg-stone-950 border border-emerald-500/30 space-y-0.5">
              <span className="text-[10px] text-emerald-400 block uppercase font-sans font-bold">Available Parking Bays</span>
              <span className="text-lg font-black text-emerald-400">{totalAvailableBays} Bays Free</span>
            </div>
            <div className="p-3 rounded-2xl bg-stone-950 border border-amber-500/30 space-y-0.5">
              <span className="text-[10px] text-amber-400 block uppercase font-sans font-bold">Available EV Ports</span>
              <span className="text-lg font-black text-amber-300">{totalEvPorts} Chargers Ready</span>
            </div>
            <div className="p-3 rounded-2xl bg-stone-950 border border-cyan-500/30 space-y-0.5">
              <span className="text-[10px] text-cyan-400 block uppercase font-sans font-bold">Local Bypass Hubs</span>
              <span className="text-lg font-black text-cyan-300">{realHubs.filter(h => h.isLocalBypassZone).length} Quiet Zones</span>
            </div>
          </div>

          {/* Municipal Parking Policy & Rates (MDCH) */}
          <div className="p-4 rounded-3xl bg-stone-950/80 border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-stone-100 uppercase tracking-tight">
                  {language === 'bm' ? 'Polisi & Kadar Parkir Majlis (MDCH)' : 'Municipal Parking Policy & Rates (MDCH)'}
                </h4>
                <p className="text-[10px] text-stone-400 font-mono">Official Cameron Highlands Parking Regulations</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Timing & Basic Rate */}
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider">Operating Hours</span>
                    <span className="text-xs text-stone-200 font-medium">Monday to Sunday (including public holidays)</span>
                    <span className="text-xs font-black text-amber-400 block">8:00 AM – 6:00 PM</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Car className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider">Standard Hourly Rate</span>
                    <span className="text-sm font-black text-white">RM 0.60 <span className="text-[10px] text-stone-400">/ hour</span></span>
                  </div>
                </div>
              </div>

              {/* Passes & Payment */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 p-2.5 rounded-xl bg-stone-900 border border-white/5">
                  <div>
                    <span className="text-[9px] font-bold text-stone-500 uppercase block">Daily Pass</span>
                    <span className="text-xs font-black text-white">RM 6.00</span>
                  </div>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-stone-500 uppercase block">Monthly Pass</span>
                    <span className="text-xs font-black text-white">RM 80.00</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider">Payment Methods</span>
                    <p className="text-[11px] text-stone-300 leading-snug">
                      Processed digitally via <span className="text-cyan-400 font-bold">PahangGo App</span> or physical scratch coupons from local vendors.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enforcement Warning */}
            <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest block mb-0.5">Enforcement & Penalties</span>
                <p className="text-[11px] text-rose-200/80 leading-relaxed">
                  Failing to display valid coupons or maintain an active digital session results in municipal compounds ranging between <span className="text-rose-400 font-bold font-mono">RM 30.00 – RM 300.00</span>.
                </p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20 w-fit">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Tracking required 8 AM – 6 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Controls Bar */}
          <div className="p-3.5 rounded-2xl bg-stone-950 border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    language === 'bm'
                      ? 'Cari kawasan, steamboat, pasar malam, EV charger...'
                      : 'Search zone, steamboat strip, strawberry farm, EV...'
                  }
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-900 border border-white/15 text-xs text-stone-100 placeholder-stone-400 outline-none focus:border-emerald-400 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Township Dropdown */}
              <div className="w-full sm:w-48">
                <select
                  value={selectedTownship}
                  onChange={(e) => setSelectedTownship(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-stone-900 border border-white/15 text-xs font-semibold text-stone-200 outline-none cursor-pointer"
                >
                  <option value="all">{language === 'bm' ? 'Semua Pekan' : 'All Townships'}</option>
                  <option value="Brinchang">Brinchang</option>
                  <option value="Tanah Rata">Tanah Rata</option>
                  <option value="Kea Farm">Kea Farm</option>
                  <option value="Kampung Raja">Kampung Raja</option>
                  <option value="Tringkap">Tringkap</option>
                  <option value="Ringlet">Ringlet</option>
                </select>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
              <span className="text-[10px] font-mono text-stone-400 uppercase mr-1">Filter View:</span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-stone-900 text-stone-300 hover:text-white border border-white/10'
                }`}
              >
                All Hubs ({realHubs.length})
              </button>
              <button
                onClick={() => setFilterType('ev')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'ev'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-stone-900 text-stone-300 hover:text-white border border-white/10'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>EV Fast Charging Available</span>
              </button>
              <button
                onClick={() => setFilterType('bypass')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'bypass'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-stone-900 text-stone-300 hover:text-white border border-white/10'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                <span>Locals Quiet Bypass Hubs</span>
              </button>
              <button
                onClick={() => setFilterType('available')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'available'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-stone-900 text-stone-300 hover:text-white border border-white/10'
                }`}
              >
                Ample Free Bays (&gt;30 Free)
              </button>
            </div>
          </div>

          {/* Hub Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHubs.length === 0 ? (
              <div className="col-span-full p-8 text-center rounded-3xl bg-stone-950 border border-white/10 space-y-2">
                <Car className="w-8 h-8 text-stone-500 mx-auto" />
                <p className="text-sm font-bold text-stone-300">
                  {realHubs.length === 0 
                    ? (language === 'bm' ? 'Tiada entri parking/EV yang dicipta oleh Admin ditemui dalam direktori.' : 'No Admin-created parking/EV entries found in directories.')
                    : 'No parking hubs match your selected filter.'}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                    setSelectedTownship('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredHubs.map((hub) => {
                const availabilityRatio = hub.availableBays / hub.totalBays;
                const isCritical = hub.availableBays < 20;

                return (
                  <div
                    key={hub.id}
                    className="p-4 sm:p-5 rounded-3xl bg-stone-950/90 border border-white/10 hover:border-emerald-500/40 transition-all shadow-2xl flex flex-col justify-between gap-3 relative overflow-hidden group"
                  >
                    {/* Top Row: Township & Status */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                            {hub.township}
                          </span>
                          {hub.isLocalBypassZone && (
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded-full border border-teal-500/30 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-teal-400" />
                              <span>Local Bypass</span>
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                              : hub.availableBays < 50
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCritical ? 'bg-rose-500' : hub.availableBays < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span>{hub.status}</span>
                        </span>
                      </div>

                      {/* Hub Title */}
                      <h3 className="text-base font-heading font-black text-stone-100 group-hover:text-emerald-300 transition-colors">
                        {language === 'bm' && hub.nameBm ? hub.nameBm : hub.name}
                      </h3>

                      {/* Availability Meter */}
                      <div className="p-3 rounded-2xl bg-stone-900 border border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-stone-300 flex items-center gap-1.5">
                            <Car className="w-4 h-4 text-emerald-400" />
                            <span>Parking Availability:</span>
                          </span>
                          <span className={isCritical ? 'text-rose-400 font-mono' : 'text-emerald-400 font-mono'}>
                            {hub.availableBays} / {hub.totalBays} Bays Free
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-stone-950 overflow-hidden border border-white/5">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isCritical ? 'bg-rose-500' : hub.availableBays < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.round(availabilityRatio * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* EV Charger Details */}
                      {hub.evChargers.length > 0 && (
                        <div className="p-3 rounded-2xl bg-stone-900/80 border border-amber-500/20 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                            <span className="flex items-center gap-1.5">
                              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                              <span>EV Charging Stations:</span>
                            </span>
                            <span className="text-[10px] font-mono bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                              Verified Status
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {hub.evChargers.map((c, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-xs p-2 rounded-xl bg-stone-950 border border-white/5"
                              >
                                <div>
                                  <div className="font-bold text-stone-200">
                                    {c.type} ({c.powerKw}kW)
                                  </div>
                                  <div className="text-[10px] text-stone-400 font-mono">
                                    {c.operator} • {c.plugType}
                                  </div>
                                </div>
                                <div className="text-right font-mono">
                                  <span
                                    className={`font-bold block ${
                                      c.available > 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {c.available} / {c.total} Free
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Nearby Spots Badges */}
                      {hub.nearbySpots.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="text-[10px] text-stone-500 font-bold uppercase mr-1">Nearby:</span>
                          {hub.nearbySpots.map((spot, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-stone-900 text-stone-300 border border-white/5"
                            >
                              {spot}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Local Insider Tip Box */}
                      <div className="p-3 rounded-2xl bg-emerald-950/25 border border-emerald-500/25 text-xs text-stone-200 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <strong className="text-emerald-400 block font-bold mb-0.5">
                            {language === 'bm' ? 'Nasihat Tempatan:' : 'Local Insider Tip:'}
                          </strong>
                          <span>{language === 'bm' ? hub.localTipBm : hub.localTipEn}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Bar */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
                      <button
                        onClick={() => {
                          onClose();
                          if (onSelectOnMap) {
                            onSelectOnMap(hub.coordinates.lat, hub.coordinates.lng, hub.name);
                          } else {
                            window.dispatchEvent(
                              new CustomEvent('focus-hotspot-on-map', {
                                detail: [hub.coordinates.lat, hub.coordinates.lng],
                              })
                            );
                            window.dispatchEvent(new CustomEvent('open-map-modal'));
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{language === 'bm' ? 'Lihat di Peta GPS' : 'View on GPS Map'}</span>
                      </button>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${hub.coordinates.lat},${hub.coordinates.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors flex items-center gap-1 cursor-pointer font-bold shrink-0"
                        title="Open in Google Maps"
                      >
                        <Navigation className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Directions</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
