/**
 * CamGo Highlands Website Knowledge Directory & Local Search Index
 * Single source of truth for Cameron Highlands places, masjids/surau, attractions,
 * tickets, traffic, emergency services, and township facilities.
 */

export interface DirectoryItem {
  id: string;
  name: string;
  nameBm: string;
  township: string;
  category: string;
  description: string;
  descriptionBm: string;
  location: string;
  contact?: string;
  operatingHours?: string;
  highlights?: string[];
  tags: string[];
}

export const CAMGO_MASJID_SURAU_DIRECTORY: DirectoryItem[] = [
  {
    id: 'masjid-abu-bakar-tanah-rata',
    name: 'Masjid Abu Bakar (Masjid Daerah Cameron Highlands)',
    nameBm: 'Masjid Abu Bakar (Masjid Daerah Tanah Rata)',
    township: 'Tanah Rata',
    category: 'masjid_surau',
    description: 'Cameron Highlands principal regional Friday mosque. Features an expansive main prayer hall, clean wudhu/ablution facilities, dedicated women prayer section (surau wanita), generous parking, and weekly Solat Jumaat congregation.',
    descriptionBm: 'Masjid utama daerah Cameron Highlands di Tanah Rata. Menawarkan dewan solat luas, kemudahan wuduk bersih, ruang solat wanita selesa, tempat letak kereta luas dan solat Jumaat mingguan.',
    location: 'Persiaran Camellia 4, 39000 Tanah Rata (near Tanah Rata town center & government complex)',
    contact: '+60 5-491 1432',
    operatingHours: 'Open daily for 5 daily prayers (Subuh to Isyak) & Solat Jumaat',
    highlights: ['Solat Jumaat weekly', 'Main District Mosque', 'Clean ablution & toilets', 'Spacious parking lot', 'Wheelchair accessible'],
    tags: ['masjid', 'tanah rata', 'solat jumaat', 'mosque', 'prayer', 'wuduk', 'surau wanita', 'daerah']
  },
  {
    id: 'masjid-tengku-ahmad-brinchang',
    name: 'Masjid Tengku Ahmad (Pekan Brinchang)',
    nameBm: 'Masjid Tengku Ahmad (Masjid Bandar Brinchang)',
    township: 'Brinchang',
    category: 'masjid_surau',
    description: 'The primary central mosque in Brinchang town located along the main road opposite the police station. Highly accessible for tourists in Brinchang, near Cactus Point and the Golden Hills corridor. Hosts weekly Friday prayers (Solat Jumaat).',
    descriptionBm: 'Masjid utama pekan Brinchang di jalan besar berhadapan balai polis. Sangat mudah dikunjungi pelancong di Brinchang dan koridor Golden Hills. Mengadakan solat Jumaat mingguan.',
    location: 'Jalan Besar Brinchang, 39100 Brinchang, Cameron Highlands',
    contact: '+60 5-491 2100',
    operatingHours: 'Open daily for 5 daily prayers & Solat Jumaat',
    highlights: ['Solat Jumaat weekly', 'Town center location', 'Near hotels & food stalls', 'Separate prayer halls for men and women'],
    tags: ['masjid', 'brinchang', 'solat jumaat', 'mosque', 'prayer', 'pasar malam', 'pusat pekan']
  },
  {
    id: 'masjid-kayu-al-hidayah-tanah-rata',
    name: 'Masjid Kayu Al-Hidayah (Masjid Kayu Tanah Rata)',
    nameBm: 'Masjid Kayu Al-Hidayah Tanah Rata',
    township: 'Tanah Rata',
    category: 'masjid_surau',
    description: 'Renowned for its rustic highland timber architecture surrounded by serene pine trees and cool mountain breeze. Clean prayer rugs and well-maintained ablution facilities.',
    descriptionBm: 'Terkenal dengan seni bina kayu tanah tinggi yang cantik berlatarkan pokok pain dan udara segar. Ruang solat berhawa dingin semula jadi dengan wuduk yang terjaga.',
    location: 'Jalan Pine / berhampiran Century Pines Resort, 39000 Tanah Rata',
    operatingHours: 'Open daily for all daily prayer times',
    highlights: ['Unique wooden architecture', 'Peaceful natural pine surroundings', 'Wudhu & prayer space'],
    tags: ['masjid kayu', 'tanah rata', 'surau', 'solat', 'wooden mosque', 'pine trees']
  },
  {
    id: 'surau-al-falah-kea-farm',
    name: 'Surau Al-Falah (Kea Farm Agro Market)',
    nameBm: 'Surau Al-Falah Kea Farm',
    township: 'Kea Farm',
    category: 'masjid_surau',
    description: 'The most convenient prayer spot when shopping at the Kea Farm market, Cameron Flora Park, or the Sheep Sanctuary. Equipped with clean water ablution areas and telekung for female visitors.',
    descriptionBm: 'Tempat solat paling strategik semasa membeli-belah di pasar sayur Kea Farm, melawat Cameron Flora Park atau Sheep Sanctuary. Lengkap dengan paip wuduk bersih dan telekung untuk muslimah.',
    location: 'Kea Farm Market Belt, 39100 Brinchang / Kea Farm',
    operatingHours: 'Open daily during market operating hours (8:00 AM - 7:30 PM)',
    highlights: ['Directly at Kea Farm market', 'Easy walk from Flora Park & Sheep Sanctuary', 'Telekung & sejadah provided'],
    tags: ['surau', 'kea farm', 'pasar sayur', 'sheep sanctuary', 'flora park', 'solat', 'musafir']
  },
  {
    id: 'surau-barrington-golden-hills',
    name: 'Surau Al-Hikmah (Golden Hills / Pasar Malam)',
    nameBm: 'Surau Al-Hikmah Golden Hills (Barrington Square)',
    township: 'Brinchang',
    category: 'masjid_surau',
    description: 'Located at Barrington Square commercial shoplots directly adjoining the Golden Hills Weekend Night Market. Perfect for Maghrib and Isyak prayers during evening market strolls.',
    descriptionBm: 'Terletak di lot kedai Barrington Square bersebelahan tapak Pasar Malam Hujung Minggu Golden Hills. Sangat selesa untuk solat Maghrib dan Isyak ketika berjalan di pasar malam.',
    location: 'Ground Floor, Barrington Square, Golden Hills, 39000 Cameron Highlands',
    operatingHours: 'Open daily, extended hours during Friday & Saturday Night Market',
    highlights: ['Next to Golden Hills Night Market', 'Clean air-conditioned interior', 'Separate Muslimah room with telekung'],
    tags: ['surau', 'golden hills', 'pasar malam', 'barrington square', 'maghrib', 'isyak', 'solat']
  },
  {
    id: 'masjid-ringlet',
    name: 'Masjid Al-Ehsaniah (Masjid Ringlet)',
    nameBm: 'Masjid Al-Ehsaniah Ringlet',
    township: 'Ringlet',
    category: 'masjid_surau',
    description: 'Township mosque serving Ringlet at the southern gateway of Cameron Highlands. Ideal stop for travellers arriving from Tapah (FT59) or Sungai Koyan (FT102). Holds weekly Friday prayers.',
    descriptionBm: 'Masjid pekan pintu masuk selatan Cameron Highlands di Ringlet. Tempat singgah utama musafir dari laluan Tapah (FT59) atau Sungai Koyan (FT102). Mengadakan solat Jumaat.',
    location: 'Jalan Besar Ringlet, 39200 Ringlet, Cameron Highlands',
    operatingHours: 'Open daily for 5 prayers & Solat Jumaat',
    highlights: ['Solat Jumaat weekly', 'Southern gateway pitstop', 'Roadside parking', 'Ablution facilities'],
    tags: ['masjid', 'ringlet', 'solat jumaat', 'tapah', 'sungai koyan', 'musafir']
  },
  {
    id: 'masjid-kampung-raja',
    name: 'Masjid Kampung Raja',
    nameBm: 'Masjid Kampung Raja (Pintu Masuk Simpang Pulai)',
    township: 'Kampung Raja',
    category: 'masjid_surau',
    description: 'Northern gateway mosque in Kampung Raja near the Simpang Pulai (FT185) / Blue Valley junction. Features weekly Friday prayers with ample space for travellers descending or ascending the highlands.',
    descriptionBm: 'Masjid pintu masuk utara di Kampung Raja berhampiran simpang Simpang Pulai (FT185) dan Blue Valley. Solat Jumaat mingguan dan ruang rehat musafir yang selesa.',
    location: 'Pekan Kampung Raja, 39010 Kampung Raja, Cameron Highlands',
    operatingHours: 'Open daily for 5 prayers & Solat Jumaat',
    highlights: ['Solat Jumaat weekly', 'Northern gateway Simpang Pulai FT185', 'Spacious prayer hall'],
    tags: ['masjid', 'kampung raja', 'solat jumaat', 'simpang pulai', 'blue valley', 'musafir']
  },
  {
    id: 'surau-tringkap',
    name: 'Surau Al-Huda Tringkap',
    nameBm: 'Surau Al-Huda Tringkap',
    township: 'Tringkap',
    category: 'masjid_surau',
    description: 'Valley community surau situated on Route 59 in Tringkap. Clean wudhu facilities and prayer rugs for travellers heading towards tea plantations or Rose Valley.',
    descriptionBm: 'Surau komuniti tepi jalan FT59 di lembah Tringkap. Bersih dan selesa untuk musafir yang menuju ke ladang teh atau Rose Valley.',
    location: 'Jalan Besar Tringkap, 39600 Cameron Highlands',
    operatingHours: 'Open daily for 5 prayers',
    highlights: ['Roadside accessibility', 'Wudhu & prayer space', 'Convenient pitstop'],
    tags: ['surau', 'tringkap', 'musafir', 'rose valley']
  },
  {
    id: 'surau-attractions-network',
    name: 'Musolla & Surau at Major Highlands Attractions',
    nameBm: 'Surau & Ruang Solat di Pusat Tarikan Pelancongan',
    township: 'Multiple Townships',
    category: 'masjid_surau',
    description: 'Several top attractions in Cameron Highlands provide dedicated prayer rooms on site: BOH Sungei Palas Tea Centre (Surau with wudhu at main entrance), Bharat Cameron Valley Tea House 1 & 2 (Surau available), Big Red Strawberry Farm Brinchang (Prayer room on upper terrace), and MARDI Agro Technology Park Tanah Rata.',
    descriptionBm: 'Pusat tarikan utama Cameron Highlands yang menyediakan surau dan tempat wuduk: BOH Sungei Palas (surau di anjung utama), Bharat Cameron Valley Tea House 1 & 2 (surau pemandangan ladang), Big Red Strawberry Farm Brinchang (surau di teras atas), dan Taman Agro MARDI Tanah Rata.',
    location: 'BOH Sungei Palas, Cameron Valley Tea, Big Red Strawberry, MARDI',
    operatingHours: 'During each attraction operating hours',
    highlights: ['BOH Sungei Palas Surau', 'Cameron Valley Tea Surau', 'Big Red Strawberry Surau', 'MARDI Agro Park Surau'],
    tags: ['surau attraction', 'boh tea surau', 'cameron valley surau', 'big red strawberry surau', 'mardi surau']
  }
];

export const CAMGO_ATTRACTIONS_DIRECTORY: DirectoryItem[] = [
  {
    id: 'cameron-flora-park',
    name: 'Cameron Flora Park',
    nameBm: 'Taman Bunga Cameron Flora Park',
    township: 'Kea Farm',
    category: 'attraction',
    description: 'Fairytale floral paradise with tiered pink floral staircases, indoor glass garden pavilions, picnic platforms, and tea garden.',
    descriptionBm: 'Taman bunga berteres dengan tangga bunga merah jambu memukau, astaka kaca, sudut berkelah dan kafe teh.',
    location: 'Lot 191, Kea Farm, 39100 Brinchang, Pahang',
    contact: '+60 19-338 2999',
    operatingHours: '09:00 AM - 07:00 PM daily',
    highlights: ['Ticket RM 50 Adult / RM 25 Child (bookable on CamGo Tickets tab)', 'Pink Staircase photos', 'Indoor Floral Conservatory'],
    tags: ['flora park', 'kea farm', 'taman bunga', 'photo spot', 'ticket', 'tiket']
  },
  {
    id: 'boh-sungei-palas',
    name: 'BOH Sungei Palas Tea Centre',
    nameBm: 'Pusat Teh BOH Sungei Palas',
    township: 'Brinchang',
    category: 'attraction',
    description: 'Iconic cantilevered tea café jutting out over rolling emerald tea hills. Factory tours, fresh scones, tea tasting, and visitor surau.',
    descriptionBm: 'Kafe anjung tinjau ikonik tergantung di atas lembah bukit teh hijau. Lawatan kilang teh, skon panas, dan surau disediakan.',
    location: 'Sungei Palas Tea Estate, Brinchang',
    contact: '+60 5-496 2096',
    operatingHours: '08:30 AM - 04:30 PM (Closed Mondays)',
    highlights: ['Free admission to factory & viewing deck', 'Surau on site', 'Narrow access road: drive cautiously or take 4x4'],
    tags: ['boh tea', 'sungei palas', 'ladang teh', 'scones', 'brinchang', 'surau']
  },
  {
    id: 'mossy-forest',
    name: 'Mossy Forest Nature Reserve (Gunung Brinchang)',
    nameBm: 'Hutan Lumut Mossy Forest',
    township: 'Brinchang',
    category: 'attraction',
    description: 'Ancient high-altitude cloud forest at 2,032m elevation carpeted in lush mosses, orchids, and pitcher plants. Features a 200m elevated boardwalk.',
    descriptionBm: 'Hutan awan purba di puncak 2,032m diselaputi lumut tebal, periuk kera dan orkid liar. Dilengkapi titian kayu 200m.',
    location: 'Gunung Brinchang summit road',
    operatingHours: '09:00 AM - 04:00 PM daily (subject to weather)',
    highlights: ['Forestry permit required (Jabatan Perhutanan Negeri Pahang)', 'Strictly 4x4 access recommended', '4x4 Tour + Permit package RM 75 on CamGo'],
    tags: ['mossy forest', 'hutan lumut', 'gunung brinchang', 'permit', '4x4', 'nature']
  },
  {
    id: 'sheep-sanctuary',
    name: 'The Sheep Sanctuary',
    nameBm: 'The Sheep Sanctuary Kea Farm',
    township: 'Kea Farm',
    category: 'attraction',
    description: 'Petting farm where visitors can hand-feed gentle imported fluffy sheep and alpaca-style animals with mountain vegetable valley views.',
    descriptionBm: 'Ladang mesra keluarga di mana pelawat boleh memberi makan biri-biri gebu import dengan latar belakang lembah Kea Farm.',
    location: 'Next to Kea Farm market, Brinchang',
    operatingHours: '09:00 AM - 05:30 PM daily',
    highlights: ['Ticket RM 15 Adult / RM 10 Child (includes food box)', 'Family and kids favorite', 'Located directly at Kea Farm'],
    tags: ['sheep sanctuary', 'kea farm', 'biri-biri', 'haiwan', 'kanak-kanak', 'ticket']
  },
  {
    id: 'lavender-garden',
    name: 'Cameron Lavender Garden',
    nameBm: 'Taman Lavender Cameron (Tringkap)',
    township: 'Tringkap',
    category: 'attraction',
    description: 'Vibrant landscaped floral hills featuring lavender varieties, camellias, Japanese gardens, strawberry soft-serve ice cream, and souvenir shops.',
    descriptionBm: 'Taman bunga berteres menampilkan pelbagai lavender ungu, taman Jepun, ais krim strawberi dan kedai cenderamata.',
    location: 'Main Road Tringkap, 39600 Cameron Highlands',
    operatingHours: '09:00 AM - 06:00 PM daily',
    highlights: ['Ticket RM 20 Adult / RM 10 Child', 'Lavender soft serve ice cream', 'Direct highway access on FT59'],
    tags: ['lavender garden', 'tringkap', 'bunga lavender', 'ais krim', 'ticket']
  },
  {
    id: 'big-red-strawberry',
    name: 'Big Red Strawberry Farm (Cactus Valley)',
    nameBm: 'Big Red Strawberry Farm Brinchang',
    township: 'Brinchang',
    category: 'attraction',
    description: 'Massive greenhouse farm nestled against Brinchang hills. Free admission, hydroponic strawberry rows, fresh waffles, and indoor surau.',
    descriptionBm: 'Ladang rumah hijau bertingkat di lereng bukit Brinchang. Masuk percuma, pokok strawberi hidroponik, wafel panas, dan surau disediakan.',
    location: 'Brinchang town, near Cactus Valley',
    operatingHours: '08:30 AM - 06:00 PM daily',
    highlights: ['Free admission', 'Covered greenhouse (good for rainy days)', 'Surau available on site', 'Fresh strawberry desserts'],
    tags: ['big red strawberry', 'brinchang', 'percuma', 'free entry', 'strawberry waffles', 'surau']
  }
];

export const CAMGO_EMERGENCY_DIRECTORY: DirectoryItem[] = [
  {
    id: 'hospital-kalsom-tanah-rata',
    name: 'Hospital Sultanah Hajah Kalsom (24H Emergency & Clinic)',
    nameBm: 'Hospital Sultanah Hajah Kalsom Tanah Rata (Kecemasan 24 Jam)',
    township: 'Tanah Rata',
    category: 'emergency',
    description: 'Main general public hospital with 24-hour accident & emergency (A&E) trauma unit, ambulance fleet, radiology, and inpatient wards.',
    descriptionBm: 'Hospital awam utama dengan unit kecemasan & kemalangan 24 jam, armada ambulans, farmasi dan wad rawatan.',
    location: 'Jalan Besar, 39000 Tanah Rata, Cameron Highlands',
    contact: '+60 5-491 1866 (Emergency 24H) / Dial 999',
    operatingHours: '24 Hours Daily',
    highlights: ['24H Emergency Hotline: +60 5-491 1866', 'Ambulance service available', 'Pharmacy & OPD on site'],
    tags: ['hospital', 'kecemasan', 'tanah rata', 'doktor', 'ubat', 'emergency', 'ambulance', '999']
  },
  {
    id: 'balai-polis-brinchang-tanah-rata',
    name: 'Polis Daerah Cameron Highlands (IPD & Balai Brinchang / Tanah Rata)',
    nameBm: 'Ibu Pejabat Polis Daerah Cameron Highlands',
    township: 'Tanah Rata & Brinchang',
    category: 'emergency',
    description: 'Royal Malaysia Police (PDRM) Cameron Highlands district command and township police stations for accidents, missing persons, crime reports, and road assistance.',
    descriptionBm: 'Polis Diraja Malaysia (PDRM) IPD Cameron Highlands, Balai Polis Brinchang dan Balai Polis Tanah Rata untuk laporan kemalangan, bantuan jalan raya dan keselamatan.',
    location: 'IPD Tanah Rata & Balai Polis Brinchang Main Street',
    contact: 'Balai Polis Brinchang: +60 5-491 1222 / IPD Tanah Rata: +60 5-491 1222 / 999',
    operatingHours: '24 Hours Daily',
    highlights: ['Balai Polis Brinchang: +60 5-491 1222', 'Balai Polis Ringlet: +60 5-495 1222', 'Balai Polis Kg Raja: +60 5-496 1222'],
    tags: ['polis', 'police', 'balai polis', 'brinchang', 'tanah rata', 'kemalangan', 'accident', '999']
  },
  {
    id: 'jkr-cameron-highlands',
    name: 'JKR Daerah Cameron Highlands (Slope & Road Disaster Control)',
    nameBm: 'JKR Daerah Cameron Highlands (Bencana Cerun & Jalan Raya)',
    township: 'Tanah Rata',
    category: 'emergency',
    description: 'Public Works Department handling Federal Route 59 & 185 landslide clearances, fallen tree removal, slope stability monitoring, and eBencana disaster alerts.',
    descriptionBm: 'Jabatan Kerja Raya mengendalikan pembersihan tanah runtuh FT59 & FT185, pokok tumbang, pemantauan sensor cerun dan amaran eBencana.',
    location: 'Tanah Rata District Complex',
    contact: '+60 5-491 1040 / Hotline eBencana: 05-491 1040',
    operatingHours: '24H Disaster Monitoring Operations',
    highlights: ['Roadside breakdown & landslide reports', 'Hotline: +60 5-491 1040', 'eBencana real-time verification'],
    tags: ['jkr', 'jalan runtuh', 'tanah runtuh', 'road closure', 'landslide', 'ft59', 'ft185']
  },
  {
    id: 'bomba-penyelamat-ch',
    name: 'Balai Bomba & Penyelamat Cameron Highlands',
    nameBm: 'Balai Bomba dan Penyelamat Cameron Highlands',
    township: 'Tanah Rata',
    category: 'emergency',
    description: 'Fire and rescue services specialized in jungle search-and-rescue (SAR), mountain vehicle extraction, and emergency assistance.',
    descriptionBm: 'Perkhidmatan bomba dan penyelamat terlatih dalam operasi mencari dan menyelamat (SAR) hutan, kemalangan cerun, dan kebakaran.',
    location: 'Jalan Besar, Tanah Rata',
    contact: '+60 5-491 1444 / Dial 999',
    operatingHours: '24 Hours Daily',
    highlights: ['SAR Mountain Search Team', 'Fire & Vehicle Rescue: +60 5-491 1444', 'Dial 999'],
    tags: ['bomba', 'rescue', 'sesat hutan', 'sar', 'kebakaran', '999']
  }
];

export const CAMGO_TICKETS_DIRECTORY = [
  {
    name: 'Cameron Flora Park',
    price: 'RM 50 (Adult), RM 25 (Child 4-12 yo)',
    notes: 'Includes shuttle transfer from Flora Park valley pickup point to top plateau.'
  },
  {
    name: 'The Sheep Sanctuary (Kea Farm)',
    price: 'RM 15 (Adult), RM 10 (Child), Free (< 3 yo)',
    notes: 'Includes complimentary animal food container for hand-feeding sheep.'
  },
  {
    name: 'Mossy Forest Guided 4x4 Jeep Safari & State Permit',
    price: 'RM 75 / pax (includes Pahang Forestry Department permit + return 4x4 transfer)',
    notes: 'Mandatory state forestry permit included; pick-up available in Brinchang.'
  },
  {
    name: 'Cameron Lavender Garden',
    price: 'RM 20 (Adult), RM 10 (Child)',
    notes: 'Walk-in or pre-book. Complimentary parking at front entrance.'
  },
  {
    name: 'MARDI Agro Technology Park',
    price: 'RM 10 (Adult), RM 5 (Child)',
    notes: 'Agricultural research garden, English gardens, butterfly pavilion, and surau.'
  }
];

/**
 * Searches the CamGo website directory and builds rich grounded answers.
 */
export function searchCamgoWebsite(query: string, language: 'en' | 'bm' = 'en'): {
  found: boolean;
  category: string;
  response: string;
  contextText: string;
} {
  const q = (query || '').toLowerCase().trim();

  // 1. MASJID / SURAU / PRAYER / SOLAT / JUMAAT
  if (
    q.includes('masjid') ||
    q.includes('surau') ||
    q.includes('solat') ||
    q.includes('prayer') ||
    q.includes('mosque') ||
    q.includes('jumaat') ||
    q.includes('sembahyang') ||
    q.includes('wuduk') ||
    q.includes('kiblat') ||
    q.includes('subuh') ||
    q.includes('maghrib')
  ) {
    let response = '';
    if (language === 'bm') {
      response = `Senarai Masjid & Surau di Cameron Highlands (Ditemui dalam Direktori CamGo):

1. **Masjid Abu Bakar (Masjid Daerah Tanah Rata)**
   • Lokasi: Persiaran Camellia 4, Tanah Rata (berhampiran pejabat daerah)
   • Kemudahan: Dewan solat luas, kemudahan wuduk selesa, ruang solat wanita, parkir luas.
   • Solat Jumaat: Diadakan setiap minggu untuk seluruh kariah Tanah Rata.

2. **Masjid Tengku Ahmad (Pekan Brinchang)**
   • Lokasi: Jalan Besar Brinchang (berhadapan Balai Polis Brinchang)
   • Kemudahan: Lokasi sangat strategik di tengah pekan Brinchang, dekat hotel & kedai makan.
   • Solat Jumaat: Diadakan setiap minggu untuk kariah Brinchang.

3. **Masjid Kayu Al-Hidayah (Tanah Rata)**
   • Lokasi: Jalan Pine berhampiran Century Pines Resort
   • Keistimewaan: Seni bina kayu tradisional tanah tinggi yang tenang dikelilingi pokok pain sejuk.

4. **Surau Al-Falah (Kea Farm Agro Market)**
   • Lokasi: Tepat di dalam pasar sayur Kea Farm
   • Mudah untuk pelawat melawat Kea Farm, Flora Park & Sheep Sanctuary. Dilengkapi wuduk & telekung.

5. **Surau Al-Hikmah (Golden Hills / Pasar Malam)**
   • Lokasi: Barrington Square, bersebelahan tapak Pasar Malam Golden Hills
   • Sangat memudahkan solat Maghrib dan Isyak ketika berkunjung ke pasar malam hujung minggu.

6. **Masjid Ringlet (Masjid Al-Ehsaniah)**
   • Lokasi: Pekan Ringlet (Pintu masuk selatan via Tapah FT59 & Sungai Koyan FT102).
   • Mengadakan Solat Jumaat & tempat rehat musafir.

7. **Masjid Kampung Raja**
   • Lokasi: Pekan Kampung Raja (Pintu masuk utara via Simpang Pulai FT185). Mengadakan Solat Jumaat.

8. **Surau di Tempat Tarikan**:
   • Pusat Teh BOH Sungei Palas (Surau di anjung masuk)
   • Bharat Cameron Valley Tea House 1 & 2 (Surau dengan pemandangan)
   • Big Red Strawberry Farm Brinchang (Surau di aras atas)
   • Taman Agro MARDI Tanah Rata (Surau pelawat)`;
    } else {
      response = `Mosques & Suraus (Prayer Facilities) in Cameron Highlands (from CamGo Directory):

1. **Masjid Abu Bakar (Cameron Highlands District Mosque, Tanah Rata)**
   • Location: Persiaran Camellia 4, Tanah Rata (near municipal center)
   • Facilities: Large main prayer hall, clean ablution (wudhu), dedicated women's section, ample parking.
   • Friday Prayers (Solat Jumaat): Held weekly.

2. **Masjid Tengku Ahmad (Brinchang Town Mosque)**
   • Location: Main Road Brinchang (opposite Brinchang Police Station)
   • Facilities: Walking distance for visitors staying in central Brinchang or near Cactus Point.
   • Friday Prayers (Solat Jumaat): Held weekly.

3. **Masjid Kayu Al-Hidayah (Wooden Mosque, Tanah Rata)**
   • Location: Jalan Pine near Century Pines Resort
   • Highlights: Beautiful traditional alpine timber architecture surrounded by serene pine trees.

4. **Surau Al-Falah (Kea Farm Agro Market)**
   • Location: Directly inside Kea Farm market
   • Ideal for shoppers and visitors at Kea Farm, Flora Park, and the Sheep Sanctuary. Prayer rugs & telekung provided.

5. **Surau Al-Hikmah (Golden Hills / Weekend Night Market)**
   • Location: Barrington Square, right next to the Golden Hills Night Market promenade
   • Convenient prayer stop for Maghrib & Isyak prayers during evening market visits.

6. **Masjid Ringlet (Masjid Al-Ehsaniah)**
   • Location: Ringlet town (Southern gateway from Tapah FT59 and Sungai Koyan FT102). Friday prayers held.

7. **Masjid Kampung Raja**
   • Location: Kampung Raja town (Northern gateway from Simpang Pulai FT185). Friday prayers held.

8. **Prayer Rooms at Major Attractions**:
   • BOH Sungei Palas Tea Centre (Surau with wudhu on site)
   • Cameron Valley Tea House 1 & 2 (Surau available)
   • Big Red Strawberry Farm Brinchang (Surau on upper greenhouse level)
   • MARDI Agro Technology Park Tanah Rata (Visitor prayer room)`;
    }

    const contextText = CAMGO_MASJID_SURAU_DIRECTORY.map(
      (m) => `${m.name} (${m.township}): ${m.description}. Location: ${m.location}. Facilities: ${m.highlights?.join(', ')}`
    ).join('\n');

    return { found: true, category: 'masjid_surau', response, contextText };
  }

  // 2. TICKETS & PRICES & BOOKINGS
  if (
    q.includes('ticket') ||
    q.includes('tiket') ||
    q.includes('harga') ||
    q.includes('price') ||
    q.includes('fee') ||
    q.includes('tambang') ||
    q.includes('masuk') ||
    q.includes('admission')
  ) {
    let response = '';
    if (language === 'bm') {
      response = `Senarai Harga Tiket & Pas Tarikan Cameron Highlands (Boleh Ditempah di Portal CamGo):

1. **Cameron Flora Park (Kea Farm)**
   • Harga: RM 50 (Dewasa), RM 25 (Kanak-kanak 4-12 tahun)
   • Termasuk pengangkutan ulang-alik van ke kawasan puncak bunga.

2. **The Sheep Sanctuary (Kea Farm)**
   • Harga: RM 15 (Dewasa), RM 10 (Kanak-kanak), Percuma (< 3 tahun)
   • Termasuk bekas makanan biri-biri percuma untuk aktiviti memberi makan.

3. **Pakej Mossy Forest 4x4 Safari & Permit Rasmi**
   • Harga: RM 75 / seorang
   • Termasuk permit Jabatan Perhutanan Negeri Pahang & pengangkutan Land Rover 4x4 pergi-balik dari Brinchang.

4. **Cameron Lavender Garden (Tringkap)**
   • Harga: RM 20 (Dewasa), RM 10 (Kanak-kanak)
   • Terkenal dengan ais krim lavender dan taman berteres.

5. **Taman Eko Agro MARDI (Tanah Rata)**
   • Harga: RM 10 (Dewasa), RM 5 (Kanak-kanak)

Anda boleh meneliti maklumat tiket dan membuat tempahan terus melalui menu **"Tickets & Passes"** di portal CamGo!`;
    } else {
      response = `Attraction Ticket Prices & Passes for Cameron Highlands (Available on CamGo):

1. **Cameron Flora Park (Kea Farm)**
   • Rate: RM 50 (Adult), RM 25 (Child 4-12 yo)
   • Includes valley shuttle van transfer up to the hilltop floral pavilions.

2. **The Sheep Sanctuary (Kea Farm)**
   • Rate: RM 15 (Adult), RM 10 (Child), Free for toddlers under 3
   • Includes complimentary sheep feed box.

3. **Mossy Forest Guided 4x4 Safari + Official Forestry Permit**
   • Rate: RM 75 / person
   • Includes mandatory Pahang Forestry Department permit and return 4x4 Land Rover transport from Brinchang.

4. **Cameron Lavender Garden (Tringkap)**
   • Rate: RM 20 (Adult), RM 10 (Child)
   • Home of lavender soft-serve ice cream and floral terraces.

5. **MARDI Agro Technology Park (Tanah Rata)**
   • Rate: RM 10 (Adult), RM 5 (Child)

You can explore these tickets and check availability right inside the CamGo **"Tickets & Passes"** section!`;
    }

    const contextText = CAMGO_TICKETS_DIRECTORY.map((t) => `${t.name}: ${t.price}. Notes: ${t.notes}`).join('\n');
    return { found: true, category: 'tickets', response, contextText };
  }

  // 3. EMERGENCY, POLICE, HOSPITAL, BREAKDOWN, ACCIDENT
  if (
    q.includes('hospital') ||
    q.includes('klinik') ||
    q.includes('clinic') ||
    q.includes('doctor') ||
    q.includes('doktor') ||
    q.includes('police') ||
    q.includes('polis') ||
    q.includes('bomba') ||
    q.includes('emergency') ||
    q.includes('kecemasan') ||
    q.includes('rosak') ||
    q.includes('breakdown') ||
    q.includes('kemalangan') ||
    q.includes('accident') ||
    q.includes('sos') ||
    q.includes('jkr')
  ) {
    let response = '';
    if (language === 'bm') {
      response = `Talian Bantuan & Kecemasan Cameron Highlands (CamGo SOS Direct):

• **Kecemasan Am Malaysia**: Hubungi **999**
• **Hospital Sultanah Hajah Kalsom (Tanah Rata - Kecemasan 24 Jam)**: **+60 5-491 1866**
• **Ibu Pejabat Polis Daerah Cameron Highlands**: **+60 5-491 1222**
• **Balai Polis Brinchang**: **+60 5-491 2222**
• **Balai Polis Ringlet**: **+60 5-495 1222**
• **Balai Polis Kampung Raja**: **+60 5-496 1222**
• **Balai Bomba & Penyelamat Cameron Highlands**: **+60 5-491 1444**
• **JKR Cameron Highlands (Bencana Jalan & Cerun)**: **+60 5-491 1040**
• **Majlis Daerah Cameron Highlands (MDCH)**: **+60 5-491 1455**

Tip: Anda juga boleh menekan butang **"SOS Emergency Dispatch"** merah di skrin CamGo untuk menghantar koordinat GPS kecemasan langsung berserta pautan Google Maps kepada pihak bantuan!`;
    } else {
      response = `Cameron Highlands Emergency Hotlines & Assistance (CamGo SOS Direct):

• **National Emergency Service**: Call **999**
• **Hospital Sultanah Hajah Kalsom (Tanah Rata - 24H Emergency)**: **+60 5-491 1866**
• **District Police Headquarters (IPD Tanah Rata)**: **+60 5-491 1222**
• **Brinchang Police Station**: **+60 5-491 2222**
• **Ringlet Police Station**: **+60 5-495 1222**
• **Kampung Raja Police Station**: **+60 5-496 1222**
• **Fire & Rescue Department (Bomba CH)**: **+60 5-491 1444**
• **JKR Cameron Highlands (Roadworks & Landslides)**: **+60 5-491 1040**
• **MDCH Municipal Council**: **+60 5-491 1455**

Safety Tip: You can also activate the red **"SOS Emergency Dispatch"** beacon on CamGo to automatically broadcast your exact GPS coordinates and Google Maps pin to rescue responders!`;
    }

    const contextText = CAMGO_EMERGENCY_DIRECTORY.map(
      (e) => `${e.name} (${e.township}): Phone ${e.contact}. Location: ${e.location}. ${e.description}`
    ).join('\n');

    return { found: true, category: 'emergency', response, contextText };
  }

  // 4. ATTRACTIONS & SIGHTSEEING
  if (
    q.includes('attraction') ||
    q.includes('tempat menarik') ||
    q.includes('lawat') ||
    q.includes('visit') ||
    q.includes('flora park') ||
    q.includes('sheep') ||
    q.includes('boh') ||
    q.includes('teh') ||
    q.includes('tea') ||
    q.includes('lavender')
  ) {
    const contextText = CAMGO_ATTRACTIONS_DIRECTORY.map(
      (a) => `${a.name} (${a.township}): ${a.description}. Hours: ${a.operatingHours}. Highlights: ${a.highlights?.join(', ')}`
    ).join('\n');
    return { found: true, category: 'attractions', response: '', contextText };
  }

  return { found: false, category: 'general', response: '', contextText: '' };
}
