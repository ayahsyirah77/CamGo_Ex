import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';

// Safely expose Leaflet globally for any legacy plugin or runtime inspection
if (typeof window !== 'undefined') {
  (window as any).L = L;
}

import { Place, Township, MainCategory, Language, PlaceReview } from '../types';
import { firebaseService } from '../services/firebase';
import { TOWNSHIP_PORTALS } from '../data/initialData';
import { getTranslation } from '../services/i18n';
import { geminiService, TrafficAnalysisResult } from '../services/gemini';
import {
  formatTimeTo12Hour,
  getTodayDaySchedule,
  getTodayDayName,
} from '../utils/highlandLogic';
import {
  Layers,
  MapPin,
  Compass,
  Navigation2,
  Maximize2,
  Sparkles,
  Phone,
  Clock,
  Car,
  AlertCircle,
  AlertTriangle,
  Eye,
  X,
  RotateCcw,
  ZoomIn,
  Search,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Activity,
  GripHorizontal,
  Move,
  ShieldAlert,
  Route,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Play,
  Pause,
  Square,
  CloudSun,
  Briefcase,
  Wrench,
  Megaphone,
  Utensils,
  Hotel,
  Palmtree,
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  ArrowLeft,
  LocateFixed,
} from 'lucide-react';
import { TrafficForecastingModule } from './TrafficForecastingModule';
import { OperationalStatusBadges } from './OperationalStatusBadges';
import { RouteOptimizer } from '../lib/ai/routeOptimizer';
import { TelemetryMonitor } from '../lib/ai/telemetryMonitor';

const aiRouteOptimizer = new RouteOptimizer();
const telemetryMonitor = new TelemetryMonitor();

export interface TrafficPolylineSegment {
  id: string;
  name: string;
  corridor: 'simpang-pulai' | 'tapah' | 'sungai-koyan' | 'central';
  color: string;
  speedKmh: number;
  condition: 'clear' | 'moderate' | 'heavy' | 'gridlock';
  statusLabel: string;
  delayMins: number;
  coordinates: [number, number][];
  advisory: string;
}

export interface CongestionHotspotPoint {
  id: string;
  name: string;
  corridor: string;
  coords: [number, number];
  severity: 'gridlock' | 'heavy' | 'moderate';
  color: string;
  speedKmh: number;
  delayMins: number;
  cause: string;
  bypassTip: string;
}

export const HIGHWAY_TRAFFIC_SEGMENTS: TrafficPolylineSegment[] = [
  // --- FT 185 Simpang Pulai Gateway ---
  {
    id: 'ft185-flatland',
    name: 'FT 185 Simpang Pulai Foothill Pass',
    corridor: 'simpang-pulai',
    color: '#10b981', // TomTom Green
    speedKmh: 88,
    condition: 'clear',
    statusLabel: 'Free Flow',
    delayMins: 0,
    coordinates: [
      [4.542, 101.128],
      [4.549, 101.165],
      [4.555, 101.198],
      [4.560, 101.220],
    ],
    advisory: 'Wide dual-lane expressway approach. Free flow speed.',
  },
  {
    id: 'ft185-pos-slim',
    name: 'FT 185 Pos Slim Mountain Ascent',
    corridor: 'simpang-pulai',
    color: '#f59e0b', // TomTom Amber
    speedKmh: 42,
    condition: 'moderate',
    statusLabel: 'Moderate Crawl',
    delayMins: 6,
    coordinates: [
      [4.560, 101.220],
      [4.571, 101.265],
      [4.582, 101.312],
      [4.578, 101.355],
      [4.572, 101.395],
    ],
    advisory: 'Moderate crawl behind agricultural lorries on climbing grade.',
  },
  {
    id: 'ft185-blue-valley',
    name: 'FT 185 Blue Valley to Kampung Raja',
    corridor: 'simpang-pulai',
    color: '#10b981', // TomTom Green
    speedKmh: 54,
    condition: 'clear',
    statusLabel: 'Smooth Flow',
    delayMins: 1,
    coordinates: [
      [4.572, 101.395],
      [4.5683, 101.4087],
      [4.560, 101.412],
    ],
    advisory: 'Paved highland straight into northern tea valleys.',
  },

  // --- FT 59 Tapah Gateway ---
  {
    id: 'ft59-tapah-lowland',
    name: 'FT 59 Tapah Foothill Approach',
    corridor: 'tapah',
    color: '#10b981', // TomTom Green
    speedKmh: 72,
    condition: 'clear',
    statusLabel: 'Clear',
    delayMins: 0,
    coordinates: [
      [4.202, 101.261],
      [4.240, 101.275],
      [4.280, 101.295],
    ],
    advisory: 'NSE Exit 132 connection to foothills. Normal speeds.',
  },
  {
    id: 'ft59-lata-iskandar-approach',
    name: 'FT 59 Lata Iskandar Mountain Hairpins',
    corridor: 'tapah',
    color: '#f59e0b', // TomTom Amber
    speedKmh: 36,
    condition: 'moderate',
    statusLabel: 'Winding Crawl',
    delayMins: 7,
    coordinates: [
      [4.280, 101.295],
      [4.305, 101.310],
      [4.325, 101.322],
    ],
    advisory: '300+ tight hairpin turns. Heavy brake usage required.',
  },
  {
    id: 'ft59-lata-iskandar-choke',
    name: 'FT 59 Lata Iskandar Waterfall Squeeze',
    corridor: 'tapah',
    color: '#ef4444', // TomTom Red
    speedKmh: 20,
    condition: 'heavy',
    statusLabel: 'Heavy Delays',
    delayMins: 16,
    coordinates: [
      [4.325, 101.322],
      [4.331, 101.328],
      [4.340, 101.338],
    ],
    advisory: 'Tourist vehicles stopping along roadside stalls and falls.',
  },
  {
    id: 'ft59-ascent-ringlet',
    name: 'FT 59 Lata Iskandar to Ringlet Climb',
    corridor: 'tapah',
    color: '#f59e0b', // TomTom Amber
    speedKmh: 34,
    condition: 'moderate',
    statusLabel: 'Steep Climb',
    delayMins: 8,
    coordinates: [
      [4.340, 101.338],
      [4.375, 101.355],
      [4.400, 101.370],
      [4.4147, 101.3820],
    ],
    advisory: 'Narrow mountain road ascending to southern gateway Ringlet.',
  },

  // --- FT 102 Gua Musang / Sg Koyan Central Spine Road ---
  {
    id: 'ft102-csr-expressway',
    name: 'FT 102 Central Spine Road (Raub / Sg Koyan)',
    corridor: 'sungai-koyan',
    color: '#10b981', // TomTom Green
    speedKmh: 96,
    condition: 'clear',
    statusLabel: 'Fast Free Flow',
    delayMins: 0,
    coordinates: [
      [4.215, 101.815],
      [4.260, 101.750],
      [4.320, 101.650],
    ],
    advisory: 'Modern dual-carriageway with high overtaking safety.',
  },
  {
    id: 'ft102-mountain-sweep',
    name: 'FT 102 Pos Betau to Ringlet Mountain Sweep',
    corridor: 'sungai-koyan',
    color: '#10b981', // TomTom Green
    speedKmh: 64,
    condition: 'clear',
    statusLabel: 'Gentle Gradients',
    delayMins: 2,
    coordinates: [
      [4.320, 101.650],
      [4.345, 101.580],
      [4.351, 101.528],
      [4.380, 101.450],
      [4.4147, 101.3820],
    ],
    advisory: 'Wide radius sweeping turns. Fastest ascent with lowest delay.',
  },

  // --- Highland Central Valley Spine (FT 59 Intra-Highland) ---
  {
    id: 'central-ringlet-tanah-rata',
    name: 'Ringlet to Tanah Rata Valley Pass',
    corridor: 'central',
    color: '#f59e0b', // TomTom Amber
    speedKmh: 36,
    condition: 'moderate',
    statusLabel: 'Steady Flow',
    delayMins: 5,
    coordinates: [
      [4.4147, 101.3820],
      [4.435, 101.379],
      [4.455, 101.381],
      [4.4715, 101.3805],
    ],
    advisory: 'Moderate traffic approaching Tanah Rata municipal centre.',
  },
  {
    id: 'central-tanah-rata-town',
    name: 'Tanah Rata Town Commercial Strip',
    corridor: 'central',
    color: '#ef4444', // TomTom Red
    speedKmh: 18,
    condition: 'heavy',
    statusLabel: 'Township Congestion',
    delayMins: 10,
    coordinates: [
      [4.4715, 101.3805],
      [4.478, 101.382],
      [4.4815, 101.3855],
    ],
    advisory: 'Heavy town center traffic at taxi stands and banks.',
  },
  {
    id: 'central-golden-hills-brinchang',
    name: 'Golden Hills to Brinchang Commercial Hub',
    corridor: 'central',
    color: '#ef4444', // TomTom Red
    speedKmh: 16,
    condition: 'heavy',
    statusLabel: 'Tourist Crawl',
    delayMins: 14,
    coordinates: [
      [4.4815, 101.3855],
      [4.486, 101.387],
      [4.4905, 101.3892],
    ],
    advisory: 'Weekend Pasar Malam congestion & hotel turn-offs.',
  },
  {
    id: 'central-kea-farm-gridlock',
    name: 'Brinchang to Kea Farm Agro Market Choke',
    corridor: 'central',
    color: '#dc2626', // TomTom Crimson (Severe Gridlock)
    speedKmh: 7,
    condition: 'gridlock',
    statusLabel: 'Critical Gridlock',
    delayMins: 28,
    coordinates: [
      [4.4905, 101.3892],
      [4.496, 101.398],
      [4.500, 101.403],
      [4.5028, 101.4072],
      [4.506, 101.412],
    ],
    advisory: 'Severe bottleneck. Market car parks full; pedestrian spillover.',
  },
  {
    id: 'central-kea-tringkap',
    name: 'Kea Farm to Tringkap & Kuala Terla',
    corridor: 'central',
    color: '#f59e0b', // TomTom Amber
    speedKmh: 38,
    condition: 'moderate',
    statusLabel: 'Gradual Clearing',
    delayMins: 4,
    coordinates: [
      [4.506, 101.412],
      [4.5126, 101.4258],
      [4.530, 101.422],
      [4.5458, 101.4172],
    ],
    advisory: 'Traffic opens up heading down towards vegetable farms.',
  },
  {
    id: 'central-terla-raja',
    name: 'Kuala Terla to Kampung Raja Hub',
    corridor: 'central',
    color: '#10b981', // TomTom Green
    speedKmh: 52,
    condition: 'clear',
    statusLabel: 'Clear Mountain Route',
    delayMins: 1,
    coordinates: [
      [4.5458, 101.4172],
      [4.558, 101.413],
      [4.5683, 101.4087],
    ],
    advisory: 'Smooth route linking Northern Highlands to Simpang Pulai exit.',
  },
];

export const CONGESTION_HOTSPOTS: CongestionHotspotPoint[] = [
  {
    id: 'hotspot-kea-farm',
    name: 'Kea Farm Market Gridlock',
    corridor: 'Central Highland Spine',
    coords: [4.5028, 101.4072],
    severity: 'gridlock',
    color: '#dc2626',
    speedKmh: 7,
    delayMins: 28,
    cause: 'Agro Bazaar parking queue spillover & tourist road crossing.',
    bypassTip: 'Arrive before 9:30 AM or after 5:30 PM. Consider Habu bypass route.',
  },
  {
    id: 'hotspot-lata-iskandar',
    name: 'Lata Iskandar Waterfall Pass',
    corridor: 'Tapah Corridor (FT 59)',
    coords: [4.3310, 101.3280],
    severity: 'heavy',
    color: '#ef4444',
    speedKmh: 20,
    delayMins: 16,
    cause: 'Roadside fruit stall pull-ins and narrow single-lane hairpin turn.',
    bypassTip: 'FT 185 Simpang Pulai provides dual-lane overtaking if prone to car sickness.',
  },
  {
    id: 'hotspot-golden-hills',
    name: 'Golden Hills Night Market Strip',
    corridor: 'Tanah Rata – Brinchang Link',
    coords: [4.4815, 101.3855],
    severity: 'heavy',
    color: '#ef4444',
    speedKmh: 14,
    delayMins: 18,
    cause: 'Weekend evening Pasar Malam shoppers parking on roadside shoulders.',
    bypassTip: 'Park in Tanah Rata town and take local shuttle or arrive by 4:00 PM.',
  },
  {
    id: 'hotspot-pos-slim',
    name: 'Pos Slim Incline Crawl',
    corridor: 'Simpang Pulai Corridor (FT 185)',
    coords: [4.5600, 101.2200],
    severity: 'moderate',
    color: '#f59e0b',
    speedKmh: 38,
    delayMins: 6,
    cause: 'Heavy laden vegetable trucks crawling up 6% mountain grade.',
    bypassTip: 'Utilize dedicated uphill overtaking passing lanes safely.',
  },
  {
    id: 'hotspot-blue-valley',
    name: 'Blue Valley – Kampung Raja Merge',
    corridor: 'FT 185 x FT 102 Junction',
    coords: [4.5683, 101.4087],
    severity: 'moderate',
    color: '#f59e0b',
    speedKmh: 32,
    delayMins: 5,
    cause: 'Convergence of traffic from Ipoh and Gua Musang routes.',
    bypassTip: 'Exercise caution and switch on fog headlights during afternoon mist.',
  },
  {
    id: 'hotspot-tanah-rata-roundabout',
    name: 'Tanah Rata Municipal Roundabout',
    corridor: 'Tanah Rata Town Center',
    coords: [4.4715, 101.3805],
    severity: 'heavy',
    color: '#ef4444',
    speedKmh: 18,
    delayMins: 10,
    cause: 'Central hub bus terminal entries, taxi ranks, and food street access.',
    bypassTip: 'Avoid 12:00 PM – 2:30 PM peak lunch hours.',
  },
];

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSecs: number;
  icon: string;
}

export interface TurnByTurnRoute {
  originName: string;
  originCoords: [number, number];
  destinationName: string;
  destinationCoords: [number, number];
  distanceKm: number;
  durationMins: number;
  aiAdjustedMins?: number;
  steps: RouteStep[];
  coordinates: [number, number][];
  waypoints?: Array<{ lat: number; lng: number; name: string }>;
}

interface InteractiveMapProps {
  places: Place[];
  language: Language;
  selectedPlace: Place | null;
  onSelectPlace: (place: Place | null) => void;
  filterCategory?: MainCategory | 'all';
  filterTownship?: Township | 'all';
  originCoords?: { lat: number; lng: number; name?: string } | null;
  destinationCoords?: { lat: number; lng: number; name?: string } | null;
  onClose?: () => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  places,
  language,
  selectedPlace,
  onSelectPlace,
  filterCategory = 'all',
  filterTownship = 'all',
  originCoords = null,
  destinationCoords = null,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const townshipLayerRef = useRef<L.LayerGroup | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);

  // Turn-by-Turn GPS Live Routing States & Refs
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const routingControlRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);

  const [activeRoute, setActiveRoute] = useState<TurnByTurnRoute | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  // Auto-minimized on mobile (< 640px) so it does not block the map; open on desktop
  const [routeStepsOpen, setRouteStepsOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 640 : false;
  });
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isTrackingLive, setIsTrackingLive] = useState<boolean>(false);
  const [isNavigationPaused, setIsNavigationPaused] = useState<boolean>(false);
  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState<boolean>(true);
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  const [activeMapType, setActiveMapType] = useState<'osm' | 'satellite' | 'terrain'>('osm');
  const [activeCategory, setActiveCategory] = useState<MainCategory | 'all'>(filterCategory);
  const [activeTownship, setActiveTownship] = useState<Township | 'all'>(filterTownship);
  const [activeSubCategory, setActiveSubCategory] = useState<string | 'all'>('all');
  const [proximityRadius, setProximityRadius] = useState<'all' | '5' | '10' | '25'>('all');
  const [isRadiusMenuOpen, setIsRadiusMenuOpen] = useState<boolean>(false);
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewComment, setNewReviewComment] = useState<string>('');
  const [newReviewAuthor, setNewReviewAuthor] = useState<string>('');

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState<boolean>(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  
  // AI States
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [activeTelemetryAlert, setActiveTelemetryAlert] = useState<{ type: string; message: string; severity: string } | null>(null);

  // Close dropdown on click/touch outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target as Node)
      ) {
        setIsFilterMenuOpen(false);
      }
    };

    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isFilterMenuOpen]);

  // AI Traffic Analysis State
  const [analyzingTraffic, setAnalyzingTraffic] = useState(false);
  const [trafficResult, setTrafficResult] = useState<TrafficAnalysisResult | null>(null);
  
  // Offline Map State
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const drawControlRef = useRef<any>(null);

  // Street View 360 Panorama Modal State
  const [streetViewOpen, setStreetViewOpen] = useState(false);
  const [panoramaHeading, setPanoramaHeading] = useState(45);
  const [cardZoom, setCardZoom] = useState(1);

  // Corridor Polyline Highlight State
  const corridorLayerRef = useRef<L.Polyline | null>(null);

  // Live TomTom Traffic Flow Layer & Overlay States
  const trafficOverlayLayerRef = useRef<L.LayerGroup | null>(null);
  const tomtomRasterTileRef = useRef<L.TileLayer | null>(null);
  const [isTrafficOverlayActive, setIsTrafficOverlayActive] = useState<boolean>(true);
  const [trafficLegendOpen, setTrafficLegendOpen] = useState<boolean>(false);
  const [selectedHotspot, setSelectedHotspot] = useState<CongestionHotspotPoint | null>(null);
  const [tomTomKeyPresent, setTomTomKeyPresent] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('tomtom_api_key'));
  });

  const [isVoiceNavEnabled, setIsVoiceNavEnabled] = useState(true);
  const spokenStepsMapRef = useRef<Record<number, boolean>>({});
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  // Requirement 3: Async Voice Loading for Android & Mobile Browsers
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const handleVoicesChanged = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
      }
    };
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    handleVoicesChanged();
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Requirement 1: User Gesture / Audio Unlock (iOS Fix)
  const unlockAudioEngine = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const dummy = new SpeechSynthesisUtterance('');
      dummy.volume = 0;
      window.speechSynthesis.speak(dummy);
    } catch (e) {
      console.warn('[TTS] Audio unlock warning:', e);
    }
  };

  const speakInstruction = (text: string) => {
    if (!isVoiceNavEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      // Requirement 2: Speech Queue Management (cancel stuck utterances)
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'bm' ? 'ms-MY' : 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[TTS] Speech synthesis error:', e);
    }
  };

  const [trafficSegments, setTrafficSegments] = useState<TrafficPolylineSegment[]>(HIGHWAY_TRAFFIC_SEGMENTS);
  const [congestionHotspots, setCongestionHotspots] = useState<CongestionHotspotPoint[]>(CONGESTION_HOTSPOTS);

  // Periodically refresh/simluate traffic data pulse
  useEffect(() => {
    const updateSimulatedTraffic = () => {
      if (localStorage.getItem('tomtom_api_key')) return; // Don't simulate if real key is present

      const now = new Date();
      const hour = now.getHours();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;

      setTrafficSegments(prev => prev.map(seg => {
        let speedMult = 1.0;
        let delayMult = 1.0;

        // Peak/Off-peak Simulation Logic
        if (hour >= 22 || hour <= 6) {
          speedMult = 1.3; // Night free flow
          delayMult = 0.05; // Almost zero delay
        } else if (isWeekend && hour >= 10 && hour <= 17) {
          speedMult = 0.6; // Heavy weekend daytime
          delayMult = 1.8;
        } else if (hour >= 11 && hour <= 14) {
          speedMult = 0.8; // Weekday lunch peak
          delayMult = 1.2;
        }
        
        const jitter = 0.95 + (Math.random() * 0.1);
        const newSpeed = Math.round(seg.speedKmh * speedMult * jitter);
        const newDelay = Math.round(seg.delayMins * delayMult * jitter);
        
        // Dynamic status based on speed
        let status: 'clear' | 'moderate' | 'heavy' | 'gridlock' = 'clear';
        if (newSpeed < 15) status = 'gridlock';
        else if (newSpeed < 30) status = 'heavy';
        else if (newSpeed < 45) status = 'moderate';

        return {
          ...seg,
          speedKmh: newSpeed,
          delayMins: newDelay,
          condition: status,
          statusLabel: status === 'gridlock' ? 'Critical Gridlock' : status === 'heavy' ? 'Heavy Delays' : status === 'moderate' ? 'Moderate Crawl' : 'Free Flow',
          color: status === 'gridlock' ? '#dc2626' : status === 'heavy' ? '#ef4444' : status === 'moderate' ? '#f59e0b' : '#10b981'
        };
      }));

      setCongestionHotspots(prev => prev.map(hot => {
        let delayMult = 1.0;
        if (hour >= 19 || hour <= 7) {
          delayMult = 0.1; // Night/Evening clearing at tourist spots
        } else if (isWeekend) {
          delayMult = 1.5;
        }

        const jitter = 0.9 + (Math.random() * 0.2);
        const newDelay = Math.round(hot.delayMins * delayMult * jitter);
        const newSpeed = Math.round(hot.speedKmh * (1/delayMult || 1) * jitter);

        return {
          ...hot,
          speedKmh: Math.max(5, Math.min(80, newSpeed)),
          delayMins: newDelay,
          severity: newDelay > 20 ? 'gridlock' : newDelay > 10 ? 'heavy' : 'moderate',
          color: newDelay > 20 ? '#dc2626' : newDelay > 10 ? '#ef4444' : '#f59e0b'
        };
      }));
    };

    const interval = setInterval(updateSimulatedTraffic, 1000 * 60 * 5); // Update every 5 mins
    updateSimulatedTraffic(); // Initial call
    return () => clearInterval(interval);
  }, []);

  // Real-Time Distance & Mountain Driving Time Calculator (Haversine Formula)
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  };

  const CORRIDOR_POLYLINES: Record<string, { coords: [number, number][]; color: string; name: string }> = {
    'simpang-pulai': {
      name: 'Simpang Pulai Corridor (FT 185)',
      color: '#10b981',
      coords: [
        [4.542, 101.128],
        [4.560, 101.220],
        [4.582, 101.312],
        [4.568, 101.408],
        [4.490, 101.389],
      ],
    },
    'tapah': {
      name: 'Tapah Corridor (FT 59)',
      color: '#f59e0b',
      coords: [
        [4.202, 101.261],
        [4.280, 101.295],
        [4.331, 101.328],
        [4.414, 101.382],
        [4.471, 101.380],
      ],
    },
    'sungai-koyan': {
      name: 'Sungai Koyan / Gua Musang Corridor (FT 102)',
      color: '#06b6d4',
      coords: [
        [4.215, 101.815],
        [4.320, 101.650],
        [4.351, 101.528],
        [4.414, 101.382],
        [4.471, 101.380],
      ],
    },
  };

  const handleSelectCorridorOnMap = (corridorId: string) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (corridorLayerRef.current) {
      map.removeLayer(corridorLayerRef.current);
      corridorLayerRef.current = null;
    }

    const corridorData = CORRIDOR_POLYLINES[corridorId] || CORRIDOR_POLYLINES['simpang-pulai'];
    if (corridorData) {
      const polyline = L.polyline(corridorData.coords, {
        color: corridorData.color,
        weight: 6,
        opacity: 0.9,
      }).addTo(map);

      corridorLayerRef.current = polyline;

      map.fitBounds(polyline.getBounds(), {
        padding: [50, 50],
        maxZoom: 12,
      });
    }
  };

  // Map Traffic Search & Forecasting Navigation Feature
  const [mapTrafficSearchQuery, setMapTrafficSearchQuery] = useState('');
  const [isTrafficSearchDropdownOpen, setIsTrafficSearchDropdownOpen] = useState(false);
  const [selectedCorridorId, setSelectedCorridorId] = useState<
    'simpang-pulai' | 'tapah' | 'sungai-koyan'
  >('simpang-pulai');
  const trafficSearchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (trafficSearchRef.current && !trafficSearchRef.current.contains(e.target as Node)) {
        setIsTrafficSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const TRAFFIC_NAV_ITEMS = [
    {
      id: 'simpang-pulai',
      type: 'corridor' as const,
      corridorId: 'simpang-pulai' as const,
      title: 'Simpang Pulai Corridor (FT 185)',
      subtitle: 'Ipoh / Simpang Pulai Toll -> Kampung Raja (Gentle slope, dual lanes)',
      badge: 'FT 185',
      color: 'text-emerald-400',
      coords: [4.582, 101.312] as [number, number],
      zoom: 11,
    },
    {
      id: 'tapah',
      type: 'corridor' as const,
      corridorId: 'tapah' as const,
      title: 'Tapah Corridor (FT 59)',
      subtitle: 'Tapah Toll -> Lata Iskandar -> Ringlet (300+ hairpin turns, scenic)',
      badge: 'FT 59',
      color: 'text-amber-400',
      coords: [4.331, 101.328] as [number, number],
      zoom: 11,
    },
    {
      id: 'sungai-koyan',
      type: 'corridor' as const,
      corridorId: 'sungai-koyan' as const,
      title: 'Gua Musang / Sungai Koyan Corridor (FT 102)',
      subtitle: 'Central Spine Road -> Raub / Pos Betau -> Ringlet (High-speed sweeping curves)',
      badge: 'FT 102',
      color: 'text-cyan-400',
      coords: [4.351, 101.528] as [number, number],
      zoom: 11,
    },
    {
      id: 'choke-kea-farm',
      type: 'checkpoint' as const,
      corridorId: 'simpang-pulai' as const,
      title: 'Kea Farm Bottleneck Hotspot',
      subtitle: 'Peak mountain market zone • Expect holiday queues',
      badge: 'Bottleneck',
      color: 'text-rose-400',
      coords: [4.5028, 101.4072] as [number, number],
      zoom: 15,
    },
    {
      id: 'choke-lata-iskandar',
      type: 'checkpoint' as const,
      corridorId: 'tapah' as const,
      title: 'Lata Iskandar Waterfall Pass',
      subtitle: 'FT 59 mountain climb • Hairpin turns & roadside stalls',
      badge: 'Scenic Pass',
      color: 'text-amber-400',
      coords: [4.331, 101.328] as [number, number],
      zoom: 14,
    },
    {
      id: 'origin-kl',
      type: 'origin' as const,
      corridorId: 'simpang-pulai' as const,
      title: 'Kuala Lumpur / Klang Valley (NSE E1)',
      subtitle: 'Travel Northbound via Simpang Pulai (FT 185) or Tapah (FT 59)',
      badge: '~205 km',
      color: 'text-emerald-400',
      coords: [4.542, 101.128] as [number, number],
      zoom: 10,
    },
    {
      id: 'origin-penang',
      type: 'origin' as const,
      corridorId: 'simpang-pulai' as const,
      title: 'Penang / Ipoh (NSE E1 South)',
      subtitle: 'Direct mountain entry via Exit 137 Simpang Pulai',
      badge: '~88-245 km',
      color: 'text-emerald-400',
      coords: [4.542, 101.128] as [number, number],
      zoom: 10,
    },
    {
      id: 'origin-eastcoast',
      type: 'origin' as const,
      corridorId: 'sungai-koyan' as const,
      title: 'East Coast / Gua Musang / Kuantan',
      subtitle: 'Direct connection via FT 102 Central Spine Road',
      badge: 'FT 102',
      color: 'text-cyan-400',
      coords: [4.351, 101.528] as [number, number],
      zoom: 10,
    },
  ];

  const searchQueryTrimmed = mapTrafficSearchQuery.trim().toLowerCase();

  const matchingPlaceResults = searchQueryTrimmed
    ? places.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(searchQueryTrimmed) || (p.nameBm && p.nameBm.toLowerCase().includes(searchQueryTrimmed));
        const townMatch = p.township.toLowerCase().includes(searchQueryTrimmed);
        const subCatMatch = p.subCategory && p.subCategory.toLowerCase().includes(searchQueryTrimmed);
        const catMatch = p.category.toLowerCase().includes(searchQueryTrimmed);
        const tagMatch = p.tags && p.tags.some((t) => t.toLowerCase().includes(searchQueryTrimmed));
        return nameMatch || townMatch || subCatMatch || catMatch || tagMatch;
      }).slice(0, 6)
    : [];

  const filteredTrafficNavItems = searchQueryTrimmed
    ? TRAFFIC_NAV_ITEMS.filter((item) =>
        item.title.toLowerCase().includes(searchQueryTrimmed) ||
        item.subtitle.toLowerCase().includes(searchQueryTrimmed) ||
        item.badge.toLowerCase().includes(searchQueryTrimmed)
      )
    : TRAFFIC_NAV_ITEMS;

  const handleSelectPlaceOnMap = (place: Place) => {
    onSelectPlace(place);
    setMapTrafficSearchQuery(language === 'bm' ? place.nameBm || place.name : place.name);
    setIsTrafficSearchDropdownOpen(false);

    if (mapInstanceRef.current) {
      const defaultCoord = TOWNSHIP_COORDS[place.township] || { lat: 4.475, lng: 101.385 };
      const lat = Number(place.coordinates?.lat);
      const lng = Number(place.coordinates?.lng);
      const validLat = !isNaN(lat) && lat !== 0 ? lat : defaultCoord.lat;
      const validLng = !isNaN(lng) && lng !== 0 ? lng : defaultCoord.lng;

      mapInstanceRef.current.flyTo([validLat, validLng], 16, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  };

  const handleSelectTrafficNav = (item: (typeof TRAFFIC_NAV_ITEMS)[0]) => {
    setMapTrafficSearchQuery(item.title);
    setIsTrafficSearchDropdownOpen(false);
    setSelectedCorridorId(item.corridorId);
    handleSelectCorridorOnMap(item.corridorId);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(item.coords, item.zoom, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = mapTrafficSearchQuery.trim();
      if (!query) return;

      // Check if it's likely a natural language query (contains spaces, more than 3 words)
      if (query.split(' ').length > 2) {
        setIsAiSearching(true);
        try {
          const intent = await geminiService.parseSpatialIntent(query);
          if (intent && intent.category) {
            // Find a place that matches the category
            const matches = places.filter(p => 
              p.category.toLowerCase().includes(intent.category.toLowerCase()) ||
              (p.subCategory && p.subCategory.toLowerCase().includes(intent.category.toLowerCase())) ||
              (p.tags && p.tags.some(t => t.toLowerCase().includes(intent.category.toLowerCase())))
            );
            
            if (matches.length > 0) {
              handleSelectPlaceOnMap(matches[0]);
              setIsAiSearching(false);
              return;
            }
          }
        } catch (err) {
          console.warn('AI search error:', err);
        }
        setIsAiSearching(false);
      }

      if (matchingPlaceResults.length > 0) {
        handleSelectPlaceOnMap(matchingPlaceResults[0]);
      } else if (filteredTrafficNavItems.length > 0) {
        handleSelectTrafficNav(filteredTrafficNavItems[0]);
      }
    }
  };

  // Listen for close-traffic-forecaster event to reset map scroll & invalidate map size
  useEffect(() => {
    const handleCloseForecaster = () => {
      if (mapContainerRef.current) {
        const parentScroll = mapContainerRef.current.closest('.overflow-y-auto') || window;
        if ('scrollTo' in parentScroll) {
          parentScroll.scrollTo({ top: 0, behavior: 'instant' });
        }
      }
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 100);
      }
    };
    window.addEventListener('close-traffic-forecaster', handleCloseForecaster);
    return () => window.removeEventListener('close-traffic-forecaster', handleCloseForecaster);
  }, []);

  const handleScrollToForecaster = () => {
    window.dispatchEvent(new CustomEvent('open-traffic-forecaster'));
  };

  // Helper to parse OSRM maneuver steps into localized turn-by-turn instructions
  const parseManeuverToInstruction = (step: any, destName: string, lang: Language): { instruction: string; icon: string } => {
    const type = step.maneuver?.type;
    const modifier = step.maneuver?.modifier;
    const roadName = step.name ? step.name : (lang === 'bm' ? 'Jalan Utama' : 'Highland Main Route');

    let icon = '⬆️';
    let text = '';

    if (type === 'depart') {
      icon = '🚗';
      text = lang === 'bm' ? `Bertolak dari lokasi asal di ${roadName}` : `Depart from origin onto ${roadName}`;
    } else if (type === 'turn') {
      if (modifier?.includes('left')) {
        icon = '⬅️';
        text = lang === 'bm' ? `Belok kiri ke ${roadName}` : `Turn left onto ${roadName}`;
      } else if (modifier?.includes('right')) {
        icon = '➡️';
        text = lang === 'bm' ? `Belok kanan ke ${roadName}` : `Turn right onto ${roadName}`;
      } else {
        icon = '↗️';
        text = lang === 'bm' ? `Teruskan ke ${roadName}` : `Continue onto ${roadName}`;
      }
    } else if (type === 'new name' || type === 'continue') {
      icon = '⬆️';
      text = lang === 'bm' ? `Terus di ${roadName}` : `Continue straight on ${roadName}`;
    } else if (type === 'roundabout' || type === 'rotary') {
      icon = '🔄';
      text = lang === 'bm' ? `Di bulatan, ambil susur keluar ke ${roadName}` : `At roundabout, take exit onto ${roadName}`;
    } else if (type === 'arrive') {
      icon = '🏁';
      text = lang === 'bm' ? `Tiba di destinasi: ${destName}` : `Arrive at destination: ${destName}`;
    } else {
      icon = '🧭';
      text = lang === 'bm' ? `Ikuti laluan ${roadName}` : `Follow ${roadName}`;
    }

    return { instruction: text, icon };
  };

  // Parse TomTom maneuver/instruction types into icons
  const parseTomTomManeuverIcon = (instructionType?: string, maneuver?: string): string => {
    const type = (instructionType || '').toUpperCase();
    const man = (maneuver || '').toUpperCase();

    if (type.includes('DEPART') || man.includes('DEPART')) return '🚗';
    if (type.includes('ARRIVE') || man.includes('ARRIVE')) return '🏁';
    if (man.includes('LEFT') || type.includes('LEFT')) return '⬅️';
    if (man.includes('RIGHT') || type.includes('RIGHT')) return '➡️';
    if (man.includes('ROUNDABOUT') || type.includes('ROUNDABOUT')) return '🔄';
    if (man.includes('BEER') || man.includes('SLIGHT')) return '↗️';
    return '⬆️';
  };

  // TomTom Routing API Fetcher (Endpoint: https://api.tomtom.com/routing/1/calculateRoute/{origin}:{destination}/json)
  const fetchTomTomRoute = async (
    origin: { lat: number; lng: number; name: string },
    destination: { lat: number; lng: number; name: string },
    apiKey: string
  ): Promise<TurnByTurnRoute | null> => {
    try {
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json?key=${apiKey.trim()}&traffic=true&routeType=fastest&instructionsType=text`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TomTom Routing HTTP ${response.status}`);
      }
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route returned by TomTom');
      }

      const route = data.routes[0];
      const summary = route.summary || {};
      const distanceKm = Number(((summary.lengthInMeters || 0) / 1000).toFixed(1));
      const durationMins = Math.round((summary.travelTimeInSeconds || 0) / 60);

      const points: { latitude: number; longitude: number }[] = route.legs?.[0]?.points || [];
      const coordinates: [number, number][] = points.map((p) => [p.latitude, p.longitude]);

      const instructions = route.guidance?.instructions || [];
      const steps: RouteStep[] = instructions.map((inst: any) => ({
        instruction: inst.message || (language === 'bm' ? `Laluan ke ${destination.name}` : `Route to ${destination.name}`),
        distanceMeters: Math.round(inst.routeOffsetInMeters || 0),
        durationSecs: Math.round(inst.travelTimeInSeconds || 0),
        icon: parseTomTomManeuverIcon(inst.instructionType, inst.maneuver),
      }));

      return {
        originName: origin.name,
        originCoords: [origin.lat, origin.lng],
        destinationName: destination.name,
        destinationCoords: [destination.lat, destination.lng],
        distanceKm,
        durationMins,
        steps: steps.length > 0 ? steps : [
          { instruction: `Head towards ${destination.name}`, distanceMeters: summary.lengthInMeters || 0, durationSecs: summary.travelTimeInSeconds || 0, icon: '🚗' },
          { instruction: `Arrive at ${destination.name}`, distanceMeters: 0, durationSecs: 0, icon: '🏁' },
        ],
        coordinates,
      };
    } catch (err) {
      console.warn('[InteractiveMap] TomTom Routing API fetch error:', err);
      return null;
    }
  };

  // Helper to render polylines, start/destination markers, and auto-fit map bounds
  const renderRouteOnMap = (routeData: TurnByTurnRoute, map: L.Map) => {
    setActiveRoute(routeData);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setRouteStepsOpen(false); // Auto-minimize steps on mobile to prevent blocking map
    }

    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    } else {
      routeLayerRef.current = L.layerGroup().addTo(map);
    }

    // Origin Start Marker (Animated Pulsing GPS Icon)
    const originIcon = L.divIcon({
      className: 'route-origin-marker',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background: #0284c7; opacity: 0.5;" class="animate-ping"></div>
          <div style="width: 26px; height: 26px; border-radius: 9999px; background: #0284c7; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 2;">
            <span style="font-size: 12px; line-height: 1;">🚗</span>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const originMarker = L.marker(routeData.originCoords, { icon: originIcon, zIndexOffset: 900 });
    originMarker.bindTooltip(`Origin: ${routeData.originName}`, { direction: 'top', className: 'text-xs font-bold' });
    routeLayerRef.current.addLayer(originMarker);

    // Destination Marker
    const destIcon = L.divIcon({
      className: 'route-dest-marker',
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: -4px; border-radius: 9999px; background: #10b981; opacity: 0.4;" class="animate-ping"></div>
          <div style="width: 28px; height: 28px; border-radius: 9999px; background: #10b981; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.6); z-index: 2;">
            <span style="font-size: 13px; line-height: 1;">🏁</span>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const destMarker = L.marker(routeData.destinationCoords, { icon: destIcon, zIndexOffset: 950 });
    destMarker.bindTooltip(`Destination: ${routeData.destinationName}`, { direction: 'top', className: 'text-xs font-bold' });
    routeLayerRef.current.addLayer(destMarker);

    // Dark casing underlay for contrast
    const underlayCasing = L.polyline(routeData.coordinates, {
      color: '#09090b',
      weight: 10,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    });
    routeLayerRef.current.addLayer(underlayCasing);

    // Main route polyline (Emerald glow line)
    const routePolyline = L.polyline(routeData.coordinates, {
      color: '#10b981',
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    });
    routeLayerRef.current.addLayer(routePolyline);

    // Apply AI Predictive ETA
    aiRouteOptimizer.getPredictiveETA(
      [routeData.originCoords[0], routeData.originCoords[1]],
      [routeData.destinationCoords[0], routeData.destinationCoords[1]]
    ).then(adjustedSeconds => {
      setActiveRoute(prev => prev ? {
        ...prev,
        aiAdjustedMins: Math.round(adjustedSeconds / 60)
      } : null);
    });

    // Requirement 3: Automatically fit map bounds to the route
    const bounds = routePolyline.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  };

  // Pure OSRM JSON Route Fetcher
  const fetchOsrmRoute = async (
    origin: { lat: number; lng: number; name: string },
    destination: { lat: number; lng: number; name: string }
  ): Promise<TurnByTurnRoute | null> => {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(osrmUrl);
      if (!res.ok) throw new Error('OSRM routing service unavailable');
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No driving route found between origin and destination');
      }

      const route = data.routes[0];
      const rawCoords: [number, number][] = route.geometry.coordinates;
      const leafletCoords: [number, number][] = rawCoords.map((c) => [c[1], c[0]]);

      const distanceKm = Number((route.distance / 1000).toFixed(1));
      const durationMins = Math.round(route.duration / 60);

      const rawSteps = route.legs?.[0]?.steps || [];
      const steps: RouteStep[] = rawSteps.map((s: any) => {
        const parsed = parseManeuverToInstruction(s, destination.name, language);
        return {
          instruction: parsed.instruction,
          distanceMeters: Math.round(s.distance),
          durationSecs: Math.round(s.duration),
          icon: parsed.icon,
        };
      });

      return {
        originName: origin.name,
        originCoords: [origin.lat, origin.lng],
        destinationName: destination.name,
        destinationCoords: [destination.lat, destination.lng],
        distanceKm,
        durationMins,
        steps,
        coordinates: leafletCoords,
      };
    } catch (err) {
      console.warn('[InteractiveMap] OSRM Route fetch error:', err);
      return null;
    }
  };

  // Main Route Calculation Logic (TomTom Routing API with OSRM fallback)
  const calculateAndRenderRoute = async (
    origin: { lat: number; lng: number; name: string },
    destination: { lat: number; lng: number; name: string }
  ) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    setIsCalculatingRoute(true);
    setRouteError(null);

    // Ensure old routing controls/layers are properly cleared
    if (routingControlRef.current) {
      try {
        map.removeControl(routingControlRef.current);
      } catch (e) {
        // ignore
      }
      routingControlRef.current = null;
    }

    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    } else {
      routeLayerRef.current = L.layerGroup().addTo(map);
    }

    try {
      // 1. Try TomTom Routing API if API key is available
      const apiKey = localStorage.getItem('tomtom_api_key') || (import.meta.env.VITE_TOMTOM_API_KEY as string) || '';
      if (apiKey.trim()) {
        const tomTomRoute = await fetchTomTomRoute(origin, destination, apiKey);
        if (tomTomRoute) {
          renderRouteOnMap(tomTomRoute, map);
          setIsCalculatingRoute(false);
          return;
        }
      }

      // 2. Fallback: OSRM Routing API
      const osrmRoute = await fetchOsrmRoute(origin, destination);
      if (osrmRoute) {
        renderRouteOnMap(osrmRoute, map);
        setIsCalculatingRoute(false);
        return;
      }

      // 3. Fallback: Direct Line Path
      const fallbackCoords: [number, number][] = [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ];

      renderRouteOnMap(
        {
          originName: origin.name,
          originCoords: [origin.lat, origin.lng],
          destinationName: destination.name,
          destinationCoords: [destination.lat, destination.lng],
          distanceKm: Number((Math.hypot(destination.lat - origin.lat, destination.lng - origin.lng) * 111).toFixed(1)),
          durationMins: 18,
          steps: [
            { instruction: `Head towards ${destination.name}`, distanceMeters: 5000, durationSecs: 600, icon: '⬆️' },
            { instruction: `Arrive at ${destination.name}`, distanceMeters: 0, durationSecs: 0, icon: '🏁' },
          ],
          coordinates: fallbackCoords,
        },
        map
      );
    } catch (err: any) {
      console.warn('[InteractiveMap] Route fetch fallback:', err);
      setRouteError(err.message || 'Displaying direct route path.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const pendingRouteTargetRef = useRef<Place | null>(null);

  // Requirement 2: Dynamic Vehicle Marker with smooth position updates and heading rotation (Waze / Google Maps style)
  const updateVehicleMarkerOnMap = (lat: number, lng: number, heading: number = 0) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const rotationStyle = `transform: rotate(${heading}deg); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);`;

    const vehicleHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: -4px; border-radius: 9999px; background: rgba(14, 165, 233, 0.35);" class="animate-ping"></div>
        <div style="position: absolute; width: 40px; height: 40px; border-radius: 9999px; background: radial-gradient(circle, rgba(14,165,233,0.3) 0%, rgba(14,165,233,0) 70%);"></div>
        <div style="${rotationStyle} width: 36px; height: 36px; border-radius: 9999px; background: #0284c7; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.55); z-index: 10;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: translateY(-1px);">
            <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#ffffff" stroke="#0284c7" stroke-width="1.2" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    `;

    const vehicleIcon = L.divIcon({
      className: 'live-vehicle-puck-marker',
      html: vehicleHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([lat, lng]);
      vehicleMarkerRef.current.setIcon(vehicleIcon);
    } else {
      vehicleMarkerRef.current = L.marker([lat, lng], {
        icon: vehicleIcon,
        zIndexOffset: 1200,
      }).addTo(map);

      vehicleMarkerRef.current.bindTooltip(
        language === 'bm' ? 'Kenderaan / GPS Anda' : 'Your Vehicle (Live Navigation)',
        { direction: 'top', className: 'text-xs font-bold' }
      );
    }

    // Auto-Pan / Follow Mode: keep camera tightly centered on vehicle at zoom 18 (Waze/Google Maps style)
    if (isAutoFollowEnabled) {
      map.setView([lat, lng], Math.max(map.getZoom(), 18), {
        animate: true,
        duration: 0.6,
      });
    }
  };

  // Requirement 1: Continuous Geolocation Tracking (watchPosition)
  const startLiveGpsTracking = () => {
    if (!navigator.geolocation) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setIsTrackingLive(true);
    setIsAutoFollowEnabled(true);

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const heading = pos.coords.heading || 0;
        const speed = (pos.coords.speed || 0) * 3.6; // Convert m/s to km/h

        setUserGpsCoords({ lat, lng });
        setCurrentHeading(heading);
        updateVehicleMarkerOnMap(lat, lng, heading);

        // AI Telemetry Monitoring
        const anomaly = await telemetryMonitor.processPacket({
          userId: 'local-user',
          lat,
          lng,
          speed,
          timestamp: Date.now()
        });

        if (anomaly) {
          setActiveTelemetryAlert({
            type: anomaly.type,
            message: anomaly.message,
            severity: anomaly.severity
          });
          // Auto-clear alert after 10 seconds
          setTimeout(() => setActiveTelemetryAlert(null), 10000);
        }

        // Turn-by-turn Proximity check (within 45 meters) & TTS voice engine
        if (activeRoute && activeRoute.steps && activeRoute.steps.length > 0) {
          activeRoute.steps.forEach((step, idx) => {
            if (spokenStepsMapRef.current[idx]) return;
            const targetCoord = activeRoute.coordinates[Math.min(idx * 3, activeRoute.coordinates.length - 1)] || activeRoute.destinationCoords;
            const distKm = calculateDistanceKm(lat, lng, targetCoord[0], targetCoord[1]);
            const distMeters = distKm * 1000;
            if (distMeters <= 45) {
              spokenStepsMapRef.current[idx] = true;
              speakInstruction(step.instruction);
            }
          });
        }
      },
      (err) => {
        console.warn('[InteractiveMap] Live GPS watchPosition warning:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;
  };

  // Lifecycle Cleanup
  const stopLiveGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingLive(false);
    if (vehicleMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(vehicleMarkerRef.current);
      vehicleMarkerRef.current = null;
    }
  };

  // Start, Stop, Resume Navigation Handlers (Driver-oriented high-zoom 18 tracking & flat-pitched perspective)
  const handleStartNavigation = () => {
    unlockAudioEngine();
    setIsNavigationPaused(false);
    startLiveGpsTracking();
    if (mapInstanceRef.current) {
      const targetLat = userGpsCoords?.lat || 4.4715;
      const targetLng = userGpsCoords?.lng || 101.3805;
      mapInstanceRef.current.flyTo([targetLat, targetLng], 18, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  };

  const handleStopNavigation = () => {
    setIsNavigationPaused(true);
    stopLiveGpsTracking();
  };

  const handleResumeNavigation = () => {
    unlockAudioEngine();
    setIsNavigationPaused(false);
    startLiveGpsTracking();
    if (mapInstanceRef.current && userGpsCoords) {
      mapInstanceRef.current.flyTo([userGpsCoords.lat, userGpsCoords.lng], 16, { duration: 0.8 });
    }
  };

  // Trigger route calculation with GPS acquisition or Gateway Fallback
  const handleTriggerRoute = (destinationPlace: Place) => {
    if (!destinationPlace) return;
    unlockAudioEngine();

    if (!mapInstanceRef.current) {
      pendingRouteTargetRef.current = destinationPlace;
      setIsCalculatingRoute(true);
      return;
    }

    const destLat = Number(destinationPlace.coordinates?.lat || 4.49);
    const destLng = Number(destinationPlace.coordinates?.lng || 101.39);

    setIsCalculatingRoute(true);

    // Start live continuous GPS tracking (watchPosition)
    startLiveGpsTracking();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          setUserGpsCoords({ lat: userLat, lng: userLng });
          calculateAndRenderRoute(
            { lat: userLat, lng: userLng, name: language === 'bm' ? 'Lokasi GPS Semasa Anda' : 'Your Current GPS Location' },
            { lat: destLat, lng: destLng, name: destinationPlace.name }
          );
        },
        (err) => {
          console.warn('GPS denied or timeout, using local Cameron Highlands fallback:', err);
          const orig = userGpsCoords || { lat: 4.4715, lng: 101.3805 }; // Tanah Rata township center
          calculateAndRenderRoute(
            { lat: orig.lat, lng: orig.lng, name: language === 'bm' ? 'Pusat Tanah Rata' : 'Tanah Rata Town Center' },
            { lat: destLat, lng: destLng, name: destinationPlace.name }
          );
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      const orig = userGpsCoords || { lat: 4.4715, lng: 101.3805 };
      calculateAndRenderRoute(
        { lat: orig.lat, lng: orig.lng, name: language === 'bm' ? 'Pusat Tanah Rata' : 'Tanah Rata Town Center' },
        { lat: destLat, lng: destLng, name: destinationPlace.name }
      );
    }
  };

  const handleClearRoute = () => {
    setActiveRoute(null);
    setRouteError(null);
    stopLiveGpsTracking();

    if (routingControlRef.current && mapInstanceRef.current) {
      try {
        mapInstanceRef.current.removeControl(routingControlRef.current);
      } catch (e) {
        // ignore
      }
      routingControlRef.current = null;
    }
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
  };

  // Sync originCoords and destinationCoords props when passed dynamically
  useEffect(() => {
    if (destinationCoords) {
      const origLat = originCoords?.lat ?? userGpsCoords?.lat ?? 4.4715;
      const origLng = originCoords?.lng ?? userGpsCoords?.lng ?? 101.3805;
      const origName = originCoords?.name || (userGpsCoords ? (language === 'bm' ? 'Lokasi GPS Anda' : 'Your GPS Location') : 'Tanah Rata Town Center');
      const dest = {
        lat: destinationCoords.lat,
        lng: destinationCoords.lng,
        name: destinationCoords.name || 'Selected Destination',
      };
      calculateAndRenderRoute(
        { lat: origLat, lng: origLng, name: origName },
        dest
      );
    }
  }, [originCoords, destinationCoords, userGpsCoords]);

  // Requirement 4: Ensure route layers, markers, and watchPosition tracking are cleaned up on unmount
  useEffect(() => {
    // Attempt silent initial GPS acquisition if permitted
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // ignore unprompted or denied
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
      );
    }

    return () => {
      stopLiveGpsTracking();

      if (userLocationMarkerRef.current && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.removeLayer(userLocationMarkerRef.current);
        } catch (e) {
          // ignore
        }
        userLocationMarkerRef.current = null;
      }

      if (routingControlRef.current && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.removeControl(routingControlRef.current);
        } catch (e) {
          // ignore
        }
        routingControlRef.current = null;
      }
      if (routeLayerRef.current) {
        routeLayerRef.current.clearLayers();
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
    };
  }, []);

  // Listen for open-navigation-prompt or trigger-route-to-place events
  useEffect(() => {
    const handleNavPrompt = (e: any) => {
      if (e?.detail) {
        handleTriggerRoute(e.detail);
      }
    };
    window.addEventListener('open-navigation-prompt', handleNavPrompt as EventListener);
    window.addEventListener('trigger-route-to-place', handleNavPrompt as EventListener);
    return () => {
      window.removeEventListener('open-navigation-prompt', handleNavPrompt as EventListener);
      window.removeEventListener('trigger-route-to-place', handleNavPrompt as EventListener);
    };
  }, [language]);

  // Center of Cameron Highlands (Tanah Rata / Brinchang central valley)
  const defaultCenter: [number, number] = [4.475, 101.385];

  // Tile layer providers
  const tileLayers = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
      maxZoom: 18,
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
      maxZoom: 17,
    },
  };

  // Sync external filters if props change
  useEffect(() => {
    if (filterCategory) setActiveCategory(filterCategory);
  }, [filterCategory]);

  useEffect(() => {
    if (filterTownship) setActiveTownship(filterTownship);
  }, [filterTownship]);

  // Township Hub Coordinates for all 9 townships
  const TOWNSHIP_HUBS_DATA: Record<Township, { lat: number; lng: number }> = {
    'Tanah Rata': { lat: 4.4715, lng: 101.3805 },
    'Brinchang': { lat: 4.4905, lng: 101.3892 },
    'Kea Farm': { lat: 4.5028, lng: 101.4072 },
    'Ringlet': { lat: 4.4147, lng: 101.3820 },
    'Kampung Raja': { lat: 4.5683, lng: 101.4087 },
    'Tringkap': { lat: 4.5126, lng: 101.4258 },
    'Kuala Terla': { lat: 4.5458, lng: 101.4172 },
    'Bertam Valley': { lat: 4.4178, lng: 101.3985 },
    'Blue Valley': { lat: 4.5888, lng: 101.4215 },
  };

  // Reusable Township Hubs Rendering Logic (Supports real-time Admin updates)
  const renderTownshipHubMarkers = (map: L.Map) => {
    if (!townshipLayerRef.current) {
      townshipLayerRef.current = L.layerGroup().addTo(map);
    } else {
      townshipLayerRef.current.clearLayers();
    }

    const hubs = firebaseService.getTownshipHubs();

    Object.entries(TOWNSHIP_HUBS_DATA).forEach(([townshipName, coords]) => {
      const customHub = hubs[townshipName];
      const defaultPortal = TOWNSHIP_PORTALS.find((t) => t.name === townshipName);

      const hubInfo = {
        township: townshipName as Township,
        description:
          customHub?.description ||
          defaultPortal?.description ||
          `${townshipName} is a major vibrant hub in Cameron Highlands featuring cool mountain air, scenic views, local farming, and visitor amenities.`,
        imageUrl:
          customHub?.imageUrl ||
          defaultPortal?.imageUrl ||
          'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80',
        clinicsOrHospitals:
          customHub?.clinicsOrHospitals ||
          defaultPortal?.hospital ||
          'Sultanah Hajah Kalsom Hospital & local 24/7 clinics',
        policeStation:
          customHub?.policeStation ||
          defaultPortal?.police ||
          `Balai Polis ${townshipName}`,
        publicToilet:
          customHub?.publicToilet ||
          defaultPortal?.publicToilet ||
          'Available at municipal square & tourist spots',
        gasStation:
          customHub?.gasStation ||
          defaultPortal?.gasStation ||
          'Petronas & Shell stations nearby',
        placesOfInterest:
          customHub?.placesOfInterest ||
          defaultPortal?.keyAttractions ||
          ['Tea Plantations', 'Strawberry Farms', 'Mossy Forest Trails'],
      };

      const customTownshipIcon = L.divIcon({
        className: 'township-center-marker',
        html: `
          <div style="
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: white;
            padding: 5px 12px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 800;
            box-shadow: 0 4px 14px rgba(0,0,0,0.45);
            border: 2px solid white;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transform: translate3d(0, 0, 0);
          ">
            <span style="font-size: 13px;">📍</span> <span>${townshipName} Hub</span>
          </div>
        `,
        iconSize: [140, 30],
        iconAnchor: [70, 15],
        popupAnchor: [0, -15],
      });

      const townshipMarker = L.marker([coords.lat, coords.lng], {
        icon: customTownshipIcon,
        zIndexOffset: 850,
      });
      if (townshipLayerRef.current) {
        townshipMarker.addTo(townshipLayerRef.current);
      }

      townshipMarker.bindTooltip(`${townshipName} Hub • Click for Details & Facilities`, {
        direction: 'top',
        offset: [0, -15],
        className: 'text-xs font-bold bg-stone-900 text-stone-100 px-2 py-1 rounded shadow-lg border border-white/10',
      });

      const attractionsList = Array.isArray(hubInfo.placesOfInterest)
        ? hubInfo.placesOfInterest.join(' • ')
        : hubInfo.placesOfInterest;

      const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 290px; max-width: 85vw; max-height: 430px; overflow-y: auto; padding: 4px; color: #1c1917;">
          <div style="position: relative; width: 100%; height: 130px; border-radius: 12px; overflow: hidden; margin-bottom: 8px;">
            <img src="${hubInfo.imageUrl}" alt="${townshipName}" style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%);"></div>
            <div style="position: absolute; bottom: 8px; left: 10px; right: 10px; color: white;">
              <div style="font-size: 10px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">Cameron Highlands Township</div>
              <div style="font-weight: 900; font-size: 16px; line-height: 1.2;">${townshipName} Hub</div>
            </div>
          </div>

          <p style="font-size: 11.5px; color: #44403c; line-height: 1.45; margin-bottom: 8px;">
            ${hubInfo.description}
          </p>

          <div style="background: #f5f5f4; border-radius: 12px; padding: 10px; margin-bottom: 8px; font-size: 11px; border: 1px solid #e7e5e4;">
            <div style="font-weight: 800; color: #0284c7; margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Essential Facilities</div>
            <div style="margin-bottom: 3px; display: flex; gap: 5px;"><span>🏥</span> <div><strong style="color: #292524;">Clinic/Hospital:</strong> <span style="color: #57534e;">${hubInfo.clinicsOrHospitals}</span></div></div>
            <div style="margin-bottom: 3px; display: flex; gap: 5px;"><span>👮</span> <div><strong style="color: #292524;">Police Station:</strong> <span style="color: #57534e;">${hubInfo.policeStation}</span></div></div>
            <div style="margin-bottom: 3px; display: flex; gap: 5px;"><span>🚻</span> <div><strong style="color: #292524;">Public Toilet:</strong> <span style="color: #57534e;">${hubInfo.publicToilet}</span></div></div>
            <div style="display: flex; gap: 5px;"><span>⛽</span> <div><strong style="color: #292524;">Gas Station:</strong> <span style="color: #57534e;">${hubInfo.gasStation}</span></div></div>
          </div>

          <div style="margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 11px; color: #059669; margin-bottom: 3px; text-transform: uppercase;">Places of Interest:</div>
            <div style="font-size: 11px; color: #57534e; line-height: 1.4;">${attractionsList}</div>
          </div>

          <button onclick="window.dispatchEvent(new CustomEvent('filter-township-hub', { detail: '${townshipName}' }))" style="background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; width: 100%;">
            Filter Directory & Map by ${townshipName}
          </button>
        </div>
      `;

      townshipMarker.bindPopup(popupContent, { maxWidth: 320 });
    });
  };

  // Reusable Live Colored TomTom Traffic Overlay Rendering Logic
  const renderColoredTrafficOverlay = (map: L.Map) => {
    if (!trafficOverlayLayerRef.current) {
      trafficOverlayLayerRef.current = L.layerGroup().addTo(map);
    } else {
      trafficOverlayLayerRef.current.clearLayers();
    }

    // Clean up any existing TomTom raster layer first
    if (tomtomRasterTileRef.current) {
      map.removeLayer(tomtomRasterTileRef.current);
      tomtomRasterTileRef.current = null;
    }

    if (!isTrafficOverlayActive) {
      return;
    }

    // Check for configured TomTom API Key
    const apiKey = localStorage.getItem('tomtom_api_key');
    const hasValidKey = Boolean(apiKey && apiKey.trim().length > 10);
    setTomTomKeyPresent(hasValidKey);

    if (hasValidKey && apiKey) {
      try {
        const tomtomTile = L.tileLayer(
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${apiKey.trim()}`,
          {
            maxZoom: 18,
            opacity: 0.75,
            attribution: '&copy; TomTom Traffic',
            zIndex: 400,
          }
        );
        tomtomTile.addTo(map);
        tomtomRasterTileRef.current = tomtomTile;
      } catch (err) {
        console.error('Failed to mount TomTom raster flow layer:', err);
      }
    }

    // Render High-Precision Colored TomTom Vector Segments along Corridors & Passes
    trafficSegments.forEach((segment) => {
      // 1. High contrast dark underlay casing for visibility on satellite and terrain maps
      const underlay = L.polyline(segment.coordinates, {
        color: '#09090b',
        weight: 9,
        opacity: 0.7,
        lineCap: 'round',
        lineJoin: 'round',
      });
      if (trafficOverlayLayerRef.current) {
        underlay.addTo(trafficOverlayLayerRef.current);
      }

      // 2. TomTom traffic flow colored polyline
      const polyline = L.polyline(segment.coordinates, {
        color: segment.color,
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'traffic-polyline-glow',
      });

      // Interactive hover tooltip
      polyline.bindTooltip(
        `
        <div style="font-family: inherit; font-size: 11px;">
          <div style="font-weight: 800; color: #f8fafc;">${segment.name}</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${segment.color};"></span>
            <span style="font-weight: 800; color: ${segment.color};">${segment.speedKmh} km/h • ${segment.statusLabel}</span>
            ${segment.delayMins > 0 ? `<span style="color: #fca5a5; font-weight: 700;">(+${segment.delayMins}m delay)</span>` : ''}
          </div>
        </div>
        `,
        {
          direction: 'top',
          sticky: true,
          className: 'bg-stone-950/95 text-stone-100 px-2 py-1 rounded-lg border border-white/15 shadow-xl',
        }
      );

      // Interactive popup details
      const segmentPopupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 260px; padding: 4px; color: #1c1917;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; background: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 6px;">
              TomTom Corridor Flow
            </span>
            <span style="font-size: 10px; font-weight: 800; color: ${segment.color};">
              ● ${segment.statusLabel}
            </span>
          </div>
          <h4 style="font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; line-height: 1.3;">
            ${segment.name}
          </h4>
          <div style="background: #f8fafc; border-radius: 8px; padding: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #64748b; font-weight: 600;">Current Speed:</span>
              <strong style="color: #0f172a; font-weight: 800;">${segment.speedKmh} km/h</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span style="color: #64748b; font-weight: 600;">Delay:</span>
              <strong style="color: ${segment.delayMins > 10 ? '#dc2626' : segment.delayMins > 0 ? '#d97706' : '#16a34a'}; font-weight: 800;">
                ${segment.delayMins > 0 ? `+${segment.delayMins} mins` : 'Free Flow'}
              </strong>
            </div>
          </div>
          <p style="font-size: 11px; color: #475569; line-height: 1.4; margin: 0;">
            ${segment.advisory}
          </p>
        </div>
      `;
      polyline.bindPopup(segmentPopupHtml, { maxWidth: 280 });

      if (trafficOverlayLayerRef.current) {
        polyline.addTo(trafficOverlayLayerRef.current);
      }
    });

    // Render Pulsing Congestion Hotspot Markers with Animated Radar Beacons
    congestionHotspots.forEach((hotspot) => {
      const beaconIcon = L.divIcon({
        className: 'congestion-hotspot-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; inset: -4px; border-radius: 9999px; background: ${hotspot.color}; opacity: 0.5;" class="animate-traffic-ping"></div>
            <div style="position: absolute; inset: 0px; border-radius: 9999px; background: ${hotspot.color}; opacity: 0.25;"></div>
            <div style="width: 26px; height: 26px; border-radius: 9999px; background: #1c1917; border: 2.5px solid ${hotspot.color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.6); z-index: 2;">
              <span style="font-size: 12px; line-height: 1;">${hotspot.severity === 'gridlock' ? '⚠️' : hotspot.severity === 'heavy' ? '🛑' : '⏳'}</span>
            </div>
            <div style="position: absolute; top: -17px; background: ${hotspot.color}; color: white; font-size: 9px; font-weight: 900; padding: 1px 5px; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.5); white-space: nowrap; text-transform: uppercase;">
              ${hotspot.speedKmh} km/h
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });

      const marker = L.marker(hotspot.coords, {
        icon: beaconIcon,
        zIndexOffset: 950,
      });

      const hotspotPopupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 280px; max-width: 82vw; padding: 4px; color: #1c1917;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; background: ${hotspot.color}15; color: ${hotspot.color}; padding: 3px 8px; border-radius: 6px; border: 1px solid ${hotspot.color}30;">
              ${hotspot.severity.toUpperCase()} HOTSPOT
            </span>
            <span style="font-size: 10px; font-weight: 700; color: #64748b;">
              TomTom Live Feed
            </span>
          </div>

          <h3 style="font-size: 14px; font-weight: 900; color: #0f172a; margin: 0 0 3px 0; line-height: 1.25;">
            ${hotspot.name}
          </h3>
          <div style="font-size: 10.5px; color: #64748b; margin-bottom: 8px;">
            Corridor: <strong style="color: #334155;">${hotspot.corridor}</strong>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px;">
              <div style="font-size: 9.5px; color: #64748b; font-weight: 700; text-transform: uppercase;">Live Speed</div>
              <div style="font-size: 16px; font-weight: 900; color: ${hotspot.color}; line-height: 1.2;">
                ${hotspot.speedKmh} <span style="font-size: 10px; font-weight: 600;">km/h</span>
              </div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px;">
              <div style="font-size: 9.5px; color: #64748b; font-weight: 700; text-transform: uppercase;">Queue Delay</div>
              <div style="font-size: 16px; font-weight: 900; color: #dc2626; line-height: 1.2;">
                +${hotspot.delayMins} <span style="font-size: 10px; font-weight: 600;">mins</span>
              </div>
            </div>
          </div>

          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 7px 9px; margin-bottom: 8px;">
            <div style="font-size: 10px; font-weight: 800; color: #991b1b; margin-bottom: 2px;">Choke Cause:</div>
            <div style="font-size: 11px; color: #7f1d1d; line-height: 1.35;">${hotspot.cause}</div>
          </div>

          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 7px 9px; margin-bottom: 8px;">
            <div style="font-size: 10px; font-weight: 800; color: #065f46; margin-bottom: 2px;">AI Bypass Advice:</div>
            <div style="font-size: 11px; color: #047857; line-height: 1.35;">${hotspot.bypassTip}</div>
          </div>

          <button onclick="document.getElementById('traffic-forecasting-section')?.scrollIntoView({ behavior: 'smooth' })" style="width: 100%; background: #059669; color: white; border: none; padding: 7px; border-radius: 8px; font-size: 10.5px; font-weight: 800; cursor: pointer;">
            View Detailed Forecast & Pattern ↓
          </button>
        </div>
      `;

      marker.bindPopup(hotspotPopupHtml, { maxWidth: 300 });

      if (trafficOverlayLayerRef.current) {
        marker.addTo(trafficOverlayLayerRef.current);
      }
    });
  };

  const handleFlyToHotspot = (hotspot: CongestionHotspotPoint) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(hotspot.coords, 15, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
    setSelectedHotspot(hotspot);
  };

  // Initialize Leaflet Map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (!mapInstanceRef.current) {
      // Guard against React re-render / stale Leaflet DOM ID
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }

      const map = L.map(container, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const initialLayer = L.tileLayer(tileLayers.osm.url, {
        attribution: tileLayers.osm.attribution,
        maxZoom: tileLayers.osm.maxZoom,
      }).addTo(map);

      activeTileLayerRef.current = initialLayer;

      // Render the 9 Cameron Highlands Township center pins
      renderTownshipHubMarkers(map);

      mapInstanceRef.current = map;
      
      // Ensure Leaflet resizes correctly after mounting
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      // Disable auto-follow when user manually drags or pans map
      map.on('dragstart', () => {
        setIsAutoFollowEnabled(false);
      });

      // Check if there was a pending route calculation queued before map mounted
      if (pendingRouteTargetRef.current) {
        const targetToRoute = pendingRouteTargetRef.current;
        pendingRouteTargetRef.current = null;
        setTimeout(() => {
          handleTriggerRoute(targetToRoute);
        }, 150);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
      if (container && (container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }
    };
  }, []);

  // Sync Traffic Overlay state changes and API Key updates
  useEffect(() => {
    if (mapInstanceRef.current) {
      renderColoredTrafficOverlay(mapInstanceRef.current);
    }
  }, [isTrafficOverlayActive]);

  useEffect(() => {
    const handleTomTomKeyUpdated = () => {
      setTomTomKeyPresent(Boolean(localStorage.getItem('tomtom_api_key')));
      if (mapInstanceRef.current) {
        renderColoredTrafficOverlay(mapInstanceRef.current);
      }
    };
    window.addEventListener('tomtom-key-updated', handleTomTomKeyUpdated);
    return () => window.removeEventListener('tomtom-key-updated', handleTomTomKeyUpdated);
  }, [isTrafficOverlayActive]);

  // Handle mobile viewport loading, scrolling, and orientation shifts
  useEffect(() => {
    if (!mapInstanceRef.current || !mapContainerRef.current) return;
    const map = mapInstanceRef.current;

    const invalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    const t0 = setTimeout(invalidate, 40);
    const t1 = setTimeout(invalidate, 150);
    const t2 = setTimeout(invalidate, 400);
    const t3 = setTimeout(invalidate, 900);

    const resizeObserver = new ResizeObserver(() => {
      invalidate();
    });
    resizeObserver.observe(mapContainerRef.current);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            invalidate();
          }
        });
      },
      { threshold: [0.05, 0.2, 0.5] }
    );
    intersectionObserver.observe(mapContainerRef.current);

    const handleResize = () => invalidate();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const handleFilterTownship = (e: any) => {
      const town = e.detail as Township;
      if (town) {
        setActiveTownship(town);
        const coords = TOWNSHIP_HUBS_DATA[town] || TOWNSHIP_COORDS[town];
        if (coords && mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 15, {
            duration: 1.0,
          });
          mapInstanceRef.current.closePopup();
        }
        window.dispatchEvent(new CustomEvent('filter-directory-by-township', { detail: town }));
      }
    };
    window.addEventListener('filter-township-hub', handleFilterTownship);

    const handleTownshipHubUpdated = () => {
      if (mapInstanceRef.current) {
        renderTownshipHubMarkers(mapInstanceRef.current);
      }
    };
    window.addEventListener('township-hub-updated', handleTownshipHubUpdated);

    const handlePreviewPlace = (e: any) => {
      const place = e.detail as Place;
      if (place) {
        onSelectPlace(place);
      }
    };
    window.addEventListener('preview-place-on-map', handlePreviewPlace);

    const handleFocusApproachRoutes = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([4.48, 101.39], 13, {
          duration: 1.4,
          easeLinearity: 0.25,
        });
      }
    };
    window.addEventListener('focus-approach-routes', handleFocusApproachRoutes);

    const handleFocusHotspotOnMap = (e: any) => {
      const coords = e.detail as [number, number];
      if (mapInstanceRef.current && Array.isArray(coords) && coords.length === 2) {
        mapInstanceRef.current.flyTo(coords, 15, {
          duration: 1.3,
          easeLinearity: 0.25,
        });
      }
    };
    window.addEventListener('focus-hotspot-on-map', handleFocusHotspotOnMap);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('filter-township-hub', handleFilterTownship);
      window.removeEventListener('township-hub-updated', handleTownshipHubUpdated);
      window.removeEventListener('preview-place-on-map', handlePreviewPlace);
      window.removeEventListener('focus-approach-routes', handleFocusApproachRoutes);
      window.removeEventListener('focus-hotspot-on-map', handleFocusHotspotOnMap);
    };
  }, []);

  // Switch Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const config = tileLayers[activeMapType];
    const newLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
    }).addTo(map);

    activeTileLayerRef.current = newLayer;
  }, [activeMapType]);

  const TOWNSHIP_COORDS: Record<string, { lat: number; lng: number }> = {
    'Tanah Rata': { lat: 4.4715, lng: 101.3805 },
    'Brinchang': { lat: 4.4905, lng: 101.3892 },
    'Kea Farm': { lat: 4.5028, lng: 101.4072 },
    'Ringlet': { lat: 4.4147, lng: 101.3820 },
    'Kampung Raja': { lat: 4.5683, lng: 101.4087 },
    'Tringkap': { lat: 4.5126, lng: 101.4258 },
    'Kuala Terla': { lat: 4.5458, lng: 101.4172 },
    'Bertam Valley': { lat: 4.4178, lng: 101.3985 },
    'Blue Valley': { lat: 4.5888, lng: 101.4215 },
  };

  useEffect(() => {
    if (selectedPlace) {
      if (activeCategory !== 'all' && selectedPlace.category !== activeCategory) {
        setActiveCategory('all');
      }
      if (activeTownship !== 'all' && selectedPlace.township !== activeTownship) {
        setActiveTownship('all');
      }
    }
  }, [selectedPlace]);

  const [livePlaces, setLivePlaces] = useState<Place[]>(places);

  useEffect(() => {
    setLivePlaces(places);
  }, [places]);

  // Real-time listener: whenever admin creates or adds a new place, update pins instantly
  useEffect(() => {
    const handlePlacesUpdated = (e: any) => {
      const updatedList = e?.detail || firebaseService.getPlaces();
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        setLivePlaces(updatedList);
      }
    };

    window.addEventListener('places-updated', handlePlacesUpdated);
    return () => {
      window.removeEventListener('places-updated', handlePlacesUpdated);
    };
  }, []);

  const handleAddReview = (placeId: string) => {
    if (!newReviewComment.trim()) return;
    const review: PlaceReview = {
      id: `rev_${Date.now()}`,
      placeId,
      authorName: newReviewAuthor.trim() || 'Highland Visitor',
      rating: newReviewRating,
      comment: newReviewComment.trim(),
      timestamp: new Date().toLocaleDateString()
    };

    setLivePlaces(prev => prev.map(p => {
      if (p.id === placeId) {
        const existingReviews = p.reviews || [];
        const savedStorage = localStorage.getItem(`camgo_reviews_${placeId}`);
        const parsedStorage = savedStorage ? JSON.parse(savedStorage) : existingReviews;
        const updatedReviews = [review, ...parsedStorage];
        const newRating = Number((updatedReviews.reduce((acc, r) => acc + r.rating, 0) / updatedReviews.length).toFixed(1));
        const updated = {
          ...p,
          reviews: updatedReviews,
          reviewsCount: updatedReviews.length,
          rating: newRating
        };
        localStorage.setItem(`camgo_reviews_${placeId}`, JSON.stringify(updatedReviews));
        return updated;
      }
      return p;
    }));

    if (selectedPlace && selectedPlace.id === placeId) {
      const existingReviews = selectedPlace.reviews || [];
      const savedStorage = localStorage.getItem(`camgo_reviews_${placeId}`);
      const parsedStorage = savedStorage ? JSON.parse(savedStorage) : existingReviews;
      const updatedReviews = [review, ...parsedStorage];
      const newRating = Number((updatedReviews.reduce((acc, r) => acc + r.rating, 0) / updatedReviews.length).toFixed(1));
      onSelectPlace({
        ...selectedPlace,
        reviews: updatedReviews,
        reviewsCount: updatedReviews.length,
        rating: newRating
      });
    }

    setNewReviewComment('');
    setNewReviewAuthor('');
    setNewReviewRating(5);
  };

  const filteredPlaces = livePlaces.map(p => {
    // Load reviews from localStorage if available
    const saved = localStorage.getItem(`camgo_reviews_${p.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { ...p, reviews: parsed };
        }
      } catch (e) {
        // ignore
      }
    }
    return p;
  }).filter((p) => {
    const matchCat =
      activeCategory === 'all' ||
      p.category === activeCategory ||
      ((activeCategory === 'travel_tourism' || activeCategory === 'attraction') &&
        (p.category === 'attraction' || p.category === 'travel_tourism')) ||
      ((activeCategory === 'shopping' || activeCategory === 'business') &&
        (p.category === 'business' || p.category === 'shopping')) ||
      ((activeCategory === 'services_utilities' || activeCategory === 'local_services') &&
        (p.category === 'services_utilities' || p.category === 'local_services'));
    const matchTown = activeTownship === 'all' || p.township === activeTownship;
    const matchSub = activeSubCategory === 'all' || p.subCategory === activeSubCategory;
    const matchRadius = proximityRadius === 'all' || !userGpsCoords ? true : (() => {
      const lat = parseCoord(p.coordinates?.lat);
      const lng = parseCoord(p.coordinates?.lng);
      if (lat === 0 || lng === 0) return false;
      const dist = calculateDistanceKm(userGpsCoords.lat, userGpsCoords.lng, lat, lng);
      return dist <= Number(proximityRadius);
    })();
    return matchCat && matchTown && matchSub && matchRadius;
  });

  // Dynamic counts for category and township dropdown badges
  const placeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: livePlaces.length };
    livePlaces.forEach((p) => {
      if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
      if (p.township) counts[p.township] = (counts[p.township] || 0) + 1;
      if (p.subCategory) counts[p.subCategory] = (counts[p.subCategory] || 0) + 1;
    });
    return counts;
  }, [livePlaces]);

  const handleSelectCategory = (cat: MainCategory | 'all', subCat: string | 'all' = 'all') => {
    setActiveCategory(cat);
    setActiveSubCategory(subCat);
  };

  const handleSelectTownship = (town: Township | 'all') => {
    setActiveTownship(town);
    if (town !== 'all' && TOWNSHIP_COORDS[town] && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([TOWNSHIP_COORDS[town].lat, TOWNSHIP_COORDS[town].lng], 14, {
        duration: 1.0,
      });
    }
  };

  const handleResetFilters = () => {
    setActiveCategory('all');
    setActiveTownship('all');
    setActiveSubCategory('all');
  };

  // Helper to parse coordinate safely (number, string, comma decimal)
  const parseCoord = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const num = parseFloat(val.replace(',', '.').trim());
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Category visual mapping for beautiful, informative highland pins
  const getCategoryPinStyle = (cat?: string, subCat?: string) => {
    switch (cat) {
      case 'accommodation':
        if (subCat === 'camping_glamping') return { pinColor: '#2563eb', iconEmoji: '⛺', label: 'Glamping & Camp' };
        if (subCat === 'homestay' || subCat === 'chalets') return { pinColor: '#2563eb', iconEmoji: '🏡', label: 'Chalet & Homestay' };
        return { pinColor: '#1d4ed8', iconEmoji: '🏨', label: 'Hotel & Resort' };

      case 'food':
        if (subCat === 'steamboats') return { pinColor: '#ea580c', iconEmoji: '🍲', label: 'Steamboat' };
        if (subCat === 'cafes') return { pinColor: '#c2410c', iconEmoji: '☕', label: 'Cafe' };
        if (subCat === 'night_markets_street') return { pinColor: '#f97316', iconEmoji: '🍢', label: 'Street Food' };
        return { pinColor: '#ea580c', iconEmoji: '🍽️', label: 'Food & Dining' };

      case 'travel_tourism':
      case 'attraction':
        if (subCat === 'agrotourism_farms') return { pinColor: '#16a34a', iconEmoji: '🍓', label: 'Farm & Agrotourism' };
        if (subCat === 'outdoor_adventure') return { pinColor: '#059669', iconEmoji: '🌲', label: 'Nature & Adventure' };
        return { pinColor: '#10b981', iconEmoji: '🏞️', label: 'Sightseeing & Attraction' };

      case 'transport':
        if (subCat === 'car_bike_rentals') return { pinColor: '#0284c7', iconEmoji: '🛵', label: 'Motorbike / Car Rental' };
        if (subCat === 'fuel_ev_charging') return { pinColor: '#0ea5e9', iconEmoji: '⚡', label: 'EV & Fuel' };
        if (subCat === 'taxi_ehailing') return { pinColor: '#0284c7', iconEmoji: '🚕', label: 'Taxi & E-Hailing' };
        return { pinColor: '#0369a1', iconEmoji: '🚗', label: 'Transport' };

      case 'local_services':
        if (subCat === 'public_toilets_restrooms') return { pinColor: '#0d9488', iconEmoji: '🚻', label: 'Public Restroom' };
        if (subCat === 'health_wellness') return { pinColor: '#e11d48', iconEmoji: '🏥', label: 'Clinic & Hospital' };
        if (subCat === 'banking_financial') return { pinColor: '#0d9488', iconEmoji: '🏦', label: 'ATM & Banking' };
        return { pinColor: '#0f766e', iconEmoji: '🏢', label: 'Local Services' };

      case 'shopping':
        if (subCat === 'fresh_markets_produce') return { pinColor: '#d97706', iconEmoji: '🥬', label: 'Fresh Market' };
        if (subCat === 'souvenirs_handicrafts') return { pinColor: '#b45309', iconEmoji: '🎁', label: 'Souvenirs & Crafts' };
        return { pinColor: '#d97706', iconEmoji: '🛍️', label: 'Shopping' };

      case 'masjid_surau':
        return { pinColor: '#15803d', iconEmoji: '🕌', label: 'Masjid & Surau' };

      case 'services_utilities':
        if (subCat === 'cooking_gas_delivery') return { pinColor: '#6366f1', iconEmoji: '🔥', label: 'Gas Delivery' };
        return { pinColor: '#6366f1', iconEmoji: '🔧', label: 'Utilities & Repairs' };

      case 'business':
        return { pinColor: '#7c3aed', iconEmoji: '💼', label: 'Business & Office' };

      default:
        return { pinColor: '#059669', iconEmoji: '📍', label: 'Place' };
    }
  };

  // Render Markers on Map - creates an individual pin for every directory place according to its latitude & longitude
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const createSingleMarker = (place: Place, lat: number, lng: number, mapInstance: L.Map) => {
      const { pinColor, iconEmoji, label } = getCategoryPinStyle(place.category, place.subCategory);
      const isSelected = selectedPlace?.id === place.id;

      const customIcon = L.divIcon({
        className: 'custom-highland-marker',
        html: `
          <div style="
            background: ${pinColor};
            width: ${isSelected ? '42px' : '34px'};
            height: ${isSelected ? '42px' : '34px'};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: ${isSelected ? '3px solid #facc15' : '2px solid white'};
            box-shadow: ${isSelected ? '0 0 24px rgba(250, 204, 21, 0.95), 0 4px 14px rgba(0,0,0,0.6)' : '0 3px 10px rgba(0,0,0,0.45)'};
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          ">
            <span style="transform: rotate(45deg); font-size: ${isSelected ? '18px' : '15px'}; line-height: 1;">${iconEmoji}</span>
          </div>
        `,
        iconSize: [isSelected ? 42 : 34, isSelected ? 42 : 34],
        iconAnchor: [isSelected ? 21 : 17, isSelected ? 42 : 34],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([lat, lng], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(mapInstance);

      // Tooltip on hover
      marker.bindTooltip(`
        <div style="font-family: inherit; font-size: 11px; padding: 2px 4px;">
          <div style="font-weight: 800; color: #f8fafc;">${place.name}</div>
          <div style="font-size: 9.5px; color: #94a3b8; display: flex; gap: 4px; align-items: center; margin-top: 2px;">
            <span>${iconEmoji} ${label}</span>
            <span>•</span>
            <span>${place.township}</span>
            <span>•</span>
            <span style="color: #facc15; font-weight: 700;">★ ${place.rating || '4.8'}</span>
          </div>
        </div>
      `, {
        direction: 'top',
        offset: [0, -34],
        opacity: 0.98,
        className: 'highland-map-tooltip',
      });

      // Rich click popup
      const descText = language === 'bm' && place.descriptionBm ? place.descriptionBm : (place.description || '');
      const popupHtml = `
        <div style="width: 250px; font-family: inherit; color: #f8fafc; padding: 4px;">
          ${place.imageUrl ? `
            <div style="width: 100%; height: 115px; border-radius: 12px; overflow: hidden; margin-bottom: 8px; background: #1c1917; border: 1px solid rgba(255,255,255,0.1);">
              <img src="${place.imageUrl}" alt="${place.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'" />
            </div>
          ` : ''}
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="background: ${pinColor}22; color: ${pinColor}; border: 1px solid ${pinColor}44; font-size: 9.5px; font-weight: 800; padding: 2px 6px; border-radius: 6px; text-transform: uppercase;">
              ${iconEmoji} ${label}
            </span>
            <span style="font-size: 10.5px; color: #a8a29e; font-weight: 600;">${place.township}</span>
          </div>
          <h4 style="font-size: 13.5px; font-weight: 800; color: #ffffff; margin: 0 0 4px 0; line-height: 1.25;">
            ${place.name}
          </h4>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: #d6d3d1; margin-bottom: 6px;">
            <span style="color: #facc15; font-weight: 700;">★ ${place.rating || 4.8} <span style="color: #78716c; font-weight: 400;">(${place.reviewsCount || 10})</span></span>
            <span style="color: #34d399; font-weight: 700;">${place.elevation || '1,500m'}</span>
          </div>
          <p style="font-size: 11px; color: #a8a29e; margin: 0 0 10px 0; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${descText}
          </p>
          <button id="btn-select-${place.id}" style="width: 100%; background: #059669; color: white; border: none; padding: 7px 12px; border-radius: 10px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);">
            <span>🧭 ${language === 'bm' ? 'Pilih Tempat & Laluan' : 'Select Place & Route'}</span>
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        maxWidth: 280,
        className: 'highland-leaflet-popup',
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-${place.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            console.log('[InteractiveMap] Dispatching navigation prompt for:', place.name);
            window.dispatchEvent(new CustomEvent('open-navigation-prompt', { detail: place }));
            marker.closePopup();
          };
        }
      });

      marker.on('click', () => {
        onSelectPlace(place);
      });

      markersRef.current[place.id] = marker;
    };

    const renderMarkers = () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      filteredPlaces.forEach((place) => {
        const rawLat = place.coordinates?.lat ?? (place as any).lat ?? (place as any).latitude;
        const rawLng = place.coordinates?.lng ?? (place as any).lng ?? (place as any).longitude;
        const lat = parseCoord(rawLat);
        const lng = parseCoord(rawLng);
        const defaultCoord = TOWNSHIP_COORDS[place.township] || { lat: 4.475, lng: 101.385 };
        const validLat = lat !== 0 ? lat : defaultCoord.lat;
        const validLng = lng !== 0 ? lng : defaultCoord.lng;

        createSingleMarker(place, validLat, validLng, map);
      });
    };

    renderMarkers();
    map.invalidateSize();
    map.on('zoomend', renderMarkers);

    return () => {
      map.off('zoomend', renderMarkers);
    };
  }, [filteredPlaces, livePlaces, selectedPlace, language]);

  useEffect(() => {
    if (!selectedPlace) {
      setCardZoom(1);
      return;
    }
    setCardZoom(1);
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const defaultCoord = TOWNSHIP_COORDS[selectedPlace.township] || { lat: 4.475, lng: 101.385 };
    const lat = Number(selectedPlace.coordinates?.lat);
    const lng = Number(selectedPlace.coordinates?.lng);
    const validLat = !isNaN(lat) && lat !== 0 ? lat : defaultCoord.lat;
    const validLng = !isNaN(lng) && lng !== 0 ? lng : defaultCoord.lng;

    // Offset so the pin stays in the visible upper portion of the screen above the bottom sheet on mobile, and to the right on desktop
    const isMobile = window.innerWidth < 768;
    const targetLat = isMobile ? validLat - 0.0055 : validLat;
    const targetLng = isMobile ? validLng : validLng - 0.005;

    map.flyTo([targetLat, targetLng], 15, {
      duration: 1.0,
      easeLinearity: 0.25,
    });

    setAnalyzingTraffic(true);
    geminiService
      .analyzePlaceTraffic(selectedPlace)
      .then((res) => {
        setTrafficResult(res);
        setAnalyzingTraffic(false);
      })
      .catch(() => setAnalyzingTraffic(false));
  }, [selectedPlace]);

  const handleLocateMe = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (!('geolocation' in navigator)) {
      map.flyTo(defaultCenter, 14);
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const { latitude, longitude } = pos.coords;
        setUserGpsCoords({ lat: latitude, lng: longitude });

        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
            <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; inset: -8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.45); animation: ping 1.5s infinite;"></div>
              <div style="width: 20px; height: 20px; border-radius: 9999px; background: #10b981; border: 3px solid white; box-shadow: 0 2px 12px rgba(0,0,0,0.65);"></div>
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setLatLng([latitude, longitude]);
          userLocationMarkerRef.current.setIcon(userIcon);
        } else {
          userLocationMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 1100 }).addTo(map);
        }

        userLocationMarkerRef.current.bindTooltip(
          language === 'bm' ? 'Lokasi GPS Anda' : 'Your GPS Location',
          { direction: 'top', className: 'text-xs font-bold' }
        );

        map.flyTo([latitude, longitude], 15, {
          duration: 1.2,
          easeLinearity: 0.25,
        });
      },
      (err) => {
        setIsLocatingUser(false);
        console.warn('[InteractiveMap] Geolocation error:', err);
        map.flyTo(defaultCenter, 14);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="flex flex-col h-full w-full relative min-h-0">
      {/* Map Container with Google Maps / Waze UI Overlays */}
      <div
        className="map-wrapper relative w-full h-full flex-1 min-h-[420px] rounded-none sm:rounded-2xl overflow-hidden border-0 sm:border border-white/10 shadow-2xl glass-panel select-none"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Leaflet Map Target */}
        <div
          ref={mapContainerRef}
          className="w-full h-full z-10"
          style={{ width: '100%', height: '100%' }}
        />

        {/* AI Telemetry Alert Overlay */}
        {activeTelemetryAlert && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-bounce">
            <div className={`p-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 ${
              activeTelemetryAlert.severity === 'high' 
                ? 'bg-red-950/90 border-red-500/50 text-red-200' 
                : 'bg-amber-950/90 border-amber-500/50 text-amber-200'
            }`}>
              <ShieldAlert className={`w-5 h-5 shrink-0 ${activeTelemetryAlert.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {activeTelemetryAlert.type.replace(/_/g, ' ')}
                </div>
                <div className="text-xs font-bold leading-tight">{activeTelemetryAlert.message}</div>
              </div>
              <button 
                onClick={() => setActiveTelemetryAlert(null)}
                className="ml-auto p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 1. TOP FLOATING HEADER (Waze / Google Maps Style): Active when navigation is NOT active */}
        {!activeRoute && !isCalculatingRoute && (
          <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-4 z-30 pointer-events-none flex flex-col gap-2 max-w-2xl sm:mx-auto">
            {/* Top Search & Controls Bar */}
            <div className="pointer-events-auto rounded-2xl bg-stone-900/95 backdrop-blur-xl border border-white/15 shadow-2xl p-1.5 flex items-center gap-1.5 sm:gap-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="sm:hidden p-1.5 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer shrink-0"
                  title={language === 'bm' ? 'Tutup Peta' : 'Close Map'}
                  aria-label="Close Map"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <Search className="w-4 h-4 text-emerald-400 ml-1 sm:ml-2 shrink-0 pointer-events-none" />
              <input
                type="text"
                value={mapTrafficSearchQuery}
                onChange={(e) => {
                  setMapTrafficSearchQuery(e.target.value);
                  setIsTrafficSearchDropdownOpen(true);
                }}
                disabled={isAiSearching}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsTrafficSearchDropdownOpen(true)}
                placeholder={
                  isAiSearching
                    ? (language === 'bm' ? 'AI sedang menganalisis...' : 'AI analyzing intent...')
                    : (language === 'bm'
                      ? 'Cari destinasi, pekan, tarikan Cameron...'
                      : 'Search destinations, towns, places...')
                }
                className={`w-full bg-transparent text-xs sm:text-sm text-stone-100 placeholder-stone-400 outline-none px-1 ${isAiSearching ? 'animate-pulse' : ''}`}
              />
              {isAiSearching && <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin mr-1" />}
              {mapTrafficSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setMapTrafficSearchQuery('');
                    setIsTrafficSearchDropdownOpen(false);
                  }}
                  className="p-1 text-stone-400 hover:text-white transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* View Type Toggle Pills */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-stone-950/80 border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveMapType('osm')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeMapType === 'osm' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Map
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMapType('satellite')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    activeMapType === 'satellite' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Sat
                </button>
                <button
                  type="button"
                  onClick={() => setStreetViewOpen(true)}
                  className="p-1 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-white/5 transition-all cursor-pointer"
                  title="360° Street View"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Filter Menu Hamburger Dropdown */}
              <div className="relative" ref={filterMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`p-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isFilterMenuOpen || proximityRadius !== 'all' || activeTownship !== 'all'
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                  }`}
                  title="Filter Menu"
                >
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold hidden sm:inline">Filters</span>
                </button>

                {isFilterMenuOpen && (
                  <div className="absolute right-0 top-11 z-50 w-64 max-h-[70vh] overflow-y-auto rounded-2xl bg-stone-900/95 backdrop-blur-xl border border-emerald-500/30 shadow-2xl p-3 space-y-4 text-stone-100 animate-in fade-in duration-200">
                    {/* Proximity Radius */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider px-2">Proximity Radius</div>
                      {(['all', '5', '10', '25'] as const).map((rad) => (
                        <button
                          key={rad}
                          type="button"
                          onClick={() => {
                            if (rad !== 'all' && !userGpsCoords) handleLocateMe();
                            setProximityRadius(rad);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                            proximityRadius === rad ? 'bg-emerald-600 text-white' : 'hover:bg-stone-800 text-stone-300'
                          }`}
                        >
                          <span>{rad === 'all' ? 'All Range' : `Within ${rad} km`}</span>
                          {proximityRadius === rad && <span className="text-[10px]">✓</span>}
                        </button>
                      ))}
                    </div>

                    {/* Category Filter */}
                    <div className="space-y-1 pt-2 border-t border-white/10">
                      <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider px-2">Categories</div>
                        <button
                          type="button"
                          onClick={() => handleSelectCategory('travel_tourism', 'all')}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                            activeCategory === 'travel_tourism' || activeCategory === 'attraction'
                              ? 'bg-emerald-600/30 border-emerald-400/80 text-emerald-200 font-bold'
                              : 'bg-stone-900/60 hover:bg-stone-850 border-white/10 text-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">🌴</span>
                            <div className="text-xs font-bold">{language === 'bm' ? 'Tarikan & Pelancongan' : 'Attractions & Tourism'}</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectCategory('accommodation', 'all')}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                            activeCategory === 'accommodation'
                              ? 'bg-teal-600/30 border-teal-400/80 text-teal-200 font-bold'
                              : 'bg-stone-900/60 hover:bg-stone-850 border-white/10 text-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">🏨</span>
                            <div className="text-xs font-bold">{language === 'bm' ? 'Penginapan & Hotel' : 'Stays & Accommodations'}</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectCategory('services_utilities', 'all')}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                            activeCategory === 'services_utilities' || activeCategory === 'local_services'
                              ? 'bg-blue-600/30 border-blue-400/80 text-blue-200 font-bold'
                              : 'bg-stone-900/60 hover:bg-stone-850 border-white/10 text-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">🔧</span>
                            <div className="text-xs font-bold">{language === 'bm' ? 'Perkhidmatan & Utiliti' : 'Services & Utilities'}</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectCategory('shopping', 'all')}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                            activeCategory === 'shopping' || activeCategory === 'business'
                              ? 'bg-pink-600/30 border-pink-400/80 text-pink-200 font-bold'
                              : 'bg-stone-900/60 hover:bg-stone-850 border-white/10 text-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">🛍️</span>
                            <div className="text-xs font-bold">{language === 'bm' ? 'Membeli-belah & Pasar' : 'Shopping & Markets'}</div>
                          </div>
                        </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Locate Me Button */}
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocatingUser}
                className={`p-2 rounded-xl text-white transition-all shadow-md active:scale-95 cursor-pointer shrink-0 ${
                  isLocatingUser
                    ? 'bg-amber-600 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                title={language === 'bm' ? 'Kesan Lokasi GPS Anda' : 'Locate My GPS Position'}
              >
                <LocateFixed className={`w-4 h-4 ${isLocatingUser ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Dropdown Suggestions */}
            {isTrafficSearchDropdownOpen && (
              <div
                ref={trafficSearchRef}
                className="pointer-events-auto max-h-64 overflow-y-auto rounded-2xl bg-stone-950/98 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl p-2 text-stone-100 space-y-1.5 [scrollbar-width:thin]"
              >
                {matchingPlaceResults.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider px-1">
                      📍 Verified Places ({matchingPlaceResults.length})
                    </div>
                    {matchingPlaceResults.map((place) => (
                      <button
                        key={`search-place-${place.id}`}
                        onClick={() => handleSelectPlaceOnMap(place)}
                        className="w-full p-2 rounded-xl text-left hover:bg-emerald-950/60 bg-stone-900/60 border border-emerald-500/20 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-xs text-stone-100 truncate">
                            {language === 'bm' ? place.nameBm || place.name : place.name}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate">
                            {place.township} • {place.subCategory?.replace(/_/g, ' ') || place.category}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                          ★ {place.rating}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {filteredTrafficNavItems.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-white/10">
                    <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider px-1">
                      🛣️ Mountain Corridors
                    </div>
                    {filteredTrafficNavItems.map((item) => (
                      <button
                        key={`search-corridor-${item.id}`}
                        onClick={() => handleSelectTrafficNav(item)}
                        className="w-full p-2 rounded-xl text-left hover:bg-stone-800 bg-stone-900/40 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-xs text-stone-200 truncate">{item.title}</div>
                          <div className="text-[10px] text-stone-400 truncate">{item.subtitle}</div>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-900 border border-white/10 shrink-0 ${item.color}`}>
                          {item.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {matchingPlaceResults.length === 0 && filteredTrafficNavItems.length === 0 && (
                  <div className="p-3 text-center text-xs text-stone-400 font-mono">
                    No places or routes match &quot;{mapTrafficSearchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. TOP NAVIGATION HUD BANNER (Waze / Google Maps Style): Active during navigation */}
        {activeRoute && (
          <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-6 sm:right-6 sm:max-w-xl sm:mx-auto z-40 pointer-events-auto select-none animate-in slide-in-from-top duration-300">
            <div className="rounded-2xl sm:rounded-3xl bg-emerald-700/95 backdrop-blur-2xl border border-emerald-400/40 shadow-2xl p-2.5 sm:p-4 text-white flex items-center justify-between gap-2.5 sm:gap-3">
              {/* Maneuver Icon */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white text-emerald-800 flex items-center justify-center shrink-0 shadow-md">
                <span className="text-xl sm:text-2xl font-black leading-none">
                  {activeRoute.steps[0]?.icon || '⬆️'}
                </span>
              </div>

              {/* Maneuver Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <span className="text-lg sm:text-2xl font-black tracking-tight text-white">
                    {activeRoute.steps[0]?.distanceMeters > 0
                      ? activeRoute.steps[0].distanceMeters >= 1000
                        ? `${(activeRoute.steps[0].distanceMeters / 1000).toFixed(1)} km`
                        : `${activeRoute.steps[0].distanceMeters} m`
                      : 'Now'}
                  </span>
                  {activeRoute.steps[1] && (
                    <span className="text-[10px] sm:text-[11px] font-medium text-emerald-200/90 truncate">
                      Then {activeRoute.steps[1].icon}{' '}
                      {activeRoute.steps[1].distanceMeters >= 1000
                        ? `${(activeRoute.steps[1].distanceMeters / 1000).toFixed(1)} km`
                        : `${activeRoute.steps[1].distanceMeters} m`}
                    </span>
                  )}
                </div>
                <div className="text-[11px] sm:text-sm font-bold text-emerald-50 truncate leading-snug mt-0.5">
                  {activeRoute.steps[0]?.instruction || `Navigate towards ${activeRoute.destinationName}`}
                </div>
              </div>

              {/* End / Exit Navigation Button */}
              <button
                type="button"
                onClick={handleClearRoute}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-black/30 hover:bg-black/50 text-white transition-colors cursor-pointer shrink-0"
                title="End Navigation"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Calculating Route Spinner Overlay */}
        {isCalculatingRoute && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 p-4 rounded-2xl bg-stone-900/95 backdrop-blur-xl border border-emerald-500/40 shadow-2xl flex items-center gap-3 text-stone-100">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            <span className="text-xs font-bold">
              {language === 'bm' ? 'Menjana laluan memandu...' : 'Calculating driving route...'}
            </span>
          </div>
        )}

        {/* 3. BOTTOM NAVIGATION CONTROL CARD: Active during navigation */}
        {activeRoute && !isCalculatingRoute && (
          <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-6 sm:right-6 sm:max-w-xl sm:mx-auto z-40 pointer-events-auto select-none animate-in slide-in-from-bottom duration-300">
            <div className="rounded-2xl sm:rounded-3xl bg-stone-900/95 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl p-2.5 sm:p-4 text-stone-100 flex flex-col gap-2 sm:gap-2.5">
              {/* Mobile Slide-Up Pull / Toggle Handle (Mobile view only) */}
              <div
                onClick={() => setRouteStepsOpen(!routeStepsOpen)}
                className="sm:hidden flex items-center justify-center pt-0.5 pb-1 cursor-pointer -mt-1 active:opacity-75 transition-opacity"
              >
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-stone-800/90 border border-white/10 text-[10px] font-mono font-bold text-emerald-400 shadow-sm">
                  <span>{routeStepsOpen ? '▼ Slide down to minimize' : `▲ Slide up steps (${activeRoute.steps.length})`}</span>
                </div>
              </div>

              {/* Row 1: ETA, Time Remaining, Distance, Live GPS */}
              <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-white/10">
                <div>
                  <div className="text-base sm:text-xl font-black text-emerald-400 leading-none">
                    {(() => {
                      const mins = activeRoute.aiAdjustedMins || activeRoute.durationMins;
                      const arrivalDate = new Date(Date.now() + mins * 60 * 1000);
                      return arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    })()}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-stone-400 font-mono font-bold uppercase mt-0.5">
                    {language === 'bm' ? 'Jangka Tiba' : 'Estimated Arrival'}
                  </div>
                </div>

                <div className="text-center font-mono">
                  <div className="flex flex-col items-center">
                    <div className="text-sm sm:text-lg font-extrabold text-stone-100 leading-tight">
                      {activeRoute.durationMins} min
                    </div>
                    {activeRoute.aiAdjustedMins && activeRoute.aiAdjustedMins !== activeRoute.durationMins && (
                      <div className="flex items-center gap-1 px-1 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mt-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">AI: {activeRoute.aiAdjustedMins}m</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-stone-400 font-bold">{activeRoute.distanceKm} km</div>
                </div>

                {/* Recenter Button (pulses if map is panned away) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFollowEnabled(true);
                    if (mapInstanceRef.current && userGpsCoords) {
                      mapInstanceRef.current.flyTo([userGpsCoords.lat, userGpsCoords.lng], 16, { duration: 0.8 });
                    }
                  }}
                  className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                    isAutoFollowEnabled
                      ? 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-black animate-pulse shadow-amber-950'
                  }`}
                  title="Recenter camera on vehicle"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{isAutoFollowEnabled ? 'Followed' : 'Recenter'}</span>
                </button>
              </div>

              {/* Tactical AI Route Optimizer Button (VRP) */}
              <button
                type="button"
                onClick={() => {
                  if (activeRoute.waypoints && activeRoute.waypoints.length > 0) {
                    const optimized = aiRouteOptimizer.optimizeSequence([
                      { lat: activeRoute.originCoords[0], lng: activeRoute.originCoords[1], name: activeRoute.originName },
                      ...activeRoute.waypoints,
                      { lat: activeRoute.destinationCoords[0], lng: activeRoute.destinationCoords[1], name: activeRoute.destinationName }
                    ]);
                    // Implementation note: This would typically re-draw the route with the new sequence
                    console.log("[AI-VRP] Optimized sequence:", optimized);
                  }
                }}
                className="flex items-center justify-center gap-2 w-full py-1.5 rounded-xl bg-stone-800/50 hover:bg-stone-800 border border-emerald-500/20 text-[10px] font-bold text-stone-300 transition-all cursor-pointer mb-1"
              >
                <Route className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bm' ? 'Optimasi Turutan Laluan AI (VRP)' : 'Optimize AI Stop Sequence (VRP)'}</span>
              </button>

              {/* Row 2: Navigation controls & Turn Steps Drawer Toggle */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={isNavigationPaused ? handleResumeNavigation : handleStopNavigation}
                    className="py-1.5 px-2.5 sm:px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isNavigationPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5 text-cyan-400 fill-current" />
                        <span>Resume</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400 fill-current" />
                        <span>Pause</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRouteStepsOpen(!routeStepsOpen)}
                    className="py-1.5 px-2.5 sm:px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span className="hidden sm:inline">Directions ({activeRoute.steps.length})</span>
                    <span className="sm:hidden">Steps ({activeRoute.steps.length})</span>
                    {routeStepsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${activeRoute.originCoords[0]},${activeRoute.originCoords[1]}&destination=${activeRoute.destinationCoords[0]},${activeRoute.destinationCoords[1]}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-2 sm:px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] sm:text-[11px] flex items-center gap-1 transition-all"
                  >
                    <span>Google</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://waze.com/ul?ll=${activeRoute.destinationCoords[0]},${activeRoute.destinationCoords[1]}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-2 sm:px-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] sm:text-[11px] flex items-center gap-1 transition-all"
                  >
                    <span>Waze</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Turn-by-Turn Guidance Drawer (Slide-up on mobile, toggleable) */}
              {routeStepsOpen && (
                <div className="mt-1 space-y-1.5 max-h-48 sm:max-h-40 overflow-y-auto pr-1 [scrollbar-width:thin] border-t border-white/10 pt-2 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pb-1">
                    <span className="font-bold text-stone-300">Turn-by-turn guidance</span>
                    <button
                      type="button"
                      onClick={() => setRouteStepsOpen(false)}
                      className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                    >
                      Hide Steps
                    </button>
                  </div>
                  {activeRoute.steps.map((step, idx) => (
                    <div
                      key={`step-${idx}`}
                      className="p-2 rounded-xl bg-stone-950/70 border border-white/5 flex items-start gap-2.5 text-xs"
                    >
                      <span className="text-base leading-none shrink-0 mt-0.5">{step.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-stone-200 leading-snug">{step.instruction}</div>
                        {step.distanceMeters > 0 && (
                          <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                            {step.distanceMeters >= 1000
                              ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                              : `${step.distanceMeters} m`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. SLIDE-UP BOTTOM SHEET (Waze / Google Maps Style Place Card) */}
        {selectedPlace && !activeRoute && (
          <div className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-6 sm:bottom-6 sm:w-[410px] sm:right-auto z-[1050] pointer-events-auto select-none animate-in slide-in-from-bottom duration-300 max-w-[calc(100vw-16px)]">
            <div className="rounded-2xl sm:rounded-3xl bg-stone-900/98 backdrop-blur-2xl border border-emerald-500/50 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-3 sm:p-4 text-stone-100 flex flex-col gap-2 sm:gap-2.5 max-h-[66vh] sm:max-h-[75vh] w-full overflow-hidden box-border">
              {/* Drag Handle Indicator */}
              <div className="w-10 h-1 bg-stone-600/80 rounded-full mx-auto -mt-0.5 mb-0.5 shrink-0" />

              {/* Header: Place Photo + Titles + Close Button */}
              <div className="flex items-start justify-between gap-2 w-full min-w-0 shrink-0">
                <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
                  <img
                    src={selectedPlace.imageUrl}
                    alt={selectedPlace.name}
                    className="w-13 h-13 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 border border-white/10 shadow-md aspect-square"
                  />
                  <div className="min-w-0 flex-1 overflow-hidden pr-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 truncate max-w-[130px]">
                        {selectedPlace.township}
                      </span>
                      {selectedPlace.elevation && (
                        <span className="text-[9px] font-mono text-stone-400 shrink-0">
                          {selectedPlace.elevation}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-base font-extrabold text-white mt-1 leading-snug line-clamp-1 break-words truncate">
                      {language === 'bm' ? selectedPlace.nameBm || selectedPlace.name : selectedPlace.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-stone-400 mt-0.5 truncate">
                      <span className="text-amber-400 font-bold shrink-0">★ {selectedPlace.rating}</span>
                      <span className="truncate">({selectedPlace.reviewsCount || 85} reviews)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPlace(null)}
                  className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-1"
                  title="Close place card"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live Distance & Estimated Mountain Drive Time */}
              {(() => {
                const lat = Number(selectedPlace.coordinates?.lat);
                const lng = Number(selectedPlace.coordinates?.lng);
                const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0;

                if (!hasValidCoords) return null;

                if (userGpsCoords) {
                  const dist = calculateDistanceKm(userGpsCoords.lat, userGpsCoords.lng, lat, lng);
                  const estMins = Math.max(3, Math.round((dist / 32) * 60));

                  return (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs shrink-0 w-full min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 text-emerald-300 font-bold min-w-0 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{dist} km away</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold font-mono shrink-0 pl-1 text-[11px] sm:text-xs">
                        <Car className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>~{estMins} mins drive</span>
                      </div>
                    </div>
                  );
                }

                // If GPS is not yet acquired, do NOT show inaccurate 27.5 km! Show direct Locate Me button
                return (
                  <div className="flex items-center justify-between p-1.5 sm:p-2 rounded-xl bg-stone-950/80 border border-emerald-500/20 text-xs shrink-0 w-full min-w-0">
                    <div className="flex items-center gap-1.5 text-stone-300 text-[11px] min-w-0 truncate">
                      <LocateFixed className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{language === 'bm' ? 'Jarak GPS masa nyata' : 'Real-time GPS distance'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLocateMe();
                      }}
                      disabled={isLocatingUser}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-[10px] flex items-center gap-1 shrink-0 cursor-pointer shadow-sm transition-all"
                    >
                      <LocateFixed className={`w-3 h-3 ${isLocatingUser ? 'animate-spin' : ''}`} />
                      <span>{isLocatingUser ? (language === 'bm' ? 'Mengesan...' : 'Locating...') : (language === 'bm' ? 'Kesan GPS' : 'Locate Me')}</span>
                    </button>
                  </div>
                );
              })()}

              {/* PROMINENT "START NAVIGATION" BUTTON (Google Maps / Waze Style) */}
              <button
                type="button"
                onClick={() => {
                  const target = selectedPlace;
                  onSelectPlace(null);
                  handleTriggerRoute(target);
                }}
                className="w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 active:scale-95 transition-all cursor-pointer shrink-0 min-w-0 truncate"
              >
                <Navigation2 className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" />
                <span className="truncate">{language === 'bm' ? 'Mula Navigasi GPS' : 'Start Navigation'}</span>
              </button>

              {/* Scrollable details: Quick Action Links & Operating info */}
              <div className="overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#059669_transparent] pr-1 space-y-2 max-h-[160px] sm:max-h-[220px] w-full min-w-0">
                {/* Secondary Actions: Google Maps, Waze, 360° Panorama */}
                <div className="grid grid-cols-3 gap-1 pt-0.5 w-full">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.coordinates?.lat || 4.49},${selectedPlace.coordinates?.lng || 101.39}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-1 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white font-bold text-[9.5px] sm:text-[10px] flex items-center justify-center gap-1 transition-all text-center min-w-0 overflow-hidden"
                  >
                    <span className="truncate">Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                  <a
                    href={`https://waze.com/ul?ll=${selectedPlace.coordinates?.lat || 4.49},${selectedPlace.coordinates?.lng || 101.39}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-1 rounded-xl bg-cyan-600/90 hover:bg-cyan-600 text-white font-bold text-[9.5px] sm:text-[10px] flex items-center justify-center gap-1 transition-all text-center min-w-0 overflow-hidden"
                  >
                    <span className="truncate">Waze</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setStreetViewOpen(true)}
                    className="py-1.5 px-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-[9.5px] sm:text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer text-center min-w-0 overflow-hidden"
                  >
                    <Eye className="w-3 h-3 shrink-0" />
                    <span className="truncate">360° View</span>
                  </button>
                </div>

                {/* Place Details Accordion */}
                <details className="text-xs bg-stone-950/70 rounded-xl p-2 sm:p-2.5 border border-white/5 group w-full overflow-hidden">
                  <summary className="font-bold text-stone-300 cursor-pointer flex items-center justify-between select-none min-w-0">
                    <span className="truncate pr-1 text-[11px] sm:text-xs">
                      {language === 'bm' ? 'Maklumat & Waktu Operasi' : 'Place Details & Operating Hours'}
                    </span>
                    <span className="text-[10px] text-stone-500 group-open:rotate-180 transition-transform shrink-0">▼</span>
                  </summary>
                  <div className="mt-2 space-y-2 pt-2 border-t border-white/5 text-stone-300 text-[11px] overflow-hidden">
                    <p className="leading-relaxed break-words">
                      {language === 'bm' ? selectedPlace.descriptionBm : selectedPlace.description}
                    </p>
                    {selectedPlace.contact && selectedPlace.contact.trim() !== '' && selectedPlace.contact !== '+60 5-491 1234' && (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] break-all">
                        <Phone className="w-3 h-3 shrink-0" />
                        <a href={`tel:${selectedPlace.contact}`} className="underline hover:text-emerald-300 truncate">
                          {selectedPlace.contact}
                        </a>
                      </div>
                    )}
                  </div>
                </details>

                {/* Crowdsourced Check-ins & Star Rating Reviews Section */}
                <div className="bg-stone-950/90 rounded-2xl p-3 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <span>⭐</span>
                      <span>Visitor Check-in & Reviews</span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400">
                      {selectedPlace.reviews?.length || 0} reviews
                    </span>
                  </div>

                  {/* Submit Review Form */}
                  <div className="space-y-1.5 pt-1 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-stone-300 font-bold">Your Rating:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReviewRating(star)}
                            className={`text-sm cursor-pointer ${star <= newReviewRating ? 'text-amber-400' : 'text-stone-600'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Your Name (optional)"
                      value={newReviewAuthor}
                      onChange={(e) => setNewReviewAuthor(e.target.value)}
                      className="w-full bg-stone-900 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-emerald-500"
                    />
                    <textarea
                      placeholder="Leave a review, safety update, or photo check-in note..."
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      rows={2}
                      className="w-full bg-stone-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-emerald-500 resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddReview(selectedPlace.id)}
                      className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1"
                    >
                      <span>Post Check-in & Review</span>
                    </button>
                  </div>

                  {/* Existing Reviews List */}
                  {selectedPlace.reviews && selectedPlace.reviews.length > 0 ? (
                    <div className="space-y-1.5 pt-2 border-t border-white/10 max-h-36 overflow-y-auto [scrollbar-width:thin]">
                      {selectedPlace.reviews.map((rev) => (
                        <div key={rev.id} className="p-2 rounded-xl bg-stone-900/90 border border-white/5 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-stone-200">{rev.authorName}</span>
                            <span className="text-amber-400 font-mono font-bold">★ {rev.rating}</span>
                          </div>
                          <p className="text-[11px] text-stone-300 leading-snug">{rev.comment}</p>
                          <div className="text-[9.5px] text-stone-500 font-mono">{rev.timestamp}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-stone-400 italic text-center py-1">
                      No check-ins or reviews yet. Be the first to review!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time & Predictive Traffic Forecasting Module for Long-Distance Drivers */}
      <div className="mt-1.5 shrink-0">
        <TrafficForecastingModule
          language={language}
          selectedCorridorId={selectedCorridorId}
          onCorridorChange={setSelectedCorridorId}
          onSelectCorridorOnMap={handleSelectCorridorOnMap}
        />
      </div>

      {/* Street View 360° Panorama Simulator Modal */}
      {streetViewOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/85 backdrop-blur-md p-2 overflow-y-auto"
          onClick={() => setStreetViewOpen(false)}
        >
          <div
            className="glass-panel w-full max-w-4xl mt-16 mb-20 pb-28 overflow-y-auto rounded-3xl bg-stone-900 border border-emerald-500/30 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-stone-950/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-stone-100 text-sm sm:text-base">
                  {selectedPlace
                    ? `${selectedPlace.name} - Street View 360°`
                    : 'Cameron Highlands Scenic Mountain 360° Panorama'}
                </h3>
              </div>
              <button
                onClick={() => setStreetViewOpen(false)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close Modal</span>
              </button>
            </div>

            <div className="relative h-[380px] sm:h-[460px] overflow-hidden bg-stone-950 select-none">
              <img
                src={
                  selectedPlace?.imageUrl ||
                  'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1800&q=85'
                }
                alt="360 Panorama"
                className="w-[180%] h-full object-cover transition-transform duration-300 ease-out cursor-grab active:cursor-grabbing"
                style={{
                  transform: `translateX(-${(panoramaHeading % 100) * 0.75}%) scale(1.05)`,
                }}
              />

              <div className="absolute top-4 left-4 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs text-stone-200 font-mono">
                <div>Compass: {Math.round(panoramaHeading * 3.6)}° N</div>
                <div>Alt: {selectedPlace?.elevation || '1,560 m'}</div>
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-2xl bg-stone-900/90 backdrop-blur-md border border-white/10">
                <button
                  onClick={() => setPanoramaHeading((prev) => prev - 15)}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  ◀ Pan Left
                </button>
                <button
                  onClick={() => setPanoramaHeading(45)}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer"
                  title="Reset Heading"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPanoramaHeading((prev) => prev + 15)}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Pan Right ▶
                </button>
              </div>
            </div>

            <div className="p-3 bg-stone-950 text-xs text-stone-400 text-center border-t border-white/5">
              {language === 'bm'
                ? 'Paparan jalan 360° interaktif disimulasikan dari koordinat satelit Cameron Highlands.'
                : 'Interactive 360° ground perspective rendered from Cameron Highlands geo-coordinates.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};