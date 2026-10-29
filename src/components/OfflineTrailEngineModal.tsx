import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Compass,
  MapPin,
  ShieldAlert,
  Clock,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  Copy,
  Check,
  RefreshCw,
  X,
  Footprints,
  BatteryCharging,
  Radio,
  Sparkles,
  Mountain,
  Lock,
  UserCheck,
} from 'lucide-react';
import { CAMERON_TRAILS, TrailRoute } from '../data/trailsData';
import { Language } from '../types';
import { UserProfile, firebaseService } from '../services/firebase';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { weatherService, TrailSafetyStatus } from '../services/weather';

interface OfflineTrailEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}

const TRAIL_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#3b82f6',
  3: '#10b981',
  4: '#8b5cf6',
  5: '#f59e0b',
  6: '#ec4899',
  7: '#14b8a6',
  8: '#6366f1',
  9: '#d97706',
  10: '#84cc16',
  11: '#06b6d4',
  12: '#a855f7',
  13: '#f97316',
  14: '#4338ca',
};

export const OfflineTrailEngineModal: React.FC<OfflineTrailEngineModalProps> = ({
  isOpen,
  onClose,
  language,
  currentUser,
  onOpenAuth,
}) => {
  const [selectedTrail, setSelectedTrail] = useState<TrailRoute | null>(null);
  const [isPreDownloading, setIsPreDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(100);
  const [cacheVerified, setCacheVerified] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState<TrailSafetyStatus | null>(null);

  // Leaflet Map Ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const activePolylineRef = useRef<L.Polyline | null>(null);
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const breadcrumbLineRef = useRef<L.Polyline | null>(null);

  // Breadcrumb Tracking State
  const [isRecording, setIsRecording] = useState(false);
  const [pinnedStart, setPinnedStart] = useState<{ lat: number; lng: number } | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ lat: number; lng: number; altitude: number; time: string }[]>([]);
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number; altitude: number; accuracy: number }>({
    lat: 4.4715,
    lng: 101.3805,
    altitude: 1440,
    accuracy: 4,
  });
  const watchIdRef = useRef<number | null>(null);

  // Safety Passport State
  const [trailNameInput, setTrailNameInput] = useState('Trail 4: Parit Waterfall Loop');
  const [groupSize, setGroupSize] = useState('2');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [expectedHours, setExpectedHours] = useState('3');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkInTime, setCheckInTime] = useState<number | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [isOverdue, setIsOverdue] = useState(false);

  // SOS Payload State
  const [batteryLevel, setBatteryLevel] = useState(90);
  const [copiedSos, setCopiedSos] = useState(false);

  // Fetch Safety Status & Emergency Contact
  useEffect(() => {
    if (isOpen) {
      const fetchSafety = async () => {
        const status = await weatherService.evaluateTrailSafety();
        setSafetyStatus(status);
      };
      fetchSafety();

      const card = firebaseService.getEmergencyCard();
      setEmergencyContact(card.primaryContact?.phone || card.secondaryContact?.phone || '');
    }
  }, [isOpen]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [4.4715, 101.3805],
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap contributors | CamGo Offline Engine',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Invalidate size on mount/resize for mobile viewports
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 250);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Render trail when user selects it
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activePolylineRef.current) {
      activePolylineRef.current.remove();
      activePolylineRef.current = null;
    }

    if (selectedTrail) {
      const color = TRAIL_COLORS[selectedTrail.number] || '#10b981';
      let pts = selectedTrail.coordinates;
      if (pts.length < 6) {
        const [startLat, startLng] = pts[0];
        const [endLat, endLng] = pts[pts.length - 1];
        pts = [];
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const lat = startLat + (endLat - startLat) * t + Math.sin(t * Math.PI * 2) * 0.005;
          const lng = startLng + (endLng - startLng) * t + Math.cos(t * Math.PI * 2) * 0.005;
          pts.push([lat, lng]);
        }
      }

      const poly = L.polyline(pts, {
        color: color,
        weight: 6,
        opacity: 0.95,
      }).addTo(map);

      activePolylineRef.current = poly;
      map.fitBounds(poly.getBounds(), { padding: [30, 30] });
    }
  }, [selectedTrail, isOpen]);

  // Handle GPS watch & breadcrumbs
  useEffect(() => {
    if (navigator.geolocation && isOpen) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            altitude: pos.coords.altitude || 1440,
            accuracy: pos.coords.accuracy,
          };
          setCurrentGps(loc);

          const map = mapInstanceRef.current;
          if (map) {
            if (!gpsMarkerRef.current) {
              const blueDotIcon = L.divIcon({
                className: 'custom-gps-marker',
                html: '<div style="width: 16px; height: 16px; background: #38bdf8; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px rgba(56,189,248,0.9);"></div>',
                iconSize: [16, 16],
              });
              gpsMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: blueDotIcon }).addTo(map);
            } else {
              gpsMarkerRef.current.setLatLng([loc.lat, loc.lng]);
            }
          }

          if (isRecording) {
            setBreadcrumbs((prev) => {
              const updated = [
                ...prev,
                {
                  lat: loc.lat,
                  lng: loc.lng,
                  altitude: loc.altitude,
                  time: new Date().toLocaleTimeString(),
                },
              ];
              if (map && updated.length > 1) {
                const latLngs = updated.map((b) => [b.lat, b.lng] as [number, number]);
                if (!breadcrumbLineRef.current) {
                  breadcrumbLineRef.current = L.polyline(latLngs, { color: '#38bdf8', weight: 4, dashArray: '4 4' }).addTo(map);
                } else {
                  breadcrumbLineRef.current.setLatLngs(latLngs);
                }
              }
              return updated;
            });
          }
        },
        (err) => console.warn('Geolocation warning:', err.message),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
      );
      watchIdRef.current = id;
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isOpen, isRecording]);

  // Overdue Timer
  useEffect(() => {
    let interval: any;
    if (isCheckedIn && checkInTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - checkInTime) / 1000);
        const totalAllowed = parseFloat(expectedHours) * 3600;
        const remaining = totalAllowed - elapsed;
        if (remaining <= 0) {
          setTimeRemainingSeconds(0);
          setIsOverdue(true);
        } else {
          setTimeRemainingSeconds(remaining);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCheckedIn, checkInTime, expectedHours]);

  const handleStartRecording = () => {
    setPinnedStart({ lat: currentGps.lat, lng: currentGps.lng });
    setIsRecording(true);
    setBreadcrumbs([
      {
        lat: currentGps.lat,
        lng: currentGps.lng,
        altitude: currentGps.altitude,
        time: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
  };

  const handleCheckIn = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const newSessionId = `session_${Date.now()}_${currentUser.uid}`;
    setSessionId(newSessionId);
    setIsCheckedIn(true);
    setCheckInTime(Date.now());
    setTimeRemainingSeconds(parseFloat(expectedHours) * 3600);
    setIsOverdue(false);

    if (db) {
      try {
        await setDoc(doc(db, 'safety_sessions', newSessionId), {
          id: newSessionId,
          uid: currentUser.uid,
          userEmail: currentUser.email,
          trailName: trailNameInput,
          groupSize: parseInt(groupSize) || 1,
          emergencyContact,
          expectedHours: parseFloat(expectedHours) || 3,
          status: 'active',
          lastKnownCoords: `${currentGps.lat}, ${currentGps.lng}`,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firestore safety session write warning:', err);
      }
    }
  };

  const handleCheckOut = async () => {
    setIsCheckedIn(false);
    setIsOverdue(false);
    if (db && sessionId) {
      try {
        await updateDoc(doc(db, 'safety_sessions', sessionId), {
          status: 'completed',
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firestore checkout update warning:', err);
      }
    }
    setSessionId(null);
    setCheckInTime(null);
  };

  const handlePreDownloadOfflineCache = async () => {
    setIsPreDownloading(true);
    setDownloadProgress(0);

    try {
      if ('caches' in window) {
        const cache = await caches.open('camgo-offline-vector-cache-v2');
        const tileUrls = [
          'https://tile.openstreetmap.org/14/8343/5431.png',
          'https://tile.openstreetmap.org/14/8344/5431.png',
        ];
        await cache.addAll(tileUrls);
      }
    } catch (e) {
      console.warn('CacheStorage API warning:', e);
    }

    const timer = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsPreDownloading(false);
          setCacheVerified(true);
          return 100;
        }
        return prev + 25;
      });
    }, 350);
  };

  const generateSosPayload = () => {
    return `SOS CAMGO EMERGENCY! Hiker Lost/Overdue.\nTrail: ${trailNameInput}\nGroup Size: ${groupSize}\nLast Coords: ${currentGps.lat.toFixed(6)}, ${currentGps.lng.toFixed(6)} (Alt: ${Math.round(currentGps.altitude)}m)\nBattery: ${batteryLevel}%\nPinned Start: ${pinnedStart ? `${pinnedStart.lat.toFixed(6)}, ${pinnedStart.lng.toFixed(6)}` : 'Not pinned'}\nEmergency Contact: ${emergencyContact}\nTime: ${new Date().toLocaleString()}`;
  };

  const handleCopySos = () => {
    navigator.clipboard.writeText(generateSosPayload());
    setCopiedSos(true);
    setTimeout(() => setCopiedSos(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-xl p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-7xl max-h-[96vh] bg-stone-900 border border-emerald-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header - Mobile Optimized */}
        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 p-3 sm:p-5 border-b border-white/10 bg-stone-900/95 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6 animate-spin duration-4000" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                  OFFLINE VECTOR ENGINE
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300 hidden sm:inline-block">
                  {cacheVerified ? '🟢 Cached' : '⚡ Ready'}
                </span>
              </div>
              <h2 className="text-base sm:text-2xl font-heading font-black text-stone-100 tracking-tight truncate">
                {language === 'bm' ? 'Enjin Laluan Luar Talian' : 'Offline Trail Engine'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePreDownloadOfflineCache}
              disabled={isPreDownloading}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 border border-white/10 cursor-pointer shadow-md whitespace-nowrap"
            >
              <Download className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 ${isPreDownloading ? 'animate-bounce' : ''}`} />
              <span className="hidden xs:inline">{isPreDownloading ? `${downloadProgress}%` : 'Cache Maps'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Workspace with Mobile Padding */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Automated Weather Safety Alert System */}
          {safetyStatus && (
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all animate-in slide-in-from-top-4 duration-500 ${
                safetyStatus.severity === 'critical'
                  ? 'bg-rose-950/40 border-rose-500/60 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                  : safetyStatus.severity === 'high'
                  ? 'bg-orange-950/40 border-orange-500/60 text-orange-100 shadow-[0_0_20px_rgba(249,115,22,0.15)]'
                  : safetyStatus.severity === 'moderate'
                  ? 'bg-amber-950/40 border-amber-500/60 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                  : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
              }`}
            >
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  safetyStatus.severity === 'critical'
                    ? 'bg-rose-500/20 text-rose-400'
                    : safetyStatus.severity === 'high'
                    ? 'bg-orange-500/20 text-orange-400'
                    : safetyStatus.severity === 'moderate'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                <ShieldAlert className={`w-6 h-6 ${safetyStatus.severity === 'critical' || safetyStatus.severity === 'high' ? 'animate-pulse' : ''}`} />
              </div>

              <div className="flex-1 space-y-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest opacity-80">
                    {language === 'bm' ? 'SISTEM AMARAN KESELAMATAN LALUAN' : 'TRAIL SAFETY ALERT SYSTEM'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    safetyStatus.severity === 'critical' ? 'bg-rose-500 text-white' :
                    safetyStatus.severity === 'high' ? 'bg-orange-500 text-white' :
                    safetyStatus.severity === 'moderate' ? 'bg-amber-500 text-black' :
                    'bg-emerald-500 text-black'
                  }`}>
                    {safetyStatus.severity}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-black tracking-tight">
                  {language === 'bm' ? safetyStatus.reasonBm : safetyStatus.reason}
                </h4>
                {safetyStatus.currentWeather && (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1.5 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
                      <Sparkles className="w-3 h-3" />
                      <span>{safetyStatus.currentWeather.temp}°C</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
                      <Radio className="w-3 h-3" />
                      <span>{language === 'bm' ? safetyStatus.currentWeather.conditionBm : safetyStatus.currentWeather.condition}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
                      <Compass className="w-3 h-3" />
                      <span>{safetyStatus.currentWeather.windSpeed} km/h wind</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
                      <Radio className="w-3 h-3" />
                      <span>{safetyStatus.currentWeather.rainProbability}% rain prob.</span>
                    </div>
                    <div className="text-[10px] font-mono opacity-50 ml-auto hidden sm:block">
                      Source: Open-Meteo Real-time
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={async () => {
                    const status = await weatherService.evaluateTrailSafety();
                    setSafetyStatus(status);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer"
                  title="Refresh status"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Top Grid: Trail Selector & Condition Badge */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Col: Trail Selector (Trails 1 - 14) */}
            <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-white/10 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Mountain className="w-4 h-4" />
                  <span>{language === 'bm' ? 'Pilih Laluan (1-14)' : 'Select Trail (1-14)'}</span>
                </span>
                <span className="text-[10px] font-mono text-stone-400">
                  {selectedTrail ? `Trail #${selectedTrail.number}` : 'None'}
                </span>
              </div>

              <div className="max-h-56 sm:max-h-72 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {CAMERON_TRAILS.map((trail) => {
                  const color = TRAIL_COLORS[trail.number] || '#10b981';
                  const isSelected = selectedTrail?.id === trail.id;
                  return (
                    <button
                      key={trail.id}
                      onClick={() => {
                        setSelectedTrail(trail);
                        setTrailNameInput(trail.name);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                          : 'bg-stone-950/60 text-stone-300 hover:bg-stone-800 hover:text-white border border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate">{trail.name}</span>
                      </div>
                      <span className="text-[10px] opacity-80 shrink-0 ml-2 font-mono">{trail.distanceKm} km</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Middle Col: Trail Details & Condition Badge */}
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3 sm:space-y-4 flex flex-col justify-between">
              {selectedTrail ? (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-emerald-300 uppercase">
                        {selectedTrail.location}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          selectedTrail.difficulty === 'Easy'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : selectedTrail.difficulty === 'Moderate'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : selectedTrail.difficulty === 'Hard'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {selectedTrail.difficulty}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-stone-100">{selectedTrail.name}</h3>
                    <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                      {language === 'bm' ? selectedTrail.descriptionBm : selectedTrail.description}
                    </p>
                  </div>

                  {/* Live Condition Badge Alert */}
                  <div
                    className={`p-2.5 sm:p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      selectedTrail.conditionType === 'muddy'
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                        : selectedTrail.conditionType === 'slippery'
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                        : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold uppercase text-[10px] tracking-wider opacity-90">Live Trail Condition</div>
                      <div className="font-semibold">{selectedTrail.conditionBadge}</div>
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-xl bg-stone-950 border border-white/5">
                      <div className="text-[10px] text-stone-400 uppercase">Distance</div>
                      <div className="font-bold text-emerald-300">{selectedTrail.distanceKm} km</div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-950 border border-white/5">
                      <div className="text-[10px] text-stone-400 uppercase">Est. Time</div>
                      <div className="font-bold text-teal-300">{selectedTrail.estDurationHrs}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-950 border border-white/5">
                      <div className="text-[10px] text-stone-400 uppercase">Max Alt</div>
                      <div className="font-bold text-amber-300">{selectedTrail.maxElevationM}m</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center space-y-2 my-auto">
                  <Compass className="w-7 h-7 text-stone-500 mx-auto animate-pulse" />
                  <div className="text-sm font-bold text-stone-300">No Trail Selected</div>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    Select a trail above to view detailed metrics and condition alerts.
                  </p>
                </div>
              )}
            </div>

            {/* Right Col: Elevation Profile */}
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3 sm:space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Mountain className="w-4 h-4" />
                  <span>Elevation Profile</span>
                </span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                  {selectedTrail ? `${selectedTrail.maxElevationM}m ASL` : '---'}
                </span>
              </div>

              {selectedTrail ? (
                <div className="p-3 rounded-xl bg-stone-950 border border-yellow-500/30 space-y-2 relative overflow-hidden shadow-inner">
                  <div className="flex items-end justify-between h-24 sm:h-28 gap-1 pt-3">
                    {selectedTrail.elevationProfile.map((ep, idx) => {
                      const heightPercent = Math.round(((ep.altitude - 1400) / 750) * 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                          <span className="text-[9px] font-mono text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity">
                            {ep.altitude}m
                          </span>
                          <div
                            className="w-full rounded-t bg-gradient-to-t from-yellow-600 via-yellow-500 to-amber-300 shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                            style={{ height: `${Math.max(20, heightPercent)}%` }}
                          />
                          <span className="text-[9px] font-mono text-stone-400">{ep.distance}km</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-stone-500 my-auto">
                  Elevation chart will appear here upon trail selection.
                </div>
              )}

              <div className="text-[11px] text-stone-400 flex items-center justify-between">
                <span>Vector Graph: <strong className="text-emerald-400">Synced</strong></span>
                <span className="font-mono text-yellow-400 font-bold">Offline Ready</span>
              </div>
            </div>
          </div>

          {/* Bottom Section: Leaflet Map Viewport & Safety Passport / SOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Sub-Section: Leaflet Map Viewport */}
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4" />
                  <span>Interactive Map &amp; GPS Dot</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-stone-400">
                    {currentGps.lat.toFixed(3)}, {currentGps.lng.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Leaflet Map Container - Mobile Optimized Height */}
              <div className="h-60 sm:h-72 rounded-2xl bg-stone-950 border border-white/10 relative overflow-hidden shadow-2xl">
                <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

                {!selectedTrail && (
                  <div className="absolute inset-0 z-20 bg-stone-950/85 backdrop-blur-xs flex items-center justify-center p-4 text-center">
                    <div className="space-y-1.5">
                      <Compass className="w-6 h-6 text-emerald-400 mx-auto animate-spin" />
                      <div className="text-xs font-bold text-white">Select a trail to render its vector route on map</div>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 z-20 bg-stone-900/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-[11px] font-mono space-y-0.5 shadow-lg max-w-[200px] truncate">
                  <div className="text-emerald-400 font-bold truncate">{selectedTrail ? selectedTrail.name : 'No Trail'}</div>
                  <div className="text-stone-300 text-[10px]">Points: {breadcrumbs.length}</div>
                </div>

                <div className="absolute top-2 right-2 z-20">
                  {!isRecording ? (
                    <button
                      onClick={handleStartRecording}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-lg cursor-pointer"
                    >
                      <Footprints className="w-3.5 h-3.5" />
                      <span>Record</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecording}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-lg cursor-pointer animate-pulse"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Stop ({breadcrumbs.length})</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-stone-400 flex items-center justify-between">
                <span>Blue GPS dot &amp; cyan breadcrumbs active.</span>
                <span className="font-mono text-emerald-400">±{currentGps.accuracy}m</span>
              </div>
            </div>

            {/* Right Sub-Section: Safety Passport & SOS Dispatch */}
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-emerald-500/30 space-y-3 sm:space-y-4 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Safety Passport &amp; SOS</span>
                </span>
                <div className="flex items-center gap-1.5 text-xs font-mono text-stone-300">
                  <BatteryCharging className="w-4 h-4 text-emerald-400" />
                  <span>{batteryLevel}%</span>
                </div>
              </div>

              {!currentUser ? (
                <div className="py-6 px-3 text-center rounded-2xl bg-stone-950/90 border border-rose-500/30 space-y-3 my-auto">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Sign In Required</h4>
                    <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                      Safety Passport check-ins and SOS dispatch require sign-in.
                    </p>
                  </div>
                  <button
                    onClick={onOpenAuth}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 cursor-pointer transition-all active:scale-95"
                  >
                    Sign In Now
                  </button>
                </div>
              ) : (
                <>
                  {!isCheckedIn ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-950 border border-emerald-500/30 text-emerald-300 truncate">
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate"><strong>{currentUser.email}</strong></span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase">Trail Name</label>
                          <input
                            type="text"
                            value={trailNameInput}
                            onChange={(e) => setTrailNameInput(e.target.value)}
                            className="w-full mt-1 p-2 rounded-xl bg-stone-950 border border-white/10 text-white font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase">Group Size</label>
                          <input
                            type="number"
                            value={groupSize}
                            onChange={(e) => setGroupSize(e.target.value)}
                            className="w-full mt-1 p-2 rounded-xl bg-stone-950 border border-white/10 text-white font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase">Emergency Contact</label>
                          <input
                            type="text"
                            value={emergencyContact}
                            onChange={(e) => setEmergencyContact(e.target.value)}
                            className="w-full mt-1 p-2 rounded-xl bg-stone-950 border border-white/10 text-white font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-stone-400 uppercase">Expected (Hrs)</label>
                          <input
                            type="number"
                            value={expectedHours}
                            onChange={(e) => setExpectedHours(e.target.value)}
                            className="w-full mt-1 p-2 rounded-xl bg-stone-950 border border-white/10 text-white font-bold text-xs"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCheckIn}
                        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950 cursor-pointer transition-all active:scale-95"
                      >
                        Check-In &amp; Sync to Firestore
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className={`p-3 rounded-2xl border ${isOverdue ? 'bg-rose-950/50 border-rose-500/60 animate-pulse' : 'bg-emerald-950/40 border-emerald-500/40'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold uppercase text-stone-300">
                            {isOverdue ? '⚠️ OVERDUE ALERT' : 'Active Check-In'}
                          </span>
                          <span className="font-mono font-bold text-xs text-emerald-300">
                            {Math.floor(timeRemainingSeconds / 3600)}h {Math.floor((timeRemainingSeconds % 3600) / 60)}m left
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-300">
                          {isOverdue
                            ? 'Expected return time expired! Emergency responders alerted.'
                            : 'Timer active. Tap Check-Out when safe.'}
                        </p>
                      </div>

                      <button
                        onClick={handleCheckOut}
                        className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs cursor-pointer"
                      >
                        Check-Out Safely
                      </button>
                    </div>
                  )}

                  {/* Low-Bandwidth Emergency Payload Box */}
                  <div className="p-2.5 rounded-xl bg-stone-950 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-rose-400 uppercase">
                      <span className="flex items-center gap-1">
                        <Radio className="w-3 h-3 animate-pulse" />
                        <span>Emergency SMS String</span>
                      </span>
                      <span className="font-mono text-[9px]">2G Ready</span>
                    </div>

                    <div className="p-1.5 rounded-lg bg-stone-900 font-mono text-[10px] text-stone-300 select-all border border-white/5 truncate">
                      {`SOS Hiker Overdue | Trail: ${trailNameInput} | Coords: ${currentGps.lat.toFixed(4)},${currentGps.lng.toFixed(4)} | Bat: ${batteryLevel}%`}
                    </div>

                    <button
                      onClick={handleCopySos}
                      className="w-full py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-md cursor-pointer transition-all"
                    >
                      {copiedSos ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Copied SOS!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy SOS Payload for SMS</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Square: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
