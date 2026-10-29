import { VendorListing, VendorVoucher, VendorEventItem, VendorStaffMember, VendorAnalyticsData } from '../types';

export const INITIAL_VENDOR_LISTINGS: VendorListing[] = [];

export const INITIAL_VENDOR_VOUCHERS: VendorVoucher[] = [];

export const INITIAL_VENDOR_EVENTS: VendorEventItem[] = [];

export const INITIAL_VENDOR_STAFF: VendorStaffMember[] = [];

export const INITIAL_VENDOR_ANALYTICS: Record<string, VendorAnalyticsData> = {};

export function createDefaultAnalyticsForVendor(vendorId: string): VendorAnalyticsData {
  return {
    vendorId,
    views7d: 0,
    views30d: 0,
    views90d: 0,
    profileClicks: 0,
    whatsappClicks: 0,
    mapTriggers: 0,
    trafficSources: {
      mapSearch: 0,
      directory: 0,
      microclimate: 0,
      searchFilters: 0,
    },
    demographics: {
      bmPercent: 50,
      enPercent: 50,
    },
    peakVisitorHours: [
      { hour: '08:00', count: 0 },
      { hour: '10:00', count: 0 },
      { hour: '12:00', count: 0 },
      { hour: '14:00', count: 0 },
      { hour: '16:00', count: 0 },
      { hour: '18:00', count: 0 },
    ],
  };
}
