import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  X,
  Crosshair,
  Maximize2,
  Share2,
  QrCode,
  Copy,
  Check,
  Radio,
  Navigation,
  Compass,
  Battery,
  ShieldCheck,
  Users,
  Footprints,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Language, BeaconSession, BeaconMember } from '../types';
import {
  calculateHaversineDistance,
  formatDistance,
  calculateBearing,
  getCompassCardinal,
  getNearestHighlandLandmark,
  isLocationStale,
  formatTimeAgo,
} from '../utils/beaconUtils';

interface LiveBeaconMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: BeaconSession | null;
  myCoords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    heading: number | null;
    speed: number | null;
    altitude: number | null;
  } | null;
  memberId: string;
  memberName: string;
  avatarColor: string;
  batteryLevel: number | null;
  language: Language;
}

export const LiveBeaconMapModal: React.FC<LiveBeaconMapModalProps> = ({
  isOpen,
  onClose,
  session,
  myCoords,
  memberId,
  memberName,
  avatarColor,
  batteryLevel,
  language,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const circlesRef = useRef<{ [key: string]: L.Circle }>({});

  const [copiedCode, setCopiedCode] = useState(false);
  const [recenterToast, setRecenterToast] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Generate QR code for this active session
  useEffect(() => {
    if (!session?.code) return;
    const baseUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://camgo.app';
    const shareUrl = `${baseUrl}?beacon=${session.code}`;

    QRCode.toDataURL(shareUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#064e3b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate QR in map modal:', err));
  }, [session?.code]);

  // Initialize and tear down Leaflet Map
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
        circlesRef.current = {};
      }
      return;
    }

    // Modal is open, wait for container to be in DOM
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      // Clean up previous instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialLat = myCoords?.latitude || 4.5050; // Kea Farm default
      const initialLon = myCoords?.longitude || 101.4080;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: 16,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;

      // Recalculate size once modal is rendered
      map.invalidateSize();
    }, 120);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
        circlesRef.current = {};
      }
    };
  }, [isOpen]);

  // Update map markers whenever session members or myCoords change
  useEffect(() => {
    if (!isOpen || !mapInstanceRef.current || !session) return;

    const map = mapInstanceRef.current;
    const membersList = session.members ? Object.values(session.members) : [];

    // Ensure self is in the list even if firestore write is pending
    const effectiveMembers = [...membersList];
    const selfFound = effectiveMembers.some((m) => m.id === memberId);
    if (!selfFound && myCoords) {
      effectiveMembers.push({
        id: memberId,
        name: memberName || 'You',
        avatarColor: avatarColor || '#10b981',
        latitude: myCoords.latitude,
        longitude: myCoords.longitude,
        accuracy: myCoords.accuracy,
        heading: myCoords.heading,
        speed: myCoords.speed,
        altitude: myCoords.altitude,
        batteryLevel,
        isSharing: true,
        updatedAt: new Date().toISOString(),
        nearestLandmark: getNearestHighlandLandmark(myCoords.latitude, myCoords.longitude),
      });
    }

    effectiveMembers.forEach((member) => {
      const isMe = member.id === memberId;
      const stale = isLocationStale(member.updatedAt);
      const isActivelySharing = member.isSharing;

      // Custom marker icon with radar pulse & label
      const iconHtml = `
        <div class="relative flex items-center justify-center">
          ${
            isActivelySharing && !stale
              ? `<div class="absolute w-11 h-11 rounded-full animate-ping opacity-60" style="background-color: ${member.avatarColor};"></div>`
              : ''
          }
          <div class="w-9 h-9 rounded-full border-2 border-white shadow-2xl flex items-center justify-center font-black text-white text-xs z-10 transition-transform ${
            stale ? 'opacity-70 grayscale-[40%]' : ''
          }" style="background-color: ${member.avatarColor};">
            ${member.name.charAt(0).toUpperCase()}
          </div>
          <div class="absolute -bottom-6 bg-stone-900/95 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/20 text-[10px] font-mono font-bold text-white whitespace-nowrap shadow-xl z-20 flex items-center gap-1">
            <span>${member.name}</span>
            ${isMe ? '<span class="text-emerald-400 font-extrabold">(You)</span>' : ''}
            ${stale ? '<span class="text-amber-400">⚠️</span>' : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-live-beacon-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const latLng = L.latLng(member.latitude, member.longitude);

      // Upsert Marker
      if (markersRef.current[member.id]) {
        markersRef.current[member.id].setLatLng(latLng);
        markersRef.current[member.id].setIcon(customIcon);
      } else {
        const marker = L.marker(latLng, { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          setSelectedMemberId(member.id);
          map.panTo(latLng);
        });
        markersRef.current[member.id] = marker;
      }

      // Upsert Accuracy Circle
      if (member.accuracy && isActivelySharing) {
        if (circlesRef.current[member.id]) {
          circlesRef.current[member.id].setLatLng(latLng);
          circlesRef.current[member.id].setRadius(member.accuracy);
        } else {
          const circle = L.circle(latLng, {
            radius: Math.max(10, member.accuracy),
            color: member.avatarColor,
            fillColor: member.avatarColor,
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(map);
          circlesRef.current[member.id] = circle;
        }
      }
    });

    // Cleanup departed markers
    const currentMemberIds = new Set(effectiveMembers.map((m) => m.id));
    Object.keys(markersRef.current).forEach((existingId) => {
      if (!currentMemberIds.has(existingId)) {
        markersRef.current[existingId].remove();
        delete markersRef.current[existingId];
        if (circlesRef.current[existingId]) {
          circlesRef.current[existingId].remove();
          delete circlesRef.current[existingId];
        }
      }
    });
  }, [isOpen, session, myCoords, memberId, memberName, avatarColor, batteryLevel]);

  // Recenter Map directly on user's exact current location
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;

    const lat = myCoords?.latitude;
    const lon = myCoords?.longitude;

    if (lat !== undefined && lon !== undefined) {
      mapInstanceRef.current.flyTo([lat, lon], 17, {
        animate: true,
        duration: 0.8,
      });
      const accuracy = myCoords?.accuracy ? `±${myCoords.accuracy}m` : 'High GPS';
      setRecenterToast(
        language === 'bm'
          ? `Dipusatkan ke lokasi anda (${accuracy})`
          : `Centered on your location (${accuracy})`
      );
      setTimeout(() => setRecenterToast(null), 2500);
    } else {
      setRecenterToast(
        language === 'bm'
          ? 'Mendapatkan isyarat GPS peranti...'
          : 'Acquiring GPS satellite fix...'
      );
      setTimeout(() => setRecenterToast(null), 2500);
    }
  };

  // Fit all companions in view
  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const coords: [number, number][] = [];
    if (myCoords) coords.push([myCoords.latitude, myCoords.longitude]);
    if (session?.members) {
      Object.values(session.members).forEach((m) => {
        coords.push([m.latitude, m.longitude]);
      });
    }

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
      setRecenterToast(
        language === 'bm' ? 'Menyesuaikan semua ahli' : 'Viewing all group members'
      );
      setTimeout(() => setRecenterToast(null), 2000);
    }
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    const code = session?.code || 'CAMGO-BEACON';
    const name = session?.name || 'Cameron Highlands Group';
    const baseUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://camgo.app';
    const shareUrl = `${baseUrl}?beacon=${code}`;
    const text = `🌲 Join our "${name}" Live Beacon in Cameron Highlands!\n\n📍 Real-time GPS sync & Interactive Map\n🔑 Code: ${code}\n🔗 Instant Link: ${shareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Copy code helper
  const handleCopyCode = () => {
    if (!session?.code) return;
    navigator.clipboard.writeText(session.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  const companions = session?.members
    ? Object.values(session.members).filter((m) => m.id !== memberId)
    : [];

  const myLandmark = myCoords
    ? getNearestHighlandLandmark(myCoords.latitude, myCoords.longitude)
    : 'Cameron Highlands';

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] rounded-3xl bg-stone-900 border border-emerald-500/40 shadow-2xl flex flex-col overflow-hidden text-stone-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 border-b border-emerald-500/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-stone-100 font-heading tracking-wide uppercase flex items-center gap-1.5 truncate">
                  <span>{language === 'bm' ? 'PETA SUAR LANGSUNG KUMPULAN' : 'LIVE GROUP BEACON MAP'}</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>LIVE GPS</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400 truncate">
                <span className="font-semibold text-stone-300 truncate">{session?.name || 'Cameron Highlands Party'}</span>
                <span>•</span>
                <span className="font-mono text-emerald-400 font-bold">{session?.code}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Share WhatsApp Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              title="Share Invite"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'bm' ? 'Kongsi' : 'Invite'}</span>
            </button>

            {/* QR Toggle Button */}
            <button
              type="button"
              onClick={() => setShowQrPreview(!showQrPreview)}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                showQrPreview
                  ? 'bg-stone-800 text-emerald-400 border-emerald-500/40'
                  : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border-white/10'
              }`}
              title="Toggle QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Close 'X' Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer ml-1"
              aria-label="Close Live Map"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recenter Toast Feedback */}
        {recenterToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[450] px-3.5 py-1.5 rounded-full bg-stone-900/95 border border-emerald-400 text-emerald-300 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>{recenterToast}</span>
          </div>
        )}

        {/* Scrollable Modal Content Body */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 py-3.5 space-y-4 touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Quick Toolbar & Highland Landmark pill */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-stone-950/70 border border-white/10 p-2.5 rounded-2xl text-xs">
            <div className="flex items-center gap-2 text-stone-300 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block shrink-0" />
              <span className="text-xs text-stone-200 font-medium truncate">
                <span className="text-stone-400 mr-1">{language === 'bm' ? 'Posisi Anda:' : 'Your Location:'}</span>
                <span className="text-emerald-300 font-bold">{myLandmark}</span>
              </span>
            </div>

            {/* Interactive Control Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Recenter Location Button */}
              <button
                type="button"
                onClick={handleRecenter}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-950/50 active:scale-95"
                title="Recenter map on your location"
              >
                <Crosshair className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{language === 'bm' ? 'Pusatkan Lokasi Saya' : 'Recenter Location'}</span>
              </button>

              {/* Fit All Companions Button */}
              <button
                type="button"
                onClick={handleFitAll}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/15 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Fit all party members in view"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'bm' ? 'Semua Ahli' : 'Fit All'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible QR Code Preview Card */}
          {showQrPreview && (
            <div className="p-4 rounded-2xl bg-stone-950 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-3">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Beacon QR"
                    className="w-24 h-24 bg-white p-1 rounded-xl shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 bg-stone-900 rounded-xl flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-400 uppercase font-mono">
                    {language === 'bm' ? 'Imbas untuk Sertai' : 'Scan to Join Beacon'}
                  </div>
                  <div className="text-xs text-stone-300">
                    {language === 'bm'
                      ? 'Imbas kamera untuk menyertai penjejakan live ini secara terus.'
                      : 'Scan to connect with your live Highland party.'}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-sm font-mono font-black text-white px-2 py-0.5 rounded bg-stone-900 border border-emerald-500/30">
                      {session?.code}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? (language === 'bm' ? 'Disalin' : 'Copied') : (language === 'bm' ? 'Salin' : 'Copy')}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{language === 'bm' ? 'Hantar WhatsApp' : 'Send via WhatsApp'}</span>
              </button>
            </div>
          )}

          {/* Interactive Leaflet Map Container */}
          <div className="relative w-full rounded-2xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-stone-950 h-[340px] sm:h-[460px]">
            {/* Map Canvas */}
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* Floating In-Map Recenter & Zoom Controls */}
            <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRecenter}
                className="p-2.5 rounded-xl bg-emerald-600/95 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-xl backdrop-blur-md cursor-pointer transition-transform active:scale-95"
                title="Recenter on my exact location"
              >
                <Crosshair className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={handleFitAll}
                className="p-2.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-stone-100 border border-white/20 shadow-xl backdrop-blur-md cursor-pointer transition-colors"
                title="Fit all companions"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* In-Map Companion Overlay Badge (bottom-left) */}
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[400] flex items-center gap-2 overflow-x-auto py-1">
              {/* You pill */}
              <div className="px-2.5 py-1.5 rounded-xl bg-stone-900/95 backdrop-blur-md border border-emerald-400 text-left shrink-0 shadow-lg flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: avatarColor || '#10b981' }}
                >
                  {(memberName || 'Y').charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>{memberName || 'You'}</span>
                    <span className="text-[10px] text-emerald-400 font-extrabold">(You)</span>
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">
                    {myCoords ? `±${myCoords.accuracy}m GPS` : 'Acquiring...'}
                  </div>
                </div>
              </div>

              {/* Companions pills */}
              {companions.map((comp) => {
                const stale = isLocationStale(comp.updatedAt);
                const dist = myCoords
                  ? formatDistance(
                      calculateHaversineDistance(
                        myCoords.latitude,
                        myCoords.longitude,
                        comp.latitude,
                        comp.longitude
                      )
                    )
                  : null;

                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => {
                      setSelectedMemberId(comp.id);
                      mapInstanceRef.current?.flyTo([comp.latitude, comp.longitude], 17, {
                        animate: true,
                        duration: 0.8,
                      });
                    }}
                    className={`px-2.5 py-1.5 rounded-xl bg-stone-900/95 backdrop-blur-md border text-left shrink-0 transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                      selectedMemberId === comp.id
                        ? 'border-emerald-400 ring-1 ring-emerald-400'
                        : 'border-white/15 hover:border-white/30'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: comp.avatarColor }}
                    >
                      {comp.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="leading-tight">
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <span>{comp.name}</span>
                        {stale && <span className="text-[10px] text-amber-400 font-bold">⚠️</span>}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {dist ? dist : formatTimeAgo(comp.updatedAt)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group Companion Details & Live Telemetry List */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {language === 'bm' ? 'Ahli Kumpulan Suar' : 'Group Beacon Members'} (
                  {(companions.length + 1)}
                </span>
                )
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRecenter}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>{language === 'bm' ? 'Pusatkan Saya' : 'Center on Me'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* You Card */}
              <div className="p-3 rounded-2xl bg-stone-950/70 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ring-emerald-400 shrink-0"
                    style={{ backgroundColor: avatarColor || '#10b981' }}
                  >
                    {(memberName || 'Y').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="truncate">{memberName || 'You'}</span>
                      <span className="text-[10px] font-bold text-emerald-400">(You)</span>
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono truncate">
                      {myLandmark}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] font-mono text-emerald-300 font-bold">
                    {myCoords ? `±${myCoords.accuracy}m` : 'Syncing'}
                  </div>
                  {batteryLevel !== null && (
                    <div className="text-[10px] text-stone-400 flex items-center justify-end gap-1 font-mono">
                      <Battery className="w-3 h-3 text-stone-300" />
                      <span>{batteryLevel}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Companions Cards */}
              {companions.map((comp) => {
                const stale = isLocationStale(comp.updatedAt);
                const dist = myCoords
                  ? formatDistance(
                      calculateHaversineDistance(
                        myCoords.latitude,
                        myCoords.longitude,
                        comp.latitude,
                        comp.longitude
                      )
                    )
                  : null;

                const bearing = myCoords
                  ? calculateBearing(
                      myCoords.latitude,
                      myCoords.longitude,
                      comp.latitude,
                      comp.longitude
                    )
                  : null;

                const cardinal = bearing !== null ? getCompassCardinal(bearing) : null;

                return (
                  <div
                    key={comp.id}
                    onClick={() => {
                      setSelectedMemberId(comp.id);
                      mapInstanceRef.current?.flyTo([comp.latitude, comp.longitude], 17, {
                        animate: true,
                        duration: 0.8,
                      });
                    }}
                    className="p-3 rounded-2xl bg-stone-800/60 hover:bg-stone-800 border border-white/10 hover:border-emerald-500/30 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: comp.avatarColor }}
                      >
                        {comp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="truncate">{comp.name}</span>
                          {stale && (
                            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30">
                              Stale
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono truncate">
                          {comp.nearestLandmark || formatTimeAgo(comp.updatedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {dist && (
                        <div className="text-xs font-bold font-mono text-emerald-400">
                          {dist}
                        </div>
                      )}
                      {cardinal && (
                        <div className="text-[10px] text-stone-400 font-mono">
                          {cardinal} ({bearing}°)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="px-4 sm:px-6 py-3 bg-stone-950 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {language === 'bm'
                ? 'Peta beroperasi secara langsung dengan satelit GPS & koordinat live.'
                : 'Live satellite GPS beacon & real-time party tracking active.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRecenter}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Crosshair className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{language === 'bm' ? 'Pusatkan Lokasi Saya' : 'Recenter Map'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {language === 'bm' ? 'Tutup Peta' : 'Close Map'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
