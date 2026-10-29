export interface TrailRoute {
  id: string;
  number: number;
  name: string;
  location: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Extreme';
  distanceKm: number;
  estDurationHrs: string;
  maxElevationM: number;
  conditionBadge: string;
  conditionType: 'clear' | 'muddy' | 'slippery' | 'closed';
  description: string;
  descriptionBm: string;
  coordinates: [number, number][]; // [lat, lng]
  elevationProfile: { distance: number; altitude: number }[];
}

export const CAMERON_TRAILS: TrailRoute[] = [
  {
    id: 'trail-1',
    number: 1,
    name: 'Trail 1: Gunung Brinchang Summit',
    location: 'Brinchang / Boh Tea',
    difficulty: 'Hard',
    distanceKm: 3.8,
    estDurationHrs: '2.5 hrs',
    maxElevationM: 2032,
    conditionBadge: 'Slippery wooden boardwalks & dense mist',
    conditionType: 'slippery',
    description: 'Ascends from Equatorial plantation past ancient mossy trees to the highest peak in Cameron Highlands.',
    descriptionBm: 'Pendakian dari ladang teh ke kemuncak tertinggi Cameron Highlands melalui hutan lumut purba.',
    coordinates: [
      [4.4820, 101.3900],
      [4.4900, 101.3950],
      [4.5000, 101.3980],
      [4.5120, 101.4020]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1550 },
      { distance: 1.0, altitude: 1700 },
      { distance: 2.2, altitude: 1890 },
      { distance: 3.8, altitude: 2032 }
    ]
  },
  {
    id: 'trail-2',
    number: 2,
    name: 'Trail 2: Robinson Waterfall & Ridge',
    location: 'Ringlet / Tanah Rata',
    difficulty: 'Moderate',
    distanceKm: 2.5,
    estDurationHrs: '1.5 hrs',
    maxElevationM: 1520,
    conditionBadge: 'Clear path with damp river crossings',
    conditionType: 'clear',
    description: 'Starts near MARDI and loops around Robinson Falls with tranquil stream paths.',
    descriptionBm: 'Bermula berhampiran MARDI dan berpusat di sekitar Air Terjun Robinson.',
    coordinates: [
      [4.4600, 101.3780],
      [4.4550, 101.3720],
      [4.4500, 101.3690]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.2, altitude: 1480 },
      { distance: 2.5, altitude: 1520 }
    ]
  },
  {
    id: 'trail-3',
    number: 3,
    name: 'Trail 3: Parit Fall to Golf Course',
    location: 'Tanah Rata',
    difficulty: 'Easy',
    distanceKm: 1.8,
    estDurationHrs: '45 mins',
    maxElevationM: 1470,
    conditionBadge: 'Well maintained family trail',
    conditionType: 'clear',
    description: 'Gentle walk connecting Parit Waterfall recreational park to the historic golf course.',
    descriptionBm: 'Laluan santai menghubungkan Taman Rekreasi Air Terjun Parit ke padang golf bersejarah.',
    coordinates: [
      [4.4715, 101.3805],
      [4.4750, 101.3850],
      [4.4780, 101.3900]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 0.9, altitude: 1455 },
      { distance: 1.8, altitude: 1470 }
    ]
  },
  {
    id: 'trail-4',
    number: 4,
    name: 'Trail 4: Parit Waterfall Loop',
    location: 'Tanah Rata',
    difficulty: 'Easy',
    distanceKm: 1.2,
    estDurationHrs: '30 mins',
    maxElevationM: 1460,
    conditionBadge: 'Slippery rock steps near waterfall base',
    conditionType: 'slippery',
    description: 'Short forest walk leading directly to the cascading waters of Parit Fall.',
    descriptionBm: 'Laluan hutan pendek yang menuju terus ke air terjun Parit.',
    coordinates: [
      [4.4710, 101.3800],
      [4.4730, 101.3820],
      [4.4715, 101.3805]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 0.6, altitude: 1450 },
      { distance: 1.2, altitude: 1460 }
    ]
  },
  {
    id: 'trail-5',
    number: 5,
    name: 'Trail 5: Memorabilia & Waterfall Ridge',
    location: 'Tanah Rata',
    difficulty: 'Moderate',
    distanceKm: 3.1,
    estDurationHrs: '1.5 hrs',
    maxElevationM: 1590,
    conditionBadge: 'Moderate root climb',
    conditionType: 'clear',
    description: 'Connects Tanah Rata town edge to high ridge viewpoints.',
    descriptionBm: 'Menghubungkan pinggir bandar Tanah Rata ke pandangan permatang tinggi.',
    coordinates: [
      [4.4680, 101.3820],
      [4.4750, 101.3890],
      [4.4800, 101.3920]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.5, altitude: 1510 },
      { distance: 3.1, altitude: 1590 }
    ]
  },
  {
    id: 'trail-6',
    number: 6,
    name: 'Trail 6: MARDI to Cameron Valley',
    location: 'Tanah Rata / Bertam Valley',
    difficulty: 'Moderate',
    distanceKm: 4.2,
    estDurationHrs: '2.0 hrs',
    maxElevationM: 1610,
    conditionBadge: 'Heavy Mud near Cameron Valley Tea Estate',
    conditionType: 'muddy',
    description: 'Scenic plantation transition trail passing through experimental agricultural stations and tea terraces.',
    descriptionBm: 'Laluan ladang indah melalui stesen penyelidikan pertanian dan teres teh.',
    coordinates: [
      [4.4650, 101.3850],
      [4.4580, 101.3950],
      [4.4500, 101.4020]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 2.1, altitude: 1530 },
      { distance: 4.2, altitude: 1610 }
    ]
  },
  {
    id: 'trail-7',
    number: 7,
    name: 'Trail 7: Mentigi Forest Track',
    location: 'Ringlet',
    difficulty: 'Hard',
    distanceKm: 5.0,
    estDurationHrs: '3.0 hrs',
    maxElevationM: 1680,
    conditionBadge: 'Dense foliage & steep muddy slopes',
    conditionType: 'muddy',
    description: 'Challenging deep jungle track recommended for experienced hikers only.',
    descriptionBm: 'Laluan hutan tebal mencabar disyorkan untuk pendaki berpengalaman sahaja.',
    coordinates: [
      [4.4400, 101.3700],
      [4.4300, 101.3800],
      [4.4250, 101.3900]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1400 },
      { distance: 2.5, altitude: 1550 },
      { distance: 5.0, altitude: 1680 }
    ]
  },
  {
    id: 'trail-8',
    number: 8,
    name: 'Trail 8: Telom Valley Edge',
    location: 'Ringlet',
    difficulty: 'Moderate',
    distanceKm: 3.5,
    estDurationHrs: '2.0 hrs',
    maxElevationM: 1550,
    conditionBadge: 'Slippery after rainfall',
    conditionType: 'slippery',
    description: 'Follows the stream valley edge with beautiful fern ecosystems.',
    descriptionBm: 'Mengikuti tepi lembah sungai dengan ekosistem paku-pakis yang indah.',
    coordinates: [
      [4.4350, 101.3750],
      [4.4420, 101.3820],
      [4.4500, 101.3880]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1420 },
      { distance: 1.8, altitude: 1490 },
      { distance: 3.5, altitude: 1550 }
    ]
  },
  {
    id: 'trail-9',
    number: 9,
    name: 'Trail 9: Gunung Berembun via MARDI',
    location: 'Tanah Rata',
    difficulty: 'Hard',
    distanceKm: 3.6,
    estDurationHrs: '2.5 hrs',
    maxElevationM: 1840,
    conditionBadge: 'Steep incline with exposed tree roots',
    conditionType: 'slippery',
    description: 'Steep climb to Gunung Berembun featuring historical WWII crash site markers.',
    descriptionBm: 'Pendakian curam ke Gunung Berembun menampilkan tanda tapak nahas pesawat WWII.',
    coordinates: [
      [4.4700, 101.3750],
      [4.4800, 101.3700],
      [4.4850, 101.3650]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.8, altitude: 1650 },
      { distance: 3.6, altitude: 1840 }
    ]
  },
  {
    id: 'trail-10',
    number: 10,
    name: 'Trail 10: Mount Jasar Summit',
    location: 'Tanah Rata',
    difficulty: 'Moderate',
    distanceKm: 2.2,
    estDurationHrs: '1.5 hrs',
    maxElevationM: 1696,
    conditionBadge: 'Slippery Incline & exposed roots',
    conditionType: 'slippery',
    description: 'Popular sunset/sunrise viewpoint overlooking Tanah Rata township.',
    descriptionBm: 'Tempat pandangan matahari terbenam/terbit yang popular menghadap bandar Tanah Rata.',
    coordinates: [
      [4.4750, 101.3780],
      [4.4800, 101.3750],
      [4.4820, 101.3720]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.1, altitude: 1570 },
      { distance: 2.2, altitude: 1696 }
    ]
  },
  {
    id: 'trail-11',
    number: 11,
    name: 'Trail 11: Parit to Mount Jasar Link',
    location: 'Tanah Rata',
    difficulty: 'Moderate',
    distanceKm: 2.8,
    estDurationHrs: '1.5 hrs',
    maxElevationM: 1650,
    conditionBadge: 'Clear ridge connection',
    conditionType: 'clear',
    description: 'Connecting route between Parit Fall and Mount Jasar ridge.',
    descriptionBm: 'Laluan penghubung antara Air Terjun Parit dan permatang Gunung Jasar.',
    coordinates: [
      [4.4720, 101.3800],
      [4.4780, 101.3760],
      [4.4810, 101.3730]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 1.4, altitude: 1540 },
      { distance: 2.8, altitude: 1650 }
    ]
  },
  {
    id: 'trail-12',
    number: 12,
    name: 'Trail 12: Mardi to Gunung Berembun',
    location: 'Tanah Rata',
    difficulty: 'Hard',
    distanceKm: 4.0,
    estDurationHrs: '3.0 hrs',
    maxElevationM: 1840,
    conditionBadge: 'Very muddy & steep technical steps',
    conditionType: 'muddy',
    description: 'Challenging ridge traverse with high altitude flora.',
    descriptionBm: 'Lintasan permatang mencabar dengan flora altitud tinggi.',
    coordinates: [
      [4.4680, 101.3800],
      [4.4750, 101.3720],
      [4.4850, 101.3650]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1440 },
      { distance: 2.0, altitude: 1640 },
      { distance: 4.0, altitude: 1840 }
    ]
  },
  {
    id: 'trail-13',
    number: 13,
    name: 'Trail 13: Boh Tea Estate Panorama',
    location: 'Brinchang / Habu',
    difficulty: 'Easy',
    distanceKm: 2.0,
    estDurationHrs: '1.0 hr',
    maxElevationM: 1580,
    conditionBadge: 'Clear estate gravel paths',
    conditionType: 'clear',
    description: 'Picturesque walking trail meandering through world-famous tea terraces.',
    descriptionBm: 'Laluan berjalan kaki indah merentasi teres teh yang terkenal di dunia.',
    coordinates: [
      [4.4850, 101.4100],
      [4.4900, 101.4150],
      [4.4950, 101.4200]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1500 },
      { distance: 1.0, altitude: 1540 },
      { distance: 2.0, altitude: 1580 }
    ]
  },
  {
    id: 'trail-14',
    number: 14,
    name: 'Trail 14: Mount Irau & Mossy Forest',
    location: 'Brinchang Peak North',
    difficulty: 'Extreme',
    distanceKm: 6.2,
    estDurationHrs: '4.5 hrs',
    maxElevationM: 2110,
    conditionBadge: 'Extreme deep mud, wet roots & fog hazard',
    conditionType: 'muddy',
    description: 'The legendary "Lord of the Rings" forest trail leading to Mount Irau peak at 2,110m. Requires guide registration.',
    descriptionBm: 'Laluan hutan lagenda "Lord of the Rings" ke kemuncak Gunung Irau pada 2,110m.',
    coordinates: [
      [4.5200, 101.4050],
      [4.5350, 101.4120],
      [4.5500, 101.4200]
    ],
    elevationProfile: [
      { distance: 0, altitude: 1850 },
      { distance: 2.5, altitude: 1980 },
      { distance: 4.5, altitude: 2050 },
      { distance: 6.2, altitude: 2110 }
    ]
  }
];
