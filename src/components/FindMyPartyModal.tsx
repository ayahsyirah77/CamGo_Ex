/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Locate,
  PlusCircle,
  KeyRound,
  Route,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Language, BeaconSession, BeaconMember } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc, Unsubscribe } from 'firebase/firestore';
import { beaconService, LOCAL_STORAGE_KEY_SESSION } from '../services/beaconService';
import {
  calculateHaversineDistance,
  formatDistance,
  calculateBearing,
  getCompassCardinal,
  getNearestHighlandLandmark,
  isLocationStale,
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

const LOCAL_STORAGE_KEY_MEMBER_NAME = 'camgo_party_member_name';
const LOCAL_STORAGE_KEY_MEMBER_COLOR = 'camgo_party_member_color';
const SESSION_STORAGE_KEY_MEMBER_ID = 'camgo_party_session_member_id';

export const FindMyPartyModal: React.FC<FindMyPartyModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  // Member profile state:
  // Use sessionStorage for memberId so each tab or browser connection gets a unique designated pin.
  // This prevents invitation link testers in multiple tabs from overwriting each other in Firestore!
  const [memberId, setMemberId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem(SESSION_STORAGE_KEY_MEMBER_ID);
      if (!id) {
        id = 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
        sessionStorage.setItem(SESSION_STORAGE_KEY_MEMBER_ID, id);
      }
      return id;
    }
    return 'mem_' + Math.random().toString(36).substring(2, 9);
  });
  const [memberName, setMemberName] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY_MEMBER_NAME) || '';
  });
  const [avatarColor, setAvatarColor] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_KEY_MEMBER_COLOR) || AVATAR_COLORS[0].value;
  });

  // Entry Mode: 'create' or 'join'
  const [entryMode, setEntryMode] = useState<'create' | 'join'>('create');

  // Session state (Real users only - No mock users)
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
  const [isSharing, setIsSharing] = useState<boolean>(true);
  const [locatingUser, setLocatingUser] = useState<boolean>(false);
  const [locateToast, setLocateToast] = useState<string | null>(null);
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
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'compass' | 'members'>('map');

  // Dynamic Map Container Height
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
  const navPolylineRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);
  const sessionUnsubRef = useRef<Unsubscribe | null>(null);

  // Clean up Firestore listener on unmount
  useEffect(() => {
    return () => {
      if (sessionUnsubRef.current) {
        sessionUnsubRef.current();
        sessionUnsubRef.current = null;
      }
      if (navPolylineRef.current) {
        navPolylineRef.current.remove();
        navPolylineRef.current = null;
      }
    };
  }, []);

  // Sync member profile with localStorage
  useEffect(() => {
    if (memberName) localStorage.setItem(LOCAL_STORAGE_KEY_MEMBER_NAME, memberName);
    localStorage.setItem(LOCAL_STORAGE_KEY_MEMBER_COLOR, avatarColor);
  }, [memberName, avatarColor]);

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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Dynamic ResizeObserver & window resize listener for map
  useEffect(() => {
    if (!isOpen) return;

    const computeAndApplyHeight = () => {
      if (typeof window === 'undefined') return;

      const isDesktop = window.innerWidth >= 640;
      if (isDesktop) {
        setDynamicMapHeight(400);
      } else {
        const visibleHeight = window.visualViewport?.height || window.innerHeight;
        let calculatedHeight: number;
        if (visibleHeight < 500) {
          calculatedHeight = Math.max(170, Math.floor(visibleHeight * 0.32));
        } else if (visibleHeight < 650) {
          calculatedHeight = Math.max(200, Math.floor(visibleHeight * 0.36));
        } else {
          calculatedHeight = Math.min(320, Math.max(220, Math.floor(visibleHeight * 0.38)));
        }
        setDynamicMapHeight(calculatedHeight);
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    computeAndApplyHeight();
    window.addEventListener('resize', computeAndApplyHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', computeAndApplyHeight);
    }

    const t1 = setTimeout(computeAndApplyHeight, 150);
    const t2 = setTimeout(computeAndApplyHeight, 350);

    return () => {
      window.removeEventListener('resize', computeAndApplyHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', computeAndApplyHeight);
      }
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen, activeTab]);

  // State to track if arrived via invite link
  const [invitationCode, setInvitationCode] = useState<string | null>(null);

  // Check URL parameter or saved session on mount / modal open
  useEffect(() => {
    if (!isOpen) return;

    let beaconFromUrl: string | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('beacon') || params.get('party');
      if (raw) {
        beaconFromUrl = raw.trim().toUpperCase().replace(/\s+/g, '');
      }
    }

    if (beaconFromUrl) {
      setInvitationCode(beaconFromUrl);
      setJoinCodeInput(beaconFromUrl);
      setEntryMode('join');

      // If not already subscribed to this code, subscribe immediately to fetch creator & members
      if (session?.code !== beaconFromUrl) {
        subscribeToSession(beaconFromUrl, false);
      }
    } else {
      const savedCode = localStorage.getItem(LOCAL_STORAGE_KEY_SESSION);
      if (savedCode && !session) {
        subscribeToSession(savedCode, true);
      }
    }

    // Proactively get real initial GPS coordinates
    if (!myCoords && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
          });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
      );
    }
  }, [isOpen]);

  // Real-time Firestore session listener
  const subscribeToSession = (codeToJoin: string, silentIfMissing = false) => {
    const formattedCode = codeToJoin.trim().toUpperCase().replace(/\s+/g, '');
    if (!formattedCode) return () => {};

    // Terminate existing listener to avoid leaking or having multiple active subscriptions
    if (sessionUnsubRef.current) {
      sessionUnsubRef.current();
      sessionUnsubRef.current = null;
    }

    setLoading(true);
    setErrorMsg(null);

    const unsubscribe = beaconService.subscribeToSession(
      formattedCode,
      memberId,
      (data) => {
        setLoading(false);
        setErrorMsg(null);
        setSession(data);
        localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, formattedCode);

        if (data.members && data.members[memberId]) {
          setIsSharing(data.members[memberId].isSharing);
        }
      },
      () => {
        setLoading(false);
        setErrorMsg(
          language === 'bm'
            ? 'Sesi penjejakan ini telah tamat tempoh.'
            : 'This beacon session has expired.'
        );
        setSession(null);
        beaconService.clearCachedSession();
        if (sessionUnsubRef.current) {
          sessionUnsubRef.current();
          sessionUnsubRef.current = null;
        }
      },
      (unfoundCode) => {
        setLoading(false);
        if (silentIfMissing) {
          beaconService.clearCachedSession();
          return;
        }
        setErrorMsg(
          language === 'bm'
            ? `Kod sesi "${unfoundCode}" tidak dijumpai. Sahkan kod daripada ketua kumpulan atau cipta suar baharu.`
            : `Session code "${unfoundCode}" not found. Verify code with your host and try again.`
        );
        setSession(null);
        beaconService.clearCachedSession();
        if (sessionUnsubRef.current) {
          sessionUnsubRef.current();
          sessionUnsubRef.current = null;
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

    sessionUnsubRef.current = unsubscribe;
    return unsubscribe;
  };

  // Sync real coordinates to Firestore for the active session document
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
    if (now - lastSyncTimestampRef.current < 3000) return;
    lastSyncTimestampRef.current = now;

    try {
      const sessionRef = doc(db, 'beacon_sessions', session.code);
      const landmark = getNearestHighlandLandmark(coords.latitude, coords.longitude);

      await updateDoc(sessionRef, {
        [`members.${memberId}`]: {
          id: memberId,
          name: memberName || 'Highland Companion',
          avatarColor,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          heading: coords.heading,
          speed: coords.speed,
          altitude: coords.altitude,
          batteryLevel,
          isSharing: true,
          updatedAt: new Date().toISOString(),
          nearestLandmark: landmark,
        },
      });
    } catch (e) {
      console.warn('Sync coordinates warning:', e);
    }
  };

  // Continuous Geolocation Watcher
  useEffect(() => {
    if (!isSharing) {
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
        // Only set error if permission is explicitly denied
        if (err.code === 1) {
          setGpsError(
            language === 'bm'
              ? 'Izin GPS ditolak dalam pelayar.'
              : 'Location permission was denied in your browser settings.'
          );
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 25000,
        maximumAge: 10000,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isSharing, session?.code]);

  // Real "Locate Me" Feature: gets exact current GPS with automatic graceful fallback
  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      setGpsError(
        language === 'bm' ? 'Peranti anda tidak menyokong GPS.' : 'Geolocation is not supported by your browser.'
      );
      return;
    }

    setLocatingUser(true);
    setGpsError(null);

    const applyCoords = (pos: GeolocationPosition) => {
      setLocatingUser(false);
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy),
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
      };
      setMyCoords(coords);

      const landmark = getNearestHighlandLandmark(coords.latitude, coords.longitude);
      setLocateToast(
        `📍 ${language === 'bm' ? 'Lokasi anda dikesan' : 'Located'}: ${landmark} (±${coords.accuracy}m)`
      );
      setTimeout(() => setLocateToast(null), 4000);

      // Center map smoothly on the user's real location
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([coords.latitude, coords.longitude], 17, { animate: true });
      }

      // Push real coordinates to Firestore if session is active
      if (session && isSharing) {
        syncCoordinatesToFirestore(coords);
      }
    };

    // First attempt: try high accuracy with 6s timeout
    navigator.geolocation.getCurrentPosition(
      applyCoords,
      (err) => {
        if (err.code === 1) {
          // Explicit permission denied
          setLocatingUser(false);
          setGpsError(
            language === 'bm'
              ? 'Izin lokasi disekat. Sila benarkan akses GPS dalam tetapan pelayar.'
              : 'Location permission denied. Please allow GPS access in your browser settings.'
          );
          return;
        }

        // Automatic progressive fallback to standard / cached network location
        navigator.geolocation.getCurrentPosition(
          applyCoords,
          () => {
            setLocatingUser(false);
            // Default center on Cameron Highlands Kea Farm
            const defaultCoords = {
              latitude: 4.5050,
              longitude: 101.4080,
              accuracy: 45,
              heading: null,
              speed: null,
              altitude: 1560,
            };
            setMyCoords(defaultCoords);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([defaultCoords.latitude, defaultCoords.longitude], 16, { animate: true });
            }
            setLocateToast(
              language === 'bm'
                ? '📍 Dipusatkan ke Cameron Highlands (Kea Farm)'
                : '📍 Centered on Cameron Highlands (Kea Farm)'
            );
            setTimeout(() => setLocateToast(null), 3500);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 10000,
      }
    );
  };

  // Create New Beacon Session
  const handleCreateSession = async () => {
    const effectiveMemberName = memberName.trim() || 'Highland Explorer';
    if (!memberName.trim()) setMemberName('Highland Explorer');

    setLoading(true);
    setErrorMsg(null);

    const targetCode = (preGeneratedCode || generateBeaconCode()).trim().toUpperCase().replace(/\s+/g, '');
    const initialLat = myCoords?.latitude || 4.5050; // Default to Kea Farm if GPS warming up
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
      updatedAt: new Date().toISOString(),
      nearestLandmark: getNearestHighlandLandmark(initialLat, initialLon),
    };

    try {
      const createdSession = await beaconService.createSession(
        targetCode,
        initialMember,
        newSessionName.trim() || `Cameron Highlands Group (${targetCode})`,
        expiryHours
      );

      setSession(createdSession);
      setIsSharing(true);
      localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, targetCode);
      subscribeToSession(targetCode);
      setShowLiveMapModal(true);
    } catch (err: any) {
      console.error('Error creating beacon session:', err);
      setErrorMsg(
        language === 'bm' ? 'Gagal mencipta suar baharu. Sila cuba lagi.' : 'Failed to create new beacon. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Join Existing Beacon Session
  const handleJoinSession = async () => {
    const targetCode = joinCodeInput.trim().toUpperCase().replace(/\s+/g, '');
    if (!targetCode) {
      setErrorMsg(language === 'bm' ? 'Sila masukkan kod sesi.' : 'Please enter session code.');
      return;
    }

    const effectiveMemberName = memberName.trim() || 'Highland Companion';
    if (!memberName.trim()) setMemberName('Highland Companion');

    setLoading(true);
    setErrorMsg(null);

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
      // Clean up previous subscription before joining
      if (sessionUnsubRef.current) {
        sessionUnsubRef.current();
        sessionUnsubRef.current = null;
      }

      const joinedSession = await beaconService.joinSession(targetCode, selfMember);
      setSession(joinedSession);
      setIsSharing(true);
      localStorage.setItem(LOCAL_STORAGE_KEY_SESSION, targetCode);
      subscribeToSession(targetCode);
      setShowLiveMapModal(true);
    } catch (err: any) {
      // Ensure no isolated local session or phantom cache persists
      setSession(null);
      beaconService.clearCachedSession();
      if (sessionUnsubRef.current) {
        sessionUnsubRef.current();
        sessionUnsubRef.current = null;
      }

      if (err.message === 'SESSION_NOT_FOUND') {
        setErrorMsg(
          language === 'bm'
            ? `Kod sesi "${targetCode}" tidak dijumpai dalam pangkalan data live. Sahkan kod daripada ketua kumpulan anda.`
            : `Session code "${targetCode}" not found in live database. Verify code and try again.`
        );
      } else if (err.message === 'SESSION_EXPIRED') {
        setErrorMsg(
          language === 'bm' ? 'Sesi ini telah tamat tempoh.' : 'This session has already expired.'
        );
      } else {
        console.error('Error joining session:', err);
        setErrorMsg(
          language === 'bm' ? `Ralat menyertai sesi "${targetCode}".` : `Error joining session "${targetCode}".`
        );
      }
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

    if (sessionUnsubRef.current) {
      sessionUnsubRef.current();
      sessionUnsubRef.current = null;
    }

    const currentCode = session.code;
    setSession(null);
    setIsSharing(false);
    localStorage.removeItem(LOCAL_STORAGE_KEY_SESSION);
    beaconService.clearCachedSession();

    try {
      await beaconService.leaveSession(currentCode, memberId);
    } catch (e) {
      console.warn('Error during leaveSession:', e);
    }
  };

  // Switch to creating a different beacon
  const handleSwitchToCreate = () => {
    if (sessionUnsubRef.current) {
      sessionUnsubRef.current();
      sessionUnsubRef.current = null;
    }
    setSession(null);
    beaconService.clearCachedSession();
    setPreGeneratedCode(generateBeaconCode());
    setEntryMode('create');
  };

  // Switch to joining a different beacon
  const handleSwitchToJoin = () => {
    if (sessionUnsubRef.current) {
      sessionUnsubRef.current();
      sessionUnsubRef.current = null;
    }
    setSession(null);
    beaconService.clearCachedSession();
    setEntryMode('join');
  };

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

  // QR Code Generation
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
        dark: '#064e3b',
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

  // Setup Leaflet Map
  useEffect(() => {
    if (!isOpen || activeTab !== 'map' || !mapContainerRef.current) return;

    const currentMapEl = mapContainerRef.current;

    if (!mapInstanceRef.current) {
      const initialLat = myCoords?.latitude || 4.5050;
      const initialLon = myCoords?.longitude || 101.4080;

      const map = L.map(currentMapEl, {
        center: [initialLat, initialLon],
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

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
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

  // Sort and assign designated pins to all real members who join
  const designatedMembers = useMemo(() => {
    if (!session?.members) return [];
    const list = Object.values(session.members);
    return list.sort((a, b) => {
      if (a.id === session.createdBy) return -1;
      if (b.id === session.createdBy) return 1;
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    });
  }, [session?.members, session?.createdBy]);

  // Update Designated Map Markers for each user who joins
  useEffect(() => {
    if (!mapInstanceRef.current || activeTab !== 'map') return;
    const map = mapInstanceRef.current;

    const activeList = [...designatedMembers];
    // If user has coords but not yet in session list, show their pin
    if (myCoords && !activeList.some((m) => m.id === memberId)) {
      activeList.unshift({
        id: memberId,
        name: memberName || 'You',
        avatarColor,
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

    const currentMemberIds = new Set(activeList.map((m) => m.id));

    activeList.forEach((member, index) => {
      const isMe = member.id === memberId;
      const isHost = member.id === session?.createdBy;
      const pinNumber = index + 1;
      const stale = isLocationStale(member.updatedAt);
      const isActivelySharing = member.isSharing;
      const pinColor = member.avatarColor || AVATAR_COLORS[index % AVATAR_COLORS.length].value;

      // Unique Designated Teardrop SVG Pin Marker with Host crown
      const designatedPinSvg = `
        <div class="relative flex flex-col items-center justify-center cursor-pointer group" style="transform: translate(-50%, -100%);">
          ${
            isActivelySharing && !stale
              ? `<div class="absolute -bottom-1 w-8 h-8 rounded-full animate-ping opacity-60" style="background-color: ${pinColor};"></div>`
              : ''
          }
          <!-- Designated Pin SVG Marker -->
          <div class="relative transition-transform duration-200 group-hover:scale-110 drop-shadow-xl">
            <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0C8.954 0 0 8.954 0 20C0 33.5 20 48 20 48C20 48 40 33.5 40 20C40 8.954 31.046 0 20 0Z" fill="${pinColor}" stroke="${isHost ? '#fbbf24' : '#ffffff'}" stroke-width="${isHost ? '3.5' : '2.5'}"/>
              <circle cx="20" cy="18" r="13" fill="#ffffff"/>
              <text x="20" y="23" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${isHost ? '13' : '11'}" fill="${pinColor}">${isMe ? 'YOU' : isHost ? '👑' : '#' + pinNumber}</text>
            </svg>
          </div>

          <!-- Designated Tag with Name, Pin Number & Status -->
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
        html: designatedPinSvg,
        className: 'custom-designated-beacon-pin',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const latLng = L.latLng(member.latitude, member.longitude);

      if (markersRef.current[member.id]) {
        markersRef.current[member.id].setLatLng(latLng);
        markersRef.current[member.id].setIcon(customIcon);
      } else {
        const marker = L.marker(latLng, { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          setSelectedCompanionId(member.id);
          map.panTo(latLng);
        });
        markersRef.current[member.id] = marker;
      }

      // Accuracy Circle
      if (member.accuracy && isActivelySharing) {
        if (circlesRef.current[member.id]) {
          circlesRef.current[member.id].setLatLng(latLng);
          circlesRef.current[member.id].setRadius(Math.max(10, member.accuracy));
        } else {
          const circle = L.circle(latLng, {
            radius: Math.max(10, member.accuracy),
            color: pinColor,
            fillColor: pinColor,
            fillOpacity: 0.12,
            weight: 1.5,
          }).addTo(map);
          circlesRef.current[member.id] = circle;
        }
      }
    });

    // Draw in-app live navigation route connecting user to Beacon Host
    if (navPolylineRef.current) {
      navPolylineRef.current.remove();
      navPolylineRef.current = null;
    }
    const hostMember = activeList.find((m) => m.id === session?.createdBy);
    if (map && myCoords && hostMember && hostMember.id !== memberId) {
      navPolylineRef.current = L.polyline(
        [
          [myCoords.latitude, myCoords.longitude],
          [hostMember.latitude, hostMember.longitude],
        ],
        {
          color: '#10b981',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.85,
        }
      ).addTo(map);
    }

    // Cleanup departed members
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
  }, [designatedMembers, myCoords, activeTab, memberId, memberName, avatarColor, session?.createdBy]);

  // Identify Beacon Creator / Host
  const creatorId = session?.createdBy;
  const creatorMember = session?.members && creatorId ? session.members[creatorId] : null;
  const isMeCreator = memberId === creatorId;
  const creatorName = session?.createdByName || creatorMember?.name || 'Beacon Host';

  // Live Navigation Metrics to Creator
  let hostDistanceMeters: number | null = null;
  let hostBearingDegrees: number | null = null;
  let hostCardinal: string | null = null;

  if (myCoords && creatorMember) {
    hostDistanceMeters = calculateHaversineDistance(
      myCoords.latitude,
      myCoords.longitude,
      creatorMember.latitude,
      creatorMember.longitude
    );
    hostBearingDegrees = calculateBearing(
      myCoords.latitude,
      myCoords.longitude,
      creatorMember.latitude,
      creatorMember.longitude
    );
    hostCardinal = getCompassCardinal(hostBearingDegrees);
  }

  // Navigation action handlers to navigate directly to the beacon creator
  const handleNavigateToHost = (app: 'google' | 'waze' | 'apple' = 'google') => {
    if (!creatorMember) {
      setLocateToast(
        language === 'bm'
          ? '⚠️ Koordinat pencipta suar belum tersedia'
          : '⚠️ Host GPS fix not available yet'
      );
      setTimeout(() => setLocateToast(null), 3000);
      return;
    }
    const lat = creatorMember.latitude;
    const lon = creatorMember.longitude;
    let url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
    if (app === 'waze') {
      url = `https://www.waze.com/ul?ll=${lat},${lon}&navigate=yes`;
    } else if (app === 'apple') {
      url = `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`;
    }
    window.open(url, '_blank');
  };

  const handleFocusHost = () => {
    if (!creatorMember) return;
    setActiveTab('map');
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([creatorMember.latitude, creatorMember.longitude], 17, {
        animate: true,
        duration: 0.8,
      });
    }
    setSelectedCompanionId(creatorMember.id);
  };

  const handleShowRouteToHost = () => {
    if (!creatorMember || !myCoords || !mapInstanceRef.current) return;
    setActiveTab('map');
    const bounds = L.latLngBounds([
      [myCoords.latitude, myCoords.longitude],
      [creatorMember.latitude, creatorMember.longitude],
    ]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
    setSelectedCompanionId(creatorMember.id);
  };

  // Selected companion calculations
  const companions = designatedMembers.filter((m) => m.id !== memberId);
  const selectedCompanion = companions.find((c) => c.id === selectedCompanionId) || companions[0] || null;

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

  const remainingHours = session
    ? Math.max(0, Math.round((new Date(session.expiresAt).getTime() - Date.now()) / (3600 * 1000)))
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
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-stone-900/95 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-heading font-extrabold text-stone-100 flex items-center gap-2">
                  <span>{language === 'bm' ? 'Cari Rakan Kumpulan' : 'Find My Party'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    {language === 'bm' ? 'Suar GPS' : 'Live Beacon'}
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-stone-400 line-clamp-1">
                {language === 'bm'
                  ? 'Kesan lokasi tepat anda dan semak pin designated setiap ahli yang menyertai'
                  : 'Real-time GPS tracking with designated pins for each companion who joins'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* High-visibility "Locate Me" button */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locatingUser}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-50"
              title="Locate my exact position on map"
            >
              {locatingUser ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Crosshair className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
              )}
              <span className="hidden xs:inline">
                {language === 'bm' ? 'Kesan Saya' : 'Locate Me'}
              </span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Locate Me Floating Notification Toast */}
        {locateToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/95 border border-emerald-400 text-emerald-200 text-xs px-4 py-2 rounded-full shadow-2xl animate-in fade-in slide-in-from-top duration-200 flex items-center gap-2">
            <span>{locateToast}</span>
          </div>
        )}

        {/* GPS Error alert if any */}
        {gpsError && (
          <div className="mx-4 mt-2 p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 sm:px-6 py-4 pb-28 sm:pb-8 space-y-4 touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Active Session vs Create/Join Modes */}
          {!session ? (
            <div className="max-w-xl mx-auto space-y-5 py-1">
              {/* Profile Card: Display Name & Designated Pin Color */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-800/80 border border-white/10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === 'bm' ? 'Identiti Pin Anda' : 'Your Designated Pin'}</span>
                  </div>
                  {myCoords && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      GPS Active (±{myCoords.accuracy}m)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      {language === 'bm' ? 'Nama Anda / Panggilan' : 'Your Display Name'}
                    </label>
                    <input
                      type="text"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder={language === 'bm' ? 'Cth: Putri, Hazry, Ibu' : 'e.g., Sarah, Putri, Dad'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/15 text-stone-100 placeholder:text-stone-500 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      {language === 'bm' ? 'Warna Designated Pin Anda' : 'Designated Pin Color'}
                    </label>
                    <div className="flex items-center gap-2.5 pt-0.5">
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

              {/* Clear Option Switcher Tabs: CREATE BEACON vs JOIN BEACON */}
              <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-stone-950 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setEntryMode('create');
                    setErrorMsg(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    entryMode === 'create'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/60'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{language === 'bm' ? 'Cipta Suar Baharu' : 'Create Beacon'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEntryMode('join');
                    setErrorMsg(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    entryMode === 'join'
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-950/60'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{language === 'bm' ? 'Sertai Suar Kumpulan' : 'Join Beacon'}</span>
                </button>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* MODE A: CREATE BEACON */}
              {entryMode === 'create' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-850 to-stone-900 border border-emerald-500/30 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'bm' ? 'Cipta Suar Lawatan Cameron Highlands' : 'Create Live Group Beacon'}</span>
                    </h3>
                    <p className="text-xs text-stone-300">
                      {language === 'bm'
                        ? 'Jana kod suar persendirian untuk dikongsi dengan rakan perjalanan anda.'
                        : 'Generate a private invite code to broadcast designated pins with your companions.'}
                    </p>
                  </div>

                  {/* Auto-Generated Code Preview */}
                  <div className="p-3 rounded-xl bg-stone-950 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold flex items-center gap-1">
                        <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                        <span>{language === 'bm' ? 'Kod Suar Dijana:' : 'Designated Session Code:'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreGeneratedCode(generateBeaconCode())}
                        className="px-2 py-0.5 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-emerald-300 border border-white/10 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Generate different code"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>{language === 'bm' ? 'Jana Lain' : 'Regenerate'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-mono font-black text-emerald-300 tracking-wider px-3 py-1.5 rounded-lg bg-stone-900 border border-emerald-500/40 select-all">
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
                          className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCode ? (language === 'bm' ? 'Disalin' : 'Copied') : (language === 'bm' ? 'Salin' : 'Copy')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowQrModal(true)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      {language === 'bm' ? 'Nama Kumpulan / Lawatan' : 'Trip / Group Name'}
                    </label>
                    <input
                      type="text"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      placeholder="e.g. Kea Farm & Night Market Walk"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/10 text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1">
                      {language === 'bm' ? 'Tempoh Hayat Sesi' : 'Session Duration'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([2, 8, 24] as const).map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() => setExpiryHours(hrs)}
                          className={`py-2 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                            expiryHours === hrs
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                              : 'bg-stone-900 text-stone-400 border-white/10 hover:text-white'
                          }`}
                        >
                          {hrs} {language === 'bm' ? 'Jam' : 'Hours'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateSession}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                    <span>{language === 'bm' ? 'Mula Suar Kumpulan' : 'Start Group Beacon'}</span>
                  </button>
                </div>
              )}

              {/* MODE B: JOIN BEACON */}
              {entryMode === 'join' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-850 to-stone-900 border border-sky-500/30 space-y-4">
                  {/* Quick Join Invitation Card if session was loaded from invite link */}
                  {session && !session.members[memberId] && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-stone-900 border-2 border-emerald-400/50 shadow-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-[11px] font-mono font-extrabold text-emerald-300 uppercase tracking-wider">
                          {language === 'bm' ? 'Jemputan Suar Dikesan' : 'Party Invitation Detected'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-white">{session.name}</h4>
                        <p className="text-xs text-stone-300">
                          {language === 'bm'
                            ? `Dihoskan oleh ${session.createdByName || 'Ketua Kumpulan'} (Kod: ${session.code}). Tekan butang di bawah untuk menyertai secara terus.`
                            : `Hosted by ${session.createdByName || 'Group Host'} (Code: ${session.code}). Tap below to join with your designated pin.`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleJoinSession}
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                        <span>{language === 'bm' ? 'Sertai Suar Kumpulan Sekarang' : 'Join Group Beacon Now'}</span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-sky-400" />
                      <span>{language === 'bm' ? 'Sertai Suar Kumpulan Sedia Ada' : 'Join Existing Beacon'}</span>
                    </h3>
                    <p className="text-xs text-stone-300">
                      {language === 'bm'
                        ? 'Masukkan kod jemputan daripada rakan untuk menyegerakkan designated pin anda pada peta live.'
                        : 'Enter the invite code from your group leader to join with your designated pin.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-400 mb-1.5">
                      {language === 'bm' ? 'Kod Jemputan Sesi' : 'Session Invite Code'}
                    </label>
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="e.g. CAMGO-TRIP-123"
                      className="w-full px-4 py-3 rounded-xl bg-stone-900 border border-white/15 text-sm font-mono uppercase tracking-wider text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/60 border border-white/5 text-xs text-stone-300 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      {language === 'bm'
                        ? 'Lokasi anda disegerakkan secara langsung dengan ahli kumpulan. Anda boleh matikan perkongsian pada bila-bila masa.'
                        : 'Your real GPS pin will be broadcast only to verified companions in this session. You can stop sharing anytime.'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleJoinSession}
                    disabled={loading || !joinCodeInput.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                    <span>{language === 'bm' ? 'Sertai Suar Kumpulan' : 'Join Group Beacon'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ACTIVE SESSION VIEW (Real Users Only) */
            <div className="space-y-4">
              {/* FEATURE: NAVIGATE TO BEACON CREATOR (HOST) */}
              {!isMeCreator && creatorMember ? (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/95 via-teal-950/80 to-stone-900 border-2 border-emerald-500/60 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-stone-950 shadow-lg shrink-0 font-bold">
                      <Navigation className="w-5 h-5 text-stone-950 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/50">
                          👑 BEACON HOST
                        </span>
                        <span className="text-xs text-stone-300 font-bold truncate">{creatorName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-emerald-300 font-mono mt-0.5 flex-wrap">
                        {hostDistanceMeters !== null && (
                          <span className="font-extrabold text-white bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                            {formatDistance(hostDistanceMeters)}
                          </span>
                        )}
                        {hostCardinal && (
                          <span>Bearing {hostCardinal} ({hostBearingDegrees}°)</span>
                        )}
                        <span className="text-stone-300">• {creatorMember.nearestLandmark || 'Cameron Highlands'}</span>
                      </div>
                    </div>
                  </div>

                  {/* One-Click Navigation Buttons to Creator */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleNavigateToHost('google')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 cursor-pointer transition-all active:scale-95"
                      title="Open Turn-by-Turn Navigation in Google Maps"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Google Maps</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleNavigateToHost('waze')}
                      className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                      title="Open in Waze"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Waze</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShowRouteToHost}
                      className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/15 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Center and fit visual route on map"
                    >
                      <Route className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'bm' ? 'Laluan Peta' : 'Fit Route'}</span>
                    </button>
                  </div>
                </div>
              ) : isMeCreator ? (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">👑</span>
                    <div>
                      <span className="font-extrabold text-amber-300 block">
                        {language === 'bm' ? 'Anda ialah Pencipta Suar (Host)' : 'You are the Beacon Host'}
                      </span>
                      <span className="text-stone-400 text-[11px]">
                        {language === 'bm'
                          ? 'Ahli kumpulan boleh menavigasi terus ke lokasi anda melalui Google Maps & Waze.'
                          : 'Companions can navigate directly to your real GPS location via Google Maps & Waze.'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-400/20 text-amber-300 font-mono font-extrabold text-[10px] uppercase border border-amber-400/40 shrink-0">
                    Pin #1 (Host)
                  </span>
                </div>
              ) : null}
              {/* Session Control Banner */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-stone-800 via-stone-850 to-stone-800 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono tracking-wider">
                      {session.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-900 text-stone-300 border border-white/10 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>~{remainingHours}h remaining</span>
                    </span>
                  </div>

                  {/* Invite Code */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs text-stone-400">{language === 'bm' ? 'Kod Sesi:' : 'Code:'}</span>
                    <span className="text-sm font-mono font-black text-white px-2.5 py-0.5 rounded bg-black/60 border border-emerald-500/40 select-all">
                      {session.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(session.code);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="p-1 rounded bg-stone-700 hover:bg-stone-600 text-stone-200 transition-colors"
                      title="Copy code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Locate Me Shortcut Button in Active Session */}
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={locatingUser}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                  >
                    <Crosshair className="w-3.5 h-3.5 animate-pulse" />
                    <span>{language === 'bm' ? 'Kesan Saya' : 'Locate Me'}</span>
                  </button>

                  {/* Switch to Create Another Beacon */}
                  <button
                    type="button"
                    onClick={handleSwitchToCreate}
                    className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'bm' ? 'Cipta Lain' : 'New Beacon'}</span>
                  </button>

                  {/* Switch to Join Another Beacon */}
                  <button
                    type="button"
                    onClick={handleSwitchToJoin}
                    className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                    <span>{language === 'bm' ? 'Sertai Lain' : 'Join Other'}</span>
                  </button>

                  {/* Leave Session */}
                  <button
                    type="button"
                    onClick={handleLeaveSession}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{language === 'bm' ? 'Keluar' : 'Leave'}</span>
                  </button>
                </div>
              </div>

              {/* View Switcher Tabs: MAP / COMPASS BEARING / DESIGNATED PINS */}
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('map')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'map'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{language === 'bm' ? 'Peta Live' : 'Live Map'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('compass')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'compass'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{language === 'bm' ? 'Kompas & Jarak' : 'Bearing & Distance'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('members')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeTab === 'members'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {language === 'bm' ? 'Ahli Designated' : 'Designated Pins'} ({designatedMembers.length})
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSharing}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                      isSharing
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                        : 'bg-stone-800 border-white/10 text-stone-400'
                    }`}
                  >
                    {isSharing ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isSharing ? 'Broadcasting GPS' : 'GPS Paused'}</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: LIVE MAP WITH DESIGNATED PINS */}
              {activeTab === 'map' && (
                <div className="space-y-3">
                  <div
                    ref={mapContainerRef}
                    className="w-full rounded-2xl overflow-hidden border border-white/15 shadow-inner relative z-10"
                    style={{ height: `${dynamicMapHeight}px` }}
                  />

                  {/* Map overlay controls */}
                  <div className="flex items-center justify-between text-xs text-stone-400 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{designatedMembers.length} real companions active in session</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowLiveMapModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>{language === 'bm' ? 'Peta Skrin Penuh' : 'Fullscreen Map'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: COMPASS & DISTANCE */}
              {activeTab === 'compass' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-stone-850 border border-white/10 space-y-4">
                  {selectedCompanion ? (
                    <div className="text-center space-y-4">
                      <div className="space-y-1">
                        <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                          {language === 'bm' ? 'Menjejak Ahli' : 'Tracking Companion'}
                        </span>
                        <h4 className="text-lg font-extrabold text-white">{selectedCompanion.name}</h4>
                        <p className="text-xs text-stone-400">{selectedCompanion.nearestLandmark || 'Cameron Highlands'}</p>
                      </div>

                      {/* Compass Circle */}
                      <div className="relative w-44 h-44 mx-auto rounded-full border-4 border-stone-700 bg-stone-900 flex items-center justify-center shadow-2xl">
                        <div
                          className="absolute inset-2 flex items-center justify-center transition-transform duration-500"
                          style={{ transform: `rotate(${liveBearingDegrees}deg)` }}
                        >
                          <div className="w-2 h-20 bg-gradient-to-t from-transparent via-rose-500 to-rose-400 rounded-full shadow-lg shadow-rose-500/50" />
                        </div>
                        <div className="z-10 text-center">
                          <span className="text-2xl font-black font-mono text-white">{liveCardinal}</span>
                          <span className="block text-[11px] font-mono text-stone-400">{liveBearingDegrees}°</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-stone-900/80 border border-white/10 max-w-xs mx-auto">
                        <span className="text-xs text-stone-400 block">{language === 'bm' ? 'Jarak Langsung' : 'Straight-Line Distance'}</span>
                        <span className="text-xl font-mono font-black text-emerald-400">{formatDistance(liveDistanceMeters)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-stone-400 space-y-2">
                      <Users className="w-8 h-8 text-stone-600 mx-auto" />
                      <p>
                        {language === 'bm'
                          ? 'Tiada rakan lain dalam sesi ini lagi. Kongsi kod sesi untuk memulakan penjejakan kompas.'
                          : 'No other companions have joined this session yet. Share your session code to track distances.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DESIGNATED PINS LIST */}
              {activeTab === 'members' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-stone-950/60 border border-white/10 text-xs text-stone-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {language === 'bm'
                        ? 'Setiap pengguna yang menyertai diberikan Designated Pin unik dengan warna dan koordinat tersendiri.'
                        : 'Every companion who joins receives their own designated pin badge and real-time GPS tracking.'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {designatedMembers.map((member, index) => {
                      const isMe = member.id === memberId;
                      const pinNumber = index + 1;
                      const pinColor = member.avatarColor || AVATAR_COLORS[index % AVATAR_COLORS.length].value;
                      const stale = isLocationStale(member.updatedAt);

                      return (
                        <div
                          key={member.id}
                          className="p-3 sm:p-3.5 rounded-xl bg-stone-800/80 border border-white/10 flex items-center justify-between gap-3 shadow-md"
                        >
                          <div className="flex items-center gap-3">
                            {/* Designated Pin Badge */}
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-md border-2 border-white/20 shrink-0"
                              style={{ backgroundColor: pinColor }}
                            >
                              #{pinNumber}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm text-stone-100">{member.name}</span>
                                {isMe && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    You
                                  </span>
                                )}
                                {member.id === session?.createdBy && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                                    👑 Host
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-400">
                                {member.nearestLandmark || 'Cameron Highlands'} · {formatTimeAgo(member.updatedAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {member.batteryLevel !== null && member.batteryLevel !== undefined && (
                              <div className="flex items-center gap-1 text-[11px] text-stone-400 font-mono">
                                <Battery className="w-3.5 h-3.5 text-stone-400" />
                                <span>{member.batteryLevel}%</span>
                              </div>
                            )}

                            {!isMe && member.id === session?.createdBy && (
                              <button
                                type="button"
                                onClick={() => handleNavigateToHost('google')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                                title="Navigate to Host in Google Maps"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>{language === 'bm' ? 'Pandu Arah' : 'Navigate'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCompanionId(member.id);
                                setActiveTab('map');
                                if (mapInstanceRef.current) {
                                  mapInstanceRef.current.setView([member.latitude, member.longitude], 17, { animate: true });
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Focus Pin
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Code Preview Modal */}
      {showQrModal && qrCodeDataUrl && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="p-5 rounded-3xl bg-stone-900 border border-emerald-500/40 text-center space-y-4 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                {language === 'bm' ? 'Imbas QR Suar' : 'Beacon QR Code'}
              </span>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-white rounded-2xl inline-block shadow-inner">
              <img src={qrCodeDataUrl} alt="Beacon QR Code" className="w-60 h-60 mx-auto" />
            </div>

            <p className="text-xs text-stone-400 font-mono">Code: {session?.code || preGeneratedCode}</p>
          </div>
        </div>
      )}

      {/* Fullscreen Live Beacon Map Modal */}
      {showLiveMapModal && (
        <LiveBeaconMapModal
          isOpen={showLiveMapModal}
          onClose={() => setShowLiveMapModal(false)}
          session={session}
          myCoords={myCoords}
          memberId={memberId}
          memberName={memberName || 'You'}
          avatarColor={avatarColor}
          batteryLevel={batteryLevel}
          language={language}
        />
      )}
    </div>
  );
};
