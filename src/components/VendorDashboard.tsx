import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Store,
  Ticket,
  BarChart3,
  Settings,
  ShieldCheck,
  Zap,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  MessageSquare,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  FileText,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Share2,
  Download,
  Calendar,
  Sparkles,
  CreditCard,
  UserPlus,
  ParkingCircle,
  Tag,
  ChevronRight,
  X,
  Building2,
  Phone,
  Globe,
  Award,
  Flame,
  Check,
  LogOut,
  ArrowLeft,
  Search,
  Save,
  Loader2,
  Bike,
  Utensils,
  ShoppingBag,
  Home,
  Car,
  Wrench,
  Compass,
  Package,
  Briefcase,
} from 'lucide-react';
import {
  BUSINESS_TAXONOMY,
  findBusinessSector,
  findBusinessCategory,
  BusinessSector,
  BusinessCategoryItem,
} from '../data/businessTaxonomy';
import {
  VendorListing,
  VendorVoucher,
  VendorEventItem,
  VendorStaffMember,
  VendorAnalyticsData,
  VendorRealTimeStatus,
  DiyHarvestStatus,
  ParkingStatus,
  RoomAvailabilityStatus,
  DietaryTag,
  OperatingHours,
  DayOfWeek,
  Township,
  MainCategory,
  SubCategory,
  SubscriptionTier,
  VendorVerificationStatus,
  MotorbikeBookingRecord,
  MotorbikeRentalPartner,
  MotorbikeFleetStatus,
  MotorbikePackage,
} from '../types';
import { firebaseService, UserProfile, isMockMotorbikePartner } from '../services/firebase';

interface VendorDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOpenOnboarding: () => void;
  onSignOut?: () => void;
  onOpenAdmin?: () => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onOpenOnboarding,
  onSignOut,
  onOpenAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<
    'directory' | 'promotions' | 'analytics' | 'billing' | 'reservations' | 'overview' | 'motorbikes'
  >('directory');

  // Vendor Listing State
  const [vendorListings, setVendorListings] = useState<VendorListing[]>([]);
  const [activeVendor, setActiveVendor] = useState<VendorListing | null>(null);
  const [searchListingQuery, setSearchListingQuery] = useState('');
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Timeframe Filter for Overview Analytics
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  // Operational Flags State (for active vendor)
  const [realTimeStatus, setRealTimeStatus] = useState<VendorRealTimeStatus>('open');
  const [diyHarvestStatus, setDiyHarvestStatus] = useState<DiyHarvestStatus>('picking_open');
  const [parkingStatus, setParkingStatus] = useState<ParkingStatus>('private_available');
  const [roomAvailabilityStatus, setRoomAvailabilityStatus] = useState<RoomAvailabilityStatus>('rooms_available');

  // Modals & Forms State
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [vouchers, setVouchers] = useState<VendorVoucher[]>([]);
  const [voucherTitle, setVoucherTitle] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState('15');

  const [showEventModal, setShowEventModal] = useState(false);
  const [events, setEvents] = useState<VendorEventItem[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('10:00 AM');
  const [eventDesc, setEventDesc] = useState('');

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffList, setStaffList] = useState<VendorStaffMember[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'manager' | 'receptionist'>('receptionist');

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAddListingModal, setShowAddListingModal] = useState(false);

  // Sector Evaluation Modal State
  const [sectorModalType, setSectorModalType] = useState<'fnb' | 'hotel' | 'vehicle' | null>(null);

  const triggerSectorModalForVendor = (sectorId?: string) => {
    const targetSectorId = sectorId || activeSector.id;
    if (targetSectorId === 'food_beverage') {
      setSectorModalType('fnb');
    } else if (targetSectorId === 'real_estate_accommodation') {
      setSectorModalType('hotel');
    } else if (targetSectorId === 'vehicle_equipment_rental') {
      setSectorModalType('vehicle');
    } else {
      setSectorModalType('fnb');
    }
  };

  // New Listing Form State (for Admin Add)
  const [newBizName, setNewBizName] = useState('');
  const [newBizLogo, setNewBizLogo] = useState('');
  const [newBizTownship, setNewBizTownship] = useState<Township>('Brinchang');
  const [newBizCategory, setNewBizCategory] = useState<MainCategory>('food');
  const [newBizSubCategory, setNewBizSubCategory] = useState<string>('fb_restaurants_cafes');
  const [newBizPhone, setNewBizPhone] = useState('+6012');
  const [newBizAddress, setNewBizAddress] = useState('');

  // Active Sector & Category derived dynamically from activeVendor
  const activeSector: BusinessSector = findBusinessSector(activeVendor?.subCategory || activeVendor?.category);
  const activeCategoryConfig: BusinessCategoryItem = findBusinessCategory(activeVendor?.subCategory) || activeSector.categories[0];
  const isFnBVendor =
    activeSector.id === 'food_beverage' ||
    activeVendor?.category === 'food' ||
    (typeof activeVendor?.subCategory === 'string' && activeVendor.subCategory.startsWith('fb_'));

  const getSectorIcon = (sectorId: string) => {
    switch (sectorId) {
      case 'food_beverage':
        return Utensils;
      case 'retail_products':
        return ShoppingBag;
      case 'real_estate_accommodation':
        return Home;
      case 'vehicle_equipment_rental':
        return Bike;
      case 'professional_services':
        return Wrench;
      case 'tourism_leisure_events':
        return Compass;
      default:
        return Store;
    }
  };
  const SectorIcon = getSectorIcon(activeSector.id);

  // Motorbike & Scooter Management State
  const [motorbikeBookings, setMotorbikeBookings] = useState<MotorbikeBookingRecord[]>([]);
  const [motorbikePartners, setMotorbikePartners] = useState<MotorbikeRentalPartner[]>([]);
  const [motorbikeFleetStatus, setMotorbikeFleetStatus] = useState<MotorbikeFleetStatus>('high');

  // Enabled Operational Flags & Features State (greyed out by default)
  const [enabledFlags, setEnabledFlags] = useState<{
    operatingStatus: boolean;
    diyHarvestStatus: boolean;
    parkingStatus: boolean;
    roomAvailabilityStatus: boolean;
    motorbikeFleetStatus: boolean;
    dietaryTagsEnabled: boolean;
  }>({
    operatingStatus: true,
    diyHarvestStatus: false,
    parkingStatus: false,
    roomAvailabilityStatus: false,
    motorbikeFleetStatus: false,
    dietaryTagsEnabled: false,
  });

  // Bike Package Form State (inside Listing Management)
  const [showBikeForm, setShowBikeForm] = useState(false);
  const [editingBike, setEditingBike] = useState<string | null>(null);
  const [bikeName, setBikeName] = useState('');
  const [bikeCc, setBikeCc] = useState('155cc');
  const [bikePrice, setBikePrice] = useState('80');
  const [bikeImage, setBikeImage] = useState('https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80');
  const [bikeHelmets, setBikeHelmets] = useState('2');
  const [bikePkgDetails, setBikePkgDetails] = useState('');
  const [bikeAddonDetails, setBikeAddonDetails] = useState('');

  // Check if current user is admin
  const isUserAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.email === 'ayahsyirah77@gmail.com' ||
    currentUser?.email?.toLowerCase().includes('admin');

  // Load Vendor Data
  const refreshVendorData = () => {
    const allListings = firebaseService.getVendorListings();
    const isAdmin =
      currentUser?.role === 'admin' ||
      currentUser?.email === 'ayahsyirah77@gmail.com' ||
      currentUser?.email?.toLowerCase().includes('admin');

    // Filter listings: admin sees all, vendor sees owned, fallback to all for viewing
    const userListings = isAdmin
      ? allListings
      : currentUser
      ? allListings.filter(
          (l) => l.ownerUid === currentUser.uid || l.ownerEmail === currentUser.email
        )
      : allListings;

    setVendorListings(userListings);
    setMotorbikeBookings(firebaseService.getMotorbikeBookings());
    setMotorbikePartners(firebaseService.getMotorbikePartners());

    if (userListings.length > 0) {
      const current =
        activeVendor && userListings.some((l) => l.id === activeVendor.id)
          ? userListings.find((l) => l.id === activeVendor.id)!
          : userListings[0];

      setActiveVendor(current);
      setRealTimeStatus(current.realTimeStatus);
      if (current.diyHarvestStatus) setDiyHarvestStatus(current.diyHarvestStatus);
      setParkingStatus(current.parkingStatus);
      if (current.roomAvailabilityStatus) setRoomAvailabilityStatus(current.roomAvailabilityStatus);
      else setRoomAvailabilityStatus('rooms_available');

      if (current.motorbikeFleetStatus) setMotorbikeFleetStatus(current.motorbikeFleetStatus);

      if (current.enabledFlags) {
        setEnabledFlags({
          operatingStatus: !!current.enabledFlags.operatingStatus,
          diyHarvestStatus: !!current.enabledFlags.diyHarvestStatus,
          parkingStatus: !!current.enabledFlags.parkingStatus,
          roomAvailabilityStatus: !!current.enabledFlags.roomAvailabilityStatus,
          motorbikeFleetStatus: !!current.enabledFlags.motorbikeFleetStatus,
          dietaryTagsEnabled: !!current.enabledFlags.dietaryTagsEnabled || !!current.dietaryTagsEnabled,
        });
      } else {
        setEnabledFlags({
          operatingStatus: true,
          diyHarvestStatus: current.category === 'travel_tourism' || current.subCategory === 'agrotourism_farms',
          parkingStatus: true,
          roomAvailabilityStatus: current.category === 'accommodation',
          motorbikeFleetStatus: current.category === 'transport' || current.subCategory === 'car_bike_rentals',
          dietaryTagsEnabled: !!current.dietaryTagsEnabled,
        });
      }

      setVouchers(firebaseService.getVendorVouchers(current.id));
      setEvents(firebaseService.getVendorEvents(current.id));
      setStaffList(firebaseService.getVendorStaff(current.id));
    } else {
      setActiveVendor(null);
    }
  };

  const handleToggleFlagActive = async (flagKey: keyof typeof enabledFlags) => {
    const updatedFlags = {
      ...enabledFlags,
      [flagKey]: !enabledFlags[flagKey],
    };
    setEnabledFlags(updatedFlags);
    if (activeVendor) {
      const updatedVendor = {
        ...activeVendor,
        enabledFlags: updatedFlags,
        updatedAt: new Date().toISOString(),
      };
      setActiveVendor(updatedVendor);
      await firebaseService.saveVendorListing(updatedVendor);
      setSaveNotification(`Operational flag toggled ${updatedFlags[flagKey] ? 'ENABLED' : 'DISABLED'}!`);
      setTimeout(() => setSaveNotification(null), 2500);
    }
  };

  const handleSaveBikePackage = async () => {
    if (!activeVendor || !bikeName || !bikePrice) return;
    const pkgId = editingBike || `bike-${Date.now()}`;
    const newPkg: MotorbikePackage = {
      id: pkgId,
      name: bikeName,
      cc: bikeCc,
      dailyRateRm: Number(bikePrice) || 80,
      imageUrl: bikeImage || 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
      helmetsIncluded: Number(bikeHelmets) || 2,
      packageDetails: bikePkgDetails,
      addonDetails: bikeAddonDetails,
    };

    const existingPkgs = activeVendor.motorbikePackages || [];
    let updatedPkgs: MotorbikePackage[];
    if (editingBike) {
      updatedPkgs = existingPkgs.map((p) => (p.id === editingBike ? newPkg : p));
    } else {
      updatedPkgs = [...existingPkgs, newPkg];
    }

    const updatedVendor = {
      ...activeVendor,
      motorbikePackages: updatedPkgs,
      motorbikeFleetStatus: motorbikeFleetStatus,
      updatedAt: new Date().toISOString(),
    };

    setActiveVendor(updatedVendor);
    await firebaseService.saveVendorListing(updatedVendor);

    // Also update motorbike partner in firebaseService so public marketplace reflects it immediately
    const partnerToSync: MotorbikeRentalPartner = {
      id: activeVendor.id,
      businessName: activeVendor.businessName,
      township: activeVendor.township,
      imageUrl: activeVendor.coverImage,
      operatingStatus: activeVendor.realTimeStatus === 'closed_roadworks' ? 'closed' : 'open',
      fleetAvailability: (motorbikeFleetStatus === 'not_applicable' ? 'high' : motorbikeFleetStatus) as any,
      contactPhone: activeVendor.contactPhone,
      whatsappNumber: activeVendor.whatsappNumber,
      packages: updatedPkgs,
    };
    await firebaseService.saveMotorbikePartner(partnerToSync);
    setMotorbikePartners(firebaseService.getMotorbikePartners());

    setShowBikeForm(false);
    setEditingBike(null);
    setBikeName('');
    setBikePkgDetails('');
    setBikeAddonDetails('');
    setSaveNotification(`Saved motorbike "${newPkg.name}" to fleet!`);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  useEffect(() => {
    if (isOpen) {
      refreshVendorData();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // 1-Click Master Admin Login
  const handleAdminQuickLogin = async () => {
    try {
      setIsSaving(true);
      await firebaseService.signInAsAdmin('ayahsyirah77@gmail.com');
      refreshVendorData();
      setSaveNotification('Logged in as Master Admin (ayahsyirah77@gmail.com)! Full privileges granted.');
      setTimeout(() => setSaveNotification(null), 4000);
    } catch (err: any) {
      console.error('Admin login error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Status Toggles
  const handleToggleRealTimeStatus = async (status: VendorRealTimeStatus) => {
    setRealTimeStatus(status);
    if (activeVendor) {
      const updated = { ...activeVendor, realTimeStatus: status, updatedAt: new Date().toISOString() };
      setActiveVendor(updated);
      await firebaseService.saveVendorListing(updated);
      setSaveNotification(`Status updated to "${status.replace('_', ' ')}" and synced live!`);
      setTimeout(() => setSaveNotification(null), 3000);
    }
  };

  const handleToggleHarvestStatus = async (status: DiyHarvestStatus) => {
    setDiyHarvestStatus(status);
    if (activeVendor) {
      const updated = { ...activeVendor, diyHarvestStatus: status, updatedAt: new Date().toISOString() };
      setActiveVendor(updated);
      await firebaseService.saveVendorListing(updated);
      setSaveNotification(`DIY fruit harvest status updated to "${status.replace('_', ' ')}"!`);
      setTimeout(() => setSaveNotification(null), 3000);
    }
  };

  const handleToggleParkingStatus = async (status: ParkingStatus) => {
    setParkingStatus(status);
    if (activeVendor) {
      const updated = { ...activeVendor, parkingStatus: status, updatedAt: new Date().toISOString() };
      setActiveVendor(updated);
      await firebaseService.saveVendorListing(updated);
      setSaveNotification(`Parking availability alert updated to "${status.replace('_', ' ')}"!`);
      setTimeout(() => setSaveNotification(null), 3000);
    }
  };

  const handleToggleRoomAvailability = async (status: RoomAvailabilityStatus) => {
    setRoomAvailabilityStatus(status);
    if (activeVendor) {
      const updated = { ...activeVendor, roomAvailabilityStatus: status, updatedAt: new Date().toISOString() };
      setActiveVendor(updated);
      await firebaseService.saveVendorListing(updated);
      setSaveNotification(`Room availability status updated to "${status.replace('_', ' ')}"!`);
      setTimeout(() => setSaveNotification(null), 3000);
    }
  };

  const handleSaveActiveVendor = async () => {
    if (!activeVendor) return;
    setIsSaving(true);
    try {
      const updated = {
        ...activeVendor,
        verificationStatus: 'verified' as const,
        isBookingEnabled: true,
        updatedAt: new Date().toISOString(),
      };
      await firebaseService.saveVendorListing(updated);

      const currentBikePartners = firebaseService.getMotorbikePartners();
      const existingPartner = currentBikePartners.find(p => p.id === activeVendor.id);
      const vName = (activeVendor.businessName || '').toLowerCase();
      const isMotorbikeVendor =
        !isMockMotorbikePartner(activeVendor) &&
        activeVendor.category !== 'accommodation' &&
        !vName.includes('apartment') &&
        !vName.includes('park view') &&
        !vName.includes('cedar') &&
        (activeVendor.category === 'transport' || activeVendor.subCategory === 'car_bike_rentals' ||
          vName.includes('motorbike') ||
          vName.includes('motorcycle') ||
          vName.includes('scooter') ||
          vName.includes('sewa motor') ||
          vName.includes('sewa skuter')
        );

      if (existingPartner && !isMotorbikeVendor) {
        firebaseService.deleteMotorbikePartner(activeVendor.id);
        if (typeof setMotorbikePartners === 'function') {
          setMotorbikePartners(firebaseService.getMotorbikePartners());
        }
      } else if (isMotorbikeVendor) {
        const partnerToSync: MotorbikeRentalPartner = {
          id: activeVendor.id,
          businessName: activeVendor.businessName,
          township: activeVendor.township,
          imageUrl: activeVendor.coverImage || activeVendor.logoUrl || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
          operatingStatus: activeVendor.realTimeStatus === 'closed_roadworks' ? 'closed' : 'open',
          fleetAvailability: (motorbikeFleetStatus === 'not_applicable' ? 'high' : motorbikeFleetStatus) as any,
          contactPhone: activeVendor.contactPhone || '+60123456789',
          whatsappNumber: activeVendor.whatsappNumber || activeVendor.contactPhone || '+60123456789',
          packages: activeVendor.motorbikePackages || existingPartner?.packages || [],
        };
        await firebaseService.saveMotorbikePartner(partnerToSync);
        if (typeof setMotorbikePartners === 'function') {
          setMotorbikePartners(firebaseService.getMotorbikePartners());
        }
      }

      refreshVendorData();
      setSaveNotification(`Saved all changes for "${activeVendor.businessName}" to cloud & marketplace!`);
      setTimeout(() => setSaveNotification(null), 3500);
    } catch (e: any) {
      setSaveNotification(`Error saving listing: ${e.message}`);
      setTimeout(() => setSaveNotification(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!activeVendor) return;
    setIsSaving(true);
    await firebaseService.deleteVendorListing(activeVendor.id);
    refreshVendorData();
    setIsSaving(false);
    setSaveNotification(`Deleted listing "${activeVendor.businessName}"`);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleCreateNewVendorListing = async () => {
    if (!newBizName.trim()) return;
    const newId = `vendor-${Date.now().toString(36)}`;
    const newListing: VendorListing = {
      id: newId,
      ownerUid: currentUser?.uid || 'admin-ayahsyirah77',
      ownerEmail: currentUser?.email || 'ayahsyirah77@gmail.com',
      businessName: newBizName.trim(),
      ssmNumber: 'SSM-PENDING',
      verificationStatus: 'verified',
      isBookingEnabled: true,
      category: newBizCategory,
      subCategory: newBizSubCategory as any,
      township: newBizTownship,
      address: newBizAddress.trim() || `${newBizTownship}, Cameron Highlands, Pahang`,
      contactPhone: newBizPhone || '+60 5-491 0000',
      whatsappNumber: newBizPhone.replace(/[^0-9]/g, '') || '+60124910000',
      whatsappTemplateMessage: `Hello ${newBizName}! I found your listing on CamGo Cameron Highlands.`,
      description: `Verified ${newBizTownship} business offering highland experiences.`,
      operatingHours: { from: '08:30', to: '18:00', isOpen: true },
      coverImage: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
      logoUrl: newBizLogo || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=200&q=80',
      galleryImages: [
        'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
      ],
      coordinates: { lat: 4.49, lng: 101.39 },
      realTimeStatus: 'open',
      parkingStatus: 'private_available',
      roomAvailabilityStatus: 'not_applicable',
      dietaryTags: ['halal_certified'],
      tier: 'annual_pro',
      billingCadence: 'annual',
      tierExpiresAt: '2027-12-31',
      isSponsored: true,
      profileHealthScore: 90,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firebaseService.saveVendorListing(newListing);

    // Sync to Motorbike Rental Marketplace if explicitly a bike/scooter operator
    const newNameLower = (newListing.businessName || '').toLowerCase();
    const isExplicitBikeVendor =
      !isMockMotorbikePartner(newListing) && (
        newNameLower.includes('bike') ||
        newNameLower.includes('motorcycle') ||
        newNameLower.includes('scooter') ||
        newNameLower.includes('sewa motor') ||
        newNameLower.includes('sewa skuter')
      );

    if (isExplicitBikeVendor) {
      const partnerToSync: MotorbikeRentalPartner = {
        id: newListing.id,
        businessName: newListing.businessName,
        township: newListing.township,
        imageUrl: newListing.coverImage || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
        operatingStatus: 'open',
        fleetAvailability: 'high',
        contactPhone: newListing.contactPhone,
        whatsappNumber: newListing.whatsappNumber,
        packages: [],
      };
      await firebaseService.saveMotorbikePartner(partnerToSync);
      setMotorbikePartners(firebaseService.getMotorbikePartners());
    }

    setShowAddListingModal(false);
    setNewBizName('');
    setNewBizLogo('');
    setNewBizAddress('');
    refreshVendorData();
    setActiveVendor(newListing);
    setSaveNotification(`Successfully created new business "${newListing.businessName}"!`);
    setTimeout(() => setSaveNotification(null), 3500);
  };

  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeVendor) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const resultUrl = uploadEvent.target?.result as string;
        if (resultUrl) {
          const updatedGallery = [...(activeVendor.galleryImages || []), resultUrl];
          const updatedCover = activeVendor.coverImage || resultUrl;
          const updated = {
            ...activeVendor,
            coverImage: updatedCover,
            galleryImages: updatedGallery,
            updatedAt: new Date().toISOString(),
          };
          setActiveVendor(updated);
          firebaseService.saveVendorListing(updated);
          setSaveNotification(`Successfully uploaded photo "${file.name}" from local storage!`);
          setTimeout(() => setSaveNotification(null), 3500);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateVoucher = async () => {
    if (!activeVendor || !voucherTitle || !voucherCode) return;
    const newVoucher: VendorVoucher = {
      id: `vouch-${Date.now()}`,
      vendorId: activeVendor.id,
      businessName: activeVendor.businessName,
      title: voucherTitle,
      description: `Exclusive CamGo app discount at ${activeVendor.businessName}`,
      code: voucherCode.toUpperCase(),
      discountPercentage: Number(voucherDiscount) || 15,
      validUntil: '2026-12-31',
      claimedCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    const updated = await firebaseService.saveVendorVoucher(newVoucher);
    setVouchers(updated.filter((v) => v.vendorId === activeVendor.id));
    setVoucherTitle('');
    setVoucherCode('');
    setShowVoucherModal(false);
    setSaveNotification(`Created voucher "${newVoucher.code}"!`);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleCreateEvent = async () => {
    if (!activeVendor || !eventTitle || !eventDate) return;
    const newEvent: VendorEventItem = {
      id: `vevent-${Date.now()}`,
      vendorId: activeVendor.id,
      businessName: activeVendor.businessName,
      title: eventTitle,
      date: eventDate,
      time: eventTime,
      location: activeVendor.address,
      township: activeVendor.township,
      description: eventDesc || 'Special highland event hosted by vendor.',
      imageUrl: activeVendor.coverImage,
      createdAt: new Date().toISOString(),
    };
    const updated = await firebaseService.saveVendorEvent(newEvent);
    setEvents(updated.filter((e) => e.vendorId === activeVendor.id));
    setEventTitle('');
    setEventDate('');
    setEventDesc('');
    setShowEventModal(false);
    setSaveNotification(`Published event "${newEvent.title}"!`);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleAddStaff = async () => {
    if (!activeVendor || !staffName || !staffEmail) return;
    const newStaff: VendorStaffMember = {
      id: `staff-${Date.now()}`,
      vendorId: activeVendor.id,
      name: staffName,
      email: staffEmail,
      role: staffRole,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    const updated = await firebaseService.saveVendorStaff(newStaff);
    setStaffList(updated);
    setStaffName('');
    setStaffEmail('');
    setShowStaffModal(false);
    setSaveNotification(`Invited staff member "${newStaff.name}"!`);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const handleSignOut = async () => {
    await firebaseService.signOut();
    if (onSignOut) {
      onSignOut();
    }
    onClose();
  };

  // Filter listings based on search query
  const filteredListings = vendorListings.filter((l) => {
    if (!searchListingQuery.trim()) return true;
    const q = searchListingQuery.toLowerCase();
    return (
      l.businessName.toLowerCase().includes(q) ||
      l.township.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q)
    );
  });

  // SCREEN 1: Gateway if user is not logged in
  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-lg overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-lg bg-stone-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center text-stone-100 shadow-2xl space-y-5 my-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-950/40">
            <Store className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
              Highland Business &amp; Vendor Portal
            </span>
            <h2 className="text-2xl font-black text-white font-heading">
              Vendor Management &amp; Admin Access
            </h2>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              Control verified local listings, real-time strawberry harvest alerts, live parking status, vouchers, and customer traffic analytics.
            </p>
          </div>

          {/* Master Admin 1-Click Login Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/70 via-stone-950 to-stone-950 border border-red-500/40 text-left space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold text-xs text-red-300">
                <ShieldCheck className="w-4 h-4 text-red-400" />
                <span>Master Admin Full Access</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 uppercase">
                Super Admin
              </span>
            </div>
            <p className="text-[11px] text-stone-300">
              Grant immediate full admin access for <strong className="text-white">ayahsyirah77@gmail.com</strong> to view, edit, modify, and manage all listings across all 9 Cameron Highlands townships.
            </p>
            <button
              onClick={handleAdminQuickLogin}
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Login as Master Admin (ayahsyirah77@gmail.com)</span>
            </button>
          </div>

          {/* Standard Sign In Options */}
          <div className="space-y-2 pt-1">
            <button
              onClick={async () => {
                try {
                  await firebaseService.signInWithGoogle(false);
                  refreshVendorData();
                } catch {
                  onOpenAuth();
                }
              }}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-white/10 text-stone-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google Account</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenOnboarding();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Register New Business / Claim Listing</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/5">
            <button
              onClick={onClose}
              className="text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
            >
              Return to Website
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // SCREEN 2: If logged in, but no vendor listings found and user is not admin
  if (!activeVendor && !isUserAdmin) {
    return (
      <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-stone-950/90 backdrop-blur-lg overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-lg bg-stone-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-center text-stone-100 shadow-2xl space-y-5 my-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <Store className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white font-heading">No Registered Business Found</h2>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              Welcome to the CamGo Vendor Self-Service Management Portal. You haven't registered or claimed a business listing for{' '}
              <strong className="text-emerald-400">{currentUser?.email || 'your account'}</strong> yet.
            </p>
          </div>

          {/* Quick Admin bypass option if user is ayahsyirah77 */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/60 via-stone-950 to-stone-950 border border-red-500/40 text-left space-y-2">
            <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-red-400" />
              <span>Are you the administrator?</span>
            </span>
            <p className="text-[11px] text-stone-300">
              Log in with full master admin privileges to view, edit, and control all Cameron Highlands businesses.
            </p>
            <button
              onClick={handleAdminQuickLogin}
              className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Switch to Admin Account (ayahsyirah77@gmail.com)</span>
            </button>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => {
                onClose();
                onOpenOnboarding();
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register &amp; Verify My Local Business Now</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit to Website</span>
              </button>

              <button
                onClick={handleSignOut}
                className="w-full py-2.5 rounded-2xl bg-rose-950/50 hover:bg-rose-900/80 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const analytics: VendorAnalyticsData = activeVendor
    ? firebaseService.getVendorAnalytics(activeVendor.id)
    : {
        vendorId: 'demo',
        views7d: 1480,
        views30d: 6240,
        views90d: 18920,
        profileClicks: 940,
        whatsappClicks: 312,
        mapTriggers: 580,
        trafficSources: { mapSearch: 42, directory: 33, microclimate: 15, searchFilters: 10 },
        demographics: { bmPercent: 64, enPercent: 36 },
        peakVisitorHours: [
          { hour: '08:00', count: 45 },
          { hour: '10:00', count: 180 },
          { hour: '12:00', count: 240 },
          { hour: '14:00', count: 290 },
          { hour: '16:00', count: 210 },
          { hour: '18:00', count: 95 },
        ],
      };

  return (
    <div
      className="fixed inset-0 z-[95] bg-stone-950/90 backdrop-blur-lg overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="min-h-full flex items-center justify-center p-0 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="relative w-full max-w-6xl h-[92vh] bg-stone-900 border border-emerald-500/30 rounded-3xl shadow-2xl flex flex-col lg:flex-row overflow-hidden text-stone-100 my-auto"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Save Notification Toast */}
        <AnimatePresence>
          {saveNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[150] px-4 py-2 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{saveNotification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Header & Horizontal Tab Navigation Bar (Mobile View) */}
        <div className="lg:hidden bg-stone-950 border-b border-stone-800 p-3 shrink-0 space-y-2.5 z-20">
          {/* Top Row: Business Selector & Action Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                {filteredListings.length > 1 ? (
                  <select
                    value={activeVendor?.id}
                    onChange={(e) => {
                      const sel = vendorListings.find((l) => l.id === e.target.value);
                      if (sel) {
                        setActiveVendor(sel);
                        setRealTimeStatus(sel.realTimeStatus);
                        if (sel.diyHarvestStatus) setDiyHarvestStatus(sel.diyHarvestStatus);
                        setParkingStatus(sel.parkingStatus);
                        if (sel.roomAvailabilityStatus) setRoomAvailabilityStatus(sel.roomAvailabilityStatus);
                        else setRoomAvailabilityStatus('rooms_available');
                        setVouchers(firebaseService.getVendorVouchers(sel.id));
                        setEvents(firebaseService.getVendorEvents(sel.id));
                        setStaffList(firebaseService.getVendorStaff(sel.id));
                      }
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-stone-900 border border-stone-700 text-xs font-bold text-white truncate focus:outline-none"
                  >
                    {filteredListings.map((listing) => (
                      <option key={listing.id} value={listing.id}>
                        {listing.businessName} ({listing.township})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <span className="font-heading font-black text-xs text-white block truncate">
                      {activeVendor ? activeVendor.businessName : 'Vendor Dashboard'}
                    </span>
                    <span className="text-[9px] text-emerald-400 font-mono block">
                      {activeVendor?.township} · {activeVendor?.verificationStatus}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowAddListingModal(true)}
                className="px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                title="Add Listing"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white bg-stone-800 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Row: Mobile Horizontal Scrollable Tab Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
            {[
              { id: 'directory', label: 'Profile & Sector', icon: Store },
              { id: 'promotions', label: 'Deals', icon: Ticket },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'billing', label: 'Team', icon: Settings },
              { id: 'reservations', label: 'Orders & Bookings', icon: Calendar },
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/80 border border-emerald-400'
                      : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Sidebar Navigation (Hidden on Mobile) */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-stone-950/90 border-r border-stone-800 p-4 justify-between shrink-0 overflow-y-auto">
          <div>
            {/* Vendor Profile Switcher Header */}
            <div className="pb-4 border-b border-stone-800 mb-4 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-heading font-black text-sm text-white block truncate">
                    {activeVendor ? activeVendor.businessName : 'Vendor Dashboard'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    {activeVendor?.verificationStatus === 'verified'
                      ? 'Verified Local Business'
                      : activeVendor?.verificationStatus === 'pending'
                      ? 'Pending Verification'
                      : 'Unverified'}
                  </span>
                </div>
              </div>

              {/* Search filter for listings */}
              {vendorListings.length > 2 && (
                <div className="relative mt-2">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Search ${vendorListings.length} vendors...`}
                    value={searchListingQuery}
                    onChange={(e) => setSearchListingQuery(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Listing Dropdown Selector */}
              {filteredListings.length > 0 ? (
                <select
                  value={activeVendor?.id}
                  onChange={(e) => {
                    const sel = vendorListings.find((l) => l.id === e.target.value);
                    if (sel) {
                      setActiveVendor(sel);
                      setRealTimeStatus(sel.realTimeStatus);
                      if (sel.diyHarvestStatus) setDiyHarvestStatus(sel.diyHarvestStatus);
                      setParkingStatus(sel.parkingStatus);
                      if (sel.roomAvailabilityStatus) setRoomAvailabilityStatus(sel.roomAvailabilityStatus);
                      else setRoomAvailabilityStatus('rooms_available');
                      setVouchers(firebaseService.getVendorVouchers(sel.id));
                      setEvents(firebaseService.getVendorEvents(sel.id));
                      setStaffList(firebaseService.getVendorStaff(sel.id));
                    }
                  }}
                  className="w-full mt-2 px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-xs text-stone-200"
                >
                  {filteredListings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.businessName} ({listing.township})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[10px] text-stone-500 italic mt-1">No matching listings found.</p>
              )}
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1">
              {[
                { id: 'directory', label: 'Business Profile & Sector', icon: Store },
                { id: 'promotions', label: 'Deals & Marketing', icon: Ticket },
                { id: 'analytics', label: 'Customer Analytics', icon: BarChart3 },
                { id: 'billing', label: 'Team & Billing', icon: Settings },
                { id: 'reservations', label: 'Orders & Reservations', icon: Calendar },
                { id: 'overview', label: 'Overview & Performance', icon: LayoutDashboard },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Active Tier Banner */}
          <div className="pt-4 border-t border-stone-800 space-y-2 mt-4">
            <div className="p-3 rounded-2xl bg-stone-900/90 border border-stone-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-400 uppercase font-mono">Active Tier</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  {activeVendor?.tier.replace('_', ' ') || 'PRO TIER'}
                </span>
              </div>
              <p className="font-bold text-white text-xs">
                {activeVendor?.tier === 'free_trial'
                  ? 'Free Trial Package'
                  : activeVendor?.tier === 'annual_pro'
                  ? 'Annual Pro (2 Months Free)'
                  : activeVendor?.tier === 'monthly_pro'
                  ? 'Pro Monthly Package'
                  : 'Pay-Per-Feature Package'}
              </p>
              <p className="text-[10px] text-stone-400">Renews {activeVendor?.tierExpiresAt || '2027-12-31'}</p>
            </div>

            <button
              onClick={() => setShowAddListingModal(true)}
              className="w-full py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 hover:text-white hover:bg-emerald-900 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Listing</span>
            </button>

            {/* Exit to Website and Sign Out Controls */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onClose}
                className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-500/30"
                title="Return to main CamGo website while remaining signed in as Vendor"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>View Website</span>
              </button>

              <button
                onClick={handleSignOut}
                className="py-2.5 px-3 rounded-xl bg-rose-950/50 hover:bg-rose-900 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Sign out of account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Super Admin Access Banner */}
          {isUserAdmin && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/80 via-stone-900 to-amber-950/80 border border-red-500/40 text-xs shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-white text-sm">
                      Super Admin Mode Active
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-red-500/30 text-red-200 font-bold uppercase shrink-0 border border-red-500/40">
                      Full Privileges
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300">
                    Signed in as <strong className="text-emerald-300 font-mono">ayahsyirah77@gmail.com</strong> • Full bypass to view, edit, modify, verify SSM, and manage all <strong>{vendorListings.length}</strong> Cameron Highlands vendors.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowAddListingModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Listing</span>
                </button>
                {onOpenAdmin && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAdmin();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Admin Control Room</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Top Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white font-heading">
                {activeTab === 'overview' && 'Listing Performance & Real-Time Actions'}
                {activeTab === 'directory' && 'Vendor Directory Profile & Operational Flags'}
                {activeTab === 'motorbikes' && activeSector.moduleTitle}
                {activeTab === 'promotions' && 'Promotional Deals & Event Publisher'}
                {activeTab === 'analytics' && 'Customer Intelligence & Visitor Traffic'}
                {activeTab === 'billing' && 'Team Access & Subscription Management'}
                {activeTab === 'reservations' && 'Incoming Customer Orders & Booking Requests'}
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">
                {activeVendor?.businessName} · {activeVendor?.township}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'directory' && (
                <button
                  onClick={handleSaveActiveVendor}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              )}

              {activeVendor && (
                <a
                  href={`https://wa.me/${activeVendor.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">WhatsApp Lead</span>
                </a>
              )}

              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
                title="Exit to CamGo website"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & QUICK ACTIONS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Profile Health Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-stone-900 to-stone-900 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                    Profile Health Score: {activeVendor?.profileHealthScore || 88}% Complete
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    High Conversion Rank
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-stone-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                    style={{ width: `${activeVendor?.profileHealthScore || 88}%` }}
                  />
                </div>
                <p className="text-xs text-stone-300">
                  💡 <strong>Tip:</strong> Keep business contact info, deals, and offerings updated for maximum traveler conversion.
                </p>
              </div>

              {/* Performance Metrics Grid (Live Vendor Data) */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Listing Performance Snapshot
                  </h3>
                </div>

                <div className="grid sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-1">
                    <span className="text-[11px] text-stone-400 flex items-center justify-between">
                      <span>Published Offerings</span>
                      <Package className="w-4 h-4 text-cyan-400" />
                    </span>
                    <p className="text-2xl font-black text-white font-mono">
                      {(activeVendor?.motorbikePackages || []).length || 1}
                    </p>
                    <p className="text-[10px] text-cyan-400">Live catalog items</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-1">
                    <span className="text-[11px] text-stone-400 flex items-center justify-between">
                      <span>Active Deals &amp; Vouchers</span>
                      <Ticket className="w-4 h-4 text-emerald-400" />
                    </span>
                    <p className="text-2xl font-black text-white font-mono">{vouchers.length}</p>
                    <p className="text-[10px] text-emerald-400">Live active promotions</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-1">
                    <span className="text-[11px] text-stone-400 flex items-center justify-between">
                      <span>Events &amp; News Published</span>
                      <Calendar className="w-4 h-4 text-amber-400" />
                    </span>
                    <p className="text-2xl font-black text-white font-mono">{events.length}</p>
                    <p className="text-[10px] text-amber-400">Published announcements</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-1">
                    <span className="text-[11px] text-stone-400 flex items-center justify-between">
                      <span>Team &amp; Staff Access</span>
                      <Users className="w-4 h-4 text-purple-400" />
                    </span>
                    <p className="text-2xl font-black text-white font-mono">{staffList.length}</p>
                    <p className="text-[10px] text-purple-400">Active team members</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECTORY LISTING MANAGEMENT (FULL EDITING SUITE) */}
          {activeTab === 'directory' && (
            activeVendor ? (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-400" />
                    <span>Business Profile &amp; Operational Controls</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveActiveVendor}
                      disabled={isSaving}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save All Changes</span>
                    </button>
                    {isUserAdmin && (
                      <button
                        onClick={handleDeleteListing}
                        className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="Delete this listing"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Listing</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* SSM Verification Badge Controller */}
                <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Official Verification Status</span>
                      {isUserAdmin && <span className="text-[10px] text-red-400 font-mono font-bold">(Super Admin Override)</span>}
                    </label>
                    <span className="text-[10px] font-mono text-stone-400">
                      Current: <strong className="text-emerald-400 uppercase">{activeVendor.verificationStatus}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['verified', 'pending', 'rejected', 'unverified'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...activeVendor,
                            verificationStatus: st as VendorVerificationStatus,
                            profileHealthScore: st === 'verified' ? 100 : activeVendor.profileHealthScore,
                          };
                          setActiveVendor(updated);
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer text-center ${
                          activeVendor.verificationStatus === st
                            ? st === 'verified'
                              ? 'bg-emerald-600 text-white shadow-lg border border-emerald-400'
                              : st === 'pending'
                              ? 'bg-amber-600 text-white shadow-lg border border-amber-400'
                              : st === 'rejected'
                              ? 'bg-rose-600 text-white shadow-lg border border-rose-400'
                              : 'bg-stone-700 text-white shadow-lg border border-stone-500'
                            : 'bg-stone-950 text-stone-400 border border-stone-800 hover:text-white'
                        }`}
                      >
                        {st === 'verified' ? '✓ Verified Partner' : st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Fields Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={activeVendor.businessName}
                      onChange={(e) => setActiveVendor({ ...activeVendor, businessName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">SSM Registration No.</label>
                    <input
                      type="text"
                      value={activeVendor.ssmNumber || ''}
                      onChange={(e) => setActiveVendor({ ...activeVendor, ssmNumber: e.target.value })}
                      placeholder="e.g. 202101034455-A"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Township Location</label>
                    <select
                      value={activeVendor.township}
                      onChange={(e) => setActiveVendor({ ...activeVendor, township: e.target.value as Township })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Tanah Rata">Tanah Rata</option>
                      <option value="Brinchang">Brinchang</option>
                      <option value="Kea Farm">Kea Farm</option>
                      <option value="Ringlet">Ringlet</option>
                      <option value="Kampung Raja">Kampung Raja</option>
                      <option value="Tringkap">Tringkap</option>
                      <option value="Kuala Terla">Kuala Terla</option>
                      <option value="Bertam Valley">Bertam Valley</option>
                      <option value="Blue Valley">Blue Valley</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Business Logo URL</label>
                    <input
                      type="text"
                      value={activeVendor.logoUrl || ''}
                      onChange={(e) => setActiveVendor({ ...activeVendor, logoUrl: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-2" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Business Sector &amp; Category Nature (Comprehensive Taxonomy)
                    </label>
                    <select
                      value={activeVendor.subCategory || 'fb_restaurants_cafes'}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        const selectedSub = e.target.value;
                        const sector = findBusinessSector(selectedSub);
                        let mainCat: MainCategory = 'services_utilities';
                        if (sector.id === 'food_beverage') mainCat = 'food';
                        else if (sector.id === 'retail_products') mainCat = 'shopping';
                        else if (sector.id === 'real_estate_accommodation') mainCat = 'accommodation';
                        else if (sector.id === 'vehicle_equipment_rental') mainCat = 'transport';
                        else if (sector.id === 'professional_services') mainCat = 'services_utilities';
                        else if (sector.id === 'tourism_leisure_events') mainCat = 'travel_tourism';
                        setActiveVendor({ ...activeVendor, category: mainCat, subCategory: selectedSub as any });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                    >
                      {BUSINESS_TAXONOMY.map((sector) => (
                        <optgroup key={sector.id} label={sector.name}>
                          {sector.categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <div className="mt-3.5 p-3 rounded-2xl bg-stone-900 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${activeSector.badgeColor}`}>
                          Sector: {activeSector.name}
                        </span>
                        <span className="text-[11px] text-stone-300 font-medium">
                          {activeCategoryConfig?.label || activeSector.shortName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => triggerSectorModalForVendor(activeSector.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Trigger {activeSector.shortName} Controls &amp; Live Modal</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Phone Contact</label>
                    <input
                      type="text"
                      value={activeVendor.contactPhone}
                      onChange={(e) => setActiveVendor({ ...activeVendor, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Direct WhatsApp Number</label>
                    <input
                      type="text"
                      value={activeVendor.whatsappNumber}
                      onChange={(e) => setActiveVendor({ ...activeVendor, whatsappNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-stone-300 mb-1">Full Street Address</label>
                    <input
                      type="text"
                      value={activeVendor.address}
                      onChange={(e) => setActiveVendor({ ...activeVendor, address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Operating Hours</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={activeVendor.operatingHours?.from || '08:30'}
                        onChange={(e) =>
                          setActiveVendor({
                            ...activeVendor,
                            operatingHours: { ...activeVendor.operatingHours, from: e.target.value },
                          })
                        }
                        className="w-1/2 px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-xs text-white"
                      />
                      <span className="text-xs text-stone-400">to</span>
                      <input
                        type="time"
                        value={activeVendor.operatingHours?.to || '18:00'}
                        onChange={(e) =>
                          setActiveVendor({
                            ...activeVendor,
                            operatingHours: { ...activeVendor.operatingHours, to: e.target.value },
                          })
                        }
                        className="w-1/2 px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-stone-300 mb-1">WhatsApp Lead Auto-Message</label>
                    <input
                      type="text"
                      value={activeVendor.whatsappTemplateMessage || ''}
                      onChange={(e) => setActiveVendor({ ...activeVendor, whatsappTemplateMessage: e.target.value })}
                      placeholder="Hello! I found your listing on CamGo. Inquiring about..."
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-medium text-stone-300 mb-1">Business Description</label>
                    <textarea
                      rows={3}
                      value={activeVendor.description}
                      onChange={(e) => setActiveVendor({ ...activeVendor, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-stone-300 mb-1">Cover Image URL</label>
                    <input
                      type="text"
                      value={activeVendor.coverImage}
                      onChange={(e) => setActiveVendor({ ...activeVendor, coverImage: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Menu PDF / Rate Catalog URL</label>
                    <input
                      type="text"
                      value={activeVendor.menuPdfOrUrl || ''}
                      onChange={(e) => setActiveVendor({ ...activeVendor, menuPdfOrUrl: e.target.value })}
                      placeholder="https://mysite.com/menu.pdf"
                      className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Cover Image & Gallery Preview with Local Storage Upload */}
                <div className="space-y-3 pt-2 border-t border-stone-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-xs font-medium text-stone-300">Photo Gallery & Local Storage Upload</label>
                    <label className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photos from Folder / Computer</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleLocalImageUpload}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeVendor.galleryImages.map((img, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-stone-800 aspect-video bg-stone-900">
                        <img src={img} alt="Gallery" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                          {idx === 0 ? 'Cover Photo' : `Photo ${idx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verified Dietary & Halal Certifications (Available for Food & Beverage vendors only) */}
                {isFnBVendor && (
                  <div className="space-y-3 pt-3 border-t border-stone-800">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <label className="block text-xs font-bold text-white flex items-center gap-2">
                          <Award className="w-4 h-4 text-emerald-400" />
                          <span>Verified Dietary &amp; Halal Certifications</span>
                        </label>
                        <p className="text-[11px] text-stone-400">
                          Highlight official Halal, Muslim-Owned, or Vegetarian certifications for your business.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newEnabled = !enabledFlags.dietaryTagsEnabled;
                          const updatedFlags = { ...enabledFlags, dietaryTagsEnabled: newEnabled };
                          setEnabledFlags(updatedFlags);
                          if (activeVendor) {
                            setActiveVendor({
                              ...activeVendor,
                              dietaryTagsEnabled: newEnabled,
                              enabledFlags: updatedFlags,
                              dietaryTags: activeVendor.dietaryTags || [],
                            });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                          enabledFlags.dietaryTagsEnabled
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950'
                            : 'bg-stone-900 text-stone-400 border-stone-700 hover:text-stone-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${enabledFlags.dietaryTagsEnabled ? 'bg-white animate-pulse' : 'bg-stone-500'}`} />
                        <span>{enabledFlags.dietaryTagsEnabled ? 'Feature Active' : 'Enable Certifications'}</span>
                      </button>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl transition-all ${
                        enabledFlags.dietaryTagsEnabled
                          ? 'bg-stone-900 border border-stone-700 opacity-100'
                          : 'opacity-40 grayscale pointer-events-none bg-stone-950/40 border border-stone-800'
                      }`}
                    >
                      {!enabledFlags.dietaryTagsEnabled && (
                        <p className="text-[11px] text-amber-300 font-mono mb-2">
                          ⓘ Dietary certifications section is disabled by default. Click "Enable Certifications" above to activate.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'halal_certified', label: '100% Halal Certified' },
                          { id: 'muslim_owned', label: 'Muslim-Owned' },
                          { id: 'pork_free', label: 'Pork-Free / Alcohol-Free' },
                          { id: 'vegetarian_friendly', label: 'Vegetarian-Friendly' },
                        ].map((tag) => {
                          const isSelected = (activeVendor.dietaryTags || []).includes(tag.id as DietaryTag);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              disabled={!enabledFlags.dietaryTagsEnabled}
                              onClick={() => {
                                const currentTags = activeVendor.dietaryTags || [];
                                const newTags = isSelected
                                  ? currentTags.filter((t) => t !== tag.id)
                                  : [...currentTags, tag.id as DietaryTag];
                                setActiveVendor({ ...activeVendor, dietaryTags: newTags });
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border border-emerald-400'
                                  : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-white'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '}{tag.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button Action */}
                <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">
                    Changes take effect across the live CamGo interactive maps, directories, and search immediately.
                  </span>
                  <button
                    onClick={handleSaveActiveVendor}
                    disabled={isSaving}
                    className="py-2.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs shadow-xl shadow-emerald-950/60 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save All Changes</span>
                  </button>
                </div>
              </div>

              {/* COMPREHENSIVE BUSINESS SECTOR CATALOG & RESERVATION MANAGEMENT */}
              <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <SectorIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{activeSector.moduleTitle}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${activeSector.badgeColor}`}>
                          {activeSector.shortName}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400">
                        {activeSector.moduleSubtitle} for {activeVendor.businessName}.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingBike(null);
                      setBikeName('');
                      setBikeCc(activeCategoryConfig?.defaultSpecPlaceholder?.split('/')[0]?.trim() || 'Standard');
                      setBikePrice('80');
                      setBikeImage(activeCategoryConfig?.defaultImage || '');
                      setBikeHelmets('2');
                      setBikePkgDetails(activeCategoryConfig?.defaultFeaturesPlaceholder || '');
                      setBikeAddonDetails(activeCategoryConfig?.defaultAddonPlaceholder || '');
                      setShowBikeForm(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{activeSector.addItemLabel}</span>
                  </button>
                </div>

                {/* Dynamic Form to Add / Edit Offerings Item */}
                {showBikeForm && (
                  <div className="p-4 rounded-2xl bg-stone-900 border border-emerald-500/40 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                        <SectorIcon className="w-4 h-4" />
                        {editingBike
                          ? `Edit ${activeSector.itemNoun} Details`
                          : `Add New ${activeSector.itemNoun} (${activeCategoryConfig?.label || activeSector.name})`}
                      </span>
                      <button
                        onClick={() => setShowBikeForm(false)}
                        className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-stone-300 mb-1">
                          {activeSector.itemNoun} Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={bikeName}
                          onChange={(e) => setBikeName(e.target.value)}
                          placeholder={activeCategoryConfig?.sampleItemName || `e.g. Premium ${activeSector.itemNoun}`}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-300 mb-1">
                          {activeCategoryConfig?.specLabel || 'Specification / Capacity'} *
                        </label>
                        <input
                          type="text"
                          required
                          value={bikeCc}
                          onChange={(e) => setBikeCc(e.target.value)}
                          placeholder={activeCategoryConfig?.defaultSpecPlaceholder || 'e.g. Standard Spec'}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-300 mb-1">
                          {activeCategoryConfig?.rateLabel || 'Price (RM)'} *
                        </label>
                        <input
                          type="number"
                          required
                          value={bikePrice}
                          onChange={(e) => setBikePrice(e.target.value)}
                          placeholder="80"
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-stone-300 mb-1">
                          {activeCategoryConfig?.featuresLabel || 'Features, Inclusions & Specifications'}
                        </label>
                        <input
                          type="text"
                          value={bikePkgDetails}
                          onChange={(e) => setBikePkgDetails(e.target.value)}
                          placeholder={activeCategoryConfig?.defaultFeaturesPlaceholder || 'e.g. Inclusions & highlights'}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-300 mb-1">
                          Add-on Options / Extras / Customizations
                        </label>
                        <input
                          type="text"
                          value={bikeAddonDetails}
                          onChange={(e) => setBikeAddonDetails(e.target.value)}
                          placeholder={activeCategoryConfig?.defaultAddonPlaceholder || 'e.g. Optional upgrades & extras'}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-stone-300 mb-1">Photo / Showcase Image URL</label>
                        <input
                          type="text"
                          value={bikeImage}
                          onChange={(e) => setBikeImage(e.target.value)}
                          placeholder={activeCategoryConfig?.defaultImage || 'https://...'}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-300 mb-1">
                          Units / Inclusions (e.g. Pax / Sets / Capacity)
                        </label>
                        <select
                          value={bikeHelmets}
                          onChange={(e) => setBikeHelmets(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                        >
                          <option value="1">1 Unit / 1 Pax / Solo</option>
                          <option value="2">2 Units / 2 Pax / Duo</option>
                          <option value="3">3 Units / Family Set</option>
                          <option value="4">4+ Units / Group Package</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setShowBikeForm(false)}
                        className="px-4 py-2 rounded-xl bg-stone-800 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBikePackage}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow cursor-pointer transition-colors"
                      >
                        {editingBike ? `Update ${activeSector.itemNoun}` : `Save to ${activeSector.shortName}`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Items List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <SectorIcon className="w-3.5 h-3.5" />
                      <span>
                        Active {activeSector.itemNoun} Catalog ({(activeVendor.motorbikePackages || []).length})
                      </span>
                    </h4>
                    <span className="text-[10px] text-stone-400">
                      Unit: {activeCategoryConfig?.unitLabel || 'Per Unit'}
                    </span>
                  </div>

                  {(!activeVendor.motorbikePackages || activeVendor.motorbikePackages.length === 0) ? (
                    <div className="p-6 rounded-2xl bg-stone-900 border border-dashed border-stone-800 text-stone-400 text-xs text-center space-y-2">
                      <p>No {activeSector.itemNoun.toLowerCase()} items added yet for this business.</p>
                      <button
                        onClick={() => {
                          setEditingBike(null);
                          setBikeName(activeCategoryConfig?.sampleItemName || '');
                          setBikeCc(activeCategoryConfig?.defaultSpecPlaceholder?.split('/')[0]?.trim() || 'Standard');
                          setBikePrice('80');
                          setBikeImage(activeCategoryConfig?.defaultImage || '');
                          setBikeHelmets('2');
                          setBikePkgDetails(activeCategoryConfig?.defaultFeaturesPlaceholder || '');
                          setBikeAddonDetails(activeCategoryConfig?.defaultAddonPlaceholder || '');
                          setShowBikeForm(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-600/50 cursor-pointer"
                      >
                        + Pre-fill {activeSector.addItemLabel}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeVendor.motorbikePackages.map((pkg) => (
                        <div key={pkg.id} className="p-3.5 rounded-xl bg-stone-900 border border-white/10 flex flex-col justify-between space-y-2">
                          <div className="flex items-start gap-3">
                            <img
                              src={pkg.imageUrl || activeCategoryConfig?.defaultImage}
                              alt={pkg.name}
                              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-stone-800"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-white truncate">{pkg.name}</div>
                              <div className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                                RM {pkg.dailyRateRm} <span className="text-[9px] text-stone-400 font-sans font-normal">/ {activeCategoryConfig?.unitLabel || 'unit'}</span>
                              </div>
                              <div className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-stone-800 text-stone-300 border border-stone-700">
                                {pkg.cc}
                              </div>
                              {pkg.packageDetails && (
                                <div className="text-[10px] text-stone-400 line-clamp-1 mt-1">
                                  {pkg.packageDetails}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 border-t border-white/5 pt-2">
                            <button
                              onClick={() => {
                                setEditingBike(pkg.id);
                                setBikeName(pkg.name);
                                setBikeCc(pkg.cc);
                                setBikePrice(String(pkg.dailyRateRm));
                                setBikeImage(pkg.imageUrl);
                                setBikeHelmets(String(pkg.helmetsIncluded));
                                setBikePkgDetails(pkg.packageDetails || '');
                                setBikeAddonDetails(pkg.addonDetails || '');
                                setShowBikeForm(true);
                              }}
                              className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-bold cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                const updatedPackages = (activeVendor.motorbikePackages || []).filter((p) => p.id !== pkg.id);
                                const updatedVendor = { ...activeVendor, motorbikePackages: updatedPackages };
                                setActiveVendor(updatedVendor);
                                await firebaseService.saveVendorListing(updatedVendor);
                                setSaveNotification(`Removed ${pkg.name}!`);
                                setTimeout(() => setSaveNotification(null), 3000);
                              }}
                              className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-[10px] font-bold cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live Reservations & Order Inquiries Table */}
                <div className="space-y-3 pt-3 border-t border-stone-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-teal-400" />
                      <span>Incoming {activeSector.shortName} Orders &amp; Reservations for {activeVendor.businessName}</span>
                    </h4>
                    <button
                      onClick={() => setMotorbikeBookings(firebaseService.getMotorbikeBookings())}
                      className="text-[10px] font-bold text-stone-400 hover:text-white cursor-pointer"
                    >
                      Refresh
                    </button>
                  </div>

                  {motorbikeBookings.filter((bk) => bk.partnerId === activeVendor.id || bk.partnerName.toLowerCase().includes(activeVendor.businessName.toLowerCase())).length === 0 ? (
                    <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 text-stone-500 text-xs text-center">
                      No active bookings or orders recorded for this business listing yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-stone-300 border-collapse">
                        <thead>
                          <tr className="border-b border-stone-800 text-stone-400 text-[10px] font-mono">
                            <th className="py-2 px-3">Customer</th>
                            <th className="py-2 px-3">{activeSector.itemNoun}</th>
                            <th className="py-2 px-3">Location</th>
                            <th className="py-2 px-3">Dates / Timeline</th>
                            <th className="py-2 px-3">Total</th>
                            <th className="py-2 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/60">
                          {motorbikeBookings
                            .filter((bk) => bk.partnerId === activeVendor.id || bk.partnerName.toLowerCase().includes(activeVendor.businessName.toLowerCase()))
                            .map((bk) => (
                              <tr key={bk.id}>
                                <td className="py-2 px-3">
                                  <div className="font-bold text-white">{bk.renterName}</div>
                                  <div className="text-[10px] text-stone-400">{bk.renterPhone}</div>
                                </td>
                                <td className="py-2 px-3 font-semibold text-emerald-300">{bk.packageName}</td>
                                <td className="py-2 px-3 font-mono">{bk.pickupTownship}</td>
                                <td className="py-2 px-3 text-[10px]">{bk.startDate} to {bk.endDate}</td>
                                <td className="py-2 px-3 font-mono font-bold text-emerald-400">RM {bk.totalRm}</td>
                                <td className="py-2 px-3 text-right space-x-1">
                                  <a
                                    href={`https://wa.me/${bk.renterPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                      `Salam ${bk.renterName}! This is ${bk.partnerName}. Your booking #${bk.id} for ${bk.packageName} is CONFIRMED!`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] inline-flex items-center gap-1 shadow"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    <span>Confirm</span>
                                  </a>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-5 bg-stone-900/40 rounded-3xl border border-stone-800">
                <div className="w-20 h-20 rounded-full bg-stone-800 flex items-center justify-center text-stone-600">
                  <Store className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white font-heading">No Business Selected</h3>
                  <p className="text-stone-400 max-w-sm mx-auto text-sm">
                    {isUserAdmin 
                      ? "As an administrator, you can manage all listings. Please select a business from the sidebar to view its directory profile."
                      : "You don't have any businesses associated with your account yet. Create your first listing to get started."}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowAddListingModal(true)}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Listing</span>
                  </button>
                  {isUserAdmin && onOpenAdmin && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAdmin();
                      }}
                      className="px-6 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs border border-stone-700 flex items-center gap-2 transition-all"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Admin Control Room</span>
                    </button>
                  )}
                </div>
              </div>
            )
          )}

          {/* TAB 3: PROMOTIONS & MARKETING SUITE */}
          {activeTab === 'promotions' && (
            <div className="space-y-6">
              {/* Voucher Management */}
              <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-emerald-400" />
                    Deal &amp; Digital Coupon Creator
                  </h3>
                  <button
                    onClick={() => setShowVoucherModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Voucher</span>
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {vouchers.map((v) => (
                    <div key={v.id} className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {v.code}
                        </span>
                        <span className="text-[10px] text-stone-400">Claimed {v.claimedCount} times</span>
                      </div>
                      <h4 className="font-bold text-xs text-white">{v.title}</h4>
                      <p className="text-[11px] text-stone-400">{v.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-800">
                        <span>Expires {v.validUntil}</span>
                        <button
                          onClick={async () => {
                            const updated = await firebaseService.deleteVendorVoucher(v.id);
                            setVouchers(updated.filter((item) => item.vendorId === activeVendor?.id));
                          }}
                          className="text-rose-400 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {vouchers.length === 0 && (
                    <div className="col-span-2 p-6 rounded-2xl bg-stone-900/50 border border-dashed border-stone-800 text-center text-xs text-stone-400">
                      No active vouchers for this listing yet. Create one to drive off-peak foot traffic!
                    </div>
                  )}
                </div>
              </div>

              {/* Highland Events Publisher */}
              <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Highland Festival &amp; Workshop Publisher
                  </h3>
                  <button
                    onClick={() => setShowEventModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Publish Event</span>
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {events.map((e) => (
                    <div key={e.id} className="p-4 rounded-2xl bg-stone-900 border border-stone-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-emerald-400 font-mono">
                        <span>{e.date} ({e.time})</span>
                        <span>RM {e.ticketPriceRm || 0}</span>
                      </div>
                      <h4 className="font-bold text-xs text-white">{e.title}</h4>
                      <p className="text-[11px] text-stone-400">{e.description}</p>
                    </div>
                  ))}
                  {events.length === 0 && (
                    <div className="col-span-2 p-6 rounded-2xl bg-stone-900/50 border border-dashed border-stone-800 text-center text-xs text-stone-400">
                      No upcoming events published yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOMER ANALYTICS & INSIGHTS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Tourist Traffic Breakdown &amp; Peak Hours
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Traffic Sources */}
                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-3">
                    <span className="text-xs font-bold text-stone-300 block">Traffic Source Channels</span>
                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Interactive Map Search</span>
                          <span className="font-mono">{analytics.trafficSources.mapSearch}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analytics.trafficSources.mapSearch}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Township Directory</span>
                          <span className="font-mono">{analytics.trafficSources.directory}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${analytics.trafficSources.directory}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-stone-300 mb-1">
                          <span>Microclimate Alerts</span>
                          <span className="font-mono">{analytics.trafficSources.microclimate}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${analytics.trafficSources.microclimate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Demographic Preferences */}
                  <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-3">
                    <span className="text-xs font-bold text-stone-300 block">Visitor Language Preferences</span>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-stone-300 mb-1">
                          <span>Bahasa Malaysia (BM)</span>
                          <span className="font-mono font-bold text-emerald-400">{analytics.demographics.bmPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analytics.demographics.bmPercent}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-stone-300 mb-1">
                          <span>English (EN)</span>
                          <span className="font-mono font-bold text-teal-400">{analytics.demographics.enPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${analytics.demographics.enPercent}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Peak Visitor Hours Bar Chart */}
                <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-3">
                  <span className="text-xs font-bold text-stone-300 block">Peak Visitor Viewing Hours</span>
                  <div className="flex items-end gap-2 h-32 pt-4">
                    {analytics.peakVisitorHours.map((ph, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="w-full bg-stone-800 rounded-t h-full flex items-end">
                          <div
                            className="w-full bg-emerald-500 group-hover:bg-emerald-400 transition-all rounded-t"
                            style={{ height: `${(ph.count / 300) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-stone-400">{ph.hour}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TEAM ACCESS & BILLING */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Team Members */}
              <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Team &amp; Staff Access Permissions
                  </h3>
                  <button
                    onClick={() => setShowStaffModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Invite Staff Member</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {staffList.map((st) => (
                    <div key={st.id} className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white block">{st.name}</span>
                        <span className="text-[10px] text-stone-400">{st.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {st.role}
                        </span>
                        <button
                          onClick={async () => {
                            if (activeVendor) {
                              const updated = await firebaseService.deleteVendorStaff(st.id, activeVendor.id);
                              setStaffList(updated);
                            }
                          }}
                          className="text-rose-400 hover:underline text-[11px] cursor-pointer"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                  {staffList.length === 0 && (
                    <div className="p-6 rounded-2xl bg-stone-900/50 border border-dashed border-stone-800 text-center text-xs text-stone-400">
                      No additional staff invited yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Invoices & Subscription Management */}
              <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Invoices &amp; Tax Receipts
                  </h3>
                  <button
                    onClick={() => setShowInvoiceModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Tax Invoice (PDF)</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">INV-CAMGO-2025-0892</span>
                    <span className="text-[10px] text-stone-400">Pro Annual Package (RM 468.00 / yr) · Paid via FPX Online Banking</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Paid
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DEDICATED SECTOR CATALOG & OFFERINGS */}
          {(activeTab === 'directory' || activeTab === 'motorbikes') && (
            <div className="space-y-6">
              {activeVendor ? (
                <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <SectorIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-white">{activeSector.moduleTitle}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${activeSector.badgeColor}`}>
                            {activeSector.shortName}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400">
                          {activeSector.moduleSubtitle} for {activeVendor.businessName}.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingBike(null);
                        setBikeName('');
                        setBikeCc(activeCategoryConfig?.defaultSpecPlaceholder?.split('/')[0]?.trim() || 'Standard');
                        setBikePrice('80');
                        setBikeImage(activeCategoryConfig?.defaultImage || '');
                        setBikeHelmets('2');
                        setBikePkgDetails(activeCategoryConfig?.defaultFeaturesPlaceholder || '');
                        setBikeAddonDetails(activeCategoryConfig?.defaultAddonPlaceholder || '');
                        setShowBikeForm(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{activeSector.addItemLabel}</span>
                    </button>
                  </div>

                  {/* Dynamic Form to Add / Edit Offerings Item */}
                  {showBikeForm && (
                    <div className="p-4 rounded-2xl bg-stone-900 border border-emerald-500/40 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                          <SectorIcon className="w-4 h-4" />
                          {editingBike
                            ? `Edit ${activeSector.itemNoun} Details`
                            : `Add New ${activeSector.itemNoun} (${activeCategoryConfig?.label || activeSector.name})`}
                        </span>
                        <button
                          onClick={() => setShowBikeForm(false)}
                          className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-stone-300 mb-1">
                            {activeSector.itemNoun} Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={bikeName}
                            onChange={(e) => setBikeName(e.target.value)}
                            placeholder={activeCategoryConfig?.sampleItemName || `e.g. Premium ${activeSector.itemNoun}`}
                            className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-300 mb-1">
                            {activeCategoryConfig?.specLabel || 'Specification / Capacity'} *
                          </label>
                          <input
                            type="text"
                            required
                            value={bikeCc}
                            onChange={(e) => setBikeCc(e.target.value)}
                            placeholder={activeCategoryConfig?.defaultSpecPlaceholder || 'e.g. Standard Spec'}
                            className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-300 mb-1">
                            {activeCategoryConfig?.rateLabel || 'Price (RM)'} *
                          </label>
                          <input
                            type="number"
                            required
                            value={bikePrice}
                            onChange={(e) => setBikePrice(e.target.value)}
                            placeholder="80"
                            className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-stone-300 mb-1">
                            {activeCategoryConfig?.featuresLabel || 'Features, Inclusions & Specifications'}
                          </label>
                          <input
                            type="text"
                            value={bikePkgDetails}
                            onChange={(e) => setBikePkgDetails(e.target.value)}
                            placeholder={activeCategoryConfig?.defaultFeaturesPlaceholder || 'e.g. Inclusions & highlights'}
                            className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-300 mb-1">
                            Add-on Options / Extras / Customizations
                          </label>
                          <input
                            type="text"
                            value={bikeAddonDetails}
                            onChange={(e) => setBikeAddonDetails(e.target.value)}
                            placeholder={activeCategoryConfig?.defaultAddonPlaceholder || 'e.g. Optional upgrades & extras'}
                            className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-stone-300 mb-1">Photo / Showcase Image URL</label>
                          <input
                            type="text"
                            value={bikeImage}
                            onChange={(e) => setBikeImage(e.target.value)}
                            placeholder={activeCategoryConfig?.defaultImage || 'https://...'}
                            className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-300 mb-1">
                            Units / Inclusions (e.g. Pax / Sets / Capacity)
                          </label>
                          <select
                            value={bikeHelmets}
                            onChange={(e) => setBikeHelmets(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                          >
                            <option value="1">1 Unit / 1 Pax / Solo</option>
                            <option value="2">2 Units / 2 Pax / Duo</option>
                            <option value="3">3 Units / Family Set</option>
                            <option value="4">4+ Units / Group Package</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setShowBikeForm(false)}
                          className="px-4 py-2 rounded-xl bg-stone-800 text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveBikePackage}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow cursor-pointer transition-colors"
                        >
                          {editingBike ? `Update ${activeSector.itemNoun}` : `Save to ${activeSector.shortName}`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Items List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <SectorIcon className="w-3.5 h-3.5" />
                        <span>
                          Active {activeSector.itemNoun} Catalog ({(activeVendor.motorbikePackages || []).length})
                        </span>
                      </h4>
                      <span className="text-[10px] text-stone-400">
                        Unit: {activeCategoryConfig?.unitLabel || 'Per Unit'}
                      </span>
                    </div>

                    {(!activeVendor.motorbikePackages || activeVendor.motorbikePackages.length === 0) ? (
                      <div className="p-6 rounded-2xl bg-stone-900 border border-dashed border-stone-800 text-stone-400 text-xs text-center space-y-2">
                        <p>No {activeSector.itemNoun.toLowerCase()} items added yet for this business.</p>
                        <button
                          onClick={() => {
                            setEditingBike(null);
                            setBikeName(activeCategoryConfig?.sampleItemName || '');
                            setBikeCc(activeCategoryConfig?.defaultSpecPlaceholder?.split('/')[0]?.trim() || 'Standard');
                            setBikePrice('80');
                            setBikeImage(activeCategoryConfig?.defaultImage || '');
                            setBikeHelmets('2');
                            setBikePkgDetails(activeCategoryConfig?.defaultFeaturesPlaceholder || '');
                            setBikeAddonDetails(activeCategoryConfig?.defaultAddonPlaceholder || '');
                            setShowBikeForm(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-600/50 cursor-pointer"
                        >
                          + Pre-fill {activeSector.addItemLabel}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activeVendor.motorbikePackages.map((pkg) => (
                          <div key={pkg.id} className="p-3.5 rounded-xl bg-stone-900 border border-white/10 flex flex-col justify-between space-y-2">
                            <div className="flex items-start gap-3">
                              <img
                                src={pkg.imageUrl || activeCategoryConfig?.defaultImage}
                                alt={pkg.name}
                                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-stone-800"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-white truncate">{pkg.name}</div>
                                <div className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                                  RM {pkg.dailyRateRm} <span className="text-[9px] text-stone-400 font-sans font-normal">/ {activeCategoryConfig?.unitLabel || 'unit'}</span>
                                </div>
                                <div className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-stone-800 text-stone-300 border border-stone-700">
                                  {pkg.cc}
                                </div>
                                {pkg.packageDetails && (
                                  <div className="text-[10px] text-stone-400 line-clamp-1 mt-1">
                                    {pkg.packageDetails}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-white/5 pt-2">
                              <button
                                onClick={() => {
                                  setEditingBike(pkg.id);
                                  setBikeName(pkg.name);
                                  setBikeCc(pkg.cc);
                                  setBikePrice(String(pkg.dailyRateRm));
                                  setBikeImage(pkg.imageUrl);
                                  setBikeHelmets(String(pkg.helmetsIncluded));
                                  setBikePkgDetails(pkg.packageDetails || '');
                                  setBikeAddonDetails(pkg.addonDetails || '');
                                  setShowBikeForm(true);
                                }}
                                className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-[10px] font-bold cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={async () => {
                                  const updatedPackages = (activeVendor.motorbikePackages || []).filter((p) => p.id !== pkg.id);
                                  const updatedVendor = { ...activeVendor, motorbikePackages: updatedPackages };
                                  setActiveVendor(updatedVendor);
                                  await firebaseService.saveVendorListing(updatedVendor);
                                  setSaveNotification(`Removed ${pkg.name}!`);
                                  setTimeout(() => setSaveNotification(null), 3000);
                                }}
                                className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-[10px] font-bold cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-stone-900/50 border border-stone-800 text-center text-xs text-stone-400">
                  Please select a business to manage its {activeSector.itemNoun.toLowerCase()} catalog.
                </div>
              )}
            </div>
          )}

          {/* TAB: INCOMING ORDERS & RESERVATIONS */}
          {activeTab === 'reservations' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    Incoming {activeSector.shortName} Customer Orders &amp; Reservations
                  </h3>
                  <button
                    onClick={() => setMotorbikeBookings(firebaseService.getMotorbikeBookings())}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    Refresh Bookings
                  </button>
                </div>
                <div className="space-y-2">
                  {motorbikeBookings
                    .filter((b) => b.partnerId === activeVendor?.id || (activeVendor && b.partnerName.toLowerCase().includes(activeVendor.businessName.toLowerCase())))
                    .map((booking) => (
                      <div key={booking.id} className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white block">{booking.renterName}</span>
                            <span className="text-[10px] text-stone-400 font-mono">({booking.renterPhone})</span>
                          </div>
                          <span className="text-[11px] text-emerald-300 font-medium">
                            {booking.packageName} • {booking.startDate} to {booking.endDate} ({booking.pickupTownship})
                          </span>
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="text-emerald-400 font-mono font-bold block">RM {booking.totalRm}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${booking.status === 'pending' ? 'bg-amber-900/60 text-amber-300 border border-amber-500/30' : 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30'}`}>
                              {booking.status}
                            </span>
                          </div>
                          <a
                            href={`https://wa.me/${booking.renterPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Salam ${booking.renterName}! This is ${booking.partnerName}. Your booking #${booking.id} for ${booking.packageName} is CONFIRMED!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  {motorbikeBookings.filter((b) => b.partnerId === activeVendor?.id || (activeVendor && b.partnerName.toLowerCase().includes(activeVendor.businessName.toLowerCase()))).length === 0 && (
                    <div className="p-8 rounded-2xl bg-stone-900/50 border border-dashed border-stone-800 text-center text-xs text-stone-400">
                      No incoming {activeSector.itemNoun.toLowerCase()} reservations or orders recorded for {activeVendor?.businessName || 'this business'}.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </motion.div>

      {/* ADMIN ADD LISTING MODAL */}
      <AnimatePresence>
        {showAddListingModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-lg bg-stone-900 border border-emerald-500/40 rounded-3xl p-6 text-stone-100 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-base text-white">Add New Business / Attraction</h3>
                </div>
                <button
                  onClick={() => setShowAddListingModal(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-300 mb-1">Business Name *</label>
                  <input
                    type="text"
                    value={newBizName}
                    onChange={(e) => setNewBizName(e.target.value)}
                    placeholder="e.g. Cameron Highlands Honey Bee Farm"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-stone-300 mb-1">Township *</label>
                    <select
                      value={newBizTownship}
                      onChange={(e) => setNewBizTownship(e.target.value as Township)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white"
                    >
                      <option value="Brinchang">Brinchang</option>
                      <option value="Kea Farm">Kea Farm</option>
                      <option value="Tanah Rata">Tanah Rata</option>
                      <option value="Ringlet">Ringlet</option>
                      <option value="Kampung Raja">Kampung Raja</option>
                      <option value="Tringkap">Tringkap</option>
                      <option value="Kuala Terla">Kuala Terla</option>
                      <option value="Bertam Valley">Bertam Valley</option>
                      <option value="Blue Valley">Blue Valley</option>
                    </select>
                  </div>

                </div>

                <div>
                  <label className="block text-stone-300 mb-1 font-semibold">Business Sector &amp; Category Nature *</label>
                  <select
                    value={newBizSubCategory}
                    onChange={(e) => {
                      const selectedSub = e.target.value;
                      setNewBizSubCategory(selectedSub);
                      const sector = findBusinessSector(selectedSub);
                      let mainCat: MainCategory = 'services_utilities';
                      if (sector.id === 'food_beverage') mainCat = 'food';
                      else if (sector.id === 'retail_products') mainCat = 'shopping';
                      else if (sector.id === 'real_estate_accommodation') mainCat = 'accommodation';
                      else if (sector.id === 'vehicle_equipment_rental') mainCat = 'transport';
                      else if (sector.id === 'professional_services') mainCat = 'services_utilities';
                      else if (sector.id === 'tourism_leisure_events') mainCat = 'travel_tourism';
                      setNewBizCategory(mainCat);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {BUSINESS_TAXONOMY.map((sector) => (
                      <optgroup key={sector.id} label={sector.name}>
                        {sector.categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-[10px] text-stone-400 mt-1">
                    Select your specific business type. Forms, catalog items, and booking options dynamically adapt to this choice.
                  </p>
                </div>

                <div>
                  <label className="block text-stone-300 mb-1">Contact Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={newBizPhone}
                    onChange={(e) => setNewBizPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 mb-1">Business Logo URL</label>
                  <input
                    type="text"
                    value={newBizLogo}
                    onChange={(e) => setNewBizLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={newBizAddress}
                    onChange={(e) => setNewBizAddress(e.target.value)}
                    placeholder="e.g. Batu 40, Tanah Rata, Cameron Highlands"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-800">
                <button
                  onClick={() => setShowAddListingModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewVendorListing}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow cursor-pointer hover:bg-emerald-500"
                >
                  Create Listing
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE VOUCHER MODAL */}
      <AnimatePresence>
        {showVoucherModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-stone-900 border border-emerald-500/30 rounded-2xl p-6 text-stone-100 space-y-4">
              <h3 className="font-bold text-base text-white">Create Digital Discount Voucher</h3>
              <div>
                <label className="block text-xs text-stone-300 mb-1">Voucher Title</label>
                <input
                  type="text"
                  value={voucherTitle}
                  onChange={(e) => setVoucherTitle(e.target.value)}
                  placeholder="e.g. 15% Off Weekday Steamboat Meal"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-300 mb-1">Promo Code</label>
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  placeholder="CAMGO15"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white font-mono uppercase"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowVoucherModal(false)}
                  className="flex-1 py-2 rounded-xl bg-stone-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateVoucher}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white cursor-pointer hover:bg-emerald-500"
                >
                  Publish Voucher
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE EVENT MODAL */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-stone-900 border border-emerald-500/30 rounded-2xl p-6 text-stone-100 space-y-4">
              <h3 className="font-bold text-base text-white">Publish Highland Event</h3>
              <div>
                <label className="block text-xs text-stone-300 mb-1">Event Title</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Strawberry Jam Making Workshop"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-stone-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-300 mb-1">Time</label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="10:00 AM - 12:00 PM"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-stone-300 mb-1">Description</label>
                <textarea
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 py-2 rounded-xl bg-stone-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white cursor-pointer hover:bg-emerald-500"
                >
                  Publish to Events Feed
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* INVITE STAFF MODAL */}
      <AnimatePresence>
        {showStaffModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-stone-900 border border-emerald-500/30 rounded-2xl p-6 text-stone-100 space-y-4">
              <h3 className="font-bold text-base text-white">Invite Team Member</h3>
              <div>
                <label className="block text-xs text-stone-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Nurul Huda"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="huda@cameronstrawberries.my"
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-300 mb-1">Role Permission</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white"
                >
                  <option value="receptionist">Receptionist (Can update status &amp; hours)</option>
                  <option value="manager">Manager (Full operational access)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="flex-1 py-2 rounded-xl bg-stone-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStaff}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white cursor-pointer hover:bg-emerald-500"
                >
                  Send Staff Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* TAX INVOICE MODAL */}
      <AnimatePresence>
        {showInvoiceModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-lg bg-white text-stone-900 rounded-3xl p-8 space-y-4 shadow-2xl relative">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5 text-stone-600" />
              </button>

              <div className="border-b pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black font-heading text-emerald-800">CAMGO HIGHLAND MEDIA</h2>
                  <p className="text-xs text-stone-500">Official SST Tax Invoice &amp; Receipt</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded font-mono font-bold text-xs">
                  PAID
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-stone-400 block">Billed To:</span>
                  <span className="font-bold block">{activeVendor?.businessName}</span>
                  <span>{activeVendor?.address}</span>
                  <span className="block font-mono text-stone-500">SSM: {activeVendor?.ssmNumber}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Invoice Details:</span>
                  <span className="font-mono block">INV-2025-0892</span>
                  <span>Date: Oct 25, 2025</span>
                  <span>Payment: FPX Online Banking</span>
                </div>
              </div>

              <table className="w-full text-xs text-left border-t border-b py-2">
                <thead>
                  <tr className="border-b text-stone-500">
                    <th className="py-2">Description</th>
                    <th className="py-2 text-right">Amount (MYR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">CamGo Pro Vendor Subscription (Annual Plan)</td>
                    <td className="py-2 text-right font-mono font-bold">RM 468.00</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-stone-500">SST Service Tax (8%)</td>
                    <td className="py-2 text-right font-mono">RM 37.44</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-between items-center text-sm font-bold pt-2">
                <span>Total Paid:</span>
                <span className="text-emerald-800 font-mono text-lg">RM 505.44</span>
              </div>

              <button
                onClick={() => {
                  window.print();
                }}
                className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Print / Save PDF Tax Receipt</span>
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* SECTOR EVALUATION MODAL: F&B / Restaurant / Café */}
      <AnimatePresence>
        {sectorModalType === 'fnb' && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-lg bg-stone-900 border border-amber-500/40 rounded-3xl p-6 text-stone-100 space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">F&amp;B / Restaurant / Café Controls</h3>
                    <p className="text-[11px] text-stone-400">Dietary Certifications &amp; Parking Alerts for {activeVendor?.businessName}</p>
                  </div>
                </div>
                <button onClick={() => setSectorModalType(null)} className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Dietary Certifications */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-300 block">Dietary &amp; Kitchen Certifications</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'halal_certified', label: 'JAKIM / Official Halal Certified' },
                    { id: 'muslim_owned', label: '100% Muslim-Owned Kitchen' },
                    { id: 'pork_free', label: 'Pork-Free & Alcohol-Free' },
                    { id: 'vegetarian_friendly', label: '100% Vegetarian / Vegan Options' },
                  ].map((tag) => {
                    const hasTag = activeVendor?.dietaryTags?.includes(tag.id as any);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={async () => {
                          if (!activeVendor) return;
                          const currentTags = activeVendor.dietaryTags || [];
                          const newTags = hasTag ? currentTags.filter(t => t !== tag.id) : [...currentTags, tag.id as any];
                          const updated = { ...activeVendor, dietaryTags: newTags, updatedAt: new Date().toISOString() };
                          setActiveVendor(updated);
                          await firebaseService.saveVendorListing(updated);
                        }}
                        className={`px-3 py-2 rounded-xl text-left font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                          hasTag
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <span className="text-[11px]">{tag.label}</span>
                        {hasTag ? <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-stone-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Live Kitchen / DIY Status */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-300 block">Live Kitchen &amp; DIY Status</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'picking_open', label: 'Kitchen & DIY Open' },
                    { id: 'farm_open_no_picking', label: 'Kitchen Open, Limited DIY' },
                    { id: 'closed_season', label: 'Closed Off-Season' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleToggleHarvestStatus(st.id as any)}
                      className={`p-2 rounded-xl font-bold text-[11px] text-center border transition-all cursor-pointer ${
                        diyHarvestStatus === st.id
                          ? 'bg-amber-500 text-stone-950 font-black border-amber-400 shadow'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Parking & Traffic Alert */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-300 block">Parking &amp; Choke Point Alert</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'private_available', label: 'Private Parking' },
                    { id: 'street_busy', label: 'Street Busy' },
                    { id: 'valet_only', label: 'Valet / Shuttle' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleToggleParkingStatus(st.id as any)}
                      className={`p-2 rounded-xl font-bold text-[11px] text-center border transition-all cursor-pointer ${
                        parkingStatus === st.id
                          ? 'bg-amber-500 text-stone-950 font-black border-amber-400 shadow'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={async () => {
                  if (activeVendor) await handleSaveActiveVendor();
                  setSectorModalType(null);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer shadow-lg transition-colors"
              >
                Sync &amp; Update CamGo Directories &amp; Live Map
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* SECTOR EVALUATION MODAL: Guesthouse / Chalet / Hotel */}
      <AnimatePresence>
        {sectorModalType === 'hotel' && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-lg bg-stone-900 border border-teal-500/40 rounded-3xl p-6 text-stone-100 space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Guesthouse / Chalet / Hotel Controls</h3>
                    <p className="text-[11px] text-stone-400">Operating Status, Parking &amp; Room Vacancies for {activeVendor?.businessName}</p>
                  </div>
                </div>
                <button onClick={() => setSectorModalType(null)} className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Operating Status */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-teal-300 block">Overall Stay Operating Status</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'open', label: 'Normal Operations' },
                    { id: 'busy_peak_wait', label: 'High Season Peak' },
                    { id: 'closed_roadworks', label: 'Maintenance / Closed' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleToggleRealTimeStatus(st.id as any)}
                      className={`p-2 rounded-xl font-bold text-[11px] text-center border transition-all cursor-pointer ${
                        realTimeStatus === st.id
                          ? 'bg-teal-500 text-stone-950 font-black border-teal-400 shadow'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Guest Parking Availability */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-teal-300 block">Guest Parking Status</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'private_available', label: 'Dedicated Guest Parking' },
                    { id: 'street_busy', label: 'Street Parking Limited' },
                    { id: 'valet_only', label: 'Valet / Off-site Shuttle' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleToggleParkingStatus(st.id as any)}
                      className={`p-2 rounded-xl font-bold text-[11px] text-center border transition-all cursor-pointer ${
                        parkingStatus === st.id
                          ? 'bg-teal-500 text-stone-950 font-black border-teal-400 shadow'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Room Availability & Vacancies */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-teal-300 block">Room Vacancy &amp; Booking Status</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'rooms_available', label: 'Rooms Available Today' },
                    { id: 'limited_units', label: 'Limited Units Left' },
                    { id: 'fully_booked', label: 'Fully Booked / Sold Out' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleToggleRoomAvailability(st.id as any)}
                      className={`p-2 rounded-xl font-bold text-[11px] text-center border transition-all cursor-pointer ${
                        roomAvailabilityStatus === st.id
                          ? 'bg-teal-500 text-stone-950 font-black border-teal-400 shadow'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={async () => {
                  if (activeVendor) await handleSaveActiveVendor();
                  setSectorModalType(null);
                }}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-stone-950 font-black text-xs cursor-pointer shadow-lg transition-colors"
              >
                Sync &amp; Update CamGo Directories &amp; Live Map
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* SECTOR EVALUATION MODAL: Motorbike / Vehicle Rental */}
      <AnimatePresence>
        {sectorModalType === 'vehicle' && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-lg bg-stone-900 border border-cyan-500/40 rounded-3xl p-6 text-stone-100 space-y-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Motorbike / Vehicle Rental Controls</h3>
                    <p className="text-[11px] text-stone-400">Fleet Availability &amp; Rates for {activeVendor?.businessName}</p>
                  </div>
                </div>
                <button onClick={() => setSectorModalType(null)} className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Operating Status */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-cyan-300 block">Fleet Operating Status</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'open', label: 'Open for Rental Today' },
                    { id: 'closed_roadworks', label: 'Maintenance / Closed' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleToggleRealTimeStatus(st.id as any)}
                      className={`p-2 rounded-xl font-bold text-[11px] text-center border transition-all cursor-pointer ${
                        realTimeStatus === st.id
                          ? 'bg-cyan-500 text-stone-950 font-black border-cyan-400 shadow'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Fleet Availability */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-cyan-300 block">Scooter &amp; Bike Fleet Availability</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'high', label: 'High Availability (10+ Units)' },
                    { id: 'limited', label: 'Limited Fleet (1-3 Left)' },
                    { id: 'sold_out', label: 'All Scooters Rented' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={async () => {
                        setMotorbikeFleetStatus(st.id as any);
                        if (activeVendor) {
                          const updated = { ...activeVendor, motorbikeFleetStatus: st.id as any, updatedAt: new Date().toISOString() };
                          setActiveVendor(updated);
                          await firebaseService.saveVendorListing(updated);
                        }
                      }}
                      className={`p-2 rounded-xl font-bold text-[11px] text-center border transition-all cursor-pointer ${
                        motorbikeFleetStatus === st.id
                          ? 'bg-cyan-500 text-stone-950 font-black border-cyan-400 shadow'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={async () => {
                  if (activeVendor) await handleSaveActiveVendor();
                  setSectorModalType(null);
                }}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black text-xs cursor-pointer shadow-lg transition-colors"
              >
                Sync &amp; Update Motorbike Marketplace &amp; Live Map
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
