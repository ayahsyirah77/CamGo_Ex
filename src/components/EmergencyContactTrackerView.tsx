import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Activity,
  AlertTriangle,
  Battery,
  BatteryCharging,
  Clock,
  Compass,
  ExternalLink,
  Footprints,
  Home,
  LocateFixed,
  MapPin,
  Mountain,
  Navigation,
  Radio,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { CAMERON_TRAILS } from '../data/trailsData';
import {
  TrailSafetySession,
  getCachedActiveTrailSession,
} from '../services/trailSafetyService';
import { Language } from '../types';

interface EmergencyContactTrackerViewProps {
  sessionId: string;
  token?: string | null;
  language: Language;
  onExitTracker: () => void;
}

function formatRelativeAgo(isoTime?: string): string {
  if (!isoTime) return 'Waiting for signal...';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoTime).getTime()) / 1000));
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

export const EmergencyContactTrackerView: React.FC<EmergencyContactTrackerViewProps> = ({
  sessionId,
  token,
  language,
  onExitTracker,
}) => {
  const [session, setSession] = useState<TrailSafetySession | null>(() => {
    const local = getCachedActiveTrailSession();
    return local && local.id === sessionId ? local : null;
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoCenter, setAutoCenter] = useState(true);
  const [, setNowTick] = useState(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const trailLineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.CircleMarker | null>(null);
  const endMarkerRef = useRef<L.CircleMarker | null>(null);
  const footprintLineRef = useRef<L.Polyline | null>(null);
  const footprintDotsRef = useRef<L.CircleMarker[]>([]);
  const liveMarkerRef = useRef<L.Marker | null>(null);

  // Tick relative last-seen timer every 15s
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  // Subscribe in real time to Firestore safety_sessions/{sessionId}
  useEffect(() => {
    if (!sessionId) {
      setErrorMsg('Missing trail session reference.');
      setLoading(false);
      return;
    }

    if (!db) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'safety_sessions', sessionId),
      (snap) => {
        setLoading(false);
        if (!snap.exists()) {
          const cached = getCachedActiveTrailSession();
          if (cached && cached.id === sessionId) {
            setSession(cached);
          } else {
            setErrorMsg('Trail session not found or has expired.');
          }
          return;
        }
        const data = { ...(snap.data() as TrailSafetySession), id: snap.id };
        if (
          token &&
          data.trackingToken &&
          data.trackingToken.toUpperCase() !== token.trim().toUpperCase()
        ) {
          setErrorMsg('Invalid tracking access token for this safety session.');
          return;
        }
        setErrorMsg(null);
        setSession(data);
      },
      (err) => {
        console.warn('[EmergencyContactTracker] Live stream notice:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [sessionId, token]);

  // Also listen for local updates when previewed on same device
  useEffect(() => {
    const onLocalUpdate = (e: Event) => {
      const detail = (e as CustomEvent<TrailSafetySession | null>).detail;
      if (detail && detail.id === sessionId) {
        setSession(detail);
      }
    };
    window.addEventListener('camgo-trail-session-updated', onLocalUpdate);
    return () => window.removeEventListener('camgo-trail-session-updated', onLocalUpdate);
  }, [sessionId]);

  // Mount Leaflet Mini Live Footprint Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = session?.lastKnownLat || 4.475;
    const initialLng = session?.lastKnownLng || 101.38;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap | CamGo Safety Tracker',
    }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
      trailLineRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      footprintLineRef.current = null;
      liveMarkerRef.current = null;
      footprintDotsRef.current = [];
    };
  }, [Boolean(session)]);

  // Update Trail Pins + Breadcrumb Footprints + Live Hiker Pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !session) return;

    const matchedTrail = CAMERON_TRAILS.find((t) => t.id === session.trailId);

    if (trailLineRef.current) {
      trailLineRef.current.remove();
      trailLineRef.current = null;
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }

    if (matchedTrail) {
      if (matchedTrail.hasVerifiedGpx && matchedTrail.coordinates.length > 1) {
        trailLineRef.current = L.polyline(matchedTrail.coordinates, {
          color: matchedTrail.color || '#10b981',
          weight: 4,
          opacity: 0.5,
        }).addTo(map);
      }

      if (matchedTrail.coordinates[0]) {
        startMarkerRef.current = L.circleMarker(matchedTrail.coordinates[0], {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: '#10b981',
          fillOpacity: 1,
        })
          .bindTooltip(`Start: ${matchedTrail.trailheadName}`, { direction: 'bottom' })
          .addTo(map);
      }

      const endCoord =
        matchedTrail.peakCoordinates ||
        matchedTrail.coordinates[matchedTrail.coordinates.length - 1];
      if (endCoord) {
        endMarkerRef.current = L.circleMarker(endCoord, {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: '#f43f5e',
          fillOpacity: 1,
        })
          .bindTooltip(`End: ${matchedTrail.peakName || matchedTrail.name}`, { direction: 'top' })
          .addTo(map);
      }
    }

    // Clear previous footprint dots & polyline
    footprintDotsRef.current.forEach((m) => m.remove());
    footprintDotsRef.current = [];
    if (footprintLineRef.current) {
      footprintLineRef.current.remove();
      footprintLineRef.current = null;
    }

    const crumbs = Array.isArray(session.breadcrumbs) ? session.breadcrumbs : [];
    if (crumbs.length > 0) {
      const latLngs = crumbs.map((c) => [c.lat, c.lng] as [number, number]);
      if (latLngs.length > 1) {
        footprintLineRef.current = L.polyline(latLngs, {
          color: '#38bdf8',
          weight: 5,
          opacity: 0.9,
          dashArray: '6 5',
        }).addTo(map);
      }

      crumbs.forEach((pt, idx) => {
        const isFirst = idx === 0;
        const dot = L.circleMarker([pt.lat, pt.lng], {
          radius: isFirst ? 6 : 4,
          color: '#ffffff',
          weight: isFirst ? 2 : 1.5,
          fillColor: isFirst ? '#10b981' : '#38bdf8',
          fillOpacity: 0.95,
        })
          .bindTooltip(
            `${isFirst ? 'Trail Start' : `Footprint #${idx + 1}`} • ${pt.time} (${Math.round(
              pt.altitude || 1450
            )}m)`,
            { direction: 'top' }
          )
          .addTo(map);
        footprintDotsRef.current.push(dot);
      });
    }

    const liveLat = session.lastKnownLat || crumbs[crumbs.length - 1]?.lat;
    const liveLng = session.lastKnownLng || crumbs[crumbs.length - 1]?.lng;
    if (typeof liveLat === 'number' && typeof liveLng === 'number') {
      const isAlertState = session.status === 'overdue';
      const dotColor = isAlertState ? '#f43f5e' : '#38bdf8';

      const beaconIcon = L.divIcon({
        className: 'custom-hiker-live-beacon',
        html: `<div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;"><span style="position:absolute;inset:0;border-radius:50%;background:${dotColor};opacity:0.45;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span><span style="width:14px;height:14px;background:${dotColor};border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px ${dotColor};"></span></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      if (!liveMarkerRef.current) {
        liveMarkerRef.current = L.marker([liveLat, liveLng], { icon: beaconIcon }).addTo(map);
      } else {
        liveMarkerRef.current.setLatLng([liveLat, liveLng]);
        liveMarkerRef.current.setIcon(beaconIcon);
      }

      if (autoCenter) {
        map.panTo([liveLat, liveLng], { animate: true });
      }
    }
  }, [session, autoCenter]);

  const latestCrumb =
    session?.breadcrumbs && session.breadcrumbs.length > 0
      ? session.breadcrumbs[session.breadcrumbs.length - 1]
      : null;

  const currentAltitudeM = Math.round(
    session?.currentAltitude || latestCrumb?.altitude || 1450
  );
  const mapsUrl = session
    ? `https://www.google.com/maps?q=${session.lastKnownLat},${session.lastKnownLng}`
    : '#';

  const statusConfig = (() => {
    if (!session) {
      return {
        label: 'LOADING',
        badgeClass: 'bg-stone-800 text-stone-300 border-white/10',
      };
    }
    if (session.status === 'completed') {
      return {
        label: language === 'bm' ? 'SELAMAT TAMAT' : 'CHECKED OUT SAFE',
        badgeClass: 'bg-emerald-600 text-white border-emerald-400',
      };
    }
    if (session.status === 'overdue') {
      return {
        label: language === 'bm' ? 'LEWAT DAFTAR KELUAR' : 'OVERDUE CHECK-OUT',
        badgeClass: 'bg-rose-600 text-white border-rose-300',
      };
    }
    return {
      label: language === 'bm' ? 'AKTIF DI LALUAN' : 'ACTIVE ON TRAIL',
      badgeClass: 'bg-emerald-600/25 text-emerald-300 border-emerald-400/50',
    };
  })();

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* Compact Sticky Emergency Contact Header */}
      <header className="sticky top-0 z-30 px-4 py-3 bg-stone-900/95 backdrop-blur-md border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Footprints className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
              Emergency Contact Live Footprint View
            </div>
            <h1 className="text-sm sm:text-base font-heading font-black text-white truncate">
              {session ? `${session.hikerName} — ${session.trailName}` : 'CamGo Trail Monitor'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border ${statusConfig.badgeClass}`}>
            {statusConfig.label}
          </span>
          <button
            type="button"
            onClick={onExitTracker}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-white/10 flex items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">CamGo</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 space-y-4">
        {loading && !session && (
          <div className="p-8 rounded-3xl bg-stone-900 border border-white/10 text-center space-y-3">
            <Compass className="w-8 h-8 text-emerald-400 mx-auto animate-spin" />
            <p className="text-sm font-bold text-stone-200">
              Connecting to hiker trail footprint telemetry...
            </p>
          </div>
        )}

        {errorMsg && !session && (
          <div className="p-6 rounded-3xl bg-rose-950/50 border border-rose-500/40 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
            <h2 className="text-base font-black text-white">Tracker Notice</h2>
            <p className="text-xs text-rose-200">{errorMsg}</p>
            <button
              type="button"
              onClick={onExitTracker}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs cursor-pointer"
            >
              Return to CamGo Home
            </button>
          </div>
        )}

        {session && (
          <>
            {/* Alert Escalation Banner when Overdue Check-Out */}
            {session.status === 'overdue' && (
              <div className="p-4 rounded-2xl border-2 space-y-1.5 bg-rose-950/85 border-rose-500 text-rose-100">
                <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>
                    {language === 'bm'
                      ? 'AMARAN DAFTAR KELUAR LEWAT: Tempoh jangkaan pulang telah tamat!'
                      : 'OVERDUE CHECK-OUT ALERT: Expected return duration expired without check-out!'}
                  </span>
                </div>
                <p className="text-xs opacity-90">
                  Last known Quick Ping: {session.lastKnownLat.toFixed(6)}, {session.lastKnownLng.toFixed(6)} ({formatRelativeAgo(session.updatedAt)}). Use Google Maps below to inspect location.
                </p>
              </div>
            )}

            {/* Real-Time Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-stone-900 border border-white/10 space-y-1">
                <div className="text-[10px] font-mono uppercase text-stone-400 flex items-center gap-1">
                  <Mountain className="w-3.5 h-3.5 text-amber-400" />
                  <span>Elevation</span>
                </div>
                <div className="text-base font-black text-amber-300 font-mono">
                  {currentAltitudeM}m ASL
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900 border border-white/10 space-y-1">
                <div className="text-[10px] font-mono uppercase text-stone-400 flex items-center gap-1">
                  {session.telemetry?.isCharging ? (
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Battery</span>
                </div>
                <div className="text-base font-black text-white font-mono">
                  {session.telemetry?.batteryPercent != null
                    ? `${session.telemetry.batteryPercent}%`
                    : 'N/A'}
                  {session.telemetry?.isCharging ? ' ⚡' : ''}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900 border border-white/10 space-y-1">
                <div className="text-[10px] font-mono uppercase text-stone-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Last Seen</span>
                </div>
                <div className="text-sm font-black text-sky-300 font-mono">
                  {formatRelativeAgo(session.updatedAt)}
                </div>
                <div className="text-[10px] text-stone-400 font-mono">
                  {new Date(session.updatedAt).toLocaleTimeString('en-MY', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900 border border-white/10 space-y-1">
                <div className="text-[10px] font-mono uppercase text-stone-400 flex items-center gap-1">
                  <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Footprints</span>
                </div>
                <div className="text-base font-black text-emerald-300 font-mono">
                  {session.breadcrumbs?.length || 0} pts
                </div>
              </div>
            </div>

            {/* Mini Dedicated Interactive Footprint Map */}
            <div className="rounded-3xl overflow-hidden border-2 border-emerald-500/40 bg-stone-900 shadow-2xl">
              <div className="px-4 py-2.5 bg-stone-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-mono text-stone-300">
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{session.telemetry?.signalLabel || 'Tracking Active'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoCenter((v) => !v)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 border cursor-pointer ${
                      autoCenter
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                        : 'bg-stone-800 border-white/10 text-stone-400'
                    }`}
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>{autoCenter ? 'Auto-Follow On' : 'Follow Hiker'}</span>
                  </button>
                </div>
              </div>

              <div className="relative h-[340px] sm:h-[420px] w-full">
                <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />
                <div className="absolute top-3 left-3 z-20 px-3 py-2 rounded-2xl bg-stone-950/90 backdrop-blur-md border border-white/10 text-[11px] font-mono space-y-0.5 shadow-lg">
                  <div className="text-sky-300 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span>Live Footprint Pin</span>
                  </div>
                  <div className="text-white">
                    {session.lastKnownLat.toFixed(5)}, {session.lastKnownLng.toFixed(5)}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-stone-950 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-stone-300 space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {session.hikerName} (Group of {session.groupSize})
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-400 font-mono">
                    Started: {new Date(session.startedAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })} • ETA Return:{' '}
                    {new Date(session.expectedReturnAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open Pin in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Recent Breadcrumb Footprint Trail Log */}
            <div className="p-4 rounded-3xl bg-stone-900 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  <span>Recent Breadcrumb Footprint History</span>
                </h3>
                <span className="text-[11px] font-mono text-stone-400">
                  Auto-updates on signal
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {[...(session.breadcrumbs || [])]
                  .reverse()
                  .slice(0, 10)
                  .map((pt, i) => (
                    <div
                      key={`${pt.timestamp}-${i}`}
                      className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-stone-950 border border-white/5 text-[11px] font-mono text-stone-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-sky-400" />
                        <span>
                          {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
                        </span>
                      </span>
                      <span className="text-amber-300">{Math.round(pt.altitude || 1450)}m</span>
                      <span className="text-stone-400">{pt.time}</span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
