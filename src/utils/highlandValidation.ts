/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  matchedTown?: string;
  postcode?: string;
}

// Cameron Highlands official postcodes and settlements mapping
export const CAMERON_HIGHLANDS_POSTCODES: Record<string, { town: string; areas: string[] }> = {
  '39000': { town: 'Tanah Rata', areas: ['Tanah Rata', 'Ringlet Road', 'Parit Fall', 'Highland Center'] },
  '39100': { town: 'Brinchang', areas: ['Brinchang', 'Kea Farm', 'Golden Hills', 'Cactus Valley', 'Sam Poh'] },
  '39200': { town: 'Ringlet / Bertam Valley', areas: ['Ringlet', 'Bertam Valley', 'Habu', 'Sultan Abu Bakar Dam'] },
  '39010': { town: 'Kampung Raja / Blue Valley', areas: ['Kampung Raja', 'Blue Valley', 'Tringkap', 'Kuala Terla', 'Lojing Gateway'] },
};

/**
 * Validates that the postal code entered falls within Cameron Highlands local administrative boundaries.
 */
export function validatePostcodeBoundary(postcodeStr: string): ValidationResult {
  const cleanPostcode = postcodeStr.trim().replace(/\D/g, '');
  if (!cleanPostcode || cleanPostcode.length !== 5) {
    return {
      isValid: false,
      error: 'Invalid postal code format. Cameron Highlands postcodes must be 5 digits (e.g. 39000, 39100, 39200, 39010).',
    };
  }

  const match = CAMERON_HIGHLANDS_POSTCODES[cleanPostcode];
  if (!match) {
    return {
      isValid: false,
      error: `Postcode "${cleanPostcode}" is outside Cameron Highlands boundaries (Valid local postcodes: 39000, 39100, 39200, 39010).`,
    };
  }

  return {
    isValid: true,
    matchedTown: match.town,
    postcode: cleanPostcode,
  };
}

/**
 * Validates the address string against gazetted Cameron Highlands settlements and checks address precision/keywords.
 */
export function validateGazettedAddress(addressStr: string): ValidationResult {
  const cleanAddr = addressStr.trim().toLowerCase();
  if (!cleanAddr || cleanAddr.length < 8) {
    return {
      isValid: false,
      error: 'Please enter a complete street address with residential or business details.',
    };
  }

  const recognizedSettlements = [
    'tanah rata',
    'brinchang',
    'kea farm',
    'ringlet',
    'kampung raja',
    'tringkap',
    'kuala terla',
    'bertam valley',
    'blue valley',
    'golden hills',
    'habu',
    'pos selim',
    'cameron highlands',
  ];

  const hasRecognizedSettlement = recognizedSettlements.some((settlement) =>
    cleanAddr.includes(settlement)
  );

  if (!hasRecognizedSettlement) {
    return {
      isValid: false,
      error: 'Address does not match a recognized Cameron Highlands gazetted township (e.g. Tanah Rata, Brinchang, Kea Farm, Ringlet, Kampung Raja).',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validates geolocation proximity to Cameron Highlands region (approx. bounding box: Lat 4.35 to 4.65, Lng 101.30 to 101.50)
 */
export function validateGeoProximity(lat: number, lng: number): boolean {
  const minLat = 4.35;
  const maxLat = 4.65;
  const minLng = 101.30;
  const maxLng = 101.50;

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}
