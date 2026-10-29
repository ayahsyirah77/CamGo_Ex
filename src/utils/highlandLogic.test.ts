import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseElevationToMeters,
  getElevationTier,
  isCurrentlyOpen,
  calculateTrafficSeverity,
  filterPlacesByQuery,
  calculateDistanceKm,
  calculateTravelTimeMins,
} from './highlandLogic.ts';

test('parseElevationToMeters converts formatted strings to integer', () => {
  assert.equal(parseElevationToMeters('1,560 m'), 1560);
  assert.equal(parseElevationToMeters('2,032m'), 2032);
  assert.equal(parseElevationToMeters('950 m'), 950);
  assert.equal(parseElevationToMeters('invalid'), 0);
});

test('getElevationTier correctly categorizes highland peaks, plateaus, and valleys', () => {
  assert.equal(getElevationTier('2,032 m'), 'Peak');
  assert.equal(getElevationTier('1,560 m'), 'Highland');
  assert.equal(getElevationTier('1,120 m'), 'Valley');
});

test('isCurrentlyOpen checks normal and 24h hours accurately', () => {
  const normalHours = {
    from: '08:30',
    to: '18:00',
    isOpen: true,
    isOpen24Hours: false,
  };

  assert.equal(isCurrentlyOpen(normalHours, '10:00'), true);
  assert.equal(isCurrentlyOpen(normalHours, '07:00'), false);
  assert.equal(isCurrentlyOpen(normalHours, '19:00'), false);

  const closedPlace = { ...normalHours, isOpen: false };
  assert.equal(isCurrentlyOpen(closedPlace, '12:00'), false);

  const twentyFourHours = {
    from: '00:00',
    to: '23:59',
    isOpen: true,
    isOpen24Hours: true,
  };
  assert.equal(isCurrentlyOpen(twentyFourHours, '03:15'), true);
});

test('calculateTrafficSeverity maps delay minutes correctly', () => {
  assert.equal(calculateTrafficSeverity(0), 'smooth');
  assert.equal(calculateTrafficSeverity(5), 'smooth');
  assert.equal(calculateTrafficSeverity(15), 'moderate');
  assert.equal(calculateTrafficSeverity(35), 'heavy');
});

test('filterPlacesByQuery matches name, description, township and tags', () => {
  const samplePlaces = [
    {
      name: 'BOH Sungei Palas Tea Centre',
      description: 'Iconic tea plantation with panoramic deck',
      township: 'Brinchang',
      tags: ['Tea', 'Scenic'],
    },
    {
      name: 'Water Crest Valley Steamboat',
      description: 'Fresh organic charcoal steamboat',
      township: 'Tringkap',
      tags: ['Steamboat', 'Organic'],
    },
  ];

  const searchBoh = filterPlacesByQuery(samplePlaces, 'BOH');
  assert.equal(searchBoh.length, 1);
  assert.equal(searchBoh[0].name, 'BOH Sungei Palas Tea Centre');

  const searchSteamboat = filterPlacesByQuery(samplePlaces, 'Steamboat');
  assert.equal(searchSteamboat.length, 1);
  assert.equal(searchSteamboat[0].name, 'Water Crest Valley Steamboat');

  const searchTown = filterPlacesByQuery(samplePlaces, 'tringkap');
  assert.equal(searchTown.length, 1);

  const searchAll = filterPlacesByQuery(samplePlaces, '');
  assert.equal(searchAll.length, 2);
});

test('calculateDistanceKm computes accurate Haversine distance between coords', () => {
  // Tanah Rata to Brinchang (~3.5 km)
  const tanahRata = { lat: 4.4715, lng: 101.3805 };
  const brinchang = { lat: 4.4905, lng: 101.3892 };
  const dist = calculateDistanceKm(tanahRata, brinchang);
  assert.ok(dist >= 2.0 && dist <= 3.5, `Distance was ${dist}`);

  // Same coord is 0
  assert.equal(calculateDistanceKm(tanahRata, tanahRata), 0);
});

test('calculateTravelTimeMins computes realistic winding mountain drive times', () => {
  assert.equal(calculateTravelTimeMins(0), 0);
  assert.equal(calculateTravelTimeMins(0.05), 0);
  // 3 km on mountain road
  const mins3km = calculateTravelTimeMins(3);
  assert.ok(mins3km >= 8 && mins3km <= 15, `3km drive time was ${mins3km}`);
  // 10 km on mountain road
  const mins10km = calculateTravelTimeMins(10);
  assert.ok(mins10km >= 20 && mins10km <= 30, `10km drive time was ${mins10km}`);
});
