import { OperatingHours, DayOfWeek, DaySchedule } from '../types';
export type { OperatingHours, DayOfWeek, DaySchedule };

export function parseElevationToMeters(elevationStr: string): number {
  const cleaned = elevationStr.replace(/[^0-9]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function getElevationTier(elevationStr: string): 'Peak' | 'Highland' | 'Valley' {
  const meters = parseElevationToMeters(elevationStr);
  if (meters >= 1800) return 'Peak';
  if (meters >= 1400) return 'Highland';
  return 'Valley';
}

export function formatTimeTo12Hour(time24: string): string {
  if (!time24 || time24 === '-' || !time24.includes(':')) return time24 || '-';
  const parts = time24.split(':');
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mm}${ampm}`;
}

export function getTodayDayName(): DayOfWeek {
  const dayNames: DayOfWeek[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return dayNames[new Date().getDay()];
}

export function getTodayDaySchedule(hours: OperatingHours): DaySchedule | null {
  if (!hours?.weeklySchedule || hours.weeklySchedule.length === 0) return null;
  const today = getTodayDayName();
  return hours.weeklySchedule.find((s) => s.day === today) || null;
}

export function isCurrentlyOpen(
  hours: OperatingHours,
  currentHourMinute?: string,
  targetDay?: DayOfWeek
): boolean {
  if (!hours) return false;
  if (hours.isOpen24Hours) return true;

  // Check weekly schedule if provided
  if (hours.weeklySchedule && hours.weeklySchedule.length > 0) {
    const day = targetDay || getTodayDayName();
    const daySched = hours.weeklySchedule.find((s) => s.day === day);
    if (daySched) {
      if (!daySched.isOpen) return false;
      const toMinutes = (timeStr: string): number => {
        const [h, m] = (timeStr || '').split(':').map((num) => parseInt(num, 10) || 0);
        return h * 60 + m;
      };

      const now = new Date();
      const current = currentHourMinute
        ? toMinutes(currentHourMinute)
        : now.getHours() * 60 + now.getMinutes();

      const from = toMinutes(daySched.from);
      const to = toMinutes(daySched.to);

      if (to < from) {
        return current >= from || current <= to;
      }
      return current >= from && current <= to;
    }
  }

  // Fallback to primary from/to
  if (!hours.isOpen) return false;

  const toMinutes = (timeStr: string): number => {
    const [h, m] = (timeStr || '').split(':').map((num) => parseInt(num, 10) || 0);
    return h * 60 + m;
  };

  const now = new Date();
  const current = currentHourMinute
    ? toMinutes(currentHourMinute)
    : now.getHours() * 60 + now.getMinutes();

  const from = toMinutes(hours.from);
  const to = toMinutes(hours.to);

  if (to < from) {
    // Overnight operation (e.g. 18:00 to 02:00)
    return current >= from || current <= to;
  }
  return current >= from && current <= to;
}

export function calculateTrafficSeverity(delayMinutes: number): 'smooth' | 'moderate' | 'heavy' {
  if (delayMinutes <= 5) return 'smooth';
  if (delayMinutes <= 20) return 'moderate';
  return 'heavy';
}

export function filterPlacesByQuery(
  places: Array<{ name: string; description: string; tags: string[]; township: string }>,
  query: string
): Array<any> {
  if (!query || query.trim() === '') return places;
  const q = query.toLowerCase().trim();
  return places.filter((p) => {
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.township.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}

export function calculateDistanceKm(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export function calculateTravelTimeMins(distanceKm: number): number {
  if (distanceKm <= 0.1) return 0;
  const driveMinutes = Math.round((distanceKm / 28) * 60 + 4);
  return Math.max(3, driveMinutes);
}

export function formatOperatingHours(hours: OperatingHours): string {
  if (!hours) return 'Hours not available';
  if (hours.isOpen24Hours) return 'Open 24 Hours';
  if (!hours.isOpen) return 'Closed';

  const todaySched = getTodayDaySchedule(hours);
  if (todaySched) {
    if (!todaySched.isOpen) return 'Closed Today';
    return `${formatTimeTo12Hour(todaySched.from)} - ${formatTimeTo12Hour(todaySched.to)}`;
  }

  return `${formatTimeTo12Hour(hours.from)} - ${formatTimeTo12Hour(hours.to)}`;
}
