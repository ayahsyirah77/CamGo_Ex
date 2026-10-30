/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Users,
  Compass,
  Radio,
  MapPin,
  Share2,
  Copy,
  Check,
  Clock,
  Battery,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Navigation,
  ShieldCheck,
  Eye,
  EyeOff,
  Crosshair,
  Footprints,
  Info,
  Maximize2,
  X,
  Sparkles,
  Layers,
  ArrowUpRight,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Language, BeaconSession, BeaconMember } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import {
  calculateHaversineDistance,
  formatDistance,
  calculateBearing,
  getCompassCardinal,
  getNearestHighlandLandmark,
  isLocationStale,
  isLocationActive,
  formatTimeAgo,
  generateBeaconCode,
} from '../utils/beaconUtils';
import { LiveBeaconMapModal } from './LiveBeaconMapModal';

interface FindMyPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const AVATAR_COLORS = [
  { name: 'Emerald', value: '#10b981', ring: 'ring-emerald-500' },
  { name: 'Sky Blue', value: '#0ea5e9', ring: 'ring-sky-500' },
  { name: 'Amber', value: '#f59e0b', ring: 'ring-amber-500' },
  { name: 'Rose', value: '#f43f5e', ring: 'ring-rose-500' },
  { name: 'Violet', value: '#8b5cf6', ring: 'ring-violet-500' },
  { name: 'Teal', value: '#14b8a6', ring: 'ring-teal-500' },
];

const LOCAL_STORAGE_KEY_SESSION = 'camgo_party_active_session_code';
const LOCAL_STORAGE_KEY_MEMBER_ID = 'camgo_party_member_id';
const LOCAL_STORAGE_KEY_MEMBER_NAME = 'camgo_party_member_name';
const LOCAL_STORAGE_KEY_MEMBER_COLOR = 'camgo_party_member_color';

// Preset locations in Cameron Highlands for demo/simulation walk
const DEMO_WAYPOINTS = [
  { name: 'Kea Farm Vegetable & Strawberry Market', lat: 4.5050, lon: 101.4080 },
  { name: 'The Sheep Sanctuary & Bee Farm', lat: 4.5042, lon: 101.4075 },
  { name: 'Flora Park Entrance & Steps', lat: 4.5085, lon: 101.4095 },
  { name: 'Brinchang Golden Hills Night Market Stalls', lat: 4.4920, lon: 101.3855 },
  { name: 'Boh Tea Sungai Palas Tea Centre Outlook', lat: 4.5173, lon: 101.4072 },
  { name: 'Gunung Brinchang Trailhead Entrance', lat: 4.5180, lon: 101.3840 },
  { name: 'Tanah Rata Town Square Park', lat: 4.4712, lon: 101.3800 },
];

export const FindMyPartyModal: React.FC<FindMyPartyModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  // Member profile state
  const [memberId, setMemberId] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY_MEMBER_ID) || 'mem_' + Math.random().toString(36).substring(2, 9);
  });
  const [memberName, setMemberName] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY_MEMBER_NAME) || '';
  });
  const [avatarColor, setAvatarColor] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY_MEMBER_COLOR) || AVATAR_COLORS[0].value;
  });

  // Session state
  const [session, setSession] = useState<BeaconSession | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [newSessionName, setNewSessionName] = useState<string>('Cameron Highlands Group');
  const [expiryHours, setExpiryHours] = useState<2 | 8 | 24>(8);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [preGeneratedCode, setPreGeneratedCode] = useState<string>(() => generateBeaconCode());
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showLiveMapModal, setShowLiveMapModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Live Location & Tracking state
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [showLocationHistory, setShowLocationHistory] = useState<boolean>(false);
  const [pathHistory, setPathHistory] = useState<Record<string, { lat: number; lng: number; time: number }[]>>({});
  const [myCoords, setMyCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    heading: number | null;
    speed: number | null;
    altitude: number | null;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [simulationActive, setSimulationActive] = useState<boolean>(false);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'compass' | 'members'>('map');

  // Dynamic Map Container Height (for mobile keyboard toggles, device orientation & viewport shifts)
  const [dynamicMapHeight, setDynamicMapHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 640) return 400;
      const vh = window.visualViewport?.height || window.innerHeight;
      return Math.max(180, Math.min(300, Math.floor(vh * 0.35)));
    }
    return 280;
  });

  // Modal Card and Map references
  const modalCardRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const circlesRef = useRef<{ [key: string]: L.Circle }>({});
  const polylinesRef = useRef<{ [key: string]: L.Polyline }>({});
  const watchIdRef = useRef<number | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);

  // Dynamic ResizeObserver & window.resize / visualViewport listener
  useEffect(() => {
    if (!isOpen) return;

    const computeAndApplyHeight = () => {
      if (typeof window === 'undefined') return;

      const isDesktop = window.innerWidth >= 640;
      if (isDesktop) {
        setDynamicMapHeight(400);
      } else {
        // Measure visible viewport height (which shrinks dynamically when virtual keyboard opens)
        const visibleHeight = window.visualViewport?.height || window.innerHeight;
        
        let calculatedHeight: number;
        if (visibleHeight < 500) {
          // Keyboard is open or small landscape mode
          calculatedHeight = Math.max(170, Math.floor(visibleHeight * 0.32));
        } else if (visibleHeight < 650) {
          calculatedHeight = Math.max(200, Math.floor(visibleHeight * 0.36));
        } else {
          calculatedHeight = Math.min(320, Math.max(220, Math.floor(visibleHeight * 0.38)));
        }

        setDynamicMapHeight(calculatedHeight);
      }

      // Immediately inform Leaflet map instance to recalculate tiles & viewport bounds
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    computeAndApplyHeight();

    // 1. ResizeObserver on the modal card
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && modalCardRef.current) {
      resizeObserver = new ResizeObserver(() => {
        computeAndApplyHeight();
      });
      resizeObserver.observe(modalCardRef.current);
    }

    // 2. Window and visualViewport resize listeners for mobile keyboard toggling
    window.addEventListener('resize', computeAndApplyHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', computeAndApplyHeight);
    }

    // Delayed re-checks as modal mount animations settle
    const timer1 = setTimeout(computeAndApplyHeight, 150);
    const timer2 = setTimeout(computeAndApplyHeight, 350);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', computeAndApplyHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', computeAndApplyHeight);
      }
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen, activeTab]);

  // Sync member profile with localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_MEMBER_ID, memberId);
    if (memberName) localStorage.setItem(LOCAL_STORAGE_KEY_MEMBER_NAME, memberName);
    localStorage.setItem(LOCAL_STORAGE_KEY_MEMBER_COLOR, avatarColor);
  }, [memberId, memberName, avatarColor]);

  // Read Battery status if available
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          setBatteryLevel(Math.round(battery.level * 100));
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });
        })
        .catch(() => {});
    }
  }, []);

  // Check saved session on mount or modal open
  useEffect(() => {
    if (!isOpen) return;

    const savedCode = localStorage.getItem(LOCAL_STORAGE_KEY_SESSION);
    if (savedCode && !session) {
      subscribeToSession(savedCode);
    }
  }, [isOpen]);

  // Lock body scroll when modal is open to ensure seamless mobile scrolling
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Firestore real-time listener for current session
  const subscribeToSession = (codeToJoin: string) => {
    const formattedCode = codeToJoin.trim().toUpperCase();
    setLoading(true);
    setErrorMsg(null);

    const sessionRef = doc(db, 'beacon_sessions', formattedCode);
    const unsubscribe = onSnapshot(
      sessionRef,
      (docSnap) => {
        setLoading(false);
        if (docSnap.exists()) {
          const data = docSnap.data() as BeaconSession;
          // Check if session has expired
          if (new Date(data.expiresAt).getTime() < Date.now() || data.status === 'ended') {
            setErrorMsg(
              language === 'bm'
                ? 'Sesi penjejakan ini telah tamat tempoh.'
                : 'This beacon session has expired.'
            );
            setSession(null);
            localStorage.removeItem(LOCAL_STORAGE_KEY_SESSION);
            return;
          }

          setSession(data);
          localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, formattedCode);

          // If current user is recorded in members and isSharing is true, keep local state
          if (data.members && data.members[memberId]) {
            setIsSharing(data.members[memberId].isSharing);
          }
        } else {
          setErrorMsg(
            language === 'bm'
              ? `Kod sesi "${formattedCode}" tidak dijumpai.`
              : `Session code "${formattedCode}" not found. Verify code and try again.`
          );
          setSession(null);
          localStorage.removeItem(LOCAL_STORAGE_KEY_SESSION);
        }
      },
      (err) => {
        setLoading(false);
        console.error('Error listening to beacon session:', err);
        setErrorMsg(
          language === 'bm'
            ? 'Ralat sambungan pangkalan data live.'
            : 'Error connecting to live beacon database.'
        );
      }
    );

    return unsubscribe;
  };

  // Helper: Silently verify Firebase state (beacon_sessions allows public read/write per security rules)
  const ensureFirebaseAuth = async () => {
    // beacon_sessions has public Firestore rules (allow read, write: if true;).
    // Never call signInAnonymously here because if the Anonymous provider is not enabled
    // in Firebase Console, it throws auth/admin-restricted-operation.
    return;
  };

  // Auto-generate QR code image whenever active code or pre-generated code updates
  const activeQrCode = session?.code || preGeneratedCode;
  useEffect(() => {
    if (!activeQrCode) return;
    let isMounted = true;
    const baseUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://camgo.app';
    const shareUrl = `${baseUrl}?beacon=${activeQrCode}`;

    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#064e3b', // Deep Cameron emerald
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR Code:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [activeQrCode]);

  // Check URL search parameters for shared invite link (?beacon=CAMGO-TRIP-xxx)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const beaconParam = params.get('beacon') || params.get('party');
      if (beaconParam && !session) {
        setJoinCodeInput(beaconParam.trim().toUpperCase());
      }
    }
  }, [session]);

  // Copy direct share link
  const handleCopyShareLink = () => {
    const code = session?.code || preGeneratedCode;
    const baseUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://camgo.app';
    const shareUrl = `${baseUrl}?beacon=${code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const code = session?.code || preGeneratedCode;
    const name = session?.name || newSessionName || 'Cameron Highlands Group';
    const baseUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://camgo.app';
    const shareUrl = `${baseUrl}?beacon=${code}`;
    const text = `🌲 Join our "${name}" live Group Beacon in Cameron Highlands!\n\n📍 Real-time GPS sync & compass\n🔑 Code: ${code}\n🔗 Instant Link: ${shareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Create new session
  const handleCreateSession = async () => {
    const effectiveMemberName = memberName.trim() || 'Highland Companion';
    if (!memberName.trim()) {
      setMemberName('Highland Companion');
    }

    setLoading(true);
    setErrorMsg(null);

    const newCode = (preGeneratedCode || generateBeaconCode()).trim().toUpperCase().replace(/\s+/g, '');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryHours * 3600 * 1000).toISOString();

    const initialLat = myCoords?.latitude || 4.5050; // Default to Kea Farm
    const initialLon = myCoords?.longitude || 101.4080;

    const initialMember: BeaconMember = {
      id: memberId,
      name: effectiveMemberName,
      avatarColor,
      latitude: initialLat,
      longitude: initialLon,
      accuracy: myCoords?.accuracy || 15,
      heading: myCoords?.heading || null,
      speed: myCoords?.speed || null,
      altitude: myCoords?.altitude || null,
      batteryLevel,
      isSharing: true,
      updatedAt: now.toISOString(),
      nearestLandmark: getNearestHighlandLandmark(initialLat, initialLon),
    };

    const newSessionData: BeaconSession = {
      id: newCode,
      code: newCode,
      name: newSessionName.trim() || 'Cameron Highlands Group',
      createdBy: memberId,
      createdByName: effectiveMemberName,
      createdAt: now.toISOString(),
      expiresAt,
      durationHours: expiryHours,
      status: 'active',
      members: {
        [memberId]: initialMember,
      },
    };

    try {
      if (db) {
        await setDoc(doc(db, 'beacon_sessions', newCode), newSessionData);
      }
      setSession(newSessionData);
      setIsSharing(true);
      localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, newCode);
      subscribeToSession(newCode);
      setShowLiveMapModal(true); // Open live interactive map pop-up showing exact location
    } catch (err: any) {
      console.warn('Beacon write notice (offline or connecting):', err);
      // Graceful fallback: maintain active local beacon state so user is never blocked
      setSession(newSessionData);
      setIsSharing(true);
      localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, newCode);
      setShowLiveMapModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Join existing session
  const handleJoinSession = async () => {
    if (!joinCodeInput.trim()) {
      setErrorMsg(language === 'bm' ? 'Sila masukkan kod sesi.' : 'Please enter session code.');
      return;
    }
    
    const effectiveMemberName = memberName.trim() || 'Highland Companion';
    if (!memberName.trim()) {
      setMemberName('Highland Companion');
    }

    setLoading(true);
    setErrorMsg(null);
    await ensureFirebaseAuth();
    const code = joinCodeInput.trim().toUpperCase().replace(/\s+/g, '');

    const initialLat = myCoords?.latitude || 4.5050;
    const initialLon = myCoords?.longitude || 101.4080;

    const selfMember: BeaconMember = {
      id: memberId,
      name: effectiveMemberName,
      avatarColor,
      latitude: initialLat,
      longitude: initialLon,
      accuracy: myCoords?.accuracy || 20,
      heading: myCoords?.heading || null,
      speed: myCoords?.speed || null,
      altitude: myCoords?.altitude || null,
      batteryLevel,
      isSharing: true,
      updatedAt: new Date().toISOString(),
      nearestLandmark: getNearestHighlandLandmark(initialLat, initialLon),
    };

    try {
      const sessionRef = doc(db, 'beacon_sessions', code);
      const snap = await getDoc(sessionRef);

      if (snap.exists()) {
        const sessionData = snap.data() as BeaconSession;
        if (new Date(sessionData.expiresAt).getTime() < Date.now() || sessionData.status === 'ended') {
          setErrorMsg(
            language === 'bm'
              ? 'Sesi ini telah tamat tempoh.'
              : 'This session has already expired.'
          );
          setLoading(false);
          return;
        }

        await updateDoc(sessionRef, {
          [`members.${memberId}`]: selfMember,
        });

        setIsSharing(true);
        localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, code);
        subscribeToSession(code);
        setShowLiveMapModal(true); // Open live interactive map pop-up showing exact location
      } else {
        // Fallback for custom code or offline join: construct session locally
        const now = new Date();
        const fallbackSession: BeaconSession = {
          id: code,
          code: code,
          name: `Highland Beacon (${code})`,
          createdBy: 'host_group',
          createdByName: 'Group Leader',
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 8 * 3600 * 1000).toISOString(),
          durationHours: 8,
          status: 'active',
          members: {
            [memberId]: selfMember,
          },
        };

        if (db) {
          try {
            await setDoc(sessionRef, fallbackSession);
          } catch (e) {
            console.warn('Firestore setDoc fallback warning:', e);
          }
        }

        setSession(fallbackSession);
        setIsSharing(true);
        localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, code);
        subscribeToSession(code);
        setShowLiveMapModal(true);
      }
    } catch (err: any) {
      console.warn('Joining session with local fallback state:', err);
      const now = new Date();
      const fallbackSession: BeaconSession = {
        id: code,
        code: code,
        name: `Highland Beacon (${code})`,
        createdBy: 'host_group',
        createdByName: 'Group Leader',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 8 * 3600 * 1000).toISOString(),
        durationHours: 8,
        status: 'active',
        members: {
          [memberId]: selfMember,
        },
      };

      setSession(fallbackSession);
      setIsSharing(true);
      localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, code);
      setShowLiveMapModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Leave session
  const handleLeaveSession = async () => {
    if (!session) return;
    const confirmLeave = window.confirm(
      language === 'bm'
        ? 'Adakah anda pasti mahu keluar dari kumpulan penjejakan ini?'
        : 'Are you sure you want to leave this tracking group?'
    );
    if (!confirmLeave) return;

    try {
      const sessionRef = doc(db, 'beacon_sessions', session.code);
      await updateDoc(sessionRef, {
        [`members.${memberId}`]: deleteField(),
      });
    } catch (e) {
      console.error('Error removing self from session:', e);
    }

    setSession(null);
    setIsSharing(false);
    localStorage.removeItem(LOCAL_STORAGE_KEY_SESSION);
  };

  // End session for all (if creator)
  const handleEndSession = async () => {
    if (!session) return;
    const confirmEnd = window.confirm(
      language === 'bm'
        ? 'Tamatkan sesi perkongsian lokasi ini untuk semua ahli?'
        : 'End this live location session for all group members?'
    );
    if (!confirmEnd) return;

    try {
      const sessionRef = doc(db, 'beacon_sessions', session.code);
      await updateDoc(sessionRef, {
        status: 'ended',
      });
    } catch (e) {
      console.error('Error ending session:', e);
    }

    setSession(null);
    setIsSharing(false);
    localStorage.removeItem(LOCAL_STORAGE_KEY_SESSION);
  };

  // Sync coordinates to Firestore (Throttled to avoid excess network / database writes)
  const syncCoordinatesToFirestore = async (coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    heading: number | null;
    speed: number | null;
    altitude: number | null;
  }) => {
    if (!session || !isSharing) return;

    const now = Date.now();
    // Throttle to at most once every 3.5 seconds
    if (now - lastSyncTimestampRef.current < 3500) {
      return;
    }
    lastSyncTimestampRef.current = now;

    try {
      const sessionRef = doc(db, 'beacon_sessions', session.code);
      const landmark = getNearestHighlandLandmark(coords.latitude, coords.longitude);

      await updateDoc(sessionRef, {
        [`members.${memberId}.latitude`]: coords.latitude,
        [`members.${memberId}.longitude`]: coords.longitude,
        [`members.${memberId}.accuracy`]: coords.accuracy,
        [`members.${memberId}.heading`]: coords.heading,
        [`members.${memberId}.speed`]: coords.speed,
        [`members.${memberId}.altitude`]: coords.altitude,
        [`members.${memberId}.batteryLevel`]: batteryLevel,
        [`members.${memberId}.isSharing`]: true,
        [`members.${memberId}.updatedAt`]: new Date().toISOString(),
        [`members.${memberId}.nearestLandmark`]: landmark,
      });
    } catch (e) {
      console.error('Error updating live beacon coordinates in Firestore:', e);
    }
  };

  // Geolocation watchPosition handler
  useEffect(() => {
    if (!isSharing || simulationActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsError(
        language === 'bm'
          ? 'Peranti anda tidak menyokong geolokasi.'
          : 'Geolocation is not supported by your browser.'
      );
      return;
    }

    setGpsError(null);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
        };
        setMyCoords(coords);
        syncCoordinatesToFirestore(coords);
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
        setGpsError(
          language === 'bm'
            ? 'Gagal mendapatkan GPS. Pastikan izin lokasi dibenarkan.'
            : 'Unable to retrieve GPS. Ensure location permissions are granted.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isSharing, simulationActive, session?.code]);

  // Demo / Simulation Walker for Highlands Testing
  useEffect(() => {
    if (!simulationActive || !isSharing) return;

    let waypointIdx = 0;
    const interval = setInterval(() => {
      const base = DEMO_WAYPOINTS[waypointIdx % DEMO_WAYPOINTS.length];
      // small jitter
      const jitterLat = (Math.random() - 0.5) * 0.0003;
      const jitterLon = (Math.random() - 0.5) * 0.0003;
      const coords = {
        latitude: base.lat + jitterLat,
        longitude: base.lon + jitterLon,
        accuracy: 8,
        heading: Math.floor(Math.random() * 360),
        speed: 1.2,
        altitude: 1540 + Math.floor(Math.random() * 30),
      };
      setMyCoords(coords);
      syncCoordinatesToFirestore(coords);
      waypointIdx++;
    }, 4500);

    return () => clearInterval(interval);
  }, [simulationActive, isSharing, session?.code]);

  // Toggle Sharing ON/OFF
  const handleToggleSharing = async () => {
    const nextState = !isSharing;
    setIsSharing(nextState);

    if (session) {
      try {
        const sessionRef = doc(db, 'beacon_sessions', session.code);
        await updateDoc(sessionRef, {
          [`members.${memberId}.isSharing`]: nextState,
          [`members.${memberId}.updatedAt`]: new Date().toISOString(),
        });
      } catch (e) {
        console.error('Error toggling sharing in Firestore:', e);
      }
    }
  };

  // Copy session invite code
  const handleCopyCode = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Share session invite
  const handleShareSession = () => {
    if (!session) return;
    const shareText = `🏔️ Join our Cameron Highlands group beacon on CamGo!\nGroup: "${session.name}"\nInvite Code: ${session.code}\nView live companion coordinates on map.`;

    if (navigator.share) {
      navigator.share({
        title: `Join ${session.name} - CamGo Highlands Beacon`,
        text: shareText,
        url: window.location.href,
      }).catch(() => {});
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
    }
  };

    // Setup Leaflet Map
  useEffect(() => {
    if (!isOpen || activeTab !== 'map' || !mapContainerRef.current) return;

    const currentMapEl = mapContainerRef.current;

    if (!mapInstanceRef.current) {
      const map = L.map(currentMapEl, {
        center: [4.5050, 101.4080], // Kea Farm
        zoom: 15,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
    }

    // Touchstart listener to prevent browser scroll triggers from interrupting map panning on mobile devices
    const handleTouchStart = (e: TouchEvent) => {
      if (e.cancelable) {
        e.stopPropagation();
      }
    };

    currentMapEl.addEventListener('touchstart', handleTouchStart, { passive: true });

    // Force resize calculation
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      currentMapEl.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isOpen, activeTab]);

  // Clean up map when modal closes
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
      circlesRef.current = {};
    }
  }, [isOpen]);

  // Update map markers when members change
  useEffect(() => {
    if (!mapInstanceRef.current || activeTab !== 'map' || !session?.members) return;

    const map = mapInstanceRef.current;
    const membersList = Object.values(session.members);
    const bounds = L.latLngBounds([]);

    membersList.forEach((member) => {
      const isMe = member.id === memberId;
      const stale = isLocationStale(member.updatedAt);
      const isActivelySharing = member.isSharing;

      // Create Custom HTML Marker with radar pulse
      const iconHtml = `
        <div class="relative flex items-center justify-center">
          ${
            isActivelySharing && !stale
              ? `<div class="absolute w-10 h-10 rounded-full animate-ping opacity-60" style="background-color: ${member.avatarColor};"></div>`
              : ''
          }
          <div class="w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center font-bold text-white text-xs z-10 transition-transform ${
            stale ? 'opacity-70 grayscale-[50%]' : ''
          }" style="background-color: ${member.avatarColor};">
            ${member.name.charAt(0).toUpperCase()}
          </div>
          <div class="absolute -bottom-6 bg-stone-900/95 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/20 text-[9px] font-mono text-white whitespace-nowrap shadow-md z-20 flex items-center gap-1">
            <span>${member.name}</span>
            ${stale ? '<span class="text-amber-400 font-bold">⚠️</span>' : ''}
            ${isMe ? '<span class="text-emerald-400 font-bold">(You)</span>' : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-party-beacon-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const latLng = L.latLng(member.latitude, member.longitude);
      bounds.extend(latLng);

      // Marker management
      if (markersRef.current[member.id]) {
        markersRef.current[member.id].setLatLng(latLng);
        markersRef.current[member.id].setIcon(customIcon);
      } else {
        const marker = L.marker(latLng, { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          setSelectedCompanionId(member.id);
        });
        markersRef.current[member.id] = marker;
      }

      // Accuracy Circle management
      if (member.accuracy && isActivelySharing) {
        if (circlesRef.current[member.id]) {
          circlesRef.current[member.id].setLatLng(latLng);
          circlesRef.current[member.id].setRadius(member.accuracy);
        } else {
          const circle = L.circle(latLng, {
            radius: member.accuracy,
            color: member.avatarColor,
            fillColor: member.avatarColor,
            fillOpacity: 0.12,
            weight: 1,
          }).addTo(map);
          circlesRef.current[member.id] = circle;
        }
      }
    });

    // Remove any markers for departed members
    Object.keys(markersRef.current).forEach((existingId) => {
      if (!session.members || !session.members[existingId]) {
        markersRef.current[existingId].remove();
        delete markersRef.current[existingId];
        if (circlesRef.current[existingId]) {
          circlesRef.current[existingId].remove();
          delete circlesRef.current[existingId];
        }
      }
    });
  }, [session?.members, activeTab, memberId]);

  // Fit bounds to all companions
  const handleFitAllMembers = () => {
    if (!mapInstanceRef.current || !session?.members) return;
    const membersList = Object.values(session.members);
    if (membersList.length === 0) return;

    const bounds = L.latLngBounds(membersList.map((m) => [m.latitude, m.longitude]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
  };

  // Center on my location
  const handleCenterOnMe = () => {
    if (!mapInstanceRef.current || !myCoords) return;
    mapInstanceRef.current.setView([myCoords.latitude, myCoords.longitude], 17);
  };

  // Current selected companion for bearing/distance
  const companions = session?.members
    ? Object.values(session.members).filter((m) => m.id !== memberId)
    : [];
  const selectedCompanion =
    companions.find((c) => c.id === selectedCompanionId) || companions[0] || null;

  // Haversine & Bearing calculations from ME to selected companion
  let liveDistanceMeters = 0;
  let liveBearingDegrees = 0;
  let liveCardinal = 'N';

  if (myCoords && selectedCompanion) {
    liveDistanceMeters = calculateHaversineDistance(
      myCoords.latitude,
      myCoords.longitude,
      selectedCompanion.latitude,
      selectedCompanion.longitude
    );
    liveBearingDegrees = calculateBearing(
      myCoords.latitude,
      myCoords.longitude,
      selectedCompanion.latitude,
      selectedCompanion.longitude
    );
    liveCardinal = getCompassCardinal(liveBearingDegrees);
  }

  // Calculate remaining session time
  const remainingHours = session
    ? Math.max(
        0,
        Math.round(
          (new Date(session.expiresAt).getTime() - Date.now()) / (3600 * 1000)
        )
      )
    : 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[125] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={modalCardRef}
        className="w-full max-w-4xl h-[92vh] sm:h-[88vh] max-h-[94vh] sm:max-h-[88vh] flex flex-col min-h-0 bg-stone-900 border-t sm:border border-emerald-500/40 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-stone-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Sticky Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-white/10 bg-stone-900/95 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-heading font-extrabold text-stone-100 flex items-center gap-2">
                  <span>{language === 'bm' ? 'Cari Rakan Kumpulan' : 'Find My Party'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    {language === 'bm' ? 'Suar Kumpulan' : 'Group Beacon'}
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-stone-400 line-clamp-1">
                {language === 'bm'
                  ? 'Penjejakan koordinat live & kompas berasingan untuk pasar malam, ladang teh & denai'
                  : 'Live GPS sync & offline bearing for night markets, tea estates & hiking trails'}
              </p>
            </div>
          </div>

          {/* Clean icon-only X close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body with touch support and safe padding */}
        <div 
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 sm:px-6 py-4 pb-28 sm:pb-8 space-y-4 touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* If NO active session: Show Join / Create Screen */}
          {!session ? (
            <div className="max-w-xl mx-auto space-y-6 py-2">
              {/* Member Profile Setup Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-800/80 border border-white/10 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'bm' ? '1. Identiti Anda' : '1. Your Companion Identity'}</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      {language === 'bm' ? 'Nama Panggilan / Nama Anda' : 'Your Display Name'}
                    </label>
                    <input
                      type="text"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder={language === 'bm' ? 'Cth: Putri, Hazry, Ibu' : 'e.g., Sarah, Putri, Dad'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/15 text-stone-100 placeholder:text-stone-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      {language === 'bm' ? 'Warna Avatar Suar Anda' : 'Beacon Pin Color'}
                    </label>
                    <div className="flex items-center gap-2.5">
                      {AVATAR_COLORS.map((col) => (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() => setAvatarColor(col.value)}
                          className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                            avatarColor === col.value
                              ? 'scale-110 border-white ring-2 ' + col.ring
                              : 'border-transparent opacity-75 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: col.value }}
                          title={col.name}
                        >
                          {avatarColor === col.value && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message Alert */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Two Options: Create or Join */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option A: Create New Session */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-800/90 to-stone-900 border border-emerald-500/30 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>{language === 'bm' ? 'Cipta Sesi Baharu' : 'Create New Beacon'}</span>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {language === 'bm'
                        ? 'Cipta kod jemputan khas seperti CAMGO-TRIP-882 untuk dikongsi kepada keluarga atau rakan.'
                        : 'Generate a private invite code (e.g. CAMGO-TRIP-882) to share with your travel companions.'}
                    </p>

                    {/* Prominent Auto-Generated Code & QR Preview upfront */}
                    <div className="p-3 rounded-xl bg-stone-950/80 border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1">
                          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                          <span>{language === 'bm' ? 'Kod Dijana Automatik:' : 'Auto-Generated Code:'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreGeneratedCode(generateBeaconCode())}
                          className="px-2 py-0.5 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-emerald-300 border border-white/10 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Generate new code"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>{language === 'bm' ? 'Jana Lain' : 'Regenerate'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-mono font-black text-emerald-300 tracking-wider px-2.5 py-1 rounded-lg bg-stone-900 border border-emerald-500/40 select-all truncate">
                          {preGeneratedCode}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(preGeneratedCode);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            title="Copy code"
                          >
                            {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCode ? (language === 'bm' ? 'Disalin' : 'Copied') : (language === 'bm' ? 'Salin' : 'Copy')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Preview scannable QR code"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>QR</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                        {language === 'bm' ? 'Nama Kumpulan / Lawatan' : 'Group / Trip Name'}
                      </label>
                      <input
                        type="text"
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                        placeholder="e.g. Kea Farm Market Walk"
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-white/10 text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                        {language === 'bm' ? 'Tempoh Hayat Sesi (Tamat Automatik)' : 'Auto-Expiry Duration'}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([2, 8, 24] as const).map((hrs) => (
                          <button
                            key={hrs}
                            type="button"
                            onClick={() => setExpiryHours(hrs)}
                            className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                              expiryHours === hrs
                                ? 'bg-emerald-600 text-white border-emerald-400'
                                : 'bg-stone-900 text-stone-400 border-white/10 hover:text-white'
                            }`}
                          >
                            {hrs} {language === 'bm' ? 'Jam' : 'Hours'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateSession}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Radio className="w-4 h-4" />
                    )}
                    <span>{language === 'bm' ? 'Mula Suar Kumpulan' : 'Start Group Beacon'}</span>
                  </button>
                </div>

                {/* Option B: Join Existing Session */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-800/90 to-stone-900 border border-sky-500/30 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
                      <Users className="w-4 h-4" />
                      <span>{language === 'bm' ? 'Sertai Kumpulan Sedia Ada' : 'Join Existing Beacon'}</span>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {language === 'bm'
                        ? 'Ada kod atau imbas QR daripada rakan? Masukkan kod untuk menyegerakkan lokasi live.'
                        : 'Have an invite code or scanned a QR from your companion? Enter it below to sync live coordinates.'}
                    </p>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-stone-400">
                          {language === 'bm' ? 'Kod Jemputan Kumpulan' : 'Session Invite Code'}
                        </label>
                        {joinCodeInput && (
                          <span className="text-[9px] font-mono text-sky-400 bg-sky-950/60 border border-sky-500/30 px-1.5 py-0.5 rounded">
                            {language === 'bm' ? 'Diisi Auto' : 'Auto-detected'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        placeholder="CAMGO-TRIP-882"
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-white/10 text-xs font-mono uppercase tracking-wider text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-stone-900/60 border border-white/5 text-[11px] text-stone-400 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        {language === 'bm'
                          ? 'Perkongsian lokasi anda dikawal sepenuhnya oleh anda. Anda boleh hidupkan atau matikan pada bila-bila masa.'
                          : 'Privacy first: You always maintain full opt-in control over whether your GPS is broadcast.'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleJoinSession}
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                    <span>{language === 'bm' ? 'Sertai Suar Kumpulan' : 'Join Group Beacon'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE SESSION VIEW */
            <div className="space-y-4">
              {/* Session Control Banner */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-stone-800 via-stone-850 to-stone-800 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-emerald-400 font-mono tracking-wider">
                      {session.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-900 text-stone-300 border border-white/10 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>
                        {language === 'bm' ? 'Tamat dalam' : 'Expires in'} ~{remainingHours}h
                      </span>
                    </span>
                  </div>

                  {/* Invite Code with Copy & Share */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-stone-400">{language === 'bm' ? 'Kod Sesi:' : 'Code:'}</span>
                    <span className="text-sm font-mono font-black text-white px-2 py-0.5 rounded bg-black/60 border border-emerald-500/40 select-all">
                      {session.code}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors cursor-pointer text-xs flex items-center gap-1"
                      title="Copy Code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={handleShareSession}
                      className="p-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors cursor-pointer text-xs flex items-center gap-1"
                      title="Share Invite"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium hidden sm:inline">{language === 'bm' ? 'Kongsi' : 'Share'}</span>
                    </button>
                    <button
                      onClick={() => setShowLiveMapModal(true)}
                      className="p-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      title="Open Live Beacon Map"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{language === 'bm' ? 'Peta Live' : 'Live Map'}</span>
                    </button>
                    <button
                      onClick={() => setShowQrModal(true)}
                      className="p-1.5 px-2.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      title="Show QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{language === 'bm' ? 'Kod QR' : 'QR Code'}</span>
                    </button>
                  </div>
                </div>

                {/* Right side: Opt-in Live Sharing & History Toggle Switches */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                      {isSharing ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                      )}
                      <span>
                        {isSharing
                          ? (language === 'bm' ? 'Berkongsi Lokasi' : 'Sharing Live Location')
                          : (language === 'bm' ? 'Perkongsian Dijeda' : 'Location Paused')}
                      </span>
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {isSharing
                        ? (language === 'bm' ? 'Kumpulan boleh lihat anda' : 'Visible to group')
                        : (language === 'bm' ? 'Tersembunyi daripada kumpulan' : 'Hidden from group')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSharing}
                    className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isSharing ? 'bg-emerald-600' : 'bg-stone-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isSharing ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  <div className="flex flex-col items-end ml-2">
                    <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                      <Footprints className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{language === 'bm' ? 'Sejarah Lokasi' : 'Location History'}</span>
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {showLocationHistory ? (language === 'bm' ? 'Dipaparkan' : 'Shown') : (language === 'bm' ? 'Disembunyikan' : 'Hidden')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLocationHistory(!showLocationHistory)}
                    className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showLocationHistory ? 'bg-indigo-600' : 'bg-stone-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        showLocationHistory ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Highlands Spotty Signal / Simulation bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-stone-900/80 border border-white/10 text-xs">
                <div className="flex items-center gap-3 text-stone-300">
                  {myCoords ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      <span>GPS ±{myCoords.accuracy}m</span>
                      {myCoords.altitude && <span>• {myCoords.altitude}m ASL</span>}
                    </span>
                  ) : (
                    <span className="text-amber-400 text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{gpsError || (language === 'bm' ? 'Menunggu isyarat GPS...' : 'Acquiring GPS fix...')}</span>
                    </span>
                  )}

                  {batteryLevel !== null && (
                    <span className="hidden sm:flex items-center gap-1 text-stone-400 text-[11px]">
                      <Battery className="w-3.5 h-3.5 text-stone-300" />
                      <span>{batteryLevel}%</span>
                    </span>
                  )}
                </div>

                {/* Simulation toggle for testing / desktop */}
                <button
                  onClick={() => setSimulationActive(!simulationActive)}
                  className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                    simulationActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-stone-800 text-stone-400 border-white/5 hover:text-stone-200'
                  }`}
                  title="Simulate walking through Kea Farm & trails"
                >
                  <Footprints className="w-3 h-3" />
                  <span>
                    {simulationActive
                      ? (language === 'bm' ? 'Simulasi Berjalan Aktif' : 'Simulated Walk Active')
                      : (language === 'bm' ? 'Mod Simulasi Tanah Tinggi' : 'Highland Simulator')}
                  </span>
                </button>
              </div>

              {/* Tab Navigation: Map / Tactical Compass / Group Members */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'map'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-stone-800/80 text-stone-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{language === 'bm' ? 'Peta Interaktif' : 'Interactive Map'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('compass')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'compass'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-stone-800/80 text-stone-400 hover:text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>
                    {language === 'bm' ? 'Kompas Luar Talian (Spotty Signal)' : 'Offline Compass & Bearing'}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('members')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'members'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-stone-800/80 text-stone-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {language === 'bm' ? 'Ahli Kumpulan' : 'Party Members'} (
                    {session.members ? Object.keys(session.members).length : 0})
                  </span>
                </button>
              </div>

              {/* TAB 1: LEAFLET MAP VIEW */}
              {activeTab === 'map' && (
                <div className="space-y-3">
                  <div 
                    className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-stone-950 transition-[height] duration-200"
                    style={{ height: `${dynamicMapHeight}px` }}
                  >
                    <div ref={mapContainerRef} className="w-full h-full z-10" />

                    {/* Floating Controls over Map */}
                    <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
                      <button
                        onClick={handleFitAllMembers}
                        className="p-2 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-stone-100 border border-white/20 shadow-lg backdrop-blur-md cursor-pointer transition-colors"
                        title="Fit all party members"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCenterOnMe}
                        className="p-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-400/40 shadow-lg backdrop-blur-md cursor-pointer transition-colors"
                        title="Center on my location"
                      >
                        <Crosshair className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Live companions quick pill footer on map */}
                    <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-[400] flex items-center gap-2 overflow-x-auto py-1">
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
                            onClick={() => {
                              setSelectedCompanionId(comp.id);
                              mapInstanceRef.current?.setView([comp.latitude, comp.longitude], 17);
                            }}
                            className={`px-2.5 py-1.5 rounded-xl bg-stone-900/95 backdrop-blur-md border text-left shrink-0 transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                              selectedCompanionId === comp.id
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
                                {stale && <span className="text-[10px] text-amber-400 font-bold">⚠️ Stale</span>}
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
                </div>
              )}

              {/* TAB 2: SPOTTY SIGNAL & OFFLINE TACTICAL COMPASS VIEW */}
              {activeTab === 'compass' && (
                <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-stone-850 to-stone-900 border border-indigo-500/30 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                        <Compass className="w-4 h-4 text-indigo-400" />
                        <span>
                          {language === 'bm'
                            ? 'Panduan Kompas Luar Talian & Jarak Terus'
                            : 'Offline Directional Compass & Bearing'}
                        </span>
                      </h3>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {language === 'bm'
                          ? 'Direka khas untuk kawasan tanpa isyarat internet di denai atau lembah ladang teh.'
                          : 'Operates 100% offline via GPS sensors and cached coordinates without needing map tiles.'}
                      </p>
                    </div>

                    {/* Companion Selector */}
                    {companions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400">{language === 'bm' ? 'Arah ke:' : 'Track towards:'}</span>
                        <select
                          value={selectedCompanion?.id || ''}
                          onChange={(e) => setSelectedCompanionId(e.target.value)}
                          className="px-3 py-1.5 rounded-xl bg-stone-900 border border-white/15 text-xs text-stone-100 font-bold focus:outline-none focus:border-indigo-400"
                        >
                          {companions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {selectedCompanion ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      {/* Big Circular Tactical Compass Display */}
                      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-stone-900/90 border border-white/10 relative">
                        <div className="w-56 h-56 rounded-full border-4 border-stone-800 bg-stone-950 relative flex items-center justify-center shadow-inner">
                          {/* Cardinal Markers */}
                          <span className="absolute top-2 text-xs font-mono font-bold text-red-400">N</span>
                          <span className="absolute right-3 text-xs font-mono font-bold text-stone-400">E</span>
                          <span className="absolute bottom-2 text-xs font-mono font-bold text-stone-400">S</span>
                          <span className="absolute left-3 text-xs font-mono font-bold text-stone-400">W</span>

                          {/* Outer Dial Degrees */}
                          <div className="absolute inset-4 rounded-full border border-dashed border-stone-700 pointer-events-none" />

                          {/* Rotating Directional Needle pointing towards companion */}
                          <div
                            className="absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-out"
                            style={{ transform: `rotate(${liveBearingDegrees}deg)` }}
                          >
                            <div className="flex flex-col items-center h-full justify-between py-5">
                              {/* Arrow pointing UP towards bearing */}
                              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[24px] border-b-indigo-500 filter drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[14px] border-t-stone-700" />
                            </div>
                          </div>

                          {/* Center Hub with Distance */}
                          <div className="w-24 h-24 rounded-full bg-stone-900/95 border-2 border-indigo-400/50 flex flex-col items-center justify-center z-10 shadow-lg text-center p-1">
                            <span className="text-[10px] font-mono text-stone-400 uppercase">Haversine</span>
                            <span className="text-base font-extrabold font-mono text-white">
                              {formatDistance(liveDistanceMeters)}
                            </span>
                            <span className="text-[10px] font-bold text-indigo-400">
                              {liveCardinal} ({liveBearingDegrees}°)
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 text-center">
                          <span className="text-xs text-stone-400">
                            {language === 'bm' ? 'Arah langsung menuju' : 'Straight-line heading to'}{' '}
                            <strong className="text-white">{selectedCompanion.name}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Directional Walk Telemetry & Spotty Signal Status */}
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-stone-900/80 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-stone-400">{language === 'bm' ? 'Status Rakan' : 'Companion Status'}</span>
                            {isLocationStale(selectedCompanion.updatedAt) ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{language === 'bm' ? 'Isyarat Terputus (Stale)' : 'Signal Lost (Stale)'}</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>{language === 'bm' ? 'Isyarat Live Aktif' : 'Live Active Signal'}</span>
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <div className="text-sm font-bold text-stone-100 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{selectedCompanion.nearestLandmark || 'Cameron Highlands'}</span>
                            </div>
                            <div className="text-xs text-stone-400 flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-stone-500" />
                              <span>
                                {language === 'bm' ? 'Ping Terakhir:' : 'Last Ping:'}{' '}
                                {formatTimeAgo(selectedCompanion.updatedAt)}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
                            💡 <strong>{language === 'bm' ? 'Panduan Berjalan:' : 'Navigation Advisory:'}</strong>{' '}
                            {language === 'bm'
                              ? `Halakan telefon anda ke arah ${liveCardinal} (${liveBearingDegrees}°) dan berjalan sejauh ~${formatDistance(
                                  liveDistanceMeters
                                )} untuk mendekati ${selectedCompanion.name}.`
                              : `Point your phone towards heading ${liveCardinal} (${liveBearingDegrees}°) and walk ~${formatDistance(
                                  liveDistanceMeters
                                )} to rejoin ${selectedCompanion.name}.`}
                          </div>
                        </div>

                        {/* Highland Valley & Forest Notice */}
                        <div className="p-3 rounded-xl bg-stone-900/60 border border-white/5 text-[11px] text-stone-400 flex items-start gap-2">
                          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                          <span>
                            {language === 'bm'
                              ? 'Di kawasan lembah bukit Mossy Forest atau ladang teh tanpa isyarat 4G, penunjuk kompas ini akan terus berfungsi mengikut koordinat GPS terakhir yang direkodkan.'
                              : 'In deep valleys like Mossy Forest or sprawling tea trails with zero 4G reception, this compass needle relies directly on internal device GPS without needing cellular data.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-stone-400 space-y-2">
                      <Users className="w-8 h-8 mx-auto text-stone-600" />
                      <p className="text-xs">
                        {language === 'bm'
                          ? 'Belum ada rakan lain dalam kumpulan ini. Kongsi kod jemputan di atas!'
                          : 'No companions have joined this beacon session yet. Share your invite code above!'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: MEMBERS LIST */}
              {activeTab === 'members' && (
                <div className="space-y-3">
                  <div className="text-xs text-stone-400 flex items-center justify-between">
                    <span>
                      {language === 'bm' ? 'Senarai Ahli Sesi Suar' : 'Active Party Members List'}
                    </span>
                    <span className="font-mono text-emerald-400">
                      {session.members ? Object.keys(session.members).length : 0} {language === 'bm' ? 'Ahli' : 'Members'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Current User Card */}
                    <div className="p-3.5 rounded-2xl bg-stone-800/90 border border-emerald-500/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm border-2 border-white/40"
                              style={{ backgroundColor: avatarColor }}
                            >
                              {memberName.charAt(0).toUpperCase()}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-stone-800 ${
                                isSharing ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                              }`}
                              title={isSharing ? 'Connection Active' : 'Location Paused'}
                            />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{memberName}</span>
                              <span className="text-[10px] font-mono text-emerald-400 font-bold">(You)</span>
                            </div>
                            <div className="text-[11px] text-stone-400 font-mono">
                              {isSharing
                                ? (language === 'bm' ? 'Penyiaran GPS Aktif' : 'Broadcasting Live')
                                : (language === 'bm' ? 'Penyiaran Dijeda' : 'Broadcast Paused')}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 border ${
                            isSharing
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSharing ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
                            }`}
                          />
                          <span>
                            {isSharing
                              ? (language === 'bm' ? 'Aktif' : 'Active')
                              : (language === 'bm' ? 'Tidak Aktif' : 'Inactive')}
                          </span>
                        </span>
                      </div>

                      <div className="text-[11px] text-stone-300 pt-1 border-t border-white/5 flex items-center justify-between">
                        <span>{getNearestHighlandLandmark(myCoords?.latitude || 4.5050, myCoords?.longitude || 101.4080)}</span>
                        <span className="font-mono text-stone-400">±{myCoords?.accuracy || 15}m</span>
                      </div>
                    </div>

                    {/* Companions */}
                    {companions.map((comp) => {
                      const stale = isLocationStale(comp.updatedAt);
                      const isConnectionActive = comp.isSharing && !stale;
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
                        <div
                          key={comp.id}
                          className={`p-3.5 rounded-2xl bg-stone-800/60 border transition-all space-y-2 ${
                            isLocationActive(comp.updatedAt) && comp.isSharing
                              ? 'border-emerald-500/30 hover:border-emerald-500/50'
                              : stale
                              ? 'border-amber-500/40 bg-stone-850/80'
                              : 'border-rose-500/30 bg-stone-850/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm border-2 border-white/40"
                                  style={{ backgroundColor: comp.avatarColor }}
                                >
                                  {comp.name.charAt(0).toUpperCase()}
                                </div>
                                <span
                                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-stone-800 ${
                                    isLocationActive(comp.updatedAt) && comp.isSharing
                                      ? 'bg-emerald-400 animate-pulse'
                                      : stale
                                      ? 'bg-amber-400'
                                      : 'bg-rose-500'
                                  }`}
                                  title={
                                    isConnectionActive
                                      ? 'Active Connection'
                                      : stale
                                      ? 'Signal Stale'
                                      : 'Inactive'
                                  }
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                  <span className="truncate">{comp.name}</span>
                                </div>
                                <div className="text-[11px] text-stone-400 font-mono truncate">
                                  {dist ? `Jarak: ${dist}` : formatTimeAgo(comp.updatedAt)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                                  isConnectionActive
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : stale
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isConnectionActive
                                      ? 'bg-emerald-400 animate-ping'
                                      : stale
                                      ? 'bg-amber-400'
                                      : 'bg-rose-500'
                                  }`}
                                />
                                <span>
                                  {isLocationActive(comp.updatedAt) && comp.isSharing
                                    ? (language === 'bm' ? 'Aktif' : 'Active')
                                    : stale
                                    ? (language === 'bm' ? 'Isyarat Lemah' : 'Stale Signal')
                                    : (language === 'bm' ? 'Tidak Aktif' : 'Inactive')}
                                </span>
                              </span>

                              <button
                                onClick={() => {
                                  setSelectedCompanionId(comp.id);
                                  setActiveTab('compass');
                                }}
                                className="p-1.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                                title="Compass Bearing"
                              >
                                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                              </button>
                            </div>
                          </div>

                          <div className="text-[11px] text-stone-300 pt-1 border-t border-white/5 flex items-center justify-between">
                            <span className="truncate max-w-[200px]">
                              {comp.nearestLandmark || 'Cameron Highlands'}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {comp.batteryLevel ? `🔋 ${comp.batteryLevel}%` : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Actions: Leave Group or End Session */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
                <button
                  onClick={handleLeaveSession}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-rose-950/60 hover:text-rose-300 text-stone-300 text-xs font-semibold border border-white/10 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{language === 'bm' ? 'Keluar dari Kumpulan' : 'Leave Group Beacon'}</span>
                </button>

                {session.createdBy === memberId && (
                  <button
                    onClick={handleEndSession}
                    className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{language === 'bm' ? 'Tamatkan Sesi untuk Semua' : 'End Session for Everyone'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* QR CODE & INSTANT SHARE MODAL POPUP */}
        {showQrModal && (
          <div 
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setShowQrModal(false)}
          >
            <div 
              className="w-full max-w-sm rounded-3xl bg-stone-900 border border-emerald-500/40 p-5 sm:p-6 shadow-2xl relative text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label="Close QR Modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1 pt-1">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-stone-100 font-heading">
                  {language === 'bm' ? 'Imbas Kod QR Suar' : 'Scan Group Beacon QR Code'}
                </h3>
                <p className="text-xs text-stone-400">
                  {language === 'bm'
                    ? 'Arahkan kamera telefon untuk menyertai penjejakan lokasi kumpulan secara automatik.'
                    : 'Point any phone camera to instantly join this live tracking party.'}
                </p>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-emerald-500/30 w-fit mx-auto">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt={`QR Code for ${session?.code || preGeneratedCode}`}
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-stone-100 text-stone-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                )}
              </div>

              {/* Monospace Code Pill */}
              <div className="p-2.5 rounded-xl bg-stone-950 border border-white/10 flex items-center justify-between gap-2">
                <div className="text-left min-w-0">
                  <span className="text-[10px] uppercase font-mono text-stone-400 block">
                    {language === 'bm' ? 'Kod Sesi' : 'Session Code'}
                  </span>
                  <span className="text-sm font-mono font-black text-emerald-400 select-all truncate block">
                    {session?.code || preGeneratedCode}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(session?.code || preGeneratedCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 border border-white/10 cursor-pointer shrink-0 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? (language === 'bm' ? 'Disalin' : 'Copied') : (language === 'bm' ? 'Salin' : 'Copy')}</span>
                </button>
              </div>

              {/* Share Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{language === 'bm' ? 'Kongsi ke WhatsApp' : 'Share via WhatsApp'}</span>
                </button>

                <button
                  onClick={handleCopyShareLink}
                  className="w-full py-2 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? (language === 'bm' ? 'Pautan Disalin!' : 'Link Copied!') : (language === 'bm' ? 'Salin Pautan Penuh' : 'Copy Direct Share Link')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LIVE INTERACTIVE BEACON MAP POPUP MODAL */}
        <LiveBeaconMapModal
          isOpen={showLiveMapModal}
          onClose={() => setShowLiveMapModal(false)}
          session={session}
          myCoords={myCoords}
          memberId={memberId}
          memberName={memberName}
          avatarColor={avatarColor}
          batteryLevel={batteryLevel}
          language={language}
        />
      </div>
    </div>
  );
};
