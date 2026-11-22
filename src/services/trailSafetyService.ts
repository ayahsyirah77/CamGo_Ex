import { openDB, IDBPDatabase } from 'idb';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { EmergencyCard } from '../types';
import { sendOrQueueEmergencySos, SosDispatchOutcome } from './offlineSosQueue';

export const TRAIL_TELEMETRY_DB = 'camgo_trail_telemetry_db';
export const TRAIL_TELEMETRY_VERSION = 1;
export const STORE_TELEMETRY_STATE = 'telemetry_state';
export const STORE_SESSION_OUTBOX = 'session_sync_queue';
export const LAST_KNOWN_MAP_GPS_KEY = 'camgo_last_known_map_gps_v1';
export const ACTIVE_TRAIL_SESSION_KEY = 'camgo_active_trail_session_v1';

export type GpsCoordSource =
  | 'live_gps'
  | 'map_watch'
  | 'pinned_start'
  | 'cached_idb'
  | 'trailhead'
  | 'highland_fallback';

export interface LastKnownMapGps {
  lat: number;
  lng: number;
  altitude: number;
  accuracy: number | null;
  timestamp: string;
  source: GpsCoordSource;
  trailId?: string;
  trailName?: string;
}

export interface TrailBreadcrumbPoint {
  lat: number;
  lng: number;
  altitude: number;
  time: string;
  timestamp: string;
  accuracy?: number | null;
}

export interface DeviceTelemetrySnapshot {
  batteryPercent: number | null;
  isCharging: boolean | null;
  batterySupported: boolean;
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
  downlinkMbps: number | null;
  rttMs: number | null;
  signalLevel: 'strong' | 'moderate' | 'weak' | 'offline';
  signalLabel: string;
  signalLabelBm: string;
  signalBars: 0 | 1 | 2 | 3 | 4;
  gpsAccuracy: number | null;
  updatedAt: string;
}

export interface TrailSafetySession {
  id: string;
  uid: string;
  trackingToken: string;
  hikerName: string;
  userEmail: string;
  trailId: string;
  trailName: string;
  groupSize: number;
  emergencyContactName: string;
  emergencyContact: string;
  expectedHours: number;
  status: 'active' | 'overdue' | 'completed';
  startedAt: string;
  recordingStartedAt?: string;
  expectedReturnAt: string;
  checkedOutAt?: string;
  overdueTriggeredAt?: string;
  overdueAlertSent?: boolean;
  initialContactNotified?: boolean;
  manualStartAlertSent?: boolean;
  autoStartAlertSent?: boolean;
  autoStartAlertAt?: string;
  lastMovementAt?: string;
  motionSensorActive?: boolean;
  inactivityAlert1Sent?: boolean;
  inactivityAlert1At?: string;
  inactivityAlert1DismissedAt?: string;
  inactivityAlert2Sent?: boolean;
  inactivityAlert2At?: string;
  lastKnownCoords: string;
  lastKnownLat: number;
  lastKnownLng: number;
  currentAltitude?: number;
  coordSource: GpsCoordSource;
  breadcrumbs: TrailBreadcrumbPoint[];
  telemetry: DeviceTelemetrySnapshot;
  updatedAt: string;
}

export interface TrailContactNotificationResult {
  success: boolean;
  message: string;
  smsUrl: string;
  whatsappUrl: string;
  trackingUrl: string;
  channel: string;
  realSmsDelivered: boolean;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function logFirestorePermissionContext(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('[TrailSafetyService] Cloud sync notice:', JSON.stringify(errInfo));
}

let telemetryDbPromise: Promise<IDBPDatabase> | null = null;

function getTelemetryDb(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (!telemetryDbPromise) {
    telemetryDbPromise = openDB(TRAIL_TELEMETRY_DB, TRAIL_TELEMETRY_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_TELEMETRY_STATE)) {
          db.createObjectStore(STORE_TELEMETRY_STATE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_SESSION_OUTBOX)) {
          const store = db.createObjectStore(STORE_SESSION_OUTBOX, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      },
    });
  }
  return telemetryDbPromise;
}

export function generateTrackingToken(): string {
  return (
    Math.random().toString(36).substring(2, 8) +
    Date.now().toString(36).slice(-4)
  ).toUpperCase();
}

export function buildTrailTrackingUrl(sessionId: string, trackingToken?: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://camgo.my';
  const params = new URLSearchParams({ trailTrack: sessionId });
  if (trackingToken) params.set('token', trackingToken);
  return `${origin}/?${params.toString()}`;
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function playStillnessWarningTone(critical = false): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = critical ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(critical ? 980 : 660, now);
    osc.frequency.exponentialRampToValueAtTime(critical ? 1480 : 880, now + 0.25);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  } catch {
    // Audio playback blocked without gesture
  }

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(critical ? [350, 120, 350, 120, 500] : [250, 120, 250]);
    }
  } catch {
    // Vibration unavailable
  }
}

export async function requestMotionSensorPermissionIfNeeded(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const DME = (window as unknown as {
      DeviceMotionEvent?: { requestPermission?: () => Promise<'granted' | 'denied'> };
    }).DeviceMotionEvent;
    if (DME && typeof DME.requestPermission === 'function') {
      const status = await DME.requestPermission();
      return status === 'granted';
    }
    return 'DeviceMotionEvent' in window;
  } catch {
    return false;
  }
}

function computeSignalDetails(
  isOnline: boolean,
  effectiveType: string,
  rttMs: number | null,
  connectionType: string
): Pick<
  DeviceTelemetrySnapshot,
  'signalLevel' | 'signalLabel' | 'signalLabelBm' | 'signalBars'
> {
  if (!isOnline) {
    return {
      signalLevel: 'offline',
      signalLabel: 'Zero Signal (Offline Cache Active)',
      signalLabelBm: 'Tiada Isyarat (Mod Luar Talian)',
      signalBars: 0,
    };
  }
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return {
      signalLevel: 'weak',
      signalLabel: `Weak Ridge Signal (${effectiveType.toUpperCase()})`,
      signalLabelBm: `Isyarat Rabung Lemah (${effectiveType.toUpperCase()})`,
      signalBars: 1,
    };
  }
  if (effectiveType === '3g' || (rttMs !== null && rttMs >= 220)) {
    return {
      signalLevel: 'moderate',
      signalLabel: `Moderate Ridge Link (${effectiveType ? effectiveType.toUpperCase() : '3G'})`,
      signalLabelBm: `Isyarat Rabung Sederhana (${effectiveType ? effectiveType.toUpperCase() : '3G'})`,
      signalBars: 2,
    };
  }
  const typeTag =
    connectionType && connectionType !== 'unknown'
      ? `${connectionType.toUpperCase()} ${effectiveType ? effectiveType.toUpperCase() : '4G'}`
      : effectiveType
      ? effectiveType.toUpperCase()
      : '4G/LTE';
  return {
    signalLevel: 'strong',
    signalLabel: `Clear Ridge Connection (${typeTag})`,
    signalLabelBm: `Sambungan Rabung Jelas (${typeTag})`,
    signalBars: 4,
  };
}

interface BatteryManagerLike {
  level: number;
  charging: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface NetworkInfoLike {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

let cachedBattery: BatteryManagerLike | null = null;
let batteryChecked = false;
let latestGpsAccuracy: number | null = null;

export async function readLiveDeviceTelemetry(
  accuracyOverride?: number | null
): Promise<DeviceTelemetrySnapshot> {
  if (typeof accuracyOverride === 'number' && Number.isFinite(accuracyOverride)) {
    latestGpsAccuracy = Math.round(accuracyOverride);
  }

  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
  const isOnline = nav ? nav.onLine !== false : true;

  if (nav && !batteryChecked && typeof nav.getBattery === 'function') {
    batteryChecked = true;
    try {
      cachedBattery = await nav.getBattery();
    } catch {
      cachedBattery = null;
    }
  }

  const conn: NetworkInfoLike | null = nav
    ? nav.connection || nav.mozConnection || nav.webkitConnection || null
    : null;

  const effectiveType = conn?.effectiveType || (isOnline ? '4g' : 'none');
  const connectionType = conn?.type || (isOnline ? 'cellular' : 'none');
  const downlinkMbps =
    typeof conn?.downlink === 'number' && Number.isFinite(conn.downlink) ? conn.downlink : null;
  const rttMs = typeof conn?.rtt === 'number' && Number.isFinite(conn.rtt) ? conn.rtt : null;

  const signal = computeSignalDetails(isOnline, effectiveType, rttMs, connectionType);

  return {
    batteryPercent:
      cachedBattery && typeof cachedBattery.level === 'number'
        ? Math.round(cachedBattery.level * 100)
        : null,
    isCharging: cachedBattery ? Boolean(cachedBattery.charging) : null,
    batterySupported: Boolean(cachedBattery),
    isOnline,
    connectionType,
    effectiveType,
    downlinkMbps,
    rttMs,
    ...signal,
    gpsAccuracy: latestGpsAccuracy,
    updatedAt: new Date().toISOString(),
  };
}

export function subscribeDeviceTelemetry(
  callback: (snapshot: DeviceTelemetrySnapshot) => void
): () => void {
  let active = true;
  let batteryRef: BatteryManagerLike | null = null;
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
  const conn: NetworkInfoLike | null = nav
    ? nav.connection || nav.mozConnection || nav.webkitConnection || null
    : null;

  const emit = async () => {
    const snap = await readLiveDeviceTelemetry();
    if (active) callback(snap);
  };

  emit();

  if (nav && typeof nav.getBattery === 'function') {
    nav
      .getBattery()
      .then((bat: BatteryManagerLike) => {
        if (!active) return;
        cachedBattery = bat;
        batteryRef = bat;
        bat.addEventListener?.('levelchange', emit);
        bat.addEventListener?.('chargingchange', emit);
        emit();
      })
      .catch(() => {
        // Battery API blocked or unsupported
      });
  }

  conn?.addEventListener?.('change', emit);
  if (typeof window !== 'undefined') {
    window.addEventListener('online', emit);
    window.addEventListener('offline', emit);
  }

  const pollId = setInterval(emit, 15000);

  return () => {
    active = false;
    clearInterval(pollId);
    batteryRef?.removeEventListener?.('levelchange', emit);
    batteryRef?.removeEventListener?.('chargingchange', emit);
    conn?.removeEventListener?.('change', emit);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', emit);
      window.removeEventListener('offline', emit);
    }
  };
}

export function getCachedLastKnownMapGps(): LastKnownMapGps | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_KNOWN_MAP_GPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastKnownMapGps;
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateLastKnownMapGps(fix: LastKnownMapGps): Promise<void> {
  if (typeof fix.accuracy === 'number' && Number.isFinite(fix.accuracy)) {
    latestGpsAccuracy = Math.round(fix.accuracy);
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LAST_KNOWN_MAP_GPS_KEY, JSON.stringify(fix));
      window.dispatchEvent(new CustomEvent('camgo-map-gps-updated', { detail: fix }));
    } catch {
      // ignore quota error
    }
  }
  try {
    const idb = await getTelemetryDb();
    await idb.put(STORE_TELEMETRY_STATE, { key: 'last_known_map_gps', value: fix });
  } catch {
    // IndexedDB unavailable
  }
}

export async function getIndexedDbLastKnownMapGps(): Promise<LastKnownMapGps | null> {
  const local = getCachedLastKnownMapGps();
  try {
    const idb = await getTelemetryDb();
    const rec = await idb.get(STORE_TELEMETRY_STATE, 'last_known_map_gps');
    const idbFix = rec?.value as LastKnownMapGps | undefined;
    if (idbFix && typeof idbFix.lat === 'number' && typeof idbFix.lng === 'number') {
      if (!local) return idbFix;
      return new Date(idbFix.timestamp).getTime() >= new Date(local.timestamp).getTime()
        ? idbFix
        : local;
    }
  } catch {
    // ignore idb error
  }
  return local;
}

/**
 * Resolves the highest-priority GPS coordinate for SOS dispatch:
 * 1. Fresh live navigator.geolocation fix (within timeoutMs)
 * 2. Latest interactive map / IndexedDB / active safety session GPS coordinate
 * 3. Active trailhead pin if trail selected
 * 4. Cameron Highlands central highland fallback (only if nothing else exists)
 */
export async function resolveBestSosCoordinates(
  timeoutMs = 5500
): Promise<LastKnownMapGps> {
  const cachedMapFix = await getIndexedDbLastKnownMapGps();
  const activeSession = getCachedActiveTrailSession();

  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    try {
      const livePos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 10000,
        });
      });

      const fix: LastKnownMapGps = {
        lat: livePos.coords.latitude,
        lng: livePos.coords.longitude,
        altitude: livePos.coords.altitude || cachedMapFix?.altitude || 1450,
        accuracy: livePos.coords.accuracy ? Math.round(livePos.coords.accuracy) : null,
        timestamp: new Date().toISOString(),
        source: 'live_gps',
        trailId: cachedMapFix?.trailId || activeSession?.trailId,
        trailName: cachedMapFix?.trailName || activeSession?.trailName,
      };
      await updateLastKnownMapGps(fix);
      return fix;
    } catch {
      // Live GPS lost/timed out under canopy -> fall back to map/IndexedDB/session fix
    }
  }

  if (cachedMapFix) {
    return {
      ...cachedMapFix,
      source: cachedMapFix.source === 'live_gps' ? 'map_watch' : cachedMapFix.source,
    };
  }

  if (
    activeSession &&
    typeof activeSession.lastKnownLat === 'number' &&
    typeof activeSession.lastKnownLng === 'number'
  ) {
    return {
      lat: activeSession.lastKnownLat,
      lng: activeSession.lastKnownLng,
      altitude: activeSession.currentAltitude || 1500,
      accuracy: activeSession.telemetry?.gpsAccuracy ?? null,
      timestamp: activeSession.updatedAt || activeSession.startedAt,
      source: 'cached_idb',
      trailId: activeSession.trailId,
      trailName: activeSession.trailName,
    };
  }

  return {
    lat: 4.472145,
    lng: 101.376829,
    altitude: 1440,
    accuracy: null,
    timestamp: new Date().toISOString(),
    source: 'highland_fallback',
  };
}

export function getCachedActiveTrailSession(): TrailSafetySession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_TRAIL_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TrailSafetySession;
  } catch {
    return null;
  }
}

export function saveCachedActiveTrailSession(session: TrailSafetySession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      localStorage.removeItem(ACTIVE_TRAIL_SESSION_KEY);
    } else {
      localStorage.setItem(ACTIVE_TRAIL_SESSION_KEY, JSON.stringify(session));
    }
    window.dispatchEvent(new CustomEvent('camgo-trail-session-updated', { detail: session }));
  } catch {
    // ignore storage error
  }
}

export async function getQueuedTrailSessionCount(): Promise<number> {
  try {
    const idb = await getTelemetryDb();
    const all = await idb.getAll(STORE_SESSION_OUTBOX);
    return all.length;
  } catch {
    return 0;
  }
}

async function queueSessionForOfflineSync(session: TrailSafetySession): Promise<void> {
  saveCachedActiveTrailSession(session.status === 'completed' ? null : session);
  try {
    const idb = await getTelemetryDb();
    await idb.put(STORE_SESSION_OUTBOX, {
      ...session,
      queuedAt: new Date().toISOString(),
    });
  } catch {
    // ignore idb error
  }
}

/**
 * Persists trail safety session + breadcrumbs + live telemetry silently to Firestore (`safety_sessions`),
 * transparently queueing in IndexedDB whenever offline or signal drops.
 */
export async function syncTrailSessionToCloudOrQueue(
  session: TrailSafetySession,
  isNew = false
): Promise<{ synced: boolean; queuedOffline: boolean }> {
  saveCachedActiveTrailSession(session.status === 'completed' ? null : session);

  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  if (!db || !isOnline) {
    await queueSessionForOfflineSync(session);
    return { synced: false, queuedOffline: true };
  }

  const docPath = `safety_sessions/${session.id}`;
  try {
    const payload = {
      ...session,
      breadcrumbs: session.breadcrumbs.slice(-250),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'safety_sessions', session.id), payload, { merge: true });

    try {
      const idb = await getTelemetryDb();
      await idb.delete(STORE_SESSION_OUTBOX, session.id);
    } catch {
      // ignore idb cleanup error
    }

    return { synced: true, queuedOffline: false };
  } catch (error) {
    logFirestorePermissionContext(
      error,
      isNew ? OperationType.CREATE : OperationType.WRITE,
      docPath
    );
    await queueSessionForOfflineSync(session);
    return { synced: false, queuedOffline: true };
  }
}

export async function flushPendingTrailSessions(): Promise<number> {
  if (!db || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return 0;
  }
  try {
    const idb = await getTelemetryDb();
    const pending = (await idb.getAll(STORE_SESSION_OUTBOX)) as TrailSafetySession[];
    if (pending.length === 0) return 0;

    let flushed = 0;
    for (const item of pending) {
      try {
        const cleanItem: Record<string, unknown> = { ...item };
        delete cleanItem.queuedAt;
        await setDoc(doc(db, 'safety_sessions', item.id), cleanItem, { merge: true });
        await idb.delete(STORE_SESSION_OUTBOX, item.id);
        flushed += 1;
      } catch (err) {
        logFirestorePermissionContext(err, OperationType.WRITE, `safety_sessions/${item.id}`);
      }
    }
    return flushed;
  } catch {
    return 0;
  }
}

export function buildSmsLink(phone: string, message: string): string {
  const clean = (phone || '').replace(/[^0-9+]/g, '');
  const isIOS =
    typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return `sms:${clean}${isIOS ? '&' : '?'}body=${encodeURIComponent(message)}`;
}

export function buildWhatsAppLink(phone: string, message: string): string {
  let clean = (phone || '').replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '60' + clean.substring(1);
  }
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

/**
 * Dispatches initial hiker check-in status alert to designated Emergency Contact.
 */
export async function sendInitialTrailCheckInAlert(
  session: TrailSafetySession
): Promise<TrailContactNotificationResult> {
  const etaStr = new Date(session.expectedReturnAt).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const trackingUrl = buildTrailTrackingUrl(session.id, session.trackingToken);
  const mapsUrl = `https://www.google.com/maps?q=${session.lastKnownLat},${session.lastKnownLng}`;
  const msg = `CAMGO TRAIL CHECK-IN: ${session.hikerName} (Group: ${session.groupSize}) has started ${session.trailName}. Expected return: ${session.expectedHours}h (~${etaStr}). Live Footprint Tracker: ${trackingUrl} | Pin: ${mapsUrl}`;

  const smsUrl = buildSmsLink(session.emergencyContact, msg);
  const whatsappUrl = buildWhatsAppLink(session.emergencyContact, msg);

  let channel = 'Ready SMS/WhatsApp + Live Footprint Link';
  let realSmsDelivered = false;

  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    try {
      const resp = await fetch('/api/trails/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          eventType: 'trail_checkin_started',
          hikerName: session.hikerName,
          trailName: session.trailName,
          expectedHours: session.expectedHours,
          expectedReturnAt: session.expectedReturnAt,
          groupSize: session.groupSize,
          emergencyContact: session.emergencyContact,
          emergencyContactName: session.emergencyContactName,
          coordinates: { lat: session.lastKnownLat, lng: session.lastKnownLng },
          trackingUrl,
          telemetry: session.telemetry,
          message: msg,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        channel = json.channel || channel;
        realSmsDelivered = Boolean(json.realSmsDelivered);
      }
    } catch {
      // Non-fatal
    }
  }

  return {
    success: true,
    message: msg,
    smsUrl,
    whatsappUrl,
    trackingUrl,
    channel,
    realSmsDelivered,
  };
}

/**
 * 5-Minute Failsafe Start Alert:
 * Automatically triggered if the hiker tapped Record Trail and skipped/forgot manual WhatsApp/SMS.
 */
export async function triggerFiveMinuteAutoStartAlert(
  session: TrailSafetySession
): Promise<TrailContactNotificationResult> {
  const etaStr = new Date(session.expectedReturnAt).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const startStr = new Date(session.recordingStartedAt || session.startedAt).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const trackingUrl = buildTrailTrackingUrl(session.id, session.trackingToken);
  const mapsUrl = `https://www.google.com/maps?q=${session.lastKnownLat},${session.lastKnownLng}`;

  const msg = `CAMGO AUTO START ALERT (5-Min Failsafe): ${session.hikerName} started recording on ${session.trailName} at ${startStr}. Expected return: ${session.expectedHours} hours (~${etaStr}). Watch Live Footprint Map: ${trackingUrl} | Trailhead Pin: ${mapsUrl}`;

  const updatedSession: TrailSafetySession = {
    ...session,
    autoStartAlertSent: true,
    autoStartAlertAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await syncTrailSessionToCloudOrQueue(updatedSession, false);

  let channel = 'Automated 5-Minute Backend Notification Dispatch';
  let realSmsDelivered = false;

  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    try {
      const resp = await fetch('/api/trails/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          eventType: 'trail_auto_start_5m',
          hikerName: session.hikerName,
          trailName: session.trailName,
          expectedHours: session.expectedHours,
          expectedReturnAt: session.expectedReturnAt,
          groupSize: session.groupSize,
          emergencyContact: session.emergencyContact,
          emergencyContactName: session.emergencyContactName,
          coordinates: { lat: session.lastKnownLat, lng: session.lastKnownLng },
          trackingUrl,
          telemetry: session.telemetry,
          message: msg,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        channel = json.channel || channel;
        realSmsDelivered = Boolean(json.realSmsDelivered);
      }
    } catch {
      // queued via session flag
    }
  }

  return {
    success: true,
    message: msg,
    smsUrl: buildSmsLink(session.emergencyContact, msg),
    whatsappUrl: buildWhatsAppLink(session.emergencyContact, msg),
    trackingUrl,
    channel,
    realSmsDelivered,
  };
}

/**
 * Motion Dead-Man Switch Stage 1 (15 Minutes Zero Movement):
 * Notifies Emergency Contact of prolonged stillness & logs stage 1 event.
 */
export async function triggerInactivityStage1Alert(
  session: TrailSafetySession,
  latestGps: LastKnownMapGps,
  telemetry: DeviceTelemetrySnapshot
): Promise<TrailContactNotificationResult> {
  const trackingUrl = buildTrailTrackingUrl(session.id, session.trackingToken);
  const mapsUrl = `https://www.google.com/maps?q=${latestGps.lat},${latestGps.lng}`;
  const msg = `⚠️ CAMGO 15-MIN STILLNESS WARNING: No motion detected from ${session.hikerName} on ${session.trailName} for 15 minutes. Live Footprint Map: ${trackingUrl} | Last GPS: ${mapsUrl} | Bat: ${telemetry.batteryPercent ?? 'N/A'}%`;

  const updated: TrailSafetySession = {
    ...session,
    inactivityAlert1Sent: true,
    inactivityAlert1At: new Date().toISOString(),
    lastKnownLat: latestGps.lat,
    lastKnownLng: latestGps.lng,
    lastKnownCoords: `${latestGps.lat.toFixed(6)}, ${latestGps.lng.toFixed(6)}`,
    currentAltitude: latestGps.altitude,
    telemetry,
    updatedAt: new Date().toISOString(),
  };
  await syncTrailSessionToCloudOrQueue(updated, false);

  let channel = 'Stage 1 Stillness Alert Dispatched';
  let realSmsDelivered = false;

  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    try {
      const resp = await fetch('/api/trails/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          eventType: 'inactivity_warning_15m',
          hikerName: session.hikerName,
          trailName: session.trailName,
          emergencyContact: session.emergencyContact,
          coordinates: { lat: latestGps.lat, lng: latestGps.lng },
          trackingUrl,
          stillnessMinutes: 15,
          telemetry,
          message: msg,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        channel = json.channel || channel;
        realSmsDelivered = Boolean(json.realSmsDelivered);
      }
    } catch {
      // non-fatal
    }
  }

  return {
    success: true,
    message: msg,
    smsUrl: buildSmsLink(session.emergencyContact, msg),
    whatsappUrl: buildWhatsAppLink(session.emergencyContact, msg),
    trackingUrl,
    channel,
    realSmsDelivered,
  };
}

/**
 * Motion Dead-Man Switch Stage 2 (30 Minutes Continuous No Movement):
 * Escalates and dispatches Critical Alert with exact GPS, battery, and trail telemetry
 * to BOTH Emergency Contact AND CamGo Admin.
 */
export async function triggerInactivityStage2CriticalAlert(
  session: TrailSafetySession,
  latestGps: LastKnownMapGps,
  telemetry: DeviceTelemetrySnapshot,
  emergencyCard?: EmergencyCard
): Promise<{
  sosOutcome: SosDispatchOutcome;
  smsUrl: string;
  whatsappUrl: string;
  trackingUrl: string;
  alertMessage: string;
}> {
  const trackingUrl = buildTrailTrackingUrl(session.id, session.trackingToken);
  const mapsUrl = `https://www.google.com/maps?q=${latestGps.lat},${latestGps.lng}`;
  const alertMessage = [
    `🚨 CAMGO CRITICAL 30-MIN IMMOBILITY ALERT 🚨`,
    `Hiker: ${session.hikerName} (Group: ${session.groupSize})`,
    `Trail: ${session.trailName}`,
    `Status: Zero physical motion or GPS movement for 30 continuous minutes.`,
    `📍 Last GPS (${latestGps.source}): ${latestGps.lat.toFixed(6)}, ${latestGps.lng.toFixed(6)}`,
    `🥾 Live Footprint Map: ${trackingUrl}`,
    `🗺️ Maps Pin: ${mapsUrl}`,
    `🔋 Battery: ${telemetry.batteryPercent ?? 'N/A'}%${telemetry.isCharging ? ' (Charging)' : ''} | 📶 ${telemetry.signalLabel}`,
  ].join('\n');

  const updated: TrailSafetySession = {
    ...session,
    status: 'overdue',
    inactivityAlert2Sent: true,
    inactivityAlert2At: new Date().toISOString(),
    lastKnownLat: latestGps.lat,
    lastKnownLng: latestGps.lng,
    lastKnownCoords: `${latestGps.lat.toFixed(6)}, ${latestGps.lng.toFixed(6)}`,
    currentAltitude: latestGps.altitude,
    telemetry,
    updatedAt: new Date().toISOString(),
  };
  await syncTrailSessionToCloudOrQueue(updated, false);

  if (db && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    const broadcastId = `inactivity30-${session.id}`;
    try {
      await setDoc(
        doc(db, 'broadcast_notifications', broadcastId),
        {
          id: broadcastId,
          event: 'sos_alert',
          priority: 'critical',
          payload: {
            title: `CRITICAL 30M ZERO MOVEMENT: ${session.hikerName} on ${session.trailName}`,
            message: `No motion for 30 continuous minutes. Last GPS: ${latestGps.lat.toFixed(5)}, ${latestGps.lng.toFixed(5)}. Bat: ${telemetry.batteryPercent ?? '?'}% (${telemetry.signalLabel}).`,
            sender: session.hikerName,
            location: `${latestGps.lat.toFixed(5)}, ${latestGps.lng.toFixed(5)}`,
            phone: session.emergencyContact || '999',
            trailName: session.trailName,
            trackingUrl,
            mapsUrl,
            triggerSource: 'inactivity_30m',
            telemetry,
          },
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      logFirestorePermissionContext(
        err,
        OperationType.WRITE,
        `broadcast_notifications/${broadcastId}`
      );
    }
  }

  const sosOutcome = await sendOrQueueEmergencySos({
    lat: latestGps.lat,
    lng: latestGps.lng,
    accuracy: latestGps.accuracy,
    userHandle: session.hikerName || 'Highland Hiker',
    sosType: 'stranded_lost',
    severity: 'critical',
    recipientPhone: session.emergencyContact || '999',
    emergencyCard,
    trailName: session.trailName,
    trailSessionId: session.id,
    triggerSource: 'inactivity_30m',
    coordSource: latestGps.source,
    telemetry,
  });

  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    try {
      await Promise.all([
        fetch('/api/emergency/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientPhone: session.emergencyContact || '999',
            senderName: session.hikerName,
            coordinates: { lat: latestGps.lat, lng: latestGps.lng },
            emergencyCard,
            trailName: session.trailName,
            triggerSource: 'inactivity_30m',
            telemetry,
          }),
        }),
        fetch('/api/trails/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            eventType: 'inactivity_critical_30m',
            hikerName: session.hikerName,
            trailName: session.trailName,
            emergencyContact: session.emergencyContact,
            coordinates: { lat: latestGps.lat, lng: latestGps.lng },
            trackingUrl,
            stillnessMinutes: 30,
            telemetry,
            message: alertMessage,
          }),
        }),
      ]);
    } catch {
      // Offline queue handles retries
    }
  }

  return {
    sosOutcome,
    smsUrl: buildSmsLink(session.emergencyContact || '999', alertMessage),
    whatsappUrl: buildWhatsAppLink(session.emergencyContact || '999', alertMessage),
    trackingUrl,
    alertMessage,
  };
}

/**
 * Trigger 1: Automated Overdue Timer Alert ->
 * Notifies BOTH the user's Emergency Contact AND CamGo Admin with last known GPS + device telemetry.
 */
export async function triggerOverdueTrailAlert(
  session: TrailSafetySession,
  latestGps: LastKnownMapGps,
  telemetry: DeviceTelemetrySnapshot,
  emergencyCard?: EmergencyCard
): Promise<{
  sosOutcome: SosDispatchOutcome;
  smsUrl: string;
  whatsappUrl: string;
  trackingUrl: string;
  alertMessage: string;
}> {
  const trackingUrl = buildTrailTrackingUrl(session.id, session.trackingToken);
  const mapsUrl = `https://www.google.com/maps?q=${latestGps.lat},${latestGps.lng}`;
  const alertMessage = [
    `🚨 CAMGO OVERDUE HIKER ALERT 🚨`,
    `Hiker: ${session.hikerName} (Group: ${session.groupSize})`,
    `Trail: ${session.trailName}`,
    `Expected Return: ${session.expectedHours}h (EXPIRED)`,
    `📍 Last Known GPS: ${latestGps.lat.toFixed(6)}, ${latestGps.lng.toFixed(6)} (${latestGps.source})`,
    `🥾 Live Footprint Map: ${trackingUrl}`,
    `🗺️ Map: ${mapsUrl}`,
    `🔋 Battery: ${telemetry.batteryPercent ?? 'N/A'}%${telemetry.isCharging ? ' (Charging)' : ''} | 📶 ${telemetry.signalLabel}`,
    `📞 ICE: ${session.emergencyContact || '999'}`,
  ].join('\n');

  const overdueSession: TrailSafetySession = {
    ...session,
    status: 'overdue',
    overdueTriggeredAt: new Date().toISOString(),
    overdueAlertSent: true,
    lastKnownCoords: `${latestGps.lat.toFixed(6)}, ${latestGps.lng.toFixed(6)}`,
    lastKnownLat: latestGps.lat,
    lastKnownLng: latestGps.lng,
    currentAltitude: latestGps.altitude,
    coordSource: latestGps.source,
    telemetry,
    updatedAt: new Date().toISOString(),
  };

  await syncTrailSessionToCloudOrQueue(overdueSession, false);

  if (db && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    const broadcastId = `overdue-${session.id}`;
    try {
      await setDoc(
        doc(db, 'broadcast_notifications', broadcastId),
        {
          id: broadcastId,
          event: 'sos_alert',
          priority: 'critical',
          payload: {
            title: `OVERDUE HIKER: ${session.hikerName} on ${session.trailName}`,
            message: `Expected ${session.expectedHours}h duration expired without check-out. Last GPS: ${latestGps.lat.toFixed(5)}, ${latestGps.lng.toFixed(5)}. Battery: ${telemetry.batteryPercent ?? '?'}% (${telemetry.signalLabel}).`,
            sender: session.hikerName,
            location: `${latestGps.lat.toFixed(5)}, ${latestGps.lng.toFixed(5)}`,
            phone: session.emergencyContact || '999',
            trailName: session.trailName,
            trackingUrl,
            mapsUrl,
            triggerSource: 'overdue_timer',
            telemetry,
          },
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      logFirestorePermissionContext(
        err,
        OperationType.WRITE,
        `broadcast_notifications/${broadcastId}`
      );
    }
  }

  const sosOutcome = await sendOrQueueEmergencySos({
    lat: latestGps.lat,
    lng: latestGps.lng,
    accuracy: latestGps.accuracy,
    userHandle: session.hikerName || 'Highland Hiker',
    sosType: 'stranded_lost',
    severity: 'critical',
    recipientPhone: session.emergencyContact || '999',
    emergencyCard,
    trailName: session.trailName,
    trailSessionId: session.id,
    triggerSource: 'overdue_timer',
    coordSource: latestGps.source,
    telemetry,
  });

  if (typeof navigator === 'undefined' || navigator.onLine !== false) {
    try {
      await fetch('/api/emergency/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: session.emergencyContact || '999',
          senderName: session.hikerName,
          coordinates: { lat: latestGps.lat, lng: latestGps.lng },
          emergencyCard,
          trailName: session.trailName,
          triggerSource: 'overdue_timer',
          telemetry,
        }),
      });
    } catch {
      // Already handled by /api/sos or IndexedDB queue
    }
  }

  return {
    sosOutcome,
    smsUrl: buildSmsLink(session.emergencyContact || '999', alertMessage),
    whatsappUrl: buildWhatsAppLink(session.emergencyContact || '999', alertMessage),
    trackingUrl,
    alertMessage,
  };
}

export async function markTrailSessionCheckedOut(session: TrailSafetySession): Promise<void> {
  const completed: TrailSafetySession = {
    ...session,
    status: 'completed',
    checkedOutAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveCachedActiveTrailSession(null);

  if (db && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    try {
      await updateDoc(doc(db, 'safety_sessions', session.id), {
        status: 'completed',
        checkedOutAt: completed.checkedOutAt,
        updatedAt: completed.updatedAt,
      });
      return;
    } catch (err) {
      logFirestorePermissionContext(err, OperationType.UPDATE, `safety_sessions/${session.id}`);
    }
  }

  await queueSessionForOfflineSync(completed);
}
