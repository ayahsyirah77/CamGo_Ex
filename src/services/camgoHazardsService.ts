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

function readLocalHazards(): CamgoHazard[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HAZARDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((h) => h && h.status === 'active') : [];
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
    if (this.memoryCache.length > 0) {
      return this.memoryCache.filter((h) => h.status === 'active');
    }
    return readLocalHazards();
  }

  public subscribeActiveHazards(onUpdate: (hazards: CamgoHazard[]) => void): () => void {
    const initial = this.getCachedActiveHazards();
    onUpdate(initial);

    let unsubFirestore: (() => void) | null = null;
    if (db) {
      try {
        const q = query(
          collection(db, CAMGO_HAZARDS_COLLECTION),
          where('status', '==', 'active')
        );
        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            const remoteHazards: CamgoHazard[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            })) as CamgoHazard[];

            const localPending = readLocalHazards().filter(
              (l) =>
                l.status === 'active' &&
                l.id.startsWith('local-') &&
                !remoteHazards.some((r) => r.id === l.id)
            );
            const merged = [...remoteHazards, ...localPending].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            this.memoryCache = merged;
            writeLocalHazards(merged);
            onUpdate(merged);
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
        const activeOnly = custom.detail.filter((h) => h.status === 'active');
        this.memoryCache = activeOnly;
        onUpdate(activeOnly);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('camgo-hazards-updated', handleLocalEvent);
    }

    return () => {
      if (unsubFirestore) unsubFirestore();
      if (typeof window !== 'undefined') {
        window.removeEventListener('camgo-hazards-updated', handleLocalEvent);
      }
    };
  }

  public async upsertActiveHazard(hazard: CamgoHazard): Promise<CamgoHazard> {
    const normalized: CamgoHazard = {
      ...hazard,
      status: hazard.status || 'active',
      stillThereVotes: typeof hazard.stillThereVotes === 'number' ? hazard.stillThereVotes : 0,
      clearedVotes: typeof hazard.clearedVotes === 'number' ? hazard.clearedVotes : 0,
      updatedAt: new Date().toISOString(),
    };

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
    const updated = applyHazardConsensusVote(hazard, vote, CLEARED_VOTE_EXPIRY_THRESHOLD);
    const expired = updated.status === 'cleared';
    recordUserVote(hazard.id, vote);

    const current = this.getCachedActiveHazards();
    const nextLocal = expired
      ? current.filter((h) => h.id !== hazard.id)
      : [updated, ...current.filter((h) => h.id !== hazard.id)];
    this.memoryCache = nextLocal;
    writeLocalHazards(nextLocal);

    if (db) {
      const ref = doc(db, CAMGO_HAZARDS_COLLECTION, hazard.id);
      try {
        if (vote === 'still_there') {
          await updateDoc(ref, {
            stillThereVotes: increment(1),
            status: 'active',
            updatedAt: updated.updatedAt,
          });
        } else if (expired) {
          await updateDoc(ref, {
            clearedVotes: updated.clearedVotes,
            status: 'cleared',
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
