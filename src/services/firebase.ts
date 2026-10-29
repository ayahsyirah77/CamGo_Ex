import { Place, GalleryItem, EventNotification, LoungePost, LoungePostReply, ItineraryPlan, TownshipHubInfo, JobClassified, TrafficAlert, HazardAlert, EmergencyCard, EmergencyDispatchRecord, FarmTicket, VendorListing, VendorVoucher, VendorEventItem, VendorStaffMember, VendorAnalyticsData, MotorbikeRentalPartner, MotorbikeBookingRecord } from '../types';
import {
  INITIAL_PLACES,
  INITIAL_GALLERY,
  INITIAL_EVENTS,
  INITIAL_LOUNGE,
  INITIAL_JOBS,
  INITIAL_TRAFFIC,
  INITIAL_HAZARDS,
} from '../data/initialData';
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
  onAuthStateChanged 
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
  role: 'admin' | 'user';
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

function isMockValue(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  const l = val.toLowerCase().trim();
  return (
    l.includes('hazry') ||
    l.includes('osman') ||
    l.includes('aisyah') ||
    l.includes('farhan') ||
    l.includes('4829102') ||
    l.includes('3498811') ||
    l.includes('1988-06-15') ||
    l.includes('penicillin') ||
    l.includes('salbutamol') ||
    l.includes('asthma') ||
    l.includes('shellfish')
  );
}

export function sanitizeEmergencyCard(raw?: Partial<EmergencyCard> | null): EmergencyCard {
  if (!raw) {
    return { ...DEFAULT_EMERGENCY_CARD };
  }

  const primary = (raw.primaryContact || {}) as any;
  const secondary = (raw.secondaryContact || {}) as any;

  return {
    fullLegalName: isMockValue(raw.fullLegalName) ? '' : (raw.fullLegalName || ''),
    preferredName: isMockValue(raw.preferredName) ? '' : (raw.preferredName || ''),
    dateOfBirth: isMockValue(raw.dateOfBirth) ? '' : (raw.dateOfBirth || ''),
    bloodType: (raw.bloodType === 'O+' && (isMockValue(raw.fullLegalName) || !raw.fullLegalName)) ? 'Unknown' : (raw.bloodType || 'Unknown'),
    severeAllergies: isMockValue(raw.severeAllergies) ? '' : (raw.severeAllergies || ''),
    chronicConditions: isMockValue(raw.chronicConditions) ? '' : (raw.chronicConditions || ''),
    currentMedications: isMockValue(raw.currentMedications) ? '' : (raw.currentMedications || ''),
    primaryContact: {
      label: 'ICE 1',
      name: isMockValue(primary.name) ? '' : (primary.name || ''),
      relationship: isMockValue(primary.relationship) ? '' : (primary.relationship || ''),
      phone: isMockValue(primary.phone) ? '' : (primary.phone || ''),
    },
    secondaryContact: {
      label: 'ICE 2',
      name: isMockValue(secondary.name) ? '' : (secondary.name || ''),
      relationship: isMockValue(secondary.relationship) ? '' : (secondary.relationship || ''),
      phone: isMockValue(secondary.phone) ? '' : (secondary.phone || ''),
    },
    designatedSosNumber: isMockValue(raw.designatedSosNumber) ? '' : (raw.designatedSosNumber || ''),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

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
        console.log('[Debug] Places listener fired, docs:', snap.size);
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

      // 7. Real-time GSAP Card Images Listener
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
      }, (err) => console.warn('Realtime GSAP images listener warning:', err));

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
        const cloudListings = snap.docs.map((d) => d.data() as VendorListing);
        this.setLocalStorageItem(STORAGE_KEYS.VENDOR_LISTINGS, JSON.stringify(cloudListings));
        this.notify();
      });
      onSnapshot(collection(db, 'vendor_listings'), (snap) => {
        console.log('[Debug] Vendor listings listener fired, docs:', snap.size);
        const cloudListings = snap.docs.map((d) => d.data() as VendorListing);
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
        const cloudPartners = snap.docs.map((d) => d.data() as MotorbikeRentalPartner);
        this.setLocalStorageItem('camgo_motorbike_partners', JSON.stringify(cloudPartners));
        this.notify();
      }, (err) => console.warn('Realtime motorbike partners listener warning:', err));

      // 11. Real-time Motorbike Bookings Listener
      onSnapshot(collection(db, 'motorbike_rentals'), (snap) => {
        const cloudBookings = snap.docs.map((d) => d.data() as MotorbikeBookingRecord);
        this.setLocalStorageItem('camgo_motorbike_bookings', JSON.stringify(cloudBookings));
        this.notify();
      }, (err) => console.warn('Realtime motorbike bookings listener warning:', err));

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
      onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          const isAdmin = fbUser.email?.toLowerCase().includes('admin') || fbUser.email === 'admin@camgo.my' || fbUser.email === 'ayahsyirah77@gmail.com';
          const profile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || 'user@camgo.my',
            displayName: fbUser.displayName || 'Highland Explorer',
            photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${fbUser.uid}`,
            role: isAdmin ? 'admin' : 'user',
            bookmarks: this.currentUser?.bookmarks || [],
            createdAt: new Date().toISOString(),
          };
          this.currentUser = profile;
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
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
        const isAdminUser = asAdmin || targetEmail === 'ayahsyirah77@gmail.com' || targetEmail.includes('admin') || targetEmail === 'admin@camgo.my';

        const profile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || (asAdmin ? 'ayahsyirah77@gmail.com' : 'traveler@gmail.com'),
          displayName: fbUser.displayName || (isAdminUser ? 'Ayah Syirah (Admin)' : 'Highland Explorer'),
          fullName: fbUser.displayName || (isAdminUser ? 'Ayah Syirah (Admin)' : 'Highland Explorer'),
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
      displayName: 'Ayah Syirah (Master Admin)',
      fullName: 'Ayah Syirah (Master Admin)',
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
    const isAdmin = cleanEmail.includes('admin') || cleanEmail === 'ayahsyirah77@gmail.com';
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
    if (!this.currentUser) return null;
    this.currentUser = {
      ...this.currentUser,
      ...updates,
    };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
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
    console.log('[Debug] getPlaces this.places length:', this.places.length);
    let places: Place[] = this.places.length > 0 ? this.places : INITIAL_PLACES;

    if (this.places.length === 0 && typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.PLACES);
      console.log('[Debug] getPlaces localStorage saved:', !!saved);
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
    console.log('[Debug] getPlaces final count:', places.length);


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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    return INITIAL_LOUNGE;
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
    if (!db) return;
    try {
      const initialPosts: (LoungePost & { createdAt: number })[] = [
        {
          id: 'post-live-seed-1',
          authorName: 'Cikgu Razak (Local Guide)',
          authorRole: 'Guide',
          authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
          content: 'Salam semua pengunjung! Laluan Tapah - Ringlet pagi ini lancar dan berkabus nyaman. Pandu berhemah di selekoh Lata Iskandar. Sesiapa nak info terkini keadaan jalan boleh tanya di sini!',
          timestamp: '2 hours ago',
          tag: 'Traffic',
          upvotes: 18,
          repliesCount: 1,
          createdAt: Date.now() - 7200000,
          replies: [
            {
              id: 'rep-live-seed-1',
              authorName: 'Sarah Wong',
              authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
              content: 'Terima kasih info Cikgu! Simpang Pulai pun lancar, cuaca nyaman.',
              timestamp: '1 hour ago',
            },
          ],
        },
        {
          id: 'post-live-seed-2',
          authorName: 'Chloe Liew',
          authorRole: 'Visitor',
          authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
          content: 'Suhu sejuk 16°C petang ni! Kalau craving steamboat sup herba atau tom yam panas di Brinchang, boleh layari pautan lokasi: https://maps.google.com/?q=Cameron+Highlands+Steamboat',
          timestamp: '3 hours ago',
          tag: 'Food',
          upvotes: 12,
          repliesCount: 0,
          createdAt: Date.now() - 10800000,
          replies: [],
        },
        {
          id: 'post-live-seed-3',
          authorName: 'Aiman Farhan',
          authorRole: 'Visitor',
          authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
          content: 'Peringatan mesra untuk yang nak naik Mossy Forest: jangan lupa booking slot permit awal di portal Jabatan Perhutanan Pahang! Pakai kasut getah bertapak grip sebab laluan basah.',
          timestamp: '5 hours ago',
          tag: 'Tips',
          upvotes: 25,
          repliesCount: 0,
          createdAt: Date.now() - 18000000,
          replies: [],
        },
      ];

      for (const p of initialPosts) {
        await setDoc(doc(db, 'lounge', p.id), p);
      }
    } catch (e) {
      console.warn("Could not seed initial lounge posts to Firestore:", e);
    }
  }

  private initLoungeRealtimeListener() {
    if (!db) return;
    try {
      const loungeCol = collection(db, 'lounge');
      onSnapshot(
        loungeCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const cloudPosts: LoungePost[] = snapshot.docs.map((docSnap) => {
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
            // Seed Firestore with realistic starters
            this.seedInitialLoungePosts();
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
    return updated;
  }

  public deleteJob(id: string): JobClassified[] {
    const jobs = this.getJobs().filter((j) => j.id !== id);
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
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
    const images = this.getGsapCardImages();
    images[cardId] = imageUrl;
    localStorage.setItem('camgo_gsap_card_images', JSON.stringify(images));
    if (db) {
      try {
        await setDoc(doc(db, 'gsap_card_images', cardId), {
          id: cardId,
          imageUrl,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('[FirebaseService] Successfully saved GSAP card image to Firestore collection:', cardId);
      } catch (err) {
        console.error("Could not sync GSAP images to Firestore:", err);
        throw err;
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
    const updatedCard: EmergencyCard = {
      ...card,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.EMERGENCY_CARD, JSON.stringify(updatedCard));

    if (this.currentUser) {
      this.currentUser = {
        ...this.currentUser,
        emergencyCard: updatedCard,
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.currentUser));
    }

    if (db && this.currentUser) {
      try {
        await Promise.race([
          setDoc(doc(db, 'emergency_cards', this.currentUser.uid), updatedCard, { merge: true }),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch (err) {
        console.warn('Could not sync emergency card to Firestore (using local cache):', err);
      }
    }

    this.notify();
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
    if (!data) {
      this.setLocalStorageItem(STORAGE_KEYS.VENDOR_LISTINGS, JSON.stringify([]));
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Filter out residual mock vendors if any exist in cache
        const mockIds = ['big-red-strawberry-farm', 'boh-sungei-palas', 'flora-park-kea-farm', 'highland-steamboat-tanahrata', 'cameron-lavender-tringkap'];
        const cleaned = parsed.filter((v: any) => !mockIds.includes(v.id));
        if (cleaned.length !== parsed.length) {
          this.setLocalStorageItem(STORAGE_KEYS.VENDOR_LISTINGS, JSON.stringify(cleaned));
        }
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  }

  public getVendorListingById(id: string): VendorListing | undefined {
    return this.getVendorListings().find((v) => v.id === id);
  }

  public async saveVendorListing(listing: VendorListing): Promise<VendorListing[]> {
    const listings = this.getVendorListings();
    const index = listings.findIndex((l) => l.id === listing.id);
    if (index >= 0) {
      listings[index] = listing;
    } else {
      listings.push(listing);
    }
    this.setLocalStorageItem(STORAGE_KEYS.VENDOR_LISTINGS, JSON.stringify(listings));

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
        console.log('[Debug] Attempting to save to Firestore:', listing.businessName, listing.id);
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
      window.dispatchEvent(new CustomEvent('vendor-listings-updated', { detail: listings }));
      window.dispatchEvent(new CustomEvent('places-updated', { detail: updatedPlaces }));
    }

    this.notify();
    return listings;
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
    if (!storage) throw new Error("Storage not initialized");
    const storageRef = ref(storage, `${folder}/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
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
    if (!data) {
      this.setLocalStorageItem('camgo_motorbike_partners', JSON.stringify(INITIAL_MOTORBIKE_PARTNERS));
      return INITIAL_MOTORBIKE_PARTNERS;
    }
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MOTORBIKE_PARTNERS;
    } catch {
      return INITIAL_MOTORBIKE_PARTNERS;
    }
  }

  public async saveMotorbikePartner(partner: MotorbikeRentalPartner): Promise<MotorbikeRentalPartner[]> {
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