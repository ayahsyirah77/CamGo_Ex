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
  Car,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Route,
  MessageSquare,
  Mic,
  Send,
  PlusCircle,
  Sparkles,
  LogOut,
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
import { WalkieTalkieLive } from './WalkieTalkieLive';
import { beaconService } from '../services/beaconService';
import { RouteOptimizer } from '../lib/ai/routeOptimizer';
import { TelemetryMonitor } from '../lib/ai/telemetryMonitor';

const aiRouteOptimizer = new RouteOptimizer();
const telemetryMonitor = new TelemetryMonitor();

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
  const navPolylineRef = useRef<L.Polyline | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [recenterToast, setRecenterToast] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'compass' | 'members' | 'chat' | 'walkie'>('map');
  const [chatInputText, setChatInputText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // AI & Anomaly States
  const [telemetryAnomaly, setTelemetryAnomaly] = useState<{ message: string; type: string; userId: string } | null>(null);
  const [predictiveEta, setPredictiveEta] = useState<number | null>(null);

  // Proximity Alert State
  const [proximityLevel, setProximityLevel] = useState<'none' | 'near' | 'arrived'>('none');
  const [showProximityToast, setShowProximityToast] = useState<string | null>(null);

  // Exit Confirmation State
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const hasAutoCenteredRef = useRef(false);

  // Auto-center map on first valid GPS fix
  useEffect(() => {
    if (isOpen && myCoords && !hasAutoCenteredRef.current && mapInstanceRef.current) {
      hasAutoCenteredRef.current = true;
      mapInstanceRef.current.setView([myCoords.latitude, myCoords.longitude], 17, { animate: true });
    }
  }, [isOpen, myCoords]);

  const handleCloseWithConfirm = () => {
    setShowExitConfirm(true);
  };

  const handleConfirmLeave = () => {
    setShowExitConfirm(false);
    onClose();
  };

  // Auto-scroll chat and invalidate map size on tab switch
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (activeTab === 'map' && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);
    }
  }, [activeTab, session?.messages?.length]);

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!session || !chatInputText.trim()) return;

    const messageText = chatInputText.trim();
    setChatInputText('');
    setSendingChat(true);

    const newMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      senderId: memberId,
      senderName: memberName || 'Highland Companion',
      senderColor: avatarColor,
      text: messageText,
      timestamp: new Date().toISOString(),
    };

    await beaconService.sendBeaconChatMessage(session.code, newMessage);
    setSendingChat(false);
  };

  // Centralized member sync logic for map pins and member list
  const sortedMembers = React.useMemo(() => {
    if (!session) return [];
    const membersList = session.members ? Object.values(session.members) : [];
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

    return effectiveMembers.sort((a, b) => {
      if (a.id === session.createdBy) return -1;
      if (b.id === session.createdBy) return 1;
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    });
  }, [session?.members, session?.createdBy, memberId, myCoords, memberName, avatarColor, batteryLevel]);

  const creatorId = session?.createdBy;
  const hostMember = React.useMemo(() => {
    if (!session?.members || !creatorId) return null;
    return session.members[creatorId] || Object.values(session.members)[0] || null;
  }, [session?.members, creatorId]);
  
  const isMeHost = memberId === creatorId;
  const hostName = session?.createdByName || hostMember?.name || 'Beacon Host';

  // Proximity Sensor Logic for 500m Radius Alert (checking all party members)
  const notifiedNearbyMembersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !myCoords || sortedMembers.length === 0) {
      if (proximityLevel !== 'none') setProximityLevel('none');
      return;
    }

    // Filter members within 500m radius (excluding self)
    const nearbyCompanions = sortedMembers.filter((m) => {
      if (m.id === memberId) return false;
      const dist = calculateHaversineDistance(
        myCoords.latitude,
        myCoords.longitude,
        m.latitude,
        m.longitude
      );
      return dist <= 500;
    });

    if (nearbyCompanions.length > 0) {
      let closest = nearbyCompanions[0];
      let minDist = calculateHaversineDistance(
        myCoords.latitude,
        myCoords.longitude,
        closest.latitude,
        closest.longitude
      );

      for (let i = 1; i < nearbyCompanions.length; i++) {
        const d = calculateHaversineDistance(
          myCoords.latitude,
          myCoords.longitude,
          nearbyCompanions[i].latitude,
          nearbyCompanions[i].longitude
        );
        if (d < minDist) {
          minDist = d;
          closest = nearbyCompanions[i];
        }
      }

      let newLevel: 'none' | 'near' | 'arrived' = 'none';
      if (minDist <= 30) newLevel = 'arrived';
      else if (minDist <= 500) newLevel = 'near';

      if (!notifiedNearbyMembersRef.current.has(closest.id)) {
        notifiedNearbyMembersRef.current.add(closest.id);
        setProximityLevel(newLevel);

        const formattedDist = formatDistance(minDist);
        const msg = language === 'bm'
          ? `📍 AMARAN PROKSIMITI: ${closest.name} berada berdekatan (${formattedDist})!`
          : `📍 PROXIMITY ALERT: ${closest.name} is within 500m radius (${formattedDist})!`;

        setShowProximityToast(msg);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([50, 100, 50]);
        }
        setTimeout(() => setShowProximityToast(null), 6000);
      }
    } else {
      if (proximityLevel !== 'none') {
        setProximityLevel('none');
      }
      notifiedNearbyMembersRef.current.clear();
    }
  }, [isOpen, myCoords?.latitude, myCoords?.longitude, sortedMembers, memberId, proximityLevel, language]);

  // Dynamic Route & Path overlay state
  const [routeTravelMode, setRouteTravelMode] = useState<'walking' | 'driving'>('walking');
  const [routePoints, setRoutePoints] = useState<[number, number][] | null>(null);
  const [routeEtaInfo, setRouteEtaInfo] = useState<{ distanceText: string; durationText: string } | null>(null);

  // Fetch dynamic walking or driving path geometry from OSRM
  useEffect(() => {
    const creatorId = session?.createdBy;
    const hostMember = session?.members && creatorId ? session.members[creatorId] : null;

    if (!isOpen || !myCoords || !hostMember || hostMember.id === memberId) {
      setRoutePoints(null);
      setRouteEtaInfo(null);
      return;
    }

    let isMounted = true;
    const mode = routeTravelMode === 'walking' ? 'foot' : 'driving';
    const url = `https://router.project-osrm.org/route/v1/${mode}/${myCoords.longitude},${myCoords.latitude};${hostMember.longitude},${hostMember.latitude}?overview=full&geometries=geojson`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data && data.routes && data.routes[0] && data.routes[0].geometry?.coordinates) {
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );
          setRoutePoints(coords);

          const distM = data.routes[0].distance;
          const durS = data.routes[0].duration;

          const distKm = (distM / 1000).toFixed(1);
          const distStr = distM < 1000 ? `${Math.round(distM)}m` : `${distKm}km`;
          const durMin = Math.max(1, Math.round(durS / 60));
          const durStr = durMin >= 60 ? `${Math.floor(durMin / 60)}h ${durMin % 60}m` : `${durMin} min`;

          setRouteEtaInfo({
            distanceText: distStr,
            durationText: durStr,
          });
        } else {
          setRoutePoints([[myCoords.latitude, myCoords.longitude], [hostMember.latitude, hostMember.longitude]]);
          setRouteEtaInfo(null);
        }

        // Apply AI Predictive ETA Adjustment
        if (myCoords && hostMember) {
           aiRouteOptimizer.getPredictiveETA(
             [myCoords.latitude, myCoords.longitude],
             [hostMember.latitude, hostMember.longitude]
           ).then(val => setPredictiveEta(val));
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('OSRM route fetch notice in map modal:', err);
        setRoutePoints([[myCoords.latitude, myCoords.longitude], [hostMember.latitude, hostMember.longitude]]);
        setRouteEtaInfo(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, myCoords?.latitude, myCoords?.longitude, session?.members, session?.createdBy, memberId, routeTravelMode]);

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
      if (navPolylineRef.current) {
        navPolylineRef.current.remove();
        navPolylineRef.current = null;
      }
      return;
    }

    // Modal is open, wait for container to be in DOM
    const timer = setTimeout(() => {
      const container = mapContainerRef.current;
      if (!container) return;

      // Clean up previous instance or stale DOM node tag if any
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }

      const initialLat = myCoords?.latitude || 4.5050; // Kea Farm default
      const initialLon = myCoords?.longitude || 101.4080;

      const map = L.map(container, {
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
      const container = mapContainerRef.current;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
        markersRef.current = {};
        circlesRef.current = {};
      }
      if (container && (container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }
      if (navPolylineRef.current) {
        try {
          navPolylineRef.current.remove();
        } catch {
          // ignore
        }
        navPolylineRef.current = null;
      }
    };
  }, [isOpen]);

  // Update map markers whenever session members or myCoords change
  useEffect(() => {
    if (!isOpen || !mapInstanceRef.current || !session) return;

    const map = mapInstanceRef.current;
    sortedMembers.forEach((member, index) => {
      const isMe = member.id === memberId;
      const isHost = member.id === session.createdBy;
      const pinNumber = index + 1;
      const stale = isLocationStale(member.updatedAt);
      const isActivelySharing = member.isSharing;
      const pinColor = member.avatarColor || '#10b981';

      // Custom designated teardrop pin with number & label
      const iconHtml = `
        <div class="relative flex flex-col items-center justify-center cursor-pointer group" style="transform: translate(-50%, -100%);">
          ${
            isActivelySharing && !stale
              ? `<div class="absolute -bottom-1 w-8 h-8 rounded-full animate-ping opacity-60" style="background-color: ${pinColor};"></div>`
              : ''
          }
          <div class="relative transition-transform duration-200 group-hover:scale-110 drop-shadow-xl">
            <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0C8.954 0 0 8.954 0 20C0 33.5 20 48 20 48C20 48 40 33.5 40 20C40 8.954 31.046 0 20 0Z" fill="${pinColor}" stroke="${isHost ? '#fbbf24' : '#ffffff'}" stroke-width="${isHost ? '3.5' : '2.5'}"/>
              <circle cx="20" cy="18" r="13" fill="#ffffff"/>
              <text x="20" y="23" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${isHost ? '13' : '11'}" fill="${pinColor}">${isMe ? 'YOU' : isHost ? '👑' : '#' + pinNumber}</text>
            </svg>
          </div>
          <div class="mt-1 bg-stone-900/95 backdrop-blur-md px-2 py-0.5 rounded-md border ${isHost ? 'border-amber-400/60 ring-1 ring-amber-400/30' : 'border-white/20'} text-[10px] font-mono font-bold text-white whitespace-nowrap shadow-xl flex items-center gap-1.5 z-20">
            <span class="w-2 h-2 rounded-full" style="background-color: ${pinColor};"></span>
            <span class="${isHost ? 'text-amber-400 font-black' : 'text-emerald-400 font-extrabold'}">${isHost ? '👑 Host' : 'Pin #' + pinNumber}:</span>
            <span class="max-w-[75px] truncate">${member.name}</span>
            ${isMe ? '<span class="text-emerald-300 font-black">(You)</span>' : ''}
            ${stale ? '<span class="text-amber-400">⚠️</span>' : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-live-beacon-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
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

    // Draw dynamic walking or driving path overlay connecting user to Beacon Host
    if (navPolylineRef.current) {
      navPolylineRef.current.remove();
      navPolylineRef.current = null;
    }
    const hostMember = sortedMembers.find((m) => m.id === session.createdBy);
    if (map && myCoords && hostMember && hostMember.id !== memberId) {
      const pointsToUse: [number, number][] =
        routePoints && routePoints.length > 0
          ? routePoints
          : [
              [myCoords.latitude, myCoords.longitude],
              [hostMember.latitude, hostMember.longitude],
            ];

      const isWalking = routeTravelMode === 'walking';
      navPolylineRef.current = L.polyline(pointsToUse, {
        color: isWalking ? '#10b981' : '#3b82f6',
        weight: isWalking ? 5 : 6,
        dashArray: isWalking ? '8, 10' : undefined,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }

    // Cleanup departed markers
    const currentMemberIds = new Set(sortedMembers.map((m) => m.id));
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

    // AI Telemetry Anomaly Monitoring
    sortedMembers.forEach(m => {
      telemetryMonitor.processPacket({
        userId: m.id,
        lat: m.latitude,
        lng: m.longitude,
        speed: m.speed || 0,
        timestamp: m.updatedAt
      }).then(anomaly => {
        if (anomaly && anomaly.userId !== memberId) {
          setTelemetryAnomaly({ message: anomaly.message, type: anomaly.type, userId: anomaly.userId });
        }
      });
    });
  }, [isOpen, session, myCoords, memberId, memberName, avatarColor, batteryLevel, routePoints, routeTravelMode, sortedMembers]);

  // Recenter / Locate Me directly on user's exact current GPS location
  const handleRecenter = () => {
    if ('geolocation' in navigator) {
      setRecenterToast(
        language === 'bm'
          ? 'Mengesan isyarat GPS peranti...'
          : 'Locating real GPS satellite fix...'
      );

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const accuracy = Math.round(pos.coords.accuracy);
          if (mapInstanceRef.current && typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
            try {
              mapInstanceRef.current.invalidateSize();
              const size = mapInstanceRef.current.getSize();
              if (size && size.x > 0 && size.y > 0) {
                mapInstanceRef.current.flyTo([lat, lon], 17, { animate: true, duration: 0.8 });
              } else {
                mapInstanceRef.current.setView([lat, lon], 17);
              }
            } catch (_) {
              try { mapInstanceRef.current.setView([lat, lon], 17); } catch (e) {}
            }
          }
          setRecenterToast(
            language === 'bm'
              ? `Dipusatkan ke lokasi anda (±${accuracy}m)`
              : `Located & centered (±${accuracy}m)`
          );
          setTimeout(() => setRecenterToast(null), 3000);
        },
        () => {
          if (myCoords && mapInstanceRef.current && typeof myCoords.latitude === 'number' && typeof myCoords.longitude === 'number' && !isNaN(myCoords.latitude) && !isNaN(myCoords.longitude)) {
            try {
              mapInstanceRef.current.invalidateSize();
              const size = mapInstanceRef.current.getSize();
              if (size && size.x > 0 && size.y > 0) {
                mapInstanceRef.current.flyTo([myCoords.latitude, myCoords.longitude], 17, { animate: true, duration: 0.8 });
              } else {
                mapInstanceRef.current.setView([myCoords.latitude, myCoords.longitude], 17);
              }
            } catch (_) {
              try { mapInstanceRef.current.setView([myCoords.latitude, myCoords.longitude], 17); } catch (e) {}
            }
            setRecenterToast(
              language === 'bm'
                ? `Dipusatkan ke lokasi anda (±${myCoords.accuracy}m)`
                : `Centered on your location (±${myCoords.accuracy}m)`
            );
            setTimeout(() => setRecenterToast(null), 2500);
          }
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
      );
      return;
    }

    if (myCoords && mapInstanceRef.current && typeof myCoords.latitude === 'number' && typeof myCoords.longitude === 'number' && !isNaN(myCoords.latitude) && !isNaN(myCoords.longitude)) {
      try {
        mapInstanceRef.current.invalidateSize();
        const size = mapInstanceRef.current.getSize();
        if (size && size.x > 0 && size.y > 0) {
          mapInstanceRef.current.flyTo([myCoords.latitude, myCoords.longitude], 17, { animate: true, duration: 0.8 });
        } else {
          mapInstanceRef.current.setView([myCoords.latitude, myCoords.longitude], 17);
        }
      } catch (_) {
        try { mapInstanceRef.current.setView([myCoords.latitude, myCoords.longitude], 17); } catch (e) {}
      }
    }
  };

  // Fit all companions in view
  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const coords: [number, number][] = [];
    if (myCoords && typeof myCoords.latitude === 'number' && typeof myCoords.longitude === 'number' && !isNaN(myCoords.latitude) && !isNaN(myCoords.longitude)) {
      coords.push([myCoords.latitude, myCoords.longitude]);
    }
    if (session?.members) {
      Object.values(session.members).forEach((m) => {
        if (m && typeof m.latitude === 'number' && typeof m.longitude === 'number' && !isNaN(m.latitude) && !isNaN(m.longitude)) {
          coords.push([m.latitude, m.longitude]);
        }
      });
    }

    if (coords.length > 0) {
      try {
        mapInstanceRef.current.invalidateSize();
        const bounds = L.latLngBounds(coords);
        if (bounds.isValid()) {
          const size = mapInstanceRef.current.getSize();
          if (size && size.x > 0 && size.y > 0) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
          } else {
            mapInstanceRef.current.setView(bounds.getCenter(), 14);
          }
        }
      } catch (err) {
        console.warn('fitBounds in LiveBeaconMapModal caught:', err);
      }
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

  const handleNavigateToHost = (app: 'google' | 'waze' | 'apple' = 'google') => {
    if (!hostMember) {
      setRecenterToast(
        language === 'bm'
          ? '⚠️ Koordinat pencipta suar belum tersedia'
          : '⚠️ Host GPS fix not available yet'
      );
      setTimeout(() => setRecenterToast(null), 3000);
      return;
    }
    const lat = hostMember.latitude;
    const lon = hostMember.longitude;
    const travelParam = routeTravelMode === 'walking' ? 'walking' : 'driving';
    let url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=${travelParam}`;
    if (app === 'waze') {
      url = `https://www.waze.com/ul?ll=${lat},${lon}&navigate=yes`;
    } else if (app === 'apple') {
      const appleDir = routeTravelMode === 'walking' ? 'w' : 'd';
      url = `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=${appleDir}`;
    }
    window.open(url, '_blank');
  };

  const myLandmark = myCoords
    ? getNearestHighlandLandmark(myCoords.latitude, myCoords.longitude)
    : 'Cameron Highlands';

  const remainingHours = session
    ? Math.max(0, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / (3600 * 1000)))
    : 0;

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[96vh] sm:h-[90vh] rounded-t-3xl sm:rounded-3xl bg-stone-900 border border-emerald-500/40 shadow-2xl flex flex-col overflow-hidden text-stone-100 relative mt-auto sm:mt-0"
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
              onClick={handleCloseWithConfirm}
              className="p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 ml-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher - Visual View Controls */}
        <div className="px-3 sm:px-6 py-2 bg-stone-900 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'map', label: language === 'bm' ? 'Peta' : 'Live Map', icon: Radio },
            { id: 'compass', label: language === 'bm' ? 'Kompas' : 'Compass', icon: Compass },
            { id: 'members', label: language === 'bm' ? 'Ahli' : 'Members', icon: Users },
            { id: 'chat', label: language === 'bm' ? 'Sembang' : 'Chat', icon: MessageSquare },
            { id: 'walkie', label: 'PTT Radio', icon: Mic },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-400/50'
                  : 'bg-stone-800/50 text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
              <span>{tab.label}</span>
              {tab.id === 'chat' && session?.messages && session.messages.length > 0 && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-emerald-500 text-stone-950 text-[10px] flex items-center justify-center font-black">
                  {session.messages.length > 9 ? '9+' : session.messages.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Recenter Toast Feedback */}
        {recenterToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[450] px-3.5 py-1.5 rounded-full bg-stone-900/95 border border-emerald-400 text-emerald-300 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>{recenterToast}</span>
          </div>
        )}

        {/* Proximity Alert Overlay */}
        {showProximityToast && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[460] w-[90%] max-w-sm px-4 py-3 rounded-2xl bg-emerald-600 border-2 border-emerald-400 text-white shadow-[0_0_40px_rgba(16,185,129,0.5)] flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Navigation className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Proximity Alert</div>
              <div className="text-xs font-black leading-tight">{showProximityToast}</div>
            </div>
            <button onClick={() => setShowProximityToast(null)} className="p-1 hover:bg-white/10 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* AI Telemetry Anomaly Alert Overlay */}
        {telemetryAnomaly && (
          <div className="absolute top-44 left-1/2 -translate-x-1/2 z-[460] w-[90%] max-w-sm px-4 py-3 rounded-2xl bg-rose-600 border-2 border-rose-400 text-white shadow-[0_0_40px_rgba(225,29,72,0.5)] flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">AI Security Alert</div>
              <div className="text-xs font-black leading-tight">{telemetryAnomaly.message}</div>
            </div>
            <button onClick={() => setTelemetryAnomaly(null)} className="p-1 hover:bg-white/10 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Modal Content Body */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-6 py-3.5 space-y-4 touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {activeTab === 'map' && (
            <div className="flex flex-col h-[500px] sm:h-[600px] space-y-3 animate-in fade-in duration-200">
              {/* Quick Toolbar & Highland Landmark pill */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-950/70 border border-white/10 p-2 rounded-2xl text-[10px] sm:text-xs">
                <div className="flex items-center gap-2 text-stone-300 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block shrink-0" />
                  <span className="truncate">
                    <span className="text-stone-400 mr-1">{language === 'bm' ? 'Posisi:' : 'Loc:'}</span>
                    <span className="text-emerald-300 font-bold">{myLandmark}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleRecenter}
                    className="px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>{language === 'bm' ? 'Pusat' : 'Center'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFitAll}
                    className="px-2 py-1 rounded-lg bg-stone-800 text-stone-300 border border-white/10 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>{language === 'bm' ? 'Semua' : 'All'}</span>
                  </button>
                </div>
              </div>

              {/* Interactive Leaflet Map Container - Now taking flex-1 */}
              <div className="relative flex-1 w-full rounded-2xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-stone-950">
                <div ref={mapContainerRef} className="w-full h-full z-10" />
                
                {/* Floating Map Controls */}
                <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
                  <button type="button" onClick={handleRecenter} className="p-2.5 rounded-xl bg-emerald-600/95 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-xl backdrop-blur-md cursor-pointer transition-transform active:scale-95">
                    <Crosshair className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Travel Mode & Host Nav Overlay (Bottom Center on Map) */}
                {!isMeHost && hostMember && (
                  <div className="absolute bottom-3 left-3 right-3 z-[400] pointer-events-none">
                    <div className="bg-stone-900/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-2.5 flex items-center justify-between gap-3 shadow-2xl pointer-events-auto max-w-sm mx-auto">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                          <Navigation className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 leading-tight">
                          <div className="text-[10px] font-black text-amber-400 uppercase">Host</div>
                          <div className="text-xs font-bold text-white truncate">{hostName}</div>
                          <div className="text-[10px] text-emerald-400 font-mono flex flex-wrap items-center gap-1.5">
                            <span>{myCoords ? formatDistance(calculateHaversineDistance(myCoords.latitude, myCoords.longitude, hostMember.latitude, hostMember.longitude)) : '---'}</span>
                            <span className="text-stone-600">|</span>
                            <span>{myCoords ? getCompassCardinal(calculateBearing(myCoords.latitude, myCoords.longitude, hostMember.latitude, hostMember.longitude)) : '-'}</span>
                            {predictiveEta && (
                              <>
                                <span className="text-stone-600">|</span>
                                <span className="text-amber-400 flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  AI ETA: {Math.max(1, Math.round(predictiveEta / 60))}m
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center p-0.5 rounded-lg bg-stone-950 border border-white/5">
                          <button
                            onClick={() => setRouteTravelMode('walking')}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${routeTravelMode === 'walking' ? 'bg-emerald-600 text-white shadow-sm' : 'text-stone-500'}`}
                            title="Walking Mode"
                          >
                            <Footprints className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setRouteTravelMode('driving')}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${routeTravelMode === 'driving' ? 'bg-blue-600 text-white shadow-sm' : 'text-stone-500'}`}
                            title="Driving Mode"
                          >
                            <Car className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleNavigateToHost('google')}
                          className="p-2 rounded-xl bg-emerald-600 text-white shadow-lg active:scale-95 transition-all cursor-pointer"
                        >
                          <Navigation className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'compass' && (
            <div className="h-[500px] sm:h-[600px] flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-300 relative overflow-hidden">
              {/* Tactical Background Grid */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                {/* Outer Tactical Rings */}
                <div className="absolute inset-0 rounded-full border-2 border-stone-800" />
                <div className="absolute inset-2 rounded-full border border-stone-800/40" />
                <div className="absolute inset-8 rounded-full border-4 border-stone-900/60 shadow-inner" />
                
                {/* Degree Ticks */}
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="absolute inset-0 flex justify-center" style={{ transform: `rotate(${i * 30}deg)` }}>
                    <div className={`w-0.5 h-3 rounded-full ${i % 3 === 0 ? 'bg-stone-500 h-5 w-1' : 'bg-stone-700'}`} />
                  </div>
                ))}
                
                {/* Compass Indicators */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-mono text-sm font-black">
                  <span className="absolute top-4 text-emerald-500 shadow-sm">000°</span>
                  <span className="absolute right-4 text-stone-500">090°</span>
                  <span className="absolute bottom-4 text-stone-500">180°</span>
                  <span className="absolute left-4 text-stone-500">270°</span>
                  
                  <span className="absolute top-10 text-emerald-400">N</span>
                  <span className="absolute right-10 text-stone-400">E</span>
                  <span className="absolute bottom-10 text-stone-400">S</span>
                  <span className="absolute left-10 text-stone-400">W</span>
                </div>

                {/* Compass Needle to Host */}
                {myCoords && hostMember && (
                  <div 
                    className="relative w-full h-full transition-transform duration-700 ease-out"
                    style={{ transform: `rotate(${calculateBearing(myCoords.latitude, myCoords.longitude, hostMember.latitude, hostMember.longitude)}deg)` }}
                  >
                    {/* Ghost Needle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full w-2 h-24 sm:h-32 bg-emerald-500/10 blur-md rounded-full" />
                    {/* Primary Needle */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[95%] w-1.5 h-24 sm:h-32 bg-gradient-to-t from-emerald-400 to-emerald-600 rounded-full shadow-[0_0_20px_#10b981]" />
                    {/* Needle Tail */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 h-8 w-1 bg-stone-700 rounded-full" />
                    {/* Hub */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-stone-900 border-2 border-emerald-500 z-10 shadow-lg flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 z-10">
                <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-black uppercase tracking-[0.2em] inline-block">
                  {language === 'bm' ? 'SISTEM PENJEJAKAN TAKTIKAL' : 'TACTICAL TRACKING HUD'}
                </div>

                {/* Proximity Status Badge */}
                {!isMeHost && proximityLevel !== 'none' && (
                  <div className={`mt-2 px-3 py-1 rounded-lg border font-black text-[10px] uppercase flex items-center gap-2 animate-pulse mx-auto w-fit ${
                    proximityLevel === 'arrived' 
                      ? 'bg-emerald-600 border-emerald-400 text-white' 
                      : 'bg-amber-600/20 border-amber-500/50 text-amber-400'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${proximityLevel === 'arrived' ? 'bg-white' : 'bg-amber-400'} animate-ping`} />
                    <span>{proximityLevel === 'arrived' ? (language === 'bm' ? 'TELAH SAMPAI' : 'ARRIVED') : (language === 'bm' ? 'BERDEKATAN' : 'IN RANGE')}</span>
                  </div>
                )}
                <div className="text-5xl sm:text-6xl font-black text-white font-heading drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  {myCoords && hostMember ? (
                    formatDistance(calculateHaversineDistance(myCoords.latitude, myCoords.longitude, hostMember.latitude, hostMember.longitude))
                  ) : '---'}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="text-emerald-300 font-bold text-lg">
                    {hostMember ? hostMember.name : 'Waiting for Host...'}
                  </div>
                  <div className="text-stone-400 font-mono text-xs flex items-center gap-2">
                    <span className="bg-stone-800 px-2 py-0.5 rounded border border-white/5">{hostMember ? getCompassCardinal(calculateBearing(myCoords?.latitude || 0, myCoords?.longitude || 0, hostMember.latitude, hostMember.longitude)) : '-'}</span>
                    <span className="bg-stone-800 px-2 py-0.5 rounded border border-white/5">{hostMember ? `${Math.round(calculateBearing(myCoords?.latitude || 0, myCoords?.longitude || 0, hostMember.latitude, hostMember.longitude))}°` : '-'}</span>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-xs pt-2 flex gap-3">
                <button
                  onClick={() => handleNavigateToHost('google')}
                  className="flex-1 p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex flex-col items-center gap-1.5 transition-all shadow-xl active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-5 h-5" />
                  <span>START NAV</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{language === 'bm' ? 'Ahli Kumpulan' : 'Group Members'} ({sortedMembers.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {/* Sorted Members List matching Map Pins exactly */}
                {sortedMembers.map((m, index) => {
                    const isMe = m.id === memberId;
                    const isHost = m.id === session?.createdBy;
                    const pinNumber = index + 1;
                    const stale = isLocationStale(m.updatedAt);
                    const dist = myCoords ? formatDistance(calculateHaversineDistance(myCoords.latitude, myCoords.longitude, m.latitude, m.longitude)) : '---';
                    
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedMemberId(m.id);
                          setActiveTab('map');
                        }}
                        className={`p-4 rounded-3xl bg-stone-900 border transition-all flex items-center justify-between text-left group active:scale-[0.98] cursor-pointer relative ${
                          isMe ? 'border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-emerald-950/20' : 
                          isHost ? 'border-amber-400/40 ring-1 ring-amber-400/20 shadow-amber-950/20' : 
                          'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg" style={{ backgroundColor: m.avatarColor }}>
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded-lg border text-[9px] font-mono font-bold ${
                              isHost ? 'bg-amber-500 text-stone-950 border-amber-400' : 'bg-stone-950 text-stone-400 border-white/10'
                            }`}>
                              {isHost ? '👑 #1' : `#${pinNumber}`}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-black text-white flex items-center gap-1.5">
                              <span className="truncate max-w-[100px]">{m.name}</span>
                              {isMe && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md font-black">YOU</span>}
                            </div>
                            <div className="text-[11px] text-stone-400 font-mono mt-0.5 truncate max-w-[120px]">{m.nearestLandmark || 'Highlands'}</div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <div className="text-xs font-mono font-bold text-emerald-400">{isMe ? '±' + (myCoords?.accuracy || 0) + 'm' : dist}</div>
                          {m.batteryLevel !== undefined && m.batteryLevel !== null && (
                            <div className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold flex items-center gap-1 border ${
                              m.batteryLevel < 20 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' :
                              m.batteryLevel < 50 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                              'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                              <Battery className="w-2.5 h-2.5" />
                              <span>{m.batteryLevel}%</span>
                            </div>
                          )}
                          <div className="text-[10px] text-stone-500">{stale ? '⚠️ Stale' : formatTimeAgo(m.updatedAt)}</div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col h-[450px] sm:h-[550px] bg-stone-950/80 rounded-3xl border border-white/10 overflow-hidden animate-in slide-in-from-right-2 duration-300">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {session?.messages && session.messages.length > 0 ? (
                  session.messages.map((msg, idx) => {
                    const isMe = msg.senderId === memberId;
                    return (
                      <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] space-y-1 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && (
                            <div className="flex items-center gap-2 px-1">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: msg.senderColor || '#10b981' }} />
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">{msg.senderName}</span>
                            </div>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-lg ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-stone-800 text-stone-100 rounded-tl-none'}`}>
                            {msg.text}
                          </div>
                          <div className={`text-[9px] font-mono text-stone-500 px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                    <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center border border-white/5">
                      <MessageSquare className="w-8 h-8 text-stone-500" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Party channel is silent...</p>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSendChatMessage} className="p-3 bg-stone-900 border-t border-white/10 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder={language === 'bm' ? 'Mesej kumpulan...' : 'Group message...'}
                  className="flex-1 bg-stone-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="submit"
                  disabled={!chatInputText.trim() || sendingChat}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
                >
                  <Send className={`w-4 h-4 ${sendingChat ? 'animate-ping' : ''}`} />
                </button>
              </form>
            </div>
          )}

          {activeTab === 'walkie' && (
            <div className="animate-in slide-in-from-right-2 duration-300">
              <WalkieTalkieLive
                session={session}
                memberId={memberId}
                memberName={memberName}
                avatarColor={avatarColor}
                language={language}
                compactMode={true}
              />
            </div>
          )}
        </div>

        {/* Modal Footer Section (Stats) */}
        <div className="px-4 sm:px-6 py-2.5 bg-stone-950 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-stone-500 uppercase tracking-widest shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Radio className="w-3 h-3 text-emerald-500" /> {language === 'bm' ? 'PANCARAN LIVE' : 'LIVE UPLINK'}</span>
            <span className="hidden sm:flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-500" /> {language === 'bm' ? 'AES-256 SELAMAT' : 'AES-256 SECURED'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{remainingHours}h {language === 'bm' ? 'TINGAL' : 'REMAINING'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
        </div>
      </div>

      {/* QR Code Preview Modal Overlay */}
      {showQrPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
            <button
              onClick={() => setShowQrPreview(false)}
              className="absolute top-4 right-4 p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-white/10 hover:border-emerald-500/50 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <QrCode className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white font-heading">
                {language === 'bm' ? 'Imbas QR Suar Party' : 'Scan Party Beacon QR'}
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                {language === 'bm'
                  ? 'Imbas QR ini menggunakan kamera telefon untuk terus membuka peta suar live.'
                  : 'Scan with mobile camera to open the live party beacon map instantly.'}
              </p>
            </div>

            {qrCodeDataUrl ? (
              <div className="p-3 bg-white rounded-2xl shadow-inner inline-block mx-auto border-2 border-emerald-500/40">
                <img src={qrCodeDataUrl} alt="Beacon QR Code" className="w-52 h-52 mx-auto" />
              </div>
            ) : (
              <div className="w-52 h-52 bg-stone-800 rounded-2xl flex items-center justify-center mx-auto text-stone-500 animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
            )}

            <div className="p-3 bg-stone-950 border border-white/10 rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-stone-400 font-bold">{language === 'bm' ? 'KOD SUAR:' : 'BEACON CODE:'}</span>
              <span className="text-emerald-400 font-black text-sm tracking-wider">{session?.code}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const shareUrl = `${window.location.origin}${window.location.pathname}?beacon=${session?.code}`;
                  navigator.clipboard.writeText(shareUrl);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2500);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? (language === 'bm' ? 'Pautan Disalin!' : 'Link Copied!') : (language === 'bm' ? 'Salin Pautan' : 'Copy Invite Link')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Leave Session Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-stone-900 border border-rose-500/30 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto">
              <LogOut className="w-8 h-8 text-rose-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white font-heading">
                {language === 'bm' ? 'Keluar Kumpulan?' : 'Leave Group?'}
              </h3>
              <p className="text-sm text-stone-400 leading-relaxed">
                {language === 'bm'
                  ? 'Adakah anda pasti mahu keluar dari sesi suar kumpulan ini? Perkongsian lokasi anda akan dihentikan.'
                  : 'Are you sure you want to leave this group beacon session? Your live location sharing will stop.'}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-xl shadow-rose-950/40 transition-all active:scale-95 cursor-pointer"
              >
                {language === 'bm' ? 'Keluar Kumpulan' : 'Leave Group'}
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-sm transition-all cursor-pointer"
              >
                {language === 'bm' ? 'Kekal Dalam Kumpulan' : 'Stay in Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
