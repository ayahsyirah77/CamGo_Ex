// src/components/AccommodationListModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  MapPin,
  Calendar,
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  Users,
  BedDouble,
  Bath,
  Sparkles,
  ExternalLink,
  Copy,
  Clock,
  ArrowRight,
  Phone,
  QrCode,
  DollarSign,
  Building,
  Store,
  Check,
  Filter,
} from 'lucide-react';
import QRCode from 'qrcode';
import { AccommodationListing, AccommodationBooking, Township, Language } from '../types';
import { firebaseService } from '../services/firebase';

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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Unlocked Voucher Modal
  const [unlockedBooking, setUnlockedBooking] = useState<AccommodationBooking | null>(null);
  const [voucherQrUrl, setVoucherQrUrl] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

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

  // Nights and pricing calculation
  const nights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 1;
    const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    return Math.max(1, Math.round(diff / (1000 * 3600 * 24)));
  }, [checkInDate, checkOutDate]);

  const totalPrice = useMemo(() => {
    if (!activeListingForBooking) return 0;
    return activeListingForBooking.pricePerNight * nights;
  }, [activeListingForBooking, nights]);

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
        if (!matchTitle && !matchCode && !matchTown && !matchReal) return false;
      }
      return true;
    });
  }, [listings, selectedTownship, selectedBookingType, onlyAvailable, searchQuery]);

  if (!isOpen) return null;

  // Handle Pay-to-Reveal Lock Submit
  const handleLockHomestay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeListingForBooking || !guestName || !guestPhone) return;

    setIsProcessingPayment(true);

    try {
      // Simulate Payment Gateway Settlement (~1s)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const bookingCode = `CG-${activeListingForBooking.code.replace('CH-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const qrCode = `VCHR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const newBooking: AccommodationBooking = {
        id: `cg_bk_${Date.now()}`,
        bookingCode,
        homestayId: activeListingForBooking.id,
        homestayName: activeListingForBooking.realBusinessName,
        maskedTitle: activeListingForBooking.maskedTitle,
        fullAddress: activeListingForBooking.fullAddress,
        ownerPhone: activeListingForBooking.ownerPhone,
        ownerName: activeListingForBooking.ownerName,
        customerName: guestName,
        customerPhone: guestPhone,
        customerEmail: guestEmail || undefined,
        checkInDate,
        checkOutDate,
        nights,
        roomTypeName: `${activeListingForBooking.bedrooms}BR ${activeListingForBooking.maskedTitle.split('-')[0]}`,
        totalRoomPrice: totalPrice,
        depositAmount: 30, // Fixed RM30 lock fee
        balanceToCollect,
        bookingType: activeListingForBooking.bookingType,
        status: activeListingForBooking.bookingType === 'instant' ? 'confirmed' : 'pending_owner_approval',
        depositPaymentStatus: 'paid',
        paymentGateway: selectedGateway,
        isUnlocked: true, // Unlocked post-payment!
        qrVoucherCode: qrCode,
        bundledPerks: activeListingForBooking.bundledPerks,
        createdAt: new Date().toISOString(),
        expiresAt:
          activeListingForBooking.bookingType === 'request'
            ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
            : undefined,
        whatsappStatus: activeListingForBooking.bookingType === 'instant' ? 'replied_yes' : 'sent',
        notes: `Guest reserved via CamGo Pay-to-Reveal Engine with RM30 deposit via ${selectedGateway.toUpperCase()}.`,
      };

      await firebaseService.saveAccommodationBooking(newBooking);

      // Open Voucher Modal
      setUnlockedBooking(newBooking);
      setActiveListingForBooking(null);
    } catch (err) {
      console.error('Booking lock error:', err);
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

              return (
                <div
                  key={stay.id}
                  className="rounded-3xl bg-stone-900/90 border border-stone-800 hover:border-emerald-500/50 shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
                >
                  {/* Top Image & Badges */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-stone-950">
                    <img
                      src={stay.coverImage}
                      alt={stay.maskedTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-black/40" />

                    {/* Masked Code Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white font-mono font-black text-xs shadow-md">
                        {stay.code}
                      </span>
                      {stay.bookingType === 'instant' ? (
                        <span className="px-2 py-1 rounded-xl bg-emerald-600/90 backdrop-blur-md text-white font-black text-[10px] flex items-center gap-1 shadow-md">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>Instant Confirm</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-xl bg-amber-600/90 backdrop-blur-md text-white font-black text-[10px] flex items-center gap-1 shadow-md">
                          <Clock className="w-3 h-3" />
                          <span>30m SLA</span>
                        </span>
                      )}
                    </div>

                    {/* Room Availability Status Badge */}
                    <div className="absolute top-3 right-3">
                      {isAvailable && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1 backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Rooms Open
                        </span>
                      )}
                      {isLimited && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase flex items-center gap-1 backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          1-2 Left
                        </span>
                      )}
                      {isSoldOut && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase flex items-center gap-1 backdrop-blur-md">
                          Sold Out Today
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

                  {/* Body Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      {/* Masked Anti-Bypass Title */}
                      <h4 className="font-extrabold text-sm sm:text-base text-white leading-tight group-hover:text-emerald-300 transition-colors">
                        {stay.maskedTitle}
                      </h4>

                      <p className="text-[11px] text-stone-400 line-clamp-1">
                        📍 {stay.proximityDesc}
                      </p>

                      {/* Specs */}
                      <div className="flex items-center gap-3 text-stone-300 text-xs py-1 border-y border-stone-800/80">
                        <span className="flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          {stay.maxGuests} Guests
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <BedDouble className="w-3.5 h-3.5 text-emerald-400" />
                          {stay.bedrooms} Beds
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Bath className="w-3.5 h-3.5 text-emerald-400" />
                          {stay.bathrooms} Baths
                        </span>
                      </div>

                      {/* Bundled Perks Highlight */}
                      <div className="space-y-1">
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
                          <span className="text-[10px] text-stone-500 block">Total Room Rate</span>
                          <span className="text-base font-black text-white">RM {stay.pricePerNight}</span>
                          <span className="text-[10px] text-stone-400">/night</span>
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
                        <span>{isSoldOut ? 'Sold Out Today' : 'Lock Room (RM30 Deposit)'}</span>
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

            {/* Selected Homestay Summary */}
            <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex items-center gap-3">
              <img
                src={activeListingForBooking.coverImage}
                alt=""
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-xs text-white truncate block">
                  {activeListingForBooking.maskedTitle}
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
                  <span>Rate: RM {activeListingForBooking.pricePerNight} / night</span>
                </div>
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
                  3. Select Payment Gateway for RM30 Lock Fee
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

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs cursor-pointer shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isProcessingPayment ? (
                    <span>Securing Deposit &amp; Unlocking...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay RM30 Deposit &amp; Unlock Address</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveListingForBooking(null)}
                  className="px-4 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY-TO-REVEAL UNLOCKED VOUCHER MODAL */}
      {unlockedBooking && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="w-full max-w-md bg-stone-900 border border-emerald-500/50 rounded-3xl p-6 text-stone-100 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto no-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    Deposit RM30 Confirmed
                  </span>
                  <h3 className="font-black text-base text-white">Booking Locked &amp; Unlocked!</h3>
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
              {voucherQrUrl ? (
                <div className="inline-block p-2.5 bg-white rounded-2xl shadow-xl">
                  <img src={voucherQrUrl} alt="Voucher QR Code" className="w-40 h-40 object-contain" />
                </div>
              ) : (
                <div className="w-40 h-40 mx-auto bg-stone-800 rounded-2xl flex items-center justify-center text-xs text-stone-500">
                  Generating QR...
                </div>
              )}
              <div className="font-mono text-xs font-bold text-emerald-400">
                BOOKING CODE: {unlockedBooking.bookingCode}
              </div>
            </div>

            {/* Revealed Host Details */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Real Business Name (Revealed)
                </span>
                <p className="font-black text-base text-white">{unlockedBooking.homestayName}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block mb-1">
                  Full Physical Address
                </span>
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-200 flex items-center justify-between">
                  <span className="truncate pr-2">{unlockedBooking.fullAddress}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(unlockedBooking.fullAddress);
                      setCopiedAddress(true);
                      setTimeout(() => setCopiedAddress(false), 2500);
                    }}
                    className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer shrink-0"
                    title="Copy Address"
                  >
                    {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Host WhatsApp */}
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 block uppercase">Host Direct Contact</span>
                  <span className="font-bold text-xs text-emerald-400">{unlockedBooking.ownerPhone}</span>
                </div>
                <a
                  href={`https://wa.me/${(unlockedBooking.ownerPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hi, I have booked ${unlockedBooking.homestayName} via CamGo (Code: ${unlockedBooking.bookingCode}) for ${unlockedBooking.checkInDate} to ${unlockedBooking.checkOutDate}. My deposit of RM30 is paid. Looking forward to our stay!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                >
                  <Phone className="w-3 h-3" />
                  <span>WhatsApp Host</span>
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
