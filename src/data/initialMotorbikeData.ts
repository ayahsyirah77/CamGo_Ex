import { Township } from '../types';

export interface MotorbikePackage {
  id: string;
  name: string;
  cc: string;
  dailyRateRm: number;
  imageUrl: string;
  helmetsIncluded: number;
}

export interface MotorbikeRentalPartner {
  id: string;
  businessName: string;
  township: Township;
  imageUrl: string;
  operatingStatus: 'open' | 'closed';
  fleetAvailability: 'high' | 'limited' | 'sold_out';
  contactPhone: string;
  whatsappNumber: string;
  packages: MotorbikePackage[];
}

export interface MotorbikeBookingRecord {
  id: string;
  partnerId: string;
  partnerName: string;
  packageId: string;
  packageName: string;
  renterName: string;
  renterEmail: string;
  renterPhone: string;
  pickupTownship: Township;
  startDate: string;
  endDate: string;
  days: number;
  helmetsAddon: number;
  totalRm: number;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: string;
}

export const INITIAL_MOTORBIKE_PARTNERS: MotorbikeRentalPartner[] = [];
