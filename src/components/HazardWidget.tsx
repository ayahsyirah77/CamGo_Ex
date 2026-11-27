import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { HazardAlert, Language, CamgoHazard } from '../types';
import { getTranslation } from '../services/i18n';
import { hazardFeedService, OFFICIAL_AGENCIES } from '../services/hazardFeedService';
import { camgoHazardsService } from '../services/camgoHazardsService';
import { fetchLiveWebHazards } from '../services/webHazardFetcher';
import { audioService } from '../services/audioService';
import {
  AlertTriangle,
  ShieldAlert,
  CloudFog,
  Hammer,
  PhoneCall,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Building2,
  Car,
  Compass,
  Clock,
  Radio,
  FileCheck2,
  ShieldCheck,
  Globe,
  Loader2,
  MapPin,
  LocateFixed,
  Volume2,
  X,
} from 'lucide-react';

interface HazardWidgetProps {
  hazards: HazardAlert[];
  language: Language;
}

const HAZARD_PROXIMITY_RADIUS_METERS = 1000;

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function formatDistanceLabel(meters: number, isBm: boolean): string {
  if (meters < 1000) {
    return isBm ? `${meters}m dari anda` : `${meters}m away`;
  }
  const km = (meters / 1000).toFixed(1);
  return isBm ? `${km} KM dari anda` : `${km} km away`;
}

export const HazardWidget: React.FC<HazardWidgetProps> = ({ hazards, language }) => {
  const [filterAgency, setFilterAgency] = useState<'ALL' | 'WEB' | 'PDRM' | 'JKR' | 'MDCH' | 'CRITICAL'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingWeb, setIsRefreshingWeb] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [liveCamgoHazards, setLiveCamgoHazards] = useState<CamgoHazard[]>(() =>
    camgoHazardsService.getCachedActiveHazards()
  );

  // 1km Proximity Alert System States
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'active' | 'denied' | 'unavailable'>('locating');
  const [dismissedProximityIds, setDismissedProximityIds] = useState<Set<string>>(() => new Set());
  const alertedHazardIdsRef = useRef<Set<string>>(new Set());

  const isBm = language === 'bm';

  const requestProximityGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('active');
      },
      (err) => {
        setGpsStatus(err?.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );
  }, []);

  // Live continuous geolocation watch for 1km hazard proximity alerting
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }
    requestProximityGps();
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('active');
      },
      (err) => {
        if (err?.code === 1) {
          setGpsStatus('denied');
        }
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [requestProximityGps]);

  // Fetch live PDRM Cameron Highlands + JKR + MDCH notices and subscribe to camgo_hazards
  useEffect(() => {
    let active = true;
    hazardFeedService.fetchLiveFeed(false).catch(() => {
      if (active) {
        // Fallback already handled inside service
      }
    });

    const unsubCamgo = camgoHazardsService.subscribeActiveHazards((list) => {
      if (active && Array.isArray(list)) {
        setLiveCamgoHazards(list);
      }
    });

    return () => {
      active = false;
      unsubCamgo();
    };
  }, []);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    setSyncFeedback(
      isBm
        ? 'Menghubungi PDRM Cameron Highlands, JKR eBencana & MDCH...'
        : 'Fetching live notices from PDRM Cameron Highlands, JKR eBencana & MDCH...'
    );
    try {
      const res = await hazardFeedService.syncFeeds();
      if (res.success) {
        setSyncFeedback(
          isBm
            ? `Berjaya diselaraskan: ${res.alerts.length} notis & amaran terkini dari PDRM, JKR & MDCH`
            : `Synced successfully: ${res.alerts.length} live notices & alerts from PDRM, JKR & MDCH`
        );
      } else {
        setSyncFeedback(isBm ? 'Kemas kini selesai dari pangkalan data.' : 'Updated from official cache.');
      }
    } catch {
      setSyncFeedback(isBm ? 'Gagal menghubungi suapan, menggunakan data terkini.' : 'Using cached verified bulletins.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  const handleRefreshWebAlerts = async () => {
    setIsRefreshingWeb(true);
    setSyncFeedback(
      isBm
        ? 'Mencari amaran laluan JKR & berita Malaysia (72 jam) sepanjang FT185, FT59 & FT102...'
        : 'Searching live JKR & Malaysian news (last 72h) across FT185, FT59 & FT102...'
    );
    try {
      const res = await fetchLiveWebHazards({ force: true });
      const viaLabel =
        res.sourceUsed === 'google_news_rss_fallback'
          ? isBm
            ? 'Google News MY RSS'
            : 'Google News MY RSS fallback'
          : res.sourceUsed === 'firestore_cache' || res.sourceUsed === 'cooldown_cache'
          ? isBm
            ? 'Cache Firestore'
            : 'Firestore Cache'
          : 'Gemini Search Grounding';
      setSyncFeedback(
        isBm
          ? `Disegerakkan (${viaLabel}): ${res.syncedCount} amaran web langsung ke camgo_hazards & Peta.`
          : `Synced ${res.syncedCount} live web hazard alert${res.syncedCount === 1 ? '' : 's'} via ${viaLabel}.`
      );
    } catch (err: any) {
      setSyncFeedback(
        err?.message ||
          (isBm ? 'Gagal memuat turun amaran web langsung.' : 'Unable to refresh web hazard alerts.')
      );
    } finally {
      setIsRefreshingWeb(false);
      setTimeout(() => setSyncFeedback(null), 5500);
    }
  };

  const mergedHazards = useMemo<
    Array<HazardAlert & { isWebSearch?: boolean; distanceMeters?: number | null }>
  >(() => {
    const camgoAsAlerts = liveCamgoHazards
      .filter((h) => h && h.status !== 'cleared' && h.active !== false)
      .map((h) => {
        const isWeb = h.verifiedBy === 'web_search';
        const severity: HazardAlert['severity'] =
          h.severity === 'critical'
            ? 'critical'
            : h.severity === 'high'
            ? 'high'
            : h.severity === 'medium' || h.severity === 'moderate'
            ? 'moderate'
            : 'low';
        const lat = Number(h.lat);
        const lng = Number(h.lng);
        const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

        return {
          id: `camgo-${h.id}`,
          title: h.titleEn || h.title,
          titleBm: h.titleMs || h.titleBm || h.title,
          severity,
          location: h.landmark || h.location || h.corridor || 'Cameron Highlands',
          description: h.summaryEn || h.summary || h.description || h.title,
          descriptionBm: h.summaryMs || h.descriptionBm || h.summary || h.description || h.title,
          type:
            h.type === 'closure' || h.type === 'road_closure'
              ? 'road_closure'
              : h.type === 'weather' || h.type === 'flood_or_fallen_tree'
              ? 'fog'
              : h.type,
          reportedAt: h.reportedAt || h.updatedAt
            ? new Date(h.reportedAt || h.updatedAt || '').toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Live',
          status: h.passableStatus || (isWeb ? 'Verified Web Search' : 'Active Community Pin'),
          source: h.sourceName || h.source || (isWeb ? 'Google Search Grounding' : 'CamGo Live'),
          sourceUrl: h.sourceUrl,
          actionTaken: h.alternativeRoute,
          actionTakenBm: h.alternativeRoute,
          referenceNo: h.corridor || (isWeb ? 'WEB_SEARCH' : 'COMMUNITY_PIN'),
          isVerifiedAgency: isWeb,
          isWebSearch: isWeb,
          timestamp: h.reportedAt || h.updatedAt || h.timestamp,
          lat: hasValidCoords ? lat : undefined,
          lng: hasValidCoords ? lng : undefined,
        } as HazardAlert & { isWebSearch?: boolean };
      });

    const combined = [...camgoAsAlerts, ...hazards];
    return combined.map((item) => {
      const hLat = Number(item.lat);
      const hLng = Number(item.lng);
      const hasCoords = Number.isFinite(hLat) && Number.isFinite(hLng) && hLat !== 0 && hLng !== 0;
      const distanceMeters =
        userCoords && hasCoords
          ? haversineDistanceMeters(userCoords.lat, userCoords.lng, hLat, hLng)
          : null;
      return {
        ...item,
        distanceMeters,
      };
    });
  }, [liveCamgoHazards, hazards, userCoords]);

  const nearbyHazards1Km = useMemo(() => {
    return mergedHazards
      .filter(
        (h) =>
          typeof h.distanceMeters === 'number' &&
          h.distanceMeters <= HAZARD_PROXIMITY_RADIUS_METERS
      )
      .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  }, [mergedHazards]);

  const visibleNearbyHazards = useMemo(() => {
    return nearbyHazards1Km.filter((h) => !dismissedProximityIds.has(h.id));
  }, [nearbyHazards1Km, dismissedProximityIds]);

  // Trigger audio chime + haptic pulse once per hazard ID upon entering 1km radius
  useEffect(() => {
    if (nearbyHazards1Km.length === 0) return;
    let enteredNew = false;
    nearbyHazards1Km.forEach((h) => {
      if (!alertedHazardIdsRef.current.has(h.id)) {
        alertedHazardIdsRef.current.add(h.id);
        enteredNew = true;
      }
    });
    if (enteredNew) {
      if (audioService.getAudioState() === 'ready') {
        audioService.playTestChime();
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate([180, 90, 180]);
        } catch {
          // ignore vibration blocks
        }
      }
    }
  }, [nearbyHazards1Km]);

  const getHazardIcon = (type: HazardAlert['type'], isPdrm?: boolean, isWeb?: boolean) => {
    if (isWeb) {
      return <Globe className="w-5 h-5 text-sky-400" />;
    }
    if (isPdrm) {
      return <ShieldAlert className="w-5 h-5 text-sky-400" />;
    }
    switch (type) {
      case 'fog':
        return <CloudFog className="w-5 h-5 text-teal-400" />;
      case 'roadwork':
        return <Hammer className="w-5 h-5 text-amber-400" />;
      case 'road_closure':
        return <Car className="w-5 h-5 text-rose-400" />;
      case 'landslide':
      default:
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
    }
  };

  const getSeverityBadge = (sev: HazardAlert['severity']) => {
    switch (sev) {
      case 'critical':
      case 'high':
        return (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            {isBm ? 'Bahaya Kritikal' : 'Critical Alert'}
          </span>
        );
      case 'medium':
      case 'moderate':
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {isBm ? 'Notis & Amaran' : 'Advisory Notice'}
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {isBm ? 'Notis Semasa' : 'Live Notice'}
          </span>
        );
    }
  };

  const isPdrmAlert = (h: HazardAlert) =>
    h.agency === 'PDRM' ||
    h.source?.toLowerCase().includes('pdrm') ||
    h.agencyName?.toLowerCase().includes('pdrm') ||
    h.source?.toLowerCase().includes('polis');

  const filteredHazards = mergedHazards.filter((h) => {
    if (filterAgency === 'CRITICAL') return h.severity === 'critical' || h.severity === 'high';
    if (filterAgency === 'WEB') return Boolean(h.isWebSearch || h.id.startsWith('camgo-'));
    if (filterAgency === 'PDRM') return isPdrmAlert(h);
    if (filterAgency === 'JKR') return h.agency === 'JKR' || h.source?.toLowerCase().includes('jkr');
    if (filterAgency === 'MDCH') return h.agency === 'MDCH' || h.source?.toLowerCase().includes('mdch');
    return true;
  });

  const webCount = mergedHazards.filter((h) => h.isWebSearch || h.id.startsWith('camgo-')).length;
  const pdrmCount = mergedHazards.filter(isPdrmAlert).length;
  const jkrCount = mergedHazards.filter((h) => h.agency === 'JKR' || h.source?.toLowerCase().includes('jkr')).length;
  const mdchCount = mergedHazards.filter((h) => h.agency === 'MDCH' || h.source?.toLowerCase().includes('mdch')).length;
  const criticalCount = mergedHazards.filter((h) => h.severity === 'critical' || h.severity === 'high').length;

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-7 border border-amber-500/25 shadow-2xl relative overflow-hidden group">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
              <Radio className="w-3 h-3 animate-pulse text-rose-400" />
              {isBm ? 'Suapan Rasmi PDRM, JKR & MDCH' : 'Live PDRM, JKR & MDCH Feeds'}
            </span>
            <span className="text-[10px] text-stone-400 hidden sm:inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              {isBm ? 'Disahkan Agensi Kerajaan' : 'Official Government Verified'}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-100 tracking-tight">
            {getTranslation(language, 'widget_hazard_title')}
          </h3>
          <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
            {getTranslation(language, 'widget_hazard_subtitle')}
          </p>
        </div>

        {/* Sync & Hotline Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefreshWebAlerts}
            disabled={isRefreshingWeb}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-60"
            title="Search live Malaysian news and JKR updates from the last 48 hours"
          >
            {isRefreshingWeb ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {isRefreshingWeb
                ? isBm
                  ? 'Menyegar Web...'
                  : 'Refreshing...'
                : isBm
                ? 'Segar Amaran Web'
                : 'Refresh Web Alerts'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            title="Fetch live updates from PDRM Cameron Highlands, JKR eBencana and MDCH"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? (isBm ? 'Menyelaras...' : 'Syncing...') : isBm ? 'Kemaskini Suapan' : 'Sync Live Feed'}</span>
          </button>

          <a
            href="tel:999"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-stone-300 text-xs font-bold transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
            <span>Highland SOS: 999</span>
          </a>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono">Live Sync</span>
        </div>
      )}

      {/* 1km Hazard Proximity Alert Banner & GPS Guard */}
      {visibleNearbyHazards.length > 0 ? (
        <div
          role="alert"
          className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-rose-950/90 via-rose-900/75 to-amber-950/80 border-2 border-rose-500/75 shadow-lg shadow-rose-950/60 space-y-2.5 animate-in fade-in"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-rose-500/25 border border-rose-400/50 text-rose-300 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wide text-rose-200">
                    {isBm
                      ? `AMARAN BAHAYA DALAM 1 KM (${visibleNearbyHazards.length})`
                      : `HAZARD PROXIMITY ALERT (< 1 KM) · ${visibleNearbyHazards.length}`}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold">
                    GPS LIVE
                  </span>
                </div>
                <p className="text-xs text-rose-100/90 mt-0.5">
                  {isBm
                    ? 'Anda berada dalam lingkungan 1 KM daripada bahaya jalan aktif. Pandu dengan berhati-hati.'
                    : 'You are within 1 km of an active road hazard. Slow down and watch ahead.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  audioService.unlockAudio();
                  audioService.playTestChime();
                }}
                className="p-1.5 rounded-lg bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400/40 text-rose-200 cursor-pointer"
                title={isBm ? 'Bunyikan Amaran' : 'Play Alert Chime'}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setDismissedProximityIds((prev) => {
                    const next = new Set(prev);
                    visibleNearbyHazards.forEach((h) => next.add(h.id));
                    return next;
                  })
                }
                className="p-1.5 rounded-lg bg-stone-900/70 hover:bg-stone-800 text-stone-300 hover:text-white border border-white/10 cursor-pointer"
                title={isBm ? 'Tutup sementara' : 'Dismiss warning'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pl-1">
            {visibleNearbyHazards.slice(0, 3).map((near) => (
              <div
                key={`prox-${near.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-stone-950/75 border border-rose-500/35 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white truncate">
                    {isBm ? near.titleBm || near.title : near.title}
                  </div>
                  <div className="text-[11px] text-rose-200/80 flex items-center gap-1.5 truncate">
                    <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="truncate">{near.location}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/25 border border-rose-400/45 text-rose-200 font-mono font-extrabold text-[11px] shrink-0">
                  {typeof near.distanceMeters === 'number'
                    ? formatDistanceLabel(near.distanceMeters, isBm)
                    : isBm
                    ? '< 1 KM'
                    : '< 1 km'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 px-3.5 py-2 rounded-xl bg-stone-900/70 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-stone-300">
            <LocateFixed
              className={`w-3.5 h-3.5 shrink-0 ${
                gpsStatus === 'active'
                  ? 'text-emerald-400'
                  : gpsStatus === 'locating'
                  ? 'text-amber-400 animate-spin'
                  : 'text-stone-400'
              }`}
            />
            <span>
              {gpsStatus === 'active'
                ? isBm
                  ? 'Pengesan Jarak 1 KM Aktif: Tiada bahaya jalan berhampiran lokasi anda.'
                  : '1 km Hazard Proximity Guard Active: No active road hazards within 1 km.'
                : gpsStatus === 'locating'
                ? isBm
                  ? 'Mengesan lokasi GPS untuk amaran jarak 1 KM...'
                  : 'Checking GPS location for 1 km hazard proximity alerts...'
                : gpsStatus === 'denied'
                ? isBm
                  ? 'Akses GPS disekat. Benarkan lokasi untuk amaran bahaya 1 KM.'
                  : 'Location permission denied. Enable GPS for automatic 1 km hazard warnings.'
                : isBm
                ? 'GPS tidak tersedia pada peranti ini untuk semakan jarak 1 KM.'
                : 'GPS unavailable for 1 km proximity check.'}
            </span>
          </div>
          {gpsStatus !== 'active' && gpsStatus !== 'locating' && (
            <button
              type="button"
              onClick={requestProximityGps}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/35 text-emerald-300 font-bold cursor-pointer"
            >
              {isBm ? 'Semak GPS' : 'Enable GPS Check'}
            </button>
          )}
        </div>
      )}

      {/* Official Agencies Reference Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {OFFICIAL_AGENCIES.map((agency) => (
          <div
            key={agency.id}
            className={`p-3.5 rounded-2xl bg-stone-900/70 border transition-all flex flex-col justify-between ${
              agency.id === 'PDRM'
                ? 'border-sky-500/25 hover:border-sky-400/50'
                : 'border-white/10 hover:border-amber-500/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      agency.id === 'PDRM'
                        ? 'bg-sky-500/20 text-sky-400'
                        : agency.id === 'JKR'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-teal-500/20 text-teal-400'
                    }`}
                  >
                    {agency.id === 'PDRM' ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : agency.id === 'JKR' ? (
                      <Car className="w-4 h-4" />
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-stone-100">{agency.shortName}</h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-white/5 font-mono shrink-0">
                  {agency.status}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
                {agency.jurisdiction}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-[11px]">
              <a
                href={agency.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline font-semibold"
              >
                <span>
                  {agency.id === 'PDRM'
                    ? 'Portal PDRM'
                    : agency.id === 'JKR'
                    ? 'eBencana Portal'
                    : 'Portal MDCH'}
                </span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-stone-600">•</span>
              <a
                href={agency.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline font-semibold"
              >
                <span>Facebook</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-stone-600">•</span>
              <a
                href={`tel:${agency.hotline.replace(/\s+/g, '')}`}
                className="flex items-center gap-1 text-amber-300 hover:text-amber-200 font-mono font-bold"
              >
                <PhoneCall className="w-2.5 h-2.5" />
                <span>{agency.hotline}</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Agency Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button
          onClick={() => setFilterAgency('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterAgency === 'ALL'
              ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
              : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-white/5'
          }`}
        >
          {isBm ? 'Semua Notis' : 'All Notices'} ({mergedHazards.length})
        </button>

        <button
          onClick={() => setFilterAgency('WEB')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filterAgency === 'WEB'
              ? 'bg-sky-500 text-stone-950 shadow-md font-extrabold'
              : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{isBm ? 'Amaran Web & Peta' : 'Web & Map Alerts'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-stone-900/50 text-[10px]">{webCount}</span>
        </button>

        <button
          onClick={() => setFilterAgency('PDRM')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filterAgency === 'PDRM'
              ? 'bg-sky-500 text-stone-950 shadow-md font-extrabold'
              : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>PDRM Cameron Highlands</span>
          <span className="px-1.5 py-0.2 rounded-full bg-stone-900/50 text-[10px]">{pdrmCount}</span>
        </button>

        <button
          onClick={() => setFilterAgency('JKR')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filterAgency === 'JKR'
              ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
              : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-white/5'
          }`}
        >
          <span>JKR Cerun &amp; Jalan</span>
          <span className="px-1.5 py-0.2 rounded-full bg-stone-900/50 text-[10px]">{jkrCount}</span>
        </button>

        <button
          onClick={() => setFilterAgency('MDCH')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filterAgency === 'MDCH'
              ? 'bg-amber-500 text-stone-950 shadow-md font-extrabold'
              : 'bg-stone-800/80 hover:bg-stone-800 text-stone-300 border border-white/5'
          }`}
        >
          <span>MDCH Perbandaran</span>
          <span className="px-1.5 py-0.2 rounded-full bg-stone-900/50 text-[10px]">{mdchCount}</span>
        </button>

        {criticalCount > 0 && (
          <button
            onClick={() => setFilterAgency('CRITICAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterAgency === 'CRITICAL'
                ? 'bg-rose-500 text-white shadow-md font-extrabold'
                : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>{isBm ? 'Kritikal' : 'Critical Only'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-950/80 text-[10px]">{criticalCount}</span>
          </button>
        )}
      </div>

      {/* Notice & Hazard Bulletins List */}
      <div className="space-y-4">
        {filteredHazards.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-stone-900/40 border border-white/5 space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-bold text-stone-200">
              {isBm ? 'Tiada Notis Aktif Dalam Kategori Ini' : 'No Active Notices In This Category'}
            </div>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              {isBm
                ? 'Laluan dan kawasan berkaitan berada dalam keadaan selamat dan dipantau oleh pihak berkuasa.'
                : 'All roadways and municipal stretches are clear and monitored by relevant agencies.'}
            </p>
          </div>
        ) : (
          filteredHazards.map((hazard) => {
            const isPdrm = isPdrmAlert(hazard);
            const isWeb = Boolean(hazard.isWebSearch);
            const isJkr = hazard.agency === 'JKR' || hazard.source?.toLowerCase().includes('jkr');
            const isWithin1Km =
              typeof hazard.distanceMeters === 'number' &&
              hazard.distanceMeters <= HAZARD_PROXIMITY_RADIUS_METERS;
            const officialUrl =
              hazard.sourceUrl ||
              (isPdrm
                ? 'https://www.facebook.com/PolisDaerahCameronHighlands'
                : isJkr
                ? 'https://bencanaalam.jkr.gov.my'
                : 'https://mdcameron.gov.my');

            return (
              <div
                key={hazard.id}
                className={`glass-card-hover rounded-2xl p-4 sm:p-5 border transition-all space-y-3 ${
                  isWithin1Km
                    ? 'bg-rose-950/35 border-rose-500/75 ring-1 ring-rose-500/45 shadow-lg shadow-rose-950/40'
                    : isWeb
                    ? 'bg-stone-900/85 border-sky-400/35 hover:border-sky-400/65'
                    : isPdrm
                    ? 'bg-stone-900/85 border-sky-500/30 hover:border-sky-400/60'
                    : 'bg-stone-900/85 border-white/10 hover:border-amber-500/30'
                }`}
              >
                {/* Card Top: Agency Badge, Ref, Proximity, Severity */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide uppercase ${
                        isWeb
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                          : isPdrm
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/35'
                          : isJkr
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      }`}
                    >
                      {isWeb ? <Globe className="w-3 h-3" /> : <FileCheck2 className="w-3 h-3" />}
                      {hazard.agencyName ||
                        hazard.source ||
                        (isPdrm
                          ? 'PDRM • IPD Cameron Highlands'
                          : isJkr
                          ? 'JKR Cameron Highlands'
                          : 'MDCH Cameron Highlands')}
                    </span>

                    {hazard.referenceNo && (
                      <span className="text-[10px] font-mono text-stone-400 bg-stone-800/80 px-2 py-0.5 rounded border border-white/5">
                        Ref: {hazard.referenceNo}
                      </span>
                    )}

                    {typeof hazard.distanceMeters === 'number' && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                          isWithin1Km
                            ? 'bg-rose-500/25 text-rose-200 border-rose-400/50 animate-pulse'
                            : 'bg-stone-800/80 text-stone-300 border-white/10'
                        }`}
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{formatDistanceLabel(hazard.distanceMeters, isBm)}</span>
                      </span>
                    )}
                  </div>

                  <div>{getSeverityBadge(hazard.severity)}</div>
                </div>

                {/* Title & Location */}
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-stone-800 border border-white/10 shrink-0 mt-0.5">
                    {getHazardIcon(hazard.type, isPdrm, isWeb)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm sm:text-base font-bold text-stone-100 leading-snug">
                      {isBm ? hazard.titleBm || hazard.title : hazard.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-medium mt-1">
                      <Compass className="w-3.5 h-3.5 shrink-0" />
                      <span>{hazard.location}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-stone-300 leading-relaxed pl-11">
                  {isBm ? hazard.descriptionBm || hazard.description : hazard.description}
                </p>

                {/* Action Taken (On-Site Response) */}
                {(hazard.actionTaken || hazard.actionTakenBm) && (
                  <div className="ml-11 p-2.5 rounded-xl bg-stone-950/60 border border-white/5 text-[11px] text-stone-300 flex items-start gap-2">
                    <Hammer className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300">
                        {isBm ? 'Tindakan & Nasihat: ' : 'Advisory / Action: '}
                      </span>
                      <span>{isBm ? hazard.actionTakenBm || hazard.actionTaken : hazard.actionTaken}</span>
                    </div>
                  </div>
                )}

                {/* Footer Metadata & External Link */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-[11px] text-stone-400 pl-11">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-500" />
                      <span>{hazard.reportedAt || hazard.reportedTime || hazard.timestamp}</span>
                    </span>

                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle className="w-3 h-3" />
                      <span>{hazard.status || (isBm ? 'Dipantau Agensi' : 'Monitored by Agency')}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {hazard.agencyHotline && (
                      <a
                        href={`tel:${hazard.agencyHotline.replace(/\s+/g, '')}`}
                        className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-mono font-bold"
                        title="Call agency emergency line"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>{hazard.agencyHotline}</span>
                      </a>
                    )}

                    <a
                      href={officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline font-semibold"
                    >
                      <span>{isBm ? 'Lihat Notis Rasmi' : 'View Official Notice'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
