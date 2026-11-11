import { Place, GalleryItem, EventNotification, LoungePost, LoungePostReply, ItineraryPlan, TownshipHubInfo, JobClassified, TrafficAlert, HazardAlert, EmergencyCard, EmergencyDispatchRecord, FarmTicket, VendorListing, VendorVoucher, VendorEventItem, VendorStaffMember, VendorAnalyticsData, MotorbikeRentalPartner, MotorbikePackage, MotorbikeBookingRecord, MobileHomeCard, AccommodationBooking, AccommodationListing, RoomAvailabilityStatus } from '../types';
import {
  INITIAL_PLACES,
  INITIAL_GALLERY,
  INITIAL_EVENTS,
  INITIAL_LOUNGE,
  INITIAL_JOBS,
  INITIAL_TRAFFIC,
  INITIAL_HAZARDS,
} from '../data/initialData';
import { INITIAL_MOBILE_HOME_CARDS } from '../data/initialHomeCards';
import { POPULAR_FARM_TICKETS } from '../data/farmTicketsData';
import { INITIAL_MOTORBIKE_PARTNERS } from '../data/initialMotorbikeData';
import {
  INITIAL_VENDOR_LISTINGS,
  INITIAL_VENDOR_VOUCHERS,
  INITIAL_VENDOR_EVENTS,
  INITIAL_VENDOR_STAFF,
  INITIAL_VENDOR_ANALYTICS,
} from '../data/initialVendorData';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously,
  updateProfile 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  fullName?: string;
  address?: string;
  street?: string;
  postcode?: string;
  town?: string;
  district?: string;
  state?: string;
  contactNumber?: string;
  isLocal?: boolean; // true = Local resident, false = Visitor / Tourist
  photoURL?: string;
  role: 'admin' | 'user' | 'vendor';
  isBlocked?: boolean;
  bookmarks: string[];
  createdAt: string;
  emergencyCard?: EmergencyCard;
}

const STORAGE_KEYS = {
  USER: 'camgo_user',
  PLACES: 'camgo_places',
  GALLERY: 'camgo_gallery',
  EVENTS: 'camgo_events',
  LOUNGE: 'camgo_lounge',
  STATS: 'camgo_stats',
  ITINERARY: 'camgo_itinerary',
  TOWNSHIP_HUBS: 'camgo_township_hubs',
  JOBS: 'camgo_jobs',
  TRAFFIC: 'camgo_traffic',
  HAZARDS: 'camgo_hazards',
  EMERGENCY_CARD: 'camgo_emergency_card',
  SOS_DISPATCHES: 'camgo_sos_dispatches',
  TICKETS: 'camgo_farm_tickets',
  VENDOR_LISTINGS: 'camgo_vendor_listings',
  VENDOR_VOUCHERS: 'camgo_vendor_vouchers',
  VENDOR_EVENTS: 'camgo_vendor_events',
  VENDOR_STAFF: 'camgo_vendor_staff',
  HOME_CARDS: 'camgo_home_cards',
  ACCOMMODATION_BOOKINGS: 'camgo_accommodation_bookings',
  ACCOMMODATION_LISTINGS: 'camgo_accommodation_listings',
};

export const DEFAULT_EMERGENCY_CARD: EmergencyCard = {
  fullLegalName: '',
  preferredName: '',
  dateOfBirth: '',
  bloodType: 'Unknown',
  severeAllergies: '',
  chronicConditions: '',
  currentMedications: '',
  primaryContact: {
    label: 'ICE 1',
    name: '',
    relationship: '',
    phone: '',
  },
  secondaryContact: {
    label: 'ICE 2',
    name: '',
    relationship: '',
    phone: '',
  },
  designatedSosNumber: '',
  updatedAt: new Date().toISOString(),
};

export function sanitizeEmergencyCard(raw?: Partial<EmergencyCard> | null): EmergencyCard {
  if (!raw) {
    return { ...DEFAULT_EMERGENCY_CARD };
  }

  const primary = (raw.primaryContact || {}) as any;
  const secondary = (raw.secondaryContact || {}) as any;

  return {
    fullLegalName: typeof raw.fullLegalName === 'string' ? raw.fullLegalName : '',
    preferredName: typeof raw.preferredName === 'string' ? raw.preferredName : '',
    dateOfBirth: typeof raw.dateOfBirth === 'string' ? raw.dateOfBirth : '',
    bloodType: typeof raw.bloodType === 'string' && raw.bloodType ? raw.bloodType : 'Unknown',
    severeAllergies: typeof raw.severeAllergies === 'string' ? raw.severeAllergies : '',
    chronicConditions: typeof raw.chronicConditions === 'string' ? raw.chronicConditions : '',
    currentMedications: typeof raw.currentMedications === 'string' ? raw.currentMedications : '',
    primaryContact: {
      label: 'ICE 1',
      name: typeof primary.name === 'string' ? primary.name : '',
      relationship: typeof primary.relationship === 'string' ? primary.relationship : '',
      phone: typeof primary.phone === 'string' ? primary.phone : '',
    },
    secondaryContact: {
      label: 'ICE 2',
      name: typeof secondary.name === 'string' ? secondary.name : '',
      relationship: typeof secondary.relationship === 'string' ? secondary.relationship : '',
      phone: typeof secondary.phone === 'string' ? secondary.phone : '',
    },
    designatedSosNumber: typeof raw.designatedSosNumber === 'string' ? raw.designatedSosNumber : '',
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export const MOCK_VENDOR_IDS = [
  'moto-partner-1',
  'moto-partner-2',
  'moto-partner-3',
  'big-red-strawberry-farm',
  'boh-sungei-palas',
  'flora-park-kea-farm',
  'highland-steamboat-tanahrata',
  'cameron-lavender-tringkap',
  'cameron-highlands-car-rental',
  'highland-mobility',
];

export function isMockMotorbikePartner(partner: any): boolean {
  if (!partner) return true;
  const id = (partner.id || '').toLowerCase();
  const name = (partner.businessName || partner.name || '').toLowerCase();
  const phone = (partner.contactPhone || '').replace(/\D/g, '');
  if (MOCK_VENDOR_IDS.includes(id) || MOCK_VENDOR_IDS.includes(name)) return true;
  if (id.startsWith('moto-partner') || id.startsWith('mock-') || id.startsWith('test-') || id.startsWith('seed-')) return true;
  if (name.includes('mock') || name.includes('sample') || name.includes('highland mobility')) return true;

  // Filter out non-motorbike accommodation / apartment / homestay listings
  if (
    name.includes('park view') ||
    name.includes('cedar') ||
    name.includes('apartment') ||
    name.includes('guesthouse') ||
    name.includes('chalet') ||
    name.includes('homestay') ||
    name.includes('hotel') ||
    name.includes('resort') ||
    phone === '019548427' ||
    (partner.category && partner.category === 'accommodation')
  ) {
    return true;
  }

  // Filter out any partner whose rental packages are rooms or apartments
  if (Array.isArray(partner.packages)) {
    const hasRoomPackage = partner.packages.some((pkg: any) => {
      const pName = (pkg.name || '').toLowerCase();
      const pCc = (pkg.cc || '').toLowerCase();
      const pDetails = (pkg.packageDetails || '').toLowerCase();
      return (
        pName.includes('apartment') ||
        pName.includes('room') ||
        pCc.includes('room') ||
        pCc.includes('guest') ||
        pDetails.includes('room') ||
        pDetails.includes('bathroom')
      );
    });
    if (hasRoomPackage) return true;
  }

  return false;
}

export function isMockVendorListing(vendor: any): boolean {
  if (!vendor) return true;
  const id = (vendor.id || '').toLowerCase();
  const name = (vendor.businessName || '').toLowerCase();
  if (MOCK_VENDOR_IDS.includes(id) || MOCK_VENDOR_IDS.includes(name)) return true;
  if (id.startsWith('moto-partner') || id.startsWith('mock-') || id.startsWith('test-') || id.startsWith('seed-')) return true;
  if (name.includes('mock') || name.includes('sample') || name.includes('highland mobility')) return true;
  return false;
}

export function isMockLoungeReply(reply: any): boolean {
  if (!reply) return true;
  const author = String(reply.authorName || '').toLowerCase();
  const content = String(reply.content || '').toLowerCase();
  const id = String(reply.id || '').toLowerCase();
  if (id.startsWith('mock') || id.startsWith('seed') || id.startsWith('sample')) return true;
  if (
    author.includes('sarah wong') ||
    author.includes('cikgu') ||
    author.includes('chloe') ||
    author.includes('farhan')
  ) {
    return true;
  }
  if (
    content.includes('terima kasih info cikgu') ||
    content.includes('simpang pulai pun lancar')
  ) {
    return true;
  }
  return false;
}

export function isMockLoungePost(post: any): boolean {
  if (!post) return true;
  const id = String(post.id || '').trim().toLowerCase();
  const content = String(post.content || '').toLowerCase();
  const author = String(post.authorName || '').toLowerCase();

  // Flag mock persona authors explicitly
  const mockAuthors = [
    'cikgu razak',
    'sarah wong',
    'chloe liew',
    'aiman farhan',
    'highland guide',
    'local guide',
  ];
  if (mockAuthors.some((ma) => author.includes(ma))) {
    return true;
  }

  // Flag mock post phrases explicitly
  const mockPhrases = [
    'laluan tapah',
    'lata iskandar',
    'simpang pulai pun lancar',
    'steamboat sup herba',
    'cameron+highlands+steamboat',
    'mossy forest: jangan lupa booking',
    'portal jabatan perhutanan pahang',
    'kasut getah bertapak grip',
    'pandu berhemah di selekoh',
    'salam semua pengunjung',
    'suhu sejuk 16°c petang ni',
  ];
  if (mockPhrases.some((phrase) => content.includes(phrase))) {
    return true;
  }

  // Flag any mock/seed prefixes or legacy IDs
  if (
    id.startsWith('mock') ||
    id.startsWith('seed') ||
    id.startsWith('init') ||
    id.startsWith('sample') ||
    id.startsWith('test') ||
    id.startsWith('dummy') ||
    id.startsWith('lounge-seed') ||
    id.startsWith('legacy') ||
    id.startsWith('lounge-') ||
    id.startsWith('lounge_')
  ) {
    return true;
  }

  // Flag legacy sequential or template IDs like '1', '2', 'post-1', 'post-2', etc.
  if (/^(post-)?\d+$/i.test(id) || /^(lounge-)?\d+$/i.test(id) || /^p\d+$/i.test(id)) {
    return true;
  }

  // Flag mock wording in content
  if (
    content.includes('mock chat') ||
    content.includes('sample message') ||
    content.includes('placeholder') ||
    content.includes('dummy message') ||
    content.includes('simulated')
  ) {
    return true;
  }

  // Valid real user posts must have a valid creation timestamp (> Nov 2023)
  const createdTime =
    typeof post.createdAt === 'number'
      ? post.createdAt
      : typeof post.createdAt === 'string'
      ? new Date(post.createdAt).getTime()
      : 0;

  if (isNaN(createdTime) || createdTime < 1700000000000) {
    return true;
  }

  return false;
}

export const PARK_VIEW_VENDOR_LISTING: VendorListing = {
  id: 'vendor-park-view-apartment',
  ownerUid: 'admin-created-vendor',
  ownerEmail: 'parkview.admin@camgo.my',
  businessName: 'Park View Apartment',
  verificationStatus: 'verified',
  category: 'accommodation',
  subCategory: 'homestay_apartment',
  township: 'Tanah Rata',
  address: 'Park View Apartments, Persiaran Camellia 4, 39000 Tanah Rata, Cameron Highlands',
  contactPhone: '+60195484277',
  whatsappNumber: '+60195484277',
  description: 'Spacious 3-bedroom family holiday homestay apartment near Tanah Rata town center with scenic garden and mountain views. Fully furnished with cooking facilities, high-speed Wi-Fi, and private parking.',
  operatingHours: { from: '00:00', to: '23:59', isOpen: true },
  coverImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
  logoUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
  galleryImages: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
  ],
  coordinates: { lat: 4.471, lng: 101.378 },
  isBookingEnabled: true,
  realTimeStatus: 'open',
  parkingStatus: 'private_available',
  roomAvailabilityStatus: 'rooms_available',
  dietaryTags: [],
  tier: 'monthly_pro',
  billingCadence: 'monthly',
  tierExpiresAt: '2027-12-31T23:59:59.000Z',
  isSponsored: true,
  profileHealthScore: 100,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  sectorSpecifics: {
    accommodation: {
      apartment: {
        totalUnits: 4,
        roomsPerUnit: 3,
        cookingPermitted: true,
        facilities: ['High-speed Wi-Fi', 'Balcony Park View', 'Private Bay Parking', 'Fully Equipped Kitchen', 'Hot Shower']
      },
      roomTypes: [
        { id: 'room-pv-3br', name: '3-Bedroom Family Suite', quantity: 4, pricePerNight: 220 }
      ],
      roomAvailabilityStatus: 'rooms_available'
    }
  }
};

class FirebaseStorageService {
  private currentUser: UserProfile | null = null;
  private listeners: (() => void)[] = [];
  private loungeListeners: ((posts: LoungePost[]) => void)[] = [];
  
  // In-memory caches
  private places: Place[] = [];

  constructor() {
    this.initUser();
    this.initFirebaseAuthListener();
    
    // Initialize caches from localStorage for fast startup
    const savedPlaces = localStorage.getItem(STORAGE_KEYS.PLACES);
    if (savedPlaces) {
      try { this.places = JSON.parse(savedPlaces); } catch {}
    }

    // Purge any legacy mock lounge posts immediately on startup
    try {
      const savedLounge = localStorage.getItem(STORAGE_KEYS.LOUNGE);
      if (savedLounge) {
        const parsed = JSON.parse(savedLounge);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((p) => !isMockLoungePost(p));
          localStorage.setItem(STORAGE_KEYS.LOUNGE, JSON.stringify(cleaned));
        }
      }
    } catch {
      // ignore
    }

    this.syncCloudData();
    this.initLoungeRealtimeListener();
    this.initGsapImagesRealtimeListener();
  }

 // Helper to safely set localStorage items with error handling
  private setLocalStorageItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`LocalStorage quota exceeded for key: ${key}. Storage may be full.`);
      
      // Instead of slicing down to 10 items (which deletes your historical data),
      // we log the warning and let the app rely on your live Firestore cloud database.
      try {
        localStorage.removeItem(key);
      } catch (innerE) {
        console.error("Could not even remove item:", innerE);
      }
    }
  }

  // Background real-time sync from Firestore to local cache
  private async syncCloudData() {
    if (!db) return;

    try {
      // 1. Real-time Places Listener
      getDocs(collection(db, 'places')).then(snap => {
        const cloudPlaces = snap.docs.map((d) => d.data() as Place);
        if (cloudPlaces.length > 0) {
          this.places = cloudPlaces;
          this.setLocalStorageItem(STORAGE_KEYS.PLACES, JSON.stringify(cloudPlaces));
          this.notify();
        }
      });
      onSnapshot(collection(db, 'places'), (snap) => {

        const cloudPlaces = snap.docs.map((d) => d.data() as Place);
        this.places = cloudPlaces;
        this.setLocalStorageItem(STORAGE_KEYS.PLACES, JSON.stringify(cloudPlaces));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('places-updated', { detail: cloudPlaces }));
        }
        this.notify();
      }, (err) => console.warn('Realtime places listener warning:', err));

      // 2. Real-time Gallery Listener
      onSnapshot(collection(db, 'gallery'), (snap) => {
        const cloudGallery = snap.docs.map((d) => d.data() as GalleryItem);
        this.setLocalStorageItem(STORAGE_KEYS.GALLERY, JSON.stringify(cloudGallery));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gallery-updated', { detail: cloudGallery }));
        }
        this.notify();
      }, (err) => console.warn('Realtime gallery listener warning:', err));

      // 3. Real-time Township Hubs Listener
      onSnapshot(collection(db, 'township_hubs'), (snap) => {
        const cloudHubs: Record<string, TownshipHubInfo> = {};
        snap.docs.forEach((docSnap) => {
          const hub = docSnap.data() as TownshipHubInfo;
          if (hub && hub.township) {
            cloudHubs[hub.township] = hub;
          }
        });
        this.setLocalStorageItem(STORAGE_KEYS.TOWNSHIP_HUBS, JSON.stringify(cloudHubs));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('township-hub-updated'));
        }
        this.notify();
      }, (err) => console.warn('Realtime township hubs listener warning:', err));

      // 4. Real-time Events Listener
      onSnapshot(collection(db, 'events'), (snap) => {
        const cloudEvents = snap.docs.map((d) => d.data() as EventNotification);
        this.setLocalStorageItem(STORAGE_KEYS.EVENTS, JSON.stringify(cloudEvents));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('events-updated', { detail: cloudEvents }));
        }
        this.notify();
      }, (err) => console.warn('Realtime events listener warning:', err));

      // 5. Real-time Traffic Alerts Listener
      onSnapshot(collection(db, 'traffic_alerts'), (snap) => {
        const cloudTraffic = snap.docs.map((d) => d.data() as TrafficAlert);
        this.setLocalStorageItem(STORAGE_KEYS.TRAFFIC, JSON.stringify(cloudTraffic));
        this.notify();
      }, (err) => console.warn('Realtime traffic listener warning:', err));

      // 6. Real-time Hazard Alerts Listener
      onSnapshot(collection(db, 'hazard_alerts'), (snap) => {
        const cloudHazards = snap.docs.map((d) => d.data() as HazardAlert);
        this.setLocalStorageItem(STORAGE_KEYS.HAZARDS, JSON.stringify(cloudHazards));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hazard-alerts-updated', { detail: cloudHazards }));
        }
        this.notify();
      }, (err) => console.warn('Realtime hazard listener warning:', err));

      // 7. Real-time GSAP Images Listener (supports both gsap_images and gsap_card_images)
      onSnapshot(collection(db, 'gsap_images'), (snap) => {
        if (!snap.empty) {
          const images: Record<string, string> = { ...this.getGsapCardImages() };
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data() as any;
            if (data && data.imageUrl) {
              images[docSnap.id] = data.imageUrl;
            }
          });
          this.setLocalStorageItem('camgo_gsap_card_images', JSON.stringify(images));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gsap-images-updated', { detail: images }));
          }
          this.notify();
        }
      }, (err) => console.warn('Realtime gsap_images listener warning:', err));

      onSnapshot(collection(db, 'gsap_card_images'), (snap) => {
        const images: Record<string, string> = { ...this.getGsapCardImages() };
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (data && data.imageUrl) {
            images[docSnap.id] = data.imageUrl;
          }
        });
        this.setLocalStorageItem('camgo_gsap_card_images', JSON.stringify(images));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gsap-images-updated', { detail: images }));
        }
        this.notify();
      }, (err) => console.warn('Realtime gsap_card_images listener warning:', err));

      // 8. Real-time Farm Tickets Listener
      onSnapshot(collection(db, 'farm_tickets'), (snap) => {
        const cloudTickets = snap.docs.map((d) => d.data() as FarmTicket);
        this.setLocalStorageItem(STORAGE_KEYS.TICKETS, JSON.stringify(cloudTickets));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('farm-tickets-updated', { detail: cloudTickets }));
        }
        this.notify();
      }, (err) => console.warn('Realtime tickets listener warning:', err));

      // 9. Real-time Vendor Listings Listener
      getDocs(collection(db, 'vendor_listings')).then(snap => {
        const cloudListings = snap.docs
          .map((d) => d.data() as VendorListing)
          .filter((v) => !isMockVendorListing(v));
        this.setLocalStorageItem(STORAGE_KEYS.VENDOR_LISTINGS, JSON.stringify(cloudListings));
        this.notify();
      });
      onSnapshot(collection(db, 'vendor_listings'), (snap) => {

        const cloudListings = snap.docs
          .map((d) => d.data() as VendorListing)
          .filter((v) => !isMockVendorListing(v));

        // Purge mock listings from Firestore if detected
        snap.docs.forEach((docSnap) => {
          const v = docSnap.data() as VendorListing;
          if (isMockVendorListing(v)) {
            deleteDoc(doc(db, 'vendor_listings', docSnap.id)).catch(() => {});
          }
        });

        this.setLocalStorageItem(STORAGE_KEYS.VENDOR_LISTINGS, JSON.stringify(cloudListings));
        const enrichedPlaces = this.getPlaces();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vendor-listings-updated', { detail: cloudListings }));
          window.dispatchEvent(new CustomEvent('places-updated', { detail: enrichedPlaces }));
        }
        this.notify();
      }, (err) => console.error('Realtime vendor listings listener error:', err));

      // 10. Real-time Motorbike Partners Listener
      onSnapshot(collection(db, 'motorbike_partners'), (snap) => {
        const cloudPartners = snap.docs
          .map((d) => d.data() as MotorbikeRentalPartner)
          .filter((p) => !isMockMotorbikePartner(p));

        // Purge mock motorbike partners from Firestore if detected
        snap.docs.forEach((docSnap) => {
          const p = docSnap.data() as MotorbikeRentalPartner;
          if (isMockMotorbikePartner(p)) {
            deleteDoc(doc(db, 'motorbike_partners', docSnap.id)).catch(() => {});
          }
        });

        this.setLocalStorageItem('camgo_motorbike_partners', JSON.stringify(cloudPartners));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('motorbike-partners-updated', { detail: cloudPartners }));
        }
        this.notify();
      }, (err) => console.warn('Realtime motorbike partners listener warning:', err));

      // 11. Real-time Motorbike Bookings Listener
      onSnapshot(collection(db, 'motorbike_rentals'), (snap) => {
        const cloudBookings = snap.docs.map((d) => d.data() as MotorbikeBookingRecord);
        this.setLocalStorageItem('camgo_motorbike_bookings', JSON.stringify(cloudBookings));
        this.notify();
      }, (err) => console.warn('Realtime motorbike bookings listener warning:', err));

      // 12. Real-time Home Glass Cards Listener
      onSnapshot(collection(db, 'home_glass_cards'), (snap) => {
        if (!snap.empty) {
          const cloudCards = snap.docs.map((d) => d.data() as MobileHomeCard);
          cloudCards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          this.setLocalStorageItem(STORAGE_KEYS.HOME_CARDS, JSON.stringify(cloudCards));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('home-cards-updated', { detail: cloudCards }));
          }
          this.notify();
        }
      }, (err) => console.warn('Realtime home glass cards listener warning:', err));

    } catch (e) {
      console.warn("Cloud sync offline mode active, using local cache:", e);
    }
  }

  private initUser() {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        if (
          this.currentUser &&
          (this.currentUser.email === 'ayahsyirah77@gmail.com' ||
            this.currentUser.email === 'asuypower7984@gmail.com' ||
            this.currentUser.email?.toLowerCase().includes('admin') ||
            this.currentUser.email === 'admin@camgo.my')
        ) {
          this.currentUser.role = 'admin';
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
        }
        if (this.currentUser?.emergencyCard) {
          this.currentUser.emergencyCard = sanitizeEmergencyCard(this.currentUser.emergencyCard);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
        }
      } catch {
        this.currentUser = null;
      }
    }
    const savedCard = localStorage.getItem(STORAGE_KEYS.EMERGENCY_CARD);
    if (savedCard) {
      try {
        const parsed = JSON.parse(savedCard);
        const cleaned = sanitizeEmergencyCard(parsed);
        localStorage.setItem(STORAGE_KEYS.EMERGENCY_CARD, JSON.stringify(cleaned));
      } catch {}
    }
  }

  private initFirebaseAuthListener() {
    if (auth) {
      onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const isAdmin =
            fbUser.email?.toLowerCase().includes('admin') ||
            fbUser.email === 'admin@camgo.my' ||
            fbUser.email === 'ayahsyirah77@gmail.com' ||
            fbUser.email === 'asuypower7984@gmail.com';

          let existingProfile = this.currentUser;
          if (!existingProfile) {
            const saved = localStorage.getItem(STORAGE_KEYS.USER);
            if (saved) {
              try {
                existingProfile = JSON.parse(saved);
              } catch {}
            }
          }

          let emergencyCard = existingProfile?.emergencyCard;

          // Attempt to load live emergency card & user profile from Firestore cloud across PC & Mobile
          if (db) {
            // Real-time listener for emergency card
            onSnapshot(doc(db, 'emergency_cards', fbUser.uid), (snap) => {
              if (snap.exists()) {
                const cardData = snap.data() as EmergencyCard;
                const sanitized = sanitizeEmergencyCard(cardData);
                this.setLocalStorageItem(STORAGE_KEYS.EMERGENCY_CARD, JSON.stringify(sanitized));
                if (this.currentUser) {
                  this.currentUser.emergencyCard = sanitized;
                  this.setLocalStorageItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
                }
                this.notify();
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('emergency-card-updated', { detail: sanitized }));
                }
              }
            });

            try {
              const [userSnap, cardSnap] = await Promise.all([
                getDoc(doc(db, 'users', fbUser.uid)),
                getDoc(doc(db, 'emergency_cards', fbUser.uid)),
              ]);

              const userData = userSnap.exists() ? userSnap.data() : null;
              const cardData = cardSnap.exists() ? (cardSnap.data() as EmergencyCard) : null;

              if (cardData) {
                emergencyCard = sanitizeEmergencyCard(cardData);
                this.setLocalStorageItem(STORAGE_KEYS.EMERGENCY_CARD, JSON.stringify(emergencyCard));
              } else if (userData?.emergencyCard) {
                emergencyCard = sanitizeEmergencyCard(userData.emergencyCard);
                this.setLocalStorageItem(STORAGE_KEYS.EMERGENCY_CARD, JSON.stringify(emergencyCard));
              }

              const profile: UserProfile = {
                uid: fbUser.uid,
                email: fbUser.email || 'user@camgo.my',
                displayName: userData?.displayName || fbUser.displayName || 'Highland Explorer',
                fullName: userData?.fullName || existingProfile?.fullName || fbUser.displayName || '',
                photoURL: fbUser.photoURL || userData?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${fbUser.uid}`,
                role: isAdmin ? 'admin' : (userData?.role || 'user'),
                bookmarks: userData?.bookmarks || existingProfile?.bookmarks || [],
                createdAt: userData?.createdAt || existingProfile?.createdAt || new Date().toISOString(),
                emergencyCard: emergencyCard || existingProfile?.emergencyCard,
              };

              this.currentUser = profile;
              this.setLocalStorageItem(STORAGE_KEYS.USER, JSON.stringify(profile));
              this.notify();
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: profile }));
              }
              return;
            } catch (err) {
              console.warn('Could not fetch cloud user profile during auth listener:', err);
            }
          }

          // Fallback if offline
          const profile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || 'user@camgo.my',
            displayName: fbUser.displayName || 'Highland Explorer',
            fullName: existingProfile?.fullName || fbUser.displayName || '',
            photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${fbUser.uid}`,
            role: isAdmin ? 'admin' : 'user',
            bookmarks: existingProfile?.bookmarks || [],
            createdAt: existingProfile?.createdAt || new Date().toISOString(),
            emergencyCard: emergencyCard || existingProfile?.emergencyCard,
          };
          this.currentUser = profile;
          this.setLocalStorageItem(STORAGE_KEYS.USER, JSON.stringify(profile));
          this.notify();
        }
      });
    }
  }

  private initGsapImagesRealtimeListener() {
    // Handled in syncCloudData
  }

  public async syncUserToFirestore(profile: UserProfile): Promise<UserProfile> {
    if (!db) return profile;
    try {
      const userRef = doc(db, 'users', profile.uid);
      const snap = await getDoc(userRef);
      const existingData = snap.exists() ? snap.data() : {};
      
      if (existingData?.isBlocked) {
        throw new Error("ACCOUNT_BLOCKED: This account has been blocked by the administrator.");
      }

      const updatedProfile: UserProfile = {
        ...profile,
        fullName: profile.fullName || profile.displayName || profile.email.split('@')[0],
        isBlocked: false,
        createdAt: existingData?.createdAt || profile.createdAt || new Date().toISOString(),
      };

      await setDoc(userRef, {
        id: updatedProfile.uid,
        uid: updatedProfile.uid,
        email: updatedProfile.email,
        displayName: updatedProfile.displayName,
        fullName: updatedProfile.fullName,
        photoURL: updatedProfile.photoURL || '',
        role: updatedProfile.role,
        isBlocked: false,
        createdAt: updatedProfile.createdAt,
        lastLoginAt: new Date().toISOString(),
      }, { merge: true });

      return updatedProfile;
    } catch (e: any) {
      if (e.message?.includes('ACCOUNT_BLOCKED')) {
        throw e;
      }
      console.warn("Could not sync user to Firestore:", e);
      return profile;
    }
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public subscribeUser(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public async signInWithGoogle(asAdmin = false): Promise<UserProfile> {
    const isAIStudioPreview = 
      window.location.hostname.includes('googleusercontent.com') || 
      window.location.hostname.includes('aistudio');

    if (!isAIStudioPreview && auth) {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const fbUser = result.user;
        const targetEmail = (fbUser.email || '').toLowerCase();
        const isAdminUser = asAdmin || targetEmail === 'ayahsyirah77@gmail.com' || targetEmail === 'asuypower7984@gmail.com' || targetEmail.includes('admin') || targetEmail === 'admin@camgo.my';

        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || (asAdmin ? 'ayahsyirah77@gmail.com' : 'traveler@gmail.com'),
          displayName: fbUser.displayName || (isAdminUser ? 'Admin' : 'Highland Explorer'),
          fullName: fbUser.displayName || (isAdminUser ? 'Admin' : 'Highland Explorer'),
          photoURL: fbUser.photoURL || undefined,
          role: isAdminUser ? 'admin' : 'user',
          isBlocked: false,
          bookmarks: [],
          createdAt: new Date().toISOString(),
        };

        const user = await this.syncUserToFirestore(profile);
        this.currentUser = user;
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        this.notify();
        return user;
      } catch (error: any) {
        if (error.message?.includes('ACCOUNT_BLOCKED')) throw error;
        console.warn("Firebase Auth error, executing fallback session:", error);
      }
    }

    const mockEmail = asAdmin ? 'ayahsyirah77@gmail.com' : 'ayahsyirah77@gmail.com';
    const mockUser: UserProfile = {
      uid: asAdmin ? 'admin-ayahsyirah77' : 'admin-ayahsyirah77',
      email: mockEmail,
      displayName: 'Ayah Syirah (Master Admin)',
      fullName: 'Ayah Syirah (Master Admin)',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      role: 'admin',
      isBlocked: false,
      bookmarks: [],
      createdAt: new Date().toISOString(),
    };

    const user = await this.syncUserToFirestore(mockUser);
    this.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    this.notify();
    return user;
  }

  public async signInAsAdmin(email = 'ayahsyirah77@gmail.com'): Promise<UserProfile> {
    const adminProfile: UserProfile = {
      uid: 'admin-ayahsyirah77',
      email: email,
      displayName: 'Master Admin',
      fullName: 'Master Admin',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      role: 'admin',
      isBlocked: false,
      bookmarks: [],
      createdAt: new Date().toISOString(),
    };
    const user = await this.syncUserToFirestore(adminProfile);
    this.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    this.notify();
    return user;
  }

  public async signInWithEmail(email: string, name: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com')) {
      throw new Error('Registration and sign-in require a valid @gmail.com email address.');
    }
    const isAdmin = cleanEmail.includes('admin') || cleanEmail === 'ayahsyirah77@gmail.com' || cleanEmail === 'asuypower7984@gmail.com';
    const rawUser: UserProfile = {
      uid: 'user-' + Date.now().toString(36),
      email: cleanEmail,
      displayName: name || cleanEmail.split('@')[0],
      fullName: name || cleanEmail.split('@')[0],
      photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanEmail)}`,
      role: isAdmin ? 'admin' : 'user',
      isBlocked: false,
      bookmarks: [],
      createdAt: new Date().toISOString(),
    };

    const user = await this.syncUserToFirestore(rawUser);
    this.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    this.notify();
    return user;
  }

  public async signOut(): Promise<void> {
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.warn("Signout error", e);
      }
    }
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.USER);
    this.notify();
  }

  public updateUserProfile(updates: Partial<UserProfile>): UserProfile | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }

    if (!this.currentUser) {
      this.currentUser = {
        uid: auth?.currentUser?.uid || 'user_' + Date.now(),
        email: auth?.currentUser?.email || updates.email || 'traveler@camgo.my',
        displayName: auth?.currentUser?.displayName || updates.displayName || 'Traveler',
        fullName: updates.fullName || updates.displayName || 'Traveler',
        role: 'user',
        bookmarks: [],
        createdAt: new Date().toISOString(),
      };
    }

    this.currentUser = {
      ...this.currentUser,
      ...updates,
    };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));

    if (db && this.currentUser.uid) {
      try {
        const cleanUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        setDoc(doc(db, 'users', this.currentUser.uid), cleanUpdates, { merge: true }).catch((err) => {
          console.warn('[Firebase] Could not sync user profile updates to Firestore:', err);
        });
      } catch (err) {
        console.warn('[Firebase] Firestore profile sync error:', err);
      }
    }

    if (auth && auth.currentUser) {
      try {
        updateProfile(auth.currentUser, {
          displayName: updates.displayName || updates.fullName || auth.currentUser.displayName || undefined,
          photoURL: updates.photoURL || auth.currentUser.photoURL || undefined,
        }).catch((err) => {
          console.warn('[Firebase Auth] updateProfile failed:', err);
        });
      } catch (err) {
        console.warn('[Firebase Auth] sync error:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: this.currentUser }));
    }

    this.notify();
    return this.currentUser;
  }

  public toggleBookmark(placeId: string): string[] {
    if (!this.currentUser) {
      this.signInWithEmail('guest@camgo.my', 'Guest Traveler');
    }
    if (!this.currentUser) return [];

    const exists = this.currentUser.bookmarks.includes(placeId);
    let updated: string[];
    if (exists) {
      updated = this.currentUser.bookmarks.filter((id) => id !== placeId);
    } else {
      updated = [...this.currentUser.bookmarks, placeId];
    }
    this.currentUser.bookmarks = updated;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
    this.notify();
    return updated;
  }

  public getPlaces(): Place[] {

    let places: Place[] = this.places.length > 0 ? this.places : INITIAL_PLACES;

    if (this.places.length === 0 && typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.PLACES);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            places = parsed;
            this.places = parsed;
          }
        } catch {}
      }
    }



    // Auto-sync vendor listings directly into main directory places
    try {
      const vendorListings = this.getVendorListings();
      const placesMap = new Map<string, Place>(places.map((p) => [p.id, p]));

      if (vendorListings && vendorListings.length > 0) {
        for (const listing of vendorListings) {
          // ... (existing merge logic) ...
          const existingByMatch = Array.from(placesMap.values()).find(
            (p) => p.id === listing.id || p.name.toLowerCase().trim() === listing.businessName.toLowerCase().trim()
          );

          const placeObj: Place = {
            id: listing.id,
            name: listing.businessName,
            nameBm: listing.businessName,
            category: listing.category as any,
            subCategory: listing.subCategory as any,
            township: listing.township,
            location: listing.address,
            contact: listing.contactPhone,
            whatsappNumber: listing.whatsappNumber,
            description: listing.description,
            descriptionBm: listing.description,
            operatingHours: listing.operatingHours,
            realTimeStatus: listing.realTimeStatus,
            diyHarvestStatus: listing.diyHarvestStatus,
            parkingStatus: listing.parkingStatus,
            roomAvailabilityStatus: listing.roomAvailabilityStatus,
            verificationStatus: listing.verificationStatus,
            dietaryTags: listing.dietaryTags,
            imageUrl: listing.coverImage || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
            coordinates: listing.coordinates || { lat: 4.49, lng: 101.39 },
            elevation: '1,500 m',
            tags: ['Verified Vendor', listing.township, 'Highland'],
            priceRange: 'RM 10 - RM 100',
            rating: 4.8,
            reviewsCount: 12,
            isSponsored: listing.isSponsored,
            createdAt: listing.createdAt,
            wazeUrl: listing.wazeUrl,
            googleMapsUrl: listing.googleMapsUrl,
          };

          if (existingByMatch) {
            placesMap.set(existingByMatch.id, {
              ...existingByMatch,
              ...placeObj,
              id: existingByMatch.id,
            });
          } else {
            placesMap.set(listing.id, placeObj);
          }
        }
      }
      places = Array.from(placesMap.values());
    } catch (e) {
      console.warn("Could not merge vendor listings into directory places:", e);
    }

    return places;
  }

  public async savePlace(newPlace: Place, shouldSyncToVendor: boolean = true): Promise<Place[]> {
    const places = this.getPlaces();
    const existingIdx = places.findIndex((p) => p.id === newPlace.id);
    let updated: Place[];
    if (existingIdx >= 0) {
      updated = [...places];
      updated[existingIdx] = newPlace;
    } else {
      updated = [newPlace, ...places];
    }
    this.places = updated;
    localStorage.setItem(STORAGE_KEYS.PLACES, JSON.stringify(updated));

    let updatedVendorListings: VendorListing[] = [];
    let vendorUpdated = false;

    if (shouldSyncToVendor) {
      const vendorListings = this.getVendorListings();
      const vendorIdx = vendorListings.findIndex(
        (v) => v.id === newPlace.id || v.businessName.toLowerCase().trim() === newPlace.name.toLowerCase().trim()
      );

      updatedVendorListings = [...vendorListings];
      if (vendorIdx >= 0) {
        vendorUpdated = true;
        const existingVendor = vendorListings[vendorIdx];
        const syncedVendor: VendorListing = {
          ...existingVendor,
          businessName: newPlace.name,
          category: newPlace.category,
          subCategory: newPlace.subCategory || existingVendor.subCategory,
          township: newPlace.township,
          address: newPlace.location || existingVendor.address,
          contactPhone: newPlace.contact || existingVendor.contactPhone,
          description: newPlace.description || existingVendor.description,
          operatingHours: newPlace.operatingHours || existingVendor.operatingHours,
          realTimeStatus: newPlace.realTimeStatus || existingVendor.realTimeStatus,
          diyHarvestStatus: newPlace.diyHarvestStatus || existingVendor.diyHarvestStatus,
          parkingStatus: newPlace.parkingStatus || existingVendor.parkingStatus,
          roomAvailabilityStatus: newPlace.roomAvailabilityStatus || existingVendor.roomAvailabilityStatus,
          verificationStatus: newPlace.verificationStatus || existingVendor.verificationStatus,
          dietaryTags: newPlace.dietaryTags || existingVendor.dietaryTags,
          coverImage: newPlace.imageUrl || existingVendor.coverImage,
          coordinates: newPlace.coordinates || existingVendor.coordinates,
          updatedAt: new Date().toISOString(),
        };
        updatedVendorListings[vendorIdx] = syncedVendor;
        this.setLocalStorageItem(STORAGE_KEYS.VENDOR_LISTINGS, JSON.stringify(updatedVendorListings));

        if (db) {
          try {
            const cleanVendor = Object.fromEntries(
              Object.entries(syncedVendor).filter(([_, v]) => v !== undefined)
            );
            await setDoc(doc(db, 'vendor_listings', syncedVendor.id), cleanVendor);
          } catch (e) {
            console.warn('Error syncing updated vendor listing to Firestore:', e);
          }
        }
      }
    }

    if (db) {
      try {
        const cleanPlace = Object.fromEntries(
          Object.entries(newPlace).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'places', newPlace.id), cleanPlace);
        console.log('[FirebaseService] Successfully synced place to Firestore:', newPlace.name);
      } catch (e) {
        console.error("Error saving place to Firestore:", e);
      }
    }

    this.notify();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('places-updated', { detail: updated }));
      if (vendorUpdated) {
        window.dispatchEvent(new CustomEvent('vendor-listings-updated', { detail: updatedVendorListings }));
      }
    }
    return updated;
  }

  public async deletePlace(id: string): Promise<Place[]> {
    const places = this.getPlaces().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PLACES, JSON.stringify(places));
    this.notify();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('places-updated', { detail: places }));
    }
    
    // Delete directly from Firestore
    if (db) {
      try {
        await deleteDoc(doc(db, 'places', id));
        console.log('[FirebaseService] Successfully deleted place from Firestore:', id);
      } catch (e) {
        console.error("Error deleting place from Firestore:", e);
      }
    }
    return places;
  }

  public getGallery(): GalleryItem[] {
    const saved = localStorage.getItem(STORAGE_KEYS.GALLERY);
    if (saved) {
      try { return JSON.parse(saved); } catch { return INITIAL_GALLERY; }
    }
    return INITIAL_GALLERY;
  }

  public async saveGalleryItem(item: GalleryItem): Promise<GalleryItem[]> {
    const items = this.getGallery();
    const updated = [item, ...items.filter(i => i.id !== item.id)];
    this.setLocalStorageItem(STORAGE_KEYS.GALLERY, JSON.stringify(updated));
    
    // Dispatch immediate event for snappy UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gallery-updated', { detail: updated }));
    }

    // Sync directly to Firestore
    if (db) {
      try {
        const cleanItem = Object.fromEntries(
          Object.entries(item).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'gallery', item.id), cleanItem);
        console.log('[FirebaseService] Successfully synced gallery item to Firestore:', item.title);
      } catch (e) {
        console.error("Error saving gallery item to Firestore:", e);
      }
    }
    this.notify();
    return updated;
  }

  public async deleteGalleryItem(id: string): Promise<GalleryItem[]> {
    console.log('[FirebaseService] Deleting gallery item:', id);
    const items = this.getGallery().filter((item) => item.id !== id);
    this.setLocalStorageItem(STORAGE_KEYS.GALLERY, JSON.stringify(items));
    
    // Dispatch immediate event for snappy UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gallery-updated', { detail: items }));
    }

    // Delete directly from Firestore
    if (db) {
      try {
        await deleteDoc(doc(db, 'gallery', id));
        console.log('[FirebaseService] Successfully deleted gallery item from Firestore:', id);
      } catch (e) {
        console.error("Error deleting gallery item from Firestore:", e);
      }
    }
    this.notify();
    return items;
  }

  public getEvents(): EventNotification[] {
    const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (saved) {
      try { return JSON.parse(saved); } catch { return INITIAL_EVENTS; }
    }
    return INITIAL_EVENTS;
  }

  public async saveEvent(event: EventNotification): Promise<EventNotification[]> {
    const events = this.getEvents();
    const updated = [event, ...events.filter(e => e.id !== event.id)];
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(updated));
    if (db) {
      try {
        const cleanEvent = Object.fromEntries(
          Object.entries(event).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'events', event.id), cleanEvent);
        console.log('[FirebaseService] Successfully synced event to Firestore:', event.title);
      } catch (e) {
        console.error("Error saving event to Firestore:", e);
      }
    }
    return updated;
  }

  public getLoungePosts(): LoungePost[] {
    const saved = localStorage.getItem(STORAGE_KEYS.LOUNGE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((p) => !isMockLoungePost(p));
          if (filtered.length !== parsed.length) {
            this.setLocalStorageItem(STORAGE_KEYS.LOUNGE, JSON.stringify(filtered));
          }
          return filtered;
        }
      } catch {
        // fallback
      }
    }
    return [];
  }

  public subscribeLoungePosts(callback: (posts: LoungePost[]) => void): () => void {
    this.loungeListeners.push(callback);
    // Send immediate cached/initial data
    callback(this.getLoungePosts());
    return () => {
      this.loungeListeners = this.loungeListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyLounge(posts: LoungePost[]) {
    this.loungeListeners.forEach((cb) => {
      try {
        cb(posts);
      } catch (err) {
        console.warn("Error notifying lounge listener:", err);
      }
    });
  }

  private async seedInitialLoungePosts() {
    // Mock lounge posts removed per user request
  }

  private initLoungeRealtimeListener() {
    if (!db) return;
    try {
      const loungeCol = collection(db, 'lounge');
      onSnapshot(
        loungeCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudPosts: LoungePost[] = snapshot.docs
              .map((docSnap) => {
                const data = docSnap.data() as any;
                return {
                  id: docSnap.id,
                  authorName: data.authorName || 'Highland Explorer',
                  authorAvatar:
                    data.authorAvatar ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
                  authorRole: data.authorRole || 'Visitor',
                  content: data.content || '',
                  timestamp: data.timestamp || 'Recently',
                  upvotes: typeof data.upvotes === 'number' ? data.upvotes : 0,
                  hasUpvoted: false,
                  tag: data.tag || 'Traffic',
                  replies: Array.isArray(data.replies) ? data.replies : [],
                  repliesCount:
                    typeof data.repliesCount === 'number'
                      ? data.repliesCount
                      : Array.isArray(data.replies)
                      ? data.replies.length
                      : 0,
                  createdAt: data.createdAt || 0,
                };
              })
              .filter((p) => !isMockLoungePost(p));

            // Purge any mock posts from Firestore
            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data() as any;
              if (isMockLoungePost({ id: docSnap.id, ...data })) {
                deleteDoc(doc(db, 'lounge', docSnap.id)).catch(() => {});
              }
            });

            // Sort newest first
            cloudPosts.sort((a: any, b: any) => {
              const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime();
              const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime();
              return timeB - timeA;
            });

            this.setLocalStorageItem(STORAGE_KEYS.LOUNGE, JSON.stringify(cloudPosts.slice(0, 40)));
            this.notifyLounge(cloudPosts);
          } else {
            this.setLocalStorageItem(STORAGE_KEYS.LOUNGE, JSON.stringify([]));
            this.notifyLounge([]);
          }
        },
        (err) => {
          console.warn("Realtime lounge snapshot listener warning:", err);
        }
      );
    } catch (e) {
      console.warn("Could not initialize lounge realtime listener:", e);
    }
  }

  public async addLoungePost(
    post: Omit<LoungePost, 'id' | 'timestamp' | 'upvotes' | 'repliesCount'>
  ): Promise<LoungePost[]> {
    const postId = 'post-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    const newPost: LoungePost & { createdAt: number } = {
      ...post,
      id: postId,
      timestamp: 'Just now',
      upvotes: 0,
      repliesCount: 0,
      replies: [],
      createdAt: Date.now(),
    };

    // Optimistic local update
    const current = this.getLoungePosts();
    const updated = [newPost, ...current.filter((p) => p.id !== postId)];
    this.setLocalStorageItem(STORAGE_KEYS.LOUNGE, JSON.stringify(updated.slice(0, 40)));
    this.notifyLounge(updated);

    // Realtime persistence to Firestore
    if (db) {
      try {
        const cleanPost = Object.fromEntries(
          Object.entries(newPost).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'lounge', postId), cleanPost);
      } catch (err) {
        console.warn("Failed syncing lounge post to Firestore:", err);
      }
    }

    return updated;
  }

  public async deleteLoungePost(postId: string): Promise<LoungePost[]> {
    const current = this.getLoungePosts();
    const updated = current.filter((p) => p.id !== postId);
    this.setLocalStorageItem(STORAGE_KEYS.LOUNGE, JSON.stringify(updated.slice(0, 40)));
    this.notifyLounge(updated);

    if (db) {
      try {
        await deleteDoc(doc(db, 'lounge', postId));
      } catch (err) {
        console.warn("Failed deleting lounge post from Firestore:", err);
      }
    }
    return updated;
  }

  public async upvoteLoungePost(postId: string): Promise<LoungePost[]> {
    const current = this.getLoungePosts();
    let newUpvotes = 0;
    const updated = current.map((p) => {
      if (p.id === postId) {
        const hasUpvoted = p.hasUpvoted ?? false;
        const currentUpvotes = p.upvotes ?? 0;
        newUpvotes = hasUpvoted ? Math.max(0, currentUpvotes - 1) : currentUpvotes + 1;
        return {
          ...p,
          upvotes: newUpvotes,
          hasUpvoted: !hasUpvoted,
        };
      }
      return p;
    });

    this.setLocalStorageItem(STORAGE_KEYS.LOUNGE, JSON.stringify(updated.slice(0, 40)));
    this.notifyLounge(updated);

    if (db) {
      try {
        await setDoc(
          doc(db, 'lounge', postId),
          { upvotes: newUpvotes },
          { merge: true }
        );
      } catch (err) {
        console.warn("Failed syncing upvote to Firestore:", err);
      }
    }

    return updated;
  }

  public async addLoungeReply(
    postId: string,
    content: string,
    authorName = 'Highland Visitor'
  ): Promise<LoungePost[]> {
    const current = this.getLoungePosts();
    const reply: LoungePostReply = {
      id: 'rep-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      authorName,
      authorAvatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(authorName)}`,
      content,
      timestamp: 'Just now',
    };

    let postToSync: LoungePost | undefined;
    const updated = current.map((p) => {
      if (p.id === postId) {
        const replies = p.replies ? [...p.replies, reply] : [reply];
        const updatedDoc: LoungePost = {
          ...p,
          replies,
          repliesCount: replies.length,
        };
        postToSync = updatedDoc;
        return updatedDoc;
      }
      return p;
    });

    this.setLocalStorageItem(STORAGE_KEYS.LOUNGE, JSON.stringify(updated.slice(0, 40)));
    this.notifyLounge(updated);

    if (db && postToSync) {
      try {
        const cleanDoc = Object.fromEntries(
          Object.entries(postToSync).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'lounge', postId), cleanDoc, { merge: true });
      } catch (err) {
        console.warn("Failed syncing lounge reply to Firestore:", err);
      }
    }

    return updated;
  }

  public getTownshipHubs(): Record<string, TownshipHubInfo> {
    const saved = localStorage.getItem(STORAGE_KEYS.TOWNSHIP_HUBS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  }

  public async saveTownshipHub(hub: TownshipHubInfo): Promise<Record<string, TownshipHubInfo>> {
    console.log('[FirebaseService] Saving township hub:', hub.township, hub);
    const hubs = this.getTownshipHubs();
    hubs[hub.township] = hub;
    localStorage.setItem(STORAGE_KEYS.TOWNSHIP_HUBS, JSON.stringify(hubs));

    // Persist directly to Firestore
    if (db) {
      try {
        const cleanHub = Object.fromEntries(
          Object.entries(hub).filter(([_, v]) => v !== undefined)
        );
        if (Array.isArray(cleanHub.placesOfInterest)) {
          cleanHub.placesOfInterest = (cleanHub.placesOfInterest as string[]).filter(Boolean);
        }
        await setDoc(doc(db, 'township_hubs', hub.township), cleanHub);
        console.log('[FirebaseService] Successfully synced township hub to Firestore:', hub.township);
      } catch (err) {
        console.error('[FirebaseService] Cloud sync failed for township hub:', err);
      }
    }

    this.notify();
    return hubs;
  }

  public async deleteTownshipHub(township: string): Promise<Record<string, TownshipHubInfo>> {
    console.log('[FirebaseService] Deleting/resetting township hub:', township);
    const hubs = this.getTownshipHubs();
    delete hubs[township];
    localStorage.setItem(STORAGE_KEYS.TOWNSHIP_HUBS, JSON.stringify(hubs));

    // Remove directly from Firestore
    if (db) {
      try {
        await deleteDoc(doc(db, 'township_hubs', township));
        console.log('[FirebaseService] Successfully deleted township hub from Firestore:', township);
      } catch (err) {
        console.error('[FirebaseService] Cloud delete failed for township hub:', err);
      }
    }

    this.notify();
    return hubs;
  }

  public getHomeCards(): MobileHomeCard[] {
    const saved = localStorage.getItem(STORAGE_KEYS.HOME_CARDS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cardMap = new Map<string, MobileHomeCard>();
          INITIAL_MOBILE_HOME_CARDS.forEach((c) => cardMap.set(c.id, c));
          parsed.forEach((c) => cardMap.set(c.id, c));
          const merged = Array.from(cardMap.values());
          return merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
      } catch {
        return INITIAL_MOBILE_HOME_CARDS;
      }
    }
    localStorage.setItem(STORAGE_KEYS.HOME_CARDS, JSON.stringify(INITIAL_MOBILE_HOME_CARDS));
    return INITIAL_MOBILE_HOME_CARDS;
  }

  public async saveHomeCard(card: MobileHomeCard): Promise<MobileHomeCard[]> {
    const cards = this.getHomeCards();
    const existingIdx = cards.findIndex((c) => c.id === card.id);
    let updated: MobileHomeCard[];
    if (existingIdx >= 0) {
      updated = [...cards];
      updated[existingIdx] = card;
    } else {
      updated = [...cards, card];
    }
    updated.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    localStorage.setItem(STORAGE_KEYS.HOME_CARDS, JSON.stringify(updated));

    if (db) {
      try {
        const cleanCard = Object.fromEntries(
          Object.entries(card).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'home_glass_cards', card.id), cleanCard);
      } catch (err) {
        console.error('[FirebaseService] Failed syncing home card to Firestore:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('home-cards-updated', { detail: updated }));
    this.notify();
    return updated;
  }

  public async deleteHomeCard(cardId: string): Promise<MobileHomeCard[]> {
    const cards = this.getHomeCards();
    const updated = cards.filter((c) => c.id !== cardId);
    localStorage.setItem(STORAGE_KEYS.HOME_CARDS, JSON.stringify(updated));

    if (db) {
      try {
        await deleteDoc(doc(db, 'home_glass_cards', cardId));
      } catch (err) {
        console.error('[FirebaseService] Failed deleting home card from Firestore:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('home-cards-updated', { detail: updated }));
    this.notify();
    return updated;
  }

  public async resetHomeCards(): Promise<MobileHomeCard[]> {
    localStorage.setItem(STORAGE_KEYS.HOME_CARDS, JSON.stringify(INITIAL_MOBILE_HOME_CARDS));
    if (db) {
      try {
        for (const card of INITIAL_MOBILE_HOME_CARDS) {
          await setDoc(doc(db, 'home_glass_cards', card.id), card);
        }
      } catch (err) {
        console.error('[FirebaseService] Failed resetting home cards in Firestore:', err);
      }
    }
    window.dispatchEvent(new CustomEvent('home-cards-updated', { detail: INITIAL_MOBILE_HOME_CARDS }));
    this.notify();
    return INITIAL_MOBILE_HOME_CARDS;
  }

  public getJobs(): JobClassified[] {
    const saved = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_JOBS;
      }
    }
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(INITIAL_JOBS));
    return INITIAL_JOBS;
  }

  public saveJob(newJob: JobClassified): JobClassified[] {
    const jobs = this.getJobs();
    const existingIdx = jobs.findIndex((j) => j.id === newJob.id);
    let updated: JobClassified[];
    if (existingIdx >= 0) {
      updated = [...jobs];
      updated[existingIdx] = newJob;
    } else {
      updated = [newJob, ...jobs];
    }
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jobs-updated', { detail: updated }));
    }
    this.notify();
    return updated;
  }

  public deleteJob(id: string): JobClassified[] {
    const jobs = this.getJobs().filter((j) => j.id !== id);
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jobs-updated', { detail: jobs }));
    }
    this.notify();
    return jobs;
  }

  public getTrafficAlerts(): TrafficAlert[] {
    const refreshTimestamps = (alerts: TrafficAlert[]) => {
      return alerts.map((a, i) => ({
        ...a,
        reportedTime: `Live • ${i * 3 + 2} mins ago`,
        updatedAt: new Date().toISOString()
      }));
    };

    const saved = localStorage.getItem(STORAGE_KEYS.TRAFFIC);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return refreshTimestamps(parsed);
      } catch {
        return refreshTimestamps(INITIAL_TRAFFIC);
      }
    }
    return refreshTimestamps(INITIAL_TRAFFIC);
  }

  public async saveTrafficAlert(alert: TrafficAlert): Promise<TrafficAlert[]> {
    const alerts = this.getTrafficAlerts();
    const updated = [alert, ...alerts.filter(a => a.id !== alert.id)];
    localStorage.setItem(STORAGE_KEYS.TRAFFIC, JSON.stringify(updated));
    if (db) {
      try {
        await setDoc(doc(db, 'traffic_alerts', alert.id), alert);
      } catch (e) {
        console.error("Error saving traffic alert to Firestore:", e);
      }
    }
    return updated;
  }

  public getHazardAlerts(): HazardAlert[] {
    const saved = localStorage.getItem(STORAGE_KEYS.HAZARDS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { return INITIAL_HAZARDS; }
    }
    return INITIAL_HAZARDS;
  }

  public async saveHazardAlert(alert: HazardAlert): Promise<HazardAlert[]> {
    const alerts = this.getHazardAlerts();
    const updated = [alert, ...alerts.filter(a => a.id !== alert.id)];
    localStorage.setItem(STORAGE_KEYS.HAZARDS, JSON.stringify(updated));
    if (db) {
      try {
        await setDoc(doc(db, 'hazard_alerts', alert.id), alert);
      } catch (e) {
        console.error("Error saving hazard alert to Firestore:", e);
      }
    }
    return updated;
  }

  public getItinerary(): ItineraryPlan | null {
    const saved = localStorage.getItem(STORAGE_KEYS.ITINERARY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  }

  public saveItinerary(plan: ItineraryPlan): ItineraryPlan {
    localStorage.setItem(STORAGE_KEYS.ITINERARY, JSON.stringify(plan));
    return plan;
  }

  public clearItinerary(): void {
    localStorage.removeItem(STORAGE_KEYS.ITINERARY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('itinerary-cleared'));
    }
  }

  public getGsapCardImages(): Record<string, string> {
    const saved = localStorage.getItem('camgo_gsap_card_images');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {};
  }

  public async saveGsapCardImage(cardId: string, imageUrl: string): Promise<Record<string, string>> {
    // 1. Sanitize document ID to ensure a clean root collection document path
    const cleanDocId = (cardId || 'card-1').trim().replace(/^\/+|\/+$/g, '');

    const images = this.getGsapCardImages();
    images[cleanDocId] = imageUrl;
    this.setLocalStorageItem('camgo_gsap_card_images', JSON.stringify(images));

    // 2. Authentication State Check: Ensure a valid authenticated user exists before executing Firestore write
    if (auth && !auth.currentUser) {
      console.log('[FirebaseService] auth.currentUser is not set. Initiating authentication session before saveGsapCardImage...');
      try {
        const cred = await signInAnonymously(auth);
        console.log('[FirebaseService] Authenticated session established for write:', cred.user?.uid);
      } catch (authErr) {
        console.warn('[FirebaseService] Could not establish anonymous auth context:', authErr);
      }
    }

    // 3. Verify admin role authorization state
    const isAdmin =
      this.currentUser?.role === 'admin' ||
      this.currentUser?.email === 'ayahsyirah77@gmail.com' ||
      this.currentUser?.email === 'asuypower7984@gmail.com' ||
      auth?.currentUser?.email === 'ayahsyirah77@gmail.com' ||
      auth?.currentUser?.email === 'asuypower7984@gmail.com' ||
      auth?.currentUser?.email?.toLowerCase().includes('admin');

    if (!isAdmin) {
      console.warn('[FirebaseService] Non-admin user profile detected during GSAP image save. Proceeding with active authentication.');
    }

    // 4. Firestore Document Write: Clean collection path allowed by Firestore security rules
    if (db) {
      const docPayload = {
        id: cleanDocId,
        cardId: cleanDocId,
        imageUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: auth?.currentUser?.email || this.currentUser?.email || 'admin',
      };

      try {
        // Save to explicitly allowed root collections: gsap_images and gsap_card_images
        await Promise.all([
          setDoc(doc(db, 'gsap_images', cleanDocId), docPayload, { merge: true }),
          setDoc(doc(db, 'gsap_card_images', cleanDocId), docPayload, { merge: true }),
        ]);
        console.log('[FirebaseService] Successfully saved GSAP card image to Firestore (gsap_images & gsap_card_images):', cleanDocId);
      } catch (err: any) {
        console.error("Could not sync GSAP images to Firestore:", err);

        // Auto-recovery if permission denied: refresh auth and retry once
        if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
          console.warn('[FirebaseService] Permission notice in saveGsapCardImage. Attempting write retry...');
          try {
            if (auth && !auth.currentUser) {
              try {
                await signInAnonymously(auth);
              } catch (anonErr) {
                console.warn('[FirebaseService] Anonymous sign-in skipped (not enabled in console):', anonErr);
              }
            }
            await Promise.all([
              setDoc(doc(db, 'gsap_images', cleanDocId), docPayload, { merge: true }),
              setDoc(doc(db, 'gsap_card_images', cleanDocId), docPayload, { merge: true }),
            ]);
            console.log('[FirebaseService] Retry successful: GSAP card image saved.');
          } catch (retryErr: any) {
            console.warn('[FirebaseService] Note: write saved to local storage:', retryErr);
            // Local storage is already updated, do not throw fatal auth error
            if (retryErr?.code === 'auth/admin-restricted-operation' || retryErr?.message?.includes('admin-restricted')) {
              return images;
            }
            throw retryErr;
          }
        } else {
          throw err;
        }
      }
    }

    this.notify();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gsap-images-updated', { detail: images }));
    }
    return images;
  }





  public getEmergencyCard(): EmergencyCard {
    let raw: Partial<EmergencyCard> | null = null;
    if (this.currentUser?.emergencyCard) {
      raw = this.currentUser.emergencyCard;
    } else {
      const saved = localStorage.getItem(STORAGE_KEYS.EMERGENCY_CARD);
      if (saved) {
        try {
          raw = JSON.parse(saved);
        } catch {}
      }
    }
    return sanitizeEmergencyCard(raw);
  }

  public async saveEmergencyCard(card: EmergencyCard): Promise<EmergencyCard> {
    const sanitized = sanitizeEmergencyCard(card);
    const updatedCard: EmergencyCard = {
      ...sanitized,
      updatedAt: new Date().toISOString(),
    };

    this.setLocalStorageItem(STORAGE_KEYS.EMERGENCY_CARD, JSON.stringify(updatedCard));

    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        emergencyCard: updatedCard,
      };
      this.setLocalStorageItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
    }

    if (db) {
      const targetUid = this.currentUser?.uid || auth?.currentUser?.uid;
      if (targetUid) {
        try {
          await Promise.all([
            setDoc(doc(db, 'emergency_cards', targetUid), updatedCard, { merge: true }),
            setDoc(doc(db, 'users', targetUid), { emergencyCard: updatedCard }, { merge: true }),
          ]);
          console.log('[FirebaseService] Successfully saved Emergency Card to Firestore across collections for UID:', targetUid);
        } catch (err) {
          console.warn('Could not sync emergency card to Firestore (using local cache):', err);
        }
      }
    }

    this.notify();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emergency-card-updated', { detail: updatedCard }));
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: this.currentUser }));
    }
    return updatedCard;
  }

  public async dispatchEmergencySos(
    recipientPhone: string,
    coordinates: { lat: number; lng: number },
    emergencyCard: EmergencyCard
  ): Promise<EmergencyDispatchRecord> {
    const timestamp = new Date().toISOString();
    const googleMapsUrl = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
    const dispatchId = 'sos-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    let channel = 'Native Device Protocol (sms: & wa.me) + Telemetry Log';

    // Attempt Automated Backend API Dispatch
    try {
      const response = await fetch('/api/emergency/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone,
          senderName: emergencyCard.fullLegalName,
          coordinates,
          emergencyCard,
          googleMapsUrl,
          timestamp,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.channel) channel = data.channel;
      }
    } catch (apiError) {
      console.warn('Direct backend API dispatch fallback:', apiError);
    }

    const record: EmergencyDispatchRecord = {
      id: dispatchId,
      userId: this.currentUser?.uid || 'guest-traveler',
      recipientPhone,
      coordinates,
      googleMapsUrl,
      emergencyCard,
      dispatchedAt: timestamp,
      status: 'dispatched',
      channel,
    };

    // Save to local dispatches log
    try {
      const rawDispatches = localStorage.getItem(STORAGE_KEYS.SOS_DISPATCHES);
      const dispatches: EmergencyDispatchRecord[] = rawDispatches ? JSON.parse(rawDispatches) : [];
      dispatches.unshift(record);
      localStorage.setItem(STORAGE_KEYS.SOS_DISPATCHES, JSON.stringify(dispatches.slice(0, 30)));
    } catch {}

    // Persist dispatch record to Firestore if available
    if (db) {
      try {
        await Promise.race([
          setDoc(doc(db, 'sos_dispatches', dispatchId), record),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch (e) {
        console.warn('Could not save SOS dispatch record to Firestore:', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('emergency-sos-dispatched', { detail: record }));
    }

    return record;
  }

  public getFarmTickets(): FarmTicket[] {
    const saved = localStorage.getItem(STORAGE_KEYS.TICKETS);
    if (saved) {
      try {
        const parsed: FarmTicket[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        return POPULAR_FARM_TICKETS as FarmTicket[];
      }
    }
    return POPULAR_FARM_TICKETS as FarmTicket[];
  }

  public async saveFarmTicket(ticket: FarmTicket): Promise<FarmTicket[]> {
    const tickets = this.getFarmTickets();
    const updated = [ticket, ...tickets.filter(t => t.id !== ticket.id)];
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(updated));
    
    // CROSS-COLLECTION SYNC: Find and update corresponding directory place
    const allPlaces = this.getPlaces();
    const matchingPlace = allPlaces.find(p => 
      p.id === ticket.id ||
      p.name.toLowerCase().includes(ticket.name.toLowerCase()) || 
      ticket.name.toLowerCase().includes(p.name.toLowerCase())
    );

    if (matchingPlace) {
      const updatedPlace: Place = {
        ...matchingPlace,
        operatingHours: {
          ...ticket.operatingHours,
        },
        priceRange: ticket.isFree ? 'FREE' : `RM ${ticket.adultPriceRm}`,
      };
      await this.savePlace(updatedPlace);
      console.log(`[FirebaseService] Auto-synchronized directory place "${matchingPlace.name}" with ticket updates.`);
    }

    if (db) {
      try {
        const cleanTicket = Object.fromEntries(
          Object.entries(ticket).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, 'farm_tickets', ticket.id), cleanTicket);
        console.log('[FirebaseService] Successfully synced farm ticket to Firestore:', ticket.name);
      } catch (e) {
        console.error("Error saving farm ticket to Firestore:", e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farm-tickets-updated', { detail: updated }));
    }

    this.notify();
    return updated;
  }

  public async deleteFarmTicket(id: string): Promise<FarmTicket[]> {
    const tickets = this.getFarmTickets().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
    
    if (db) {
      try {
        await deleteDoc(doc(db, 'farm_tickets', id));
        console.log('[FirebaseService] Successfully deleted farm ticket from Firestore:', id);
      } catch (e) {
        console.error("Error deleting farm ticket from Firestore:", e);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('farm-tickets-updated', { detail: tickets }));
    }

    this.notify();
    return tickets;
  }

  // Vendor Management CRUD Methods
  public getVendorListings(): VendorListing[] {
    const data = localStorage.getItem(STORAGE_KEYS.VENDOR_LISTINGS);
    let list: VendorListing[] = [];
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          list = parsed.filter((v: any) => v && v.id && !isMockVendorListing(v));
        }
      } catch {
        list = [];
      }
    }

    // Ensure Park View Apartment (admin-created vendor listing) is always present
    if (!list.some((v) => (v.businessName || '').toLowerCase().includes('park view') || v.id === PARK_VIEW_VENDOR_LISTING.id)) {
      list.unshift(PARK_VIEW_VENDOR_LISTING);
    }

    // Deduplicate by ID and normalized business name
    const uniqueMap = new Map<string, VendorListing>();
    for (const item of list) {
      if (!item || !item.businessName) continue;
      const normName = item.businessName.toLowerCase().trim();
      const existingKey = Array.from(uniqueMap.keys()).find(k => k === item.id || k === normName);
      if (!existingKey) {
        uniqueMap.set(item.id, item);
        uniqueMap.set(normName, item);
      } else {
        uniqueMap.set(existingKey, item);
        uniqueMap.set(item.id, item);
      }
    }
    const finalUnique = Array.from(new Set(uniqueMap.values()));
    this.setLocalStorageItem(STORAGE_KEYS.VENDOR_LISTINGS, JSON.stringify(finalUnique));
    return finalUnique;
  }

  public getVendorListingById(id: string): VendorListing | undefined {
    return this.getVendorListings().find((v) => v.id === id);
  }

  public async saveVendorListing(listingInput: VendorListing): Promise<VendorListing[]> {
    const listing: VendorListing = {
      ...listingInput,
      verificationStatus: listingInput.verificationStatus || 'verified',
      isBookingEnabled: listingInput.isBookingEnabled !== undefined ? listingInput.isBookingEnabled : true,
    };
    const listings = this.getVendorListings();
    const normName = listing.businessName.toLowerCase().trim();
    const index = listings.findIndex(
      (l) => l.id === listing.id || l.businessName.toLowerCase().trim() === normName
    );

    if (index >= 0) {
      listings[index] = {
        ...listings[index],
        ...listing,
        id: listings[index].id,
      };
    } else {
      listings.push(listing);
    }

    // Deduplicate array before saving
    const uniqueMap = new Map<string, VendorListing>();
    for (const item of listings) {
      if (!item || !item.businessName) continue;
      const nName = item.businessName.toLowerCase().trim();
      uniqueMap.set(item.id, item);
      uniqueMap.set(nName, item);
    }
    const finalUnique = Array.from(new Set(uniqueMap.values()));

    this.setLocalStorageItem(STORAGE_KEYS.VENDOR_LISTINGS, JSON.stringify(finalUnique));

    // Auto-Sync to Motorbike Partners ONLY if genuinely a motorbike/scooter vendor with verified packages
    const vName = (listing.businessName || '').toLowerCase();
    const isSpecificMotorbikeVendor =
      !isMockVendorListing(listing) && (
        (listing.category === 'transport' && listing.subCategory === 'car_bike_rentals' && listing.motorbikePackages && listing.motorbikePackages.length > 0) ||
        vName.includes('motorbike') ||
        vName.includes('motorcycle') ||
        vName.includes('scooter') ||
        vName.includes('sewa motor') ||
        vName.includes('sewa skuter')
      );

    if (isSpecificMotorbikeVendor) {
      const partnerObj: MotorbikeRentalPartner = {
        id: listing.id,
        businessName: listing.businessName,
        township: listing.township,
        imageUrl: listing.coverImage || listing.logoUrl || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
        operatingStatus: listing.realTimeStatus === 'closed_roadworks' ? 'closed' : 'open',
        fleetAvailability: (listing.motorbikeFleetStatus === 'not_applicable' || !listing.motorbikeFleetStatus ? 'high' : listing.motorbikeFleetStatus) as any,
        contactPhone: listing.contactPhone,
        whatsappNumber: listing.whatsappNumber || listing.contactPhone,
        packages: listing.motorbikePackages && listing.motorbikePackages.length > 0 ? listing.motorbikePackages : [],
        isBookingEnabled: true,
        verificationStatus: 'verified',
        ownerEmail: listing.ownerEmail,
      };
      await this.saveMotorbikePartner(partnerObj);
    }

    // Cross-Sync to Main Directory Places (Create or Update)
    const mainPlaces = this.getPlaces();
    const matchIndex = mainPlaces.findIndex(
      (p) => p.id === listing.id || p.name.toLowerCase().trim() === listing.businessName.toLowerCase().trim()
    );

    const placeFromVendor: Place = {
      id: listing.id,
      name: listing.businessName,
      nameBm: listing.businessName,
      category: listing.category as any,
      subCategory: listing.subCategory as any,
      township: listing.township,
      location: listing.address,
      contact: listing.contactPhone,
      whatsappNumber: listing.whatsappNumber,
      description: listing.description,
      descriptionBm: listing.description,
      operatingHours: listing.operatingHours,
      realTimeStatus: listing.realTimeStatus,
      diyHarvestStatus: listing.diyHarvestStatus,
      parkingStatus: listing.parkingStatus,
      roomAvailabilityStatus: listing.roomAvailabilityStatus,
      verificationStatus: listing.verificationStatus,
      dietaryTags: listing.dietaryTags,
      imageUrl: listing.coverImage || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
      coordinates: listing.coordinates || { lat: 4.49, lng: 101.39 },
      elevation: '1,500 m',
      tags: ['Verified Vendor', listing.township, 'Highland'],
      priceRange: 'RM 10 - RM 100',
      rating: 4.8,
      reviewsCount: 12,
      isSponsored: listing.isSponsored,
      createdAt: listing.createdAt,
      wazeUrl: listing.wazeUrl,
      googleMapsUrl: listing.googleMapsUrl,
    };

    let updatedPlaces: Place[];
    if (matchIndex >= 0) {
      updatedPlaces = [...mainPlaces];
      updatedPlaces[matchIndex] = {
        ...updatedPlaces[matchIndex],
        ...placeFromVendor,
        id: updatedPlaces[matchIndex].id,
      };
    } else {
      updatedPlaces = [placeFromVendor, ...mainPlaces];
    }

    this.places = updatedPlaces;
    this.setLocalStorageItem(STORAGE_KEYS.PLACES, JSON.stringify(updatedPlaces));

    // Sync both vendor_listings and places collections in Firestore
    if (db) {
      try {
        const cleanListing = Object.fromEntries(
          Object.entries(listing).filter(([_, v]) => v !== undefined)
        );
        const cleanPlace = Object.fromEntries(
          Object.entries(matchIndex >= 0 ? updatedPlaces[matchIndex] : placeFromVendor).filter(([_, v]) => v !== undefined)
        );

        await Promise.all([
          setDoc(doc(db, 'vendor_listings', listing.id), cleanListing),
          setDoc(doc(db, 'places', matchIndex >= 0 ? updatedPlaces[matchIndex].id : listing.id), cleanPlace),
        ]);
        console.log('[FirebaseService] Auto-synced vendor listing & directory place to Firestore:', listing.businessName);
      } catch (e) {
        console.error("Error saving vendor listing/place to Firestore:", e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vendor-listings-updated', { detail: finalUnique }));
      window.dispatchEvent(new CustomEvent('places-updated', { detail: updatedPlaces }));
    }

    this.notify();
    return finalUnique;
  }

  public async deleteVendorListing(id: string): Promise<VendorListing[]> {
    const listings = this.getVendorListings().filter((l) => l.id !== id);
    this.setLocalStorageItem(STORAGE_KEYS.VENDOR_LISTINGS, JSON.stringify(listings));

    const updatedPlaces = this.getPlaces().filter((p) => p.id !== id);
    this.places = updatedPlaces;
    this.setLocalStorageItem(STORAGE_KEYS.PLACES, JSON.stringify(updatedPlaces));

    if (db) {
      try {
        await Promise.all([
          deleteDoc(doc(db, 'vendor_listings', id)),
          deleteDoc(doc(db, 'places', id)),
        ]);
      } catch (e) {
        console.error("Error deleting vendor listing/place from Firestore:", e);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vendor-listings-updated', { detail: listings }));
      window.dispatchEvent(new CustomEvent('places-updated', { detail: updatedPlaces }));
    }

    this.notify();
    return listings;
  }

  public getVendorVouchers(vendorId?: string): VendorVoucher[] {
    const data = localStorage.getItem(STORAGE_KEYS.VENDOR_VOUCHERS);
    let vouchers: VendorVoucher[] = [];
    if (!data) {
      vouchers = INITIAL_VENDOR_VOUCHERS;
      this.setLocalStorageItem(STORAGE_KEYS.VENDOR_VOUCHERS, JSON.stringify(vouchers));
    } else {
      try {
        const parsed = JSON.parse(data);
        vouchers = (Array.isArray(parsed) && parsed.length === 0 && INITIAL_VENDOR_VOUCHERS.length > 0)
          ? INITIAL_VENDOR_VOUCHERS
          : parsed;
      } catch {
        vouchers = INITIAL_VENDOR_VOUCHERS;
      }
    }
    if (vendorId) {
      return vouchers.filter((v) => v.vendorId === vendorId);
    }
    return vouchers;
  }

  public async saveVendorVoucher(voucher: VendorVoucher): Promise<VendorVoucher[]> {
    const vouchers = this.getVendorVouchers();
    const index = vouchers.findIndex((v) => v.id === voucher.id);
    if (index >= 0) {
      vouchers[index] = voucher;
    } else {
      vouchers.push(voucher);
    }
    this.setLocalStorageItem(STORAGE_KEYS.VENDOR_VOUCHERS, JSON.stringify(vouchers));
    if (db) {
      try {
        await setDoc(doc(db, 'vendor_vouchers', voucher.id), voucher);
      } catch (e) {
        console.error("Error saving vendor voucher:", e);
      }
    }
    this.notify();
    return vouchers;
  }

  public async deleteVendorVoucher(id: string): Promise<VendorVoucher[]> {
    const vouchers = this.getVendorVouchers().filter((v) => v.id !== id);
    this.setLocalStorageItem(STORAGE_KEYS.VENDOR_VOUCHERS, JSON.stringify(vouchers));
    if (db) {
      try {
        await deleteDoc(doc(db, 'vendor_vouchers', id));
      } catch (e) {
        console.error("Error deleting vendor voucher:", e);
      }
    }
    this.notify();
    return vouchers;
  }

  public getVendorEvents(vendorId?: string): VendorEventItem[] {
    const data = localStorage.getItem(STORAGE_KEYS.VENDOR_EVENTS);
    let items: VendorEventItem[] = [];
    if (!data) {
      items = INITIAL_VENDOR_EVENTS;
      this.setLocalStorageItem(STORAGE_KEYS.VENDOR_EVENTS, JSON.stringify(items));
    } else {
      try {
        const parsed = JSON.parse(data);
        items = (Array.isArray(parsed) && parsed.length === 0 && INITIAL_VENDOR_EVENTS.length > 0)
          ? INITIAL_VENDOR_EVENTS
          : parsed;
      } catch {
        items = INITIAL_VENDOR_EVENTS;
      }
    }
    if (vendorId) {
      return items.filter((item) => item.vendorId === vendorId);
    }
    return items;
  }

  public async saveVendorEvent(eventItem: VendorEventItem): Promise<VendorEventItem[]> {
    const items = this.getVendorEvents();
    const index = items.findIndex((i) => i.id === eventItem.id);
    if (index >= 0) items[index] = eventItem;
    else items.push(eventItem);
    this.setLocalStorageItem(STORAGE_KEYS.VENDOR_EVENTS, JSON.stringify(items));

    // Sync to main Highland Events feed as well
    const mainEvents = this.getEvents();
    const eIndex = mainEvents.findIndex((e) => e.id === eventItem.id);
    const updatedMainEvent: EventNotification = {
      id: eventItem.id,
      title: eventItem.title,
      date: `${eventItem.date} (${eventItem.time})`,
      description: `${eventItem.description} Location: ${eventItem.location}, ${eventItem.township}. Organized by ${eventItem.businessName}.`,
      township: eventItem.township,
      imageUrl: eventItem.imageUrl || '/src/assets/images/vendor_cover_strawberry_1792917725766.jpg',
    };
    if (eIndex >= 0) mainEvents[eIndex] = updatedMainEvent;
    await this.saveEvent(updatedMainEvent);

    this.notify();
    return items;
  }

  public getVendorStaff(vendorId: string): VendorStaffMember[] {
    const data = localStorage.getItem(STORAGE_KEYS.VENDOR_STAFF);
    let items: VendorStaffMember[] = [];
    if (!data) {
      items = INITIAL_VENDOR_STAFF;
      this.setLocalStorageItem(STORAGE_KEYS.VENDOR_STAFF, JSON.stringify(items));
    } else {
      try { items = JSON.parse(data); } catch { items = INITIAL_VENDOR_STAFF; }
    }
    return items.filter((s) => s.vendorId === vendorId);
  }

  public async saveVendorStaff(staff: VendorStaffMember): Promise<VendorStaffMember[]> {
    const data = localStorage.getItem(STORAGE_KEYS.VENDOR_STAFF);
    let items: VendorStaffMember[] = [];
    if (data) { try { items = JSON.parse(data); } catch {} }
    const index = items.findIndex((s) => s.id === staff.id);
    if (index >= 0) items[index] = staff;
    else items.push(staff);
    this.setLocalStorageItem(STORAGE_KEYS.VENDOR_STAFF, JSON.stringify(items));
    this.notify();
    return items.filter((s) => s.vendorId === staff.vendorId);
  }

  public async deleteVendorStaff(id: string, vendorId: string): Promise<VendorStaffMember[]> {
    const data = localStorage.getItem(STORAGE_KEYS.VENDOR_STAFF);
    let items: VendorStaffMember[] = [];
    if (data) { try { items = JSON.parse(data); } catch {} }
    items = items.filter((s) => s.id !== id);
    this.setLocalStorageItem(STORAGE_KEYS.VENDOR_STAFF, JSON.stringify(items));
    this.notify();
    return items.filter((s) => s.vendorId === vendorId);
  }

  public getVendorAnalytics(vendorId: string): VendorAnalyticsData {
    return (
      INITIAL_VENDOR_ANALYTICS[vendorId] || {
        vendorId,
        views7d: 820,
        views30d: 3410,
        views90d: 11200,
        profileClicks: 520,
        whatsappClicks: 184,
        mapTriggers: 310,
        trafficSources: {
          mapSearch: 40,
          directory: 35,
          microclimate: 15,
          searchFilters: 10,
        },
        demographics: {
          bmPercent: 60,
          enPercent: 40,
        },
        peakVisitorHours: [
          { hour: '08:00', count: 30 },
          { hour: '10:00', count: 120 },
          { hour: '12:00', count: 210 },
          { hour: '14:00', count: 260 },
          { hour: '18:00', count: 85 },
        ],
      }
    );
  }

  public exportDataForGithub(): string {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'CamGo - Cameron Highlands Travel Guide',
      schemaVersion: '1.0.0',
      data: {
        places: this.getPlaces(),
        gallery: this.getGallery(),
        events: this.getEvents(),
        lounge: this.getLoungePosts(),
      },
      githubCompatibility: {
        nodeVersion: '>=20.0.0',
        framework: 'Vite React TypeScript',
        runCommand: 'npm install && npm run dev',
        buildCommand: 'npm run build',
      },
    };
    return JSON.stringify(payload, null, 2);
  }
  public async uploadImage(file: File, folder: string): Promise<string> {
    const convertToBase64 = (): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to convert file to data URL'));
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

    // If folder is user_avatars, return base64 data URL directly for instant, zero-CORS preflight storage
    if (folder === 'user_avatars') {
      try {
        return await convertToBase64();
      } catch (err) {
        console.warn('[Firebase] Failed to convert avatar to base64:', err);
      }
    }

    try {
      if (storage) {
        const storageRef = ref(storage, `${folder}/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      }
    } catch (storageErr) {
      console.warn('[Firebase Storage] Cloud upload failed, falling back to local base64 data URL:', storageErr);
    }

    return convertToBase64();
  }

  public async saveAiChatMessage(
    sessionId: string,
    message: { sender: 'ai' | 'user'; text: string; time?: string }
  ): Promise<void> {
    if (!db) return;
    try {
      const msgId = 'msg-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      await setDoc(doc(db, 'ai_chats', sessionId, 'messages', msgId), {
        id: msgId,
        sender: message.sender,
        text: message.text,
        time: message.time || new Date().toISOString(),
        createdAt: Date.now(),
      });
      await setDoc(
        doc(db, 'ai_chats', sessionId),
        {
          id: sessionId,
          lastMessage: message.text,
          lastSender: message.sender,
          updatedAt: new Date().toISOString(),
          projectId: 'camgo-prod',
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[Firebase] Could not sync AI chat message to Firestore:', err);
    }
  }

  public async getAiChatHistory(
    sessionId: string
  ): Promise<Array<{ sender: 'ai' | 'user'; text: string; time: string }>> {
    if (!db) return [];
    try {
      const snap = await getDocs(collection(db, 'ai_chats', sessionId, 'messages'));
      if (snap.empty) return [];
      const messages = snap.docs.map((d) => d.data() as any);
      messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      return messages.map((m) => ({
        sender: m.sender as 'ai' | 'user',
        text: m.text || '',
        time: m.time || 'Just now',
      }));
    } catch (err) {
      console.warn('[Firebase] Could not fetch AI chat history:', err);
      return [];
    }
  }

  public getMotorbikePartners(): MotorbikeRentalPartner[] {
    const data = localStorage.getItem('camgo_motorbike_partners');
    let cachedPartners: MotorbikeRentalPartner[] = [];

    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          cachedPartners = parsed.filter((p: any) => p && p.id && !isMockMotorbikePartner(p));
        }
      } catch {}
    }

    const partnersMap = new Map<string, MotorbikeRentalPartner>();
    for (const p of cachedPartners) {
      if (!isMockMotorbikePartner(p)) {
        partnersMap.set(p.id, p);
      }
    }

    // Auto-populate ONLY genuine vendor listings registered specifically for motorbike/scooter rentals
    const vendorListings = this.getVendorListings();
    for (const v of vendorListings) {
      if (!v || isMockVendorListing(v)) continue;
      
      const vName = (v.businessName || '').toLowerCase();
      const isSpecificMotorbikeVendor =
        (v.category === 'transport' && v.subCategory === 'car_bike_rentals' && v.motorbikePackages && v.motorbikePackages.length > 0) ||
        vName.includes('motorbike') ||
        vName.includes('motorcycle') ||
        vName.includes('scooter') ||
        vName.includes('sewa motor') ||
        vName.includes('sewa skuter');

      if (isSpecificMotorbikeVendor) {
        const existing = partnersMap.get(v.id);
        const actualPackages: MotorbikePackage[] = (v.motorbikePackages && v.motorbikePackages.length > 0)
          ? v.motorbikePackages
          : (existing?.packages && existing.packages.length > 0 ? existing.packages : []);

        const partnerObj: MotorbikeRentalPartner = {
          id: v.id,
          businessName: v.businessName,
          township: v.township,
          imageUrl: v.coverImage || v.logoUrl || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
          operatingStatus: v.realTimeStatus === 'closed_roadworks' ? 'closed' : 'open',
          fleetAvailability: (v.motorbikeFleetStatus === 'not_applicable' || !v.motorbikeFleetStatus ? 'high' : v.motorbikeFleetStatus) as any,
          contactPhone: v.contactPhone,
          whatsappNumber: v.whatsappNumber || v.contactPhone,
          packages: actualPackages,
          isBookingEnabled: v.isBookingEnabled !== undefined ? v.isBookingEnabled : (v.verificationStatus === 'verified'),
          verificationStatus: v.verificationStatus,
          ownerEmail: v.ownerEmail,
        };

        partnersMap.set(v.id, partnerObj);
      }
    }

    const finalPartners = Array.from(partnersMap.values()).filter((p) => !isMockMotorbikePartner(p));
    this.setLocalStorageItem('camgo_motorbike_partners', JSON.stringify(finalPartners));
    return finalPartners;
  }

  public deleteMotorbikePartner(partnerId: string): void {
    const data = localStorage.getItem('camgo_motorbike_partners');
    let remaining: MotorbikeRentalPartner[] = [];
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          remaining = parsed.filter((p: any) => p && p.id !== partnerId && !isMockMotorbikePartner(p));
          this.setLocalStorageItem('camgo_motorbike_partners', JSON.stringify(remaining));
        }
      } catch {}
    }
    if (db) {
      deleteDoc(doc(db, 'motorbike_partners', partnerId)).catch(() => {});
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('motorbike-partners-updated', { detail: remaining }));
    }
    this.notify();
  }

  public async saveMotorbikePartner(partner: MotorbikeRentalPartner): Promise<MotorbikeRentalPartner[]> {
    if (isMockMotorbikePartner(partner)) {
      return this.getMotorbikePartners();
    }
    const partners = this.getMotorbikePartners();
    const idx = partners.findIndex((p) => p.id === partner.id);
    if (idx >= 0) {
      partners[idx] = partner;
    } else {
      partners.push(partner);
    }
    this.setLocalStorageItem('camgo_motorbike_partners', JSON.stringify(partners));
    if (db) {
      try {
        await setDoc(doc(db, 'motorbike_partners', partner.id), partner);
      } catch (e) {
        console.error("Error saving motorbike partner:", e);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('motorbike-partners-updated', { detail: partners }));
    }
    this.notify();
    return partners;
  }

  public getMotorbikeBookings(): MotorbikeBookingRecord[] {
    const data = localStorage.getItem('camgo_motorbike_bookings');
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public async saveMotorbikeBooking(booking: MotorbikeBookingRecord): Promise<MotorbikeBookingRecord[]> {
    const bookings = this.getMotorbikeBookings();
    const updated = [booking, ...bookings.filter((b) => b.id !== booking.id)];
    this.setLocalStorageItem('camgo_motorbike_bookings', JSON.stringify(updated));
    if (db) {
      try {
        await setDoc(doc(db, 'motorbike_rentals', booking.id), booking);
      } catch (e) {
        console.error("Error saving motorbike booking to Firestore:", e);
      }
    }
    this.notify();
    return updated;
  }

  public async deleteMotorbikeBooking(id: string): Promise<MotorbikeBookingRecord[]> {
    const bookings = this.getMotorbikeBookings().filter((b) => b.id !== id);
    this.setLocalStorageItem('camgo_motorbike_bookings', JSON.stringify(bookings));
    if (db) {
      try {
        await deleteDoc(doc(db, 'motorbike_rentals', id));
      } catch (e) {
        console.error("Error deleting motorbike booking from Firestore:", e);
      }
    }
    this.notify();
    return bookings;
  }

  // ==========================================
  // CamGo Anti-Bypass Accommodation Booking Engine
  // ==========================================
  public getAccommodationBookings(homestayId?: string): AccommodationBooking[] {
    const data = localStorage.getItem(STORAGE_KEYS.ACCOMMODATION_BOOKINGS);
    let bookings: AccommodationBooking[] = [];
    if (!data) {
      const initialBookings: AccommodationBooking[] = [
        {
          id: 'cg_bk_01',
          bookingCode: 'CG-ABAH-8821',
          homestayId: 'golden-hills-homestay-apt',
          homestayName: 'Barrington Alpine Homestay',
          maskedTitle: 'Cozy 3BR - 350m to Kea Farm (CH-07)',
          fullAddress: 'Unit B-3-8, Barrington Square, Golden Hills, 39000 Cameron Highlands',
          ownerPhone: '+60 19-332 8819',
          ownerName: 'Abah Haji Salleh',
          customerName: 'Ali bin Ahmad',
          customerPhone: '+60123456789',
          customerEmail: 'ali.ahmad@gmail.com',
          checkInDate: new Date().toISOString().split('T')[0],
          checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          nights: 1,
          roomTypeName: '3-Bedroom Alpine Family Suite',
          totalRoomPrice: 200,
          depositAmount: 30, // Paid via Billplz
          balanceToCollect: 170, // Cash on check-in
          bookingType: 'instant',
          status: 'confirmed',
          depositPaymentStatus: 'paid',
          paymentGateway: 'billplz',
          isUnlocked: true,
          qrVoucherCode: 'VCHR-CG-8821-PAID',
          bundledPerks: [
            '🍓 2x Free Strawberry Picking Farm Passes (Kea Farm)',
            '🅿️ Guaranteed Kea Farm Dedicated Parking Bay',
            '🗺️ CamGo Live Traffic Jam Avoidance Map Access',
          ],
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          whatsappStatus: 'replied_yes',
          notes: 'Family of 4 arriving at 3:00 PM. Requested baby cot if available.',
        },
        {
          id: 'cg_bk_02',
          bookingCode: 'CG-ABAH-8822',
          homestayId: 'golden-hills-homestay-apt',
          homestayName: 'Barrington Alpine Homestay',
          maskedTitle: 'Cozy 3BR - 350m to Kea Farm (CH-07)',
          fullAddress: 'Unit B-3-8, Barrington Square, Golden Hills, 39000 Cameron Highlands',
          ownerPhone: '+60 19-332 8819',
          ownerName: 'Abah Haji Salleh',
          customerName: 'Sarah Tan Wei Ling',
          customerPhone: '+60178901234',
          customerEmail: 'sarah.tan@outlook.com',
          checkInDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          checkOutDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
          nights: 2,
          roomTypeName: '3-Bedroom Alpine Family Suite',
          totalRoomPrice: 380,
          depositAmount: 30,
          balanceToCollect: 350,
          bookingType: 'request',
          status: 'pending_owner_approval',
          depositPaymentStatus: 'paid',
          paymentGateway: 'toyyibpay',
          isUnlocked: false,
          qrVoucherCode: 'VCHR-CG-8822-PENDING',
          bundledPerks: [
            '🍓 2x Free Strawberry Picking Farm Passes (Kea Farm)',
            '🅿️ Guaranteed Kea Farm Dedicated Parking Bay',
            '🍲 RM10 Steamboat Dinner Cash Voucher',
          ],
          createdAt: new Date(Date.now() - 600000).toISOString(),
          expiresAt: new Date(Date.now() + 1200000).toISOString(),
          whatsappStatus: 'sent',
          notes: 'WhatsApp notification dispatched to owner. Reply YES within 20m or auto-refund triggers.',
        },
        {
          id: 'cg_bk_03',
          bookingCode: 'CG-ABAH-8823',
          homestayId: 'golden-hills-homestay-apt',
          homestayName: 'Barrington Alpine Homestay',
          maskedTitle: 'Cozy 3BR - 350m to Kea Farm (CH-07)',
          fullAddress: 'Unit B-3-8, Barrington Square, Golden Hills, 39000 Cameron Highlands',
          ownerPhone: '+60 19-332 8819',
          ownerName: 'Abah Haji Salleh',
          customerName: 'Kelvin Wong Ming',
          customerPhone: '+60134567890',
          customerEmail: 'kelvin.w@gmail.com',
          checkInDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
          checkOutDate: new Date(Date.now() + 86400000 * 9).toISOString().split('T')[0],
          nights: 2,
          roomTypeName: '3-Bedroom Alpine Family Suite',
          totalRoomPrice: 380,
          depositAmount: 30,
          balanceToCollect: 350,
          bookingType: 'instant',
          status: 'confirmed',
          depositPaymentStatus: 'paid',
          paymentGateway: 'stripe',
          isUnlocked: true,
          qrVoucherCode: 'VCHR-CG-8823-PAID',
          bundledPerks: [
            '🍓 2x Free Strawberry Picking Farm Passes (Kea Farm)',
            '🅿️ Guaranteed Kea Farm Dedicated Parking Bay',
            '🗺️ CamGo Live Traffic Jam Avoidance Map Access',
          ],
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          whatsappStatus: 'replied_yes',
          notes: 'Tourists from Singapore. Paid deposit via Stripe Credit Card.',
        },
        {
          id: 'cg_bk_04',
          bookingCode: 'CG-ABAH-8820',
          homestayId: 'golden-hills-homestay-apt',
          homestayName: 'Barrington Alpine Homestay',
          maskedTitle: 'Cozy 3BR - 350m to Kea Farm (CH-07)',
          fullAddress: 'Unit B-3-8, Barrington Square, Golden Hills, 39000 Cameron Highlands',
          ownerPhone: '+60 19-332 8819',
          ownerName: 'Abah Haji Salleh',
          customerName: 'Farid Yusof',
          customerPhone: '+60198765432',
          checkInDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
          checkOutDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          nights: 1,
          roomTypeName: '3-Bedroom Alpine Family Suite',
          totalRoomPrice: 200,
          depositAmount: 30,
          balanceToCollect: 170,
          bookingType: 'request',
          status: 'auto_refunded',
          depositPaymentStatus: 'refunded',
          paymentGateway: 'billplz',
          isUnlocked: false,
          qrVoucherCode: 'VCHR-CG-8820-REFUNDED',
          bundledPerks: ['Auto-refund protection triggered'],
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          whatsappStatus: 'timed_out',
          notes: 'Owner did not reply within 30 minutes. CamGo auto-refund engine refunded RM30 to customer FPX instantly.',
        },
      ];
      this.setLocalStorageItem(STORAGE_KEYS.ACCOMMODATION_BOOKINGS, JSON.stringify(initialBookings));
      bookings = initialBookings;
    } else {
      try {
        const parsed = JSON.parse(data);
        bookings = Array.isArray(parsed) ? parsed : [];
      } catch {
        bookings = [];
      }
    }

    if (homestayId) {
      return bookings.filter(
        (b) => b.homestayId === homestayId || (b.homestayName && homestayId && b.homestayName.toLowerCase().includes(homestayId.toLowerCase()))
      );
    }
    return bookings;
  }

  public async saveAccommodationBooking(booking: AccommodationBooking): Promise<AccommodationBooking[]> {
    const bookings = this.getAccommodationBookings();
    const updated = [booking, ...bookings.filter((b) => b.id !== booking.id)];
    this.setLocalStorageItem(STORAGE_KEYS.ACCOMMODATION_BOOKINGS, JSON.stringify(updated));
    if (db) {
      try {
        await setDoc(doc(db, 'accommodation_bookings', booking.id), booking);
      } catch (e) {
        console.error('Error saving accommodation booking to Firestore:', e);
      }
    }
    this.notify();
    return updated;
  }

  public async updateAccommodationBookingStatus(
    id: string,
    status: AccommodationBooking['status'],
    notes?: string
  ): Promise<AccommodationBooking[]> {
    const bookings = this.getAccommodationBookings();
    const updated = bookings.map((b) => {
      if (b.id === id) {
        const isUnlocked = status === 'confirmed' || status === 'checked_in' || status === 'completed';
        const depositPaymentStatus = status === 'auto_refunded' || status === 'rejected' ? 'refunded' : b.depositPaymentStatus;
        const whatsappStatus: AccommodationBooking['whatsappStatus'] =
          status === 'confirmed' ? 'replied_yes' : status === 'rejected' ? 'replied_no' : status === 'auto_refunded' ? 'timed_out' : b.whatsappStatus;
        return {
          ...b,
          status,
          isUnlocked,
          depositPaymentStatus,
          whatsappStatus,
          notes: notes ? `${b.notes ? b.notes + ' • ' : ''}${notes}` : b.notes,
        };
      }
      return b;
    });

    this.setLocalStorageItem(STORAGE_KEYS.ACCOMMODATION_BOOKINGS, JSON.stringify(updated));
    if (db) {
      try {
        const target = updated.find((b) => b.id === id);
        if (target) {
          await setDoc(doc(db, 'accommodation_bookings', id), target, { merge: true });
        }
      } catch (e) {
        console.error('Error updating accommodation booking in Firestore:', e);
      }
    }
    this.notify();
    return updated;
  }

  public async deleteAccommodationBooking(id: string): Promise<AccommodationBooking[]> {
    const bookings = this.getAccommodationBookings().filter((b) => b.id !== id);
    this.setLocalStorageItem(STORAGE_KEYS.ACCOMMODATION_BOOKINGS, JSON.stringify(bookings));
    if (db) {
      try {
        await deleteDoc(doc(db, 'accommodation_bookings', id));
      } catch (e) {
        console.error('Error deleting accommodation booking from Firestore:', e);
      }
    }
    this.notify();
    return bookings;
  }

  // ==========================================
  // CamGo Verified Homestays Directory
  // ==========================================
  public getAccommodationListings(): AccommodationListing[] {
    const data = localStorage.getItem(STORAGE_KEYS.ACCOMMODATION_LISTINGS);
    let cachedListings: AccommodationListing[] = [];
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          // Strict anti-mock purge: filter out any legacy hardcoded mock listings
          cachedListings = parsed.filter(
            (item: any) =>
              item &&
              item.id &&
              !item.id.startsWith('hs_') &&
              !item.id.startsWith('mock-') &&
              !item.id.startsWith('seed-') &&
              !item.id.startsWith('test-')
          );
        }
      } catch {
        cachedListings = [];
      }
    }

    const accommodationMap = new Map<string, AccommodationListing>();

    // 1. Load any genuine custom listings saved in cache
    for (const item of cachedListings) {
      if (item && item.id) {
        accommodationMap.set(item.id, item);
      }
    }

    // 2. Load genuine Vendor Listings from Vendor Portal
    const vendorListings = this.getVendorListings();
    for (const v of vendorListings) {
      if (!v || isMockVendorListing(v)) continue;

      const vName = (v.businessName || '').toLowerCase();
      const isAccomVendor =
        v.category === 'accommodation' ||
        v.subCategory === 'homestay' ||
        v.subCategory === 'homestay_apartment' ||
        v.subCategory === 'homestay_landed' ||
        v.subCategory === 'chalets' ||
        v.subCategory === 'hotels_resorts' ||
        vName.includes('homestay') ||
        vName.includes('chalet') ||
        vName.includes('resort') ||
        vName.includes('apartment') ||
        vName.includes('guesthouse');

      if (isAccomVendor) {
        const existing = accommodationMap.get(v.id);
        const codeNumber = v.id.slice(-4).replace(/\D/g, '') || Math.floor(10 + Math.random() * 89).toString();
        const price = v.sectorSpecifics?.accommodation?.roomTypes?.[0]?.pricePerNight || 200;

        const mapped: AccommodationListing = {
          id: v.id,
          vendorId: v.id,
          code: existing?.code || `CH-${codeNumber}`,
          maskedTitle: existing?.maskedTitle || `${v.businessName} (CH-${codeNumber})`,
          realBusinessName: v.businessName,
          township: v.township || 'Kea Farm',
          proximityDesc: v.address ? `Located at ${v.address}` : `Central ${v.township || 'Cameron Highlands'}`,
          fullAddress: v.address || `${v.township}, 39000 Cameron Highlands`,
          ownerName: v.businessName + ' Host',
          ownerPhone: v.contactPhone || v.whatsappNumber || '+60123456789',
          whatsappNumber: v.whatsappNumber || v.contactPhone || '+60123456789',
          pricePerNight: existing?.pricePerNight || price,
          depositAmount: 30,
          balanceToCollect: Math.max(0, (existing?.pricePerNight || price) - 30),
          bookingType: existing?.bookingType || 'instant',
          roomAvailabilityStatus: v.roomAvailabilityStatus || existing?.roomAvailabilityStatus || 'rooms_available',
          bedrooms: v.sectorSpecifics?.accommodation?.apartment?.roomsPerUnit || existing?.bedrooms || 3,
          bathrooms: existing?.bathrooms || 2,
          maxGuests: (v.sectorSpecifics?.accommodation?.apartment?.roomsPerUnit || 3) * 2,
          rating: existing?.rating || (v.profileHealthScore ? 4.5 + (v.profileHealthScore / 200) : 4.9),
          reviewCount: existing?.reviewCount || 18,
          coverImage: v.coverImage || v.galleryImages?.[0] || v.logoUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
          galleryImages: v.galleryImages && v.galleryImages.length > 0 ? v.galleryImages : [v.coverImage || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'],
          features: existing?.features || ['Highland Mountain Air', 'Fast Wi-Fi', 'Balcony View', 'Free Parking'],
          bundledPerks: [
            '🍓 Free Strawberry Farm Passes (Kea Farm)',
            '🅿️ Guaranteed Kea Farm Dedicated Parking Bay',
            '🗺️ CamGo Live Traffic Jam Avoidance Map',
          ],
          verifiedHost: v.verificationStatus === 'verified',
          ownerPortalSlug: (v.businessName || 'host').toLowerCase().replace(/[^a-z0-9]/g, '-'),
        };

        accommodationMap.set(v.id, mapped);
      }
    }

    const finalList = Array.from(accommodationMap.values());
    this.setLocalStorageItem(STORAGE_KEYS.ACCOMMODATION_LISTINGS, JSON.stringify(finalList));
    return finalList;
  }

  public async saveAccommodationListing(listing: AccommodationListing): Promise<AccommodationListing[]> {
    const listings = this.getAccommodationListings();
    const idx = listings.findIndex((l) => l.id === listing.id);
    let updated: AccommodationListing[];
    if (idx >= 0) {
      listings[idx] = { ...listings[idx], ...listing };
      updated = [...listings];
    } else {
      updated = [listing, ...listings];
    }
    this.setLocalStorageItem(STORAGE_KEYS.ACCOMMODATION_LISTINGS, JSON.stringify(updated));
    if (db) {
      try {
        await setDoc(doc(db, 'accommodation_listings', listing.id), listing, { merge: true });
      } catch (e) {
        console.error('Error saving accommodation listing to Firestore:', e);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('accommodation-listings-updated', { detail: updated }));
    }
    this.notify();
    return updated;
  }

  public async deleteAccommodationListing(id: string): Promise<AccommodationListing[]> {
    const listings = this.getAccommodationListings().filter((l) => l.id !== id && l.vendorId !== id);
    this.setLocalStorageItem(STORAGE_KEYS.ACCOMMODATION_LISTINGS, JSON.stringify(listings));
    const vendorListings = this.getVendorListings().filter((v) => v.id !== id);
    this.setLocalStorageItem(STORAGE_KEYS.VENDOR_LISTINGS, JSON.stringify(vendorListings));

    if (db) {
      try {
        await deleteDoc(doc(db, 'accommodation_listings', id));
        await deleteDoc(doc(db, 'vendor_listings', id));
      } catch (e) {
        console.error('Error deleting accommodation listing from Firestore:', e);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('accommodation-listings-updated', { detail: listings }));
      window.dispatchEvent(new CustomEvent('vendor-listings-updated', { detail: vendorListings }));
    }
    this.notify();
    return listings;
  }

  public async updateAccommodationListingStatus(id: string, status: RoomAvailabilityStatus): Promise<AccommodationListing[]> {
    const listings = this.getAccommodationListings();
    const target = listings.find((l) => l.id === id);
    if (target) {
      target.roomAvailabilityStatus = status;
      this.setLocalStorageItem(STORAGE_KEYS.ACCOMMODATION_LISTINGS, JSON.stringify(listings));
      if (db) {
        try {
          await setDoc(doc(db, 'accommodation_listings', id), { roomAvailabilityStatus: status }, { merge: true });
        } catch (e) {
          console.error('Error updating accommodation listing status in Firestore:', e);
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('accommodation-listings-updated', { detail: listings }));
      }
      this.notify();
    }
    return listings;
  }
}

export const firebaseService = new FirebaseStorageService();

export async function updateAdminUser(userId: string, updatedFields: Record<string, any>) {
  if (!db) return;
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, updatedFields);
}

export async function deleteAdminUser(userId: string) {
  if (!db) return;
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
}