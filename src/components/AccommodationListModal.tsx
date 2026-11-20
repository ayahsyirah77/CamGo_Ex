// src/components/AccommodationListModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  MapPin,
  Calendar,
  Lock,
  ShieldCheck,
  CheckCircle2,
  BedDouble,
  Sparkles,
  ExternalLink,
  Clock,
  ArrowRight,
  Phone,
  QrCode,
  DollarSign,
  Building,
  Store,
  Check,
  Filter,
  Upload,
  FileCheck2,
  AlertTriangle,
  Info,
  Coffee,
  ParkingCircle,
  Utensils,
} from 'lucide-react';
import QRCode from 'qrcode';
import { AccommodationListing, AccommodationBooking, Township, Language } from '../types';
import { firebaseService } from '../services/firebase';
import { safeSrc, DEFAULT_PLACE_IMAGE } from '../utils/safeMedia';

interface AccommodationListModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  onOpenVendorPortal?: () => void;
}

export const AccommodationListModal: React.FC<AccommodationListModalProps> = ({
  isOpen,
  onClose,
  language = 'en',
  onOpenVendorPortal,
}) => {
  const [listings, setListings] = useState<AccommodationListing[]>([]);
  const [selectedTownship, setSelectedTownship] = useState<string>('all');
  const [selectedBookingType, setSelectedBookingType] = useState<'all' | 'instant' | 'request'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  // Booking Flow State
  const [activeListingForBooking, setActiveListingForBooking] = useState<AccommodationListing | null>(null);
  const [checkInDate, setCheckInDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('+601');
  const [guestEmail, setGuestEmail] = useState('');
  const [selectedGateway, setSelectedGateway] = useState<'billplz' | 'toyyibpay' | 'stripe'>('billplz');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [paymentProofName, setPaymentProofName] = useState<string>('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [bookingFormError, setBookingFormError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedRoomOptionId, setSelectedRoomOptionId] = useState<string>('');
  const [rateTier, setRateTier] = useState<'normal' | 'peak'>('normal');
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  // Confirmed Booking Voucher Modal
  const [unlockedBooking, setUnlockedBooking] = useState<AccommodationBooking | null>(null);
  const [voucherQrUrl, setVoucherQrUrl] = useState<string | null>(null);
  const [hostWhatsAppUrl, setHostWhatsAppUrl] = useState<string>('');

  // Load listings on mount
  useEffect(() => {
    if (isOpen) {
      setListings(firebaseService.getAccommodationListings());
    }
    const handleUpdate = () => {
      setListings(firebaseService.getAccommodationListings());
    };
    window.addEventListener('accommodation-listings-updated', handleUpdate);
    window.addEventListener('vendor-listings-updated', handleUpdate);
    return () => {
      window.removeEventListener('accommodation-listings-updated', handleUpdate);
      window.removeEventListener('vendor-listings-updated', handleUpdate);
    };
  }, [isOpen]);

  // Generate QR Voucher
  useEffect(() => {
    if (unlockedBooking) {
      QRCode.toDataURL(
        `https://camgo.my/voucher/${unlockedBooking.qrVoucherCode}?homestay=${encodeURIComponent(
          unlockedBooking.homestayName
        )}&deposit=RM30_PAID&collect_at_door=RM${unlockedBooking.balanceToCollect}`,
        {
          width: 220,
          margin: 2,
          color: { dark: '#064e3b', light: '#ffffff' },
        }
      )
        .then((url) => setVoucherQrUrl(url))
        .catch(() => setVoucherQrUrl(null));
    } else {
      setVoucherQrUrl(null);
    }
  }, [unlockedBooking]);

  // Build selectable unit / room options for active listing
  const availableRoomOptions = useMemo(() => {
    if (!activeListingForBooking) return [];
    const options: Array<{
      id: string;
      unitId?: string;
      label: string;
      unitCode: string;
      pricePerNight: number;
      peakPricePerNight: number;
      bedConfig?: string;
      checkInWindow?: string;
      checkOutWindow?: string;
      parkingType?: string;
      parkingDetails?: string;
      breakfastIncluded?: boolean;
      cookingPermitted?: boolean;
      kitchenNotes?: string;
      houseRules?: string;
    }> = [];

    const units = (activeListingForBooking.units || []).filter((u) => u.isAvailable !== false);
    if (units.length > 0) {
      units.forEach((u, uIdx) => {
        const uCode = u.unitCode || u.unitLabel || activeListingForBooking.code || `Unit ${uIdx + 1}`;
        if (u.roomTypes && u.roomTypes.length > 0) {
          u.roomTypes.forEach((rt, rtIdx) => {
            if ((rt.quantity ?? 1) <= 0) return;
            const rate = Number(rt.pricePerNight ?? activeListingForBooking.pricePerNight ?? 0);
            const peakRate = Number(rt.peakPricePerNight ?? 0);
            const rateLabel =
              rate > 0
                ? peakRate > 0
                  ? ` · Normal RM ${rate} / Peak RM ${peakRate}`
                  : ` · RM ${rate}/night`
                : peakRate > 0
                ? ` · Peak RM ${peakRate}/night`
                : '';
            options.push({
              id: `${u.id}__${rt.id || rtIdx}`,
              unitId: u.id,
              label: `${uCode} — ${rt.name}${rt.bedConfig ? ` (${rt.bedConfig})` : ''}${rateLabel}`,
              unitCode: uCode,
              pricePerNight: rate,
              peakPricePerNight: peakRate,
              bedConfig: rt.bedConfig,
              checkInWindow: u.checkInTime || activeListingForBooking.checkInWindow,
              checkOutWindow: u.checkOutTime || activeListingForBooking.checkOutWindow,
              parkingType: u.parkingType || activeListingForBooking.parkingType,
              parkingDetails: u.parkingDetails ?? activeListingForBooking.parkingDetails,
              breakfastIncluded:
                u.breakfastIncluded !== undefined
                  ? u.breakfastIncluded
                  : activeListingForBooking.breakfastIncluded,
              cookingPermitted:
                u.cookingPermitted !== undefined
                  ? u.cookingPermitted
                  : activeListingForBooking.cookingPermitted,
              kitchenNotes: u.kitchenNotes ?? activeListingForBooking.kitchenNotes,
              houseRules: u.houseRules ?? activeListingForBooking.houseRules,
            });
          });
        } else {
          const rate = Number(activeListingForBooking.pricePerNight ?? 0);
          const peakRate = Number(activeListingForBooking.peakPricePerNight ?? 0);
          options.push({
            id: u.id,
            unitId: u.id,
            label: `${uCode} (${u.roomsPerUnit || activeListingForBooking.bedrooms} Rooms)${rate > 0 ? ` · RM ${rate}/night` : ''}${peakRate > 0 ? ` / Peak RM ${peakRate}` : ''}`,
            unitCode: uCode,
            pricePerNight: rate,
            peakPricePerNight: peakRate,
            checkInWindow: u.checkInTime || activeListingForBooking.checkInWindow,
            checkOutWindow: u.checkOutTime || activeListingForBooking.checkOutWindow,
            parkingType: u.parkingType || activeListingForBooking.parkingType,
            parkingDetails: u.parkingDetails ?? activeListingForBooking.parkingDetails,
            breakfastIncluded:
              u.breakfastIncluded !== undefined
                ? u.breakfastIncluded
                : activeListingForBooking.breakfastIncluded,
            cookingPermitted:
              u.cookingPermitted !== undefined
                ? u.cookingPermitted
                : activeListingForBooking.cookingPermitted,
            kitchenNotes: u.kitchenNotes ?? activeListingForBooking.kitchenNotes,
            houseRules: u.houseRules ?? activeListingForBooking.houseRules,
          });
        }
      });
    } else if (activeListingForBooking.roomTypes && activeListingForBooking.roomTypes.length > 0) {
      activeListingForBooking.roomTypes.forEach((rt, idx) => {
        if ((rt.quantity ?? 1) <= 0) return;
        const rate = Number(rt.pricePerNight ?? activeListingForBooking.pricePerNight ?? 0);
        const peakRate = Number(rt.peakPricePerNight ?? activeListingForBooking.peakPricePerNight ?? 0);
        const rateLabel =
          rate > 0
            ? peakRate > 0
              ? ` · Normal RM ${rate} / Peak RM ${peakRate}`
              : ` · RM ${rate}/night`
            : peakRate > 0
            ? ` · Peak RM ${peakRate}/night`
            : '';
        options.push({
          id: rt.id || `rt-${idx}`,
          unitId: activeListingForBooking.unitId,
          label: `${activeListingForBooking.code} — ${rt.name}${rt.bedConfig ? ` (${rt.bedConfig})` : ''}${rateLabel}`,
          unitCode: activeListingForBooking.code,
          pricePerNight: rate,
          peakPricePerNight: peakRate,
          bedConfig: rt.bedConfig,
          checkInWindow: activeListingForBooking.checkInWindow,
          checkOutWindow: activeListingForBooking.checkOutWindow,
          parkingType: activeListingForBooking.parkingType,
          parkingDetails: activeListingForBooking.parkingDetails,
          breakfastIncluded: activeListingForBooking.breakfastIncluded,
          cookingPermitted: activeListingForBooking.cookingPermitted,
          kitchenNotes: activeListingForBooking.kitchenNotes,
          houseRules: activeListingForBooking.houseRules,
        });
      });
    }

    if (options.length === 0) {
      const rate = Number(activeListingForBooking.pricePerNight ?? 0);
      const peakRate = Number(activeListingForBooking.peakPricePerNight ?? 0);
      options.push({
        id: 'default-unit',
        unitId: activeListingForBooking.unitId,
        label: `${activeListingForBooking.code} — Standard Unit${rate > 0 ? ` · RM ${rate}/night` : ''}${peakRate > 0 ? ` / Peak RM ${peakRate}` : ''}`,
        unitCode: activeListingForBooking.code,
        pricePerNight: rate,
        peakPricePerNight: peakRate,
        checkInWindow: activeListingForBooking.checkInWindow,
        checkOutWindow: activeListingForBooking.checkOutWindow,
        parkingType: activeListingForBooking.parkingType,
        parkingDetails: activeListingForBooking.parkingDetails,
        breakfastIncluded: activeListingForBooking.breakfastIncluded,
        cookingPermitted: activeListingForBooking.cookingPermitted,
        kitchenNotes: activeListingForBooking.kitchenNotes,
        houseRules: activeListingForBooking.houseRules,
      });
    }

    return options;
  }, [activeListingForBooking]);

  useEffect(() => {
    if (activeListingForBooking) {
      const matchedOpt = activeListingForBooking.unitId
        ? availableRoomOptions.find((o) => o.unitId === activeListingForBooking.unitId)
        : undefined;
      setSelectedRoomOptionId(matchedOpt?.id || availableRoomOptions[0]?.id || '');
      setShowMoreInfo(false);
    }
  }, [activeListingForBooking, availableRoomOptions]);

  const selectedRoomOption = useMemo(() => {
    return (
      availableRoomOptions.find((o) => o.id === selectedRoomOptionId) ||
      availableRoomOptions[0] ||
      null
    );
  }, [availableRoomOptions, selectedRoomOptionId]);

  // Auto-detect Fri/Sat/Sun check-in as weekend/peak hint when peak rate exists
  useEffect(() => {
    if (!checkInDate || !(selectedRoomOption?.peakPricePerNight)) {
      setRateTier('normal');
      return;
    }
    const day = new Date(`${checkInDate}T12:00:00`).getDay();
    setRateTier(day === 5 || day === 6 || day === 0 ? 'peak' : 'normal');
  }, [checkInDate, selectedRoomOption?.peakPricePerNight]);

  const activeNormalRate =
    selectedRoomOption?.pricePerNight ?? activeListingForBooking?.pricePerNight ?? 0;
  const activePeakRate =
    selectedRoomOption?.peakPricePerNight ?? activeListingForBooking?.peakPricePerNight ?? 0;
  const activeNightlyRate =
    rateTier === 'peak' && activePeakRate > 0 ? activePeakRate : activeNormalRate;

  // Nights and pricing calculation
  const nights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 1;
    const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    return Math.max(1, Math.round(diff / (1000 * 3600 * 24)));
  }, [checkInDate, checkOutDate]);

  const totalPrice = useMemo(() => {
    if (!activeListingForBooking) return 0;
    return activeNightlyRate * nights;
  }, [activeListingForBooking, activeNightlyRate, nights]);

  const balanceToCollect = useMemo(() => {
    return Math.max(0, totalPrice - 30);
  }, [totalPrice]);

  // Filtered Listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (selectedTownship !== 'all' && item.township !== selectedTownship) return false;
      if (selectedBookingType !== 'all' && item.bookingType !== selectedBookingType) return false;
      if (onlyAvailable && item.roomAvailabilityStatus === 'fully_booked') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.maskedTitle.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        const matchTown = item.township.toLowerCase().includes(q);
        const matchReal = item.realBusinessName.toLowerCase().includes(q);
        const matchProp = (item.propertyName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchTown && !matchReal && !matchProp) return false;
      }
      return true;
    });
  }, [listings, selectedTownship, selectedBookingType, onlyAvailable, searchQuery]);

  if (!isOpen) return null;

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBookingFormError(null);
    if (file.size > 10 * 1024 * 1024) {
      setBookingFormError('Receipt file exceeds 10MB. Please upload a smaller image or PDF.');
      return;
    }
    setIsUploadingProof(true);
    setPaymentProofName(file.name);
    try {
      const uploadedUrl = await firebaseService.uploadImage(file, 'payment_proofs');
      setPaymentProofUrl(uploadedUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPaymentProofUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Handle RM30 Deposit Payment, Vendor Alert & Host WhatsApp Notification
  const handleLockHomestay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingFormError(null);
    if (!activeListingForBooking || !guestName.trim() || !guestPhone.trim()) {
      setBookingFormError('Please fill in your Full Name and WhatsApp Phone Number.');
      return;
    }
    if (!paymentProofUrl && !paymentReference.trim()) {
      setBookingFormError('Please upload your Proof of Payment receipt or enter your Transaction Reference ID before paying.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Simulate Payment Gateway Settlement (~1s)
      await new Promise((resolve) => setTimeout(resolve, 900));

      const bookingCode = `CG-${activeListingForBooking.code.replace('CH-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const qrCode = `VCHR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const matchedVendor = firebaseService
        .getVendorListings()
        .find(
          (v) =>
            v.id === activeListingForBooking.vendorId ||
            v.id === activeListingForBooking.id ||
            v.businessName.toLowerCase().trim() === activeListingForBooking.realBusinessName.toLowerCase().trim()
        );

      const vendorEmail = activeListingForBooking.ownerEmail || matchedVendor?.ownerEmail;
      const vendorUid = activeListingForBooking.ownerUid || matchedVendor?.ownerUid;
      const hostWaRaw = activeListingForBooking.whatsappNumber || activeListingForBooking.ownerPhone || '+60123456789';
      const hostWaDigits = hostWaRaw.replace(/\D/g, '');

      const chosenUnitRoomLabel =
        selectedRoomOption?.label ||
        `${activeListingForBooking.code} Standard Room`;
      const chosenUnitCode = selectedRoomOption?.unitCode || activeListingForBooking.code;

      const activePropertyTitle =
        activeListingForBooking.propertyName?.trim() ||
        activeListingForBooking.realBusinessName?.trim() ||
        chosenUnitCode;

      const newBooking: AccommodationBooking = {
        id: `cg_bk_${Date.now()}`,
        bookingCode,
        homestayId: activeListingForBooking.vendorId || activeListingForBooking.id,
        homestayName: activePropertyTitle,
        maskedTitle: chosenUnitCode,
        township: activeListingForBooking.township,
        ownerPhone: hostWaRaw,
        ownerName: activeListingForBooking.ownerName,
        vendorEmail,
        vendorUid,
        customerName: guestName.trim(),
        customerPhone: guestPhone.trim(),
        customerEmail: guestEmail.trim() || undefined,
        checkInDate,
        checkOutDate,
        nights,
        roomTypeName: chosenUnitRoomLabel,
        totalRoomPrice: totalPrice,
        depositAmount: 30,
        balanceToCollect,
        bookingType: activeListingForBooking.bookingType,
        status: activeListingForBooking.bookingType === 'instant' ? 'confirmed' : 'pending_owner_approval',
        depositPaymentStatus: 'paid',
        paymentGateway: selectedGateway,
        paymentProofUrl: paymentProofUrl || undefined,
        paymentProofName: paymentProofName || undefined,
        paymentReference: paymentReference.trim() || undefined,
        isUnlocked: true,
        qrVoucherCode: qrCode,
        bundledPerks: activeListingForBooking.bundledPerks,
        createdAt: new Date().toISOString(),
        expiresAt:
          activeListingForBooking.bookingType === 'request'
            ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
            : undefined,
        whatsappStatus: 'sent',
        notes: `RM30 deposit paid via ${selectedGateway.toUpperCase()}${paymentReference.trim() ? ` (Ref: ${paymentReference.trim()})` : ''}.`,
      };

      await firebaseService.saveAccommodationBooking(newBooking);

      // Dispatch Real-Time Vendor Booking & Payment Alert (triggers vendor banner + phone alert + standalone modal)
      await firebaseService.createVendorBookingAlert({
        bookingId: newBooking.id,
        bookingCode: newBooking.bookingCode,
        bookingType: 'accommodation',
        vendorId: activeListingForBooking.vendorId || activeListingForBooking.id,
        vendorName: activePropertyTitle,
        vendorEmail,
        vendorUid,
        guestName: newBooking.customerName,
        guestPhone: newBooking.customerPhone,
        guestEmail: newBooking.customerEmail,
        itemSummary: `${chosenUnitRoomLabel} (${nights} night${nights > 1 ? 's' : ''})`,
        checkInOrStart: checkInDate,
        checkOutOrEnd: checkOutDate,
        totalAmountRm: totalPrice,
        depositPaidRm: 30,
        balanceDueRm: balanceToCollect,
        paymentGateway: selectedGateway,
        paymentReference: paymentReference.trim() || undefined,
        paymentProofUrl: paymentProofUrl || undefined,
        paymentProofName: paymentProofName || undefined,
        whatsappNotified: true,
      });

      const proofLine = paymentProofUrl && !paymentProofUrl.startsWith('data:')
        ? `Proof of Payment Link: ${paymentProofUrl}`
        : paymentProofName
        ? `Proof of Payment Attached: ${paymentProofName}`
        : `Proof Reference: ${paymentReference.trim()}`;

      const hostWaText = [
        `CamGo New Paid Booking (${bookingCode})`,
        `Unit / Room: ${chosenUnitRoomLabel}`,
        `Homestay: ${activePropertyTitle} (${activeListingForBooking.township})`,
        `Guest Name: ${newBooking.customerName}`,
        `Guest Phone: ${newBooking.customerPhone}`,
        newBooking.customerEmail ? `Guest Email: ${newBooking.customerEmail}` : null,
        `Check-In: ${checkInDate}`,
        `Check-Out: ${checkOutDate} (${nights} night${nights > 1 ? 's' : ''})`,
        `Payment Method: ${selectedGateway.toUpperCase()}`,
        `RM30 Deposit: PAID`,
        `Door Balance: RM ${balanceToCollect}`,
        paymentReference.trim() ? `Transaction Ref: ${paymentReference.trim()}` : null,
        proofLine,
        `Please confirm check-in arrangement with guest.`,
      ]
        .filter(Boolean)
        .join('\n');

      const builtWaUrl = `https://wa.me/${hostWaDigits}?text=${encodeURIComponent(hostWaText)}`;
      setHostWhatsAppUrl(builtWaUrl);

      // Automatically open WhatsApp notification to host with full guest details & proof of payment
      if (hostWaDigits) {
        try {
          window.open(builtWaUrl, '_blank', 'noopener,noreferrer');
        } catch (waErr) {
          console.warn('WhatsApp popup fallback will be shown in confirmation modal:', waErr);
        }
      }

      // Open Voucher Confirmation Modal
      setUnlockedBooking(newBooking);
      setActiveListingForBooking(null);
      setPaymentProofUrl(null);
      setPaymentProofName('');
      setPaymentReference('');
    } catch (err) {
      console.error('Booking lock error:', err);
      setBookingFormError('Could not complete deposit submission. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/90 backdrop-blur-md flex flex-col justify-start">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-30 bg-stone-950/95 border-b border-stone-800 backdrop-blur-xl px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
              <BedDouble className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  Cameron Highlands Verified Homestays &amp; Stays
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-400 truncate">
                Browse verified homestays, apartments &amp; chalets in Cameron Highlands
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Township Filter Tabs */}
        <div className="max-w-6xl mx-auto mt-3 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by code (e.g. CH-07), township (Kea Farm), or landmark..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Booking Type Filter */}
            <div className="flex items-center gap-1 bg-stone-900/90 p-1 rounded-xl border border-stone-800 text-xs shrink-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedBookingType('all')}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  selectedBookingType === 'all' ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-white'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setSelectedBookingType('instant')}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                  selectedBookingType === 'instant' ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Instant Confirm</span>
              </button>
              <button
                onClick={() => setSelectedBookingType('request')}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                  selectedBookingType === 'request' ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-white'
                }`}
              >
                <Clock className="w-3 h-3 text-cyan-300" />
                <span>30-Min SLA</span>
              </button>
            </div>

            {/* Availability Toggle */}
            <button
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`px-3 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                onlyAvailable
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${onlyAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-stone-600'}`} />
              Available Today Only
            </button>
          </div>

          {/* Township Horizontal Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            {['all', 'Kea Farm', 'Brinchang', 'Tanah Rata', 'Ringlet', 'Tringkap'].map((town) => (
              <button
                key={town}
                onClick={() => setSelectedTownship(town)}
                className={`px-3 py-1 rounded-full font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                  selectedTownship === town
                    ? 'bg-emerald-500 text-stone-950 font-black shadow-md shadow-emerald-950/80'
                    : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                {town === 'all' ? 'All Townships' : town}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Accommodation Listings Grid */}
        {listings.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-stone-900/60 border border-stone-800 space-y-4 max-w-xl mx-auto my-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
              <Building className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-lg font-bold text-white">No Homestays or Stays Listed Yet</h4>
              <p className="text-xs text-stone-400 leading-relaxed">
                Only active vendor listings created and managed by administrators or verified hosts appear here.
              </p>
            </div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-stone-900/60 border border-stone-800 space-y-3">
            <BedDouble className="w-10 h-10 text-stone-500 mx-auto" />
            <h4 className="text-base font-bold text-white">No homestays match your selected filter</h4>
            <p className="text-xs text-stone-400">Try switching townships or clearing the search query.</p>
            <button
              onClick={() => {
                setSelectedTownship('all');
                setSelectedBookingType('all');
                setSearchQuery('');
                setOnlyAvailable(false);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow hover:bg-emerald-500"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredListings.map((stay) => {
              const isAvailable = stay.roomAvailabilityStatus === 'rooms_available';
              const isLimited = stay.roomAvailabilityStatus === 'limited_units';
              const isSoldOut = stay.roomAvailabilityStatus === 'fully_booked';
              const displayPropertyName =
                stay.propertyName?.trim() ||
                stay.realBusinessName?.trim() ||
                `Unit ${stay.code}`;

              return (
                <div
                  key={stay.id}
                  className="rounded-3xl bg-stone-900/90 border border-stone-800 hover:border-emerald-500/50 shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
                >
                  {/* Top Image & Badges */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-stone-950">
                    <img
                      src={safeSrc(stay.coverImage, DEFAULT_PLACE_IMAGE)}
                      alt={displayPropertyName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-black/40" />

                    {/* Top Row: Unit Code (Left) & Booking Confirmation Type (Right) */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-wrap items-start justify-between gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-white font-mono font-bold text-[10px] leading-snug shadow-md whitespace-normal break-words max-w-[62%]">
                        {stay.code}
                      </span>
                      {stay.bookingType === 'instant' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-600/95 backdrop-blur-md text-white font-black text-[10px] flex items-center gap-1 shadow-md shrink-0 whitespace-nowrap">
                          <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                          <span>Instant Confirm</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-600/95 backdrop-blur-md text-white font-black text-[10px] flex items-center gap-1 shadow-md shrink-0 whitespace-nowrap">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>30m SLA</span>
                        </span>
                      )}
                    </div>

                    {/* Location preview over image bottom */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-stone-300">
                      <span className="flex items-center gap-1 font-bold text-white text-[11px] truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {stay.township}
                      </span>
                      <span className="text-[11px] text-amber-400 font-bold">
                        ★ {stay.rating} ({stay.reviewCount})
                      </span>
                    </div>
                  </div>

                  {/* Body Content (Availability Status, Full Property Title & Unit Code) */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* Status & Breakfast Row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isAvailable && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Available
                          </span>
                        )}
                        {isLimited && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase flex items-center gap-1 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            1-2 Left
                          </span>
                        )}
                        {isSoldOut && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase flex items-center gap-1 whitespace-nowrap">
                            Sold Out Today
                          </span>
                        )}
                        {stay.breakfastIncluded && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold whitespace-nowrap">
                            Breakfast Included
                          </span>
                        )}
                      </div>

                      {/* Full-Width Property Name & Unit Code (Fully Visible, Never Truncated) */}
                      <div className="space-y-0.5">
                        <h4 className="font-black text-sm sm:text-[15px] text-white leading-snug group-hover:text-emerald-300 transition-colors break-words">
                          {displayPropertyName}
                        </h4>
                        <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-emerald-400 block leading-snug break-words">
                          Unit {stay.code}
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-400 line-clamp-1">
                        📍 {stay.proximityDesc}
                      </p>

                      {/* Bundled Perks Highlight */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                          CamGo Exclusive Perks
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {stay.bundledPerks.slice(0, 2).map((perk, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold"
                            >
                              {perk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Financial Breakdown & CTA */}
                    <div className="pt-3 border-t border-stone-800 space-y-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-stone-400">Lock Fee:</span>
                            <span className="text-xs font-black text-emerald-400">RM 30</span>
                            <span className="text-[10px] text-stone-500 font-mono">(FPX/Card)</span>
                          </div>
                          <div className="text-[11px] text-stone-400">
                            Door Balance: <strong className="text-amber-300 font-bold">RM {stay.balanceToCollect}</strong>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-stone-500 block">Normal Rate</span>
                          {stay.pricePerNight > 0 ? (
                            <>
                              <span className="text-base font-black text-white">RM {stay.pricePerNight}</span>
                              <span className="text-[10px] text-stone-400">/night</span>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-stone-400">Rate Set by Vendor</span>
                          )}
                          {stay.peakPricePerNight && stay.peakPricePerNight > 0 && (
                            <span className="block text-[10px] font-bold text-amber-300 mt-0.5">
                              Peak Season: RM {stay.peakPricePerNight}/night
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CTA Lock Button */}
                      <button
                        onClick={() => setActiveListingForBooking(stay)}
                        disabled={isSoldOut}
                        className={`w-full py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg cursor-pointer ${
                          isSoldOut
                            ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 hover:shadow-emerald-950/80 active:scale-[0.98]'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{isSoldOut ? 'Sold Out Today' : 'Lock Room'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* BOOKING & PAY-TO-REVEAL LOCK MODAL */}
      {activeListingForBooking && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-lg bg-stone-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 text-stone-100 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Lock Homestay Dates</h3>
                  <p className="text-[11px] text-stone-400">
                    Listing: <span className="font-bold text-emerald-400">{activeListingForBooking.code}</span> · {activeListingForBooking.township}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveListingForBooking(null)}
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Unit Summary */}
            <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex items-center gap-3">
              <img
                src={safeSrc(activeListingForBooking.coverImage, DEFAULT_PLACE_IMAGE)}
                alt={activeListingForBooking.propertyName || activeListingForBooking.realBusinessName}
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="font-black text-sm text-white truncate block">
                  {activeListingForBooking.propertyName?.trim() ||
                    activeListingForBooking.realBusinessName?.trim() ||
                    `Unit ${activeListingForBooking.code}`}
                </span>
                <span className="font-mono text-[11px] text-emerald-400 font-bold truncate block">
                  Unit {selectedRoomOption?.unitCode || activeListingForBooking.code}
                </span>
                <p className="text-[11px] text-stone-400 truncate">📍 {activeListingForBooking.proximityDesc}</p>
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold mt-1">
                  <span>★ {activeListingForBooking.rating}</span>
                  <span>·</span>
                  <span>{activeListingForBooking.bookingType === 'instant' ? '⚡ Instant Confirm' : '⏱️ 30m WhatsApp SLA'}</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLockHomestay} className="space-y-4 text-xs">
              {/* Select Property / Available Room */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <label className="text-[11px] font-black uppercase text-emerald-400 tracking-wider block">
                  Select Property / Available Room
                </label>
                <select
                  value={selectedRoomOption?.id || ''}
                  onChange={(e) => setSelectedRoomOptionId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {availableRoomOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mandatory Date Picker */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider block">
                  1. Select Travel Dates (Mandatory)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">Check-In</label>
                    <input
                      type="date"
                      value={checkInDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">Check-Out</label>
                    <input
                      type="date"
                      value={checkOutDate}
                      min={checkInDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                  <span>Duration: <strong>{nights} night{nights > 1 ? 's' : ''}</strong></span>
                  <span>
                    Applied Rate ({rateTier === 'peak' && activePeakRate > 0 ? 'Peak Season' : 'Normal'}):{' '}
                    <strong className="text-white">RM {activeNightlyRate} / night</strong>
                  </span>
                </div>

                {activePeakRate > 0 && (
                  <div className="grid grid-cols-2 gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setRateTier('normal')}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                        rateTier === 'normal'
                          ? 'bg-emerald-600/20 border-emerald-400 text-emerald-300'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      Normal Rate (RM {activeNormalRate}/night)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRateTier('peak')}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                        rateTier === 'peak'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      Peak Season (RM {activePeakRate}/night)
                    </button>
                  </div>
                )}
              </div>

              {/* Guest Information */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2.5">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider block">
                  2. Guest Details (For Host WhatsApp Voucher)
                </span>
                <div>
                  <label className="text-[11px] font-bold text-stone-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Encik Roslan Ahmad"
                    required
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">WhatsApp Phone</label>
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+6012-3456789"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="guest@gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Gateway Selection */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider block">
                  3. Select Payment Gateway for RM30 Deposit
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'billplz', name: 'Billplz', sub: 'FPX / Maybank2u' },
                    { id: 'toyyibpay', name: 'ToyyibPay', sub: 'FPX Direct' },
                    { id: 'stripe', name: 'Stripe', sub: 'Visa / Mastercard' },
                  ].map((gw) => (
                    <button
                      key={gw.id}
                      type="button"
                      onClick={() => setSelectedGateway(gw.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedGateway === gw.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold'
                          : 'bg-stone-900 border-stone-800 text-stone-400'
                      }`}
                    >
                      <span className="font-bold text-xs block">{gw.name}</span>
                      <span className="text-[10px] text-stone-400">{gw.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Proof of Payment Upload & Transaction Reference */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2.5">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider block">
                  4. Proof of Payment (Sent to Host WhatsApp &amp; Vendor Alert)
                </span>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="flex-1 px-3 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-dashed border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {isUploadingProof
                        ? 'Uploading Receipt...'
                        : paymentProofName
                        ? `Uploaded: ${paymentProofName}`
                        : 'Upload Payment Receipt (Image / PDF)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleUploadProof}
                      className="hidden"
                    />
                  </label>
                </div>

                {paymentProofUrl && paymentProofUrl.startsWith('data:image') && (
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-900 border border-emerald-500/30">
                    <img
                      src={safeSrc(paymentProofUrl)}
                      alt="Payment proof"
                      className="w-12 h-12 rounded-lg object-cover border border-stone-700"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-emerald-300 block truncate">
                        <FileCheck2 className="w-3.5 h-3.5 inline mr-1" />
                        {paymentProofName || 'Payment Receipt Ready'}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        Will be attached with your booking notification
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-stone-300 block mb-1">
                    Payment Reference / Transaction ID
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => {
                      setPaymentReference(e.target.value);
                      setBookingFormError(null);
                    }}
                    placeholder="e.g. FPX-20261119-8821 (or upload receipt above)"
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {bookingFormError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{bookingFormError}</span>
                </div>
              )}

              {/* Financial Summary */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Total Room Rate ({nights} nights):</span>
                  <span className="font-bold text-white">RM {totalPrice}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-emerald-500/20">
                  <span className="text-emerald-400 font-bold">Lock Fee Deposit (Pay Now):</span>
                  <span className="text-sm font-black text-emerald-400">RM 30</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-300 font-bold">Balance to Pay Host at Door:</span>
                  <span className="text-sm font-black text-amber-300">RM {balanceToCollect}</span>
                </div>
              </div>

              {/* More Information Expandable Panel (shown when guest clicks More Information before Pay) */}
              {showMoreInfo && (
                <div className="p-3.5 rounded-2xl bg-stone-950 border border-teal-500/40 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="font-black text-teal-300 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      <span>Stay Description, House Rules &amp; Reminders</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMoreInfo(false)}
                      className="text-stone-400 hover:text-white text-[11px] font-bold cursor-pointer"
                    >
                      Hide
                    </button>
                  </div>

                  {activeListingForBooking.description && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-stone-400 block">About This Unit</span>
                      <p className="text-stone-200 leading-relaxed mt-0.5 whitespace-pre-line">
                        {activeListingForBooking.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                      <span className="text-stone-400 block">Check-In / Check-Out</span>
                      <strong className="text-white font-mono">
                        {selectedRoomOption?.checkInWindow || activeListingForBooking.checkInWindow || '15:00'} /{' '}
                        {selectedRoomOption?.checkOutWindow || activeListingForBooking.checkOutWindow || '12:00'}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-stone-900 border border-stone-800">
                      <span className="text-stone-400 block">Breakfast &amp; Cooking</span>
                      <strong className="text-white">
                        {selectedRoomOption?.breakfastIncluded ? 'Breakfast Included' : 'No Breakfast'} ·{' '}
                        {selectedRoomOption?.cookingPermitted ? 'Cooking OK' : 'No Cooking'}
                      </strong>
                    </div>
                  </div>

                  {(selectedRoomOption?.parkingType || selectedRoomOption?.parkingDetails) && (
                    <div className="flex items-start gap-2 text-[11px] text-stone-300">
                      <ParkingCircle className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Parking:</strong>{' '}
                        {(selectedRoomOption.parkingType || 'private_available').replace(/_/g, ' ')}
                        {selectedRoomOption.parkingDetails ? ` — ${selectedRoomOption.parkingDetails}` : ''}
                      </span>
                    </div>
                  )}

                  {selectedRoomOption?.kitchenNotes && (
                    <div className="flex items-start gap-2 text-[11px] text-stone-300">
                      <Utensils className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Kitchen &amp; Facilities:</strong> {selectedRoomOption.kitchenNotes}
                      </span>
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-[11px]">
                    <strong className="block text-amber-300 mb-0.5">House Rules &amp; Important Reminders:</strong>
                    <span className="whitespace-pre-line">
                      {selectedRoomOption?.houseRules ||
                        activeListingForBooking.houseRules ||
                        'Please observe quiet hours after 11:00 PM, no smoking indoors, and present your CamGo booking voucher upon check-in.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons (More Information button placed right before Pay button) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMoreInfo((prev) => !prev)}
                  className="px-4 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-teal-500/40 text-teal-300 font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{showMoreInfo ? 'Hide Information' : 'More Information'}</span>
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment || isUploadingProof}
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs cursor-pointer shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isProcessingPayment ? (
                    <span>Securing Deposit &amp; Notifying Host...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay RM30 Deposit &amp; Notify Host</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveListingForBooking(null);
                    setBookingFormError(null);
                    setShowMoreInfo(false);
                  }}
                  className="px-4 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMED BOOKING VOUCHER MODAL */}
      {unlockedBooking && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md">
          <div className="w-full max-w-md bg-stone-900 border border-emerald-500/50 rounded-3xl p-5 sm:p-6 text-stone-100 space-y-4 shadow-2xl relative max-h-[92dvh] overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    Deposit RM30 Confirmed
                  </span>
                  <h3 className="font-black text-base text-white">Booking Confirmed &amp; Host Notified!</h3>
                </div>
              </div>
              <button
                onClick={() => setUnlockedBooking(null)}
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code Voucher */}
            <div className="bg-stone-950 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-2">
              <p className="text-[11px] text-stone-400 font-medium">
                Present this QR code to host upon check-in to verify booking
              </p>
              {safeSrc(voucherQrUrl) ? (
                <div className="inline-block p-2.5 bg-white rounded-2xl shadow-xl">
                  <img src={safeSrc(voucherQrUrl)} alt="Voucher QR Code" className="w-36 h-36 sm:w-40 sm:h-40 object-contain" />
                </div>
              ) : (
                <div className="w-36 h-36 mx-auto bg-stone-800 rounded-2xl flex items-center justify-center text-xs text-stone-500">
                  Generating QR...
                </div>
              )}
              <div className="font-mono text-xs font-bold text-emerald-400">
                BOOKING CODE: {unlockedBooking.bookingCode}
              </div>
            </div>

            {/* Stay & Guest Summary (No complete street address shown) */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Verified Stay &amp; Township
                </span>
                <p className="font-black text-base text-white">{unlockedBooking.homestayName}</p>
                <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{unlockedBooking.township || 'Cameron Highlands'} · {unlockedBooking.checkInDate} to {unlockedBooking.checkOutDate}</span>
                </p>
              </div>

              {/* Submitted Guest & Proof of Payment Summary */}
              <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Guest:</span>
                  <span className="font-bold text-white">{unlockedBooking.customerName} ({unlockedBooking.customerPhone})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Gateway / Ref:</span>
                  <span className="font-mono text-emerald-300 uppercase">
                    {unlockedBooking.paymentGateway} {unlockedBooking.paymentReference ? `· ${unlockedBooking.paymentReference}` : ''}
                  </span>
                </div>
                {unlockedBooking.paymentProofName && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Receipt Uploaded:</span>
                    <span className="text-emerald-300 font-semibold truncate max-w-[170px]">{unlockedBooking.paymentProofName}</span>
                  </div>
                )}
              </div>

              {/* Host WhatsApp Notification CTA */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-stone-400 block uppercase">Host WhatsApp Notification</span>
                  <span className="font-bold text-xs text-emerald-400 block truncate">{unlockedBooking.ownerPhone}</span>
                </div>
                <a
                  href={
                    hostWhatsAppUrl ||
                    `https://wa.me/${(unlockedBooking.ownerPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                      `CamGo Paid Booking ${unlockedBooking.bookingCode}\nStay: ${unlockedBooking.homestayName}\nGuest: ${unlockedBooking.customerName} (${unlockedBooking.customerPhone})\nDates: ${unlockedBooking.checkInDate} to ${unlockedBooking.checkOutDate}\nGateway: ${unlockedBooking.paymentGateway.toUpperCase()} · RM30 PAID\nDoor Balance: RM${unlockedBooking.balanceToCollect}`
                    )}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Send Proof on WhatsApp</span>
                </a>
              </div>

              {/* Cash at door reminder */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <span className="text-xs text-amber-300 font-semibold">Pay at Check-In:</span>
                <span className="text-base font-black text-amber-300">RM {unlockedBooking.balanceToCollect}</span>
              </div>
            </div>

            <button
              onClick={() => setUnlockedBooking(null)}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
            >
              Done / Return to Stays
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
