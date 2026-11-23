import { db } from '../lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
} from 'firebase/firestore';
import { CamgoHazard } from '../types';
import {
  CLEARED_VOTE_EXPIRY_THRESHOLD,
  applyHazardConsensusVote,
} from '../utils/highlandLogic';

export { CLEARED_VOTE_EXPIRY_THRESHOLD, applyHazardConsensusVote };

export const CAMGO_HAZARDS_COLLECTION = 'camgo_hazards';
const LOCAL_STORAGE_HAZARDS_KEY = 'camgo_hazards_geo_v1';
const LOCAL_USER_VOTES_KEY = 'camgo_hazard_user_votes_v1';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
  };
  console.warn('[Firestore camgo_hazards]', JSON.stringify(errInfo));
}

function isHazardActive(h: any, nowMs = Date.now()): boolean {
  if (!h) return false;
  if (h.status === 'cleared' || h.active === false) return false;
  const hasActiveFlag = h.active === true || h.status === 'active';
  if (!hasActiveFlag) return false;
  if (h.expiresAt) {
    const expMs = new Date(h.expiresAt).getTime();
    if (Number.isFinite(expMs) && expMs <= nowMs) return false;
  }
  return true;
}

function normalizeHazardRecord(raw: any, id?: string): CamgoHazard {
  const status: 'active' | 'cleared' | 'pending' =
    raw.status || (raw.active === true ? 'active' : 'cleared');
  return {
    ...raw,
    id: id || raw.id,
    description: raw.description || raw.summary || raw.title || '',
    summary: raw.summary || raw.description || '',
    location: raw.location || raw.corridor || 'Cameron Highlands',
    status,
    active: raw.active !== undefined ? Boolean(raw.active) : status === 'active',
    stillThereVotes: typeof raw.stillThereVotes === 'number' ? raw.stillThereVotes : 0,
    clearedVotes: typeof raw.clearedVotes === 'number' ? raw.clearedVotes : 0,
    timestamp: raw.timestamp || raw.updatedAt || new Date().toISOString(),
  } as CamgoHazard;
}

function readLocalHazards(): CamgoHazard[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HAZARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const nowMs = Date.now();
    return Array.isArray(parsed)
      ? parsed.filter((h) => isHazardActive(h, nowMs)).map((h) => normalizeHazardRecord(h))
      : [];
  } catch {
    return [];
  }
}

function writeLocalHazards(hazards: CamgoHazard[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_HAZARDS_KEY, JSON.stringify(hazards));
    window.dispatchEvent(new CustomEvent('camgo-hazards-updated', { detail: hazards }));
  } catch {
    // ignore quota errors
  }
}

export function getUserVoteHistory(): Record<string, 'still_there' | 'cleared'> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_USER_VOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function recordUserVote(hazardId: string, vote: 'still_there' | 'cleared'): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = getUserVoteHistory();
    prev[hazardId] = vote;
    localStorage.setItem(LOCAL_USER_VOTES_KEY, JSON.stringify(prev));
  } catch {
    // ignore
  }
}

class CamgoHazardsService {
  private memoryCache: CamgoHazard[] = [];

  constructor() {
    this.memoryCache = readLocalHazards();
  }

  public getCachedActiveHazards(): CamgoHazard[] {
    const nowMs = Date.now();
    if (this.memoryCache.length > 0) {
      return this.memoryCache.filter((h) => isHazardActive(h, nowMs));
    }
    return readLocalHazards();
  }

  public subscribeActiveHazards(onUpdate: (hazards: CamgoHazard[]) => void): () => void {
    const initial = this.getCachedActiveHazards();
    onUpdate(initial);

    let unsubActiveFlag: (() => void) | null = null;
    let unsubLegacyStatus: (() => void) | null = null;
    const activeFlagMap = new Map<string, CamgoHazard>();
    const legacyStatusMap = new Map<string, CamgoHazard>();

    const emitMerged = () => {
      const nowMs = Date.now();
      const mergedById = new Map<string, CamgoHazard>();

      legacyStatusMap.forEach((h, id) => {
        if (isHazardActive(h, nowMs)) mergedById.set(id, h);
      });
      activeFlagMap.forEach((h, id) => {
        if (isHazardActive(h, nowMs)) mergedById.set(id, h);
      });

      const localPending = readLocalHazards().filter(
        (l) => isHazardActive(l, nowMs) && !mergedById.has(l.id) && (l.id.startsWith('local-') || l.verifiedBy === 'auto_news_feed')
      );
      localPending.forEach((l) => mergedById.set(l.id, l));

      const merged = Array.from(mergedById.values()).sort(
        (a, b) =>
          new Date(b.updatedAt || b.timestamp).getTime() -
          new Date(a.updatedAt || a.timestamp).getTime()
      );

      this.memoryCache = merged;
      writeLocalHazards(merged);
      onUpdate(merged);
    };

    if (db) {
      try {
        const activeQuery = query(
          collection(db, CAMGO_HAZARDS_COLLECTION),
          where('active', '==', true)
        );
        unsubActiveFlag = onSnapshot(
          activeQuery,
          (snapshot) => {
            activeFlagMap.clear();
            snapshot.docs.forEach((d) => {
              const norm = normalizeHazardRecord(d.data(), d.id);
              if (isHazardActive(norm)) {
                activeFlagMap.set(d.id, norm);
              }
            });
            emitMerged();
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, CAMGO_HAZARDS_COLLECTION);
          }
        );

        const legacyQuery = query(
          collection(db, CAMGO_HAZARDS_COLLECTION),
          where('status', '==', 'active')
        );
        unsubLegacyStatus = onSnapshot(
          legacyQuery,
          (snapshot) => {
            legacyStatusMap.clear();
            snapshot.docs.forEach((d) => {
              const norm = normalizeHazardRecord(d.data(), d.id);
              if (isHazardActive(norm)) {
                legacyStatusMap.set(d.id, norm);
              }
            });
            emitMerged();
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, CAMGO_HAZARDS_COLLECTION);
          }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, CAMGO_HAZARDS_COLLECTION);
      }
    }

    const handleLocalEvent = (e: Event) => {
      const custom = e as CustomEvent<CamgoHazard[]>;
      if (Array.isArray(custom.detail)) {
        const nowMs = Date.now();
        const activeOnly = custom.detail.filter((h) => isHazardActive(h, nowMs));
        this.memoryCache = activeOnly;
        onUpdate(activeOnly);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('camgo-hazards-updated', handleLocalEvent);
    }

    return () => {
      if (unsubActiveFlag) unsubActiveFlag();
      if (unsubLegacyStatus) unsubLegacyStatus();
      if (typeof window !== 'undefined') {
        window.removeEventListener('camgo-hazards-updated', handleLocalEvent);
      }
    };
  }

  public async upsertActiveHazard(hazard: CamgoHazard): Promise<CamgoHazard> {
    const status = hazard.status || 'active';
    const normalized: CamgoHazard = {
      ...hazard,
      description: hazard.description || hazard.summary || hazard.title,
      status,
      active: status === 'active',
      stillThereVotes: typeof hazard.stillThereVotes === 'number' ? hazard.stillThereVotes : 0,
      clearedVotes: typeof hazard.clearedVotes === 'number' ? hazard.clearedVotes : 0,
      updatedAt: new Date().toISOString(),
    };

    // Update local cache immediately for crisp UX
    const nextList = [
      normalized,
      ...this.getCachedActiveHazards().filter((h) => h.id !== normalized.id),
    ];
    this.memoryCache = nextList;
    writeLocalHazards(nextList);

    if (db) {
      try {
        const cleanDoc = Object.fromEntries(
          Object.entries(normalized).filter(([_, v]) => v !== undefined && v !== null)
        );
        await setDoc(doc(db, CAMGO_HAZARDS_COLLECTION, normalized.id), cleanDoc, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${CAMGO_HAZARDS_COLLECTION}/${normalized.id}`);
      }
    }

    return normalized;
  }

  /**
   * Module A: Peer-Driven Consensus & Voting ("Still There" +1 / "Cleared" -1).
   * Once a hazard accumulates 3 "Cleared" votes, status transitions to 'cleared' in Firestore
   * so it automatically drops off the Leaflet map.
   */
  public async voteOnHazard(
    hazard: CamgoHazard,
    vote: 'still_there' | 'cleared'
  ): Promise<{ updated: CamgoHazard; expired: boolean }> {
    const updatedRaw = applyHazardConsensusVote(hazard, vote, CLEARED_VOTE_EXPIRY_THRESHOLD);
    const expired = updatedRaw.status === 'cleared';
    const updated: CamgoHazard = {
      ...updatedRaw,
      active: !expired,
    };
    recordUserVote(hazard.id, vote);

    // Update local cache immediately
    const current = this.getCachedActiveHazards();
    const nextLocal = expired
      ? current.filter((h) => h.id !== hazard.id)
      : [updated, ...current.filter((h) => h.id !== hazard.id)];
    this.memoryCache = nextLocal;
    writeLocalHazards(nextLocal);

    // Persist vote or expiry to Firestore 'camgo_hazards'
    if (db) {
      const ref = doc(db, CAMGO_HAZARDS_COLLECTION, hazard.id);
      try {
        if (vote === 'still_there') {
          await updateDoc(ref, {
            stillThereVotes: increment(1),
            status: 'active',
            active: true,
            updatedAt: updated.updatedAt,
          });
        } else if (expired) {
          await updateDoc(ref, {
            clearedVotes: updated.clearedVotes,
            status: 'cleared',
            active: false,
            clearedAt: updated.clearedAt,
            updatedAt: updated.updatedAt,
          });
        } else {
          await updateDoc(ref, {
            clearedVotes: increment(1),
            updatedAt: updated.updatedAt,
          });
        }
      } catch {
        // Document might be newly created/provisional; ensure full document write satisfies create rules
        try {
          const cleanDoc = Object.fromEntries(
            Object.entries(updated).filter(([_, v]) => v !== undefined && v !== null)
          );
          await setDoc(ref, cleanDoc, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `${CAMGO_HAZARDS_COLLECTION}/${hazard.id}`);
        }
      }
    }

    return { updated, expired };
  }

  public async ingestHazardViaApi(payload: {
    text?: string;
    imageBase64?: string;
    mimeType?: string;
    source?: string;
    sourceChannel?: string;
  }): Promise<{
    success: boolean;
    document?: CamgoHazard;
    firestoreSynced?: boolean;
    error?: string;
  }> {
    const res = await fetch('/api/hazards/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, autoSyncFirestore: true }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || `Ingestion HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data?.document) {
      await this.upsertActiveHazard(data.document as CamgoHazard);
      return {
        success: true,
        document: data.document as CamgoHazard,
        firestoreSynced: Boolean(data.firestoreSynced),
      };
    }

    return { success: false, error: 'Invalid ingestion response' };
  }

  /**
   * Administrative Moderation: Subscribe to all hazards regardless of status (pending, active, cleared).
   */
  public subscribeAllHazards(onUpdate: (hazards: CamgoHazard[]) => void): () => void {
    let unsubFirestore: (() => void) | null = null;
    if (db) {
      try {
        const q = collection(db, CAMGO_HAZARDS_COLLECTION);
        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            const list: CamgoHazard[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            })) as CamgoHazard[];
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            onUpdate(list);
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, CAMGO_HAZARDS_COLLECTION);
          }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, CAMGO_HAZARDS_COLLECTION);
      }
    }
    return () => {
      if (unsubFirestore) unsubFirestore();
    };
  }

  /**
   * Administrative Moderation: Update status ('active' | 'cleared' | 'pending').
   */
  public async updateHazardStatus(
    hazardId: string,
    status: 'active' | 'cleared' | 'pending'
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    const updateData: Partial<CamgoHazard> = {
      status,
      active: status === 'active',
      updatedAt,
      ...(status === 'cleared' ? { clearedAt: updatedAt } : {}),
    };

    if (db) {
      try {
        await updateDoc(doc(db, CAMGO_HAZARDS_COLLECTION, hazardId), updateData);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${CAMGO_HAZARDS_COLLECTION}/${hazardId}`);
      }
    }

    // Update memory cache and local storage
    if (status === 'active') {
      const existing = this.memoryCache.find((h) => h.id === hazardId);
      if (existing) {
        const updated = { ...existing, ...updateData };
        const next = [updated, ...this.memoryCache.filter((h) => h.id !== hazardId)];
        this.memoryCache = next;
        writeLocalHazards(next);
      }
    } else {
      const next = this.memoryCache.filter((h) => h.id !== hazardId);
      this.memoryCache = next;
      writeLocalHazards(next);
    }
  }

  /**
   * Administrative & Live Notice Manual Sync: Trigger /api/cron/fetch-hazards
   * and merge any returned alerts into client Firestore/cache if server Admin key was absent.
   */
  public async syncLiveNewsAlerts(): Promise<{
    success: boolean;
    syncedCount: number;
    hazards: CamgoHazard[];
    error?: string;
  }> {
    const resp = await fetch('/api/cron/fetch-hazards', {
      method: 'GET',
      headers: {
        'X-CamGo-Manual-Sync': 'true',
      },
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.success === false) {
      throw new Error(data?.error || `Sync failed (HTTP ${resp.status})`);
    }

    const hazards: CamgoHazard[] = Array.isArray(data?.hazards)
      ? data.hazards.map((h: any) => normalizeHazardRecord(h, h.id))
      : [];

    if (!data?.firestoreAdminSynced && hazards.length > 0) {
      for (const h of hazards) {
        await this.upsertActiveHazard(h);
      }
    }

    return {
      success: true,
      syncedCount: typeof data?.syncedCount === 'number' ? data.syncedCount : hazards.length,
      hazards,
    };
  }

  /**
   * Administrative Moderation: Delete hazard document completely from Firestore (with cleared fallback).
   */
  public async deleteHazard(hazardId: string): Promise<void> {
    if (db) {
      const ref = doc(db, CAMGO_HAZARDS_COLLECTION, hazardId);
      try {
        await deleteDoc(ref);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${CAMGO_HAZARDS_COLLECTION}/${hazardId}`);
        try {
          await updateDoc(ref, {
            status: 'cleared',
            active: false,
            clearedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch {
          // ignore if document does not exist in Firestore
        }
      }
    }
    const next = this.memoryCache.filter((h) => h.id !== hazardId);
    this.memoryCache = next;
    writeLocalHazards(next);
  }
}

export const camgoHazardsService = new CamgoHazardsService();
