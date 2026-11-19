import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';

// Safely expose Leaflet globally for any legacy plugin or runtime inspection
if (typeof window !== 'undefined') {
  (window as any).L = L;
}

import { Place, Township, MainCategory, Language, PlaceReview, CamgoHazard } from '../types';
import { firebaseService } from '../services/firebase';
import { TOWNSHIP_PORTALS } from '../data/initialData';
import { getTranslation } from '../services/i18n';
import { geminiService, TrafficAnalysisResult } from '../services/gemini';
import {
  formatTimeTo12Hour,
  getTodayDaySchedule,
  getTodayDayName,
} from '../utils/highlandLogic';
import { safeSrc, DEFAULT_PLACE_IMAGE } from '../utils/safeMedia';
import { voiceLocalizationService } from '../services/voiceLocalizationService';
import { normalizeNavigationText, navigationTtsService } from '../services/navigationTtsService';
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
  LocateFixed,
  Volume2,
  VolumeX,
  ZoomOut,
  Menu,
  Minimize2,
  Fuel,
  Moon,
  Bell,
  ThumbsUp,
  Send,
  FileImage,
} from 'lucide-react';
import { TrafficForecastingModule } from './TrafficForecastingModule';
import { OperationalStatusBadges } from './OperationalStatusBadges';
import { MapSearchBar, GeocodingSearchResult, CorridorNavOption } from './MapSearchBar';
import { RouteOptimizer } from '../lib/ai/routeOptimizer';
import { TelemetryMonitor } from '../lib/ai/telemetryMonitor';
import {
  PredictiveTrafficSegment,
  PredictiveFlowSummaryStats,
  TrafficFlowDataSource,
  HazardTrafficImpactPrediction,
  evaluateHistoricalSegmentFlow,
  enrichSegmentsWithPredictiveFlow,
  applyHazardImpactToSegments,
  predictHazardTrafficImpact,
  fetchTomTomPredictiveRoute,
  computePredictiveRouteTravelTime,
  monitorCorridorTelemetryAnomalies,
  getTomTomApiKey,
} from '../services/tomtomTrafficService';
import {
  camgoHazardsService,
  CLEARED_VOTE_EXPIRY_THRESHOLD,
} from '../services/camgoHazardsService';

const aiRouteOptimizer = new RouteOptimizer();
const telemetryMonitor = new TelemetryMonitor();

export type TrafficPolylineSegment = PredictiveTrafficSegment;

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
    roadClass: 'expressway',
    freeFlowSpeedKmh: 92,
    color: '#10b981',
    speedKmh: 88,
    condition: 'clear',
    statusLabel: 'Free Flow',
    delayMins: 0,
    confidence: 0.91,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.542, 101.128],
      [4.549, 101.165],
      [4.555, 101.198],
      [4.560, 101.220],
    ],
    advisory: 'Wide dual-lane expressway approach. Historical free-flow profile stable.',
  },
  {
    id: 'ft185-pos-slim',
    name: 'FT 185 Pos Slim Mountain Ascent',
    corridor: 'simpang-pulai',
    roadClass: 'mountain_pass',
    freeFlowSpeedKmh: 62,
    color: '#f59e0b',
    speedKmh: 42,
    condition: 'moderate',
    statusLabel: 'Moderate Crawl',
    delayMins: 6,
    confidence: 0.88,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.560, 101.220],
      [4.571, 101.265],
      [4.582, 101.312],
      [4.578, 101.355],
      [4.572, 101.395],
    ],
    advisory: 'Moderate climb behind agricultural lorries; use designated passing lanes.',
  },
  {
    id: 'ft185-blue-valley',
    name: 'FT 185 Blue Valley to Kampung Raja',
    corridor: 'simpang-pulai',
    roadClass: 'expressway',
    freeFlowSpeedKmh: 60,
    color: '#10b981',
    speedKmh: 54,
    condition: 'clear',
    statusLabel: 'Free Flow',
    delayMins: 1,
    confidence: 0.87,
    dataSource: 'historical_predictive',
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
    roadClass: 'expressway',
    freeFlowSpeedKmh: 76,
    color: '#10b981',
    speedKmh: 72,
    condition: 'clear',
    statusLabel: 'Free Flow',
    delayMins: 0,
    confidence: 0.90,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.202, 101.261],
      [4.240, 101.275],
      [4.280, 101.295],
    ],
    advisory: 'NSE Exit 132 connection to foothills. Smooth weekday flow.',
  },
  {
    id: 'ft59-lata-iskandar-approach',
    name: 'FT 59 Lata Iskandar Mountain Hairpins',
    corridor: 'tapah',
    roadClass: 'mountain_pass',
    freeFlowSpeedKmh: 50,
    color: '#f59e0b',
    speedKmh: 36,
    condition: 'moderate',
    statusLabel: 'Moderate Crawl',
    delayMins: 7,
    confidence: 0.86,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.280, 101.295],
      [4.305, 101.310],
      [4.325, 101.322],
    ],
    advisory: '300+ tight hairpin turns. Expect slower afternoon & weekend ascent speeds.',
  },
  {
    id: 'ft59-lata-iskandar-choke',
    name: 'FT 59 Lata Iskandar Waterfall Squeeze',
    corridor: 'tapah',
    roadClass: 'mountain_pass',
    freeFlowSpeedKmh: 44,
    color: '#ef4444',
    speedKmh: 20,
    condition: 'heavy',
    statusLabel: 'Heavy Delays',
    delayMins: 16,
    confidence: 0.85,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.325, 101.322],
      [4.331, 101.328],
      [4.340, 101.338],
    ],
    advisory: 'Roadside fruit stalls and waterfall stops compress single-lane throughput.',
  },
  {
    id: 'ft59-ascent-ringlet',
    name: 'FT 59 Lata Iskandar to Ringlet Climb',
    corridor: 'tapah',
    roadClass: 'mountain_pass',
    freeFlowSpeedKmh: 48,
    color: '#f59e0b',
    speedKmh: 34,
    condition: 'moderate',
    statusLabel: 'Moderate Crawl',
    delayMins: 8,
    confidence: 0.86,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.340, 101.338],
      [4.375, 101.355],
      [4.400, 101.370],
      [4.4147, 101.3820],
    ],
    advisory: 'Narrow mountain climb ascending into southern Ringlet basin.',
  },

  // --- FT 102 Gua Musang / Sg Koyan Central Spine Road ---
  {
    id: 'ft102-csr-expressway',
    name: 'FT 102 Central Spine Road (Raub / Sg Koyan)',
    corridor: 'sungai-koyan',
    roadClass: 'expressway',
    freeFlowSpeedKmh: 98,
    color: '#10b981',
    speedKmh: 94,
    condition: 'clear',
    statusLabel: 'Free Flow',
    delayMins: 0,
    confidence: 0.92,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.215, 101.815],
      [4.260, 101.750],
      [4.320, 101.650],
    ],
    advisory: 'Modern dual-carriageway with consistently clear historical travel speeds.',
  },
  {
    id: 'ft102-mountain-sweep',
    name: 'FT 102 Pos Betau to Ringlet Mountain Sweep',
    corridor: 'sungai-koyan',
    roadClass: 'expressway',
    freeFlowSpeedKmh: 72,
    color: '#10b981',
    speedKmh: 64,
    condition: 'clear',
    statusLabel: 'Free Flow',
    delayMins: 2,
    confidence: 0.89,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.320, 101.650],
      [4.345, 101.580],
      [4.351, 101.528],
      [4.380, 101.450],
      [4.4147, 101.3820],
    ],
    advisory: 'Wide-radius sweeping curves with lowest historical weekend delay.',
  },

  // --- Highland Central Valley Spine (FT 59 Intra-Highland) ---
  {
    id: 'central-ringlet-tanah-rata',
    name: 'Ringlet to Tanah Rata Valley Pass',
    corridor: 'central',
    roadClass: 'town_strip',
    freeFlowSpeedKmh: 52,
    color: '#f59e0b',
    speedKmh: 36,
    condition: 'moderate',
    statusLabel: 'Moderate Crawl',
    delayMins: 5,
    confidence: 0.88,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.4147, 101.3820],
      [4.435, 101.379],
      [4.455, 101.381],
      [4.4715, 101.3805],
    ],
    advisory: 'Steady valley traffic approaching Tanah Rata municipal center.',
  },
  {
    id: 'central-tanah-rata-town',
    name: 'Tanah Rata Town Commercial Strip',
    corridor: 'central',
    roadClass: 'town_strip',
    freeFlowSpeedKmh: 45,
    color: '#ef4444',
    speedKmh: 18,
    condition: 'heavy',
    statusLabel: 'Heavy Delays',
    delayMins: 10,
    confidence: 0.90,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.4715, 101.3805],
      [4.478, 101.382],
      [4.4815, 101.3855],
    ],
    advisory: 'Commercial core traffic around bus terminal, taxi ranks, and cafés.',
  },
  {
    id: 'central-golden-hills-brinchang',
    name: 'Golden Hills to Brinchang Commercial Hub',
    corridor: 'central',
    roadClass: 'town_strip',
    freeFlowSpeedKmh: 45,
    color: '#ef4444',
    speedKmh: 16,
    condition: 'heavy',
    statusLabel: 'Heavy Delays',
    delayMins: 14,
    confidence: 0.89,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.4815, 101.3855],
      [4.486, 101.387],
      [4.4905, 101.3892],
    ],
    advisory: 'Golden Hills Pasar Malam & Brinchang town turn-off delays during peak hours.',
  },
  {
    id: 'central-kea-farm-gridlock',
    name: 'Brinchang to Kea Farm Agro Market Spine',
    corridor: 'central',
    roadClass: 'town_strip',
    freeFlowSpeedKmh: 42,
    color: '#dc2626',
    speedKmh: 11,
    condition: 'gridlock',
    statusLabel: 'Critical Gridlock',
    delayMins: 24,
    confidence: 0.87,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.4905, 101.3892],
      [4.496, 101.398],
      [4.500, 101.403],
      [4.5028, 101.4072],
      [4.506, 101.412],
    ],
    advisory: 'Highland market bottleneck; predictive curve slows sharply 10:00 AM–5:00 PM on weekends.',
  },
  {
    id: 'central-kea-tringkap',
    name: 'Kea Farm to Tringkap & Kuala Terla',
    corridor: 'central',
    roadClass: 'mountain_pass',
    freeFlowSpeedKmh: 54,
    color: '#f59e0b',
    speedKmh: 38,
    condition: 'moderate',
    statusLabel: 'Moderate Crawl',
    delayMins: 4,
    confidence: 0.85,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.506, 101.412],
      [4.5126, 101.4258],
      [4.530, 101.422],
      [4.5458, 101.4172],
    ],
    advisory: 'Agro-market traffic disperses north along vegetable valley bends.',
  },
  {
    id: 'central-terla-raja',
    name: 'Kuala Terla to Kampung Raja Hub',
    corridor: 'central',
    roadClass: 'mountain_pass',
    freeFlowSpeedKmh: 58,
    color: '#10b981',
    speedKmh: 52,
    condition: 'clear',
    statusLabel: 'Free Flow',
    delayMins: 1,
    confidence: 0.86,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.5458, 101.4172],
      [4.558, 101.413],
      [4.5683, 101.4087],
    ],
    advisory: 'Smooth route linking Northern Highlands to Simpang Pulai exit.',
  },

  // --- Rural Highland Plantation & Interior Stretches (Sparse Live Probe Fallback Coverage) ---
  {
    id: 'interior-kea-farm-agro-spur',
    name: 'Kea Farm Interior Orchard & Berry Spur',
    corridor: 'interior',
    roadClass: 'rural_plantation',
    freeFlowSpeedKmh: 36,
    color: '#f59e0b',
    speedKmh: 24,
    condition: 'moderate',
    statusLabel: 'Moderate Crawl',
    delayMins: 7,
    confidence: 0.84,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.5028, 101.4072],
      [4.5065, 101.4105],
      [4.5095, 101.4148],
    ],
    advisory: 'Rural agro-market spur with sparse GPS probes; uses historical harvest & tourist parking speeds.',
  },
  {
    id: 'interior-boh-sg-palas',
    name: 'Boh Tea Sungai Palas Estate Road',
    corridor: 'interior',
    roadClass: 'rural_plantation',
    freeFlowSpeedKmh: 34,
    color: '#f59e0b',
    speedKmh: 21,
    condition: 'heavy',
    statusLabel: 'Heavy Delays',
    delayMins: 9,
    confidence: 0.84,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.5060, 101.4120],
      [4.5105, 101.4142],
      [4.5138, 101.4158],
      [4.5162, 101.4165],
    ],
    advisory: 'Narrow single-lane plantation passing road; predictive historical delays peak 10:00 AM–3:30 PM.',
  },
  {
    id: 'interior-mossy-forest-ridge',
    name: 'Gunung Brinchang & Mossy Forest Ridge Road',
    corridor: 'interior',
    roadClass: 'rural_plantation',
    freeFlowSpeedKmh: 30,
    color: '#10b981',
    speedKmh: 24,
    condition: 'moderate',
    statusLabel: 'Moderate Crawl',
    delayMins: 4,
    confidence: 0.83,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.5125, 101.3910],
      [4.5180, 101.3885],
      [4.5240, 101.3850],
      [4.5278, 101.3822],
    ],
    advisory: 'High-altitude ridge track (~2,000m); cautious passing required around blind mist bends.',
  },
  {
    id: 'interior-habu-plantation',
    name: 'Habu Boh Tea & Highland Farm Backroad',
    corridor: 'interior',
    roadClass: 'rural_plantation',
    freeFlowSpeedKmh: 42,
    color: '#10b981',
    speedKmh: 36,
    condition: 'clear',
    statusLabel: 'Free Flow',
    delayMins: 1,
    confidence: 0.85,
    dataSource: 'historical_predictive',
    coordinates: [
      [4.4480, 101.3810],
      [4.4515, 101.3925],
      [4.4552, 101.4050],
    ],
    advisory: 'Interior plantation valley link; clear alternative outside central weekend surges.',
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
  historicDurationMins?: number;
  noTrafficDurationMins?: number;
  aiAdjustedMins?: number;
  predictiveSource?: TrafficFlowDataSource;
  predictiveSummaryNote?: string;
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
  focusedHazard?: CamgoHazard | null;
  onClearFocusedHazard?: () => void;
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
  focusedHazard = null,
  onClearFocusedHazard,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const townshipLayerRef = useRef<L.LayerGroup | null>(null);
  const hazardLayerRef = useRef<L.LayerGroup | null>(null);
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
  const [mapCenterCoords, setMapCenterCoords] = useState<{ lat: number; lng: number }>({ lat: 4.475, lng: 101.385 });
  const [isTrackingLive, setIsTrackingLive] = useState<boolean>(false);
  const [isNavigationPaused, setIsNavigationPaused] = useState<boolean>(false);
  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState<boolean>(true);
  const [currentHeading, setCurrentHeading] = useState<number>(0);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  // Automatic 3D Driver's Perspective Navigation States & Refs (50° - 65° low-horizon pitch + heading-up)
  const DRIVER_CAMERA_MIN_PITCH = 50;
  const DRIVER_CAMERA_MAX_PITCH = 65;
  const DRIVER_CAMERA_DEFAULT_PITCH = 58;

  const [is3dDriverMode, setIs3dDriverMode] = useState<boolean>(false);
  const [cameraPitch, setCameraPitch] = useState<number>(DRIVER_CAMERA_DEFAULT_PITCH);
  const [cameraTransitionMs, setCameraTransitionMs] = useState<number>(850);
  const [isHeadingUpLocked, setIsHeadingUpLocked] = useState<boolean>(true);
  const [smoothedContinuousHeading, setSmoothedContinuousHeading] = useState<number>(0);
  const continuousHeadingRef = useRef<number>(0);
  const lastGpsPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const [vehicleSpeedKmh, setVehicleSpeedKmh] = useState<number>(0);
  const [dynamicZoomLevel, setDynamicZoomLevel] = useState<number>(17.5);
  const lastAppliedZoomRef = useRef<number>(13);
  const [nextManeuverDistM, setNextManeuverDistM] = useState<number | null>(null);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState<boolean>(false);
  const simIntervalRef = useRef<number | null>(null);
  const simProgressIdxRef = useRef<number>(0);
  const activeRouteRef = useRef<TurnByTurnRoute | null>(null);
  const isSimulatingDriveRef = useRef<boolean>(false);
  const isAutoFollowEnabledRef = useRef<boolean>(true);
  const is3dDriverModeRef = useRef<boolean>(false);

  // Slide-up modals minimize-to-capsule states
  const [isNavCardMinimized, setIsNavCardMinimized] = useState<boolean>(false);
  const [isPlaceCardMinimized, setIsPlaceCardMinimized] = useState<boolean>(false);

  // Hamburger Map Tools Visibility Menu
  interface MapToolVisibility {
    searchBar: boolean;
    viewSwitcher: boolean;
    zoomControls: boolean;
    alertBanners: boolean;
    audioButton: boolean;
    locateButton: boolean;
    navHud: boolean;
  }
  const DEFAULT_MAP_TOOLS_VISIBILITY: MapToolVisibility = {
    searchBar: true,
    viewSwitcher: true,
    zoomControls: true,
    alertBanners: true,
    audioButton: true,
    locateButton: true,
    navHud: true,
  };
  const [mapToolsVisibility, setMapToolsVisibility] = useState<MapToolVisibility>(() => {
    if (typeof window === 'undefined') return DEFAULT_MAP_TOOLS_VISIBILITY;
    try {
      const saved = localStorage.getItem('camgo_map_tools_visibility');
      if (saved) {
        return { ...DEFAULT_MAP_TOOLS_VISIBILITY, ...JSON.parse(saved) };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_MAP_TOOLS_VISIBILITY;
  });
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);

  const toggleMapToolVisibility = (key: keyof MapToolVisibility) => {
    setMapToolsVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('camgo_map_tools_visibility', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const resetMapToolsVisibility = () => {
    setMapToolsVisibility(DEFAULT_MAP_TOOLS_VISIBILITY);
    setIsTrafficOverlayActive(true);
    try {
      localStorage.setItem('camgo_map_tools_visibility', JSON.stringify(DEFAULT_MAP_TOOLS_VISIBILITY));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    activeRouteRef.current = activeRoute;
  }, [activeRoute]);

  useEffect(() => {
    isSimulatingDriveRef.current = isSimulatingDrive;
  }, [isSimulatingDrive]);

  useEffect(() => {
    isAutoFollowEnabledRef.current = isAutoFollowEnabled;
  }, [isAutoFollowEnabled]);

  useEffect(() => {
    is3dDriverModeRef.current = is3dDriverMode;
  }, [is3dDriverMode]);

  useEffect(() => {
    if (!isToolsMenuOpen) return;
    const handleOutsideTools = (event: MouseEvent | TouchEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideTools);
    document.addEventListener('touchstart', handleOutsideTools);
    return () => {
      document.removeEventListener('mousedown', handleOutsideTools);
      document.removeEventListener('touchstart', handleOutsideTools);
    };
  }, [isToolsMenuOpen]);

  // Nearby Attractions Banner & Voice Alert States
  const [dismissedNearbySig, setDismissedNearbySig] = useState<string>('');
  const lastSpokenNearbyRef = useRef<{ sig: string; timestamp: number }>({ sig: '', timestamp: 0 });
  const lastTurnSpeechAtRef = useRef<number>(0);
  const audioUnlockedRef = useRef<boolean>(false);
  const speechTimeoutRef = useRef<number | null>(null);
  const speechActiveTokenRef = useRef<number>(0);

  // Module A & B: Geolocated CamGo Hazards (Firestore camgo_hazards) + Telemetry Anomaly Provisional Pins
  const [activeCamgoHazards, setActiveCamgoHazards] = useState<CamgoHazard[]>([]);
  const [telemetryAnomalies, setTelemetryAnomalies] = useState<CamgoHazard[]>([]);
  const [selectedHazardModal, setSelectedHazardModal] = useState<CamgoHazard | null>(null);
  const [aiIncidentForecast, setAiIncidentForecast] = useState<{
    hazardId: string;
    forecast: string;
    isAiEnhanced: boolean;
    loading: boolean;
  } | null>(null);
  const [isHazardIngestModalOpen, setIsHazardIngestModalOpen] = useState<boolean>(false);
  const [ingestAlertText, setIngestAlertText] = useState<string>('');
  const [ingestImageBase64, setIngestImageBase64] = useState<string | null>(null);
  const [ingestImageMimeType, setIngestImageMimeType] = useState<string>('image/jpeg');
  const [ingestSourceLabel, setIngestSourceLabel] = useState<string>('Telegram Traffic Channel');
  const [isIngestingHazard, setIsIngestingHazard] = useState<boolean>(false);
  const [ingestFeedback, setIngestFeedback] = useState<string | null>(null);

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
  const mobileFilterMenuRef = useRef<HTMLDivElement | null>(null);
  
  // AI States
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [activeTelemetryAlert, setActiveTelemetryAlert] = useState<{ type: string; message: string; severity: string } | null>(null);

  // Close dropdown on click/touch outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const inDesktop = filterMenuRef.current?.contains(target) ?? false;
      const inMobile = mobileFilterMenuRef.current?.contains(target) ?? false;
      if (!inDesktop && !inMobile) {
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

  // Smart Traffic & Predictive Flow Layer States
  const trafficOverlayLayerRef = useRef<L.LayerGroup | null>(null);
  const tomtomRasterTileRef = useRef<L.TileLayer | null>(null);
  const [isTrafficOverlayActive, setIsTrafficOverlayActive] = useState<boolean>(true);
  const [trafficLegendOpen, setTrafficLegendOpen] = useState<boolean>(false);
  const [predictiveDepartureProfile, setPredictiveDepartureProfile] = useState<
    'live' | 'weekend_peak' | 'evening_market' | 'night_clear'
  >('live');
  const [predictiveFlowStats, setPredictiveFlowStats] = useState<PredictiveFlowSummaryStats | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<CongestionHotspotPoint | null>(null);
  const [tomTomKeyPresent, setTomTomKeyPresent] = useState<boolean>(() => {
    return Boolean(getTomTomApiKey());
  });

  const [isVoiceNavEnabled, setIsVoiceNavEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('camgo_pwa_audio_alerts_enabled') !== 'false';
  });
  const isAudioAlertsEnabledRef = useRef<boolean>(isVoiceNavEnabled);
  useEffect(() => {
    isAudioAlertsEnabledRef.current = isVoiceNavEnabled;
  }, [isVoiceNavEnabled]);

  // Keep PWA audio alert state synced across app/tabs
  useEffect(() => {
    const syncPwaAudioState = () => {
      const enabled = localStorage.getItem('camgo_pwa_audio_alerts_enabled') !== 'false';
      setIsVoiceNavEnabled(enabled);
      isAudioAlertsEnabledRef.current = enabled;
    };
    window.addEventListener('camgo-audio-alerts-changed', syncPwaAudioState);
    window.addEventListener('storage', syncPwaAudioState);
    return () => {
      window.removeEventListener('camgo-audio-alerts-changed', syncPwaAudioState);
      window.removeEventListener('storage', syncPwaAudioState);
    };
  }, []);

  const spokenStepsMapRef = useRef<Record<number, boolean>>({});
  const triggeredGeofencesRef = useRef<Set<string>>(new Set());
  const geofenceBannerTimerRef = useRef<number | null>(null);
  const [activeGeofenceBanner, setActiveGeofenceBanner] = useState<{
    id: string;
    kind: 'attraction' | 'fuel' | 'food';
    title: string;
    subtitle: string;
    voiceText: string;
    distanceMeters: number;
    place?: Place;
  } | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  // Muslim Prayer Time ("Coming Soon") Special Alert States (JAKIM Zone PHG04 Cameron Highlands)
  interface PrayerTimesSchedule {
    subuh: string;
    syuruk: string;
    zohor: string;
    asar: string;
    maghrib: string;
    isyak: string;
  }
  const DEFAULT_PHG04_PRAYERS: PrayerTimesSchedule = {
    subuh: '06:05',
    syuruk: '07:18',
    zohor: '13:21',
    asar: '16:38',
    maghrib: '19:22',
    isyak: '20:33',
  };
  const [prayerSchedule, setPrayerSchedule] = useState<PrayerTimesSchedule>(DEFAULT_PHG04_PRAYERS);
  const [prayerSourceLabel, setPrayerSourceLabel] = useState<string>('JAKIM PHG04');
  const [isMuslimPrayerAlertsEnabled, setIsMuslimPrayerAlertsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('camgo_muslim_prayer_alerts') !== 'false';
  });
  const isMuslimPrayerAlertsEnabledRef = useRef<boolean>(isMuslimPrayerAlertsEnabled);
  useEffect(() => {
    isMuslimPrayerAlertsEnabledRef.current = isMuslimPrayerAlertsEnabled;
  }, [isMuslimPrayerAlertsEnabled]);

  const [activePrayerAlert, setActivePrayerAlert] = useState<{
    id: string;
    prayerKey: string;
    prayerName: string;
    timeStr: string;
    time12h: string;
    minsRemaining: number;
    status: 'coming_soon' | 'entered';
    nearestMasjid?: Place | null;
    nearestDistanceKm?: number | null;
    voiceText: string;
  } | null>(null);
  const [nextPrayerInfo, setNextPrayerInfo] = useState<{
    prayerKey: string;
    prayerName: string;
    time12h: string;
    minsRemaining: number;
  } | null>(null);
  const triggeredPrayerKeysRef = useRef<Set<string>>(new Set());

  // Normal Flat 2D Modal for Township Hubs when in Low-Horizon 3D Pitch Mode
  const [selectedTownshipHubModal, setSelectedTownshipHubModal] = useState<{
    township: Township;
    description: string;
    imageUrl: string;
    clinicsOrHospitals: string;
    policeStation: string;
    publicToilet: string;
    gasStation: string;
    placesOfInterest: string[] | string;
    attractionsList: string;
  } | null>(null);

  // Dedicated Map Voice Guidance Language State ('bm' = Bahasa Malaysia, 'en' = English)
  const [mapVoiceLang, setMapVoiceLang] = useState<'bm' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('camgo_map_voice_lang');
      if (saved === 'bm' || saved === 'en') return saved;
    }
    return language === 'bm' ? 'bm' : 'en';
  });

  const mapVoiceLangRef = useRef<'bm' | 'en'>(mapVoiceLang);
  useEffect(() => {
    mapVoiceLangRef.current = mapVoiceLang;
  }, [mapVoiceLang]);

  // Sync voice language when global language prop changes to BM
  useEffect(() => {
    if (language === 'bm') {
      setMapVoiceLang('bm');
      mapVoiceLangRef.current = 'bm';
    }
  }, [language]);

  // Helpers to translate navigation maneuvers and directions between EN and BM
  const translateNavInstructionToBm = (text: string): string => {
    if (!text) return '';
    let bm = text.trim();

    // If already in Malay, return directly
    if (/^(belok|terus|di bulatan|tiba di|bertolak|kekal|ikuti|ambil susur)/i.test(bm)) {
      return bm;
    }

    bm = bm.replace(/depart from origin onto\s+/gi, 'Bertolak dari lokasi asal di ');
    bm = bm.replace(/depart onto\s+/gi, 'Bertolak ke ');
    bm = bm.replace(/head\s+(?:north|south|east|west|northeast|northwest|southeast|southwest)?\s*(?:towards|on)?\s+/gi, 'Bergerak ke hadapan menuju ');
    bm = bm.replace(/head towards\s+/gi, 'Bergerak ke hadapan menuju ');
    bm = bm.replace(/make a u-turn/gi, 'Buat pusingan U');
    bm = bm.replace(/turn slight left onto\s+/gi, 'Ambil sedikit ke kiri ke ');
    bm = bm.replace(/turn slight right onto\s+/gi, 'Ambil sedikit ke kanan ke ');
    bm = bm.replace(/turn sharp left onto\s+/gi, 'Belok tajam ke kiri ke ');
    bm = bm.replace(/turn sharp right onto\s+/gi, 'Belok tajam ke kanan ke ');
    bm = bm.replace(/turn left onto\s+/gi, 'Belok kiri ke ');
    bm = bm.replace(/turn right onto\s+/gi, 'Belok kanan ke ');
    bm = bm.replace(/turn left/gi, 'Belok kiri');
    bm = bm.replace(/turn right/gi, 'Belok kanan');
    bm = bm.replace(/keep left/gi, 'Kekal di lorong kiri');
    bm = bm.replace(/keep right/gi, 'Kekal di lorong kanan');
    bm = bm.replace(/continue straight on\s+/gi, 'Terus ke hadapan di ');
    bm = bm.replace(/continue straight/gi, 'Terus ke hadapan');
    bm = bm.replace(/continue onto\s+/gi, 'Teruskan perjalanan ke ');
    bm = bm.replace(/follow\s+/gi, 'Ikuti laluan ');
    bm = bm.replace(/at the roundabout, take exit onto\s+/gi, 'Di bulatan, ambil susur keluar ke ');
    bm = bm.replace(/at roundabout, take exit onto\s+/gi, 'Di bulatan, ambil susur keluar ke ');
    bm = bm.replace(/at the roundabout/gi, 'Di bulatan');
    bm = bm.replace(/at roundabout/gi, 'Di bulatan');
    bm = bm.replace(/take the 1st exit/gi, 'ambil susur keluar pertama');
    bm = bm.replace(/take the 2nd exit/gi, 'ambil susur keluar kedua');
    bm = bm.replace(/take the 3rd exit/gi, 'ambil susur keluar ketiga');
    bm = bm.replace(/take the 4th exit/gi, 'ambil susur keluar keempat');
    bm = bm.replace(/take exit (\d+)/gi, 'ambil susur keluar ke-$1');
    bm = bm.replace(/you have arrived at your destination:?/gi, 'Anda telah tiba di destinasi');
    bm = bm.replace(/you have arrived at\s+/gi, 'Anda telah tiba di ');
    bm = bm.replace(/arrive at destination:?/gi, 'Tiba di destinasi:');
    bm = bm.replace(/arrive at\s+/gi, 'Tiba di ');
    bm = bm.replace(/destination is on the left/gi, 'Destinasi berada di sebelah kiri anda');
    bm = bm.replace(/destination is on the right/gi, 'Destinasi berada di sebelah kanan anda');
    bm = bm.replace(/\bonto\b/gi, 'ke');
    bm = bm.replace(/\bin (\d+)\s*meters?/gi, 'Dalam $1 meter');
    bm = bm.replace(/\bin (\d+(?:\.\d+)?)\s*km/gi, 'Dalam $1 kilometer');

    return bm;
  };

  const translateNavInstructionToEn = (text: string): string => {
    if (!text) return '';
    let en = text.trim();
    en = en.replace(/^Bertolak dari lokasi (?:asal|permulaan) di\s+/gi, 'Depart from origin onto ');
    en = en.replace(/^Bertolak ke\s+/gi, 'Depart onto ');
    en = en.replace(/^Bergerak ke hadapan menuju\s+/gi, 'Head towards ');
    en = en.replace(/^Belok kiri ke\s+/gi, 'Turn left onto ');
    en = en.replace(/^Belok kanan ke\s+/gi, 'Turn right onto ');
    en = en.replace(/^Belok kiri/gi, 'Turn left');
    en = en.replace(/^Belok kanan/gi, 'Turn right');
    en = en.replace(/^Terus di\s+/gi, 'Continue straight on ');
    en = en.replace(/^Terus ke hadapan di\s+/gi, 'Continue straight on ');
    en = en.replace(/^Terus ke hadapan/gi, 'Continue straight');
    en = en.replace(/^Teruskan ke\s+/gi, 'Continue onto ');
    en = en.replace(/^Teruskan perjalanan ke\s+/gi, 'Continue onto ');
    en = en.replace(/^Di bulatan, ambil susur keluar ke\s+/gi, 'At roundabout, take exit onto ');
    en = en.replace(/^Di bulatan/gi, 'At roundabout');
    en = en.replace(/^Tiba di destinasi:?\s*/gi, 'Arrive at destination: ');
    en = en.replace(/^Anda telah tiba di destinasi:?\s*/gi, 'You have arrived at destination: ');
    en = en.replace(/^Anda telah tiba di\s+/gi, 'You have arrived at ');
    en = en.replace(/^Ikuti laluan\s+/gi, 'Follow ');
    en = en.replace(/^Kekal di lorong kiri/gi, 'Keep left');
    en = en.replace(/^Kekal di lorong kanan/gi, 'Keep right');
    return en;
  };

  const getVoiceInstruction = (rawText: string, targetLang: 'bm' | 'en'): string => {
    return targetLang === 'bm'
      ? translateNavInstructionToBm(rawText)
      : translateNavInstructionToEn(rawText);
  };

  // Requirement 3: Async Voice Loading for Android & Mobile Browsers (without clobbering service listeners)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const handleVoicesChanged = () => {
      const voices = voiceLocalizationService.loadVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
      }
    };
    const unsubscribe = voiceLocalizationService.subscribe(handleVoicesChanged);
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    }
    handleVoicesChanged();
    return () => {
      unsubscribe();
      if (window.speechSynthesis && typeof window.speechSynthesis.removeEventListener === 'function') {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      }
    };
  }, []);

  // Requirement 1: User Gesture / Audio Unlock (iOS & Android PWA Fix)
  const unlockAudioEngine = (force = false) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (audioUnlockedRef.current && !force) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const dummy = new SpeechSynthesisUtterance('');
      dummy.volume = 0;
      window.speechSynthesis.speak(dummy);
      audioUnlockedRef.current = true;
    } catch (e) {
      console.warn('[TTS] Audio unlock warning:', e);
    }
  };

  const stopAllVoiceAlerts = () => {
    speechActiveTokenRef.current += 1;
    if (speechTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    navigationTtsService.stopAudio();
  };

  const togglePwaAudioAlerts = (explicitNext?: boolean) => {
    const nextState = typeof explicitNext === 'boolean' ? explicitNext : !isVoiceNavEnabled;
    setIsVoiceNavEnabled(nextState);
    isAudioAlertsEnabledRef.current = nextState;
    try {
      localStorage.setItem('camgo_pwa_audio_alerts_enabled', String(nextState));
      window.dispatchEvent(new CustomEvent('camgo-audio-alerts-changed', { detail: nextState }));
    } catch {
      // ignore storage restrictions
    }
    if (nextState) {
      unlockAudioEngine(true);
    } else {
      stopAllVoiceAlerts();
    }
  };

  const speakUtteranceMobileSafe = (
    text: string,
    cancelExisting: boolean,
    forcedVoiceLang?: 'bm' | 'en'
  ) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const activeVoiceLang = forcedVoiceLang || mapVoiceLangRef.current || 'en';
    const isBm = activeVoiceLang === 'bm';

    const rawVoiceInstruction = getVoiceInstruction(text, activeVoiceLang);
    const processedText = normalizeNavigationText(rawVoiceInstruction, activeVoiceLang);

    speechActiveTokenRef.current += 1;
    const currentToken = speechActiveTokenRef.current;
    if (speechTimeoutRef.current !== null) {
      window.clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    const dispatchSpeak = () => {
      if (currentToken !== speechActiveTokenRef.current) return;
      try {
        if (synth.paused) {
          synth.resume();
        }
        const utterance = new SpeechSynthesisUtterance(processedText);
        // Strictly bind ms-MY voice (rejecting id-ID Indonesian accents) or English voice
        voiceLocalizationService.configureUtteranceVoice(utterance, activeVoiceLang);
        utterance.rate = isBm ? 0.95 : 1.0;
        utterance.pitch = 1.0;
        synth.speak(utterance);
      } catch (err) {
        console.warn('[TTS] Mobile speech dispatch warning:', err);
      }
    };

    if (cancelExisting && (synth.speaking || synth.pending)) {
      synth.cancel();
      speechTimeoutRef.current = window.setTimeout(dispatchSpeak, 65);
    } else {
      dispatchSpeak();
    }
  };

  const speakInstruction = (
    text: string,
    priority: 'turn' | 'nearby' | 'geofence' = 'turn',
    forcedVoiceLang?: 'bm' | 'en'
  ) => {
    // Check live PWA audio setting before executing speech synthesis
    const pwaAllowed =
      typeof window === 'undefined' ||
      localStorage.getItem('camgo_pwa_audio_alerts_enabled') !== 'false';
    if (!isAudioAlertsEnabledRef.current || !pwaAllowed || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    try {
      const now = Date.now();
      if (priority === 'nearby' && now - lastTurnSpeechAtRef.current < 4500) {
        return; // Never interrupt an urgent turn/geofence instruction
      }
      if (priority === 'turn' || priority === 'geofence') {
        lastTurnSpeechAtRef.current = now;
        speakUtteranceMobileSafe(text, true, forcedVoiceLang);
      } else if (!window.speechSynthesis.speaking) {
        speakUtteranceMobileSafe(text, false, forcedVoiceLang);
      }
    } catch (e) {
      console.warn('[TTS] Speech synthesis error:', e);
    }
  };

  const handleSetMapVoiceLang = (lang: 'bm' | 'en') => {
    setMapVoiceLang(lang);
    mapVoiceLangRef.current = lang;
    try {
      localStorage.setItem('camgo_map_voice_lang', lang);
      window.dispatchEvent(new CustomEvent('camgo-map-voice-changed', { detail: lang }));
    } catch {
      // ignore
    }
    unlockAudioEngine(true);
    if (!isAudioAlertsEnabledRef.current) {
      togglePwaAudioAlerts(true);
    }
    const announce =
      lang === 'bm'
        ? 'Panduan suara Bahasa Malaysia diaktifkan'
        : 'English voice guidance activated';
    speakUtteranceMobileSafe(announce, true, lang);
  };

  const toggleMapVoiceLang = () => {
    const nextLang = mapVoiceLang === 'bm' ? 'en' : 'bm';
    handleSetMapVoiceLang(nextLang);
  };

  const [trafficSegments, setTrafficSegments] = useState<TrafficPolylineSegment[]>(() =>
    HIGHWAY_TRAFFIC_SEGMENTS.map((seg) => evaluateHistoricalSegmentFlow(seg, new Date()))
  );
  const [congestionHotspots, setCongestionHotspots] = useState<CongestionHotspotPoint[]>(CONGESTION_HOTSPOTS);

  const getPredictiveTargetDate = (
    profile: 'live' | 'weekend_peak' | 'evening_market' | 'night_clear'
  ): Date => {
    const now = new Date();
    if (profile === 'live') return now;

    const preview = new Date(now);
    if (profile === 'weekend_peak') {
      // Shift to upcoming Saturday 11:30 AM for Peak Highland Traffic Pattern
      const daysUntilSat = (6 - now.getDay() + 7) % 7;
      preview.setDate(now.getDate() + daysUntilSat);
      preview.setHours(11, 30, 0, 0);
    } else if (profile === 'evening_market') {
      // Friday Evening 18:30 Golden Hills / Brinchang Surge
      const daysUntilFri = (5 - now.getDay() + 7) % 7;
      preview.setDate(now.getDate() + daysUntilFri);
      preview.setHours(18, 30, 0, 0);
    } else {
      preview.setHours(23, 30, 0, 0);
    }
    return preview;
  };

  // Enrich highway corridors & rural highland plantation stretches using TomTom Live + Historical Fallback
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const refreshPredictiveFlow = async () => {
      const targetDate = getPredictiveTargetDate(predictiveDepartureProfile);
      const apiKey = predictiveDepartureProfile === 'live' ? getTomTomApiKey() : '';

      const { segments, stats } = await enrichSegmentsWithPredictiveFlow(
        HIGHWAY_TRAFFIC_SEGMENTS,
        targetDate,
        apiKey,
        controller.signal
      );

      if (!isMounted || controller.signal.aborted) return;

      setTrafficSegments(segments);
      setPredictiveFlowStats(stats);

      const hour = targetDate.getHours();
      const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;

      setCongestionHotspots(
        CONGESTION_HOTSPOTS.map((hot) => {
          let delayMult = 1.0;
          if (hour >= 20 || hour <= 7) {
            delayMult = 0.12;
          } else if (isWeekend && hour >= 9 && hour <= 17) {
            delayMult = 1.25;
          } else if (hour >= 10 && hour <= 15) {
            delayMult = 0.72;
          } else {
            delayMult = 0.45;
          }

          const predictedDelay = Math.max(1, Math.round(hot.delayMins * delayMult));
          const predictedSpeed = Math.max(
            6,
            Math.min(62, Math.round(hot.speedKmh / Math.max(0.25, delayMult)))
          );
          const severity: 'gridlock' | 'heavy' | 'moderate' =
            predictedDelay >= 20 ? 'gridlock' : predictedDelay >= 10 ? 'heavy' : 'moderate';

          return {
            ...hot,
            speedKmh: predictedSpeed,
            delayMins: predictedDelay,
            severity,
            color: severity === 'gridlock' ? '#dc2626' : severity === 'heavy' ? '#ef4444' : '#f59e0b',
          };
        })
      );
    };

    refreshPredictiveFlow();
    const interval = window.setInterval(refreshPredictiveFlow, 1000 * 120); // Refresh every 2 mins
    window.addEventListener('tomtom-key-updated', refreshPredictiveFlow);

    return () => {
      isMounted = false;
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('tomtom-key-updated', refreshPredictiveFlow);
    };
  }, [predictiveDepartureProfile]);

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

  // Exact meter-level Haversine distance for strict geofence proximity alerts
  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
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
  const [selectedCorridorId, setSelectedCorridorId] = useState<
    'simpang-pulai' | 'tapah' | 'sungai-koyan'
  >('simpang-pulai');

  const TRAFFIC_NAV_ITEMS: CorridorNavOption[] = [
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

  const handleSelectPlaceOnMap = (place: Place) => {
    onSelectPlace(place);

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

  const handleSelectTrafficNav = (item: CorridorNavOption) => {
    setSelectedCorridorId(item.corridorId);
    handleSelectCorridorOnMap(item.corridorId);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(item.coords, item.zoom, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  };

  const handleAiSearchSubmit = async (queryText: string): Promise<boolean> => {
    setIsAiSearching(true);
    try {
      const intent = await geminiService.parseSpatialIntent(queryText);
      if (intent && intent.category) {
        const matches = livePlaces.filter(
          (p) =>
            p.category.toLowerCase().includes(intent.category.toLowerCase()) ||
            (p.subCategory && p.subCategory.toLowerCase().includes(intent.category.toLowerCase())) ||
            (p.tags && p.tags.some((t) => t.toLowerCase().includes(intent.category.toLowerCase())))
        );
        if (matches.length > 0) {
          handleSelectPlaceOnMap(matches[0]);
          setIsAiSearching(false);
          return true;
        }
      }
    } catch (err) {
      console.warn('AI search error:', err);
    }
    setIsAiSearching(false);
    return false;
  };

  const handleNavigateGeocodedPin = (res: GeocodingSearchResult) => {
    const tempPlace: Place = {
      id: res.id,
      name: res.name,
      nameBm: res.name,
      category: 'travel_tourism',
      subCategory: 'attractions_sightseeing',
      township: 'Tanah Rata',
      location: res.address,
      description: res.address,
      descriptionBm: res.address,
      operatingHours: { from: '00:00', to: '23:59', isOpen: true, isOpen24Hours: true },
      imageUrl: DEFAULT_PLACE_IMAGE,
      coordinates: { lat: res.lat, lng: res.lon },
      rating: 4.8,
      reviewsCount: 1,
      elevation: '1,500m',
      tags: ['Search Pin'],
    };
    onSelectPlace(null);
    handleTriggerRoute(tempPlace);
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

  // Smart Predictive TomTom Routing API Fetcher (traffic=true, computeTravelTimeFor=all, departAt, sectionType=traffic)
  const fetchTomTomRoute = async (
    origin: { lat: number; lng: number; name: string },
    destination: { lat: number; lng: number; name: string },
    apiKey: string
  ): Promise<TurnByTurnRoute | null> => {
    const result = await fetchTomTomPredictiveRoute(origin, destination, apiKey, {
      language,
      departAt: getPredictiveTargetDate(predictiveDepartureProfile),
    });
    if (!result) return null;

    return {
      originName: result.originName,
      originCoords: result.originCoords,
      destinationName: result.destinationName,
      destinationCoords: result.destinationCoords,
      distanceKm: result.distanceKm,
      durationMins: result.durationMins,
      historicDurationMins: result.historicDurationMins,
      noTrafficDurationMins: result.noTrafficDurationMins,
      aiAdjustedMins: result.aiAdjustedMins,
      predictiveSource: result.predictiveSource,
      predictiveSummaryNote: result.predictiveSummaryNote,
      steps: result.steps,
      coordinates: result.coordinates,
    };
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

    // Origin Start Marker (Subtle Departure Pin — live zoomed-in Car marker sits on vehicle location)
    const originIcon = L.divIcon({
      className: 'route-origin-marker',
      html: `
        <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 14px; height: 14px; border-radius: 9999px; background: #0ea5e9; border: 2.5px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.55);"></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const originMarker = L.marker(routeData.originCoords, { icon: originIcon, zIndexOffset: 880 });
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

    // Apply Spatial-Temporal Predictive Travel Time Calculation (Historical fallback + Live blend)
    const targetDate = getPredictiveTargetDate(predictiveDepartureProfile);
    if (!routeData.predictiveSummaryNote) {
      const baseSecs = Math.max(60, routeData.durationMins * 60);
      const spatialPred = computePredictiveRouteTravelTime(
        routeData.coordinates,
        baseSecs,
        targetDate
      );
      aiRouteOptimizer
        .getPredictiveETA(
          [routeData.originCoords[0], routeData.originCoords[1]],
          [routeData.destinationCoords[0], routeData.destinationCoords[1]],
          {
            baseDurationSecs: baseSecs,
            coordinates: routeData.coordinates,
            departAt: targetDate,
          }
        )
        .then((adjustedSeconds) => {
          setActiveRoute((prev) =>
            prev
              ? {
                  ...prev,
                  aiAdjustedMins: Math.max(1, Math.round(adjustedSeconds / 60)),
                  historicDurationMins: Math.max(1, Math.round(spatialPred.adjustedDurationSecs / 60)),
                  predictiveSource: prev.predictiveSource || 'historical_predictive',
                  predictiveSummaryNote: prev.predictiveSummaryNote || spatialPred.summaryNote,
                }
              : null
          );
        });
    }

    // Automatically initialize 3D Driver's Perspective (50-65° low-horizon pitch, heading-up & easeTo) when navigation starts
    const initialOrigin = routeData.coordinates[0] || routeData.originCoords;
    const initialNext = routeData.coordinates[1] || routeData.destinationCoords;
    const initialBearing = computeBearingDeg(
      initialOrigin[0],
      initialOrigin[1],
      initialNext[0],
      initialNext[1]
    );
    const initialMetrics = computeUpcomingManeuverMetrics(initialOrigin[0], initialOrigin[1], routeData);
    const maxZoomAllowed = tileLayers[activeMapType]?.maxZoom || 18;
    const initialZoom = computeDynamicDriverZoom(0, initialMetrics.distToTurnM, maxZoomAllowed);
    const initialPitch = computeDynamicDriverPitch(0, initialMetrics.distToTurnM);

    setIs3dDriverMode(true);
    setIsHeadingUpLocked(true);
    setIsAutoFollowEnabled(true);
    setIsNavCardMinimized(false);

    updateVehicleMarkerOnMap(
      initialOrigin[0],
      initialOrigin[1],
      initialBearing,
      0,
      initialMetrics.distToTurnM
    );

    easeTo({
      center: [initialOrigin[0], initialOrigin[1]],
      zoom: initialZoom,
      bearing: initialBearing,
      pitch: initialPitch,
      duration: 900,
    });
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

  // Geographic Forward Bearing Calculation (0-360°)
  const computeBearingDeg = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  };

  // Shortest-Angle Unwrapping for Smooth 3D Heading-Up Rotation (prevents 355° -> 5° spin-back)
  const updateSmoothHeading = (rawHeading: number) => {
    if (typeof rawHeading !== 'number' || isNaN(rawHeading)) return;
    const normalizedTarget = ((rawHeading % 360) + 360) % 360;
    const prevMod = ((continuousHeadingRef.current % 360) + 360) % 360;
    const delta = ((normalizedTarget - prevMod + 540) % 360) - 180;
    continuousHeadingRef.current += delta;
    setCurrentHeading(normalizedTarget);
    setSmoothedContinuousHeading(continuousHeadingRef.current);
  };

  // Dynamic Low-Horizon Camera Pitch strictly clamped between 50° and 65° for Driver's Perspective
  const computeDynamicDriverPitch = (
    speedKmh: number,
    distToNextTurnMeters: number | null
  ): number => {
    let targetPitch = DRIVER_CAMERA_DEFAULT_PITCH;
    if (distToNextTurnMeters !== null && distToNextTurnMeters <= 150) {
      targetPitch = 52; // Slightly steeper 52° for tight intersection clarity
    } else if (speedKmh >= 60) {
      targetPitch = 63; // Deeper 63° low-horizon forward perspective on fast stretches
    } else if (speedKmh >= 35) {
      targetPitch = 59;
    } else {
      targetPitch = 55;
    }
    return Math.min(DRIVER_CAMERA_MAX_PITCH, Math.max(DRIVER_CAMERA_MIN_PITCH, targetPitch));
  };

  // Dynamic Zoom Scaling based on Vehicle Speed & Upcoming Maneuver Distance (zoomed-in around car marker)
  const computeDynamicDriverZoom = (
    speedKmh: number,
    distToNextTurnMeters: number | null,
    maxTileZoom: number
  ): number => {
    let distZoom: number | null = null;
    if (distToNextTurnMeters !== null) {
      if (distToNextTurnMeters <= 120) distZoom = 19.0;
      else if (distToNextTurnMeters <= 280) distZoom = 18.5;
      else if (distToNextTurnMeters <= 550) distZoom = 18.0;
    }

    let speedZoom = 18.25;
    if (speedKmh >= 75) speedZoom = 16.75;
    else if (speedKmh >= 55) speedZoom = 17.25;
    else if (speedKmh >= 35) speedZoom = 17.75;
    else if (speedKmh >= 15) speedZoom = 18.25;
    else speedZoom = 18.75;

    const target = distZoom !== null ? Math.max(speedZoom, distZoom) : speedZoom;
    return Math.min(maxTileZoom, Number((Math.round(target * 4) / 4).toFixed(2)));
  };

  // Smooth Camera Transition Updater: easeTo({ center, zoom, bearing, pitch, duration })
  const easeTo = (options: {
    center?: [number, number];
    zoom?: number;
    bearing?: number;
    pitch?: number;
    duration?: number;
  }) => {
    const durationMs = Math.max(250, options.duration ?? 700);
    setCameraTransitionMs(durationMs);

    if (typeof options.bearing === 'number' && !isNaN(options.bearing)) {
      updateSmoothHeading(options.bearing);
    }

    if (typeof options.pitch === 'number' && !isNaN(options.pitch)) {
      const clamped = Math.min(DRIVER_CAMERA_MAX_PITCH, Math.max(DRIVER_CAMERA_MIN_PITCH, options.pitch));
      setCameraPitch(clamped);
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    const targetCenter = options.center ?? [map.getCenter().lat, map.getCenter().lng];
    const currentZoom = map.getZoom();
    const shouldAdjustZoom =
      typeof options.zoom === 'number' &&
      !isNaN(options.zoom) &&
      Math.abs(options.zoom - currentZoom) >= 0.15;
    const targetZoom = shouldAdjustZoom ? (options.zoom as number) : currentZoom;

    lastAppliedZoomRef.current = targetZoom;
    setDynamicZoomLevel(targetZoom);

    if (!shouldAdjustZoom) {
      map.panTo(targetCenter, {
        animate: true,
        duration: durationMs / 1000,
        easeLinearity: 0.18,
      });
    } else {
      map.setView(targetCenter, targetZoom, {
        animate: true,
        duration: durationMs / 1000,
        easeLinearity: 0.18,
      });
    }
  };

  // Estimate upcoming turn/maneuver distance along route coordinates
  const computeUpcomingManeuverMetrics = (
    lat: number,
    lng: number,
    route: TurnByTurnRoute | null
  ): { distToTurnM: number | null; segmentBearing: number | null } => {
    if (!route || !route.coordinates || route.coordinates.length < 2) {
      return { distToTurnM: null, segmentBearing: null };
    }
    const coords = route.coordinates;
    let nearestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = calculateDistanceKm(lat, lng, coords[i][0], coords[i][1]);
      if (d < bestDist) {
        bestDist = d;
        nearestIdx = i;
      }
    }
    const nextIdx = Math.min(coords.length - 1, nearestIdx + 1);
    const prevIdx = Math.max(0, nextIdx - 1);
    const segmentBearing =
      coords[prevIdx][0] !== coords[nextIdx][0] || coords[prevIdx][1] !== coords[nextIdx][1]
        ? computeBearingDeg(coords[prevIdx][0], coords[prevIdx][1], coords[nextIdx][0], coords[nextIdx][1])
        : null;

    // Look ahead for a significant bend (>= 28°) to measure upcoming maneuver distance
    let cumulativeKm = 0;
    let baseBearing = segmentBearing;
    for (let j = nearestIdx; j < coords.length - 2; j++) {
      cumulativeKm += calculateDistanceKm(coords[j][0], coords[j][1], coords[j + 1][0], coords[j + 1][1]);
      const aheadBearing = computeBearingDeg(coords[j + 1][0], coords[j + 1][1], coords[j + 2][0], coords[j + 2][1]);
      if (baseBearing !== null) {
        const angleDiff = Math.abs(((aheadBearing - baseBearing + 540) % 360) - 180);
        if (angleDiff >= 28) {
          return { distToTurnM: Math.round(cumulativeKm * 1000), segmentBearing };
        }
      }
      baseBearing = aheadBearing;
      if (cumulativeKm > 1.2) break;
    }

    const distToEndM = Math.round(
      calculateDistanceKm(lat, lng, route.destinationCoords[0], route.destinationCoords[1]) * 1000
    );
    return { distToTurnM: distToEndM <= 650 ? distToEndM : null, segmentBearing };
  };

  // Zoomed-in Top-Down Car Vehicle Marker with smooth rotation, heading-up tracking & camera follow
  const updateVehicleMarkerOnMap = (
    lat: number,
    lng: number,
    heading: number = 0,
    speedKmh: number = 0,
    distToTurnM: number | null = null
  ) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    updateSmoothHeading(heading);
    setVehicleSpeedKmh(Math.round(speedKmh));
    setNextManeuverDistM(distToTurnM);

    const rotationStyle = `transform: rotate(${heading}deg); transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);`;

    const vehicleHtml = `
      <div style="position: relative; width: 62px; height: 62px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: -2px; border-radius: 9999px; background: rgba(16, 185, 129, 0.28);" class="animate-ping"></div>
        <div style="position: absolute; width: 54px; height: 54px; border-radius: 9999px; background: radial-gradient(circle, rgba(14,165,233,0.38) 0%, rgba(14,165,233,0) 72%);"></div>
        <div style="${rotationStyle} width: 50px; height: 50px; border-radius: 9999px; background: rgba(15, 23, 42, 0.9); border: 2.5px solid #38bdf8; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.75); z-index: 10;">
          <svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Subtle forward headlight cone -->
            <path d="M21 10L15 2H49L43 10H21Z" fill="rgba(253, 224, 71, 0.32)"/>
            <!-- Wheels -->
            <rect x="14" y="15" width="5" height="10" rx="2" fill="#0f172a" stroke="#475569" stroke-width="1"/>
            <rect x="45" y="15" width="5" height="10" rx="2" fill="#0f172a" stroke="#475569" stroke-width="1"/>
            <rect x="14" y="40" width="5" height="10" rx="2" fill="#0f172a" stroke="#475569" stroke-width="1"/>
            <rect x="45" y="40" width="5" height="10" rx="2" fill="#0f172a" stroke="#475569" stroke-width="1"/>
            <!-- Side Mirrors -->
            <path d="M17 24L12.5 26V28.5L17 27.5V24Z" fill="#0284c7"/>
            <path d="M47 24L51.5 26V28.5L47 27.5V24Z" fill="#0284c7"/>
            <!-- Car Body Chassis -->
            <rect x="17" y="9" width="30" height="46" rx="9" fill="#0ea5e9" stroke="#ffffff" stroke-width="2.2"/>
            <!-- Hood lines -->
            <path d="M23 12V20M41 12V20" stroke="#7dd3fc" stroke-width="1.4" stroke-linecap="round"/>
            <!-- Front Windshield -->
            <path d="M20.5 21.5C21.5 18.5 42.5 18.5 43.5 21.5L41.5 29H22.5L20.5 21.5Z" fill="#0f172a" stroke="#bae6fd" stroke-width="1.2"/>
            <!-- Panoramic Roof -->
            <rect x="22" y="29" width="20" height="14" rx="3" fill="#0284c7" stroke="#e0f2fe" stroke-width="1.2"/>
            <!-- Rear Window -->
            <path d="M22.5 43H41.5L43 49.5C41 51.5 23 51.5 21 49.5L22.5 43Z" fill="#0f172a"/>
            <!-- Headlights -->
            <rect x="20" y="9.5" width="5" height="2.6" rx="1" fill="#fef08a"/>
            <rect x="39" y="9.5" width="5" height="2.6" rx="1" fill="#fef08a"/>
            <!-- Tail Lights -->
            <rect x="20" y="52.2" width="5.5" height="2.4" rx="1" fill="#f43f5e"/>
            <rect x="38.5" y="52.2" width="5.5" height="2.4" rx="1" fill="#f43f5e"/>
          </svg>
        </div>
      </div>
    `;

    const vehicleIcon = L.divIcon({
      className: 'live-vehicle-puck-marker',
      html: vehicleHtml,
      iconSize: [62, 62],
      iconAnchor: [31, 31],
    });

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([lat, lng]);
      vehicleMarkerRef.current.setIcon(vehicleIcon);
    } else {
      vehicleMarkerRef.current = L.marker([lat, lng], {
        icon: vehicleIcon,
        zIndexOffset: 1250,
      }).addTo(map);

      vehicleMarkerRef.current.bindTooltip(
        language === 'bm' ? 'Kereta Anda (Navigasi Langsung)' : 'Your Car (Live Navigation)',
        { direction: 'top', className: 'text-xs font-bold' }
      );
    }

    // Smooth Camera Updater via easeTo() on GPS position or heading update
    if (isAutoFollowEnabledRef.current) {
      const maxZoomAllowed = tileLayers[activeMapType]?.maxZoom || 18;
      const targetZoom = computeDynamicDriverZoom(speedKmh, distToTurnM, maxZoomAllowed);
      const targetPitch = computeDynamicDriverPitch(speedKmh, distToTurnM);

      easeTo({
        center: [lat, lng],
        zoom: targetZoom,
        bearing: heading,
        pitch: is3dDriverModeRef.current ? targetPitch : DRIVER_CAMERA_DEFAULT_PITCH,
        duration: 620,
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
        if (isSimulatingDriveRef.current) return; // Don't fight active drive simulator
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speed = (pos.coords.speed || 0) * 3.6; // Convert m/s to km/h

        const currentRoute = activeRouteRef.current;
        const routeMetrics = computeUpcomingManeuverMetrics(lat, lng, currentRoute);
        let resolvedHeading =
          typeof pos.coords.heading === 'number' && !isNaN(pos.coords.heading) && speed > 1.5
            ? pos.coords.heading
            : null;

        if (resolvedHeading === null && lastGpsPointRef.current) {
          const movedKm = calculateDistanceKm(
            lastGpsPointRef.current.lat,
            lastGpsPointRef.current.lng,
            lat,
            lng
          );
          if (movedKm >= 0.004) {
            resolvedHeading = computeBearingDeg(
              lastGpsPointRef.current.lat,
              lastGpsPointRef.current.lng,
              lat,
              lng
            );
          }
        }
        if (resolvedHeading === null && routeMetrics.segmentBearing !== null) {
          resolvedHeading = routeMetrics.segmentBearing;
        }
        lastGpsPointRef.current = { lat, lng };

        setUserGpsCoords({ lat, lng });
        updateVehicleMarkerOnMap(
          lat,
          lng,
          resolvedHeading ?? currentHeading,
          speed,
          routeMetrics.distToTurnM
        );
        evaluateProximityGeofences(lat, lng);

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
          setTimeout(() => setActiveTelemetryAlert(null), 10000);
        }

        // Turn-by-turn Proximity check (within 45 meters) & TTS voice engine
        if (currentRoute && currentRoute.steps && currentRoute.steps.length > 0) {
          currentRoute.steps.forEach((step, idx) => {
            if (spokenStepsMapRef.current[idx]) return;
            const targetCoord = currentRoute.coordinates[Math.min(idx * 3, currentRoute.coordinates.length - 1)] || currentRoute.destinationCoords;
            const distKm = calculateDistanceKm(lat, lng, targetCoord[0], targetCoord[1]);
            const distMeters = distKm * 1000;
            if (distMeters <= 45) {
              spokenStepsMapRef.current[idx] = true;
              speakInstruction(step.instruction, 'turn');
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

  // Stop Simulated Drive Helper
  const stopSimulatedDrive = () => {
    if (simIntervalRef.current !== null) {
      window.clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulatingDrive(false);
  };

  // Interactive 3D Drive Simulator along active route for previewing 45-65° pitch, heading-up & dynamic zoom
  const handleToggleSimulateDrive = () => {
    unlockAudioEngine(true);
    if (isSimulatingDrive) {
      stopSimulatedDrive();
      return;
    }
    if (!activeRoute || activeRoute.coordinates.length < 2) return;

    resetTripLegGeofences();
    setIs3dDriverMode(true);
    setIsHeadingUpLocked(true);
    setIsAutoFollowEnabled(true);
    setIsNavigationPaused(false);
    setIsSimulatingDrive(true);
    simProgressIdxRef.current = 0;

    const coords = activeRoute.coordinates;
    const stepStride = Math.max(1, Math.floor(coords.length / 110));

    const advanceFrame = () => {
      const idx = simProgressIdxRef.current;
      if (idx >= coords.length - 1) {
        stopSimulatedDrive();
        speakInstruction(
          mapVoiceLangRef.current === 'bm' || language === 'bm'
            ? `Anda telah tiba di destinasi ${activeRoute.destinationName}`
            : `You have arrived at ${activeRoute.destinationName}`,
          'turn'
        );
        return;
      }

      const nextIdx = Math.min(coords.length - 1, idx + stepStride);
      const [lat1, lng1] = coords[idx];
      const [lat2, lng2] = coords[nextIdx];
      const bearing = computeBearingDeg(lat1, lng1, lat2, lng2);
      const metrics = computeUpcomingManeuverMetrics(lat1, lng1, activeRoute);

      // Simulate realistic speed: slow down on sharp upcoming bends, faster on straight highways
      const simSpeed =
        metrics.distToTurnM !== null && metrics.distToTurnM <= 140
          ? 24
          : metrics.distToTurnM !== null && metrics.distToTurnM <= 320
          ? 38
          : 68;

      setUserGpsCoords({ lat: lat1, lng: lng1 });
      updateVehicleMarkerOnMap(lat1, lng1, bearing, simSpeed, metrics.distToTurnM);
      evaluateProximityGeofences(lat1, lng1);

      simProgressIdxRef.current = nextIdx;
    };

    advanceFrame();
    simIntervalRef.current = window.setInterval(advanceFrame, 650);
  };

  // Lifecycle Cleanup
  const stopLiveGpsTracking = () => {
    stopSimulatedDrive();
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

  // Start, Stop, Resume Navigation Handlers (Automatic 50-65° pitch, heading-up & smooth easeTo)
  const handleStartNavigation = () => {
    unlockAudioEngine(true);
    resetTripLegGeofences();
    setIsNavigationPaused(false);
    setIs3dDriverMode(true);
    setIsHeadingUpLocked(true);
    setIsAutoFollowEnabled(true);
    setIsNavCardMinimized(false);
    startLiveGpsTracking();
    if (mapInstanceRef.current) {
      const targetLat = userGpsCoords?.lat || activeRoute?.originCoords[0] || 4.4715;
      const targetLng = userGpsCoords?.lng || activeRoute?.originCoords[1] || 101.3805;
      const initialMetrics = computeUpcomingManeuverMetrics(targetLat, targetLng, activeRoute);
      const targetZoom = computeDynamicDriverZoom(
        vehicleSpeedKmh,
        initialMetrics.distToTurnM,
        tileLayers[activeMapType]?.maxZoom || 18
      );
      const targetPitch = computeDynamicDriverPitch(vehicleSpeedKmh, initialMetrics.distToTurnM);
      easeTo({
        center: [targetLat, targetLng],
        zoom: targetZoom,
        bearing: initialMetrics.segmentBearing ?? currentHeading,
        pitch: targetPitch,
        duration: 950,
      });
    }
  };

  const handleStopNavigation = () => {
    setIsNavigationPaused(true);
    stopLiveGpsTracking();
  };

  const handleResumeNavigation = () => {
    unlockAudioEngine(true);
    setIsNavigationPaused(false);
    setIs3dDriverMode(true);
    setIsHeadingUpLocked(true);
    setIsAutoFollowEnabled(true);
    startLiveGpsTracking();
    if (mapInstanceRef.current && userGpsCoords) {
      const metrics = computeUpcomingManeuverMetrics(userGpsCoords.lat, userGpsCoords.lng, activeRoute);
      const targetZoom = computeDynamicDriverZoom(
        vehicleSpeedKmh,
        metrics.distToTurnM,
        tileLayers[activeMapType]?.maxZoom || 18
      );
      const targetPitch = computeDynamicDriverPitch(vehicleSpeedKmh, metrics.distToTurnM);
      easeTo({
        center: [userGpsCoords.lat, userGpsCoords.lng],
        zoom: targetZoom,
        bearing: metrics.segmentBearing ?? currentHeading,
        pitch: targetPitch,
        duration: 850,
      });
    }
  };

  // Trigger route calculation with GPS acquisition or Gateway Fallback & enter 3D Driver Perspective
  const handleTriggerRoute = (destinationPlace: Place) => {
    if (!destinationPlace) return;
    unlockAudioEngine(true);
    resetTripLegGeofences();
    setIs3dDriverMode(true);
    setIsHeadingUpLocked(true);
    setIsAutoFollowEnabled(true);

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
          updateSmoothHeading(computeBearingDeg(userLat, userLng, destLat, destLng));
          calculateAndRenderRoute(
            { lat: userLat, lng: userLng, name: language === 'bm' ? 'Lokasi GPS Semasa Anda' : 'Your Current GPS Location' },
            { lat: destLat, lng: destLng, name: destinationPlace.name }
          );
        },
        (err) => {
          console.warn('GPS denied or timeout, using local Cameron Highlands fallback:', err);
          const orig = userGpsCoords || { lat: 4.4715, lng: 101.3805 }; // Tanah Rata township center
          updateSmoothHeading(computeBearingDeg(orig.lat, orig.lng, destLat, destLng));
          calculateAndRenderRoute(
            { lat: orig.lat, lng: orig.lng, name: language === 'bm' ? 'Pusat Tanah Rata' : 'Tanah Rata Town Center' },
            { lat: destLat, lng: destLng, name: destinationPlace.name }
          );
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      const orig = userGpsCoords || { lat: 4.4715, lng: 101.3805 };
      updateSmoothHeading(computeBearingDeg(orig.lat, orig.lng, destLat, destLng));
      calculateAndRenderRoute(
        { lat: orig.lat, lng: orig.lng, name: language === 'bm' ? 'Pusat Tanah Rata' : 'Tanah Rata Town Center' },
        { lat: destLat, lng: destLng, name: destinationPlace.name }
      );
    }
  };

  const handleClearRoute = () => {
    stopAllVoiceAlerts();
    setActiveRoute(null);
    setRouteError(null);
    setIs3dDriverMode(false);
    setCameraPitch(DRIVER_CAMERA_DEFAULT_PITCH);
    setIsNavCardMinimized(false);
    setNextManeuverDistM(null);
    setVehicleSpeedKmh(0);
    resetTripLegGeofences();
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
      stopAllVoiceAlerts();
      stopLiveGpsTracking();

      if (geofenceBannerTimerRef.current !== null) {
        window.clearTimeout(geofenceBannerTimerRef.current);
        geofenceBannerTimerRef.current = null;
      }

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
            <img src="${safeSrc(hubInfo.imageUrl, DEFAULT_PLACE_IMAGE)}" alt="${townshipName}" style="width: 100%; height: 100%; object-fit: cover;" />
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

      townshipMarker.on('click', () => {
        if (is3dDriverModeRef.current) {
          townshipMarker.closePopup();
          setSelectedTownshipHubModal({
            ...hubInfo,
            attractionsList,
          });
        }
      });

      townshipMarker.on('popupopen', () => {
        if (is3dDriverModeRef.current) {
          townshipMarker.closePopup();
          setSelectedTownshipHubModal({
            ...hubInfo,
            attractionsList,
          });
        }
      });
    });
  };

  // Smart Traffic & Predictive Flow Vector + TomTom Tile Overlay Rendering Logic
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

    // Only overlay live TomTom raster flow tiles when evaluating live window with a valid key
    const apiKey = getTomTomApiKey();
    const hasValidKey = Boolean(apiKey && apiKey.trim().length > 10);
    setTomTomKeyPresent(hasValidKey);

    if (hasValidKey && predictiveDepartureProfile === 'live') {
      try {
        const tomtomTile = L.tileLayer(
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodeURIComponent(apiKey.trim())}`,
          {
            maxZoom: 18,
            opacity: 0.65,
            attribution: '&copy; TomTom Smart Traffic',
            zIndex: 400,
          }
        );
        tomtomTile.addTo(map);
        tomtomRasterTileRef.current = tomtomTile;
      } catch (err) {
        console.error('Failed to mount TomTom raster flow layer:', err);
      }
    }

    // Render Color-Coded Predictive Flow & Historical Fallback Vector Segments
    // Adjusted dynamically by active incidents, covering highways AND rural plantation roads
    incidentAdjustedSegments.forEach((segment) => {
      const isRural = segment.roadClass === 'rural_plantation';
      const isLiveVerified = segment.dataSource === 'tomtom_live_flow';

      // 1. High contrast dark underlay casing
      const underlay = L.polyline(segment.coordinates, {
        color: '#09090b',
        weight: isRural ? 7 : 9,
        opacity: 0.72,
        lineCap: 'round',
        lineJoin: 'round',
      });
      if (trafficOverlayLayerRef.current) {
        underlay.addTo(trafficOverlayLayerRef.current);
      }

      // 2. Predictive flow colored polyline (dashed accent on rural historical-fallback spurs)
      const polyline = L.polyline(segment.coordinates, {
        color: segment.color,
        weight: isRural ? 4.5 : 6,
        opacity: 0.95,
        dashArray: !isLiveVerified && isRural ? '8 5' : undefined,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'traffic-polyline-glow',
      });

      const sourceBadge = isLiveVerified
        ? 'TomTom Live + Predictive'
        : 'Historical-Predictive Fallback';
      const confidencePct = Math.round((segment.confidence || 0.85) * 100);

      // Interactive hover tooltip
      polyline.bindTooltip(
        `
        <div style="font-family: inherit; font-size: 11px;">
          <div style="font-weight: 800; color: #f8fafc;">${segment.name}</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${segment.color};"></span>
            <span style="font-weight: 800; color: ${segment.color};">${segment.speedKmh} km/h • ${segment.statusLabel}</span>
            ${segment.delayMins > 0 ? `<span style="color: #fca5a5; font-weight: 700;">(+${segment.delayMins}m)</span>` : ''}
          </div>
          <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">${sourceBadge} (${confidencePct}%)</div>
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
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 270px; padding: 4px; color: #1c1917;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 4px;">
            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; background: ${isLiveVerified ? '#dcfce7' : '#fef3c7'}; color: ${isLiveVerified ? '#166534' : '#92400e'}; padding: 2px 6px; border-radius: 6px;">
              ${sourceBadge}
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
              <span style="color: #64748b; font-weight: 600;">Predictive Speed:</span>
              <strong style="color: #0f172a; font-weight: 800;">${segment.speedKmh} km/h <span style="font-weight:500;color:#64748b;">(avg max ${segment.freeFlowSpeedKmh})</span></strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #64748b; font-weight: 600;">Expected Delay:</span>
              <strong style="color: ${segment.delayMins > 10 ? '#dc2626' : segment.delayMins > 0 ? '#d97706' : '#16a34a'}; font-weight: 800;">
                ${segment.delayMins > 0 ? `+${segment.delayMins} mins` : 'Free Flow'}
              </strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10.5px;">
              <span style="color: #64748b; font-weight: 600;">Model Confidence:</span>
              <strong style="color: #334155; font-weight: 800;">${confidencePct}%</strong>
            </div>
          </div>
          ${segment.fallbackReason ? `<div style="font-size: 10px; color: #78350f; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 5px 7px; margin-bottom: 6px;">${segment.fallbackReason}</div>` : ''}
          <p style="font-size: 11px; color: #475569; line-height: 1.4; margin: 0;">
            ${segment.advisory}
          </p>
        </div>
      `;
      polyline.bindPopup(segmentPopupHtml, { maxWidth: 290 });

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
              Smart Predictive Flow
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
              <div style="font-size: 9.5px; color: #64748b; font-weight: 700; text-transform: uppercase;">Flow Speed</div>
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
        zoomSnap: 0.25,
        zoomDelta: 0.5,
      });

      const initialLayer = L.tileLayer(tileLayers.osm.url, {
        attribution: tileLayers.osm.attribution,
        maxZoom: tileLayers.osm.maxZoom,
      }).addTo(map);

      activeTileLayerRef.current = initialLayer;

      // Render the 9 Cameron Highlands Township center pins
      renderTownshipHubMarkers(map);

      // Expose smooth easeTo() camera updater on Leaflet map instance
      (map as any).easeTo = easeTo;

      mapInstanceRef.current = map;

      // Ensure Leaflet resizes correctly after mounting
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      // Sync map center & zoom for nearby attraction detection and dynamic HUD readout
      map.on('moveend', () => {
        const c = map.getCenter();
        setMapCenterCoords({ lat: c.lat, lng: c.lng });
      });
      map.on('zoomend', () => {
        setDynamicZoomLevel(Number(map.getZoom().toFixed(2)));
      });

      // Disable auto-follow when user manually drags or pans map
      map.on('dragstart', () => {
        setIsAutoFollowEnabled(false);
      });

      // Prevent tilted Leaflet popups from staying open while in Low-Horizon 3D Pitch mode
      map.on('popupopen', (e: any) => {
        if (is3dDriverModeRef.current && e?.popup) {
          try {
            map.closePopup(e.popup);
          } catch {
            // ignore
          }
        }
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

  // Subscribe to Firestore camgo_hazards + Monitor Module B Corridor Telemetry Anomalies (≥70% speed drop)
  const combinedActiveHazards = useMemo(() => {
    const byId = new Map<string, CamgoHazard>();
    activeCamgoHazards.forEach((h) => {
      if (h.status === 'active') byId.set(h.id, h);
    });
    telemetryAnomalies.forEach((anom) => {
      if (anom.status === 'active' && !byId.has(anom.id)) {
        byId.set(anom.id, anom);
      }
    });
    if (focusedHazard && focusedHazard.status !== 'cleared' && !byId.has(focusedHazard.id)) {
      byId.set(focusedHazard.id, focusedHazard);
    }
    return Array.from(byId.values());
  }, [activeCamgoHazards, telemetryAnomalies, focusedHazard]);

  const incidentAdjustedSegments = useMemo(
    () => applyHazardImpactToSegments(trafficSegments, combinedActiveHazards),
    [trafficSegments, combinedActiveHazards]
  );

  const selectedHazardImpact: HazardTrafficImpactPrediction | null = useMemo(() => {
    if (!selectedHazardModal) return null;
    return predictHazardTrafficImpact(
      selectedHazardModal,
      trafficSegments,
      getPredictiveTargetDate(predictiveDepartureProfile)
    );
  }, [selectedHazardModal, trafficSegments, predictiveDepartureProfile]);

  const resolveHazardCoords = (hazard: CamgoHazard): { lat: number; lng: number } => {
    const lat = Number(hazard.lat);
    const lng = Number(hazard.lng);
    if (Number.isFinite(lat) && lat !== 0 && Number.isFinite(lng) && lng !== 0) {
      return { lat, lng };
    }
    const locStr = `${hazard.location || ''} ${hazard.corridor || ''} ${hazard.title || ''}`.toLowerCase();
    for (const [town, coords] of Object.entries(TOWNSHIP_COORDS)) {
      if (locStr.includes(town.toLowerCase())) {
        return coords;
      }
    }
    if (locStr.includes('tapah') || locStr.includes('lata')) return { lat: 4.331, lng: 101.328 };
    if (locStr.includes('simpang') || locStr.includes('pos slim')) return { lat: 4.582, lng: 101.312 };
    if (locStr.includes('koyan')) return { lat: 4.351, lng: 101.528 };
    return { lat: 4.475, lng: 101.385 };
  };

  const triggerAiFlowForecast = async (hazard: CamgoHazard) => {
    const resolved = resolveHazardCoords(hazard);
    const algo = predictHazardTrafficImpact(
      { ...hazard, lat: resolved.lat, lng: resolved.lng },
      trafficSegments,
      getPredictiveTargetDate(predictiveDepartureProfile)
    );
    setAiIncidentForecast({
      hazardId: hazard.id,
      forecast: language === 'bm' ? algo.summaryBm : algo.summary,
      isAiEnhanced: false,
      loading: true,
    });
    const res = await geminiService.predictIncidentFlow(
      {
        title: hazard.title,
        type: hazard.type,
        severity: hazard.severity,
        location: hazard.location,
        description: hazard.description,
        lat: resolved.lat,
        lng: resolved.lng,
      },
      algo,
      language
    );
    setAiIncidentForecast((prev) =>
      prev && prev.hazardId === hazard.id
        ? { hazardId: hazard.id, forecast: res.forecast, isAiEnhanced: res.isAiEnhanced, loading: false }
        : prev
    );
  };

  const focusHazardOnMap = (hazard: CamgoHazard) => {
    const resolved = resolveHazardCoords(hazard);
    const normalizedHazard: CamgoHazard = { ...hazard, lat: resolved.lat, lng: resolved.lng };
    setIsTrafficOverlayActive(true);
    setSelectedHazardModal(normalizedHazard);
    triggerAiFlowForecast(normalizedHazard);

    if (mapInstanceRef.current) {
      const isMobile = window.innerWidth < 768;
      const targetLat = isMobile ? resolved.lat - 0.0045 : resolved.lat;
      const targetLng = isMobile ? resolved.lng : resolved.lng - 0.003;
      mapInstanceRef.current.closePopup();
      mapInstanceRef.current.flyTo([targetLat, targetLng], 15, {
        duration: 1.0,
        easeLinearity: 0.25,
      });
    }
  };

  const focusHazardOnMapRef = useRef(focusHazardOnMap);
  focusHazardOnMapRef.current = focusHazardOnMap;

  const combinedHazardsRef = useRef<CamgoHazard[]>([]);
  useEffect(() => {
    combinedHazardsRef.current = combinedActiveHazards;
  }, [combinedActiveHazards]);

  const handleHazardVote = async (
    hazard: CamgoHazard,
    vote: 'still_there' | 'cleared'
  ) => {
    const isTransientTelemetry =
      hazard.isProvisional &&
      !activeCamgoHazards.some((existing) => existing.id === hazard.id);

    const { updated, expired } = await camgoHazardsService.voteOnHazard(hazard, vote);

    if (isTransientTelemetry) {
      setTelemetryAnomalies((prev) =>
        expired ? prev.filter((item) => item.id !== hazard.id) : prev.map((item) => (item.id === hazard.id ? updated : item))
      );
    }

    if (expired) {
      mapInstanceRef.current?.closePopup();
      if (selectedHazardModal?.id === hazard.id) {
        setSelectedHazardModal(null);
      }
    } else if (selectedHazardModal?.id === hazard.id) {
      setSelectedHazardModal(updated);
    }
  };

  useEffect(() => {
    const unsub = camgoHazardsService.subscribeActiveHazards((hazards) => {
      setActiveCamgoHazards(hazards);
    });

    const handleHazardVoteBridge = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; vote: 'still_there' | 'cleared' }>).detail;
      if (!detail?.id || !detail?.vote) return;
      const target = combinedHazardsRef.current.find((h) => h.id === detail.id);
      if (target) {
        handleHazardVote(target, detail.vote);
      }
    };
    const handleHazardInspectBridge = (e: Event) => {
      const hazardId = (e as CustomEvent<{ id: string }>).detail?.id;
      if (!hazardId) return;
      const target = combinedHazardsRef.current.find((h) => h.id === hazardId);
      if (target) {
        focusHazardOnMapRef.current(target);
      }
    };
    window.addEventListener('camgo-vote-hazard', handleHazardVoteBridge);
    window.addEventListener('camgo-inspect-hazard', handleHazardInspectBridge);

    let isMounted = true;
    const ctrl = new AbortController();
    const runTelemetryCheck = async () => {
      const key = getTomTomApiKey();
      const res = await monitorCorridorTelemetryAnomalies(key, new Date(), ctrl.signal);
      if (!isMounted || ctrl.signal.aborted) return;
      if (res.anomalies.length > 0) {
        setTelemetryAnomalies(res.anomalies);
      }
    };
    runTelemetryCheck();
    const anomInterval = window.setInterval(runTelemetryCheck, 90_000);

    return () => {
      isMounted = false;
      ctrl.abort();
      unsub();
      window.clearInterval(anomInterval);
      window.removeEventListener('camgo-vote-hazard', handleHazardVoteBridge);
      window.removeEventListener('camgo-inspect-hazard', handleHazardInspectBridge);
    };
  }, []);

  useEffect(() => {
    if (!focusedHazard) return;
    const timer = window.setTimeout(() => {
      focusHazardOnMap(focusedHazard);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [focusedHazard]);

  const renderCamgoHazardPins = (map: L.Map) => {
    if (!hazardLayerRef.current) {
      hazardLayerRef.current = L.layerGroup().addTo(map);
    } else {
      hazardLayerRef.current.clearLayers();
    }

    combinedActiveHazards.forEach((hazard) => {
      if (hazard.status !== 'active') return;
      const lat = Number(hazard.lat);
      const lng = Number(hazard.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const emojiByType: Record<string, string> = {
        landslide: '⛰️',
        accident: '💥',
        roadblock: '🚧',
        fallen_tree: '🌳',
        flood: '🌊',
        sudden_congestion: '🚨',
      };
      const colorByType: Record<string, string> = {
        landslide: '#dc2626',
        accident: '#ea580c',
        roadblock: '#d97706',
        fallen_tree: '#b45309',
        flood: '#0284c7',
        sudden_congestion: '#e11d48',
      };

      const badgeEmoji = emojiByType[hazard.type] || '⚠️';
      const pinColor = colorByType[hazard.type] || '#dc2626';
      const remainingToClear = Math.max(1, CLEARED_VOTE_EXPIRY_THRESHOLD - (hazard.clearedVotes || 0));

      const hazardIcon = L.divIcon({
        className: 'camgo-hazard-marker',
        html: `
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; inset: -3px; border-radius: 9999px; background: ${pinColor}; opacity: 0.45;" class="animate-traffic-ping"></div>
            <div style="width: 30px; height: 30px; border-radius: 9999px; background: #1c1917; border: 2.5px solid ${pinColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.65); z-index: 2;">
              <span style="font-size: 14px; line-height: 1;">${badgeEmoji}</span>
            </div>
            <div style="position: absolute; top: -16px; background: ${pinColor}; color: white; font-size: 8.5px; font-weight: 900; padding: 1px 5px; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.5); white-space: nowrap; text-transform: uppercase;">
              ${hazard.isProvisional ? 'TELEMETRY -' + (hazard.speedDropPercent || 70) + '%' : hazard.type.replace('_', ' ')}
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([lat, lng], {
        icon: hazardIcon,
        zIndexOffset: 1020,
      });

      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 280px; max-width: 82vw; padding: 4px; color: #1c1917;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 6px;">
            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; background: ${pinColor}1a; color: ${pinColor}; padding: 2px 7px; border-radius: 6px; border: 1px solid ${pinColor}40;">
              ${badgeEmoji} ${hazard.isProvisional ? 'PROVISIONAL TELEMETRY ANOMALY' : hazard.type.replace('_', ' ').toUpperCase()}
            </span>
            <span style="font-size: 9.5px; font-weight: 700; color: #64748b;">
              ${hazard.severity.toUpperCase()}
            </span>
          </div>

          <h4 style="font-size: 13.5px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0; line-height: 1.3;">
            ${language === 'bm' ? hazard.titleBm || hazard.title : hazard.title}
          </h4>

          <div style="font-size: 10.5px; font-weight: 700; color: #475569; margin-bottom: 6px;">
            📍 ${hazard.location}${hazard.milestoneKm ? ` (KM ${hazard.milestoneKm})` : ''}
          </div>

          <p style="font-size: 11px; color: #334155; line-height: 1.4; margin: 0 0 8px 0;">
            ${language === 'bm' ? hazard.descriptionBm || hazard.description : hazard.description}
          </p>

          ${
            hazard.imageUrl
              ? `<div style="margin: 6px 0 8px 0; border-radius: 8px; overflow: hidden; max-height: 120px; border: 1px solid #cbd5e1;"><img src="${hazard.imageUrl}" alt="Visual Evidence" style="width: 100%; height: 110px; object-fit: cover; display: block;" /></div>`
              : ''
          }

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 8px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 4px;">
              <span>👍 Still There: <strong style="color: #b45309;">+${hazard.stillThereVotes || 0}</strong></span>
              <span>✅ Cleared: <strong style="color: #047857;">${hazard.clearedVotes || 0}/${CLEARED_VOTE_EXPIRY_THRESHOLD}</strong></span>
            </div>
            <div style="font-size: 9.5px; color: #64748b;">
              ${remainingToClear} more "Cleared" vote${remainingToClear > 1 ? 's' : ''} will auto-expire this pin.
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
            <button
              type="button"
              onclick="window.dispatchEvent(new CustomEvent('camgo-vote-hazard', { detail: { id: '${hazard.id}', vote: 'still_there' } }))"
              style="background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; padding: 7px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer;"
            >
              👍 Still There (+1)
            </button>
            <button
              type="button"
              onclick="window.dispatchEvent(new CustomEvent('camgo-vote-hazard', { detail: { id: '${hazard.id}', vote: 'cleared' } }))"
              style="background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 7px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer;"
            >
              ✅ Cleared (-1)
            </button>
          </div>
          <button
            type="button"
            onclick="window.dispatchEvent(new CustomEvent('camgo-inspect-hazard', { detail: { id: '${hazard.id}' } }))"
            style="width: 100%; background: #0f172a; color: #34d399; border: 1px solid #10b981; padding: 7px 8px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer;"
          >
            ✨ AI Traffic Flow Prediction
          </button>
          <div style="font-size: 9px; color: #94a3b8; margin-top: 6px; text-align: right;">
            Source: ${hazard.source}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });
      marker.on('click', () => {
        if (is3dDriverModeRef.current) {
          marker.closePopup();
          focusHazardOnMap(hazard);
        }
      });

      if (hazardLayerRef.current) {
        marker.addTo(hazardLayerRef.current);
      }
    });
  };

  useEffect(() => {
    if (mapInstanceRef.current) {
      renderCamgoHazardPins(mapInstanceRef.current);
    }
  }, [combinedActiveHazards, language]);

  // Sync Smart Traffic / Predictive Flow overlay whenever segments, profile, hazards, or toggle change
  useEffect(() => {
    if (mapInstanceRef.current) {
      renderColoredTrafficOverlay(mapInstanceRef.current);
    }
  }, [isTrafficOverlayActive, incidentAdjustedSegments, congestionHotspots, predictiveDepartureProfile]);

  useEffect(() => {
    const handleTomTomKeyUpdated = () => {
      setTomTomKeyPresent(Boolean(getTomTomApiKey()));
      if (mapInstanceRef.current) {
        renderColoredTrafficOverlay(mapInstanceRef.current);
      }
    };
    window.addEventListener('tomtom-key-updated', handleTomTomKeyUpdated);
    return () => window.removeEventListener('tomtom-key-updated', handleTomTomKeyUpdated);
  }, [isTrafficOverlayActive, trafficSegments]);

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
  const livePlacesRef = useRef<Place[]>(places);

  useEffect(() => {
    setLivePlaces(places);
    livePlacesRef.current = places;
  }, [places]);

  useEffect(() => {
    livePlacesRef.current = livePlaces;
  }, [livePlaces]);

  // Real-time listener: whenever admin creates or adds a new place, update pins instantly
  useEffect(() => {
    const handlePlacesUpdated = (e: any) => {
      const updatedList = e?.detail || firebaseService.getPlaces();
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        setLivePlaces(updatedList);
        livePlacesRef.current = updatedList;
      }
    };

    window.addEventListener('places-updated', handlePlacesUpdated);
    return () => {
      window.removeEventListener('places-updated', handlePlacesUpdated);
    };
  }, []);

  // Registered Highland Petrol/Gas Station Pins (plus any fuel POIs in livePlaces)
  const REGISTERED_GAS_STATIONS: Array<{ id: string; name: string; nameBm: string; lat: number; lng: number }> = [
    { id: 'gas-petronas-tanah-rata', name: 'Petronas Tanah Rata', nameBm: 'Stesen Petronas Tanah Rata', lat: 4.4728, lng: 101.3818 },
    { id: 'gas-shell-brinchang', name: 'Shell Brinchang', nameBm: 'Stesen Shell Brinchang', lat: 4.4892, lng: 101.3885 },
    { id: 'gas-petron-kea-farm', name: 'Petron Mini Kea Farm', nameBm: 'Stesen Petron Mini Kea Farm', lat: 4.5025, lng: 101.4068 },
    { id: 'gas-petronas-tringkap', name: 'Petronas Tringkap Hub', nameBm: 'Stesen Petronas Tringkap', lat: 4.5128, lng: 101.4255 },
    { id: 'gas-shell-kampung-raja', name: 'Shell Kampung Raja', nameBm: 'Stesen Shell Kampung Raja', lat: 4.5685, lng: 101.4092 },
  ];

  const TRAVEL_TOURISM_SUBCATS = new Set<string>([
    'attractions_sightseeing',
    'agrotourism_farms',
    'outdoor_adventure',
    'tour_agencies_guides',
    'tourism_ticketing_attractions',
    'tourism_agritourism_farm',
    'tourism_tours_packages',
    'tours_nature',
    'agritourism_plantations',
    'eco_adventure',
    'floral_sanctuary',
    'culture_history',
  ]);

  const FOOD_BEVERAGE_SUBCATS = new Set<string>([
    'dining',
    'steamboats',
    'cafes',
    'night_markets_street',
    'bars_nightlife',
    'fb_restaurants_cafes',
    'fb_fast_food',
    'fb_bakeries',
    'fb_cloud_kitchens',
    'fb_food_trucks',
    'fb_beverage_boba',
    'fb_catering',
  ]);

  const isTravelTourismPoi = (p: Place): boolean => {
    return (
      p.category === 'travel_tourism' ||
      p.category === 'attraction' ||
      (p.subCategory ? TRAVEL_TOURISM_SUBCATS.has(p.subCategory) : false)
    );
  };

  const isFoodBeveragePoi = (p: Place): boolean => {
    return (
      p.category === 'food' ||
      (p.subCategory ? FOOD_BEVERAGE_SUBCATS.has(p.subCategory) : false)
    );
  };

  const isGasStationPoi = (p: Place): boolean => {
    const text = `${p.name || ''} ${p.nameBm || ''} ${(p.tags || []).join(' ')} ${p.description || ''}`.toLowerCase();
    const isParkingOnly = text.includes('parking') || text.includes('parkir');
    const hasFuelKeyword =
      text.includes('petronas') ||
      text.includes('shell') ||
      text.includes('bhp') ||
      text.includes('caltex') ||
      text.includes('petron') ||
      text.includes('stesen minyak') ||
      text.includes('gas station') ||
      text.includes('petrol') ||
      text.includes('fuel') ||
      text.includes('gentari') ||
      text.includes('tnb electron') ||
      text.includes('ev charger') ||
      text.includes('ev fast');
    if (isParkingOnly && !hasFuelKeyword) return false;
    return p.subCategory === 'fuel_ev_charging' || hasFuelKeyword;
  };

  // Voice alerts strictly allowed ONLY for:
  // 1. Travel & Highland Tourism
  // 2. Gas Stations
  // 3. Food & Beverages
  const isAllowedVoiceAlertPoi = (p: Place): boolean => {
    return isTravelTourismPoi(p) || isGasStationPoi(p) || isFoodBeveragePoi(p);
  };

  const resetTripLegGeofences = () => {
    triggeredGeofencesRef.current.clear();
    spokenStepsMapRef.current = {};
    if (geofenceBannerTimerRef.current !== null) {
      window.clearTimeout(geofenceBannerTimerRef.current);
      geofenceBannerTimerRef.current = null;
    }
    setActiveGeofenceBanner(null);
  };

  const showGeofenceBannerNotification = (banner: {
    id: string;
    kind: 'attraction' | 'fuel' | 'food';
    title: string;
    subtitle: string;
    voiceText: string;
    distanceMeters: number;
    place?: Place;
  }) => {
    if (geofenceBannerTimerRef.current !== null) {
      window.clearTimeout(geofenceBannerTimerRef.current);
    }
    setActiveGeofenceBanner(banner);
    geofenceBannerTimerRef.current = window.setTimeout(() => {
      setActiveGeofenceBanner((prev) => (prev?.id === banner.id ? null : prev));
    }, 14000);
  };

  // Geofence Proximity Detection Engine (STRICTLY Travel & Highland Tourism, Gas Stations, and Food & Beverages ONLY):
  // 1) Gas Stations <= 500m -> "Please check your fuel level ahead." (once per trip leg)
  // 2) Travel & Highland Tourism / Food & Beverages <= 280m -> contextual voice + banner alert (once per trip leg)
  const evaluateProximityGeofences = (lat: number, lng: number) => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

    const FUEL_RADIUS_M = 500;
    const POI_RADIUS_M = 280;

    // 1. Check Registered Gas Stations (500m radius)
    const placeFuelPois = livePlacesRef.current
      .filter(isGasStationPoi)
      .map((p) => ({
        id: p.id,
        name: language === 'bm' ? p.nameBm || p.name : p.name,
        lat: Number(p.coordinates?.lat ?? (p as any).lat ?? 0),
        lng: Number(p.coordinates?.lng ?? (p as any).lng ?? 0),
        place: p,
      }))
      .filter((s) => !isNaN(s.lat) && !isNaN(s.lng) && s.lat !== 0 && s.lng !== 0);

    const combinedFuelStations = [...placeFuelPois];
    REGISTERED_GAS_STATIONS.forEach((reg) => {
      const alreadyNear = placeFuelPois.some(
        (existing) => calculateDistanceMeters(existing.lat, existing.lng, reg.lat, reg.lng) < 150
      );
      if (!alreadyNear) {
        combinedFuelStations.push({
          id: reg.id,
          name: language === 'bm' ? reg.nameBm : reg.name,
          lat: reg.lat,
          lng: reg.lng,
          place: undefined as any,
        });
      }
    });

    let nearestFuel: { id: string; name: string; distanceMeters: number; place?: Place } | null = null;
    combinedFuelStations.forEach((station) => {
      const key = `fuel:${station.id}`;
      if (triggeredGeofencesRef.current.has(key)) return;
      const distM = calculateDistanceMeters(lat, lng, station.lat, station.lng);
      if (distM <= FUEL_RADIUS_M && (!nearestFuel || distM < nearestFuel.distanceMeters)) {
        nearestFuel = { id: station.id, name: station.name, distanceMeters: distM, place: station.place };
      }
    });

    if (nearestFuel) {
      const matchedFuel = nearestFuel as { id: string; name: string; distanceMeters: number; place?: Place };
      triggeredGeofencesRef.current.add(`fuel:${matchedFuel.id}`);
      const isBm = mapVoiceLangRef.current === 'bm' || language === 'bm';
      const fuelVoice =
        isBm
          ? `Sila periksa paras minyak kenderaan anda di hadapan. ${matchedFuel.name} berhampiran.`
          : `Please check your fuel level ahead. ${matchedFuel.name} is nearby.`;
      showGeofenceBannerNotification({
        id: `geofence-fuel-${matchedFuel.id}`,
        kind: 'fuel',
        title: language === 'bm' ? 'Peringatan Stesen Minyak di Hadapan' : 'Please check your fuel level ahead.',
        subtitle: `${matchedFuel.name} • ${matchedFuel.distanceMeters}m`,
        voiceText: fuelVoice,
        distanceMeters: matchedFuel.distanceMeters,
        place: matchedFuel.place,
      });
      speakInstruction(fuelVoice, 'geofence');
      return;
    }

    // 2. Check ONLY Travel & Highland Tourism + Food & Beverages POIs (strict 280m radius)
    let nearestAllowedPoi: {
      place: Place;
      kind: 'attraction' | 'food';
      name: string;
      distanceMeters: number;
    } | null = null;

    livePlacesRef.current.forEach((p) => {
      const isTourism = isTravelTourismPoi(p);
      const isFood = !isTourism && isFoodBeveragePoi(p);
      if (!isTourism && !isFood) return;

      const pLat = Number(p.coordinates?.lat ?? (p as any).lat ?? 0);
      const pLng = Number(p.coordinates?.lng ?? (p as any).lng ?? 0);
      if (isNaN(pLat) || isNaN(pLng) || pLat === 0 || pLng === 0) return;

      const kind: 'attraction' | 'food' = isTourism ? 'attraction' : 'food';
      const key = `${kind}:${p.id}`;
      if (triggeredGeofencesRef.current.has(key)) return;

      const distM = calculateDistanceMeters(lat, lng, pLat, pLng);
      if (distM <= POI_RADIUS_M && (!nearestAllowedPoi || distM < nearestAllowedPoi.distanceMeters)) {
        const isBm = mapVoiceLangRef.current === 'bm' || language === 'bm';
        nearestAllowedPoi = {
          place: p,
          kind,
          name: (isBm ? p.nameBm : '') || p.name,
          distanceMeters: distM,
        };
      }
    });

    if (nearestAllowedPoi) {
      const matchedPoi = nearestAllowedPoi as {
        place: Place;
        kind: 'attraction' | 'food';
        name: string;
        distanceMeters: number;
      };
      triggeredGeofencesRef.current.add(`${matchedPoi.kind}:${matchedPoi.place.id}`);
      const isBm = mapVoiceLangRef.current === 'bm' || language === 'bm';
      const poiName = (isBm ? matchedPoi.place.nameBm : '') || matchedPoi.place.name;
      const poiVoice =
        matchedPoi.kind === 'food'
          ? isBm
            ? `Pilihan Makanan dan Minuman berhampiran: ${poiName}, kira-kira ${matchedPoi.distanceMeters} meter di hadapan.`
            : `Food and Beverage spot ahead: ${poiName}, ${matchedPoi.distanceMeters} meters nearby.`
          : isBm
            ? `${poiName} berada berhampiran di hadapan anda, kira-kira ${matchedPoi.distanceMeters} meter.`
            : `${poiName} is just ahead, ${matchedPoi.distanceMeters} meters nearby.`;

      showGeofenceBannerNotification({
        id: `geofence-${matchedPoi.kind}-${matchedPoi.place.id}`,
        kind: matchedPoi.kind,
        title:
          matchedPoi.kind === 'food'
            ? language === 'bm'
              ? `Makanan & Minuman: ${poiName}`
              : `Dining Nearby: ${poiName}`
            : language === 'bm'
              ? `${poiName} berada di hadapan`
              : `${poiName} is just ahead`,
        subtitle: `${matchedPoi.distanceMeters}m nearby • ${matchedPoi.place.township}`,
        voiceText: poiVoice,
        distanceMeters: matchedPoi.distanceMeters,
        place: matchedPoi.place,
      });
      speakInstruction(poiVoice, 'geofence');
    }
  };

  // Trigger strict geofence proximity check whenever live GPS coordinates update
  useEffect(() => {
    if (!userGpsCoords) return;
    evaluateProximityGeofences(userGpsCoords.lat, userGpsCoords.lng);
  }, [userGpsCoords, language, mapVoiceLang]);

  // Muslim Prayer Time ("Coming Soon") Live Fetcher & Reminder Engine (JAKIM PHG04 Cameron Highlands)
  useEffect(() => {
    let cancelled = false;
    const loadPrayerSchedule = async () => {
      try {
        const res = await fetch('/api/prayer-times');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data?.prayerTimes) {
            setPrayerSchedule({
              subuh: data.prayerTimes.subuh || DEFAULT_PHG04_PRAYERS.subuh,
              syuruk: data.prayerTimes.syuruk || DEFAULT_PHG04_PRAYERS.syuruk,
              zohor: data.prayerTimes.zohor || DEFAULT_PHG04_PRAYERS.zohor,
              asar: data.prayerTimes.asar || DEFAULT_PHG04_PRAYERS.asar,
              maghrib: data.prayerTimes.maghrib || DEFAULT_PHG04_PRAYERS.maghrib,
              isyak: data.prayerTimes.isyak || DEFAULT_PHG04_PRAYERS.isyak,
            });
            setPrayerSourceLabel(data.source || 'JAKIM PHG04');
            return;
          }
        }
      } catch {
        // fallback to Firebase Township Hub or PHG04 baseline
      }
      try {
        const hubs = firebaseService.getTownshipHubs();
        const trPrayer = hubs?.['Tanah Rata']?.prayerTimes;
        if (!cancelled && trPrayer) {
          setPrayerSchedule((prev) => ({ ...prev, ...trPrayer }));
        }
      } catch {
        // use baseline
      }
    };
    loadPrayerSchedule();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatPrayerTime12h = (hhmm: string): string => {
    const m = String(hhmm || '').match(/(\d{1,2}):(\d{2})/);
    if (!m) return hhmm;
    const h = Number(m[1]);
    const min = m[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${min} ${ampm}`;
  };

  const findNearestMasjidSurau = (refLat: number, refLng: number): { place: Place | null; distanceKm: number | null } => {
    const masjids = livePlacesRef.current.filter(
      (p) =>
        p.category === 'masjid_surau' ||
        p.subCategory === 'masjid_surau' ||
        p.subCategory === 'jumaat_masjid' ||
        p.subCategory === 'other_surau' ||
        p.tags?.some((t) => t.toLowerCase().includes('masjid') || t.toLowerCase().includes('surau'))
    );
    let bestPlace: Place | null = null;
    let bestDist: number | null = null;
    masjids.forEach((p) => {
      const pLat = Number(p.coordinates?.lat ?? (p as any).lat ?? 0);
      const pLng = Number(p.coordinates?.lng ?? (p as any).lng ?? 0);
      if (isNaN(pLat) || isNaN(pLng) || pLat === 0 || pLng === 0) return;
      const d = calculateDistanceKm(refLat, refLng, pLat, pLng);
      if (bestDist === null || d < bestDist) {
        bestDist = d;
        bestPlace = p;
      }
    });
    return { place: bestPlace, distanceKm: bestDist };
  };

  const buildPrayerVoiceText = (
    prayerName: string,
    minsRemaining: number,
    time12h: string,
    nearestMasjidName: string | null,
    isBm: boolean
  ): string => {
    const masjidSuffixBm = nearestMasjidName ? ` Masjid atau surau terdekat ialah ${nearestMasjidName}.` : '';
    const masjidSuffixEn = nearestMasjidName ? ` Nearest prayer spot is ${nearestMasjidName}.` : '';

    if (minsRemaining <= 0) {
      return isBm
        ? `Peringatan waktu solat Muslim. Waktu solat ${prayerName} telah masuk pada pukul ${time12h}.${masjidSuffixBm}`
        : `Muslim prayer reminder. ${prayerName} prayer time has begun at ${time12h}.${masjidSuffixEn}`;
    }
    return isBm
      ? `Peringatan waktu solat Muslim. Waktu solat ${prayerName} akan masuk dalam ${minsRemaining} minit pada pukul ${time12h}.${masjidSuffixBm}`
      : `Muslim prayer reminder. ${prayerName} prayer time is coming soon in ${minsRemaining} minutes at ${time12h}.${masjidSuffixEn}`;
  };

  const toggleMuslimPrayerAlerts = () => {
    const nextVal = !isMuslimPrayerAlertsEnabled;
    setIsMuslimPrayerAlertsEnabled(nextVal);
    isMuslimPrayerAlertsEnabledRef.current = nextVal;
    try {
      localStorage.setItem('camgo_muslim_prayer_alerts', String(nextVal));
    } catch {
      // ignore
    }
    if (!nextVal) {
      setActivePrayerAlert(null);
    }
  };

  const triggerPreviewPrayerAlert = () => {
    const refPt = userGpsCoords || mapCenterCoords || { lat: 4.4715, lng: 101.3805 };
    const { place: nearestMasjid, distanceKm } = findNearestMasjidSurau(refPt.lat, refPt.lng);
    const targetInfo = nextPrayerInfo || {
      prayerKey: 'zohor',
      prayerName: 'Zohor',
      time12h: formatPrayerTime12h(prayerSchedule.zohor),
      minsRemaining: 15,
    };
    const isBm = mapVoiceLangRef.current === 'bm' || language === 'bm';
    const voiceText = buildPrayerVoiceText(
      targetInfo.prayerName,
      targetInfo.minsRemaining,
      targetInfo.time12h,
      nearestMasjid ? ((isBm ? nearestMasjid.nameBm : '') || nearestMasjid.name) : null,
      isBm
    );
    setActivePrayerAlert({
      id: `prayer-preview-${Date.now()}`,
      prayerKey: targetInfo.prayerKey,
      prayerName: targetInfo.prayerName,
      timeStr: (prayerSchedule as any)[targetInfo.prayerKey] || prayerSchedule.zohor,
      time12h: targetInfo.time12h,
      minsRemaining: targetInfo.minsRemaining,
      status: targetInfo.minsRemaining <= 0 ? 'entered' : 'coming_soon',
      nearestMasjid,
      nearestDistanceKm: distanceKm,
      voiceText,
    });
    unlockAudioEngine(true);
    if (!isVoiceNavEnabled) togglePwaAudioAlerts(true);
    speakUtteranceMobileSafe(voiceText, true);
  };

  useEffect(() => {
    const evaluateMuslimPrayerSchedule = () => {
      const klNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
      const nowMins = klNow.getHours() * 60 + klNow.getMinutes();
      const dateKey = `${klNow.getFullYear()}-${klNow.getMonth() + 1}-${klNow.getDate()}`;

      const fardhPrayers: Array<{ key: keyof PrayerTimesSchedule; label: string }> = [
        { key: 'subuh', label: 'Subuh' },
        { key: 'zohor', label: 'Zohor' },
        { key: 'asar', label: 'Asar' },
        { key: 'maghrib', label: 'Maghrib' },
        { key: 'isyak', label: 'Isyak' },
      ];

      const parseMins = (hhmm: string) => {
        const m = String(hhmm || '').match(/(\d{1,2}):(\d{2})/);
        if (!m) return 0;
        return Number(m[1]) * 60 + Number(m[2]);
      };

      let upcomingNext: { prayerKey: string; prayerName: string; time12h: string; minsRemaining: number } | null = null;
      let alertCandidate: {
        prayerKey: string;
        prayerName: string;
        timeStr: string;
        time12h: string;
        minsRemaining: number;
        status: 'coming_soon' | 'entered';
      } | null = null;

      for (const p of fardhPrayers) {
        const timeStr = prayerSchedule[p.key];
        const pMins = parseMins(timeStr);
        const diff = pMins - nowMins;
        if (diff > 0 && (!upcomingNext || diff < upcomingNext.minsRemaining)) {
          upcomingNext = {
            prayerKey: p.key,
            prayerName: p.label,
            time12h: formatPrayerTime12h(timeStr),
            minsRemaining: diff,
          };
        }
        // Alert window: coming soon within 30 mins OR entered within last 5 mins
        if (diff <= 30 && diff >= -5) {
          alertCandidate = {
            prayerKey: p.key,
            prayerName: p.label,
            timeStr,
            time12h: formatPrayerTime12h(timeStr),
            minsRemaining: diff,
            status: diff <= 0 ? 'entered' : 'coming_soon',
          };
          break;
        }
      }

      if (!upcomingNext) {
        const subuhTime = prayerSchedule.subuh;
        const subuhMins = parseMins(subuhTime) + 24 * 60;
        upcomingNext = {
          prayerKey: 'subuh',
          prayerName: 'Subuh',
          time12h: formatPrayerTime12h(subuhTime),
          minsRemaining: subuhMins - nowMins,
        };
      }
      setNextPrayerInfo(upcomingNext);

      if (!isMuslimPrayerAlertsEnabledRef.current || !alertCandidate) {
        return;
      }

      const refPt = userGpsCoords || mapCenterCoords || { lat: 4.4715, lng: 101.3805 };
      const { place: nearestMasjid, distanceKm } = findNearestMasjidSurau(refPt.lat, refPt.lng);
      const isBm = mapVoiceLangRef.current === 'bm' || language === 'bm';
      const voiceText = buildPrayerVoiceText(
        alertCandidate.prayerName,
        alertCandidate.minsRemaining,
        alertCandidate.time12h,
        nearestMasjid ? ((isBm ? nearestMasjid.nameBm : '') || nearestMasjid.name) : null,
        isBm
      );

      const triggerKey = `${dateKey}:${alertCandidate.prayerKey}:${alertCandidate.status}`;
      if (!triggeredPrayerKeysRef.current.has(triggerKey)) {
        triggeredPrayerKeysRef.current.add(triggerKey);
        setActivePrayerAlert({
          id: `prayer-${triggerKey}`,
          ...alertCandidate,
          nearestMasjid,
          nearestDistanceKm: distanceKm,
          voiceText,
        });
        speakInstruction(voiceText, 'geofence');
      } else {
        // Keep active banner countdown refreshed if still visible
        setActivePrayerAlert((prev) =>
          prev && prev.prayerKey === alertCandidate!.prayerKey && prev.status === alertCandidate!.status
            ? {
                ...prev,
                minsRemaining: alertCandidate!.minsRemaining,
                nearestMasjid,
                nearestDistanceKm: distanceKm,
                voiceText,
              }
            : prev
        );
      }
    };

    evaluateMuslimPrayerSchedule();
    const timer = window.setInterval(evaluateMuslimPrayerSchedule, 30000);
    return () => window.clearInterval(timer);
  }, [prayerSchedule, isMuslimPrayerAlertsEnabled, userGpsCoords, language, mapVoiceLang]);

  // Invalidate Leaflet tile layout cleanly whenever toggling 3D Driver's Perspective stage size
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const tA = setTimeout(() => map.invalidateSize({ animate: false }), 30);
    const tB = setTimeout(() => map.invalidateSize({ animate: false }), 220);
    const tC = setTimeout(() => map.invalidateSize({ animate: false }), 650);
    return () => {
      clearTimeout(tA);
      clearTimeout(tB);
      clearTimeout(tC);
    };
  }, [is3dDriverMode]);

  // Nearby Attractions, Food & Beverages, and Gas Stations Proximity Engine (2.5 km radius ONLY)
  const nearbyAttractions = useMemo(() => {
    const refPoint = userGpsCoords || mapCenterCoords;
    if (!refPoint) return [];

    const results: Array<{ place: Place; distanceKm: number; poiKind: 'attraction' | 'food' | 'fuel' }> = [];
    livePlaces.forEach((p) => {
      if (!isAllowedVoiceAlertPoi(p)) return;
      const lat = Number(p.coordinates?.lat ?? (p as any).lat ?? 0);
      const lng = Number(p.coordinates?.lng ?? (p as any).lng ?? 0);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      const poiKind: 'attraction' | 'food' | 'fuel' = isGasStationPoi(p)
        ? 'fuel'
        : isTravelTourismPoi(p)
          ? 'attraction'
          : 'food';

      const dist = calculateDistanceKm(refPoint.lat, refPoint.lng, lat, lng);
      if (dist <= 2.5) {
        results.push({ place: p, distanceKm: dist, poiKind });
      }
    });

    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [livePlaces, userGpsCoords, mapCenterCoords]);

  const nearbyAttractionsSignature = useMemo(() => {
    if (nearbyAttractions.length === 0) return '';
    return `${nearbyAttractions.length}:${nearbyAttractions
      .slice(0, 4)
      .map((item) => item.place.id)
      .join(',')}`;
  }, [nearbyAttractions]);

  const buildNearbyVoiceText = (items: typeof nearbyAttractions, voiceLang?: 'bm' | 'en') => {
    const activeLang = voiceLang || mapVoiceLangRef.current || (language === 'bm' ? 'bm' : 'en');
    const isBm = activeLang === 'bm';
    const count = items.length;
    const topNames = items
      .slice(0, 2)
      .map((item) => (isBm ? item.place.nameBm || item.place.name : item.place.name))
      .join(', ');
    if (isBm) {
      return count === 1
        ? `Terdapat 1 lokasi pelancongan, makanan, atau stesen minyak berhampiran anda: ${topNames}.`
        : `Terdapat ${count} lokasi pelancongan, makanan dan minuman, atau stesen minyak berhampiran anda, termasuk ${topNames}.`;
    }
    return count === 1
      ? `There is 1 Highland tourism, dining, or gas station spot nearby: ${topNames}.`
      : `There are ${count} Highland tourism, food & beverage, and gas station spots nearby, including ${topNames}.`;
  };

  useEffect(() => {
    if (!nearbyAttractionsSignature || nearbyAttractions.length === 0) return;
    if (dismissedNearbySig === nearbyAttractionsSignature) return;

    const now = Date.now();
    const sameSig = lastSpokenNearbyRef.current.sig === nearbyAttractionsSignature;
    const cooldownElapsed = now - lastSpokenNearbyRef.current.timestamp > 45000;

    if (!sameSig || cooldownElapsed) {
      lastSpokenNearbyRef.current = { sig: nearbyAttractionsSignature, timestamp: now };
      if (isVoiceNavEnabled) {
        speakInstruction(buildNearbyVoiceText(nearbyAttractions, mapVoiceLang), 'nearby');
      }
    }
  }, [nearbyAttractionsSignature, isVoiceNavEnabled, language, mapVoiceLang]);

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
        if (subCat === 'hostels_roomstay') return { pinColor: '#2563eb', iconEmoji: '🛏️', label: 'Hostels / Roomstay' };
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
        if (subCat === 'tyre_shop') return { pinColor: '#0284c7', iconEmoji: '🛞', label: 'Tyre Shop' };
        if (subCat === 'car_battery_shop') return { pinColor: '#0284c7', iconEmoji: '🔋', label: 'Car Battery Shop' };
        if (subCat === 'auto_repair_roadside') return { pinColor: '#0284c7', iconEmoji: '🔧', label: 'Auto Repair & Roadside' };
        return { pinColor: '#0369a1', iconEmoji: '🚗', label: 'Transport' };

      case 'local_services':
        if (subCat === 'public_toilets_restrooms') return { pinColor: '#0d9488', iconEmoji: '🚻', label: 'Public Restroom' };
        if (subCat === 'clinic_hospital') return { pinColor: '#e11d48', iconEmoji: '🏥', label: 'Clinic / Hospital' };
        if (subCat === 'health_wellness') return { pinColor: '#e11d48', iconEmoji: '🏥', label: 'Clinic & Hospital' };
        if (subCat === 'banking_financial') return { pinColor: '#0d9488', iconEmoji: '🏦', label: 'ATM & Banking' };
        return { pinColor: '#0f766e', iconEmoji: '🏢', label: 'Local Services' };

      case 'shopping':
        if (subCat === 'fresh_markets_produce') return { pinColor: '#d97706', iconEmoji: '🥬', label: 'Fresh Market' };
        if (subCat === 'souvenirs_handicrafts') return { pinColor: '#b45309', iconEmoji: '🎁', label: 'Souvenirs & Crafts' };
        if (subCat === 'telecommunication') return { pinColor: '#0284c7', iconEmoji: '📶', label: 'Telecommunication' };
        if (subCat === 'gadgets') return { pinColor: '#7c3aed', iconEmoji: '📱', label: 'Gadgets' };
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
          ${safeSrc(place.imageUrl) ? `
            <div style="width: 100%; height: 115px; border-radius: 12px; overflow: hidden; margin-bottom: 8px; background: #1c1917; border: 1px solid rgba(255,255,255,0.1);">
              <img src="${safeSrc(place.imageUrl, DEFAULT_PLACE_IMAGE)}" alt="${place.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'" />
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
        if (is3dDriverModeRef.current) {
          marker.closePopup();
          setIsPlaceCardMinimized(false);
          onSelectPlace(place);
          return;
        }
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
        setIsPlaceCardMinimized(false);
        onSelectPlace(place);
        if (is3dDriverModeRef.current) {
          marker.closePopup();
        }
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
    setIsPlaceCardMinimized(false);
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
    // Do not hijack active turn-by-turn route camera when viewing directory pin in Low-Horizon 3D mode
    if (!activeRouteRef.current) {
      const isMobile = window.innerWidth < 768;
      const targetLat = isMobile ? validLat - 0.0055 : validLat;
      const targetLng = isMobile ? validLng : validLng - 0.005;

      map.flyTo([targetLat, targetLng], 15, {
        duration: 1.0,
        easeLinearity: 0.25,
      });
    }

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

  const clampedPitch = Math.min(DRIVER_CAMERA_MAX_PITCH, Math.max(DRIVER_CAMERA_MIN_PITCH, cameraPitch));

  return (
    <div
      className="flex flex-col h-full w-full relative min-h-0"
      onPointerDown={() => unlockAudioEngine(false)}
    >
      {/* UNIFIED TOP BAR: Replaces mobile title header cleanly at top; floats centered on desktop */}
      <div className="relative z-50 shrink-0 w-full bg-stone-900 border-b border-stone-800 px-1.5 py-2 sm:p-0 sm:bg-transparent sm:border-b-0 sm:absolute sm:top-3 sm:left-4 sm:right-4 sm:max-w-3xl sm:mx-auto sm:pointer-events-none flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-2">
        {/* Top Row on Mobile: Hamburger Tools Menu + Search Bar (or Nav HUD) + Mobile Close X */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto sm:flex-1 min-w-0">
          {/* Little Hamburger Button for Hiding/Showing Map Tools */}
          <div className="relative pointer-events-auto shrink-0" ref={toolsMenuRef}>
            <button
              type="button"
              onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl backdrop-blur-xl border shadow-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer relative ${
                isToolsMenuOpen
                  ? 'bg-emerald-600 text-white border-emerald-400/60'
                  : 'bg-stone-950/90 sm:bg-stone-900/95 hover:bg-stone-800 text-stone-100 border-white/15'
              }`}
              title={language === 'bm' ? 'Tunjuk / Sembunyi Alatan Peta' : 'Show / Hide Map Tools'}
              aria-label="Map Tools Visibility Menu"
            >
              <Menu className="w-4 h-4 text-emerald-400" />
              {Object.values(mapToolsVisibility).some((v) => !v) || !isTrafficOverlayActive ? (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
              ) : null}
            </button>

            {isToolsMenuOpen && (
              <div className="absolute left-0 top-11 z-[75] w-60 rounded-2xl bg-stone-950/96 backdrop-blur-2xl border border-emerald-500/35 shadow-2xl p-2.5 space-y-1.5 text-stone-100 animate-in fade-in duration-150">
                <div className="flex items-center justify-between px-1.5 pb-1.5 border-b border-white/10">
                  <span className="text-[10.5px] font-mono font-black text-emerald-400 uppercase tracking-wider">
                    {language === 'bm' ? 'Alatan Peta' : 'Map Tools'}
                  </span>
                  <button
                    type="button"
                    onClick={resetMapToolsVisibility}
                    className="text-[10px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
                  >
                    {language === 'bm' ? 'Papar Semua' : 'Show All'}
                  </button>
                </div>

                {/* Voice Guidance Language Selector */}
                <div className="pb-2 border-b border-white/10 mb-1">
                  <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono mb-1.5 px-0.5">
                    <span>{language === 'bm' ? 'Bahasa Suara Panduan' : 'Voice Guidance Language'}</span>
                    <span className="text-[9px] font-bold text-emerald-400">
                      {mapVoiceLang === 'bm' ? 'Bahasa Malaysia' : 'English'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetMapVoiceLang('bm')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        mapVoiceLang === 'bm'
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/40'
                          : 'bg-stone-900/80 text-stone-300 hover:bg-stone-850 border-white/10'
                      }`}
                    >
                      <span>🇲🇾 BM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetMapVoiceLang('en')}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        mapVoiceLang === 'en'
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/40'
                          : 'bg-stone-900/80 text-stone-300 hover:bg-stone-850 border-white/10'
                      }`}
                    >
                      <span>🇬🇧 EN</span>
                    </button>
                  </div>
                </div>

                {[
                  { key: 'searchBar' as const, label: language === 'bm' ? 'Bar Carian & Penapis' : 'Search & Filter Bar' },
                  { key: 'viewSwitcher' as const, label: language === 'bm' ? 'Peta / Satelit / Terrain' : 'Map / Sat / Terrain' },
                  { key: 'zoomControls' as const, label: language === 'bm' ? 'Butang Zum (+/-)' : 'Zoom +/- Controls' },
                  { key: 'alertBanners' as const, label: language === 'bm' ? 'Sepanduk Geofence & Tarikan' : 'Nearby & Geofence Banners' },
                  { key: 'audioButton' as const, label: language === 'bm' ? 'Butang Suara PWA' : 'PWA Audio Button' },
                  { key: 'locateButton' as const, label: language === 'bm' ? 'Butang Lokasi GPS' : 'GPS Locate Button' },
                  { key: 'navHud' as const, label: language === 'bm' ? 'HUD Navigasi Atas' : 'Navigation Top HUD' },
                ].map((item) => {
                  const enabled = mapToolsVisibility[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleMapToolVisibility(item.key)}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        enabled
                          ? 'bg-emerald-600/20 text-emerald-100 border border-emerald-500/30'
                          : 'bg-stone-900/70 text-stone-400 border border-white/5 hover:bg-stone-800'
                      }`}
                    >
                      <span className="truncate pr-2">{item.label}</span>
                      <span
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                          enabled ? 'bg-emerald-500 text-stone-950' : 'bg-stone-700 text-stone-400'
                        }`}
                      >
                        {enabled ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}

                {/* Smart Traffic / Predictive Flow Mode & Time-of-Day Pattern Selector */}
                <div className="pt-1.5 mt-1 border-t border-white/10 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setIsTrafficOverlayActive(!isTrafficOverlayActive)}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      isTrafficOverlayActive
                        ? 'bg-emerald-600/20 text-emerald-100 border border-emerald-500/30'
                        : 'bg-stone-900/70 text-stone-400 border border-white/5 hover:bg-stone-800'
                    }`}
                  >
                    <span className="truncate pr-2">
                      {language === 'bm' ? 'Trafik Pintar / Aliran Ramalan' : 'Smart Traffic / Predictive Flow'}
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                        isTrafficOverlayActive ? 'bg-emerald-500 text-stone-950' : 'bg-stone-700 text-stone-400'
                      }`}
                    >
                      {isTrafficOverlayActive ? '✓' : ''}
                    </span>
                  </button>

                  {isTrafficOverlayActive && (
                    <div className="px-1 space-y-1">
                      <div className="flex items-center justify-between text-[9.5px] font-mono text-stone-400">
                        <span>{language === 'bm' ? 'Profil Masa:' : 'Flow Pattern:'}</span>
                        <button
                          type="button"
                          onClick={() => setTrafficLegendOpen(!trafficLegendOpen)}
                          className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                        >
                          {trafficLegendOpen
                            ? language === 'bm' ? 'Tutup Legenda' : 'Hide Legend'
                            : language === 'bm' ? 'Legenda Kelajuan' : 'Speed Legend'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {([
                          { id: 'live' as const, label: language === 'bm' ? 'Sekarang' : 'Live / Auto' },
                          { id: 'weekend_peak' as const, label: language === 'bm' ? 'Puncak Hujung Mgg' : 'Wknd Peak' },
                          { id: 'evening_market' as const, label: language === 'bm' ? 'Pasar Malam' : 'Night Mkt' },
                          { id: 'night_clear' as const, label: language === 'bm' ? 'Malam Lancar' : 'Night Clear' },
                        ]).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPredictiveDepartureProfile(opt.id)}
                            className={`px-1.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border ${
                              predictiveDepartureProfile === opt.id
                                ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                                : 'bg-stone-900/80 border-white/10 text-stone-400 hover:text-stone-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Muslim Prayer Times ("Coming Soon") Alert Controls */}
                <div className="pt-1.5 mt-1 border-t border-white/10 space-y-1">
                  <button
                    type="button"
                    onClick={toggleMuslimPrayerAlerts}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      isMuslimPrayerAlertsEnabled
                        ? 'bg-amber-500/20 text-amber-100 border border-amber-400/40'
                        : 'bg-stone-900/70 text-stone-400 border border-white/5 hover:bg-stone-800'
                    }`}
                  >
                    <span className="truncate pr-2">
                      🕌 {language === 'bm' ? 'Peringatan Waktu Solat' : 'Muslim Prayer Alerts'}
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                        isMuslimPrayerAlertsEnabled ? 'bg-amber-400 text-stone-950' : 'bg-stone-700 text-stone-400'
                      }`}
                    >
                      {isMuslimPrayerAlertsEnabled ? '✓' : ''}
                    </span>
                  </button>
                  {nextPrayerInfo && (
                    <div className="px-2 py-1 rounded-lg bg-stone-900/90 border border-white/5 flex items-center justify-between text-[10px] text-stone-300">
                      <span className="truncate">
                        {language === 'bm' ? 'Seterusnya:' : 'Next:'}{' '}
                        <strong className="text-amber-300">{nextPrayerInfo.prayerName}</strong> ({nextPrayerInfo.time12h})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          triggerPreviewPrayerAlert();
                        }}
                        className="px-1.5 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 font-bold cursor-pointer shrink-0 ml-1"
                        title={language === 'bm' ? 'Uji Peringatan Solat' : 'Preview Prayer Alert'}
                      >
                        <Bell className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Quick Ingest Hazard Alert (Telegram / JKR / Image OCR -> camgo_hazards) */}
                  <div className="pt-1.5 mt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        setIngestFeedback(null);
                        setIsHazardIngestModalOpen(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-between bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/35 transition-colors cursor-pointer"
                    >
                      <span className="truncate pr-2">
                        ⚠️ {language === 'bm' ? 'Lapor / Ingat Bahaya AI' : 'Report / Ingest Hazard'}
                      </span>
                      <span className="text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300">
                        {combinedActiveHazards.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        window.dispatchEvent(new CustomEvent('open-community-report'));
                      }}
                      className="w-full mt-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-between bg-emerald-600/25 hover:bg-emerald-600/35 text-emerald-200 border border-emerald-500/35 transition-colors cursor-pointer"
                    >
                      <span className="truncate pr-2">
                        📢 {language === 'bm' ? 'Lapor Insiden Komuniti (GPS & Foto)' : 'Report Incident (GPS & Evidence)'}
                      </span>
                      <span className="text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300">
                        NEW
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search Pill (when not navigating) OR Navigation HUD */}
          {!activeRoute && !isCalculatingRoute ? (
            <div className="pointer-events-auto flex-1 min-w-0 rounded-xl sm:rounded-2xl bg-stone-950/90 sm:bg-stone-900/95 backdrop-blur-xl border border-white/15 shadow-xl sm:shadow-2xl px-2 py-1.5 sm:p-1.5 flex items-center gap-1.5 sm:gap-2">
              {mapToolsVisibility.searchBar ? (
                <MapSearchBar
                  mapRef={mapInstanceRef}
                  language={language}
                  localPlaces={livePlaces}
                  corridorItems={TRAFFIC_NAV_ITEMS}
                  tomTomApiKey={typeof window !== 'undefined' ? localStorage.getItem('tomtom_api_key') : null}
                  isAiSearching={isAiSearching}
                  onSelectLocalPlace={handleSelectPlaceOnMap}
                  onSelectCorridor={handleSelectTrafficNav}
                  onAiSearchSubmit={handleAiSearchSubmit}
                  onNavigateGeocodedResult={handleNavigateGeocodedPin}
                />
              ) : (
                <span className="text-xs font-bold text-emerald-400 px-1 truncate flex-1">
                  Cameron Highlands Map
                </span>
              )}

              {/* Desktop inline controls inside the unified floating pill */}
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                {mapToolsVisibility.viewSwitcher && (
                  <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-stone-950/80 border border-white/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveMapType('osm')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        activeMapType === 'osm' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMapType('satellite')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        activeMapType === 'satellite' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      Sat
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMapType('terrain')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        activeMapType === 'terrain' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      Terrain
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
                )}

                <div className="relative" ref={filterMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className={`p-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5 whitespace-nowrap ${
                      isFilterMenuOpen || proximityRadius !== 'all' || activeTownship !== 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                    }`}
                    title="Filter Menu"
                  >
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-bold">{language === 'bm' ? 'Tapis' : 'Filter'}</span>
                  </button>

                  {isFilterMenuOpen && (
                    <div className="hidden sm:block absolute right-0 top-11 z-[75] w-64 max-h-[65vh] overflow-y-auto rounded-2xl bg-stone-900/95 backdrop-blur-xl border border-emerald-500/30 shadow-2xl p-3 space-y-4 text-stone-100 animate-in fade-in duration-200">
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

                {mapToolsVisibility.audioButton && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => togglePwaAudioAlerts()}
                      className={`p-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0 ${
                        isVoiceNavEnabled
                          ? 'bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-emerald-500/30'
                          : 'bg-stone-800/80 hover:bg-stone-700 text-stone-500 border border-white/10'
                      }`}
                      title={
                        isVoiceNavEnabled
                          ? (language === 'bm' ? 'Makluman Suara PWA: Aktif' : 'PWA Audio Alerts: Enabled')
                          : (language === 'bm' ? 'Makluman Suara PWA: Disenyapkan' : 'PWA Audio Alerts: Muted')
                      }
                      aria-label="Toggle PWA Voice Alerts"
                    >
                      {isVoiceNavEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={toggleMapVoiceLang}
                      className={`px-2 py-1.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0 text-[11px] font-bold whitespace-nowrap flex items-center gap-1 border ${
                        mapVoiceLang === 'bm'
                          ? 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border-emerald-500/40 shadow-emerald-900/20'
                          : 'bg-stone-800 hover:bg-stone-700 text-sky-300 border-sky-500/30'
                      }`}
                      title={
                        mapVoiceLang === 'bm'
                          ? 'Suara Peta: Bahasa Malaysia (Klik untuk English)'
                          : 'Map Voice: English (Click for Bahasa Malaysia)'
                      }
                      aria-label="Toggle Map Voice Language"
                    >
                      <span>{mapVoiceLang === 'bm' ? '🇲🇾 BM' : '🇬🇧 EN'}</span>
                    </button>
                  </div>
                )}

                {mapToolsVisibility.locateButton && (
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
                )}
              </div>
            </div>
          ) : activeRoute && mapToolsVisibility.navHud ? (
            /* TOP NAVIGATION HUD BANNER (Waze / Google Maps Style): Active during navigation */
            <div className="flex-1 min-w-0 pointer-events-auto select-none animate-in slide-in-from-top duration-300">
              <div className="rounded-2xl sm:rounded-3xl bg-emerald-700/95 backdrop-blur-2xl border border-emerald-400/40 shadow-2xl p-2 sm:p-4 text-white flex items-center justify-between gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white text-emerald-800 flex items-center justify-center shrink-0 shadow-md">
                  <span className="text-lg sm:text-2xl font-black leading-none">
                    {activeRoute.steps[0]?.icon || '⬆️'}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 sm:gap-2">
                    <span className="text-base sm:text-2xl font-black tracking-tight text-white whitespace-nowrap">
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
                    {mapVoiceLang === 'bm' || language === 'bm'
                      ? translateNavInstructionToBm(activeRoute.steps[0]?.instruction || `Laluan ke ${activeRoute.destinationName}`)
                      : (activeRoute.steps[0]?.instruction || `Navigate towards ${activeRoute.destinationName}`)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleMapVoiceLang}
                  className="px-2 py-1 rounded-xl bg-black/25 hover:bg-black/40 text-[10px] font-black tracking-tight text-white transition-colors cursor-pointer shrink-0 border border-white/10 whitespace-nowrap"
                  title={
                    mapVoiceLang === 'bm'
                      ? 'Suara: Bahasa Malaysia (Klik untuk English)'
                      : 'Voice: English (Click for Bahasa Malaysia)'
                  }
                >
                  {mapVoiceLang === 'bm' ? '🇲🇾 BM' : '🇬🇧 EN'}
                </button>

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
          ) : (
            <div className="flex-1 min-w-0 sm:hidden text-xs font-bold text-emerald-400 px-1 truncate">
              {language === 'bm' ? 'Mengira laluan...' : 'Calculating route...'}
            </div>
          )}

          {/* Mobile Close Map Button (replaces removed mobile header X button) */}
          {onClose && (
            <button
              type="button"
              onClick={() => {
                stopAllVoiceAlerts();
                onClose();
              }}
              className="sm:hidden w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white border border-white/15 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              title={language === 'bm' ? 'Tutup Peta' : 'Close Map'}
              aria-label="Close Map"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Row 2 (in the removed header spot): Strictly 1 row — Terrain Toggle, Filter, Audio Language, Locate Me */}
        {!activeRoute && !isCalculatingRoute && (
          <div className="sm:hidden flex flex-nowrap items-center justify-between gap-1 w-full pointer-events-auto">
            {/* Terrain / Map / Satellite + 360° */}
            {mapToolsVisibility.viewSwitcher && (
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-stone-950 border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveMapType('osm')}
                  className={`px-1.5 py-1 rounded-md text-[10px] leading-none font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeMapType === 'osm' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Map
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMapType('satellite')}
                  className={`px-1.5 py-1 rounded-md text-[10px] leading-none font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeMapType === 'satellite' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Sat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMapType('terrain')}
                  className={`px-1.5 py-1 rounded-md text-[10px] leading-none font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeMapType === 'terrain' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Terrain
                </button>
                <button
                  type="button"
                  onClick={() => setStreetViewOpen(true)}
                  className="p-1 rounded-md text-amber-400 hover:text-amber-300 hover:bg-white/5 transition-all cursor-pointer shrink-0"
                  title="360° Street View"
                  aria-label="360 Street View"
                >
                  <Eye className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Filter Button */}
            <div className="relative shrink-0" ref={mobileFilterMenuRef}>
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={`px-1.5 py-1 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 flex items-center gap-0.5 whitespace-nowrap text-[10px] leading-none font-bold ${
                  isFilterMenuOpen || proximityRadius !== 'all' || activeTownship !== 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10'
                }`}
                title="Filter Menu"
              >
                <Layers className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{language === 'bm' ? 'Tapis' : 'Filter'}</span>
              </button>

              {isFilterMenuOpen && (
                <div className="fixed inset-x-3 top-[102px] z-[75] max-h-[65vh] overflow-y-auto rounded-2xl bg-stone-900/98 backdrop-blur-xl border border-emerald-500/35 shadow-2xl p-3 space-y-4 text-stone-100 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10.5px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      {language === 'bm' ? 'Tapis Peta' : 'Map Filters'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFilterMenuOpen(false)}
                      className="p-1 rounded-lg bg-stone-800 text-stone-300 hover:text-white cursor-pointer"
                      aria-label="Close filter menu"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

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

            {/* Audio Mute & Voice Language Toggle */}
            {mapToolsVisibility.audioButton && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => togglePwaAudioAlerts()}
                  className={`p-1 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 ${
                    isVoiceNavEnabled
                      ? 'bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-emerald-500/30'
                      : 'bg-stone-800/80 hover:bg-stone-700 text-stone-500 border border-white/10'
                  }`}
                  title={
                    isVoiceNavEnabled
                      ? (language === 'bm' ? 'Makluman Suara PWA: Aktif' : 'PWA Audio Alerts: Enabled')
                      : (language === 'bm' ? 'Makluman Suara PWA: Disenyapkan' : 'PWA Audio Alerts: Muted')
                  }
                  aria-label="Toggle PWA Voice Alerts"
                >
                  {isVoiceNavEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                </button>

                <button
                  type="button"
                  onClick={toggleMapVoiceLang}
                  className={`px-1.5 py-1 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 text-[10px] leading-none font-bold whitespace-nowrap flex items-center gap-0.5 border ${
                    mapVoiceLang === 'bm'
                      ? 'bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border-emerald-500/40'
                      : 'bg-stone-800 hover:bg-stone-700 text-sky-300 border-sky-500/30'
                  }`}
                  title={
                    mapVoiceLang === 'bm'
                      ? 'Suara Peta: Bahasa Malaysia (Klik untuk English)'
                      : 'Map Voice: English (Click for Bahasa Malaysia)'
                  }
                  aria-label="Toggle Map Voice Language"
                >
                  <span>{mapVoiceLang === 'bm' ? '🇲🇾 BM' : '🇬🇧 EN'}</span>
                </button>
              </div>
            )}

            {/* Locate Me Button */}
            {mapToolsVisibility.locateButton && (
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocatingUser}
                className={`px-1.5 py-1 rounded-lg text-white transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 flex items-center gap-0.5 whitespace-nowrap text-[10px] leading-none font-bold ${
                  isLocatingUser
                    ? 'bg-amber-600 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                title={language === 'bm' ? 'Kesan Lokasi GPS Anda' : 'Locate My GPS Position'}
              >
                <LocateFixed className={`w-3 h-3 shrink-0 ${isLocatingUser ? 'animate-spin' : ''}`} />
                <span>{language === 'bm' ? 'Lokasi' : 'Locate'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Map Container with Automatic 3D Driver's Perspective Navigation Rig (50-65° pitch + heading-up) */}
      <div className="map-wrapper relative isolate z-0 w-full h-full flex-1 min-h-0 rounded-none sm:rounded-2xl overflow-hidden border-0 sm:border border-white/10 shadow-2xl glass-panel select-none">
        {/* 3D Perspective Positioning & Heading-Up Camera Rig */}
        <div
          className={
            is3dDriverMode
              ? 'absolute left-1/2 top-[62%] w-[235%] h-[235%] -translate-x-1/2 -translate-y-1/2'
              : 'absolute inset-0 w-full h-full'
          }
          style={is3dDriverMode ? { perspective: '950px', perspectiveOrigin: '50% 42%' } : undefined}
        >
          <div
            className={`w-full h-full ${is3dDriverMode ? 'map-3d-stage' : ''}`}
            style={{
              transform: is3dDriverMode
                ? `rotateX(${clampedPitch}deg) rotateZ(${isHeadingUpLocked ? -smoothedContinuousHeading : 0}deg)`
                : 'rotateX(0deg) rotateZ(0deg)',
              transformOrigin: '50% 50%',
              transition: `transform ${cameraTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
              willChange: 'transform',
            }}
          >
            {/* Leaflet Map Target */}
            <div ref={mapContainerRef} className="w-full h-full z-10" />
          </div>
        </div>

        {/* Low-Horizon Atmospheric Sky Haze in Automatic 3D Driver Perspective */}
        {is3dDriverMode && (
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-28 z-20 bg-gradient-to-b from-stone-950/90 via-stone-950/45 to-transparent transition-opacity duration-500" />
        )}

        {/* Zoom Controls (Bottom-Right) - toggled via Hamburger Tools Menu */}
        {mapToolsVisibility.zoomControls && (
          <div
            className={`absolute right-3 z-30 flex flex-col items-end gap-2 pointer-events-auto transition-all duration-300 ${
              activeRoute || selectedPlace
                ? (isNavCardMinimized || isPlaceCardMinimized ? 'bottom-16 sm:bottom-6' : 'bottom-44 sm:bottom-6')
                : 'bottom-4 sm:bottom-6'
            }`}
          >
            <div className="flex flex-col rounded-xl overflow-hidden bg-stone-900/90 backdrop-blur-xl border border-white/15 shadow-xl">
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomIn(0.5)}
                className="p-2 hover:bg-stone-800 text-stone-100 transition-colors cursor-pointer border-b border-white/10"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomOut(0.5)}
                className="p-2 hover:bg-stone-800 text-stone-100 transition-colors cursor-pointer"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Smart Traffic / Predictive Flow Compact Status Pill & Expandable Speed Legend (Bottom-Left) */}
        {isTrafficOverlayActive && !activeRoute && !selectedPlace && !selectedTownshipHubModal && !selectedHazardModal && (
          <div className="absolute bottom-3 left-2.5 sm:bottom-4 sm:left-4 z-[35] pointer-events-auto max-w-[calc(100vw-72px)] sm:max-w-xs">
            {trafficLegendOpen ? (
              <div className="rounded-2xl bg-stone-950/95 backdrop-blur-xl border border-emerald-500/35 shadow-2xl p-2.5 text-stone-100 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-300 truncate">
                      {language === 'bm' ? 'Trafik Pintar / Aliran Ramalan' : 'Smart Traffic / Predictive Flow'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTrafficLegendOpen(false)}
                    className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white cursor-pointer"
                    aria-label="Close speed legend"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Color-coded speed bands */}
                <div className="grid grid-cols-2 gap-1 text-[9.5px] font-bold">
                  <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-stone-900/90 border border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0" />
                    <span>≥44 km/h Clear</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-stone-900/90 border border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shrink-0" />
                    <span>28–43 km/h Moderate</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-stone-900/90 border border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shrink-0" />
                    <span>15–27 km/h Heavy</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-stone-900/90 border border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] shrink-0" />
                    <span>&lt;15 km/h Gridlock</span>
                  </div>
                </div>

                {/* Historical-Predictive Time-of-Day Pattern Selector */}
                <div className="grid grid-cols-4 gap-1">
                  {([
                    { id: 'live' as const, label: language === 'bm' ? 'Auto' : 'Live' },
                    { id: 'weekend_peak' as const, label: 'Wknd' },
                    { id: 'evening_market' as const, label: 'Mkt' },
                    { id: 'night_clear' as const, label: 'Night' },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPredictiveDepartureProfile(opt.id)}
                      className={`py-1 rounded-lg text-[9.5px] font-bold transition-colors cursor-pointer border ${
                        predictiveDepartureProfile === opt.id
                          ? 'bg-emerald-600/35 border-emerald-400 text-emerald-200'
                          : 'bg-stone-900/80 border-white/10 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {predictiveFlowStats && (
                  <div className="flex items-center justify-between text-[9.5px] font-mono text-stone-400 pt-1 border-t border-white/10">
                    <span>
                      Live: <strong className="text-emerald-300">{predictiveFlowStats.liveVerifiedCount}</strong> • Hist:{' '}
                      <strong className="text-amber-300">{predictiveFlowStats.historicalFallbackCount}</strong>
                    </span>
                    <span className="text-stone-300 font-bold">Avg {predictiveFlowStats.avgSpeedKmh} km/h</span>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setTrafficLegendOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-stone-900/92 hover:bg-stone-800 backdrop-blur-xl border border-emerald-500/35 shadow-xl text-[10px] font-bold text-stone-100 flex items-center gap-1.5 cursor-pointer transition-colors"
                title={
                  language === 'bm'
                    ? 'Trafik Pintar & Aliran Ramalan (Klik untuk Legenda)'
                    : 'Smart Traffic / Predictive Flow (Click for Speed Legend)'
                }
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">
                  {language === 'bm' ? 'Trafik Pintar' : 'Smart Traffic'}
                  {predictiveDepartureProfile !== 'live'
                    ? predictiveDepartureProfile === 'weekend_peak'
                      ? ' • Wknd Peak'
                      : predictiveDepartureProfile === 'evening_market'
                        ? ' • Night Mkt'
                        : ' • Night'
                    : tomTomKeyPresent
                      ? ' • Live+Hist'
                      : ' • Predictive'}
                </span>
                {predictiveFlowStats && (
                  <span className="font-mono text-amber-300 shrink-0">
                    {predictiveFlowStats.avgSpeedKmh} km/h
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {/* NON-OVERLAPPING MOBILE-FIT ALERT & DIRECTORY OVERLAY STACK */}
        {(() => {
          const isAnyDirectoryPopupExpanded = Boolean(
            (selectedPlace && (!isPlaceCardMinimized || is3dDriverMode)) || selectedTownshipHubModal
          );
          const hasTopAlert =
            (isMuslimPrayerAlertsEnabled && Boolean(activePrayerAlert)) ||
            (mapToolsVisibility.alertBanners &&
              (Boolean(activeGeofenceBanner) ||
                (!isAnyDirectoryPopupExpanded &&
                  nearbyAttractions.length > 0 &&
                  dismissedNearbySig !== nearbyAttractionsSignature)));

          return (
            <div
              className={`absolute inset-x-2 bottom-2 sm:inset-x-5 sm:bottom-4 z-40 pointer-events-none flex flex-col justify-between gap-2 min-h-0 top-2.5 ${
                activeRoute
                  ? 'sm:top-[96px]'
                  : mapToolsVisibility.searchBar
                    ? 'sm:top-[66px]'
                    : 'sm:top-[66px]'
              }`}
            >
              {/* TOP ALERT ZONE: Prayer Popup + Geofence/Nearby Banner stacked cleanly with zero overlap */}
              {hasTopAlert ? (
                <div className="shrink-0 flex flex-col gap-1.5 w-full max-w-xl sm:mx-auto pointer-events-none">
                  {/* Special Muslim Prayer Time Alert Banner (Coming Soon / Just Entered) */}
                  {isMuslimPrayerAlertsEnabled && activePrayerAlert && (
                    <div className="pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300">
                      <div
                        className={`rounded-2xl bg-gradient-to-r from-emerald-950/96 via-teal-950/96 to-stone-950/96 backdrop-blur-2xl border border-amber-400/75 shadow-[0_14px_40px_rgba(0,0,0,0.65)] text-stone-100 flex flex-col ${
                          isAnyDirectoryPopupExpanded ? 'px-2.5 py-2 gap-1.5' : 'px-3 py-2.5 sm:px-3.5 gap-2'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`rounded-xl bg-amber-500/20 border border-amber-400/60 text-amber-300 flex items-center justify-center shrink-0 ${
                                isAnyDirectoryPopupExpanded ? 'w-7 h-7' : 'w-8 h-8 sm:w-9 sm:h-9'
                              }`}
                            >
                              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[9.5px] sm:text-[10px] font-mono font-black uppercase tracking-wider text-amber-300 flex items-center gap-1 flex-wrap">
                                <span>🕌 {language === 'bm' ? 'WAKTU SOLAT' : 'PRAYER ALERT'}</span>
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                                  {prayerSourceLabel}
                                </span>
                              </div>
                              <div className="text-[11.5px] sm:text-sm font-black text-white leading-tight mt-0.5 truncate">
                                {activePrayerAlert.status === 'entered'
                                  ? language === 'bm'
                                    ? `Solat ${activePrayerAlert.prayerName} masuk (${activePrayerAlert.time12h})`
                                    : `${activePrayerAlert.prayerName} Prayer begun (${activePrayerAlert.time12h})`
                                  : language === 'bm'
                                    ? `Solat ${activePrayerAlert.prayerName} dlm ${activePrayerAlert.minsRemaining} min (${activePrayerAlert.time12h})`
                                    : `${activePrayerAlert.prayerName} in ${activePrayerAlert.minsRemaining}m (${activePrayerAlert.time12h})`}
                              </div>
                              {!isAnyDirectoryPopupExpanded && activePrayerAlert.nearestMasjid && (
                                <div className="text-[10.5px] sm:text-[11px] text-emerald-200 truncate mt-0.5">
                                  {language === 'bm' ? 'Terdekat:' : 'Nearest:'}{' '}
                                  <span className="font-bold text-white">
                                    {language === 'bm'
                                      ? activePrayerAlert.nearestMasjid.nameBm || activePrayerAlert.nearestMasjid.name
                                      : activePrayerAlert.nearestMasjid.name}
                                  </span>
                                  {activePrayerAlert.nearestDistanceKm !== null &&
                                  activePrayerAlert.nearestDistanceKm !== undefined
                                    ? ` • ${activePrayerAlert.nearestDistanceKm} km`
                                    : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                unlockAudioEngine(true);
                                if (!isVoiceNavEnabled) togglePwaAudioAlerts(true);
                                speakUtteranceMobileSafe(activePrayerAlert.voiceText, true);
                              }}
                              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 transition-colors cursor-pointer"
                              title={language === 'bm' ? 'Dengar Peringatan Suara' : 'Replay Prayer Alert'}
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                stopAllVoiceAlerts();
                                setActivePrayerAlert(null);
                              }}
                              className="p-1.5 rounded-lg bg-black/35 hover:bg-black/55 text-stone-300 hover:text-white transition-colors cursor-pointer"
                              title="Dismiss prayer alert"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {activePrayerAlert.nearestMasjid && (
                            <button
                              type="button"
                              onClick={() => {
                                const masjid = activePrayerAlert.nearestMasjid!;
                                setActivePrayerAlert(null);
                                handleTriggerRoute(masjid);
                              }}
                              className="px-2 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-[10.5px] font-black flex items-center gap-1 cursor-pointer transition-colors shadow-md"
                            >
                              <Navigation2 className="w-3 h-3 fill-current" />
                              <span>{language === 'bm' ? 'Navigasi Masjid' : 'Navigate Masjid'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-masjid-modal'))}
                            className="px-2 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 text-[10px] sm:text-[10.5px] font-bold cursor-pointer transition-colors"
                          >
                            {language === 'bm' ? 'Jadual Solat & Masjid' : 'All Masjid & Schedule'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Strict Geofence Proximity Alert Banner */}
                  {mapToolsVisibility.alertBanners && activeGeofenceBanner && (
                    <div className="pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300">
                      <div
                        className={`rounded-2xl backdrop-blur-2xl border shadow-2xl px-3 py-2 text-stone-100 flex items-center justify-between gap-2 ${
                          activeGeofenceBanner.kind === 'fuel'
                            ? 'bg-amber-950/95 border-amber-400/70'
                            : activeGeofenceBanner.kind === 'food'
                              ? 'bg-teal-950/95 border-teal-400/70'
                              : 'bg-emerald-950/95 border-emerald-400/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                              activeGeofenceBanner.kind === 'fuel'
                                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                                : activeGeofenceBanner.kind === 'food'
                                  ? 'bg-teal-500/20 border-teal-400/50 text-teal-300'
                                  : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                            }`}
                          >
                            {activeGeofenceBanner.kind === 'fuel' ? (
                              <Fuel className="w-4 h-4 animate-pulse" />
                            ) : activeGeofenceBanner.kind === 'food' ? (
                              <Utensils className="w-4 h-4 animate-bounce" />
                            ) : (
                              <Palmtree className="w-4 h-4 animate-bounce" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`text-[9.5px] font-mono font-black uppercase tracking-wider truncate ${
                                activeGeofenceBanner.kind === 'fuel'
                                  ? 'text-amber-300'
                                  : activeGeofenceBanner.kind === 'food'
                                    ? 'text-teal-300'
                                    : 'text-emerald-300'
                              }`}
                            >
                              {activeGeofenceBanner.kind === 'fuel'
                                ? 'GAS STATION (<=500M)'
                                : activeGeofenceBanner.kind === 'food'
                                  ? 'FOOD & BEVERAGE (<=280M)'
                                  : 'TRAVEL & TOURISM (<=280M)'}
                            </div>
                            <div className="text-xs font-black text-white truncate">
                              {activeGeofenceBanner.title}
                            </div>
                            <div className="text-[10.5px] text-stone-300 truncate">
                              {activeGeofenceBanner.subtitle}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {activeGeofenceBanner.place && (
                            <button
                              type="button"
                              onClick={() => {
                                const target = activeGeofenceBanner.place!;
                                onSelectPlace(target);
                                if (mapInstanceRef.current && target.coordinates && !activeRouteRef.current) {
                                  mapInstanceRef.current.flyTo(
                                    [Number(target.coordinates.lat), Number(target.coordinates.lng)],
                                    17,
                                    { duration: 0.85 }
                                  );
                                }
                              }}
                              className="px-2 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              {language === 'bm' ? 'Lihat' : 'View'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              unlockAudioEngine(true);
                              if (!isVoiceNavEnabled) togglePwaAudioAlerts(true);
                              speakUtteranceMobileSafe(activeGeofenceBanner.voiceText, true);
                            }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                            title={language === 'bm' ? 'Ulang Suara' : 'Replay Voice Alert'}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              stopAllVoiceAlerts();
                              setActiveGeofenceBanner(null);
                            }}
                            className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-stone-300 hover:text-white transition-colors cursor-pointer"
                            title="Dismiss"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nearby Travel & Highland Tourism, Gas Stations, and Food & Beverages Banner */}
                  {mapToolsVisibility.alertBanners &&
                    !activeGeofenceBanner &&
                    !isAnyDirectoryPopupExpanded &&
                    nearbyAttractions.length > 0 &&
                    dismissedNearbySig !== nearbyAttractionsSignature && (
                      <div className="pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="rounded-2xl bg-stone-950/92 backdrop-blur-2xl border border-amber-400/45 shadow-2xl px-3 py-2 text-stone-100 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-black text-amber-200 truncate">
                                  {language === 'bm'
                                    ? `${nearbyAttractions.length} lokasi Pelancongan, F&B & Minyak berhampiran`
                                    : `${nearbyAttractions.length} Tourism, Dining & Gas spots nearby`}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  unlockAudioEngine(true);
                                  if (!isVoiceNavEnabled) {
                                    togglePwaAudioAlerts(true);
                                  }
                                  speakUtteranceMobileSafe(buildNearbyVoiceText(nearbyAttractions, mapVoiceLang), true);
                                }}
                                className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 transition-colors cursor-pointer"
                                title={language === 'bm' ? 'Dengar Pengumuman Suara' : 'Announce Nearby Spots'}
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  stopAllVoiceAlerts();
                                  setDismissedNearbySig(nearbyAttractionsSignature);
                                }}
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                                title="Dismiss nearby banner"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                            {nearbyAttractions.slice(0, 5).map(({ place, distanceKm, poiKind }) => (
                              <button
                                key={`nearby-attr-${place.id}`}
                                type="button"
                                onClick={() => {
                                  onSelectPlace(place);
                                  if (mapInstanceRef.current && place.coordinates && !activeRouteRef.current) {
                                    mapInstanceRef.current.flyTo(
                                      [Number(place.coordinates.lat), Number(place.coordinates.lng)],
                                      16.5,
                                      { duration: 0.9 }
                                    );
                                  }
                                }}
                                className="px-2.5 py-1 rounded-xl bg-stone-900 hover:bg-emerald-950/70 border border-white/10 hover:border-emerald-400/50 text-[10.5px] font-bold text-stone-200 flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                              >
                                {poiKind === 'fuel' ? (
                                  <Fuel className="w-3 h-3 text-amber-400 shrink-0" />
                                ) : poiKind === 'food' ? (
                                  <Utensils className="w-3 h-3 text-teal-400 shrink-0" />
                                ) : (
                                  <Palmtree className="w-3 h-3 text-emerald-400 shrink-0" />
                                )}
                                <span className="truncate max-w-[140px]">
                                  {language === 'bm' ? place.nameBm || place.name : place.name}
                                </span>
                                <span className="text-[9.5px] font-mono text-amber-300">{distanceKm} km</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="shrink-0" />
              )}

              {/* LOWER / CENTER DIRECTORY & POPUP SLOT: Flex-constrained (max-h-full) so it NEVER overlaps Prayer Alert above */}
              <div className="flex-1 min-h-0 flex flex-col justify-end pointer-events-none">
                {/* 4A. NORMAL FLAT 2D DIRECTORY POPUP MODAL WHEN IN LOW-HORIZON 3D PITCH MODE */}
                {selectedPlace && is3dDriverMode && (
                  <div className="flex-1 min-h-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="pointer-events-auto w-full max-w-md rounded-2xl sm:rounded-3xl bg-stone-900/98 border border-emerald-500/50 shadow-[0_24px_70px_rgba(0,0,0,0.95)] p-3 sm:p-4 text-stone-100 flex flex-col gap-2.5 max-h-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start justify-between gap-2 shrink-0">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <img
                            src={safeSrc(selectedPlace.imageUrl, DEFAULT_PLACE_IMAGE)}
                            alt={selectedPlace.name}
                            className="w-13 h-13 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover shrink-0 border border-white/15 shadow-md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                                {selectedPlace.township}
                              </span>
                              {selectedPlace.elevation && (
                                <span className="text-[9px] font-mono text-stone-400">
                                  {selectedPlace.elevation}
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm sm:text-base font-black text-white mt-0.5 leading-snug line-clamp-1">
                              {language === 'bm' ? selectedPlace.nameBm || selectedPlace.name : selectedPlace.name}
                            </h3>
                            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-stone-400 mt-0.5">
                              <span className="text-amber-400 font-bold">★ {selectedPlace.rating}</span>
                              <span>({selectedPlace.reviewsCount || 85} reviews)</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            stopAllVoiceAlerts();
                            onSelectPlace(null);
                          }}
                          className="p-1.5 sm:p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer shrink-0"
                          aria-label="Close directory popup"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {userGpsCoords &&
                        selectedPlace.coordinates?.lat &&
                        selectedPlace.coordinates?.lng && (
                          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-[11px] sm:text-xs shrink-0">
                            <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                              <span>
                                {calculateDistanceKm(
                                  userGpsCoords.lat,
                                  userGpsCoords.lng,
                                  Number(selectedPlace.coordinates.lat),
                                  Number(selectedPlace.coordinates.lng)
                                )}{' '}
                                km away
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-amber-300 font-bold font-mono text-[10.5px] sm:text-[11px]">
                              <Car className="w-3.5 h-3.5 text-amber-400" />
                              <span>
                                ~
                                {Math.max(
                                  3,
                                  Math.round(
                                    (calculateDistanceKm(
                                      userGpsCoords.lat,
                                      userGpsCoords.lng,
                                      Number(selectedPlace.coordinates.lat),
                                      Number(selectedPlace.coordinates.lng)
                                    ) /
                                      32) *
                                      60
                                  )
                                )}{' '}
                                mins drive
                              </span>
                            </div>
                          </div>
                        )}

                      <button
                        type="button"
                        onClick={() => {
                          const target = selectedPlace;
                          onSelectPlace(null);
                          handleTriggerRoute(target);
                        }}
                        className="w-full py-2 sm:py-2.5 px-4 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer shrink-0"
                      >
                        <Navigation2 className="w-4 h-4 fill-current" />
                        <span>
                          {activeRoute
                            ? language === 'bm'
                              ? 'Tukar Laluan Navigasi ke Sini'
                              : 'Switch Navigation to Here'
                            : language === 'bm'
                              ? 'Mula Navigasi GPS'
                              : 'Start Navigation'}
                        </span>
                      </button>

                      <div className="overflow-y-auto pr-1 space-y-2 text-xs [scrollbar-width:thin] min-h-0 flex-1">
                        <div className="grid grid-cols-3 gap-1.5">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.coordinates?.lat || 4.49},${selectedPlace.coordinates?.lng || 101.39}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white font-bold text-[10px] sm:text-[10.5px] flex items-center justify-center gap-1"
                          >
                            <span>Google Maps</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <a
                            href={`https://waze.com/ul?ll=${selectedPlace.coordinates?.lat || 4.49},${selectedPlace.coordinates?.lng || 101.39}&navigate=yes`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-1.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-600 text-white font-bold text-[10px] sm:text-[10.5px] flex items-center justify-center gap-1"
                          >
                            <span>Waze</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setStreetViewOpen(true)}
                            className="py-1.5 px-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-[10px] sm:text-[10.5px] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                            <span>360° View</span>
                          </button>
                        </div>

                        <div className="p-2.5 rounded-2xl bg-stone-950/80 border border-white/10 space-y-1 text-[11px] sm:text-xs text-stone-300">
                          <p className="leading-relaxed">
                            {language === 'bm' ? selectedPlace.descriptionBm : selectedPlace.description}
                          </p>
                          {selectedPlace.contact &&
                            selectedPlace.contact.trim() !== '' &&
                            selectedPlace.contact !== '+60 5-491 1234' && (
                              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] pt-1">
                                <Phone className="w-3 h-3 shrink-0" />
                                <a href={`tel:${selectedPlace.contact}`} className="underline hover:text-emerald-300">
                                  {selectedPlace.contact}
                                </a>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4B. NORMAL FLAT 2D TOWNSHIP HUB MODAL IN LOW-HORIZON 3D PITCH MODE */}
                {selectedTownshipHubModal && (
                  <div className="flex-1 min-h-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="pointer-events-auto w-full max-w-md rounded-2xl sm:rounded-3xl bg-stone-900/98 border border-sky-500/45 shadow-2xl overflow-hidden text-stone-100 flex flex-col max-h-full animate-in fade-in zoom-in-95 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative h-28 sm:h-36 shrink-0">
                        <img
                          src={safeSrc(selectedTownshipHubModal.imageUrl, DEFAULT_PLACE_IMAGE)}
                          alt={selectedTownshipHubModal.township}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
                        <button
                          type="button"
                          onClick={() => {
                            stopAllVoiceAlerts();
                            setSelectedTownshipHubModal(null);
                          }}
                          className="absolute top-2.5 right-2.5 p-1.5 sm:p-2 rounded-full bg-black/60 hover:bg-black/80 text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2.5 left-3.5 right-3.5">
                          <div className="text-[9.5px] font-black uppercase tracking-wider text-sky-400">
                            Cameron Highlands Township Hub
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-white">
                            {selectedTownshipHubModal.township} Hub
                          </h3>
                        </div>
                      </div>
                      <div className="p-3 sm:p-4 space-y-2.5 overflow-y-auto text-[11px] sm:text-xs min-h-0 flex-1 [scrollbar-width:thin]">
                        <p className="text-stone-300 leading-relaxed">{selectedTownshipHubModal.description}</p>
                        <div className="p-2.5 rounded-2xl bg-stone-950/80 border border-white/10 space-y-1">
                          <div>🏥 <strong>Clinic/Hospital:</strong> {selectedTownshipHubModal.clinicsOrHospitals}</div>
                          <div>👮 <strong>Police:</strong> {selectedTownshipHubModal.policeStation}</div>
                          <div>🚻 <strong>Public Toilet:</strong> {selectedTownshipHubModal.publicToilet}</div>
                          <div>⛽ <strong>Gas Station:</strong> {selectedTownshipHubModal.gasStation}</div>
                        </div>
                        <div className="text-stone-300">
                          <div className="font-bold text-emerald-400 uppercase text-[10px] mb-1">Places of Interest</div>
                          <div>{selectedTownshipHubModal.attractionsList}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const town = selectedTownshipHubModal.township;
                            setSelectedTownshipHubModal(null);
                            window.dispatchEvent(new CustomEvent('filter-township-hub', { detail: town }));
                          }}
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                        >
                          Filter Directory & Map by {selectedTownshipHubModal.township}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4C. REGULAR 2D DIRECTORY PLACE POPUP / BOTTOM SHEET (Flex-constrained so it NEVER overlaps Prayer Alert!) */}
                {selectedPlace && !activeRoute && !is3dDriverMode && (
                  isPlaceCardMinimized ? (
                    <div className="pointer-events-auto self-center select-none max-w-full animate-in slide-in-from-bottom duration-200">
                      <div className="rounded-full bg-stone-900/95 backdrop-blur-2xl border border-emerald-500/45 shadow-2xl px-3 py-1.5 text-stone-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPlaceCardMinimized(false)}
                          className="flex items-center gap-1.5 min-w-0 cursor-pointer"
                          title="Expand Place Card"
                        >
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-xs font-extrabold text-white truncate max-w-[140px] sm:max-w-[200px]">
                            {language === 'bm' ? selectedPlace.nameBm || selectedPlace.name : selectedPlace.name}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const target = selectedPlace;
                            onSelectPlace(null);
                            handleTriggerRoute(target);
                          }}
                          className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Navigation2 className="w-3 h-3 fill-current" />
                          <span>{language === 'bm' ? 'Pergi' : 'Go'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPlaceCardMinimized(false)}
                          className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-emerald-300 cursor-pointer shrink-0"
                          title="Expand Place Card"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            stopAllVoiceAlerts();
                            onSelectPlace(null);
                          }}
                          className="p-1.5 rounded-full bg-black/40 hover:bg-stone-700 text-stone-400 hover:text-white cursor-pointer shrink-0"
                          title="Close Place Card"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pointer-events-auto w-full sm:w-[410px] max-h-full flex flex-col select-none animate-in slide-in-from-bottom duration-300">
                      <div className="rounded-2xl sm:rounded-3xl bg-stone-900/98 backdrop-blur-2xl border border-emerald-500/50 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-3 sm:p-4 text-stone-100 flex flex-col gap-2 sm:gap-2.5 max-h-full w-full overflow-hidden box-border">
                        {/* Drag Handle Indicator */}
                        <div className="w-10 h-1 bg-stone-600/80 rounded-full mx-auto -mt-0.5 mb-0.5 shrink-0" />

                        {/* Header: Place Photo + Titles + Minimize/Close Buttons */}
                        <div className="flex items-start justify-between gap-2 w-full min-w-0 shrink-0">
                          <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
                            <img
                              src={safeSrc(selectedPlace.imageUrl, DEFAULT_PLACE_IMAGE)}
                              alt={selectedPlace.name}
                              className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 border border-white/10 shadow-md aspect-square"
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

                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <button
                              type="button"
                              onClick={() => setIsPlaceCardMinimized(true)}
                              className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                              title={language === 'bm' ? 'Kecilkan kepada kapsul' : 'Minimize to capsule'}
                            >
                              <Minimize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                stopAllVoiceAlerts();
                                onSelectPlace(null);
                              }}
                              className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                              title="Close place card"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
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

                        {/* PROMINENT "START NAVIGATION" BUTTON */}
                        <button
                          type="button"
                          onClick={() => {
                            const target = selectedPlace;
                            onSelectPlace(null);
                            handleTriggerRoute(target);
                          }}
                          className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 active:scale-95 transition-all cursor-pointer shrink-0 min-w-0 truncate"
                        >
                          <Navigation2 className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" />
                          <span className="truncate">{language === 'bm' ? 'Mula Navigasi GPS' : 'Start Navigation'}</span>
                        </button>

                        {/* Scrollable details: Flex-1 min-h-0 guarantees card never exceeds remaining mobile height */}
                        <div className="overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#059669_transparent] pr-1 space-y-2 flex-1 min-h-0 w-full min-w-0">
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
                  )
                )}
              </div>
            </div>
          );
        })()}

        {/* AI Telemetry Alert Overlay */}
        {activeTelemetryAlert && (
          <div className="absolute top-3 sm:top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm animate-bounce">
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
                onClick={() => {
                  stopAllVoiceAlerts();
                  setActiveTelemetryAlert(null);
                }}
                className="ml-auto p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
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

        {/* 3. BOTTOM NAVIGATION CONTROL CARD & SLIDE-UP STEP MODAL (Minimizable to Small Capsule) */}
        {activeRoute &&
          !isCalculatingRoute &&
          !(selectedPlace && is3dDriverMode) &&
          !selectedTownshipHubModal && (
          isNavCardMinimized ? (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none max-w-[calc(100vw-20px)] animate-in slide-in-from-bottom duration-200">
              <div className="rounded-full bg-stone-900/95 backdrop-blur-2xl border border-emerald-500/45 shadow-2xl px-3 py-1.5 text-stone-100 flex items-center gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNavCardMinimized(false)}
                  className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-90"
                  title="Expand Navigation & Steps"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-xs font-black text-emerald-400 whitespace-nowrap">
                    {activeRoute.aiAdjustedMins || activeRoute.durationMins} min
                  </span>
                  <span className="text-[10.5px] font-bold text-stone-300 whitespace-nowrap">
                    {activeRoute.distanceKm} km
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-stone-800 border border-white/10 text-emerald-300 whitespace-nowrap">
                    {activeRoute.steps.length} {language === 'bm' ? 'langkah' : 'steps'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={isNavigationPaused ? handleResumeNavigation : handleStopNavigation}
                  className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer shrink-0"
                  title={isNavigationPaused ? 'Resume' : 'Pause'}
                >
                  {isNavigationPaused ? (
                    <Play className="w-3 h-3 text-cyan-400 fill-current" />
                  ) : (
                    <Pause className="w-3 h-3 text-amber-400 fill-current" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleMapVoiceLang}
                  className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-black border transition-all cursor-pointer shrink-0 ${
                    mapVoiceLang === 'bm'
                      ? 'bg-emerald-900/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-stone-800 text-sky-300 border-white/10'
                  }`}
                  title={mapVoiceLang === 'bm' ? 'Suara: Bahasa Malaysia' : 'Voice: English'}
                >
                  {mapVoiceLang === 'bm' ? '🇲🇾 BM' : '🇬🇧 EN'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsNavCardMinimized(false);
                    setRouteStepsOpen(true);
                  }}
                  className="px-2 py-1 rounded-full bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  title="Expand Step Modal"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span className="hidden sm:inline">{language === 'bm' ? 'Buka' : 'Expand'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearRoute}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-red-900/60 text-stone-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="End Navigation"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
          <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-6 sm:right-6 sm:max-w-xl sm:mx-auto z-40 pointer-events-auto select-none animate-in slide-in-from-bottom duration-300">
            <div className="rounded-2xl sm:rounded-3xl bg-stone-900/95 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl p-2.5 sm:p-4 text-stone-100 flex flex-col gap-2 sm:gap-2.5">
              {/* Top Handle Bar: Slide Up Steps Toggle + Minimize to Capsule */}
              <div className="flex items-center justify-between gap-2 pt-0.5 pb-1 -mt-1">
                <button
                  type="button"
                  onClick={() => setRouteStepsOpen(!routeStepsOpen)}
                  className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-stone-800/90 border border-white/10 text-[10px] font-mono font-bold text-emerald-400 shadow-sm cursor-pointer active:opacity-75"
                >
                  <span>{routeStepsOpen ? '▼ Hide steps' : `▲ Slide up steps (${activeRoute.steps.length})`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsNavCardMinimized(true)}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-800/90 hover:bg-stone-700 border border-white/10 text-[10px] font-bold text-stone-300 hover:text-white cursor-pointer transition-colors"
                  title={language === 'bm' ? 'Kecilkan kepada kapsul' : 'Minimize to capsule'}
                >
                  <Minimize2 className="w-3 h-3 text-emerald-400" />
                  <span>{language === 'bm' ? 'Kapsul' : 'Capsule'}</span>
                </button>
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
                      {activeRoute.aiAdjustedMins || activeRoute.durationMins} min
                    </div>
                    {activeRoute.predictiveSummaryNote && (
                      <div
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 mt-0.5 max-w-[165px]"
                        title={activeRoute.predictiveSummaryNote}
                      >
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        <span className="text-[8.5px] font-black text-emerald-300 uppercase tracking-tighter truncate">
                          {activeRoute.predictiveSource === 'tomtom_predictive_route'
                            ? 'Predictive Flow'
                            : 'Historical Profile'}
                        </span>
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
                      const metrics = computeUpcomingManeuverMetrics(userGpsCoords.lat, userGpsCoords.lng, activeRoute);
                      easeTo({
                        center: [userGpsCoords.lat, userGpsCoords.lng],
                        zoom: computeDynamicDriverZoom(
                          vehicleSpeedKmh,
                          metrics.distToTurnM,
                          tileLayers[activeMapType]?.maxZoom || 18
                        ),
                        bearing: metrics.segmentBearing ?? currentHeading,
                        pitch: computeDynamicDriverPitch(vehicleSpeedKmh, metrics.distToTurnM),
                        duration: 800,
                      });
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
              <div className="flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
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
                    onClick={handleToggleSimulateDrive}
                    className={`py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isSimulatingDrive
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-stone-800 hover:bg-stone-700 text-emerald-300'
                    }`}
                    title="Simulate Heading-Up Drive along Route"
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>{isSimulatingDrive ? 'Stop Sim' : 'Sim Drive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePwaAudioAlerts()}
                    className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                      isVoiceNavEnabled
                        ? 'bg-stone-800 hover:bg-stone-700 text-emerald-400'
                        : 'bg-stone-800/60 text-stone-500'
                    }`}
                    title={isVoiceNavEnabled ? 'Mute PWA Audio Alerts' : 'Enable PWA Audio Alerts'}
                  >
                    {isVoiceNavEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleMapVoiceLang}
                    className={`px-2 py-1 rounded-xl transition-colors cursor-pointer text-[10.5px] font-bold border ${
                      mapVoiceLang === 'bm'
                        ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-500/40'
                        : 'bg-stone-800 hover:bg-stone-700 text-sky-300 border-white/10'
                    }`}
                    title={
                      mapVoiceLang === 'bm'
                        ? 'Suara Peta: Bahasa Malaysia (Klik untuk English)'
                        : 'Map Voice: English (Click for Bahasa Malaysia)'
                    }
                  >
                    {mapVoiceLang === 'bm' ? '🇲🇾 BM' : '🇬🇧 EN'}
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
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRouteStepsOpen(false)}
                        className="text-stone-400 hover:text-white font-bold cursor-pointer"
                      >
                        Collapse Steps
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNavCardMinimized(true)}
                        className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                      >
                        Minimize to Capsule
                      </button>
                    </div>
                  </div>
                  {activeRoute.steps.map((step, idx) => (
                    <div
                      key={`step-${idx}`}
                      className="p-2 rounded-xl bg-stone-950/70 border border-white/5 flex items-start gap-2.5 text-xs"
                    >
                      <span className="text-base leading-none shrink-0 mt-0.5">{step.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-stone-200 leading-snug">
                          {mapVoiceLang === 'bm' || language === 'bm'
                            ? translateNavInstructionToBm(step.instruction)
                            : translateNavInstructionToEn(step.instruction)}
                        </div>
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
          )
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
          className="fixed inset-0 z-[140] flex items-start justify-center bg-black/85 backdrop-blur-md p-2 overflow-y-auto"
          onClick={() => {
            stopAllVoiceAlerts();
            setStreetViewOpen(false);
          }}
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
                onClick={() => {
                  stopAllVoiceAlerts();
                  setStreetViewOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close Modal</span>
              </button>
            </div>

            <div className="relative h-[380px] sm:h-[460px] overflow-hidden bg-stone-950 select-none">
              <img
                src={safeSrc(selectedPlace?.imageUrl, DEFAULT_PLACE_IMAGE)}
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

      {/* Non-Blocking Docked Incident Location & AI Traffic Flow Prediction Panel */}
      {selectedHazardModal && (
        <div className="fixed inset-x-2.5 bottom-2.5 sm:inset-x-auto sm:bottom-4 sm:left-4 z-[145] pointer-events-none flex justify-start">
          <div
            className="pointer-events-auto w-full sm:w-[410px] max-h-[60vh] sm:max-h-[76vh] overflow-y-auto rounded-2xl bg-stone-950/95 backdrop-blur-xl border border-rose-500/45 shadow-2xl p-4 text-stone-100 space-y-3 animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/40 text-rose-300">
                    {selectedHazardModal.isProvisional
                      ? `🚨 TELEMETRY (-${selectedHazardModal.speedDropPercent || 70}%)`
                      : `⚠️ ${selectedHazardModal.type.replace('_', ' ').toUpperCase()}`}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase text-amber-300">
                    {selectedHazardModal.severity}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-white mt-1 leading-snug">
                  {language === 'bm'
                    ? selectedHazardModal.titleBm || selectedHazardModal.title
                    : selectedHazardModal.title}
                </h4>
                <div className="text-xs text-emerald-300 font-semibold mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>📍 {selectedHazardModal.location}</span>
                  <span className="text-[10px] font-mono text-stone-400">
                    ({resolveHazardCoords(selectedHazardModal).lat.toFixed(4)},{' '}
                    {resolveHazardCoords(selectedHazardModal).lng.toFixed(4)})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopAllVoiceAlerts();
                  setSelectedHazardModal(null);
                  onClearFocusedHazard?.();
                }}
                className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer shrink-0"
                aria-label="Close incident prediction panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              {language === 'bm'
                ? selectedHazardModal.descriptionBm || selectedHazardModal.description
                : selectedHazardModal.description}
            </p>

            {/* Smart Algorithm + AI Traffic Flow Prediction */}
            {selectedHazardImpact && (
              <div className="rounded-xl bg-stone-900/95 border border-emerald-500/35 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>
                      {language === 'bm'
                        ? 'Ramalan Aliran Trafik Pintar & AI'
                        : 'AI & Smart Traffic Flow Prediction'}
                    </span>
                  </div>
                  <span
                    className={`text-[9.5px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${
                      selectedHazardImpact.flowTrend === 'worsening'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                        : selectedHazardImpact.flowTrend === 'peaking'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    }`}
                  >
                    {selectedHazardImpact.flowTrend}
                  </span>
                </div>

                {/* Live Predictive Metrics */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-2 rounded-lg bg-stone-950 border border-white/10">
                    <div className="text-[9.5px] text-stone-400 uppercase font-bold">
                      {language === 'bm' ? 'Kelajuan' : 'Pred. Speed'}
                    </div>
                    <div className="text-sm font-black text-amber-300 mt-0.5">
                      {selectedHazardImpact.predictedSpeedKmh} <span className="text-[10px]">km/h</span>
                    </div>
                    <div className="text-[9px] text-stone-500">
                      norm {selectedHazardImpact.baselineSpeedKmh}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-950 border border-white/10">
                    <div className="text-[9.5px] text-stone-400 uppercase font-bold">
                      {language === 'bm' ? 'Kelewatan' : 'Added Delay'}
                    </div>
                    <div className="text-sm font-black text-rose-400 mt-0.5">
                      +{selectedHazardImpact.predictedDelayMins} <span className="text-[10px]">min</span>
                    </div>
                    <div className="text-[9px] text-stone-500">live est.</div>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-950 border border-white/10">
                    <div className="text-[9.5px] text-stone-400 uppercase font-bold">
                      {language === 'bm' ? 'Barisan' : 'Tailback'}
                    </div>
                    <div className="text-sm font-black text-cyan-300 mt-0.5">
                      ~{selectedHazardImpact.congestionSpreadKm} <span className="text-[10px]">km</span>
                    </div>
                    <div className="text-[9px] text-stone-500">queue zone</div>
                  </div>
                </div>

                {/* AI Natural-Language Forecast */}
                <div className="p-2.5 rounded-lg bg-stone-950/90 border border-emerald-500/20 text-[11px] text-stone-200 leading-relaxed">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                      {aiIncidentForecast?.loading && <Loader2 className="w-3 h-3 animate-spin" />}
                      {aiIncidentForecast?.isAiEnhanced
                        ? '✨ Gemini AI Live Flow Forecast'
                        : '⚡ Spatial-Temporal Traffic Model'}
                    </span>
                    <button
                      type="button"
                      onClick={() => triggerAiFlowForecast(selectedHazardModal)}
                      disabled={aiIncidentForecast?.loading}
                      className="text-[10px] font-bold text-cyan-300 hover:text-cyan-200 underline cursor-pointer disabled:opacity-50"
                    >
                      {language === 'bm' ? 'Kemas kini AI' : 'Refresh AI'}
                    </button>
                  </div>
                  <p>
                    {aiIncidentForecast && aiIncidentForecast.hazardId === selectedHazardModal.id
                      ? aiIncidentForecast.forecast
                      : language === 'bm'
                        ? selectedHazardImpact.summaryBm
                        : selectedHazardImpact.summary}
                  </p>
                </div>

                {/* Bypass Advisory */}
                <div className="p-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-[11px] text-emerald-200 leading-snug">
                  <strong className="text-emerald-300">
                    {language === 'bm' ? 'Cadangan Pintasan: ' : 'Recommended Bypass: '}
                  </strong>
                  {language === 'bm'
                    ? selectedHazardImpact.recommendedBypassBm
                    : selectedHazardImpact.recommendedBypass}
                </div>
              </div>
            )}

            {/* Quick Map Re-Center + Community Consensus */}
            <div className="p-2.5 rounded-xl bg-stone-900 border border-white/10 flex items-center justify-between text-xs">
              <span>
                👍 Still There:{' '}
                <strong className="text-amber-300">+{selectedHazardModal.stillThereVotes}</strong>
              </span>
              <span>
                ✅ Cleared:{' '}
                <strong className="text-emerald-400">
                  {selectedHazardModal.clearedVotes}/{CLEARED_VOTE_EXPIRY_THRESHOLD}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => focusHazardOnMap(selectedHazardModal)}
                className="py-2 px-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>{language === 'bm' ? 'Fokus' : 'Locate'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleHazardVote(selectedHazardModal, 'still_there')}
                className="py-2 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Still (+1)</span>
              </button>
              <button
                type="button"
                onClick={() => handleHazardVote(selectedHazardModal, 'cleared')}
                className="py-2 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/50 text-emerald-200 text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cleared</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Modal Telegram / JKR / PDRM Hazard Ingestion Modal -> camgo_hazards */}
      {isHazardIngestModalOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-3"
          onClick={() => setIsHazardIngestModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-stone-900 border border-emerald-500/40 shadow-2xl p-4 text-stone-100 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/10">
              <div>
                <div className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-400">
                  Gemini Multi-Modal Extraction → Firestore camgo_hazards
                </div>
                <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                  {language === 'bm'
                    ? 'Ingest Amaran Trafik (Telegram / JKR / Infografik)'
                    : 'Ingest Traffic Alert (Telegram / JKR / Infographic)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopAllVoiceAlerts();
                  setIsHazardIngestModalOpen(false);
                }}
                className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
                aria-label="Close ingest modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                'Tanah runtuh di KM 43 Jalan Tapah-Ringlet, satu lorong terhalang.',
                'Pokok tumbang near Kea Farm market stretch causing heavy crawl.',
                'Sekatan jalan raya PDRM berhampiran Pos Slim FT185 Simpang Pulai.',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setIngestAlertText(sample)}
                  className="text-[10px] px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-white/10 truncate max-w-full cursor-pointer"
                >
                  {sample}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-stone-300">
                Source Channel
                <select
                  value={ingestSourceLabel}
                  onChange={(e) => setIngestSourceLabel(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-stone-950 border border-white/15 px-3 py-1.5 text-xs text-stone-100"
                >
                  <option value="Telegram Traffic Channel">Telegram Traffic Channel</option>
                  <option value="JKR Cameron Highlands Facebook">JKR Cameron Highlands Facebook</option>
                  <option value="PDRM Cameron Highlands Facebook">PDRM Cameron Highlands Facebook</option>
                  <option value="Driver Report">Driver Live Report</option>
                </select>
              </label>

              <textarea
                rows={3}
                value={ingestAlertText}
                onChange={(e) => setIngestAlertText(e.target.value)}
                placeholder="Paste BM/EN alert e.g. Tanah runtuh di KM 43 Jalan Tapah-Ringlet..."
                className="w-full rounded-xl bg-stone-950 border border-white/15 p-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500"
              />

              <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-stone-950 border border-dashed border-white/20 text-xs text-stone-300 cursor-pointer hover:border-emerald-400/50">
                <span className="flex items-center gap-2 truncate">
                  <FileImage className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {ingestImageBase64
                      ? 'Infographic / Screenshot attached'
                      : 'Optional: Upload Telegram/FB Infographic Screenshot'}
                  </span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIngestImageMimeType(file.type || 'image/jpeg');
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setIngestImageBase64(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>

            {ingestFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-[11px] text-emerald-200 font-semibold">
                {ingestFeedback}
              </div>
            )}

            <button
              type="button"
              disabled={isIngestingHazard || (!ingestAlertText.trim() && !ingestImageBase64)}
              onClick={async () => {
                setIsIngestingHazard(true);
                setIngestFeedback(null);
                try {
                  const res = await camgoHazardsService.ingestHazardViaApi({
                    text: ingestAlertText,
                    imageBase64: ingestImageBase64 || undefined,
                    mimeType: ingestImageMimeType,
                    source: ingestSourceLabel,
                  });
                  if (res.document) {
                    setIngestFeedback(
                      `Pinned "${res.document.title}" at (${res.document.lat}, ${res.document.lng}) [${res.document.type}]`
                    );
                    setIngestAlertText('');
                    setIngestImageBase64(null);
                    mapInstanceRef.current?.flyTo([res.document.lat, res.document.lng], 14.5, {
                      duration: 1.0,
                    });
                  }
                } catch (err: any) {
                  setIngestFeedback(err?.message || 'Failed to ingest alert');
                } finally {
                  setIsIngestingHazard(false);
                }
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
            >
              {isIngestingHazard ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isIngestingHazard ? 'Extracting & Pinning...' : 'Extract & Pin to Map'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};