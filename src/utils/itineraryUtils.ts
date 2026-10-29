import { ItineraryActivity } from '../types';

export const POPULAR_SPOT_TICKET_PRICES: Record<string, number> = {
  'flora park': 50,
  'cameron flora park': 50,
  'sheep sanctuary': 10,
  'the sheep sanctuary': 10,
  'lavender garden': 15,
  'cameron lavender garden': 15,
  'boh tea': 0,
  'boh tea centre': 0,
  'boh tea centre sungai palas': 0,
  'boh tea estate': 0,
  'cactus valley': 10,
  'time tunnel': 8,
  'time tunnel museum': 8,
  'mossy forest': 30,
  'mossy forest boardwalk': 30,
  'parit waterfall': 0,
  'kea farm market': 0,
};

export const getAttractionTicketPrice = (title: string, subCategory?: string): number => {
  if (!title) return getCategoryDefaultCost(subCategory || '');
  const lower = title.toLowerCase();

  for (const [key, price] of Object.entries(POPULAR_SPOT_TICKET_PRICES)) {
    if (lower.includes(key)) {
      return price;
    }
  }

  return getCategoryDefaultCost(subCategory || '');
};

export const calculateTotalCost = (activities: ItineraryActivity[]): number => {
  return activities.reduce((sum, act) => sum + (act.estimatedCost ?? 0), 0);
};

export const getCategoryDefaultCost = (subCategory: string): number => {
  switch (subCategory) {
    case 'attraction':
    case 'floral_sanctuary':
    case 'eco_adventure':
      return 20; // Default entry fee
    case 'steamboats':
    case 'dining':
      return 50; // Default meal cost
    case 'transport_rental':
      return 100; // Default rental cost
    default:
      return 0;
  }
};
