// TrafficWidget.tsx
import React, { useState, useEffect } from 'react';
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

export const TrafficWidget: React.FC<TrafficWidgetProps> = ({
  alerts,
  language,
  onSelectRouteOnMap,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'heavy' | 'ft185' | 'ft59' | 'ft102' | 'central'>('all');
  const [copiedAlertId, setCopiedAlertId] = useState<string | null>(null);
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

        <div className="grid grid-cols-1 gap-3">
          {/* Corridor 1: FT 185 Simpang Pulai */}
          <div className="p-4 rounded-2xl bg-stone-900/90 border border-emerald-500/30 hover:border-emerald-500/60 transition-all space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30 shrink-0">
                FT 185
              </span>
              <span className="text-[11px] font-bold text-emerald-400 truncate text-right">
                {isBm ? 'Disyorkan: Utara / Penang' : 'Recommended: North / Penang'}
              </span>
            </div>
            <h4 className="font-heading font-extrabold text-stone-100 text-sm">
              Simpang Pulai – Pos Slim Pass
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-stone-950 border border-white/5">
                <span className="text-[10px] text-stone-400 block">{isBm ? 'Kelajuan Cerun' : 'Ascent Speed'}</span>
                <span className="font-bold text-stone-100 text-xs sm:text-sm">~42 km/h</span>
              </div>
              <div className="p-2 rounded-xl bg-stone-950 border border-white/5">
                <span className="text-[10px] text-stone-400 block">{isBm ? 'Kondisi Jalan' : 'Road Condition'}</span>
                <span className="font-bold text-emerald-400 text-xs sm:text-sm truncate block">{isBm ? 'Beralun Lebar' : 'Sweeping & Wide'}</span>
              </div>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              {isBm
                ? 'Laluan moden berbanding Tapah. Ada lorong memotong bertingkat. Berhati-hati dengan lori sayur perlahan.'
                : 'Modern sweeping road compared to Tapah. Multiple dedicated crawler passing lanes.'}
            </p>
            <button
              onClick={() => onSelectRouteOnMap?.('FT 185 Simpang Pulai', [4.56, 101.22])}
              className="w-full py-2 rounded-xl bg-stone-800 hover:bg-emerald-600/30 text-stone-200 hover:text-emerald-300 text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{isBm ? 'Papar di Peta' : 'View on Map'}</span>
            </button>
          </div>

          {/* Corridor 2: FT 59 Tapah */}
          <div className="p-4 rounded-2xl bg-stone-900/90 border border-amber-500/30 hover:border-amber-500/60 transition-all space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/30 shrink-0">
                FT 59
              </span>
              <span className="text-[11px] font-bold text-amber-400 truncate text-right">
                {isBm ? 'Laluan Pemandangan Indah' : 'Scenic Heritage Route'}
              </span>
            </div>
            <h4 className="font-heading font-extrabold text-stone-100 text-sm">
              Tapah – Lata Iskandar – Ringlet
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-stone-950 border border-white/5">
                <span className="text-[10px] text-stone-400 block">{isBm ? 'Kelajuan Cerun' : 'Ascent Speed'}</span>
                <span className="font-bold text-amber-300 text-xs sm:text-sm">~20-30 km/h</span>
              </div>
              <div className="p-2 rounded-xl bg-stone-950 border border-white/5">
                <span className="text-[10px] text-stone-400 block">{isBm ? 'Selekoh' : 'Corners'}</span>
                <span className="font-bold text-amber-300 text-xs sm:text-sm truncate block">300+ Hairpins</span>
              </div>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              {isBm
                ? 'Laluan tertua dengan persinggahan Air Terjun Lata Iskandar. Jalan sempit, mudah mabuk perjalanan dan kabus petang.'
                : 'Winding route via Lata Iskandar Waterfall. Narrow switchbacks with reduced visibility in rain.'}
            </p>
            <button
              onClick={() => onSelectRouteOnMap?.('FT 59 Tapah Corridor', [4.331, 101.328])}
              className="w-full py-2 rounded-xl bg-stone-800 hover:bg-amber-600/30 text-stone-200 hover:text-amber-300 text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{isBm ? 'Papar di Peta' : 'View on Map'}</span>
            </button>
          </div>

          {/* Corridor 3: FT 102 Central Spine Road */}
          <div className="p-4 rounded-2xl bg-stone-900/90 border border-cyan-500/30 hover:border-cyan-500/60 transition-all space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/30 shrink-0">
                FT 102
              </span>
              <span className="text-[11px] font-bold text-cyan-400 truncate text-right">
                {isBm ? 'Paling Pantas / Bebas Jam' : 'Fastest / Zero Congestion'}
              </span>
            </div>
            <h4 className="font-heading font-extrabold text-stone-100 text-sm">
              Sungai Koyan – Pos Betau (CSR)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-stone-950 border border-white/5">
                <span className="text-[10px] text-stone-400 block">{isBm ? 'Kelajuan Purata' : 'Avg Speed'}</span>
                <span className="font-bold text-cyan-300 text-xs sm:text-sm">~80-90 km/h</span>
              </div>
              <div className="p-2 rounded-xl bg-stone-950 border border-white/5">
                <span className="text-[10px] text-stone-400 block">{isBm ? 'Kelewatan' : 'Delay Risk'}</span>
                <span className="font-bold text-emerald-400 text-xs sm:text-sm truncate block">0 min</span>
              </div>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              {isBm
                ? 'Lebuh raya moden berbilang lorong dari Raub/Gua Musang terus ke Ringlet. Pintasan terbaik mengelak kesesakan Lebuhraya PLUS.'
                : 'State-of-the-art dual-carriageway bypass from Raub/Gua Musang directly entering southern Ringlet.'}
            </p>
            <button
              onClick={() => onSelectRouteOnMap?.('FT 102 Central Spine Road', [4.351, 101.528])}
              className="w-full py-2 rounded-xl bg-stone-800 hover:bg-cyan-600/30 text-stone-200 hover:text-cyan-300 text-xs font-bold border border-white/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>{isBm ? 'Papar di Peta' : 'View on Map'}</span>
            </button>
          </div>
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
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-6 text-center rounded-3xl bg-stone-900/60 border border-white/10 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-stone-200">
              {isBm ? 'Tiada Amaran Kesesakan' : 'No Congestion Alerts'}
            </h4>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
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
          })
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
    </div>
  );
};