import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Place, Township, MainCategory, Language } from '../types';
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
} from 'lucide-react';
import { TrafficForecastingModule } from './TrafficForecastingModule';
import { OperationalStatusBadges } from './OperationalStatusBadges';

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

interface InteractiveMapProps {
  places: Place[];
  language: Language;
  selectedPlace: Place | null;
  onSelectPlace: (place: Place | null) => void;
  filterCategory?: MainCategory | 'all';
  filterTownship?: Township | 'all';
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  places,
  language,
  selectedPlace,
  onSelectPlace,
  filterCategory = 'all',
  filterTownship = 'all',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const townshipLayerRef = useRef<L.LayerGroup | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeMapType, setActiveMapType] = useState<'osm' | 'satellite' | 'terrain'>('osm');
  const [activeCategory, setActiveCategory] = useState<MainCategory | 'all'>(filterCategory);
  const [activeTownship, setActiveTownship] = useState<Township | 'all'>(filterTownship);

  // AI Traffic Analysis State
  const [analyzingTraffic, setAnalyzingTraffic] = useState(false);
  const [trafficResult, setTrafficResult] = useState<TrafficAnalysisResult | null>(null);

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

  const trafficWidgetRef = useRef<HTMLDivElement>(null);
  const [trafficWidgetPos, setTrafficWidgetPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingTrafficWidget, setIsDraggingTrafficWidget] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  const handleStartDrag = (clientX: number, clientY: number) => {
    if (!trafficWidgetRef.current || !mapContainerRef.current) return;
    const widgetRect = trafficWidgetRef.current.getBoundingClientRect();
    const mapRect = mapContainerRef.current.getBoundingClientRect();

    const currentX = trafficWidgetPos ? trafficWidgetPos.x : (widgetRect.left - mapRect.left);
    const currentY = trafficWidgetPos ? trafficWidgetPos.y : (widgetRect.top - mapRect.top);

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: currentX,
      startY: currentY,
    };
    setIsDraggingTrafficWidget(true);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingTrafficWidget || !dragStartRef.current || !mapContainerRef.current || !trafficWidgetRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.mouseX;
      const deltaY = clientY - dragStartRef.current.mouseY;

      const mapRect = mapContainerRef.current.getBoundingClientRect();
      const widgetRect = trafficWidgetRef.current.getBoundingClientRect();

      // Keep widget safely bounded inside map container
      const maxX = Math.max(10, mapRect.width - widgetRect.width - 10);
      const maxY = Math.max(10, mapRect.height - widgetRect.height - 10);

      const newX = Math.max(10, Math.min(maxX, dragStartRef.current.startX + deltaX));
      const newY = Math.max(10, Math.min(maxY, dragStartRef.current.startY + deltaY));

      setTrafficWidgetPos({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDraggingTrafficWidget(false);
      dragStartRef.current = null;
    };

    if (isDraggingTrafficWidget) {
      window.addEventListener('mousemove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDraggingTrafficWidget]);

  // Ensure widget stays in bounds on resize
  useEffect(() => {
    const handleResize = () => {
      if (!trafficWidgetPos || !mapContainerRef.current || !trafficWidgetRef.current) return;
      
      const mapRect = mapContainerRef.current.getBoundingClientRect();
      const widgetRect = trafficWidgetRef.current.getBoundingClientRect();

      const maxX = Math.max(10, mapRect.width - widgetRect.width - 10);
      const maxY = Math.max(10, mapRect.height - widgetRect.height - 10);

      if (trafficWidgetPos.x > maxX || trafficWidgetPos.y > maxY) {
        setTrafficWidgetPos({
          x: Math.min(trafficWidgetPos.x, maxX),
          y: Math.min(trafficWidgetPos.y, maxY)
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [trafficWidgetPos]);

  // Adjust position when legend collapses/expands to prevent overflow
  useEffect(() => {
    if (!trafficWidgetPos || !mapContainerRef.current || !trafficWidgetRef.current) return;
    
    // Brief timeout to wait for DOM height to update after toggle
    const timer = setTimeout(() => {
      const mapRect = mapContainerRef.current?.getBoundingClientRect();
      const widgetRect = trafficWidgetRef.current?.getBoundingClientRect();
      if (!mapRect || !widgetRect) return;

      const maxY = Math.max(10, mapRect.height - widgetRect.height - 10);
      if (trafficWidgetPos.y > maxY) {
        setTrafficWidgetPos({
          x: trafficWidgetPos.x,
          y: maxY
        });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [trafficLegendOpen]);

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

  const filteredTrafficNavItems = mapTrafficSearchQuery.trim()
    ? TRAFFIC_NAV_ITEMS.filter((item) =>
        item.title.toLowerCase().includes(mapTrafficSearchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(mapTrafficSearchQuery.toLowerCase()) ||
        item.badge.toLowerCase().includes(mapTrafficSearchQuery.toLowerCase())
      )
    : TRAFFIC_NAV_ITEMS;

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

  const handleScrollToForecaster = () => {
    const el = document.getElementById('traffic-forecasting-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
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

      // Render Live Colored TomTom Traffic Overlay & Hotspots
      renderColoredTrafficOverlay(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
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

  const filteredPlaces = places.filter((p) => {
    const matchCat =
      activeCategory === 'all' ||
      p.category === activeCategory ||
      ((activeCategory === 'travel_tourism' || activeCategory === 'attraction') &&
        (p.category === 'attraction' || p.category === 'travel_tourism')) ||
      ((activeCategory === 'shopping' || activeCategory === 'business') &&
        (p.category === 'business' || p.category === 'shopping'));
    const matchTown = activeTownship === 'all' || p.township === activeTownship;
    return matchCat && matchTown;
  });

  // Render Markers on Map with Intelligent Clustering for High Performance
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const renderMarkers = () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      const currentZoom = map.getZoom();
      const shouldCluster = currentZoom < 14;

      if (shouldCluster) {
        const gridSize = 0.012; // ~1.2 km grid cell
        const clusters: Record<string, { latSum: number; lngSum: number; places: Place[] }> = {};

        filteredPlaces.forEach((place) => {
          const lat = Number(place.coordinates?.lat);
          const lng = Number(place.coordinates?.lng);
          const defaultCoord = TOWNSHIP_COORDS[place.township] || { lat: 4.475, lng: 101.385 };
          const validLat = !isNaN(lat) && lat !== 0 ? lat : defaultCoord.lat;
          const validLng = !isNaN(lng) && lng !== 0 ? lng : defaultCoord.lng;

          if (selectedPlace?.id === place.id) {
            const key = `selected-${place.id}`;
            clusters[key] = { latSum: validLat, lngSum: validLng, places: [place] };
            return;
          }

          const gridX = Math.floor(validLng / gridSize);
          const gridY = Math.floor(validLat / gridSize);
          const cellKey = `${gridX},${gridY}`;

          if (!clusters[cellKey]) {
            clusters[cellKey] = { latSum: 0, lngSum: 0, places: [] };
          }
          clusters[cellKey].latSum += validLat;
          clusters[cellKey].lngSum += validLng;
          clusters[cellKey].places.push(place);
        });

        Object.entries(clusters).forEach(([key, cluster]) => {
          const count = cluster.places.length;
          const centerLat = cluster.latSum / count;
          const centerLng = cluster.lngSum / count;

          if (count === 1) {
            const place = cluster.places[0];
            createSingleMarker(place, centerLat, centerLng, map);
          } else {
            const clusterIcon = L.divIcon({
              className: 'custom-cluster-marker',
              html: `
                <div style="
                  background: #059669;
                  color: white;
                  width: 42px;
                  height: 42px;
                  border-radius: 50%;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  border: 3px solid white;
                  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                  font-weight: 900;
                  font-size: 13px;
                  cursor: pointer;
                ">
                  <span>🌲</span>
                  <span style="font-size: 10px; line-height: 1;">${count}</span>
                </div>
              `,
              iconSize: [42, 42],
              iconAnchor: [21, 21],
            });

            const marker = L.marker([centerLat, centerLng], { icon: clusterIcon }).addTo(map);
            marker.bindTooltip(`Cluster: ${count} places. Click to zoom in.`, {
              direction: 'top',
              offset: [0, -21],
            });

            marker.on('click', () => {
              map.flyTo([centerLat, centerLng], map.getZoom() + 2, { duration: 0.8 });
            });

            markersRef.current[`cluster-${key}`] = marker;
          }
        });
      } else {
        filteredPlaces.forEach((place) => {
          const lat = Number(place.coordinates?.lat);
          const lng = Number(place.coordinates?.lng);
          const defaultCoord = TOWNSHIP_COORDS[place.township] || { lat: 4.475, lng: 101.385 };
          const validLat = !isNaN(lat) && lat !== 0 ? lat : defaultCoord.lat;
          const validLng = !isNaN(lng) && lng !== 0 ? lng : defaultCoord.lng;
          createSingleMarker(place, validLat, validLng, map);
        });
      }
    };

    const createSingleMarker = (place: Place, lat: number, lng: number, mapInstance: L.Map) => {
      let pinColor = '#059669';
      let iconEmoji = '🌲';
      if (place.category === 'accommodation') {
        pinColor = '#2563eb';
        iconEmoji = '🏨';
      } else if (place.category === 'food') {
        pinColor = '#ea580c';
        iconEmoji = '🍲';
      } else if (place.category === 'business') {
        pinColor = '#7c3aed';
        iconEmoji = '💼';
      }

      const isSelected = selectedPlace?.id === place.id;

      const customIcon = L.divIcon({
        className: 'custom-highland-marker',
        html: `
          <div style="
            background: ${pinColor};
            width: ${isSelected ? '40px' : '34px'};
            height: ${isSelected ? '40px' : '34px'};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: ${isSelected ? '3px solid #facc15' : '2px solid white'};
            box-shadow: ${isSelected ? '0 0 20px rgba(250, 204, 21, 0.9)' : '0 4px 12px rgba(0,0,0,0.4)'};
            cursor: pointer;
          ">
            <span style="transform: rotate(45deg); font-size: ${isSelected ? '18px' : '15px'};">${iconEmoji}</span>
          </div>
        `,
        iconSize: [isSelected ? 40 : 34, isSelected ? 40 : 34],
        iconAnchor: [isSelected ? 20 : 17, isSelected ? 40 : 34],
        popupAnchor: [0, -34],
      });

      const marker = L.marker([lat, lng], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(mapInstance);

      marker.bindTooltip(place.name, {
        direction: 'top',
        offset: [0, -34],
        opacity: 0.95,
      });

      marker.on('click', () => {
        onSelectPlace(place);
      });

      markersRef.current[place.id] = marker;
    };

    renderMarkers();
    map.on('zoomend', renderMarkers);

    return () => {
      map.off('zoomend', renderMarkers);
    };
  }, [filteredPlaces, places, selectedPlace]);

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

    const offsetLng = window.innerWidth >= 768 ? validLng - 0.005 : validLng;

    map.flyTo([validLat, offsetLng], 15, {
      duration: 1.2,
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

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
              <div style="position: relative; width: 22px; height: 22px;">
                <div style="position: absolute; inset: -8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.4); animation: ping 1.5s infinite;"></div>
                <div style="width: 22px; height: 22px; border-radius: 9999px; background: #10b981; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.5);"></div>
              </div>
            `,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });

          L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
          map.flyTo([latitude, longitude], 15);
        },
        () => {
          map.flyTo(defaultCenter, 14);
        }
      );
    } else {
      map.flyTo(defaultCenter, 14);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* MOBILE VIEW ONLY: Controls placed OUTSIDE the map */}
      <div className="block sm:hidden space-y-2 p-2 rounded-2xl bg-stone-900/90 border border-emerald-500/30 shadow-xl">
        <div className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase px-0.5">
          {language === 'bm' ? 'Kawalan & Penapis Peta' : 'Map Controls & Filters'}
        </div>
        
        <div className="grid grid-cols-5 gap-1">
          <button
            onClick={() => setActiveMapType('osm')}
            className={`py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all text-center truncate cursor-pointer ${
              activeMapType === 'osm' ? 'bg-emerald-600 text-white shadow-md' : 'bg-stone-800 text-stone-300'
            }`}
          >
            {getTranslation(language, 'map_osm')}
          </button>
          <button
            onClick={() => setActiveMapType('satellite')}
            className={`py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all text-center truncate cursor-pointer ${
              activeMapType === 'satellite' ? 'bg-emerald-600 text-white shadow-md' : 'bg-stone-800 text-stone-300'
            }`}
          >
            {getTranslation(language, 'map_satellite')}
          </button>
          <button
            onClick={() => setActiveMapType('terrain')}
            className={`py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all text-center truncate cursor-pointer ${
              activeMapType === 'terrain' ? 'bg-emerald-600 text-white shadow-md' : 'bg-stone-800 text-stone-300'
            }`}
          >
            {getTranslation(language, 'map_terrain')}
          </button>
          <button
            onClick={() => setStreetViewOpen(true)}
            className="flex items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-pointer truncate"
          >
            <Eye className="w-3 h-3" />
            <span>360°</span>
          </button>
          <button
            onClick={() => setIsTrafficOverlayActive(!isTrafficOverlayActive)}
            className={`flex items-center justify-center gap-0.5 py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer truncate ${
              isTrafficOverlayActive ? 'bg-rose-600 text-white shadow-md' : 'bg-stone-800 text-stone-300'
            }`}
            title="Toggle Live Traffic Overlay"
          >
            <Car className="w-3 h-3" />
            <span>{isTrafficOverlayActive ? 'Flow ON' : 'Flow OFF'}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value as MainCategory | 'all')}
            className="bg-stone-800 text-[10px] font-semibold text-stone-200 px-1.5 py-1.5 rounded-xl outline-none border border-white/10 cursor-pointer truncate"
          >
            <option value="all">{getTranslation(language, 'map_filter_all')}</option>
            <option value="services_utilities">Services</option>
            <option value="food">Food</option>
            <option value="travel_tourism">Tourism</option>
            <option value="accommodation">Stay</option>
            <option value="transport">Transport</option>
            <option value="local_services">Amenities</option>
            <option value="shopping">Shopping</option>
          </select>

          <select
            value={activeTownship}
            onChange={(e) => setActiveTownship(e.target.value as Township | 'all')}
            className="bg-stone-800 text-[10px] font-semibold text-stone-200 px-1.5 py-1.5 rounded-xl outline-none border border-white/10 cursor-pointer truncate"
          >
            <option value="all">{language === 'bm' ? 'Semua Pekan' : 'All Townships'}</option>
            <option value="Tanah Rata">Tanah Rata</option>
            <option value="Brinchang">Brinchang</option>
            <option value="Ringlet">Ringlet</option>
            <option value="Tringkap">Tringkap</option>
            <option value="Kampung Raja">Kampung Raja</option>
            <option value="Blue Valley">Blue Valley</option>
            <option value="Kea Farm">Kea Farm</option>
          </select>

          <button
            onClick={handleLocateMe}
            className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-md cursor-pointer truncate"
          >
            <Navigation2 className="w-3.5 h-3.5 animate-spin duration-3000 shrink-0" />
            <span className="truncate">{getTranslation(language, 'map_locate_me')}</span>
          </button>
        </div>

        {/* Mobile Traffic Route & Corridor Search Bar */}
        <div className="relative pt-1 border-t border-white/10">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={mapTrafficSearchQuery}
              onChange={(e) => {
                setMapTrafficSearchQuery(e.target.value);
                setIsTrafficSearchDropdownOpen(true);
              }}
              onFocus={() => setIsTrafficSearchDropdownOpen(true)}
              placeholder="Search Route, Corridor or Origin (KL, Tapah, FT185)..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-stone-950 border border-white/15 text-[10px] text-stone-100 placeholder-stone-400 outline-none focus:border-emerald-400"
            />
            {mapTrafficSearchQuery && (
              <button
                onClick={() => {
                  setMapTrafficSearchQuery('');
                  setIsTrafficSearchDropdownOpen(false);
                }}
                className="absolute right-2 text-stone-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Mobile Traffic Dropdown Suggestions */}
          {isTrafficSearchDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl bg-stone-950/98 backdrop-blur-xl border border-emerald-500/30 shadow-2xl p-1.5 z-50 text-stone-100 space-y-1">
              {filteredTrafficNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectTrafficNav(item)}
                  className="w-full p-1.5 rounded-lg text-left hover:bg-stone-800 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0 pr-1">
                    <div className="font-bold text-[11px] text-stone-200 truncate">{item.title}</div>
                    <div className="text-[9px] text-stone-400 truncate">{item.subtitle}</div>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-900 border border-white/10 shrink-0 ${item.color}`}>
                    {item.badge}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1 mt-1 overflow-x-auto pb-0.5 text-[8.5px] scrollbar-none">
            <span className="text-stone-400 shrink-0 font-bold">Gateways:</span>
            <button
              onClick={() => handleSelectTrafficNav(TRAFFIC_NAV_ITEMS[0])}
              className="px-1.5 py-0.5 rounded-md bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 shrink-0 font-bold transition-all"
            >
              Simpang Pulai
            </button>
            <button
              onClick={() => handleSelectTrafficNav(TRAFFIC_NAV_ITEMS[1])}
              className="px-1.5 py-0.5 rounded-md bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/30 shrink-0 font-bold transition-all"
            >
              Tapah
            </button>
            <button
              onClick={() => handleSelectTrafficNav(TRAFFIC_NAV_ITEMS[2])}
              className="px-1.5 py-0.5 rounded-md bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/30 shrink-0 font-bold transition-all"
            >
              Sg Koyan
            </button>
            <button
              onClick={handleScrollToForecaster}
              className="px-1.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 font-bold transition-all"
            >
              Forecaster ↓
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div
        className="map-wrapper relative w-full h-[520px] sm:h-[800px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl glass-panel"
        style={{ minHeight: '480px', width: '100%' }}
      >
        <div
          ref={mapContainerRef}
          className="w-full h-full z-10"
          style={{ width: '100%', height: '100%', minHeight: '480px' }}
        />

        {/* PC / TABLET VIEW ONLY: Map Overlay Controls Bar */}
        <div className="hidden sm:flex absolute top-4 left-4 right-4 z-20 items-center justify-between gap-3 pointer-events-none">
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-stone-900/90 backdrop-blur-md border border-white/10 shadow-lg">
              <button
                onClick={() => setActiveMapType('osm')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMapType === 'osm'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {getTranslation(language, 'map_osm')}
              </button>
              <button
                onClick={() => setActiveMapType('satellite')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMapType === 'satellite'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {getTranslation(language, 'map_satellite')}
              </button>
              <button
                onClick={() => setActiveMapType('terrain')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMapType === 'terrain'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {getTranslation(language, 'map_terrain')}
              </button>
              <button
                onClick={() => setStreetViewOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>360°</span>
              </button>
              <button
                onClick={() => setIsTrafficOverlayActive(!isTrafficOverlayActive)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isTrafficOverlayActive
                    ? 'bg-rose-600/90 hover:bg-rose-600 text-white border-rose-400/40 shadow-md shadow-rose-950/50'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border-white/10'
                }`}
                title="Toggle TomTom Live Colored Traffic Flow & Hotspots"
              >
                <Car className="w-3.5 h-3.5" />
                <span>Traffic Flow</span>
                <span className={`w-2 h-2 rounded-full ${isTrafficOverlayActive ? 'bg-emerald-300 animate-ping' : 'bg-stone-500'}`} />
              </button>
            </div>

            <div className="relative group p-1 rounded-2xl bg-stone-900/90 backdrop-blur-md border border-white/10 shadow-lg">
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-stone-200 cursor-pointer">
                <span>Filter:</span>
                <span>
                  {activeCategory === 'all'
                    ? 'All Places'
                    : activeCategory === 'travel_tourism' || activeCategory === 'attraction'
                    ? 'Travel & Tourism'
                    : activeCategory === 'food'
                    ? 'Food & Beverages'
                    : activeCategory === 'accommodation'
                    ? 'Accommodation'
                    : activeCategory === 'transport'
                    ? 'Transport & Mobility'
                    : activeCategory === 'local_services'
                    ? 'Local Services'
                    : activeCategory === 'shopping' || activeCategory === 'business'
                    ? 'Shopping & Produce'
                    : 'Services & Utilities'}
                </span>
              </button>
              <div className="absolute top-full left-0 mt-2 w-52 rounded-2xl bg-stone-900/95 border border-white/10 shadow-xl p-2 hidden group-hover:block z-50">
                {[
                  { key: 'all', label: getTranslation(language, 'map_filter_all') },
                  { key: 'food', label: 'Food & Beverages' },
                  { key: 'travel_tourism', label: 'Travel & Highland Tourism' },
                  { key: 'accommodation', label: 'Accommodation' },
                  { key: 'transport', label: 'Transport & Mobility' },
                  { key: 'local_services', label: 'Local Services & Amenities' },
                  { key: 'shopping', label: 'Shopping & Local Produce' },
                  { key: 'services_utilities', label: 'Services & Utilities' },
                ].map((catItem) => (
                  <button
                    key={catItem.key}
                    onClick={() => setActiveCategory(catItem.key as MainCategory | 'all')}
                    className={`block w-full text-left px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      activeCategory === catItem.key ? 'bg-emerald-600 text-white' : 'text-stone-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {catItem.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-1 rounded-2xl bg-stone-900/90 backdrop-blur-md border border-white/10 shadow-lg">
              <select
                value={activeTownship}
                onChange={(e) => setActiveTownship(e.target.value as Township | 'all')}
                className="bg-transparent text-xs font-semibold text-stone-200 px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="all" className="bg-stone-900 text-stone-200">{language === 'bm' ? 'Semua Pekan' : 'All Townships'}</option>
                <option value="Tanah Rata" className="bg-stone-900 text-stone-200">Tanah Rata</option>
                <option value="Brinchang" className="bg-stone-900 text-stone-200">Brinchang</option>
                <option value="Ringlet" className="bg-stone-900 text-stone-200">Ringlet</option>
                <option value="Tringkap" className="bg-stone-900 text-stone-200">Tringkap</option>
                <option value="Kampung Raja" className="bg-stone-900 text-stone-200">Kampung Raja</option>
                <option value="Blue Valley" className="bg-stone-900 text-stone-200">Blue Valley</option>
                <option value="Kea Farm" className="bg-stone-900 text-stone-200">Kea Farm</option>
              </select>
            </div>

            {/* PC Traffic Corridor & Route Search Tool */}
            <div ref={trafficSearchRef} className="relative p-1 rounded-2xl bg-stone-900/90 backdrop-blur-md border border-emerald-500/30 shadow-lg">
              <div className="flex items-center gap-1.5 px-2.5 py-1">
                <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <input
                  type="text"
                  value={mapTrafficSearchQuery}
                  onChange={(e) => {
                    setMapTrafficSearchQuery(e.target.value);
                    setIsTrafficSearchDropdownOpen(true);
                  }}
                  onFocus={() => setIsTrafficSearchDropdownOpen(true)}
                  placeholder="Search route or corridor (FT185, KL, Tapah)..."
                  className="w-48 lg:w-60 bg-transparent text-xs text-stone-100 placeholder-stone-400 outline-none"
                />
                {mapTrafficSearchQuery && (
                  <button
                    onClick={() => {
                      setMapTrafficSearchQuery('');
                      setIsTrafficSearchDropdownOpen(false);
                    }}
                    className="p-0.5 text-stone-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {isTrafficSearchDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 max-h-64 overflow-y-auto rounded-2xl bg-stone-950/98 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl p-2 z-50 text-stone-100 space-y-1 w-72 sm:w-80">
                  {filteredTrafficNavItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTrafficNav(item)}
                      className="w-full p-2 rounded-xl text-left hover:bg-stone-800 transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-xs text-stone-200 group-hover:text-emerald-300 truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-stone-400 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-stone-900 border border-white/10 shrink-0 ${item.color}`}>
                        {item.badge}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Shortcut to Traffic Forecaster */}
            <button
              onClick={handleScrollToForecaster}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              title="Jump to Real-Time & Predictive Traffic Forecaster"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Forecast Engine</span>
            </button>

            {/* Shortcut to LIVE ROAD STATUS Live Traffic Alerts Card */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-traffic-alerts-modal'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              title="Open Live Road Status & Alerts Card"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Live Alerts (3)</span>
            </button>
          </div>

          <div className="pointer-events-auto flex">
            <button
              onClick={handleLocateMe}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 cursor-pointer transition-all active:scale-95"
            >
              <Navigation2 className="w-3.5 h-3.5 animate-spin duration-3000" />
              <span>{getTranslation(language, 'map_locate_me')}</span>
            </button>
          </div>
        </div>

        {/* Floating Movable TomTom Live Traffic Legend & Hotspot Quick Jump Widget */}
        <div
          ref={trafficWidgetRef}
          style={
            trafficWidgetPos
              ? {
                  left: `${trafficWidgetPos.x}px`,
                  top: `${trafficWidgetPos.y}px`,
                  position: 'absolute',
                  zIndex: 40,
                }
              : {
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  position: 'absolute',
                  zIndex: 40,
                }
          }
          className={`pointer-events-auto w-[290px] sm:w-[340px] max-w-[calc(100%-24px)] select-none transition-shadow ${
            isDraggingTrafficWidget ? 'shadow-2xl ring-2 ring-emerald-400 scale-[1.01]' : 'shadow-xl'
          }`}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="rounded-2xl bg-stone-900/95 backdrop-blur-2xl border border-emerald-500/40 shadow-2xl p-2.5 sm:p-3 text-stone-100 max-h-[70vh] sm:max-h-[480px] flex flex-col">
            {/* Draggable Grip Handle Bar */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                handleStartDrag(e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                if (e.touches && e.touches[0]) {
                  handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
                }
              }}
              className="flex items-center justify-between px-2 py-1 mb-1.5 rounded-lg bg-stone-950/80 hover:bg-stone-800/80 border border-white/10 cursor-grab active:cursor-grabbing transition-colors group"
              title="Click and drag to move this widget anywhere on the map"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-300 group-hover:text-emerald-300">
                <Move className="w-3 h-3 text-emerald-400" />
                <span>Move Widget Anywhere</span>
              </div>
              <GripHorizontal className="w-4 h-4 text-stone-400 group-hover:text-emerald-400" />
            </div>

            {/* Header with status, toggle, reset and collapse */}
            <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="font-extrabold text-[11px] sm:text-xs text-white leading-tight flex items-center gap-1.5">
                    <span>TomTom Traffic Flow</span>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTrafficOverlayActive ? 'bg-emerald-400' : 'bg-stone-500'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isTrafficOverlayActive ? 'bg-emerald-500' : 'bg-stone-500'}`}></span>
                    </span>
                  </div>
                  <div className="text-[9px] text-stone-400 font-medium truncate">
                    {tomTomKeyPresent ? '🟢 Live TomTom Feed Connected' : '⚡ Corridors & Choke Points'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {trafficWidgetPos && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrafficWidgetPos(null);
                    }}
                    className="p-1 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                    title="Reset to default position"
                  >
                    <RotateCcw className="w-3 h-3 text-stone-300" />
                  </button>
                )}
                <button
                  onClick={() => setIsTrafficOverlayActive(!isTrafficOverlayActive)}
                  className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer ${
                    isTrafficOverlayActive
                      ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-500/30'
                      : 'bg-stone-800 text-stone-400 hover:text-white'
                  }`}
                  title="Toggle Colored Traffic Flow Overlay on Map"
                >
                  {isTrafficOverlayActive ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setTrafficLegendOpen(!trafficLegendOpen)}
                  className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
                  title={trafficLegendOpen ? 'Collapse Legend' : 'Expand Legend'}
                >
                  {trafficLegendOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Collapsible Legend Details & Hotspot Quick Jump (Scrollable) */}
            {trafficLegendOpen && (
              <div className="mt-2 space-y-2 overflow-y-auto pr-0.5 [scrollbar-width:thin] [scrollbar-color:#059669_transparent]">
                {/* Speed Spectrum Indicator */}
                <div className="grid grid-cols-4 gap-1 text-[8.5px] sm:text-[9px] font-bold text-center">
                  <div className="p-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                    <div className="w-full h-1.5 rounded-full bg-[#10b981] mb-1"></div>
                    <span>&gt;60k</span>
                    <div className="text-[7.5px] font-normal text-emerald-400/80">Clear</div>
                  </div>
                  <div className="p-1 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300">
                    <div className="w-full h-1.5 rounded-full bg-[#f59e0b] mb-1"></div>
                    <span>30-50k</span>
                    <div className="text-[7.5px] font-normal text-amber-400/80">Moderate</div>
                  </div>
                  <div className="p-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300">
                    <div className="w-full h-1.5 rounded-full bg-[#ef4444] mb-1"></div>
                    <span>15-25k</span>
                    <div className="text-[7.5px] font-normal text-rose-400/80">Heavy</div>
                  </div>
                  <div className="p-1 rounded-lg bg-red-950/70 border border-red-500/40 text-red-200">
                    <div className="w-full h-1.5 rounded-full bg-[#dc2626] mb-1"></div>
                    <span>&lt;15k</span>
                    <div className="text-[7.5px] font-normal text-red-400">Gridlock</div>
                  </div>
                </div>

                {/* Hotspot Quick Jump List */}
                <div>
                  <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-stone-400 mb-1 flex items-center justify-between">
                    <span>Bottlenecks (Click to Pan)</span>
                    <span className="text-[8.5px] text-amber-400 font-mono">6 monitored</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 max-h-24 sm:max-h-28 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
                    {congestionHotspots.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => handleFlyToHotspot(h)}
                        className="p-1 rounded-xl bg-stone-950/80 hover:bg-stone-800 border border-white/5 hover:border-emerald-500/40 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-[9.5px] text-stone-200 group-hover:text-emerald-300 truncate">
                            {h.name.replace(' Bottleneck Hotspot', '').replace(' Gridlock', '')}
                          </span>
                          <span
                            className="text-[8px] font-mono font-bold px-1 rounded shrink-0"
                            style={{ background: `${h.color}25`, color: h.color }}
                          >
                            {h.speedKmh}k
                          </span>
                        </div>
                        <div className="text-[8px] text-stone-400 truncate">
                          +{h.delayMins}m delay
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Road Status Alerts Card Trigger */}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-traffic-alerts-modal'))}
                  className="w-full py-1.5 px-2 rounded-xl bg-rose-600/25 hover:bg-rose-600/35 border border-rose-500/40 text-rose-200 hover:text-white text-[9.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  title="Open Live Road Status & Alerts Card"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  <span>Live Road Alerts & Broadcast (3 Active)</span>
                </button>

                {/* Jump to Forecaster */}
                <button
                  onClick={handleScrollToForecaster}
                  className="w-full py-1.5 px-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 hover:text-white text-[9.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>Open Full Traffic Forecaster ↓</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-Time & Predictive Traffic Forecasting Module for Long-Distance Drivers */}
      <div className="mt-4">
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
      {/* Selected Place Pop-Up Window */}
      {selectedPlace && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto pointer-events-auto"
          onClick={() => onSelectPlace(null)}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div
            className="glass-panel w-full max-w-md max-h-[88vh] my-auto overflow-y-auto rounded-3xl p-5 sm:p-6 bg-stone-900 border border-emerald-500/30 shadow-2xl relative transition-transform duration-200 [scrollbar-width:thin] [scrollbar-color:#059669_transparent]"
            style={{ transform: `scale(${cardZoom})`, transformOrigin: 'top center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onSelectPlace(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-emerald-600 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5 pr-8">
              <img
                src={selectedPlace.imageUrl}
                alt={selectedPlace.name}
                className="w-full sm:w-16 h-48 sm:h-16 rounded-2xl object-cover shrink-0 border border-white/10"
              />
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    {selectedPlace.township} • {selectedPlace.elevation}
                  </span>
                </div>
                <h4 className="text-base font-bold text-stone-100 mt-1 line-clamp-1">
                  {language === 'bm' ? selectedPlace.nameBm || selectedPlace.name : selectedPlace.name}
                </h4>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-stone-400 mt-0.5">
                  <span className="text-amber-400 font-bold">★ {selectedPlace.rating}</span>
                  <span>({selectedPlace.reviewsCount} reviews)</span>
                </div>
              </div>
            </div>

            {(selectedPlace.checkIn || selectedPlace.checkOut) && (
              <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-emerald-300 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {language === 'bm' ? 'Masuk' : 'Check-In'}: {selectedPlace.checkIn || '14:00'}
                </span>
                <span>•</span>
                <span>
                  {language === 'bm' ? 'Keluar' : 'Check-Out'}: {selectedPlace.checkOut || '12:00'}
                </span>
              </div>
            )}

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-300">
              {selectedPlace.operatingHours && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Clock className="w-3 h-3 text-stone-400" />
                  {(() => {
                    const todaySched = getTodayDaySchedule(selectedPlace.operatingHours);
                    const todayName = getTodayDayName();
                    if (selectedPlace.operatingHours.isOpen24Hours) {
                      return <span>{language === 'bm' ? 'Dibuka 24 Jam' : 'Open 24 Hours'}</span>;
                    }
                    if (todaySched) {
                      return todaySched.isOpen ? (
                        <span>
                          {todayName.slice(0, 3)}: {formatTimeTo12Hour(todaySched.from)} – {formatTimeTo12Hour(todaySched.to)}
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold">
                          {todayName.slice(0, 3)}: {language === 'bm' ? 'Tutup' : 'Closed'}
                        </span>
                      );
                    }
                    return (
                      <span>
                        {selectedPlace.operatingHours.from} - {selectedPlace.operatingHours.to}
                      </span>
                    );
                  })()}
                </div>
              )}
              {selectedPlace.contact && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <a href={`tel:${selectedPlace.contact}`} className="hover:text-emerald-300 underline font-mono text-[10px]">
                    {selectedPlace.contact}
                  </a>
                </div>
              )}
            </div>

            <p className="text-xs text-stone-300 mt-2.5 line-clamp-3 leading-relaxed">
              {language === 'bm' ? selectedPlace.descriptionBm : selectedPlace.description}
            </p>

            {/* Real-Time Operational Flags Badges */}
            <div className="mt-3 p-3 rounded-2xl bg-stone-950/70 border border-white/5">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">
                {language === 'bm' ? 'Status Operasi Masa Nyata' : 'Real-Time Operational Flags'}
              </div>
              <OperationalStatusBadges
                realTimeStatus={selectedPlace.realTimeStatus}
                diyHarvestStatus={selectedPlace.diyHarvestStatus}
                parkingStatus={selectedPlace.parkingStatus}
                roomAvailabilityStatus={selectedPlace.roomAvailabilityStatus}
                language={language}
              />
            </div>

            {selectedPlace.operatingHours?.weeklySchedule && selectedPlace.operatingHours.weeklySchedule.length > 0 && (
              <details className="mt-2 text-[11px] bg-stone-900/60 rounded-xl p-2.5 border border-white/5 group">
                <summary className="font-semibold text-emerald-400 cursor-pointer flex items-center justify-between select-none">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{language === 'bm' ? 'Jadual Waktu Operasi 7 Hari' : '7-Day Weekly Schedule'}</span>
                  </span>
                  <span className="text-[10px] text-stone-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-2 space-y-1 font-mono pt-1.5 border-t border-white/5">
                  {selectedPlace.operatingHours.weeklySchedule.map((s) => {
                    const isToday = s.day === getTodayDayName();
                    return (
                      <div
                        key={s.day}
                        className={`flex items-center justify-between px-2 py-0.5 rounded ${
                          isToday ? 'bg-emerald-500/10 text-emerald-300 font-bold' : 'text-stone-300'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {s.day}
                          {isToday && <span className="text-[9px] px-1 bg-emerald-500/30 rounded font-sans uppercase">Today</span>}
                        </span>
                        {s.isOpen ? (
                          <span>
                            {formatTimeTo12Hour(s.from)} – {formatTimeTo12Hour(s.to)}
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold">CLOSED</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            )}

            <div className="mt-3.5 p-3.5 rounded-2xl bg-stone-950/80 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{getTranslation(language, 'map_traffic_analysis')}</span>
                </div>
                {analyzingTraffic ? (
                  <span className="text-[10px] text-stone-400 animate-pulse">
                    {language === 'bm' ? 'Menganalisis satelit & laluan...' : 'Analyzing live flow...'}
                  </span>
                ) : trafficResult ? (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      trafficResult.condition === 'heavy'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : trafficResult.condition === 'moderate'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {trafficResult.condition === 'heavy'
                      ? (language === 'bm' ? 'Trafik Sesak' : 'Heavy Delays')
                      : trafficResult.condition === 'moderate'
                      ? (language === 'bm' ? 'Sederhana' : 'Moderate Crawl')
                      : (language === 'bm' ? 'Lancar' : 'Smooth Route')}
                  </span>
                ) : null}
              </div>

              {trafficResult && !analyzingTraffic && (
                <div className="space-y-2 text-xs text-stone-300">
                  <p className="leading-snug">
                    {language === 'bm' ? trafficResult.summaryBm : trafficResult.summary}
                  </p>

                  <div className="flex items-center gap-2 font-mono text-[11px] text-stone-400 pt-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>Est delay: {trafficResult.delayEstimate}</span>
                  </div>

                  {trafficResult.suggestedAlternativeRoute && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
                      <span className="font-bold">
                        {language === 'bm' ? 'Laluan Pintas AI: ' : 'Suggested Bypass: '}
                      </span>
                      <span>{trafficResult.suggestedAlternativeRoute}</span>
                    </div>
                  )}

                  {trafficResult.suggestedAlternativePlace && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200">
                      <span className="font-bold">
                        {language === 'bm' ? 'Tempat Alternatif (Kurang Sesak): ' : 'Alternative Spot (Less Crowded): '}
                      </span>
                      <span>{trafficResult.suggestedAlternativePlace}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="mt-3.5 pt-2 flex items-center justify-between gap-2 text-xs">
              <button
                onClick={() => {
                  if (mapInstanceRef.current && selectedPlace) {
                    const lat = Number(selectedPlace.coordinates?.lat);
                    const lng = Number(selectedPlace.coordinates?.lng);
                    mapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.5 });
                    onSelectPlace(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center transition-colors shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Navigation2 className="w-3.5 h-3.5" />
                <span>{language === 'bm' ? 'Navigasi Dalam App' : 'In-App Route'}</span>
              </button>
              <button
                onClick={() => setStreetViewOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Street View 360"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>360°</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};