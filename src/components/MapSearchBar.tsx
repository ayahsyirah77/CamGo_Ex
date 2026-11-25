import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Search,
  MapPin,
  X,
  Loader2,
  Navigation2,
  AlertCircle,
  Route,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Language, Place } from '../types';

/** Cameron Highlands center coordinates & strict ~25km geofence bias */
export const CAMERON_HIGHLANDS_CENTER = {
  lat: 4.4734,
  lon: 101.3787,
  radiusKm: 25,
  radiusMeters: 25000,
  // Approx +/- 0.226 deg around (4.4734, 101.3787)
  bbox: {
    minLon: 101.1527,
    minLat: 4.2484,
    maxLon: 101.6047,
    maxLat: 4.6984,
  },
} as const;

export interface GeocodingSearchResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  categoryLabel?: string;
  distanceKm: number;
  provider: 'tomtom' | 'photon' | 'nominatim';
}

export interface CorridorNavOption {
  id: string;
  type: 'corridor' | 'checkpoint' | 'origin';
  corridorId: 'simpang-pulai' | 'tapah' | 'sungai-koyan';
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  coords: [number, number];
  zoom: number;
}

interface MapSearchBarProps {
  mapRef: React.RefObject<L.Map | null>;
  language: Language;
  localPlaces?: Place[];
  corridorItems?: CorridorNavOption[];
  tomTomApiKey?: string | null;
  isAiSearching?: boolean;
  onSelectLocalPlace?: (place: Place) => void;
  onSelectCorridor?: (item: CorridorNavOption) => void;
  onAiSearchSubmit?: (query: string) => Promise<boolean>;
  onNavigateGeocodedResult?: (result: GeocodingSearchResult) => void;
  onTemporaryPinChange?: (result: GeocodingSearchResult | null) => void;
  placeholder?: string;
  className?: string;
  anchorToParent?: boolean;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
  mapRef,
  language,
  localPlaces = [],
  corridorItems = [],
  tomTomApiKey = null,
  isAiSearching = false,
  onSelectLocalPlace,
  onSelectCorridor,
  onAiSearchSubmit,
  onNavigateGeocodedResult,
  onTemporaryPinChange,
  placeholder,
  className = '',
  anchorToParent = false,
}) => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoResults, setGeoResults] = useState<GeocodingSearchResult[]>([]);
  const [activeGeoPin, setActiveGeoPin] = useState<GeocodingSearchResult | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const tempMarkerRef = useRef<L.Marker | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearTemporaryMarker = () => {
    if (tempMarkerRef.current) {
      try {
        tempMarkerRef.current.closePopup();
        tempMarkerRef.current.remove();
      } catch {
        // ignore if map already unmounted
      }
      tempMarkerRef.current = null;
    }
    setActiveGeoPin(null);
    onTemporaryPinChange?.(null);
  };

  // Cleanup temporary Leaflet marker, timers, and in-flight requests on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (tempMarkerRef.current) {
        try {
          tempMarkerRef.current.remove();
        } catch {
          // ignore
        }
        tempMarkerRef.current = null;
      }
    };
  }, []);

  // Close dropdown when clicking/tapping outside
  useEffect(() => {
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, []);

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  // Instant local directory & mountain corridor matches
  const matchingLocalPlaces = useMemo(() => {
    if (!normalizedQuery) return [];
    return localPlaces
      .filter((p) => {
        const nameMatch =
          p.name.toLowerCase().includes(normalizedQuery) ||
          (p.nameBm && p.nameBm.toLowerCase().includes(normalizedQuery));
        const townMatch = p.township.toLowerCase().includes(normalizedQuery);
        const subCatMatch = p.subCategory && p.subCategory.toLowerCase().includes(normalizedQuery);
        const catMatch = p.category.toLowerCase().includes(normalizedQuery);
        const tagMatch = p.tags && p.tags.some((t) => t.toLowerCase().includes(normalizedQuery));
        return nameMatch || townMatch || subCatMatch || catMatch || tagMatch;
      })
      .slice(0, 4);
  }, [localPlaces, normalizedQuery]);

  const matchingCorridors = useMemo(() => {
    if (!normalizedQuery) return corridorItems.slice(0, 4);
    return corridorItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.subtitle.toLowerCase().includes(normalizedQuery) ||
          item.badge.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 4);
  }, [corridorItems, normalizedQuery]);

  // Debounced live Geocoding Search (TomTom Search API -> OpenStreetMap Photon -> Nominatim fallback)
  // Strictly bounded & biased to ~25km radius around Cameron Highlands (4.4734, 101.3787)
  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    if (trimmedQuery.length < 2) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setGeoResults([]);
      setGeoError(null);
      setIsLoadingGeo(false);
      return;
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoadingGeo(true);
      setGeoError(null);

      try {
        const { lat: cLat, lon: cLon, radiusKm, radiusMeters, bbox } = CAMERON_HIGHLANDS_CENTER;
        let fetchedResults: GeocodingSearchResult[] = [];
        let lastNetworkError: Error | null = null;

        const effectiveTomTomKey =
          (tomTomApiKey && tomTomApiKey.trim()) ||
          (typeof window !== 'undefined' ? localStorage.getItem('tomtom_api_key')?.trim() : '') ||
          '';

        // 1. Optional TomTom Search API v2 (biased to 25km around Cameron Highlands)
        if (effectiveTomTomKey.length > 10) {
          try {
            const tomtomUrl = `https://api.tomtom.com/search/2/search/${encodeURIComponent(
              trimmedQuery
            )}.json?key=${encodeURIComponent(effectiveTomTomKey)}&lat=${cLat}&lon=${cLon}&radius=${radiusMeters}&countrySet=MY&limit=8&typeahead=true`;
            const res = await fetch(tomtomUrl, { signal: controller.signal });
            if (res.ok) {
              const data = await res.json();
              const list: any[] = Array.isArray(data?.results) ? data.results : [];
              fetchedResults = list
                .map((item, idx): GeocodingSearchResult | null => {
                  const pLat = Number(item?.position?.lat);
                  const pLon = Number(item?.position?.lon);
                  if (isNaN(pLat) || isNaN(pLon)) return null;
                  const dist = haversineDistanceKm(cLat, cLon, pLat, pLon);
                  if (dist > radiusKm) return null;
                  const name =
                    item?.poi?.name ||
                    item?.address?.streetName ||
                    item?.address?.municipalitySubdivision ||
                    item?.address?.freeformAddress ||
                    trimmedQuery;
                  const address =
                    item?.address?.freeformAddress ||
                    [
                      item?.address?.streetName,
                      item?.address?.municipalitySubdivision,
                      item?.address?.municipality,
                      'Cameron Highlands, Pahang',
                    ]
                      .filter(Boolean)
                      .join(', ');
                  return {
                    id: `tomtom-${item.id || idx}-${pLat.toFixed(5)}`,
                    name,
                    address,
                    lat: pLat,
                    lon: pLon,
                    categoryLabel: item?.poi?.categories?.[0] || item?.type || 'POI',
                    distanceKm: dist,
                    provider: 'tomtom',
                  };
                })
                .filter((x): x is GeocodingSearchResult => x !== null);
            }
          } catch (err: any) {
            if (err?.name === 'AbortError') return;
            lastNetworkError = err;
          }
        }

        // 2. OpenStreetMap Photon API (with bbox & center bias)
        if (fetchedResults.length === 0) {
          try {
            const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
              trimmedQuery
            )}&lat=${cLat}&lon=${cLon}&bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}&limit=10`;
            const res = await fetch(photonUrl, { signal: controller.signal });
            if (res.ok) {
              const data = await res.json();
              const features: any[] = Array.isArray(data?.features) ? data.features : [];
              fetchedResults = features
                .map((feat, idx): GeocodingSearchResult | null => {
                  const coords = feat?.geometry?.coordinates;
                  if (!Array.isArray(coords) || coords.length < 2) return null;
                  const pLon = Number(coords[0]);
                  const pLat = Number(coords[1]);
                  if (isNaN(pLat) || isNaN(pLon)) return null;
                  const dist = haversineDistanceKm(cLat, cLon, pLat, pLon);
                  if (dist > radiusKm) return null;

                  const props = feat.properties || {};
                  const name =
                    props.name ||
                    props.street ||
                    props.locality ||
                    props.city ||
                    trimmedQuery;
                  const addressParts = [
                    props.housenumber && props.street
                      ? `${props.housenumber} ${props.street}`
                      : props.street,
                    props.district || props.locality,
                    props.city || props.town || props.county || 'Cameron Highlands',
                    props.state || 'Pahang',
                  ].filter(Boolean);
                  const address =
                    Array.from(new Set(addressParts)).join(', ') || 'Cameron Highlands, Pahang';

                  return {
                    id: `photon-${props.osm_id || idx}-${pLat.toFixed(5)}`,
                    name,
                    address,
                    lat: pLat,
                    lon: pLon,
                    categoryLabel: props.osm_value || props.osm_key || 'Place',
                    distanceKm: dist,
                    provider: 'photon',
                  };
                })
                .filter((x): x is GeocodingSearchResult => x !== null);
            }
          } catch (err: any) {
            if (err?.name === 'AbortError') return;
            lastNetworkError = err;
          }
        }

        // 3. OpenStreetMap Nominatim Fallback (strict bounded viewbox in Malaysia)
        if (fetchedResults.length === 0) {
          try {
            const nomUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
              trimmedQuery
            )}&countrycodes=my&viewbox=${bbox.minLon},${bbox.maxLat},${bbox.maxLon},${bbox.minLat}&bounded=1&addressdetails=1&limit=8`;
            const res = await fetch(nomUrl, {
              signal: controller.signal,
              headers: {
                Accept: 'application/json',
              },
            });
            if (res.ok) {
              const list: any[] = await res.json();
              if (Array.isArray(list)) {
                fetchedResults = list
                  .map((item, idx): GeocodingSearchResult | null => {
                    const pLat = Number(item?.lat);
                    const pLon = Number(item?.lon);
                    if (isNaN(pLat) || isNaN(pLon)) return null;
                    const dist = haversineDistanceKm(cLat, cLon, pLat, pLon);
                    if (dist > radiusKm) return null;
                    const rawName = item?.name || String(item?.display_name || '').split(',')[0] || trimmedQuery;
                    return {
                      id: `nom-${item.place_id || idx}-${pLat.toFixed(5)}`,
                      name: rawName.trim(),
                      address: String(item?.display_name || 'Cameron Highlands, Pahang'),
                      lat: pLat,
                      lon: pLon,
                      categoryLabel: item?.type || item?.category || 'Location',
                      distanceKm: dist,
                      provider: 'nominatim',
                    };
                  })
                  .filter((x): x is GeocodingSearchResult => x !== null);
              }
            }
          } catch (err: any) {
            if (err?.name === 'AbortError') return;
            lastNetworkError = err;
          }
        }

        if (controller.signal.aborted) return;

        // Deduplicate near-identical coordinates & sort closest to Cameron Highlands center
        const deduped: GeocodingSearchResult[] = [];
        fetchedResults
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .forEach((candidate) => {
            const dup = deduped.some(
              (existing) =>
                existing.name.toLowerCase() === candidate.name.toLowerCase() &&
                haversineDistanceKm(existing.lat, existing.lon, candidate.lat, candidate.lon) < 0.08
            );
            if (!dup) deduped.push(candidate);
          });

        setGeoResults(deduped.slice(0, 6));
        if (deduped.length === 0 && lastNetworkError) {
          setGeoError(
            language === 'bm'
              ? 'Carian alamat langsung tidak dapat dihubungi. Menunjukkan direktori tempatan.'
              : 'Live geocoding service unavailable. Showing local highland places.'
          );
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setGeoError(
          language === 'bm'
            ? 'Ralat mencari lokasi Cameron Highlands.'
            : 'Unable to search Cameron Highlands locations right now.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingGeo(false);
        }
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [trimmedQuery, tomTomApiKey, language]);

  // Dynamic Pinning: Remove prior temporary marker, pan/zoom map via setView, drop new marker + popup
  const handleSelectGeoResult = (result: GeocodingSearchResult) => {
    setQuery(result.name);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);

    // Clear previous temporary marker first so map never clutters
    if (tempMarkerRef.current) {
      try {
        tempMarkerRef.current.closePopup();
        tempMarkerRef.current.remove();
      } catch {
        // ignore
      }
      tempMarkerRef.current = null;
    }

    const map = mapRef.current;
    if (map) {
      map.setView([result.lat, result.lon], 16, {
        animate: true,
        duration: 0.85,
      });

      const pinIcon = L.divIcon({
        className: 'camgo-temp-search-marker',
        html: `
          <div style="position: relative; width: 38px; height: 46px; display: flex; flex-direction: column; align-items: center;">
            <div style="position: absolute; top: 2px; width: 34px; height: 34px; border-radius: 9999px; background: rgba(245, 158, 11, 0.35); animation: ping 1.6s infinite;"></div>
            <div style="position: relative; width: 32px; height: 32px; border-radius: 9999px 9999px 9999px 4px; transform: rotate(-45deg); background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); border: 2.5px solid #ffffff; box-shadow: 0 6px 18px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;">
              <div style="width: 10px; height: 10px; border-radius: 9999px; background: #ffffff; transform: rotate(45deg);"></div>
            </div>
          </div>
        `,
        iconSize: [38, 46],
        iconAnchor: [19, 40],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([result.lat, result.lon], {
        icon: pinIcon,
        zIndexOffset: 1050,
      }).addTo(map);

      const safeName = escapeHtml(result.name);
      const safeAddress = escapeHtml(result.address);
      const popupIdClear = `clear-geo-pin-${result.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
      const popupIdNav = `nav-geo-pin-${result.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; width: 240px; max-width: 78vw; color: #f5f5f4; background: #1c1917; border-radius: 14px; padding: 10px; border: 1px solid rgba(245,158,11,0.5);">
          <div style="font-size: 9.5px; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3px;">
            📍 Cameron Highlands Search Pin (${result.distanceKm} km)
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #ffffff; line-height: 1.25; margin-bottom: 4px;">
            ${safeName}
          </div>
          <div style="font-size: 11px; color: #a8a29e; line-height: 1.35; margin-bottom: 8px;">
            ${safeAddress}
          </div>
          <div style="display: flex; gap: 6px;">
            <button id="${popupIdNav}" style="flex: 1; background: #059669; color: #ffffff; border: none; border-radius: 9px; padding: 6px 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
              🧭 ${language === 'bm' ? 'Navigasi' : 'Navigate'}
            </button>
            <button id="${popupIdClear}" style="background: #292524; color: #d6d3d1; border: 1px solid rgba(255,255,255,0.12); border-radius: 9px; padding: 6px 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
              ✕ ${language === 'bm' ? 'Buang' : 'Remove'}
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        maxWidth: 270,
        className: 'highland-leaflet-popup',
      });

      marker.on('popupopen', () => {
        const clearBtn = document.getElementById(popupIdClear);
        if (clearBtn) {
          clearBtn.onclick = (e) => {
            e.stopPropagation();
            clearTemporaryMarker();
          };
        }
        const navBtn = document.getElementById(popupIdNav);
        if (navBtn) {
          navBtn.onclick = (e) => {
            e.stopPropagation();
            marker.closePopup();
            onNavigateGeocodedResult?.(result);
          };
        }
      });

      tempMarkerRef.current = marker;
      marker.openPopup();
    }

    setActiveGeoPin(result);
    onTemporaryPinChange?.(result);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalOptions = matchingLocalPlaces.length + geoResults.length;

    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsDropdownOpen(true);
      if (totalOptions > 0) {
        setHighlightedIndex((prev) => (prev + 1) % totalOptions);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalOptions > 0) {
        setHighlightedIndex((prev) => (prev <= 0 ? totalOptions - 1 : prev - 1));
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        if (highlightedIndex < matchingLocalPlaces.length) {
          const picked = matchingLocalPlaces[highlightedIndex];
          setQuery(language === 'bm' ? picked.nameBm || picked.name : picked.name);
          setIsDropdownOpen(false);
          onSelectLocalPlace?.(picked);
          return;
        }
        const geoIdx = highlightedIndex - matchingLocalPlaces.length;
        if (geoResults[geoIdx]) {
          handleSelectGeoResult(geoResults[geoIdx]);
          return;
        }
      }

      if (trimmedQuery.split(' ').length > 2 && onAiSearchSubmit) {
        const handled = await onAiSearchSubmit(trimmedQuery);
        if (handled) {
          setIsDropdownOpen(false);
          return;
        }
      }

      if (matchingLocalPlaces.length > 0) {
        const picked = matchingLocalPlaces[0];
        setQuery(language === 'bm' ? picked.nameBm || picked.name : picked.name);
        setIsDropdownOpen(false);
        onSelectLocalPlace?.(picked);
      } else if (geoResults.length > 0) {
        handleSelectGeoResult(geoResults[0]);
      } else if (matchingCorridors.length > 0) {
        const corridor = matchingCorridors[0];
        setQuery(corridor.title);
        setIsDropdownOpen(false);
        onSelectCorridor?.(corridor);
      }
    }
  };

  const noResultsFound =
    trimmedQuery.length >= 2 &&
    !isLoadingGeo &&
    matchingLocalPlaces.length === 0 &&
    geoResults.length === 0 &&
    matchingCorridors.length === 0;

  return (
    <div ref={containerRef} className={`${anchorToParent ? '' : 'relative '}flex-1 min-w-0 ${className}`}>
      {/* Search Input Pill */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Search className="w-4 h-4 text-emerald-400 ml-1 sm:ml-2 shrink-0 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsDropdownOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={isAiSearching}
          placeholder={
            isAiSearching
              ? language === 'bm'
                ? 'AI sedang menganalisis...'
                : 'AI analyzing intent...'
              : placeholder ||
                (language === 'bm'
                  ? 'Cari tempat & jalan...'
                  : 'Search places & roads...')
          }
          aria-label="Search Cameron Highlands places and addresses"
          aria-expanded={isDropdownOpen}
          className={`w-full min-w-0 bg-transparent text-xs sm:text-sm text-stone-100 placeholder-stone-400 outline-none px-1 ${
            isAiSearching ? 'animate-pulse' : ''
          }`}
        />

        {(isLoadingGeo || isAiSearching) && (
          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
        )}

        {activeGeoPin && (
          <button
            type="button"
            onClick={clearTemporaryMarker}
            className="px-1.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            title={language === 'bm' ? 'Buang pin carian' : 'Clear search pin'}
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">{language === 'bm' ? 'Buang Pin' : 'Clear Pin'}</span>
          </button>
        )}

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setGeoResults([]);
              setGeoError(null);
              setIsDropdownOpen(false);
            }}
            className="p-1 text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title={language === 'bm' ? 'Kosongkan carian' : 'Clear search'}
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown (Anchored cleanly below search bar, fits mobile widths) */}
      {isDropdownOpen && (
        <div
          className={`pointer-events-auto absolute ${
            anchorToParent ? 'left-0 right-0 top-[calc(100%+8px)]' : '-left-11 -right-11 sm:left-0 sm:right-0 top-[calc(100%+10px)]'
          } z-[75] max-h-72 overflow-y-auto rounded-2xl bg-stone-950/92 backdrop-blur-2xl border border-white/15 shadow-2xl p-2 text-stone-100 space-y-2 [scrollbar-width:thin]`}
        >
          {/* Section 1: Verified Local Highland Places */}
          {matchingLocalPlaces.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider px-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>
                  {language === 'bm'
                    ? `Direktori Tempatan (${matchingLocalPlaces.length})`
                    : `Verified Places (${matchingLocalPlaces.length})`}
                </span>
              </div>
              {matchingLocalPlaces.map((place, idx) => (
                <button
                  key={`local-place-${place.id}`}
                  type="button"
                  onClick={() => {
                    setQuery(language === 'bm' ? place.nameBm || place.name : place.name);
                    setIsDropdownOpen(false);
                    onSelectLocalPlace?.(place);
                  }}
                  className={`w-full p-2 rounded-xl text-left transition-colors cursor-pointer flex items-center justify-between border ${
                    highlightedIndex === idx
                      ? 'bg-emerald-900/70 border-emerald-400/70'
                      : 'bg-stone-900/70 hover:bg-emerald-950/60 border-emerald-500/20'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs text-stone-100 truncate">
                      {language === 'bm' ? place.nameBm || place.name : place.name}
                    </div>
                    <div className="text-[10px] text-stone-400 truncate">
                      {place.township} • {place.subCategory?.replace(/_/g, ' ') || place.category}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    ★ {place.rating}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Section 2: Live Geocoding Results (~25km radius around Cameron Highlands) */}
          {(geoResults.length > 0 || isLoadingGeo) && (
            <div className="space-y-1 pt-1 border-t border-white/10">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                  📍 {language === 'bm' ? 'Carian Peta & Alamat (≤25 km)' : 'Live Map Geocoding (≤25 km)'}
                </span>
                {isLoadingGeo && (
                  <span className="text-[9.5px] font-mono text-stone-400">
                    {language === 'bm' ? 'Mencari...' : 'Searching...'}
                  </span>
                )}
              </div>

              {geoResults.map((res, idx) => {
                const optionIndex = matchingLocalPlaces.length + idx;
                return (
                  <div
                    key={res.id}
                    className={`w-full p-2 rounded-xl transition-colors flex items-center justify-between gap-2 border ${
                      highlightedIndex === optionIndex
                        ? 'bg-amber-950/70 border-amber-400/70'
                        : 'bg-stone-900/70 hover:bg-stone-800 border-white/10'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectGeoResult(res)}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-bold text-xs text-white truncate">{res.name}</span>
                      </div>
                      <div className="text-[10px] text-stone-400 truncate pl-5 mt-0.5">
                        {res.address}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9.5px] font-mono text-amber-300 bg-amber-500/15 border border-amber-400/30 px-1.5 py-0.5 rounded">
                        {res.distanceKm} km
                      </span>
                      {onNavigateGeocodedResult && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectGeoResult(res);
                            onNavigateGeocodedResult(res);
                          }}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                          title={language === 'bm' ? 'Navigasi ke sini' : 'Navigate here'}
                        >
                          <Navigation2 className="w-3 h-3 fill-current" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section 3: Mountain Corridors & Hotspots */}
          {matchingCorridors.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-white/10">
              <div className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider px-1 flex items-center gap-1">
                <Route className="w-3 h-3" />
                <span>{language === 'bm' ? 'Koridor Laluan Tanah Tinggi' : 'Mountain Corridors'}</span>
              </div>
              {matchingCorridors.map((item) => (
                <button
                  key={`corridor-${item.id}`}
                  type="button"
                  onClick={() => {
                    setQuery(item.title);
                    setIsDropdownOpen(false);
                    onSelectCorridor?.(item);
                  }}
                  className="w-full p-2 rounded-xl text-left hover:bg-stone-800 bg-stone-900/40 transition-colors cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-stone-200 truncate">{item.title}</div>
                    <div className="text-[10px] text-stone-400 truncate">{item.subtitle}</div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-stone-900 border border-white/10 shrink-0 ${item.color}`}
                  >
                    {item.badge}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Error or Empty Result Feedback */}
          {geoError && (
            <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-500/30 text-[10.5px] text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{geoError}</span>
            </div>
          )}

          {noResultsFound && (
            <div className="p-3 text-center text-xs text-stone-400 font-mono">
              {language === 'bm'
                ? `Tiada lokasi ditemui dalam radius 25km Cameron Highlands untuk "${trimmedQuery}"`
                : `No locations found within 25km of Cameron Highlands for "${trimmedQuery}"`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
