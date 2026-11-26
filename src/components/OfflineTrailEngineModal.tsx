import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Copy,
  Check,
  RefreshCw,
  X,
  Footprints,
  BatteryCharging,
  Battery,
  Radio,
  Sparkles,
  Mountain,
  Lock,
  UserCheck,
  ExternalLink,
  FileText,
  Users,
  Wifi,
  WifiOff,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  PhoneCall,
  Send,
  Activity,
  Wind,
  CloudRain,
  Thermometer,
  Share2,
  Maximize2,
  Minimize2,
  RotateCcw,
  ArrowLeft,
  Crosshair,
  Info,
  Flashlight,
  Sunrise,
  Sunset,
  Sun,
  SlidersHorizontal,
} from 'lucide-react';
import { CAMERON_TRAILS, TrailRoute } from '../data/trailsData';
import { Language } from '../types';
import { UserProfile, firebaseService } from '../services/firebase';
import { weatherService, TrailSafetyStatus } from '../services/weather';
import {
  DeviceTelemetrySnapshot,
  TrailBreadcrumbPoint,
  TrailContactNotificationResult,
  TrailSafetySession,
  buildSmsLink,
  buildTrailTrackingUrl,
  buildWhatsAppLink,
  clearCachedTrailSessionAndGps,
  flushPendingTrailSessions,
  generateTrackingToken,
  getCachedActiveTrailSession,
  haversineDistanceMeters,
  markTrailSessionCheckedOut,
  playStillnessWarningTone,
  readLiveDeviceTelemetry,
  requestMotionSensorPermissionIfNeeded,
  resolveBestSosCoordinates,
  sendInitialTrailCheckInAlert,
  subscribeDeviceTelemetry,
  syncTrailSessionToCloudOrQueue,
  triggerFiveMinuteAutoStartAlert,
  triggerInactivityStage1Alert,
  triggerInactivityStage2CriticalAlert,
  triggerOverdueTrailAlert,
  updateLastKnownMapGps,
} from '../services/trailSafetyService';
import { sendOrQueueEmergencySos, SosDispatchOutcome } from '../services/offlineSosQueue';

interface OfflineTrailEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
}

function triggerProgrammaticDeepLink(href: string, openInNewTab: boolean): void {
  if (typeof document === 'undefined' || !href) return;
  const anchor = document.createElement('a');
  anchor.href = href;
  if (openInNewTab) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
  }, 180);
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
  14: '#7c3aed',
  15: '#e11d48',
  16: '#0ea5e9',
  17: '#f43f5e',
};

const FIVE_MINUTES_SEC = 5 * 60;
const FIFTEEN_MINUTES_SEC = 15 * 60;
const THIRTY_MINUTES_SEC = 30 * 60;

export const OfflineTrailEngineModal: React.FC<OfflineTrailEngineModalProps> = ({
  isOpen,
  onClose,
  language,
  currentUser,
  onOpenAuth,
}) => {
  // Unlocked Map State (false: Safety Passport Form -> true: Interactive Trail Map)
  const [passportUnlocked, setPassportUnlocked] = useState(false);
  const [resumableSession, setResumableSession] = useState<TrailSafetySession | null>(null);
  const [isConfirmingResetSession, setIsConfirmingResetSession] = useState(false);

  // Selected Trail & Weather / Offline Cache State
  const [selectedTrail, setSelectedTrail] = useState<TrailRoute>(() => CAMERON_TRAILS[0]);
  const [selectedTrailId, setSelectedTrailId] = useState<string>('');
  const [isPlannedTrailEnabled, setIsPlannedTrailEnabled] = useState<boolean>(false);
  const [isPreDownloading, setIsPreDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(100);
  const [cacheVerified, setCacheVerified] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState<TrailSafetyStatus | null>(null);
  const [isPermitCapsuleOpen, setIsPermitCapsuleOpen] = useState(false);
  const [isFullScreenMap, setIsFullScreenMap] = useState(false);
  const [isElevationExpanded, setIsElevationExpanded] = useState(false);
  const [isSafetyBriefOpen, setIsSafetyBriefOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);

  // Utility Tool Modals & Image-2 Compass / Coordinate Overlay State
  const [isCompassModalOpen, setIsCompassModalOpen] = useState(false);
  const [isSunWeatherModalOpen, setIsSunWeatherModalOpen] = useState(false);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [compassCumulativeDeg, setCompassCumulativeDeg] = useState<number>(0);
  const [compassSource, setCompassSource] = useState<'magnetic' | 'gps' | 'awaiting'>('awaiting');
  const [compassNeedsPermission, setCompassNeedsPermission] = useState<boolean>(false);
  const [compassOverlayLocked, setCompassOverlayLocked] = useState<boolean>(true);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const lastCompassHeadingRef = useRef<number | null>(null);

  const [torchMode, setTorchMode] = useState<'off' | 'hardware' | 'screen'>('off');
  const [torchBusy, setTorchBusy] = useState(false);
  const torchStreamRef = useRef<MediaStream | null>(null);
  const torchTrackRef = useRef<MediaStreamTrack | null>(null);

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const activePolylineRef = useRef<L.Polyline | null>(null);
  const trailheadMarkerRef = useRef<L.CircleMarker | null>(null);
  const peakMarkerRef = useRef<L.CircleMarker | null>(null);
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const breadcrumbLineRef = useRef<L.Polyline | null>(null);

  // Live GPS & Breadcrumb State
  const [isRecording, setIsRecording] = useState(false);
  const [pinnedStart, setPinnedStart] = useState<{ lat: number; lng: number } | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<TrailBreadcrumbPoint[]>([]);
  const [currentGps, setCurrentGps] = useState<{
    lat: number;
    lng: number;
    altitude: number;
    accuracy: number;
    hasRealFix: boolean;
  }>({
    lat: 4.4715,
    lng: 101.3805,
    altitude: 1440,
    accuracy: 12,
    hasRealFix: false,
  });
  const watchIdRef = useRef<number | null>(null);

  // Real Device Telemetry State
  const [telemetry, setTelemetry] = useState<DeviceTelemetrySnapshot>({
    batteryPercent: null,
    isCharging: null,
    batterySupported: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
    connectionType: 'cellular',
    effectiveType: '4g',
    downlinkMbps: null,
    rttMs: null,
    signalLevel: 'strong',
    signalLabel: 'Checking Signal...',
    signalLabelBm: 'Menyemak Isyarat...',
    signalBars: 4,
    gpsAccuracy: null,
    updatedAt: new Date().toISOString(),
  });

  // Safety Passport Form & Active Session State (Strict manual entry: all blank by default)
  const [hikerName, setHikerName] = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [expectedHours, setExpectedHours] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingPassport, setIsSubmittingPassport] = useState(false);

  const [activeSession, setActiveSession] = useState<TrailSafetySession | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(0);
  const [isOverdue, setIsOverdue] = useState(false);

  // Record Trail 5-Minute Start Alert Failsafe Prompt State
  const [showStartPromptModal, setShowStartPromptModal] = useState(false);
  const [startFailsafeRemainingSec, setStartFailsafeRemainingSec] = useState<number>(FIVE_MINUTES_SEC);
  const [autoStartTriggeredBanner, setAutoStartTriggeredBanner] =
    useState<TrailContactNotificationResult | null>(null);

  // Phone Motion Sensor Dead-Man Switch (15m Warning / 30m Critical)
  const [motionSensorSupported, setMotionSensorSupported] = useState<boolean>(false);
  const [stillnessSeconds, setStillnessSeconds] = useState<number>(0);
  const [inactivityStage1Active, setInactivityStage1Active] = useState<boolean>(false);
  const [inactivityStage2Active, setInactivityStage2Active] = useState<boolean>(false);
  const [copiedTrackLink, setCopiedTrackLink] = useState<boolean>(false);

  // Alerts & Manual SOS Receipts
  const [initialAlertResult, setInitialAlertResult] =
    useState<TrailContactNotificationResult | null>(null);
  const [overdueAlertReceipt, setOverdueAlertReceipt] = useState<{
    triggeredAt: string;
    smsUrl: string;
    whatsappUrl: string;
    alertMessage: string;
    outcome: SosDispatchOutcome;
  } | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [manualSosDispatching, setManualSosDispatching] = useState(false);
  const [manualSosReceipt, setManualSosReceipt] = useState<{
    outcome: SosDispatchOutcome;
    coords: { lat: number; lng: number; accuracy: number | null; source: string };
    message: string;
    smsUrl: string;
    whatsappUrl: string;
    dispatchedAt: string;
  } | null>(null);
  const [copiedSos, setCopiedSos] = useState(false);
  const [isIceCardExpandedMobile, setIsIceCardExpandedMobile] = useState(false);

  // Mutable Refs for async listeners without stale closures
  const sosCancelTokenRef = useRef<number>(0);
  const currentGpsRef = useRef(currentGps);
  currentGpsRef.current = currentGps;
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;
  const activeSessionRef = useRef(activeSession);
  activeSessionRef.current = activeSession;
  const selectedTrailRef = useRef(selectedTrail);
  selectedTrailRef.current = selectedTrail;
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;
  const isFullScreenMapRef = useRef(isFullScreenMap);
  isFullScreenMapRef.current = isFullScreenMap;
  const autoCenteredFullScreenRef = useRef(false);

  const overdueFiredRef = useRef<boolean>(false);
  const autoStartFiredRef = useRef<boolean>(false);
  const inactivity1FiredRef = useRef<boolean>(false);
  const inactivity2FiredRef = useRef<boolean>(false);
  const lastMovementMsRef = useRef<number>(Date.now());
  const lastDisplacedGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastAccelSampleRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const lastCloudSyncTsRef = useRef<number>(0);

  // Subscribe to real Web API device telemetry (Battery + Network)
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeDeviceTelemetry((snap) => {
      setTelemetry(snap);
    });
    return () => unsubscribe();
  }, [isOpen]);

  // Silent flush of queued IndexedDB trail updates when signal returns
  useEffect(() => {
    if (!isOpen) return;
    const handleOnline = () => {
      flushPendingTrailSessions();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isOpen]);

  // Smooth compass heading helper (avoids 359->0 wrap spinning)
  const applyHeadingUpdate = useCallback((rawDeg: number, source: 'magnetic' | 'gps') => {
    const normalized = ((Math.round(rawDeg) % 360) + 360) % 360;
    const prev = lastCompassHeadingRef.current;
    if (prev === null) {
      lastCompassHeadingRef.current = normalized;
      setCompassCumulativeDeg(normalized);
    } else {
      let delta = normalized - prev;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastCompassHeadingRef.current = normalized;
      setCompassCumulativeDeg((curr) => curr + delta);
    }
    setCompassHeading(normalized);
    setCompassSource(source);
  }, []);

  // Real-time DeviceOrientationEvent Compass Listener when Compass modal or Full-Screen Map is active
  useEffect(() => {
    if (!isOpen || (!isCompassModalOpen && !isFullScreenMap)) return;

    const DOE = (typeof window !== 'undefined' ? (window as any).DeviceOrientationEvent : null);
    if (DOE && typeof DOE.requestPermission === 'function') {
      setCompassNeedsPermission(true);
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const anyEvt = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
      let heading: number | null = null;
      if (typeof anyEvt.webkitCompassHeading === 'number' && Number.isFinite(anyEvt.webkitCompassHeading)) {
        heading = anyEvt.webkitCompassHeading;
        setCompassNeedsPermission(false);
      } else if (typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
        heading = (360 - event.alpha) % 360;
        setCompassNeedsPermission(false);
      }
      if (heading !== null) {
        applyHeadingUpdate(heading, 'magnetic');
      }
    };

    window.addEventListener('deviceorientationabsolute' as any, handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute' as any, handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isOpen, isCompassModalOpen, isFullScreenMap, applyHeadingUpdate]);

  // Cleanup hardware torch stream if modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsCompassModalOpen(false);
      setIsSunWeatherModalOpen(false);
      if (torchTrackRef.current) {
        try {
          torchTrackRef.current.applyConstraints({ advanced: [{ torch: false } as any] }).catch(() => {});
        } catch {
          // ignore
        }
      }
      if (torchStreamRef.current) {
        torchStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      torchStreamRef.current = null;
      torchTrackRef.current = null;
      setTorchMode('off');
    }
  }, [isOpen]);

  // Fetch trail weather safety status & check resumable session on open (NO form auto-fill / pre-fill)
  useEffect(() => {
    if (!isOpen) return;

    const fetchSafety = async () => {
      const status = await weatherService.evaluateTrailSafety();
      setSafetyStatus(status);
    };
    fetchSafety();

    const existingSession = getCachedActiveTrailSession();
    const isFreshActiveSession =
      existingSession &&
      existingSession.status !== 'completed' &&
      Date.now() - new Date(existingSession.startedAt).getTime() < 24 * 3600 * 1000;

    setResumableSession(isFreshActiveSession && existingSession ? existingSession : null);
  }, [isOpen]);

  // Silent Firestore + IndexedDB sync helper
  const persistSessionProgress = useCallback(
    async (updatedSession: TrailSafetySession, forceCloudSync = false) => {
      setActiveSession(updatedSession);
      const now = Date.now();
      if (!forceCloudSync && now - lastCloudSyncTsRef.current < 10000) {
        return;
      }
      lastCloudSyncTsRef.current = now;
      await syncTrailSessionToCloudOrQueue(updatedSession, false);
    },
    []
  );

  // DeviceMotionEvent + Accelerometer monitoring while active session is unlocked
  useEffect(() => {
    if (!isOpen || !passportUnlocked || !activeSession) return;

    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      setMotionSensorSupported(true);

      // Prefer linear acceleration if provided, otherwise delta accelerationIncludingGravity
      const acc = event.acceleration;
      if (
        acc &&
        typeof acc.x === 'number' &&
        typeof acc.y === 'number' &&
        typeof acc.z === 'number'
      ) {
        const linearMag = Math.hypot(acc.x, acc.y, acc.z);
        if (linearMag > 1.35) {
          lastMovementMsRef.current = Date.now();
        }
        return;
      }

      const accG = event.accelerationIncludingGravity;
      if (
        accG &&
        typeof accG.x === 'number' &&
        typeof accG.y === 'number' &&
        typeof accG.z === 'number'
      ) {
        const prev = lastAccelSampleRef.current;
        if (prev) {
          const delta =
            Math.abs(accG.x - prev.x) +
            Math.abs(accG.y - prev.y) +
            Math.abs(accG.z - prev.z);
          if (delta > 1.5) {
            lastMovementMsRef.current = Date.now();
          }
        }
        lastAccelSampleRef.current = { x: accG.x, y: accG.y, z: accG.z };
      }
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
    };
  }, [isOpen, passportUnlocked, Boolean(activeSession)]);

  // Continuous high-accuracy Geolocation watcher -> updates map GPS dot, motion displacement & active session
  useEffect(() => {
    if (!isOpen || !('geolocation' in navigator)) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const accuracy = Math.round(pos.coords.accuracy || 10);
        const altitude =
          typeof pos.coords.altitude === 'number' && Number.isFinite(pos.coords.altitude)
            ? Math.round(pos.coords.altitude)
            : selectedTrailRef.current?.maxElevationM
            ? Math.max(1420, selectedTrailRef.current.maxElevationM - 180)
            : 1460;

        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          altitude,
          accuracy,
          hasRealFix: true,
        };
        setCurrentGps(loc);
        if (typeof pos.coords.heading === 'number' && Number.isFinite(pos.coords.heading) && lastCompassHeadingRef.current === null) {
          applyHeadingUpdate(pos.coords.heading, 'gps');
        }

        // GPS displacement check (>= 12m counts as real movement)
        if (lastDisplacedGpsRef.current) {
          const movedMeters = haversineDistanceMeters(
            lastDisplacedGpsRef.current.lat,
            lastDisplacedGpsRef.current.lng,
            loc.lat,
            loc.lng
          );
          if (movedMeters >= 12) {
            lastMovementMsRef.current = Date.now();
            lastDisplacedGpsRef.current = { lat: loc.lat, lng: loc.lng };
          }
        } else {
          lastDisplacedGpsRef.current = { lat: loc.lat, lng: loc.lng };
        }

        // Update Leaflet live blue GPS dot & auto-center in full-screen view
        const map = mapInstanceRef.current;
        if (map) {
          if (!gpsMarkerRef.current) {
            const blueDotIcon = L.divIcon({
              className: 'custom-gps-marker',
              html: '<div style="width: 18px; height: 18px; background: #38bdf8; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 14px rgba(56,189,248,0.95);"></div>',
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });
            gpsMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: blueDotIcon }).addTo(map);
          } else {
            gpsMarkerRef.current.setLatLng([loc.lat, loc.lng]);
          }
          if (isFullScreenMapRef.current && !autoCenteredFullScreenRef.current) {
            autoCenteredFullScreenRef.current = true;
            map.setView([loc.lat, loc.lng], Math.max(map.getZoom(), 15), { animate: true });
          }
        }

        const trail = selectedTrailRef.current;
        await updateLastKnownMapGps({
          lat: loc.lat,
          lng: loc.lng,
          altitude: loc.altitude,
          accuracy: loc.accuracy,
          timestamp: new Date().toISOString(),
          source: 'map_watch',
          trailId: trail?.id,
          trailName: trail?.name,
        });

        const liveTelemetry = await readLiveDeviceTelemetry(accuracy);
        setTelemetry(liveTelemetry);

        const sess = activeSessionRef.current;
        const lastMovedIso = new Date(lastMovementMsRef.current).toISOString();

        if (isRecordingRef.current) {
          const newPt: TrailBreadcrumbPoint = {
            lat: loc.lat,
            lng: loc.lng,
            altitude: loc.altitude,
            time: new Date().toLocaleTimeString('en-MY', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            timestamp: new Date().toISOString(),
            accuracy,
          };

          setBreadcrumbs((prev) => {
            const last = prev[prev.length - 1];
            const distMoved = last
              ? haversineDistanceMeters(last.lat, last.lng, loc.lat, loc.lng)
              : 50;
            const nextList = distMoved >= 8 || prev.length === 0 ? [...prev, newPt] : prev;

            if (map && nextList.length > 1) {
              const latLngs = nextList.map((b) => [b.lat, b.lng] as [number, number]);
              if (!breadcrumbLineRef.current) {
                breadcrumbLineRef.current = L.polyline(latLngs, {
                  color: '#38bdf8',
                  weight: 4,
                  dashArray: '5 5',
                }).addTo(map);
              } else {
                breadcrumbLineRef.current.setLatLngs(latLngs);
              }
            }

            if (sess && sess.status !== 'completed') {
              persistSessionProgress({
                ...sess,
                lastKnownCoords: `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`,
                lastKnownLat: loc.lat,
                lastKnownLng: loc.lng,
                currentAltitude: loc.altitude,
                coordSource: 'map_watch',
                lastMovementAt: lastMovedIso,
                breadcrumbs: nextList,
                telemetry: liveTelemetry,
                updatedAt: new Date().toISOString(),
              });
            }

            return nextList;
          });
        } else if (sess && sess.status !== 'completed') {
          persistSessionProgress({
            ...sess,
            lastKnownCoords: `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`,
            lastKnownLat: loc.lat,
            lastKnownLng: loc.lng,
            currentAltitude: loc.altitude,
            coordSource: 'map_watch',
            lastMovementAt: lastMovedIso,
            telemetry: liveTelemetry,
            updatedAt: new Date().toISOString(),
          });
        }
      },
      (err) => {
        console.warn('[TrailEngine] Geolocation watch notice:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }
    );

    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOpen, persistSessionProgress]);

  // Initialize / Clean up Leaflet Map when Interactive Map view is active
  useEffect(() => {
    if (!isOpen || !passportUnlocked || !mapContainerRef.current) {
      return;
    }

    if (!mapInstanceRef.current) {
      const initialCenter = selectedTrailRef.current.coordinates[0] || [4.4715, 101.3805];
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '© OpenTopoMap (CC-BY-SA) | OpenStreetMap',
      }).addTo(map);

      mapInstanceRef.current = map;

      const gps = currentGpsRef.current;
      if (gps.hasRealFix) {
        const blueDotIcon = L.divIcon({
          className: 'custom-gps-marker',
          html: '<div style="width: 18px; height: 18px; background: #38bdf8; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 14px rgba(56,189,248,0.95);"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        gpsMarkerRef.current = L.marker([gps.lat, gps.lng], { icon: blueDotIcon }).addTo(map);
      }

      if (breadcrumbs.length > 1) {
        const latLngs = breadcrumbs.map((b) => [b.lat, b.lng] as [number, number]);
        breadcrumbLineRef.current = L.polyline(latLngs, {
          color: '#38bdf8',
          weight: 4,
          dashArray: '5 5',
        }).addTo(map);
      }
    }

    const resizeTimer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      observer = new ResizeObserver(() => {
        mapInstanceRef.current?.invalidateSize();
      });
      observer.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(resizeTimer);
      observer?.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        activePolylineRef.current = null;
        trailheadMarkerRef.current = null;
        peakMarkerRef.current = null;
        gpsMarkerRef.current = null;
        breadcrumbLineRef.current = null;
      }
    };
  }, [isOpen, passportUnlocked]);

  // Keep Leaflet breadcrumb polyline synchronized whenever breadcrumbs are restored, recorded, or reset
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !passportUnlocked) return;

    if (breadcrumbs.length > 1) {
      const latLngs = breadcrumbs.map((b) => [b.lat, b.lng] as [number, number]);
      if (!breadcrumbLineRef.current) {
        breadcrumbLineRef.current = L.polyline(latLngs, {
          color: '#38bdf8',
          weight: 4,
          dashArray: '5 5',
        }).addTo(map);
      } else {
        breadcrumbLineRef.current.setLatLngs(latLngs);
      }
    } else if (breadcrumbLineRef.current) {
      breadcrumbLineRef.current.remove();
      breadcrumbLineRef.current = null;
    }
  }, [breadcrumbs, passportUnlocked]);

  // Reflow Leaflet canvas + auto-detect & center current GPS location when Full Screen Map opens
  useEffect(() => {
    if (!isOpen || !passportUnlocked) return;
    if (!isFullScreenMap) {
      autoCenteredFullScreenRef.current = false;
    }

    const centerOnKnownOrFreshGps = () => {
      const map = mapInstanceRef.current;
      if (!map) return;
      map.invalidateSize();
      if (!isFullScreenMap) return;

      const known = currentGpsRef.current;
      if (known.hasRealFix) {
        autoCenteredFullScreenRef.current = true;
        map.setView([known.lat, known.lng], Math.max(map.getZoom(), 15), { animate: true });
      }
    };

    const t1 = window.setTimeout(centerOnKnownOrFreshGps, 80);
    const t2 = window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 260);

    if (isFullScreenMap && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const accuracy = Math.round(pos.coords.accuracy || 10);
          const altitude =
            typeof pos.coords.altitude === 'number' && Number.isFinite(pos.coords.altitude)
              ? Math.round(pos.coords.altitude)
              : currentGpsRef.current.altitude;
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            altitude,
            accuracy,
            hasRealFix: true,
          };
          setCurrentGps(loc);
          const map = mapInstanceRef.current;
          if (map) {
            if (!gpsMarkerRef.current) {
              const blueDotIcon = L.divIcon({
                className: 'custom-gps-marker',
                html: '<div style="width: 18px; height: 18px; background: #38bdf8; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 14px rgba(56,189,248,0.95);"></div>',
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              });
              gpsMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: blueDotIcon }).addTo(map);
            } else {
              gpsMarkerRef.current.setLatLng([loc.lat, loc.lng]);
            }
            autoCenteredFullScreenRef.current = true;
            map.setView([loc.lat, loc.lng], Math.max(map.getZoom(), 15), { animate: true });
          }
        },
        () => {
          // Continuous watchPosition listener remains active as fallback
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 }
      );
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreenMap) {
        setIsFullScreenMap(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullScreenMap, isOpen, passportUnlocked]);

  // Draw / Update accurate Trail Polyline + Trailhead Start Marker + Summit Marker whenever trail changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedTrail || !passportUnlocked) return;

    if (activePolylineRef.current) {
      activePolylineRef.current.remove();
      activePolylineRef.current = null;
    }
    if (trailheadMarkerRef.current) {
      trailheadMarkerRef.current.remove();
      trailheadMarkerRef.current = null;
    }
    if (peakMarkerRef.current) {
      peakMarkerRef.current.remove();
      peakMarkerRef.current = null;
    }

    const color = TRAIL_COLORS[selectedTrail.number] || selectedTrail.color || '#10b981';
    const pts = selectedTrail.coordinates;

    const poly = L.polyline(pts, {
      color,
      weight: 6,
      opacity: 0.95,
    }).addTo(map);
    activePolylineRef.current = poly;

    // Trailhead Start Marker
    if (pts[0]) {
      trailheadMarkerRef.current = L.circleMarker(pts[0], {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: '#10b981',
        fillOpacity: 1,
      })
        .bindTooltip(`Start: ${selectedTrail.trailheadName}`, { direction: 'bottom' })
        .addTo(map);
    }

    // Summit / Endpoint Marker
    const peakCoord = selectedTrail.peakCoordinates || pts[pts.length - 1];
    peakMarkerRef.current = L.circleMarker(peakCoord, {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: color,
      fillOpacity: 1,
    })
      .bindTooltip(`${selectedTrail.peakName || selectedTrail.name} (${selectedTrail.maxElevationM}m)`, {
        direction: 'top',
      })
      .addTo(map);

    map.fitBounds(poly.getBounds(), { padding: [36, 36] });
    setTimeout(() => map.invalidateSize(), 150);

    if (!currentGpsRef.current.hasRealFix && pts[0]) {
      updateLastKnownMapGps({
        lat: pts[0][0],
        lng: pts[0][1],
        altitude: selectedTrail.elevationProfile?.[0]?.altitude || 1450,
        accuracy: null,
        timestamp: new Date().toISOString(),
        source: 'trailhead',
        trailId: selectedTrail.id,
        trailName: selectedTrail.name,
      });
    }
  }, [selectedTrail, passportUnlocked, isOpen]);

  // Combined 1-Second Safety Monitor Loop:
  // 1) Automated Overdue Return Timer
  // 2) Automated 5-Minute Start Alert Failsafe (when user clicked Record Trail)
  // 3) Dead-Man Switch Motion Inactivity Checks (15 min Stage 1 / 30 min Stage 2 Critical)
  useEffect(() => {
    if (!activeSession || activeSession.status === 'completed') return;

    const buildFallbackGps = () => {
      const gps = currentGpsRef.current;
      const trail = selectedTrailRef.current;
      return gps.hasRealFix
        ? {
            lat: gps.lat,
            lng: gps.lng,
            altitude: gps.altitude,
            accuracy: gps.accuracy,
            timestamp: new Date().toISOString(),
            source: 'map_watch' as const,
            trailId: trail?.id,
            trailName: trail?.name,
          }
        : {
            lat: activeSession.lastKnownLat || trail.coordinates[0][0],
            lng: activeSession.lastKnownLng || trail.coordinates[0][1],
            altitude: activeSession.currentAltitude || trail.maxElevationM || 1500,
            accuracy: null,
            timestamp: new Date().toISOString(),
            source: 'trailhead' as const,
            trailId: trail?.id,
            trailName: trail?.name,
          };
    };

    const tick = async () => {
      const nowMs = Date.now();

      // 1. Overdue Return Countdown Check
      const deadlineMs = new Date(activeSession.expectedReturnAt).getTime();
      const remaining = Math.floor((deadlineMs - nowMs) / 1000);
      if (remaining <= 0) {
        setTimeRemainingSeconds(0);
        setIsOverdue(true);

        if (!overdueFiredRef.current && !activeSession.overdueAlertSent) {
          overdueFiredRef.current = true;
          const latestCoord = buildFallbackGps();
          const liveTel = await readLiveDeviceTelemetry(currentGpsRef.current.accuracy);
          const card = firebaseService.getEmergencyCard();
          const receipt = await triggerOverdueTrailAlert(
            activeSession,
            latestCoord,
            liveTel,
            card
          );

          setOverdueAlertReceipt({
            triggeredAt: new Date().toISOString(),
            smsUrl: receipt.smsUrl,
            whatsappUrl: receipt.whatsappUrl,
            alertMessage: receipt.alertMessage,
            outcome: receipt.sosOutcome,
          });
          setActiveSession((prev) =>
            prev ? { ...prev, status: 'overdue', overdueAlertSent: true } : prev
          );
        }
      } else {
        setTimeRemainingSeconds(remaining);
      }

      // 2. 5-Minute Record Trail Start Alert Failsafe
      if (
        activeSession.recordingStartedAt &&
        !activeSession.manualStartAlertSent &&
        !activeSession.autoStartAlertSent &&
        !autoStartFiredRef.current
      ) {
        const recStartMs = new Date(activeSession.recordingStartedAt).getTime();
        const elapsedSinceRecSec = Math.floor((nowMs - recStartMs) / 1000);
        const failsafeLeft = Math.max(0, FIVE_MINUTES_SEC - elapsedSinceRecSec);
        setStartFailsafeRemainingSec(failsafeLeft);

        if (elapsedSinceRecSec >= FIVE_MINUTES_SEC) {
          autoStartFiredRef.current = true;
          const autoRes = await triggerFiveMinuteAutoStartAlert(activeSession);
          setAutoStartTriggeredBanner(autoRes);
          setShowStartPromptModal(false);
          setActiveSession((prev) =>
            prev ? { ...prev, autoStartAlertSent: true } : prev
          );
        }
      }

      // 3. Phone Motion Sensor + GPS Dead-Man Switch (15m / 30m Immobility)
      const stillSec = Math.max(0, Math.floor((nowMs - lastMovementMsRef.current) / 1000));
      setStillnessSeconds(stillSec);

      if (
        stillSec >= FIFTEEN_MINUTES_SEC &&
        !inactivity1FiredRef.current &&
        !activeSession.inactivityAlert1Sent
      ) {
        inactivity1FiredRef.current = true;
        setInactivityStage1Active(true);
        playStillnessWarningTone(false);

        const latestCoord = buildFallbackGps();
        const liveTel = await readLiveDeviceTelemetry(currentGpsRef.current.accuracy);
        await triggerInactivityStage1Alert(activeSession, latestCoord, liveTel);
        setActiveSession((prev) =>
          prev ? { ...prev, inactivityAlert1Sent: true } : prev
        );
      }

      if (
        stillSec >= THIRTY_MINUTES_SEC &&
        !inactivity2FiredRef.current &&
        !activeSession.inactivityAlert2Sent
      ) {
        inactivity2FiredRef.current = true;
        setInactivityStage1Active(false);
        setInactivityStage2Active(true);
        playStillnessWarningTone(true);

        const latestCoord = buildFallbackGps();
        const liveTel = await readLiveDeviceTelemetry(currentGpsRef.current.accuracy);
        const card = firebaseService.getEmergencyCard();
        await triggerInactivityStage2CriticalAlert(
          activeSession,
          latestCoord,
          liveTel,
          card
        );
        setActiveSession((prev) =>
          prev
            ? { ...prev, status: 'overdue', inactivityAlert2Sent: true }
            : prev
        );
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Dismiss 15-min Stillness Warning & reset Dead-Man timer
  const handleDismissStillnessWarning = async () => {
    lastMovementMsRef.current = Date.now();
    setStillnessSeconds(0);
    setInactivityStage1Active(false);
    inactivity1FiredRef.current = false;
    inactivity2FiredRef.current = false;

    if (activeSession) {
      const updated: TrailSafetySession = {
        ...activeSession,
        lastMovementAt: new Date().toISOString(),
        inactivityAlert1Sent: false,
        inactivityAlert1DismissedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await persistSessionProgress(updated, true);
    }
  };

  // Mark manual WhatsApp/SMS start alert sent (cancelling 5-min failsafe)
  const handleMarkManualStartAlertSent = async () => {
    setShowStartPromptModal(false);
    if (activeSession) {
      const updated: TrailSafetySession = {
        ...activeSession,
        manualStartAlertSent: true,
        updatedAt: new Date().toISOString(),
      };
      await persistSessionProgress(updated, true);
    }
  };

  const handleCopyTrackingLink = async (url: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopiedTrackLink(true);
        setTimeout(() => setCopiedTrackLink(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const handleRecenterTrailGps = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (currentGpsRef.current.hasRealFix) {
      map.setView([currentGpsRef.current.lat, currentGpsRef.current.lng], 16, { animate: true });
    } else if (selectedTrailRef.current?.coordinates?.[0]) {
      map.setView(selectedTrailRef.current.coordinates[0], 15, { animate: true });
    }
  };

  const getCardinalDirection = (deg: number) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
    return dirs[idx];
  };

  const handleRequestCompassPermission = async () => {
    try {
      const DOE = (window as any).DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission();
        if (res === 'granted') {
          setCompassNeedsPermission(false);
        }
      }
    } catch {
      // Ignore user denial / unsupported desktop
    }
  };

  const handleTurnOffTorch = useCallback(async () => {
    if (torchTrackRef.current) {
      try {
        await torchTrackRef.current.applyConstraints({ advanced: [{ torch: false } as any] });
      } catch {
        // ignore
      }
    }
    if (torchStreamRef.current) {
      torchStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    torchStreamRef.current = null;
    torchTrackRef.current = null;
    setTorchMode('off');
  }, []);

  const formatDmsCoordinate = (lat: number, lng: number) => {
    const toDms = (val: number, posChar: string, negChar: string) => {
      const abs = Math.abs(val);
      const deg = Math.floor(abs);
      const minFloat = (abs - deg) * 60;
      const min = Math.floor(minFloat);
      const sec = ((minFloat - min) * 60).toFixed(1);
      return `${deg}°${String(min).padStart(2, '0')}'${sec}" ${val >= 0 ? posChar : negChar}`;
    };
    return `${toDms(lat, 'N', 'S')}, ${toDms(lng, 'E', 'W')}`;
  };

  const handleCopyTrailCoordinates = async () => {
    const coordsText = `${currentGps.lat.toFixed(6)}, ${currentGps.lng.toFixed(6)}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(coordsText);
      }
      setCopiedCoords(true);
      window.setTimeout(() => setCopiedCoords(false), 2000);
    } catch {
      // ignore clipboard fallback
    }
  };

  const handleToggleTorch = async () => {
    if (torchBusy) return;
    if (torchMode !== 'off') {
      await handleTurnOffTorch();
      return;
    }

    setTorchBusy(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities ? track.getCapabilities() : {}) as { torch?: boolean };
        if (track && caps && caps.torch === false) {
          stream.getTracks().forEach((t) => t.stop());
          setTorchMode('screen');
        } else if (track) {
          await track.applyConstraints({ advanced: [{ torch: true } as any] });
          torchStreamRef.current = stream;
          torchTrackRef.current = track;
          setTorchMode('hardware');
        } else {
          stream.getTracks().forEach((t) => t.stop());
          setTorchMode('screen');
        }
      } else {
        setTorchMode('screen');
      }
    } catch {
      // Clean up any partial stream & activate bright white screen-light fallback
      if (torchStreamRef.current) {
        torchStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      torchStreamRef.current = null;
      torchTrackRef.current = null;
      setTorchMode('screen');
    } finally {
      setTorchBusy(false);
    }
  };

  const parsedGroupSize = parseInt(groupSize, 10);
  const parsedExpectedHours = parseFloat(expectedHours);
  const isPassportFieldsValid =
    hikerName.trim().length > 0 &&
    emergencyContactName.trim().length > 0 &&
    emergencyContact.trim().length >= 6 &&
    Number.isFinite(parsedGroupSize) &&
    parsedGroupSize >= 1 &&
    Number.isFinite(parsedExpectedHours) &&
    parsedExpectedHours >= 0.5;

  const canSubmitPassport =
    isPassportFieldsValid && (!isPlannedTrailEnabled || Boolean(selectedTrailId));

  useEffect(() => {
    if (!isPassportFieldsValid && isPlannedTrailEnabled) {
      setIsPlannedTrailEnabled(false);
    }
  }, [isPassportFieldsValid, isPlannedTrailEnabled]);

  // Submit Safety Passport -> Initialize session & jump directly into Interactive Trail Map
  const handleSubmitSafetyPassport = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = hikerName.trim();
    const trimmedIceName = emergencyContactName.trim();
    const trimmedPhone = emergencyContact.trim();
    const parsedHours = parseFloat(expectedHours);
    const parsedGroup = parseInt(groupSize, 10);

    if (
      !trimmedName ||
      !trimmedIceName ||
      !trimmedPhone ||
      trimmedPhone.length < 6 ||
      !Number.isFinite(parsedGroup) ||
      parsedGroup < 1 ||
      !Number.isFinite(parsedHours) ||
      parsedHours < 0.5
    ) {
      setFormError(
        language === 'bm'
          ? 'Sila lengkapkan Nama Pendaki, Nama & Nombor Telefon Kenalan Kecemasan (ICE), Bilangan Kumpulan, dan Tempoh Jangkaan Pulang sebelum meneruskan.'
          : 'Please complete Hiker / Lead Name, Emergency Contact Name & Phone (ICE), Group Size, and Expected Return Duration before opening the map.'
      );
      return;
    }

    setIsSubmittingPassport(true);

    try {
      // Unlock motion sensors on user gesture (required on iOS Safari)
      const motionAllowed = await requestMotionSensorPermissionIfNeeded();
      setMotionSensorSupported(motionAllowed);

      const existingCard = firebaseService.getEmergencyCard();
      await firebaseService.saveEmergencyCard({
        ...existingCard,
        fullLegalName: existingCard.fullLegalName || trimmedName,
        designatedSosNumber: trimmedPhone,
        primaryContact: {
          label: existingCard.primaryContact?.label || 'ICE 1',
          name: trimmedIceName,
          relationship: existingCard.primaryContact?.relationship || 'Emergency Contact',
          phone: trimmedPhone,
        },
      });

      const liveTelemetry = await readLiveDeviceTelemetry(currentGps.accuracy);
      setTelemetry(liveTelemetry);

      const startCoords = currentGps.hasRealFix
        ? {
            lat: currentGps.lat,
            lng: currentGps.lng,
            altitude: currentGps.altitude,
            accuracy: currentGps.accuracy,
            source: 'live_gps' as const,
          }
        : {
            lat: selectedTrail.coordinates[0][0],
            lng: selectedTrail.coordinates[0][1],
            altitude: selectedTrail.elevationProfile[0]?.altitude || 1480,
            accuracy: null,
            source: 'trailhead' as const,
          };

      await updateLastKnownMapGps({
        ...startCoords,
        timestamp: new Date().toISOString(),
        trailId: selectedTrail.id,
        trailName: selectedTrail.name,
      });

      const nowMs = Date.now();
      const startedAt = new Date(nowMs).toISOString();
      const expectedReturnAt = new Date(nowMs + parsedHours * 3600 * 1000).toISOString();
      const uid = currentUser?.uid || `guest-${nowMs.toString(36)}`;
      const newSessionId = `session_${nowMs}_${uid}`;
      const trackingToken = generateTrackingToken();

      lastMovementMsRef.current = nowMs;

      const newSession: TrailSafetySession = {
        id: newSessionId,
        uid,
        trackingToken,
        hikerName: trimmedName,
        userEmail: currentUser?.email || 'guest-hiker@camgo.my',
        trailId: selectedTrail.id,
        trailName: selectedTrail.name,
        groupSize: parsedGroup,
        emergencyContactName: trimmedIceName,
        emergencyContact: trimmedPhone,
        expectedHours: parsedHours,
        status: 'active',
        startedAt,
        expectedReturnAt,
        overdueAlertSent: false,
        initialContactNotified: true,
        manualStartAlertSent: false,
        autoStartAlertSent: false,
        lastMovementAt: startedAt,
        motionSensorActive: motionAllowed,
        inactivityAlert1Sent: false,
        inactivityAlert2Sent: false,
        lastKnownCoords: `${startCoords.lat.toFixed(6)}, ${startCoords.lng.toFixed(6)}`,
        lastKnownLat: startCoords.lat,
        lastKnownLng: startCoords.lng,
        currentAltitude: startCoords.altitude,
        coordSource: startCoords.source,
        breadcrumbs: [
          {
            lat: startCoords.lat,
            lng: startCoords.lng,
            altitude: startCoords.altitude,
            time: new Date().toLocaleTimeString('en-MY', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            timestamp: startedAt,
            accuracy: startCoords.accuracy,
          },
        ],
        telemetry: liveTelemetry,
        updatedAt: startedAt,
      };

      await syncTrailSessionToCloudOrQueue(newSession, true);

      overdueFiredRef.current = false;
      autoStartFiredRef.current = false;
      inactivity1FiredRef.current = false;
      inactivity2FiredRef.current = false;
      setIsOverdue(false);
      setOverdueAlertReceipt(null);
      setAutoStartTriggeredBanner(null);
      setInactivityStage1Active(false);
      setInactivityStage2Active(false);
      setManualSosReceipt(null);
      setResumableSession(null);
      setActiveSession(newSession);
      setBreadcrumbs(newSession.breadcrumbs);
      setTimeRemainingSeconds(Math.round(parsedHours * 3600));
      setPassportUnlocked(true);

      const alertRes = await sendInitialTrailCheckInAlert(newSession);
      setInitialAlertResult(alertRes);
    } finally {
      setIsSubmittingPassport(false);
    }
  };

  const handleResumeCachedSession = () => {
    if (!resumableSession) return;
    const restoredBreadcrumbs = resumableSession.breadcrumbs || [];
    setActiveSession(resumableSession);
    setHikerName(resumableSession.hikerName);
    setGroupSize(String(resumableSession.groupSize));
    setEmergencyContactName(resumableSession.emergencyContactName || '');
    setEmergencyContact(resumableSession.emergencyContact);
    setExpectedHours(String(resumableSession.expectedHours));
    setBreadcrumbs(restoredBreadcrumbs);
    setIsRecording(Boolean(resumableSession.recordingStartedAt));
    if (restoredBreadcrumbs[0]) {
      setPinnedStart({ lat: restoredBreadcrumbs[0].lat, lng: restoredBreadcrumbs[0].lng });
    }
    if (resumableSession.expectedReturnAt) {
      const remaining = Math.max(
        0,
        Math.floor((new Date(resumableSession.expectedReturnAt).getTime() - Date.now()) / 1000)
      );
      setTimeRemainingSeconds(remaining);
    }
    if (
      !currentGps.hasRealFix &&
      typeof resumableSession.lastKnownLat === 'number' &&
      typeof resumableSession.lastKnownLng === 'number'
    ) {
      setCurrentGps((prev) => ({
        ...prev,
        lat: resumableSession.lastKnownLat!,
        lng: resumableSession.lastKnownLng!,
        altitude: resumableSession.currentAltitude || prev.altitude,
        accuracy: resumableSession.telemetry?.gpsAccuracy ?? prev.accuracy,
      }));
    }
    overdueFiredRef.current = Boolean(resumableSession.overdueAlertSent);
    autoStartFiredRef.current = Boolean(resumableSession.autoStartAlertSent);
    inactivity1FiredRef.current = Boolean(resumableSession.inactivityAlert1Sent);
    inactivity2FiredRef.current = Boolean(resumableSession.inactivityAlert2Sent);
    lastMovementMsRef.current = resumableSession.lastMovementAt
      ? new Date(resumableSession.lastMovementAt).getTime()
      : Date.now();
    setIsOverdue(resumableSession.status === 'overdue');
    setInactivityStage1Active(
      Boolean(resumableSession.inactivityAlert1Sent && !resumableSession.inactivityAlert1DismissedAt)
    );
    setInactivityStage2Active(Boolean(resumableSession.inactivityAlert2Sent));
    const matchedTrail = CAMERON_TRAILS.find((t) => t.id === resumableSession.trailId);
    if (matchedTrail) {
      setSelectedTrail(matchedTrail);
      setSelectedTrailId(matchedTrail.id);
      setIsPlannedTrailEnabled(true);
    }
    setIsConfirmingResetSession(false);
    setPassportUnlocked(true);
  };

  // Record Trail Toggle -> Prompt WhatsApp/SMS Start Alert & Arm 5-Min Auto-Trigger Failsafe
  const handleToggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      if (activeSession) {
        await persistSessionProgress(
          {
            ...activeSession,
            breadcrumbs,
            updatedAt: new Date().toISOString(),
          },
          true
        );
      }
      return;
    }

    const motionAllowed = await requestMotionSensorPermissionIfNeeded();
    if (motionAllowed) setMotionSensorSupported(true);

    lastMovementMsRef.current = Date.now();

    const fix = currentGps.hasRealFix
      ? { lat: currentGps.lat, lng: currentGps.lng, altitude: currentGps.altitude }
      : {
          lat: selectedTrail.coordinates[0][0],
          lng: selectedTrail.coordinates[0][1],
          altitude: selectedTrail.elevationProfile?.[0]?.altitude || 1480,
        };

    setPinnedStart({ lat: fix.lat, lng: fix.lng });
    const startPt: TrailBreadcrumbPoint = {
      lat: fix.lat,
      lng: fix.lng,
      altitude: fix.altitude,
      time: new Date().toLocaleTimeString('en-MY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      timestamp: new Date().toISOString(),
      accuracy: currentGps.hasRealFix ? currentGps.accuracy : null,
    };
    const nextCrumbs = [...breadcrumbs, startPt];
    setBreadcrumbs(nextCrumbs);
    setIsRecording(true);

    await updateLastKnownMapGps({
      lat: fix.lat,
      lng: fix.lng,
      altitude: fix.altitude,
      accuracy: currentGps.hasRealFix ? currentGps.accuracy : null,
      timestamp: new Date().toISOString(),
      source: currentGps.hasRealFix ? 'map_watch' : 'pinned_start',
      trailId: selectedTrail.id,
      trailName: selectedTrail.name,
    });

    if (activeSession) {
      const recIso = activeSession.recordingStartedAt || new Date().toISOString();
      const updated: TrailSafetySession = {
        ...activeSession,
        recordingStartedAt: recIso,
        breadcrumbs: nextCrumbs,
        lastKnownLat: fix.lat,
        lastKnownLng: fix.lng,
        lastKnownCoords: `${fix.lat.toFixed(6)}, ${fix.lng.toFixed(6)}`,
        currentAltitude: fix.altitude,
        lastMovementAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await persistSessionProgress(updated, true);

      if (!updated.manualStartAlertSent && !updated.autoStartAlertSent) {
        setStartFailsafeRemainingSec(FIVE_MINUTES_SEC);
        setShowStartPromptModal(true);
      }
    }
  };

  const resetTrailUiSessionState = () => {
    sosCancelTokenRef.current += 1;
    setSosActive(false);
    setManualSosDispatching(false);
    setManualSosReceipt(null);
    setOverdueAlertReceipt(null);
    setIsOverdue(false);
    setShowStartPromptModal(false);
    setStartFailsafeRemainingSec(FIVE_MINUTES_SEC);
    setAutoStartTriggeredBanner(null);
    setInactivityStage1Active(false);
    setInactivityStage2Active(false);
    setStillnessSeconds(0);
    setTimeRemainingSeconds(0);
    setInitialAlertResult(null);
    setIsIceCardExpandedMobile(false);
    setCopiedSos(false);
    setCopiedTrackLink(false);

    // Clear all Safety Passport form fields & turn Initial Planned Trail OFF
    setHikerName('');
    setGroupSize('');
    setEmergencyContactName('');
    setEmergencyContact('');
    setExpectedHours('');
    setSelectedTrailId('');
    setSelectedTrail(CAMERON_TRAILS[0]);
    setIsPlannedTrailEnabled(false);
    setFormError(null);

    // Reset map & active monitoring state
    if (breadcrumbLineRef.current) {
      breadcrumbLineRef.current.remove();
      breadcrumbLineRef.current = null;
    }
    setIsRecording(false);
    setBreadcrumbs([]);
    setPinnedStart(null);
    setActiveSession(null);
    setResumableSession(null);
    setIsConfirmingResetSession(false);
    setIsFullScreenMap(false);
    setPassportUnlocked(false);
    overdueFiredRef.current = false;
    autoStartFiredRef.current = false;
    inactivity1FiredRef.current = false;
    inactivity2FiredRef.current = false;
  };

  const handleCheckOutSafely = async () => {
    if (activeSession) {
      await markTrailSessionCheckedOut(activeSession);
    }
    resetTrailUiSessionState();
  };

  // Reset active session, switch off SOS Alert & timers, and clear Safety Passport setup
  const handleResetToSafetyPassport = async () => {
    const cached = activeSession || getCachedActiveTrailSession();
    resetTrailUiSessionState();
    if (cached) {
      await markTrailSessionCheckedOut(cached).catch(() => {});
    }
  };

  // Reset Active Map from the "Active Session Available" prompt (wipes stale GPS, breadcrumbs & timers)
  const handleResetActiveCachedSession = async () => {
    const cached = resumableSession || activeSession || getCachedActiveTrailSession();
    resetTrailUiSessionState();
    if (cached) {
      await markTrailSessionCheckedOut(cached).catch(() => {});
    }
    await clearCachedTrailSessionAndGps();
  };

  // Automatic One-Tap Smart SOS Activation (WhatsApp + Native SMS + Backend Relay, staying on Map)
  const handleTriggerSmartSos = async () => {
    const mySosToken = ++sosCancelTokenRef.current;
    setSosActive(true);
    setManualSosDispatching(true);
    try {
      const card = firebaseService.getEmergencyCard();
      const targetPhone =
        activeSession?.emergencyContact ||
        emergencyContact ||
        card.designatedSosNumber ||
        card.primaryContact?.phone ||
        '999';
      const sender =
        activeSession?.hikerName ||
        hikerName ||
        currentUser?.displayName ||
        card.fullLegalName ||
        'Highland Hiker';

      const trackingUrl = activeSession
        ? buildTrailTrackingUrl(activeSession.id, activeSession.trackingToken)
        : '';

      // Synchronously prepare immediate coordinates & dispatch WhatsApp + Native SMS within user gesture
      const syncGps = currentGpsRef.current.hasRealFix
        ? {
            lat: currentGpsRef.current.lat,
            lng: currentGpsRef.current.lng,
            accuracy: currentGpsRef.current.accuracy,
            source: 'live_gps' as const,
          }
        : activeSession?.lastKnownLat && activeSession?.lastKnownLng
        ? {
            lat: activeSession.lastKnownLat,
            lng: activeSession.lastKnownLng,
            accuracy: null,
            source: (activeSession.coordSource || 'cached_session') as string,
          }
        : {
            lat: selectedTrail.coordinates[0][0],
            lng: selectedTrail.coordinates[0][1],
            accuracy: null,
            source: 'trailhead' as const,
          };

      const buildPayload = (
        lat: number,
        lng: number,
        accuracy: number | null,
        source: string,
        tel: DeviceTelemetrySnapshot
      ) =>
        [
          `🚨 CAMGO SMART TRAIL SOS ALERT 🚨`,
          `Hiker: ${sender} (Group: ${activeSession?.groupSize || groupSize})`,
          `Trail: ${selectedTrail.name}`,
          `📍 GPS (${source}): ${lat.toFixed(6)}, ${lng.toFixed(6)}${
            accuracy ? ` (±${Math.round(accuracy)}m)` : ''
          }`,
          trackingUrl ? `🥾 Live Footprint Map: ${trackingUrl}` : null,
          `🗺️ Live Map: https://www.google.com/maps?q=${lat},${lng}`,
          `🔋 Battery: ${tel.batteryPercent ?? 'N/A'}%${
            tel.isCharging ? ' (Charging)' : ''
          } | 📶 ${tel.signalLabel}`,
          `Pinned Start: ${
            pinnedStart
              ? `${pinnedStart.lat.toFixed(5)}, ${pinnedStart.lng.toFixed(5)}`
              : 'Session trailhead'
          }`,
        ]
          .filter(Boolean)
          .join('\n');

      const immediateMsg = buildPayload(
        syncGps.lat,
        syncGps.lng,
        syncGps.accuracy,
        syncGps.source,
        telemetryRef.current
      );
      const immediateWaUrl = buildWhatsAppLink(targetPhone, immediateMsg);
      const immediateSmsUrl = buildSmsLink(targetPhone, immediateMsg);

      if (targetPhone && targetPhone !== '999') {
        triggerProgrammaticDeepLink(immediateWaUrl, true);
        window.setTimeout(() => {
          triggerProgrammaticDeepLink(immediateSmsUrl, false);
        }, 250);
      }

      const bestGps = await resolveBestSosCoordinates(3500);
      if (sosCancelTokenRef.current !== mySosToken) return;
      const liveTel = await readLiveDeviceTelemetry(bestGps.accuracy);
      if (sosCancelTokenRef.current !== mySosToken) return;
      setTelemetry(liveTel);

      const outcome = await sendOrQueueEmergencySos({
        lat: bestGps.lat,
        lng: bestGps.lng,
        accuracy: bestGps.accuracy,
        userHandle: sender,
        sosType: 'stranded_lost',
        severity: 'critical',
        recipientPhone: targetPhone,
        emergencyCard: card,
        trailName: selectedTrail.name,
        trailSessionId: activeSession?.id,
        triggerSource: 'manual_smart_sos',
        coordSource: bestGps.source,
        telemetry: liveTel,
      });

      if (sosCancelTokenRef.current !== mySosToken) return;

      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        Promise.allSettled([
          fetch('/api/emergency/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientPhone: targetPhone,
              senderName: sender,
              coordinates: { lat: bestGps.lat, lng: bestGps.lng },
              emergencyCard: card,
              trailName: selectedTrail.name,
              triggerSource: 'manual_smart_sos',
              telemetry: liveTel,
            }),
          }),
          fetch('/api/trails/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: activeSession?.id || `sos-${Date.now()}`,
              eventType: 'manual_smart_sos',
              hikerName: sender,
              trailName: selectedTrail.name,
              emergencyContact: targetPhone,
              coordinates: { lat: bestGps.lat, lng: bestGps.lng },
              trackingUrl,
              telemetry: liveTel,
              message: immediateMsg,
            }),
          }),
        ]).catch(() => {});
      }

      const finalMsg = buildPayload(
        bestGps.lat,
        bestGps.lng,
        bestGps.accuracy,
        bestGps.source,
        liveTel
      );

      setManualSosReceipt({
        outcome,
        coords: {
          lat: bestGps.lat,
          lng: bestGps.lng,
          accuracy: bestGps.accuracy,
          source: bestGps.source,
        },
        message: finalMsg,
        smsUrl: buildSmsLink(targetPhone, finalMsg),
        whatsappUrl: buildWhatsAppLink(targetPhone, finalMsg),
        dispatchedAt: new Date().toISOString(),
      });
    } finally {
      if (sosCancelTokenRef.current === mySosToken) {
        setManualSosDispatching(false);
      }
    }
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
    }, 300);
  };

  const handleCopySos = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedSos(true);
    setTimeout(() => setCopiedSos(false), 2500);
  };

  const formatCountdown = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  const formatMmSs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const displayedElevationPts = selectedTrail.elevationProfile || [];
  const minAlt = displayedElevationPts.length
    ? Math.min(...displayedElevationPts.map((p) => p.altitude)) - 60
    : 1400;
  const maxAlt = displayedElevationPts.length
    ? Math.max(...displayedElevationPts.map((p) => p.altitude))
    : 2100;
  const altSpan = Math.max(120, maxAlt - minAlt);

  const liveTrackingUrl = activeSession
    ? buildTrailTrackingUrl(activeSession.id, activeSession.trackingToken)
    : '';

  const startAlertText = activeSession
    ? `CAMGO TRAIL START: ${activeSession.hikerName} (Group: ${activeSession.groupSize}) started ${selectedTrail.name} at ${new Date(
        activeSession.recordingStartedAt || activeSession.startedAt
      ).toLocaleTimeString('en-MY', {
        hour: '2-digit',
        minute: '2-digit',
      })}. Expected return: ${activeSession.expectedHours} hours. Live Footprint Map: ${liveTrackingUrl}`
    : '';

  return (
    <div className="fixed inset-0 z-[150] bg-stone-950 flex flex-col overflow-hidden animate-in fade-in duration-200">
      <div className="w-full h-[100dvh] bg-stone-950 flex flex-col overflow-hidden relative">
        {/* Clean Single-Row Modal Header */}
        <div className="shrink-0 z-30 flex items-center justify-between gap-2 px-3.5 sm:px-5 py-3 border-b border-white/10 bg-stone-900/95 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono font-bold text-stone-300 whitespace-normal break-words leading-tight">
                <span className="text-emerald-400 uppercase">TRAIL SAFETY</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  {telemetry.isOnline ? (
                    <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
                  )}
                  <span>{telemetry.isOnline ? telemetry.effectiveType.toUpperCase() : 'OFFLINE'}</span>
                </span>
                {telemetry.batteryPercent !== null && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      {telemetry.isCharging ? (
                        <BatteryCharging className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <Battery className="w-3 h-3 text-amber-300 shrink-0" />
                      )}
                      <span>{telemetry.batteryPercent}%</span>
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-sm sm:text-lg font-heading font-black text-stone-100 tracking-tight whitespace-normal break-words leading-tight mt-0.5">
                {language === 'bm' ? 'Highland Trails — Keselamatan & Peta GPS' : 'Highland Trail Safety & Map'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!passportUnlocked && (
              <button
                type="button"
                onClick={handlePreDownloadOfflineCache}
                disabled={isPreDownloading}
                className="min-h-[40px] min-w-[40px] px-2.5 sm:px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer shadow-sm"
                aria-label="Cache offline trail map"
              >
                <Download
                  className={`w-4 h-4 text-emerald-400 ${isPreDownloading ? 'animate-bounce' : ''}`}
                />
                <span className="hidden sm:inline">
                  {isPreDownloading ? `${downloadProgress}%` : cacheVerified ? 'Map Cached' : 'Cache Map'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 hover:border-emerald-500/50 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stage 1 & Stage 2 Motion Stillness Dead-Man Banners */}
        {inactivityStage1Active && !inactivityStage2Active && (
          <div className="mx-3.5 sm:mx-5 mt-3 p-3.5 rounded-2xl bg-amber-950/90 border-2 border-amber-400 text-amber-100 space-y-2 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                <span>ARE YOU OK? 15 MINUTES OF NO MOVEMENT DETECTED</span>
              </div>
              <button
                type="button"
                onClick={handleDismissStillnessWarning}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg cursor-pointer"
              >
                I&apos;m OK — Reset Timer
              </button>
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed">
              Zero phone motion or GPS displacement detected for 15 minutes. Your Emergency Contact ({emergencyContact}) was alerted. Critical escalation runs at 30 minutes if not dismissed.
            </p>
          </div>
        )}

        {inactivityStage2Active && (
          <div className="mx-3.5 sm:mx-5 mt-3 p-3.5 rounded-2xl bg-rose-950/95 border-2 border-rose-500 text-rose-100 space-y-2 shrink-0 animate-pulse">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-white">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>CRITICAL 30-MIN IMMOBILITY ESCALATION SENT</span>
              </div>
              <button
                type="button"
                onClick={handleDismissStillnessWarning}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                I&apos;m Safe — Cancel Alarm
              </button>
            </div>
            <p className="text-xs text-rose-200 leading-relaxed">
              30 minutes of zero movement detected. Exact last GPS, battery ({telemetry.batteryPercent ?? 'N/A'}%), and telemetry were escalated to ICE ({emergencyContact}) &amp; CamGo Admin.
            </p>
          </div>
        )}

        {/* Overdue Automated Alert Banner */}
        {isOverdue && (
          <div className="mx-3.5 sm:mx-5 mt-3 p-3.5 rounded-2xl bg-rose-950/90 border-2 border-rose-500 text-rose-100 space-y-2 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-rose-200">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>
                  {language === 'bm'
                    ? 'AMARAN TAMAT MASA AUTOMATIK DIHANTAR!'
                    : 'OVERDUE ALERT TRIGGERED TO ICE CONTACT & CAMGO ADMIN!'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCheckOutSafely}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                I Am Safe — Check Out
              </button>
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              Expected return duration expired. Last GPS coordinates &amp; telemetry dispatched to Rescue Admin and Emergency Contact ({activeSession?.emergencyContact}).
            </p>
            {overdueAlertReceipt && (
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={overdueAlertReceipt.smsUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Overdue SMS</span>
                </a>
                <a
                  href={overdueAlertReceipt.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>WhatsApp ICE</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Single Clean Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 sm:px-5 py-3.5 sm:py-5 pb-8 sm:pb-6 space-y-4">
          {/* ==================== SAFETY PASSPORT & TRAIL UNLOCK FORM ==================== */}
          {!passportUnlocked && (
            <form
              onSubmit={handleSubmitSafetyPassport}
              className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-stone-950/90 border border-emerald-500/40 shadow-xl space-y-4 animate-in fade-in duration-200"
            >
              {/* Optional Resume / Reset Active Track Banner if a live session is cached */}
              {resumableSession && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/55 border border-emerald-500/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-[11px] font-mono font-bold uppercase text-emerald-300">
                        {language === 'bm' ? 'Sesi Aktif Tersedia' : 'Active Session Available'}
                      </div>
                      <div className="text-xs text-stone-200 whitespace-normal break-words leading-snug">
                        {resumableSession.trailName} • {language === 'bm' ? 'Pendaki' : 'Hiker'}: {resumableSession.hikerName}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleResumeCachedSession}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <Navigation className="w-3.5 h-3.5 shrink-0" />
                        <span>{language === 'bm' ? 'Sambung Peta Aktif' : 'Resume Active Map'}</span>
                      </button>

                      {!isConfirmingResetSession ? (
                        <button
                          type="button"
                          onClick={() => setIsConfirmingResetSession(true)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-rose-500/40 text-rose-300 font-bold text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span>{language === 'bm' ? 'Set Semula Peta' : 'Reset Active Map'}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleResetActiveCachedSession}
                            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-md"
                          >
                            {language === 'bm' ? 'Sahkan Set Semula' : 'Confirm Reset'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsConfirmingResetSession(false)}
                            className="min-h-[44px] px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs shrink-0 cursor-pointer"
                          >
                            {language === 'bm' ? 'Batal' : 'Cancel'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-3">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 whitespace-normal break-words">
                      {language === 'bm' ? 'Protokol Keselamatan Utama' : 'Safety First Protocol'}
                    </div>
                    <h3 className="text-base sm:text-lg font-heading font-black text-white leading-tight whitespace-normal break-words">
                      {language === 'bm'
                        ? 'Pasport Keselamatan & Tetapan SOS Wajib'
                        : 'Mandatory Safety Passport & SOS Setup'}
                    </h3>
                  </div>
                </div>

                {!currentUser ? (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="self-start sm:self-auto min-h-[40px] px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-white/10 text-xs font-bold text-emerald-300 flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-normal"
                  >
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Sign In (Optional Sync)</span>
                  </button>
                ) : (
                  <div className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-300 font-bold max-w-full">
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    <span className="break-all whitespace-normal">{currentUser.email}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                {language === 'bm'
                  ? 'Lengkapkan maklumat kecemasan anda terlebih dahulu sebelum membuka peta laluan. Kenalan Kecemasan anda juga akan menerima pautan Peta Jejak Langsung.'
                  : 'Complete your Safety Passport to unlock trail selection and open the live GPS trail map. CamGo tracks breadcrumbs, motion stillness alerts, battery, and creates a Live Footprint Tracker link for your Emergency Contact.'}
              </p>

              {/* Collapsible Forestry Permit (HSK) & Malim Gunung (MGP) Rules Capsule (Collapsed by default) */}
              <div className="rounded-2xl bg-amber-950/30 border border-amber-500/35 overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isPermitCapsuleOpen}
                  onClick={() => setIsPermitCapsuleOpen((prev) => !prev)}
                  className="w-full min-h-[48px] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-amber-950/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                    <FileText className="w-4 h-4 text-amber-300 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="text-xs font-bold text-amber-200 whitespace-normal leading-snug">
                      {language === 'bm'
                        ? 'Panduan & Syarat Permit HSK & Malim Gunung (MGP)'
                        : 'Forestry Permit (HSK) & Malim Gunung (MGP) Rules & Guide'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-[11px] font-bold text-amber-300">
                    <span>{isPermitCapsuleOpen ? 'Hide' : 'View'}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isPermitCapsuleOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isPermitCapsuleOpen && (
                  <div className="px-3.5 pb-3.5 pt-2.5 border-t border-amber-500/25 space-y-3 text-xs text-stone-200 leading-relaxed animate-in fade-in duration-150">
                    <p className="text-amber-100 font-medium">
                      {language === 'bm'
                        ? 'Mana-mana laluan atau gunung dalam Hutan Simpanan Kekal (HSK) Cameron Highlands memerlukan permit perhutanan rasmi dan Malim Gunung Perhutanan (MGP) berdaftar untuk puncak altitud tinggi.'
                        : 'Any hiking trail or mountain inside a Permanent Forest Reserve (HSK) in Cameron Highlands officially requires a forestry permit, and a registered Malim Gunung Perhutanan (MGP) guide is mandatory for high-altitude peaks.'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-2.5 rounded-xl bg-stone-950/90 border border-white/10">
                        <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                          Guide Ratio
                        </div>
                        <div className="text-sm font-black text-white">1 : 7</div>
                        <div className="text-[11px] text-stone-400">Max 7 hikers per licensed MGP</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-stone-950/90 border border-white/10">
                        <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                          Daily Quota
                        </div>
                        <div className="text-sm font-black text-white">~60 Hikers / Day</div>
                        <div className="text-[11px] text-stone-400">Pahang Forestry daily cap</div>
                      </div>
                    </div>

                    <ul className="space-y-1.5 text-[11px] text-stone-300">
                      <li>
                        <strong className="text-rose-300">Gunung Irau (Trail 14):</strong> Permit HSK &amp; MGP guide strictly enforced past boardwalk.
                      </li>
                      <li>
                        <strong className="text-amber-300">Gunung Siku, Yong Belar &amp; Suku:</strong> Advance HSK permits &amp; registered guides required.
                      </li>
                      <li>
                        <strong className="text-emerald-300">Gunung Brinchang (Trail 1):</strong> Full jungle route from Brinchang requires permit &amp; guide.
                      </li>
                    </ul>

                    <a
                      href="https://www.facebook.com/p/Persatuan-Malim-Gunung-Cameron-Highlands-PMGCH-100088179327815/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Book Malim Gunung Guide (PMGCH)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-xs text-rose-200 font-semibold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Required Fields — Clean Single-Column Stack on Mobile, 2-Column on Desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-stone-300 mb-1">
                    {language === 'bm' ? 'Nama Pendaki / Ketua *' : 'Hiker / Lead Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={hikerName}
                    onChange={(e) => setHikerName(e.target.value)}
                    placeholder={language === 'bm' ? 'Cth: Ahmad Faris' : 'e.g., Ahmad Faris'}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/15 text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-stone-300 mb-1">
                    {language === 'bm' ? 'Nama Kenalan Kecemasan (ICE) *' : 'Emergency Contact Name (ICE) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder={language === 'bm' ? 'Cth: Siti (Pasangan / Waris)' : 'e.g., Siti (Spouse / Next of Kin)'}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/15 text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-stone-300 mb-1">
                    {language === 'bm' ? 'No. Telefon Kecemasan (ICE) *' : 'Emergency Contact Phone (ICE) *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder={language === 'bm' ? 'Cth: +60123456789' : 'e.g., +60123456789'}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/15 text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-stone-300 mb-1">
                    {language === 'bm' ? 'Bilangan Ahli (Pendaki) *' : 'Group Size (Hikers) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={30}
                    placeholder={language === 'bm' ? 'Cth: 2' : 'e.g., 2'}
                    value={groupSize}
                    onChange={(e) => setGroupSize(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/15 text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-stone-300 mb-1">
                    {language === 'bm' ? 'Anggaran Tempoh Pulang (Jam) *' : 'Expected Return Duration (Hours) *'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0.5}
                    max={48}
                    required
                    placeholder={language === 'bm' ? 'Cth: 3' : 'e.g., 3'}
                    value={expectedHours}
                    onChange={(e) => setExpectedHours(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/15 text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Live Telemetry Sensor Readiness Strip */}
              <div className="p-3 rounded-2xl bg-stone-900 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-stone-200">
                  <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold">{language === 'bm' ? 'Sensor Langsung Sedia' : 'Live Sensors Ready'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-stone-300">
                  <span>
                    GPS:{' '}
                    <strong className="text-emerald-400">
                      {currentGps.hasRealFix ? `${language === 'bm' ? 'Terkunci' : 'Locked'} (±${currentGps.accuracy}m)` : (language === 'bm' ? 'Mengesan...' : 'Acquiring...')}
                    </strong>
                  </span>
                  <span>
                    {language === 'bm' ? 'Bateri:' : 'Battery:'}{' '}
                    <strong className="text-amber-300">
                      {telemetry.batteryPercent !== null ? `${telemetry.batteryPercent}%` : (language === 'bm' ? 'Sedia' : 'Ready')}
                    </strong>
                  </span>
                  <span>
                    {language === 'bm' ? 'Isyarat:' : 'Signal:'} <strong className="text-sky-300">{telemetry.signalLabel}</strong>
                  </span>
                </div>
              </div>

              {/* Gated Initial Planned Trail Toggle (OFF by default) & Selector */}
              <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-white/15 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="camgo-initial-planned-trail"
                    className="text-[11px] font-bold uppercase text-stone-200 flex items-center gap-1.5"
                  >
                    {isPassportFieldsValid && isPlannedTrailEnabled ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span>{language === 'bm' ? 'Laluan Awal Dirancang' : 'Initial Planned Trail'}</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        !isPassportFieldsValid
                          ? 'text-amber-300'
                          : isPlannedTrailEnabled
                          ? 'text-emerald-400'
                          : 'text-stone-400'
                      }`}
                    >
                      {!isPassportFieldsValid
                        ? (language === 'bm' ? 'Isi ruangan * dahulu' : 'Fill * fields first')
                        : isPlannedTrailEnabled
                        ? 'ON'
                        : 'OFF'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPlannedTrailEnabled}
                      aria-label="Toggle Initial Planned Trail"
                      disabled={!isPassportFieldsValid}
                      onClick={() => {
                        if (!isPassportFieldsValid) return;
                        setIsPlannedTrailEnabled((prev) => {
                          const next = !prev;
                          if (!next) {
                            setSelectedTrailId('');
                            setSelectedTrail(CAMERON_TRAILS[0]);
                          }
                          return next;
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                        !isPassportFieldsValid
                          ? 'bg-stone-800 border-white/10 opacity-50 cursor-not-allowed'
                          : isPlannedTrailEnabled
                          ? 'bg-emerald-500 border-emerald-300 cursor-pointer'
                          : 'bg-stone-800 border-white/20 cursor-pointer'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          isPlannedTrailEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {isPlannedTrailEnabled && isPassportFieldsValid ? (
                  <>
                    <select
                      id="camgo-initial-planned-trail"
                      value={selectedTrailId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedTrailId(val);
                        const t = CAMERON_TRAILS.find((x) => x.id === val);
                        if (t) {
                          setSelectedTrail(t);
                        }
                      }}
                      className="w-full max-w-full min-h-[48px] px-3 py-2.5 rounded-xl border bg-stone-950 border-emerald-500/45 text-white font-semibold text-xs sm:text-sm focus:outline-none focus:border-emerald-400 cursor-pointer transition-colors"
                    >
                      <option value="">
                        {language === 'bm'
                          ? '-- Pilih laluan yang dirancang --'
                          : '-- Select planned trail --'}
                      </option>
                      {CAMERON_TRAILS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.difficulty} ({t.distanceKm}km • {t.estDurationHrs})
                        </option>
                      ))}
                    </select>
                    {selectedTrailId && (
                      <div className="text-[11px] text-stone-300 whitespace-normal break-words leading-snug space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {selectedTrail.isAdminTest && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono font-bold text-[10px]">
                              [Admin Test]
                            </span>
                          )}
                          <span className="font-bold text-emerald-300">{selectedTrail.name}</span>
                          <span>
                            • {selectedTrail.difficulty} ({selectedTrail.distanceKm}km • {selectedTrail.estDurationHrs})
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {selectedTrail.trailheadName} → {selectedTrail.peakName || 'Finish'}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-stone-400 leading-snug">
                    {language === 'bm'
                      ? 'Pilihan laluan awal dimatikan secara lalai. Lengkapkan butiran wajib di atas untuk mengaktifkannya.'
                      : 'Initial Planned Trail is OFF by default. Complete the mandatory fields above and toggle ON to choose a specific trail.'}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2.5 w-full min-w-0">
                <button
                  type="button"
                  onClick={handleResetToSafetyPassport}
                  className="no-mobile-clamp min-h-[42px] sm:min-h-[52px] px-2.5 sm:px-4 py-2 sm:py-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 font-heading font-bold text-[10px] sm:text-sm flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all active:scale-[0.98] shrink-0 whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>{language === 'bm' ? 'Set Semula' : 'Reset'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingPassport || !canSubmitPassport}
                  className="no-mobile-clamp flex-1 min-w-0 min-h-[42px] sm:min-h-[52px] py-2 sm:py-3.5 px-2.5 sm:px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-black text-[10.5px] min-[380px]:text-[11px] sm:text-base shadow-xl shadow-emerald-950 flex items-center justify-center gap-1 sm:gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <ShieldAlert className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" />
                  <span className="truncate whitespace-nowrap">
                    {isSubmittingPassport
                      ? 'Opening...'
                      : language === 'bm'
                      ? 'Hantar Pasport Keselamatan'
                      : 'Submit Safety Passport'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0" />
                </button>
              </div>
            </form>
          )}

          {/* ==================== CLEANED-UP INTERACTIVE TRAIL MAP & LIVE TELEMETRY VIEW ==================== */}
          {passportUnlocked && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Trail Check-In Notification & ICE Alert Card (Mobile Capsule -> Full-Page Modal | Desktop Inline) */}
              {initialAlertResult && (
                <>
                  {/* Mobile Capsule Trigger */}
                  <div className="sm:hidden">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setIsIceCardExpandedMobile(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setIsIceCardExpandedMobile(true);
                      }}
                      className="w-full px-3.5 py-2 rounded-full bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border-2 border-emerald-400 text-stone-100 shadow-lg flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                          <Send className="w-3.5 h-3.5 animate-pulse" />
                        </span>
                        <span className="text-[11px] font-bold text-white truncate">
                          {language === 'bm'
                            ? `Notifikasi ICE • ${activeSession?.emergencyContactName || emergencyContactName || 'Kenalan'} (Ketik Buka)`
                            : `ICE Alert Capsule • ${activeSession?.emergencyContactName || emergencyContactName || 'Contact'} (Tap)`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-stone-950 text-[10px] font-black uppercase">
                          {language === 'bm' ? 'Buka' : 'Open'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInitialAlertResult(null);
                          }}
                          className="p-1 rounded-full hover:bg-white/10 text-stone-400 hover:text-white cursor-pointer"
                          title="Dismiss alert capsule"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Inline Card */}
                  <div className="hidden sm:block p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-stone-950 border-2 border-emerald-400 text-stone-100 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <Send className="w-4 h-4 animate-pulse" />
                        </span>
                        <div>
                          <span className="text-[10px] font-mono font-black uppercase text-emerald-400 tracking-wider">
                            {language === 'bm' ? 'Pemberitahuan Kecemasan ICE' : 'ICE Emergency Notification'}
                          </span>
                          <h4 className="text-xs font-bold text-white">
                            {language === 'bm'
                              ? `Amaran Daftar Jejak Sedia Untuk: ${activeSession?.emergencyContactName || emergencyContactName} (${activeSession?.emergencyContact || emergencyContact})`
                              : `Trail Check-In Alert Ready For: ${activeSession?.emergencyContactName || emergencyContactName} (${activeSession?.emergencyContact || emergencyContact})`}
                          </h4>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInitialAlertResult(null)}
                        className="p-1 rounded-lg hover:bg-white/10 text-stone-400 hover:text-white cursor-pointer"
                        title="Dismiss alert card"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-stone-300 leading-snug">
                      {language === 'bm'
                        ? 'Pautan jejak langsung dan koordinat mula telah dijana. Tekan WhatsApp atau SMS di bawah untuk menghantar amaran segera kepada kenalan kecemasan anda:'
                        : 'Live footprint tracker link and trailhead coordinates generated. Tap WhatsApp or SMS below to dispatch your departure alert to your emergency contact:'}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <a
                        href={initialAlertResult.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleMarkManualStartAlertSent}
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>{language === 'bm' ? 'Hantar WhatsApp ke ICE' : 'Send WhatsApp to ICE'}</span>
                      </a>
                      <a
                        href={initialAlertResult.smsUrl}
                        onClick={handleMarkManualStartAlertSent}
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>{language === 'bm' ? 'Hantar SMS ke ICE' : 'Send SMS to ICE'}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyTrackingLink(initialAlertResult.trackingUrl)}
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95 transition-all shrink-0"
                      >
                        <Share2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{copiedTrackLink ? (language === 'bm' ? 'Disalin!' : 'Copied!') : (language === 'bm' ? 'Salin Pautan' : 'Copy Link')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 5-Minute Record Trail Start Alert Card / Failsafe (Mobile Capsule -> Full-Page Modal | Desktop Inline) */}
              {showStartPromptModal && activeSession && (
                <>
                  {/* Mobile Capsule Trigger */}
                  <div className="sm:hidden">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setIsIceCardExpandedMobile(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setIsIceCardExpandedMobile(true);
                      }}
                      className="w-full px-3.5 py-2 rounded-full bg-gradient-to-r from-teal-950 via-stone-900 to-teal-950 border-2 border-teal-400 text-stone-100 shadow-lg flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="p-1 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/40 shrink-0">
                          <Footprints className="w-3.5 h-3.5 animate-bounce" />
                        </span>
                        <span className="text-[11px] font-bold text-white truncate">
                          {language === 'bm'
                            ? `Failsafe ICE • Beritahu ${activeSession.emergencyContactName || emergencyContactName}`
                            : `5-Min ICE Alert • Notify ${activeSession.emergencyContactName || emergencyContactName}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/40">
                          {Math.floor(startFailsafeRemainingSec / 60)}:{(startFailsafeRemainingSec % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-teal-400 text-stone-950 text-[10px] font-black uppercase">
                          {language === 'bm' ? 'Buka' : 'Open'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Inline Card */}
                  <div className="hidden sm:block p-4 rounded-2xl bg-gradient-to-r from-teal-950 via-stone-900 to-stone-950 border-2 border-teal-400 text-stone-100 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/40">
                          <Footprints className="w-4 h-4 animate-bounce" />
                        </span>
                        <div>
                          <span className="text-[10px] font-mono font-black uppercase text-teal-400 tracking-wider">
                            {language === 'bm' ? 'Amaran Mula Jejak (Failsafe 5-Minit)' : 'Trail Start Alert (5-Min Failsafe)'}
                          </span>
                          <h4 className="text-xs font-bold text-white">
                            {language === 'bm'
                              ? `Rakaman Bermula • Beritahu ${activeSession.emergencyContactName || emergencyContactName}`
                              : `Trail Recording Active • Notify ${activeSession.emergencyContactName || emergencyContactName}`}
                          </h4>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-amber-300 px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-500/40 shrink-0">
                        {Math.floor(startFailsafeRemainingSec / 60)}:{(startFailsafeRemainingSec % 60).toString().padStart(2, '0')}
                      </div>
                    </div>

                    <p className="text-[11px] text-stone-300 leading-snug">
                      {language === 'bm'
                        ? `Hantar pautan jejak langsung anda kepada ${activeSession.emergencyContactName} (${activeSession.emergencyContact}). Failsafe akan menghantar amaran automatik sekiranya tidak dihantar.`
                        : `Send your live footprint tracking link to ${activeSession.emergencyContactName} (${activeSession.emergencyContact}). Automated failsafe will alert ICE if not sent within 5 minutes.`}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <a
                        href={buildWhatsAppLink(
                          activeSession.emergencyContact,
                          `CAMGO TRAIL START: ${activeSession.hikerName} started recording ${activeSession.trailName}. Live Footprint: ${buildTrailTrackingUrl(activeSession.id, activeSession.trackingToken)} | GPS: https://www.google.com/maps?q=${activeSession.lastKnownLat},${activeSession.lastKnownLng}`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleMarkManualStartAlertSent}
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>WhatsApp ICE</span>
                      </a>
                      <a
                        href={buildSmsLink(
                          activeSession.emergencyContact,
                          `CAMGO TRAIL START: ${activeSession.hikerName} started recording ${activeSession.trailName}. Live Footprint: ${buildTrailTrackingUrl(activeSession.id, activeSession.trackingToken)} | GPS: https://www.google.com/maps?q=${activeSession.lastKnownLat},${activeSession.lastKnownLng}`
                        )}
                        onClick={handleMarkManualStartAlertSent}
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>SMS ICE</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleMarkManualStartAlertSent}
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer shrink-0"
                      >
                        {language === 'bm' ? 'Tutup / Selesai' : 'Dismiss / Done'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 5-Minute Auto-Start Failsafe Triggered Banner */}
              {autoStartTriggeredBanner && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-950/90 border-2 border-amber-400 text-amber-100 shadow-2xl space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {language === 'bm'
                          ? '5-MINIT FAILSAFE: AMARAN MULA JEJAK TELAH DIHANTAR'
                          : '5-MINUTE FAILSAFE: START ALERT DISPATCHED TO ICE'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoStartTriggeredBanner(null)}
                      className="p-1 rounded-lg hover:bg-white/10 text-stone-300 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-amber-100/90 leading-snug">
                    {autoStartTriggeredBanner.message}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {autoStartTriggeredBanner.whatsappUrl && (
                      <a
                        href={autoStartTriggeredBanner.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>WhatsApp ICE</span>
                      </a>
                    )}
                    {autoStartTriggeredBanner.smsUrl && (
                      <a
                        href={autoStartTriggeredBanner.smsUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>SMS ICE</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Sleek Single-Row Translucent HUD Bar */}
              <div className="relative z-40">
                <div className="px-3 py-2 rounded-2xl bg-stone-900/75 backdrop-blur-xl border border-white/10 shadow-lg flex items-center justify-between gap-2">
                  {/* Left: Essential Countdown + Active Trail / GPS Status */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setIsSafetyBriefOpen(true)}
                      className={`px-2.5 py-1 rounded-xl border font-mono font-bold text-[11px] flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                        isOverdue
                          ? 'bg-rose-950/90 border-rose-500 text-rose-200 animate-pulse'
                          : 'bg-emerald-950/80 border-emerald-500/35 text-emerald-300 hover:bg-emerald-900/80'
                      }`}
                      title="Tap for Safety & Telemetry Brief"
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="tabular-nums">
                        {isOverdue ? 'OVERDUE' : formatCountdown(timeRemainingSeconds)}
                      </span>
                    </button>

                    <div className="min-w-0 flex items-center gap-1.5 text-xs text-stone-200">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          currentGps.hasRealFix ? 'bg-emerald-400' : 'bg-sky-400'
                        }`}
                      />
                      <span className="font-semibold truncate">
                        {selectedTrail.name.split(':')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Right: Quick Record, Quick SOS & Collapsible Secondary Tools Pill */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleToggleRecording}
                      className={`min-h-[34px] px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                        isRecording
                          ? 'bg-rose-600 text-white animate-pulse shadow-md'
                          : 'bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-sm'
                      }`}
                      title={isRecording ? 'Pause Trail Recording' : 'Start Trail Recording'}
                    >
                      <Footprints className="w-3.5 h-3.5 shrink-0" />
                      <span className="no-mobile-clamp tabular-nums">
                        {isRecording
                          ? `${language === 'bm' ? 'Jeda' : 'Pause'} (${breadcrumbs.length})`
                          : (language === 'bm' ? 'Rakam' : 'Record')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerSmartSos}
                      disabled={manualSosDispatching}
                      aria-pressed={sosActive}
                      className={`min-h-[34px] px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                        sosActive || manualSosDispatching
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/35'
                      }`}
                      title="Trigger Smart SOS Alert"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span className="no-mobile-clamp">SOS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsToolsMenuOpen((prev) => !prev)}
                      aria-expanded={isToolsMenuOpen}
                      className={`min-h-[34px] px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        isToolsMenuOpen
                          ? 'bg-white text-stone-950 border-white shadow-md'
                          : 'bg-stone-800/80 hover:bg-stone-700/80 text-stone-200 border-white/15'
                      }`}
                      title="Trail Utilities & Secondary Controls"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden xs:inline">{language === 'bm' ? 'Alatan' : 'Tools'}</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          isToolsMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Collapsible Floating Glass Tools Drawer (Normal View) */}
                {isToolsMenuOpen && !isFullScreenMap && (
                  <div className="mt-2 p-2.5 rounded-2xl bg-stone-950/92 backdrop-blur-2xl border border-white/15 shadow-2xl grid grid-cols-2 sm:grid-cols-4 gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        setIsSunWeatherModalOpen(true);
                      }}
                      className="min-h-[40px] px-2.5 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-white/10 text-stone-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Sunrise className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="truncate">{language === 'bm' ? 'Cuaca & Matahari' : 'Weather & Sun'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        setIsCompassModalOpen(true);
                      }}
                      className="min-h-[40px] px-2.5 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-white/10 text-stone-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{language === 'bm' ? 'Kompas' : 'Compass Dial'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        handleToggleTorch();
                      }}
                      disabled={torchBusy}
                      className={`min-h-[40px] px-2.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                        torchMode !== 'off'
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                          : 'bg-stone-900/90 hover:bg-stone-800 border-white/10 text-stone-200'
                      }`}
                    >
                      <Flashlight className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="truncate">
                        {torchMode !== 'off'
                          ? (language === 'bm' ? 'Lampu AKTIF' : 'Torch ON')
                          : (language === 'bm' ? 'Lampu Suluh' : 'Phone Torch')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        setIsIceCardExpandedMobile(true);
                      }}
                      className="min-h-[40px] px-2.5 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-white/10 text-stone-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-teal-300 shrink-0" />
                      <span className="truncate">{language === 'bm' ? 'Kenalan ICE' : 'ICE Contact'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        setIsSafetyBriefOpen(true);
                      }}
                      className="min-h-[40px] px-2.5 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-white/10 text-stone-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Activity className="w-4 h-4 text-sky-300 shrink-0" />
                      <span className="truncate">{language === 'bm' ? 'Ringkasan Keselamatan' : 'Safety Brief'}</span>
                    </button>

                    {displayedElevationPts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsElevationExpanded((prev) => !prev);
                          setIsToolsMenuOpen(false);
                        }}
                        className="min-h-[40px] px-2.5 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-white/10 text-stone-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Mountain className="w-4 h-4 text-amber-300 shrink-0" />
                        <span className="truncate">{language === 'bm' ? 'Ketinggian' : 'Elevation'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        handlePreDownloadOfflineCache();
                      }}
                      disabled={isPreDownloading}
                      className="min-h-[40px] px-2.5 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-white/10 text-stone-200 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {isPreDownloading
                          ? `${downloadProgress}%`
                          : cacheVerified
                          ? (language === 'bm' ? 'Peta Disimpan' : 'Map Cached')
                          : (language === 'bm' ? 'Simpan Peta' : 'Cache Map')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        handleResetToSafetyPassport();
                      }}
                      className="min-h-[40px] px-2.5 py-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 shrink-0" />
                      <span className="truncate">{language === 'bm' ? 'Sunting Pasport' : 'Edit Passport'}</span>
                    </button>

                    <div className="col-span-2 sm:col-span-4 pt-1 border-t border-white/10">
                      <label className="block text-[10px] font-mono uppercase text-stone-400 mb-1">
                        Active Route / [Admin Test] Preview
                      </label>
                      <select
                        value={selectedTrail.id}
                        onChange={(e) => {
                          const t = CAMERON_TRAILS.find((x) => x.id === e.target.value);
                          if (t) {
                            setSelectedTrail(t);
                            setSelectedTrailId(t.id);
                          }
                        }}
                        className="w-full min-h-[38px] px-2.5 py-1.5 rounded-xl bg-stone-900 border border-emerald-500/35 text-xs font-semibold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                      >
                        {CAMERON_TRAILS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.distanceKm}km)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Hardware LED Torch Active Floating Pill (Easy 1-Tap Turn Off) */}
              {torchMode === 'hardware' && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/20 backdrop-blur-md border border-amber-400/60 flex items-center justify-between gap-2 text-xs text-amber-200">
                  <span className="flex items-center gap-2 font-bold">
                    <Flashlight className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                    <span>{language === 'bm' ? 'Lampu Suluh LED Aktif' : 'Hardware LED Flashlight Active'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleTurnOffTorch}
                    className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-[11px] cursor-pointer"
                  >
                    {language === 'bm' ? 'Matikan' : 'Turn Off'}
                  </button>
                </div>
              )}

              {/* Primary Focus: Interactive Topographic Trail Map Canvas */}
              <div
                className={
                  isFullScreenMap
                    ? 'fixed inset-0 z-[180] bg-[#e9efe4] flex flex-col w-full h-[100dvh] overflow-hidden'
                    : 'relative rounded-3xl overflow-hidden border border-emerald-500/30 bg-[#e9efe4] shadow-2xl flex flex-col h-[58vh] sm:h-[65vh]'
                }
              >
                <div className="flex-1 min-h-0 w-full relative flex flex-col">
                  <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

                  {/* Sleek Floating Top Coordinate Bar */}
                  <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-2 pointer-events-none">
                    {isFullScreenMap && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          setIsFullScreenMap(false);
                        }}
                        className="pointer-events-auto w-10 h-10 rounded-full bg-white/88 hover:bg-white text-stone-800 border border-white/70 flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.14)] cursor-pointer backdrop-blur-xl active:scale-95 transition-transform shrink-0"
                        title="Exit Full View"
                        aria-label="Back"
                      >
                        <ArrowLeft className="w-4 h-4 text-stone-800 shrink-0" />
                      </button>
                    )}

                    <div className="pointer-events-auto flex-1 max-w-md mx-auto h-10 px-3 rounded-full bg-white/88 backdrop-blur-xl border border-white/70 shadow-[0_6px_22px_rgba(0,0,0,0.14)] flex items-center justify-between gap-2 text-stone-900">
                      <Crosshair className="w-4 h-4 text-stone-700 shrink-0" />
                      <span className="no-mobile-clamp text-[11px] sm:text-xs font-mono font-semibold tracking-tight text-stone-900 truncate text-center tabular-nums">
                        {formatDmsCoordinate(currentGps.lat, currentGps.lng)}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyTrailCoordinates}
                        className="p-1.5 rounded-full hover:bg-stone-100 text-stone-700 cursor-pointer shrink-0 active:scale-90 transition-transform"
                        title="Copy GPS Coordinates"
                        aria-label="Copy GPS Coordinates"
                      >
                        {copiedCoords ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-stone-700" />
                        )}
                      </button>
                    </div>

                    {isFullScreenMap && (
                      <button
                        type="button"
                        onClick={() => setIsToolsMenuOpen((prev) => !prev)}
                        className={`pointer-events-auto w-10 h-10 rounded-full border flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.14)] cursor-pointer backdrop-blur-xl active:scale-95 transition-all shrink-0 ${
                          isToolsMenuOpen
                            ? 'bg-stone-900 text-white border-stone-800'
                            : 'bg-white/88 hover:bg-white text-stone-800 border-white/70'
                        }`}
                        title="Map Tools & Telemetry"
                        aria-label="Map Tools"
                      >
                        <SlidersHorizontal className="w-4 h-4 shrink-0" />
                      </button>
                    )}
                  </div>

                  {/* Full-View Collapsible Floating Tools Pill Menu */}
                  {isFullScreenMap && isToolsMenuOpen && (
                    <div className="absolute top-16 left-3 z-40 w-56 p-2 rounded-2xl bg-stone-950/88 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          setIsSunWeatherModalOpen(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-stone-100 text-xs font-semibold flex items-center gap-2.5 cursor-pointer"
                      >
                        <Sunrise className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>{language === 'bm' ? 'Cuaca & Matahari' : 'Weather & Sun Times'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          setIsCompassModalOpen(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-stone-100 text-xs font-semibold flex items-center gap-2.5 cursor-pointer"
                      >
                        <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{language === 'bm' ? 'Kompas Penuh' : 'Full Compass Dial'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          setIsSafetyBriefOpen(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-stone-100 text-xs font-semibold flex items-center gap-2.5 cursor-pointer"
                      >
                        <Activity className="w-4 h-4 text-sky-300 shrink-0" />
                        <span>{language === 'bm' ? 'Keselamatan & Telemetri' : 'Safety & Telemetry'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          handlePreDownloadOfflineCache();
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-stone-100 text-xs font-semibold flex items-center gap-2.5 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          {cacheVerified
                            ? language === 'bm'
                              ? 'Peta Luar Talian Disimpan'
                              : 'Offline Map Cached'
                            : language === 'bm'
                            ? 'Simpan Peta Luar Talian'
                            : 'Cache Offline Map'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsMenuOpen(false);
                          handleResetToSafetyPassport();
                        }}
                        className="w-full px-3 py-2 rounded-xl hover:bg-white/10 text-amber-300 text-xs font-semibold flex items-center gap-2.5 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 shrink-0" />
                        <span>{language === 'bm' ? 'Sunting Pasport Keselamatan' : 'Edit Safety Passport'}</span>
                      </button>

                      <div className="pt-1.5 mt-1 border-t border-white/10 px-1">
                        <label className="block text-[9px] font-mono uppercase text-stone-400 mb-1">
                          Route / [Admin Test]
                        </label>
                        <select
                          value={selectedTrail.id}
                          onChange={(e) => {
                            const t = CAMERON_TRAILS.find((x) => x.id === e.target.value);
                            if (t) {
                              setSelectedTrail(t);
                              setSelectedTrailId(t.id);
                            }
                          }}
                          className="w-full min-h-[34px] px-2 py-1 rounded-lg bg-stone-900 border border-emerald-500/35 text-[11px] font-semibold text-white focus:outline-none cursor-pointer"
                        >
                          {CAMERON_TRAILS.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.distanceKm}km)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Minimal Top-Right Circular GPS & Compass Controls */}
                  <div className="absolute top-16 right-3 z-30 flex flex-col items-center gap-2 pointer-events-auto">
                    <button
                      type="button"
                      onClick={handleRecenterTrailGps}
                      className="w-10 h-10 rounded-full bg-white/88 hover:bg-white border border-white/70 shadow-[0_6px_18px_rgba(0,0,0,0.14)] backdrop-blur-xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                      title="Center on Current GPS"
                      aria-label="Center on Current GPS"
                    >
                      <Navigation className="w-4 h-4 text-[#0B663A] fill-[#0B663A]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (compassNeedsPermission) {
                          handleRequestCompassPermission();
                        }
                        if (isFullScreenMap) {
                          setCompassOverlayLocked((prev) => !prev);
                        } else {
                          setIsCompassModalOpen(true);
                        }
                      }}
                      className={`w-10 h-10 rounded-full border shadow-[0_6px_18px_rgba(0,0,0,0.14)] backdrop-blur-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
                        compassOverlayLocked
                          ? 'bg-white/88 hover:bg-white border-white/70 text-stone-900'
                          : 'bg-stone-900/85 border-stone-700 text-white'
                      }`}
                      title={
                        isFullScreenMap
                          ? compassOverlayLocked
                            ? 'Hide Compass Ring'
                            : 'Show Compass Ring'
                          : 'Open Compass'
                      }
                      aria-label="Toggle Compass"
                    >
                      <Compass className={`w-4 h-4 ${compassOverlayLocked ? 'text-rose-600' : 'text-emerald-400'}`} />
                    </button>
                  </div>

                  {/* Centered Interactive Circular Compass Overlay in Full View */}
                  {isFullScreenMap && compassOverlayLocked && (
                    <div className="pointer-events-none absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                      <div className="relative w-[224px] h-[224px] sm:w-[268px] sm:h-[268px] flex items-center justify-center">
                        <div className="absolute top-[7px] left-1/2 -translate-x-1/2 z-20">
                          <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-stone-900 drop-shadow-sm" />
                        </div>

                        <svg
                          viewBox="0 0 240 240"
                          className="w-full h-full transition-transform duration-150 ease-out drop-shadow-[0_10px_28px_rgba(0,0,0,0.18)]"
                          style={{ transform: `rotate(${-compassCumulativeDeg}deg)` }}
                        >
                          <defs>
                            <mask id="compassRingMask">
                              <rect width="240" height="240" fill="white" />
                              <circle cx="120" cy="120" r="70" fill="black" />
                            </mask>
                          </defs>

                          <circle
                            cx="120"
                            cy="120"
                            r="112"
                            fill="rgba(255,255,255,0.78)"
                            stroke="rgba(255,255,255,0.92)"
                            strokeWidth="2"
                            mask="url(#compassRingMask)"
                          />
                          <circle
                            cx="120"
                            cy="120"
                            r="70"
                            fill="none"
                            stroke="rgba(255,255,255,0.85)"
                            strokeWidth="1.5"
                          />

                          {Array.from({ length: 36 }, (_, idx) => {
                            const deg = idx * 10;
                            const isMajor = deg % 30 === 0;
                            return (
                              <line
                                key={deg}
                                x1="120"
                                y1={isMajor ? 22 : 25}
                                x2="120"
                                y2="29"
                                stroke={deg === 0 ? '#dc2626' : isMajor ? '#1c1917' : '#78716c'}
                                strokeWidth={isMajor ? 1.8 : 1}
                                transform={`rotate(${deg} 120 120)`}
                              />
                            );
                          })}

                          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                            <text
                              key={`num-${deg}`}
                              x="120"
                              y="39"
                              textAnchor="middle"
                              fill="#292524"
                              fontSize="8.5"
                              fontWeight="600"
                              fontFamily="ui-monospace, monospace"
                              transform={`rotate(${deg} 120 120)`}
                            >
                              {deg}
                            </text>
                          ))}

                          <text x="120" y="18" textAnchor="middle" fill="#dc2626" fontSize="13" fontWeight="900" fontFamily="sans-serif">N</text>
                          <text x="120" y="18" textAnchor="middle" fill="#57534e" fontSize="9" fontWeight="700" fontFamily="sans-serif" transform="rotate(45 120 120)">NE</text>
                          <text x="120" y="18" textAnchor="middle" fill="#1c1917" fontSize="12" fontWeight="900" fontFamily="sans-serif" transform="rotate(90 120 120)">E</text>
                          <text x="120" y="18" textAnchor="middle" fill="#57534e" fontSize="9" fontWeight="700" fontFamily="sans-serif" transform="rotate(135 120 120)">SE</text>
                          <text x="120" y="18" textAnchor="middle" fill="#1c1917" fontSize="12" fontWeight="900" fontFamily="sans-serif" transform="rotate(180 120 120)">S</text>
                          <text x="120" y="18" textAnchor="middle" fill="#57534e" fontSize="9" fontWeight="700" fontFamily="sans-serif" transform="rotate(225 120 120)">SW</text>
                          <text x="120" y="18" textAnchor="middle" fill="#1c1917" fontSize="12" fontWeight="900" fontFamily="sans-serif" transform="rotate(270 120 120)">W</text>
                          <text x="120" y="18" textAnchor="middle" fill="#57534e" fontSize="9" fontWeight="700" fontFamily="sans-serif" transform="rotate(315 120 120)">NW</text>
                        </svg>

                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-white/95 shadow-lg border border-sky-400/50 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-inner" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-1 px-2.5 py-0.5 rounded-full bg-white/88 backdrop-blur-md border border-white/70 shadow text-[10px] font-mono font-bold text-stone-800 pointer-events-auto tabular-nums">
                        {String(compassHeading).padStart(3, '0')}° {getCardinalDirection(compassHeading)}
                        {compassNeedsPermission && (
                          <button
                            type="button"
                            onClick={handleRequestCompassPermission}
                            className="ml-2 text-emerald-700 underline cursor-pointer"
                          >
                            Calibrate
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Full-Screen Floating ICE Start Alert Prompt */}
                  {isFullScreenMap && initialAlertResult && !isToolsMenuOpen && (
                    <div className="absolute top-16 left-3 z-20 max-w-[66%]">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setIsIceCardExpandedMobile(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') setIsIceCardExpandedMobile(true);
                        }}
                        className="px-2.5 py-1.5 rounded-full bg-stone-950/85 border border-emerald-400/70 text-white shadow-xl backdrop-blur-xl flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Send className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
                        <span className="no-mobile-clamp text-[10px] font-bold text-emerald-200 truncate">
                          ICE: {activeSession?.emergencyContactName || emergencyContactName || 'Alert'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInitialAlertResult(null);
                          }}
                          className="p-0.5 hover:bg-white/10 rounded-full cursor-pointer shrink-0 text-stone-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Merged Compact Frosted Terrain Scale & Safety Info Pill (Bottom-Left) */}
                  <div
                    className={`absolute left-3 z-30 pointer-events-auto ${
                      isFullScreenMap ? 'bottom-[78px]' : 'bottom-3'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setIsSafetyBriefOpen(true)}
                      className="px-2.5 py-1 rounded-full bg-white/88 hover:bg-white backdrop-blur-xl border border-white/70 shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      title="Trail Safety & Telemetry Info"
                      aria-label="Trail Safety Info"
                    >
                      <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="no-mobile-clamp text-[10px] font-mono font-bold text-stone-900 tabular-nums">
                        {selectedTrail.distanceKm} {language === 'bm' ? 'KM' : 'km'} ·{' '}
                        {(() => {
                          const endPt =
                            selectedTrail.peakCoordinates ||
                            selectedTrail.coordinates[selectedTrail.coordinates.length - 1];
                          if (!endPt) return `${selectedTrail.maxElevationM}m`;
                          const refLat = currentGps.hasRealFix
                            ? currentGps.lat
                            : selectedTrail.coordinates[0][0];
                          const refLng = currentGps.hasRealFix
                            ? currentGps.lng
                            : selectedTrail.coordinates[0][1];
                          const km =
                            haversineDistanceMeters(refLat, refLng, endPt[0], endPt[1]) / 1000;
                          return language === 'bm'
                            ? `${km.toFixed(1)} KM ke tamat · ${selectedTrail.maxElevationM}m`
                            : `${km.toFixed(1)} km to finish · ${selectedTrail.maxElevationM}m`;
                        })()}
                      </span>
                    </button>
                  </div>

                  {/* Single Clean Expand / Minimize Control (Bottom-Right) */}
                  <div
                    className={`absolute right-3 z-30 pointer-events-auto ${
                      isFullScreenMap ? 'bottom-[78px]' : 'bottom-3'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        setIsFullScreenMap((prev) => !prev);
                      }}
                      className="w-10 h-10 rounded-full bg-stone-900/85 hover:bg-stone-900 text-white border border-white/20 shadow-[0_8px_22px_rgba(0,0,0,0.28)] backdrop-blur-xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                      title={isFullScreenMap ? 'Exit Full View' : 'Expand Full View'}
                      aria-label={isFullScreenMap ? 'Exit Full View' : 'Expand Full View'}
                    >
                      {isFullScreenMap ? (
                        <Minimize2 className="w-4 h-4 text-white" />
                      ) : (
                        <Maximize2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>

                  {/* Full-View Docked 4-Button Bottom Action Bar */}
                  {isFullScreenMap && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-md z-30">
                      <div className="rounded-full bg-white/90 backdrop-blur-2xl border border-white/70 shadow-[0_12px_32px_rgba(0,0,0,0.22)] p-1.5 grid grid-cols-4 gap-1 no-mobile-clamp">
                        <button
                          type="button"
                          onClick={handleToggleTorch}
                          disabled={torchBusy}
                          className={`min-h-[46px] rounded-full px-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95 ${
                            torchMode !== 'off'
                              ? 'bg-amber-500 text-stone-950 shadow-md'
                              : 'hover:bg-stone-100 text-stone-800'
                          }`}
                        >
                          <Flashlight className="w-4 h-4 shrink-0" />
                          <span className="no-mobile-clamp text-[9px] font-bold leading-none whitespace-nowrap">
                            {torchMode !== 'off'
                              ? language === 'bm'
                                ? 'Lampu AKTIF'
                                : 'Torch ON'
                              : language === 'bm'
                              ? 'Lampu Suluh'
                              : 'Phone Torch'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsIceCardExpandedMobile(true)}
                          className="min-h-[46px] rounded-full px-1 py-1 hover:bg-stone-100 text-stone-800 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95"
                        >
                          <UserCheck className="w-4 h-4 shrink-0 text-emerald-700" />
                          <span className="no-mobile-clamp text-[9px] font-bold leading-none whitespace-nowrap">
                            ICE
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleTriggerSmartSos}
                          disabled={manualSosDispatching}
                          aria-pressed={sosActive}
                          className={`min-h-[46px] rounded-full px-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95 ${
                            sosActive || manualSosDispatching
                              ? 'bg-rose-600 text-white animate-pulse shadow-md'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                          }`}
                        >
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span className="no-mobile-clamp text-[9px] font-extrabold leading-none whitespace-nowrap">
                            {manualSosDispatching
                              ? language === 'bm'
                                ? 'Menghantar'
                                : 'Sending'
                              : sosActive
                              ? language === 'bm'
                                ? 'SOS AKTIF'
                                : 'SOS ON'
                              : language === 'bm'
                              ? 'Amaran SOS'
                              : 'SOS Alert'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleToggleRecording}
                          className={`min-h-[46px] rounded-full px-1 py-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95 shadow-md ${
                            isRecording
                              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                              : 'bg-[#0B663A] hover:bg-[#0d7a45] text-white'
                          }`}
                        >
                          <Footprints className="w-4 h-4 shrink-0" />
                          <span className="no-mobile-clamp text-[9px] font-bold leading-none whitespace-nowrap">
                            {isRecording
                              ? `${language === 'bm' ? 'Jeda' : 'Pause'} (${breadcrumbs.length})`
                              : breadcrumbs.length > 0
                              ? `${language === 'bm' ? 'Rakam' : 'Rec'} (${breadcrumbs.length})`
                              : language === 'bm'
                              ? 'Rakam Denai'
                              : 'Record Trail'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {manualSosReceipt && (
                <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-xs space-y-2">
                  <div className="flex items-center justify-between text-emerald-300 font-bold text-[11px] sm:text-xs">
                    <span>Smart SOS Automatically Dispatched to ICE &amp; Admin</span>
                    <button
                      type="button"
                      onClick={() => setManualSosReceipt(null)}
                      className="p-1 hover:bg-white/10 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <a
                      href={manualSosReceipt.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-[10.5px] sm:text-xs whitespace-nowrap"
                    >
                      WhatsApp ICE
                    </a>
                    <a
                      href={manualSosReceipt.smsUrl}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-[10.5px] sm:text-xs whitespace-nowrap"
                    >
                      Native SMS
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopySos(manualSosReceipt.message)}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-stone-800 text-stone-200 border border-white/15 text-[10.5px] sm:text-xs cursor-pointer whitespace-nowrap"
                    >
                      {copiedSos ? 'Copied' : 'Copy Text'}
                    </button>
                  </div>
                </div>
              )}

              {/* Compact Translucent Weather & Elevation Card */}
              {safetyStatus && (
                <div className="p-3.5 rounded-2xl bg-stone-900/75 backdrop-blur-xl border border-white/10 text-stone-100 flex flex-col gap-2.5 shadow-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[10px] font-mono uppercase font-bold text-emerald-300">
                          {selectedTrail.conditionBadge} · {safetyStatus.severity} risk
                        </div>
                        {displayedElevationPts.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setIsElevationExpanded((prev) => !prev)}
                            className="min-h-[30px] px-2.5 py-1 rounded-xl bg-stone-800/80 hover:bg-stone-700/80 text-amber-300 border border-white/10 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Mountain className="w-3 h-3 text-amber-300 shrink-0" />
                            <span>
                              {isElevationExpanded
                                ? language === 'bm'
                                  ? 'Tutup Ketinggian'
                                  : 'Hide Elevation'
                                : language === 'bm'
                                ? 'Ketinggian'
                                : 'Elevation'}
                            </span>
                            <ChevronDown
                              className={`w-3 h-3 transition-transform ${
                                isElevationExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-stone-200 whitespace-normal break-words leading-snug">
                        {language === 'bm' ? safetyStatus.reasonBm : safetyStatus.reason}
                      </p>
                    </div>
                  </div>

                  {safetyStatus.currentWeather && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-white/10 text-[11px] font-medium text-stone-300">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Thermometer className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>{safetyStatus.currentWeather.temp}°C</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                        <span>
                          {language === 'bm'
                            ? safetyStatus.currentWeather.conditionBm
                            : safetyStatus.currentWeather.condition}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Wind className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                        <span>
                          {safetyStatus.currentWeather.windSpeed} {language === 'bm' ? 'km/j' : 'km/h'}
                        </span>
                      </span>
                    </div>
                  )}

                  {isElevationExpanded && displayedElevationPts.length > 0 && (
                    <div className="pt-2.5 border-t border-white/10 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold text-amber-300 uppercase flex items-center gap-1.5">
                          <Mountain className="w-3.5 h-3.5 shrink-0" />
                          <span>{language === 'bm' ? 'Profil Ketinggian' : 'Elevation Profile'}</span>
                        </span>
                        <span className="text-stone-200 font-bold tabular-nums">
                          {language === 'bm' ? 'Puncak' : 'Peak'} {selectedTrail.maxElevationM}m ASL
                        </span>
                      </div>
                      <div className="flex items-end justify-between h-16 gap-1.5 pt-1">
                        {displayedElevationPts.map((ep, idx) => {
                          const pct = Math.max(
                            18,
                            Math.round(((ep.altitude - minAlt) / altSpan) * 100)
                          );
                          return (
                            <div
                              key={idx}
                              className="flex-1 flex flex-col items-center justify-end h-full gap-1"
                            >
                              <div
                                className="w-full rounded-t bg-gradient-to-t from-amber-600 via-yellow-500 to-amber-300"
                                style={{ height: `${pct}%` }}
                                title={`${ep.altitude}m at ${ep.distance}km`}
                              />
                              <span className="text-[9px] font-mono text-stone-400 leading-none tabular-nums">
                                {ep.distance}k
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Safety & Telemetry Brief Modal */}
      {isSafetyBriefOpen && (
        <div
          className="fixed inset-0 z-[220] bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsSafetyBriefOpen(false)}
        >
          <div
            className="w-full max-w-md p-5 rounded-3xl bg-stone-900 border border-emerald-500/50 shadow-2xl space-y-4 text-stone-100 animate-in fade-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                    {language === 'bm' ? 'Diagnostik Langsung CamGo' : 'CamGo Live Diagnostics'}
                  </div>
                  <h3 className="text-base font-heading font-black text-white">
                    {language === 'bm' ? 'Ringkasan Keselamatan Denai' : 'Trail Safety Brief'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSafetyBriefOpen(false);
                }}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-stone-950 border border-white/10 space-y-2">
                <div className="flex justify-between font-mono gap-2">
                  <span className="text-stone-400">
                    {language === 'bm' ? 'Denai Dipilih:' : 'Selected Trail:'}
                  </span>
                  <span className="text-emerald-400 font-bold text-right">{selectedTrail.name}</span>
                </div>
                <div className="flex justify-between font-mono gap-2">
                  <span className="text-stone-400">
                    {language === 'bm' ? 'Jarak ke Tamat:' : 'Distance to Finish:'}
                  </span>
                  <span className="text-sky-300 font-bold tabular-nums">
                    {(() => {
                      const endPt =
                        selectedTrail.peakCoordinates ||
                        selectedTrail.coordinates[selectedTrail.coordinates.length - 1];
                      if (!endPt) return `${selectedTrail.distanceKm} ${language === 'bm' ? 'KM' : 'km'}`;
                      const refLat = currentGps.hasRealFix
                        ? currentGps.lat
                        : selectedTrail.coordinates[0][0];
                      const refLng = currentGps.hasRealFix
                        ? currentGps.lng
                        : selectedTrail.coordinates[0][1];
                      return `${(haversineDistanceMeters(refLat, refLng, endPt[0], endPt[1]) / 1000).toFixed(2)} ${language === 'bm' ? 'KM' : 'km'}`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-400">
                    {language === 'bm' ? 'Isyarat & Lokasi GPS:' : 'GPS Signal & Fix:'}
                  </span>
                  <span className="text-emerald-300 font-bold">
                    {currentGps.hasRealFix
                      ? `${language === 'bm' ? 'Terkunci' : 'Locked'} (±${currentGps.accuracy}m)`
                      : language === 'bm'
                      ? 'Mengesan (Permulaan Denai GPS)'
                      : 'Acquiring (GPS Trailhead)'}
                  </span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-400">
                    {language === 'bm' ? 'Koordinat:' : 'Coordinates:'}
                  </span>
                  <span className="text-stone-200 font-semibold">{currentGps.lat.toFixed(5)}, {currentGps.lng.toFixed(5)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-400">
                    {language === 'bm' ? 'Rangkaian Selular:' : 'Cellular / Network:'}
                  </span>
                  <span className="text-sky-300 font-bold">{telemetry.effectiveType.toUpperCase()} ({telemetry.signalLabel})</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-400">
                    {language === 'bm' ? 'Status Bateri:' : 'Battery Status:'}
                  </span>
                  <span className="text-amber-300 font-bold">
                    {telemetry.batteryPercent !== null
                      ? `${telemetry.batteryPercent}%`
                      : language === 'bm'
                      ? '100% Sedia'
                      : '100% Ready'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1 text-emerald-200">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {language === 'bm' ? 'Protokol Keselamatan Luar Talian Aktif' : 'Offline Safety Protocol Active'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  {language === 'bm'
                    ? 'Jejak GPS direkod secara setempat. Pemantau ketidakaktifan mengesan pergerakan terhenti dan amaran automatik 5 minit melindungi perjalanan anda.'
                    : 'Breadcrumbs are recording locally. Dead-Man switch monitors stillness and 5-min auto-alert safeguards your descent.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSafetyBriefOpen(false);
              }}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg"
            >
              {language === 'bm' ? 'Tutup Ringkasan' : 'Close Brief'}
            </button>
          </div>
        </div>
      )}

      {/* Utility Tool 1: Live Animated Magnetic/GPS Compass Modal */}
      {isCompassModalOpen && (
        <div
          className="fixed inset-0 z-[230] bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsCompassModalOpen(false)}
        >
          <div
            className="w-full max-w-sm p-5 rounded-3xl bg-stone-900 border border-emerald-500/50 shadow-2xl space-y-4 text-stone-100 animate-in fade-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                    {compassSource === 'magnetic'
                      ? 'Live Magnetic Sensor'
                      : compassSource === 'gps'
                      ? 'GPS Course Heading'
                      : 'Orientation Standby'}
                  </div>
                  <h3 className="text-base font-heading font-black text-white">
                    {language === 'bm' ? 'Kompas Pendaki Langsung' : 'Live Trail Compass'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCompassModalOpen(false)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                aria-label="Close compass"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Rotating Animated SVG Compass Dial */}
            <div className="flex flex-col items-center justify-center py-2 space-y-4">
              <div className="relative w-56 h-56 flex items-center justify-center">
                {/* Fixed Top Lubber Pointer */}
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-rose-500 drop-shadow" />
                </div>

                {/* Animated Rotating Compass Card */}
                <svg
                  viewBox="0 0 220 220"
                  className="w-full h-full transition-transform duration-150 ease-out drop-shadow-2xl"
                  style={{ transform: `rotate(${-compassCumulativeDeg}deg)` }}
                >
                  <circle cx="110" cy="110" r="102" fill="#0c0a09" stroke="#10b981" strokeOpacity="0.45" strokeWidth="3" />
                  <circle cx="110" cy="110" r="88" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />

                  {/* Degree Tick Marks every 15 degrees */}
                  {Array.from({ length: 24 }, (_, idx) => {
                    const deg = idx * 15;
                    const isMajor = deg % 90 === 0;
                    const isMid = deg % 45 === 0 && !isMajor;
                    return (
                      <line
                        key={deg}
                        x1="110"
                        y1={isMajor ? 14 : isMid ? 17 : 20}
                        x2="110"
                        y2="28"
                        stroke={deg === 0 ? '#f43f5e' : isMajor ? '#34d399' : '#a8a29e'}
                        strokeWidth={isMajor ? 2.5 : isMid ? 1.8 : 1}
                        transform={`rotate(${deg} 110 110)`}
                      />
                    );
                  })}

                  {/* Cardinal & Intercardinal Labels */}
                  <text x="110" y="45" textAnchor="middle" fill="#fb7185" fontSize="16" fontWeight="900" fontFamily="monospace">N</text>
                  <text x="163" y="57" textAnchor="middle" fill="#d6d3d1" fontSize="10" fontWeight="700" fontFamily="monospace" transform="rotate(45 163 57)">NE</text>
                  <text x="182" y="114" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="800" fontFamily="monospace">E</text>
                  <text x="163" y="168" textAnchor="middle" fill="#d6d3d1" fontSize="10" fontWeight="700" fontFamily="monospace" transform="rotate(135 163 168)">SE</text>
                  <text x="110" y="187" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="800" fontFamily="monospace">S</text>
                  <text x="57" y="168" textAnchor="middle" fill="#d6d3d1" fontSize="10" fontWeight="700" fontFamily="monospace" transform="rotate(-135 57 168)">SW</text>
                  <text x="38" y="114" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="800" fontFamily="monospace">W</text>
                  <text x="57" y="57" textAnchor="middle" fill="#d6d3d1" fontSize="10" fontWeight="700" fontFamily="monospace" transform="rotate(-45 57 57)">NW</text>

                  {/* Center Needle Rose */}
                  <polygon points="110,60 118,110 110,104 102,110" fill="#f43f5e" />
                  <polygon points="110,160 118,110 110,116 102,110" fill="#e7e5e4" />
                  <circle cx="110" cy="110" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Heading Readout & Cardinal */}
              <div className="text-center space-y-1">
                <div className="text-4xl font-mono font-black tracking-tight text-white tabular-nums">
                  {String(compassHeading).padStart(3, '0')}°{' '}
                  <span className="text-emerald-400">{getCardinalDirection(compassHeading)}</span>
                </div>
                <div className="text-[11px] font-mono text-stone-400">
                  {currentGps.lat.toFixed(5)}, {currentGps.lng.toFixed(5)} • {currentGps.altitude}m ASL
                </div>
              </div>

              {compassNeedsPermission && (
                <button
                  type="button"
                  onClick={handleRequestCompassPermission}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer shadow-lg"
                >
                  Enable Device Compass Sensor (iOS)
                </button>
              )}

              {compassSource === 'awaiting' && !compassNeedsPermission && (
                <p className="text-[11px] text-center text-stone-400 leading-snug px-2">
                  Rotate your phone gently in a figure-8 motion to calibrate the magnetometer sensor.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsCompassModalOpen(false)}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg"
            >
              {language === 'bm' ? 'Tutup Kompas' : 'Close Compass'}
            </button>
          </div>
        </div>
      )}

      {/* Utility Tool 2: Bright White Screen-Light Fallback Overlay */}
      {torchMode === 'screen' && (
        <div
          className="fixed inset-0 z-[260] bg-white text-stone-950 flex flex-col items-center justify-between p-6 select-none"
          onClick={handleTurnOffTorch}
        >
          <div className="px-4 py-2 rounded-full bg-stone-900/90 text-white text-xs font-mono font-bold shadow-xl">
            Screen-Light Flashlight Active (Max White Mode)
          </div>
          <div className="text-center space-y-2 opacity-30 pointer-events-none">
            <Sun className="w-16 h-16 mx-auto text-stone-800" />
            <p className="text-xs font-mono font-bold uppercase tracking-widest">
              Tap anywhere to turn off
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTurnOffTorch();
            }}
            className="min-h-[50px] px-6 py-3 rounded-2xl bg-stone-950 hover:bg-stone-800 text-white font-bold text-sm shadow-2xl flex items-center gap-2 cursor-pointer"
          >
            <Flashlight className="w-4 h-4 text-amber-400" />
            <span>{language === 'bm' ? 'Matikan Lampu Skrin' : 'Turn Off Screen Light'}</span>
          </button>
        </div>
      )}

      {/* Utility Tool 3: Sunrise, Sunset & Weather Forecast Panel */}
      {isSunWeatherModalOpen && (
        <div
          className="fixed inset-0 z-[230] bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsSunWeatherModalOpen(false)}
        >
          <div
            className="w-full max-w-md p-5 rounded-3xl bg-stone-900 border border-orange-400/40 shadow-2xl space-y-4 text-stone-100 animate-in fade-in zoom-in-95 duration-200 cursor-default max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Sunrise className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase text-orange-300 font-bold">
                    Cameron Highlands Daylight &amp; Microclimate
                  </div>
                  <h3 className="text-base font-heading font-black text-white">
                    {language === 'bm' ? 'Matahari & Ramalan Cuaca' : 'Sunrise, Sunset & Weather'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSunWeatherModalOpen(false)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                aria-label="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Today's Local Sunrise & Sunset Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/60 to-stone-950 border border-amber-500/35 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase font-bold text-amber-300">
                  <Sunrise className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{language === 'bm' ? 'Matahari Terbit' : 'Sunrise'}</span>
                </div>
                <div className="text-xl font-mono font-black text-white tabular-nums">
                  {safetyStatus?.sunrise || '07:04 AM'}
                </div>
                <div className="text-[10px] text-stone-400">MYT (UTC+8)</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-950/60 to-stone-950 border border-orange-500/35 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase font-bold text-orange-300">
                  <Sunset className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>{language === 'bm' ? 'Matahari Terbenam' : 'Sunset'}</span>
                </div>
                <div className="text-xl font-mono font-black text-white tabular-nums">
                  {safetyStatus?.sunset || '07:10 PM'}
                </div>
                <div className="text-[10px] text-stone-400">Exit trail before dusk</div>
              </div>
            </div>

            {/* Current Weather & Microclimate Summary */}
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold uppercase text-emerald-400">
                  Current Microclimate ({selectedTrail.name.split(':')[0]})
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold uppercase">
                  {safetyStatus?.severity || 'low'}
                </span>
              </div>

              {safetyStatus?.currentWeather ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-stone-900 border border-white/5">
                    <Thermometer className="w-4 h-4 text-amber-300 mx-auto mb-1" />
                    <div className="text-sm font-black text-white">{safetyStatus.currentWeather.temp}°C</div>
                    <div className="text-[10px] text-stone-400 truncate">
                      {language === 'bm' ? safetyStatus.currentWeather.conditionBm : safetyStatus.currentWeather.condition}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-stone-900 border border-white/5">
                    <Wind className="w-4 h-4 text-teal-300 mx-auto mb-1" />
                    <div className="text-sm font-black text-white">{safetyStatus.currentWeather.windSpeed} km/h</div>
                    <div className="text-[10px] text-stone-400">Ridge Wind</div>
                  </div>
                  <div className="p-2 rounded-xl bg-stone-900 border border-white/5">
                    <CloudRain className="w-4 h-4 text-sky-300 mx-auto mb-1" />
                    <div className="text-sm font-black text-white">{safetyStatus.currentWeather.rainProbability}%</div>
                    <div className="text-[10px] text-stone-400">Rain Risk</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-400">Weather snapshot cached offline.</p>
              )}

              {safetyStatus && (
                <p className="text-xs text-stone-300 leading-snug pt-1 border-t border-white/10">
                  {language === 'bm' ? safetyStatus.reasonBm : safetyStatus.reason}
                </p>
              )}
            </div>

            {/* Multi-Day Forecast */}
            {safetyStatus?.forecast && safetyStatus.forecast.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-white/10 space-y-2">
                <div className="text-[10px] font-mono font-bold uppercase text-sky-300">
                  {language === 'bm' ? 'Ramalan 5 Hari Cameron Highlands' : '5-Day Cameron Highlands Forecast'}
                </div>
                <div className="space-y-1.5">
                  {safetyStatus.forecast.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-stone-900/90 text-xs"
                    >
                      <span className="font-mono font-bold text-stone-200 w-10 shrink-0">
                        {i === 0 ? (language === 'bm' ? 'Hari' : 'Today') : language === 'bm' ? d.dayBm : d.day}
                      </span>
                      <span className="text-stone-300 truncate flex-1">
                        {language === 'bm' ? d.conditionBm : d.condition}
                      </span>
                      {typeof d.rainProbability === 'number' && (
                        <span className="text-[10px] font-mono text-sky-300 shrink-0">
                          {d.rainProbability}% rain
                        </span>
                      )}
                      <span className="font-mono font-bold text-amber-300 shrink-0 tabular-nums">
                        {d.tempLow}°–{d.tempHigh}°C
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsSunWeatherModalOpen(false)}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg"
            >
              {language === 'bm' ? 'Tutup Ramalan' : 'Close Forecast'}
            </button>
          </div>
        </div>
      )}

      {/* Full-Page Mobile ICE Emergency Notification Modal (opened by tapping ICE dock button or capsule) */}
      {isIceCardExpandedMobile && passportUnlocked && (
        <div className="fixed inset-0 z-[240] bg-stone-950/98 backdrop-blur-xl flex flex-col justify-between p-5 text-stone-100 animate-in fade-in duration-200 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Send className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-black uppercase text-emerald-400 tracking-wider">
                    {language === 'bm' ? 'Pemberitahuan Kecemasan ICE' : 'ICE Emergency Notification'}
                  </div>
                  <h3 className="text-base font-heading font-black text-white">
                    {activeSession?.emergencyContactName || emergencyContactName || 'ICE Contact'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIceCardExpandedMobile(false)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                aria-label="Close ICE Notification"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-stone-900 border border-emerald-500/35 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">{language === 'bm' ? 'Kenalan ICE' : 'ICE Contact'}</span>
                <span className="font-bold text-white">
                  {activeSession?.emergencyContactName || emergencyContactName} ({activeSession?.emergencyContact || emergencyContact})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">{language === 'bm' ? 'Jejak' : 'Trail'}</span>
                <span className="font-bold text-emerald-300">{selectedTrail.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">GPS</span>
                <span className="font-mono text-sky-300">
                  {currentGps.lat.toFixed(5)}, {currentGps.lng.toFixed(5)}
                </span>
              </div>
              {showStartPromptModal && activeSession && (
                <div className="flex items-center justify-between pt-1 border-t border-white/10">
                  <span className="text-teal-300 font-bold">5-Min Failsafe Timer</span>
                  <span className="font-mono font-black text-amber-300">
                    {Math.floor(startFailsafeRemainingSec / 60)}:{(startFailsafeRemainingSec % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              {language === 'bm'
                ? 'Pautan jejak langsung dan koordinat GPS anda sedia dihantar. Pilih WhatsApp atau SMS di bawah untuk memaklumkan kenalan kecemasan anda:'
                : 'Your live footprint tracking link and current GPS coordinates are ready. Tap WhatsApp or SMS below to notify your emergency contact immediately:'}
            </p>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-white/10">
            <a
              href={
                initialAlertResult?.whatsappUrl ||
                buildWhatsAppLink(
                  activeSession?.emergencyContact || emergencyContact,
                  `CAMGO TRAIL START: ${activeSession?.hikerName || hikerName} on ${selectedTrail.name}. Live Footprint: ${
                    activeSession
                      ? buildTrailTrackingUrl(activeSession.id, activeSession.trackingToken)
                      : ''
                  } | GPS: https://www.google.com/maps?q=${currentGps.lat},${currentGps.lng}`
                )
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                handleMarkManualStartAlertSent();
                setIsIceCardExpandedMobile(false);
              }}
              className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>{language === 'bm' ? 'Hantar WhatsApp ke ICE' : 'Send WhatsApp to ICE'}</span>
            </a>

            <a
              href={
                initialAlertResult?.smsUrl ||
                buildSmsLink(
                  activeSession?.emergencyContact || emergencyContact,
                  `CAMGO TRAIL START: ${activeSession?.hikerName || hikerName} on ${selectedTrail.name}. Live Footprint: ${
                    activeSession
                      ? buildTrailTrackingUrl(activeSession.id, activeSession.trackingToken)
                      : ''
                  } | GPS: https://www.google.com/maps?q=${currentGps.lat},${currentGps.lng}`
                )
              }
              onClick={() => {
                handleMarkManualStartAlertSent();
                setIsIceCardExpandedMobile(false);
              }}
              className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>{language === 'bm' ? 'Hantar SMS ke ICE' : 'Send SMS to ICE'}</span>
            </a>

            {initialAlertResult?.trackingUrl && (
              <button
                type="button"
                onClick={() => handleCopyTrackingLink(initialAlertResult.trackingUrl)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                <span>{copiedTrackLink ? (language === 'bm' ? 'Disalin!' : 'Copied!') : (language === 'bm' ? 'Salin Pautan Jejak' : 'Copy Tracking Link')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsIceCardExpandedMobile(false)}
              className="w-full min-h-[44px] py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-white/10 font-bold text-xs cursor-pointer"
            >
              {language === 'bm' ? 'Kembali ke Peta Jejak' : 'Back to Trail Map'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

