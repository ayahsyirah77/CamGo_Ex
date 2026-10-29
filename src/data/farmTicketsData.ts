import { OperatingHours, Township } from '../types';

export interface FarmTicketInfo {
  id: string;
  name: string;
  township: Township;
  isFree: boolean;
  adultPriceRm: number;
  childPriceRm: number;
  operatingHours: OperatingHours;
  inclusions: string[];
  description: string;
  category: 'attraction' | 'farm' | 'tea_plantation' | 'museum';
}

export const POPULAR_FARM_TICKETS: FarmTicketInfo[] = [
  {
    id: 'cameron-flora-park',
    name: 'Cameron Flora Park',
    township: 'Brinchang',
    isFree: false,
    adultPriceRm: 50,
    childPriceRm: 25,
    operatingHours: { from: '09:00', to: '19:00', isOpen: true },
    inclusions: ['Scenic Flower Terraces', 'Hobbit House Photo Zones', 'Café Access', 'Walking Trails'],
    description: 'Vast hilltop flower garden with panoramic valley views and floral stairways.',
    category: 'attraction',
  },
  {
    id: 'sheep-sanctuary',
    name: 'The Sheep Sanctuary Kea Farm',
    township: 'Kea Farm',
    isFree: false,
    adultPriceRm: 10,
    childPriceRm: 5,
    operatingHours: { from: '09:00', to: '17:30', isOpen: true },
    inclusions: ['1x Animal Feed Pack', 'Pen Interaction', 'Highland Meadow Views', 'Souvenir Counter'],
    description: 'Interactive sheep farm located right next to Kea Farm market square.',
    category: 'farm',
  },
  {
    id: 'lavender-garden',
    name: 'Cameron Lavender Garden',
    township: 'Tringkap',
    isFree: false,
    adultPriceRm: 15,
    childPriceRm: 10,
    operatingHours: { from: '09:00', to: '18:00', isOpen: true },
    inclusions: ['Lavender Fields Walk', 'Strawberry Picking Access', 'Photo Props', 'Souvenir & Ice Cream Shop'],
    description: 'Colorful terraced garden featuring lavender fields and honey bee exhibits.',
    category: 'attraction',
  },
  {
    id: 'boh-tea-centre',
    name: 'BOH Tea Centre Sungai Palas',
    township: 'Brinchang',
    isFree: true,
    adultPriceRm: 0,
    childPriceRm: 0,
    operatingHours: { 
      from: '08:30', 
      to: '16:30', 
      isOpen: true,
      weeklySchedule: [
        { day: 'Monday', isOpen: false, from: '08:30', to: '16:30' },
        { day: 'Tuesday', isOpen: true, from: '08:30', to: '16:30' },
        { day: 'Wednesday', isOpen: true, from: '08:30', to: '16:30' },
        { day: 'Thursday', isOpen: true, from: '08:30', to: '16:30' },
        { day: 'Friday', isOpen: true, from: '08:30', to: '16:30' },
        { day: 'Saturday', isOpen: true, from: '08:30', to: '16:30' },
        { day: 'Sunday', isOpen: true, from: '08:30', to: '16:30' },
      ]
    },
    inclusions: ['Tea Factory Exhibition', 'Cliffside Café Balcony', 'Scenic Plantation Walkway'],
    description: 'Iconic mountaintop tea plantation and heritage interpretation center.',
    category: 'tea_plantation',
  },
  {
    id: 'cactus-valley',
    name: 'Cactus Valley Brinchang',
    township: 'Brinchang',
    isFree: false,
    adultPriceRm: 10,
    childPriceRm: 5,
    operatingHours: { from: '08:00', to: '18:00', isOpen: true },
    inclusions: ['Extensive Cactus & Succulent Collection', 'Flower Nursery', 'Orchard Walk'],
    description: 'Multilevel hilltop garden housing thousands of cacti and tropical plants.',
    category: 'attraction',
  },
  {
    id: 'time-tunnel-museum',
    name: 'Time Tunnel Museum',
    township: 'Brinchang',
    isFree: false,
    adultPriceRm: 8,
    childPriceRm: 5,
    operatingHours: { from: '09:00', to: '18:00', isOpen: true },
    inclusions: ['Retro Memorabilia Galleries', 'Old Cameron Highlands Photo Exhibits', 'Vintage Toy Displays'],
    description: 'First memorabilia museum showcasing local history and nostalgic artifacts.',
    category: 'museum',
  },
  {
    id: 'mossy-forest',
    name: 'Mossy Forest Boardwalk',
    township: 'Brinchang',
    isFree: false,
    adultPriceRm: 30,
    childPriceRm: 15,
    operatingHours: { from: '08:00', to: '16:00', isOpen: true },
    inclusions: ['Elevated Wooden Boardwalk', 'Guided Eco Interpretation', 'Cloud Forest Summit View'],
    description: 'Prehistoric tropical cloud forest blanketed in thick moss and mist.',
    category: 'attraction',
  },
  {
    id: 'parit-waterfall',
    name: 'Parit Waterfall & Trails 1-14',
    township: 'Tanah Rata',
    isFree: true,
    adultPriceRm: 0,
    childPriceRm: 0,
    operatingHours: { from: '00:00', to: '23:59', isOpen: true, isOpen24Hours: true },
    inclusions: ['Self-Guided Jungle Trekking', 'Waterfall Access', 'Stream Crossings'],
    description: 'Historic public recreation park and trailhead nexus for local hiking routes.',
    category: 'attraction',
  },
];
