// VisualSplitItinerary.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Place,
  Township,
  Language,
  ItineraryActivity,
  DayItinerary,
  ItineraryPlan,
  Coordinates,
  WeatherData,
  TrafficAlert,
  HazardAlert,
} from '../types';
import { firebaseService } from '../services/firebase';
import { geminiService } from '../services/gemini';
import { TOWNSHIP_PORTALS } from '../data/initialData';
import { calculateDistanceKm, calculateTravelTimeMins } from '../utils/highlandLogic';
import { calculateTotalCost, getAttractionTicketPrice } from '../utils/itineraryUtils';
import {
  Calendar,
  Clock,
  Compass,
  GripVertical,
  MapPin,
  Navigation,
  Plus,
  Route,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Save,
  CheckCircle2,
  Maximize2,
  Bot,
  AlertTriangle,
  CloudRain,
  Sun,
  Bike,
  Zap,
  Search,
  Car,
  Move,
  GripHorizontal,
  RotateCcw,
  Minimize2,
  Columns,
  Mountain,
  Menu,
} from 'lucide-react';
import { TrafficWidget } from './TrafficWidget';

interface VisualSplitItineraryProps {
  places: Place[];
  weatherList: WeatherData[];
  trafficAlerts?: TrafficAlert[];
  hazards?: HazardAlert[];
  language: Language;
  onClose: () => void;
  onSelectPlaceForMap?: (place: Place | null) => void;
  onOpenFullMap?: () => void;
}

const TOWNSHIP_COORDS: Record<Township, Coordinates> = {
  'Tanah Rata': { lat: 4.4715, lng: 101.3805 },
  'Brinchang': { lat: 4.4905, lng: 101.3892 },
  'Kea Farm': { lat: 4.5078, lng: 101.4088 },
  'Ringlet': { lat: 4.4128, lng: 101.3812 },
  'Kampung Raja': { lat: 4.5668, lng: 101.4112 },
  'Tringkap': { lat: 4.5122, lng: 101.4215 },
  'Kuala Terla': { lat: 4.5422, lng: 101.4182 },
  'Bertam Valley': { lat: 4.4178, lng: 101.3985 },
  'Blue Valley': { lat: 4.5888, lng: 101.4215 },
};

const ALL_9_TOWNSHIPS: Township[] = [
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

const TOWNSHIP_ORDER: Record<string, number> = {
  'Ringlet': 1,
  'Bertam Valley': 2,
  'Tanah Rata': 3,
  'Brinchang': 4,
  'Kea Farm': 5,
  'Tringkap': 6,
  'Kuala Terla': 7,
  'Kampung Raja': 8,
  'Blue Valley': 9,
};

const calculateCrowdLevel = (activity: ItineraryActivity): 'Low' | 'Medium' | 'High' => {
  const time = activity.timeSlot?.toLowerCase() || '';
  if (time.includes('12:00') || time.includes('01:00') || time.includes('02:00')) {
    return 'High';
  }
  if (time.includes('09:00') || time.includes('04:00')) {
    return 'Medium';
  }
  return 'Low';
};

interface EnrichedActivity extends ItineraryActivity {
  distanceFromPrevKm?: number;
  travelTimeFromPrevMins?: number;
  isPeakTraffic?: boolean;
  crowdLevel?: 'Low' | 'Medium' | 'High';
}

interface SortableActivityItemProps {
  activity: EnrichedActivity;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onTimeChange: (newTime: string) => void;
  isPc?: boolean;
}

const SortableActivityItem: React.FC<SortableActivityItemProps> = ({
  activity,
  index,
  total,
  isSelected,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
  onTimeChange,
  isPc = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative rounded-2xl p-4 transition-all border cursor-pointer touch-pan-y ${
        isSelected
          ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/50'
          : 'bg-stone-900/90 border-white/5 hover:border-emerald-500/30 hover:bg-stone-800/80'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
            activity.crowdLevel === 'High'
              ? 'bg-rose-950/50 text-rose-400 border-rose-500/20'
              : activity.crowdLevel === 'Medium'
              ? 'bg-amber-950/50 text-amber-400 border-amber-500/20'
              : 'bg-emerald-950/50 text-emerald-400 border-emerald-500/20'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>{activity.crowdLevel || 'Low'} Crowd</span>
        </div>
      </div>

      {index > 0 && activity.travelTimeFromPrevMins !== undefined && (
        <div
          className={`mb-2 -mt-1 flex items-center gap-2 text-[11px] font-mono px-2.5 py-1 rounded-lg border w-fit ${
            activity.isPeakTraffic
              ? 'bg-rose-950/50 border-rose-500/30 text-rose-400'
              : 'bg-emerald-950/50 border-emerald-500/20 text-emerald-400'
          }`}
        >
          {activity.isPeakTraffic ? (
            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
          ) : (
            <Route className="w-3 h-3 text-emerald-400 shrink-0" />
          )}
          <span>
            ~{activity.travelTimeFromPrevMins} mins drive ({activity.distanceFromPrevKm} km)
          </span>
          {activity.isPeakTraffic && (
            <span className="bg-rose-500/20 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider text-rose-300 ml-1">
              Heavy Traffic
            </span>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Dedicated drag handle so scrolling elsewhere on card works normally */}
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="mt-1 p-1 rounded-lg hover:bg-stone-800 text-stone-500 hover:text-stone-300 cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className={`rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-stone-950 font-black flex items-center justify-center shrink-0 shadow-md ${
          isPc ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs'
        }`}>
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-1.5 sm:gap-2">
            <h4 className="font-bold text-xs sm:text-sm text-stone-100 break-words leading-snug group-hover:text-emerald-300 transition-colors flex-1 min-w-[120px]">
              {activity.title}
            </h4>
            <div className="flex items-center gap-1.5 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
              <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                RM {activity.estimatedCost || 0}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={onMoveUp}
                  className="p-1 rounded-md text-stone-400 hover:text-white disabled:opacity-30 disabled:hover:text-stone-400 hover:bg-stone-800"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === total - 1}
                  onClick={onMoveDown}
                  className="p-1 rounded-md text-stone-400 hover:text-white disabled:opacity-30 disabled:hover:text-stone-400 hover:bg-stone-800"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  className="p-1 rounded-md text-stone-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-stone-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
              <MapPin className="w-3 h-3 shrink-0" />
              {activity.township}
            </span>
            {activity.elevation && (
              <span className="font-mono text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-300">
                {activity.elevation}
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
              <Clock className="w-3 h-3 text-stone-400" />
              <input
                type="text"
                value={activity.timeSlot || '09:00 AM'}
                onChange={(e) => onTimeChange(e.target.value)}
                className="bg-stone-800/80 border border-white/10 rounded px-1.5 py-0.5 text-[11px] font-mono text-stone-200 w-20 outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
      {activity.crowdLevel === 'High' && (
        <div className="mt-3 text-[10px] text-rose-400 bg-rose-950/20 px-2 py-1.5 rounded-lg border border-rose-500/20 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          <span>Peak Hour Alert: Predicted high crowd density. Consider visiting earlier or later.</span>
        </div>
      )}
    </div>
  );
};

export const VisualSplitItinerary: React.FC<VisualSplitItineraryProps> = ({
  places,
  weatherList,
  trafficAlerts = [],
  hazards = [],
  language,
  onClose,
  onSelectPlaceForMap,
  onOpenFullMap,
}) => {
  const [mobileView, setMobileView] = useState<'itinerary' | 'map'>('itinerary');
  const [mapViewMode, setMapViewMode] = useState<'split' | 'minimized' | 'fullscreen'>('split');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMapPrompt, setShowMapPrompt] = useState(false);
  const [mobileMapVisible, setMobileMapVisible] = useState(false);
  const [showTrafficOverlay, setShowTrafficOverlay] = useState(false);
  const [trafficAnchor, setTrafficAnchor] = useState<'telemetry' | 'corridors' | null>(null);

  const miniMapRef = useRef<HTMLDivElement>(null);
  const [miniMapPos, setMiniMapPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingMiniMap, setIsDraggingMiniMap] = useState(false);
  const miniMapDragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  const handleStartMiniMapDrag = (clientX: number, clientY: number) => {
    if (!miniMapRef.current) return;
    const rect = miniMapRef.current.getBoundingClientRect();
    const currentX = miniMapPos ? miniMapPos.x : rect.left;
    const currentY = miniMapPos ? miniMapPos.y : rect.top;

    miniMapDragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: currentX,
      startY: currentY,
    };
    setIsDraggingMiniMap(true);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingMiniMap || !miniMapDragStartRef.current || !miniMapRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - miniMapDragStartRef.current.mouseX;
      const deltaY = clientY - miniMapDragStartRef.current.mouseY;

      const rect = miniMapRef.current.getBoundingClientRect();
      const maxX = Math.max(10, window.innerWidth - rect.width - 10);
      const maxY = Math.max(10, window.innerHeight - rect.height - 10);

      const newX = Math.max(10, Math.min(maxX, miniMapDragStartRef.current.startX + deltaX));
      const newY = Math.max(10, Math.min(maxY, miniMapDragStartRef.current.startY + deltaY));

      setMiniMapPos({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDraggingMiniMap(false);
      miniMapDragStartRef.current = null;
    };

    if (isDraggingMiniMap) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDraggingMiniMap]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      const invalidate = () => {
        mapInstanceRef.current?.invalidateSize();
      };
      invalidate();
      const timers = [40, 150, 350, 700].map((delay) => setTimeout(invalidate, delay));
      return () => timers.forEach(clearTimeout);
    }
  }, [mapViewMode, mobileView]);

  const townWidgetRef = useRef<HTMLDivElement>(null);
  const [townWidgetPos, setTownWidgetPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingTownWidget, setIsDraggingTownWidget] = useState(false);
  const [townWidgetOpen, setTownWidgetOpen] = useState(false);
  const townWidgetDragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  const handleStartTownDrag = (clientX: number, clientY: number) => {
    if (!townWidgetRef.current || !mapContainerRef.current) return;
    const widgetRect = townWidgetRef.current.getBoundingClientRect();
    const mapRect = mapContainerRef.current.getBoundingClientRect();

    const currentX = townWidgetPos ? townWidgetPos.x : widgetRect.left - mapRect.left;
    const currentY = townWidgetPos ? townWidgetPos.y : widgetRect.top - mapRect.top;

    townWidgetDragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: currentX,
      startY: currentY,
    };
    setIsDraggingTownWidget(true);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingTownWidget || !townWidgetDragStartRef.current || !mapContainerRef.current || !townWidgetRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - townWidgetDragStartRef.current.mouseX;
      const deltaY = clientY - townWidgetDragStartRef.current.mouseY;

      const mapRect = mapContainerRef.current.getBoundingClientRect();
      const widgetRect = townWidgetRef.current.getBoundingClientRect();

      const maxX = Math.max(10, mapRect.width - widgetRect.width - 10);
      const maxY = Math.max(10, mapRect.height - widgetRect.height - 10);

      const newX = Math.max(10, Math.min(maxX, townWidgetDragStartRef.current.startX + deltaX));
      const newY = Math.max(10, Math.min(maxY, townWidgetDragStartRef.current.startY + deltaY));

      setTownWidgetPos({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDraggingTownWidget(false);
      townWidgetDragStartRef.current = null;
    };

    if (isDraggingTownWidget) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDraggingTownWidget]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<{ type: 'alert' | 'tip' | 'warning' | 'success'; msg: string }[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);

  const currentWeatherSummary = useMemo(() => {
    if (!weatherList || weatherList.length === 0) return 'Clear';
    const trWeather = weatherList.find((w) => w.township === 'Tanah Rata') || weatherList[0];
    const cond = trWeather.condition.toLowerCase();
    if (cond.includes('rain') || cond.includes('storm') || cond.includes('drizzle')) return 'Rainy';
    return 'Clear';
  }, [weatherList]);

  const generateUniqueId = () => `act-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const safeFirebaseSave = (planData: ItineraryPlan) => {
    try {
      const sanitizedPlan = JSON.parse(JSON.stringify(planData));
      firebaseService.saveItinerary(sanitizedPlan);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded. Skipping save to avoid crash.');
      } else {
        console.error('Error saving to Firebase:', error);
      }
    }
  };

  const [plan, setPlan] = useState<ItineraryPlan>(() => {
    const saved = firebaseService.getItinerary();
    if (saved && saved.days && saved.days.length > 0) return saved;

    const starterActivities: ItineraryActivity[] = places.slice(0, 3).map((p, idx) => ({
      id: generateUniqueId(),
      placeId: p.id,
      title: p.name,
      township: p.township,
      timeSlot: idx === 0 ? '09:00 AM' : idx === 1 ? '12:00 PM' : '03:30 PM',
      coordinates: p.coordinates,
      elevation: p.elevation,
      imageUrl: p.imageUrl,
    }));

    return {
      id: 'itinerary-highland-01',
      title: 'Highland Scenic Trail Itinerary',
      days: [
        { dayNumber: 1, title: 'Day 1: Tea & Heritage Explorer', activities: starterActivities },
        { dayNumber: 2, title: 'Day 2: Alpine Farms & Nature', activities: [] },
      ],
      updatedAt: new Date().toISOString(),
    };
  });

  const [activeDayIdx, setActiveDayIdx] = useState<number>(0);

  const [livePlaces, setLivePlaces] = useState<Place[]>(() => {
    return places && places.length > 0 ? places : firebaseService.getPlaces();
  });

  useEffect(() => {
    if (places && places.length > 0) {
      setLivePlaces(places);
    }
  }, [places]);

  useEffect(() => {
    const handlePlacesUpdated = (e: any) => {
      const updated = e.detail as Place[];
      if (Array.isArray(updated) && updated.length > 0) {
        setLivePlaces(updated);
      } else {
        setLivePlaces(firebaseService.getPlaces());
      }
    };
    window.addEventListener('places-updated', handlePlacesUpdated);
    return () => window.removeEventListener('places-updated', handlePlacesUpdated);
  }, []);

  const allPlaces = useMemo(() => {
    const list = livePlaces && livePlaces.length > 0 ? livePlaces : firebaseService.getPlaces();
    return list.filter(p => p.includeInPlanner === true);
  }, [livePlaces]);

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  const [customTitle, setCustomTitle] = useState('');
  const [customTownship, setCustomTownship] = useState<Township>('Brinchang');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activityTimeSlot, setActivityTimeSlot] = useState('10:00 AM');
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    township: Township;
    label: string;
  } | null>({
    lat: 4.4715,
    lng: 101.3805,
    township: 'Tanah Rata',
    label: '📍 Tanah Rata Town Center',
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string | null>('📍 Active Location: Tanah Rata Town Center');
  const [showLocationPickerModal, setShowLocationPickerModal] = useState<boolean>(false);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  const CAMERON_STARTING_POINTS = [
    { name: 'Tanah Rata Town Center / Bus Terminal', township: 'Tanah Rata' as Township, lat: 4.4715, lng: 101.3805 },
    { name: 'Zenith Hotel Tanah Rata', township: 'Tanah Rata' as Township, lat: 4.471, lng: 101.378 },
    { name: 'Heritage Hotel Cameron Highlands', township: 'Tanah Rata' as Township, lat: 4.4688, lng: 101.3795 },
    { name: 'Brinchang Town Square & Night Market', township: 'Brinchang' as Township, lat: 4.4905, lng: 101.3892 },
    { name: 'Nova Highlands Resort & Kea Farm Market', township: 'Kea Farm' as Township, lat: 4.5078, lng: 101.4088 },
    { name: 'Golden Hills / Cameron Fair', township: 'Brinchang' as Township, lat: 4.482, lng: 101.385 },
    { name: 'Ringlet Gateway (South Entrance)', township: 'Ringlet' as Township, lat: 4.4128, lng: 101.3812 },
    { name: 'Kampung Raja Junction (North Entrance)', township: 'Kampung Raja' as Township, lat: 4.5668, lng: 101.4112 },
    { name: 'Tringkap Rose Valley Area', township: 'Tringkap' as Township, lat: 4.5122, lng: 101.4215 },
  ];

  const isWithinCameronHighlands = (lat: number, lng: number) => {
    return lat >= 4.3 && lat <= 4.65 && lng >= 101.25 && lng <= 101.5;
  };

  const getNearestTownship = (lat: number, lng: number): Township => {
    let closestTown: Township = 'Tanah Rata';
    let minDistance = Infinity;

    Object.entries(TOWNSHIP_COORDS).forEach(([town, coords]) => {
      const dist = calculateDistanceKm({ lat, lng }, coords);
      if (dist < minDistance) {
        minDistance = dist;
        closestTown = town as Township;
      }
    });

    return closestTown;
  };

  const handleSetUserLocation = (
    locationObj: {
      lat: number;
      lng: number;
      accuracy?: number;
      township: Township;
      label: string;
    },
    autoAddAsStop = false
  ) => {
    // Hardening: Prevent crash if coordinates are invalid
    if (
      !locationObj ||
      typeof locationObj.lat !== 'number' ||
      typeof locationObj.lng !== 'number' ||
      isNaN(locationObj.lat) ||
      isNaN(locationObj.lng) ||
      !isFinite(locationObj.lat) ||
      !isFinite(locationObj.lng)
    ) {
      console.error('Invalid coordinates provided to handleSetUserLocation:', locationObj);
      return;
    }

    setUserLocation(locationObj);
    setLocationStatus(`📍 Active Location: ${locationObj.label}`);

    const map = mapInstanceRef.current;
    if (map) {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
      }

      const userPinHtml = `
        <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-[4000]">
          <div class="absolute -inset-3 rounded-full bg-blue-500/50 animate-ping"></div>
          <div class="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shadow-2xl border-2 border-white ring-4 ring-blue-500/80 bg-gradient-to-tr from-blue-600 via-cyan-500 to-sky-400 text-white z-20">
            📍
          </div>
          <div class="absolute -bottom-1 w-2.5 h-2.5 bg-blue-600 rotate-45 transform origin-center border-r border-b border-white z-10"></div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userPinHtml,
        className: 'user-gps-location-pin',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([locationObj.lat, locationObj.lng], {
        icon: userIcon,
        zIndexOffset: 4000,
      }).addTo(map);

      marker
        .bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 200px; padding: 4px; color: #1c1917;">
          <div style="font-size: 10px; font-weight: 800; color: #2563eb; text-transform: uppercase; margin-bottom: 2px;">
            Starting GPS Location
          </div>
          <div style="font-size: 13.5px; font-weight: 800; color: #0f172a;">
            ${locationObj.label}
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            Township: <strong>${locationObj.township}</strong>
          </div>
          <div style="font-size: 10px; font-family: monospace; color: #94a3b8; margin-top: 4px;">
            ${locationObj.lat.toFixed(4)}, ${locationObj.lng.toFixed(4)}
          </div>
        </div>
      `)
        .openPopup();

      userLocationMarkerRef.current = marker;

      try {
        map.invalidateSize();
        const size = map.getSize();
        if (size && size.x > 0 && size.y > 0) {
          map.flyTo([locationObj.lat, locationObj.lng], 15, { duration: 1.2 });
        } else {
          map.setView([locationObj.lat, locationObj.lng], 15);
        }
      } catch (flyErr) {
        console.warn('Leaflet flyTo safely caught:', flyErr);
        try {
          map.setView([locationObj.lat, locationObj.lng], 15);
        } catch (_) {}
      }
    }

    if (autoAddAsStop) {
      addCurrentLocationAsStop(locationObj);
    }
  };

  const handleDetectCurrentLocation = (autoAddAsStop = false) => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser. Defaulting to Tanah Rata.');
      const fallbackObj = {
        lat: 4.4715,
        lng: 101.3805,
        township: 'Tanah Rata' as Township,
        label: '📍 Tanah Rata Town Center',
      };
      handleSetUserLocation(fallbackObj, autoAddAsStop);
      return;
    }

    setIsLocating(true);
    setLocationStatus('Detecting GPS location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        const isInsideHighlands = isWithinCameronHighlands(lat, lng);
        const nearestTown = getNearestTownship(lat, lng);

        if (accuracy > 5000 || !isInsideHighlands || (nearestTown === 'Ringlet' && accuracy > 1000)) {
          const defaultTown: Township = 'Tanah Rata';
          const defaultCoords = TOWNSHIP_COORDS[defaultTown];
          const fallbackObj = {
            lat: defaultCoords.lat,
            lng: defaultCoords.lng,
            accuracy,
            township: defaultTown,
            label: `📍 Tanah Rata Town Center`,
          };
          setIsLocating(false);
          handleSetUserLocation(fallbackObj, autoAddAsStop);
          setLocationStatus(`📍 Set to Tanah Rata Town Center (Highland Hub).`);
          return;
        }

        const locationObj = {
          lat,
          lng,
          accuracy,
          township: nearestTown,
          label: `📍 My GPS Position (${nearestTown})`,
        };

        setIsLocating(false);
        handleSetUserLocation(locationObj, autoAddAsStop);
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation failed/denied:', error);
        const defaultTown: Township = 'Tanah Rata';
        const defaultCoords = TOWNSHIP_COORDS[defaultTown];
        const fallbackObj = {
          lat: defaultCoords.lat,
          lng: defaultCoords.lng,
          township: defaultTown,
          label: `📍 Tanah Rata Town Center`,
        };
        handleSetUserLocation(fallbackObj, autoAddAsStop);
        setLocationStatus('📍 Defaulted to Tanah Rata Town Center.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  const addCurrentLocationAsStop = (loc = userLocation) => {
    if (!loc) {
      handleDetectCurrentLocation(true);
      return;
    }

    const currentLocationAct: ItineraryActivity = {
      id: generateUniqueId(),
      title: loc.label || `📍 My Current Location`,
      township: loc.township || 'Tanah Rata',
      timeSlot: '08:30 AM',
      coordinates: { lat: loc.lat, lng: loc.lng },
      elevation: 'Current GPS Level',
      imageUrl: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=400&q=80',
    };

    const safeActivities = currentDay?.activities || [];
    updateCurrentDayActivities([currentLocationAct, ...safeActivities]);

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const filteredDirectoryPlaces = useMemo(() => {
    if (!searchQuery.trim()) return allPlaces;
    const q = searchQuery.toLowerCase().trim();
    return allPlaces.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.township?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [allPlaces, searchQuery]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const townshipLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const previewMarkerRef = useRef<L.Marker | null>(null);
  const [activeTile, setActiveTile] = useState<'osm' | 'satellite' | 'terrain'>('osm');
  const baseLayerRef = useRef<L.TileLayer | null>(null);

  const currentDay = plan.days[activeDayIdx] || plan.days[0];

  // Configure sensors to allow vertical touch scrolling on drag elements
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const enrichedActivities: EnrichedActivity[] = useMemo(() => {
    const list = [...(currentDay?.activities || [])];
    return list.map((act, i) => {
      const crowdLevel = calculateCrowdLevel(act);

      if (i === 0) return { ...act, travelTimeFromPrevMins: 0, distanceFromPrevKm: 0, isPeakTraffic: false, crowdLevel };

      const prev = list[i - 1];
      const dist = Number(calculateDistanceKm(prev.coordinates, act.coordinates).toFixed(1));
      let baseTime = calculateTravelTimeMins(dist);
      let multiplier = 1;

      const hop = [prev.township, act.township].sort().join('-');
      if (hop.includes('Brinchang') && hop.includes('Kea Farm')) {
        multiplier *= 3.5;
      }

      if (currentWeatherSummary === 'Rainy') {
        multiplier *= 1.3;
      }

      const adjustedTime = Math.round(baseTime * multiplier);

      return {
        ...act,
        distanceFromPrevKm: dist,
        travelTimeFromPrevMins: adjustedTime,
        isPeakTraffic: multiplier > 1.5,
        crowdLevel,
      };
    });
  }, [currentDay?.activities, currentWeatherSummary]);

  const totalDrivingMins = useMemo(() => {
    return enrichedActivities.reduce((acc, curr) => acc + (curr.travelTimeFromPrevMins || 0), 0);
  }, [enrichedActivities]);

  const totalDistanceKm = useMemo(() => {
    const sum = enrichedActivities.reduce((acc, curr) => acc + (curr.distanceFromPrevKm || 0), 0);
    return Number(sum.toFixed(1));
  }, [enrichedActivities]);

  const totalDayCost = useMemo(() => {
    return calculateTotalCost(currentDay?.activities || []);
  }, [currentDay?.activities]);

  const updateCurrentDayActivities = (newActivities: ItineraryActivity[]) => {
    setPlan((prev) => {
      const nextDays = [...prev.days];
      nextDays[activeDayIdx] = { ...nextDays[activeDayIdx], activities: newActivities };
      const updatedPlan = { ...prev, days: nextDays, updatedAt: new Date().toISOString() };

      safeFirebaseSave(updatedPlan);

      return updatedPlan;
    });
    if (aiInsights.length > 0) setAiInsights([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      handleDetectCurrentLocation(false);
    }

    const handleAddBudgetItem = (e: any) => {
      const { title, estimatedCost, township } = e.detail;
      const newAct: ItineraryActivity = {
        id: generateUniqueId(),
        title: title,
        township: township || 'Tanah Rata',
        timeSlot: '10:00 AM',
        coordinates: TOWNSHIP_COORDS[township as Township] || TOWNSHIP_COORDS['Tanah Rata'],
        estimatedCost: estimatedCost,
        imageUrl: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=400&q=80',
      };

      const safeActivities = currentDay?.activities || [];
      updateCurrentDayActivities([...safeActivities, newAct]);

      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    };

    window.addEventListener('add-itinerary-budget-item', handleAddBudgetItem);
    return () => window.removeEventListener('add-itinerary-budget-item', handleAddBudgetItem);
  }, [currentDay, activeDayIdx]);

  const handleAnalyzeRoute = async () => {
    setIsAnalyzing(true);
    setShowAiPanel(true);

    const result = await geminiService.analyzeItinerary(plan, currentWeatherSummary);

    const insights: typeof aiInsights = [
      { type: 'alert', msg: result.traffic },
      { type: 'tip', msg: result.budget },
    ];

    if (result.weather) {
      insights.push({ type: 'warning', msg: result.weather });
    }

    setAiInsights(insights);
    setIsAnalyzing(false);
  };

  const handleAutoOptimize = () => {
    setIsAnalyzing(true);
    setShowAiPanel(true);

    setTimeout(() => {
      const sorted = [...enrichedActivities].sort((a, b) => {
        const orderA = TOWNSHIP_ORDER[a.township] || 99;
        const orderB = TOWNSHIP_ORDER[b.township] || 99;
        return orderA - orderB;
      });

      const startTimeH = 8;
      let currentMins = startTimeH * 60;

      const reScheduled = sorted.map((act, idx) => {
        if (idx > 0) {
          const travelTime = calculateTravelTimeMins(
            calculateDistanceKm(sorted[idx - 1].coordinates, act.coordinates)
          );
          currentMins += 90 + (travelTime || 0);
        }

        const h = Math.floor(currentMins / 60);
        const m = Math.floor(currentMins % 60);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
        const displayM = m < 10 ? `0${m}` : m;

        const { distanceFromPrevKm, travelTimeFromPrevMins, isPeakTraffic, ...baseActivity } = act;

        return {
          ...baseActivity,
          timeSlot: `${displayH}:${displayM} ${ampm}`,
        };
      });

      setPlan((prev) => {
        const nextDays = [...prev.days];
        nextDays[activeDayIdx] = {
          ...nextDays[activeDayIdx],
          activities: reScheduled,
        };
        const updatedPlan = { ...prev, days: nextDays, updatedAt: new Date().toISOString() };

        safeFirebaseSave(updatedPlan);

        return updatedPlan;
      });

      setAiInsights([
        {
          type: 'success',
          msg: 'Route successfully reordered geographically (South to North) and timeslots adjusted!',
        },
      ]);
      setIsAnalyzing(false);
    }, 1200);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const safeActivities = currentDay?.activities || [];
    const oldIndex = safeActivities.findIndex((item) => item.id === active.id);
    const newIndex = safeActivities.findIndex((item) => item.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(safeActivities, oldIndex, newIndex);
      updateCurrentDayActivities(reordered);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const safeActivities = currentDay?.activities || [];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= safeActivities.length) return;
    const reordered = arrayMove(safeActivities, index, targetIndex);
    updateCurrentDayActivities(reordered);
  };

  const handleRemove = (id: string) => {
    const safeActivities = currentDay?.activities || [];
    const filtered = safeActivities.filter((a) => a.id !== id);
    updateCurrentDayActivities(filtered);
    if (selectedActivityId === id) setSelectedActivityId(null);
  };

  const handleAddDay = () => {
    const newDayNumber = plan.days.length + 1;
    const newDay: DayItinerary = {
      dayNumber: newDayNumber,
      title: `Day ${newDayNumber}: Exploration`,
      activities: [],
    };
    setPlan((prev) => {
      const updated = { ...prev, days: [...prev.days, newDay] };
      safeFirebaseSave(updated);
      return updated;
    });
    setActiveDayIdx(plan.days.length);
  };

  const handleAddActivity = () => {
    let newAct: ItineraryActivity;

    if (selectedPlaceId) {
      const place = allPlaces.find((p) => p.id === selectedPlaceId);
      if (place) {
        newAct = {
          id: generateUniqueId(),
          placeId: place.id,
          title: place.name,
          township: place.township,
          timeSlot: activityTimeSlot || '10:00 AM',
          coordinates: place.coordinates || TOWNSHIP_COORDS[place.township] || { lat: 4.475, lng: 101.385 },
          elevation: place.elevation,
          imageUrl: place.imageUrl,
          estimatedCost: getAttractionTicketPrice(place.name, place.subCategory),
        };
      } else return;
    } else {
      const finalTitle = customTitle.trim() || searchQuery.trim();
      if (!finalTitle) return;

      const coords = TOWNSHIP_COORDS[customTownship] || { lat: 4.475, lng: 101.385 };
      newAct = {
        id: generateUniqueId(),
        title: finalTitle,
        township: customTownship,
        timeSlot: activityTimeSlot || '10:00 AM',
        coordinates: {
          lat: coords.lat + (Math.random() - 0.5) * 0.005,
          lng: coords.lng + (Math.random() - 0.5) * 0.005,
        },
        elevation: '1,500 m',
        estimatedCost: getAttractionTicketPrice(finalTitle),
      };
    }

    const safeActivities = currentDay?.activities || [];
    updateCurrentDayActivities([...safeActivities, newAct]);

    setShowAddModal(false);
    setCustomTitle('');
    setSelectedPlaceId('');
    setSearchQuery('');
    setIsSearchOpen(false);
    setActivityTimeSlot('10:00 AM');
    if (previewMarkerRef.current) {
      previewMarkerRef.current.remove();
      previewMarkerRef.current = null;
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setIsSearchOpen(false);
    setSelectedPlaceId('');
    setCustomTitle('');
    setSearchQuery('');
    if (previewMarkerRef.current) {
      previewMarkerRef.current.remove();
      previewMarkerRef.current = null;
    }
  };

  const handleSaveItinerary = () => {
    safeFirebaseSave(plan);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
    
    // On mobile, show the prompt to open map
    if (window.innerWidth < 640) {
      setShowMapPrompt(true);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    try {
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, { 
          center: [4.475, 101.385], 
          zoom: 13, 
          zoomControl: false,
          fadeAnimation: true,
          markerZoomAnimation: true
        });
        
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        
        const tileUrl =
          activeTile === 'satellite'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            : activeTile === 'terrain'
            ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
            
        const base = L.tileLayer(tileUrl, { 
          attribution: '&copy; OSM', 
          maxZoom: 19 
        }).addTo(map);
        
        baseLayerRef.current = base;
        markersLayerRef.current = L.layerGroup().addTo(map);
        townshipLayerRef.current = L.layerGroup().addTo(map);
  
        renderTownshipHubsInItinerary(map);
  
        mapInstanceRef.current = map;
  
        if (
          userLocation &&
          typeof userLocation.lat === 'number' &&
          typeof userLocation.lng === 'number' &&
          !isNaN(userLocation.lat) &&
          !isNaN(userLocation.lng) &&
          isFinite(userLocation.lat) &&
          isFinite(userLocation.lng)
        ) {
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
              handleSetUserLocation(userLocation);
            }
          }, 300);
        }
      }
    } catch (err) {
      console.error('Failed to initialize Leaflet map:', err);
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        townshipLayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    if (baseLayerRef.current) {
      baseLayerRef.current.remove();
    }

    const tileUrl =
      activeTile === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : activeTile === 'terrain'
        ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    const newBase = L.tileLayer(tileUrl, { 
      attribution: '&copy; OSM', 
      maxZoom: 19 
    }).addTo(mapInstanceRef.current);
    
    baseLayerRef.current = newBase;
  }, [activeTile]);

  const renderTownshipHubsInItinerary = (map: L.Map) => {
    if (!townshipLayerRef.current) {
      townshipLayerRef.current = L.layerGroup().addTo(map);
    } else {
      townshipLayerRef.current.clearLayers();
    }

    const hubs = firebaseService.getTownshipHubs();

    Object.entries(TOWNSHIP_COORDS).forEach(([townshipName, coords]) => {
      const customHub = hubs[townshipName];
      const defaultPortal = TOWNSHIP_PORTALS.find((t) => t.name === townshipName);

      const hubInfo = {
        township: townshipName as Township,
        description:
          customHub?.description ||
          defaultPortal?.description ||
          `${townshipName} is a major vibrant hub in Cameron Highlands with scenic panoramas, cool climate, and travel amenities.`,
        imageUrl:
          customHub?.imageUrl ||
          defaultPortal?.imageUrl ||
          'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80',
        clinicsOrHospitals:
          customHub?.clinicsOrHospitals ||
          defaultPortal?.hospital ||
          'Sultanah Hajah Kalsom Hospital & local 24/7 clinics',
        policeStation:
          customHub?.policeStation || defaultPortal?.police || `Balai Polis ${townshipName}`,
        publicToilet:
          customHub?.publicToilet ||
          defaultPortal?.publicToilet ||
          'Available at town centre & public parking areas',
        gasStation:
          customHub?.gasStation || defaultPortal?.gasStation || 'Petronas / Shell petrol kiosks nearby',
        placesOfInterest:
          customHub?.placesOfInterest ||
          defaultPortal?.keyAttractions || ['Tea Plantations', 'Valley Farms', 'Lookout Points'],
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
            box-shadow: 0 4px 14px rgba(0,0,0,0.5);
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
        className:
          'text-xs font-bold bg-stone-900 text-stone-100 px-2 py-1 rounded shadow-lg border border-white/10',
      });

      const attractionsList = Array.isArray(hubInfo.placesOfInterest)
        ? hubInfo.placesOfInterest.join(' • ')
        : hubInfo.placesOfInterest;

      const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 285px; max-width: 85vw; max-height: 420px; overflow-y: auto; padding: 4px; color: #1c1917;">
          <div style="position: relative; width: 100%; height: 125px; border-radius: 12px; overflow: hidden; margin-bottom: 8px;">
            <img src="${hubInfo.imageUrl}" alt="${townshipName}" style="width: 100%; height: 100%; object-fit: cover;" />
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%);"></div>
            <div style="position: absolute; bottom: 8px; left: 10px; right: 10px; color: white;">
              <div style="font-size: 10px; font-weight: 800; color: #38bdf8; text-transform: uppercase;">Township Hub</div>
              <div style="font-weight: 900; font-size: 16px; line-height: 1.2;">${townshipName}</div>
            </div>
          </div>

          <p style="font-size: 11px; color: #44403c; line-height: 1.45; margin-bottom: 8px;">
            ${hubInfo.description}
          </p>

          <div style="background: #f5f5f4; border-radius: 12px; padding: 10px; margin-bottom: 8px; font-size: 11px; border: 1px solid #e7e5e4;">
            <div style="font-weight: 800; color: #0284c7; margin-bottom: 6px; font-size: 11px; text-transform: uppercase;">Essential Facilities</div>
            <div style="margin-bottom: 3px; display: flex; gap: 5px;"><span>🏥</span> <div><strong style="color: #292524;">Clinic/Hospital:</strong> <span style="color: #57534e;">${hubInfo.clinicsOrHospitals}</span></div></div>
            <div style="margin-bottom: 3px; display: flex; gap: 5px;"><span>👮</span> <div><strong style="color: #292524;">Police Station:</strong> <span style="color: #57534e;">${hubInfo.policeStation}</span></div></div>
            <div style="margin-bottom: 3px; display: flex; gap: 5px;"><span>🚻</span> <div><strong style="color: #292524;">Public Toilet:</strong> <span style="color: #57534e;">${hubInfo.publicToilet}</span></div></div>
            <div style="display: flex; gap: 5px;"><span>⛽</span> <div><strong style="color: #292524;">Gas Station:</strong> <span style="color: #57534e;">${hubInfo.gasStation}</span></div></div>
          </div>

          <div style="margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 11px; color: #059669; margin-bottom: 3px; text-transform: uppercase;">Places of Interest:</div>
            <div style="font-size: 11px; color: #57534e; line-height: 1.4;">${attractionsList}</div>
          </div>

          <button onclick="window.dispatchEvent(new CustomEvent('open-township-directory', { detail: '${townshipName}' }))" style="background: #059669; color: white; border: none; padding: 7px 12px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; width: 100%;">
            Explore ${townshipName} Directory
          </button>
        </div>
      `;

      townshipMarker.bindPopup(popupContent, { maxWidth: 310 });
    });
  };

  useEffect(() => {
    if (!mapInstanceRef.current || !mapContainerRef.current) return;
    const map = mapInstanceRef.current;

    const invalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    invalidate();
    const t0 = setTimeout(invalidate, 40);
    const t1 = setTimeout(invalidate, 120);
    const t2 = setTimeout(invalidate, 300);
    const t3 = setTimeout(invalidate, 650);

    const resizeObserver = new ResizeObserver(() => {
      invalidate();
    });
    resizeObserver.observe(mapContainerRef.current);

    const handleResize = () => invalidate();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [mobileView, mobileMapVisible, mapViewMode]);

  useEffect(() => {
    if (mobileMapVisible && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
        const validCoords = enrichedActivities
          .filter((a) => a.coordinates && typeof a.coordinates.lat === 'number' && typeof a.coordinates.lng === 'number')
          .map((a) => [a.coordinates.lat, a.coordinates.lng] as [number, number]);
        if (validCoords.length > 0) {
          const bounds = L.latLngBounds(validCoords);
          mapInstanceRef.current?.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
        }
      }, 150);
    }
  }, [mobileMapVisible, enrichedActivities]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });
    const tileUrl =
      activeTile === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : activeTile === 'terrain'
        ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    L.tileLayer(tileUrl, { attribution: '&copy; OSM', maxZoom: 19 }).addTo(map);
  }, [activeTile]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markersLayerRef.current) markersLayerRef.current.clearLayers();
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    const latLngs: [number, number][] = [];
    enrichedActivities.forEach((act, idx) => {
      if (!act.coordinates || typeof act.coordinates.lat !== 'number' || typeof act.coordinates.lng !== 'number') return;
      const lat = act.coordinates.lat;
      const lng = act.coordinates.lng;
      latLngs.push([lat, lng]);

      const isSelected = act.id === selectedActivityId;
      const pinColor = act.isPeakTraffic
        ? 'bg-rose-500 border-rose-950 ring-rose-500/30 text-white'
        : isSelected
        ? 'bg-amber-400 border-white ring-amber-500/50 text-stone-950'
        : 'bg-emerald-400 border-emerald-950 ring-emerald-400/30 text-stone-950';

      const customPinHtml = `
        <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-125 z-50' : 'hover:scale-110'
        }">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-xl border-2 ring-4 ${pinColor}">
            ${idx + 1}
          </div>
          <div class="absolute -bottom-1 w-2 h-2 ${
            act.isPeakTraffic ? 'bg-rose-500' : 'bg-emerald-500'
          } rotate-45 transform origin-center"></div>
        </div>
      `;

      const customIcon = L.divIcon({ html: customPinHtml, className: 'custom-itinerary-pin', iconSize: [32, 32], iconAnchor: [16, 16] });
      const marker = L.marker([lat, lng], { icon: customIcon });

      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 180px; padding: 4px;">
          <div style="font-size: 11px; font-weight: 800; color: #10b981; text-transform: uppercase;">Stop ${idx + 1}</div>
          <div style="font-size: 14px; font-weight: 700; color: #1c1917; margin-bottom: 4px;">${act.title}</div>
          <div style="font-size: 11px; color: #78716c;">📍 ${act.township} • ⏰ ${act.timeSlot || '09:00 AM'}</div>
          ${
            act.isPeakTraffic
              ? `<div style="margin-top: 6px; font-size: 11px; background: #fff1f2; color: #e11d48; padding: 3px 6px; border-radius: 6px;">⚠️ Traffic Alert: ~${act.travelTimeFromPrevMins} mins driving</div>`
              : idx > 0
              ? `<div style="margin-top: 6px; font-size: 11px; background: #ecfdf5; color: #047857; padding: 3px 6px; border-radius: 6px;">🚗 ~${act.travelTimeFromPrevMins} mins driving</div>`
              : ''
          }
        </div>
      `;
      marker.bindPopup(popupHtml);
      marker.on('click', () => setSelectedActivityId(act.id));
      markersLayerRef.current?.addLayer(marker);
    });

    if (latLngs.length > 1) {
      const hasTraffic = enrichedActivities.some((a) => a.isPeakTraffic);
      const routeLine = L.polyline(latLngs, {
        color: hasTraffic ? '#f43f5e' : '#10b981',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(map);
      routePolylineRef.current = routeLine;
    }

    if (latLngs.length > 0) {
      try {
        map.invalidateSize();
        const bounds = L.latLngBounds(latLngs);
        if (bounds.isValid()) {
          const size = map.getSize();
          if (size && size.x > 0 && size.y > 0) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          } else {
            map.setView(bounds.getCenter(), 13);
          }
        }
      } catch (fitErr) {
        console.warn('fitBounds safely caught:', fitErr);
      }
    }
  }, [enrichedActivities, selectedActivityId]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-stone-950 text-stone-100 overflow-hidden h-screen w-screen">
      {/* Top Header - Simplified for Mobile */}
      <header className="px-2 py-2 sm:px-6 bg-stone-900/95 border-b border-white/10 flex items-center justify-between gap-2 shrink-0 z-[100] backdrop-blur-md">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Route className="w-4 h-4" />
          </div>
          <h2 className="font-heading font-black text-[11px] sm:text-base text-stone-100 truncate">
            AI Itinerary Planner
          </h2>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {/* Budget Indicator - Hidden on mobile, moved to summary stats */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black whitespace-nowrap">
            <span className="opacity-70">Total Budget:</span>
            <span className="opacity-70">RM</span>
            <span>{totalDayCost}</span>
          </div>

          <button 
            onClick={handleSaveItinerary} 
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer shrink-0 active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>


          
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer ml-1 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Hamburger Menu - Updated with Overlay Trigger */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[700] flex flex-col bg-stone-950/95 backdrop-blur-xl animate-in fade-in">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-xl font-heading font-black text-stone-100">Menu</h3>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-full bg-stone-800 text-stone-400">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 p-6 space-y-4">
            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                setTrafficAnchor('telemetry');
                setShowTrafficOverlay(true);
              }}
              className="w-full p-5 rounded-2xl bg-stone-900 border border-emerald-500/30 flex items-center gap-4 text-left group transition-all active:scale-95"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-stone-100">LIVE ROAD TELEMETRY</div>
                <div className="text-sm text-stone-400">Check real-time congestion and alerts</div>
              </div>
            </button>

            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                setTrafficAnchor('corridors');
                setShowTrafficOverlay(true);
              }}
              className="w-full p-5 rounded-2xl bg-stone-900 border border-blue-500/30 flex items-center gap-4 text-left group transition-all active:scale-95"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Route className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-stone-100">3 Gateway Corridors Comparison</div>
                <div className="text-sm text-stone-400">Compare Tapah, Simpang Pulai & CSR</div>
              </div>
            </button>
          </div>
          <div className="p-6 border-t border-white/10">
            <button 
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-lg shadow-lg active:scale-95 transition-all"
            >
              EXIT PLANNER
            </button>
          </div>
        </div>
      )}

      {/* Traffic Overlay Modal for Mobile */}
      {showTrafficOverlay && (
        <div className="fixed inset-0 z-[750] flex flex-col bg-stone-950 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-stone-900/90 backdrop-blur-md sticky top-0 z-50">
            <h3 className="font-heading font-black text-stone-100 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-emerald-400" />
              Traffic Intel
            </h3>
            <button 
              onClick={() => {
                setShowTrafficOverlay(false);
                setTrafficAnchor(null);
              }} 
              className="p-2 rounded-xl bg-stone-800 text-stone-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20">
            <TrafficWidget
              alerts={trafficAlerts.length > 0 ? trafficAlerts : [
                {
                  id: 'alert-kea-farm-gridlock',
                  roadName: 'Central Spine (FT 59)',
                  location: 'Kea Farm Agro Market Zone',
                  status: 'heavy',
                  message: 'Kea Farm Agro Bazaar Parking Spillover & Pedestrian Crossing Bottleneck',
                  updatedAt: new Date().toISOString(),
                  delayMinutes: 28,
                  alternativeRoute: 'Habu / Boh Bypass or arrive before 9:30 AM',
                },
                {
                  id: 'alert-tapah-lata-iskandar',
                  roadName: 'Tapah Pass (FT 59)',
                  location: 'Lata Iskandar Waterfall Hairpins',
                  status: 'moderate',
                  message: 'Winding 300+ hairpin turns with roadside fruit stall pull-ins',
                  updatedAt: new Date().toISOString(),
                  delayMinutes: 16,
                  alternativeRoute: 'FT 185 Simpang Pulai Dual-Carriageway',
                },
                {
                  id: 'alert-golden-hills-pasarmalam',
                  roadName: 'Brinchang Link (FT 59)',
                  location: 'Golden Hills Night Market Strip',
                  status: 'heavy',
                  message: 'Weekend Pasar Malam roadside parking congestion',
                  updatedAt: new Date().toISOString(),
                  delayMinutes: 18,
                  alternativeRoute: 'Tanah Rata Town Shuttle or arrive before 4:00 PM',
                },
                {
                  id: 'alert-simpang-pulai-pos-slim',
                  roadName: 'Simpang Pulai Pass (FT 185)',
                  location: 'Pos Slim Mountain Ascent',
                  status: 'smooth',
                  message: 'Gentle climbing grade behind agricultural lorries; passing lanes clear',
                  updatedAt: new Date().toISOString(),
                  delayMinutes: 6,
                  alternativeRoute: 'Utilize uphill overtaking lanes',
                },
              ]}
              language={language}
              onSelectRouteOnMap={(roadName, coords) => {
                if (coords && !isNaN(coords[0]) && !isNaN(coords[1]) && mapInstanceRef.current) {
                  setShowTrafficOverlay(false);
                  setMobileMapVisible(true);
                  setTimeout(() => {
                    mapInstanceRef.current?.flyTo(coords, 15, { duration: 1.2 });
                  }, 400);
                }
              }}
            />
            {/* Anchor Helper for smooth scroll inside overlay */}
            <div ref={(el) => {
              if (el && trafficAnchor === 'corridors') {
                const anchor = document.getElementById('corridors-comparison-anchor');
                anchor?.scrollIntoView({ behavior: 'auto' });
              }
            }} />
          </div>
        </div>
      )}

      {/* Save Map Prompt Popup */}
      {showMapPrompt && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in zoom-in-95">
          <div className="w-full max-w-sm rounded-3xl bg-stone-900 border border-emerald-500/30 p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-heading font-black text-stone-100 mb-2">Itinerary Saved!</h3>
            <p className="text-stone-400 mb-8">Would you like to open the map to see your itinerary plan on the map?</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setShowMapPrompt(false);
                  setMobileMapVisible(true);
                  setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
                }}
                className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-lg shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
              >
                YES, OPEN MAP
              </button>
              <button 
                onClick={() => setShowMapPrompt(false)}
                className="w-full py-4 rounded-2xl bg-stone-800 text-stone-300 font-bold text-lg active:scale-95 transition-all"
              >
                NOT NOW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Map Overlay for Mobile - REMOVED redundant declaration, now integrated into map canvas logic above */}

      {/* Main Container */}
      <div className="flex-1 min-h-0 flex flex-col sm:flex-row overflow-hidden relative">
        {/* Left Scrollable Pane */}
        <div
          className={`w-full sm:w-[45%] lg:w-[42%] flex flex-col flex-1 sm:flex-none sm:h-full overflow-y-auto overscroll-contain bg-stone-950 border-r border-white/10 shrink-0 z-10 transition-all ${
            mapViewMode === 'fullscreen' ? 'hidden' : 'flex'
          }`}
        >
          {/* Day Tabs */}
          <div className="p-3 sm:p-4 border-b border-white/10 bg-stone-900/60 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {plan.days.map((day, idx) => (
                <button
                  key={day.dayNumber}
                  onClick={() => {
                    setActiveDayIdx(idx);
                    setSelectedActivityId(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                    activeDayIdx === idx ? 'bg-emerald-600 text-white shadow-md' : 'bg-stone-800/80 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" /> Day {day.dayNumber}
                </button>
              ))}
              <button onClick={handleAddDay} className="px-3 py-2 rounded-xl border border-dashed border-white/20 hover:border-emerald-400 text-stone-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0">
                <Plus className="w-3.5 h-3.5" /> Add Day
              </button>
              <button
                onClick={() => {
                  setMobileMapVisible(true);
                  if (mapInstanceRef.current) {
                    setTimeout(() => {
                      mapInstanceRef.current?.invalidateSize();
                      const validCoords = enrichedActivities
                        .filter((a) => a.coordinates && typeof a.coordinates.lat === 'number' && typeof a.coordinates.lng === 'number')
                        .map((a) => [a.coordinates.lat, a.coordinates.lng] as [number, number]);
                      if (validCoords.length > 0) {
                        const bounds = L.latLngBounds(validCoords);
                        mapInstanceRef.current?.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
                      }
                    }, 200);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95 shadow-md border border-emerald-400/30"
                title="View Full Map"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-200" />
                <span>Map</span>
              </button>
            </div>

            {/* AI Advisor Trigger & Basic Stats */}
            <div className="mt-3 p-3 rounded-2xl bg-stone-900/90 border border-white/5 flex items-center justify-between text-xs">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-stone-300 font-medium flex-wrap">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Travel: <strong className="text-white font-mono">~{totalDrivingMins} mins</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTrafficAnchor('telemetry');
                        setShowTrafficOverlay(true);
                      }}
                      className="px-2.5 py-0.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-300 hover:text-white font-mono text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                      title="Open Live Road Telemetry"
                    >
                      <Car className="w-3 h-3 text-emerald-400" />
                      <span>Live Road Telemetry</span>
                    </button>
                  </div>
                  
                  {/* Mobile Only Budget & Save Buttons */}
                  <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                    <div className="bg-[#2a1d15] px-3 py-1.5 rounded-full border border-amber-900/30 text-[#d4af37] font-black text-[10px] shadow-lg">
                      RM {totalDayCost}
                    </div>
                    <button 
                      onClick={handleSaveItinerary}
                      className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg active:scale-90 transition-transform flex items-center justify-center border border-emerald-500/30"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-[10px] font-mono ml-6">
                  <span className="text-stone-500">{totalDistanceKm} km • {enrichedActivities.length} stops</span>
                  <div className="w-1 h-1 rounded-full bg-stone-700" />
                  <span className="text-amber-400 font-bold sm:inline hidden">Budget: RM {totalDayCost}</span>
                </div>
              </div>

              <div className="flex gap-1 hidden sm:flex">
                <button 
                  onClick={handleAnalyzeRoute}
                  disabled={isAnalyzing || enrichedActivities.length < 2}
                  className="px-1.5 py-1 sm:px-3 sm:py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 text-[9px] sm:text-xs"
                >
                  <Bot className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                  Analyze
                </button>
                <button 
                  onClick={handleAutoOptimize}
                  disabled={isAnalyzing || enrichedActivities.length < 2}
                  className="px-1.5 py-1 sm:px-3 sm:py-1.5 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-300 font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 text-[9px] sm:text-xs"
                  title="Geographically organize route"
                >
                  <Zap className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                  Optimize
                </button>
              </div>
            </div>

            {/* Active Starting Location Pill */}
            <div
              onClick={() => setShowLocationPickerModal(true)}
              className="mt-2 p-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-950/60 to-cyan-950/60 border border-blue-500/30 hover:border-cyan-400 flex items-center justify-between text-xs cursor-pointer transition-all group"
              title="Click to change your starting location in Cameron Highlands"
            >
              <div className="flex items-center gap-2 truncate">
                <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:rotate-45 transition-transform" />
                <span className="text-blue-200 font-bold truncate">
                  Start: {userLocation ? userLocation.label : 'Select Highland Start Location'}
                </span>
              </div>
              <span className="text-[10px] font-bold text-cyan-300 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-400/30 shrink-0 ml-1">
                Change 📍
              </span>
            </div>
          </div>

          {/* AI Insights Results Panel */}
          {showAiPanel && aiInsights.length > 0 && (
            <div className="shrink-0 p-3 sm:p-4 bg-indigo-950/20 border-b border-indigo-500/20 space-y-2">
              {aiInsights.map((insight, i) => (
                <div key={i} className={`p-3 rounded-xl flex items-start gap-2.5 border text-xs leading-relaxed
                  ${insight.type === 'alert' ? 'bg-rose-950/50 border-rose-500/30 text-rose-200' :
                    insight.type === 'tip' ? 'bg-cyan-950/50 border-cyan-500/30 text-cyan-200' :
                    insight.type === 'warning' ? 'bg-amber-950/50 border-amber-500/30 text-amber-200' :
                    'bg-emerald-950/50 border-emerald-500/30 text-emerald-200'
                  }`}
                >
                  {insight.type === 'alert' && <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />}
                  {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />}
                  {insight.type === 'tip' && <Bike className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />}
                  {insight.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />}
                  <span>{insight.msg}</span>
                </div>
              ))}
            </div>
          )}

          {/* Activity Drag/Drop Container */}
          <div className="flex-1 p-3 sm:p-4 space-y-3">
            {enrichedActivities.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-white/10 bg-stone-900/40">
                <Compass className="w-10 h-10 text-stone-600 mx-auto mb-3" />
                <h4 className="font-bold text-sm text-stone-300 mb-1">No activities for Day {currentDay?.dayNumber}</h4>
                <button onClick={() => setShowAddModal(true)} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors">
                  <Plus className="w-4 h-4" /> Add First Activity
                </button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={enrichedActivities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {enrichedActivities.map((act, idx) => (
                       <SortableActivityItem
                        key={act.id}
                        activity={act}
                        index={idx}
                        total={enrichedActivities.length}
                        isSelected={act.id === selectedActivityId}
                        isPc={window.innerWidth >= 640}
                        onSelect={() => {
                          setSelectedActivityId(act.id);
                          if (act.coordinates && !isNaN(act.coordinates.lat) && !isNaN(act.coordinates.lng)) {
                            mapInstanceRef.current?.setView([act.coordinates.lat, act.coordinates.lng], 15);
                          }
                        }}
                        onRemove={() => handleRemove(act.id)}
                        onMoveUp={() => handleMove(idx, 'up')}
                        onMoveDown={() => handleMove(idx, 'down')}
                        onTimeChange={(newTime) => {
                          const safeActivities = currentDay?.activities || [];
                          const updated = safeActivities.map((a) => (a.id === act.id ? { ...a, timeSlot: newTime } : a));
                          updateCurrentDayActivities(updated);
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Add Stop Button */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-stone-900/60 shrink-0">
            <button onClick={() => setShowAddModal(true)} className="w-full py-2.5 rounded-xl border border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
              <Plus className="w-4 h-4" /> Add Stop to Day {currentDay?.dayNumber}
            </button>
          </div>

          {/* Traffic & Corridors Section - Hidden on mobile, only accessible via hamburger */}
          <div className="hidden sm:block p-3 sm:p-4 border-t border-white/10 bg-stone-900/60 shrink-0">
            <div id="traffic-section" className="scroll-mt-20">
              <TrafficWidget
                alerts={trafficAlerts.length > 0 ? trafficAlerts : [
                  {
                    id: 'alert-kea-farm-gridlock',
                    roadName: 'Central Spine (FT 59)',
                    location: 'Kea Farm Agro Market Zone',
                    status: 'heavy',
                    message: 'Kea Farm Agro Bazaar Parking Spillover & Pedestrian Crossing Bottleneck',
                    updatedAt: new Date().toISOString(),
                    delayMinutes: 28,
                    alternativeRoute: 'Habu / Boh Bypass or arrive before 9:30 AM',
                  },
                  {
                    id: 'alert-tapah-lata-iskandar',
                    roadName: 'Tapah Pass (FT 59)',
                    location: 'Lata Iskandar Waterfall Hairpins',
                    status: 'moderate',
                    message: 'Winding 300+ hairpin turns with roadside fruit stall pull-ins',
                    updatedAt: new Date().toISOString(),
                    delayMinutes: 16,
                    alternativeRoute: 'FT 185 Simpang Pulai Dual-Carriageway',
                  },
                  {
                    id: 'alert-golden-hills-pasarmalam',
                    roadName: 'Brinchang Link (FT 59)',
                    location: 'Golden Hills Night Market Strip',
                    status: 'heavy',
                    message: 'Weekend Pasar Malam roadside parking congestion',
                    updatedAt: new Date().toISOString(),
                    delayMinutes: 18,
                    alternativeRoute: 'Tanah Rata Town Shuttle or arrive before 4:00 PM',
                  },
                ]}
                language={language}
                onSelectRouteOnMap={(roadName, coords) => {
                  if (coords && !isNaN(coords[0]) && !isNaN(coords[1]) && mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo(coords, 15, { duration: 1.2 });
                    setMobileView('map');
                  }
                }}
              />
            </div>
            <div id="corridors-comparison" className="h-1" />
          </div>
        </div>

        <div
          ref={miniMapRef}
          style={
            mapViewMode === 'minimized' && miniMapPos
              ? { left: `${miniMapPos.x}px`, top: `${miniMapPos.y}px`, position: 'fixed', zIndex: 350 }
              : undefined
          }
          className={
            mobileMapVisible
              ? 'fixed inset-0 z-[900] bg-stone-900 flex flex-col animate-in slide-in-from-bottom overflow-hidden w-screen h-screen'
              : mapViewMode === 'fullscreen'
              ? 'fixed inset-2 sm:inset-6 z-[550] bg-stone-900 rounded-3xl overflow-hidden border-2 border-white/30 shadow-2xl flex flex-col'
              : mapViewMode === 'minimized'
              ? `fixed ${miniMapPos ? '' : 'bottom-6 right-6'} w-[280px] h-[200px] sm:w-[320px] sm:h-[260px] z-[350] rounded-3xl border-2 border-white/30 bg-stone-900 shadow-2xl overflow-hidden flex flex-col sm:flex`
              : 'relative flex-1 w-full h-full min-h-[350px] sm:min-h-0 bg-stone-900 rounded-3xl overflow-hidden border border-white/20 shadow-2xl hidden sm:flex'
          }
        >
          {/* Header Bar when mobileMapVisible is active */}
          {mobileMapVisible && (
            <div className="absolute top-0 left-0 right-0 z-[920] p-3 sm:p-4 bg-stone-900/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-2 shadow-xl">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-black text-xs sm:text-sm text-stone-100 truncate">
                    Itinerary Route Map • Day {currentDay?.dayNumber}
                  </h3>
                  <p className="text-[10px] text-stone-400 truncate">
                    {enrichedActivities.length} stops • {totalDistanceKm} km • ~{totalDrivingMins} mins drive
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setMobileMapVisible(false)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-white/10 text-stone-200 hover:text-white shadow-lg active:scale-95 transition-all shrink-0 cursor-pointer"
                title="Close Map"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Draggable Handle for Mini Map (Mobile focus - hidden if full map) */}
          {mapViewMode === 'minimized' && !mobileMapVisible && (
            <div 
              onMouseDown={(e) => handleStartMiniMapDrag(e.clientX, e.clientY)}
              onTouchStart={(e) => handleStartMiniMapDrag(e.touches[0].clientX, e.touches[0].clientY)}
              className="absolute top-0 left-0 right-0 h-8 bg-stone-900/80 backdrop-blur-md z-[360] flex items-center justify-center cursor-move border-b border-white/10"
            >
              <div className="w-10 h-1 bg-stone-600 rounded-full" />
            </div>
          )}

          {/* Map Type Toggle floating pill */}
          <div className={`absolute ${mobileMapVisible ? 'top-20 right-4' : 'top-10 right-3'} z-[920] flex flex-col gap-1.5`}>
            <button
              onClick={() => setActiveTile('osm')}
              className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                activeTile === 'osm' 
                  ? 'bg-emerald-600 border-emerald-400 text-white' 
                  : 'bg-stone-900/80 border-white/10 text-stone-400 hover:text-white'
              }`}
              title="Standard Map"
            >
              <Route className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTile('satellite')}
              className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                activeTile === 'satellite' 
                  ? 'bg-emerald-600 border-emerald-400 text-white' 
                  : 'bg-stone-900/80 border-white/10 text-stone-400 hover:text-white'
              }`}
              title="Satellite View"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTile('terrain')}
              className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                activeTile === 'terrain' 
                  ? 'bg-emerald-600 border-emerald-400 text-white' 
                  : 'bg-stone-900/80 border-white/10 text-stone-400 hover:text-white'
              }`}
              title="Terrain Map"
            >
              <Mountain className="w-4 h-4" />
            </button>
          </div>

          <div ref={mapContainerRef} className={`w-full h-full ${mobileMapVisible ? 'pt-14 pb-[38vh]' : ''}`} />

          {/* Scrollable Activities Drawer Sheet at Bottom of Mobile Full Map */}
          {mobileMapVisible && (
            <div className="absolute bottom-0 left-0 right-0 z-[920] max-h-[38vh] bg-stone-900/95 backdrop-blur-xl border-t border-white/15 rounded-t-3xl p-3 sm:p-4 shadow-2xl flex flex-col">
              <div className="w-10 h-1 bg-stone-600 rounded-full mx-auto mb-2 shrink-0" />
              <div className="flex items-center justify-between mb-2 shrink-0">
                <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-emerald-400" />
                  Day {currentDay?.dayNumber} Selected Places ({enrichedActivities.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Tap stop to locate
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {enrichedActivities.length === 0 ? (
                  <div className="text-center py-6 text-xs text-stone-500 font-medium">
                    No places added to Day {currentDay?.dayNumber} yet.
                  </div>
                ) : (
                  enrichedActivities.map((act, idx) => (
                    <button
                      key={act.id}
                      onClick={() => {
                        setSelectedActivityId(act.id);
                        if (act.coordinates?.lat && act.coordinates?.lng && mapInstanceRef.current) {
                          mapInstanceRef.current.flyTo([act.coordinates.lat, act.coordinates.lng], 16, { duration: 1 });
                        }
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        selectedActivityId === act.id
                          ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-md'
                          : 'bg-stone-800/80 hover:bg-stone-800 border-white/5 text-stone-200'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-emerald-500 text-stone-950 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs truncate">{act.title}</div>
                        <div className="text-[10px] text-stone-400 flex items-center gap-2 mt-0.5">
                          <span>📍 {act.township}</span>
                          <span>•</span>
                          <span>⏰ {act.timeSlot || '09:00 AM'}</span>
                          {act.distanceFromPrevKm ? (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400">{act.distanceFromPrevKm} km</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded-lg shrink-0">
                        Locate 📍
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {saveToast && (
        <div className="fixed bottom-6 right-6 z-[600] flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-2xl animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4" /> Itinerary successfully saved!
        </div>
      )}

      {/* Starting Location Picker Modal */}
      {showLocationPickerModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-stone-900 border border-blue-500/30 p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowLocationPickerModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-heading font-black text-stone-100">
                  Select Highland Starting Point
                </h3>
                <p className="text-[11px] text-stone-400">
                  Choose your hotel, landmark, or fetch device GPS
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  handleDetectCurrentLocation(false);
                  setShowLocationPickerModal(false);
                }}
                disabled={isLocating}
                className="w-full py-3 px-4 rounded-2xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 text-xs font-bold flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className={`w-4 h-4 text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Detecting GPS...' : 'Detect Device GPS Location'}</span>
                </div>
                <span className="text-[10px] font-mono bg-blue-500/30 px-2 py-0.5 rounded text-cyan-300">GPS</span>
              </button>

              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pt-2">
                Popular Starting Hotels & Hubs
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {CAMERON_STARTING_POINTS.map((pt) => (
                  <button
                    key={pt.name}
                    type="button"
                    onClick={() => {
                      handleSetUserLocation({
                        lat: pt.lat,
                        lng: pt.lng,
                        township: pt.township,
                        label: pt.name,
                      });
                      setShowLocationPickerModal(false);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-stone-800/80 hover:bg-stone-800 border border-white/5 hover:border-blue-500/40 text-xs text-stone-200 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-stone-100 group-hover:text-cyan-300 transition-colors">
                        {pt.name}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        📍 {pt.township}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Select →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-stone-900 border border-emerald-500/30 p-6 shadow-2xl relative my-8">
            <button
              onClick={handleCloseAddModal}
              className="absolute top-5 right-5 p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-heading font-black text-stone-100">
                  Add Activity to Day {currentDay?.dayNumber}
                </h3>
                <p className="text-[11px] text-stone-400">
                  Select a verified directory place or enter your own custom stop
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  if (userLocation) {
                    addCurrentLocationAsStop(userLocation);
                    setShowAddModal(false);
                  } else {
                    handleDetectCurrentLocation(true);
                    setShowAddModal(false);
                  }
                }}
                disabled={isLocating}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-cyan-900/80 hover:from-blue-800 hover:to-cyan-800 border border-blue-400/40 text-blue-100 text-xs font-bold flex items-center justify-between cursor-pointer transition-all shadow-xl group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-cyan-300 border border-blue-400/30 flex items-center justify-center shrink-0">
                    <Compass className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-white text-xs">
                      📍 Use Automatic Current GPS Location
                    </div>
                    <div className="text-[10px] text-blue-300 font-normal">
                      {userLocation ? `Detected: ${userLocation.township}` : 'Click to fetch device GPS position & insert as stop'}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-lg bg-blue-500/30 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 border border-blue-400/30">
                  GPS Auto
                </span>
              </button>

              <div ref={searchContainerRef} className="relative">
                <label className="text-xs font-bold text-stone-300 block mb-1.5 flex items-center justify-between">
                  <span>Destination / Activity</span>
                  {selectedPlaceId && (
                    <span className="text-[10px] text-emerald-400 font-mono">Directory Place Selected</span>
                  )}
                </label>

                {(() => {
                  const selectedPlace = allPlaces.find((p) => p.id === selectedPlaceId);
                  if (selectedPlace) {
                    return (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-stone-900 border border-emerald-500/40 shadow-xl space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                            </span>
                            <span className="text-[11px] font-bold text-amber-300 font-mono uppercase tracking-wider">
                              Pinned on Map for Confirmation
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                            Visual Verified
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={selectedPlace.imageUrl}
                              alt={selectedPlace.name}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=120&q=80';
                              }}
                              className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-emerald-500/30 shadow-md"
                            />
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-stone-100 truncate">
                                {selectedPlace.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-stone-400">
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {selectedPlace.township}
                                </span>
                                {selectedPlace.elevation && (
                                  <span className="font-mono text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-300">
                                    {selectedPlace.elevation}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPlaceId('');
                                setSearchQuery('');
                                setIsSearchOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer border border-white/10 text-center"
                            >
                              Change
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="relative">
                      <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-stone-800 border border-white/15 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                        <Search className="w-4 h-4 text-emerald-400 shrink-0" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setIsSearchOpen(true);
                          }}
                          onFocus={() => setIsSearchOpen(true)}
                          placeholder="Search directory places (e.g. BOH, Kea Farm) or type name..."
                          className="w-full bg-transparent text-xs text-stone-100 placeholder:text-stone-500 outline-none"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {isSearchOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-2xl bg-stone-900 border border-emerald-500/30 p-2 shadow-2xl z-50 space-y-1 backdrop-blur-xl">
                          {searchQuery.trim().length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomTitle(searchQuery.trim());
                                setSelectedPlaceId('');
                                setIsSearchOpen(false);
                              }}
                              className="w-full text-left p-2.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-between cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span className="truncate">
                                  Use custom activity: <strong>"{searchQuery.trim()}"</strong>
                                </span>
                              </div>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                                Custom
                              </span>
                            </button>
                          )}

                          <div className="px-2 py-1 text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                            Verified Places ({filteredDirectoryPlaces.length})
                          </div>

                          {filteredDirectoryPlaces.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPlaceId(p.id);
                                setCustomTitle('');
                                setSearchQuery('');
                                setIsSearchOpen(false);
                              }}
                              className="w-full text-left p-2 rounded-xl hover:bg-stone-800/90 flex items-center gap-3 text-xs text-stone-200 transition-colors group cursor-pointer border border-transparent hover:border-emerald-500/20"
                            >
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=120&q=80';
                                }}
                                className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-stone-100 truncate group-hover:text-emerald-300 transition-colors">
                                  {p.name}
                                </div>
                                <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5 truncate">
                                  <span className="text-emerald-400">📍 {p.township}</span>
                                  {p.elevation && (
                                    <span className="font-mono text-[10px] bg-stone-800 px-1 rounded text-stone-300">
                                      {p.elevation}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {!selectedPlaceId && (
                <div className="p-3.5 rounded-2xl bg-stone-800/50 border border-white/5 space-y-3">
                  <div className="text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Custom Stop Settings</span>
                    <span className="text-amber-400 text-[10px]">Manual input mode</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">
                      Activity / Place Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sunrise Breakfast at Local Kopitiam"
                      value={customTitle}
                      onChange={(e) => {
                        setCustomTitle(e.target.value);
                        setSelectedPlaceId('');
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">
                      Township Hub
                    </label>
                    <select
                      value={customTownship}
                      onChange={(e) => setCustomTownship(e.target.value as Township)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Brinchang">Brinchang (1,540 m)</option>
                      <option value="Tanah Rata">Tanah Rata (1,440 m)</option>
                      <option value="Kea Farm">Kea Farm (1,610 m)</option>
                      <option value="Ringlet">Ringlet (1,135 m)</option>
                      <option value="Tringkap">Tringkap (1,490 m)</option>
                      <option value="Kampung Raja">Kampung Raja (1,280 m)</option>
                      <option value="Kuala Terla">Kuala Terla (1,320 m)</option>
                      <option value="Bertam Valley">Bertam Valley (1,080 m)</option>
                      <option value="Blue Valley">Blue Valley (1,350 m)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">
                  Time Slot
                </label>
                <input
                  type="text"
                  value={activityTimeSlot}
                  onChange={(e) => setActivityTimeSlot(e.target.value)}
                  placeholder="e.g. 10:00 AM"
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs font-mono text-stone-100 outline-none focus:border-emerald-500 mb-2"
                />

                <div className="flex flex-wrap gap-1.5">
                  {['08:30 AM', '10:00 AM', '01:00 PM', '03:30 PM', '06:00 PM'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setActivityTimeSlot(slot)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                        activityTimeSlot === slot
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-300 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddActivity}
                  disabled={!selectedPlaceId && !customTitle.trim() && !searchQuery.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white cursor-pointer transition-all shadow-md"
                >
                  Add to Itinerary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};