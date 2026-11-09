/**
 * Place Firestore Service
 * Handles data validation, normalization, and persistence of Cameron Highlands
 * place and directory records into Firebase Firestore using Modular SDK v9+.
 */

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  DocumentReference,
  FieldValue,
} from 'firebase/firestore';
import { app, db } from '../lib/firebase';
import {
  MainCategory,
  SubCategory,
  Township,
  Coordinates,
  OperatingHours,
  Place,
} from '../types';

/**
 * Interface matching the place form state structure gathered from Admin forms
 */
export interface PlaceFormData {
  id?: string;
  name: string; // English / Primary official title
  nameBm?: string; // Malay name
  township: Township | string; // Township (e.g. Tanah Rata, Brinchang, Kea Farm)
  description: string; // Detailed English description
  descriptionBm?: string; // Detailed Malay description
  category: MainCategory | string; // Main category
  subCategory?: SubCategory | string; // Sub-category
  location?: string; // Street address in Cameron Highlands
  contact?: string; // Phone / WhatsApp contact number
  coordinates: {
    lat: number | string;
    lng: number | string;
  };
  operatingHours?:
    | {
        from?: string;
        to?: string;
        isOpen?: boolean;
        isOpen24Hours?: boolean;
        weeklySchedule?: any[];
      }
    | string;
  elevation?: string; // e.g. "1,540 m"
  priceRange?: string; // e.g. "Free", "RM10 - RM25", "RM$"
  tags?: string[] | string; // Highlights or tags
  imageUrl?: string; // Featured image URL
  rating?: number;
  reviewsCount?: number;
  totalBays?: number | string;
  availableBays?: number | string;
  realTimeStatus?: string;
  parkingStatus?: string;
  diyHarvestStatus?: string;
  roomAvailabilityStatus?: string;
  whatsappNumber?: string;
  wazeUrl?: string;
  includeInPlanner?: boolean;
  [key: string]: any;
}

/**
 * Result of place validation
 */
export interface PlaceValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates place data before writing to Firestore
 */
export function validatePlaceData(data: PlaceFormData): PlaceValidationResult {
  const errors: string[] = [];

  // 1. Validate English / Primary Name
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Place name (English) is required.');
  }

  // 2. Validate Township
  if (!data.township || typeof data.township !== 'string' || !data.township.trim()) {
    errors.push('Township is required (e.g., Tanah Rata, Brinchang, Kea Farm).');
  }

  // 3. Validate Coordinates
  if (!data.coordinates) {
    errors.push('Coordinates object is required with valid lat and lng.');
  } else {
    const lat = typeof data.coordinates.lat === 'string'
      ? parseFloat(data.coordinates.lat.replace(',', '.').trim())
      : Number(data.coordinates.lat);
    const lng = typeof data.coordinates.lng === 'string'
      ? parseFloat(data.coordinates.lng.replace(',', '.').trim())
      : Number(data.coordinates.lng);

    if (isNaN(lat) || !isFinite(lat)) {
      errors.push('Latitude must be a valid numeric coordinate.');
    } else if (lat < -90 || lat > 90) {
      errors.push('Latitude must be between -90 and 90 degrees.');
    }

    if (isNaN(lng) || !isFinite(lng)) {
      errors.push('Longitude must be a valid numeric coordinate.');
    } else if (lng < -180 || lng > 180) {
      errors.push('Longitude must be between -180 and 180 degrees.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Cleans and sanitizes the place document, converting raw form inputs
 * into properly typed Firestore values and removing undefined fields.
 */
function sanitizePlaceDocument(data: PlaceFormData): Record<string, any> {
  const rawLat = typeof data.coordinates?.lat === 'string'
    ? parseFloat(data.coordinates.lat.replace(',', '.').trim())
    : Number(data.coordinates?.lat ?? 4.47);
  const rawLng = typeof data.coordinates?.lng === 'string'
    ? parseFloat(data.coordinates.lng.replace(',', '.').trim())
    : Number(data.coordinates?.lng ?? 101.38);

  const cleanLat = !isNaN(rawLat) ? Number(rawLat.toFixed(6)) : 4.470000;
  const cleanLng = !isNaN(rawLng) ? Number(rawLng.toFixed(6)) : 101.380000;

  // Normalize tags
  let cleanTags: string[] = [];
  if (Array.isArray(data.tags)) {
    cleanTags = data.tags.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof data.tags === 'string' && data.tags.trim()) {
    cleanTags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
  }

  // Normalize operating hours
  let cleanOperatingHours: OperatingHours;
  if (data.operatingHours && typeof data.operatingHours === 'object') {
    cleanOperatingHours = {
      from: data.operatingHours.from || '09:00',
      to: data.operatingHours.to || '18:00',
      isOpen: data.operatingHours.isOpen !== false,
      isOpen24Hours: Boolean(data.operatingHours.isOpen24Hours),
      weeklySchedule: data.operatingHours.weeklySchedule || [],
    };
  } else {
    cleanOperatingHours = {
      from: '08:30',
      to: '18:00',
      isOpen: true,
      isOpen24Hours: false,
    };
  }

  const rawDoc: Record<string, any> = {
    name: data.name.trim(),
    nameBm: (data.nameBm || data.name).trim(),
    township: data.township.trim() as Township,
    category: (data.category || 'travel_tourism') as MainCategory,
    subCategory: (data.subCategory || 'attractions_sightseeing') as SubCategory,
    description: (data.description || '').trim(),
    descriptionBm: (data.descriptionBm || data.description || '').trim(),
    location: (data.location || `${data.township}, Cameron Highlands, Pahang`).trim(),
    contact: (data.contact || '').trim(),
    coordinates: {
      lat: cleanLat,
      lng: cleanLng,
    },
    operatingHours: cleanOperatingHours,
    elevation: data.elevation || '1,540 m',
    rating: typeof data.rating === 'number' ? data.rating : 4.8,
    reviewsCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : 1,
    priceRange: data.priceRange || 'Free',
    tags: cleanTags,
    imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80',
    includeInPlanner: Boolean(data.includeInPlanner ?? true),
  };

  // Optional numbers
  if (data.totalBays !== undefined && data.totalBays !== '') {
    const bays = Number(data.totalBays);
    if (!isNaN(bays)) rawDoc.totalBays = bays;
  }
  if (data.availableBays !== undefined && data.availableBays !== '') {
    const freeBays = Number(data.availableBays);
    if (!isNaN(freeBays)) rawDoc.availableBays = freeBays;
  }

  // Optional vendor flags
  if (data.realTimeStatus) rawDoc.realTimeStatus = data.realTimeStatus;
  if (data.parkingStatus) rawDoc.parkingStatus = data.parkingStatus;
  if (data.diyHarvestStatus && data.diyHarvestStatus !== 'none') rawDoc.diyHarvestStatus = data.diyHarvestStatus;
  if (data.roomAvailabilityStatus && data.roomAvailabilityStatus !== 'none') rawDoc.roomAvailabilityStatus = data.roomAvailabilityStatus;
  if (data.whatsappNumber) rawDoc.whatsappNumber = data.whatsappNumber;
  if (data.wazeUrl) rawDoc.wazeUrl = data.wazeUrl;

  // Filter out any undefined or NaN properties so Firestore never rejects
  return Object.fromEntries(
    Object.entries(rawDoc).filter(([_, value]) => value !== undefined && value !== null)
  );
}

/**
 * Saves a place record to the Firestore "places" collection using the Firebase Modular SDK v9+.
 * Attaches a server timestamp (createdAt) to the document.
 * 
 * @param placeData Form data containing place attributes
 * @returns Generated Firestore document ID on success, or null on validation/write failure.
 */
export async function savePlaceToFirestore(placeData: PlaceFormData): Promise<string | null> {
  try {
    console.log('[placeFirestoreService] Initiating savePlaceToFirestore with payload:', {
      name: placeData?.name,
      township: placeData?.township,
      category: placeData?.category,
    });

    // 1. Validate required fields
    const validation = validatePlaceData(placeData);
    if (!validation.isValid) {
      console.error('[placeFirestoreService] Validation failed for place data:', validation.errors);
      return null;
    }

    // 2. Prepare clean sanitized document
    const sanitizedRecord = sanitizePlaceDocument(placeData);

    // 3. Resolve Firestore instance (from shared db or getFirestore)
    const firestoreDb = db || getFirestore(app);
    const placesColRef = collection(firestoreDb, 'places');

    // 4. Attach serverTimestamp for audit and sorting
    const documentPayload = {
      ...sanitizedRecord,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // 5. If placeData contains an existing ID, update or set using docRef; otherwise addDoc
    if (placeData.id && typeof placeData.id === 'string' && placeData.id.trim()) {
      const targetDocId = placeData.id.trim();
      const placeDocRef = doc(firestoreDb, 'places', targetDocId);
      await setDoc(placeDocRef, { ...documentPayload, id: targetDocId }, { merge: true });

      console.log(`[placeFirestoreService] Successfully updated existing place "${sanitizedRecord.name}" with ID: ${targetDocId}`);
      return targetDocId;
    }

    // Create new document in `places` collection
    const newDocRef: DocumentReference = await addDoc(placesColRef, documentPayload);

    // Update document with its own generated ID for consistency
    await updateDoc(newDocRef, { id: newDocRef.id });

    console.log(
      `[placeFirestoreService] Successfully created new place "${sanitizedRecord.name}" in collection "places" with generated ID: ${newDocRef.id}`
    );

    return newDocRef.id;
  } catch (error: any) {
    console.error('[placeFirestoreService] Critical error writing place document to Firestore:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      payload: placeData,
    });
    return null;
  }
}

/**
 * Retrieves a single place document by ID from Firestore
 */
export async function getPlaceFromFirestore(placeId: string): Promise<Place | null> {
  if (!placeId) return null;
  try {
    const firestoreDb = db || getFirestore(app);
    const placeDocRef = doc(firestoreDb, 'places', placeId);
    const snap = await getDoc(placeDocRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Place;
    }
    return null;
  } catch (error) {
    console.error(`[placeFirestoreService] Error fetching place ${placeId} from Firestore:`, error);
    return null;
  }
}

/**
 * Updates an existing place document in Firestore
 */
export async function updatePlaceInFirestore(
  placeId: string,
  partialData: Partial<PlaceFormData>
): Promise<boolean> {
  if (!placeId) return false;
  try {
    const firestoreDb = db || getFirestore(app);
    const placeDocRef = doc(firestoreDb, 'places', placeId);

    const updatePayload: Record<string, any> = {
      ...partialData,
      updatedAt: serverTimestamp(),
    };

    // Strip undefined
    const cleanPayload = Object.fromEntries(
      Object.entries(updatePayload).filter(([_, v]) => v !== undefined)
    );

    await updateDoc(placeDocRef, cleanPayload);
    console.log(`[placeFirestoreService] Successfully updated place ${placeId}`);
    return true;
  } catch (error) {
    console.error(`[placeFirestoreService] Failed to update place ${placeId}:`, error);
    return false;
  }
}
