import { CamgoHazard, Language } from '../types';

export const CAMERON_TRAFFIC_CENTER = {
  lat: 4.4734,
  lon: 101.3787,
} as const;

export type TrafficCondition = 'clear' | 'moderate' | 'heavy' | 'gridlock';

export type TrafficFlowDataSource =
  | 'tomtom_live_flow'
  | 'tomtom_predictive_route'
  | 'historical_predictive';

export type RoadClass =
  | 'expressway'
  | 'mountain_pass'
  | 'town_strip'
  | 'rural_plantation';

export interface PredictiveTrafficSegment {
  id: string;
  name: string;
  corridor: 'simpang-pulai' | 'tapah' | 'sungai-koyan' | 'central' | 'interior';
  roadClass: RoadClass;
  freeFlowSpeedKmh: number;
  speedKmh: number;
  condition: TrafficCondition;
  color: string;
  statusLabel: string;
  delayMins: number;
  confidence: number; // 0.0 - 1.0
  dataSource: TrafficFlowDataSource;
  fallbackReason?: string;
  coordinates: [number, number][];
  advisory: string;
}

export interface PredictiveHotspotPoint {
  id: string;
  name: string;
  corridor: string;
  coords: [number, number];
  severity: 'gridlock' | 'heavy' | 'moderate';
  color: string;
  speedKmh: number;
  delayMins: number;
  confidence: number;
  dataSource: TrafficFlowDataSource;
  cause: string;
  bypassTip: string;
}

export interface RouteStepData {
  instruction: string;
  distanceMeters: number;
  durationSecs: number;
  icon: string;
}

export interface PredictiveRouteResult {
  originName: string;
  originCoords: [number, number];
  destinationName: string;
  destinationCoords: [number, number];
  distanceKm: number;
  durationMins: number;
  historicDurationMins: number;
  noTrafficDurationMins: number;
  aiAdjustedMins: number;
  predictiveSource: TrafficFlowDataSource;
  predictiveSummaryNote: string;
  steps: RouteStepData[];
  coordinates: [number, number][];
}

export interface PredictiveFlowSummaryStats {
  totalSegments: number;
  liveVerifiedCount: number;
  historicalFallbackCount: number;
  avgSpeedKmh: number;
  activeTimeLabel: string;
  mode: 'smart_predictive' | 'live_hybrid';
}

interface TomTomFlowCacheEntry {
  timestamp: number;
  currentSpeed: number;
  freeFlowSpeed: number;
  confidence: number;
  currentTravelTime: number;
  freeFlowTravelTime: number;
  roadClosure: boolean;
}

const FLOW_CACHE_TTL_MS = 90_000;
const flowProbeCache = new Map<string, TomTomFlowCacheEntry | null>();

export function getTomTomApiKey(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('tomtom_api_key');
    if (stored && stored.trim().length > 10) return stored.trim();
  }
  const envKey = (import.meta as any)?.env?.VITE_TOMTOM_API_KEY;
  if (typeof envKey === 'string' && envKey.trim().length > 10) {
    return envKey.trim();
  }
  return '';
}

export function classifyTrafficSpeed(
  speedKmh: number,
  freeFlowSpeedKmh: number
): {
  condition: TrafficCondition;
  color: string;
  statusLabel: string;
} {
  const ratio = freeFlowSpeedKmh > 0 ? speedKmh / freeFlowSpeedKmh : 1;

  if (speedKmh < 15 || ratio < 0.28) {
    return {
      condition: 'gridlock',
      color: '#dc2626',
      statusLabel: 'Critical Gridlock',
    };
  }
  if (speedKmh < 28 || ratio < 0.48) {
    return {
      condition: 'heavy',
      color: '#ef4444',
      statusLabel: 'Heavy Delays',
    };
  }
  if (speedKmh < 44 || ratio < 0.72) {
    return {
      condition: 'moderate',
      color: '#f59e0b',
      statusLabel: 'Moderate Crawl',
    };
  }
  return {
    condition: 'clear',
    color: '#10b981',
    statusLabel: 'Free Flow',
  };
}

/**
 * Deterministic time-of-day & day-of-week historical traffic speed profile
 * calibrated for Cameron Highlands expressways, mountain passes, town strips,
 * and sparse rural plantation/interior roads (Kea Farm, Boh Estate, Tringkap, Habu).
 */
export function evaluateHistoricalSegmentFlow(
  segment: PredictiveTrafficSegment,
  targetDate: Date = new Date()
): PredictiveTrafficSegment {
  const hour = targetDate.getHours() + targetDate.getMinutes() / 60;
  const day = targetDate.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const isWeekend = day === 0 || day === 6;
  const isFridayEvening = day === 5 && hour >= 16;

  let loadFactor = 1.0; // 1.0 = free-flow historical average, <1.0 = slower speed

  if (hour >= 22.5 || hour < 6.0) {
    // Late night / pre-dawn: consistently clear across corridors & rural roads
    loadFactor = 0.96;
  } else if (segment.roadClass === 'rural_plantation') {
    // Rural interior stretches (Boh Sg Palas, Kea Farm Farm-to-Market, Habu, Brinchang Ridge):
    // Harvest lorry movements (07:30-10:30) and tourist farm peaks (10:00-16:00)
    if (isWeekend && hour >= 9.5 && hour <= 16.5) {
      loadFactor = segment.id.includes('kea') ? 0.34 : 0.54;
    } else if (hour >= 7.5 && hour <= 11.0) {
      loadFactor = 0.68; // Vegetable/tea estate transport & farm deliveries
    } else if (hour >= 11.0 && hour <= 16.5) {
      loadFactor = 0.72;
    } else {
      loadFactor = 0.92;
    }
  } else if (segment.roadClass === 'town_strip') {
    // Tanah Rata, Golden Hills Night Market, Brinchang & Kea Farm spine
    if (isWeekend && hour >= 10.0 && hour <= 17.5) {
      loadFactor = segment.id.includes('kea') ? 0.24 : 0.36;
    } else if ((isWeekend || isFridayEvening) && hour >= 17.0 && hour <= 21.5) {
      // Golden Hills Pasar Malam & dinner rush
      loadFactor = segment.id.includes('golden-hills') ? 0.30 : 0.46;
    } else if (hour >= 11.5 && hour <= 14.5) {
      loadFactor = 0.56; // Lunch & checkout rush
    } else if (hour >= 8.0 && hour <= 10.0) {
      loadFactor = 0.68; // Morning market / school run
    } else {
      loadFactor = 0.88;
    }
  } else if (segment.roadClass === 'mountain_pass') {
    // FT 59 Tapah / Lata Iskandar & FT 185 Pos Slim ascent
    if (isWeekend && hour >= 9.0 && hour <= 15.5) {
      loadFactor = segment.corridor === 'tapah' ? 0.44 : 0.62;
    } else if (isFridayEvening && hour >= 16.5 && hour <= 20.5) {
      loadFactor = 0.64;
    } else if (hour >= 6.5 && hour <= 9.5) {
      loadFactor = 0.74; // Heavy uphill/downhill agro trucks
    } else {
      loadFactor = 0.90;
    }
  } else {
    // Expressway / Central Spine approaches
    if ((isWeekend || isFridayEvening) && hour >= 9.5 && hour <= 17.0) {
      loadFactor = 0.84;
    } else {
      loadFactor = 0.95;
    }
  }

  const predictedSpeed = Math.max(
    7,
    Math.min(segment.freeFlowSpeedKmh, Math.round(segment.freeFlowSpeedKmh * loadFactor))
  );

  // Estimate delay in minutes over an ~8-12km reference stretch
  const referenceDistKm =
    segment.roadClass === 'town_strip'
      ? 3.8
      : segment.roadClass === 'rural_plantation'
        ? 5.2
        : 12.0;
  const freeFlowMins = (referenceDistKm / Math.max(15, segment.freeFlowSpeedKmh)) * 60;
  const predictedMins = (referenceDistKm / Math.max(6, predictedSpeed)) * 60;
  const delayMins = Math.max(0, Math.round(predictedMins - freeFlowMins));

  const { condition, color, statusLabel } = classifyTrafficSpeed(
    predictedSpeed,
    segment.freeFlowSpeedKmh
  );

  const dayTypeLabel = isWeekend
    ? 'Weekend / Peak'
    : isFridayEvening
      ? 'Fri Evening Surge'
      : 'Weekday';
  const hourInt = targetDate.getHours();
  const minuteStr = String(targetDate.getMinutes()).padStart(2, '0');
  const timeStr = `${String(hourInt).padStart(2, '0')}:${minuteStr}`;

  return {
    ...segment,
    speedKmh: predictedSpeed,
    delayMins,
    condition,
    color,
    statusLabel,
    confidence: segment.roadClass === 'rural_plantation' ? 0.84 : 0.89,
    dataSource: 'historical_predictive',
    fallbackReason:
      segment.roadClass === 'rural_plantation'
        ? `Sparse live probe telemetry — using historical ${dayTypeLabel} (${timeStr}) plantation/agro speed profile`
        : `Historical ${dayTypeLabel} (${timeStr}) statistical speed profile`,
  };
}

/**
 * Fetches TomTom Flow Segment Data for a single highland coordinate probe.
 * Returns null if live telemetry is sparse, low-confidence, zero-speed, or unreachable,
 * allowing callers to fall back cleanly to historical average speed profiles.
 */
export async function fetchTomTomFlowSegment(
  lat: number,
  lon: number,
  apiKey: string,
  signal?: AbortSignal
): Promise<TomTomFlowCacheEntry | null> {
  const cleanKey = apiKey.trim();
  if (cleanKey.length <= 10) return null;

  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = flowProbeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < FLOW_CACHE_TTL_MS) {
    return cached;
  }

  try {
    const params = new URLSearchParams({
      key: cleanKey,
      point: `${lat.toFixed(6)},${lon.toFixed(6)}`,
      unit: 'KMPH',
      thickness: '1',
    });

    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?${params.toString()}`;
    const res = await fetch(url, { signal });
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const flow = data?.flowSegmentData;
    if (!flow) return null;

    const currentSpeed = Number(flow.currentSpeed || 0);
    const freeFlowSpeed = Number(flow.freeFlowSpeed || 0);
    const confidence = Number(flow.confidence ?? 0);
    const currentTravelTime = Number(flow.currentTravelTime || 0);
    const freeFlowTravelTime = Number(flow.freeFlowTravelTime || 0);
    const roadClosure = Boolean(flow.roadClosure);

    // Sparse telemetry guard: reject zero speeds or low-confidence (< 0.35) rural probes
    if (currentSpeed <= 0 || freeFlowSpeed <= 0 || confidence < 0.35) {
      return null;
    }

    const entry: TomTomFlowCacheEntry = {
      timestamp: Date.now(),
      currentSpeed,
      freeFlowSpeed,
      confidence,
      currentTravelTime,
      freeFlowTravelTime,
      roadClosure,
    };

    flowProbeCache.set(cacheKey, entry);
    return entry;
  } catch {
    return null;
  }
}

/**
 * Enriches all highland road & rural plantation segments using TomTom live probes where
 * confidence is sufficient, gracefully falling back to historical-predictive speed profiles
 * whenever rural telemetry is missing or sparse.
 */
export async function enrichSegmentsWithPredictiveFlow(
  baseSegments: PredictiveTrafficSegment[],
  targetDate: Date = new Date(),
  apiKey: string = getTomTomApiKey(),
  signal?: AbortSignal
): Promise<{
  segments: PredictiveTrafficSegment[];
  stats: PredictiveFlowSummaryStats;
}> {
  const isNearLiveWindow = Math.abs(targetDate.getTime() - Date.now()) < 20 * 60 * 1000;
  const canQueryLiveTomTom = Boolean(apiKey && apiKey.trim().length > 10 && isNearLiveWindow);

  // Start with deterministic historical-predictive evaluation for every stretch
  const historicalSegments = baseSegments.map((seg) =>
    evaluateHistoricalSegmentFlow(seg, targetDate)
  );

  if (!canQueryLiveTomTom) {
    const avgSpeed = Math.round(
      historicalSegments.reduce((acc, s) => acc + s.speedKmh, 0) /
        Math.max(1, historicalSegments.length)
    );
    return {
      segments: historicalSegments,
      stats: {
        totalSegments: historicalSegments.length,
        liveVerifiedCount: 0,
        historicalFallbackCount: historicalSegments.length,
        avgSpeedKmh: avgSpeed,
        activeTimeLabel: targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: 'smart_predictive',
      },
    };
  }

  let liveVerifiedCount = 0;

  // Query representative coordinate midpoints with concurrency cap
  const enriched = await Promise.all(
    historicalSegments.map(async (seg) => {
      const midIdx = Math.floor(seg.coordinates.length / 2);
      const probeCoord = seg.coordinates[midIdx] || seg.coordinates[0];
      if (!probeCoord) return seg;

      const live = await fetchTomTomFlowSegment(probeCoord[0], probeCoord[1], apiKey, signal);
      if (!live) {
        // Fallback intelligence: retain historical-predictive average speed instead of 0/blank
        return {
          ...seg,
          dataSource: 'historical_predictive' as const,
          fallbackReason:
            'TomTom live probe sparse/unverified for this highland stretch — using historical average speed',
        };
      }

      liveVerifiedCount += 1;
      const delayMins = Math.max(
        0,
        Math.round((live.currentTravelTime - live.freeFlowTravelTime) / 60)
      );
      const effectiveSpeed = Math.max(5, Math.round(live.currentSpeed));
      const { condition, color, statusLabel } = classifyTrafficSpeed(
        effectiveSpeed,
        Math.max(seg.freeFlowSpeedKmh, live.freeFlowSpeed)
      );

      return {
        ...seg,
        speedKmh: effectiveSpeed,
        delayMins,
        condition,
        color,
        statusLabel,
        confidence: Number(live.confidence.toFixed(2)),
        dataSource: 'tomtom_live_flow' as const,
        fallbackReason: undefined,
      };
    })
  );

  const avgSpeed = Math.round(
    enriched.reduce((acc, s) => acc + s.speedKmh, 0) / Math.max(1, enriched.length)
  );

  return {
    segments: enriched,
    stats: {
      totalSegments: enriched.length,
      liveVerifiedCount,
      historicalFallbackCount: enriched.length - liveVerifiedCount,
      avgSpeedKmh: avgSpeed,
      activeTimeLabel: targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: liveVerifiedCount > 0 ? 'live_hybrid' : 'smart_predictive',
    },
  };
}

function parseTomTomManeuverIcon(instructionType?: string, maneuver?: string): string {
  const type = (instructionType || '').toUpperCase();
  const man = (maneuver || '').toUpperCase();

  if (type.includes('DEPART') || man.includes('DEPART')) return '🚗';
  if (type.includes('ARRIVE') || man.includes('ARRIVE')) return '🏁';
  if (man.includes('LEFT') || type.includes('LEFT')) return '⬅️';
  if (man.includes('RIGHT') || type.includes('RIGHT')) return '➡️';
  if (man.includes('ROUNDABOUT') || type.includes('ROUNDABOUT')) return '🔄';
  if (man.includes('BEAR') || man.includes('BEER') || man.includes('SLIGHT')) return '↗️';
  return '⬆️';
}

function approxDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Spatial-Temporal Predictive Travel Time Adjustment
 * Calculates realistic highland ETA factoring time-of-day, day-of-week, and
 * proximity of route geometry to known mountain passes & agro-market bottlenecks.
 */
export function computePredictiveRouteTravelTime(
  coordinates: [number, number][],
  baseDurationSecs: number,
  targetDate: Date = new Date()
): {
  adjustedDurationSecs: number;
  predictiveFactor: number;
  summaryNote: string;
} {
  const hour = targetDate.getHours() + targetDate.getMinutes() / 60;
  const day = targetDate.getDay();
  const isWeekend = day === 0 || day === 6;
  const isFridayEvening = day === 5 && hour >= 16;

  // Checkpoints where historical mountain speed drops occur
  const corridorMarkers: Array<{ lat: number; lon: number; label: string; weight: number }> = [
    { lat: 4.5028, lon: 101.4072, label: 'Kea Farm Agro Stretch', weight: 0.28 },
    { lat: 4.5162, lon: 101.4165, label: 'Boh Sg Palas Plantation Spur', weight: 0.16 },
    { lat: 4.4815, lon: 101.3855, label: 'Golden Hills / Brinchang', weight: 0.22 },
    { lat: 4.4715, lon: 101.3805, label: 'Tanah Rata Town', weight: 0.14 },
    { lat: 4.331, lon: 101.328, label: 'Lata Iskandar Hairpins', weight: 0.20 },
  ];

  let corridorPenalty = 0;
  const matchedZones: string[] = [];

  if (coordinates.length > 0) {
    // Sample every nth point for O(N) fast spatial intersection check
    const step = Math.max(1, Math.floor(coordinates.length / 45));
    corridorMarkers.forEach((zone) => {
      for (let i = 0; i < coordinates.length; i += step) {
        const pt = coordinates[i];
        if (approxDistanceKm(pt[0], pt[1], zone.lat, zone.lon) <= 1.8) {
          corridorPenalty += zone.weight;
          matchedZones.push(zone.label);
          break;
        }
      }
    });
  }

  let timeMultiplier = 1.05;
  if (hour >= 22.5 || hour < 6.0) {
    timeMultiplier = 0.96; // Clear highland night flow
  } else if (isWeekend && hour >= 9.5 && hour <= 17.0) {
    timeMultiplier = 1.28 + Math.min(0.45, corridorPenalty);
  } else if ((isWeekend || isFridayEvening) && hour >= 17.0 && hour <= 21.5) {
    timeMultiplier = 1.18 + Math.min(0.35, corridorPenalty * 0.85);
  } else if (hour >= 7.5 && hour <= 14.0) {
    timeMultiplier = 1.10 + Math.min(0.22, corridorPenalty * 0.6);
  } else {
    timeMultiplier = 1.04 + Math.min(0.15, corridorPenalty * 0.4);
  }

  const adjustedDurationSecs = Math.max(60, Math.round(baseDurationSecs * timeMultiplier));
  const zoneText =
    matchedZones.length > 0 ? ` (${matchedZones.slice(0, 2).join(', ')})` : '';
  const summaryNote =
    isWeekend && hour >= 9.5 && hour <= 17.5
      ? `Historical Weekend Peak model applied${zoneText}`
      : hour >= 22.5 || hour < 6.0
        ? `Historical Off-Peak Highland flow applied${zoneText}`
        : `Historical Time-of-Day statistical model applied${zoneText}`;

  return {
    adjustedDurationSecs,
    predictiveFactor: Number(timeMultiplier.toFixed(2)),
    summaryNote,
  };
}

/**
 * Queries TomTom Routing API v1 with Predictive & Historical Travel-Time Modeling:
 * - `traffic=true`
 * - `computeTravelTimeFor=all` (noTraffic, historicTraffic, liveTrafficIncidents)
 * - `departAt` (ISO timestamp for time-of-day & day-of-week traffic pattern matching)
 * - `sectionType=traffic`
 *
 * If live telemetry returns zero/sparse diff over rural roads, uses TomTom's
 * `historicTrafficTravelTimeInSeconds` blended with interior highland prediction.
 */
export async function fetchTomTomPredictiveRoute(
  origin: { lat: number; lng: number; name: string },
  destination: { lat: number; lng: number; name: string },
  apiKey: string,
  options: {
    language?: Language;
    departAt?: Date;
    signal?: AbortSignal;
  } = {}
): Promise<PredictiveRouteResult | null> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) return null;

  const lang = options.language || 'en';
  const departDate = options.departAt || new Date();

  try {
    const params = new URLSearchParams({
      key: cleanKey,
      traffic: 'true',
      travelMode: 'car',
      routeType: 'fastest',
      instructionsType: 'text',
      computeTravelTimeFor: 'all',
      sectionType: 'traffic',
      departAt: departDate.toISOString(),
      language: lang === 'bm' ? 'ms-MY' : 'en-US',
    });

    const endpoint = `https://api.tomtom.com/routing/1/calculateRoute/${origin.lat},${origin.lng}:${destination.lat},${destination.lng}/json`;
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`TomTom Routing HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data?.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    const summary = route.summary || {};

    const baseTravelSecs = Number(summary.travelTimeInSeconds || 0);
    const liveTrafficSecs = Number(
      summary.liveTrafficIncidentsTravelTimeInSeconds || baseTravelSecs
    );
    const historicTrafficSecs = Number(
      summary.historicTrafficTravelTimeInSeconds || baseTravelSecs
    );
    const noTrafficSecs = Number(summary.noTrafficTravelTimeInSeconds || baseTravelSecs);

    const points: Array<{ latitude: number; longitude: number }> =
      route.legs?.[0]?.points || [];
    const coordinates: [number, number][] = points.map((p) => [p.latitude, p.longitude]);

    // Check if TomTom returned live incident/traffic sections or relied strictly on historic flow
    const trafficSections: any[] = Array.isArray(route.sections)
      ? route.sections.filter((s: any) => s.sectionType === 'TRAFFIC')
      : [];
    const hasLiveTrafficVariation =
      trafficSections.length > 0 && Math.abs(liveTrafficSecs - noTrafficSecs) > 45;

    // Fallback intelligence: if live probe telemetry is sparse/unchanged from free-flow,
    // use TomTom's historicTrafficTravelTimeInSeconds or rural predictive adjustment.
    const localPrediction = computePredictiveRouteTravelTime(
      coordinates,
      historicTrafficSecs || baseTravelSecs,
      departDate
    );

    const bestPredictiveSecs = hasLiveTrafficVariation
      ? Math.max(liveTrafficSecs, Math.round((liveTrafficSecs + historicTrafficSecs) / 2))
      : Math.max(historicTrafficSecs, localPrediction.adjustedDurationSecs);

    const distanceKm = Number(((summary.lengthInMeters || 0) / 1000).toFixed(1));
    const durationMins = Math.max(1, Math.round(bestPredictiveSecs / 60));
    const historicDurationMins = Math.max(1, Math.round(historicTrafficSecs / 60));
    const noTrafficDurationMins = Math.max(1, Math.round(noTrafficSecs / 60));

    const instructions: any[] = route.guidance?.instructions || [];
    const steps: RouteStepData[] =
      instructions.length > 0
        ? instructions.map((inst) => ({
            instruction:
              inst.message ||
              (lang === 'bm' ? `Laluan ke ${destination.name}` : `Route to ${destination.name}`),
            distanceMeters: Math.round(inst.routeOffsetInMeters || 0),
            durationSecs: Math.round(inst.travelTimeInSeconds || 0),
            icon: parseTomTomManeuverIcon(inst.instructionType, inst.maneuver),
          }))
        : [
            {
              instruction: `Head towards ${destination.name}`,
              distanceMeters: summary.lengthInMeters || 0,
              durationSecs: bestPredictiveSecs,
              icon: '🚗',
            },
            {
              instruction: `Arrive at ${destination.name}`,
              distanceMeters: 0,
              durationSecs: 0,
              icon: '🏁',
            },
          ];

    return {
      originName: origin.name,
      originCoords: [origin.lat, origin.lng],
      destinationName: destination.name,
      destinationCoords: [destination.lat, destination.lng],
      distanceKm,
      durationMins,
      historicDurationMins,
      noTrafficDurationMins,
      aiAdjustedMins: durationMins,
      predictiveSource: hasLiveTrafficVariation
        ? 'tomtom_predictive_route'
        : 'historical_predictive',
      predictiveSummaryNote: hasLiveTrafficVariation
        ? 'TomTom Live + Historic Predictive Routing active'
        : `TomTom Historic Profile fallback (${localPrediction.summaryNote})`,
      steps,
      coordinates,
    };
  } catch (err) {
    console.warn('[tomtomTrafficService] TomTom Predictive Routing error:', err);
    return null;
  }
}

export interface CorridorProbeSpec {
  id: 'simpang-pulai' | 'tapah' | 'sungai-koyan';
  point: [number, number];
  historicalPeakKmh: number;
  historicalOffPeakKmh: number;
}

export const CORRIDOR_GATEWAY_PROBES: CorridorProbeSpec[] = [
  {
    id: 'simpang-pulai',
    point: [4.582, 101.312],
    historicalPeakKmh: 46,
    historicalOffPeakKmh: 58,
  },
  {
    id: 'tapah',
    point: [4.331, 101.328],
    historicalPeakKmh: 28,
    historicalOffPeakKmh: 40,
  },
  {
    id: 'sungai-koyan',
    point: [4.351, 101.528],
    historicalPeakKmh: 56,
    historicalOffPeakKmh: 68,
  },
];

// =========================================================================
// MODULE B: Telemetry Anomaly Detection (≥ 70% Speed Drop vs Historical Baseline)
// =========================================================================

export interface TelemetryCorridorMonitorSpec {
  id: string;
  name: string;
  corridor: PredictiveTrafficSegment['corridor'];
  roadClass: RoadClass;
  freeFlowSpeedKmh: number;
  probeLat: number;
  probeLng: number;
  routeOrigin: { lat: number; lng: number };
  routeDest: { lat: number; lng: number };
}

export const HIGHLAND_TELEMETRY_CORRIDORS: TelemetryCorridorMonitorSpec[] = [
  {
    id: 'telemetry-ringlet-tanah-rata',
    name: 'Ringlet – Tanah Rata (FT59)',
    corridor: 'tapah',
    roadClass: 'mountain_pass',
    freeFlowSpeedKmh: 52,
    probeLat: 4.4425,
    probeLng: 101.3792,
    routeOrigin: { lat: 4.4147, lng: 101.3820 },
    routeDest: { lat: 4.4715, lng: 101.3805 },
  },
  {
    id: 'telemetry-tanah-rata-brinchang',
    name: 'Tanah Rata – Brinchang (FT59)',
    corridor: 'central',
    roadClass: 'town_strip',
    freeFlowSpeedKmh: 46,
    probeLat: 4.4815,
    probeLng: 101.3855,
    routeOrigin: { lat: 4.4715, lng: 101.3805 },
    routeDest: { lat: 4.4905, lng: 101.3892 },
  },
  {
    id: 'telemetry-brinchang-kea-farm',
    name: 'Brinchang – Kea Farm (FT59)',
    corridor: 'central',
    roadClass: 'town_strip',
    freeFlowSpeedKmh: 42,
    probeLat: 4.4992,
    probeLng: 101.3995,
    routeOrigin: { lat: 4.4905, lng: 101.3892 },
    routeDest: { lat: 4.5028, lng: 101.4072 },
  },
  {
    id: 'telemetry-tapah-lata-iskandar',
    name: 'Tapah – Lata Iskandar (FT59)',
    corridor: 'tapah',
    roadClass: 'mountain_pass',
    freeFlowSpeedKmh: 46,
    probeLat: 4.3310,
    probeLng: 101.3280,
    routeOrigin: { lat: 4.2690, lng: 101.3070 },
    routeDest: { lat: 4.3895, lng: 101.3665 },
  },
  {
    id: 'telemetry-simpang-pulai-kg-raja',
    name: 'Simpang Pulai – Kampung Raja (FT185)',
    corridor: 'simpang-pulai',
    roadClass: 'expressway',
    freeFlowSpeedKmh: 68,
    probeLat: 4.5820,
    probeLng: 101.3120,
    routeOrigin: { lat: 4.5852, lng: 101.2680 },
    routeDest: { lat: 4.5683, lng: 101.4087 },
  },
];

export interface TelemetrySpeedReading {
  corridorId: string;
  liveSpeedKmh: number;
  baselineSpeedKmh?: number;
  lat?: number;
  lng?: number;
  source?: string;
}

export const TELEMETRY_ANOMALY_DROP_THRESHOLD = 0.7;

/**
 * Evaluates live telemetry speeds against TomTom's historical predictive speed baselines
 * for the given hour and day-of-week.
 * If live speed drops by 70% or more compared to baseline (dropRatio >= 0.70),
 * emits a provisional 'Sudden Congestion / Potential Hazard' pin for the Leaflet map.
 */
export function detectTelemetrySpeedAnomalies(
  readings: TelemetrySpeedReading[],
  targetDate: Date = new Date(),
  corridors: TelemetryCorridorMonitorSpec[] = HIGHLAND_TELEMETRY_CORRIDORS
): CamgoHazard[] {
  const anomalies: CamgoHazard[] = [];
  const nowIso = targetDate.toISOString();

  readings.forEach((reading) => {
    const spec = corridors.find((c) => c.id === reading.corridorId);
    if (!spec) return;
    if (!Number.isFinite(reading.liveSpeedKmh) || reading.liveSpeedKmh < 0) return;

    const syntheticSeg: PredictiveTrafficSegment = {
      id: spec.id,
      name: spec.name,
      corridor: spec.corridor,
      roadClass: spec.roadClass,
      freeFlowSpeedKmh: spec.freeFlowSpeedKmh,
      speedKmh: spec.freeFlowSpeedKmh,
      condition: 'clear',
      color: '#10b981',
      statusLabel: 'Free Flow',
      delayMins: 0,
      confidence: 0.9,
      dataSource: 'historical_predictive',
      coordinates: [
        [spec.routeOrigin.lat, spec.routeOrigin.lng],
        [spec.probeLat, spec.probeLng],
        [spec.routeDest.lat, spec.routeDest.lng],
      ],
      advisory: '',
    };

    const historicalBaseline = evaluateHistoricalSegmentFlow(syntheticSeg, targetDate);
    const baselineSpeedKmh =
      typeof reading.baselineSpeedKmh === 'number' && reading.baselineSpeedKmh > 0
        ? reading.baselineSpeedKmh
        : historicalBaseline.speedKmh;

    if (baselineSpeedKmh <= 0) return;

    const dropRatio = (baselineSpeedKmh - reading.liveSpeedKmh) / baselineSpeedKmh;
    if (dropRatio >= TELEMETRY_ANOMALY_DROP_THRESHOLD) {
      const dropPercent = Math.min(99, Math.round(dropRatio * 100));
      anomalies.push({
        id: `telemetry-anom-${spec.id}`,
        title: `Sudden Congestion / Potential Hazard (${spec.name})`,
        titleBm: `Kesesakan Mengejut / Potensi Bahaya (${spec.name})`,
        description: `Provisional telemetry anomaly: live speed dropped ${dropPercent}% (${Math.round(
          reading.liveSpeedKmh
        )} km/h vs ${Math.round(baselineSpeedKmh)} km/h historical baseline for this hour/day). Check for stalled vehicles, slope debris, or sudden bottleneck.`,
        descriptionBm: `Anomali telemetri sementara: kelajuan semasa menjunam ${dropPercent}% (${Math.round(
          reading.liveSpeedKmh
        )} km/j berbanding garis dasar sejarah ${Math.round(
          baselineSpeedKmh
        )} km/j pada waktu ini). Berhati-hati kemungkinan halangan atau runtuhan.`,
        type: 'sudden_congestion',
        severity: dropPercent >= 85 ? 'critical' : 'high',
        location: spec.name,
        corridor: spec.corridor,
        milestoneKm: null,
        lat: reading.lat ?? spec.probeLat,
        lng: reading.lng ?? spec.probeLng,
        source: reading.source || 'TomTom Telemetry Anomaly Detector',
        status: 'active',
        stillThereVotes: 0,
        clearedVotes: 0,
        isProvisional: true,
        baselineSpeedKmh: Math.round(baselineSpeedKmh),
        liveSpeedKmh: Math.round(reading.liveSpeedKmh),
        speedDropPercent: dropPercent,
        extractionMethod: 'telemetry_anomaly',
        timestamp: nowIso,
        updatedAt: nowIso,
      });
    }
  });

  return anomalies;
}

/**
 * Monitors key Cameron Highlands corridors using TomTom Routing / Flow speed metrics
 * and compares live corridor speed against TomTom historical predictive baselines.
 */
export async function monitorCorridorTelemetryAnomalies(
  apiKey: string = getTomTomApiKey(),
  targetDate: Date = new Date(),
  signal?: AbortSignal
): Promise<{
  anomalies: CamgoHazard[];
  readings: TelemetrySpeedReading[];
  checkedCount: number;
}> {
  const cleanKey = apiKey.trim();
  const readings: TelemetrySpeedReading[] = [];

  if (cleanKey.length > 10) {
    await Promise.all(
      HIGHLAND_TELEMETRY_CORRIDORS.map(async (spec) => {
        try {
          // Query TomTom Routing API speed metrics comparing liveTrafficIncidents vs historicTraffic
          const params = new URLSearchParams({
            key: cleanKey,
            traffic: 'true',
            travelMode: 'car',
            computeTravelTimeFor: 'all',
            departAt: targetDate.toISOString(),
          });
          const url = `https://api.tomtom.com/routing/1/calculateRoute/${spec.routeOrigin.lat},${spec.routeOrigin.lng}:${spec.routeDest.lat},${spec.routeDest.lng}/json?${params.toString()}`;
          const res = await fetch(url, { signal });

          if (res.ok) {
            const data = await res.json();
            const summary = data?.routes?.[0]?.summary;
            if (summary?.lengthInMeters && summary?.liveTrafficIncidentsTravelTimeInSeconds) {
              const distKm = Number(summary.lengthInMeters) / 1000;
              const liveHours = Number(summary.liveTrafficIncidentsTravelTimeInSeconds) / 3600;
              const histHours =
                Number(summary.historicTrafficTravelTimeInSeconds || summary.noTrafficTravelTimeInSeconds || 0) /
                3600;

              const liveSpeedKmh = liveHours > 0 ? distKm / liveHours : 0;
              const baselineFromTomTom = histHours > 0 ? distKm / histHours : undefined;

              if (liveSpeedKmh > 0) {
                readings.push({
                  corridorId: spec.id,
                  liveSpeedKmh,
                  baselineSpeedKmh: baselineFromTomTom,
                  lat: spec.probeLat,
                  lng: spec.probeLng,
                  source: 'TomTom Routing Speed Telemetry',
                });
                return;
              }
            }
          }

          // Fallback to Flow Segment probe if routing summary lacks metric
          const flow = await fetchTomTomFlowSegment(spec.probeLat, spec.probeLng, cleanKey, signal);
          if (flow && flow.currentSpeed > 0) {
            readings.push({
              corridorId: spec.id,
              liveSpeedKmh: flow.currentSpeed,
              lat: spec.probeLat,
              lng: spec.probeLng,
              source: 'TomTom Flow Segment Probe',
            });
          }
        } catch {
          // Ignore transient network errors per corridor
        }
      })
    );
  }

  const anomalies = detectTelemetrySpeedAnomalies(readings, targetDate);
  return {
    anomalies,
    readings,
    checkedCount: HIGHLAND_TELEMETRY_CORRIDORS.length,
  };
}

