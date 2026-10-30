// TrafficWidget.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrafficAlert, Language } from '../types';
import {
  Car,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  Navigation,
  RefreshCw,
  TrendingUp,
  Compass,
  Copy,
  Check,
  CloudFog,
  MapPin,
  ExternalLink,
  Info,
  ArrowUpRight,
  X,
  Mountain,
  Fuel,
  AlertTriangle,
} from 'lucide-react';

interface TrafficWidgetProps {
  alerts: TrafficAlert[];
  language: Language;
  onSelectRouteOnMap?: (roadName: string, coords?: [number, number]) => void;
}

const ALERT_COORDINATES: Record<string, [number, number]> = {
  'alert-kea-farm-gridlock': [4.5028, 101.4072],
  'alert-tapah-lata-iskandar': [4.331, 101.328],
  'alert-golden-hills-pasarmalam': [4.4815, 101.3855],
  'alert-simpang-pulai-pos-slim': [4.56, 101.22],
  'alert-sg-koyan-csr': [4.351, 101.528],
  'alert-tanah-rata-roundabout': [4.4715, 101.3805],
  'alert-blue-valley-merge': [4.5683, 101.4087],
};

const ALERT_PREDICTIVE_DATA: Record<
  string,
  {
    currentSpeedKmh: number;
    corridorCode: string;
    corridorName: string;
    trendEn: string;
    trendBm: string;
    expectedPeak: string;
    clearanceTime: string;
    weatherRiskEn: string;
    weatherRiskBm: string;
  }
> = {
  'alert-kea-farm-gridlock': {
    currentSpeedKmh: 7,
    corridorCode: 'CENTRAL-01',
    corridorName: 'Highland Central Spine',
    trendEn: 'Severe parking spillover. AI predicts queue surge (+15m delay) between 11:30 AM - 3:30 PM.',
    trendBm: 'Parkir melimpah. AI meramal lonjakan kelewatan (+15m) antara 11:30 pagi - 3:30 petang.',
    expectedPeak: '11:30 AM - 3:30 PM',
    clearanceTime: 'After 5:30 PM',
    weatherRiskEn: 'Passing afternoon shower; wet road surface.',
    weatherRiskBm: 'Hujan petang berkala; permukaan jalan basah.',
  },
  'alert-tapah-lata-iskandar': {
    currentSpeedKmh: 20,
    corridorCode: 'FT 59',
    corridorName: 'Tapah Corridor',
    trendEn: 'Slow crawl through 300+ switchbacks. Cloud mist expected at 2:30 PM will reduce speed by 35%.',
    trendBm: 'Pergerakan perlahan di 300+ selekoh tajam. Kabus tebal jam 2:30 petang dijangka kurangkan kelajuan 35%.',
    expectedPeak: '10:00 AM - 4:00 PM',
    clearanceTime: 'After 6:00 PM',
    weatherRiskEn: 'Dense mountain fog & wet slippery asphalt.',
    weatherRiskBm: 'Kabus tebal gunung & permukaan asfalt licin.',
  },
  'alert-golden-hills-pasarmalam': {
    currentSpeedKmh: 16,
    corridorCode: 'FT 59',
    corridorName: 'Tanah Rata – Brinchang',
    trendEn: 'Weekend Pasar Malam rush. Heavy arrival queues building rapidly from 4:30 PM onward.',
    trendBm: 'Tumpuan Pasar Malam hujung minggu. Barisan kenderaan meningkat pantas mulai jam 4:30 petang.',
    expectedPeak: '5:00 PM - 8:30 PM',
    clearanceTime: 'After 9:30 PM',
    weatherRiskEn: 'Cool evening 16°C; roadside parking congestion.',
    weatherRiskBm: 'Suhu dingin 16°C; kenderaan parkir tepi jalan.',
  },
  'alert-simpang-pulai-pos-slim': {
    currentSpeedKmh: 42,
    corridorCode: 'FT 185',
    corridorName: 'Simpang Pulai Corridor',
    trendEn: 'Steady ascent with heavy vegetable lorries on steep inclines. Passing lanes clear.',
    trendBm: 'Pendakian stabil dengan lori sayur perlahan di cerun mendaki. Lorong memotong lancar.',
    expectedPeak: '8:00 AM - 11:00 AM (Harvest)',
    clearanceTime: 'Continuous steady flow',
    weatherRiskEn: 'Good road grip; gentle curves.',
    weatherRiskBm: 'Cengkaman jalan baik; selekoh beralun.',
  },
  'alert-sg-koyan-csr': {
    currentSpeedKmh: 88,
    corridorCode: 'FT 102',
    corridorName: 'Central Spine Road (CSR)',
    trendEn: 'Fastest free-flowing corridor. Zero bottleneck delays; recommended bypass for NSE travelers.',
    trendBm: 'Laluan terpantas tanpa sebarang kesesakan. Disyorkan untuk mengelak kesesakan PLUS.',
    expectedPeak: 'Zero congestion expected',
    clearanceTime: 'Free flow 24/7',
    weatherRiskEn: 'Pristine modern pavement with high visibility.',
    weatherRiskBm: 'Asfalt moden berkualiti tinggi dan cerah.',
  },
  'alert-tanah-rata-roundabout': {
    currentSpeedKmh: 18,
    corridorCode: 'TOWN-01',
    corridorName: 'Tanah Rata Town Center',
    trendEn: 'Commercial lunch and bank hours traffic. Delays expected to clear after 2:30 PM.',
    trendBm: 'Trafik makan tengah hari dan urusan bank. Dijangka lancar semula selepas 2:30 petang.',
    expectedPeak: '12:00 PM - 2:00 PM',
    clearanceTime: 'After 2:30 PM',
    weatherRiskEn: 'Urban highland traffic; taxi terminal merge.',
    weatherRiskBm: 'Trafik bandar tanah tinggi; pertemuan terminal teksi.',
  },
  'alert-blue-valley-merge': {
    currentSpeedKmh: 32,
    corridorCode: 'JUNCTION-02',
    corridorName: 'FT 185 x FT 102 Junction',
    trendEn: 'Dual-corridor convergence traffic. Moderate delays merging into Kampung Raja.',
    trendBm: 'Pertemuan dua koridor utama. Sedikit perlahan semasa masuk ke Kampung Raja.',
    expectedPeak: '1:00 PM - 4:00 PM',
    clearanceTime: 'After 5:00 PM',
    weatherRiskEn: 'Mountain mist reduces visibility below 25m.',
    weatherRiskBm: 'Kabus tebal gunung mengehadkan jarak penglihatan <25m.',
  },
};

export interface CorridorGatewayInfo {
  id: string;
  code: string;
  name: string;
  badgeColor: string;
  recommendedTagEn: string;
  recommendedTagBm: string;
  ascentSpeed: string;
  roadConditionEn: string;
  roadConditionBm: string;
  distanceKm: number;
  estMinutes: number;
  delayMins: number;
  status: 'smooth' | 'moderate' | 'heavy';
  descEn: string;
  descBm: string;
  elevationGainM: number;
  flatlandKm: number;
  mountainKm: number;
  gradientCurve: string;
  landslideRiskEn: string;
  landslideRiskBm: string;
  fogRiskEn: string;
  fogRiskBm: string;
  tollMyr: number;
  fuelMyr: number;
  highlightsEn: string[];
  highlightsBm: string[];
  coords: [number, number];
}

export const CORRIDOR_GATEWAYS: CorridorGatewayInfo[] = [
  {
    id: 'ft185',
    code: 'FT 185',
    name: 'Simpang Pulai – Pos Slim Pass',
    badgeColor: 'emerald',
    recommendedTagEn: 'Recommended: North / Penang',
    recommendedTagBm: 'Disyorkan: Utara / Penang',
    ascentSpeed: '~42 km/h',
    roadConditionEn: 'Sweeping & Wide',
    roadConditionBm: 'Beralun Lebar',
    distanceKm: 86,
    estMinutes: 85,
    delayMins: 8,
    status: 'smooth' as const,
    descEn: 'Modern sweeping road compared to Tapah. Multiple dedicated crawler passing lanes. Watch for slow agricultural trucks.',
    descBm: 'Laluan moden berbanding Tapah. Ada lorong memotong bertingkat. Berhati-hati dengan lori sayur perlahan.',
    elevationGainM: 1480,
    flatlandKm: 18,
    mountainKm: 68,
    gradientCurve: 'Gentle (4-6%)',
    landslideRiskEn: 'Low (Concrete slope reinforcements)',
    landslideRiskBm: 'Rendah (Cerun diperkukuh konkrit)',
    fogRiskEn: 'Moderate mist near Pos Slim Pass (1,400m+)',
    fogRiskBm: 'Kabus sederhana berhampiran Pos Slim Pass (1,400m+)',
    tollMyr: 24.5,
    fuelMyr: 32.0,
    highlightsEn: [
      'Wider dual-lane climbing sections',
      'Fewer sharp hairpin turns than FT 59',
      'Direct access to Kampung Raja & Northern tea valleys',
    ],
    highlightsBm: [
      'Lorong mendaki berkembar yang lebar',
      'Kurang selekoh tajam berbanding FT 59',
      'Akses terus ke Kampung Raja & lembah teh utara',
    ],
    coords: [4.56, 101.22] as [number, number],
  },
  {
    id: 'ft59',
    code: 'FT 59',
    name: 'Tapah – Lata Iskandar – Ringlet',
    badgeColor: 'amber',
    recommendedTagEn: 'Scenic Heritage Route',
    recommendedTagBm: 'Laluan Pemandangan Indah',
    ascentSpeed: '~20-30 km/h',
    roadConditionEn: '300+ Hairpins',
    roadConditionBm: 'Sempit & Berliku',
    distanceKm: 62,
    estMinutes: 110,
    delayMins: 22,
    status: 'moderate' as const,
    descEn: 'Winding route via Lata Iskandar Waterfall. Narrow switchbacks with reduced visibility in rain and prone to motion sickness.',
    descBm: 'Laluan tertua dengan persinggahan Air Terjun Lata Iskandar. Jalan sempit, mudah mabuk perjalanan dan kabus petang.',
    elevationGainM: 1520,
    flatlandKm: 8,
    mountainKm: 54,
    gradientCurve: 'Steep & Twisty (7-12%)',
    landslideRiskEn: 'Moderate (Active slope monitoring in monsoon)',
    landslideRiskBm: 'Sederhana (Pemantauan cerun aktif musim tengkujuh)',
    fogRiskEn: 'Dense evening fog from Mile 14 upwards',
    fogRiskBm: 'Kabus tebal petang bermula Batu 14 ke atas',
    tollMyr: 18.0,
    fuelMyr: 28.0,
    highlightsEn: [
      'Scenic waterfall stop (Lata Iskandar) & Orang Asli stalls',
      'Direct entrance to Ringlet, Bertam Valley & Habu',
      'Demanding drive — best for experienced daylight drivers',
    ],
    highlightsBm: [
      'Persinggahan air terjun indah (Lata Iskandar) & gerai Orang Asli',
      'Pintu masuk terus ke Ringlet, Lembah Bertam & Habu',
      'Pemanduan mencabar — disyorkan untuk siang hari',
    ],
    coords: [4.331, 101.328] as [number, number],
  },
  {
    id: 'ft102',
    code: 'FT 102',
    name: 'Sungai Koyan – Pos Betau (CSR)',
    badgeColor: 'cyan',
    recommendedTagEn: 'Fastest / Zero Congestion',
    recommendedTagBm: 'Paling Pantas / Bebas Jam',
    ascentSpeed: '~80-90 km/h',
    roadConditionEn: 'Dual-Carriageway',
    roadConditionBm: 'Lebuh Raya Terbuka',
    distanceKm: 112,
    estMinutes: 90,
    delayMins: 0,
    status: 'smooth' as const,
    descEn: 'State-of-the-art dual-carriageway bypass from Raub/Gua Musang directly entering southern Ringlet. Best bypass to avoid NSE jam.',
    descBm: 'Lebuh raya moden berbilang lorong dari Raub/Gua Musang terus ke Ringlet. Pintasan terbaik mengelak kesesakan Lebuhraya PLUS.',
    elevationGainM: 1350,
    flatlandKm: 72,
    mountainKm: 40,
    gradientCurve: 'Gradual Modern (3-5%)',
    landslideRiskEn: 'Very Low (Modern drainage & viaducts)',
    landslideRiskBm: 'Sangat Rendah (Sistem saliran & jejambat moden)',
    fogRiskEn: 'Low / Occasional morning mist',
    fogRiskBm: 'Rendah / Kabus pagi sekali-sekala',
    tollMyr: 0,
    fuelMyr: 38.0,
    highlightsEn: [
      'Toll-free Central Spine Road high-speed express',
      'Smooth climb with sweeping high-radius bends',
      'Fastest escape route when North-South Expressway is congested',
    ],
    highlightsBm: [
      'Lebuhraya Central Spine Road (CSR) percuma & pantas',
      'Pendakian lancar dengan selekoh berjejari besar',
      'Laluan pintas terpantas apabila PLUS sesak teruk',
    ],
    coords: [4.351, 101.528] as [number, number],
  },
];

export const TrafficWidget: React.FC<TrafficWidgetProps> = ({
  alerts,
  language,
  onSelectRouteOnMap,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'heavy' | 'ft185' | 'ft59' | 'ft102' | 'central'>('all');
  const [copiedAlertId, setCopiedAlertId] = useState<string | null>(null);
  const [selectedAlertPopup, setSelectedAlertPopup] = useState<TrafficAlert | null>(null);
  const [selectedCorridorGatewayPopup, setSelectedCorridorGatewayPopup] = useState<CorridorGatewayInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('Just now');
  const [isTomTomKeyActive, setIsTomTomKeyActive] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('tomtom_api_key'));
  });

  const isBm = language === 'bm';

  useEffect(() => {
    const handleKeyUpdated = () => {
      setIsTomTomKeyActive(Boolean(localStorage.getItem('tomtom_api_key')));
    };
    window.addEventListener('tomtom-key-updated', handleKeyUpdated);
    return () => window.removeEventListener('tomtom-key-updated', handleKeyUpdated);
  }, []);

  const handleRefreshAlerts = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshedTime(isBm ? 'Baru sahaja' : 'Just now');
    }, 600);
  };

  const handleCopyAdvisory = (alert: TrafficAlert) => {
    const text = `${alert.roadName} - ${alert.location}: ${alert.message} [Bypass: ${alert.alternativeRoute || 'N/A'}]`;
    navigator.clipboard.writeText(text);
    setCopiedAlertId(alert.id);
    setTimeout(() => setCopiedAlertId(null), 2000);
  };

  const filteredAlerts = alerts.filter((a) => {
    if (activeFilter === 'heavy') {
      return a.status === 'heavy' || a.status === 'congested';
    }
    if (activeFilter === 'ft185') {
      return a.roadName?.includes('185') || a.route?.includes('185');
    }
    if (activeFilter === 'ft59') {
      return a.roadName?.includes('59') && !a.location?.includes('Kea Farm') && !a.location?.includes('Golden Hills');
    }
    if (activeFilter === 'ft102') {
      return a.roadName?.includes('102') || a.route?.includes('102');
    }
    if (activeFilter === 'central') {
      return (
        a.location?.includes('Kea Farm') ||
        a.location?.includes('Golden Hills') ||
        a.location?.includes('Tanah Rata') ||
        a.location?.includes('Blue Valley')
      );
    }
    return true;
  });

  const heavyCount = alerts.filter((a) => a.status === 'heavy' || a.status === 'congested').length;
  const moderateCount = alerts.filter((a) => a.status === 'moderate').length;
  const smoothCount = alerts.filter((a) => a.status === 'smooth').length;
  const totalDelayMins = alerts.reduce((acc, curr) => acc + (curr.delayMinutes || 0), 0);

  const getStatusBadge = (status: TrafficAlert['status']) => {
    switch (status) {
      case 'heavy':
      case 'congested':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span className="truncate">{isBm ? 'Trafik Sesak' : 'Heavy Congestion'}</span>
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate">{isBm ? 'Sederhana' : 'Moderate Crawl'}</span>
          </span>
        );
      case 'smooth':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isBm ? 'Lancar' : 'Smooth Flow'}</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-5 text-stone-100 font-sans">
      {/* 1. Header Banner & Status */}
      <div id="telemetry-section-anchor" className="glass-panel rounded-3xl p-4 sm:p-6 border border-emerald-500/30 shadow-2xl bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 relative overflow-hidden scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-400 truncate">
                {isBm ? 'SIARAN LANGSUNG KESESAKAN' : 'LIVE ROAD TELEMETRY'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-white/10 shrink-0">
                {isTomTomKeyActive ? '🟢 TomTom Live' : '⚡ Smart Model'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-heading font-black text-stone-100 tracking-tight truncate">
              {isBm ? 'Pusat Trafik' : 'Traffic Hub'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRefreshAlerts}
              disabled={isRefreshing}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              title={isBm ? 'Segar semula telemetri' : 'Refresh telemetry'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">{lastRefreshedTime}</span>
            </button>
            <button
              onClick={() => onSelectRouteOnMap?.('Main Routes', [4.48, 101.39])}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/60 transition-all active:scale-95 shrink-0"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBm ? 'Buka Peta' : 'Open Map'}</span>
            </button>
          </div>
        </div>

        {/* 2. Key Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-1.5 pt-3.5">
          <div className="p-2.5 lg:p-1.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-2 lg:gap-1 min-w-0">
            <div className="p-2 lg:p-0.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <ShieldAlert className="w-4 h-4 lg:w-3 lg:h-3 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] sm:text-[10px] lg:text-[7.5px] xl:text-[10px] font-extrabold text-rose-300 uppercase tracking-tighter whitespace-normal lg:whitespace-nowrap">
                {isBm ? 'Titik Sesak' : 'Bottlenecks'}
              </div>
              <div className="text-lg sm:text-xl lg:text-base xl:text-xl font-black text-rose-100 leading-none mt-0.5">{heavyCount}</div>
            </div>
          </div>

          <div className="p-2.5 lg:p-1.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center gap-2 lg:gap-1 min-w-0">
            <div className="p-2 lg:p-0.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Clock className="w-4 h-4 lg:w-3 lg:h-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] sm:text-[10px] lg:text-[7.5px] xl:text-[10px] font-extrabold text-amber-300 uppercase tracking-tighter whitespace-normal lg:whitespace-nowrap">
                {isBm ? 'Sederhana' : 'Moderate Crawl'}
              </div>
              <div className="text-lg sm:text-xl lg:text-base xl:text-xl font-black text-amber-100 leading-none mt-0.5">{moderateCount}</div>
            </div>
          </div>

          <div className="p-2.5 lg:p-1.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 lg:gap-1 min-w-0">
            <div className="p-2 lg:p-0.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4 lg:w-3 lg:h-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] sm:text-[10px] lg:text-[7.5px] xl:text-[10px] font-extrabold text-emerald-300 uppercase tracking-tighter whitespace-normal lg:whitespace-nowrap">
                {isBm ? 'Lancar' : 'Smooth Flow'}
              </div>
              <div className="text-lg sm:text-xl lg:text-base xl:text-xl font-black text-emerald-100 leading-none mt-0.5">{smoothCount}</div>
            </div>
          </div>

          <div className="p-2.5 lg:p-1.5 rounded-2xl bg-stone-900/90 border border-white/10 flex items-center gap-2 lg:gap-1 min-w-0">
            <div className="p-2 lg:p-0.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4 lg:w-3 lg:h-3" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] sm:text-[10px] lg:text-[7.5px] xl:text-[10px] font-extrabold text-stone-400 uppercase tracking-tighter whitespace-normal lg:whitespace-nowrap">
                {isBm ? 'Kelewatan' : 'Total Delay'}
              </div>
              <div className="text-lg sm:text-xl lg:text-base xl:text-xl font-black text-white leading-none mt-0.5">+{totalDelayMins}m</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 3-Corridor Gateway Comparison */}
      <div id="corridors-comparison-anchor" className="space-y-3 scroll-mt-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-200">
              {isBm ? 'Perbandingan 3 Koridor Pintu Masuk' : '3 Gateway Corridors Comparison'}
            </h3>
          </div>
        </div>

        {/* Mobile View: Ultra-Compact Minimalist Cards (Identical to Directory Search Result Cards) */}
        <div className="grid sm:hidden no-mobile-clamp grid-cols-2 min-[480px]:grid-cols-3 gap-2">
          {CORRIDOR_GATEWAYS.map((corridor) => (
            <div
              key={corridor.id}
              onClick={() => setSelectedCorridorGatewayPopup(corridor)}
              className="glass-card-hover no-mobile-clamp group p-2.5 rounded-xl bg-stone-900/90 border border-white/10 hover:border-emerald-500/50 hover:bg-stone-850 flex flex-col justify-between gap-1.5 cursor-pointer transition-all shadow-md min-h-[78px] text-left relative overflow-hidden"
            >
              {/* Top Row: Live Status Dot + Corridor Code + Delay */}
              <div className="flex items-center justify-between gap-1 w-full">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      corridor.status === 'heavy'
                        ? 'bg-rose-500 animate-pulse'
                        : corridor.status === 'moderate'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-[9px] text-emerald-400 font-mono font-bold truncate">
                    {corridor.code}
                  </span>
                </div>
                <span
                  className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    corridor.delayMins > 0
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {corridor.delayMins > 0 ? `+${corridor.delayMins}m` : 'Live'}
                </span>
              </div>

              {/* Corridor Name */}
              <h4 className="no-mobile-clamp !text-[11px] font-semibold text-stone-100 group-hover:text-emerald-300 transition-colors line-clamp-2 !leading-tight break-words my-auto">
                {corridor.name}
              </h4>

              {/* Bottom Row: Distance & Time Breakdown + Details trigger */}
              <div className="flex items-center justify-between text-[9px] text-stone-400 font-mono pt-1 border-t border-white/5">
                <span className="text-stone-300 font-medium truncate max-w-[70px]">
                  {corridor.distanceKm}km • {corridor.estMinutes}m
                </span>
                <span className="text-[9px] text-stone-400 group-hover:text-emerald-400 transition-colors flex items-center gap-0.5 shrink-0">
                  <span>{isBm ? 'Lihat' : 'Details'}</span>
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Corridor Comparison Cards */}
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {CORRIDOR_GATEWAYS.map((corridor) => (
            <div
              key={corridor.id}
              className={`p-3.5 sm:p-4 rounded-2xl bg-stone-900/90 border transition-all space-y-2 flex flex-col justify-between ${
                corridor.id === 'ft185'
                  ? 'border-emerald-500/30 hover:border-emerald-500/60'
                  : corridor.id === 'ft59'
                  ? 'border-amber-500/30 hover:border-amber-500/60'
                  : 'border-cyan-500/30 hover:border-cyan-500/60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-lg font-mono font-bold text-[10px] sm:text-xs border shrink-0 ${
                      corridor.id === 'ft185'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : corridor.id === 'ft59'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    {corridor.code}
                  </span>
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold truncate text-right ${
                      corridor.id === 'ft185'
                        ? 'text-emerald-400'
                        : corridor.id === 'ft59'
                        ? 'text-amber-400'
                        : 'text-cyan-400'
                    }`}
                  >
                    {isBm ? corridor.recommendedTagBm : corridor.recommendedTagEn}
                  </span>
                </div>
                <h4 className="font-heading font-extrabold text-stone-100 text-xs sm:text-sm leading-snug">
                  {corridor.name}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs">
                  <div className="p-2 rounded-xl bg-stone-950 border border-white/5">
                    <span className="text-[9px] sm:text-[10px] text-stone-400 block">
                      {isBm ? 'Kelajuan Cerun' : 'Ascent Speed'}
                    </span>
                    <span className="font-bold text-stone-100 text-xs sm:text-sm">
                      {corridor.ascentSpeed}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-stone-950 border border-white/5">
                    <span className="text-[9px] sm:text-[10px] text-stone-400 block">
                      {isBm ? 'Kondisi Jalan' : 'Road Condition'}
                    </span>
                    <span
                      className={`font-bold text-xs sm:text-sm truncate block ${
                        corridor.id === 'ft185'
                          ? 'text-emerald-400'
                          : corridor.id === 'ft59'
                          ? 'text-amber-300'
                          : 'text-cyan-300'
                      }`}
                    >
                      {isBm ? corridor.roadConditionBm : corridor.roadConditionEn}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] sm:text-[11px] text-stone-400 leading-relaxed">
                  {isBm ? corridor.descBm : corridor.descEn}
                </p>
              </div>

              <button
                onClick={() => onSelectRouteOnMap?.(corridor.name, corridor.coords)}
                className={`w-full py-2 rounded-xl bg-stone-800 text-stone-200 text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2 ${
                  corridor.id === 'ft185'
                    ? 'hover:bg-emerald-600/30 hover:text-emerald-300'
                    : corridor.id === 'ft59'
                    ? 'hover:bg-amber-600/30 hover:text-amber-300'
                    : 'hover:bg-cyan-600/30 hover:text-cyan-300'
                }`}
              >
                <MapPin
                  className={`w-3.5 h-3.5 shrink-0 ${
                    corridor.id === 'ft185'
                      ? 'text-emerald-400'
                      : corridor.id === 'ft59'
                      ? 'text-amber-400'
                      : 'text-cyan-400'
                  }`}
                />
                <span>{isBm ? 'Papar di Peta' : 'View on Map'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Filter Pills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-stone-200">
              {isBm ? 'Senarai Amaran & Titik Panas' : 'Live Road Alerts & Hotspots'}
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: isBm ? 'Semua' : 'All' },
            { id: 'heavy', label: isBm ? 'Sesak' : 'Bottlenecks' },
            { id: 'ft59', label: 'FT 59' },
            { id: 'ft185', label: 'FT 185' },
            { id: 'ft102', label: 'FT 102' },
            { id: 'central', label: isBm ? 'Bandar' : 'Town' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-500/20'
                  : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700 hover:text-white border border-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Live Alerts Cards Feed */}
      <div>
        {filteredAlerts.length === 0 ? (
          <div className="p-6 text-center rounded-3xl bg-stone-900/60 border border-white/10 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-stone-200">
              {isBm ? 'Tiada Amaran Kesesakan' : 'No Congestion Alerts'}
            </h4>
          </div>
        ) : (
          <>
            {/* Mobile View: Ultra-Compact Minimalist Cards (Like Directory Search Result Cards) */}
            <div className="grid sm:hidden no-mobile-clamp grid-cols-2 min-[480px]:grid-cols-3 gap-2">
              {filteredAlerts.map((alert) => {
                const predictive = ALERT_PREDICTIVE_DATA[alert.id];
                const isCritical =
                  alert.status === 'heavy' || alert.status === 'congested' || alert.status === 'closed';

                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlertPopup(alert)}
                    className="glass-card-hover no-mobile-clamp group p-2.5 rounded-xl bg-stone-900/90 border border-white/10 hover:border-emerald-500/50 hover:bg-stone-850 flex flex-col justify-between gap-1.5 cursor-pointer transition-all shadow-md min-h-[78px] text-left relative overflow-hidden"
                  >
                    {/* Top Row: Live Status Dot + Corridor/Road Code + Delay */}
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isCritical
                              ? 'bg-rose-500 animate-pulse'
                              : alert.status === 'moderate'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span className="text-[9px] text-emerald-400 font-mono font-bold truncate">
                          {predictive?.corridorCode || alert.roadName || 'Road Alert'}
                        </span>
                      </div>
                      {alert.delayMinutes ? (
                        <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 shrink-0">
                          +{alert.delayMinutes}m
                        </span>
                      ) : (
                        <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 shrink-0">
                          Live
                        </span>
                      )}
                    </div>

                    {/* Location Name */}
                    <h4 className="no-mobile-clamp !text-[11px] font-semibold text-stone-100 group-hover:text-emerald-300 transition-colors line-clamp-2 !leading-tight break-words my-auto">
                      {alert.location || alert.roadName}
                    </h4>

                    {/* Bottom Row: Status / Delay & Details trigger */}
                    <div className="flex items-center justify-between text-[9px] text-stone-400 font-mono pt-1 border-t border-white/5">
                      <span
                        className={`font-semibold capitalize truncate max-w-[70px] ${
                          isCritical
                            ? 'text-rose-400'
                            : alert.status === 'moderate'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {alert.status}
                      </span>
                      <span className="text-[9px] text-stone-400 group-hover:text-emerald-400 transition-colors flex items-center gap-0.5 shrink-0">
                        <span>{isBm ? 'Lihat' : 'Details'}</span>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Full Rich Live Alerts Feed */}
            <div className="hidden sm:block space-y-3">
              {filteredAlerts.map((alert) => {
                const predictive = ALERT_PREDICTIVE_DATA[alert.id];
                const coords = ALERT_COORDINATES[alert.id];

                return (
                  <div
                    key={alert.id}
                    className="p-4 rounded-2xl bg-stone-900/95 border border-white/10 hover:border-emerald-500/40 transition-all shadow-lg space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(alert.status)}
                        <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono text-[11px] border border-white/10 font-bold shrink-0">
                          {predictive?.corridorCode || alert.roadName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {alert.delayMinutes ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[11px] font-mono font-bold">
                            +{alert.delayMinutes}m
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-heading font-extrabold text-stone-100 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{alert.location}</span>
                      </h4>
                      <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                        {alert.message}
                      </p>
                    </div>

                    {predictive && (
                      <div className="grid grid-cols-1 gap-2 text-xs pt-1">
                        <div className="p-2.5 rounded-xl bg-stone-950/80 border border-white/5 space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 shrink-0" />
                            <span>{isBm ? 'Ramalan AI & Waktu Puncak' : 'AI Trend & Peak Expectation'}</span>
                          </div>
                          <p className="text-stone-300 text-[11px] leading-relaxed">
                            {isBm ? predictive.trendBm : predictive.trendEn}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => handleCopyAdvisory(alert)}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedAlertId === alert.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-emerald-400">{isBm ? 'Disalin!' : 'Copied!'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 shrink-0" />
                            <span>{isBm ? 'Salin' : 'Copy'}</span>
                          </>
                        )}
                      </button>

                      {coords && (
                        <button
                          onClick={() => onSelectRouteOnMap?.(alert.roadName || 'Main Corridor', coords)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ml-auto shrink-0"
                        >
                          <Navigation className="w-3.5 h-3.5 shrink-0" />
                          <span>{isBm ? 'Fokus Peta' : 'Focus Map'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 6. Driving Safety Advisory in Cameron Highlands (RESTORED) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-2 text-xs text-stone-300">
        <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
          <Info className="w-4 h-4 shrink-0" />
          <span>{isBm ? 'Panduan Keselamatan Memandu Tanah Tinggi' : 'Highland Driving Safety Protocol'}</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-400">
          <li className="flex items-start gap-1.5">
            <span className="text-emerald-400 font-bold">•</span>
            <span>{isBm ? 'Gunakan brek enjin (Gear Rendah) semasa menuruni cerun curam FT 59 & FT 185.' : 'Use low gear engine braking when descending steep mountain passes.'}</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-emerald-400 font-bold">•</span>
            <span>{isBm ? 'Nyalakan lampu utama semasa berkabus tebal (jangan guna lampu kecemasan ketika bergerak).' : 'Turn on headlights in thick mist; avoid hazard lights while driving.'}</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-emerald-400 font-bold">•</span>
            <span>{isBm ? 'Talian Kecemasan 24 Jam: IPD Cameron (05-491 1222) / APM (05-491 5811).' : '24-Hour Emergency Hotlines: IPD Cameron (05-491 1222) / APM (05-491 5811).'}</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-emerald-400 font-bold">•</span>
            <span>{isBm ? 'Elakkan memotong di garisan berkembar di sepanjang 300+ selekoh Tapah.' : 'Never overtake on double white lines across the 300+ Tapah hairpin stretch.'}</span>
          </li>
        </ul>
      </div>
      {/* Detailed Modal Pop-up for Road Alert & Hotspot (Rich Mobile Pop-up) */}
      {selectedAlertPopup &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
            onClick={() => setSelectedAlertPopup(null)}
          >
            <div
              className="w-full max-w-lg bg-stone-900 border border-emerald-500/40 rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Top Header */}
              <div className="sticky top-0 z-30 flex items-center justify-between p-3.5 sm:p-4 bg-stone-900/95 border-b border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(selectedAlertPopup.status)}
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-200 font-mono text-xs border border-white/10 font-bold">
                    {ALERT_PREDICTIVE_DATA[selectedAlertPopup.id]?.corridorCode || selectedAlertPopup.roadName}
                  </span>
                  {selectedAlertPopup.delayMinutes ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-mono font-bold">
                      +{selectedAlertPopup.delayMinutes}m delay
                    </span>
                  ) : null}
                </div>

                <button
                  onClick={() => setSelectedAlertPopup(null)}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5 text-xs min-h-[44px] min-w-[44px] justify-center ml-auto shrink-0"
                  aria-label="Close alert modal"
                >
                  <X className="w-5 h-5" />
                  <span className="font-mono">{isBm ? 'Tutup' : 'Close'}</span>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto touch-pan-y p-4 sm:p-6 space-y-4">
                {/* Location Banner */}
                <div>
                  <h3 className="text-xl sm:text-2xl font-heading font-black text-stone-100 flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                    <span>{selectedAlertPopup.location || selectedAlertPopup.roadName}</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-stone-400 font-mono">
                    <span>{selectedAlertPopup.roadName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{selectedAlertPopup.updatedAt || 'Updated live'}</span>
                    </span>
                  </div>
                </div>

                {/* Primary Message */}
                <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-white/10 space-y-1">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">
                    {isBm ? 'Laporan Kesesakan / Trafik' : 'Live Traffic Advisory'}
                  </span>
                  <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                    {isBm ? selectedAlertPopup.messageBm || selectedAlertPopup.message : selectedAlertPopup.message}
                  </p>
                </div>

                {/* Advisory / Action notes if available */}
                {(selectedAlertPopup.advisory || selectedAlertPopup.advisoryBm) && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1">
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold block">
                      {isBm ? 'Cadangan Laluan / Tindakan' : 'Action Recommendation'}
                    </span>
                    <p className="text-stone-300 leading-relaxed">
                      {isBm ? selectedAlertPopup.advisoryBm || selectedAlertPopup.advisory : selectedAlertPopup.advisory}
                    </p>
                  </div>
                )}

                {/* Predictive AI Data Box if available */}
                {ALERT_PREDICTIVE_DATA[selectedAlertPopup.id] && (() => {
                  const pred = ALERT_PREDICTIVE_DATA[selectedAlertPopup.id];
                  return (
                    <div className="p-3.5 rounded-2xl bg-stone-950 border border-amber-500/20 space-y-3">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>{isBm ? 'Analisis Trend AI & Waktu Puncak' : 'AI Trend & Peak Expectation'}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-stone-900 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-stone-400 block font-mono">Current Speed</span>
                          <span className="text-sm font-bold text-amber-300">{pred.currentSpeedKmh} km/h</span>
                        </div>
                        <div className="p-2 rounded-xl bg-stone-900 border border-white/5 space-y-0.5">
                          <span className="text-[10px] text-stone-400 block font-mono">Expected Peak</span>
                          <span className="text-sm font-bold text-stone-100">{pred.expectedPeak}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-stone-900 border border-white/5 space-y-0.5 col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-stone-400 block font-mono">Clearance Time</span>
                          <span className="text-sm font-bold text-emerald-400">{pred.clearanceTime}</span>
                        </div>
                      </div>

                      <p className="text-stone-300 text-xs leading-relaxed">
                        {isBm ? pred.trendBm : pred.trendEn}
                      </p>

                      <div className="pt-2 border-t border-white/5 text-[11px] text-stone-400 flex items-start gap-1.5">
                        <CloudFog className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{isBm ? pred.weatherRiskBm : pred.weatherRiskEn}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Alternative Bypass Route if available */}
                {(selectedAlertPopup.alternativeRoute || selectedAlertPopup.alternativeRouteBm) && (
                  <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs space-y-1">
                    <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold block">
                      {isBm ? 'Laluan Alternatif Disyorkan' : 'Recommended Bypass'}
                    </span>
                    <p className="text-stone-200 font-medium">
                      {isBm ? selectedAlertPopup.alternativeRouteBm || selectedAlertPopup.alternativeRoute : selectedAlertPopup.alternativeRoute}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleCopyAdvisory(selectedAlertPopup)}
                    className="w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer"
                  >
                    {copiedAlertId === selectedAlertPopup.id ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-400">{isBm ? 'Disalin ke Papan Keratan!' : 'Copied to Clipboard!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 shrink-0" />
                        <span>{isBm ? 'Salin Maklumat Kesesakan' : 'Copy Advisory Text'}</span>
                      </>
                    )}
                  </button>

                  {ALERT_COORDINATES[selectedAlertPopup.id] && (
                    <button
                      onClick={() => {
                        const coords = ALERT_COORDINATES[selectedAlertPopup.id];
                        onSelectRouteOnMap?.(selectedAlertPopup.roadName || 'Main Corridor', coords);
                        setSelectedAlertPopup(null);
                      }}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Navigation className="w-4 h-4 shrink-0" />
                      <span>{isBm ? 'Fokus Peta & Navigasi' : 'Focus Map & Navigate'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Corridor Gateway Detailed Modal Pop-up (Rendered via Portal) */}
      {selectedCorridorGatewayPopup &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fade-in"
            onClick={() => setSelectedCorridorGatewayPopup(null)}
          >
            <div
              className="w-full max-w-lg bg-stone-900 border border-white/15 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky Header with Close Button */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-stone-900/95 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <span
                    className={`px-2 py-0.5 rounded-lg font-mono font-bold text-xs border shrink-0 ${
                      selectedCorridorGatewayPopup.id === 'ft185'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : selectedCorridorGatewayPopup.id === 'ft59'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    {selectedCorridorGatewayPopup.code}
                  </span>
                  <span
                    className={`text-[11px] font-bold truncate ${
                      selectedCorridorGatewayPopup.id === 'ft185'
                        ? 'text-emerald-400'
                        : selectedCorridorGatewayPopup.id === 'ft59'
                        ? 'text-amber-400'
                        : 'text-cyan-400'
                    }`}
                  >
                    {isBm
                      ? selectedCorridorGatewayPopup.recommendedTagBm
                      : selectedCorridorGatewayPopup.recommendedTagEn}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedCorridorGatewayPopup(null)}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all shadow-md flex items-center gap-1.5 text-xs min-h-[44px] min-w-[44px] justify-center ml-auto shrink-0"
                  aria-label="Close corridor modal"
                >
                  <X className="w-5 h-5" />
                  <span className="font-mono">{isBm ? 'Tutup' : 'Close'}</span>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto touch-pan-y p-4 sm:p-6 space-y-4">
                {/* Title & Quick Stats */}
                <div>
                  <h3 className="text-xl sm:text-2xl font-heading font-black text-stone-100 flex items-start gap-2">
                    <Compass className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                    <span>{selectedCorridorGatewayPopup.name}</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-stone-400 font-mono">
                    <span>{selectedCorridorGatewayPopup.distanceKm} km</span>
                    <span>•</span>
                    <span>~{selectedCorridorGatewayPopup.estMinutes} mins</span>
                    <span>•</span>
                    <span
                      className={
                        selectedCorridorGatewayPopup.delayMins > 0
                          ? 'text-rose-400 font-bold'
                          : 'text-emerald-400 font-bold'
                      }
                    >
                      {selectedCorridorGatewayPopup.delayMins > 0
                        ? `+${selectedCorridorGatewayPopup.delayMins}m delay`
                        : isBm
                        ? 'Trafik lancar'
                        : 'Smooth flow'}
                    </span>
                  </div>
                </div>

                {/* Quick Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-2xl bg-stone-950 border border-white/5 space-y-1">
                    <span className="text-[10px] text-stone-400 uppercase font-mono block">
                      {isBm ? 'Kelajuan Cerun' : 'Ascent Speed'}
                    </span>
                    <span className="text-sm font-bold text-stone-100 block">
                      {selectedCorridorGatewayPopup.ascentSpeed}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {selectedCorridorGatewayPopup.gradientCurve}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-950 border border-white/5 space-y-1">
                    <span className="text-[10px] text-stone-400 uppercase font-mono block">
                      {isBm ? 'Kondisi Jalan' : 'Road Profile'}
                    </span>
                    <span
                      className={`text-sm font-bold block ${
                        selectedCorridorGatewayPopup.id === 'ft185'
                          ? 'text-emerald-400'
                          : selectedCorridorGatewayPopup.id === 'ft59'
                          ? 'text-amber-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      {isBm
                        ? selectedCorridorGatewayPopup.roadConditionBm
                        : selectedCorridorGatewayPopup.roadConditionEn}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {selectedCorridorGatewayPopup.mountainKm}km {isBm ? 'pendakian berbukit' : 'mountain climb'}
                    </span>
                  </div>
                </div>

                {/* Detailed Overview */}
                <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-white/10 space-y-1">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">
                    {isBm ? 'Penerangan Laluan' : 'Route Profile Description'}
                  </span>
                  <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                    {isBm ? selectedCorridorGatewayPopup.descBm : selectedCorridorGatewayPopup.descEn}
                  </p>
                </div>

                {/* Elevation & Terrain Breakdown */}
                <div className="p-3.5 rounded-2xl bg-stone-950 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <Mountain className="w-4 h-4 shrink-0" />
                    <span>{isBm ? 'Profil Bentuk Muka Bumi' : 'Elevation & Terrain Breakdown'}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-stone-900 border border-white/5">
                      <span className="text-[9px] text-stone-400 block font-mono">{isBm ? 'Ketinggian' : 'Elevation'}</span>
                      <span className="font-bold text-stone-100">+{selectedCorridorGatewayPopup.elevationGainM}m</span>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-900 border border-white/5">
                      <span className="text-[9px] text-stone-400 block font-mono">{isBm ? 'Tanah Rata' : 'Flatland'}</span>
                      <span className="font-bold text-stone-100">{selectedCorridorGatewayPopup.flatlandKm} km</span>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-900 border border-white/5">
                      <span className="text-[9px] text-stone-400 block font-mono">{isBm ? 'Pendakian' : 'Climb'}</span>
                      <span className="font-bold text-emerald-400">{selectedCorridorGatewayPopup.mountainKm} km</span>
                    </div>
                  </div>
                </div>

                {/* Hazard & Weather Analysis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-2xl bg-stone-950 border border-amber-500/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{isBm ? 'Risiko Tanah Runtuh' : 'Landslide Risk'}</span>
                    </div>
                    <p className="text-[11px] text-stone-300">
                      {isBm
                        ? selectedCorridorGatewayPopup.landslideRiskBm
                        : selectedCorridorGatewayPopup.landslideRiskEn}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-950 border border-cyan-500/20 space-y-1">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[10px] uppercase">
                      <CloudFog className="w-3.5 h-3.5 shrink-0" />
                      <span>{isBm ? 'Kabus & Jarak Nampak' : 'Fog & Visibility'}</span>
                    </div>
                    <p className="text-[11px] text-stone-300">
                      {isBm ? selectedCorridorGatewayPopup.fogRiskBm : selectedCorridorGatewayPopup.fogRiskEn}
                    </p>
                  </div>
                </div>

                {/* Fuel & Toll Estimation */}
                <div className="p-3 rounded-2xl bg-stone-950 border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-stone-300 font-medium">
                      {isBm ? 'Anggaran Minyak' : 'Est. Fuel'}:{' '}
                      <strong className="text-white">
                        RM {selectedCorridorGatewayPopup.fuelMyr.toFixed(2)}
                      </strong>
                    </span>
                  </div>
                  <span className="text-stone-400 font-mono">
                    {isBm ? 'Tol' : 'Toll'}:{' '}
                    <strong className="text-stone-200">
                      {selectedCorridorGatewayPopup.tollMyr > 0
                        ? `RM ${selectedCorridorGatewayPopup.tollMyr.toFixed(2)}`
                        : isBm
                        ? 'Percuma'
                        : 'Free'}
                    </strong>
                  </span>
                </div>

                {/* Key Highlights Bullet List */}
                <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-white/5 space-y-1.5">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-bold block">
                    {isBm ? 'Kelebihan & Tips Utama' : 'Key Highlights & Driving Tips'}
                  </span>
                  <ul className="space-y-1 text-xs text-stone-300">
                    {(isBm
                      ? selectedCorridorGatewayPopup.highlightsBm
                      : selectedCorridorGatewayPopup.highlightsEn
                    ).map((hl, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      onSelectRouteOnMap?.(
                        selectedCorridorGatewayPopup.name,
                        selectedCorridorGatewayPopup.coords
                      );
                      setSelectedCorridorGatewayPopup(null);
                    }}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 shrink-0" />
                    <span>{isBm ? 'Fokus Peta & Navigasi' : 'View on Map & Navigate'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};