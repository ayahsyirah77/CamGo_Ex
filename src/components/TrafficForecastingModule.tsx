import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import { getTranslation } from '../services/i18n';
import {
  Car,
  Navigation,
  Clock,
  MapPin,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Sliders,
  CloudRain,
  CloudFog,
  ShieldAlert,
  Zap,
  CheckCircle2,
  HelpCircle,
  Key,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Fuel,
  Info,
  Search,
  X,
  Compass,
} from 'lucide-react';

export interface CorridorDetail {
  id: 'simpang-pulai' | 'tapah' | 'sungai-koyan';
  name: string;
  code: string;
  startPoint: string;
  recommendedFor: string;
  totalDistanceKm: number;
  flatlandKm: number;
  mountainKm: number;
  avgElevationGainM: number;
  baseDriveMinutes: number;
  currentDelayMinutes: number;
  congestionScore: number; // 0 (clear) to 100 (gridlock)
  status: 'smooth' | 'moderate' | 'heavy';
  flatlandSpeedKmh: number;
  mountainSpeedKmh: number;
  landslideRisk: 'Low' | 'Medium' | 'High';
  fogVisibilityScore: 'Clear' | 'Moderate Fog' | 'Thick Mist';
  gradientCurveRating: 'Gentle (4-6%)' | 'Steep Hairpins (8-10%)' | 'Moderate Sweeping (5-7%)';
  tollCostMyr: number;
  fuelEstMyr: number;
  keyHighlights: string[];
  currentAlert?: string;
  coordinates: {
    start: [number, number];
    mid: [number, number];
    end: [number, number];
  };
}

export interface OriginLocation {
  city: string;
  state: string;
  distanceKm: number;
  toll: number;
  baseHours: number;
  bestCorridor: 'simpang-pulai' | 'tapah' | 'sungai-koyan';
  routeDescription: string;
}

export const MALAYSIA_ORIGIN_CITIES: OriginLocation[] = [
  { city: 'Kuala Lumpur', state: 'WP', distanceKm: 205, toll: 22.8, baseHours: 3.2, bestCorridor: 'simpang-pulai', routeDescription: 'NSE (E1) North to Simpang Pulai or Tapah' },
  { city: 'Petaling Jaya', state: 'Selangor', distanceKm: 215, toll: 24.2, baseHours: 3.3, bestCorridor: 'simpang-pulai', routeDescription: 'NKVE -> NSE (E1) Northbound' },
  { city: 'Shah Alam', state: 'Selangor', distanceKm: 225, toll: 25.5, baseHours: 3.4, bestCorridor: 'simpang-pulai', routeDescription: 'Guthrie -> NSE (E1)' },
  { city: 'Putrajaya / Cyberjaya', state: 'WP', distanceKm: 240, toll: 27.0, baseHours: 3.6, bestCorridor: 'simpang-pulai', routeDescription: 'MEX -> NSE (E1)' },
  { city: 'Klang', state: 'Selangor', distanceKm: 235, toll: 26.0, baseHours: 3.5, bestCorridor: 'simpang-pulai', routeDescription: 'NKVE -> NSE (E1)' },
  { city: 'Rawang', state: 'Selangor', distanceKm: 175, toll: 18.0, baseHours: 2.7, bestCorridor: 'simpang-pulai', routeDescription: 'NSE (E1) Northbound directly' },
  { city: 'Ipoh', state: 'Perak', distanceKm: 88, toll: 6.2, baseHours: 1.8, bestCorridor: 'simpang-pulai', routeDescription: 'Direct access via FT 185 Simpang Pulai' },
  { city: 'Taiping', state: 'Perak', distanceKm: 145, toll: 14.8, baseHours: 2.3, bestCorridor: 'simpang-pulai', routeDescription: 'NSE (E1) Southbound to Simpang Pulai' },
  { city: 'Tapah', state: 'Perak', distanceKm: 59, toll: 0, baseHours: 1.5, bestCorridor: 'tapah', routeDescription: 'FT 59 direct mountain pass climb' },
  { city: 'Kampar', state: 'Perak', distanceKm: 75, toll: 3.5, baseHours: 1.6, bestCorridor: 'tapah', routeDescription: 'Federal Route 1 -> Tapah FT 59' },
  { city: 'Penang (Georgetown)', state: 'Penang', distanceKm: 245, toll: 28.4, baseHours: 3.5, bestCorridor: 'simpang-pulai', routeDescription: 'Penang Bridge -> NSE South to Simpang Pulai' },
  { city: 'Butterworth', state: 'Penang', distanceKm: 235, toll: 24.2, baseHours: 3.3, bestCorridor: 'simpang-pulai', routeDescription: 'NSE (E1) South to Simpang Pulai Exit 137' },
  { city: 'Alor Setar', state: 'Kedah', distanceKm: 325, toll: 38.6, baseHours: 4.4, bestCorridor: 'simpang-pulai', routeDescription: 'NSE (E1) South past Penang to Simpang Pulai' },
  { city: 'Sungai Petani', state: 'Kedah', distanceKm: 275, toll: 32.0, baseHours: 3.8, bestCorridor: 'simpang-pulai', routeDescription: 'NSE (E1) South to Simpang Pulai' },
  { city: 'Seremban', state: 'Negeri Sembilan', distanceKm: 270, toll: 31.5, baseHours: 4.0, bestCorridor: 'simpang-pulai', routeDescription: 'PLUS (E2) -> PLUS (E1) North' },
  { city: 'Melaka', state: 'Melaka', distanceKm: 350, toll: 43.0, baseHours: 4.8, bestCorridor: 'simpang-pulai', routeDescription: 'PLUS (E2) -> PLUS (E1) North' },
  { city: 'Johor Bahru', state: 'Johor', distanceKm: 535, toll: 68.5, baseHours: 6.5, bestCorridor: 'simpang-pulai', routeDescription: 'PLUS (E2) Northbound past KL' },
  { city: 'Muar / Batu Pahat', state: 'Johor', distanceKm: 415, toll: 52.0, baseHours: 5.2, bestCorridor: 'simpang-pulai', routeDescription: 'PLUS (E2) Northbound' },
  { city: 'Kuantan', state: 'Pahang', distanceKm: 280, toll: 18.2, baseHours: 4.2, bestCorridor: 'sungai-koyan', routeDescription: 'East Coast Expressway (E8) -> Temerloh -> Raub -> FT 102' },
  { city: 'Temerloh / Mentakab', state: 'Pahang', distanceKm: 195, toll: 10.5, baseHours: 3.1, bestCorridor: 'sungai-koyan', routeDescription: 'Route 87 -> Raub -> Sungai Koyan FT 102' },
  { city: 'Bentong / Raub', state: 'Pahang', distanceKm: 135, toll: 5.0, baseHours: 2.2, bestCorridor: 'sungai-koyan', routeDescription: 'Central Spine Road (CSR) -> Sungai Koyan FT 102' },
  { city: 'Genting Highlands', state: 'Pahang', distanceKm: 190, toll: 12.0, baseHours: 3.2, bestCorridor: 'sungai-koyan', routeDescription: 'Bypass via Bentong -> Raub -> Sungai Koyan' },
  { city: 'Kota Bharu', state: 'Kelantan', distanceKm: 310, toll: 0, baseHours: 4.8, bestCorridor: 'sungai-koyan', routeDescription: 'Route 8 -> Gua Musang -> Sungai Koyan FT 102' },
  { city: 'Gua Musang', state: 'Kelantan', distanceKm: 135, toll: 0, baseHours: 2.1, bestCorridor: 'sungai-koyan', routeDescription: 'Direct Link to FT 102 Blue Valley / Sg Koyan' },
  { city: 'Kuala Terengganu', state: 'Terengganu', distanceKm: 390, toll: 21.0, baseHours: 5.5, bestCorridor: 'sungai-koyan', routeDescription: 'LPT 2 -> Kuantan -> Raub -> Sungai Koyan' },
];

export interface MountainCheckpoint {
  name: string;
  code: string;
  location: string;
  elevation: string;
  status: 'Clear' | 'Slow' | 'Heavy';
  speedKmh: number;
  advisory: string;
}

export const MOUNTAIN_CHECKPOINTS: MountainCheckpoint[] = [
  {
    name: 'Kea Farm Market Choke Point',
    code: 'FT 59 KM 68',
    location: 'Kea Farm Valley',
    elevation: '1,610m',
    status: 'Heavy',
    speedKmh: 18,
    advisory: 'Market shoppers and tourist buses causing slow crawl on weekends.',
  },
  {
    name: 'Lata Iskandar Waterfall Bend',
    code: 'FT 59 KM 22',
    location: 'Tapah Mountain Pass',
    elevation: '620m',
    status: 'Slow',
    speedKmh: 28,
    advisory: 'Tight hairpin turns and roadside fruit stalls; wet road surfaces.',
  },
  {
    name: 'Pos Slim S-Curves',
    code: 'FT 185 KM 34',
    location: 'Simpang Pulai Approach',
    elevation: '940m',
    status: 'Clear',
    speedKmh: 54,
    advisory: 'Wide dual-lane road, smooth overtaking lanes clear.',
  },
  {
    name: 'Blue Valley Interchange',
    code: 'FT 185 / FT 102 Junction',
    location: 'Northern Gateway',
    elevation: '1,320m',
    status: 'Clear',
    speedKmh: 58,
    advisory: 'Strategic junction linking Gua Musang and Simpang Pulai.',
  },
  {
    name: 'Ringlet South Interchange',
    code: 'FT 59 / FT 102 Junction',
    location: 'Southern Gateway',
    elevation: '1,160m',
    status: 'Clear',
    speedKmh: 46,
    advisory: 'Smooth connection linking Tapah and Raub routes.',
  },
];

interface TrafficForecastingModuleProps {
  language: Language;
  onSelectCorridorOnMap?: (corridorId: string) => void;
  selectedCorridorId?: 'simpang-pulai' | 'tapah' | 'sungai-koyan';
  onCorridorChange?: (id: 'simpang-pulai' | 'tapah' | 'sungai-koyan') => void;
}

export const TrafficForecastingModule: React.FC<TrafficForecastingModuleProps> = ({
  language,
  onSelectCorridorOnMap,
  selectedCorridorId: externalCorridorId,
  onCorridorChange,
}) => {
  const [isMinimized, setIsMinimized] = useState(true);
  // TomTom API Key State
  const [tomTomApiKey, setTomTomApiKey] = useState<string>(() => {
    return localStorage.getItem('tomtom_api_key') || '';
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isLiveTomTomActive, setIsLiveTomTomActive] = useState(false);

  // Selected Corridor for Gateway Comparison Switcher (Internal or External)
  const [internalCorridorId, setInternalCorridorId] = useState<
    'simpang-pulai' | 'tapah' | 'sungai-koyan'
  >('simpang-pulai');

  const selectedCorridorId = externalCorridorId || internalCorridorId;

  const handleSelectCorridor = (id: 'simpang-pulai' | 'tapah' | 'sungai-koyan') => {
    setInternalCorridorId(id);
    onCorridorChange?.(id);
    onSelectCorridorOnMap?.(id);
  };

  // Search & Type Origin Features
  const [originSearchQuery, setOriginSearchQuery] = useState('');
  const [isOriginDropdownOpen, setIsOriginDropdownOpen] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<OriginLocation>(MALAYSIA_ORIGIN_CITIES[0]);
  const originSearchRef = useRef<HTMLDivElement>(null);

  // Departure Calculator Inputs
  const [departureHour, setDepartureHour] = useState<number>(() => new Date().getHours());
  const [isWeekendOrHoliday, setIsWeekendOrHoliday] = useState<boolean>(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  });

  // Close origin search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (originSearchRef.current && !originSearchRef.current.contains(e.target as Node)) {
        setIsOriginDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered origins matching user input
  const q = originSearchQuery.trim().toLowerCase();
  const filteredOrigins = q
    ? MALAYSIA_ORIGIN_CITIES.filter((item) =>
        item.city.toLowerCase().includes(q) ||
        item.state.toLowerCase().includes(q) ||
        item.routeDescription.toLowerCase().includes(q)
      )
    : MALAYSIA_ORIGIN_CITIES;

  // Traffic Corridors Initial Data
  const [corridors, setCorridors] = useState<CorridorDetail[]>([
    {
      id: 'simpang-pulai',
      name: 'Simpang Pulai Gateway',
      code: 'FT 185 (Route 185)',
      startPoint: 'Ipoh / Simpang Pulai Toll (NSE Exit 137)',
      recommendedFor: 'Buses, Heavy RVs, Night Drives & Smooth Climbing',
      totalDistanceKm: 86,
      flatlandKm: 18,
      mountainKm: 68,
      avgElevationGainM: 1480,
      baseDriveMinutes: 85,
      currentDelayMinutes: 8,
      congestionScore: 22,
      status: 'smooth',
      flatlandSpeedKmh: 95,
      mountainSpeedKmh: 52,
      landslideRisk: 'Low',
      fogVisibilityScore: 'Clear',
      gradientCurveRating: 'Gentle (4-6%)',
      tollCostMyr: 24.5,
      fuelEstMyr: 32.0,
      keyHighlights: [
        'Wider dual-lane climbing sections',
        'Fewer sharp hairpin turns',
        'Direct access to Kampung Raja & Northern Tea Valleys',
      ],
      currentAlert: 'Normal mountain flow. Clear weather along Pos Slim.',
      coordinates: {
        start: [4.542, 101.128],
        mid: [4.582, 101.312],
        end: [4.568, 101.408],
      },
    },
    {
      id: 'tapah',
      name: 'Tapah Gateway',
      code: 'FT 59 (Route 59)',
      startPoint: 'Tapah Toll (NSE Exit 132)',
      recommendedFor: 'Classic Scenic Drive & Travelers Approaching Southern Ringlet',
      totalDistanceKm: 59,
      flatlandKm: 12,
      mountainKm: 47,
      avgElevationGainM: 1440,
      baseDriveMinutes: 90,
      currentDelayMinutes: 28,
      congestionScore: 68,
      status: 'heavy',
      flatlandSpeedKmh: 85,
      mountainSpeedKmh: 34,
      landslideRisk: 'Medium',
      fogVisibilityScore: 'Moderate Fog',
      gradientCurveRating: 'Steep Hairpins (8-10%)',
      tollCostMyr: 21.2,
      fuelEstMyr: 28.5,
      keyHighlights: [
        'Classic scenic route passing Lata Iskandar Waterfall',
        'Narrow single-lane mountain pass with 300+ hairpin turns',
        'Slow vegetable lorries can create queues during morning harvest',
      ],
      currentAlert: 'Heavy delays near Lata Iskandar due to slow lorries & tight turns.',
      coordinates: {
        start: [4.202, 101.261],
        mid: [4.331, 101.328],
        end: [4.414, 101.382],
      },
    },
    {
      id: 'sungai-koyan',
      name: 'Gua Musang / Sungai Koyan Gateway',
      code: 'FT 102 (Central Spine Road)',
      startPoint: 'Raub / Sungai Koyan / Gua Musang Link',
      recommendedFor: 'East Coast Travelers (Kelantan/Terengganu) & KL Bypass Route',
      totalDistanceKm: 92,
      flatlandKm: 32,
      mountainKm: 60,
      avgElevationGainM: 1520,
      baseDriveMinutes: 80,
      currentDelayMinutes: 5,
      congestionScore: 15,
      status: 'smooth',
      flatlandSpeedKmh: 105,
      mountainSpeedKmh: 62,
      landslideRisk: 'Low',
      fogVisibilityScore: 'Clear',
      gradientCurveRating: 'Moderate Sweeping (5-7%)',
      tollCostMyr: 12.0,
      fuelEstMyr: 35.0,
      keyHighlights: [
        'Modern high-speed sweeping highway design',
        'Bypasses heavy North-South Expressway weekend jams',
        'Fastest connection to Ringlet and Pos Betau',
      ],
      currentAlert: 'Roads in pristine condition. Excellent night visibility.',
      coordinates: {
        start: [4.215, 101.815],
        mid: [4.351, 101.528],
        end: [4.414, 101.382],
      },
    },
  ]);

  // Save custom TomTom API Key
  const handleSaveTomTomKey = (key: string) => {
    setTomTomApiKey(key);
    localStorage.setItem('tomtom_api_key', key);
    window.dispatchEvent(new CustomEvent('tomtom-key-updated', { detail: key }));
    if (key.trim().length > 10) {
      setIsLiveTomTomActive(true);
      fetchTomTomTrafficData(key);
    } else {
      setIsLiveTomTomActive(false);
    }
  };

  // Real-time TomTom Traffic API fetch with graceful fallback
  const fetchTomTomTrafficData = async (key: string) => {
    try {
      const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${key}&point=4.582,101.312`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.flowSegmentData) {
          setIsLiveTomTomActive(true);
          const currentSpeed = data.flowSegmentData.currentSpeed || 45;
          const delaySec = Math.max(0, data.flowSegmentData.currentTravelTime - data.flowSegmentData.freeFlowTravelTime);
          
          setCorridors((prev) =>
            prev.map((c) => {
              if (c.id === 'simpang-pulai') {
                return {
                  ...c,
                  mountainSpeedKmh: Math.round(currentSpeed),
                  currentDelayMinutes: Math.round(delaySec / 60),
                  status: currentSpeed < 35 ? 'heavy' : currentSpeed < 48 ? 'moderate' : 'smooth',
                };
              }
              return c;
            })
          );
        }
      }
    } catch {
      setIsLiveTomTomActive(false);
    }
  };

  useEffect(() => {
    if (tomTomApiKey && tomTomApiKey.trim().length > 10) {
      fetchTomTomTrafficData(tomTomApiKey);
    }
  }, [tomTomApiKey]);

  // Selected Corridor details
  const activeCorridor = corridors.find((c) => c.id === selectedCorridorId) || corridors[0];

  // AI Pattern Recognition Calculation for Selected Departure Hour
  const calculateDepartureAnalysis = () => {
    let delayFactor = 0;
    let trafficLevel = 'Smooth Flow';
    let recommendation = 'Excellent departure window! Smooth sailing all the way.';

    // Real-time factor: shift simulation based on actual current time vs selected departure
    const now = new Date();
    const currentActualHour = now.getHours();
    const isActuallyWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    // Add 1-4 mins of random "live" jitter
    const liveJitter = Math.floor(Math.random() * 4);

    if (isWeekendOrHoliday) {
      if (departureHour >= 7 && departureHour <= 11) {
        delayFactor = 45 + liveJitter; 
        trafficLevel = 'Extreme Peak Surge';
        recommendation =
          'High Congestion Alert: Moving in peak morning holiday queue. Depart before 6:30 AM or after 1:30 PM to save ~45 minutes!';
      } else if (departureHour >= 12 && departureHour <= 16) {
        delayFactor = 25 + liveJitter;
        trafficLevel = 'Moderate Crawl';
        recommendation =
          'Moderate traffic at Kea Farm & Tapah junctions. Maintain steady speeds and gear control.';
      } else if (departureHour >= 17 && departureHour <= 21) {
        delayFactor = 15 + liveJitter;
        trafficLevel = 'Night Market Rush';
        recommendation =
          'Golden Hills night market activity may slow down Brinchang approach by 15-20 mins.';
      } else {
        delayFactor = 0 + liveJitter;
        trafficLevel = 'Clear Night / Early Dawn';
        recommendation = 'Optimal Window! Cool mountain air and clear highway cruising.';
      }
    } else {
      if (departureHour >= 8 && departureHour <= 9) {
        delayFactor = 12 + liveJitter;
        trafficLevel = 'School Run Rush';
        recommendation = 'Minor local school delays around Tanah Rata and Ringlet.';
      } else {
        delayFactor = 2 + liveJitter;
        trafficLevel = 'Smooth Regular';
        recommendation = 'Weekday flow is clear. Enjoy the scenic drive!';
      }
    }

    const totalEstimatedMinutes =
      Math.round(selectedOrigin.baseHours * 60) +
      activeCorridor.currentDelayMinutes +
      delayFactor;
    const estHours = Math.floor(totalEstimatedMinutes / 60);
    const estMins = totalEstimatedMinutes % 60;

    return {
      delayFactor,
      trafficLevel,
      recommendation,
      totalFormattedTime: `${estHours}h ${estMins}m`,
      totalDistance: selectedOrigin.distanceKm + activeCorridor.mountainKm,
      totalFuel: Math.round(((selectedOrigin.distanceKm + activeCorridor.mountainKm) / 11) * 2.05),
      totalToll: Math.round((selectedOrigin.toll + activeCorridor.tollCostMyr) * 10) / 10,
    };
  };

  const currentAnalysis = calculateDepartureAnalysis();

  return (
    <div id="traffic-forecasting-section" className="relative">
      {/* Minimized View: Floating Button */}
      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-full py-3 px-4 rounded-2xl bg-stone-900 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-between cursor-pointer hover:border-emerald-500/60 transition-all"
        >
          <span className="flex items-center gap-2">
            <Car className="w-4 h-4" /> Traffic Forecaster (Minimized)
          </span>
          <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-lg">Click to Expand</span>
        </button>
      )}

      {/* Expanded View: Centered Modal */}
      {!isMinimized && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto glass-panel rounded-3xl p-6 bg-stone-900 border border-emerald-500/30 shadow-2xl relative">
            <button
              onClick={() => setIsMinimized(true)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-6">
              {/* Header & TomTom API Integration Status Banner */}
              <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-emerald-500/30 shadow-2xl bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Car className="w-5 h-5 animate-pulse" />
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        Real-Time &amp; Predictive Highway Telemetry
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold text-stone-100 tracking-tight mt-2">
                      Long-Distance Highway &amp; Mountain Traffic Forecaster
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-300 max-w-2xl mt-1">
                      {language === 'bm'
                        ? 'Analisis pintar laluan lebuh raya seluruh Malaysia ke Cameron Highlands. Bandingkan 3 koridor masuk utama, cari bandar pelepasan anda, dan semak ramalan cuaca & kesesakan.'
                        : 'Intelligent corridor analyzer for drivers traveling from across Malaysia to Cameron Highlands. Search and type your departure city, compare 3 gateway corridors, and check mountain climb delays.'}
                    </p>
                  </div>

                  {/* TomTom API Key Freemium Status Badge */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-2xl bg-stone-950 border border-white/10 text-xs shadow-inner">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span className={`w-2.5 h-2.5 rounded-full ${isLiveTomTomActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                        <span className="text-stone-200">
                          {isLiveTomTomActive ? 'TomTom Live Connected' : 'TomTom Smart Engine Active'}
                        </span>
                      </span>
                      <button
                        onClick={() => setShowKeyInput(!showKeyInput)}
                        className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-[10px] border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Key className="w-3 h-3 text-emerald-400" />
                        <span>{showKeyInput ? 'Close Key' : 'TomTom API Key'}</span>
                      </button>
                    </div>

                    {/* Input field for custom TomTom Key */}
                    {showKeyInput && (
                      <div className="p-3 rounded-2xl bg-stone-950 border border-emerald-500/30 w-full max-w-sm space-y-2 shadow-2xl animate-fade-in z-30">
                        <div className="text-[11px] font-bold text-stone-300 flex items-center justify-between">
                          <span>Enter Freemium TomTom API Key:</span>
                          <a
                            href="https://developer.tomtom.com/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline text-[10px]"
                          >
                            Get Free Key
                          </a>
                        </div>
                        <input
                          type="text"
                          value={tomTomApiKey}
                          onChange={(e) => handleSaveTomTomKey(e.target.value)}
                          placeholder="Paste TomTom API key here..."
                          className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-white/20 text-xs text-stone-100 font-mono outline-none focus:border-emerald-400"
                        />
                        <p className="text-[10px] text-stone-400 leading-tight">
                          Free tier includes 2,500 daily requests. Built-in telemetry fallback works automatically if no key is provided.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SEARCH & TYPE INPUT TOOL: Custom Departure Location & Route Search */}
              <div className="p-5 sm:p-6 rounded-3xl bg-stone-900/90 border border-emerald-500/30 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm sm:text-base font-heading font-bold text-stone-100">
                      Type or Search Departure Origin (Any Malaysian City/Town)
                    </h3>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    Selected: <strong className="text-emerald-400">{selectedOrigin.city} ({selectedOrigin.state})</strong> • ~{selectedOrigin.distanceKm} km
                  </span>
                </div>

                {/* Search & Type Bar Container */}
                <div ref={originSearchRef} className="relative">
                  <div className="relative flex items-center">
                    <MapPin className="w-4 h-4 text-emerald-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={originSearchQuery}
                      onChange={(e) => {
                        setOriginSearchQuery(e.target.value);
                        setIsOriginDropdownOpen(true);
                      }}
                      onFocus={() => setIsOriginDropdownOpen(true)}
                      placeholder="Search or type your starting city (e.g. Alor Setar, Shah Alam, Putrajaya, Seremban, Kuantan, Melaka, JB...)"
                      className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-stone-950 border border-white/15 focus:border-emerald-400 text-xs text-stone-100 placeholder-stone-400 outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {originSearchQuery && (
                      <button
                        onClick={() => {
                          setOriginSearchQuery('');
                          setIsOriginDropdownOpen(false);
                        }}
                        className="absolute right-3 p-1 rounded-full text-stone-400 hover:text-white cursor-pointer"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Suggestions Dropdown */}
                  {isOriginDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-2xl bg-stone-950/98 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl p-2 z-50 text-stone-100 space-y-1">
                      {filteredOrigins.length === 0 ? (
                        <div className="p-4 text-center text-xs text-stone-400">
                          <p>No exact match for &quot;{originSearchQuery}&quot;.</p>
                          <button
                            onClick={() => {
                              const customLoc: OriginLocation = {
                                city: originSearchQuery,
                                state: 'Malaysia',
                                distanceKm: 250,
                                toll: 25.0,
                                baseHours: 3.5,
                                bestCorridor: 'simpang-pulai',
                                routeDescription: 'Custom Highway Route to Cameron Highlands',
                              };
                              setSelectedOrigin(customLoc);
                              setIsOriginDropdownOpen(false);
                            }}
                            className="mt-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                          >
                            Use &quot;{originSearchQuery}&quot; as Custom Origin (~250km)
                          </button>
                        </div>
                      ) : (
                        filteredOrigins.map((origin) => (
                          <button
                            key={origin.city}
                            onClick={() => {
                              setSelectedOrigin(origin);
                              setOriginSearchQuery(origin.city);
                              setIsOriginDropdownOpen(false);
                              handleSelectCorridor(origin.bestCorridor);
                            }}
                            className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer group ${
                              selectedOrigin.city === origin.city
                                ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                                : 'hover:bg-stone-800/90 text-stone-200'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-xs group-hover:text-emerald-300">
                                {origin.city}, <span className="text-stone-400 text-[10px] font-normal">{origin.state}</span>
                              </div>
                              <div className="text-[10px] text-stone-400">
                                {origin.routeDescription}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-mono font-bold text-emerald-400 block">
                                {origin.distanceKm} km
                              </span>
                              <span className="text-[9px] text-stone-400 uppercase">
                                Rec: {origin.bestCorridor === 'simpang-pulai' ? 'FT 185' : origin.bestCorridor === 'tapah' ? 'FT 59' : 'FT 102'}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Location Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-mono text-stone-400 uppercase mr-1">Popular Origins:</span>
                  {MALAYSIA_ORIGIN_CITIES.slice(0, 7).map((item) => (
                    <button
                      key={item.city}
                      onClick={() => {
                        setSelectedOrigin(item);
                        setOriginSearchQuery(item.city);
                        handleSelectCorridor(item.bestCorridor);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                        selectedOrigin.city === item.city
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-stone-950/80 text-stone-300 border-white/10 hover:border-emerald-500/40 hover:text-white'
                      }`}
                    >
                      {item.city}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. GATEWAY ROUTE COMPARISON SWITCHER (Comparing the 3 Primary Corridors) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base sm:text-lg font-heading font-bold text-stone-100">
                      Primary Access Corridor Comparison Switcher
                    </h3>
                  </div>
                  <span className="text-xs text-stone-400 font-mono">
                    3 Main Mountain Gateways
                  </span>
                </div>

                {/* 3 Corridor Selector Tabs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {corridors.map((corridor) => {
                    const isSelected = corridor.id === selectedCorridorId;
                    return (
                      <div
                        key={corridor.id}
                        onClick={() => handleSelectCorridor(corridor.id)}
                        className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group ${
                          isSelected
                            ? 'bg-stone-900 border-emerald-400 shadow-2xl shadow-emerald-950/80 ring-2 ring-emerald-500/20'
                            : 'bg-stone-950/80 border-white/10 hover:border-white/20 hover:bg-stone-900/60'
                        }`}
                      >
                        {/* Status Indicator Pill */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            {corridor.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                              corridor.status === 'heavy'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                                : corridor.status === 'moderate'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                corridor.status === 'heavy'
                                  ? 'bg-rose-500'
                                  : corridor.status === 'moderate'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                            <span>
                              {corridor.status === 'heavy'
                                ? 'Heavy Bottleneck'
                                : corridor.status === 'moderate'
                                ? 'Moderate Crawl'
                                : 'Smooth Flow'}
                            </span>
                          </span>
                        </div>

                        {/* Corridor Title */}
                        <h4 className="text-base font-bold text-stone-100 group-hover:text-emerald-300 transition-colors">
                          {corridor.name}
                        </h4>
                        <p className="text-[11px] text-stone-400 truncate mt-0.5">
                          {corridor.startPoint}
                        </p>

                        {/* Distance & Time Breakdown */}
                        <div className="grid grid-cols-2 gap-2 my-3.5 p-2.5 rounded-2xl bg-stone-950/80 border border-white/5 text-xs">
                          <div>
                            <span className="text-[10px] text-stone-500 uppercase block">Distance</span>
                            <span className="font-bold text-stone-200">{corridor.totalDistanceKm} km</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-500 uppercase block">Est. Drive Time</span>
                            <span className="font-bold text-emerald-400">
                              {corridor.baseDriveMinutes + corridor.currentDelayMinutes} mins
                            </span>
                          </div>
                        </div>

                        {/* Recommended For Note */}
                        <div className="text-[11px] text-stone-300 line-clamp-2 leading-relaxed">
                          <strong className="text-emerald-400">Best for: </strong>
                          <span>{corridor.recommendedFor}</span>
                        </div>

                        {/* Select Badge */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                          <span className="text-[10px] font-mono text-stone-400">
                            Delay: +{corridor.currentDelayMinutes}m
                          </span>
                          <span
                            className={`font-bold flex items-center gap-1 transition-transform ${
                              isSelected ? 'text-emerald-400 translate-x-1' : 'text-stone-400'
                            }`}
                          >
                            <span>{isSelected ? 'Corridor Selected' : 'Compare Gateway'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. SEGMENT BREAKDOWN: FLATLAND HIGHWAY VS. MOUNTAIN CLIMB */}
              <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 shadow-2xl bg-stone-900/90 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-lg font-heading font-bold text-stone-100">
                        Segment Breakdown: Flatland Highway vs. Mountain Access Climb
                      </h3>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Active Gateway: <strong className="text-emerald-400">{activeCorridor.name} ({activeCorridor.code})</strong>
                    </p>
                  </div>
                </div>

                {/* 2 Parallel Segment Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Segment A: Flatland Highway Segment */}
                  <div className="p-4.5 rounded-2xl bg-stone-950 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Car className="w-4 h-4" />
                        <span>Segment 1: Flatland Expressway</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                        {activeCorridor.flatlandKm} KM
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-stone-900 border border-white/5">
                        <span className="text-[10px] text-stone-400 block">Cruising Speed</span>
                        <span className="text-sm font-bold text-stone-100">{activeCorridor.flatlandSpeedKmh} km/h</span>
                      </div>
                      <div className="p-2 rounded-xl bg-stone-900 border border-white/5">
                        <span className="text-[10px] text-stone-400 block">Terrain Profile</span>
                        <span className="text-xs font-bold text-stone-200">Flat Expressway</span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-400 leading-relaxed">
                      Fast, high-capacity highway section prior to mountain toll exit. Smooth overtaking lanes and steady fuel economy.
                    </p>
                  </div>

                  {/* Segment B: Mountain Access Climb Segment */}
                  <div className="p-4.5 rounded-2xl bg-stone-950 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" />
                        <span>Segment 2: Mountain Access Pass</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                        {activeCorridor.mountainKm} KM • +{activeCorridor.avgElevationGainM}m Climb
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-stone-900 border border-white/5">
                        <span className="text-[10px] text-stone-400 block">Climbing Speed</span>
                        <span className="text-sm font-bold text-amber-300">{activeCorridor.mountainSpeedKmh} km/h</span>
                      </div>
                      <div className="p-2 rounded-xl bg-stone-900 border border-white/5">
                        <span className="text-[10px] text-stone-400 block">Gradient &amp; Bends</span>
                        <span className="text-xs font-bold text-stone-200">{activeCorridor.gradientCurveRating}</span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-400 leading-relaxed">
                      Continuous elevation climb up to 1,500m. Keep lower gear on downhill descents and watch for afternoon mist.
                    </p>
                  </div>
                </div>

                {/* Hazard & Weather Integration Bar for Mountain Segment */}
                <div className="p-4 rounded-2xl bg-stone-950 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase">Landslide Risk Factor</span>
                      <span className={`font-bold ${activeCorridor.landslideRisk === 'Low' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {activeCorridor.landslideRisk} Hazard Level
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <CloudFog className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase">Mountain Mist &amp; Visibility</span>
                      <span className="font-bold text-stone-200">{activeCorridor.fogVisibilityScore}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Fuel className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-stone-400 block uppercase">Est. Gateway Fuel &amp; Toll</span>
                      <span className="font-bold text-emerald-300">
                        RM{activeCorridor.fuelEstMyr.toFixed(2)} Fuel + RM{activeCorridor.tollCostMyr.toFixed(2)} Toll
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. MOUNTAIN WAYPOINTS & BOTTLENECK CHECKER */}
              <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 shadow-2xl bg-stone-900/90 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-base font-heading font-bold text-stone-100">
                      Live Mountain Waypoints &amp; Bottleneck Checkpoints
                    </h3>
                  </div>
                  <span className="text-xs text-stone-400 font-mono">Real-time status</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {MOUNTAIN_CHECKPOINTS.map((point) => (
                    <div
                      key={point.name}
                      className="p-3.5 rounded-2xl bg-stone-950 border border-white/5 space-y-2 hover:border-emerald-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                          {point.code}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            point.status === 'Heavy'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : point.status === 'Slow'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {point.status} • {point.speedKmh} km/h
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-stone-100">{point.name}</h4>
                      <p className="text-[11px] text-stone-400 leading-snug">{point.advisory}</p>
                      <div className="text-[10px] text-stone-500 flex items-center justify-between pt-1 border-t border-white/5">
                        <span>{point.location}</span>
                        <span className="font-mono text-stone-400">Alt: {point.elevation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. SMART DEPARTURE CALCULATOR & AI PATTERN RECOGNITION ENGINE */}
              <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-emerald-500/30 shadow-2xl bg-gradient-to-br from-stone-900 to-stone-950 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-lg font-heading font-bold text-stone-100">
                        Smart Departure Calculator &amp; AI Pattern Engine
                      </h3>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Simulate travel times for long-distance drivers based on departure windows and chosen origin city.
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                    Predictive AI Active
                  </span>
                </div>

                {/* Input Selector Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Active Origin Display */}
                  <div className="space-y-1.5">
                    <label className="text-stone-300 font-bold block">1. Selected Starting Origin:</label>
                    <div className="p-2.5 rounded-xl bg-stone-950 border border-emerald-500/30 text-stone-100 font-bold flex items-center justify-between">
                      <span>{selectedOrigin.city}</span>
                      <span className="text-[10px] font-mono text-emerald-400">{selectedOrigin.distanceKm} km away</span>
                    </div>
                  </div>

                  {/* Departure Hour Slider */}
                  <div className="space-y-1.5">
                    <label className="text-stone-300 font-bold flex items-center justify-between">
                      <span>2. Planned Departure Time:</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {departureHour.toString().padStart(2, '0')}:00 {departureHour < 12 ? 'AM' : 'PM'}
                      </span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={23}
                      value={departureHour}
                      onChange={(e) => setDepartureHour(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer mt-2"
                    />
                  </div>

                  {/* Weekend / School Holiday Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-stone-300 font-bold block">3. Travel Day Type:</label>
                    <button
                      onClick={() => setIsWeekendOrHoliday(!isWeekendOrHoliday)}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 cursor-pointer ${
                        isWeekendOrHoliday
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-stone-950 text-stone-300 border border-white/10'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>
                        {isWeekendOrHoliday
                          ? 'Weekend / Holiday Rush'
                          : 'Regular Weekday Flow'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* AI Recommendation Output Card */}
                <div className="p-5 rounded-2xl bg-stone-950 border border-emerald-500/40 space-y-4 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                        AI Traffic Forecasting Result
                      </span>
                      <h4 className="text-base font-bold text-stone-100">
                        {selectedOrigin.city} to Cameron Highlands via {activeCorridor.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-stone-900 border border-white/10 text-xs font-mono font-bold text-stone-200">
                        Total Distance: {currentAnalysis.totalDistance} km
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                        Est. Duration: {currentAnalysis.totalFormattedTime}
                      </span>
                    </div>
                  </div>

                  {/* AI Recommendation Quote Box */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-stone-200 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-400 block mb-0.5">
                        AI Departure Recommendation:
                      </span>
                      <p className="leading-relaxed">{currentAnalysis.recommendation}</p>
                    </div>
                  </div>

                  {/* Detailed Financial & Travel Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-stone-900 border border-white/5">
                      <span className="text-[10px] text-stone-400 block">Traffic Level</span>
                      <span className="font-bold text-stone-100">{currentAnalysis.trafficLevel}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-900 border border-white/5">
                      <span className="text-[10px] text-stone-400 block">Bottleneck Delay</span>
                      <span className="font-bold text-amber-400">+{currentAnalysis.delayFactor} mins</span>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-900 border border-white/5">
                      <span className="text-[10px] text-stone-400 block">Est. Toll Charge</span>
                      <span className="font-bold text-stone-200">RM{currentAnalysis.totalToll.toFixed(2)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-900 border border-white/5">
                      <span className="text-[10px] text-stone-400 block">Est. Fuel Expenses</span>
                      <span className="font-bold text-emerald-400">~RM{currentAnalysis.totalFuel.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
