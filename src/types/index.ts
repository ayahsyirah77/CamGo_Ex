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
  | 'hostels_roomstay'
  | 'homestay'
  | 'homestay_apartment'
  | 'homestay_landed'
  | 'camping_glamping'
  // Transport & Mobility Services
  | 'car_bike_rentals'
  | 'taxi_ehailing'
  | 'auto_repair_roadside'
  | 'tyre_shop'
  | 'car_battery_shop'
  | 'fuel_ev_charging'
  // Local Services & Amenities
  | 'clinic_hospital'
  | 'health_wellness'
  | 'banking_financial'
  | 'logistics_freight'
  | 'property_real_estate'
  | 'event_business_support'
  | 'public_toilets_restrooms'
  | 'parking'
  // Shopping & Local Produce
  | 'fresh_markets_produce'
  | 'souvenirs_handicrafts'
  | 'convenience_groceries'
  | 'retail_apparel'
  | 'hardware_store'
  | 'lighting_store'
  | 'furniture'
  | 'telecommunication'
  | 'gadgets'
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
  | 'jumaat_masjid'
  | 'other_surau'
  | 'recreation_leisure'
  // Business Taxonomy Subcategories
  | 'fb_restaurants_cafes'
  | 'fb_fast_food'
  | 'fb_bakeries'
  | 'fb_cloud_kitchens'
  | 'fb_food_trucks'
  | 'fb_beverage_boba'
  | 'fb_catering'
  | 'retail_fashion'
  | 'retail_electronics'
  | 'retail_home_furniture'
  | 'retail_groceries_produce'
  | 'retail_beauty_skincare'
  | 'retail_books_stationery'
  | 'retail_auto_parts'
  | 'realestate_residential'
  | 'realestate_vacation_homestay'
  | 'realestate_commercial'
  | 'realestate_agritourism_farm'
  | 'rental_car_van'
  | 'rental_motorcycle_scooter'
  | 'rental_powersports_marine'
  | 'rental_heavy_machinery'
  | 'rental_photo_audio'
  | 'services_home_carpentry'
  | 'services_cleaning_pest'
  | 'services_auto_repair'
  | 'services_it_software'
  | 'services_consulting'
  | 'services_photo_events'
  | 'services_surprise_delivery'
  | 'services_surprise_planner'
  | 'tourism_tours_packages'
  | 'tourism_ticketing_attractions'
  | 'tourism_event_venues'
  | 'tourism_agritourism_farm';

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

export interface PrayerTimes {
  subuh: string;
  syuruk: string;
  zohor: string;
  asar: string;
  maghrib: string;
  isyak: string;
}

export interface TownshipHubInfo {
  township: Township;
  description: string;
  imageUrl: string;
  clinicsOrHospitals: string;
  policeStation: string;
  publicToilet: string;
  gasStation: string;
  placesOfInterest: string[];
  prayerTimes?: PrayerTimes;
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
  totalBays?: number;
  availableBays?: number;
  createdAt?: string;
  reviews?: PlaceReview[];
}

export interface PlaceReview {
  id: string;
  placeId: string;
  authorName: string;
  rating: number;
  comment: string;
  photoUrl?: string;
  timestamp: string;
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
  sourceType?: 'facebook_page' | 'ebencana_portal' | 'mdch_portal' | 'pdrm_portal' | 'web_scraper' | 'google_search_grounding';
  referenceNo?: string;
  roadRoute?: string;
  actionTaken?: string;
  actionTakenBm?: string;
  agencyHotline?: string;
  isVerifiedAgency?: boolean;
  lastVerified?: string;
}

export type CamgoHazardType =
  | 'landslide'
  | 'accident'
  | 'roadblock'
  | 'fallen_tree'
  | 'flood'
  | 'sudden_congestion';

export interface CamgoHazard {
  id: string;
  title: string;
  titleBm?: string;
  description: string;
  descriptionBm?: string;
  type: CamgoHazardType;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  location: string;
  corridor?: string;
  milestoneKm?: number | null;
  lat: number;
  lng: number;
  source: string;
  sourceChannel?: string;
  rawText?: string;
  status: 'active' | 'cleared' | 'pending';
  stillThereVotes: number;
  clearedVotes: number;
  imageUrl?: string;
  author?: string;
  isProvisional?: boolean;
  baselineSpeedKmh?: number;
  liveSpeedKmh?: number;
  speedDropPercent?: number;
  extractionMethod?: 'gemini_multimodal' | 'deterministic_nlp_fallback' | 'telemetry_anomaly';
  timestamp: string;
  updatedAt?: string;
  clearedAt?: string;
}

export interface VisitorLogEntry {
  id: string;
  visitorId: string;
  timestamp: string;
  device: 'Mobile' | 'Desktop';
  path: string;
  userRole?: 'admin' | 'vendor' | 'user' | 'guest';
  userName?: string;
  isUniqueNew?: boolean;
}

export interface SiteVisitorStats {
  totalVisits: number;
  uniqueVisitors: number;
  todayVisits: number;
  todayDate: string;
  mobileVisits: number;
  desktopVisits: number;
  dailyCounts: Record<string, number>;
  recentVisits: VisitorLogEntry[];
  lastUpdated: string;
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

export type ClassifiedCategoryType =
  | 'Job Offer'
  | 'Job Wanted'
  | 'Interview'
  | 'Service Offered'
  | 'Service Wanted'
  | 'Item For Sale'
  | 'Item Wanted'
  | string;

export interface JobClassified {
  id: string;
  title: string;
  company: string;
  township: Township;
  type: ClassifiedCategoryType;
  category?: ClassifiedCategoryType;
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

export interface AccommodationUnitConfig {
  id: string;
  unitLabel: string; // e.g. "Unit 1"
  unitCode: string; // e.g. "CH-1"
  propertyName?: string; // Custom property title displayed on Verified Stays card
  isAvailable: boolean;
  checkInTime?: string; // e.g. "15:00"
  checkOutTime?: string; // e.g. "12:00"
  parkingType?: 'private_available' | 'public_parking' | 'valet' | 'none';
  parkingDetails?: string;
  roomTypes?: Array<{
    id: string;
    name: string;
    quantity: number;
    pricePerNight: number;
    peakPricePerNight?: number;
    bedConfig?: string;
    maxOccupancy?: number;
  }>;
  amenityAddons?: Array<{
    id: string;
    name: string;
    priceRm: number;
    enabled: boolean;
  }>;
  breakfastIncluded?: boolean;
  roomsPerUnit?: number;
  bathrooms?: number;
  cookingPermitted?: boolean;
  kitchenNotes?: string;
  houseRules?: string;
}

export interface AccommodationSpecifics {
  units?: AccommodationUnitConfig[];
  selectedUnitId?: string;
  parkingType?: 'private_available' | 'public_parking' | 'valet' | 'none';
  parkingDetails?: string;
  roomTypes?: Array<{
    id: string;
    name: string;
    quantity: number;
    pricePerNight: number;
    peakPricePerNight?: number;
    bedConfig?: string;
    maxOccupancy?: number;
  }>;
  roomAvailabilityStatus?: 'rooms_available' | 'limited_units' | 'fully_booked' | 'not_applicable';
  breakfastIncluded?: boolean;
  bedConfig?: string;
  checkInWindow?: string;
  checkOutWindow?: string;
  maxOccupancy?: number;
  housekeepingStatus?: 'clean_ready' | 'turnover_in_progress' | 'inspection_needed' | 'deep_cleaning';
  houseRules?: string;
  amenityAddons?: Array<{
    id: string;
    name: string;
    priceRm: number;
    enabled: boolean;
  }>;
  apartment?: {
    totalUnits?: number;
    roomsPerUnit?: number;
    bathrooms?: number;
    cookingPermitted?: boolean;
    kitchenNotes?: string;
    facilities?: string[];
  };
}

export interface FoodBeverageSpecifics {
  dietaryCompliance?: ('halal_certified' | 'muslim_owned' | 'pork_free' | 'non_halal' | 'vegetarian_vegan')[];
  parkingAvailable?: boolean;
  parkingDetails?: string;
}

export interface VehicleRentalSpecifics {
  rentalCategory?: 'vehicles' | 'tools' | 'gear' | 'machinery';
  vehicleTypes?: string[];
  totalFleetSize?: number;
  activeFleetCount?: number;
  maintenanceCount?: number;
  realTimeAvailability?: 'high' | 'medium' | 'limited' | 'low' | 'sold_out';
  maintenanceStatus?: 'operational' | 'scheduled_maintenance' | 'service_paused';
  maintenanceAlertNote?: string;
  maintenanceSchedule?: {
    intervalNote?: string;
    nextInspectionDate?: string;
    autoBlockOnService?: boolean;
  };
  bookingCalendar?: {
    bookingSlotMode?: 'daily_and_hourly' | 'daily_only' | 'hourly_only';
    minAdvanceHours?: number;
    bufferMinutesBetweenRentals?: number;
    peakWeekendSurchargePercent?: number;
    blockedDates?: string[];
  };
  baseDailyRateRm?: number;
  baseHourlyRateRm?: number;
  serviceOptions?: {
    deliveryIncluded?: boolean;
    selfPickup?: boolean;
    selfCollect?: boolean;
    deliveredToRenter?: boolean;
    deliveryFeeRm?: number;
    pickupHubAddress?: string;
    dropoffLocations?: string[];
    packagesOffered?: string[];
  };
  durationModels?: {
    allowDays?: boolean;
    allowHours?: boolean;
    minHours?: number;
    defaultHourlyRateRm?: number;
    defaultDailyRateRm?: number;
  };
  depositConfig?: {
    required?: boolean;
    depositAmountRm?: number;
    lockInFeeRm?: number;
    depositNotes?: string;
  };
  fuelPolicy?: 'none' | 'half_tank' | 'full_tank';
  freeRaincoat?: boolean;
  childrenHelmet?: boolean;
  vendorRulesNotice?: string;
  customHourPackages?: Array<{
    id: string;
    label: string;
    hours: number;
    priceRm: number;
    enabled: boolean;
  }>;
  addOnPackages?: Array<{
    id: string;
    name: string;
    priceRm: number;
    enabled: boolean;
    category?: 'helmet' | 'mount' | 'insurance' | 'gear' | 'other';
  }>;
  fleetUnits?: Array<{
    id: string;
    model: string;
    vehicleType?: 'motorbike' | 'scooter';
    plateOrCode?: string;
    status: 'available' | 'rented' | 'maintenance';
    dailyRateRm: number;
    hourlyRateRm?: number;
  }>;
  equipmentList?: Array<{
    id: string;
    name: string;
    categoryOrSpec: string;
    qtyAvailable: number;
    condition: 'excellent' | 'good' | 'servicing';
    dailyRateRm: number;
    hourlyRateRm?: number;
  }>;
}

export interface AgritourismFarmSpecifics {
  pickingSeasonActive?: boolean;
  selfPickingAllowed?: boolean;
  produceTypes?: string[];
  onFarmDelivery?: boolean;
}

export interface SurpriseDeliverySpecifics {
  packages?: string[];
  deliveryLogistics?: {
    fixedTimeSlotDelivery?: boolean;
    sameDayCutoffTime?: string;
    executionStyle?: ('flash_mob' | 'singing_telegram' | 'stealth_dropoff' | 'photo_video_included')[];
  };
  coverageFleet?: {
    deliveryRadius?: string;
    fleetStatus?: 'plenty' | 'moderate' | 'limited' | 'fully_booked';
  };
  addOnOptions?: ('custom_message_card' | 'polaroid_printing' | 'fairy_lights' | 'chocolate_addons')[];
}

export interface SurprisePlannerSpecifics {
  eventSpecializations?: ('proposals' | 'anniversaries' | 'milestone_birthdays' | 'romantic_dinners' | 'room_makeovers' | 'trunk_surprises')[];
  packageTiers?: ('basic_setup' | 'premium_styling' | 'luxury_custom')[];
  setupLogistics?: {
    venueCoordinationIncluded?: boolean;
    cleanUpTeardownIncluded?: boolean;
  };
  availabilityCapacity?: {
    maxDailyBookings?: number;
    bookingSlotsActive?: boolean;
  };
  inclusionsCollaborations?: ('private_chef' | 'secret_photographer' | 'musician_bookings')[];
}

export interface RetailProductSpecifics {
  fulfillmentModes?: ('in_store_pickup' | 'local_delivery' | 'courier_shipping')[];
  stockStatus?: 'in_stock' | 'low_stock' | 'pre_order' | 'out_of_stock';
  wholesaleAvailable?: boolean;
  minOrderQty?: number;
  warrantyOrFreshnessNote?: string;
}

export interface ProfessionalServiceSpecifics {
  serviceRadius?: string;
  onSiteVisitAvailable?: boolean;
  emergencyCallout24h?: boolean;
  baseCalloutFeeRm?: number;
  leadTimeDays?: number;
  warrantyMonths?: number;
  bookingSlotMode?: 'scheduled_quote' | 'fixed_rate_booking';
}

export interface VendorSectorSpecifics {
  accommodation?: AccommodationSpecifics;
  foodBeverage?: FoodBeverageSpecifics;
  vehicleRental?: VehicleRentalSpecifics;
  agritourismFarm?: AgritourismFarmSpecifics;
  surpriseDelivery?: SurpriseDeliverySpecifics;
  surprisePlanner?: SurprisePlannerSpecifics;
  retailProducts?: RetailProductSpecifics;
  professionalServices?: ProfessionalServiceSpecifics;
}

export interface VendorListing {
  id: string;
  ownerUid: string;
  ownerEmail: string;
  businessName: string;
  propertyName?: string;
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
  vendorTerms?: string;
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

  // Commission & Admin Overrides
  commissionRatePercent?: number; // Custom admin override commission rate (%)
  
  // Dynamic Sector-Specific Fields & Toggles
  sectorSpecifics?: VendorSectorSpecifics;

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
  imageUrl?: string;
  audioUrl?: string;
  attachment?: {
    name: string;
    url: string;
    size: string;
    type: 'image' | 'document' | 'audio';
  };
}

export interface BeaconVoiceDispatch {
  id: string;
  senderId: string;
  senderName: string;
  senderColor?: string;
  audioData: string;
  durationSec: number;
  timestamp: number;
}

export interface BeaconRadioSpeaker {
  id: string;
  name: string;
  color?: string;
  isSpeaking: boolean;
  timestamp: number;
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
  latestVoiceDispatch?: BeaconVoiceDispatch;
  liveRadioSpeaker?: BeaconRadioSpeaker;
}

export type MotorbikeFleetStatus = 'high' | 'medium' | 'limited' | 'low' | 'sold_out' | 'not_applicable';

export interface MotorbikePackage {
  id: string;
  name: string;
  cc: string;
  vehicleType?: 'motorbike' | 'scooter';
  dailyRateRm: number;
  hourlyRateRm?: number;
  depositRm?: number;
  imageUrl: string;
  helmetsIncluded: number;
  childrenHelmet?: boolean;
  disposableRaincoat?: boolean;
  fuelPolicy?: {
    included: boolean;
    type: 'full_tank' | 'half_tank';
  };
  packageDetails?: string;
  addonDetails?: string;
}

export interface MotorbikeRentalPartner {
  id: string;
  businessName: string;
  township: Township;
  imageUrl: string;
  operatingStatus: 'open' | 'closed';
  fleetAvailability: 'high' | 'medium' | 'limited' | 'low' | 'sold_out';
  contactPhone: string;
  whatsappNumber: string;
  packages: MotorbikePackage[];
  vendorTerms?: string;
  vendorRulesNotice?: string;
  fuelPolicy?: 'none' | 'half_tank' | 'full_tank';
  freeRaincoat?: boolean;
  childrenHelmet?: boolean;
  hourlyRateRm?: number;
  dailyRateRm?: number;
  allowDays?: boolean;
  allowHours?: boolean;
  depositRequired?: boolean;
  depositAmountRm?: number;
  lockInFeeRm?: number;
  pickupHubAddress?: string;
  customHourPackages?: Array<{
    id: string;
    label: string;
    hours: number;
    priceRm: number;
    enabled: boolean;
  }>;
  fleetUnits?: Array<{
    id: string;
    model: string;
    vehicleType?: 'motorbike' | 'scooter';
    plateOrCode?: string;
    status: 'available' | 'rented' | 'maintenance';
    dailyRateRm: number;
    hourlyRateRm?: number;
  }>;
  isBookingEnabled?: boolean;
  verificationStatus?: VendorVerificationStatus;
  ownerEmail?: string;
  ownerUid?: string;
}

export type MotorbikeBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'active_rental'
  | 'returned'
  | 'maintenance_required'
  | 'completed'
  | 'cancelled';

export interface MotorbikeBookingRecord {
  id: string;
  bookingCode?: string;
  bookingType?: 'motorbike_rental';
  partnerId: string;
  partnerName: string;
  vendorUid?: string;
  vendorEmail?: string;
  packageId: string;
  packageName: string;
  vehicleType?: 'motorbike' | 'scooter';
  quantity?: number;
  unitPlateOrCode?: string;
  renterName: string;
  renterEmail: string;
  renterPhone: string;
  pickupTownship: Township;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupTime: string;
  dropoffTime?: string;
  startDate: string;
  endDate: string;
  days: number;
  hours?: number;
  rentalDurationType?: 'days' | 'hours' | 'custom_package';
  customPackageLabel?: string;
  fulfillmentMethod?: 'self_collect' | 'delivered';
  deliveryAddressOrHotel?: string;
  helmetsAddon: number;
  includePhoneMount: boolean;
  childrenHelmetRequested?: boolean;
  raincoatRequested?: boolean;
  licenseAck?: boolean;
  licenseDocUrl?: string;
  licenseDocName?: string;
  insuranceTier?: string;
  gearAddons?: string[];
  rentalFeeRm?: number;
  depositRm?: number;
  lockInFeeRm?: number;
  balanceToCollectRm?: number;
  depositStatus?: 'paid' | 'pending' | 'refunded';
  paymentGateway?: 'billplz' | 'toyyibpay' | 'stripe' | 'camgo_direct';
  paymentProofUrl?: string;
  paymentProofName?: string;
  paymentReference?: string;
  isUnlocked?: boolean;
  qrVoucherCode?: string;
  totalRm: number;
  status: MotorbikeBookingStatus;
  notes?: string;
  createdAt: string;
}

export interface AccommodationBooking {
  id: string;
  bookingCode: string; // e.g. "CG-CH07-8821"
  homestayId: string;
  homestayName: string; // Real business name e.g. "Barrington Alpine Homestay"
  maskedTitle: string; // Anti-Bypass Title e.g. "Cozy 3BR - 350m to Kea Farm (CH-07)"
  fullAddress?: string; // Optional internal only — not shown publicly
  township?: Township;
  ownerPhone: string;
  ownerName: string;
  vendorEmail?: string;
  vendorUid?: string;
  hostPhone?: string; // Host phone alias
  customerName: string;
  customerPhone: string;
  guestName?: string; // Guest name alias
  guestPhone?: string; // Guest phone alias
  customerEmail?: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  roomTypeName?: string;
  totalRoomPrice: number; // e.g. RM200
  depositAmount: number; // Fixed RM30 (collected by CamGo via gateway)
  balanceToCollect: number; // e.g. RM170 (collected directly upon check-in)
  bookingType: 'instant' | 'request'; // Type A: Instant Confirm | Type B: Request to Book (30-min SLA)
  status: 'pending_owner_approval' | 'confirmed' | 'rejected' | 'auto_refunded' | 'checked_in' | 'completed';
  depositPaymentStatus: 'paid' | 'refunded' | 'unpaid';
  paymentGateway: 'billplz' | 'toyyibpay' | 'stripe' | 'manual_transfer';
  paymentProofUrl?: string;
  paymentProofName?: string;
  paymentReference?: string;
  isUnlocked: boolean; // Pay to reveal trigger
  qrVoucherCode: string;
  bundledPerks: string[];
  createdAt: string;
  expiresAt?: string; // 30-min timeout for Type B requests
  whatsappStatus: 'sent' | 'replied_yes' | 'replied_no' | 'timed_out';
  notes?: string;
}

export interface AccommodationListing {
  id: string;
  vendorId?: string;
  unitId?: string;
  ownerUid?: string;
  ownerEmail?: string;
  code: string; // e.g. "CH-07"
  maskedTitle: string; // e.g. "Cozy 3BR Alpine Apartment - 350m to Kea Farm (CH-07)"
  realBusinessName: string; // e.g. "Barrington Alpine Homestay"
  propertyName?: string; // Saved display property title shown on vendor card
  township: Township;
  proximityDesc: string; // General area / township proximity without full street address
  fullAddress?: string;
  ownerName: string;
  ownerPhone: string;
  pricePerNight: number;
  peakPricePerNight?: number;
  depositAmount: number; // 30
  balanceToCollect: number; // pricePerNight - 30
  bookingType: 'instant' | 'request';
  roomAvailabilityStatus: RoomAvailabilityStatus;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  rating: number;
  reviewCount: number;
  coverImage: string;
  galleryImages: string[];
  features: string[];
  bundledPerks: string[];
  verifiedHost: boolean;
  ownerPortalSlug?: string;
  whatsappNumber?: string;
  units?: AccommodationUnitConfig[];
  roomTypes?: AccommodationSpecifics['roomTypes'];
  amenityAddons?: AccommodationSpecifics['amenityAddons'];
  breakfastIncluded?: boolean;
  checkInWindow?: string;
  checkOutWindow?: string;
  parkingType?: string;
  parkingDetails?: string;
  cookingPermitted?: boolean;
  kitchenNotes?: string;
  description?: string;
  houseRules?: string;
}

export interface VendorBookingAlert {
  id: string;
  bookingId: string;
  bookingCode: string;
  bookingType: 'accommodation' | 'motorbike';
  vendorId: string;
  vendorName: string;
  vendorEmail?: string;
  vendorUid?: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  itemSummary: string;
  checkInOrStart: string;
  checkOutOrEnd: string;
  totalAmountRm: number;
  depositPaidRm: number;
  balanceDueRm: number;
  paymentGateway: string;
  paymentReference?: string;
  paymentProofUrl?: string;
  paymentProofName?: string;
  whatsappNotified?: boolean;
  status: 'new' | 'acknowledged' | 'confirmed' | 'completed';
  isRead: boolean;
  createdAt: string;
}

export interface MobileHomeCard {
  id: string;
  type: 'weather' | 'hazard' | 'map' | 'itinerary' | 'party' | 'sos' | 'bike' | 'custom';
  title: string;
  subtitle?: string;
  tag?: string;
  imageUrl?: string;
  badge?: string;
  buttonText?: string;
  buttonAction?: string; // 'open-weather' | 'open-hazard' | 'open-map' | 'open-itinerary' | 'open-party' | 'open-sos' | 'open-chat' | 'open-trails' | 'open-ai'
  order: number;
  size?: 'half' | 'full' | 'wide';
  isActive: boolean;
  bgGradient?: string;
}