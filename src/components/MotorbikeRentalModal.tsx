import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Compass,
  Bike,
  Calendar,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  Clock,
  Sparkles,
  User,
  Mail,
  Send,
} from 'lucide-react';
import { Township, MotorbikeRentalPartner, MotorbikePackage, MotorbikeBookingRecord } from '../types';
import { firebaseService, UserProfile } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { INITIAL_MOTORBIKE_PARTNERS } from '../data/initialMotorbikeData';

interface MotorbikeRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
  currentUser?: UserProfile | null;
}

export const MotorbikeRentalModal: React.FC<MotorbikeRentalModalProps> = ({
  isOpen,
  onClose,
  language = 'en',
  currentUser,
}) => {
  const [partners, setPartners] = useState<MotorbikeRentalPartner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<MotorbikeRentalPartner | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<MotorbikePackage | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Booking Form State
  const [renterName, setRenterName] = useState(currentUser?.displayName || currentUser?.fullName || '');
  const [renterEmail, setRenterEmail] = useState(currentUser?.email || '');
  const [renterPhone, setRenterPhone] = useState(currentUser?.contactNumber || '+601');
  const [pickupTownship, setPickupTownship] = useState<Township>('Tanah Rata');
  const [pickupTime, setPickupTime] = useState('10:00');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [helmetsAddon, setHelmetsAddon] = useState(2);
  const [includePhoneMount, setIncludePhoneMount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<MotorbikeBookingRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cached = firebaseService.getMotorbikePartners();
    if (cached && cached.length > 0) {
      setPartners(cached);
      setIsLoading(false);
    }

    if (isOpen) {
      const unsub = onSnapshot(collection(db, 'motorbike_partners'), (snap) => {
        const fetched = snap.docs.map(d => d.data() as MotorbikeRentalPartner);
        if (fetched.length > 0) {
          setPartners(fetched);
        } else {
          const fallback = firebaseService.getMotorbikePartners();
          if (fallback.length > 0) {
            setPartners(fallback);
          }
        }
        setIsLoading(false);
      }, (err) => {
        console.error('Firestore listener error:', err);
        const fallback = firebaseService.getMotorbikePartners();
        if (fallback.length > 0) {
          setPartners(fallback);
        }
        setIsLoading(false);
      });
      return unsub;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenBooking = (partner: MotorbikeRentalPartner, pkg: MotorbikePackage) => {
    setSelectedPartner(partner);
    setSelectedPackage(pkg);
    setIsBookingModalOpen(true);
    setSuccessBooking(null);
  };

  const calculateDays = () => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays);
    } catch {
      return 1;
    }
  };

  const daysCount = calculateDays();
  const dailyRate = selectedPackage?.dailyRateRm || 70;
  const mountFee = includePhoneMount ? 10 : 0;
  const totalRm = dailyRate * daysCount + helmetsAddon * 10 * daysCount + mountFee; // RM10 per extra helmet/day if needed, + phone mount fee

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || !selectedPackage) return;

    setIsSubmitting(true);
    try {
      const bookingId = 'moto-bk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const newBooking: MotorbikeBookingRecord = {
        id: bookingId,
        partnerId: selectedPartner.id,
        partnerName: selectedPartner.businessName,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        renterName: renterName || 'Highland Explorer',
        renterEmail: renterEmail || 'traveler@camgo.my',
        renterPhone: renterPhone || '+60123456789',
        pickupTownship,
        pickupTime,
        startDate,
        endDate,
        days: daysCount,
        helmetsAddon,
        includePhoneMount,
        totalRm,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await firebaseService.saveMotorbikeBooking(newBooking);
      setSuccessBooking(newBooking);

      // Trigger automated WhatsApp message template to notify business owner
      const rawWa = selectedPartner.whatsappNumber || selectedPartner.contactPhone || '+60123456789';
      const waNumber = rawWa.replace(/[^0-9]/g, '');
      const waText = encodeURIComponent(
        `Salam ${selectedPartner.businessName}! New Scooter Booking Request #${bookingId}:\n- Package: ${selectedPackage.name} (${selectedPackage.cc})\n- Renter: ${renterName} (${renterPhone})\n- Pickup Hub: ${pickupTownship} @ ${pickupTime}\n- Dates: ${startDate} to ${endDate} (${daysCount} days)\n- Helmets: ${helmetsAddon} units\n- Phone Mount: ${includePhoneMount ? 'Yes (+RM10)' : 'No'}\n- Total: RM ${totalRm}\nPlease confirm availability!`
      );
      const waUrl = `https://wa.me/${waNumber}?text=${waText}`;
      try {
        window.open(waUrl, '_blank');
      } catch (e) {
        console.warn('WhatsApp auto-open popup warning:', e);
      }
    } catch (err) {
      console.error('Failed to submit motorbike booking:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-6xl mt-10 mb-20 pb-16 overflow-y-auto rounded-3xl p-4 sm:p-8 bg-stone-900 border border-emerald-500/30 shadow-2xl relative text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10 sticky top-0 bg-stone-900/95 backdrop-blur-md z-30 pt-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                Cameron Highlands Experience Hub
              </span>
              <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
                Motorbike &amp; Scooter Rental Marketplace
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtitle / Intro Banner */}
        <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-stone-900 to-teal-950/40 border border-emerald-500/20 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-bold text-emerald-300">
              Explore Cameron Highlands on Two Wheels
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl">
              Beat the weekend traffic jams in Tanah Rata, Brinchang, and Kea Farm. Rent reliable Yamaha NMAX, Honda Vario, or ADV scooters instantly with instant WhatsApp vendor notification.
            </p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono text-xs border border-emerald-500/30 flex items-center gap-2 shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Verified Local Partners</span>
          </div>
        </div>

        {/* Partners Grid */}
        {isLoading && <div className="text-center py-12 text-stone-400 text-sm">Loading rental partners...</div>}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${isLoading ? 'hidden' : ''}`}>
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="rounded-2xl bg-stone-900/90 border border-white/10 overflow-hidden shadow-xl hover:border-emerald-500/40 transition-all flex flex-col"
            >
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={partner.imageUrl}
                  alt={partner.businessName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      partner.operatingStatus === 'open'
                        ? 'bg-emerald-500/90 text-stone-950 shadow-lg'
                        : 'bg-rose-500/90 text-white shadow-lg'
                    }`}
                  >
                    {partner.operatingStatus === 'open' ? '● Open Now' : '● Closed'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-500/90 text-stone-950 shadow-lg">
                    {partner.township}
                  </span>
                </div>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-black/70 backdrop-blur-md text-emerald-300 border border-emerald-500/30">
                  Fleet: {partner.fleetAvailability.toUpperCase()}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-white mb-1">{partner.businessName}</h4>
                  <div className="flex items-center gap-2 text-xs text-stone-400 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Cameron Highlands, {partner.township}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-300">
                    <Phone className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>{partner.contactPhone}</span>
                  </div>
                </div>

                {/* Packages List */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      Available Rental Packages:
                    </span>
                    <button
                      onClick={() => handleOpenBooking(partner, partner.packages[0] || {
                        id: 'default',
                        name: 'Standard Scooter',
                        cc: '125cc',
                        dailyRateRm: 60,
                        imageUrl: partner.imageUrl,
                        helmetsIncluded: 2,
                      })}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>Book Scooter / Bike</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {partner.packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="p-2.5 rounded-xl bg-stone-800/80 border border-white/5 flex items-center justify-between gap-2 hover:bg-stone-800 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{pkg.name}</div>
                          <div className="text-[10px] text-stone-400">
                            {pkg.cc} • {pkg.helmetsIncluded} Helmets Included {pkg.packageDetails ? `• ${pkg.packageDetails}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-emerald-400 font-mono">RM {pkg.dailyRateRm}</div>
                          <div className="text-[9px] text-stone-500">per day</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Booking Form Modal Overlay */}
        {isBookingModalOpen && selectedPartner && selectedPackage && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
            <div className="glass-panel w-full max-w-lg rounded-3xl bg-stone-900 border border-emerald-500/40 p-6 shadow-2xl relative text-stone-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Motorbike Reservation &amp; Instant WhatsApp Hub
                </span>
                <button
                  onClick={() => setIsBookingModalOpen(false)}
                  className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {successBooking ? (
                <div className="text-center space-y-4 py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Booking Request Saved &amp; Sent!</h3>
                  <p className="text-xs text-stone-300">
                    Your reservation record has been successfully saved to Firestore (<code className="text-emerald-400 font-mono">motorbike_rentals</code>). WhatsApp chat has been opened with <span className="font-bold text-white">{selectedPartner.businessName}</span>.
                  </p>
                  
                  {(() => {
                    const rawWa = selectedPartner.whatsappNumber || selectedPartner.contactPhone || '+60123456789';
                    const waNumber = rawWa.replace(/[^0-9]/g, '');
                    const waText = encodeURIComponent(
                      `Salam ${selectedPartner.businessName}! New Scooter Booking Request #${successBooking.id}:\n- Package: ${successBooking.packageName}\n- Renter: ${successBooking.renterName} (${successBooking.renterPhone})\n- Pickup Hub: ${successBooking.pickupTownship} @ ${successBooking.pickupTime}\n- Dates: ${successBooking.startDate} to ${successBooking.endDate} (${successBooking.days} days)\n- Total: RM ${successBooking.totalRm}\nPlease confirm availability!`
                    );
                    const waUrl = `https://wa.me/${waNumber}?text=${waText}`;
                    return (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Send className="w-4 h-4" />
                        <span>Open WhatsApp Chat with {selectedPartner.businessName}</span>
                      </a>
                    );
                  })()}

                  <button
                    onClick={() => {
                      setIsBookingModalOpen(false);
                      setSuccessBooking(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    Done / Return to Marketplace
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  {/* Select Motorbike Dropdown */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-300">Select Motorbike / Scooter Model</label>
                    <select
                      value={selectedPackage.id}
                      onChange={(e) => {
                        const match = selectedPartner.packages.find((p) => p.id === e.target.value);
                        if (match) setSelectedPackage(match);
                      }}
                      className="w-full bg-stone-950 border border-emerald-500/50 rounded-xl py-2.5 px-3 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
                    >
                      {selectedPartner.packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} ({pkg.cc}) - RM {pkg.dailyRateRm} / day
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Bike Display Card */}
                  <div className="p-3 rounded-xl bg-stone-800/80 border border-white/10 flex items-center gap-3">
                    <img
                      src={selectedPackage.imageUrl}
                      alt={selectedPackage.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-white">{selectedPackage.name}</h4>
                      <div className="text-xs text-emerald-400 font-mono font-bold">
                        RM {selectedPackage.dailyRateRm} / day • {selectedPackage.cc}
                      </div>
                      {selectedPackage.packageDetails && (
                        <div className="text-[10px] text-stone-300">
                          Package: {selectedPackage.packageDetails}
                        </div>
                      )}
                      {selectedPackage.addonDetails && (
                        <div className="text-[10px] text-amber-300">
                          Addons: {selectedPackage.addonDetails}
                        </div>
                      )}
                      <div className="text-[10px] text-stone-400">{selectedPartner.businessName} ({selectedPartner.township})</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-300">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={renterName}
                        onChange={(e) => setRenterName(e.target.value)}
                        placeholder="e.g. Aiman Farhan"
                        className="w-full bg-stone-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-300">Email Address (@gmail.com)</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                        <input
                          type="email"
                          required
                          value={renterEmail}
                          onChange={(e) => setRenterEmail(e.target.value)}
                          placeholder="traveler@gmail.com"
                          className="w-full bg-stone-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-300">WhatsApp Phone No.</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                        <input
                          type="text"
                          required
                          value={renterPhone}
                          onChange={(e) => setRenterPhone(e.target.value)}
                          placeholder="+60123456789"
                          className="w-full bg-stone-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-300">Pickup Township Hub</label>
                      <select
                        value={pickupTownship}
                        onChange={(e) => setPickupTownship(e.target.value as Township)}
                        className="w-full bg-stone-950 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Tanah Rata">Tanah Rata</option>
                        <option value="Brinchang">Brinchang</option>
                        <option value="Kea Farm">Kea Farm</option>
                        <option value="Ringlet">Ringlet</option>
                        <option value="Tringkap">Tringkap</option>
                        <option value="Kampung Raja">Kampung Raja</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-300">Pickup Time</label>
                      <input
                        type="time"
                        required
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full bg-stone-950 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                      <label className="flex items-center gap-2 text-xs font-bold text-stone-300 cursor-pointer">
                          <input type="checkbox" checked={includePhoneMount} onChange={(e) => setIncludePhoneMount(e.target.checked)} className="rounded border-white/10 bg-stone-950 text-emerald-600 focus:ring-emerald-500" />
                          Include Handlebar Phone Mount (+RM10 flat fee)
                      </label>
                  </div>

                  <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-300">Helmet Add-ons</label>
                      <select
                        value={helmetsAddon}
                        onChange={(e) => setHelmetsAddon(Number(e.target.value))}
                        className="w-full bg-stone-950 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value={2}>2 Standard Helmets (Included)</option>
                        <option value={3}>3 Helmets (+RM 10/day)</option>
                        <option value={4}>4 Helmets (+RM 20/day)</option>
                      </select>
                    </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-300">Start Date</label>
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-stone-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-300">End Date</label>
                      <input
                        type="date"
                        required
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-stone-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between text-xs">
                    <span className="text-stone-300">Estimated Total ({daysCount} days):</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">RM {totalRm}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
                  >
                    {isSubmitting ? (
                      <span>Saving to Firestore &amp; Launching WhatsApp...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Confirm &amp; Notify Vendor via WhatsApp</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
