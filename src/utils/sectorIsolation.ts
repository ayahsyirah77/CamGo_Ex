import {
  VendorListing,
  VendorSectorSpecifics,
  MainCategory,
} from '../types';
import { findBusinessSector } from '../data/businessTaxonomy';

export type CanonicalVendorSectorKey =
  | 'accommodation'
  | 'food_beverage'
  | 'vehicle_rental'
  | 'agritourism'
  | 'surprise_delivery'
  | 'surprise_planner'
  | 'retail_products'
  | 'professional_services'
  | 'tourism_attractions';

/**
 * Strictly determines the vendor's active business sector from taxonomy IDs/categories.
 * Never relies on noisy businessName heuristics when category/subCategory are defined,
 * ensuring strict multi-tenant and cross-sector isolation.
 */
export function resolveVendorSectorKey(
  vendor: Pick<VendorListing, 'category' | 'subCategory'> | null | undefined
): CanonicalVendorSectorKey {
  if (!vendor) return 'professional_services';
  const sub = String(vendor.subCategory || '').toLowerCase();
  const cat = String(vendor.category || '').toLowerCase();

  if (sub === 'services_surprise_delivery') return 'surprise_delivery';
  if (sub === 'services_surprise_planner') return 'surprise_planner';

  if (
    sub === 'agrotourism_farms' ||
    sub === 'tourism_agritourism_farm' ||
    sub === 'agritourism_plantations'
  ) {
    return 'agritourism';
  }

  const taxonomySector = findBusinessSector(sub || cat);

  if (
    cat === 'accommodation' ||
    taxonomySector.id === 'real_estate_accommodation' ||
    sub.startsWith('realestate_') ||
    sub === 'hotels_resorts' ||
    sub === 'hostels_roomstay' ||
    sub === 'guesthouses' ||
    sub === 'chalets' ||
    sub === 'homestay' ||
    sub === 'homestay_apartment' ||
    sub === 'camping_glamping'
  ) {
    return 'accommodation';
  }

  if (
    cat === 'transport' ||
    taxonomySector.id === 'vehicle_equipment_rental' ||
    sub.startsWith('rental_') ||
    sub === 'car_bike_rentals'
  ) {
    return 'vehicle_rental';
  }

  if (cat === 'food' || taxonomySector.id === 'food_beverage' || sub.startsWith('fb_')) {
    return 'food_beverage';
  }

  if (cat === 'shopping' || taxonomySector.id === 'retail_products' || sub.startsWith('retail_')) {
    return 'retail_products';
  }

  if (cat === 'travel_tourism' || taxonomySector.id === 'tourism_leisure_events' || sub.startsWith('tourism_')) {
    return 'tourism_attractions';
  }

  return 'professional_services';
}

export function mapSubCategoryToMainCategory(subCategory: string): MainCategory {
  const sector = findBusinessSector(subCategory);
  if (sector.id === 'food_beverage') return 'food';
  if (sector.id === 'retail_products') return 'shopping';
  if (sector.id === 'real_estate_accommodation') return 'accommodation';
  if (sector.id === 'vehicle_equipment_rental') return 'transport';
  if (sector.id === 'tourism_leisure_events') return 'travel_tourism';
  return 'services_utilities';
}

/**
 * Strips any stale or incompatible cross-sector specifics, status fields, and operational flags
 * so accommodation parameters never leak into rental/F&B/service vendors and vice versa.
 */
export function pruneVendorForSector(vendor: VendorListing): VendorListing {
  const sectorKey = resolveVendorSectorKey(vendor);
  const currentSpecifics: VendorSectorSpecifics = vendor.sectorSpecifics || {};

  const cleanSpecifics: VendorSectorSpecifics = {};
  if (sectorKey === 'accommodation' && currentSpecifics.accommodation) {
    cleanSpecifics.accommodation = currentSpecifics.accommodation;
  } else if (sectorKey === 'food_beverage' && currentSpecifics.foodBeverage) {
    cleanSpecifics.foodBeverage = currentSpecifics.foodBeverage;
  } else if (sectorKey === 'vehicle_rental' && currentSpecifics.vehicleRental) {
    cleanSpecifics.vehicleRental = currentSpecifics.vehicleRental;
  } else if (sectorKey === 'agritourism' && currentSpecifics.agritourismFarm) {
    cleanSpecifics.agritourismFarm = currentSpecifics.agritourismFarm;
  } else if (sectorKey === 'surprise_delivery' && currentSpecifics.surpriseDelivery) {
    cleanSpecifics.surpriseDelivery = currentSpecifics.surpriseDelivery;
  } else if (sectorKey === 'surprise_planner' && currentSpecifics.surprisePlanner) {
    cleanSpecifics.surprisePlanner = currentSpecifics.surprisePlanner;
  } else if (sectorKey === 'retail_products' && currentSpecifics.retailProducts) {
    cleanSpecifics.retailProducts = currentSpecifics.retailProducts;
  } else if (sectorKey === 'professional_services' && currentSpecifics.professionalServices) {
    cleanSpecifics.professionalServices = currentSpecifics.professionalServices;
  }

  const prevFlags = vendor.enabledFlags;
  const cleanFlags = {
    operatingStatus: prevFlags ? !!prevFlags.operatingStatus : true,
    diyHarvestStatus: sectorKey === 'agritourism' ? (prevFlags ? !!prevFlags.diyHarvestStatus : true) : false,
    parkingStatus: prevFlags ? !!prevFlags.parkingStatus : (sectorKey === 'accommodation' || sectorKey === 'food_beverage'),
    roomAvailabilityStatus: sectorKey === 'accommodation' ? (prevFlags ? !!prevFlags.roomAvailabilityStatus : true) : false,
    motorbikeFleetStatus: sectorKey === 'vehicle_rental' ? (prevFlags ? !!prevFlags.motorbikeFleetStatus : true) : false,
    dietaryTagsEnabled: sectorKey === 'food_beverage' ? !!(prevFlags?.dietaryTagsEnabled || vendor.dietaryTagsEnabled) : false,
  };

  return {
    ...vendor,
    sectorSpecifics: cleanSpecifics,
    enabledFlags: cleanFlags,
    roomAvailabilityStatus:
      sectorKey === 'accommodation'
        ? (vendor.roomAvailabilityStatus && vendor.roomAvailabilityStatus !== 'not_applicable'
            ? vendor.roomAvailabilityStatus
            : 'rooms_available')
        : 'not_applicable',
    motorbikeFleetStatus:
      sectorKey === 'vehicle_rental' ? vendor.motorbikeFleetStatus || 'high' : undefined,
    diyHarvestStatus:
      sectorKey === 'agritourism' ? vendor.diyHarvestStatus || 'picking_open' : undefined,
    dietaryTags: sectorKey === 'food_beverage' ? vendor.dietaryTags || [] : [],
    dietaryTagsEnabled: sectorKey === 'food_beverage' ? cleanFlags.dietaryTagsEnabled : false,
  };
}
