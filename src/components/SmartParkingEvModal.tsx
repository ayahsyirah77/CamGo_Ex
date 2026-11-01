import React, { useState } from 'react';
import { Language } from '../types';
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

export const PARKING_EV_HUBS: ParkingEvHub[] = [
  {
    id: 'brinchang-steamboat-strip',
    name: 'Brinchang Steamboat & Commercial Strip',
    nameBm: 'Jalur Kedai Steamboat & Komersial Brinchang',
    township: 'Brinchang',
    totalBays: 180,
    availableBays: 18,
    status: 'High Demand',
    evChargers: [
      { type: 'DC Fast Charger', powerKw: 60, total: 2, available: 1, operator: 'Gentari', plugType: 'CCS2' },
      { type: 'AC Destination Charger', powerKw: 22, total: 2, available: 2, operator: 'ChargeEV', plugType: 'Type 2' },
    ],
    nearbySpots: ['Charcoal Steamboat Row', 'Brinchang Town Square', 'Strawberry Parks'],
    localTipEn: 'Peak congestion 6:30 PM - 9:30 PM for dinner. Park at MDCH Multi-Storey Complex 200m away to save 20 mins search time!',
    localTipBm: 'Kesesakan puncak 6:30 PM - 9:30 PM waktu makan malam. Letak kereta di Kompleks Bertingkat MDCH (200m) untuk jimat 20 minit!',
    coordinates: { lat: 4.4912, lng: 101.3888 },
  },
  {
    id: 'mdch-multistorey-brinchang',
    name: 'MDCH Multi-Storey Covered Complex',
    nameBm: 'Kompleks Bertingkat Berbumbung MDCH Brinchang',
    township: 'Brinchang',
    totalBays: 320,
    availableBays: 115,
    status: 'Good Availability',
    evChargers: [
      { type: 'AC Charger', powerKw: 11, total: 4, available: 3, operator: 'ChargeEV', plugType: 'Type 2' },
    ],
    nearbySpots: ['Brinchang Night Market (Weekend)', 'Public Restrooms', 'Municipal Square'],
    localTipEn: 'Best covered alternative for night market & steamboat visitors. 24/7 CCTV & Auto-gate Touch n Go payment.',
    localTipBm: 'Pilihan berbumbung terbaik untuk pengunjung pasar malam & steamboat. CCTV 24/7 & bayaran Touch n Go automatik.',
    isLocalBypassZone: true,
    coordinates: { lat: 4.4925, lng: 101.3895 },
  },
  {
    id: 'cameron-centrum-mall',
    name: 'Cameron Centrum Underground Hub',
    nameBm: 'Pusat Tempat Letak Kereta Bawah Tanah Cameron Centrum',
    township: 'Brinchang',
    totalBays: 450,
    availableBays: 210,
    status: 'Good Availability',
    evChargers: [
      { type: 'DC Ultra Fast Charger', powerKw: 120, total: 4, available: 3, operator: 'Gentari / EV Connection', plugType: 'CCS2' },
      { type: 'AC Destination Charger', powerKw: 22, total: 6, available: 5, operator: 'Tesla / JomCharge', plugType: 'Type 2' },
    ],
    nearbySpots: ['FamilyMart', 'Coffee Bean', 'Centrum Mall', 'Boutique Hotels'],
    localTipEn: 'Largest underground parking garage in highlands with ultra-fast 120kW DC charging. Ideal during heavy rain or mist.',
    localTipBm: 'Garaj bawah tanah terbesar di tanah tinggi dengan pengecas pantas DC 120kW. Sangat sesuai waktu hujan lebat atau kabut.',
    isLocalBypassZone: true,
    coordinates: { lat: 4.4865, lng: 101.3872 },
  },
  {
    id: 'kea-farm-strawberry-ridge',
    name: 'Kea Farm Market & Strawberry Ridge',
    nameBm: 'Pasar Kea Farm & Bukit Strawberi',
    township: 'Kea Farm',
    totalBays: 140,
    availableBays: 12,
    status: 'Critical / Nearly Full',
    evChargers: [
      { type: 'AC Charger', powerKw: 22, total: 2, available: 1, operator: 'JomCharge', plugType: 'Type 2' },
    ],
    nearbySpots: ['Kea Farm Produce Market', 'Raju Hill Strawberry', 'Rose Centre'],
    localTipEn: 'Extremely busy on weekends 10 AM - 4 PM. Locals advice: Park at Tringkap Agro Hub 1.2km north & avoid Kea Farm bottle-neck.',
    localTipBm: 'Sangat sesak pada hujung minggu 10 AM - 4 PM. Nasihat penduduk tempatan: Letak di Hub Tringkap 1.2km ke utara.',
    coordinates: { lat: 4.5035, lng: 101.4128 },
  },
  {
    id: 'tanah-rata-commercial-square',
    name: 'Tanah Rata Town Commercial Square',
    nameBm: 'Dataran Komersial Pekan Tanah Rata',
    township: 'Tanah Rata',
    totalBays: 220,
    availableBays: 64,
    status: 'Moderate',
    evChargers: [
      { type: 'DC Rapid Charger', powerKw: 100, total: 2, available: 2, operator: 'Gentari', plugType: 'CCS2' },
      { type: 'AC Charger', powerKw: 22, total: 4, available: 3, operator: 'ChargeEV', plugType: 'Type 2' },
    ],
    nearbySpots: ['Maybank & CIMB', 'Tanah Rata Food Court', 'Central Bus Terminal', 'Starbucks'],
    localTipEn: 'High turn-over rate. Rapid 100kW EV charger allows 20-80% top up in 25 mins while grabbing breakfast or coffee.',
    localTipBm: 'Kadar pertukaran petak tinggi. Pengecas pantas 100kW membolehkan cas 20-80% dalam 25 minit sambil bersarapan.',
    coordinates: { lat: 4.4715, lng: 101.3805 },
  },
  {
    id: 'kampung-raja-local-bypass',
    name: 'Kampung Raja Northern Bypass Hub',
    nameBm: 'Pusat Pintasan Utara Kampung Raja',
    township: 'Kampung Raja',
    totalBays: 150,
    availableBays: 98,
    status: 'Locals Bypass Recommended',
    evChargers: [
      { type: 'AC Charger', powerKw: 22, total: 2, available: 2, operator: 'ChargeEV', plugType: 'Type 2' },
    ],
    nearbySpots: ['Northern Gateway Produce Market', 'Local Kopitiam Row', 'Orchid Nursery'],
    localTipEn: 'Locals preferred hub! Bypasses 90% of tourist jams while providing direct access to fresh farm-direct strawberry & corn prices.',
    localTipBm: 'Pilihan utama penduduk tempatan! Elak 90% kesesakan pelancong sambil mendapat akses terus harga pasar segar ladang.',
    isLocalBypassZone: true,
    coordinates: { lat: 4.5683, lng: 101.4087 },
  },
  {
    id: 'tringkap-agro-hub',
    name: 'Tringkap Agro Valley Exchange',
    nameBm: 'Pertukaran Lembah Agro Tringkap',
    township: 'Tringkap',
    totalBays: 110,
    availableBays: 45,
    status: 'Moderate',
    evChargers: [
      { type: 'AC Charger', powerKw: 11, total: 2, available: 2, operator: 'JomCharge', plugType: 'Type 2' },
    ],
    nearbySpots: ['Tringkap Vegetable Stalls', 'Bee Farm', 'Rose Valley Trail'],
    localTipEn: 'Easy roadside parking for quick farm produce shopping without entering crowded Kea Farm queues.',
    localTipBm: 'Tempat letak tepi jalan mudah untuk beli hasil ladang tanpa beratur panjang di Kea Farm.',
    coordinates: { lat: 4.518, lng: 101.418 },
  },
  {
    id: 'ringlet-southern-gateway',
    name: 'Ringlet Southern Gateway Station',
    nameBm: 'Stesen Pintu Selatan Ringlet',
    township: 'Ringlet',
    totalBays: 160,
    availableBays: 82,
    status: 'Moderate',
    evChargers: [
      { type: 'DC Fast Charger', powerKw: 50, total: 2, available: 1, operator: 'Gentari / Petronas', plugType: 'CCS2' },
    ],
    nearbySpots: ['Petronas & Shell Ringlet', 'Ringlet Market', 'Lakehouse Turn-off'],
    localTipEn: 'First EV charging & restroom stop after ascending FT 59 Tapah mountain pass. Essential sanity check point.',
    localTipBm: 'Hentian pengecasan EV & tandas pertama selepas mendaki Jalan Tapah FT 59. Sangat sesuai untuk rehat seketika.',
    coordinates: { lat: 4.4147, lng: 101.382 },
  },
];

interface SmartParkingEvModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSelectOnMap?: (lat: number, lng: number, title: string) => void;
}

export const SmartParkingEvModal: React.FC<SmartParkingEvModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectOnMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ev' | 'bypass' | 'available'>('all');
  const [selectedTownship, setSelectedTownship] = useState<string>('all');

  if (!isOpen) return null;

  const q = searchQuery.toLowerCase().trim();

  const filteredHubs = PARKING_EV_HUBS.filter((hub) => {
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

  const totalAvailableBays = PARKING_EV_HUBS.reduce((acc, h) => acc + h.availableBays, 0);
  const totalEvPorts = PARKING_EV_HUBS.reduce(
    (acc, h) => acc + h.evChargers.reduce((cAcc, c) => cAcc + c.available, 0),
    0
  );

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[92vh] sm:h-[90vh] bg-stone-900 border border-emerald-500/40 rounded-3xl shadow-2xl flex flex-col min-h-0 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-stone-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Sticky Header with Visible Close Button */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-stone-900/98 backdrop-blur-md z-30">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 shadow-inner">
              <Car className="w-5 h-5 animate-pulse" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  REAL-TIME TELEMETRY
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-bold">
                  ⚡ EV &amp; PARKING FINDER
                </span>
              </div>
              <h2 className="text-sm sm:text-lg font-heading font-black text-stone-100 truncate">
                {language === 'bm'
                  ? 'Carian Petak Letak Kereta & Stesen Pengecas EV'
                  : 'Smart Parking & EV Charging Bay Finder'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 shrink-0 min-h-[44px] min-w-[44px] justify-center"
          >
            <X className="w-5 h-5" />
            <span className="font-mono">{language === 'bm' ? 'Tutup' : 'Close'}</span>
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
              <span className="text-lg font-black text-stone-100">{PARKING_EV_HUBS.length} Zones</span>
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
              <span className="text-lg font-black text-cyan-300">3 Quiet Zones</span>
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
                All Hubs ({PARKING_EV_HUBS.length})
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
                <p className="text-sm font-bold text-stone-300">No parking hubs match your selected filter.</p>
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
  );
};
