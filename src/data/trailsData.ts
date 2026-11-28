export type TrailDifficulty = 'Easy' | 'Moderate' | 'Hard' | 'Extreme';

export interface TrailRoute {
  id: string;
  number: number;
  name: string;
  location: string;
  trailheadName: string;
  difficulty: TrailDifficulty;
  color: string;
  distanceKm: number;
  estDurationHrs: string;
  maxElevationM: number;
  conditionBadge: string;
  conditionType: 'clear' | 'muddy' | 'slippery' | 'closed';
  description: string;
  descriptionBm: string;
  coordinates: [number, number][]; // [lat, lng]
  peakName?: string;
  peakCoordinates?: [number, number]; // [lat, lng]
  elevationProfile: { distance: number; altitude: number }[];
  isAdminTest?: boolean;
  hasVerifiedGpx?: boolean;
}

/**
 * Parses a trail's estimated duration string (e.g. "2.0 hrs", "0.5 hr", "15 mins drive")
 * and returns a recommended Return Duration in hours including a realistic +1.0 hr rest/break buffer,
 * snapped cleanly to 0.5 hr increments (e.g. "3.0").
 */
export function computeRecommendedReturnHours(estDurationHrs: string): string {
  const lower = (estDurationHrs || '').toLowerCase();
  const numMatch = lower.match(/(\d+(?:\.\d+)?)/);
  let baseHrs = 2.0;
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    if (Number.isFinite(val)) {
      baseHrs = lower.includes('min') ? Math.max(0.5, val / 60) : val;
    }
  }
  const buffered = Math.max(1.0, Math.round((baseHrs + 1.0) * 2) / 2);
  return buffered.toFixed(1);
}

export interface TrailFeatureProperties {
  id: string;
  name: string;
  elevation: number;
  difficulty: TrailDifficulty;
  color: string;
  type: 'trail' | 'peak';
}

export interface TrailLineStringFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // GeoJSON [lng, lat]
  };
  properties: TrailFeatureProperties & { type: 'trail' };
}

export interface TrailPeakPointFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // GeoJSON [lng, lat]
  };
  properties: TrailFeatureProperties & { type: 'peak' };
}

export type CameronTrailGeoJsonFeature =
  | TrailLineStringFeature
  | TrailPeakPointFeature;

export interface CameronTrailsFeatureCollection {
  type: 'FeatureCollection';
  features: CameronTrailGeoJsonFeature[];
}

export const CAMERON_TRAILS: TrailRoute[] = [
  {
    id: 'trail-1',
    number: 1,
    name: 'Trail 1: Gunung Brinchang Summit',
    location: 'Brinchang / Sungai Palas',
    trailheadName: 'Brinchang Trailhead (Jalan Besar / Water Tank)',
    difficulty: 'Hard',
    color: '#ef4444',
    distanceKm: 3.8,
    estDurationHrs: '2.5 hrs',
    maxElevationM: 2032,
    conditionBadge: 'Slippery wooden boardwalks & dense summit mist',
    conditionType: 'slippery',
    description:
      'Ascends steeply from Brinchang town water-tank trailhead through lower montane moss ridges to the 2,032m Gunung Brinchang radar summit.',
    descriptionBm:
      'Pendakian curam dari punca laluan Brinchang merentasi permatang hutan lumut ke kemuncak Gunung Brinchang (2,032m).',
    coordinates: [
      [4.4926, 101.3879],
      [4.4964, 101.3898],
      [4.5012, 101.3911],
      [4.5065, 101.3894],
      [4.5111, 101.3865],
      [4.5152, 101.3849],
      [4.5184, 101.3838],
    ],
    peakName: 'Gunung Brinchang Summit',
    peakCoordinates: [4.5184, 101.3838],
    elevationProfile: [
      { distance: 0, altitude: 1550 },
      { distance: 1.0, altitude: 1700 },
      { distance: 2.2, altitude: 1890 },
      { distance: 3.8, altitude: 2032 },
    ],
  },
  {
    id: 'trail-2',
    number: 2,
    name: 'Trail 2: Robinson Waterfall & Ridge',
    location: 'Tanah Rata',
    trailheadName: 'Jalan Tengkolok / Heritage Trailhead',
    difficulty: 'Moderate',
    color: '#3b82f6',
    distanceKm: 2.5,
    estDurationHrs: '1.5 hrs',
    maxElevationM: 1520,
    conditionBadge: 'Clear forest path with damp stream crossings',
    conditionType: 'clear',
    description:
      'Starts behind Tanah Rata town edge, weaving along hillside ridge contours toward the Robinson Waterfall upper viewpoint.',
    descriptionBm:
      'Bermula di belakang pinggir Tanah Rata menyusuri permatang bukit ke Air Terjun Robinson.',
    coordinates: [
      [4.4678, 101.3836],
      [4.4651, 101.3854],
      [4.4622, 101.3867],
      [4.4593, 101.3881],
      [4.4571, 101.3892],
      [4.4548, 101.3875],
    ],
    peakName: 'Robinson Ridge Lookout',
    peakCoordinates: [4.4548, 101.3875],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.2, altitude: 1480 },
      { distance: 2.5, altitude: 1520 },
    ],
  },
  {
    id: 'trail-3',
    number: 3,
    name: 'Trail 3: Parit Fall to Golf Course (Berembun Link)',
    location: 'Tanah Rata / Brinchang',
    trailheadName: 'Arcadia / Sultan Ahmad Shah Golf Edge',
    difficulty: 'Moderate',
    color: '#10b981',
    distanceKm: 2.6,
    estDurationHrs: '1.2 hrs',
    maxElevationM: 1560,
    conditionBadge: 'Well maintained ridge & forest steps',
    conditionType: 'clear',
    description:
      'Classic highland contour trail linking Tanah Rata residential lanes and Parit Falls ridge past the historic Sultan Ahmad Shah Golf Course.',
    descriptionBm:
      'Laluan permatang klasik menghubungkan Tanah Rata dan Air Terjun Parit ke Padang Golf Sultan Ahmad Shah.',
    coordinates: [
      [4.4724, 101.3834],
      [4.4752, 101.3851],
      [4.4783, 101.3868],
      [4.4816, 101.3877],
      [4.4844, 101.3861],
      [4.4872, 101.3850],
    ],
    peakName: 'Golf Ridge Crest',
    peakCoordinates: [4.4872, 101.3850],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.3, altitude: 1510 },
      { distance: 2.6, altitude: 1560 },
    ],
  },
  {
    id: 'trail-4',
    number: 4,
    name: 'Trail 4: Parit Waterfall Loop',
    location: 'Tanah Rata',
    trailheadName: 'Taman Rekreasi Air Terjun Parit',
    difficulty: 'Easy',
    color: '#8b5cf6',
    distanceKm: 1.2,
    estDurationHrs: '0.5 hr',
    maxElevationM: 1465,
    conditionBadge: 'Damp stone steps near waterfall cascade',
    conditionType: 'slippery',
    description:
      'Accessible rainforest loop circling Taman Sedia valley stream and cascading Parit Waterfall.',
    descriptionBm:
      'Laluan bulat hutan mudah mengelilingi anak sungai Taman Sedia dan Air Terjun Parit.',
    coordinates: [
      [4.4742, 101.3821],
      [4.4754, 101.3833],
      [4.4765, 101.3842],
      [4.4756, 101.3853],
      [4.4743, 101.3840],
      [4.4740, 101.3824],
    ],
    peakName: 'Parit Fall Upper Step',
    peakCoordinates: [4.4765, 101.3842],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 0.6, altitude: 1465 },
      { distance: 1.2, altitude: 1445 },
    ],
  },
  {
    id: 'trail-5',
    number: 5,
    name: 'Trail 5: MARDI & Waterfall Ridge',
    location: 'Tanah Rata',
    trailheadName: 'Jalan Dayang Indah / MARDI Ridge Gate',
    difficulty: 'Moderate',
    color: '#f59e0b',
    distanceKm: 3.1,
    estDurationHrs: '1.5 hrs',
    maxElevationM: 1610,
    conditionBadge: 'Moderate root climb with clear markers',
    conditionType: 'clear',
    description:
      'Connects Tanah Rata town edge past MARDI slopes up to elevated pine and ridge viewpoints.',
    descriptionBm:
      'Menghubungkan pinggir Tanah Rata melalui lereng MARDI ke puncak pemandangan hutan pain.',
    coordinates: [
      [4.4672, 101.3839],
      [4.4694, 101.3863],
      [4.4721, 101.3885],
      [4.4749, 101.3904],
      [4.4778, 101.3917],
      [4.4801, 101.3924],
    ],
    peakName: 'Waterfall Ridge Point',
    peakCoordinates: [4.4801, 101.3924],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.5, altitude: 1525 },
      { distance: 3.1, altitude: 1610 },
    ],
  },
  {
    id: 'trail-6',
    number: 6,
    name: 'Trail 6: Brinchang Tea Valley / Bharat Link',
    location: 'Tanah Rata / Bharat Tea Valley',
    trailheadName: 'MARDI / Bharat Tea Estate Trailhead',
    difficulty: 'Moderate',
    color: '#ec4899',
    distanceKm: 4.2,
    estDurationHrs: '2.0 hrs',
    maxElevationM: 1615,
    conditionBadge: 'Muddy sections near Cameron Valley Tea House slopes',
    conditionType: 'muddy',
    description:
      'Scenic transition route winding down from Berembun shoulder ridges into rolling green tea terraces of Bharat Cameron Valley.',
    descriptionBm:
      'Laluan transisi indah menurun dari bahu Gunung Berembun terus ke teres hijau Ladang Teh Bharat.',
    coordinates: [
      [4.4660, 101.3852],
      [4.4628, 101.3886],
      [4.4596, 101.3920],
      [4.4561, 101.3958],
      [4.4526, 101.3991],
      [4.4494, 101.4022],
    ],
    peakName: 'Cameron Valley Crest',
    peakCoordinates: [4.4494, 101.4022],
    elevationProfile: [
      { distance: 0, altitude: 1615 },
      { distance: 2.1, altitude: 1530 },
      { distance: 4.2, altitude: 1435 },
    ],
  },
  {
    id: 'trail-7',
    number: 7,
    name: 'Trail 7: Gunung Berembun West via MARDI',
    location: 'Tanah Rata (MARDI Station)',
    trailheadName: 'Taman Agroteknologi MARDI Trailhead',
    difficulty: 'Hard',
    color: '#14b8a6',
    distanceKm: 3.4,
    estDurationHrs: '2.5 hrs',
    maxElevationM: 1840,
    conditionBadge: 'Steep root ladders & dense canopy slopes',
    conditionType: 'muddy',
    description:
      'Direct steep jungle ascent from MARDI Agrotech Park along the western shoulder to Gunung Berembun summit.',
    descriptionBm:
      'Pendakian terus yang curam dari Taman Agroteknologi MARDI ke kemuncak Gunung Berembun.',
    coordinates: [
      [4.4683, 101.3860],
      [4.4704, 101.3895],
      [4.4727, 101.3928],
      [4.4754, 101.3959],
      [4.4782, 101.3987],
      [4.4806, 101.4014],
    ],
    peakName: 'Gunung Berembun West Approach',
    peakCoordinates: [4.4806, 101.4014],
    elevationProfile: [
      { distance: 0, altitude: 1445 },
      { distance: 1.7, altitude: 1655 },
      { distance: 3.4, altitude: 1840 },
    ],
  },
  {
    id: 'trail-8',
    number: 8,
    name: 'Trail 8: Robinson Ridge to Gunung Berembun',
    location: 'Tanah Rata / Jalan Tengkolok',
    trailheadName: 'Robinson Falls East Ridge',
    difficulty: 'Hard',
    color: '#6366f1',
    distanceKm: 3.9,
    estDurationHrs: '2.5 hrs',
    maxElevationM: 1840,
    conditionBadge: 'Slippery clay steps after afternoon rain',
    conditionType: 'slippery',
    description:
      'Follows Robinson valley rim and steep bamboo staircases joining the Berembun summit ridge.',
    descriptionBm:
      'Menyusuri tebing lembah Robinson dan tangga buluh curam menuju permatang kemuncak Berembun.',
    coordinates: [
      [4.4586, 101.3886],
      [4.4624, 101.3915],
      [4.4666, 101.3941],
      [4.4712, 101.3968],
      [4.4760, 101.3992],
      [4.4806, 101.4014],
    ],
    peakName: 'Gunung Berembun South Shoulder',
    peakCoordinates: [4.4806, 101.4014],
    elevationProfile: [
      { distance: 0, altitude: 1425 },
      { distance: 2.0, altitude: 1640 },
      { distance: 3.9, altitude: 1840 },
    ],
  },
  {
    id: 'trail-9',
    number: 9,
    name: 'Trail 9 / 9A: Robinson Waterfall Valley Track',
    location: 'Tanah Rata',
    trailheadName: 'Robinson Falls Park Gate',
    difficulty: 'Moderate',
    color: '#d97706',
    distanceKm: 3.2,
    estDurationHrs: '2.0 hrs',
    maxElevationM: 1580,
    conditionBadge: 'Active cascade spray & wet boulders',
    conditionType: 'slippery',
    description:
      'Scenic gorge trail tracing the cascading tiers of Robinson Falls past hydro pipelines and tropical fern groves.',
    descriptionBm:
      'Laluan gaung indah menyusuri air terjun bertingkat Robinson dan lembah paku-pakis.',
    coordinates: [
      [4.4666, 101.3845],
      [4.4638, 101.3863],
      [4.4609, 101.3882],
      [4.4578, 101.3900],
      [4.4547, 101.3919],
      [4.4519, 101.3935],
    ],
    peakName: 'Lower Robinson Cascade',
    peakCoordinates: [4.4519, 101.3935],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.6, altitude: 1515 },
      { distance: 3.2, altitude: 1580 },
    ],
  },
  {
    id: 'trail-10',
    number: 10,
    name: 'Trail 10: Gunung Jasar / Coral Hills',
    location: 'Tanah Rata (Oly / Trail 10)',
    trailheadName: 'Oly Apartments / Trail 10 Junction',
    difficulty: 'Moderate',
    color: '#84cc16',
    distanceKm: 2.4,
    estDurationHrs: '1.5 hrs',
    maxElevationM: 1696,
    conditionBadge: 'Exposed mossy ridge roots & cool crosswind',
    conditionType: 'slippery',
    description:
      'Starts at Trail 10 junction near Oly Apartments in Tanah Rata, climbing past power-pylon clearings and coral forest ridges to Gunung Jasar (1,696m).',
    descriptionBm:
      'Bermula di simpang Laluan 10 Tanah Rata, mendaki permatang hutan lumut ke kemuncak Gunung Jasar (1,696m).',
    coordinates: [
      [4.4718, 101.3748],
      [4.4736, 101.3728],
      [4.4757, 101.3709],
      [4.4780, 101.3694],
      [4.4801, 101.3680],
      [4.4820, 101.3669],
    ],
    peakName: 'Gunung Jasar / Coral Hills Summit',
    peakCoordinates: [4.4820, 101.3669],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 0.8, altitude: 1525 },
      { distance: 1.6, altitude: 1615 },
      { distance: 2.4, altitude: 1696 },
    ],
  },
  {
    id: 'trail-11',
    number: 11,
    name: 'Trail 11: Parit to Gunung Jasar & Perdah Ridge',
    location: 'Tanah Rata / Jalan Perdah',
    trailheadName: 'Jalan Tengkolok / Tanah Rata Library Gate',
    difficulty: 'Moderate',
    color: '#06b6d4',
    distanceKm: 2.8,
    estDurationHrs: '2.0 hrs',
    maxElevationM: 1655,
    conditionBadge: 'Clear ridge connection with intermittent cellular signal',
    conditionType: 'clear',
    description:
      'Connecting ridge linking Tanah Rata / Jalan Perdah slopes along the high spur toward Gunung Jasar summit junction.',
    descriptionBm:
      'Laluan permatang penghubung dari Jalan Perdah Tanah Rata terus menyambung ke simpang Gunung Jasar.',
    coordinates: [
      [4.4732, 101.3788],
      [4.4750, 101.3765],
      [4.4768, 101.3742],
      [4.4787, 101.3719],
      [4.4804, 101.3695],
      [4.4819, 101.3672],
    ],
    peakName: 'Jasar-Perdah Ridge Junction',
    peakCoordinates: [4.4819, 101.3672],
    elevationProfile: [
      { distance: 0, altitude: 1445 },
      { distance: 1.4, altitude: 1550 },
      { distance: 2.8, altitude: 1655 },
    ],
  },
  {
    id: 'trail-12',
    number: 12,
    name: 'Trail 12: Mardi Ridge to Gunung Berembun',
    location: 'Tanah Rata',
    trailheadName: 'MARDI North Spur Trailhead',
    difficulty: 'Hard',
    color: '#a855f7',
    distanceKm: 4.0,
    estDurationHrs: '3.0 hrs',
    maxElevationM: 1840,
    conditionBadge: 'Very muddy & steep technical root steps',
    conditionType: 'muddy',
    description:
      'Technical north-west spur crossing montane cloud canopy to Gunung Berembun trig beacon.',
    descriptionBm:
      'Laluan rabung barat laut yang mencabar merentasi kanopi awan ke puncak Gunung Berembun.',
    coordinates: [
      [4.4702, 101.3848],
      [4.4728, 101.3881],
      [4.4751, 101.3916],
      [4.4775, 101.3951],
      [4.4792, 101.3983],
      [4.4806, 101.4014],
    ],
    peakName: 'Gunung Berembun Trig Point',
    peakCoordinates: [4.4806, 101.4014],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 2.0, altitude: 1640 },
      { distance: 4.0, altitude: 1840 },
    ],
  },
  {
    id: 'trail-13',
    number: 13,
    name: 'Trail 13: Boh Tea Estate & Sungai Palas Loop',
    location: 'Brinchang / Sungai Palas',
    trailheadName: 'BOH Sungai Palas Tea Centre Walk',
    difficulty: 'Easy',
    color: '#f97316',
    distanceKm: 2.0,
    estDurationHrs: '1.0 hr',
    maxElevationM: 1595,
    conditionBadge: 'Clear compacted estate paths with full sky visibility',
    conditionType: 'clear',
    description:
      'Scenic highland ridge walk winding along manicured emerald tea terraces overlooking the Brinchang valley.',
    descriptionBm:
      'Laluan santai tanah tinggi merentasi teres teh hijau menghadap lembah Brinchang.',
    coordinates: [
      [4.5138, 101.4126],
      [4.5152, 101.4148],
      [4.5169, 101.4167],
      [4.5184, 101.4182],
      [4.5196, 101.4164],
      [4.5174, 101.4139],
    ],
    peakName: 'Boh Tea Panorama Deck',
    peakCoordinates: [4.5184, 101.4182],
    elevationProfile: [
      { distance: 0, altitude: 1500 },
      { distance: 1.0, altitude: 1555 },
      { distance: 2.0, altitude: 1595 },
    ],
  },
  {
    id: 'trail-14',
    number: 14,
    name: 'Trail 14: Gunung Irau (Mossy Forest)',
    location: 'Sungai Palas Mossy Forest',
    trailheadName: 'Mossy Forest Boardwalk Exit (HSK Permit Check)',
    difficulty: 'Extreme',
    color: '#7c3aed',
    distanceKm: 6.2,
    estDurationHrs: '4.5 hrs',
    maxElevationM: 2110,
    conditionBadge: 'Extreme deep peat mud, wet mossy roots & thick cloud mist',
    conditionType: 'muddy',
    description:
      'Starts past the Mossy Forest boardwalk off Gunung Brinchang road, traversing Mini Irau false peak and gnarled cloud forest ridges to Gunung Irau (2,110m). Forestry permit & licensed MGP guide mandatory.',
    descriptionBm:
      'Bermula di hujung pelantar kayu Mossy Forest melalui Mini Irau menuju kemuncak Gunung Irau (2,110m). Wajib permit HSK & Malim Gunung.',
    coordinates: [
      [4.5245, 101.3812],
      [4.5256, 101.3788],
      [4.5269, 101.3765],
      [4.5284, 101.3739],
      [4.5297, 101.3712],
      [4.5312, 101.3688],
      [4.5326, 101.3665],
    ],
    peakName: 'Gunung Irau Summit (2,110m)',
    peakCoordinates: [4.5326, 101.3665],
    elevationProfile: [
      { distance: 0, altitude: 1850 },
      { distance: 2.2, altitude: 1965 },
      { distance: 4.4, altitude: 2045 },
      { distance: 6.2, altitude: 2110 },
    ],
  },
  {
    id: 'trail-15',
    number: 15,
    name: 'Trail 15: Gunung Siku Summit Ridge',
    location: 'Kampung Raja / Blue Valley Ridge',
    trailheadName: 'Blue Valley / FT185 Ridge Trailhead',
    difficulty: 'Hard',
    color: '#e11d48',
    distanceKm: 4.8,
    estDurationHrs: '3.5 hrs',
    maxElevationM: 1916,
    conditionBadge: 'Steep mossy ridge & slippery bamboo roots (HSK Permit required)',
    conditionType: 'slippery',
    description:
      'Ascends northern Pahang-Perak border moss ridges near Kampung Raja / FT185 to the 1,916m Gunung Siku summit.',
    descriptionBm:
      'Pendakian permatang hutan lumut di sempadan Kampung Raja menuju kemuncak Gunung Siku (1,916m).',
    coordinates: [
      [4.6022, 101.3845],
      [4.6048, 101.3872],
      [4.6075, 101.3901],
      [4.6104, 101.3930],
      [4.6131, 101.3958],
      [4.6156, 101.3986],
    ],
    peakName: 'Gunung Siku Summit (1,916m)',
    peakCoordinates: [4.6156, 101.3986],
    elevationProfile: [
      { distance: 0, altitude: 1590 },
      { distance: 1.6, altitude: 1710 },
      { distance: 3.2, altitude: 1825 },
      { distance: 4.8, altitude: 1916 },
    ],
  },
  {
    id: 'admin-test-tanah-rata-brinchang',
    number: 16,
    name: '[Admin Test] Tanah Rata to Brinchang (FT59 Road Route)',
    location: 'Tanah Rata → Brinchang (FT59 Main Road)',
    trailheadName: 'Tanah Rata Town Center (FT59)',
    difficulty: 'Easy',
    color: '#0ea5e9',
    distanceKm: 4.5,
    estDurationHrs: '15 mins drive',
    maxElevationM: 1555,
    conditionBadge: '[Admin Test] FT59 Road Corridor — Live GPS & Telemetry Verification',
    conditionType: 'clear',
    description:
      '[Admin Test] Road-following test route along FT59 starting at Tanah Rata Town Center, passing Jalan Persiaran Camellia and Cameron Highlands Golf Course, and ending at Brinchang Town Square.',
    descriptionBm:
      '[Ujian Admin] Laluan jalan raya FT59 dari Pusat Bandar Tanah Rata melalui Jalan Persiaran Camellia & Padang Golf menuju ke Dataran Brinchang.',
    coordinates: [
      [4.4718, 101.3766],
      [4.4742, 101.3792],
      [4.4778, 101.3818],
      [4.4812, 101.3842],
      [4.4846, 101.3858],
      [4.4885, 101.3869],
      [4.4926, 101.3879],
    ],
    peakName: 'Brinchang Town Square (Finish)',
    peakCoordinates: [4.4926, 101.3879],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.5, altitude: 1475 },
      { distance: 3.0, altitude: 1520 },
      { distance: 4.5, altitude: 1555 },
    ],
    isAdminTest: true,
  },
  {
    id: 'admin-test-kea-farm-brinchang',
    number: 17,
    name: '[Admin Test] Kea Farm to Brinchang (FT59 Road Route)',
    location: 'Kea Farm → Brinchang (FT59 Main Road)',
    trailheadName: 'Kea Farm Market / Copthorne (FT59)',
    difficulty: 'Easy',
    color: '#f43f5e',
    distanceKm: 3.8,
    estDurationHrs: '12 mins drive',
    maxElevationM: 1615,
    conditionBadge: '[Admin Test] FT59 Descent Corridor — Live GPS & Telemetry Verification',
    conditionType: 'clear',
    description:
      '[Admin Test] Road-following test route along FT59 starting at Kea Farm Market / Copthorne, descending south past Equatorial Hill & Cactus Valley corridor to Brinchang Town Square.',
    descriptionBm:
      '[Ujian Admin] Laluan jalan raya FT59 dari Pasar Kea Farm / Copthorne menuruni koridor Equatorial Hill menuju ke Dataran Brinchang.',
    coordinates: [
      [4.5028, 101.4092],
      [4.5004, 101.4052],
      [4.4981, 101.4012],
      [4.4962, 101.3968],
      [4.4945, 101.3924],
      [4.4926, 101.3879],
    ],
    peakName: 'Brinchang Town Square (Finish)',
    peakCoordinates: [4.4926, 101.3879],
    elevationProfile: [
      { distance: 0, altitude: 1615 },
      { distance: 1.3, altitude: 1595 },
      { distance: 2.6, altitude: 1572 },
      { distance: 3.8, altitude: 1550 },
    ],
    isAdminTest: true,
  },
];

/**
 * Helper to convert [lat, lng] coordinates into GeoJSON [lng, lat] pairs.
 */
function toGeoJsonCoord([lat, lng]: [number, number]): [number, number] {
  return [lng, lat];
}

/**
 * Generates a compliant GeoJSON FeatureCollection containing both
 * 'LineString' trail features and matching 'Point' peak features.
 */
export function buildTrailsFeatureCollection(
  trails: TrailRoute[]
): CameronTrailsFeatureCollection {
  const features: CameronTrailGeoJsonFeature[] = [];

  for (const trail of trails) {
    const lineCoords = trail.coordinates.map(toGeoJsonCoord);
    const peakLatLng =
      trail.peakCoordinates ?? trail.coordinates[trail.coordinates.length - 1];
    const peakLngLat = toGeoJsonCoord(peakLatLng);

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: lineCoords,
      },
      properties: {
        id: trail.id,
        name: trail.name,
        elevation: trail.maxElevationM,
        difficulty: trail.difficulty,
        color: trail.color,
        type: 'trail',
      },
    });

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: peakLngLat,
      },
      properties: {
        id: `${trail.id}-peak`,
        name: trail.peakName || `${trail.name} Peak`,
        elevation: trail.maxElevationM,
        difficulty: trail.difficulty,
        color: trail.color,
        type: 'peak',
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Complete GeoJSON FeatureCollection for all Cameron Highlands trails (Trails 1-15).
 */
export const CAMERON_TRAILS_GEOJSON: CameronTrailsFeatureCollection =
  buildTrailsFeatureCollection(CAMERON_TRAILS);

/**
 * Dedicated GeoJSON FeatureCollection for the three major summit peaks:
 * 1. Gunung Irau (~2,110m)
 * 2. Gunung Siku (~1,916m)
 * 3. Gunung Jasar / Coral Hills (~1,696m)
 */
export const CAMERON_SUMMIT_TRAILS_GEOJSON: CameronTrailsFeatureCollection =
  buildTrailsFeatureCollection(
    CAMERON_TRAILS.filter((t) =>
      ['trail-10', 'trail-14', 'trail-15'].includes(t.id)
    )
  );
