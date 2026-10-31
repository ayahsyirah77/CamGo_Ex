/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'en' | 'bm';

export type MainCategory =
  | 'food'
  | 'travel_tourism'
  | 'accommodation'
  | 'transport'
  | 'local_services'
  | 'shopping'
  | 'services_utilities'
  | 'attraction'
  | 'business'
  | 'masjid_surau';

export type SubCategory =
  // Food & Beverages
  | 'dining'
  | 'steamboats'
  | 'cafes'
  | 'night_markets_street'
  | 'bars_nightlife'
  // Travel & Highland Tourism
  | 'attractions_sightseeing'
  | 'agrotourism_farms'
  | 'outdoor_adventure'
  | 'tour_agencies_guides'
  // Accommodation
  | 'hotels_resorts'
  | 'guesthouses'
  | 'chalets'
  | 'homestay'
  | 'camping_glamping'
  // Transport & Mobility Services
  | 'car_bike_rentals'
  | 'taxi_ehailing'
  | 'auto_repair_roadside'
  | 'fuel_ev_charging'
  // Local Services & Amenities
  | 'health_wellness'
  | 'banking_financial'
  | 'logistics_freight'
  | 'property_real_estate'
  | 'event_business_support'
  // Shopping & Local Produce
  | 'fresh_markets_produce'
  | 'souvenirs_handicrafts'
  | 'convenience_groceries'
  | 'retail_apparel'
  // Services & Utilities
  | 'plumbing_electrical'
  | 'locksmith_access'
  | 'carpentry_construction'
  | 'pest_control'
  | 'laundry_dry_cleaning'
  | 'housekeeping_maid'
  | 'cooking_gas_delivery'
  // Legacy fallbacks
  | 'transport_rental'
  | 'automotive_repair'
  | 'locksmith_hardware'
  | 'logistics_delivery'
  | 'convenience_wellness'
  | 'retail_products'
  | 'tours_nature'
  | 'agritourism_plantations'
  | 'eco_adventure'
  | 'floral_sanctuary'
  | 'culture_history'
  | 'places_of_worship'
  | 'masjid_surau'
  | 'recreation_leisure';

export type Township =
  | 'Tanah Rata'
  | 'Brinchang'
  | 'Kea Farm'
  | 'Ringlet'
  | 'Kampung Raja'
  | 'Tringkap'
  | 'Kuala Terla'
  | 'Bertam Valley'
  | 'Blue Valley';

export interface TownshipHubInfo {
  township: Township;
  description: string;
  imageUrl: string;
  clinicsOrHospitals: string;
  policeStation: string;
  publicToilet: string;
  gasStation: string;
  placesOfInterest: string[];
}

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface DaySchedule {
  day: DayOfWeek;
  isOpen: boolean; // true = Open, false = Closed for this day
  from: string;    // e.g. "08:33"
  to: string;      // e.g. "22:30"
}

export interface OperatingHours {
  from: string; // e.g. "09:00"
  to: string;   // e.g. "18:00"
  isOpen: boolean;
  isOpen24Hours?: boolean;
  weeklySchedule?: DaySchedule[];
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  nameBm?: string;
  category: MainCategory;
  subCategory: SubCategory;
  township: Township;
  description: string;
  descriptionBm?: string;
  location: string;
  contact?: string;
  operatingHours: OperatingHours;
  coordinates: Coordinates;
  elevation: string; // e.g. "1,500m"
  rating: number;
  reviewsCount: number;
  priceRange?: string; // e.g. "RM - RM"
  tags: string[];
  imageUrl: string;
  trafficStatus?: 'smooth' | 'moderate' | 'heavy';
  recommendedAlternative?: string;
  checkIn?: string;
  checkOut?: string;

  // Real-Time Operational Status Flags from Vendor Dashboard
  realTimeStatus?: VendorRealTimeStatus;
  diyHarvestStatus?: DiyHarvestStatus;
  parkingStatus?: ParkingStatus;
  roomAvailabilityStatus?: RoomAvailabilityStatus;
  verificationStatus?: VendorVerificationStatus;
  dietaryTags?: DietaryTag[];
  whatsappNumber?: string;
  wazeUrl?: string;
  googleMapsUrl?: string;
  isSponsored?: boolean;
  includeInPlanner?: boolean;
  createdAt?: string;
}

export interface WeatherForecastDay {
  day: string;
  dayBm?: string;
  temp?: number;
  tempHigh?: number;
  tempLow?: number;
  condition: string;
  conditionBm?: string;
}

export interface WeatherData {
  township: Township;
  temperature?: number;
  temp: number;
  feelsLike?: number;
  elevation?: string;
  condition: string;
  conditionBm?: string;
  humidity: number;
  altitude?: string;
  uvIndex?: number;
  windSpeed?: number;
  rainfallProbability?: number;
  forecast: WeatherForecastDay[];
}

export interface TrafficAlert {
  id: string;
  route?: string;
  location?: string;
  roadName?: string;
  status: 'smooth' | 'moderate' | 'heavy' | 'closed' | 'congested';
  statusBm?: string;
  description?: string;
  message?: string;
  messageBm?: string;
  advisory?: string;
  advisoryBm?: string;
  updatedAt: string;
  alternativeRoute?: string;
  alternativeRouteBm?: string;
  delayMinutes?: number;
  reportedTime?: string;
}

export interface HazardAlert {
  id: string;
  title: string;
  titleBm?: string;
  severity: 'low' | 'medium' | 'high' | 'moderate' | 'critical';
  location: string;
  description: string;
  descriptionBm?: string;
  date?: string;
  type?: string;
  reportedTime?: string;
  reportedAt?: string;
  status?: string;
  source: string;
  timestamp?: string;
  // Official JKR & MDCH agency integration metadata
  agency?: 'JKR' | 'MDCH' | 'APM' | 'PDRM';
  agencyName?: string;
  sourceUrl?: string;
  sourceType?: 'facebook_page' | 'ebencana_portal' | 'mdch_portal' | 'web_scraper';
  referenceNo?: string;
  roadRoute?: string;
  actionTaken?: string;
  actionTakenBm?: string;
  agencyHotline?: string;
  isVerifiedAgency?: boolean;
  lastVerified?: string;
}

export interface EventNotification {
  id: string;
  title: string;
  titleBm?: string;
  date: string;
  township?: Township;
  location?: string;
  category?: string;
  imageUrl?: string;
  featured?: boolean;
  description: string;
  descriptionBm?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  titleBm?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  township: Township;
  elevation?: string;
  category: string;
  photographer?: string;
  likes?: number;
  description: string;
  descriptionBm?: string;
  uploadedAt?: string;
}

export interface LoungePostReply {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  timestamp: string;
}

export interface LoungePost {
  id: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  content: string;
  timestamp: string;
  likes?: number;
  upvotes?: number;
  hasUpvoted?: boolean;
  commentsCount?: number;
  township?: Township;
  image?: string;
  tag?: string;
  replies?: LoungePostReply[];
  repliesCount?: number;
}

export interface JobClassified {
  id: string;
  title: string;
  company: string;
  township: Township;
  type: string;
  category?: string;
  salary: string;
  description: string;
  contact: string;
  postedDate?: string;
  isUserCreated?: boolean;
  authorEmail?: string;
  authorName?: string;
}

export interface ItineraryActivity {
  id: string;
  placeId?: string;
  title: string;
  township: Township;
  timeSlot?: string;
  estimatedDurationMins?: number;
  notes?: string;
  coordinates: Coordinates;
  elevation?: string;
  imageUrl?: string;
  travelTimeFromPrevMins?: number;
  distanceFromPrevKm?: number;
  estimatedCost?: number;
}

export interface DayItinerary {
  dayNumber: number;
  title: string;
  date?: string;
  activities: ItineraryActivity[];
}

export interface ItineraryPlan {
  id: string;
  title: string;
  days: DayItinerary[];
  updatedAt: string;
  budget?: number;
  currency?: string;
}

export interface EmergencyContact {
  label: 'ICE 1' | 'ICE 2';
  name: string;
  relationship: string;
  phone: string;
}

export interface EmergencyCard {
  fullLegalName: string;
  preferredName?: string;
  dateOfBirth: string; // YYYY-MM-DD
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
  severeAllergies: string;
  chronicConditions: string;
  currentMedications: string;
  primaryContact: EmergencyContact; // ICE 1
  secondaryContact: EmergencyContact; // ICE 2
  designatedSosNumber?: string;
  updatedAt?: string;
}

export interface EmergencyDispatchRecord {
  id: string;
  userId?: string;
  recipientPhone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  googleMapsUrl: string;
  emergencyCard: EmergencyCard;
  dispatchedAt: string;
  status: 'dispatched' | 'pending' | 'failed';
  channel: string;
}

export interface FarmTicket {
  id: string;
  name: string;
  nameBm?: string;
  township: Township;
  isFree: boolean;
  adultPriceRm: number;
  childPriceRm: number;
  operatingHours: OperatingHours;
  inclusions: string[];
  description: string;
  descriptionBm?: string;
  category: MainCategory | 'attraction' | 'farm' | 'tea_plantation' | 'museum' | string;
  subCategory?: SubCategory | string;
  imageUrl?: string;
  location?: string;
}

// Vendor Self-Service Management Interfaces
export type VendorVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type VendorRealTimeStatus = 'open' | 'sold_out' | 'closed_roadworks' | 'busy';
export type DiyHarvestStatus = 'picking_open' | 'farm_open_no_picking' | 'closed_season';
export type ParkingStatus = 'private_available' | 'street_busy' | 'valet_only';
export type RoomAvailabilityStatus = 'rooms_available' | 'limited_units' | 'fully_booked' | 'not_applicable';
export type DietaryTag = 'halal_certified' | 'muslim_owned' | 'pork_free' | 'vegetarian_friendly';
export type SubscriptionTier = 'free_trial' | 'monthly_pro' | 'annual_pro' | 'pay_per_feature';

export interface VendorListing {
  id: string;
  ownerUid: string;
  ownerEmail: string;
  businessName: string;
  ssmNumber?: string;
  mdchLicense?: string;
  verificationStatus: VendorVerificationStatus;
  verificationDocUrl?: string;
  category: MainCategory;
  subCategory: SubCategory;
  township: Township;
  address: string;
  contactPhone: string;
  whatsappNumber: string;
  whatsappTemplateMessage?: string;
  description: string;
  operatingHours: OperatingHours;
  coverImage: string;
  logoUrl?: string;
  galleryImages: string[];
  menuPdfOrUrl?: string;
  wazeUrl?: string;
  googleMapsUrl?: string;
  coordinates: Coordinates;
  
  // Real-Time Operational Flags & Admin Activation
  isBookingEnabled?: boolean;
  realTimeStatus: VendorRealTimeStatus;
  diyHarvestStatus?: DiyHarvestStatus;
  parkingStatus: ParkingStatus;
  roomAvailabilityStatus?: RoomAvailabilityStatus;
  motorbikeFleetStatus?: MotorbikeFleetStatus;
  motorbikePackages?: MotorbikePackage[];
  enabledFlags?: {
    operatingStatus?: boolean;
    diyHarvestStatus?: boolean;
    parkingStatus?: boolean;
    roomAvailabilityStatus?: boolean;
    motorbikeFleetStatus?: boolean;
    dietaryTagsEnabled?: boolean;
  };
  dietaryTagsEnabled?: boolean;
  dietaryTags: DietaryTag[];
  
  // Subscription & Promotion
  tier: SubscriptionTier;
  billingCadence: 'monthly' | 'annual';
  tierExpiresAt: string;
  isSponsored: boolean;
  profileHealthScore: number; // 0 to 100
  createdAt: string;
  updatedAt: string;
}

export interface VendorVoucher {
  id: string;
  vendorId: string;
  businessName: string;
  title: string;
  description: string;
  code: string;
  discountPercentage?: number;
  discountRm?: number;
  validUntil: string;
  claimedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface VendorEventItem {
  id: string;
  vendorId: string;
  businessName: string;
  title: string;
  date: string;
  time: string;
  location: string;
  township: Township;
  description: string;
  imageUrl?: string;
  ticketPriceRm?: number;
  createdAt: string;
}

export interface VendorStaffMember {
  id: string;
  vendorId: string;
  name: string;
  email: string;
  role: 'manager' | 'receptionist';
  status: 'active' | 'invited';
  createdAt: string;
}

export interface VendorAnalyticsData {
  vendorId: string;
  views7d: number;
  views30d: number;
  views90d: number;
  profileClicks: number;
  whatsappClicks: number;
  mapTriggers: number;
  trafficSources: {
    mapSearch: number;
    directory: number;
    microclimate: number;
    searchFilters: number;
  };
  demographics: {
    bmPercent: number;
    enPercent: number;
  };
  peakVisitorHours: { hour: string; count: number }[];
}

export interface BeaconMember {
  id: string;
  name: string;
  avatarColor: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number | null;
  speed?: number | null;
  altitude?: number | null;
  batteryLevel?: number | null;
  isSharing: boolean;
  updatedAt: string;
  nearestLandmark?: string;
}

export interface BeaconChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor?: string;
  text: string;
  timestamp: string;
}

export interface BeaconSession {
  id: string;
  code: string;
  name: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  expiresAt: string;
  durationHours: 2 | 8 | 24;
  status: 'active' | 'ended';
  members?: Record<string, BeaconMember>;
  messages?: BeaconChatMessage[];
}

export type MotorbikeFleetStatus = 'high' | 'limited' | 'sold_out' | 'not_applicable';

export interface MotorbikePackage {
  id: string;
  name: string;
  cc: string;
  dailyRateRm: number;
  imageUrl: string;
  helmetsIncluded: number;
  packageDetails?: string;
  addonDetails?: string;
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
  isBookingEnabled?: boolean;
  verificationStatus?: VendorVerificationStatus;
  ownerEmail?: string;
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
  pickupTime: string;
  startDate: string;
  endDate: string;
  days: number;
  helmetsAddon: number;
  includePhoneMount: boolean;
  totalRm: number;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: string;
}