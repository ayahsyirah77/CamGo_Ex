export type TranslationCategory =
  | 'Menu / Food Stall'
  | 'Road / Traffic Sign'
  | 'Trail / Park Notice'
  | 'Shop / General Sign';

export interface TranslationItem {
  originalText: string;
  englishTranslation: string;
  priceOrDetail?: string;
  dietaryOrSafetyTag?: string;
  localNote?: string;
}

export interface VisualTranslationResult {
  hasReadableText: boolean;
  detectedCategory: TranslationCategory;
  detectedLanguages: string[];
  overallSummaryEn: string;
  urgentWarning?: string;
  items: TranslationItem[];
}

export interface VisualTranslatorScanResponse {
  result: VisualTranslationResult;
  previewDataUrl: string;
  payloadBytesApprox: number;
  remainingScansToday: number;
  dailyLimit: number;
}

export const DAILY_TRANSLATOR_SCAN_LIMIT = 15;
const SCAN_QUOTA_STORAGE_KEY = 'camgo_visual_translator_quota_v1';
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_PROMPT = `You are a bilingual Malaysian local guide and translator in Cameron Highlands, Pahang, Malaysia.
Your job is to inspect photos taken by international tourists and translate menus, market labels, road signboards, and trail/park notices into clear, natural English.

Instructions:
1. Detect what the image shows and classify it strictly into one of:
   - "Menu / Food Stall" (restaurant menus, warung boards, kopitiam drinks, pasar malam / night market food labels)
   - "Road / Traffic Sign" (JKR road closure notices, detour/lencongan signs, parking restrictions, landslide warnings, speed/slope advisories)
   - "Trail / Park Notice" (Forestry Department / Jabatan Perhutanan HSK notices, permit rules, mossy forest / trailhead warnings, Malim Gunung rules)
   - "Shop / General Sign" (farm shop labels, ticket counters, toilet/surau/opening hours signs, general notices)
2. Read ALL visible Bahasa Melayu, Chinese (Mandarin/Cantonese characters), or Tamil text accurately.
3. Translate each item or sign line into natural, tourist-friendly English.
4. For food/drinks, include exact RM prices in priceOrDetail if visible, add helpful dietaryOrSafetyTag (e.g. "Halal", "Non-Halal / Pork", "Vegetarian", "Spicy", "Contains Nuts/Seafood", "Dairy/Milk") and short localNote explaining Malaysian dishes (e.g. "Pulled sweet milk tea", "Charcoal-grilled spiced chicken", "Served with spicy sambal").
5. For road or trail signs, include times/dates/routes in priceOrDetail (e.g. "Closed 8am–5pm", "Permit Required"), set dietaryOrSafetyTag (e.g. "Road Closed", "No Parking", "Permit Required", "Landslide Risk", "Fine / Penalty"), and add practical localNote (e.g. "Use FT102 Sungai Koyan detour", "Check Pahang Forestry permit counter").
6. Set urgentWarning if there is any road closure, detour, fine/compound warning, trail ban, severe allergen, or non-halal/pork warning. Otherwise leave urgentWarning empty.
7. If the image is too blurry, dark, or contains no readable text, set hasReadableText to false and leave items as an empty array.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    hasReadableText: { type: 'BOOLEAN' },
    detectedCategory: {
      type: 'STRING',
      enum: [
        'Menu / Food Stall',
        'Road / Traffic Sign',
        'Trail / Park Notice',
        'Shop / General Sign',
      ],
    },
    detectedLanguages: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    overallSummaryEn: { type: 'STRING' },
    urgentWarning: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          originalText: { type: 'STRING' },
          englishTranslation: { type: 'STRING' },
          priceOrDetail: { type: 'STRING' },
          dietaryOrSafetyTag: { type: 'STRING' },
          localNote: { type: 'STRING' },
        },
        required: ['originalText', 'englishTranslation'],
      },
    },
  },
  required: [
    'hasReadableText',
    'detectedCategory',
    'detectedLanguages',
    'overallSummaryEn',
    'items',
  ],
};

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface QuotaState {
  date: string;
  count: number;
}

function readQuotaState(): QuotaState {
  const today = getTodayDateKey();
  if (typeof window === 'undefined') {
    return { date: today, count: 0 };
  }
  try {
    const raw = localStorage.getItem(SCAN_QUOTA_STORAGE_KEY);
    if (!raw) return { date: today, count: 0 };
    const parsed = JSON.parse(raw) as Partial<QuotaState>;
    if (parsed?.date === today && typeof parsed.count === 'number' && parsed.count >= 0) {
      return { date: today, count: parsed.count };
    }
  } catch {
    // ignore storage errors
  }
  return { date: today, count: 0 };
}

function writeQuotaState(state: QuotaState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCAN_QUOTA_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function getDailyScanUsage(): { used: number; remaining: number; limit: number } {
  const state = readQuotaState();
  const used = Math.min(DAILY_TRANSLATOR_SCAN_LIMIT, Math.max(0, state.count));
  return {
    used,
    remaining: Math.max(0, DAILY_TRANSLATOR_SCAN_LIMIT - used),
    limit: DAILY_TRANSLATOR_SCAN_LIMIT,
  };
}

function incrementDailyScanUsage(): number {
  const state = readQuotaState();
  const nextCount = state.count + 1;
  writeQuotaState({ date: state.date, count: nextCount });
  return Math.max(0, DAILY_TRANSLATOR_SCAN_LIMIT - nextCount);
}

/**
 * Compresses an uploaded/captured image using HTML5 <canvas> while keeping
 * small menu text and road signs sharp (maxDim = 1024px, JPEG quality = 0.80).
 */
export async function compressImageForTranslation(
  file: File,
  maxDim = 1024,
  quality = 0.8
): Promise<{ dataUrl: string; base64: string; approxBytes: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPG, PNG, or WEBP).');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const src = String(reader.result || '');
      if (!src) {
        reject(new Error('Selected image appears empty.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Unable to decode this image format. Try JPG or PNG.'));
      img.onload = () => {
        try {
          const longestSide = Math.max(img.width, img.height, 1);
          const scale = Math.min(1, maxDim / longestSide);
          const targetW = Math.max(1, Math.round(img.width * scale));
          const targetH = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }

          // White background ensures transparent PNGs remain readable after JPEG encoding
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });

  const commaIndex = dataUrl.indexOf(',');
  const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  const approxBytes = Math.round((base64.length * 3) / 4);

  return { dataUrl, base64, approxBytes };
}

function stripJsonCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  return trimmed;
}

function normalizeCategory(raw: unknown): TranslationCategory {
  const val = String(raw || '').trim();
  if (val === 'Menu / Food Stall') return 'Menu / Food Stall';
  if (val === 'Road / Traffic Sign') return 'Road / Traffic Sign';
  if (val === 'Trail / Park Notice') return 'Trail / Park Notice';
  return 'Shop / General Sign';
}

function parseTranslationPayload(rawText: string): VisualTranslationResult {
  const cleaned = stripJsonCodeFences(rawText);
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart >= 0 && objEnd > objStart) {
      parsed = JSON.parse(cleaned.slice(objStart, objEnd + 1));
    } else {
      throw new Error('Could not parse translation output from AI response.');
    }
  }

  const itemsRaw = Array.isArray(parsed?.items) ? parsed.items : [];
  const items: TranslationItem[] = itemsRaw
    .filter((item: any) => item && (item.originalText || item.englishTranslation))
    .map((item: any) => ({
      originalText: String(item.originalText || '').trim(),
      englishTranslation: String(item.englishTranslation || item.originalText || '').trim(),
      priceOrDetail: item.priceOrDetail ? String(item.priceOrDetail).trim() : undefined,
      dietaryOrSafetyTag: item.dietaryOrSafetyTag
        ? String(item.dietaryOrSafetyTag).trim()
        : undefined,
      localNote: item.localNote ? String(item.localNote).trim() : undefined,
    }));

  const hasReadableText = Boolean(parsed?.hasReadableText) && (items.length > 0 || Boolean(parsed?.overallSummaryEn));

  return {
    hasReadableText,
    detectedCategory: normalizeCategory(parsed?.detectedCategory),
    detectedLanguages: Array.isArray(parsed?.detectedLanguages)
      ? parsed.detectedLanguages.map((l: unknown) => String(l).trim()).filter(Boolean)
      : [],
    overallSummaryEn: String(parsed?.overallSummaryEn || '').trim(),
    urgentWarning: parsed?.urgentWarning ? String(parsed.urgentWarning).trim() : undefined,
    items,
  };
}

export async function translateMenuOrSignImage(
  file: File
): Promise<VisualTranslatorScanResponse> {
  const usage = getDailyScanUsage();
  if (usage.remaining <= 0) {
    throw new Error(
      `Daily limit reached (${DAILY_TRANSLATOR_SCAN_LIMIT} scans/day). Quota resets automatically tomorrow.`
    );
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error('Gemini API key is not configured for image translation.');
  }

  const { dataUrl, base64, approxBytes } = await compressImageForTranslation(file, 1024, 0.8);

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64,
            },
          },
          {
            text: 'Analyze this Cameron Highlands image, detect the category and languages, and return the structured JSON English translation.',
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey.trim())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    if (response.status === 429) {
      throw new Error('Translation service is busy right now. Please wait a moment and try again.');
    }
    throw new Error(
      `Translation request failed (${response.status})${errText ? `: ${errText.slice(0, 140)}` : '.'}`
    );
  }

  const json = await response.json();
  const parts = Array.isArray(json?.candidates?.[0]?.content?.parts)
    ? json.candidates[0].content.parts
    : [];
  const rawText = parts.map((p: any) => (typeof p?.text === 'string' ? p.text : '')).join('\n');

  if (!rawText.trim()) {
    throw new Error('No translation data was returned. Please try another photo.');
  }

  const result = parseTranslationPayload(rawText);
  const remainingScansToday = incrementDailyScanUsage();

  return {
    result,
    previewDataUrl: dataUrl,
    payloadBytesApprox: approxBytes,
    remainingScansToday,
    dailyLimit: DAILY_TRANSLATOR_SCAN_LIMIT,
  };
}
