export type TrailDifficulty = 'Easy' | 'Moderate' | 'Hard' | 'Extreme';

export interface TrailRoute {
  id: string;
  number: number;
  name: string;
  location: string;
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
    location: 'Brinchang / Boh Tea',
    difficulty: 'Hard',
    color: '#ef4444',
    distanceKm: 3.8,
    estDurationHrs: '2.5 hrs',
    maxElevationM: 2032,
    conditionBadge: 'Slippery wooden boardwalks & dense mist',
    conditionType: 'slippery',
    description:
      'Ascends from Equatorial plantation past ancient mossy trees to the highest driveable peak in Cameron Highlands.',
    descriptionBm:
      'Pendakian dari ladang teh ke kemuncak Gunung Brinchang melalui hutan lumut purba.',
    coordinates: [
      [4.4820, 101.3900],
      [4.4900, 101.3950],
      [4.5000, 101.3980],
      [4.5120, 101.3890],
      [4.5180, 101.3840],
    ],
    peakName: 'Gunung Brinchang Summit',
    peakCoordinates: [4.5180, 101.3840],
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
    location: 'Ringlet / Tanah Rata',
    difficulty: 'Moderate',
    color: '#3b82f6',
    distanceKm: 2.5,
    estDurationHrs: '1.5 hrs',
    maxElevationM: 1520,
    conditionBadge: 'Clear path with damp river crossings',
    conditionType: 'clear',
    description:
      'Starts near MARDI and loops around Robinson Falls with tranquil stream paths.',
    descriptionBm:
      'Bermula berhampiran MARDI dan berpusat di sekitar Air Terjun Robinson.',
    coordinates: [
      [4.4600, 101.3780],
      [4.4550, 101.3720],
      [4.4500, 101.3690],
    ],
    peakName: 'Robinson Ridge Lookout',
    peakCoordinates: [4.4500, 101.3690],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.2, altitude: 1480 },
      { distance: 2.5, altitude: 1520 },
    ],
  },
  {
    id: 'trail-3',
    number: 3,
    name: 'Trail 3: Parit Fall to Golf Course',
    location: 'Tanah Rata',
    difficulty: 'Easy',
    color: '#10b981',
    distanceKm: 1.8,
    estDurationHrs: '45 mins',
    maxElevationM: 1470,
    conditionBadge: 'Well maintained family trail',
    conditionType: 'clear',
    description:
      'Gentle walk connecting Parit Waterfall recreational park to the historic golf course.',
    descriptionBm:
      'Laluan santai menghubungkan Taman Rekreasi Air Terjun Parit ke padang golf bersejarah.',
    coordinates: [
      [4.4715, 101.3805],
      [4.4750, 101.3850],
      [4.4780, 101.3900],
    ],
    peakName: 'Golf Ridge Crest',
    peakCoordinates: [4.4780, 101.3900],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 0.9, altitude: 1455 },
      { distance: 1.8, altitude: 1470 },
    ],
  },
  {
    id: 'trail-4',
    number: 4,
    name: 'Trail 4: Parit Waterfall Loop',
    location: 'Tanah Rata',
    difficulty: 'Easy',
    color: '#8b5cf6',
    distanceKm: 1.2,
    estDurationHrs: '30 mins',
    maxElevationM: 1460,
    conditionBadge: 'Slippery rock steps near waterfall base',
    conditionType: 'slippery',
    description:
      'Short forest walk leading directly to the cascading waters of Parit Fall.',
    descriptionBm:
      'Laluan hutan pendek yang menuju terus ke air terjun Parit.',
    coordinates: [
      [4.4710, 101.3800],
      [4.4730, 101.3820],
      [4.4715, 101.3805],
    ],
    peakName: 'Parit Fall Upper Step',
    peakCoordinates: [4.4730, 101.3820],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 0.6, altitude: 1450 },
      { distance: 1.2, altitude: 1460 },
    ],
  },
  {
    id: 'trail-5',
    number: 5,
    name: 'Trail 5: Memorabilia & Waterfall Ridge',
    location: 'Tanah Rata',
    difficulty: 'Moderate',
    color: '#f59e0b',
    distanceKm: 3.1,
    estDurationHrs: '1.5 hrs',
    maxElevationM: 1590,
    conditionBadge: 'Moderate root climb',
    conditionType: 'clear',
    description:
      'Connects Tanah Rata town edge to high ridge viewpoints.',
    descriptionBm:
      'Menghubungkan pinggir bandar Tanah Rata ke pandangan permatang tinggi.',
    coordinates: [
      [4.4680, 101.3820],
      [4.4750, 101.3890],
      [4.4800, 101.3920],
    ],
    peakName: 'Waterfall Ridge Point',
    peakCoordinates: [4.4800, 101.3920],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.5, altitude: 1510 },
      { distance: 3.1, altitude: 1590 },
    ],
  },
  {
    id: 'trail-6',
    number: 6,
    name: 'Trail 6: MARDI to Cameron Valley',
    location: 'Tanah Rata / Bertam Valley',
    difficulty: 'Moderate',
    color: '#ec4899',
    distanceKm: 4.2,
    estDurationHrs: '2.0 hrs',
    maxElevationM: 1610,
    conditionBadge: 'Heavy Mud near Cameron Valley Tea Estate',
    conditionType: 'muddy',
    description:
      'Scenic plantation transition trail passing through experimental agricultural stations and tea terraces.',
    descriptionBm:
      'Laluan ladang indah melalui stesen penyelidikan pertanian dan teres teh.',
    coordinates: [
      [4.4650, 101.3850],
      [4.4580, 101.3950],
      [4.4500, 101.4020],
    ],
    peakName: 'Cameron Valley Crest',
    peakCoordinates: [4.4500, 101.4020],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 2.1, altitude: 1530 },
      { distance: 4.2, altitude: 1610 },
    ],
  },
  {
    id: 'trail-7',
    number: 7,
    name: 'Trail 7: Mentigi Forest Track',
    location: 'Ringlet',
    difficulty: 'Hard',
    color: '#14b8a6',
    distanceKm: 5.0,
    estDurationHrs: '3.0 hrs',
    maxElevationM: 1680,
    conditionBadge: 'Dense foliage & steep muddy slopes',
    conditionType: 'muddy',
    description:
      'Challenging deep jungle track recommended for experienced hikers only.',
    descriptionBm:
      'Laluan hutan tebal mencabar disyorkan untuk pendaki berpengalaman sahaja.',
    coordinates: [
      [4.4400, 101.3700],
      [4.4300, 101.3800],
      [4.4250, 101.3900],
    ],
    peakName: 'Bukit Mentigi Peak',
    peakCoordinates: [4.4250, 101.3900],
    elevationProfile: [
      { distance: 0, altitude: 1400 },
      { distance: 2.5, altitude: 1550 },
      { distance: 5.0, altitude: 1680 },
    ],
  },
  {
    id: 'trail-8',
    number: 8,
    name: 'Trail 8: Telom Valley Edge',
    location: 'Ringlet',
    difficulty: 'Moderate',
    color: '#6366f1',
    distanceKm: 3.5,
    estDurationHrs: '2.0 hrs',
    maxElevationM: 1550,
    conditionBadge: 'Slippery after rainfall',
    conditionType: 'slippery',
    description:
      'Follows the stream valley edge with beautiful fern ecosystems.',
    descriptionBm:
      'Mengikuti tepi lembah sungai dengan ekosistem paku-pakis yang indah.',
    coordinates: [
      [4.4350, 101.3750],
      [4.4420, 101.3820],
      [4.4500, 101.3880],
    ],
    peakName: 'Telom Edge Lookout',
    peakCoordinates: [4.4500, 101.3880],
    elevationProfile: [
      { distance: 0, altitude: 1420 },
      { distance: 1.8, altitude: 1490 },
      { distance: 3.5, altitude: 1550 },
    ],
  },
  {
    id: 'trail-9',
    number: 9,
    name: 'Trail 9: Gunung Berembun via MARDI',
    location: 'Tanah Rata',
    difficulty: 'Hard',
    color: '#d97706',
    distanceKm: 3.6,
    estDurationHrs: '2.5 hrs',
    maxElevationM: 1840,
    conditionBadge: 'Steep incline with exposed tree roots',
    conditionType: 'slippery',
    description:
      'Steep climb to Gunung Berembun featuring historical WWII crash site markers.',
    descriptionBm:
      'Pendakian curam ke Gunung Berembun menampilkan tanda tapak nahas pesawat WWII.',
    coordinates: [
      [4.4700, 101.3750],
      [4.4800, 101.3700],
      [4.4850, 101.3650],
    ],
    peakName: 'Gunung Berembun Summit',
    peakCoordinates: [4.4850, 101.3650],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.8, altitude: 1650 },
      { distance: 3.6, altitude: 1840 },
    ],
  },
  {
    id: 'trail-10',
    number: 10,
    name: 'Trail 10: Gunung Jasar / Coral Hills',
    location: 'Tanah Rata (Trail 10)',
    difficulty: 'Moderate',
    color: '#84cc16',
    distanceKm: 2.4,
    estDurationHrs: '1.5 hrs',
    maxElevationM: 1696,
    conditionBadge: 'Slippery incline & exposed coral ridge roots',
    conditionType: 'slippery',
    description:
      'Starts in Tanah Rata via Trail 10, climbing steadily past mossy Coral Hills ridge viewpoints to the 1,696m Gunung Jasar summit.',
    descriptionBm:
      'Bermula di Tanah Rata melalui Laluan 10, mendaki permatang Coral Hills ke puncak Gunung Jasar pada 1,696m.',
    coordinates: [
      [4.4718, 101.3792],
      [4.4738, 101.3772],
      [4.4759, 101.3755],
      [4.4781, 101.3739],
      [4.4800, 101.3724],
      [4.4818, 101.3712],
    ],
    peakName: 'Gunung Jasar / Coral Hills Summit',
    peakCoordinates: [4.4818, 101.3712],
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
    name: 'Trail 11: Parit to Mount Jasar Link',
    location: 'Tanah Rata',
    difficulty: 'Moderate',
    color: '#06b6d4',
    distanceKm: 2.8,
    estDurationHrs: '1.5 hrs',
    maxElevationM: 1650,
    conditionBadge: 'Clear ridge connection',
    conditionType: 'clear',
    description:
      'Connecting route between Parit Fall and Mount Jasar ridge.',
    descriptionBm:
      'Laluan penghubung antara Air Terjun Parit dan permatang Gunung Jasar.',
    coordinates: [
      [4.4720, 101.3800],
      [4.4780, 101.3760],
      [4.4810, 101.3730],
    ],
    peakName: 'Jasar Link Ridge',
    peakCoordinates: [4.4810, 101.3730],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.4, altitude: 1540 },
      { distance: 2.8, altitude: 1650 },
    ],
  },
  {
    id: 'trail-12',
    number: 12,
    name: 'Trail 12: Mardi to Gunung Berembun',
    location: 'Tanah Rata',
    difficulty: 'Hard',
    color: '#a855f7',
    distanceKm: 4.0,
    estDurationHrs: '3.0 hrs',
    maxElevationM: 1840,
    conditionBadge: 'Very muddy & steep technical steps',
    conditionType: 'muddy',
    description:
      'Challenging ridge traverse with high altitude flora.',
    descriptionBm:
      'Lintasan permatang mencabar dengan flora altitud tinggi.',
    coordinates: [
      [4.4680, 101.3800],
      [4.4750, 101.3720],
      [4.4850, 101.3650],
    ],
    peakName: 'Gunung Berembun North Face',
    peakCoordinates: [4.4850, 101.3650],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 2.0, altitude: 1640 },
      { distance: 4.0, altitude: 1840 },
    ],
  },
  {
    id: 'trail-13',
    number: 13,
    name: 'Trail 13: Boh Tea Estate Panorama',
    location: 'Brinchang / Habu',
    difficulty: 'Easy',
    color: '#f97316',
    distanceKm: 2.0,
    estDurationHrs: '1.0 hr',
    maxElevationM: 1580,
    conditionBadge: 'Clear estate gravel paths',
    conditionType: 'clear',
    description:
      'Picturesque walking trail meandering through world-famous tea terraces.',
    descriptionBm:
      'Laluan berjalan kaki indah merentasi teres teh yang terkenal di dunia.',
    coordinates: [
      [4.4850, 101.4100],
      [4.4900, 101.4150],
      [4.4950, 101.4200],
    ],
    peakName: 'Boh Tea Panorama Deck',
    peakCoordinates: [4.4950, 101.4200],
    elevationProfile: [
      { distance: 0, altitude: 1500 },
      { distance: 1.0, altitude: 1540 },
      { distance: 2.0, altitude: 1580 },
    ],
  },
  {
    id: 'trail-14',
    number: 14,
    name: 'Trail 14: Gunung Irau (Mossy Forest)',
    location: 'Sungai Palas Mossy Forest Parking',
    difficulty: 'Extreme',
    color: '#7c3aed',
    distanceKm: 6.2,
    estDurationHrs: '4.5 hrs',
    maxElevationM: 2110,
    conditionBadge: 'Extreme deep mud, wet roots & dense cloud mist',
    conditionType: 'muddy',
    description:
      'Starts from Sungai Palas Mossy Forest parking, traversing the enchanted cloud forest ridge to Gunung Irau summit (~2,110m). Forestry permit & licensed guide required.',
    descriptionBm:
      'Bermula dari tempat letak kereta Mossy Forest Sungai Palas menuju kemuncak Gunung Irau (~2,110m). Permit perhutanan & malim gunung diperlukan.',
    coordinates: [
      [4.5045, 101.3832],
      [4.5102, 101.3811],
      [4.5158, 101.3788],
      [4.5208, 101.3762],
      [4.5248, 101.3743],
      [4.5285, 101.3726],
    ],
    peakName: 'Gunung Irau Summit',
    peakCoordinates: [4.5285, 101.3726],
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
    name: 'Trail 15: Gunung Siku Summit',
    location: 'Boh Tea / Mossy Forest Edge',
    difficulty: 'Hard',
    color: '#e11d48',
    distanceKm: 4.8,
    estDurationHrs: '3.5 hrs',
    maxElevationM: 1916,
    conditionBadge: 'Steep mossy ridge & slippery bamboo roots',
    conditionType: 'slippery',
    description:
      'Begins near the Boh Tea & Mossy Forest edge, ascending scenic highland ridges to the ~1,916m Gunung Siku summit.',
    descriptionBm:
      'Bermula berhampiran pinggir Ladang Teh Boh / Hutan Lumut menuju ke kemuncak Gunung Siku (~1,916m).',
    coordinates: [
      [4.5085, 101.3905],
      [4.5130, 101.3925],
      [4.5178, 101.3948],
      [4.5222, 101.3965],
      [4.5260, 101.3982],
      [4.5295, 101.3995],
    ],
    peakName: 'Gunung Siku Summit',
    peakCoordinates: [4.5295, 101.3995],
    elevationProfile: [
      { distance: 0, altitude: 1590 },
      { distance: 1.6, altitude: 1710 },
      { distance: 3.2, altitude: 1825 },
      { distance: 4.8, altitude: 1916 },
    ],
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
