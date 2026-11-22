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
};

const FIVE_MINUTES_SEC = 5 * 60;
const FIFTEEN_MINUTES_SEC = 15 * 60;
const THIRTY_MINUTES_SEC = 30 * 60;

function parseEstimatedHours(estStr: string): string {
  const m = estStr.match(/[\d.]+/);
  return m ? m[0] : '3';
}

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

  // Selected Trail & Weather / Offline Cache State
  const [selectedTrail, setSelectedTrail] = useState<TrailRoute>(
    () =>
      CAMERON_TRAILS.find((t) => t.id === 'trail-11') ||
      CAMERON_TRAILS.find((t) => t.id === 'trail-4') ||
      CAMERON_TRAILS[0]
  );
  const [isPreDownloading, setIsPreDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(100);
  const [cacheVerified, setCacheVerified] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState<TrailSafetyStatus | null>(null);
  const [isPermitCapsuleOpen, setIsPermitCapsuleOpen] = useState(false);
  const [isFullScreenMap, setIsFullScreenMap] = useState(false);
  const [isElevationExpanded, setIsElevationExpanded] = useState(false);
  const [isSafetyBriefOpen, setIsSafetyBriefOpen] = useState(false);

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

  // Safety Passport Form & Active Session State
  const [hikerName, setHikerName] = useState('');
  const [groupSize, setGroupSize] = useState('2');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [expectedHours, setExpectedHours] = useState('3');
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

  // Mutable Refs for async listeners without stale closures
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

  // Initialize Safety Passport defaults & restore any active session
  useEffect(() => {
    if (!isOpen) return;

    const fetchSafety = async () => {
      const status = await weatherService.evaluateTrailSafety();
      setSafetyStatus(status);
    };
    fetchSafety();

    const card = firebaseService.getEmergencyCard();
    const existingSession = getCachedActiveTrailSession();

    const isFreshActiveSession =
      existingSession &&
      existingSession.status !== 'completed' &&
      Date.now() - new Date(existingSession.startedAt).getTime() < 24 * 3600 * 1000;

    if (isFreshActiveSession && existingSession) {
      setResumableSession(existingSession);
      setHikerName((prev) => prev || existingSession.hikerName);
      setGroupSize((prev) => prev || String(existingSession.groupSize));
      setEmergencyContactName((prev) => prev || existingSession.emergencyContactName || '');
      setEmergencyContact((prev) => prev || existingSession.emergencyContact);
      setExpectedHours((prev) => prev || String(existingSession.expectedHours));

      const matchedTrail = CAMERON_TRAILS.find((t) => t.id === existingSession.trailId);
      if (matchedTrail) setSelectedTrail(matchedTrail);
    } else {
      setResumableSession(null);
      setHikerName(
        (prev) =>
          prev ||
          currentUser?.displayName ||
          card.preferredName ||
          card.fullLegalName ||
          ''
      );
      setEmergencyContactName(
        (prev) => prev || card.primaryContact?.name || card.secondaryContact?.name || ''
      );
      setEmergencyContact(
        (prev) =>
          prev ||
          card.designatedSosNumber ||
          card.primaryContact?.phone ||
          card.secondaryContact?.phone ||
          ''
      );
    }
  }, [isOpen, currentUser]);

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

        // Update Leaflet live blue GPS dot
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

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap | CamGo Trail Engine',
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

  // Reflow Leaflet canvas seamlessly whenever Full Screen Map mode toggles + Esc key support
  useEffect(() => {
    if (!isOpen || !passportUnlocked) return;
    const t1 = window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 60);
    const t2 = window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 260);
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
    setActiveSession(resumableSession);
    setHikerName(resumableSession.hikerName);
    setGroupSize(String(resumableSession.groupSize));
    setEmergencyContactName(resumableSession.emergencyContactName || '');
    setEmergencyContact(resumableSession.emergencyContact);
    setExpectedHours(String(resumableSession.expectedHours));
    setBreadcrumbs(resumableSession.breadcrumbs || []);
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
    if (matchedTrail) setSelectedTrail(matchedTrail);
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
    setIsRecording(false);
    setBreadcrumbs([]);
    setPinnedStart(null);
    setActiveSession(null);
    setResumableSession(null);
    setIsFullScreenMap(false);
    setPassportUnlocked(false);
    setIsOverdue(false);
    setShowStartPromptModal(false);
    setAutoStartTriggeredBanner(null);
    setInactivityStage1Active(false);
    setInactivityStage2Active(false);
    setOverdueAlertReceipt(null);
    setInitialAlertResult(null);
    setManualSosReceipt(null);
    setFormError(null);
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

  // Reset active session & go directly back to Safety First Protocol / Safety Passport setup
  const handleResetToSafetyPassport = async () => {
    if (activeSession) {
      await markTrailSessionCheckedOut(activeSession);
    }
    resetTrailUiSessionState();
  };

  // Automatic One-Tap Smart SOS Activation (WhatsApp + Native SMS + Backend Relay, staying on Map)
  const handleTriggerSmartSos = async () => {
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
      const liveTel = await readLiveDeviceTelemetry(bestGps.accuracy);
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
      setManualSosDispatching(false);
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
    <div
      className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full h-[100dvh] sm:h-auto sm:max-h-[92dvh] sm:max-w-4xl bg-stone-900 sm:border sm:border-emerald-500/40 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
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
                {language === 'bm' ? 'Enjin Keselamatan & Laluan Hutan' : 'Highland Trail Safety & Map'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePreDownloadOfflineCache}
              disabled={isPreDownloading}
              className="min-h-[44px] min-w-[44px] px-2.5 sm:px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer shadow-sm"
              aria-label="Cache offline trail map"
            >
              <Download
                className={`w-4 h-4 text-emerald-400 ${isPreDownloading ? 'animate-bounce' : ''}`}
              />
              <span className="hidden sm:inline">
                {isPreDownloading ? `${downloadProgress}%` : cacheVerified ? 'Map Cached' : 'Cache Map'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 hover:border-emerald-500/50 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
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
              {/* Optional Resume Active Track Banner if a live session is cached */}
              {resumableSession && (
                <div className="p-3 rounded-2xl bg-emerald-950/55 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-[11px] font-mono font-bold uppercase text-emerald-300">
                      Active Session Available
                    </div>
                    <div className="text-xs text-stone-200 whitespace-normal break-words leading-snug">
                      {resumableSession.trailName} • Hiker: {resumableSession.hikerName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResumeCachedSession}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5 shrink-0" />
                    <span>Resume Active Map</span>
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 pb-3">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 whitespace-normal break-words">
                      Safety First Protocol
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
                    Hiker / Lead Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={hikerName}
                    onChange={(e) => setHikerName(e.target.value)}
                    placeholder="e.g., Ahmad Faris"
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/15 text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-stone-300 mb-1">
                    Emergency Contact Name (ICE) *
                  </label>
                  <input
                    type="text"
                    required
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="e.g., Siti (Spouse / Next of Kin)"
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/15 text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-stone-300 mb-1">
                    Emergency Contact Phone (ICE) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="e.g., +60123456789"
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/15 text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-stone-300 mb-1">
                    Group Size (Hikers) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={30}
                    value={groupSize}
                    onChange={(e) => setGroupSize(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/15 text-white font-semibold text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-stone-300 mb-1">
                    Expected Return Duration (Hours) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0.5}
                    max={48}
                    required
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
                  <span className="font-bold">Live Sensors Ready</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-stone-300">
                  <span>
                    GPS:{' '}
                    <strong className="text-emerald-400">
                      {currentGps.hasRealFix ? `Locked (±${currentGps.accuracy}m)` : 'Acquiring...'}
                    </strong>
                  </span>
                  <span>
                    Battery:{' '}
                    <strong className="text-amber-300">
                      {telemetry.batteryPercent !== null ? `${telemetry.batteryPercent}%` : 'Ready'}
                    </strong>
                  </span>
                  <span>
                    Signal: <strong className="text-sky-300">{telemetry.signalLabel}</strong>
                  </span>
                </div>
              </div>

              {/* Gated Initial Planned Trail Selector directly above Submit Safety Passport */}
              <div className="p-3.5 rounded-2xl bg-stone-900/90 border border-white/15 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="camgo-initial-planned-trail"
                    className="text-[11px] font-bold uppercase text-stone-200 flex items-center gap-1.5"
                  >
                    {isPassportFieldsValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span>Initial Planned Trail *</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      isPassportFieldsValid ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {isPassportFieldsValid ? 'Unlocked' : 'Complete all * fields to unlock'}
                  </span>
                </div>

                <select
                  id="camgo-initial-planned-trail"
                  disabled={!isPassportFieldsValid}
                  value={selectedTrail.id}
                  onChange={(e) => {
                    const t = CAMERON_TRAILS.find((x) => x.id === e.target.value);
                    if (t) {
                      setSelectedTrail(t);
                      setExpectedHours(parseEstimatedHours(t.estDurationHrs));
                    }
                  }}
                  className={`w-full max-w-full min-h-[48px] px-3 py-2.5 rounded-xl border font-semibold text-xs sm:text-sm focus:outline-none transition-colors ${
                    isPassportFieldsValid
                      ? 'bg-stone-950 border-emerald-500/45 text-white focus:border-emerald-400 cursor-pointer'
                      : 'bg-stone-950/60 border-white/10 text-stone-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  {CAMERON_TRAILS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.difficulty} ({t.distanceKm}km • {t.estDurationHrs})
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-stone-300 whitespace-normal break-words leading-snug">
                  <span className="font-bold text-emerald-300">{selectedTrail.name}</span>{' '}
                  • {selectedTrail.difficulty} ({selectedTrail.distanceKm}km • {selectedTrail.estDurationHrs})
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingPassport || !isPassportFieldsValid}
                className="w-full min-h-[52px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-black text-sm sm:text-base shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
              >
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>
                  {isSubmittingPassport
                    ? 'Opening Interactive Trail Map...'
                    : language === 'bm'
                    ? 'Hantar Pasport Keselamatan'
                    : 'Submit Safety Passport'}
                </span>
                <ChevronRight className="w-5 h-5 shrink-0" />
              </button>
            </form>
          )}

          {/* ==================== CLEANED-UP INTERACTIVE TRAIL MAP & LIVE TELEMETRY VIEW ==================== */}
          {passportUnlocked && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Trail Check-In Notification & ICE Alert Card */}
              {initialAlertResult && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-stone-950 border-2 border-emerald-400 text-stone-100 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
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
              )}

              {/* 5-Minute Record Trail Start Alert Card / Failsafe */}
              {showStartPromptModal && activeSession && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-950 via-stone-900 to-stone-950 border-2 border-teal-400 text-stone-100 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
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

              {/* Slim Compact Header Bar Directly Above Map: Countdown Timer + GPS Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-stone-950 border border-white/10 text-xs font-mono">
                <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetToSafetyPassport}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40 cursor-pointer flex items-center justify-center shrink-0"
                      title="Reset • Back to Safety Passport"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    </button>
                    <div
                      className={`px-2.5 py-1 rounded-xl border font-bold flex items-center gap-1.5 shrink-0 ${
                        isOverdue
                          ? 'bg-rose-950/90 border-rose-500 text-rose-200 animate-pulse'
                          : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{isOverdue ? 'OVERDUE' : formatCountdown(timeRemainingSeconds)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFullScreenMap((prev) => !prev)}
                    className="sm:hidden p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-emerald-300 border border-emerald-500/40 cursor-pointer flex items-center justify-center shrink-0"
                    title="Toggle Full Screen Map"
                  >
                    {isFullScreenMap ? (
                      <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 text-stone-300 text-[11px] pt-1.5 sm:pt-0 border-t sm:border-t-0 border-white/10">
                  <div className="flex items-center gap-1.5 min-w-0 whitespace-normal break-words">
                    <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                    <span className="font-semibold whitespace-normal break-words">
                      {currentGps.hasRealFix ? 'LIVE GPS LOCKED' : 'TRAILHEAD'} •{' '}
                      {currentGps.lat.toFixed(4)}, {currentGps.lng.toFixed(4)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFullScreenMap((prev) => !prev)}
                    className="hidden sm:flex p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-emerald-300 border border-emerald-500/40 cursor-pointer items-center justify-center shrink-0 ml-1"
                    title="Toggle Full Screen Map"
                  >
                    {isFullScreenMap ? (
                      <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* 1. Top-Pinned Interactive Map with Compact Record Button Inside Map Corner */}
              <div
                className={
                  isFullScreenMap
                    ? 'fixed inset-0 z-[180] bg-stone-950 flex flex-col w-full h-[100dvh] overflow-hidden'
                    : 'relative rounded-3xl overflow-hidden border-2 border-emerald-500/40 bg-stone-950 shadow-2xl flex flex-col h-[52vh] sm:h-[60vh]'
                }
              >
                <div className="flex-1 min-h-0 w-full relative flex flex-col">
                  <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

                  {/* Top Left Corner: Back Button (in Fullscreen), Floating Compass underneath, and Center GPS */}
                  <div className="absolute top-3 left-3 z-30 flex flex-col items-start gap-1.5">
                    {isFullScreenMap && (
                      <button
                        type="button"
                        onClick={() => setIsFullScreenMap(false)}
                        className="w-8 h-8 rounded-full bg-stone-900/95 hover:bg-stone-800 text-stone-200 border border-white/20 flex items-center justify-center shadow-2xl cursor-pointer backdrop-blur-md active:scale-95 transition-transform"
                        title="Back to Normal View"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </button>
                    )}

                    <div className="h-[22px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-950 font-mono font-black text-[10px] shadow-md flex items-center gap-1 border border-stone-300">
                      <Compass className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>N 012°</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRecenterTrailGps}
                      className="h-[22px] px-2 py-0.5 rounded-md bg-stone-900/90 hover:bg-stone-800 text-emerald-400 font-mono font-bold text-[10px] shadow-md flex items-center gap-1 border border-emerald-500/30 cursor-pointer active:scale-95"
                      title="Center map on current GPS / Trailhead"
                    >
                      <Crosshair className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Center</span>
                    </button>
                  </div>

                  {/* Full-Screen Floating ICE Start Alert Prompt Banner if active */}
                  {isFullScreenMap && initialAlertResult && (
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-sm p-2 rounded-2xl bg-stone-950/95 border border-emerald-400 text-white shadow-2xl backdrop-blur-md space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-emerald-300">
                        <div className="flex items-center gap-1.5 truncate">
                          <Send className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
                          <span className="truncate">ICE: {activeSession?.emergencyContactName || emergencyContactName} ({activeSession?.emergencyContact || emergencyContact})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInitialAlertResult(null)}
                          className="p-0.5 hover:bg-white/10 rounded cursor-pointer shrink-0 text-stone-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={initialAlertResult.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleMarkManualStartAlertSent}
                          className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow active:scale-95"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>WhatsApp ICE</span>
                        </a>
                        <a
                          href={initialAlertResult.smsUrl}
                          onClick={handleMarkManualStartAlertSent}
                          className="flex-1 py-1 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow active:scale-95"
                        >
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span>SMS ICE</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Top-Right: Adjusted Record Trail Button (Non-overlapping with Telemetry Badge) */}
                  <div className="absolute top-3 right-3 z-30">
                    <button
                      type="button"
                      onClick={handleToggleRecording}
                      className={`h-[26px] px-2 sm:px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 shadow-md cursor-pointer shrink-0 border transition-all active:scale-95 ${
                        isRecording
                          ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse border-rose-300/60'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-300/60'
                      }`}
                    >
                      <Footprints className="w-3 h-3 shrink-0" />
                      <span className="tabular-nums whitespace-nowrap">
                        {isRecording ? `Pause (${breadcrumbs.length})` : `Rec (${breadcrumbs.length})`}
                      </span>
                    </button>
                  </div>

                  {/* Full-Screen Top-Center Telemetry Badge with GPS Signal Info (Clickable, Off-center to guarantee zero overlap) */}
                  {isFullScreenMap && (
                    <button
                      type="button"
                      onClick={() => setIsSafetyBriefOpen(true)}
                      className="absolute top-3 left-[44%] sm:left-1/2 -translate-x-1/2 z-30 h-[26px] px-2 py-0.5 rounded-xl bg-stone-950/90 backdrop-blur-md border border-emerald-500/40 font-mono text-[9px] xs:text-[10px] text-stone-200 flex items-center gap-1 shadow-xl max-w-[145px] xs:max-w-[170px] sm:max-w-none truncate cursor-pointer hover:bg-stone-900 transition-colors active:scale-95"
                      title="Tap for Safety & Telemetry Brief"
                    >
                      <span className="text-emerald-400 font-bold shrink-0">SAFETY</span>
                      <span className="text-white/40 shrink-0">•</span>
                      <span className="text-sky-300 shrink-0">4G</span>
                      <span className="text-white/40 shrink-0">•</span>
                      <span className="text-emerald-300 truncate">GPS {currentGps.hasRealFix ? `±${currentGps.accuracy}m` : 'Acq'}</span>
                      <span className="text-white/40 shrink-0">•</span>
                      <span className="text-amber-300 shrink-0">100%</span>
                    </button>
                  )}

                  {/* Full-Screen Bottom-Center Small Circular Floating SOS Button */}
                  {isFullScreenMap && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
                      <button
                        type="button"
                        onClick={handleTriggerSmartSos}
                        disabled={manualSosDispatching}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-2xl shadow-red-950/90 border-2 border-red-300/70 flex items-center justify-center cursor-pointer active:scale-95 transition-all animate-pulse"
                        title="SOS / Smart Alert"
                      >
                        <ShieldAlert className="w-5 h-5 shrink-0 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Trail Condition / Metadata Badge Outside Map */}
              <div className="px-3 py-2 rounded-2xl bg-stone-950/90 border border-emerald-500/30 font-mono text-xs text-stone-200 flex items-center justify-between gap-2 shadow-md">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">
                    <strong className="text-emerald-400">{selectedTrail.name}</strong> • {selectedTrail.conditionBadge}
                  </span>
                </div>
              </div>

              {/* 2. Dock SOS Directly Under Map */}
              <div className="p-3 rounded-2xl bg-stone-950 border border-white/10 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 text-xs">
                  <div className="flex items-start sm:items-center gap-2 font-bold text-emerald-300 min-w-0 flex-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 sm:mt-0 animate-ping" />
                    <span className="whitespace-normal break-words leading-snug">
                      Active • ICE:{' '}
                      {emergencyContactName
                        ? `${emergencyContactName} (${emergencyContact})`
                        : emergencyContact || '999'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerSmartSos}
                  disabled={manualSosDispatching}
                  className="w-full min-h-[50px] px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-heading font-black text-sm sm:text-base tracking-wide shadow-xl shadow-red-950/90 border border-red-300/40 flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>
                    {manualSosDispatching ? 'DISPATCHING SOS...' : 'SOS / SMART ALERT'}
                  </span>
                </button>

                {manualSosReceipt && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-xs space-y-2">
                    <div className="flex items-center justify-between text-emerald-300 font-bold">
                      <span>Smart SOS Automatically Dispatched to ICE &amp; Admin</span>
                      <button
                        type="button"
                        onClick={() => setManualSosReceipt(null)}
                        className="p-1 hover:bg-white/10 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={manualSosReceipt.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                      >
                        WhatsApp ICE
                      </a>
                      <a
                        href={manualSosReceipt.smsUrl}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs"
                      >
                        Native SMS
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopySos(manualSosReceipt.message)}
                        className="px-3 py-1.5 rounded-xl bg-stone-800 text-stone-200 border border-white/15 text-xs cursor-pointer"
                      >
                        {copiedSos ? 'Copied' : 'Copy Text'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Weather Card with Nested Expandable Elevation Profile Toggle */}
              {safetyStatus && (
                <div
                  className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 ${
                    safetyStatus.severity === 'critical'
                      ? 'bg-rose-950/45 border-rose-500/50 text-rose-100'
                      : safetyStatus.severity === 'high'
                      ? 'bg-orange-950/45 border-orange-500/50 text-orange-100'
                      : safetyStatus.severity === 'moderate'
                      ? 'bg-amber-950/45 border-amber-500/50 text-amber-100'
                      : 'bg-emerald-950/40 border-emerald-500/45 text-emerald-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-emerald-300" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[10px] font-mono uppercase font-bold text-emerald-300">
                            Weather &amp; Microclimate Status • {safetyStatus.severity}
                          </div>
                          {displayedElevationPts.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsElevationExpanded((prev) => !prev)}
                              className="min-h-[32px] px-2.5 py-1 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Mountain className="w-3 h-3 text-amber-300 shrink-0" />
                              <span>{isElevationExpanded ? 'Hide Elevation' : 'Elevation Profile'}</span>
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${
                                  isElevationExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>
                        <p className="text-xs font-bold whitespace-normal break-words leading-snug">
                          {language === 'bm' ? safetyStatus.reasonBm : safetyStatus.reason}
                        </p>
                      </div>
                    </div>
                  </div>

                  {safetyStatus.currentWeather && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 border-t border-white/10 text-[11px] font-semibold">
                      <span className="inline-flex items-center gap-1">
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
                      <span className="inline-flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                        <span>{safetyStatus.currentWeather.windSpeed} km/h wind</span>
                      </span>
                    </div>
                  )}

                  {/* Expandable Elevation Chart (Collapsed by Default) */}
                  {isElevationExpanded && displayedElevationPts.length > 0 && (
                    <div className="pt-2.5 border-t border-white/15 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="font-bold text-amber-300 uppercase flex items-center gap-1.5">
                          <Mountain className="w-3.5 h-3.5 shrink-0" />
                          <span>Elevation Profile — {selectedTrail.name}</span>
                        </span>
                        <span className="text-stone-200 font-bold">
                          Peak {selectedTrail.maxElevationM}m ASL
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
                              <span className="text-[9px] font-mono text-stone-400 leading-none">
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
                  <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">CamGo Live Diagnostics</div>
                  <h3 className="text-base font-heading font-black text-white">Trail Safety Brief</h3>
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
                <div className="flex justify-between font-mono">
                  <span className="text-stone-400">Selected Trail:</span>
                  <span className="text-emerald-400 font-bold">{selectedTrail.name}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-400">GPS Signal &amp; Fix:</span>
                  <span className="text-emerald-300 font-bold">{currentGps.hasRealFix ? `Locked (±${currentGps.accuracy}m)` : 'Acquiring (GPS Trailhead)'}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-400">Coordinates:</span>
                  <span className="text-stone-200 font-semibold">{currentGps.lat.toFixed(5)}, {currentGps.lng.toFixed(5)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-400">Cellular / Network:</span>
                  <span className="text-sky-300 font-bold">{telemetry.effectiveType.toUpperCase()} ({telemetry.signalLabel})</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-stone-400">Battery Status:</span>
                  <span className="text-amber-300 font-bold">{telemetry.batteryPercent !== null ? `${telemetry.batteryPercent}%` : '100% Ready'}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1 text-emerald-200">
                <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Offline Safety Protocol Active</span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Breadcrumbs are recording locally. Dead-Man switch monitors stillness and 5-min auto-alert safeguards your descent.
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
              Close Brief
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

