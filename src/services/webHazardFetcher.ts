import { GoogleGenAI } from '@google/genai';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CamgoHazard } from '../types';
import { camgoHazardsService, CAMGO_HAZARDS_COLLECTION } from './camgoHazardsService';

export interface WebHazardItem {
  title: string;
  summary: string;
  type: 'landslide' | 'accident' | 'closure' | 'weather';
  severity: 'high' | 'medium' | 'low';
  lat: number;
  lng: number;
  source: string;
}

export interface FetchLiveWebHazardsResult {
  syncedCount: number;
  hazards: CamgoHazard[];
  firestoreSynced: boolean;
}

function stripJsonCodeFences(rawText: string): string {
  let cleaned = (rawText || '').trim();
  // Strip ```json ... ``` or ``` ... ``` markdown fences
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // If explanatory text surrounds a JSON array, isolate the outermost JSON array
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.slice(firstBracket, lastBracket + 1);
  }
  return cleaned;
}

function normalizeDeterministicId(title: string, type: string): string {
  const normalized = `${title.toLowerCase().trim()}_${type.toLowerCase().trim()}`
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  // Keep ID deterministic, compact, and Firestore-safe
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const suffix = (hash >>> 0).toString(36);
  const prefix = normalized.slice(0, 48) || 'alert';
  return `web_${prefix}_${suffix}`;
}

function clampCoord(val: unknown, min: number, max: number, fallback: number): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Number(num.toFixed(6))));
}

export async function fetchLiveWebHazards(): Promise<FetchLiveWebHazardsResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error(
      'Missing VITE_GEMINI_API_KEY in environment variables. Add VITE_GEMINI_API_KEY in Vercel Project Settings to enable Refresh Web Alerts.'
    );
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  const prompt = `Search live Malaysian news and JKR (Jabatan Kerja Raya) updates from the last 48 hours for active road hazards, landslides (tanah runtuh), lane/road closures (jalan ditutup), floods, or major accidents affecting Cameron Highlands and its access routes:
- FT185 Simpang Pulai – Cameron Highlands
- FT185 Lojing – Gua Musang
- FT59 Tapah – Ringlet
- FT102 Sungai Koyan – Ringlet
- Cameron Highlands interior (Tanah Rata, Brinchang, Kea Farm, Tringkap, Kampung Raja)

Return ONLY a clean JSON array (no markdown fences, no commentary, no extra text) where each item has exactly:
{
  "title": "Short clear headline of the hazard",
  "summary": "Concise 1-2 sentence summary with road/kilometer details and status",
  "type": "landslide" | "accident" | "closure" | "weather",
  "severity": "high" | "medium" | "low",
  "lat": 4.4825,
  "lng": 101.3845,
  "source": "Publisher or agency name (e.g. JKR, Bernama, Astro Awani, Harian Metro)"
}

If no verified active hazards are found in the last 48 hours, return [].`;

  const candidateModels = ['gemini-2.5-flash', 'gemini-4-hydrogen', 'gemini-3.8-flash'];
  let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
  let lastError: unknown = null;

  for (const modelName of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      break;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('404') && !msg.includes('NOT_FOUND') && !msg.includes('no longer available')) {
        throw err;
      }
    }
  }

  if (!response) {
    throw lastError instanceof Error
      ? lastError
      : new Error('Unable to fetch live web hazards via Gemini Search Grounding.');
  }

  const cleanedJsonText = stripJsonCodeFences(response.text || '[]');
  let parsedItems: WebHazardItem[] = [];
  try {
    const parsed = JSON.parse(cleanedJsonText);
    parsedItems = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    throw new Error(
      `Failed to parse Gemini web search response as JSON: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAtIso = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const dedupMap = new Map<string, CamgoHazard>();

  for (const rawItem of parsedItems) {
    if (!rawItem || typeof rawItem.title !== 'string' || !rawItem.title.trim()) continue;

    const title = rawItem.title.trim().slice(0, 180);
    const type: WebHazardItem['type'] =
      rawItem.type === 'landslide' ||
      rawItem.type === 'accident' ||
      rawItem.type === 'closure' ||
      rawItem.type === 'weather'
        ? rawItem.type
        : 'closure';

    const severity: WebHazardItem['severity'] =
      rawItem.severity === 'high' || rawItem.severity === 'medium' || rawItem.severity === 'low'
        ? rawItem.severity
        : 'medium';

    const summary = String(rawItem.summary || title).trim().slice(0, 600);
    const source = String(rawItem.source || 'Google Search Grounding').trim().slice(0, 100);
    const lat = clampCoord(rawItem.lat, 4.05, 4.95, 4.4825);
    const lng = clampCoord(rawItem.lng, 101.05, 101.95, 101.3845);
    const docId = normalizeDeterministicId(title, type);

    dedupMap.set(docId, {
      id: docId,
      title,
      summary,
      description: summary,
      type,
      severity,
      location: 'Cameron Highlands Corridor',
      lat,
      lng,
      source,
      verifiedBy: 'web_search',
      extractionMethod: 'web_search_grounding',
      active: true,
      status: 'active',
      stillThereVotes: 0,
      clearedVotes: 0,
      timestamp: nowIso,
      updatedAt: nowIso,
      expiresAt: expiresAtIso,
    });
  }

  const hazardsToSync = Array.from(dedupMap.values());
  let firestoreWriteSucceeded = false;

  for (const hazard of hazardsToSync) {
    if (db) {
      try {
        const ref = doc(db, CAMGO_HAZARDS_COLLECTION, hazard.id);
        const existingSnap = await getDoc(ref).catch(() => null);
        const existingData = existingSnap?.exists() ? existingSnap.data() : undefined;

        const mergedDoc: CamgoHazard = {
          ...hazard,
          stillThereVotes:
            typeof existingData?.stillThereVotes === 'number' ? existingData.stillThereVotes : 0,
          clearedVotes:
            typeof existingData?.clearedVotes === 'number' ? existingData.clearedVotes : 0,
          timestamp: typeof existingData?.timestamp === 'string' ? existingData.timestamp : nowIso,
        };

        await setDoc(ref, mergedDoc, { merge: true });
        firestoreWriteSucceeded = true;
      } catch (err) {
        console.warn('[webHazardFetcher] Firestore merge failed, updating local cache:', err);
      }
    }
    await camgoHazardsService.upsertActiveHazard(hazard);
  }

  return {
    syncedCount: hazardsToSync.length,
    hazards: hazardsToSync,
    firestoreSynced: firestoreWriteSucceeded,
  };
}
