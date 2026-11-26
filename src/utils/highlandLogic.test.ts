import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseElevationToMeters,
  getElevationTier,
  isCurrentlyOpen,
  calculateTrafficSeverity,
  filterPlacesByQuery,
  calculateDistanceKm,
  calculateTravelTimeMins,
  applyHazardConsensusVote,
  calculateSosBackoffMs,
  buildNextSosRetryState,
} from './highlandLogic.ts';
import {
  normalizeCameronHazardLocation,
  extractMilestoneKm,
} from '../../server/hazardIngestion.ts';
import {
  detectTelemetrySpeedAnomalies,
} from '../services/tomtomTrafficService.ts';
import {
  normalizeNavigationText,
} from '../services/navigationTtsService.ts';
import {
  findStrictMsMyVoice,
} from '../services/voiceLocalizationService.ts';
import {
  CAMERON_TRAILS,
  CAMERON_TRAILS_GEOJSON,
  CAMERON_SUMMIT_TRAILS_GEOJSON,
} from '../data/trailsData.ts';



test('parseElevationToMeters converts formatted strings to integer', () => {
  assert.equal(parseElevationToMeters('1,560 m'), 1560);
  assert.equal(parseElevationToMeters('2,032m'), 2032);
  assert.equal(parseElevationToMeters('950 m'), 950);
  assert.equal(parseElevationToMeters('invalid'), 0);
});

test('getElevationTier correctly categorizes highland peaks, plateaus, and valleys', () => {
  assert.equal(getElevationTier('2,032 m'), 'Peak');
  assert.equal(getElevationTier('1,560 m'), 'Highland');
  assert.equal(getElevationTier('1,120 m'), 'Valley');
});

test('isCurrentlyOpen checks normal and 24h hours accurately', () => {
  const normalHours = {
    from: '08:30',
    to: '18:00',
    isOpen: true,
    isOpen24Hours: false,
  };

  assert.equal(isCurrentlyOpen(normalHours, '10:00'), true);
  assert.equal(isCurrentlyOpen(normalHours, '07:00'), false);
  assert.equal(isCurrentlyOpen(normalHours, '19:00'), false);

  const closedPlace = { ...normalHours, isOpen: false };
  assert.equal(isCurrentlyOpen(closedPlace, '12:00'), false);

  const twentyFourHours = {
    from: '00:00',
    to: '23:59',
    isOpen: true,
    isOpen24Hours: true,
  };
  assert.equal(isCurrentlyOpen(twentyFourHours, '03:15'), true);
});

test('calculateTrafficSeverity maps delay minutes correctly', () => {
  assert.equal(calculateTrafficSeverity(0), 'smooth');
  assert.equal(calculateTrafficSeverity(5), 'smooth');
  assert.equal(calculateTrafficSeverity(15), 'moderate');
  assert.equal(calculateTrafficSeverity(35), 'heavy');
});

test('filterPlacesByQuery matches name, description, township and tags', () => {
  const samplePlaces = [
    {
      name: 'BOH Sungei Palas Tea Centre',
      description: 'Iconic tea plantation with panoramic deck',
      township: 'Brinchang',
      tags: ['Tea', 'Scenic'],
    },
    {
      name: 'Water Crest Valley Steamboat',
      description: 'Fresh organic charcoal steamboat',
      township: 'Tringkap',
      tags: ['Steamboat', 'Organic'],
    },
  ];

  const searchBoh = filterPlacesByQuery(samplePlaces, 'BOH');
  assert.equal(searchBoh.length, 1);
  assert.equal(searchBoh[0].name, 'BOH Sungei Palas Tea Centre');

  const searchSteamboat = filterPlacesByQuery(samplePlaces, 'Steamboat');
  assert.equal(searchSteamboat.length, 1);
  assert.equal(searchSteamboat[0].name, 'Water Crest Valley Steamboat');

  const searchTown = filterPlacesByQuery(samplePlaces, 'tringkap');
  assert.equal(searchTown.length, 1);

  const searchAll = filterPlacesByQuery(samplePlaces, '');
  assert.equal(searchAll.length, 2);
});

test('calculateDistanceKm computes accurate Haversine distance between coords', () => {
  // Tanah Rata to Brinchang (~3.5 km)
  const tanahRata = { lat: 4.4715, lng: 101.3805 };
  const brinchang = { lat: 4.4905, lng: 101.3892 };
  const dist = calculateDistanceKm(tanahRata, brinchang);
  assert.ok(dist >= 2.0 && dist <= 3.5, `Distance was ${dist}`);

  // Same coord is 0
  assert.equal(calculateDistanceKm(tanahRata, tanahRata), 0);
});

test('calculateTravelTimeMins computes realistic winding mountain drive times', () => {
  assert.equal(calculateTravelTimeMins(0), 0);
  assert.equal(calculateTravelTimeMins(0.05), 0);
  // 3 km on mountain road
  const mins3km = calculateTravelTimeMins(3);
  assert.ok(mins3km >= 8 && mins3km <= 15, `3km drive time was ${mins3km}`);
  // 10 km on mountain road
  const mins10km = calculateTravelTimeMins(10);
  assert.ok(mins10km >= 20 && mins10km <= 30, `10km drive time was ${mins10km}`);
});

test('normalizeCameronHazardLocation maps KM milestones & highland landmarks within CH bounds', () => {
  assert.equal(extractMilestoneKm('Tanah runtuh di KM 43 Jalan Tapah-Ringlet'), 43);

  const km43 = normalizeCameronHazardLocation('Jalan Tapah-Ringlet', 43, 'Tanah runtuh di KM 43 Jalan Tapah-Ringlet');
  assert.equal(km43.corridor, 'tapah_ft59');
  assert.equal(km43.milestoneKm, 43);
  assert.ok(km43.lat >= 4.30 && km43.lat <= 4.42, `KM 43 lat unexpected: ${km43.lat}`);
  assert.ok(km43.lng >= 101.32 && km43.lng <= 101.38, `KM 43 lng unexpected: ${km43.lng}`);

  const keaFarm = normalizeCameronHazardLocation('Kea Farm', null, 'Pokok tumbang near Kea Farm');
  assert.equal(keaFarm.corridor, 'central_highlands');
  assert.ok(Math.abs(keaFarm.lat - 4.5028) < 0.01);
});

test('Module A: applyHazardConsensusVote expires hazard after 3 Cleared votes', () => {
  let hazard: any = {
    id: 'test-haz-1',
    title: 'Fallen tree near Kea Farm',
    description: 'Blocking one lane',
    type: 'fallen_tree',
    severity: 'high',
    location: 'Kea Farm',
    lat: 4.5028,
    lng: 101.4072,
    source: 'Telegram',
    status: 'active',
    stillThereVotes: 0,
    clearedVotes: 0,
    timestamp: new Date().toISOString(),
  };

  hazard = applyHazardConsensusVote(hazard, 'still_there');
  assert.equal(hazard.stillThereVotes, 1);
  assert.equal(hazard.status, 'active');

  hazard = applyHazardConsensusVote(hazard, 'cleared');
  assert.equal(hazard.clearedVotes, 1);
  assert.equal(hazard.status, 'active');

  hazard = applyHazardConsensusVote(hazard, 'cleared');
  assert.equal(hazard.clearedVotes, 2);
  assert.equal(hazard.status, 'active');

  // 3rd Cleared vote automatically triggers expiry
  hazard = applyHazardConsensusVote(hazard, 'cleared');
  assert.equal(hazard.clearedVotes, 3);
  assert.equal(hazard.status, 'cleared');
  assert.ok(Boolean(hazard.clearedAt));
});

test('Module B: detectTelemetrySpeedAnomalies flags >= 70% speed drop vs baseline', () => {
  const sampleDate = new Date('2026-11-15T10:00:00Z');
  const anomalies = detectTelemetrySpeedAnomalies(
    [
      // 75% drop: 10 km/h vs 40 km/h baseline -> MUST trigger
      {
        corridorId: 'telemetry-ringlet-tanah-rata',
        liveSpeedKmh: 10,
        baselineSpeedKmh: 40,
      },
      // 40% drop: 24 km/h vs 40 km/h baseline -> MUST NOT trigger
      {
        corridorId: 'telemetry-tanah-rata-brinchang',
        liveSpeedKmh: 24,
        baselineSpeedKmh: 40,
      },
    ],
    sampleDate
  );

  assert.equal(anomalies.length, 1);
  assert.equal(anomalies[0].type, 'sudden_congestion');
  assert.equal(anomalies[0].isProvisional, true);
  assert.equal(anomalies[0].speedDropPercent, 75);
});

test('Offline SOS Retry Backoff: calculateSosBackoffMs scales exponentially and caps at 5 minutes', () => {
  assert.equal(calculateSosBackoffMs(1), 5000);
  assert.equal(calculateSosBackoffMs(2), 10000);
  assert.equal(calculateSosBackoffMs(3), 20000);
  assert.equal(calculateSosBackoffMs(4), 40000);
  assert.equal(calculateSosBackoffMs(10), 300000);

  const initialPacket = {
    id: 'sos-offline-test',
    lat: 4.4734,
    lng: 101.3787,
    attempts: 0,
    status: 'queued',
  };

  const now = 1_700_000_000_000;
  const retry1 = buildNextSosRetryState(initialPacket, 'Network dropped', now);
  assert.equal(retry1.attempts, 1);
  assert.equal(retry1.status, 'retry_scheduled');
  assert.equal(retry1.nextRetryAt, now + 5000);
  assert.equal(retry1.lastError, 'Network dropped');

  const retry2 = buildNextSosRetryState(retry1, 'Timeout mid-sync', now + 5000);
  assert.equal(retry2.attempts, 2);
  assert.equal(retry2.nextRetryAt, now + 5000 + 10000);
});

test('Navigation Text Normalization Utility: expands abbreviations and smooths landmarks for TTS', () => {
  const rawBm = 'Belok Kanan di KM 45 Jln Tapah - Ringlet & terus ke Kea Farm.';
  const normBm = normalizeNavigationText(rawBm, 'bm');
  assert.ok(normBm.includes('kilometer'));
  assert.ok(normBm.includes('Jalan'));
  assert.ok(normBm.includes('dan'));
  assert.ok(normBm.includes('Ki Faam'));

  const rawEn = 'Turn left at KM 12 FT 59 near Mossy Forest.';
  const normEn = normalizeNavigationText(rawEn, 'en');
  assert.ok(normEn.includes('kilometers'));
  assert.ok(normEn.includes('Federal Route 59'));
});

test('Strict Voice Matcher: finds ms-MY voice while strictly rejecting id-ID Indonesian accents', () => {
  const mockVoices = [
    { name: 'Indonesian Voice', lang: 'id-ID' } as SpeechSynthesisVoice,
    { name: 'English Voice', lang: 'en-US' } as SpeechSynthesisVoice,
    { name: 'Malaysian Voice', lang: 'ms-MY' } as SpeechSynthesisVoice,
  ];

  const matched = findStrictMsMyVoice(mockVoices);
  assert.ok(matched);
  assert.equal(matched?.lang, 'ms-MY');

  const idOnlyVoices = [
    { name: 'Indonesian Voice 1', lang: 'id-ID' } as SpeechSynthesisVoice,
    { name: 'Indonesian Voice 2', lang: 'id' } as SpeechSynthesisVoice,
    { name: 'Google Bahasa Indonesia', lang: 'en-US' } as SpeechSynthesisVoice,
  ];
  const matchedId = findStrictMsMyVoice(idOnlyVoices);
  assert.equal(matchedId, null);

  const androidUnderscoreVoices = [
    { name: 'Android Bahasa Melayu', lang: 'ms_MY' } as SpeechSynthesisVoice,
  ];
  const matchedUnderscore = findStrictMsMyVoice(androidUnderscoreVoices);
  assert.ok(matchedUnderscore);
  assert.equal(matchedUnderscore?.lang, 'ms_MY');
});

test('Cameron Trails Module: includes Gunung Irau, Gunung Siku, Gunung Jasar, and Admin Test FT59 road routes with valid GeoJSON', () => {
  assert.equal(CAMERON_TRAILS.length, 17);

  const jasar = CAMERON_TRAILS.find((t) => t.id === 'trail-10');
  const irau = CAMERON_TRAILS.find((t) => t.id === 'trail-14');
  const siku = CAMERON_TRAILS.find((t) => t.id === 'trail-15');
  const adminTrBr = CAMERON_TRAILS.find((t) => t.id === 'admin-test-tanah-rata-brinchang');
  const adminKeaBr = CAMERON_TRAILS.find((t) => t.id === 'admin-test-kea-farm-brinchang');

  assert.ok(jasar && jasar.maxElevationM === 1696);
  assert.ok(irau && irau.maxElevationM === 2110);
  assert.ok(siku && siku.maxElevationM === 1916);
  assert.ok(adminTrBr && adminTrBr.isAdminTest && adminTrBr.coordinates.length >= 6);
  assert.ok(adminKeaBr && adminKeaBr.isAdminTest && adminKeaBr.coordinates.length >= 6);
  assert.deepEqual(adminTrBr?.coordinates[0], [4.4718, 101.3766]);
  assert.deepEqual(adminTrBr?.peakCoordinates, [4.4926, 101.3879]);
  assert.deepEqual(adminKeaBr?.coordinates[0], [4.5028, 101.4092]);
  assert.deepEqual(adminKeaBr?.peakCoordinates, [4.4926, 101.3879]);

  assert.equal(CAMERON_TRAILS_GEOJSON.features.length, 34);
  assert.equal(CAMERON_SUMMIT_TRAILS_GEOJSON.type, 'FeatureCollection');
  assert.equal(CAMERON_SUMMIT_TRAILS_GEOJSON.features.length, 6);

  const trailFeatures = CAMERON_SUMMIT_TRAILS_GEOJSON.features.filter(
    (f) => f.properties.type === 'trail'
  );
  const peakFeatures = CAMERON_SUMMIT_TRAILS_GEOJSON.features.filter(
    (f) => f.properties.type === 'peak'
  );

  assert.equal(trailFeatures.length, 3);
  assert.equal(peakFeatures.length, 3);

  for (const trailFeature of trailFeatures) {
    assert.equal(trailFeature.geometry.type, 'LineString');
    assert.ok(trailFeature.geometry.coordinates.length >= 6);
    assert.match(trailFeature.properties.color, /^#[0-9a-fA-F]{6}$/);
    assert.ok(trailFeature.properties.id);
    assert.ok(trailFeature.properties.name);
    assert.ok(trailFeature.properties.elevation > 1600);
    assert.ok(trailFeature.properties.difficulty);

    for (const [lng, lat] of trailFeature.geometry.coordinates) {
      assert.ok(lat >= 4.45 && lat <= 4.53, `Latitude out of range: ${lat}`);
      assert.ok(lng >= 101.37 && lng <= 101.40, `Longitude out of range: ${lng}`);
    }

    const matchingPeak = peakFeatures.find(
      (p) => p.properties.id === `${trailFeature.properties.id}-peak`
    );
    assert.ok(matchingPeak, `Missing matching peak for ${trailFeature.properties.id}`);
    assert.equal(matchingPeak.geometry.type, 'Point');

    const lastTrailCoord =
      trailFeature.geometry.coordinates[trailFeature.geometry.coordinates.length - 1];
    assert.deepEqual(matchingPeak.geometry.coordinates, lastTrailCoord);
    assert.equal(matchingPeak.properties.elevation, trailFeature.properties.elevation);
    assert.equal(matchingPeak.properties.difficulty, trailFeature.properties.difficulty);
    assert.equal(matchingPeak.properties.color, trailFeature.properties.color);
  }
});

import {
  computeModifiedBprAscentRate,
  evaluateSpatialTemporalNetwork,
  evaluateIntraHighlandIncidentAdvisory,
} from '../services/cameronTrafficModel.ts';

test('Cameron Spatial-Temporal Model: BPR ascent rate + Incident Cap Guardrail + FT59 spine wave', () => {
  // Zero delay yields 0 BPR ascent flow
  assert.equal(
    computeModifiedBprAscentRate({
      capacityVehPerHr: 1450,
      gammaAscentShare: 0.72,
      currentDurationSecs: 3000,
      freeFlowDurationSecs: 3000,
      beta: 4,
    }),
    0
  );

  // Positive delay yields positive ascent rate V_i scaling with (delta / (0.15 * t_free))^(1/4)
  const sampleVi = computeModifiedBprAscentRate({
    capacityVehPerHr: 1450,
    gammaAscentShare: 0.72,
    currentDurationSecs: 3900, // +900s = 2 * (0.15 * 3000)
    freeFlowDurationSecs: 3000,
    beta: 4,
  });
  // 1450 * 0.72 * 2^(0.25) ~= 1044 * 1.1892 ~= 1241
  assert.ok(sampleVi >= 1235 && sampleVi <= 1250, `Unexpected BPR Vi: ${sampleVi}`);

  const sampleDate = new Date('2026-11-21T10:30:00+08:00');
  // Without roadblock hazard, massive delay on Simpang Pulai creates high uncapped Vi
  const uncappedModel = evaluateSpatialTemporalNetwork({
    targetDate: sampleDate,
    corridorInputs: [
      {
        corridorId: 'simpang_pulai_ft185',
        currentDurationSecs: 6000,
        freeFlowDurationSecs: 3000,
        source: 'here_routing_v8',
      },
    ],
  });
  const uncappedSp = uncappedModel.feeders.find((f) => f.id === 'simpang_pulai_ft185')!;
  assert.equal(uncappedSp.isIncidentCapped, false);
  assert.ok(uncappedSp.effectiveVi > uncappedSp.historicalBaselineVi);

  // With landslide/roadblock hazard on Simpang Pulai, Incident Cap Guardrail caps Vi at baseline
  const cappedModel = evaluateSpatialTemporalNetwork({
    targetDate: sampleDate,
    corridorInputs: [
      {
        corridorId: 'simpang_pulai_ft185',
        currentDurationSecs: 6000,
        freeFlowDurationSecs: 3000,
        source: 'here_routing_v8',
      },
    ],
    hazards: [
      {
        id: 'haz-sp-block',
        title: 'Landslide at Pos Slim FT185',
        description: 'Single-lane roadwork and landslide cleanup',
        type: 'landslide',
        severity: 'high',
        location: 'Simpang Pulai FT185 Pos Slim',
        lat: 4.565,
        lng: 101.24,
        source: 'JKR',
        status: 'active',
        stillThereVotes: 0,
        clearedVotes: 0,
        timestamp: sampleDate.toISOString(),
      },
    ],
  });
  const cappedSp = cappedModel.feeders.find((f) => f.id === 'simpang_pulai_ft185')!;
  assert.equal(cappedSp.isIncidentCapped, true);
  assert.equal(cappedSp.effectiveVi, cappedSp.historicalBaselineVi);

  // Spine propagates across all 4 FT59 nodes with +1h/+2h/+3h horizons
  assert.deepEqual(
    cappedModel.spineNodes.map((n) => n.id),
    ['ringlet', 'tanah_rata', 'brinchang', 'kea_farm']
  );
  cappedModel.spineNodes.forEach((n) => {
    assert.equal(n.horizons.length, 3);
    assert.deepEqual(
      n.horizons.map((h) => h.offsetHours),
      [1, 2, 3]
    );
  });
});

test('Intra-Highland Incident Advisory: validates real FT59/FT185/FT102 rules across Scenarios 1-4', () => {
  // Scenario 1: Tanah Rata <-> Brinchang (e.g. Rosa Passadena) -> Golden Hills light vehicle link
  const s1 = evaluateIntraHighlandIncidentAdvisory({
    title: 'Accident near Rosa Passadena',
    type: 'accident',
    severity: 'high',
    location: 'Rosa Passadena / Padang Golf FT59',
    lat: 4.482,
    lng: 101.386,
  });
  assert.equal(s1.scenarioId, 'scenario_1_tanah_rata_brinchang');
  assert.equal(s1.alternativeRouteAvailable, true);
  assert.equal(s1.availabilityBadge, 'ALTERNATIVE ROUTE AVAILABLE');
  assert.match(s1.exactReroute, /Golden Hills|Sungai Ruil/i);

  // Scenario 2: Brinchang <-> Kea Farm -> NO parallel bypass, warns against BOH Sungai Palas estate track
  const s2 = evaluateIntraHighlandIncidentAdvisory({
    title: 'Severe Bottleneck at Kea Farm',
    type: 'sudden_congestion',
    severity: 'high',
    location: 'Kea Farm Market Strip FT59',
    lat: 4.5028,
    lng: 101.4072,
  });
  assert.equal(s2.scenarioId, 'scenario_2_brinchang_kea_farm_tringkap');
  assert.equal(s2.alternativeRouteAvailable, false);
  assert.equal(s2.availabilityBadge, 'NO PARALLEL BYPASS — SINGLE SPINE ROAD');
  assert.match(s2.vehicleRestrictionNote || '', /Do NOT attempt Sungai Palas BOH/i);

  // Scenario 3: Ringlet <-> Tanah Rata (Habu / Bertam Valley) -> NO parallel bypass
  const s3 = evaluateIntraHighlandIncidentAdvisory({
    title: 'Fallen tree near Habu',
    type: 'fallen_tree',
    severity: 'high',
    location: 'Habu / Bertam Valley Junction FT59',
    lat: 4.4472,
    lng: 101.3838,
  });
  assert.equal(s3.scenarioId, 'scenario_3_ringlet_tanah_rata');
  assert.equal(s3.alternativeRouteAvailable, false);
  assert.equal(s3.availabilityBadge, 'NO PARALLEL BYPASS — SINGLE SPINE ROAD');
  assert.match(s3.whatToDoWhereToGo, /Sungai Koyan \(FT102\)/i);
  assert.match(s3.whatToDoWhereToGo, /Simpang Pulai \(FT185\)/i);

  // Scenario 4: Entry/Exit Highway (Tapah FT59 / Gua Musang FT185) -> Full gateway switch
  const s4 = evaluateIntraHighlandIncidentAdvisory({
    title: 'Landslide KM 43 Tapah Road',
    type: 'landslide',
    severity: 'critical',
    location: 'Lata Iskandar Tapah FT59',
    lat: 4.331,
    lng: 101.328,
  });
  assert.equal(s4.scenarioId, 'scenario_4_entry_exit_highway');
  assert.equal(s4.alternativeRouteAvailable, true);
  assert.equal(s4.availabilityBadge, 'ALTERNATIVE ROUTE AVAILABLE');
  assert.match(s4.exactReroute, /Simpang Pulai \(FT185\)/i);
  assert.match(s4.whatToDoWhereToGo, /fuel/i);
});




