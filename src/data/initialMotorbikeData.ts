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

export const INITIAL_MOTORBIKE_PARTNERS: MotorbikeRentalPartner[] = [
  {
    id: 'moto-partner-1',
    businessName: 'Highland Ridge Two-Wheels & Scooter Rental',
    township: 'Tanah Rata',
    imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    operatingStatus: 'open',
    fleetAvailability: 'high',
    contactPhone: '+60 5-491 8821',
    whatsappNumber: '+60124918821',
    packages: [
      {
        id: 'pkg-nmax-155',
        name: 'Yamaha NMAX 155cc ABS',
        cc: '155cc',
        dailyRateRm: 80,
        imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
        helmetsIncluded: 2,
      },
      {
        id: 'pkg-vario-125',
        name: 'Honda Vario 125cc Scooter',
        cc: '125cc',
        dailyRateRm: 55,
        imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
        helmetsIncluded: 2,
      },
    ],
  },
  {
    id: 'moto-partner-2',
    businessName: 'Brinchang Peak MotoGo & Scooter Hub',
    township: 'Brinchang',
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
    operatingStatus: 'open',
    fleetAvailability: 'limited',
    contactPhone: '+60 5-496 9912',
    whatsappNumber: '+60194969912',
    packages: [
      {
        id: 'pkg-adv-160',
        name: 'Honda ADV 160cc Adventure',
        cc: '160cc',
        dailyRateRm: 95,
        imageUrl: 'https://images.unsplash.com/photo-1609630875172-230bd10d2444?auto=format&fit=crop&w=600&q=80',
        helmetsIncluded: 2,
      },
      {
        id: 'pkg-beat-110',
        name: 'Honda BeAT 110cc Economy',
        cc: '110cc',
        dailyRateRm: 45,
        imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
        helmetsIncluded: 2,
      },
    ],
  },
  {
    id: 'moto-partner-3',
    businessName: 'Kea Farm Valley Scooter & Bike Tours',
    township: 'Kea Farm',
    imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80',
    operatingStatus: 'open',
    fleetAvailability: 'high',
    contactPhone: '+60 5-496 1144',
    whatsappNumber: '+60114961144',
    packages: [
      {
        id: 'pkg-nmax-155-kea',
        name: 'Yamaha NMAX 155cc Touring',
        cc: '155cc',
        dailyRateRm: 85,
        imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
        helmetsIncluded: 2,
      },
    ],
  },
];
