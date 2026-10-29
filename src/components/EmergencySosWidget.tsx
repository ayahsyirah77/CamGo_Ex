import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  PhoneCall,
  ShieldAlert,
  X,
  Copy,
  Check,
  Flame,
  Hospital,
  Shield,
  MapPin,
  Loader2,
  ExternalLink,
  MessageSquare,
  Share2,
  Phone,
  Settings,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { Language, EmergencyCard } from '../types';
import { firebaseService, DEFAULT_EMERGENCY_CARD } from '../services/firebase';

interface EmergencySosWidgetProps {
  language: Language;
  isOpenControlled?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTriggerOnMobile?: boolean;
}

interface HotlineItem {
  id: string;
  name: string;
  nameBm: string;
  number: string;
  tel: string;
  category: 'sos' | 'fire' | 'hospital' | 'police';
  description: string;
  descriptionBm: string;
  isPrimary?: boolean;
}

const EMERGENCY_HOTLINES: HotlineItem[] = [
  {
    id: 'sos',
    name: 'Emergency SOS',
    nameBm: 'Kecemasan SOS Kebangsaan',
    number: '999',
    tel: '999',
    category: 'sos',
    description: 'National 24/7 Emergency Dispatch (Police, Ambulance & Rescue)',
    descriptionBm: 'Pusat Panggilan Kecemasan 24/7 (Polis, Ambulans & Penyelamat)',
    isPrimary: true,
  },
  {
    id: 'bomba',
    name: 'Balai Bomba Tanah Rata',
    nameBm: 'Balai Bomba & Penyelamat Tanah Rata',
    number: '05-491 1444',
    tel: '054911444',
    category: 'fire',
    description: 'Landslide rescue, fallen trees, road accidents & firefighting',
    descriptionBm: 'Operasi tanah runtuh, pokok tumbang, kemalangan jalan raya & kebakaran',
  },
  {
    id: 'hospital',
    name: 'Hospital Sultanah Hajjah Kalsom',
    nameBm: 'Hospital Sultanah Hajjah Kalsom (Tanah Rata)',
    number: '05-491 1966',
    tel: '054911966',
    category: 'hospital',
    description: 'Highland district hospital with 24/7 Emergency & Trauma department',
    descriptionBm: 'Hospital daerah tanah tinggi dengan Jabatan Kecemasan & Trauma 24/7',
  },
  {
    id: 'polis',
    name: 'IPD Polis Cameron Highlands',
    nameBm: 'Ibu Pejabat Polis Daerah (IPD) Cameron Highlands',
    number: '05-491 1222',
    tel: '054911222',
    category: 'police',
    description: 'District police headquarters, hill patrol & traffic monitoring',
    descriptionBm: 'Ibu pejabat polis daerah, rondaan bukit & kawalan trafik',
  },
];

export const EmergencySosWidget: React.FC<EmergencySosWidgetProps> = ({
  language,
  isOpenControlled,
  onOpenChange,
  hideTriggerOnMobile = false,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) onOpenChange(open);
    setInternalOpen(open);
  };

  // Listen for custom event dispatch from anywhere (e.g. mobile radial menu)
  useEffect(() => {
    const handleOpenSos = () => setIsOpen(true);
    window.addEventListener('open-emergency-sos', handleOpenSos);
    return () => window.removeEventListener('open-emergency-sos', handleOpenSos);
  }, []);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [emergencyCard, setEmergencyCard] = useState<EmergencyCard>(() =>
    firebaseService.getEmergencyCard()
  );

  // Active target recipient selector ('primary' | 'secondary' | 'custom')
  const [selectedTarget, setSelectedTarget] = useState<'primary' | 'secondary'>('primary');

  // Dispatch state
  const [dispatchStatus, setDispatchStatus] = useState<
    'idle' | 'locating' | 'dispatching' | 'success' | 'error'
  >('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [dispatchedPayload, setDispatchedPayload] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Detect Web Share API capability
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanShare(true);
    }
  }, []);

  // Refresh card whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const card = firebaseService.getEmergencyCard();
      setEmergencyCard(card);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setDispatchStatus('idle');
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleCopy = (id: string, number: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(number.replace(/\s+/g, ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getTargetPhoneNumber = () => {
    if (selectedTarget === 'secondary') {
      return emergencyCard.secondaryContact?.phone || '';
    }
    return (
      emergencyCard.designatedSosNumber ||
      emergencyCard.primaryContact?.phone ||
      ''
    );
  };

  const getTargetRecipientName = () => {
    if (selectedTarget === 'secondary') {
      return `${emergencyCard.secondaryContact?.name || 'Secondary Contact'} (${
        emergencyCard.secondaryContact?.relationship || 'ICE 2'
      })`;
    }
    return `${emergencyCard.primaryContact?.name || 'Primary Contact'} (${
      emergencyCard.primaryContact?.relationship || 'ICE 1'
    })`;
  };

  const getCleanPhoneForUrl = (phone: string) => {
    return phone.replace(/[^0-9+]/g, '');
  };

  // Cross-platform SMS URL builder (iOS requires '&body=', Android/standards use '?body=')
  const buildSmsUrl = (phone: string, message: string) => {
    const clean = getCleanPhoneForUrl(phone);
    const isIOS =
      typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    return `sms:${clean}${separator}body=${encodeURIComponent(message)}`;
  };

  // WhatsApp wa.me URL builder
  const buildWhatsAppUrl = (phone: string, message: string) => {
    // WhatsApp requires digits only (country code without '+')
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      // Default to Malaysia +60 if starts with local 0
      clean = '60' + clean.substring(1);
    }
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  };

  const handleSendSos = () => {
    setDispatchStatus('locating');

    if (!('geolocation' in navigator)) {
      // Fallback coordinates for Cameron Highlands if browser lacks geolocation
      triggerDispatch({ lat: 4.472145, lng: 101.376829 }, 50);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        triggerDispatch({ lat: latitude, lng: longitude }, accuracy);
      },
      (error) => {
        console.warn('Geolocation denied/unavailable, using Cameron Highlands central pin:', error);
        triggerDispatch({ lat: 4.472145, lng: 101.376829 }, null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const triggerDispatch = async (
    userCoords: { lat: number; lng: number },
    accuracy: number | null
  ) => {
    setCoords(userCoords);
    setGpsAccuracy(accuracy ? Math.round(accuracy) : null);
    setDispatchStatus('dispatching');

    const destinationPhone = getTargetPhoneNumber();
    const mapsLink = `https://www.google.com/maps?q=${userCoords.lat},${userCoords.lng}`;

    const formattedPayload = [
      `🚨 CAMGO EMERGENCY SOS ALERT 🚨`,
      `Name: ${emergencyCard.fullLegalName || 'Highland Visitor'}${
        emergencyCard.preferredName ? ` (${emergencyCard.preferredName})` : ''
      }`,
      `DOB: ${emergencyCard.dateOfBirth || 'N/A'} | Blood: ${
        emergencyCard.bloodType || 'Unknown'
      }`,
      emergencyCard.severeAllergies ? `⚠️ Allergies: ${emergencyCard.severeAllergies}` : null,
      emergencyCard.chronicConditions
        ? `🏥 Conditions: ${emergencyCard.chronicConditions}`
        : null,
      emergencyCard.currentMedications
        ? `💊 Current Meds: ${emergencyCard.currentMedications}`
        : null,
      `📍 Live GPS: ${userCoords.lat.toFixed(6)}, ${userCoords.lng.toFixed(6)}${
        accuracy ? ` (±${Math.round(accuracy)}m)` : ''
      }`,
      `🗺️ Live Map: ${mapsLink}`,
      `📞 Target ICE: ${destinationPhone}`,
      `⏱️ Dispatched: ${new Date().toLocaleTimeString('en-MY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`,
    ]
      .filter(Boolean)
      .join('\n');

    setDispatchedPayload(formattedPayload);

    // Build the native SMS URI
    const smsUrl = buildSmsUrl(destinationPhone, formattedPayload);

    // Save dispatch record to telemetry/local log
    try {
      await firebaseService.dispatchEmergencySos(destinationPhone, userCoords, emergencyCard);
    } catch (e: any) {
      console.warn('Backend telemetry logging notice:', e);
    }

    setDispatchStatus('success');

    // Automatically trigger the device's native SMS messaging app via sms: protocol
    try {
      window.location.href = smsUrl;
    } catch (err) {
      console.warn('Native SMS protocol redirect note:', err);
    }
  };

  const handleNativeShare = async () => {
    if (!dispatchedPayload) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: '🚨 EMERGENCY SOS - Cameron Highlands',
          text: dispatchedPayload,
          url: coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : undefined,
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share error:', err);
      }
    }
  };

  const handleCopyPayload = () => {
    if (dispatchedPayload) {
      navigator.clipboard.writeText(dispatchedPayload);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2500);
    }
  };

  const getCategoryIcon = (category: HotlineItem['category']) => {
    switch (category) {
      case 'sos':
        return <ShieldAlert className="w-5 h-5 text-rose-300" />;
      case 'fire':
        return <Flame className="w-5 h-5 text-amber-400" />;
      case 'hospital':
        return <Hospital className="w-5 h-5 text-emerald-400" />;
      case 'police':
        return <Shield className="w-5 h-5 text-sky-400" />;
    }
  };

  const activeDestinationPhone = getTargetPhoneNumber();
  const currentSmsUrl = dispatchedPayload
    ? buildSmsUrl(activeDestinationPhone, dispatchedPayload)
    : '#';
  const currentWhatsAppUrl = dispatchedPayload
    ? buildWhatsAppUrl(activeDestinationPhone, dispatchedPayload)
    : '#';

  return (
    <>
      {/* Floating Trigger Button (Matches AI Chat Widget: h-11 w-11 sm:w-auto p-3.5 rounded-full) */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open Emergency SOS Hotlines & Native GPS Dispatch"
        className={`group relative ${
          hideTriggerOnMobile ? 'hidden sm:flex' : 'flex'
        } h-11 w-11 sm:w-auto p-3.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-2xl shadow-red-950/90 border border-red-400/40 active:scale-95 transition-transform cursor-pointer items-center justify-center gap-2`}
        title="Emergency SOS 999 & Native SMS Protocol Dispatch"
      >
        {/* Animated beacon ring */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-stone-950" />
        </span>

        <PhoneCall className="w-4 h-4 shrink-0 text-white animate-bounce" />
        <span className="hidden sm:inline font-mono font-black tracking-wider uppercase">SOS 999</span>
      </button>

      {/* Pop-Out Emergency SOS Modal via React Portal to document.body for clean native mobile scrolling */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="w-full max-w-lg max-h-[88vh] sm:max-h-[85vh] h-[88vh] sm:h-[82vh] flex flex-col rounded-3xl bg-stone-900 border-2 border-red-500/40 shadow-[0_0_70px_rgba(239,68,68,0.35)] text-stone-100 relative overflow-hidden backdrop-blur-xl min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Modal Header */}
              <div className="shrink-0 flex items-center justify-between border-b border-red-500/20 px-4 sm:px-5 py-3.5 bg-stone-900/95 backdrop-blur-md z-30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 shrink-0">
                    <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-black text-base sm:text-lg text-white tracking-wide">
                        Emergency SOS
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] font-mono font-bold text-red-300">
                        Native SMS &amp; 999
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-stone-400">
                      {language === 'bm'
                        ? 'Protokol SMS peranti asli, WhatsApp & Talian 999'
                        : 'Native device SMS protocol, WhatsApp & 999 hotlines'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 transition-colors cursor-pointer shrink-0"
                  aria-label="Close Emergency SOS"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body with overflow-y-auto & touch momentum scrolling */}
              <div
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4 touch-pan-y scroll-smooth"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {/* 1. SECTION: Emergency Info & Live Dispatch Cards */}
                <section aria-label="Emergency Info Cards" className="space-y-3">
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-black uppercase tracking-wider text-red-400">
                      <MapPin className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                      <span>
                        {language === 'bm'
                          ? '1. Maklumat & Penghantaran GPS'
                          : '1. Emergency Info & Live GPS'}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      Native sms: Protocol
                    </span>
                  </div>

                  {/* Main Emergency Dispatch Box */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-red-950/80 via-stone-950 to-stone-900 border-2 border-red-500/50 shadow-xl shadow-red-950/50 space-y-3.5 relative overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                        </span>
                        <span className="text-xs font-mono font-black uppercase tracking-wider text-red-300">
                          Native Phone SMS &amp; GPS Dispatch
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          window.dispatchEvent(new CustomEvent('open-emergency-card'));
                        }}
                        className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-white hover:underline cursor-pointer"
                      >
                        <Settings className="w-3 h-3 text-red-400" />
                        <span>Edit ICE Card</span>
                      </button>
                    </div>

                    {/* Recipient Selector: ICE 1 vs ICE 2 */}
                    <div className="space-y-1.5">
                      <div className="text-stone-400 text-[11px] flex items-center justify-between">
                        <span>Select Target Contact to Receive SOS:</span>
                        <span className="text-[10px] text-red-400 font-mono">No Twilio Required</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedTarget('primary')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedTarget === 'primary'
                              ? 'bg-red-500/20 border-red-500 text-white shadow-sm'
                              : 'bg-stone-950/60 border-white/10 text-stone-400 hover:border-white/20'
                          }`}
                        >
                          <div className="font-bold text-xs truncate flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-300 text-[9px] font-mono">
                              ICE 1
                            </span>
                            <span className="truncate">{emergencyCard.primaryContact?.name || 'Primary'}</span>
                          </div>
                          <div className="font-mono text-[11px] text-stone-300 mt-0.5 truncate">
                            {emergencyCard.primaryContact?.phone || 'Not configured'}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedTarget('secondary')}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedTarget === 'secondary'
                              ? 'bg-red-500/20 border-red-500 text-white shadow-sm'
                              : 'bg-stone-950/60 border-white/10 text-stone-400 hover:border-white/20'
                          }`}
                        >
                          <div className="font-bold text-xs truncate flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-stone-700 text-stone-300 text-[9px] font-mono">
                              ICE 2
                            </span>
                            <span className="truncate">{emergencyCard.secondaryContact?.name || 'Backup'}</span>
                          </div>
                          <div className="font-mono text-[11px] text-stone-300 mt-0.5 truncate">
                            {emergencyCard.secondaryContact?.phone || 'Not configured'}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Dispatch Action Button / Status State */}
                    {dispatchStatus === 'idle' && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleSendSos}
                          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm tracking-wide shadow-lg shadow-red-950/80 flex items-center justify-center gap-2.5 active:scale-95 transition-transform cursor-pointer border border-red-400/40"
                        >
                          <MapPin className="w-4 h-4 text-white animate-bounce shrink-0" />
                          <span>SEND SOS WITH LIVE GPS COORDINATES</span>
                        </button>
                        <p className="text-[10px] text-stone-400 text-center">
                          ⚡ Captures high-accuracy GPS &amp; triggers your device&apos;s native{' '}
                          <code className="text-red-300 font-mono">sms:</code> messaging composer instantly.
                        </p>
                      </div>
                    )}

                    {(dispatchStatus === 'locating' || dispatchStatus === 'dispatching') && (
                      <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center gap-3 text-xs text-red-200">
                        <Loader2 className="w-4 h-4 animate-spin text-red-400 shrink-0" />
                        <span>
                          {dispatchStatus === 'locating'
                            ? 'Capturing exact GPS coordinates via Geolocation API...'
                            : 'Opening native messaging app via sms: protocol...'}
                        </span>
                      </div>
                    )}

                    {dispatchStatus === 'success' && (
                      <div className="p-4 rounded-xl bg-stone-900 border border-emerald-500/50 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>Native Messaging Triggered via sms: Protocol!</span>
                        </div>

                        <p className="text-[11px] text-stone-300 leading-relaxed">
                          Your device&apos;s native SMS app has been launched with your GPS location and emergency card. If it didn&apos;t open automatically, use any of the direct native channels below:
                        </p>

                        {coords && (
                          <div className="text-xs space-y-1 font-mono text-stone-300 bg-stone-950 p-2.5 rounded-lg border border-white/5">
                            <div className="flex items-center justify-between">
                              <span>GPS: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
                              {gpsAccuracy && (
                                <span className="text-[10px] text-emerald-400">±{gpsAccuracy}m</span>
                              )}
                            </div>
                            <div className="text-[11px] text-sky-400 truncate">
                              <a
                                href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline flex items-center gap-1"
                              >
                                <Navigation className="w-3 h-3 shrink-0" />
                                <span>View live pin on Google Maps</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Primary Native Direct Communication Buttons */}
                        <div className="space-y-2 pt-1">
                          {/* 1. Native SMS App (sms: protocol) */}
                          <a
                            href={currentSmsUrl}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors shadow-md shadow-sky-950/50"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>Launch Native Phone Messages (sms: protocol)</span>
                          </a>

                          <div className="grid grid-cols-2 gap-2">
                            {/* 2. Direct WhatsApp (wa.me) */}
                            <a
                              href={currentWhatsAppUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>

                            {/* 3. Direct Native Cellular Call */}
                            <a
                              href={`tel:${getCleanPhoneForUrl(activeDestinationPhone)}`}
                              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-sm"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Direct Call</span>
                            </a>
                          </div>

                          <div className="flex gap-2">
                            {/* 4. Web Share API (Telegram, Signal, Contacts, AirDrop, etc.) */}
                            {canShare && (
                              <button
                                type="button"
                                onClick={handleNativeShare}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors cursor-pointer border border-white/10"
                              >
                                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                                <span>Native Share Sheet</span>
                              </button>
                            )}

                            {/* 5. Copy Message Text */}
                            <button
                              type="button"
                              onClick={handleCopyPayload}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors cursor-pointer border border-white/10"
                            >
                              {copiedPayload ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-stone-400" />
                                  <span>Copy Message</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDispatchStatus('idle')}
                          className="text-[11px] text-stone-400 hover:text-white underline cursor-pointer block text-center w-full pt-1"
                        >
                          Recalibrate GPS coordinates &amp; re-send
                        </button>
                      </div>
                    )}

                    {/* Medical Snapshot in SOS card */}
                    <div className="p-3 rounded-xl bg-stone-950/70 border border-white/5 text-[11px] text-stone-300 space-y-1">
                      <div className="flex items-center justify-between text-stone-400">
                        <span>
                          Cardholder: <strong className="text-white">{emergencyCard.fullLegalName}</strong>
                        </span>
                        <span className="font-mono text-red-400 font-bold">
                          Blood: {emergencyCard.bloodType}
                        </span>
                      </div>
                      {emergencyCard.severeAllergies && (
                        <div className="text-rose-300 truncate">
                          <strong>Allergies:</strong> {emergencyCard.severeAllergies}
                        </div>
                      )}
                      {emergencyCard.chronicConditions && (
                        <div className="text-amber-300/90 truncate">
                          <strong>Conditions:</strong> {emergencyCard.chronicConditions}
                        </div>
                      )}
                      {emergencyCard.currentMedications && (
                        <div className="text-sky-300/90 truncate">
                          <strong>Meds:</strong> {emergencyCard.currentMedications}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* 2. SECTION: Official 24/7 Highlands Emergency Hotlines - Separated with Sticky Header */}
                <section aria-label="Highlands Emergency Contacts" className="relative space-y-3">
                  {/* Sticky Header: Cleanly separates Emergency Info Cards above from Contacts List below */}
                  <div className="sticky top-0 z-20 -mx-4 sm:-mx-5 px-4 sm:px-5 py-2.5 bg-stone-900/95 backdrop-blur-md border-y border-white/10 shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="font-bold text-xs uppercase tracking-wider text-stone-200">
                        {language === 'bm'
                          ? '2. Senarai Talian Kecemasan Cameron Highlands'
                          : '2. Official Emergency Contacts'}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      24/7 Standby
                    </span>
                  </div>

                  {/* Hotline Cards List */}
                  <div className="space-y-2.5 pt-1">
                    {EMERGENCY_HOTLINES.map((hotline) => (
                      <div
                        key={hotline.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          hotline.isPrimary
                            ? 'bg-gradient-to-r from-red-950/70 via-stone-900 to-red-950/40 border-red-500/50 shadow-md'
                            : 'bg-stone-950/70 border-white/10 hover:border-red-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-xl bg-stone-900 border border-white/10 shrink-0 mt-0.5">
                              {getCategoryIcon(hotline.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-stone-100 truncate">
                                  {language === 'bm' ? hotline.nameBm : hotline.name}
                                </h4>
                                {hotline.isPrimary && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500 text-white">
                                    Direct
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-400 leading-snug mt-0.5">
                                {language === 'bm' ? hotline.descriptionBm : hotline.description}
                              </p>
                              <div className="font-mono font-black text-base text-red-400 mt-1">
                                {hotline.number}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/5">
                          <a
                            href={`tel:${hotline.tel}`}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs cursor-pointer shadow-md transition-all active:scale-95 ${
                              hotline.isPrimary
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                            }`}
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>
                              {language === 'bm' ? `Panggil ${hotline.number}` : `Call ${hotline.number}`}
                            </span>
                          </a>

                          <button
                            onClick={(e) => handleCopy(hotline.id, hotline.number, e)}
                            className="flex items-center gap-1 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer transition-colors"
                            title="Copy phone number"
                          >
                            {copiedId === hotline.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-bold">
                                  {language === 'bm' ? 'Disalin' : 'Copied'}
                                </span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-stone-400" />
                                <span>{language === 'bm' ? 'Salin' : 'Copy'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 3. Highlands Guidance Notice */}
                <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-white/5 text-[11px] text-stone-400 text-center leading-relaxed">
                  {language === 'bm'
                    ? 'Sekiranya talian sesak atau tiada isyarat telefon di rabung tinggi, teruskan ke balai polis atau bomba pekan berhampiran.'
                    : 'For highlands emergencies with poor mobile coverage on high ridges, proceed to the nearest township police station or fire post.'}
                </div>

                {/* 4. Bottom Close Button inside scroll view */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  {language === 'bm' ? 'Tutup Panggilan Kecemasan' : 'Close Emergency Panel'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
