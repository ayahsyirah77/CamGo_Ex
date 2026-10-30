// AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { updateAdminUser, deleteAdminUser } from '../services/firebase';
// -------------------------------------------------
import {
  Place,
  GalleryItem,
  EventNotification,
  Language,
  MainCategory,
  SubCategory,
  Township,
  TownshipHubInfo,
  DayOfWeek,
  DaySchedule,
  FarmTicket,
  VendorListing,
} from '../types';
import { firebaseService, UserProfile } from '../services/firebase';
import { TOWNSHIP_PORTALS } from '../data/initialData';
import { formatTimeTo12Hour } from '../utils/highlandLogic';
import { CamLogo } from './CamLogo';

import {
  ShieldCheck,
  Users,
  Eye,
  UserPlus,
  Ticket,
  Plus,
  Image as ImageIcon,
  Calendar,
  Layers,
  MapPin,
  Save,
  X,
  Upload,
  Download,
  CheckCircle,
  Activity,
  LogOut,
  ArrowLeft,
  Trash2,
  Edit3,
  Stethoscope,
  ShieldAlert,
  Fuel,
  RotateCcw,
  Building2,
  AlertTriangle,
  Loader2,
  Clock,
  Copy,
  Check,
  Navigation,
} from 'lucide-react';

interface AdminDashboardProps {
  language: Language;
  currentUser: UserProfile | null;
  onClose: () => void;
  onRefreshData: () => void;
  places: Place[];
  gallery: GalleryItem[];
  events: EventNotification[];
}

export const TOWNSHIP_DEFAULTS: Record<string, { lat: number; lng: number; elevation: string }> = {
  'Tanah Rata': { lat: 4.4715, lng: 101.3805, elevation: '1,440 m' },
  'Brinchang': { lat: 4.4905, lng: 101.3892, elevation: '1,540 m' },
  'Kea Farm': { lat: 4.5028, lng: 101.4072, elevation: '1,610 m' },
  'Ringlet': { lat: 4.4147, lng: 101.3820, elevation: '1,135 m' },
  'Kampung Raja': { lat: 4.5683, lng: 101.4087, elevation: '1,280 m' },
  'Tringkap': { lat: 4.5126, lng: 101.4258, elevation: '1,490 m' },
  'Kuala Terla': { lat: 4.5458, lng: 101.4172, elevation: '1,320 m' },
  'Bertam Valley': { lat: 4.4178, lng: 101.3985, elevation: '1,080 m' },
  'Blue Valley': { lat: 4.5888, lng: 101.4215, elevation: '1,350 m' },
};

export const ALL_9_TOWNSHIPS: Township[] = [
  'Tanah Rata',
  'Brinchang',
  'Kea Farm',
  'Ringlet',
  'Kampung Raja',
  'Tringkap',
  'Kuala Terla',
  'Bertam Valley',
  'Blue Valley',
];

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80';

const GSAP_DEFAULT_BACKGROUNDS: Record<string, string> = {
  'card-1': 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=80',
  'card-2': 'https://images.unsplash.com/photo-1545143333-6382f1d5b893?auto=format&fit=crop&w=1200&q=80',
  'card-3': 'https://images.unsplash.com/photo-1532187863486-abf9d3c352fd?auto=format&fit=crop&w=1200&q=80',
  'card-4': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80',
  'card-5': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80',
  'card-6': 'https://images.unsplash.com/photo-1562184552-997c461ade6e?auto=format&fit=crop&w=1200&q=80',
};

const compressImageFile = (
  file: File,
  maxWidth = 900,
  quality = 0.65
): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        try {
          const scale = Math.min(1, maxWidth / img.width);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(src);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onClose,
  onRefreshData,
  places,
  gallery,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [liveUsers, setLiveUsers] = useState<any[]>([]);
  const [selectedUserForView, setSelectedUserForView] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        if (!isMounted) return;
        const usersList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLiveUsers(usersList);
      } catch (err) {
        console.warn('Could not fetch users due to quota limits:', err);
      }
    };
    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  const [vendorListingsState, setVendorListingsState] = useState<VendorListing[]>(() =>
    firebaseService.getVendorListings()
  );
  const [vendorFilter, setVendorFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');

  useEffect(() => {
    const handleListingsUpdate = (e: any) => {
      const newListings = e?.detail || firebaseService.getVendorListings();
      setVendorListingsState(newListings);
    };
    window.addEventListener('vendor-listings-updated', handleListingsUpdate as EventListener);
    return () => {
      window.removeEventListener('vendor-listings-updated', handleListingsUpdate as EventListener);
    };
  }, []);

  const handleApproveVendor = async (listing: VendorListing) => {
    const updated: VendorListing = {
      ...listing,
      verificationStatus: 'verified',
      isBookingEnabled: true,
      profileHealthScore: 100,
      updatedAt: new Date().toISOString(),
    };
    await firebaseService.saveVendorListing(updated);
    setVendorListingsState(firebaseService.getVendorListings());
    addActivity(`Approved SSM verification & activated booking for "${listing.businessName}"`);
  };

  const handleRejectVendor = async (listing: VendorListing) => {
    const updated: VendorListing = {
      ...listing,
      verificationStatus: 'rejected',
      isBookingEnabled: false,
      updatedAt: new Date().toISOString(),
    };
    await firebaseService.saveVendorListing(updated);
    setVendorListingsState(firebaseService.getVendorListings());
    addActivity(`Rejected SSM verification for "${listing.businessName}"`);
  };

  const handleToggleBookingActivation = async (listing: VendorListing) => {
    const currentStatus = listing.isBookingEnabled ?? (listing.verificationStatus === 'verified');
    const newStatus = !currentStatus;
    const updated: VendorListing = {
      ...listing,
      isBookingEnabled: newStatus,
      verificationStatus: newStatus ? 'verified' : listing.verificationStatus,
      updatedAt: new Date().toISOString(),
    };
    await firebaseService.saveVendorListing(updated);
    setVendorListingsState(firebaseService.getVendorListings());
    addActivity(`Toggled Booking Activation for "${listing.businessName}" to ${newStatus ? 'ENABLED' : 'DISABLED'}`);
  };

  const handleDeleteVendor = async (listingId: string, businessName: string) => {
    if (window.confirm(`Delete vendor listing "${businessName}"?`)) {
      await firebaseService.deleteVendorListing(listingId);
      setVendorListingsState(firebaseService.getVendorListings());
      addActivity(`Deleted vendor listing "${businessName}"`);
    }
  };

  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showFarmTicketModal, setShowFarmTicketModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDataJson, setExportDataJson] = useState('');

  // Place Form States
  const [placeName, setPlaceName] = useState('');
  const [placeNameBm, setPlaceNameBm] = useState('');
  const [placeCategory, setPlaceCategory] = useState<MainCategory>('food');
  const [placeSubCategory, setPlaceSubCategory] = useState<SubCategory>('dining');
  const [placeTownship, setPlaceTownship] = useState<Township>('Brinchang');
  const [placeDescription, setPlaceDescription] = useState('');
  const [placeDescriptionBm, setPlaceDescriptionBm] = useState('');
  const [placeLocation, setPlaceLocation] = useState('');
  const [placeContact, setPlaceContact] = useState('');
  const [timeFrom, setTimeFrom] = useState('08:33');
  const [timeTo, setTimeTo] = useState('22:30');
  const [isOpenNow, setIsOpenNow] = useState(true);
  const [isOpen24Hours, setIsOpen24Hours] = useState(false);
  const [isPlaceClosed, setIsPlaceClosed] = useState(false);
  const [placeIncludeInPlanner, setPlaceIncludeInPlanner] = useState(false);

  const DAYS_OF_WEEK: DayOfWeek[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const DEFAULT_WEEKLY_SCHEDULE: DaySchedule[] = [
    { day: 'Monday', isOpen: true, from: '08:33', to: '22:30' },
    { day: 'Tuesday', isOpen: true, from: '08:33', to: '22:30' },
    { day: 'Wednesday', isOpen: true, from: '08:33', to: '22:30' },
    { day: 'Thursday', isOpen: true, from: '08:33', to: '22:30' },
    { day: 'Friday', isOpen: true, from: '08:33', to: '22:30' },
    { day: 'Saturday', isOpen: true, from: '08:33', to: '22:30' },
    { day: 'Sunday', isOpen: true, from: '08:33', to: '22:30' },
  ];

  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>(DEFAULT_WEEKLY_SCHEDULE);
  const [copySuccessDay, setCopySuccessDay] = useState<string | null>(null);

  const handleDayToggle = (day: DayOfWeek) => {
    setWeeklySchedule((prev) =>
      prev.map((item) =>
        item.day === day ? { ...item, isOpen: !item.isOpen } : item
      )
    );
  };

  const handleDayTimeChange = (day: DayOfWeek, field: 'from' | 'to', value: string) => {
    setWeeklySchedule((prev) =>
      prev.map((item) =>
        item.day === day ? { ...item, [field]: value } : item
      )
    );
  };

  const handleCopyDayToAll = (sourceDay: DayOfWeek) => {
    const source = weeklySchedule.find((item) => item.day === sourceDay);
    if (!source) return;
    setWeeklySchedule((prev) =>
      prev.map((item) => ({
        ...item,
        isOpen: source.isOpen,
        from: source.from,
        to: source.to,
      }))
    );
    setCopySuccessDay(sourceDay);
    setTimeout(() => setCopySuccessDay(null), 2500);
  };

  const handlePresetWeekdays = () => {
    setWeeklySchedule((prev) =>
      prev.map((item) => {
        const isWeekend = item.day === 'Saturday' || item.day === 'Sunday';
        return {
          ...item,
          isOpen: !isWeekend,
        };
      })
    );
  };

  const handlePresetAllOpen = () => {
    setWeeklySchedule((prev) =>
      prev.map((item) => ({ ...item, isOpen: true }))
    );
  };

  const handlePresetAll24Hours = () => {
    setWeeklySchedule((prev) =>
      prev.map((item) => ({ ...item, isOpen: true, from: '00:00', to: '23:59' }))
    );
  };

  const [placeLat, setPlaceLat] = useState('4.4932');
  const [placeLng, setPlaceLng] = useState('101.3888');
  const [placeElevation, setPlaceElevation] = useState('1,540 m');
  const [placeTags, setPlaceTags] = useState('Highlands, Must Visit');
  const [placeImageUrl, setPlaceImageUrl] = useState(FALLBACK_IMAGE);
  
  const [hasCheckTimes, setHasCheckTimes] = useState(false);
  const [placeCheckIn, setPlaceCheckIn] = useState('14:00');
  const [placeCheckOut, setPlaceCheckOut] = useState('12:00');

  const subCategoryOptions: Record<MainCategory, { key: SubCategory; label: string }[]> = {
    food: [
      { key: 'dining', label: 'Restaurants & Dining' },
      { key: 'steamboats', label: 'Steamboat' },
      { key: 'cafes', label: 'Cafes & Bakeries' },
      { key: 'night_markets_street', label: 'Night Markets & Street Food' },
      { key: 'bars_nightlife', label: 'Bars & Nightlife' },
    ],
    travel_tourism: [
      { key: 'attractions_sightseeing', label: 'Attractions & Sightseeing' },
      { key: 'agrotourism_farms', label: 'Agrotourism & Farms' },
      { key: 'outdoor_adventure', label: 'Outdoor & Adventure' },
      { key: 'tour_agencies_guides', label: 'Tour Agencies & Guides' },
    ],
    accommodation: [
      { key: 'hotels_resorts', label: 'Hotels & Resorts' },
      { key: 'guesthouses', label: 'Guesthouses' },
      { key: 'chalets', label: 'Chalets' },
      { key: 'homestay', label: 'Homestays' },
      { key: 'camping_glamping', label: 'Camping & Glamping' },
    ],
    transport: [
      { key: 'car_bike_rentals', label: 'Car & Bike Rentals' },
      { key: 'taxi_ehailing', label: 'Taxi & E-Hailing' },
      { key: 'auto_repair_roadside', label: 'Auto Repair & Roadside' },
    ],
    local_services: [
      { key: 'health_wellness', label: 'Health & Wellness' },
      { key: 'banking_financial', label: 'Banking & Financial' },
      { key: 'logistics_freight', label: 'Logistics & Freight' },
    ],
    shopping: [
      { key: 'fresh_markets_produce', label: 'Fresh Markets & Produce' },
      { key: 'souvenirs_handicrafts', label: 'Souvenirs & Handicrafts' },
      { key: 'convenience_groceries', label: 'Convenience & Groceries' },
      { key: 'retail_apparel', label: 'Retail & Apparel' },
    ],
    services_utilities: [
      { key: 'plumbing_electrical', label: 'Plumbing & Electrical' },
      { key: 'locksmith_access', label: 'Locksmith & Access Services' },
      { key: 'carpentry_construction', label: 'Carpentry & Construction' },
      { key: 'pest_control', label: 'Pest Control & Fumigation' },
      { key: 'laundry_dry_cleaning', label: 'Laundry & Dry Cleaning' },
      { key: 'housekeeping_maid', label: 'Housekeeping & Maid Services' },
    ],
    masjid_surau: [
      { key: 'masjid_surau', label: 'Masjid & Surau' },
    ],
    attraction: [
      { key: 'attractions_sightseeing', label: 'Attractions & Sightseeing' },
      { key: 'agrotourism_farms', label: 'Agrotourism & Farms' },
      { key: 'outdoor_adventure', label: 'Outdoor & Adventure' },
      { key: 'tour_agencies_guides', label: 'Tour Agencies & Guides' },
    ],
    business: [
      { key: 'fresh_markets_produce', label: 'Fresh Markets & Produce' },
      { key: 'souvenirs_handicrafts', label: 'Souvenirs & Handicrafts' },
      { key: 'convenience_groceries', label: 'Convenience & Groceries' },
      { key: 'retail_apparel', label: 'Retail & Apparel' },
    ],
  };

  const handleCategoryChange = (newCat: MainCategory) => {
    setPlaceCategory(newCat);
    const availableSubs = subCategoryOptions[newCat];
    if (availableSubs && availableSubs.length > 0) {
      setPlaceSubCategory(availableSubs[0].key);
    }
  };

  // Gallery Form States
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryTownship, setGalleryTownship] = useState<Township>('Brinchang');
  const [galleryElevation, setGalleryElevation] = useState('1,560 m');
  const [galleryDesc, setGalleryDesc] = useState('');
  const [galleryCategory, setGalleryCategory] = useState('Plantation');
  const [galleryImageUrl, setGalleryImageUrl] = useState('');

  // Event Form States
  const [eventTitle, setEventTitle] = useState('');
  const [eventDateFrom, setEventDateFrom] = useState('');
  const [eventDateTo, setEventDateTo] = useState('');
  const [eventTown, setEventTown] = useState<Township>('Brinchang');
  const [eventDesc, setEventDesc] = useState('');

  // User Form States
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserType, setNewUserType] = useState<'local' | 'tourist'>('local');

  // Editing IDs
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);

  // Township Hubs Management States
  const [townshipHubs, setTownshipHubs] = useState<Record<string, TownshipHubInfo>>(() =>
    firebaseService.getTownshipHubs()
  );
  const [showTownshipModal, setShowTownshipModal] = useState(false);
  const [editingTownship, setEditingTownship] = useState<Township>('Tanah Rata');
  const [townDesc, setTownDesc] = useState('');
  const [townImageUrl, setTownImageUrl] = useState('');
  const [townClinics, setTownClinics] = useState('');
  const [townPolice, setTownPolice] = useState('');
  const [townToilet, setTownToilet] = useState('');
  const [townGas, setTownGas] = useState('');
  const [townPlacesInterest, setTownPlacesInterest] = useState('');
  const [townError, setTownError] = useState<string | null>(null);
  const [townSaving, setTownSaving] = useState(false);

  // GSAP Gallery Card Background Manager States
  const [showGsapModal, setShowGsapModal] = useState(false);
  const [gsapImages, setGsapImages] = useState<Record<string, string>>(() => firebaseService.getGsapCardImages());

  const gsapCardsMeta = [
    { id: 'card-1', title: 'Microclimate & Altitude', category: 'Climate' },
    { id: 'card-2', title: 'Traffic Hub', category: 'Transit' },
    { id: 'card-3', title: 'Hazard Alerts & Slope Safety', category: 'Safety' },
    { id: 'card-4', title: 'Highland Events & Markets', category: 'Culture' },
    { id: 'card-5', title: 'Verified Directories', category: 'Directory' },
    { id: 'card-6', title: 'Portals Hub & Townships', category: 'Portal' },
  ];

  // Farm Ticket Management States
  const [farmTickets, setFarmTickets] = useState<FarmTicket[]>(() => firebaseService.getFarmTickets());
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState<Partial<FarmTicket>>({
    name: '',
    township: 'Brinchang',
    isFree: false,
    adultPriceRm: 0,
    childPriceRm: 0,
    operatingHours: {
      from: '09:00',
      to: '18:00',
      isOpen: true,
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE.map(d => ({ ...d, from: '09:00', to: '18:00' }))
    },
    inclusions: [],
    description: '',
    category: 'attraction'
  });

  const handleOpenAddTicket = () => {
    setEditingTicketId(null);
    setTicketForm({
      name: '',
      township: 'Brinchang',
      isFree: false,
      adultPriceRm: 0,
      childPriceRm: 0,
      operatingHours: {
        from: '09:00',
        to: '18:00',
        isOpen: true,
        weeklySchedule: DEFAULT_WEEKLY_SCHEDULE.map(d => ({ ...d, from: '09:00', to: '18:00' }))
      },
      inclusions: [],
      description: '',
      category: 'attraction'
    });
  };

  const handleOpenEditTicket = (ticket: FarmTicket) => {
    setEditingTicketId(ticket.id);
    const finalTicket = { ...ticket };
    if (!finalTicket.operatingHours.weeklySchedule) {
      finalTicket.operatingHours.weeklySchedule = DEFAULT_WEEKLY_SCHEDULE.map(d => ({
        ...d,
        from: finalTicket.operatingHours.from || '09:00',
        to: finalTicket.operatingHours.to || '18:00',
        isOpen: finalTicket.operatingHours.isOpen ?? true
      }));
    }
    setTicketForm(finalTicket);
  };

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingTicketId || 'ticket-' + Date.now().toString(36);
    const newTicket: FarmTicket = {
      ...ticketForm as FarmTicket,
      id,
      inclusions: Array.isArray(ticketForm.inclusions) ? ticketForm.inclusions : []
    };
    const updated = await firebaseService.saveFarmTicket(newTicket);
    setFarmTickets(updated);
    addActivity(`Saved ticket: ${newTicket.name}`);
    setEditingTicketId(null);
    setTicketForm({
      name: '',
      township: 'Brinchang',
      isFree: false,
      adultPriceRm: 0,
      childPriceRm: 0,
      operatingHours: {
        from: '09:00',
        to: '18:00',
        isOpen: true,
        weeklySchedule: DEFAULT_WEEKLY_SCHEDULE.map(d => ({ ...d, from: '09:00', to: '18:00' }))
      },
      inclusions: [],
      description: '',
      category: 'attraction'
    });
  };

  const handleDeleteTicket = async (id: string) => {
    if (window.confirm('Delete this ticket pricing record?')) {
      const updated = await firebaseService.deleteFarmTicket(id);
      setFarmTickets(updated);
      addActivity(`Deleted ticket pricing: ${id}`);
    }
  };

  const handleUpdateGsapImage = async (cardId: string, url: string) => {
    try {
      const updated = await firebaseService.saveGsapCardImage(cardId, url);
      setGsapImages({ ...updated });
      addActivity(`Updated GSAP Card Background (${cardId})`);
      window.dispatchEvent(new CustomEvent('gsap-images-updated', { detail: updated }));
      window.alert('Card background image updated and synced live to cloud!');
    } catch (err: any) {
      console.error('[AdminDashboard] Failed to sync GSAP image to cloud:', err);
      window.alert('Could not sync image to cloud: ' + (err?.message || 'Unknown error'));
    }
  };

  const stats = {
    totalUsers: liveUsers.length,
    pageViews: 0,
    newSignups: liveUsers.filter(u => {
      if (!u.createdAt) return false;
      const created = new Date(u.createdAt).getTime();
      const now = Date.now();
      return (now - created) < 24 * 60 * 60 * 1000;
    }).length,
    supportTickets: 0,
  };

  const [recentActivities, setRecentActivities] = useState<Array<{ title: string; time: string }>>(() => {
    const saved = localStorage.getItem('camgo_recent_activities');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const addActivity = (title: string) => {
    const newAct = { title, time: 'Just now' };
    setRecentActivities(prev => {
      const updated = [newAct, ...prev].slice(0, 20);
      localStorage.setItem('camgo_recent_activities', JSON.stringify(updated));
      return updated;
    });
  };

  const handleOpenAddPlace = () => {
    setEditingPlaceId(null);
    setPlaceName('');
    setPlaceNameBm('');
    setPlaceCategory('services_utilities');
    setPlaceSubCategory('plumbing_electrical');
    setPlaceTownship('Brinchang');
    setPlaceDescription('');
    setPlaceDescriptionBm('');
    setPlaceLocation('');
    setPlaceContact('');
    setTimeFrom('08:33');
    setTimeTo('22:30');
    setIsOpenNow(true);
    setIsOpen24Hours(false);
    setIsPlaceClosed(false);
    setWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE);
    const info = TOWNSHIP_DEFAULTS['Brinchang'];
    setPlaceLat(info.lat.toFixed(4));
    setPlaceLng(info.lng.toFixed(4));
    setPlaceElevation(info.elevation);
    setPlaceTags('Highland, Must Visit');
    setPlaceImageUrl(FALLBACK_IMAGE);
    setHasCheckTimes(false);
    setPlaceCheckIn('14:00');
    setPlaceCheckOut('12:00');
    setPlaceIncludeInPlanner(false);
    setShowAddPlaceModal(true);
  };

  const handleOpenEditPlace = (place: Place) => {
    setEditingPlaceId(place.id);
    setPlaceName(place.name || '');
    setPlaceNameBm(place.nameBm || place.name || '');
    setPlaceCategory(place.category);
    setPlaceSubCategory(place.subCategory || 'agritourism_plantations');
    setPlaceTownship(place.township);
    setPlaceDescription(place.description || '');
    setPlaceDescriptionBm(place.descriptionBm || place.description || '');
    setPlaceLocation(place.location || '');
    setPlaceContact(place.contact || '');
    setTimeFrom(place.operatingHours?.from || '08:33');
    setTimeTo(place.operatingHours?.to || '22:30');
    setIsOpenNow(place.operatingHours?.isOpen ?? true);
    setIsOpen24Hours(place.operatingHours?.isOpen24Hours ?? false);
    setIsPlaceClosed(false);

    if (place.operatingHours?.weeklySchedule && place.operatingHours.weeklySchedule.length > 0) {
      const scheduleMap = new Map(place.operatingHours.weeklySchedule.map((s) => [s.day, s]));
      const completeSchedule: DaySchedule[] = DAYS_OF_WEEK.map((d) => {
        const existing = scheduleMap.get(d);
        if (existing) {
          return { ...existing };
        }
        return {
          day: d,
          isOpen: place.operatingHours?.isOpen ?? true,
          from: place.operatingHours?.from || '08:33',
          to: place.operatingHours?.to || '22:30',
        };
      });
      setWeeklySchedule(completeSchedule);
    } else {
      const baseFrom =
        place.operatingHours?.from && place.operatingHours.from !== '-'
          ? place.operatingHours.from
          : '08:33';
      const baseTo =
        place.operatingHours?.to && place.operatingHours.to !== '-'
          ? place.operatingHours.to
          : '22:30';
      const baseOpen = place.operatingHours?.isOpen ?? true;
      setWeeklySchedule(
        DAYS_OF_WEEK.map((day) => ({
          day,
          isOpen: baseOpen,
          from: baseFrom,
          to: baseTo,
        }))
      );
    }

    const defaultCoords =
      TOWNSHIP_DEFAULTS[place.township] || { lat: 4.475, lng: 101.385, elevation: '1,540 m' };
    setPlaceLat(place.coordinates?.lat?.toString() || defaultCoords.lat.toString());
    setPlaceLng(place.coordinates?.lng?.toString() || defaultCoords.lng.toString());
    setPlaceElevation(place.elevation || defaultCoords.elevation);
    setPlaceTags(place.tags?.join(', ') || 'Highland, Must Visit');
    setPlaceImageUrl(place.imageUrl || FALLBACK_IMAGE);
    
    if (place.checkIn || place.checkOut) {
      setHasCheckTimes(true);
      setPlaceCheckIn(place.checkIn || '14:00');
      setPlaceCheckOut(place.checkOut || '12:00');
    } else {
      setHasCheckTimes(false);
      setPlaceCheckIn('14:00');
      setPlaceCheckOut('12:00');
    }

    setPlaceIncludeInPlanner(place.includeInPlanner ?? false);
    setShowAddPlaceModal(true);
  };
// 🔥 DIRECT CLOUD FIRESTORE SAVE PLACE HANDLER 🔥
  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetId = editingPlaceId || 'place-' + Date.now().toString(36);
      const existingPlace = places.find((p) => p.id === targetId);

      const cleanLat = parseFloat(placeLat.replace(',', '.').trim());
      const cleanLng = parseFloat(placeLng.replace(',', '.').trim());
      const info =
        TOWNSHIP_DEFAULTS[placeTownship] || { lat: 4.475, lng: 101.385, elevation: '1,540 m' };

      const finalLat = !isNaN(cleanLat) && cleanLat !== 0 ? cleanLat : info.lat;
      const finalLng = !isNaN(cleanLng) && cleanLng !== 0 ? cleanLng : info.lng;

      const firstOpenDay = weeklySchedule.find((d) => d.isOpen);
      
      const rawPlace: any = {
        ...(existingPlace || {}),
        id: targetId,
        name: placeName,
        nameBm: placeNameBm || placeName,
        category: placeCategory,
        subCategory: placeSubCategory,
        township: placeTownship,
        description: placeDescription,
        descriptionBm: placeDescriptionBm || placeDescription,
        location: placeLocation || `${placeTownship}, Cameron Highlands, Pahang`,
        contact: placeContact || '+60 5-491 1234',
        operatingHours: {
          from: isPlaceClosed ? '-' : (firstOpenDay ? firstOpenDay.from : timeFrom),
          to: isPlaceClosed ? '-' : (firstOpenDay ? firstOpenDay.to : timeTo),
          isOpen: !isPlaceClosed && weeklySchedule.some((d) => d.isOpen),
          isOpen24Hours: !isPlaceClosed && isOpen24Hours,
          weeklySchedule: weeklySchedule,
        },
        coordinates: {
          lat: Number(finalLat.toFixed(5)),
          lng: Number(finalLng.toFixed(5)),
        },
        elevation: placeElevation || info.elevation,
        rating: existingPlace?.rating ?? 4.8,
        reviewsCount: existingPlace?.reviewsCount ?? 1,
        tags: placeTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        imageUrl: placeImageUrl,
        includeInPlanner: placeIncludeInPlanner,
        trafficStatus: existingPlace?.trafficStatus ?? 'smooth',
      };

      // Safely attach check times if enabled, otherwise omit them completely
      if (hasCheckTimes) {
        if (placeCheckIn) rawPlace.checkIn = placeCheckIn;
        if (placeCheckOut) rawPlace.checkOut = placeCheckOut;
      }

      // 🔥 STRIP OUT ANY ACCIDENTAL UNDEFINED VALUES SO FIRESTORE NEVER REJECTS IT 🔥
      const savedPlace = Object.fromEntries(
        Object.entries(rawPlace).filter(([_, v]) => v !== undefined)
      );

      // Save via firebaseService to ensure local cache updates immediately
      await firebaseService.savePlace(savedPlace as unknown as Place, false);
      addActivity(`Saved place to cloud: ${savedPlace.name} (${savedPlace.township})`);
      onRefreshData();
      setShowAddPlaceModal(false);
      setEditingPlaceId(null);
    } catch (err: any) {
      console.error('Error saving place:', err);
      window.alert('Failed to save place: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleOpenAddGallery = () => {
    setEditingGalleryId(null);
    setGalleryTitle('');
    setGalleryTownship('Brinchang');
    setGalleryElevation('1,560 m');
    setGalleryDesc('');
    setGalleryCategory('Plantation');
    setGalleryImageUrl('');
    setShowGalleryModal(true);
  };

  const handleOpenEditGallery = (item: GalleryItem) => {
    setEditingGalleryId(item.id);
    setGalleryTitle(item.title || '');
    setGalleryTownship(item.township || 'Brinchang');
    setGalleryElevation(item.elevation || '1,560 m');
    setGalleryDesc(item.description || '');
    setGalleryCategory(item.category || 'Plantation');
    setGalleryImageUrl(item.imageUrl || '');
    setShowGalleryModal(true);
  };

  // 🔥 DIRECT CLOUD FIRESTORE SAVE GALLERY HANDLER 🔥
  const handleSaveGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetId = editingGalleryId || 'gal-' + Date.now().toString(36);
      const existingItem = gallery.find((g) => g.id === targetId);

      const finalImg = galleryImageUrl || existingItem?.imageUrl || FALLBACK_IMAGE;

      const savedItem: GalleryItem = {
        ...(existingItem || {}),
        id: targetId,
        title: galleryTitle,
        titleBm: galleryTitle,
        township: galleryTownship,
        elevation: galleryElevation,
        description: galleryDesc,
        descriptionBm: galleryDesc,
        category: galleryCategory,
        imageUrl: finalImg,
        thumbnailUrl: finalImg,
        uploadedAt: existingItem?.uploadedAt || new Date().toISOString().split('T')[0],
        photographer: existingItem?.photographer || currentUser?.displayName || 'Admin Curator',
      };

      // Save via firebaseService
      await firebaseService.saveGalleryItem(savedItem);
      addActivity(`Saved gallery photo to cloud: ${savedItem.title} (${savedItem.township})`);
      onRefreshData();
      setShowGalleryModal(false);
      setEditingGalleryId(null);
    } catch (err: any) {
      console.error('Error saving gallery item:', err);
      window.alert('Failed to save gallery item: ' + (err?.message || 'Unknown error'));
    }
  };

  // 🔥 DIRECT CLOUD FIRESTORE SAVE EVENT HANDLER 🔥
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetId = 'evt-' + Date.now().toString(36);
      const formattedDate = eventDateFrom === eventDateTo || !eventDateTo 
        ? eventDateFrom 
        : `${eventDateFrom} to ${eventDateTo}`;

      const newEvent: EventNotification = {
        id: targetId,
        title: eventTitle,
        date: formattedDate,
        township: eventTown,
        description: eventDesc,
      };

      // Save via firebaseService
      await firebaseService.saveEvent(newEvent);
      addActivity(`Created event on cloud: ${newEvent.title} (${newEvent.township})`);
      onRefreshData();
      setShowAddEventModal(false);
      
      setEventTitle('');
      setEventDateFrom('');
      setEventDateTo('');
      setEventTown('Brinchang');
      setEventDesc('');
    } catch (err: any) {
      console.error('Error saving event to Firestore:', err);
      window.alert('Failed to save event to Firestore: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleToggleRole = async (u: any) => {
    if (u.email === 'ayahsyirah77@gmail.com') {
      window.alert('Cannot modify the Master Admin.');
      return;
    }
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    await updateAdminUser(u.id, { role: newRole });
    setLiveUsers((prev) =>
      prev.map((item) => (item.id === u.id ? { ...item, role: newRole } : item))
    );
    if (selectedUserForView?.id === u.id) {
      setSelectedUserForView((prev: any) => (prev ? { ...prev, role: newRole } : null));
    }
    addActivity(`Updated role for ${u.fullName || u.email} to ${newRole}`);
  };

  const handleToggleBlock = async (u: any) => {
    if (u.email === 'ayahsyirah77@gmail.com') {
      window.alert('Cannot block the Master Admin.');
      return;
    }
    const newStatus = !u.isBlocked;
    await updateAdminUser(u.id, { isBlocked: newStatus });
    setLiveUsers((prev) =>
      prev.map((item) => (item.id === u.id ? { ...item, isBlocked: newStatus } : item))
    );
    if (selectedUserForView?.id === u.id) {
      setSelectedUserForView((prev: any) => (prev ? { ...prev, isBlocked: newStatus } : null));
    }
    addActivity(`${newStatus ? 'Blocked' : 'Unblocked'} user ${u.fullName || u.email}`);
  };

  const handleRemoveUser = async (u: any) => {
    if (u.email === 'ayahsyirah77@gmail.com') {
      window.alert('Cannot remove the Master Admin.');
      return;
    }
    if (window.confirm(`Are you sure you want to remove user "${u.fullName || u.email}"?`)) {
      await deleteAdminUser(u.id);
      setLiveUsers((prev) => prev.filter((item) => item.id !== u.id));
      addActivity(`Removed user ${u.fullName || u.email}`);
      if (selectedUserForView?.id === u.id) {
        setSelectedUserForView(null);
      }
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newUserEmail.trim().toLowerCase();
    if (!cleanEmail.endsWith('@gmail.com')) {
      window.alert('User registration requires a valid Google (@gmail.com) email address.');
      return;
    }

    const newUid = 'usr-' + Date.now().toString(36);
    const newUserObj = {
      id: newUid,
      uid: newUid,
      email: cleanEmail,
      fullName: newUserName || cleanEmail.split('@')[0],
      displayName: newUserName || cleanEmail.split('@')[0],
      phone: newUserPhone,
      userType: newUserType,
      role: 'user',
      isBlocked: false,
      createdAt: new Date().toISOString(),
    };

    if (db) {
      try {
        await setDoc(doc(db, 'users', newUid), newUserObj);
      } catch (err) {
        console.warn('Could not save user to Firestore:', err);
      }
    }

    setLiveUsers((prev) => [newUserObj, ...prev]);
    addActivity(`Added user ${newUserName} (${cleanEmail})`);
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
  };

  const handleExportData = () => {
    const json = firebaseService.exportDataForGithub();
    setExportDataJson(json);
    setShowExportModal(true);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      window.alert('Please choose an image file (JPG, PNG, WEBP...).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      window.alert('That image is over 15MB. Please choose a smaller file.');
      return;
    }

    try {
      const downloadUrl = await firebaseService.uploadImage(file, 'admin_uploads');
      setter(downloadUrl);
      addActivity(`Uploaded image to Firebase Storage successfully`);
    } catch (err: any) {
      console.error('[AdminDashboard] Image upload failed:', err);
      window.alert('Could not upload image to Firebase Storage: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleOpenEditTownship = (townName: Township) => {
    setTownError(null);
    setEditingTownship(townName);

    const existing = townshipHubs[townName] || firebaseService.getTownshipHubs()[townName];
    const defaultPortal = TOWNSHIP_PORTALS.find((t) => t.name === townName);

    setTownDesc(
      existing?.description ||
        defaultPortal?.description ||
        `${townName} is a major highland township in Cameron Highlands.`
    );
    setTownImageUrl(existing?.imageUrl || defaultPortal?.imageUrl || FALLBACK_IMAGE);
    setTownClinics(
      existing?.clinicsOrHospitals ||
        defaultPortal?.hospital ||
        'Local clinic & Sultanah Hajah Kalsom Hospital'
    );
    setTownPolice(existing?.policeStation || defaultPortal?.police || `Balai Polis ${townName}`);
    setTownToilet(
      existing?.publicToilet || defaultPortal?.publicToilet || 'Public toilet available in town area'
    );
    setTownGas(existing?.gasStation || defaultPortal?.gasStation || 'Local fuel station');

    const interestList =
      existing?.placesOfInterest || defaultPortal?.keyAttractions || ['Highland Views', 'Farms'];
    setTownPlacesInterest(Array.isArray(interestList) ? interestList.join(', ') : interestList);

    setShowTownshipModal(true);
  };

  const handleSaveTownship = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setTownError(null);

    if (!townDesc || !townDesc.trim()) {
      setTownError(`Please enter a description for ${editingTownship}.`);
      return;
    }

    setTownSaving(true);
    const placesArray = townPlacesInterest
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const updatedHub: TownshipHubInfo = {
      township: editingTownship,
      description: townDesc.trim(),
      imageUrl: townImageUrl?.trim() || FALLBACK_IMAGE,
      clinicsOrHospitals: townClinics?.trim() || 'Local clinic & medical services',
      policeStation: townPolice?.trim() || `Balai Polis ${editingTownship}`,
      publicToilet: townToilet?.trim() || 'Public restrooms available in town area',
      gasStation: townGas?.trim() || 'Local fuel station',
      placesOfInterest: placesArray.length > 0 ? placesArray : ['Highland Views', 'Farms'],
    };

    try {
      const newHubs = await firebaseService.saveTownshipHub(updatedHub);
      if (newHubs && typeof newHubs === 'object' && !Array.isArray(newHubs)) {
        setTownshipHubs({ ...(newHubs as Record<string, TownshipHubInfo>) });
      } else {
        const freshHubs = firebaseService.getTownshipHubs();
        setTownshipHubs({ ...freshHubs, [editingTownship]: updatedHub });
      }

      onRefreshData();
      window.dispatchEvent(new CustomEvent('township-hub-updated', { detail: updatedHub }));
      setShowTownshipModal(false);
    } catch (err: any) {
      console.error('[AdminDashboard] Error saving township hub:', err);
      setTownError(
        err?.message ||
          'Save failed. Check your connection or admin permissions, then try again.'
      );
    } finally {
      setTownSaving(false);
    }
  };

  const handleResetTownship = async (townName: Township) => {
    if (window.confirm(`Reset "${townName}" info and image back to default initial data?`)) {
      try {
        const newHubs = await firebaseService.deleteTownshipHub(townName);
        if (newHubs && typeof newHubs === 'object' && !Array.isArray(newHubs)) {
          setTownshipHubs({ ...(newHubs as Record<string, TownshipHubInfo>) });
        } else {
          setTownshipHubs(firebaseService.getTownshipHubs());
        }
        onRefreshData();
        window.dispatchEvent(
          new CustomEvent('township-hub-updated', { detail: { township: townName } })
        );
        if (showTownshipModal && editingTownship === townName) {
          setShowTownshipModal(false);
        }
      } catch (err) {
        console.error('[AdminDashboard] Error resetting township hub:', err);
        window.alert('Reset failed. Please check your connection and try again.');
      }
    }
  };

  const renderModal = (node: React.ReactNode) => createPortal(node, document.body);

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/95 backdrop-blur-2xl p-3 sm:p-6 text-stone-100 animate-in fade-in duration-300">
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
          {/* Top Navbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl glass-panel bg-stone-900/90 border border-emerald-500/30">
            <div className="flex items-center gap-3">
              <CamLogo size="md" variant="light" showTagline={false} />
              <div className="h-6 w-px bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-heading font-bold text-stone-100 text-lg">
                  Admin Control Room
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportData}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 border border-white/10 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>GitHub / Firebase Sync</span>
              </button>

              {!isAdmin ? (
                <button
                  onClick={async () => {
                    await firebaseService.signInWithGoogle(true);
                    onRefreshData();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-950 cursor-pointer"
                >
                  <span>Sign in with Google (Admin)</span>
                </button>
              ) : (
                <button
                  onClick={async () => {
                    if (auth) await auth.signOut();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-rose-900/40 text-stone-300 hover:text-rose-300 text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit Admin</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-emerald-900/40 text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Website</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl p-5 bg-stone-900/80 border border-white/5">
              <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
                <span>Total Active Users</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-heading font-black text-stone-50">
                {stats.totalUsers.toLocaleString()}
              </div>
            </div>

            <div className="rounded-3xl p-5 bg-stone-900/80 border border-white/5">
              <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
                <span>Highland Page Views</span>
                <Eye className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-3xl font-heading font-black text-stone-50">
                {stats.pageViews.toLocaleString()}
              </div>
            </div>

            <div className="rounded-3xl p-5 bg-stone-900/80 border border-white/5">
              <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
                <span>New Signups</span>
                <UserPlus className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-3xl font-heading font-black text-stone-50">
                +{stats.newSignups}
              </div>
            </div>

            <div className="rounded-3xl p-5 bg-stone-900/80 border border-white/5">
              <div className="flex items-center justify-between text-stone-400 text-xs mb-2">
                <span>Support Tickets</span>
                <Ticket className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-heading font-black text-stone-50">
                {stats.supportTickets}
              </div>
            </div>
          </div>

          {/* Actions Grid */}
          <div className="p-6 rounded-3xl bg-stone-900/90 border border-emerald-500/20">
            <h4 className="text-base font-bold text-stone-100 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Management Actions</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button
                onClick={handleOpenAddPlace}
                className="p-4 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Add New Place</span>
              </button>

              <button
                onClick={handleOpenAddGallery}
                className="p-4 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer"
              >
                <ImageIcon className="w-5 h-5" />
                <span>Add Gallery Photo</span>
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('admin-townships-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="p-4 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-bold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer"
              >
                <Building2 className="w-5 h-5" />
                <span>Township Hubs (9)</span>
              </button>

              <button
                onClick={() => setShowAddEventModal(true)}
                className="p-4 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 font-bold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer"
              >
                <Calendar className="w-5 h-5" />
                <span>Add Event</span>
              </button>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="p-4 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer"
              >
                <Users className="w-5 h-5" />
                <span>Add User</span>
              </button>

              <button
                onClick={() => setShowGsapModal(true)}
                className="p-4 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer"
              >
                <ImageIcon className="w-5 h-5" />
                <span>GSAP Card Backgrounds</span>
              </button>

              <button
                onClick={() => setShowFarmTicketModal(true)}
                className="p-4 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-bold text-xs flex flex-col items-center gap-2 transition-all cursor-pointer"
              >
                <Ticket className="w-5 h-5" />
                <span>Manage Farm Tickets</span>
              </button>
            </div>
          </div>

          {/* Real-Time Registered Users Management Table */}
          <div className="p-5 rounded-3xl bg-stone-900/80 border border-purple-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Registered App Users ({liveUsers.length} live users)</span>
              </h4>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="text-xs text-purple-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-stone-900">
                  <tr className="border-b border-white/10 text-stone-400">
                    <th className="py-2">Full Name</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {liveUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-stone-500 italic">
                        No registered users found yet. Any new user sign-in requiring @gmail.com will appear here live.
                      </td>
                    </tr>
                  ) : (
                    liveUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5">
                        <td className="py-2.5 font-bold text-stone-200">
                          {u.fullName || u.displayName || 'User'}
                        </td>
                        <td className="text-stone-400 font-mono">
                          {u.email}
                        </td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {u.role || 'user'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.isBlocked
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {u.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td className="text-right py-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedUserForView(u)}
                              className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold flex items-center gap-1 transition-colors cursor-pointer border border-white/10"
                              title="View Details"
                            >
                              <Eye className="w-3 h-3 text-cyan-400" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleBlock(u)}
                              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                                u.isBlocked
                                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {u.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleRole(u)}
                              className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-[11px] transition-colors cursor-pointer border border-blue-500/30"
                              title="Toggle Role"
                            >
                              Role
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(u)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer border border-rose-500/20"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendor Onboarding & SSM Business Verification Queue */}
          <div className="p-5 rounded-3xl bg-stone-900/80 border border-emerald-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>SSM Business Verification & Vendor Approval Queue ({vendorListingsState.length} Listings)</span>
                </h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Review submitted SSM registration numbers & MDCH licenses. Granting verified status awards the green Verified Local Business shield.
                </p>
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-950 border border-white/10 text-xs">
                {(['all', 'pending', 'verified', 'rejected'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setVendorFilter(filter)}
                    className={`px-3 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                      vendorFilter === filter
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {filter} ({filter === 'all' ? vendorListingsState.length : vendorListingsState.filter(v => v.verificationStatus === filter).length})
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-stone-900 z-10">
                  <tr className="border-b border-white/10 text-stone-400">
                    <th className="py-2.5">Business Name &amp; Township</th>
                    <th>SSM &amp; MDCH Reg No.</th>
                    <th>Owner Email / WhatsApp</th>
                    <th>Doc Preview</th>
                    <th>Status</th>
                    <th>Booking Activation</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {vendorListingsState.filter(v => vendorFilter === 'all' || v.verificationStatus === vendorFilter).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-500 italic">
                        No vendor submissions match the "{vendorFilter}" filter.
                      </td>
                    </tr>
                  ) : (
                    vendorListingsState
                      .filter(v => vendorFilter === 'all' || v.verificationStatus === vendorFilter)
                      .map((vendor) => (
                        <tr key={vendor.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3">
                            <div className="font-bold text-stone-100">{vendor.businessName}</div>
                            <div className="text-[10px] text-emerald-400 font-mono">{vendor.township} · {vendor.category}</div>
                          </td>
                          <td>
                            <div className="font-mono text-stone-300 font-semibold">{vendor.ssmNumber || 'Not submitted'}</div>
                            {vendor.mdchLicense && <div className="text-[10px] font-mono text-stone-400">MDCH: {vendor.mdchLicense}</div>}
                          </td>
                          <td>
                            <div className="text-stone-300 truncate max-w-[150px]">{vendor.ownerEmail}</div>
                            <a
                              href={`https://wa.me/${vendor.whatsappNumber.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <span>WA: {vendor.whatsappNumber}</span>
                            </a>
                          </td>
                          <td>
                            {vendor.verificationDocUrl ? (
                              <a
                                href={vendor.verificationDocUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-mono inline-block border border-white/10"
                              >
                                View Doc
                              </a>
                            ) : (
                              <span className="text-stone-600 text-[10px] italic">No doc</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                vendor.verificationStatus === 'verified'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : vendor.verificationStatus === 'pending'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {vendor.verificationStatus === 'verified' && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                              <span className="capitalize">{vendor.verificationStatus}</span>
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleToggleBookingActivation(vendor)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                                (vendor.isBookingEnabled ?? (vendor.verificationStatus === 'verified'))
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40'
                                  : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40'
                              }`}
                              title="Click to toggle Marketplace Booking Activation for this vendor"
                            >
                              {(vendor.isBookingEnabled ?? (vendor.verificationStatus === 'verified')) ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-emerald-300" />
                                  <span>Booking Active</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>Booking Disabled</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="text-right py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {vendor.verificationStatus !== 'verified' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveVendor(vendor)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors cursor-pointer shadow"
                                >
                                  Approve Badge
                                </button>
                              )}
                              {vendor.verificationStatus !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => handleRejectVendor(vendor)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/30 font-bold text-[10px] transition-colors cursor-pointer"
                                >
                                  Reject
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteVendor(vendor.id, vendor.businessName)}
                                className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer border border-rose-500/20"
                                title="Delete Listing"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 1: Directory Places Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 p-5 rounded-3xl bg-stone-900/80 border border-white/5 space-y-4">
              <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Recent Activity Feed</span>
              </h4>
              <div className="space-y-3">
                {recentActivities.length === 0 ? (
                  <div className="text-xs text-stone-500 italic p-4 text-center bg-stone-950/40 rounded-2xl border border-white/5">
                    No recent activity yet. Add places, gallery photos, or events to see live entries here.
                  </div>
                ) : (
                  recentActivities.map((act, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-stone-950/60 border border-white/5 text-xs"
                    >
                      <div className="text-stone-200 font-medium">{act.title}</div>
                      <div className="text-[10px] text-stone-500 font-mono mt-1">{act.time}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-8 p-5 rounded-3xl bg-stone-900/80 border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-stone-100">
                  Directory Places ({places.length} active listings)
                </h4>
                <button
                  onClick={handleOpenAddPlace}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Place</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-stone-900">
                    <tr className="border-b border-white/10 text-stone-400">
                      <th className="py-2">Name</th>
                      <th>Category</th>
                      <th>Township</th>
                      <th>Elevation</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {places.map((p) => (
                      <tr key={p.id} className="hover:bg-white/5">
                        <td className="py-2.5 font-bold text-stone-200">{p.name}</td>
                        <td className="capitalize text-stone-400">{p.category}</td>
                        <td className="text-emerald-400">{p.township}</td>
                        <td className="font-mono text-stone-400">{p.elevation}</td>
                        <td className="text-right py-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPlace(p)}
                              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                              title="Edit Place"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Delete "${p.name}"?`)) {
                                  await firebaseService.deletePlace(p.id);
                                  addActivity(`Deleted place: ${p.name}`);
                                  onRefreshData();
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                              title="Delete Place"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Gallery Management Table */}
          <div className="p-5 rounded-3xl bg-stone-900/80 border border-cyan-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Gallery Management ({gallery.length} photos)</span>
              </h4>
              <button
                onClick={handleOpenAddGallery}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Photo</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-stone-900">
                  <tr className="border-b border-white/10 text-stone-400">
                    <th className="py-2">Preview</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Township</th>
                    <th>Elevation</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {gallery
                    .filter(
                      (item, index, self) => index === self.findIndex((t) => t.id === item.id)
                    )
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-white/5">
                        <td className="py-2">
                          <img
                            src={item.thumbnailUrl || item.imageUrl}
                            alt={item.title}
                            className="w-10 h-10 rounded-lg object-cover border border-white/10"
                          />
                        </td>
                        <td className="font-bold text-stone-200">{item.title}</td>
                        <td className="text-cyan-300">{item.category}</td>
                        <td className="text-stone-300">{item.township}</td>
                        <td className="font-mono text-stone-400">{item.elevation}</td>
                        <td className="text-right py-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditGallery(item)}
                              className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                              title="Edit Photo Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Delete photo "${item.title}"?`)) {
                                  await firebaseService.deleteGalleryItem(item.id);
                                  addActivity(`Deleted gallery photo: ${item.title}`);
                                  onRefreshData();
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Dedicated Township Hubs & Facilities Management (9 Townships) */}
          <div
            id="admin-townships-section"
            className="p-5 sm:p-6 rounded-3xl bg-stone-900/80 border border-blue-500/30 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  <span>Township Hubs &amp; Facilities Management (9 Townships)</span>
                </h4>
                <p className="text-xs text-stone-400 mt-0.5">
                  Manage clinics/hospitals, police stations, public restrooms, gas stations, cover
                  images, and attractions for each township.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono text-xs self-start sm:self-auto">
                9 Active Hubs
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_9_TOWNSHIPS.map((townName) => {
                const custom = townshipHubs[townName];
                const defaultPortal = TOWNSHIP_PORTALS.find((t) => t.name === townName);
                const isCustom = !!custom;
                const img = custom?.imageUrl || defaultPortal?.imageUrl || FALLBACK_IMAGE;
                const desc =
                  custom?.description || defaultPortal?.description || `${townName} highland hub.`;
                const clinics =
                  custom?.clinicsOrHospitals || defaultPortal?.hospital || 'Local Clinic / Hospital';
                const police =
                  custom?.policeStation || defaultPortal?.police || `Balai Polis ${townName}`;
                const toilet =
                  custom?.publicToilet || defaultPortal?.publicToilet || 'Available in town center';
                const gas = custom?.gasStation || defaultPortal?.gasStation || 'Petrol station nearby';
                const attractions =
                  custom?.placesOfInterest || defaultPortal?.keyAttractions || ['Scenic Spots'];

                return (
                  <div
                    key={townName}
                    className="rounded-3xl p-4 bg-stone-950/70 border border-white/10 flex flex-col justify-between hover:border-blue-500/40 transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="relative w-full h-36 rounded-2xl overflow-hidden">
                        <img
                          src={img}
                          alt={townName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-2.5 right-2.5">
                          {isCustom ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/85 backdrop-blur-md text-stone-950 font-bold text-[10px]">
                              Customized
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-stone-800/80 backdrop-blur-md text-stone-300 text-[10px]">
                              Default System
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-2.5 left-3 right-3">
                          <h5 className="font-bold text-white text-base leading-tight drop-shadow">
                            {townName}
                          </h5>
                          <p className="text-[11px] text-stone-300 line-clamp-1 mt-0.5 drop-shadow">
                            {desc}
                          </p>
                        </div>
                      </div>

                      {/* Facilities Preview */}
                      <div className="p-3 rounded-2xl bg-stone-900/90 border border-white/5 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="text-stone-300 font-semibold truncate">
                            <strong className="text-stone-400 font-normal">Clinic: </strong>
                            {clinics}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span className="text-stone-300 font-semibold truncate">
                            <strong className="text-stone-400 font-normal">Police: </strong>
                            {police}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-stone-300 font-semibold truncate">
                            <strong className="text-stone-400 font-normal">Toilet: </strong>
                            {toilet}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Fuel className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-stone-300 font-semibold truncate">
                            <strong className="text-stone-400 font-normal">Gas: </strong>
                            {gas}
                          </span>
                        </div>
                      </div>

                      {/* Places of Interest */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-500 block mb-1">
                          Places of Interest
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-14 overflow-hidden">
                          {(Array.isArray(attractions) ? attractions : [attractions])
                            .slice(0, 3)
                            .map((attr, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-lg bg-stone-900 text-stone-300 text-[10px] border border-white/5"
                              >
                                {attr}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenEditTownship(townName);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Info &amp; Image</span>
                      </button>
                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleResetTownship(townName);
                          }}
                          className="p-2 rounded-xl bg-stone-800 hover:bg-rose-950/40 text-stone-400 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer"
                          title="Reset to default initial info"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ============================ MODALS ============================ */}

      {/* Modal: Add/Edit Place */}
      {showAddPlaceModal &&
        renderModal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200"
          >
            <div
              className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-stone-900 border border-emerald-500/40 shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-stone-900/95 backdrop-blur-md z-30 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-heading font-extrabold text-stone-100">
                      {editingPlaceId ? 'Edit Place' : 'Add New Place'}
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      Verified Highland Directory Entry &amp; GPS Navigator Pin
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPlaceModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/10 transition-colors"
                  title="Close Form"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5 flex-1 [scrollbar-width:thin] [scrollbar-color:#059669_transparent]">
                <form 
                  onSubmit={handleSavePlace} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                      e.preventDefault();
                    }
                  }}
                  className="space-y-4"
                >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">
                      Place Name (EN)
                    </label>
                    <input
                      required
                      type="text"
                      value={placeName}
                      onChange={(e) => setPlaceName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">
                      Place Name (BM)
                    </label>
                    <input
                      type="text"
                      value={placeNameBm}
                      onChange={(e) => setPlaceNameBm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Township</label>
                    <select
                      value={placeTownship}
                      onChange={(e) => setPlaceTownship(e.target.value as Township)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    >
                      {ALL_9_TOWNSHIPS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Main Category</label>
                    <select
                      value={placeCategory}
                      onChange={(e) => handleCategoryChange(e.target.value as MainCategory)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    >
                      <option value="services_utilities">Services & Utilities</option>
                      <option value="food">Food & Beverages</option>
                      <option value="travel_tourism">Travel & Highland Tourism</option>
                      <option value="accommodation">Accommodation</option>
                      <option value="transport">Transport & Mobility Services</option>
                      <option value="local_services">Local Services & Amenities</option>
                      <option value="shopping">Shopping & Local Produce</option>
                      <option value="masjid_surau">Masjid & Surau</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">
                      Sub-Category
                    </label>
                    <select
                      value={placeSubCategory}
                      onChange={(e) => setPlaceSubCategory(e.target.value as SubCategory)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    >
                      {subCategoryOptions[placeCategory]?.map((sub) => (
                        <option key={sub.key} value={sub.key}>
                          {sub.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Latitude</label>
                    <input
                      type="text"
                      value={placeLat}
                      onChange={(e) => setPlaceLat(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Longitude</label>
                    <input
                      type="text"
                      value={placeLng}
                      onChange={(e) => setPlaceLng(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-stone-300 block mb-1">
                      Place Image (Paste Web URL or Upload File)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/... or paste image URL"
                        value={placeImageUrl}
                        onChange={(e) => setPlaceImageUrl(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                      />
                      <label className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-white/10 text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Local Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, setPlaceImageUrl)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={placeContact}
                      onChange={(e) => setPlaceContact(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                </div>

                {placeImageUrl && (
                  <div className="w-full">
                    <label className="text-xs font-bold text-stone-300 block mb-1">
                      Image Preview
                    </label>
                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10 bg-stone-800 flex items-center justify-center">
                      <img src={placeImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Location Address
                  </label>
                  <input
                    type="text"
                    value={placeLocation}
                    onChange={(e) => setPlaceLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                  />
                </div>

                {/* Daily Operating Hours */}
                <div className="p-4 rounded-2xl bg-stone-900/90 border border-white/10 space-y-4 shadow-inner">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-sm font-bold text-stone-100">
                          Daily Operating Schedule (Monday – Sunday)
                        </h4>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Set custom opening and closing times per day. Toggle "Closed" for non-operating days.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleCopyDayToAll('Monday')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-emerald-400" />
                        <span>Copy Mon to All</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePresetWeekdays}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/10 transition cursor-pointer"
                      >
                        Weekdays Only
                      </button>
                      <button
                        type="button"
                        onClick={handlePresetAllOpen}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-emerald-500/20 transition cursor-pointer"
                      >
                        All 7 Days Open
                      </button>
                      <button
                        type="button"
                        onClick={handlePresetAll24Hours}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/20 transition cursor-pointer"
                      >
                        24 Hours
                      </button>
                    </div>
                  </div>

                  {copySuccessDay && (
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied {copySuccessDay}'s schedule to all days successfully!</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {weeklySchedule.map((schedule) => {
                      const isClosed = !schedule.isOpen || isPlaceClosed;
                      const formattedFrom = formatTimeTo12Hour(schedule.from);
                      const formattedTo = formatTimeTo12Hour(schedule.to);

                      return (
                        <div
                          key={schedule.day}
                          className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                            isClosed
                              ? 'bg-rose-950/20 border-rose-900/30 opacity-80'
                              : 'bg-stone-800/80 border-white/5 hover:border-white/15'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                            <div className="flex items-center justify-between md:justify-start gap-3 min-w-[170px]">
                              <span className={`text-xs font-bold ${isClosed ? 'text-stone-400 line-through' : 'text-stone-100'}`}>
                                {schedule.day}
                              </span>

                              <button
                                type="button"
                                disabled={isPlaceClosed}
                                onClick={() => handleDayToggle(schedule.day)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                  schedule.isOpen && !isPlaceClosed
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    schedule.isOpen && !isPlaceClosed ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                                  }`}
                                />
                                {schedule.isOpen && !isPlaceClosed ? 'OPEN' : 'CLOSED'}
                              </button>
                            </div>

                            <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-3">
                              {schedule.isOpen && !isPlaceClosed ? (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] uppercase font-bold text-stone-400">Opens</label>
                                    <input
                                      type="time"
                                      value={schedule.from}
                                      onChange={(e) => handleDayTimeChange(schedule.day, 'from', e.target.value)}
                                      className="px-2 py-1 rounded-lg bg-stone-900 border border-white/10 text-xs text-stone-100 font-mono outline-none focus:border-emerald-500 transition"
                                    />
                                    <span className="text-[11px] font-mono text-emerald-400 font-bold bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                      {formattedFrom}
                                    </span>
                                  </div>

                                  <span className="text-stone-500 font-bold text-xs">to</span>

                                  <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] uppercase font-bold text-stone-400">Closes</label>
                                    <input
                                      type="time"
                                      value={schedule.to}
                                      onChange={(e) => handleDayTimeChange(schedule.day, 'to', e.target.value)}
                                      className="px-2 py-1 rounded-lg bg-stone-900 border border-white/10 text-xs text-stone-100 font-mono outline-none focus:border-emerald-500 transition"
                                    />
                                    <span className="text-[11px] font-mono text-emerald-400 font-bold bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                      {formattedTo}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center justify-between w-full py-1">
                                  <span className="text-xs text-rose-300 font-semibold flex items-center gap-1.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400" />
                                    Closed all day on {schedule.day}
                                  </span>
                                </div>
                              )}
                            </div>

                            {schedule.isOpen && !isPlaceClosed && (
                              <button
                                type="button"
                                onClick={() => handleCopyDayToAll(schedule.day)}
                                className="text-[10px] text-stone-400 hover:text-emerald-300 hover:bg-stone-700/60 p-1.5 rounded-md transition flex items-center gap-1 self-end md:self-auto cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span className="hidden sm:inline">Apply to all</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 text-xs">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-stone-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isOpen24Hours}
                          disabled={isPlaceClosed}
                          onChange={(e) => {
                            setIsOpen24Hours(e.target.checked);
                            if (e.target.checked) handlePresetAll24Hours();
                          }}
                          className="rounded border-white/20 bg-stone-800 text-emerald-500 focus:ring-0"
                        />
                        <span className="font-semibold">Mark 24 Hours Everywhere</span>
                      </label>

                      <label className="flex items-center gap-2 text-rose-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPlaceClosed}
                          onChange={(e) => setIsPlaceClosed(e.target.checked)}
                          className="rounded border-rose-500/40 bg-stone-800 text-rose-500 focus:ring-0"
                        />
                        <span className="font-bold">Temporarily Closed (All Days)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Check-In / Check-Out Toggle Section */}
                <div className="p-4 rounded-2xl bg-stone-800/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-100 block">Enable Check-In / Check-Out Times</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasCheckTimes(!hasCheckTimes)}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 cursor-pointer ${
                        hasCheckTimes ? 'bg-emerald-600' : 'bg-stone-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                          hasCheckTimes ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {hasCheckTimes && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-xs font-bold text-stone-300 block mb-1">Check-in</label>
                        <input
                          type="time"
                          value={placeCheckIn}
                          onChange={(e) => setPlaceCheckIn(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-stone-300 block mb-1">Check-out</label>
                        <input
                          type="time"
                          value={placeCheckOut}
                          onChange={(e) => setPlaceCheckOut(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Itinerary Planner Visibility Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-800/40 border border-emerald-500/20 group hover:border-emerald-500/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl transition-colors ${placeIncludeInPlanner ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-500'}`}>
                      <Navigation className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-100">Show in Itinerary Planner</h4>
                      <p className="text-[10px] text-stone-400">If enabled, this place will appear as a selectable activity in the AI Itinerary Planner.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlaceIncludeInPlanner(!placeIncludeInPlanner)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${placeIncludeInPlanner ? 'bg-emerald-600' : 'bg-stone-700'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${placeIncludeInPlanner ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Description (EN)</label>
                    <textarea
                      required
                      rows={2}
                      value={placeDescription}
                      onChange={(e) => setPlaceDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Description (BM)</label>
                    <textarea
                      required
                      rows={2}
                      value={placeDescriptionBm}
                      onChange={(e) => setPlaceDescriptionBm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={placeTags}
                    onChange={(e) => setPlaceTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddPlaceModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-300 hover:text-white cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer shadow-lg shadow-emerald-950/60 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4 inline mr-1" />
                    <span>Save Place</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

     {/* Modal: Add/Edit Gallery Photo */}
      {showGalleryModal &&
        renderModal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 my-auto bg-stone-900 border border-cyan-500/30 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 sticky top-0 bg-stone-900/95 backdrop-blur-md z-30 pt-1">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-xl font-heading font-extrabold text-stone-100">
                    {editingGalleryId ? 'Edit Gallery Photo' : 'Add Gallery Photo'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowGalleryModal(false);
                    setEditingGalleryId(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>

              <form 
                onSubmit={handleSaveGallery} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'submit') {
                    e.preventDefault();
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Title</label>
                    <input
                      required
                      type="text"
                      value={galleryTitle}
                      onChange={(e) => setGalleryTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Category</label>
                    <select
                      value={galleryCategory}
                      onChange={(e) => setGalleryCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    >
                      <option value="Agricultural">Agricultural</option>
                      <option value="Nature">Nature</option>
                      <option value="Food & Culture">Food & Culture</option>
                      <option value="Agritourism">Agritourism</option>
                      <option value="Architecture">Architecture</option>
                      <option value="Attractions">Attractions</option>
                      <option value="Scenic Escapes">Scenic Escapes</option>
                      <option value="Under the Sun">Under the Sun</option>
                      <option value="Shopping">Shopping</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Elevation</label>
                    <input
                      type="text"
                      value={galleryElevation}
                      onChange={(e) => setGalleryElevation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Location Township</label>
                    <select
                      value={galleryTownship}
                      onChange={(e) => setGalleryTownship(e.target.value as Township)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    >
                      {[
                        'Ringlet',
                        'Bertam Valley',
                        'Tanah Rata',
                        'Brinchang',
                        'Kea Farm',
                        'Tringkap',
                        'Kuala Terla',
                        'Kampung Raja',
                        'Blue Valley'
                      ].map((town) => (
                        <option key={town} value={town}>{town}</option>
                      ))}
                    </select>
                  </div>
                </div>

              <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Image (Paste URL or Upload File)</label>
                  <input
                    type="url"
                    value={galleryImageUrl}
                    onChange={(e) => setGalleryImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... (Paste image URL)"
                    className="w-full px-3 py-2 mb-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setGalleryImageUrl)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none text-stone-400 cursor-pointer"
                  />
                </div>

                {galleryImageUrl && (
                  <div className="w-full">
                    <label className="text-xs font-bold text-stone-300 block mb-1">Image Preview</label>
                    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-white/10 bg-stone-800 flex items-center justify-center">
                      <img
                        src={galleryImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                    />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={galleryDesc}
                    onChange={(e) => setGalleryDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGalleryModal(false);
                      setEditingGalleryId(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-stone-800 text-xs text-stone-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 text-white font-bold text-xs cursor-pointer"
              >
                {editingGalleryId ? 'Update Photo' : 'Save Photo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

      {/* Modal: Event */}
      {showAddEventModal &&
        renderModal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 my-auto bg-stone-900 border border-amber-500/30 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 sticky top-0 bg-stone-900/95 backdrop-blur-md z-30 pt-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <h3 className="text-xl font-heading font-extrabold text-stone-100">Add Event</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>

              <form 
                onSubmit={handleSaveEvent} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'submit') {
                    e.preventDefault();
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Event Title</label>
                  <input
                    required
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g. Cameron Highlands Flower Festival"
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Date From</label>
                    <input
                      required
                      type="date"
                      value={eventDateFrom}
                      onChange={(e) => setEventDateFrom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Date To (Optional)</label>
                    <input
                      type="date"
                      value={eventDateTo}
                      onChange={(e) => setEventDateTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Location (Township)</label>
                  <select
                    value={eventTown}
                    onChange={(e) => setEventTown(e.target.value as Township)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                  >
                    {ALL_9_TOWNSHIPS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddEventModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-stone-800 text-xs text-stone-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs cursor-pointer"
                  >
                    Save Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Modal: User */}
      {showAddUserModal &&
        renderModal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 my-auto bg-stone-900 border border-purple-500/30 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 sticky top-0 bg-stone-900/95 backdrop-blur-md z-30 pt-1">
                <h3 className="text-xl font-heading font-extrabold text-stone-100">Add New User</h3>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>

              <form 
                onSubmit={handleSaveUser} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'submit') {
                    e.preventDefault();
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Phone Number</label>
                    <input
                      required
                      type="tel"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Email Account</label>
                  <input
                    required
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">User Type</label>
                  <select
                    value={newUserType}
                    onChange={(e) => setNewUserType(e.target.value as 'local' | 'tourist')}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none"
                  >
                    <option value="local">Local / Resident</option>
                    <option value="tourist">Tourist / Visitor</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-stone-800 text-xs text-stone-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs cursor-pointer"
                  >
                    Save User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Modal: Export */}
      {showExportModal &&
        renderModal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl p-6 my-auto bg-stone-900 border border-emerald-500/30 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-stone-100">Export JSON Structure</h3>
              </div>

              <div className="p-4 rounded-2xl bg-stone-950 font-mono text-[11px] text-emerald-300 max-h-60 overflow-y-auto border border-white/10">
                <pre>{exportDataJson}</pre>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal: Township Hub Edit */}
      {showTownshipModal &&
        renderModal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 my-auto bg-stone-900 border border-blue-500/30 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 sticky top-0 bg-stone-900/95 backdrop-blur-md z-30 pt-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-heading font-extrabold text-stone-100">
                    Edit Township Hub: {editingTownship}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTownshipModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
              <p className="text-xs text-stone-400 mb-6">
                Update essential facilities, police station, clinic/hospital, public toilet, gas
                station, places of interest, and cover image for {editingTownship}.
              </p>

              {townError && (
                <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{townError}</span>
                </div>
              )}

              <form 
                onSubmit={handleSaveTownship} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'submit') {
                    e.preventDefault();
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Township Description</label>
                  <textarea
                    rows={3}
                    value={townDesc}
                    onChange={(e) => setTownDesc(e.target.value)}
                    placeholder={`Describe ${editingTownship}...`}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Cover Image</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={townImageUrl}
                      onChange={(e) => setTownImageUrl(e.target.value)}
                      placeholder="Image URL or upload local file below"
                      className="flex-1 px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-blue-500"
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setTownImageUrl)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none cursor-pointer"
                  />
                  {townImageUrl && (
                    <div className="mt-2 relative w-full h-40 rounded-xl overflow-hidden border border-white/10 bg-stone-950">
                      <img
                        src={townImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white">
                        Cover Preview
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 mb-1">
                      <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Clinics / Hospitals Available</span>
                    </label>
                    <input
                      type="text"
                      value={townClinics}
                      onChange={(e) => setTownClinics(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>Police Station</span>
                    </label>
                    <input
                      type="text"
                      value={townPolice}
                      onChange={(e) => setTownPolice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Public Restroom / Toilet</span>
                    </label>
                    <input
                      type="text"
                      value={townToilet}
                      onChange={(e) => setTownToilet(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5 mb-1">
                      <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Gas / Petrol Station</span>
                    </label>
                    <input
                      type="text"
                      value={townGas}
                      onChange={(e) => setTownGas(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">
                    Places of Interest (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={townPlacesInterest}
                    onChange={(e) => setTownPlacesInterest(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    disabled={townSaving}
                    onClick={() => setShowTownshipModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:bg-stone-700 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={townSaving}
                    onClick={(e) => handleSaveTownship(e)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-900/50 cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {townSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Township Hub</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* GSAP Card Background Manager Modal */}
      {showGsapModal &&
        renderModal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
            onClick={() => setShowGsapModal(false)}
          >
            <div
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-stone-900 border border-purple-500/30 shadow-2xl p-6 sm:p-8 space-y-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-extrabold text-stone-100">
                      GSAP Gallery Card Background Manager
                    </h3>
                    <p className="text-xs text-stone-400">
                      Upload or paste custom background pictures for each of the 6 cards in the Advanced GSAP Looping Gallery.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGsapModal(false)}
                  className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {gsapCardsMeta.map((card) => {
                  const currentUrl = gsapImages[card.id] || GSAP_DEFAULT_BACKGROUNDS[card.id] || FALLBACK_IMAGE;
                  return (
                    <div
                      key={card.id}
                      className="bg-stone-950/80 rounded-2xl p-4 border border-white/10 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-purple-400 px-2 py-0.5 rounded-full bg-purple-500/10">
                            {card.category}
                          </span>
                          <span className="text-[10px] font-mono text-stone-400">{card.id}</span>
                        </div>
                        <h4 className="text-sm font-bold text-stone-100">{card.title}</h4>
                      </div>

                      <div className="relative h-32 rounded-xl overflow-hidden border border-white/10 bg-stone-900">
                        <img
                          src={currentUrl}
                          alt={card.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          defaultValue={currentUrl}
                          id={`gsap-url-${card.id}`}
                          placeholder="Paste image URL..."
                          className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-white/10 text-xs text-stone-100 outline-none focus:border-purple-500"
                        />
                        <div className="flex gap-2">
                          <label className="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold text-center cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-purple-400" />
                            <span>Upload File</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (!file) return;
                                try {
                                  const compressed = await compressImageFile(file, 900, 0.65);
                                  handleUpdateGsapImage(card.id, compressed);
                                  const inputEl = document.getElementById(`gsap-url-${card.id}`) as HTMLInputElement;
                                  if (inputEl) inputEl.value = compressed;
                                } catch (err) {
                                  window.alert('Failed to process image file.');
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const inputEl = document.getElementById(`gsap-url-${card.id}`) as HTMLInputElement;
                              if (inputEl) {
                                handleUpdateGsapImage(card.id, inputEl.value.trim());
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setShowGsapModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Farm Ticket Pricing Manager Modal */}
      {showFarmTicketModal &&
        renderModal(
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
            onClick={() => setShowFarmTicketModal(false)}
          >
            <div
              className="w-full max-w-5xl rounded-3xl bg-stone-900 border border-rose-500/40 shadow-2xl flex flex-col max-h-[95vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-white/10 bg-stone-900/90 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-extrabold text-stone-100">
                      Farm & Attraction Ticket Manager
                    </h3>
                    <p className="text-xs text-stone-400">Manage entry pricing for itinerary cost calculator</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFarmTicketModal(false)}
                  className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <div className="p-4 rounded-2xl bg-stone-950/70 border border-white/5 space-y-4">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      {editingTicketId ? 'Edit Ticket Pricing' : 'Add New Ticket'}
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-400 mb-1 ml-1 uppercase">Attraction Name</label>
                        <input
                          type="text"
                          value={ticketForm.name}
                          onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-white/10 text-sm text-stone-100 outline-none focus:border-rose-500 transition-colors"
                          placeholder="e.g. Cameron Flora Park"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-stone-400 mb-1 ml-1 uppercase">Detailed Location / GPS</label>
                        <input
                          type="text"
                          value={ticketForm.location || ''}
                          onChange={(e) => setTicketForm({ ...ticketForm, location: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-white/10 text-sm text-stone-100 outline-none focus:border-rose-500 transition-colors"
                          placeholder="e.g. Lot 191, Kea Farm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-stone-400 mb-1 ml-1 uppercase">Township</label>
                          <select
                            value={ticketForm.township}
                            onChange={(e) => setTicketForm({ ...ticketForm, township: e.target.value as Township })}
                            className="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-white/10 text-sm text-stone-100 outline-none focus:border-rose-500 transition-colors"
                          >
                            {ALL_9_TOWNSHIPS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-stone-400 mb-1 ml-1 uppercase">Category</label>
                          <select
                            value={ticketForm.category}
                            onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value as any })}
                            className="w-full px-3 py-2.5 rounded-xl bg-stone-900 border border-white/10 text-sm text-stone-100 outline-none focus:border-rose-500 transition-colors"
                          >
                            <option value="attraction">Attraction</option>
                            <option value="farm">Farm</option>
                            <option value="tea_plantation">Tea Plantation</option>
                            <option value="museum">Museum</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-900/50 border border-white/5">
                        <input
                          type="checkbox"
                          id="isFree"
                          checked={ticketForm.isFree}
                          onChange={(e) => setTicketForm({ ...ticketForm, isFree: e.target.checked })}
                          className="w-4 h-4 rounded border-white/10 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                        <label htmlFor="isFree" className="text-xs font-bold text-stone-200 cursor-pointer select-none">Free Admission</label>
                      </div>

                      {!ticketForm.isFree && (
                        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                          <div>
                            <label className="block text-[10px] font-bold text-stone-400 mb-1 ml-1 uppercase">Adult Price (RM)</label>
                            <input
                              type="number"
                              value={ticketForm.adultPriceRm}
                              onChange={(e) => setTicketForm({ ...ticketForm, adultPriceRm: Number(e.target.value) })}
                              className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-white/10 text-sm text-stone-100 outline-none focus:border-rose-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-stone-400 mb-1 ml-1 uppercase">Child Price (RM)</label>
                            <input
                              type="number"
                              value={ticketForm.childPriceRm}
                              onChange={(e) => setTicketForm({ ...ticketForm, childPriceRm: Number(e.target.value) })}
                              className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-white/10 text-sm text-stone-100 outline-none focus:border-rose-500 transition-colors"
                            />
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={handleSaveTicket}
                          disabled={!ticketForm.name}
                          className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>{editingTicketId ? 'Update Record' : 'Create Record'}</span>
                        </button>
                        {editingTicketId && (
                          <button
                            onClick={handleOpenAddTicket}
                            className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                   <div className="flex items-center justify-between">
                     <h4 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                       <Layers className="w-4 h-4 text-rose-400" />
                       <span>Current Ticket Records ({farmTickets.length})</span>
                     </h4>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {farmTickets.length === 0 ? (
                       <div className="col-span-full py-12 text-center bg-stone-950/50 rounded-3xl border border-dashed border-white/10">
                         <Ticket className="w-10 h-10 text-stone-700 mx-auto mb-3 opacity-20" />
                         <p className="text-sm text-stone-500 italic">No ticket records found. Create one on the left.</p>
                       </div>
                     ) : (
                       farmTickets.map((ticket) => (
                         <div 
                           key={ticket.id} 
                           className={`p-4 rounded-2xl border transition-all ${
                             editingTicketId === ticket.id 
                               ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/20' 
                               : 'bg-stone-950/70 border-white/10 hover:border-white/20'
                           }`}
                         >
                           <div className="flex justify-between items-start mb-3">
                             <div>
                               <div className="flex items-center gap-1.5 mb-1">
                                 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${ticket.isFree ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                   {ticket.isFree ? 'FREE' : 'PAID'}
                                 </span>
                               </div>
                               <h5 className="text-sm font-bold text-stone-100 leading-tight">{ticket.name}</h5>
                               <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                                 <MapPin className="w-3 h-3" />
                                 {ticket.township}
                               </p>
                             </div>
                             <div className="text-right">
                               {!ticket.isFree && (
                                 <div className="text-[10px] font-mono text-amber-400 font-bold">
                                   RM{ticket.adultPriceRm} / RM{ticket.childPriceRm}
                                 </div>
                               )}
                               <div className="flex items-center gap-1 mt-2">
                                 <button
                                   onClick={() => handleOpenEditTicket(ticket)}
                                   className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
                                 >
                                   <Edit3 className="w-3 h-3" />
                                 </button>
                                 <button
                                   onClick={() => handleDeleteTicket(ticket.id)}
                                   className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-900/40 text-stone-400 hover:text-rose-400 transition-colors"
                                 >
                                   <Trash2 className="w-3 h-3" />
                                 </button>
                               </div>
                             </div>
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-stone-950/60 flex justify-end sticky bottom-0">
                <button
                  onClick={() => setShowFarmTicketModal(false)}
                  className="px-6 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all cursor-pointer border border-white/5"
                >
                  Close Manager
                </button>
              </div>
            </div>
          </div>
        )}

      {/* View User Details Modal */}
      {selectedUserForView &&
        renderModal(
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
            onClick={() => setSelectedUserForView(null)}
          >
            <div
              className="w-full max-w-lg rounded-3xl bg-stone-900 border border-purple-500/40 shadow-2xl p-6 space-y-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-extrabold text-stone-100">
                      User Profile Details
                    </h3>
                    <p className="text-xs text-stone-400">Registered Cameron Highlands App User</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserForView(null)}
                  className="p-2 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-stone-950/70 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 font-medium">Full Name:</span>
                    <span className="font-bold text-stone-100 text-sm">
                      {selectedUserForView.fullName || selectedUserForView.displayName || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 font-medium">Email Address:</span>
                    <span className="font-mono font-bold text-purple-300">
                      {selectedUserForView.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => handleToggleBlock(selectedUserForView)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                    selectedUserForView.isBlocked
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {selectedUserForView.isBlocked ? 'Unblock Account' : 'Block Account'}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleRole(selectedUserForView)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Toggle Admin Role
                </button>

                <button
                  type="button"
                  onClick={() => handleRemoveUser(selectedUserForView)}
                  className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Delete User
                </button>

                <button
                  onClick={() => setSelectedUserForView(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
};