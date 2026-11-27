import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CamGoCorridor, CamGoHazard, CamgoHazard } from '../types';
import { camgoHazardsService, CAMGO_HAZARDS_COLLECTION } from './camgoHazardsService';

export type { CamGoHazard, CamGoCorridor };

export interface WebHazardSyncOptions {
  /** Bypass the global 30-minute Firestore cooldown (e.g. manual "Refresh Web Alerts" click) */
  force?: boolean;
}

export interface FetchLiveWebHazardsResult {
  syncedCount: number;
  resolvedCount: number;
  hazards: CamgoHazard[];
  firestoreSynced: boolean;
  sourceUsed:
    | 'gemini_search_grounding'
    | 'google_news_rss_fallback'
    | 'cooldown_cache'
    | 'firestore_cache';
  skippedDueToCooldown?: boolean;
  nextEligibleSyncAt?: number;
  warning?: string;
}

const GLOBAL_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes globally across users
const LOOKBACK_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours lookback
const SYNC_META_COLLECTION = 'settings';
const SYNC_META_DOC_ID = 'web_hazard_sync_meta';
const LOCAL_META_KEY = 'camgo_web_hazard_sync_meta_v1';

const DEBUNKED_KEYWORDS = [
  'video lama',
  'berita palsu',
  'tidak benar',
  'nafi',
  'menafikan',
  'fitnah',
  'tular lama',
  'old video',
  'fake news',
  'hoax',
  'debunked',
  'false claim',
  'recycled video',
];

interface LandmarkGeoRule {
  keywords: string[];
  corridor: CamGoCorridor;
  landmark: string;
  lat: number;
  lng: number;
}

const CORRIDOR_LANDMARK_RULES: LandmarkGeoRule[] = [
  {
    keywords: ['84.15', 'seksyen 84', 'sec 84', 'yayasan albarakah', 'albarakah'],
    corridor: 'FT185_GUA_MUSANG_LOJING',
    landmark: 'FT185 Seksyen 84.15 (Near Yayasan Albarakah)',
    lat: 4.6185,
    lng: 101.482,
  },
  {
    keywords: ['pos blau', 'blau'],
    corridor: 'FT185_GUA_MUSANG_LOJING',
    landmark: 'FT185 Pos Blau, Lojing',
    lat: 4.649,
    lng: 101.518,
  },
  {
    keywords: ['lojing', 'gua musang', 'lojeng'],
    corridor: 'FT185_GUA_MUSANG_LOJING',
    landmark: 'FT185 Lojing – Gua Musang Corridor',
    lat: 4.636,
    lng: 101.464,
  },
  {
    keywords: ['blue valley', 'kampung raja', 'kg raja'],
    corridor: 'FT185_SIMPANG_PULAI',
    landmark: 'FT185 Blue Valley / Kampung Raja',
    lat: 4.576,
    lng: 101.416,
  },
  {
    keywords: ['pos slim', 'pos terisu', 'simpang pulai', 'seksyen 27', 'seksyen 43', 'seksyen 44'],
    corridor: 'FT185_SIMPANG_PULAI',
    landmark: 'FT185 Simpang Pulai – Cameron Highlands',
    lat: 4.558,
    lng: 101.345,
  },
  {
    keywords: ['ringlet', 'habu', 'lata iskandar', 'tapah', 'ft59', 'ft059'],
    corridor: 'FT59_TAPAH',
    landmark: 'FT59 Tapah – Ringlet Road',
    lat: 4.365,
    lng: 101.332,
  },
  {
    keywords: ['sungai koyan', 'sg koyan', 'betau', 'pos betau', 'ft102', 'lembah bertam', 'bertam valley'],
    corridor: 'FT102_SUNGAI_KOYAN',
    landmark: 'FT102 Sungai Koyan – Ringlet Corridor',
    lat: 4.289,
    lng: 101.592,
  },
  {
    keywords: ['tanah rata', 'brinchang', 'kea farm', 'tringkap', 'kuala terla'],
    corridor: 'FT59_TAPAH',
    landmark: 'Cameron Highlands Interior Route',
    lat: 4.4825,
    lng: 101.3845,
  },
];

const CORRIDOR_DEFAULTS: Record<
  CamGoCorridor,
  { label: string; lat: number; lng: number; altEn: string; altMs: string }
> = {
  FT185_GUA_MUSANG_LOJING: {
    label: 'FT185 Gua Musang – Lojing – Cameron Highlands',
    lat: 4.6185,
    lng: 101.482,
    altEn: 'Use FT102 Sungai Koyan – Ringlet if heading from Kelantan / East Coast, or FT59 Tapah from the south.',
    altMs: 'Gunakan FT102 Sungai Koyan – Ringlet jika dari Kelantan / Pantai Timur, atau FT59 Tapah dari selatan.',
  },
  FT185_SIMPANG_PULAI: {
    label: 'FT185 Simpang Pulai – Cameron Highlands',
    lat: 4.558,
    lng: 101.345,
    altEn: 'Use FT59 Tapah – Ringlet from PLUS Highway (note narrow bends) or FT102 Sungai Koyan.',
    altMs: 'Gunakan laluan FT59 Tapah – Ringlet dari Lebuhraya PLUS atau FT102 Sungai Koyan.',
  },
  FT59_TAPAH: {
    label: 'FT59 Tapah – Ringlet – Cameron Highlands',
    lat: 4.365,
    lng: 101.332,
    altEn: 'Use FT185 Simpang Pulai – Cameron Highlands from PLUS Exit 137 for wider dual-lane access.',
    altMs: 'Gunakan laluan FT185 Simpang Pulai – Cameron Highlands dari Susur Keluar PLUS 137.',
  },
  FT102_SUNGAI_KOYAN: {
    label: 'FT102 Sungai Koyan – Ringlet',
    lat: 4.289,
    lng: 101.592,
    altEn: 'Use FT185 Lojing – Gua Musang or FT59 Tapah – Ringlet depending on your origin.',
    altMs: 'Gunakan laluan FT185 Lojing – Gua Musang atau FT59 Tapah – Ringlet mengikut arah perjalanan.',
  },
};

let inFlightSyncPromise: Promise<FetchLiveWebHazardsResult> | null = null;
let skipServerHazardApi = false;

export function isServerHazardApiSkipped(): boolean {
  return skipServerHazardApi;
}

export function markServerHazardApiSkipped(): void {
  skipServerHazardApi = true;
}

/**
 * Safely extracts a JSON array from Gemini output wrapped in ```json ... ``` fences or mixed prose.
 */
export function extractJsonArrayFromText(rawText: string): string {
  let cleaned = (rawText || '').trim();
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket === -1 || lastBracket <= firstBracket) {
    return '[]';
  }
  return cleaned.slice(firstBracket, lastBracket + 1);
}

function clampCoord(val: unknown, min: number, max: number, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Number(num.toFixed(6))));
}

function sanitizeHttpUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return '';
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // ignore malformed URL
  }
  return '';
}

function normalizeCorridor(rawCorridor: unknown, combinedText: string): CamGoCorridor {
  const raw = String(rawCorridor || '').toUpperCase().trim();
  if (raw === 'FT185_SIMPANG_PULAI') return 'FT185_SIMPANG_PULAI';
  if (raw === 'FT185_GUA_MUSANG_LOJING' || raw === 'FT185_LOJING') return 'FT185_GUA_MUSANG_LOJING';
  if (raw === 'FT59_TAPAH' || raw === 'INTERIOR') return 'FT59_TAPAH';
  if (raw === 'FT102_SUNGAI_KOYAN' || raw === 'FT102_SG_KOYAN') return 'FT102_SUNGAI_KOYAN';

  const lower = combinedText.toLowerCase();
  if (lower.includes('lojing') || lower.includes('gua musang') || lower.includes('pos blau') || lower.includes('albarakah') || lower.includes('seksyen 84')) {
    return 'FT185_GUA_MUSANG_LOJING';
  }
  if (lower.includes('simpang pulai') || lower.includes('pos slim') || lower.includes('blue valley') || lower.includes('kampung raja')) {
    return 'FT185_SIMPANG_PULAI';
  }
  if (lower.includes('sungai koyan') || lower.includes('sg koyan') || lower.includes('ft102') || lower.includes('betau')) {
    return 'FT102_SUNGAI_KOYAN';
  }
  if (lower.includes('tapah') || lower.includes('ft59') || lower.includes('ft059') || lower.includes('ringlet')) {
    return 'FT59_TAPAH';
  }
  return 'FT185_SIMPANG_PULAI';
}

function normalizeHazardType(rawType: unknown, combinedText: string): CamGoHazard['type'] {
  const raw = String(rawType || '').toLowerCase().trim();
  if (raw === 'landslide') return 'landslide';
  if (raw === 'accident') return 'accident';
  if (raw === 'road_closure' || raw === 'closure' || raw === 'roadblock') return 'road_closure';
  if (raw === 'flood_or_fallen_tree' || raw === 'flood' || raw === 'fallen_tree' || raw === 'weather') {
    return 'flood_or_fallen_tree';
  }

  const lower = combinedText.toLowerCase();
  if (lower.includes('tanah runtuh') || lower.includes('landslide') || lower.includes('cerun runtuh') || lower.includes('mendap')) {
    return 'landslide';
  }
  if (lower.includes('kemalangan') || lower.includes('nahas') || lower.includes('accident') || lower.includes('crash') || lower.includes('terbabas')) {
    return 'accident';
  }
  if (lower.includes('pokok tumbang') || lower.includes('fallen tree') || lower.includes('banjir') || lower.includes('flood')) {
    return 'flood_or_fallen_tree';
  }
  return 'road_closure';
}

function normalizeSeverity(rawSev: unknown, type: CamGoHazard['type'], passableStatus: string): CamGoHazard['severity'] {
  const raw = String(rawSev || '').toLowerCase().trim();
  if (raw === 'critical' || raw === 'high') return 'critical';
  if (raw === 'moderate' || raw === 'medium') return 'moderate';
  if (raw === 'advisory' || raw === 'low') return 'advisory';

  const statusLower = passableStatus.toLowerCase();
  if (statusLower.includes('full_closure') || statusLower.includes('closed to all') || statusLower.includes('ditutup penuh') || type === 'landslide') {
    return 'critical';
  }
  if (statusLower.includes('contraflow') || statusLower.includes('diversion') || statusLower.includes('1 lane') || type === 'accident' || type === 'road_closure') {
    return 'moderate';
  }
  return 'advisory';
}

function extractSectionToken(text: string): string | null {
  const secMatch = text.match(/(?:seksyen|sec\.?|km)\s*(\d+(?:\.\d+)?)/i);
  if (!secMatch) return null;
  const num = secMatch[1].replace(/\./g, '-');
  const isKm = /^km/i.test(secMatch[0]);
  return `${isKm ? 'km' : 'sec'}${num}`;
}

function buildDeterministicSlug(
  corridor: CamGoCorridor,
  type: CamGoHazard['type'],
  landmark: string,
  title: string
): string {
  const corridorSlug =
    corridor === 'FT185_GUA_MUSANG_LOJING' || corridor === 'FT185_SIMPANG_PULAI'
      ? 'ft185'
      : corridor === 'FT59_TAPAH'
      ? 'ft59'
      : 'ft102';

  const sectionToken = extractSectionToken(`${landmark} ${title}`);
  if (sectionToken) {
    return `${corridorSlug}-${sectionToken}-${type.replace(/_/g, '-')}`;
  }

  const slugWords = (landmark || title)
    .toLowerCase()
    .replace(/\b(ft185|ft59|ft102|cameron|highlands|jalan|road)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(Boolean)
    .slice(0, 4)
    .join('-');

  if (slugWords) {
    return `${corridorSlug}-${slugWords}-${type.replace(/_/g, '-')}`;
  }

  // Deterministic FNV-1a hash fallback
  const basis = `${corridor}_${type}_${title.toLowerCase().trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < basis.length; i++) {
    hash ^= basis.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${corridorSlug}-${(hash >>> 0).toString(36)}-${type.replace(/_/g, '-')}`;
}

function computeExpiresAtUnix(type: CamGoHazard['type'], nowMs: number): number {
  if (type === 'accident') {
    return nowMs + 12 * 60 * 60 * 1000; // 12 hours
  }
  if (type === 'landslide' || type === 'road_closure') {
    return nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days
  }
  return nowMs + 48 * 60 * 60 * 1000; // 48 hours for flood_or_fallen_tree
}

function formatPassableStatus(rawStatus: unknown, combinedText: string): string {
  const raw = String(rawStatus || '').trim();
  const lower = `${raw} ${combinedText}`.toLowerCase();

  if (raw === 'full_closure' || lower.includes('ditutup sepenuhnya') || lower.includes('closed to all')) {
    return 'Closed to all vehicles / Ditutup kepada semua kenderaan';
  }
  if (raw === 'single_lane_contraflow' || lower.includes('satu lorong') || lower.includes('contraflow') || lower.includes('1 lane')) {
    return '1 lane open / contraflow active';
  }
  if (raw === 'diversion_active' || lower.includes('lencongan') || lower.includes('diversion')) {
    return '1 lane open / diversion active';
  }
  if (raw === 'minor_delay') {
    return 'Passable with minor delay / Boleh dilalui dengan kelewatan ringan';
  }
  return raw || 'Check JKR / police traffic control on site';
}

function inferGeoFromText(text: string, fallbackCorridor?: CamGoCorridor): {
  corridor: CamGoCorridor;
  landmark: string;
  lat: number;
  lng: number;
} {
  const lower = text.toLowerCase();
  for (const rule of CORRIDOR_LANDMARK_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return {
        corridor: rule.corridor,
        landmark: rule.landmark,
        lat: rule.lat,
        lng: rule.lng,
      };
    }
  }
  const corridor = fallbackCorridor || normalizeCorridor(undefined, text);
  const def = CORRIDOR_DEFAULTS[corridor];
  return {
    corridor,
    landmark: def.label,
    lat: def.lat,
    lng: def.lng,
  };
}

function containsDebunkedSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return DEBUNKED_KEYWORDS.some((kw) => lower.includes(kw));
}

function parseHazardExpiryMs(expiresAt: unknown): number | null {
  if (typeof expiresAt === 'number' && Number.isFinite(expiresAt)) {
    return expiresAt < 1e12 ? expiresAt * 1000 : expiresAt;
  }
  if (typeof expiresAt === 'string' && expiresAt.trim()) {
    const asNum = Number(expiresAt);
    if (Number.isFinite(asNum)) {
      return asNum < 1e12 ? asNum * 1000 : asNum;
    }
    const parsed = Date.parse(expiresAt);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isDocActiveAndNonExpired(data: Record<string, any> | undefined, nowMs: number): boolean {
  if (!data) return false;
  if (data.status === 'cleared' || data.active === false) return false;
  if (data.status !== 'active' && data.active !== true) return false;
  if (data.expiresAt !== undefined && data.expiresAt !== null) {
    const expMs = parseHazardExpiryMs(data.expiresAt);
    if (expMs !== null && expMs <= nowMs) return false;
  }
  return true;
}

async function hasAnyActiveNonExpiredHazards(): Promise<boolean> {
  const nowMs = Date.now();
  if (db) {
    try {
      const [activeSnap, statusSnap] = await Promise.all([
        getDocs(query(collection(db, CAMGO_HAZARDS_COLLECTION), where('active', '==', true))).catch(() => null),
        getDocs(query(collection(db, CAMGO_HAZARDS_COLLECTION), where('status', '==', 'active'))).catch(() => null),
      ]);

      const docs = [
        ...(activeSnap?.docs || []),
        ...(statusSnap?.docs || []),
      ];

      if (activeSnap !== null || statusSnap !== null) {
        return docs.some((d) => isDocActiveAndNonExpired(d.data(), nowMs));
      }
    } catch {
      // fallback to local active cache below
    }
  }

  return camgoHazardsService.getCachedActiveHazards().length > 0;
}

async function checkGlobalCooldown(): Promise<{
  inCooldown: boolean;
  lastSyncedAt: number;
  nextEligibleSyncAt: number;
}> {
  const now = Date.now();

  if (typeof window !== 'undefined') {
    try {
      const localRaw = localStorage.getItem(LOCAL_META_KEY);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        const ts = Number(parsed?.lastSyncedAt || 0);
        if (ts > 0 && now - ts < GLOBAL_COOLDOWN_MS) {
          return {
            inCooldown: true,
            lastSyncedAt: ts,
            nextEligibleSyncAt: ts + GLOBAL_COOLDOWN_MS,
          };
        }
      }
    } catch {
      // ignore local cache read errors
    }
  }

  if (db) {
    try {
      const snap = await getDoc(doc(db, SYNC_META_COLLECTION, SYNC_META_DOC_ID));
      if (snap.exists()) {
        const data = snap.data();
        const ts = Number(data?.lastSyncedAt || 0);
        if (ts > 0) {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(LOCAL_META_KEY, JSON.stringify({ lastSyncedAt: ts }));
            } catch {
              // ignore
            }
          }
          if (now - ts < GLOBAL_COOLDOWN_MS) {
            return {
              inCooldown: true,
              lastSyncedAt: ts,
              nextEligibleSyncAt: ts + GLOBAL_COOLDOWN_MS,
            };
          }
        }
      }
    } catch {
      // ignore read errors on cooldown metadata
    }
  }

  return { inCooldown: false, lastSyncedAt: 0, nextEligibleSyncAt: now };
}

async function recordGlobalCooldownStamp(
  sourceUsed: 'gemini_search_grounding' | 'google_news_rss_fallback',
  syncedCount: number
): Promise<void> {
  const now = Date.now();
  const payload = {
    lastSyncedAt: now,
    lastSyncedIso: new Date(now).toISOString(),
    sourceUsed,
    syncedCount,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_META_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  if (db) {
    try {
      await setDoc(doc(db, SYNC_META_COLLECTION, SYNC_META_DOC_ID), payload, { merge: true });
    } catch {
      // ignore metadata write errors
    }
  }
}

interface RawGeminiHazardItem {
  id?: string;
  corridor?: string;
  type?: string;
  severity?: string;
  status?: string;
  titleEn?: string;
  titleMs?: string;
  title?: string;
  summaryEn?: string;
  summaryMs?: string;
  summary?: string;
  landmark?: string;
  section?: string;
  laneStatus?: string;
  passableStatus?: string;
  alternativeRoute?: string;
  lat?: number;
  lng?: number;
  sourceName?: string;
  source?: string;
  sourceUrl?: string;
  reportedAt?: string;
  extractionMethod?: string;
}

async function safeFetchJson<T = any>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; reason: string }> {
  try {
    const res = await fetch(url, init);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!res.ok) {
      if (res.status === 404) {
        skipServerHazardApi = true;
      }
      return {
        ok: false,
        status: res.status,
        reason: `HTTP ${res.status}`,
      };
    }
    if (!contentType.includes('application/json')) {
      skipServerHazardApi = true;
      return {
        ok: false,
        status: res.status,
        reason: `Non-JSON response (${contentType || 'unknown'})`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      reason: err?.message || 'Network unavailable',
    };
  }
}

async function fetchUnifiedServerHazardFeed(): Promise<{
  items: RawGeminiHazardItem[];
  resolvedSlugs: string[];
  sourceUsed: 'gemini_search_grounding' | 'google_news_rss_fallback';
  available: boolean;
  reason?: string;
}> {
  if (skipServerHazardApi) {
    return {
      items: [],
      resolvedSlugs: [],
      sourceUsed: 'google_news_rss_fallback',
      available: false,
      reason: 'Server hazard API skipped (circuit breaker open)',
    };
  }

  const result = await safeFetchJson<any>('/api/hazards?type=feed', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!result.ok) {
    return {
      items: [],
      resolvedSlugs: [],
      sourceUsed: 'google_news_rss_fallback',
      available: false,
      reason: result.reason,
    };
  }

  const responseData = result.data;
  const firstGroundingUrl = sanitizeHttpUrl(responseData?.firstGroundingUrl);

  let arrayItems: RawGeminiHazardItem[] = [];
  if (Array.isArray(responseData?.hazards)) {
    arrayItems = responseData.hazards;
  } else if (Array.isArray(responseData?.items)) {
    arrayItems = responseData.items;
  } else if (typeof responseData?.rawText === 'string' && responseData.rawText.trim()) {
    const jsonArrayStr = extractJsonArrayFromText(responseData.rawText);
    try {
      const parsed = JSON.parse(jsonArrayStr);
      if (Array.isArray(parsed)) arrayItems = parsed;
    } catch {
      arrayItems = [];
    }
  }

  const activeItems: RawGeminiHazardItem[] = [];
  const resolvedSlugs: string[] = Array.isArray(responseData?.resolvedSlugs)
    ? responseData.resolvedSlugs.filter((s: unknown): s is string => typeof s === 'string')
    : [];

  for (const item of arrayItems) {
    if (!item) continue;
    const textBlob = `${item.titleEn || ''} ${item.titleMs || ''} ${item.title || ''} ${item.summaryEn || ''} ${item.summaryMs || ''} ${item.summary || ''}`;
    const isResolved =
      String(item.status || '').toLowerCase() === 'resolved' || containsDebunkedSignal(textBlob);

    if (isResolved) {
      if (item.id && typeof item.id === 'string') {
        resolvedSlugs.push(item.id.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
      }
      continue;
    }

    activeItems.push({
      ...item,
      sourceUrl: sanitizeHttpUrl(item.sourceUrl) || firstGroundingUrl,
    });
  }

  const serverSource =
    responseData?.sourceUsed === 'google_news_rss_fallback'
      ? 'google_news_rss_fallback'
      : 'gemini_search_grounding';

  return {
    items: activeItems,
    resolvedSlugs,
    sourceUsed: serverSource,
    available: true,
  };
}

async function readExistingFirestoreCachedHazards(): Promise<CamgoHazard[]> {
  const nowMs = Date.now();
  const cachedMap = new Map<string, CamgoHazard>();

  for (const item of camgoHazardsService.getCachedActiveHazards()) {
    cachedMap.set(item.id, item);
  }

  if (db) {
    try {
      const [activeSnap, statusSnap] = await Promise.all([
        getDocs(query(collection(db, CAMGO_HAZARDS_COLLECTION), where('active', '==', true))).catch(() => null),
        getDocs(query(collection(db, CAMGO_HAZARDS_COLLECTION), where('status', '==', 'active'))).catch(() => null),
      ]);

      for (const docSnap of [...(activeSnap?.docs || []), ...(statusSnap?.docs || [])]) {
        const data = docSnap.data();
        if (isDocActiveAndNonExpired(data, nowMs)) {
          cachedMap.set(docSnap.id, { ...(data as CamgoHazard), id: docSnap.id });
        }
      }
    } catch {
      // silent fallback to local active cache
    }
  }

  return Array.from(cachedMap.values());
}

function toCamgoHazardRecord(
  raw: RawGeminiHazardItem,
  nowMs: number,
  sourceUsed: 'gemini_search_grounding' | 'google_news_rss_fallback'
): (CamgoHazard & CamGoHazard) | null {
  const titleEn = String(raw.titleEn || raw.title || raw.titleMs || '').trim().slice(0, 180);
  const titleMs = String(raw.titleMs || raw.title || raw.titleEn || '').trim().slice(0, 180);
  if (!titleEn && !titleMs) return null;

  const combinedText = `${titleEn} ${titleMs} ${raw.summaryEn || ''} ${raw.summaryMs || ''} ${raw.landmark || ''} ${raw.section || ''}`;
  const inferredGeo = inferGeoFromText(combinedText);
  const corridor = normalizeCorridor(raw.corridor, combinedText) || inferredGeo.corridor;
  const corridorDef = CORRIDOR_DEFAULTS[corridor];
  const type = normalizeHazardType(raw.type, combinedText);
  const landmark =
    String(raw.landmark || raw.section || inferredGeo.landmark || corridorDef.label).trim().slice(0, 140);
  const passableStatus = formatPassableStatus(raw.laneStatus || raw.passableStatus, combinedText);
  const severity = normalizeSeverity(raw.severity, type, passableStatus);

  const summaryEn = String(
    raw.summaryEn || raw.summary || `${titleEn} (${passableStatus})`
  )
    .trim()
    .slice(0, 600);
  const summaryMs = String(
    raw.summaryMs || raw.summary || `${titleMs} (${passableStatus})`
  )
    .trim()
    .slice(0, 600);

  const alternativeRoute = String(raw.alternativeRoute || corridorDef.altEn).trim().slice(0, 260);
  const sourceName = String(raw.sourceName || raw.source || 'JKR / Malaysian News').trim().slice(0, 100);
  const sourceUrl = sanitizeHttpUrl(raw.sourceUrl);

  const lat = clampCoord(raw.lat, 4.05, 4.95, inferredGeo.lat || corridorDef.lat);
  const lng = clampCoord(raw.lng, 101.05, 101.95, inferredGeo.lng || corridorDef.lng);

  const rawReportedMs = raw.reportedAt ? new Date(raw.reportedAt).getTime() : nowMs;
  const reportedAt = Number.isFinite(rawReportedMs)
    ? new Date(rawReportedMs).toISOString()
    : new Date(nowMs).toISOString();
  const expiresAt = computeExpiresAtUnix(type, nowMs);

  const slug =
    raw.id && /^[a-z0-9-]{6,70}$/i.test(raw.id.trim())
      ? raw.id.trim().toLowerCase()
      : buildDeterministicSlug(corridor, type, landmark, titleEn || titleMs);

  const nowIso = new Date(nowMs).toISOString();

  return {
    id: slug,
    corridor,
    type,
    severity,
    titleEn: titleEn || titleMs,
    titleMs: titleMs || titleEn,
    summaryEn,
    summaryMs,
    landmark,
    passableStatus,
    alternativeRoute,
    lat,
    lng,
    sourceName,
    sourceUrl,
    reportedAt,
    expiresAt,

    // Existing CamgoHazard UI & Firestore rule compatibility fields
    title: titleEn || titleMs,
    titleBm: titleMs || titleEn,
    summary: summaryEn,
    description: `${summaryEn}${passableStatus ? ` | Status: ${passableStatus}` : ''}`,
    descriptionBm: `${summaryMs}${passableStatus ? ` | Status: ${passableStatus}` : ''}`,
    location: landmark,
    source: sourceName,
    verifiedBy: 'web_search',
    extractionMethod:
      raw.extractionMethod === 'google_news_rss_fallback'
        ? 'google_news_rss_fallback'
        : sourceUsed === 'gemini_search_grounding'
        ? 'web_search_grounding'
        : 'google_news_rss_fallback',
    active: true,
    status: 'active',
    stillThereVotes: 0,
    clearedVotes: 0,
    timestamp: reportedAt,
    updatedAt: nowIso,
  };
}

async function runLiveHazardSync(options: WebHazardSyncOptions = {}): Promise<FetchLiveWebHazardsResult> {
  if (!options.force) {
    const cooldown = await checkGlobalCooldown();
    if (cooldown.inCooldown) {
      const hasActiveHazards = await hasAnyActiveNonExpiredHazards();
      if (hasActiveHazards) {
        const cachedWeb = camgoHazardsService
          .getCachedActiveHazards()
          .filter((h) => h.verifiedBy === 'web_search');
        return {
          syncedCount: 0,
          resolvedCount: 0,
          hazards: cachedWeb,
          firestoreSynced: false,
          sourceUsed: 'cooldown_cache',
          skippedDueToCooldown: true,
          nextEligibleSyncAt: cooldown.nextEligibleSyncAt,
        };
      }
    }
  }

  // Single unified request to GET /api/hazards?type=feed (protected by skipServerHazardApi circuit breaker)
  const feedResult = await fetchUnifiedServerHazardFeed();
  if (!feedResult.available) {
    const cachedHazards = await readExistingFirestoreCachedHazards();
    return {
      syncedCount: cachedHazards.length,
      resolvedCount: 0,
      hazards: cachedHazards,
      firestoreSynced: Boolean(db),
      sourceUsed: 'firestore_cache',
      skippedDueToCooldown: false,
      nextEligibleSyncAt: Date.now() + GLOBAL_COOLDOWN_MS,
      warning: feedResult.reason,
    };
  }

  const sourceUsed = feedResult.sourceUsed;
  const rawItems = feedResult.items;
  const resolvedSlugs = feedResult.resolvedSlugs;
  let fallbackWarning: string | undefined;

  const nowMs = Date.now();
  const dedupMap = new Map<string, CamgoHazard & CamGoHazard>();

  for (const item of rawItems) {
    const mapped = toCamgoHazardRecord(item, nowMs, sourceUsed);
    if (!mapped) continue;
    dedupMap.set(mapped.id, mapped);
  }

  // Mark any explicitly debunked/resolved deterministic slugs as cleared in Firestore
  let resolvedCount = 0;
  if (db && resolvedSlugs.length > 0) {
    for (const slug of resolvedSlugs) {
      try {
        const ref = doc(db, CAMGO_HAZARDS_COLLECTION, slug);
        const existingSnap = await getDoc(ref).catch(() => null);
        if (existingSnap?.exists()) {
          await updateDoc(ref, {
            status: 'cleared',
            active: false,
            clearedAt: new Date(nowMs).toISOString(),
            updatedAt: new Date(nowMs).toISOString(),
          });
          resolvedCount++;
        }
      } catch {
        // ignore if doc does not exist or permission denied
      }
    }
  }

  const hazardsToSync = Array.from(dedupMap.values());
  let firestoreWriteSucceeded = false;

  for (const hazard of hazardsToSync) {
    if (db) {
      try {
        const ref = doc(db, CAMGO_HAZARDS_COLLECTION, hazard.id);
        const existingSnap = await getDoc(ref).catch(() => null);
        const existingData = existingSnap?.exists() ? existingSnap.data() : undefined;

        const mergedDoc = {
          ...hazard,
          stillThereVotes:
            typeof existingData?.stillThereVotes === 'number' ? existingData.stillThereVotes : 0,
          clearedVotes:
            typeof existingData?.clearedVotes === 'number' ? existingData.clearedVotes : 0,
          timestamp: typeof existingData?.timestamp === 'string' ? existingData.timestamp : hazard.reportedAt,
        };

        await setDoc(ref, mergedDoc, { merge: true });
        firestoreWriteSucceeded = true;
      } catch (err) {
        console.warn('[webHazardFetcher] Firestore merge failed, updating local cache:', err);
      }
    }
    await camgoHazardsService.upsertActiveHazard(hazard);
  }

  await recordGlobalCooldownStamp(sourceUsed, hazardsToSync.length);

  return {
    syncedCount: hazardsToSync.length,
    resolvedCount,
    hazards: hazardsToSync,
    firestoreSynced: firestoreWriteSucceeded,
    sourceUsed,
    skippedDueToCooldown: false,
    nextEligibleSyncAt: nowMs + GLOBAL_COOLDOWN_MS,
    warning: fallbackWarning,
  };
}

export async function fetchLiveWebHazards(
  options: WebHazardSyncOptions = {}
): Promise<FetchLiveWebHazardsResult> {
  if (inFlightSyncPromise) {
    return inFlightSyncPromise;
  }

  inFlightSyncPromise = runLiveHazardSync(options).finally(() => {
    inFlightSyncPromise = null;
  });

  return inFlightSyncPromise;
}
