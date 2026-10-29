/**
 * Utility functions for Find My Party / Group Beacon tracking
 * Haversine distance, forward bearing, nearest highland landmarks & staleness calculation
 */

export interface Landmark {
  name: string;
  lat: number;
  lon: number;
  area: string;
}

export const HIGHLAND_LANDMARKS: Landmark[] = [
  { name: 'Brinchang Golden Hills Night Market', lat: 4.4920, lon: 101.3855, area: 'Golden Hills' },
  { name: 'Kea Farm Vegetable & Fruit Market', lat: 4.5050, lon: 101.4080, area: 'Kea Farm' },
  { name: 'Boh Tea Sungai Palas Centre', lat: 4.5173, lon: 101.4072, area: 'Sungai Palas' },
  { name: 'Mossy Forest Boardwalk & Tower', lat: 4.5242, lon: 101.3824, area: 'Gunung Brinchang' },
  { name: 'Gunung Brinchang Peak & Trailhead', lat: 4.5180, lon: 101.3840, area: 'Gunung Brinchang' },
  { name: 'Flora Park Cameron Highlands', lat: 4.5085, lon: 101.4095, area: 'Kea Farm' },
  { name: 'The Sheep Sanctuary', lat: 4.5042, lon: 101.4075, area: 'Kea Farm' },
  { name: "Raju's Hill Strawberry Farm", lat: 4.5065, lon: 101.4090, area: 'Kea Farm' },
  { name: 'Cactus Valley & Flower Garden', lat: 4.4950, lon: 101.3910, area: 'Brinchang' },
  { name: 'Tanah Rata Heritage Town Square', lat: 4.4712, lon: 101.3800, area: 'Tanah Rata' },
  { name: 'MARDI Agro Technology Park', lat: 4.4730, lon: 101.3880, area: 'Tanah Rata' },
  { name: 'Trail 3 & 5 Trailhead (Berembun)', lat: 4.4750, lon: 101.3920, area: 'Tanah Rata' },
  { name: 'Robinson Falls / Trail 9 Entrance', lat: 4.4640, lon: 101.3870, area: 'Tanah Rata' },
  { name: 'Gunung Irau Mountain Trailhead', lat: 4.5280, lon: 101.3780, area: 'Batu Brinchang' },
  { name: 'Cameron Valley Bharat Tea House 1', lat: 4.4550, lon: 101.3680, area: 'Ringlet - Tanah Rata' },
  { name: 'Kampung Raja Main Junction', lat: 4.5680, lon: 101.4110, area: 'Kampung Raja' },
  { name: 'Tringkap Rose Valley & Market', lat: 4.5190, lon: 101.4280, area: 'Tringkap' },
  { name: 'Ringlet Town & Lake View', lat: 4.4150, lon: 101.3830, area: 'Ringlet' },
];

/**
 * Calculate Great Circle distance between two coordinates in meters using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance in meters to readable format (e.g., '140 m' or '1.8 km')
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Calculate initial compass bearing (azimuth) from point 1 to point 2 in degrees (0 - 360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = ((theta * 180) / Math.PI + 360) % 360;

  return Math.round(bearing);
}

/**
 * Get cardinal direction string from bearing degrees (e.g. N, NE, E, SE, S, SW, W, NW)
 */
export function getCompassCardinal(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
  const index = Math.round((bearing % 360) / 45);
  return directions[index];
}

/**
 * Find the nearest Cameron Highlands landmark for a given coordinate
 */
export function getNearestHighlandLandmark(lat: number, lon: number): string {
  let closest: Landmark | null = null;
  let minDistance = Infinity;

  for (const lm of HIGHLAND_LANDMARKS) {
    const dist = calculateHaversineDistance(lat, lon, lm.lat, lm.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = lm;
    }
  }

  if (!closest) return 'Cameron Highlands';

  if (minDistance < 200) {
    return `At ${closest.name}`;
  } else if (minDistance < 1000) {
    return `~${Math.round(minDistance)}m from ${closest.name}`;
  } else {
    return `Near ${closest.name} (${(minDistance / 1000).toFixed(1)}km)`;
  }
}

/**
 * Check if a location timestamp is stale (e.g., > 3 minutes without update)
 */
export function isLocationStale(updatedAt: string, thresholdMs: number = 3 * 60 * 1000): boolean {
  const pingTime = new Date(updatedAt).getTime();
  if (isNaN(pingTime)) return true;
  return Date.now() - pingTime > thresholdMs;
}

/**
 * Format relative time (e.g., "Just now", "2 mins ago", "15 mins ago")
 */
export function formatTimeAgo(updatedAt: string): string {
  const pingTime = new Date(updatedAt).getTime();
  if (isNaN(pingTime)) return 'Unknown';
  const diffSec = Math.floor((Date.now() - pingTime) / 1000);

  if (diffSec < 20) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Generate a clean Cameron Highlands Group Beacon Code (e.g., CAMGO-TRIP-882)
 */
export function generateBeaconCode(): string {
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `CAMGO-TRIP-${randomNum}`;
}
