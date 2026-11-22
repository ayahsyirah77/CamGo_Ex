import { openDB, IDBPDatabase } from 'idb';
import { EmergencyCard } from '../types';
import { buildNextSosRetryState } from '../utils/highlandLogic';

export const SOS_DB_NAME = 'camgo_offline_sos_db';
export const SOS_DB_VERSION = 1;
export const SOS_STORE_NAME = 'sos_outbox';
export const SOS_SYNC_TAG = 'sync-sos';
export const SOS_BROADCAST_CHANNEL = 'camgo-sos-sync';
export const SOS_QUEUE_EVENT = 'camgo-sos-queue-updated';
export const SOS_SYNCED_EVENT = 'camgo-sos-synced';
const LAST_SYNCED_STORAGE_KEY = 'camgo_last_synced_sos_v1';

export type SosSeverityType = 'critical' | 'medical' | 'accident_landslide' | 'stranded_lost';

export interface OfflineSosPacket {
  id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: string;
  userHandle: string;
  sosType: SosSeverityType;
  severity: 'critical' | 'high';
  recipientPhone: string;
  emergencyCard?: EmergencyCard;
  status: 'queued' | 'syncing' | 'retry_scheduled' | 'synced';
  attempts: number;
  nextRetryAt: number;
  lastAttemptAt?: number;
  lastError?: string;
  syncedAt?: string;
  queuedOffline: boolean;
  trailName?: string;
  trailSessionId?: string;
  triggerSource?: 'manual_smart_sos' | 'overdue_timer' | 'inactivity_30m' | 'widget';
  coordSource?: string;
  telemetry?: Record<string, any>;
}

export interface SyncedSosSummary {
  id: string;
  sosType: SosSeverityType;
  timestamp: string;
  syncedAt: string;
  lat: number;
  lng: number;
}

export interface SosDispatchInput {
  lat: number;
  lng: number;
  accuracy: number | null;
  userHandle: string;
  sosType: SosSeverityType;
  severity: 'critical' | 'high';
  recipientPhone: string;
  emergencyCard?: EmergencyCard;
  trailName?: string;
  trailSessionId?: string;
  triggerSource?: 'manual_smart_sos' | 'overdue_timer' | 'inactivity_30m' | 'widget';
  coordSource?: string;
  telemetry?: Record<string, any>;
}

export interface SosDispatchOutcome {
  outcome: 'transmitted_online' | 'queued_offline';
  packet: OfflineSosPacket;
  backgroundSyncRegistered: boolean;
  serverResponse?: Record<string, any>;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getSosDb(): Promise<IDBPDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (!dbPromise) {
    dbPromise = openDB(SOS_DB_NAME, SOS_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SOS_STORE_NAME)) {
          const store = db.createObjectStore(SOS_STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

function emitQueueUpdated(packets: OfflineSosPacket[]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SOS_QUEUE_EVENT, { detail: packets }));
  }
}

export function getLastSyncedSosSummary(): SyncedSosSummary | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_SYNCED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SyncedSosSummary) : null;
  } catch {
    return null;
  }
}

export function saveLastSyncedSosSummary(summary: SyncedSosSummary | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!summary) {
      localStorage.removeItem(LAST_SYNCED_STORAGE_KEY);
    } else {
      localStorage.setItem(LAST_SYNCED_STORAGE_KEY, JSON.stringify(summary));
    }
  } catch {
    // ignore storage quota errors
  }
}

export async function getPendingSosPackets(): Promise<OfflineSosPacket[]> {
  try {
    const db = await getSosDb();
    const all = (await db.getAll(SOS_STORE_NAME)) as OfflineSosPacket[];
    return all
      .filter((p) => p && p.status !== 'synced')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}

export async function enqueueOfflineSos(packet: OfflineSosPacket): Promise<OfflineSosPacket[]> {
  const db = await getSosDb();
  await db.put(SOS_STORE_NAME, packet);
  const pending = await getPendingSosPackets();
  emitQueueUpdated(pending);
  return pending;
}

export async function removeQueuedSosPacket(id: string): Promise<OfflineSosPacket[]> {
  const db = await getSosDb();
  await db.delete(SOS_STORE_NAME, id);
  const pending = await getPendingSosPackets();
  emitQueueUpdated(pending);
  return pending;
}

/**
 * Registers Chrome/Android/PWA Background Sync (`sync-sos`) on the active Service Worker
 */
export async function registerSosBackgroundSync(): Promise<{
  supported: boolean;
  registered: boolean;
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { supported: false, registered: false };
  }

  try {
    const registration = (await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ])) as ServiceWorkerRegistration | null;

    if (!registration) {
      return { supported: false, registered: false };
    }

    const syncMgr = (registration as unknown as {
      sync?: { register: (tag: string) => Promise<void> };
    }).sync;

    if (syncMgr && typeof syncMgr.register === 'function') {
      await syncMgr.register(SOS_SYNC_TAG);
      return { supported: true, registered: true };
    }

    return { supported: false, registered: false };
  } catch (err) {
    console.warn('[OfflineSosQueue] Background Sync registration notice:', err);
    return { supported: false, registered: false };
  }
}

/**
 * Ask active Service Worker to flush outbox immediately when online
 */
export async function triggerServiceWorkerSosSync(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg.active) {
      reg.active.postMessage({ type: 'TRIGGER_SOS_SYNC' });
      return true;
    }
  } catch {
    // ignore SW messaging error
  }
  return false;
}

/**
 * Direct client-side outbox flush with exponential backoff guard
 * Serves both browsers without BackgroundSync API (iOS Safari, Firefox) and manual Retry button.
 */
export async function flushOfflineSosQueue(forceRetry = false): Promise<{
  synced: OfflineSosPacket[];
  remaining: OfflineSosPacket[];
}> {
  const pending = await getPendingSosPackets();
  if (pending.length === 0) {
    return { synced: [], remaining: [] };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { synced: [], remaining: pending };
  }

  const db = await getSosDb();
  const synced: OfflineSosPacket[] = [];
  const now = Date.now();

  for (const packet of pending) {
    if (!forceRetry && packet.nextRetryAt && now < packet.nextRetryAt) {
      continue;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const resp = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...packet,
          queuedOffline: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const json = await resp.json();
      if (!json || json.success !== true) {
        throw new Error(json?.error || 'Unacknowledged SOS payload');
      }

      await db.delete(SOS_STORE_NAME, packet.id);
      const syncedPacket: OfflineSosPacket = {
        ...packet,
        status: 'synced',
        syncedAt: json.syncedAt || new Date().toISOString(),
      };
      synced.push(syncedPacket);

      const summary: SyncedSosSummary = {
        id: syncedPacket.id,
        sosType: syncedPacket.sosType,
        timestamp: syncedPacket.timestamp,
        syncedAt: syncedPacket.syncedAt!,
        lat: syncedPacket.lat,
        lng: syncedPacket.lng,
      };
      saveLastSyncedSosSummary(summary);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SOS_SYNCED_EVENT, { detail: summary }));
      }
    } catch (err: any) {
      const nextRetryPacket = buildNextSosRetryState(
        packet,
        err?.message || 'Signal dropped mid-sync',
        Date.now()
      );
      await db.put(SOS_STORE_NAME, nextRetryPacket);
    }
  }

  const remaining = await getPendingSosPackets();
  emitQueueUpdated(remaining);
  return { synced, remaining };
}

/**
 * Primary dispatch routine:
 * Attempts instant delivery to /api/sos when online;
 * Automatically saves to IndexedDB & registers 'sync-sos' when offline or on mid-flight drop.
 */
export async function sendOrQueueEmergencySos(
  input: SosDispatchInput
): Promise<SosDispatchOutcome> {
  const id = `sos-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toISOString();

  const packet: OfflineSosPacket = {
    id,
    lat: input.lat,
    lng: input.lng,
    accuracy: input.accuracy,
    timestamp,
    userHandle: input.userHandle || 'Highland Visitor',
    sosType: input.sosType,
    severity: input.severity,
    recipientPhone: input.recipientPhone || '999',
    emergencyCard: input.emergencyCard,
    trailName: input.trailName,
    trailSessionId: input.trailSessionId,
    triggerSource: input.triggerSource,
    coordSource: input.coordSource,
    telemetry: input.telemetry,
    status: 'queued',
    attempts: 0,
    nextRetryAt: Date.now(),
    queuedOffline: false,
  };

  const isCurrentlyOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  if (isCurrentlyOnline) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packet),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (resp.ok) {
        const json = await resp.json();
        if (json?.success) {
          return {
            outcome: 'transmitted_online',
            packet: { ...packet, status: 'synced', syncedAt: json.syncedAt || timestamp },
            backgroundSyncRegistered: false,
            serverResponse: json,
          };
        }
      }
    } catch (err: any) {
      packet.lastError = err?.message || 'Network request failed';
    }
  }

  // Offline or failed transmission -> Save safely to IndexedDB & register Service Worker Background Sync
  const queuedPacket: OfflineSosPacket = {
    ...packet,
    queuedOffline: true,
    status: 'queued',
    nextRetryAt: Date.now(),
  };

  await enqueueOfflineSos(queuedPacket);
  const { registered } = await registerSosBackgroundSync();

  return {
    outcome: 'queued_offline',
    packet: queuedPacket,
    backgroundSyncRegistered: registered,
  };
}
