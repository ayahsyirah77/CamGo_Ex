import { CamgoHazard, Language } from '../types';

export type FeederCorridorId =
  | 'simpang_pulai_ft185'
  | 'gua_musang_lojing_ft185'
  | 'tapah_ft59'
  | 'sungai_koyan_ft102';

export type SpineNodeId = 'ringlet' | 'tanah_rata' | 'brinchang' | 'kea_farm';

export type IncidentScenarioId =
  | 'scenario_1_tanah_rata_brinchang'
  | 'scenario_2_brinchang_kea_farm_tringkap'
  | 'scenario_3_ringlet_tanah_rata'
  | 'scenario_4_entry_exit_highway';

export interface FeederCorridorSpec {
  id: FeederCorridorId;
  name: string;
  routeCode: string;
  entryJunction: string;
  climbLagMinRange: [number, number];
  climbLagMins: number;
  capacityVehPerHr: number; // C_i
  gammaAscentShare: number; // gamma_i
  beta: number; // BPR exponent (typically 4)
  freeFlowDurationSecs: number; // t_free (HERE Routing v8 baseDuration)
  /** Ordered wave weights along central spine nodes at climb arrival */
  spineWeights: Record<SpineNodeId, number>;
}

export interface FeederCorridorFlowInput {
  corridorId: FeederCorridorId;
  /** HERE Routing v8 duration or live/historical travel time in seconds */
  currentDurationSecs?: number;
  /** HERE Routing v8 baseDuration / free-flow duration in seconds */
  freeFlowDurationSecs?: number;
  source?: 'here_routing_v8' | 'tomtom_live' | 'historical_baseline';
}

export interface FeederCorridorResult {
  id: FeederCorridorId;
  name: string;
  routeCode: string;
  entryJunction: string;
  climbLagMinRange: [number, number];
  climbLagMins: number;
  currentDurationSecs: number;
  freeFlowDurationSecs: number;
  bprRawVi: number; // Raw V_i computed from modified BPR delay curve (veh/hr)
  historicalBaselineVi: number; // Calendar baseline veh/hr
  effectiveVi: number; // Final capped V_i (veh/hr)
  isIncidentCapped: boolean;
  cappingHazardTitle?: string;
  source: 'here_routing_v8' | 'tomtom_live' | 'historical_baseline';
}

export interface SpineWaveHorizon {
  offsetHours: 1 | 2 | 3;
  predictedVehPerHr: number;
  predictedSpeedKmh: number;
  addedDelayMins: number;
  status: 'clear' | 'moderate' | 'heavy' | 'gridlock';
}

export interface SpineNodeForecast {
  id: SpineNodeId;
  name: string;
  routeCode: 'FT59';
  lat: number;
  lng: number;
  capacityVehPerHr: number;
  currentBaselineVehPerHr: number;
  horizons: [SpineWaveHorizon, SpineWaveHorizon, SpineWaveHorizon]; // +1h, +2h, +3h
}

export interface SpatialTemporalNetworkModel {
  generatedAt: string;
  topologySummary: string;
  topologySummaryBm: string;
  anyIncidentCapped: boolean;
  cappedCorridors: string[];
  feeders: FeederCorridorResult[];
  spineNodes: SpineNodeForecast[];
  peakWaveHorizon: '+1h' | '+2h' | '+3h';
  peakSpineNodeName: string;
}

export interface IntraHighlandIncidentAdvisory {
  scenarioId: IncidentScenarioId;
  scenarioLabel: string;
  scenarioLabelBm: string;
  /** Block 1: Incident Status & Exact Location */
  incidentStatusLocation: string;
  incidentStatusLocationBm: string;
  /** Block 2: Alternative Route Availability Badge */
  alternativeRouteAvailable: boolean;
  availabilityBadge: 'ALTERNATIVE ROUTE AVAILABLE' | 'NO PARALLEL BYPASS — SINGLE SPINE ROAD';
  availabilityBadgeBm: 'LALUAN ALTERNATIF TERSEDIA' | 'TIADA LALUAN PINTAS — JALAN TUNGGAL';
  badgeTone: 'green' | 'amber' | 'red';
  vehicleRestrictionNote?: string;
  vehicleRestrictionNoteBm?: string;
  /** Block 3: Exact Reroute / Gateway Switch */
  exactReroute: string;
  exactRerouteBm: string;
  /** Block 4: What to Do & Where to Go Nearby */
  whatToDoWhereToGo: string;
  whatToDoWhereToGoBm: string;
  safeWaitingSpots: string[];
  safeExitGateways: string[];
}

export const CAMERON_FEEDER_CORRIDORS: FeederCorridorSpec[] = [
  {
    id: 'simpang_pulai_ft185',
    name: 'Simpang Pulai (FT185)',
    routeCode: 'FT185',
    entryJunction: 'Kampung Raja / Blue Valley',
    climbLagMinRange: [45, 55],
    climbLagMins: 50,
    capacityVehPerHr: 1450,
    gammaAscentShare: 0.72,
    beta: 4,
    freeFlowDurationSecs: 3000, // 50 min free-flow ascent
    spineWeights: {
      kea_farm: 1.0,
      brinchang: 0.85,
      tanah_rata: 0.55,
      ringlet: 0.25,
    },
  },
  {
    id: 'gua_musang_lojing_ft185',
    name: 'Gua Musang / Lojing (FT185)',
    routeCode: 'FT185',
    entryJunction: 'Kampung Raja / Blue Valley',
    climbLagMinRange: [35, 45],
    climbLagMins: 40,
    capacityVehPerHr: 1100,
    gammaAscentShare: 0.65,
    beta: 4,
    freeFlowDurationSecs: 2400, // 40 min free-flow ascent
    spineWeights: {
      kea_farm: 1.0,
      brinchang: 0.75,
      tanah_rata: 0.45,
      ringlet: 0.2,
    },
  },
  {
    id: 'tapah_ft59',
    name: 'Tapah (FT59)',
    routeCode: 'FT59',
    entryJunction: 'Ringlet',
    climbLagMinRange: [60, 75],
    climbLagMins: 68,
    capacityVehPerHr: 650,
    gammaAscentShare: 0.74,
    beta: 4,
    freeFlowDurationSecs: 4080, // 68 min free-flow ascent
    spineWeights: {
      ringlet: 1.0,
      tanah_rata: 0.9,
      brinchang: 0.65,
      kea_farm: 0.45,
    },
  },
  {
    id: 'sungai_koyan_ft102',
    name: 'Sungai Koyan (FT102)',
    routeCode: 'FT102',
    entryJunction: 'Ringlet',
    climbLagMinRange: [40, 50],
    climbLagMins: 45,
    capacityVehPerHr: 1350,
    gammaAscentShare: 0.68,
    beta: 4,
    freeFlowDurationSecs: 2700, // 45 min free-flow ascent
    spineWeights: {
      ringlet: 1.0,
      tanah_rata: 0.85,
      brinchang: 0.6,
      kea_farm: 0.4,
    },
  },
];

export const CENTRAL_SPINE_NODES: Array<{
  id: SpineNodeId;
  name: string;
  lat: number;
  lng: number;
  capacityVehPerHr: number;
  freeFlowSpeedKmh: number;
}> = [
  {
    id: 'ringlet',
    name: 'Ringlet',
    lat: 4.4147,
    lng: 101.382,
    capacityVehPerHr: 920,
    freeFlowSpeedKmh: 50,
  },
  {
    id: 'tanah_rata',
    name: 'Tanah Rata',
    lat: 4.4715,
    lng: 101.3805,
    capacityVehPerHr: 840,
    freeFlowSpeedKmh: 45,
  },
  {
    id: 'brinchang',
    name: 'Brinchang',
    lat: 4.4905,
    lng: 101.3892,
    capacityVehPerHr: 780,
    freeFlowSpeedKmh: 42,
  },
  {
    id: 'kea_farm',
    name: 'Kea Farm',
    lat: 4.5028,
    lng: 101.4072,
    capacityVehPerHr: 640,
    freeFlowSpeedKmh: 38,
  },
];

/**
 * Computes modified BPR (Bureau of Public Roads) estimated vehicle ascent rate:
 * V_i = C_i * gamma_i * (max(0, t_current - t_free) / (0.15 * t_free))^(1 / beta)
 */
export function computeModifiedBprAscentRate(params: {
  capacityVehPerHr: number;
  gammaAscentShare: number;
  currentDurationSecs: number;
  freeFlowDurationSecs: number;
  beta?: number;
}): number {
  const {
    capacityVehPerHr,
    gammaAscentShare,
    currentDurationSecs,
    freeFlowDurationSecs,
    beta = 4,
  } = params;

  if (
    !Number.isFinite(capacityVehPerHr) ||
    capacityVehPerHr <= 0 ||
    !Number.isFinite(freeFlowDurationSecs) ||
    freeFlowDurationSecs <= 0
  ) {
    return 0;
  }

  const delaySecs = Math.max(0, currentDurationSecs - freeFlowDurationSecs);
  if (delaySecs === 0) return 0;

  const ratio = delaySecs / (0.15 * freeFlowDurationSecs);
  const raw = capacityVehPerHr * gammaAscentShare * Math.pow(ratio, 1 / Math.max(1, beta));
  return Math.round(raw);
}

/**
 * Historical calendar baseline ascent rate (veh/hr) for a corridor based on Malaysia time-of-day
 * and weekend/weekday pattern. Used both as nominal flow fallback and as the Incident Cap Guardrail.
 */
export function getHistoricalCalendarBaselineVi(
  spec: FeederCorridorSpec,
  targetDate: Date = new Date()
): number {
  const hour = targetDate.getHours() + targetDate.getMinutes() / 60;
  const day = targetDate.getDay(); // 0=Sun, 5=Fri, 6=Sat
  const isWeekend = day === 0 || day === 6;
  const isFridayRush = day === 5 && hour >= 15;

  let utilization = 0.24;
  if (hour >= 22.5 || hour < 6.0) {
    utilization = 0.08;
  } else if (isWeekend && hour >= 8.5 && hour <= 14.5) {
    utilization = 0.62;
  } else if (isWeekend && hour > 14.5 && hour <= 18.5) {
    utilization = 0.48;
  } else if (isFridayRush && hour <= 20.5) {
    utilization = 0.46;
  } else if (hour >= 8.0 && hour <= 16.5) {
    utilization = 0.34;
  }

  return Math.round(spec.capacityVehPerHr * spec.gammaAscentShare * utilization);
}

function getDefaultCalibratedDurationSecs(
  spec: FeederCorridorSpec,
  targetDate: Date
): number {
  const hour = targetDate.getHours() + targetDate.getMinutes() / 60;
  const day = targetDate.getDay();
  const isWeekend = day === 0 || day === 6;

  let congestionMultiplier = 1.03;
  if (hour >= 22.5 || hour < 6.0) {
    congestionMultiplier = 1.0;
  } else if (isWeekend && hour >= 9.0 && hour <= 15.5) {
    congestionMultiplier = spec.id === 'tapah_ft59' ? 1.38 : spec.id === 'simpang_pulai_ft185' ? 1.24 : 1.14;
  } else if (hour >= 9.0 && hour <= 17.0) {
    congestionMultiplier = spec.id === 'tapah_ft59' ? 1.16 : 1.08;
  }
  return Math.round(spec.freeFlowDurationSecs * congestionMultiplier);
}

function matchesFeederCorridorHazard(
  hazard: CamgoHazard,
  corridorId: FeederCorridorId
): boolean {
  if (!hazard || hazard.status === 'cleared') return false;
  const text = `${hazard.title || ''} ${hazard.location || ''} ${hazard.corridor || ''} ${hazard.description || ''}`.toLowerCase();
  const type = String(hazard.type || '').toLowerCase();

  const isBlockingOrRoadwork =
    type === 'accident' ||
    type === 'landslide' ||
    type === 'fallen_tree' ||
    type === 'roadblock' ||
    type === 'road_closure' ||
    type === 'closure' ||
    type === 'flood_or_fallen_tree' ||
    text.includes('accident') ||
    text.includes('kemalangan') ||
    text.includes('landslide') ||
    text.includes('tanah runtuh') ||
    text.includes('fallen tree') ||
    text.includes('pokok tumbang') ||
    text.includes('roadwork') ||
    text.includes('single-lane') ||
    text.includes('1-lane') ||
    text.includes('one lane') ||
    text.includes('satu lorong');

  if (!isBlockingOrRoadwork) return false;

  const lat = Number(hazard.lat);
  const lng = Number(hazard.lng);

  switch (corridorId) {
    case 'simpang_pulai_ft185':
      return (
        text.includes('simpang pulai') ||
        text.includes('pos slim') ||
        text.includes('pos terisu') ||
        text.includes('ft185') ||
        text.includes('ft 185') ||
        (hazard.corridor === 'simpang_pulai_ft185') ||
        (hazard.corridor === 'simpang-pulai') ||
        (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 4.53 && lng <= 101.39)
      );
    case 'gua_musang_lojing_ft185':
      return (
        text.includes('gua musang') ||
        text.includes('lojing') ||
        text.includes('blue valley')
      );
    case 'tapah_ft59':
      return (
        text.includes('tapah') ||
        text.includes('lata iskandar') ||
        text.includes('batu 14') ||
        text.includes('kuala woh') ||
        hazard.corridor === 'tapah_ft59' ||
        hazard.corridor === 'tapah' ||
        (Number.isFinite(lat) && lat > 0 && lat < 4.408 && lng < 101.43)
      );
    case 'sungai_koyan_ft102':
      return (
        text.includes('sungai koyan') ||
        text.includes('sg koyan') ||
        text.includes('pos betau') ||
        text.includes('ft102') ||
        text.includes('ft 102') ||
        hazard.corridor === 'sungai_koyan_ft102' ||
        hazard.corridor === 'sungai-koyan' ||
        (Number.isFinite(lng) && lng > 101.43 && lat < 4.46)
      );
    default:
      return false;
  }
}

/**
 * Evaluates the Cameron Highlands Single-Spine FT59 + 4 Upstream Feeder Corridors model
 * with Modified BPR inflow rates, Incident Cap Guardrails, and +1h / +2h / +3h lagged wave propagation.
 */
export function evaluateSpatialTemporalNetwork(options: {
  targetDate?: Date;
  hazards?: CamgoHazard[];
  corridorInputs?: FeederCorridorFlowInput[];
} = {}): SpatialTemporalNetworkModel {
  const targetDate = options.targetDate || new Date();
  const hazards = options.hazards || [];
  const inputsMap = new Map<FeederCorridorId, FeederCorridorFlowInput>();
  (options.corridorInputs || []).forEach((inp) => inputsMap.set(inp.corridorId, inp));

  const feeders: FeederCorridorResult[] = CAMERON_FEEDER_CORRIDORS.map((spec) => {
    const inp = inputsMap.get(spec.id);
    const freeFlowDurationSecs =
      inp?.freeFlowDurationSecs && inp.freeFlowDurationSecs > 0
        ? inp.freeFlowDurationSecs
        : spec.freeFlowDurationSecs;
    const currentDurationSecs =
      inp?.currentDurationSecs && inp.currentDurationSecs > 0
        ? inp.currentDurationSecs
        : getDefaultCalibratedDurationSecs(spec, targetDate);

    const bprRawVi = computeModifiedBprAscentRate({
      capacityVehPerHr: spec.capacityVehPerHr,
      gammaAscentShare: spec.gammaAscentShare,
      currentDurationSecs,
      freeFlowDurationSecs,
      beta: spec.beta,
    });

    const historicalBaselineVi = getHistoricalCalendarBaselineVi(spec, targetDate);

    // If current travel time <= free-flow, no congestion surge above baseline
    const unCappedVi = bprRawVi > 0 ? Math.max(historicalBaselineVi, bprRawVi) : historicalBaselineVi;

    const matchingHazard = hazards.find((h) => matchesFeederCorridorHazard(h, spec.id));
    const isIncidentCapped = Boolean(matchingHazard);

    // Incident Cap Guardrail: cap V_i at historical calendar baseline so a roadblock
    // does not falsely predict a massive tourist surge downstream.
    const effectiveVi = isIncidentCapped
      ? Math.min(unCappedVi, historicalBaselineVi)
      : unCappedVi;

    return {
      id: spec.id,
      name: spec.name,
      routeCode: spec.routeCode,
      entryJunction: spec.entryJunction,
      climbLagMinRange: spec.climbLagMinRange,
      climbLagMins: spec.climbLagMins,
      currentDurationSecs,
      freeFlowDurationSecs,
      bprRawVi,
      historicalBaselineVi,
      effectiveVi,
      isIncidentCapped,
      cappingHazardTitle: matchingHazard?.title,
      source: inp?.source || 'historical_baseline',
    };
  });

  // Propagate upstream waves forward (+1h, +2h, +3h) along FT59 Central Spine
  const spineNodes: SpineNodeForecast[] = CENTRAL_SPINE_NODES.map((node) => {
    const baseHour = targetDate.getHours() + targetDate.getMinutes() / 60;
    const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;
    const baseRatio =
      baseHour >= 22.5 || baseHour < 6.0
        ? 0.14
        : isWeekend && baseHour >= 9.5 && baseHour <= 17.5
          ? 0.56
          : 0.34;
    const currentBaselineVehPerHr = Math.round(node.capacityVehPerHr * baseRatio);

    const horizons = ([1, 2, 3] as const).map((offsetHours) => {
      const lookaheadMinutes = offsetHours * 60;
      let incomingWaveVeh = 0;

      feeders.forEach((feeder) => {
        const spec = CAMERON_FEEDER_CORRIDORS.find((s) => s.id === feeder.id)!;
        const spineWeight = spec.spineWeights[node.id] || 0.2;

        // Arrival window alignment:
        // Southern feeders (Tapah/Sg Koyan) hit Ringlet at ~lag, Tanah Rata ~lag+15m, Brinchang ~lag+35m, Kea Farm ~lag+55m
        // Northern feeders (Simpang Pulai/Gua Musang) hit Kea Farm at ~lag, Brinchang ~lag+15m, Tanah Rata ~lag+35m, Ringlet ~lag+55m
        const isNorthFeeder =
          spec.id === 'simpang_pulai_ft185' || spec.id === 'gua_musang_lojing_ft185';
        const intraSpineHopMins = isNorthFeeder
          ? node.id === 'kea_farm'
            ? 0
            : node.id === 'brinchang'
              ? 18
              : node.id === 'tanah_rata'
                ? 36
                : 58
          : node.id === 'ringlet'
            ? 0
            : node.id === 'tanah_rata'
              ? 20
              : node.id === 'brinchang'
                ? 38
                : 55;

        const arrivalMins = spec.climbLagMins + intraSpineHopMins;
        // Gaussian-style pulse alignment around +1h (60m), +2h (120m), +3h (180m)
        const distFromHorizon = Math.abs(lookaheadMinutes - arrivalMins);
        const lagAlignment = Math.max(0.28, 1 - distFromHorizon / 160);
        // Secondary decay across 2-3 hours as traffic disperses into town parking
        const dispersionDecay = offsetHours === 1 ? 0.52 : offsetHours === 2 ? 0.44 : 0.32;

        incomingWaveVeh += feeder.effectiveVi * spineWeight * lagAlignment * dispersionDecay;
      });

      // Local town churn factor (highest at Kea Farm & Brinchang during daytime)
      const horizonHour = (baseHour + offsetHours) % 24;
      const localPressureFactor =
        horizonHour >= 22.0 || horizonHour < 6.5
          ? 0.38
          : isWeekend && horizonHour >= 10.0 && horizonHour <= 17.5
            ? 1.15
            : horizonHour >= 11.0 && horizonHour <= 18.0
              ? 0.92
              : 0.65;

      const predictedVehPerHr = Math.round(
        (currentBaselineVehPerHr * 0.45 + incomingWaveVeh) * localPressureFactor
      );

      // Standard forward BPR travel-time multiplier on central spine link
      const vOverC = Math.max(0, predictedVehPerHr / Math.max(1, node.capacityVehPerHr));
      const bprFactor = 1 + 0.15 * Math.pow(vOverC, 4);
      const predictedSpeedKmh = Math.max(
        7,
        Math.min(node.freeFlowSpeedKmh, Math.round(node.freeFlowSpeedKmh / Math.max(1, bprFactor * (1 + vOverC * 0.65))))
      );
      const addedDelayMins = Math.max(0, Math.round(((5 / predictedSpeedKmh) - (5 / node.freeFlowSpeedKmh)) * 60));

      const status: SpineWaveHorizon['status'] =
        predictedSpeedKmh < 14
          ? 'gridlock'
          : predictedSpeedKmh < 24
            ? 'heavy'
            : predictedSpeedKmh < 34
              ? 'moderate'
              : 'clear';

      return {
        offsetHours,
        predictedVehPerHr,
        predictedSpeedKmh,
        addedDelayMins,
        status,
      };
    }) as [SpineWaveHorizon, SpineWaveHorizon, SpineWaveHorizon];

    return {
      id: node.id,
      name: node.name,
      routeCode: 'FT59',
      lat: node.lat,
      lng: node.lng,
      capacityVehPerHr: node.capacityVehPerHr,
      currentBaselineVehPerHr,
      horizons,
    };
  });

  // Identify peak forecasted bottleneck node & horizon
  let maxDelay = -1;
  let peakHorizon: '+1h' | '+2h' | '+3h' = '+1h';
  let peakNodeName = 'Kea Farm';
  spineNodes.forEach((n) => {
    n.horizons.forEach((h) => {
      if (h.addedDelayMins > maxDelay) {
        maxDelay = h.addedDelayMins;
        peakHorizon = `+${h.offsetHours}h` as '+1h' | '+2h' | '+3h';
        peakNodeName = n.name;
      }
    });
  });

  const cappedCorridors = feeders.filter((f) => f.isIncidentCapped).map((f) => f.name);

  return {
    generatedAt: targetDate.toISOString(),
    topologySummary:
      'Single-Spine Linear Bottleneck (FT59: Ringlet ↔ Tanah Rata ↔ Brinchang ↔ Kea Farm) fed by 4 upstream corridors (FT185 Simpang Pulai, FT185 Gua Musang/Lojing, FT59 Tapah, FT102 Sungai Koyan).',
    topologySummaryBm:
      'Rangkaian Tulang Belakang Tunggal (FT59: Ringlet ↔ Tanah Rata ↔ Brinchang ↔ Kea Farm) disuap oleh 4 koridor masuk (FT185 Simpang Pulai, FT185 Gua Musang/Lojing, FT59 Tapah, FT102 Sungai Koyan).',
    anyIncidentCapped: cappedCorridors.length > 0,
    cappedCorridors,
    feeders,
    spineNodes,
    peakWaveHorizon: peakHorizon,
    peakSpineNodeName: peakNodeName,
  };
}

/**
 * Evaluates a specific hazard/incident's exact coordinates and context against the true
 * Cameron Highlands paved road network (FT59, FT185, FT102, and Golden Hills light-vehicle link).
 * Never invents fake parallel highways or suggests BOH Sungai Palas estate tracks as through-routes.
 */
export function evaluateIntraHighlandIncidentAdvisory(hazard: {
  title?: string;
  titleBm?: string;
  type?: CamgoHazard['type'] | string;
  severity?: CamgoHazard['severity'] | string;
  location?: string;
  corridor?: string;
  lat: number;
  lng: number;
  description?: string;
}): IntraHighlandIncidentAdvisory {
  const lat = Number(hazard.lat);
  const lng = Number(hazard.lng);
  const text = `${hazard.location || ''} ${hazard.title || ''} ${hazard.corridor || ''} ${hazard.description || ''}`.toLowerCase();

  const hazardTypeLabelEn =
    hazard.type === 'fallen_tree'
      ? 'Fallen Tree'
      : hazard.type === 'landslide'
        ? 'Landslide / Slope Hazard'
        : hazard.type === 'accident'
          ? 'Road Accident'
          : hazard.type === 'roadblock'
            ? 'Roadblock / Closure'
            : hazard.type === 'flood'
              ? 'Flash Flood'
              : 'Heavy Congestion';

  const hazardTypeLabelBm =
    hazard.type === 'fallen_tree'
      ? 'Pokok Tumbang'
      : hazard.type === 'landslide'
        ? 'Tanah Runtuh / Cerun'
        : hazard.type === 'accident'
          ? 'Kemalangan Jalan Raya'
          : hazard.type === 'roadblock'
            ? 'Sekatan / Penutupan Jalan'
            : hazard.type === 'flood'
              ? 'Banjir Kilat'
              : 'Kesesakan Teruk';

  const locDisplay = hazard.location || hazard.title || 'Cameron Highlands (FT59)';
  const statusLocEn = `Active Hazard: ${hazardTypeLabelEn} near ${locDisplay}`;
  const statusLocBm = `Amaran Aktif: ${hazardTypeLabelBm} berhampiran ${locDisplay}`;

  // Determine exact Scenario 1..4 based on true road topology and coordinates
  // Check Scenario 4 (Entry/Exit Highways) first:
  const isTapahGateway =
    text.includes('tapah') ||
    text.includes('lata iskandar') ||
    text.includes('batu 14') ||
    text.includes('batu 19') ||
    text.includes('kuala woh') ||
    (Number.isFinite(lat) && lat > 0 && lat < 4.408 && (!Number.isFinite(lng) || lng < 101.43));

  const isGuaMusangGateway =
    text.includes('gua musang') ||
    text.includes('lojing');

  const isSimpangPulaiGateway =
    text.includes('simpang pulai') ||
    text.includes('pos slim') ||
    text.includes('pos terisu') ||
    text.includes('blue valley') ||
    text.includes('kampung raja') ||
    text.includes('kg raja') ||
    text.includes('ft185') ||
    text.includes('ft 185') ||
    (Number.isFinite(lat) && lat >= 4.555);

  const isSungaiKoyanGateway =
    text.includes('sungai koyan') ||
    text.includes('sg koyan') ||
    text.includes('pos betau') ||
    text.includes('ft102') ||
    text.includes('ft 102') ||
    (Number.isFinite(lng) && lng > 101.43 && (!Number.isFinite(lat) || lat < 4.46));

  if (isTapahGateway || isGuaMusangGateway || isSimpangPulaiGateway || isSungaiKoyanGateway) {
    let gatewaySwitchEn = '';
    let gatewaySwitchBm = '';
    let safeExits: string[] = [];

    if (isTapahGateway) {
      gatewaySwitchEn =
        'Tapah (FT59) affected: Switch to Simpang Pulai (FT185) for North/South PLUS Highway access, or Sungai Koyan (FT102) for KL/Karak/East Coast.';
      gatewaySwitchBm =
        'Laluan Tapah (FT59) terjejas: Tukar ke Simpang Pulai (FT185) untuk akses Lebuhraya PLUS Utara/Selatan, atau Sungai Koyan (FT102) untuk KL/Karak/Pantai Timur.';
      safeExits = ['Simpang Pulai (FT185)', 'Sungai Koyan (FT102)'];
    } else if (isGuaMusangGateway) {
      gatewaySwitchEn =
        'Gua Musang / Lojing (FT185) affected: Detour via Kuala Lipis → Sungai Koyan (FT102) → Ringlet.';
      gatewaySwitchBm =
        'Laluan Gua Musang / Lojing (FT185) terjejas: Guna lencongan Kuala Lipis → Sungai Koyan (FT102) → Ringlet.';
      safeExits = ['Kuala Lipis → Sungai Koyan (FT102) → Ringlet', 'Tapah (FT59)'];
    } else if (isSimpangPulaiGateway) {
      gatewaySwitchEn =
        'Simpang Pulai (FT185) affected: Switch to Tapah (FT59) or Sungai Koyan (FT102).';
      gatewaySwitchBm =
        'Laluan Simpang Pulai (FT185) terjejas: Tukar ke Tapah (FT59) atau Sungai Koyan (FT102).';
      safeExits = ['Tapah (FT59)', 'Sungai Koyan (FT102)'];
    } else {
      gatewaySwitchEn =
        'Sungai Koyan (FT102) affected: Switch to Tapah (FT59) or Simpang Pulai (FT185).';
      gatewaySwitchBm =
        'Laluan Sungai Koyan (FT102) terjejas: Tukar ke Tapah (FT59) atau Simpang Pulai (FT185).';
      safeExits = ['Tapah (FT59)', 'Simpang Pulai (FT185)'];
    }

    return {
      scenarioId: 'scenario_4_entry_exit_highway',
      scenarioLabel: 'Scenario 4 — Entry/Exit Gateway Highway',
      scenarioLabelBm: 'Senario 4 — Lebuhraya Pintu Masuk/Keluar',
      incidentStatusLocation: statusLocEn,
      incidentStatusLocationBm: statusLocBm,
      alternativeRouteAvailable: true,
      availabilityBadge: 'ALTERNATIVE ROUTE AVAILABLE',
      availabilityBadgeBm: 'LALUAN ALTERNATIF TERSEDIA',
      badgeTone: 'green',
      vehicleRestrictionNote: 'Full Gateway Switch via paved federal highways (FT185 / FT59 / FT102).',
      vehicleRestrictionNoteBm: 'Penukaran Pintu Masuk Penuh melalui jalan persekutuan berturap (FT185 / FT59 / FT102).',
      exactReroute: gatewaySwitchEn,
      exactRerouteBm: gatewaySwitchBm,
      whatToDoWhereToGo:
        'Check your fuel level before committing to an alternate mountain exit. Nearest full-service petrol stations are at Ringlet, Tanah Rata, Brinchang, Kampung Raja, Tapah R&R, Simpang Pulai, and Sungai Koyan.',
      whatToDoWhereToGoBm:
        'Semak paras minyak sebelum mengambil laluan keluar gunung alternatif. Stesen minyak penuh terdekat terletak di Ringlet, Tanah Rata, Brinchang, Kampung Raja, R&R Tapah, Simpang Pulai, dan Sungai Koyan.',
      safeWaitingSpots: ['Ringlet', 'Tanah Rata', 'Brinchang', 'Kampung Raja', 'Tapah R&R', 'Simpang Pulai', 'Sungai Koyan'],
      safeExitGateways: safeExits,
    };
  }

  // Scenario 1: Between Tanah Rata & Brinchang (FT59 Main Stretch)
  const isTanahRataToBrinchang =
    text.includes('rosa passadena') ||
    text.includes('padang golf') ||
    text.includes('golf') ||
    text.includes('smoke house') ||
    text.includes('smokehouse') ||
    text.includes('golden hills') ||
    text.includes('pasar malam') ||
    text.includes('barrington') ||
    text.includes('sungai ruil') ||
    text.includes('sg ruil') ||
    text.includes('arcadia') ||
    text.includes('tanah rata') ||
    (Number.isFinite(lat) && lat >= 4.468 && lat < 4.493);

  // Scenario 2: Between Brinchang & Kea Farm / Tringkap (FT59)
  const isBrinchangToKeaFarmTringkap =
    text.includes('kea farm') ||
    text.includes('tringkap') ||
    text.includes('mossy') ||
    text.includes('gunung brinchang') ||
    text.includes('sungei palas') ||
    text.includes('sungai palas') ||
    text.includes('boh') ||
    text.includes('flora park') ||
    text.includes('sheep sanctuary') ||
    text.includes('butterfly') ||
    text.includes('copthorne') ||
    text.includes('cactus') ||
    text.includes('time tunnel') ||
    text.includes('big red') ||
    text.includes('kuala terla') ||
    (text.includes('brinchang') && !isTanahRataToBrinchang) ||
    (Number.isFinite(lat) && lat >= 4.493 && lat < 4.555);

  if (isBrinchangToKeaFarmTringkap) {
    return {
      scenarioId: 'scenario_2_brinchang_kea_farm_tringkap',
      scenarioLabel: 'Scenario 2 — Brinchang ↔ Kea Farm / Tringkap (FT59)',
      scenarioLabelBm: 'Senario 2 — Brinchang ↔ Kea Farm / Tringkap (FT59)',
      incidentStatusLocation: statusLocEn,
      incidentStatusLocationBm: statusLocBm,
      alternativeRouteAvailable: false,
      availabilityBadge: 'NO PARALLEL BYPASS — SINGLE SPINE ROAD',
      availabilityBadgeBm: 'TIADA LALUAN PINTAS — JALAN TUNGGAL',
      badgeTone: 'red',
      vehicleRestrictionNote:
        'Single paved spine road only. Do NOT attempt Sungai Palas BOH estate roads as a through-route (narrow single-lane dead-end plantation tracks).',
      vehicleRestrictionNoteBm:
        'Jalan tulang belakang tunggal sahaja. JANGAN guna jalan ladang BOH Sungai Palas sebagai jalan pintas (laluan ladang sempit satu lorong dan jalan mati).',
      exactReroute:
        'NO parallel paved bypass exists between Brinchang town and Kea Farm / Tringkap. Keep to paved FT59 or turn back toward Brinchang / Tanah Rata.',
      exactRerouteBm:
        'TIADA jalan pintas berturap selari antara pekan Brinchang dan Kea Farm / Tringkap. Kekal di jalan berturap FT59 atau patah balik ke Brinchang / Tanah Rata.',
      whatToDoWhereToGo:
        'Heading to Kea Farm / Mossy Forest / BOH Sungai Palas: Park at Brinchang town or your hotel and walk/take a local motorbike/shuttle, OR visit Time Tunnel Museum, Big Red Strawberry Farm, or Cactus Valley in Brinchang first and drive up to Kea Farm after 5:30 PM. Exiting northbound (Ipoh/Penang/KL): Wait at Brinchang commercial square; if FT59 is closed >2 hours, exit southbound via Tanah Rata → Ringlet → Tapah (FT59) or Sungai Koyan (FT102).',
      whatToDoWhereToGoBm:
        'Ke Kea Farm / Mossy Forest / BOH Sungai Palas: Parkir di pekan Brinchang atau hotel dan jalan kaki/naik motosikal/ulang-alik tempatan, ATAU lawati Time Tunnel Museum, Big Red Strawberry Farm, atau Cactus Valley di Brinchang dahulu dan naik ke Kea Farm selepas 5:30 petang. Keluar ke arah utara (Ipoh/Penang/KL): Tunggu di dataran komersial Brinchang; jika FT59 ditutup >2 jam, keluar ikut selatan melalui Tanah Rata → Ringlet → Tapah (FT59) atau Sungai Koyan (FT102).',
      safeWaitingSpots: [
        'Brinchang Commercial Square',
        'Time Tunnel Museum',
        'Big Red Strawberry Farm',
        'Cactus Valley Brinchang',
      ],
      safeExitGateways: [
        'Southbound: Tanah Rata → Ringlet → Tapah (FT59)',
        'Southbound: Tanah Rata → Ringlet → Sungai Koyan (FT102)',
      ],
    };
  }

  if (isTanahRataToBrinchang) {
    return {
      scenarioId: 'scenario_1_tanah_rata_brinchang',
      scenarioLabel: 'Scenario 1 — Tanah Rata ↔ Brinchang (FT59)',
      scenarioLabelBm: 'Senario 1 — Tanah Rata ↔ Brinchang (FT59)',
      incidentStatusLocation: statusLocEn,
      incidentStatusLocationBm: statusLocBm,
      alternativeRouteAvailable: true,
      availabilityBadge: 'ALTERNATIVE ROUTE AVAILABLE',
      availabilityBadgeBm: 'LALUAN ALTERNATIF TERSEDIA',
      badgeTone: 'amber',
      vehicleRestrictionNote:
        'Light Vehicles (Cars & MPVs) Only — Avoid tour buses & lorries; heavy weekend Pasar Malam congestion after 4:00 PM.',
      vehicleRestrictionNoteBm:
        'Kenderaan Ringan (Kereta & MPV) Sahaja — Elakkan bas persiaran & lori; sesak teruk Pasar Malam hujung minggu selepas 4:00 petang.',
      exactReroute:
        'Divert via Jalan Sungai Ruil / Jalan Golden Hills (Pasar Malam Brinchang road) connecting Tanah Rata (near Bharat Tea / Arcadia) into Brinchang town behind the golf course.',
      exactRerouteBm:
        'Lencong melalui Jalan Sungai Ruil / Jalan Golden Hills (jalan Pasar Malam Brinchang) yang menyambungkan Tanah Rata (berhampiran Bharat Tea / Arcadia) ke pekan Brinchang di belakang padang golf.',
      whatToDoWhereToGo:
        'If Golden Hills is also gridlocked, pull off safely at Tanah Rata Town (cafés, bank/ATM, rest stops) or Bharat Tea Plantation / Cameron Valley Tea House (if south of the incident) and wait 45–60 mins for JKR/police clearance instead of idling uphill on clutch/brakes.',
      whatToDoWhereToGoBm:
        'Jika Golden Hills turut sesak, berhenti dengan selamat di Pekan Tanah Rata (kafe, bank/ATM, kawasan rehat) atau Ladang Teh Bharat / Cameron Valley Tea House (jika di selatan insiden) dan tunggu 45–60 minit untuk kerja pembersihan JKR/polis daripada melahu di bukit.',
      safeWaitingSpots: [
        'Tanah Rata Town (Cafés, Bank/ATM, Rest Stops)',
        'Bharat Tea Plantation / Cameron Valley Tea House',
      ],
      safeExitGateways: [
        'South of incident: Ringlet → Tapah (FT59) / Sungai Koyan (FT102)',
        'North of incident: Brinchang → Kampung Raja → Simpang Pulai (FT185)',
      ],
    };
  }

  // Scenario 3: Between Ringlet & Tanah Rata (FT59, e.g. Habu / Bertam Valley Junction / Sultan Abu Bakar)
  return {
    scenarioId: 'scenario_3_ringlet_tanah_rata',
    scenarioLabel: 'Scenario 3 — Ringlet ↔ Tanah Rata (FT59)',
    scenarioLabelBm: 'Senario 3 — Ringlet ↔ Tanah Rata (FT59)',
    incidentStatusLocation: statusLocEn,
    incidentStatusLocationBm: statusLocBm,
    alternativeRouteAvailable: false,
    availabilityBadge: 'NO PARALLEL BYPASS — SINGLE SPINE ROAD',
    availabilityBadgeBm: 'TIADA LALUAN PINTAS — JALAN TUNGGAL',
    badgeTone: 'red',
    vehicleRestrictionNote:
      'Single-spine FT59 trunk road only — no parallel paved through-road exists between Ringlet and Tanah Rata.',
    vehicleRestrictionNoteBm:
      'Jalan tulang belakang FT59 tunggal sahaja — tiada jalan tembus berturap selari antara Ringlet dan Tanah Rata.',
    exactReroute:
      'NO parallel through-road exists between Ringlet and Tanah Rata (FT59). Choose your waiting point or highland exit based on whether you are South (Ringlet side) or North (Tanah Rata side) of the incident.',
    exactRerouteBm:
      'TIADA jalan tembus berturap selari antara Ringlet dan Tanah Rata (FT59). Pilih lokasi menunggu atau pintu keluar mengikut kedudukan anda di Selatan (sebelah Ringlet) atau Utara (sebelah Tanah Rata).',
    whatToDoWhereToGo:
      'If trapped SOUTH of incident (Ringlet side): Pull off at Ringlet Town (petrol stations, food stalls, clinics) or Cameron Valley Tea House 1 / 2, or exit immediately via Sungai Koyan (FT102) (Raub/Bentong/KL) or Tapah (FT59). If trapped NORTH of incident (Tanah Rata side): Stay in Tanah Rata Town; to leave immediately for Ipoh/KL/East Coast, drive north through Brinchang → Kampung Raja and exit via Simpang Pulai (FT185).',
    whatToDoWhereToGoBm:
      'Jika terperangkap di SELATAN insiden (sebelah Ringlet): Singgah di Pekan Ringlet (stesen minyak, gerai makan, klinik) atau Cameron Valley Tea House 1 / 2, atau keluar segera melalui Sungai Koyan (FT102) (ke Raub/Bentong/KL) atau Tapah (FT59). Jika terperangkap di UTARA insiden (sebelah Tanah Rata): Kekal di Pekan Tanah Rata; jika perlu keluar segera ke Ipoh/KL/Pantai Timur, pandu ke utara melalui Brinchang → Kampung Raja dan keluar melalui Simpang Pulai (FT185).',
    safeWaitingSpots: [
      'South (Ringlet side): Ringlet Town (Petrol, Food, Clinics) & Cameron Valley Tea House 1 / 2',
      'North (Tanah Rata side): Tanah Rata Town',
    ],
    safeExitGateways: [
      'South side exit: Sungai Koyan (FT102) or Tapah (FT59)',
      'North side exit: Brinchang → Kampung Raja → Simpang Pulai (FT185)',
    ],
  };
}

export function formatIncidentAdvisoryPlainText(
  advisory: IntraHighlandIncidentAdvisory,
  lang: Language = 'en'
): string {
  if (lang === 'bm') {
    return `${advisory.availabilityBadgeBm}: ${advisory.exactRerouteBm} ${advisory.whatToDoWhereToGoBm}`;
  }
  return `${advisory.availabilityBadge}: ${advisory.exactReroute} ${advisory.whatToDoWhereToGo}`;
}
