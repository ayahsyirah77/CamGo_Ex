import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bike,
  MapPin,
  Phone,
  CheckCircle2,
  Sparkles,
  Send,
  Fuel,
  Umbrella,
  AlertTriangle,
  Upload,
  ChevronDown,
  ChevronUp,
  Lock,
  QrCode,
  Shield,
  CreditCard,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  Township,
  MotorbikeRentalPartner,
  MotorbikePackage,
  MotorbikeBookingRecord,
  VendorListing,
} from '../types';
import { firebaseService, UserProfile, isMockMotorbikePartner } from '../services/firebase';
import { pushNotificationService } from '../services/pushNotificationService';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { safeSrc, DEFAULT_PLACE_IMAGE } from '../utils/safeMedia';

interface MotorbikeRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
  currentUser?: UserProfile | null;
}

interface BookingVehicleOption {
  id: string;
  packageId: string;
  name: string;
  cc: string;
  vehicleType: 'motorbike' | 'scooter';
  dailyRateRm: number;
  hourlyRateRm: number;
  depositRm?: number;
  plateOrCode?: string;
  imageUrl: string;
  helmetsIncluded: number;
  availableCount: number;
}

const inferVehicleType = (
  name?: string,
  explicit?: 'motorbike' | 'scooter'
): 'motorbike' | 'scooter' => {
  if (explicit === 'motorbike' || explicit === 'scooter') return explicit;
  const lower = (name || '').toLowerCase();
  if (
    lower.includes('scooter') ||
    lower.includes('skuter') ||
    lower.includes('vario') ||
    lower.includes('nmax') ||
    lower.includes('adv') ||
    lower.includes('beat') ||
    lower.includes('avantiz') ||
    lower.includes('pcx') ||
    lower.includes('nvx') ||
    lower.includes('ego')
  ) {
    return 'scooter';
  }
  return 'motorbike';
};

export const MotorbikeRentalModal: React.FC<MotorbikeRentalModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [partners, setPartners] = useState<MotorbikeRentalPartner[]>([]);
  const [vendorListings, setVendorListings] = useState<VendorListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRules, setExpandedRules] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTownshipFilter, setSelectedTownshipFilter] = useState<string>('all');

  // Booking Modal State
  const [selectedPartner, setSelectedPartner] = useState<MotorbikeRentalPartner | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [durationMode, setDurationMode] = useState<'hourly' | 'daily' | 'custom_package'>('daily');
  const [selectedCustomPkgId, setSelectedCustomPkgId] = useState<string>('');
  const [hoursCount, setHoursCount] = useState<number>(4);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [pickupTime, setPickupTime] = useState<string>('10:00');
  const [pickupTownship, setPickupTownship] = useState<Township>('Tanah Rata');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'self_collect' | 'delivered'>('self_collect');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  // Equipment & Add-ons
  const [requestChildrenHelmet, setRequestChildrenHelmet] = useState<boolean>(false);
  const [requestFreeRaincoat, setRequestFreeRaincoat] = useState<boolean>(false);
  const [includePhoneMount, setIncludePhoneMount] = useState<boolean>(false);
  const [helmetsAddon, setHelmetsAddon] = useState<number>(2);

  // Renter Details & Verification
  const [renterName, setRenterName] = useState<string>(
    currentUser?.displayName || currentUser?.fullName || ''
  );
  const [renterEmail, setRenterEmail] = useState<string>(currentUser?.email || '');
  const [renterPhone, setRenterPhone] = useState<string>(currentUser?.contactNumber || '+601');
  const [licenseAck, setLicenseAck] = useState<boolean>(false);
  const [licenseDocUrl, setLicenseDocUrl] = useState<string | null>(null);
  const [licenseDocName, setLicenseDocName] = useState<string>('');
  const [isUploadingLicense, setIsUploadingLicense] = useState<boolean>(false);

  // Payment Gateway & Proof
  const [selectedGateway, setSelectedGateway] = useState<'billplz' | 'toyyibpay' | 'stripe'>('billplz');
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [paymentProofName, setPaymentProofName] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [isUploadingProof, setIsUploadingProof] = useState<boolean>(false);

  const [bookingFormError, setBookingFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Confirmed QR Handover Voucher Modal State
  const [confirmedBooking, setConfirmedBooking] = useState<MotorbikeBookingRecord | null>(null);
  const [voucherQrUrl, setVoucherQrUrl] = useState<string>('');
  const [hostWhatsAppUrl, setHostWhatsAppUrl] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      setRenterName((prev) => prev || currentUser.displayName || currentUser.fullName || '');
      setRenterEmail((prev) => prev || currentUser.email || '');
      setRenterPhone((prev) => (prev && prev !== '+601' ? prev : currentUser.contactNumber || '+601'));
    }
  }, [currentUser]);

  useEffect(() => {
    const refreshPartners = () => {
      setPartners(firebaseService.getMotorbikePartners());
      setVendorListings(firebaseService.getVendorListings());
      setIsLoading(false);
    };

    refreshPartners();

    const handleUpdate = () => refreshPartners();
    window.addEventListener('motorbike-partners-updated', handleUpdate);
    window.addEventListener('vendor-listings-updated', handleUpdate);

    let unsub: (() => void) | undefined;
    if (isOpen && db) {
      unsub = onSnapshot(
        collection(db, 'motorbike_partners'),
        (snap) => {
          if (!snap.empty) {
            const fetched = snap.docs
              .map((d) => d.data() as MotorbikeRentalPartner)
              .filter((p) => !isMockMotorbikePartner(p) && !firebaseService.isMotorbikePartnerDeleted(p.id));
            setPartners(fetched);
            setVendorListings(firebaseService.getVendorListings());

            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              if (isMockMotorbikePartner(data) || firebaseService.isMotorbikePartnerDeleted(docSnap.id)) {
                deleteDoc(doc(db, 'motorbike_partners', docSnap.id)).catch(() => {});
              }
            });
          } else {
            refreshPartners();
          }
          setIsLoading(false);
        },
        (err) => {
          console.warn('Firestore motorbike partners listener warning:', err);
          refreshPartners();
        }
      );
    }

    return () => {
      window.removeEventListener('motorbike-partners-updated', handleUpdate);
      window.removeEventListener('vendor-listings-updated', handleUpdate);
      if (unsub) unsub();
    };
  }, [isOpen]);

  // Generate QR Code DataURL once confirmedBooking changes
  useEffect(() => {
    if (!confirmedBooking) {
      setVoucherQrUrl('');
      return;
    }
    const qrPayload = JSON.stringify({
      code: confirmedBooking.bookingCode || confirmedBooking.qrVoucherCode,
      vendor: confirmedBooking.partnerName,
      vehicle: confirmedBooking.packageName,
      qty: confirmedBooking.quantity || 1,
      renter: confirmedBooking.renterName,
      start: `${confirmedBooking.startDate} ${confirmedBooking.pickupTime}`,
      totalRm: confirmedBooking.totalRm,
    });
    QRCode.toDataURL(qrPayload, {
      width: 240,
      margin: 2,
      color: { dark: '#022c22', light: '#ffffff' },
    })
      .then((url) => setVoucherQrUrl(url))
      .catch(() => setVoucherQrUrl(''));
  }, [confirmedBooking]);

  // Merge partner record with its linked VendorListing specifics so cards & modal always stay 100% live
  const enrichedPartners = useMemo(() => {
    const map = new Map<string, MotorbikeRentalPartner>();
    for (const p of partners) {
      if (!p || !p.id || isMockMotorbikePartner(p)) continue;
      const linkedVendor = vendorListings.find(
        (v) =>
          v.id === p.id ||
          (p.ownerEmail && v.ownerEmail && v.ownerEmail.toLowerCase() === p.ownerEmail.toLowerCase())
      );
      const vr = linkedVendor?.sectorSpecifics?.vehicleRental;
      const depReq = p.depositRequired ?? vr?.depositConfig?.required ?? true;
      const depositAmt = depReq
        ? p.depositAmountRm ?? vr?.depositConfig?.depositAmountRm ?? p.packages?.[0]?.depositRm ?? 100
        : 0;

      map.set(p.id, {
        ...p,
        ownerUid: p.ownerUid || linkedVendor?.ownerUid,
        ownerEmail: p.ownerEmail || linkedVendor?.ownerEmail,
        fuelPolicy: p.fuelPolicy || vr?.fuelPolicy || 'none',
        freeRaincoat: p.freeRaincoat ?? vr?.freeRaincoat ?? false,
        childrenHelmet: p.childrenHelmet ?? vr?.childrenHelmet ?? false,
        vendorRulesNotice:
          p.vendorRulesNotice ||
          vr?.vendorRulesNotice ||
          p.vendorTerms ||
          linkedVendor?.vendorTerms ||
          '',
        vendorTerms:
          p.vendorTerms ||
          p.vendorRulesNotice ||
          vr?.vendorRulesNotice ||
          linkedVendor?.vendorTerms ||
          '',
        hourlyRateRm:
          p.hourlyRateRm ??
          vr?.durationModels?.defaultHourlyRateRm ??
          vr?.baseHourlyRateRm ??
          p.packages?.[0]?.hourlyRateRm ??
          18,
        dailyRateRm:
          p.dailyRateRm ??
          vr?.durationModels?.defaultDailyRateRm ??
          vr?.baseDailyRateRm ??
          p.packages?.[0]?.dailyRateRm ??
          75,
        allowDays: p.allowDays ?? vr?.durationModels?.allowDays ?? true,
        allowHours: p.allowHours ?? vr?.durationModels?.allowHours ?? true,
        depositRequired: depReq,
        depositAmountRm: depositAmt,
        lockInFeeRm: p.lockInFeeRm ?? vr?.depositConfig?.lockInFeeRm ?? 20,
        pickupHubAddress: p.pickupHubAddress || vr?.serviceOptions?.pickupHubAddress || linkedVendor?.address || '',
        customHourPackages: p.customHourPackages ?? vr?.customHourPackages ?? [],
        fleetUnits: p.fleetUnits ?? vr?.fleetUnits ?? [],
      });
    }
    return Array.from(map.values());
  }, [partners, vendorListings]);

  const filteredPartners = useMemo(() => {
    return enrichedPartners.filter((p) => {
      if (selectedTownshipFilter !== 'all' && p.township !== selectedTownshipFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hitBiz = p.businessName.toLowerCase().includes(q);
        const hitTown = p.township.toLowerCase().includes(q);
        const hitPkg = (p.packages || []).some((pkg) => pkg.name.toLowerCase().includes(q));
        if (!hitBiz && !hitTown && !hitPkg) return false;
      }
      return true;
    });
  }, [enrichedPartners, selectedTownshipFilter, searchQuery]);

  // Compute live Motorbike vs Scooter counts for a partner card
  const getFleetBreakdown = (partner: MotorbikeRentalPartner) => {
    const units = partner.fleetUnits || [];
    const pkgs = partner.packages || [];

    if (partner.fleetAvailability === 'sold_out') {
      return {
        isFullyBooked: true,
        scootersAvailable: 0,
        motorbikesAvailable: 0,
        totalAvailable: 0,
        summaryLabel: 'Fully Booked',
      };
    }

    if (units.length > 0) {
      const avail = units.filter((u) => u.status === 'available');
      const scooters = avail.filter((u) => inferVehicleType(u.model, u.vehicleType) === 'scooter').length;
      const motorbikes = avail.filter((u) => inferVehicleType(u.model, u.vehicleType) === 'motorbike').length;
      if (avail.length === 0) {
        return {
          isFullyBooked: true,
          scootersAvailable: 0,
          motorbikesAvailable: 0,
          totalAvailable: 0,
          summaryLabel: 'Fully Booked',
        };
      }
      const parts: string[] = [];
      if (scooters > 0) parts.push(`${scooters} Scooter${scooters > 1 ? 's' : ''} Available`);
      if (motorbikes > 0) parts.push(`${motorbikes} Motorbike${motorbikes > 1 ? 's' : ''} Available`);
      return {
        isFullyBooked: false,
        scootersAvailable: scooters,
        motorbikesAvailable: motorbikes,
        totalAvailable: avail.length,
        summaryLabel: parts.join(' • '),
      };
    }

    if (pkgs.length > 0) {
      const scooters = pkgs.filter((pkg) => inferVehicleType(pkg.name, pkg.vehicleType) === 'scooter').length;
      const motorbikes = pkgs.filter((pkg) => inferVehicleType(pkg.name, pkg.vehicleType) === 'motorbike').length;
      const parts: string[] = [];
      if (scooters > 0) parts.push(`${scooters} Scooter${scooters > 1 ? 's' : ''} Available`);
      if (motorbikes > 0) parts.push(`${motorbikes} Motorbike${motorbikes > 1 ? 's' : ''} Available`);
      return {
        isFullyBooked: false,
        scootersAvailable: scooters,
        motorbikesAvailable: motorbikes,
        totalAvailable: pkgs.length,
        summaryLabel: parts.join(' • '),
      };
    }

    const fallbackText =
      partner.fleetAvailability === 'high'
        ? 'High Fleet Availability (Scooters & Motorbikes)'
        : partner.fleetAvailability === 'medium'
        ? 'Moderate Fleet Availability'
        : 'Limited Units Available';

    return {
      isFullyBooked: false,
      scootersAvailable: partner.fleetAvailability === 'high' ? 4 : 2,
      motorbikesAvailable: partner.fleetAvailability === 'high' ? 3 : 1,
      totalAvailable: 4,
      summaryLabel: fallbackText,
    };
  };

  // Build selectable fleet options for active selectedPartner in Booking Modal
  const buildVehicleOptions = (partner: MotorbikeRentalPartner): BookingVehicleOption[] => {
    const options: BookingVehicleOption[] = [];
    const availableUnits = (partner.fleetUnits || []).filter((u) => u.status === 'available');
    const pkgs = partner.packages || [];

    // First, add available fleet units
    availableUnits.forEach((unit) => {
      options.push({
        id: unit.id,
        packageId: unit.id,
        name: unit.model,
        cc: unit.plateOrCode || '110–155cc',
        vehicleType: inferVehicleType(unit.model, unit.vehicleType),
        dailyRateRm: unit.dailyRateRm || partner.dailyRateRm || 75,
        hourlyRateRm: unit.hourlyRateRm || partner.hourlyRateRm || 18,
        depositRm: partner.depositRequired === false ? 0 : partner.depositAmountRm ?? 100,
        plateOrCode: unit.plateOrCode,
        imageUrl: partner.imageUrl || DEFAULT_PLACE_IMAGE,
        helmetsIncluded: 2,
        availableCount: 1,
      });
    });

    // Next, include packages not already matching an added fleet unit by model name
    pkgs.forEach((pkg) => {
      const alreadyHas = options.some(
        (o) => o.name.toLowerCase().trim() === pkg.name.toLowerCase().trim()
      );
      if (!alreadyHas) {
        options.push({
          id: pkg.id,
          packageId: pkg.id,
          name: pkg.name,
          cc: pkg.cc || '125cc–155cc',
          vehicleType: inferVehicleType(pkg.name, pkg.vehicleType),
          dailyRateRm: pkg.dailyRateRm || partner.dailyRateRm || 75,
          hourlyRateRm: pkg.hourlyRateRm || partner.hourlyRateRm || 18,
          depositRm: partner.depositRequired === false ? 0 : (pkg.depositRm ?? partner.depositAmountRm ?? 100),
          imageUrl: pkg.imageUrl || partner.imageUrl || DEFAULT_PLACE_IMAGE,
          helmetsIncluded: pkg.helmetsIncluded || 2,
          availableCount: 5,
        });
      }
    });

    // If vendor has neither fleetUnits nor packages yet, offer standard Scooter & Motorbike options from base rates
    if (options.length === 0) {
      const baseDaily = partner.dailyRateRm ?? 75;
      const baseHourly = partner.hourlyRateRm ?? 18;
      const depAmt = partner.depositRequired === false ? 0 : (partner.depositAmountRm ?? 100);
      options.push(
        {
          id: `${partner.id}-scooter`,
          packageId: `${partner.id}-scooter`,
          name: `${partner.businessName} — Automatic Scooter`,
          cc: '125cc–155cc',
          vehicleType: 'scooter',
          dailyRateRm: baseDaily,
          hourlyRateRm: baseHourly,
          depositRm: depAmt,
          imageUrl: partner.imageUrl || DEFAULT_PLACE_IMAGE,
          helmetsIncluded: 2,
          availableCount: 4,
        },
        {
          id: `${partner.id}-motorbike`,
          packageId: `${partner.id}-motorbike`,
          name: `${partner.businessName} — Touring Motorbike`,
          cc: '110cc–150cc',
          vehicleType: 'motorbike',
          dailyRateRm: baseDaily,
          hourlyRateRm: baseHourly,
          depositRm: depAmt,
          imageUrl: partner.imageUrl || DEFAULT_PLACE_IMAGE,
          helmetsIncluded: 2,
          availableCount: 3,
        }
      );
    }

    return options;
  };

  const vehicleOptions = useMemo(
    () => (selectedPartner ? buildVehicleOptions(selectedPartner) : []),
    [selectedPartner]
  );

  const activeVehicle = useMemo(
    () => vehicleOptions.find((v) => v.id === selectedVehicleId) || vehicleOptions[0] || null,
    [vehicleOptions, selectedVehicleId]
  );

  const enabledCustomPackages = useMemo(
    () => (selectedPartner?.customHourPackages || []).filter((c) => c.enabled),
    [selectedPartner]
  );

  const activeCustomPackage = useMemo(
    () =>
      enabledCustomPackages.find((c) => c.id === selectedCustomPkgId) ||
      enabledCustomPackages[0] ||
      null,
    [enabledCustomPackages, selectedCustomPkgId]
  );

  const calculateDays = () => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.max(0, end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays);
    } catch {
      return 1;
    }
  };

  const daysCount = calculateDays();

  const costBreakdown = useMemo(() => {
    if (!selectedPartner || !activeVehicle) {
      return { rentalFeeRm: 0, securityDepositRm: 0, totalPayableRm: 0, durationSummary: '1 Day' };
    }

    let baseRatePerUnit = 0;
    let durationSummary = '';
    if (durationMode === 'hourly') {
      const hRate = activeVehicle.hourlyRateRm || selectedPartner.hourlyRateRm || 18;
      baseRatePerUnit = hRate * Math.max(1, hoursCount);
      durationSummary = `${hoursCount} Hour${hoursCount > 1 ? 's' : ''}`;
    } else if (durationMode === 'custom_package' && activeCustomPackage) {
      baseRatePerUnit = activeCustomPackage.priceRm;
      durationSummary = `${activeCustomPackage.label} (${activeCustomPackage.hours} hrs)`;
    } else {
      const dRate = activeVehicle.dailyRateRm || selectedPartner.dailyRateRm || 75;
      baseRatePerUnit = dRate * daysCount;
      durationSummary = `${daysCount} Day${daysCount > 1 ? 's' : ''}`;
    }

    const extraHelmetUnits = Math.max(0, helmetsAddon - 2);
    const extraHelmetFee = extraHelmetUnits * 10 * (durationMode === 'daily' ? daysCount : 1);
    const mountFee = includePhoneMount ? 10 : 0;
    const deliveryFee = fulfillmentMethod === 'delivered' ? 15 : 0;

    const rentalFeeRm = Math.round(baseRatePerUnit * quantity + extraHelmetFee + mountFee + deliveryFee);

    const depPerUnit =
      selectedPartner.depositRequired === false
        ? 0
        : (selectedPartner.depositAmountRm ?? activeVehicle.depositRm ?? 100);
    const securityDepositRm = Math.round(depPerUnit * quantity);

    return {
      rentalFeeRm,
      securityDepositRm,
      totalPayableRm: rentalFeeRm + securityDepositRm,
      durationSummary,
    };
  }, [
    selectedPartner,
    activeVehicle,
    durationMode,
    hoursCount,
    activeCustomPackage,
    daysCount,
    quantity,
    helmetsAddon,
    includePhoneMount,
    fulfillmentMethod,
  ]);

  const handleOpenBooking = (partner: MotorbikeRentalPartner, preferredPkg?: MotorbikePackage) => {
    const opts = buildVehicleOptions(partner);
    const initialOption = preferredPkg
      ? opts.find((o) => o.packageId === preferredPkg.id || o.name === preferredPkg.name) || opts[0]
      : opts[0];

    setSelectedPartner(partner);
    setSelectedVehicleId(initialOption?.id || '');
    setQuantity(1);
    setPickupTownship(partner.township || 'Tanah Rata');

    const activeCustomPkgs = (partner.customHourPackages || []).filter((p) => p.enabled);
    if (partner.allowDays === false && partner.allowHours !== false) {
      setDurationMode('hourly');
    } else if (activeCustomPkgs.length > 0 && partner.allowDays === false && partner.allowHours === false) {
      setDurationMode('custom_package');
    } else {
      setDurationMode('daily');
    }
    setSelectedCustomPkgId(activeCustomPkgs[0]?.id || '');

    setRequestChildrenHelmet(Boolean(partner.childrenHelmet));
    setRequestFreeRaincoat(Boolean(partner.freeRaincoat));
    setIncludePhoneMount(false);
    setHelmetsAddon(2);
    setLicenseAck(false);
    setLicenseDocUrl(null);
    setLicenseDocName('');
    setPaymentProofUrl(null);
    setPaymentProofName('');
    setPaymentReference('');
    setBookingFormError(null);
    setConfirmedBooking(null);
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBookingFormError(null);
    if (file.size > 10 * 1024 * 1024) {
      setBookingFormError('Payment receipt exceeds 10MB. Please upload a smaller image or PDF.');
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
        if (typeof reader.result === 'string') setPaymentProofUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleUploadLicenseDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBookingFormError(null);
    if (file.size > 10 * 1024 * 1024) {
      setBookingFormError('License/IC file exceeds 10MB.');
      return;
    }
    setIsUploadingLicense(true);
    setLicenseDocName(file.name);
    try {
      const uploadedUrl = await firebaseService.uploadImage(file, 'renter_verification_docs');
      setLicenseDocUrl(uploadedUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setLicenseDocUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingLicense(false);
    }
  };

  const handleConfirmAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingFormError(null);
    if (!selectedPartner || !activeVehicle) return;

    if (!renterName.trim() || !renterPhone.trim()) {
      setBookingFormError('Please enter your Full Name and WhatsApp Phone Number.');
      return;
    }
    if (!licenseAck) {
      setBookingFormError(
        'Please confirm that you hold a valid Driving License & IC / Crossed IC (IC Berpalang) for verification.'
      );
      return;
    }
    if (costBreakdown.totalPayableRm > 0 && !paymentProofUrl && !paymentReference.trim()) {
      setBookingFormError(
        'Please upload your Proof of Payment receipt or enter your Transaction Reference ID before confirming.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 750));

      const bookingId =
        'bk-moto-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const bookingCode = `MOTO-${Math.floor(1000 + Math.random() * 9000)}`;
      const qrCode = `MTRV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const matchedVendor = vendorListings.find(
        (v) =>
          v.id === selectedPartner.id ||
          (selectedPartner.ownerEmail &&
            v.ownerEmail?.toLowerCase() === selectedPartner.ownerEmail.toLowerCase()) ||
          v.businessName.toLowerCase().trim() === selectedPartner.businessName.toLowerCase().trim()
      );

      const vendorUid = selectedPartner.ownerUid || matchedVendor?.ownerUid || selectedPartner.id;
      const vendorEmail = selectedPartner.ownerEmail || matchedVendor?.ownerEmail;

      const resolvedEndDate =
        durationMode === 'daily' ? endDate : startDate;

      const newBooking: MotorbikeBookingRecord = {
        id: bookingId,
        bookingCode,
        bookingType: 'motorbike_rental',
        partnerId: selectedPartner.id,
        partnerName: selectedPartner.businessName,
        vendorUid,
        vendorEmail,
        packageId: activeVehicle.packageId,
        packageName: activeVehicle.name,
        vehicleType: activeVehicle.vehicleType,
        quantity,
        unitPlateOrCode: activeVehicle.plateOrCode,
        renterName: renterName.trim(),
        renterEmail: renterEmail.trim() || 'traveler@camgo.my',
        renterPhone: renterPhone.trim(),
        pickupTownship,
        pickupLocation:
          selectedPartner.pickupHubAddress || `${selectedPartner.businessName} (${pickupTownship})`,
        dropoffLocation:
          selectedPartner.pickupHubAddress || `${selectedPartner.businessName} (${pickupTownship})`,
        pickupTime,
        dropoffTime: '18:00',
        startDate,
        endDate: resolvedEndDate,
        days: durationMode === 'daily' ? daysCount : 1,
        hours:
          durationMode === 'hourly'
            ? hoursCount
            : durationMode === 'custom_package' && activeCustomPackage
            ? activeCustomPackage.hours
            : undefined,
        rentalDurationType:
          durationMode === 'hourly'
            ? 'hours'
            : durationMode === 'daily'
            ? 'days'
            : 'custom_package',
        customPackageLabel:
          durationMode === 'custom_package' && activeCustomPackage
            ? activeCustomPackage.label
            : undefined,
        fulfillmentMethod,
        deliveryAddressOrHotel:
          fulfillmentMethod === 'delivered' ? deliveryAddress.trim() || pickupTownship : undefined,
        helmetsAddon,
        includePhoneMount,
        childrenHelmetRequested: requestChildrenHelmet,
        raincoatRequested: requestFreeRaincoat,
        licenseAck,
        licenseDocUrl: licenseDocUrl || undefined,
        licenseDocName: licenseDocName || undefined,
        rentalFeeRm: costBreakdown.rentalFeeRm,
        depositRm: costBreakdown.securityDepositRm,
        lockInFeeRm: costBreakdown.totalPayableRm,
        balanceToCollectRm: 0,
        depositStatus: costBreakdown.securityDepositRm > 0 ? 'paid' : 'refunded',
        paymentGateway: selectedGateway,
        paymentProofUrl: paymentProofUrl || undefined,
        paymentProofName: paymentProofName || undefined,
        paymentReference: paymentReference.trim() || undefined,
        isUnlocked: true,
        qrVoucherCode: qrCode,
        totalRm: costBreakdown.totalPayableRm,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };

      // Save to BOTH Firestore `bookings` collection (linked to vendorUid) & `motorbike_rentals`
      await firebaseService.saveMotorbikeBooking(newBooking);

      // Dispatch Unified Vendor Booking & Payment Notification Pipeline
      await firebaseService.createVendorBookingAlert({
        bookingId: newBooking.id,
        bookingCode,
        bookingType: 'motorbike',
        vendorId: selectedPartner.id,
        vendorName: selectedPartner.businessName,
        vendorEmail,
        vendorUid,
        guestName: newBooking.renterName,
        guestPhone: newBooking.renterPhone,
        guestEmail: newBooking.renterEmail,
        itemSummary: `${quantity}x ${activeVehicle.name} (${costBreakdown.durationSummary})`,
        checkInOrStart: `${startDate} ${pickupTime}`,
        checkOutOrEnd:
          durationMode === 'daily'
            ? endDate
            : `${startDate} (+${
                durationMode === 'hourly'
                  ? `${hoursCount}h`
                  : `${activeCustomPackage?.hours || 4}h`
              })`,
        totalAmountRm: costBreakdown.totalPayableRm,
        depositPaidRm: costBreakdown.securityDepositRm > 0 ? costBreakdown.securityDepositRm : costBreakdown.totalPayableRm,
        balanceDueRm: 0,
        paymentGateway: selectedGateway,
        paymentReference: paymentReference.trim() || undefined,
        paymentProofUrl: paymentProofUrl || undefined,
        paymentProofName: paymentProofName || undefined,
        whatsappNotified: true,
      });

      // Push notification dispatch for phone/browser alert if permitted
      pushNotificationService
        .dispatchNotification({
          title: `New Rental Booking (${bookingCode})`,
          body: `${newBooking.renterName} booked ${quantity}x ${activeVehicle.name} (${costBreakdown.durationSummary}) — RM${costBreakdown.totalPayableRm}`,
          tag: `moto-booking-${bookingId}`,
          url: '/',
        })
        .catch(() => {});

      const hostWaRaw = selectedPartner.whatsappNumber || selectedPartner.contactPhone || '+60123456789';
      const hostWaDigits = hostWaRaw.replace(/\D/g, '');
      const addOnsSummary: string[] = [`${helmetsAddon} Helmet(s)`];
      if (requestChildrenHelmet) addOnsSummary.push("Children's Helmet");
      if (requestFreeRaincoat) addOnsSummary.push('Free Waterproof Raincoat');
      if (includePhoneMount) addOnsSummary.push('Phone Mount');

      const proofLine =
        paymentProofUrl && !paymentProofUrl.startsWith('data:')
          ? `Payment Proof: ${paymentProofUrl}`
          : paymentProofName
          ? `Payment Receipt: ${paymentProofName}`
          : paymentReference.trim()
          ? `Transaction Ref: ${paymentReference.trim()}`
          : null;

      const waMessage = [
        `CamGo Motorbike/Scooter Booking (${bookingCode})`,
        `Vendor: ${selectedPartner.businessName} (${selectedPartner.township})`,
        `Vehicle: ${quantity}x ${activeVehicle.name} [${activeVehicle.vehicleType.toUpperCase()}]`,
        `Duration: ${costBreakdown.durationSummary} | Pickup: ${startDate} @ ${pickupTime}`,
        `Handover: ${
          fulfillmentMethod === 'delivered'
            ? `Deliver to ${deliveryAddress.trim() || pickupTownship}`
            : `Self-Collect (${pickupTownship})`
        }`,
        `Renter: ${newBooking.renterName} (${newBooking.renterPhone})`,
        `Inclusions/Add-ons: ${addOnsSummary.join(', ')}`,
        `Payment: ${selectedGateway.toUpperCase()} | Rental RM${costBreakdown.rentalFeeRm} + Deposit RM${costBreakdown.securityDepositRm} = RM${costBreakdown.totalPayableRm} PAID`,
        proofLine,
        `License & IC verified acknowledgment checked.`,
      ]
        .filter(Boolean)
        .join('\n');

      const builtWaUrl = `https://wa.me/${hostWaDigits}?text=${encodeURIComponent(waMessage)}`;
      setHostWhatsAppUrl(builtWaUrl);

      setConfirmedBooking(newBooking);
      setSelectedPartner(null);
    } catch (err) {
      console.error('Failed to process motorbike booking:', err);
      setBookingFormError('Could not complete booking. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-6xl mt-6 sm:mt-10 mb-16 rounded-3xl p-4 sm:p-8 bg-stone-950 border border-emerald-500/30 shadow-2xl relative text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-800 sticky top-0 bg-stone-950/95 backdrop-blur-xl z-30 pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Bike className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block truncate">
                Cameron Highlands Two-Wheel Mobility
              </span>
              <h2 className="text-lg sm:text-2xl font-heading font-black text-white truncate">
                Motorbike &amp; Scooter Rentals
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Intro */}
        <div className="mb-6 space-y-3">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-stone-900 to-teal-950/40 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-emerald-300">
                Explore Cameron Highlands on Two Wheels
              </h3>
              <p className="text-xs text-stone-300 max-w-2xl">
                Compare live Scooter &amp; Motorbike fleet counts, transparent hourly/daily rates, fuel policies, deposits &amp; custom packages before instant booking.
              </p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1.5 shrink-0 self-start sm:self-center">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{enrichedPartners.length} Verified Operators</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rental shop, township, scooter or motorbike model..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
            />
            <select
              value={selectedTownshipFilter}
              onChange={(e) => setSelectedTownshipFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-200 font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Townships</option>
              <option value="Tanah Rata">Tanah Rata</option>
              <option value="Brinchang">Brinchang</option>
              <option value="Kea Farm">Kea Farm</option>
              <option value="Ringlet">Ringlet</option>
              <option value="Tringkap">Tringkap</option>
              <option value="Kampung Raja">Kampung Raja</option>
            </select>
          </div>
        </div>

        {/* Partners Public Advertised Cards Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-stone-400 text-sm">Loading rental operators...</div>
        ) : filteredPartners.length === 0 ? (
          <div className="py-16 px-4 text-center rounded-3xl bg-stone-900/60 border border-stone-800 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <Bike className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No Motorbike Rentals Found</h3>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              Try adjusting your township filter or check back once highland motorbike and scooter partners publish their listings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPartners.map((partner) => {
              const fleet = getFleetBreakdown(partner);
              const activeHourPkgs = (partner.customHourPackages || []).filter((c) => c.enabled);
              const minPkgDaily =
                partner.packages && partner.packages.length > 0
                  ? Math.min(...partner.packages.map((p) => p.dailyRateRm || 75))
                  : undefined;
              const displayDailyRate = partner.dailyRateRm || minPkgDaily || 75;
              const displayHourlyRate = partner.hourlyRateRm || partner.packages?.[0]?.hourlyRateRm || 18;
              const hasDeposit = partner.depositRequired !== false && (partner.depositAmountRm ?? 100) > 0;
              const depositDisplay = hasDeposit
                ? `RM ${partner.depositAmountRm ?? 100} Deposit`
                : 'No Deposit Required';
              const rulesText = (partner.vendorRulesNotice || partner.vendorTerms || '').trim();
              const isRulesExpanded = Boolean(expandedRules[partner.id]);

              return (
                <div
                  key={partner.id}
                  className="rounded-2xl bg-stone-900 border border-stone-800 overflow-hidden shadow-xl hover:border-emerald-500/40 transition-all flex flex-col"
                >
                  {/* Card Cover Image + Live Status Overlay */}
                  <div className="relative h-44 w-full overflow-hidden bg-stone-950">
                    <img
                      src={safeSrc(partner.imageUrl, DEFAULT_PLACE_IMAGE)}
                      alt={partner.businessName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          partner.operatingStatus === 'open'
                            ? 'bg-emerald-500 text-stone-950'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {partner.operatingStatus === 'open' ? 'Open Now' : 'Closed'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-stone-950/85 text-teal-300 border border-teal-500/30">
                        {partner.township}
                      </span>
                    </div>

                    {/* Deposit Badge Top Right */}
                    <div
                      className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border backdrop-blur-md ${
                        hasDeposit
                          ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                          : 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50'
                      }`}
                    >
                      {depositDisplay}
                    </div>

                    {/* Live Fleet Availability Strip Bottom */}
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md border truncate ${
                          fleet.isFullyBooked
                            ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
                            : 'bg-stone-950/85 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {fleet.summaryLabel}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-3">
                      {/* Title & Location */}
                      <div>
                        <h4 className="text-base font-black text-white leading-snug">
                          {partner.businessName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{partner.township}, Cameron Highlands</span>
                          </span>
                          <span className="flex items-center gap-1 text-stone-300">
                            <Phone className="w-3 h-3 text-teal-400 shrink-0" />
                            <span>{partner.contactPhone}</span>
                          </span>
                        </div>
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="p-3 rounded-xl bg-stone-950/90 border border-stone-800 space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-1.5 rounded-lg bg-stone-900 border border-stone-800">
                            <span className="text-[9px] text-stone-400 uppercase block">Per Hour</span>
                            <span className="text-xs font-black font-mono text-cyan-300">
                              RM {displayHourlyRate}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-stone-900 border border-stone-800">
                            <span className="text-[9px] text-stone-400 uppercase block">Per Day</span>
                            <span className="text-xs font-black font-mono text-emerald-300">
                              RM {displayDailyRate}
                            </span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-stone-900 border border-stone-800">
                            <span className="text-[9px] text-stone-400 uppercase block">Deposit</span>
                            <span
                              className={`text-xs font-black font-mono ${
                                hasDeposit ? 'text-amber-300' : 'text-emerald-300'
                              }`}
                            >
                              {hasDeposit ? `RM ${partner.depositAmountRm ?? 100}` : 'RM 0'}
                            </span>
                          </div>
                        </div>

                        {activeHourPkgs.length > 0 && (
                          <div className="pt-1 border-t border-stone-800/80 space-y-1">
                            <span className="text-[10px] font-bold text-cyan-300 block">
                              Custom Hour Packages:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {activeHourPkgs.map((pkg) => (
                                <span
                                  key={pkg.id}
                                  className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-semibold text-cyan-200"
                                >
                                  {pkg.label} ({pkg.hours}h · RM{pkg.priceRm})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Included Add-ons & Fuel Policy Badges */}
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            partner.fuelPolicy === 'full_tank'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : partner.fuelPolicy === 'half_tank'
                              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                              : 'bg-stone-800 text-stone-400 border-stone-700'
                          }`}
                        >
                          <Fuel className="w-3 h-3" />
                          <span>
                            {partner.fuelPolicy === 'full_tank'
                              ? 'Full Tank Fuel Included'
                              : partner.fuelPolicy === 'half_tank'
                              ? 'Half Tank Fuel Included'
                              : 'Fuel Not Included'}
                          </span>
                        </span>

                        {partner.freeRaincoat && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                            <Umbrella className="w-3 h-3" />
                            <span>Free Waterproof Raincoat</span>
                          </span>
                        )}

                        {partner.childrenHelmet && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-200 border border-amber-500/30">
                            <Shield className="w-3 h-3" />
                            <span>Children&apos;s Helmet Available</span>
                          </span>
                        )}
                      </div>

                      {/* Models Quick List (if packages exist) */}
                      {partner.packages && partner.packages.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider block">
                            Available Models:
                          </span>
                          <div className="space-y-1">
                            {partner.packages.slice(0, 3).map((pkg) => (
                              <div
                                key={pkg.id}
                                className="px-2.5 py-1.5 rounded-xl bg-stone-950/70 border border-stone-800 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <span className="font-bold text-white truncate block">
                                    {pkg.name}
                                  </span>
                                  <span className="text-[10px] text-stone-400">
                                    {pkg.cc} • {pkg.helmetsIncluded} Helmets
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[11px] font-mono font-bold text-emerald-400">
                                    RM {pkg.dailyRateRm}/d
                                  </span>
                                  <button
                                    type="button"
                                    disabled={fleet.isFullyBooked}
                                    onClick={() => handleOpenBooking(partner, pkg)}
                                    className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-emerald-600 text-stone-200 hover:text-white text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-40"
                                  >
                                    Select
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vendor Rules & Notice Collapsible Preview */}
                      {rulesText && (
                        <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRules((prev) => ({ ...prev, [partner.id]: !prev[partner.id] }))
                            }
                            className="w-full flex items-center justify-between text-[11px] font-bold text-amber-300 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Vendor Rules &amp; Notice</span>
                            </span>
                            {isRulesExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <p
                            className={`text-[11px] text-stone-300 whitespace-pre-line leading-relaxed ${
                              isRulesExpanded ? '' : 'line-clamp-2'
                            }`}
                          >
                            {rulesText}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Primary CTA Button */}
                    <div className="pt-2 border-t border-stone-800">
                      <button
                        type="button"
                        disabled={fleet.isFullyBooked}
                        onClick={() => handleOpenBooking(partner)}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-black text-xs transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                      >
                        <Bike className="w-4 h-4" />
                        <span>{fleet.isFullyBooked ? 'Currently Fully Booked' : 'Book Now'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          MOTORBIKE / SCOOTER BOOKING MODAL (Mirroring Verified Homestay UX)
      ====================================================================== */}
      {selectedPartner && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-hidden"
          onClick={() => setSelectedPartner(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-3xl bg-stone-900 border border-emerald-500/40 shadow-2xl overflow-hidden text-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-950/90 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider block">
                  CamGo Verified Two-Wheel Booking
                </span>
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  Book with {selectedPartner.businessName}
                </h3>
                <p className="text-[11px] text-stone-400 truncate">
                  {selectedPartner.township} · Instant Vendor Alert &amp; Handover QR
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Booking Form */}
            <form
              onSubmit={handleConfirmAndPay}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 overscroll-contain"
            >
              {/* 1. Vehicle & Quantity Selection */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider block">
                  1. Select Vehicle &amp; Quantity
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">
                      Available Motorbike / Scooter
                    </label>
                    <select
                      value={activeVehicle?.id || ''}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                    >
                      {vehicleOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          [{opt.vehicleType === 'scooter' ? 'Scooter' : 'Motorbike'}] {opt.name} (RM{' '}
                          {opt.dailyRateRm}/day · RM {opt.hourlyRateRm}/hr)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, vehicleOptions.length)}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Rental Duration & Pickup Schedule */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider block">
                  2. Rental Duration &amp; Pickup Schedule
                </span>

                {/* Duration Mode Tabs */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={selectedPartner.allowHours === false}
                    onClick={() => setDurationMode('hourly')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-40 ${
                      durationMode === 'hourly'
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                    }`}
                  >
                    Hourly
                  </button>
                  <button
                    type="button"
                    disabled={selectedPartner.allowDays === false}
                    onClick={() => setDurationMode('daily')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-40 ${
                      durationMode === 'daily'
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    disabled={enabledCustomPackages.length === 0}
                    onClick={() => setDurationMode('custom_package')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-40 ${
                      durationMode === 'custom_package'
                        ? 'bg-cyan-600 text-white border-cyan-400'
                        : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                    }`}
                  >
                    Custom Hours
                  </button>
                </div>

                {durationMode === 'custom_package' && enabledCustomPackages.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {enabledCustomPackages.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedCustomPkgId(pkg.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          activeCustomPackage?.id === pkg.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-white'
                            : 'bg-stone-900 border-stone-800 text-stone-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{pkg.label}</div>
                        <div className="text-[11px] font-mono text-cyan-300">
                          {pkg.hours} Hours · RM {pkg.priceRm} / unit
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">
                      Pickup Date
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">
                      Pickup Time
                    </label>
                    <input
                      type="time"
                      required
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {durationMode === 'hourly' ? (
                    <div>
                      <label className="text-[11px] font-bold text-stone-300 block mb-1">
                        Hours
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={hoursCount}
                        onChange={(e) => setHoursCount(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono text-xs font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : durationMode === 'daily' ? (
                    <div>
                      <label className="text-[11px] font-bold text-stone-300 block mb-1">
                        Return Date
                      </label>
                      <input
                        type="date"
                        required
                        min={startDate}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col justify-end pb-1">
                      <span className="text-[10px] text-stone-400">Package Window</span>
                      <span className="text-xs font-bold text-cyan-300">
                        {activeCustomPackage?.hours || 4} Hours Same-Day
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">
                      Handover Method
                    </label>
                    <select
                      value={fulfillmentMethod}
                      onChange={(e) =>
                        setFulfillmentMethod(e.target.value as 'self_collect' | 'delivered')
                      }
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="self_collect">Self-Collect at Shop ({selectedPartner.township})</option>
                      <option value="delivered">Deliver to Hotel / Homestay (+RM15)</option>
                    </select>
                  </div>

                  {fulfillmentMethod === 'delivered' ? (
                    <div>
                      <label className="text-[11px] font-bold text-stone-300 block mb-1">
                        Delivery Hotel / Area
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="e.g., Nova Highlands / Golden Hills"
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] font-bold text-stone-300 block mb-1">
                        Pickup Township
                      </label>
                      <select
                        value={pickupTownship}
                        onChange={(e) => setPickupTownship(e.target.value as Township)}
                        className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Tanah Rata">Tanah Rata</option>
                        <option value="Brinchang">Brinchang</option>
                        <option value="Kea Farm">Kea Farm</option>
                        <option value="Ringlet">Ringlet</option>
                        <option value="Tringkap">Tringkap</option>
                        <option value="Kampung Raja">Kampung Raja</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Equipment Add-ons & Vendor Free Inclusions */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2.5">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider block">
                  3. Equipment &amp; Add-ons
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedPartner.childrenHelmet && (
                    <label className="p-2.5 rounded-xl bg-stone-900 border border-emerald-500/30 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requestChildrenHelmet}
                        onChange={(e) => setRequestChildrenHelmet(e.target.checked)}
                        className="rounded border-stone-700 bg-stone-950 text-emerald-500"
                      />
                      <span className="text-emerald-200 font-semibold">
                        Request Children&apos;s Helmet (Free)
                      </span>
                    </label>
                  )}

                  {selectedPartner.freeRaincoat && (
                    <label className="p-2.5 rounded-xl bg-stone-900 border border-emerald-500/30 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requestFreeRaincoat}
                        onChange={(e) => setRequestFreeRaincoat(e.target.checked)}
                        className="rounded border-stone-700 bg-stone-950 text-emerald-500"
                      />
                      <span className="text-emerald-200 font-semibold">
                        Request Free Waterproof Raincoat
                      </span>
                    </label>
                  )}

                  <label className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePhoneMount}
                      onChange={(e) => setIncludePhoneMount(e.target.checked)}
                      className="rounded border-stone-700 bg-stone-950 text-emerald-500"
                    />
                    <span className="text-stone-200 font-semibold">
                      Handlebar Phone Mount (+RM10)
                    </span>
                  </label>

                  <div className="p-2 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-2">
                    <span className="text-stone-300 font-semibold">Helmets:</span>
                    <select
                      value={helmetsAddon}
                      onChange={(e) => setHelmetsAddon(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg bg-stone-950 border border-stone-700 text-xs text-white font-semibold"
                    >
                      <option value={2}>2 Helmets (Free)</option>
                      <option value={3}>3 Helmets (+RM10)</option>
                      <option value={4}>4 Helmets (+RM20)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Renter Details & Required Documents */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider block">
                  4. Renter Details &amp; License / IC Verification
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={renterName}
                      onChange={(e) => setRenterName(e.target.value)}
                      placeholder="e.g., Aiman Farhan"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">
                      WhatsApp Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={renterPhone}
                      onChange={(e) => setRenterPhone(e.target.value)}
                      placeholder="+60123456789"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={renterEmail}
                      onChange={(e) => setRenterEmail(e.target.value)}
                      placeholder="rider@gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Vendor Terms / Rules Reminder */}
                {(selectedPartner.vendorRulesNotice || selectedPartner.vendorTerms) && (
                  <div className="p-2.5 rounded-xl bg-amber-950/25 border border-amber-500/30 text-[11px] text-amber-100 space-y-1">
                    <span className="font-bold text-amber-300 block">
                      Vendor Rules &amp; Operational Notice:
                    </span>
                    <p className="whitespace-pre-line leading-relaxed text-stone-300">
                      {selectedPartner.vendorRulesNotice || selectedPartner.vendorTerms}
                    </p>
                  </div>
                )}

                {/* License & IC Checklist + Optional Upload */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2 text-xs text-stone-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={licenseAck}
                      onChange={(e) => setLicenseAck(e.target.checked)}
                      className="mt-0.5 rounded border-stone-700 bg-stone-900 text-emerald-500"
                    />
                    <span>
                      I confirm I hold a valid <strong>Driving License (B2/B / International)</strong> and{' '}
                      <strong>IC / Crossed IC (IC Berpalang)</strong> to present upon vehicle handover.
                    </span>
                  </label>

                  <label className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-dashed border-stone-700 text-stone-300 text-[11px] font-semibold flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="truncate">
                      {isUploadingLicense
                        ? 'Uploading License / IC...'
                        : licenseDocName
                        ? `Attached: ${licenseDocName}`
                        : 'Optional: Upload Driving License / Crossed IC (Faster Handover)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleUploadLicenseDoc}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 5. Payment Gateway & Proof of Payment */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2.5">
                <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>5. Payment Gateway &amp; Proof of Payment</span>
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
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-dashed border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {isUploadingProof
                        ? 'Uploading Receipt...'
                        : paymentProofName
                        ? `Uploaded: ${paymentProofName}`
                        : 'Upload Payment Receipt'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleUploadProof}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => {
                      setPaymentReference(e.target.value);
                      setBookingFormError(null);
                    }}
                    placeholder="Or enter Transaction Ref ID (e.g. FPX-8821)"
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

              {/* Dynamic Cost Summary */}
              <div className="p-4 rounded-2xl bg-emerald-950/35 border border-emerald-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-300">
                    Rental Fee ({quantity}x · {costBreakdown.durationSummary}):
                  </span>
                  <span className="font-mono font-bold text-white">
                    RM {costBreakdown.rentalFeeRm}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-300 font-semibold">
                    Required Security Deposit ({quantity} unit{quantity > 1 ? 's' : ''}):
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    {costBreakdown.securityDepositRm > 0
                      ? `RM ${costBreakdown.securityDepositRm}`
                      : 'RM 0 (No Deposit)'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-emerald-500/25">
                  <span className="font-black text-emerald-300 text-sm">Total Payable:</span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    RM {costBreakdown.totalPayableRm}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingProof || isUploadingLicense}
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs cursor-pointer shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Confirming Booking &amp; Notifying Vendor...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Confirm &amp; Pay (RM {costBreakdown.totalPayableRm})</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPartner(null)}
                  className="px-4 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          CONFIRMED QR HANDOVER VOUCHER MODAL (Matching Verified Homestay UX)
      ====================================================================== */}
      {confirmedBooking && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/95 backdrop-blur-md"
          onClick={() => setConfirmedBooking(null)}
        >
          <div
            className="w-full max-w-md bg-stone-900 border border-emerald-500/50 rounded-3xl p-5 sm:p-6 text-stone-100 space-y-4 shadow-2xl relative max-h-[92dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    Booking Confirmed &amp; Saved
                  </span>
                  <h3 className="font-black text-base text-white">
                    Vendor Notified Instantly!
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmedBooking(null)}
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Handover Voucher */}
            <div className="bg-stone-950 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-2">
              <p className="text-[11px] text-stone-400 font-medium">
                Present this QR code at {confirmedBooking.partnerName} handover counter
              </p>
              {safeSrc(voucherQrUrl) ? (
                <div className="inline-block p-2.5 bg-white rounded-2xl shadow-xl">
                  <img
                    src={safeSrc(voucherQrUrl)}
                    alt="Handover QR Code"
                    className="w-36 h-36 object-contain"
                  />
                </div>
              ) : (
                <div className="w-36 h-36 mx-auto bg-stone-800 rounded-2xl flex items-center justify-center text-xs text-stone-500">
                  <QrCode className="w-8 h-8 text-emerald-400" />
                </div>
              )}
              <div className="font-mono text-xs font-bold text-emerald-400">
                BOOKING CODE: {confirmedBooking.bookingCode}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-4 space-y-2.5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  Rental Summary
                </span>
                <p className="font-black text-sm text-white">
                  {confirmedBooking.quantity || 1}x {confirmedBooking.packageName}
                </p>
                <p className="text-stone-400 mt-0.5">
                  {confirmedBooking.partnerName} ({confirmedBooking.pickupTownship}) ·{' '}
                  {confirmedBooking.startDate} @ {confirmedBooking.pickupTime}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Renter:</span>
                  <span className="font-bold text-white">
                    {confirmedBooking.renterName} ({confirmedBooking.renterPhone})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Total Paid ({confirmedBooking.paymentGateway?.toUpperCase()}):</span>
                  <span className="font-mono font-black text-emerald-400">
                    RM {confirmedBooking.totalRm}
                  </span>
                </div>
                {confirmedBooking.paymentReference && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Transaction Ref:</span>
                    <span className="font-mono text-cyan-300">{confirmedBooking.paymentReference}</span>
                  </div>
                )}
              </div>

              {hostWhatsAppUrl && (
                <a
                  href={hostWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Open WhatsApp Chat with Vendor</span>
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={() => setConfirmedBooking(null)}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
            >
              Done / Return to Rentals
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
