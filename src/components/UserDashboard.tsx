import React, { useState, useRef, useEffect } from 'react';
import { Place, Language, JobClassified, Township, ItineraryPlan } from '../types';
import { INITIAL_JOBS } from '../data/initialData';
import { UserProfile, firebaseService } from '../services/firebase';
import { CamLogo } from './CamLogo';
import {
  Bookmark,
  Calendar,
  Heart,
  LogOut,
  CheckCircle,
  X,
  Plus,
  Briefcase,
  Trash2,
  Edit3,
  User,
  Camera,
  Save,
  Upload,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  ExternalLink,
  MapPin,
  Lock,
  Unlock,
  Check,
  Compass,
} from 'lucide-react';
import { EmergencyCardSection } from './EmergencyCardSection';
import { SyncStatusIndicator } from './SyncStatusIndicator';



interface UserDashboardProps {
  currentUser: UserProfile;
  language: Language;
  places: Place[];
  onClose: () => void;
  onSelectPlaceForMap: (place: Place) => void;
  onToggleBookmark: (placeId: string) => void;
  initialTab?: 'bookmarks' | 'itinerary' | 'classifieds' | 'profile' | 'emergency-card' | 'online-payment';
}

interface AvatarProcessResult {
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  aspectRatioLabel: string;
}

const compressAndAdaptAvatar = (
  file: File,
  size = 300,
  quality = 0.88
): Promise<AvatarProcessResult> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read avatar file'));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onerror = () =>
        resolve({
          dataUrl: src,
          originalWidth: size,
          originalHeight: size,
          aspectRatioLabel: 'Square (1:1)',
        });
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          let aspectLabel = 'Square (1:1)';
          if (w > h) {
            aspectLabel = `Landscape (${w}:${h}) → Auto-Fit`;
          } else if (h > w) {
            aspectLabel = `Portrait (${w}:${h}) → Auto-Fit`;
          }

          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve({
              dataUrl: src,
              originalWidth: w,
              originalHeight: h,
              aspectRatioLabel: aspectLabel,
            });
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Mathematical center-crop into 300x300 square canvas
          const minDim = Math.min(w, h);
          const sx = (w - minDim) / 2;
          const sy = (h - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', quality),
            originalWidth: w,
            originalHeight: h,
            aspectRatioLabel: aspectLabel,
          });
        } catch {
          resolve({
            dataUrl: src,
            originalWidth: size,
            originalHeight: size,
            aspectRatioLabel: 'Square (1:1)',
          });
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });

interface MobileModalHeaderProps {
  title: string;
  language: Language;
  onClose: () => void;
}

const MobileModalHeader: React.FC<MobileModalHeaderProps> = ({ title, language, onClose }) => (
  <div className="md:hidden sticky top-0 z-40 flex items-center justify-between p-3 mb-4 rounded-2xl bg-stone-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md">
    <button
      type="button"
      onClick={onClose}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-white/10 active:scale-95 transition-all cursor-pointer"
      title="Return to Main Dashboard"
    >
      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
      <span className="text-[11px] font-medium">{language === 'bm' ? 'Papan Pemuka' : 'Dashboard'}</span>
    </button>
    <span className="text-xs font-bold text-white truncate px-2">{title}</span>
    <button
      type="button"
      onClick={onClose}
      className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white border border-white/15 cursor-pointer transition-colors shrink-0 shadow-md active:scale-95 flex items-center justify-center"
      aria-label="Close modal and return to main user dashboard"
      title="Close modal and return to dashboard"
    >
      <X className="w-5 h-5 text-emerald-400" />
    </button>
  </div>
);

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  language,
  places,
  onClose,
  onSelectPlaceForMap,
  onToggleBookmark,
  initialTab = 'bookmarks',
}) => {
  const isLocalUser = Boolean(currentUser.isLocal) || currentUser.email === 'ayahsyirah77@gmail.com';
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'itinerary' | 'classifieds' | 'profile' | 'emergency-card' | 'online-payment'>(
    initialTab === 'itinerary' && isLocalUser ? 'profile' : initialTab
  );
  const [mobileActiveModal, setMobileActiveModal] = useState<
    'bookmarks' | 'itinerary' | 'classifieds' | 'profile' | 'emergency-card' | 'online-payment' | null
  >(() => (initialTab === 'emergency-card' ? 'emergency-card' : null));
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dashboardContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuContainerRef = useRef<HTMLDivElement>(null);

  // Close mobile hamburger menu when user clicks or taps outside, or presses Escape
  useEffect(() => {
    if (!showMobileMenu) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        mobileMenuContainerRef.current &&
        !mobileMenuContainerRef.current.contains(event.target as Node)
      ) {
        setShowMobileMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMobileMenu(false);
      }
    };

    // Use capture phase so outside clicks are caught even if other elements stop propagation
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, { capture: true, passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMobileMenu]);

  // Sync tab if initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      const tab = initialTab === 'itinerary' && isLocalUser ? 'profile' : initialTab;
      setActiveTab(tab);
      if (initialTab === 'emergency-card') {
        setMobileActiveModal('emergency-card');
      }
    }
  }, [initialTab, isLocalUser]);

  // Global listener to immediately switch to emergency card when requested
  useEffect(() => {
    const handleSwitchEmergency = () => {
      setActiveTab('emergency-card');
      setMobileActiveModal('emergency-card');
    };
    window.addEventListener('open-emergency-card', handleSwitchEmergency);
    return () => window.removeEventListener('open-emergency-card', handleSwitchEmergency);
  }, []);

  // Smooth scroll to top of dashboard whenever tab switches
  useEffect(() => {
    if (dashboardContainerRef.current) {
      dashboardContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);

  // Profile & Address State (New Security Measure: Visitor vs Local)
  const [editName, setEditName] = useState(currentUser.displayName);
  const [editFullName, setEditFullName] = useState(currentUser.fullName || currentUser.displayName);
  const [editEmail, setEditEmail] = useState(currentUser.email);
  const [editContact, setEditContact] = useState(currentUser.contactNumber || '');
  const [editIsLocal, setEditIsLocal] = useState<boolean>(currentUser.isLocal ?? false);
  const [editStreet, setEditStreet] = useState<string>((currentUser as any).street || currentUser.address || '');
  const [editPostcode, setEditPostcode] = useState<string>((currentUser as any).postcode || '39000');
  const [editTown, setEditTown] = useState<Township>((currentUser as any).town || 'Tanah Rata');
  const [editDistrict, setEditDistrict] = useState<string>((currentUser as any).district || '');
  const [editState, setEditState] = useState<string>((currentUser as any).state || 'Perak');
  const [editPhotoUrl, setEditPhotoUrl] = useState(currentUser.photoURL || '');
  const [profileSuccessMessage, setProfileSuccessMessage] = useState('');
  const [profileErrorMessage, setProfileErrorMessage] = useState('');
  const [uploadMeta, setUploadMeta] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Itinerary Saved Data State
  const [savedItinerary, setSavedItinerary] = useState<ItineraryPlan | null>(() => firebaseService.getItinerary());
  const [showClearItineraryModal, setShowClearItineraryModal] = useState(false);
  const [itineraryNoticeMessage, setItineraryNoticeMessage] = useState('');

  const handleClearItinerary = () => {
    firebaseService.clearItinerary();
    setSavedItinerary(null);
    setShowClearItineraryModal(false);
    setItineraryNoticeMessage(
      language === 'bm'
        ? 'Semua data jadual perjalanan yang disimpan telah dipadamkan dengan jayanya!'
        : 'All saved trip itinerary data cleared successfully!'
    );
    setTimeout(() => setItineraryNoticeMessage(''), 4000);
  };

  const processFile = async (file: File) => {
    setProfileErrorMessage('');
    if (!file.type.startsWith('image/')) {
      setProfileErrorMessage('Please select a valid image file (JPG, PNG, WEBP, GIF, etc.).');
      setTimeout(() => setProfileErrorMessage(''), 4000);
      return;
    }
    try {
      const downloadUrl = await firebaseService.uploadImage(file, 'user_avatars');
      setEditPhotoUrl(downloadUrl);
      setUploadMeta(`Uploaded to Firebase Storage`);
      setProfileSuccessMessage('Image uploaded successfully!');
      setTimeout(() => setProfileSuccessMessage(''), 3000);
    } catch (e) {
      console.error(e);
      setProfileErrorMessage('Could not upload avatar image file. Please try another image.');
      setTimeout(() => setProfileErrorMessage(''), 4000);
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleResetAvatar = () => {
    const defaultAvatar = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`;
    setEditPhotoUrl(defaultAvatar);
    setUploadMeta('Default avatar loaded • 300×300 px container fit');
  };
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMessage('');

    if (editIsLocal) {
      if (!editStreet.trim()) {
        setProfileErrorMessage('Please enter your Highland street name.');
        return;
      }
      if (!editPostcode.trim()) {
        setProfileErrorMessage('Please enter your Highland postcode.');
        return;
      }
    } else {
      if (!editDistrict.trim()) {
        setProfileErrorMessage('Please enter your home district/city.');
        return;
      }
    }

    const combinedAddress = editIsLocal
      ? [editStreet.trim(), editPostcode.trim(), editTown, 'Cameron Highlands, Pahang'].filter(Boolean).join(', ')
      : [editDistrict.trim(), editState].filter(Boolean).join(', ');

    firebaseService.updateUserProfile({
      displayName: editName.trim(),
      fullName: editFullName.trim(),
      email: editEmail.trim(),
      contactNumber: editContact.trim(),
      isLocal: editIsLocal,
      street: editStreet.trim(),
      postcode: editPostcode.trim(),
      town: editTown,
      district: editDistrict.trim(),
      state: editState,
      address: combinedAddress,
      photoURL: editPhotoUrl,
    });

    setProfileSuccessMessage(
      editIsLocal
        ? 'Local resident status and Highland residential address updated successfully!'
        : 'Visitor / Tourist status and district/state origin updated successfully!'
    );
    setTimeout(() => setProfileSuccessMessage(''), 3500);
  };

  // Bookmarked places
  const bookmarkedPlaces = places.filter((p) =>
    currentUser.bookmarks.includes(p.id)
  );

  // User Classifieds state
  const [userJobs, setUserJobs] = useState<JobClassified[]>(() => firebaseService.getJobs());
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  // Sync real-time when new classifieds are posted
  useEffect(() => {
    const handleJobsUpdated = (e: any) => {
      const updated = e?.detail || firebaseService.getJobs();
      setUserJobs(updated);
    };
    window.addEventListener('jobs-updated', handleJobsUpdated);
    return () => window.removeEventListener('jobs-updated', handleJobsUpdated);
  }, []);

  // Filter out all mock classifieds from user account view so only the user's authentic postings appear
  const isMockClassified = (job: JobClassified): boolean => {
    return (
      job.id === 'job-1' ||
      job.id === 'job-2' ||
      job.id === 'job-3' ||
      job.id === 'job-4' ||
      job.id === 'job-5' ||
      job.id === 'job-6' ||
      INITIAL_JOBS.some((mock) => mock.id === job.id) ||
      job.company === 'Highland Eco Adventures' ||
      job.company === 'Boh Sungei Palas Tea House' ||
      job.company === 'Independent Driver (Ahmad)' ||
      job.company === 'Kea Farm Greenhouse' ||
      job.company === 'Highland Sparkle Cleaners' ||
      job.company === 'Golden Valley Restaurant'
    );
  };

  const myAccountClassifieds = userJobs.filter((job) => {
    if (isMockClassified(job)) return false;
    if (job.isUserCreated) return true;
    if (job.authorEmail && currentUser?.email && job.authorEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (currentUser?.email && job.contact && job.contact.toLowerCase().includes(currentUser.email.toLowerCase())) return true;
    if (currentUser?.displayName && job.company && job.company.toLowerCase() === currentUser.displayName.toLowerCase()) return true;
    return true;
  });

  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobTownship, setJobTownship] = useState<Township>('Tanah Rata');
  const [jobType, setJobType] = useState<string>('Job Offer');
  const [jobSalary, setJobSalary] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobContact, setJobContact] = useState('');

  const handleOpenAddJob = () => {
    setEditingJobId(null);
    setJobTitle('');
    setJobCompany(currentUser.displayName || 'Highland Community Member');
    setJobTownship('Tanah Rata');
    setJobType('Job Offer');
    setJobSalary('RM 2,000 / month');
    setJobDescription('');
    setJobContact(currentUser.email || '');
    setShowJobModal(true);
  };

  const handleOpenEditJob = (job: JobClassified) => {
    setEditingJobId(job.id);
    setJobTitle(job.title);
    setJobCompany(job.company);
    setJobTownship(job.township);
    setJobType(job.type);
    setJobSalary(job.salary);
    setJobDescription(job.description);
    setJobContact(job.contact);
    setShowJobModal(true);
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: JobClassified = {
      id: editingJobId || ('job-usr-' + Date.now().toString(36)),
      title: jobTitle,
      company: jobCompany,
      township: jobTownship,
      type: jobType,
      category: jobType,
      salary: jobSalary,
      description: jobDescription,
      contact: jobContact,
      postedDate: new Date().toISOString().split('T')[0],
      isUserCreated: true,
      authorEmail: currentUser.email,
      authorName: currentUser.displayName,
    };

    const updated = firebaseService.saveJob(newJob);
    setUserJobs(updated);
    setShowJobModal(false);
    setEditingJobId(null);
  };

  const handleDeleteJob = (id: string) => {
    if (window.confirm('Delete this classified posting?')) {
      const updated = firebaseService.deleteJob(id);
      setUserJobs(updated);
    }
  };

  const itineraryDays = [
    {
      day: 'Day 1: Misty Peaks & Heritage High Tea',
      items: [
        { time: '08:30 AM', title: 'BOH Sungei Palas Tea Centre', note: 'Scenic morning tea overlooking emerald ridges' },
        { time: '11:00 AM', title: 'Big Red Strawberry Farm', note: 'Pick fresh sweet strawberries with chocolate dip' },
        { time: '02:00 PM', title: 'The Lord’s Cafe Tanah Rata', note: 'Famous warm scones with homemade strawberry jam' },
        { time: '06:30 PM', title: 'Water Crest Valley Steamboat', note: 'Boiling organic watercress soup over charcoal' },
      ],
    },
    {
      day: 'Day 2: Cloud Forests & Highland Agriculture',
      items: [
        { time: '09:00 AM', title: 'Mossy Forest Nature Reserve', note: 'Cloud forest boardwalk at 2,032m elevation' },
        { time: '01:30 PM', title: 'Kea Farm Highland Market', note: 'Steaming pearl corn, honey, and succulents' },
        { time: '03:30 PM', title: 'Cameron Lavender Garden', note: 'Purple lavender flowerbeds and lavender ice cream' },
        { time: '06:00 PM', title: 'Golden Hills Night Market', note: 'Street food delicacies and highland souvenirs' },
      ],
    },
  ];

  return (
    <div ref={dashboardContainerRef} className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/95 backdrop-blur-2xl p-2.5 sm:p-6 text-stone-100 animate-in fade-in duration-300">
      {/* Full screen backdrop for mobile hamburger menu */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-40 bg-stone-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setShowMobileMenu(false)}
          aria-hidden="true"
        />
      )}
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-12">
        {/* Top Navbar */}
        {/* Desktop Header (PC View Only - no hamburger link) */}
        <div className="hidden md:flex items-center justify-between gap-4 p-4 rounded-3xl glass-panel bg-stone-900/90 border border-emerald-500/30 relative">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mountain SVG + CamGo Wordmark */}
            <div className="flex items-center gap-2 shrink-0 select-none">
              <svg
                viewBox="0 0 160 110"
                className="h-7 w-auto drop-shadow-sm shrink-0"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M52 10 L84 75 L18 75 Z" fill="#1F5C25" />
                <path d="M52 10 L18 75 L38 75 Z" fill="#17451C" />
                <path d="M52 10 L84 75 L56 75 Z" fill="#2D8235" />
                <path d="M96 22 L132 88 L62 88 Z" fill="#262626" />
                <path d="M96 22 L62 88 L85 88 Z" fill="#1C1C1C" />
                <path d="M96 22 L132 88 L105 88 Z" fill="#3B3B3B" />
                <path d="M26 45 L5 88 L52 88 Z" fill="#246A2B" />
                <path d="M26 45 L5 88 L22 88 Z" fill="#15421A" />
                <path d="M102 38 L142 88 L82 88 Z" fill="#1F5C25" />
                <path d="M102 38 L142 88 L116 88 Z" fill="#2D8235" />
                <path
                  d="M18 70 L34 46 L46 62 L64 26 L80 58 L98 32 L116 68 L130 52 L142 78"
                  stroke="#FFFFFF"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeLinejoin="miter"
                  fill="none"
                />
                <polygon points="64,28 72,48 58,48" fill="#FFFFFF" opacity="0.95" />
                <polygon points="98,34 104,50 92,50" fill="#FFFFFF" opacity="0.95" />
              </svg>
              <div className="flex items-baseline font-black tracking-tight leading-none shrink-0 whitespace-nowrap">
                <span className="text-2xl font-heading font-extrabold text-white">Cam</span>
                <span className="text-2xl font-heading font-extrabold text-emerald-400">Go</span>
              </div>
            </div>

            {/* Vertical divider */}
            <div className="h-6 w-px bg-white/20 mx-2 shrink-0" />

            {/* Dashboard Title & Sub-label */}
            <div className="flex flex-col justify-center min-w-0">
              <h3 className="font-heading font-bold text-white text-base leading-tight tracking-tight whitespace-nowrap truncate">
                CamGo Dashboard
              </h3>
              <p className="text-[11px] text-stone-400 font-medium leading-tight whitespace-nowrap truncate">
                {language === 'bm'
                  ? 'Simpanan destinasi, jadual & profil'
                  : 'Traveler Profile & Dedicated Dashboard'}
              </p>
            </div>
          </div>

          {/* Right Action buttons (PC View) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                firebaseService.signOut();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Header (Mobile View Only) */}
        <div className={`md:hidden flex flex-col gap-2 p-3 rounded-2xl glass-panel bg-stone-900/90 border border-emerald-500/30 relative ${showMobileMenu ? 'z-50' : 'z-20'}`}>
          <div className="flex items-start justify-between gap-2">
            {/* Left Column: CamGo Logo on Top, Hamburger Link Directly Below */}
            <div className="flex flex-col items-start gap-1.5 shrink-0">
              {/* CamGo Logo */}
              <div className="flex items-center gap-1.5 shrink-0 select-none">
                <svg
                  viewBox="0 0 160 110"
                  className="h-6 w-auto drop-shadow-sm shrink-0"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M52 10 L84 75 L18 75 Z" fill="#1F5C25" />
                  <path d="M52 10 L18 75 L38 75 Z" fill="#17451C" />
                  <path d="M52 10 L84 75 L56 75 Z" fill="#2D8235" />
                  <path d="M96 22 L132 88 L62 88 Z" fill="#262626" />
                  <path d="M96 22 L62 88 L85 88 Z" fill="#1C1C1C" />
                  <path d="M96 22 L132 88 L105 88 Z" fill="#3B3B3B" />
                  <path d="M26 45 L5 88 L52 88 Z" fill="#246A2B" />
                  <path d="M26 45 L5 88 L22 88 Z" fill="#15421A" />
                  <path d="M102 38 L142 88 L82 88 Z" fill="#1F5C25" />
                  <path d="M102 38 L142 88 L116 88 Z" fill="#2D8235" />
                  <path
                    d="M18 70 L34 46 L46 62 L64 26 L80 58 L98 32 L116 68 L130 52 L142 78"
                    stroke="#FFFFFF"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeLinejoin="miter"
                    fill="none"
                  />
                  <polygon points="64,28 72,48 58,48" fill="#FFFFFF" opacity="0.95" />
                  <polygon points="98,34 104,50 92,50" fill="#FFFFFF" opacity="0.95" />
                </svg>
                <div className="flex items-baseline font-black tracking-tight leading-none shrink-0 whitespace-nowrap">
                  <span className="text-lg font-heading font-extrabold text-white">Cam</span>
                  <span className="text-lg font-heading font-extrabold text-emerald-400">Go</span>
                </div>
              </div>

              {/* Hamburger Button placed BELOW CamGo Logo */}
              <div ref={mobileMenuContainerRef} className="relative z-50">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#092218] hover:bg-emerald-950 text-emerald-400 border border-emerald-600/60 transition-colors cursor-pointer shrink-0 active:scale-95 shadow-sm text-xs font-semibold"
                  title="Dashboard Navigation Menu"
                  aria-label="Toggle Dashboard Menu"
                  aria-expanded={showMobileMenu}
                >
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="text-[11px] font-medium tracking-wide">Menu</span>
                </button>

                {/* Mobile / Hamburger Dropdown containing all 6 links + Sign Out */}
                {showMobileMenu && (
                  <div className="absolute left-0 top-full mt-2 w-64 max-w-[85vw] rounded-2xl bg-stone-900 border border-emerald-500/40 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                      <div className="px-3 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between text-[11px] font-mono text-emerald-400 font-bold uppercase">
                        <span>Dashboard Links</span>
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                      </div>

                      {/* 1. Profile & Photo */}
                      <button
                        onClick={() => {
                          setActiveTab('profile');
                          setMobileActiveModal('profile');
                          setShowMobileMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-stone-800 transition-colors cursor-pointer ${
                          activeTab === 'profile' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30' : 'text-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <User className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Profile &amp; Photo</span>
                        </div>
                        {activeTab === 'profile' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      {/* 2. My Job & Classifieds (with live count badge) */}
                      <button
                        onClick={() => {
                          setActiveTab('classifieds');
                          setMobileActiveModal('classifieds');
                          setShowMobileMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-stone-800 transition-colors cursor-pointer ${
                          activeTab === 'classifieds' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30' : 'text-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>My Job &amp; Classifieds</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                          {myAccountClassifieds.length}
                        </span>
                      </button>

                      {/* 3. My Saved Places (with live count badge) */}
                      <button
                        onClick={() => {
                          setActiveTab('bookmarks');
                          setMobileActiveModal('bookmarks');
                          setShowMobileMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-stone-800 transition-colors cursor-pointer ${
                          activeTab === 'bookmarks' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30' : 'text-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Bookmark className="w-4 h-4 text-teal-400 shrink-0" />
                          <span>My Saved Places</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono">
                          {bookmarkedPlaces.length}
                        </span>
                      </button>

                      {/* 4. Trip Itinerary Planner */}
                      <button
                        onClick={() => {
                          setActiveTab('itinerary');
                          setMobileActiveModal('itinerary');
                          setShowMobileMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-stone-800 transition-colors cursor-pointer ${
                          activeTab === 'itinerary' ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30' : 'text-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Trip Itinerary Planner</span>
                        </div>
                        {activeTab === 'itinerary' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      {/* 5. Online Payment Portals */}
                      <button
                        onClick={() => {
                          setActiveTab('online-payment');
                          setMobileActiveModal('online-payment');
                          setShowMobileMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-stone-800 transition-colors cursor-pointer ${
                          activeTab === 'online-payment' ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30' : 'text-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>Online Payment Portals</span>
                        </div>
                        {activeTab === 'online-payment' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>

                      {/* 6. Emergency Card (ICE) */}
                      <button
                        onClick={() => {
                          setActiveTab('emergency-card');
                          setMobileActiveModal('emergency-card');
                          setShowMobileMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between hover:bg-stone-800 transition-colors cursor-pointer ${
                          activeTab === 'emergency-card' ? 'text-rose-400 bg-rose-950/40 border border-rose-500/30' : 'text-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>Emergency Card (ICE)</span>
                        </div>
                        {activeTab === 'emergency-card' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                      </button>

                      {/* 7. Sign Out button placed inside the hamburger link */}
                      <div className="pt-1.5 mt-1 border-t border-white/10">
                        <button
                          onClick={() => {
                            setShowMobileMenu(false);
                            firebaseService.signOut();
                            onClose();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between text-rose-400 hover:bg-rose-950/40 border border-rose-500/20 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>{language === 'bm' ? 'Log Keluar' : 'Sign Out'}</span>
                          </div>
                        </button>
                      </div>
                    </div>
                )}
              </div>
            </div>

            {/* Right Column: Text "Dashboard" with X Close button in top right corner, plus Traveler Profile subtitle */}
            <div className="flex-1 flex flex-col items-end text-right min-w-0 pl-2">
              <div className="flex items-center gap-2 justify-end">
                <h3 className="font-heading font-bold text-white text-sm sm:text-base leading-tight tracking-tight whitespace-nowrap">
                  Dashboard
                </h3>
                {/* X Close button on top right corner next to text Dashboard */}
                <button
                  onClick={onClose}
                  className="p-1 sm:p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Subtitle adjusted to fit cleanly inside mobile view & container */}
              <p className="text-[10px] sm:text-[11px] text-stone-400 font-medium leading-snug mt-1 text-right break-words max-w-[200px]">
                {language === 'bm'
                  ? 'Simpanan destinasi, jadual & profil'
                  : 'Traveler Profile & Dedicated Dashboard'}
              </p>
            </div>
          </div>
        </div>

        {/* User Profile Card - Circular Avatar & Auto-Fit for Mobile */}
        <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl glass-panel bg-stone-900/80 border border-white/5 flex flex-row items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-emerald-400 shadow-md shrink-0 aspect-square bg-emerald-950/80 flex items-center justify-center">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="w-full h-full object-cover object-center rounded-full"
              />
            ) : (
              <span className="text-lg sm:text-xl font-black text-emerald-300 uppercase">
                {currentUser.displayName ? currentUser.displayName.charAt(0) : 'U'}
              </span>
            )}
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h4 className="text-sm sm:text-lg font-bold text-stone-100 truncate">{currentUser.displayName}</h4>
              {currentUser.email === 'ayahsyirah77@gmail.com' && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] sm:text-xs font-bold uppercase tracking-wider">
                  MASTER ADMIN
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] sm:text-xs font-semibold">
                Highland Explorer Level 2
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-stone-400 mt-0.5 font-mono truncate">{currentUser.email}</p>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] sm:text-xs text-stone-300">
              <span className="flex items-center gap-1">
                <Bookmark className="w-3 h-3 text-emerald-400" />
                <span>{currentUser.bookmarks.length} Bookmarked</span>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-teal-400" />
                <span>Verified Profile</span>
              </span>
            </div>
          </div>
        </div>

        {/* Sync Status Indicator */}
        <SyncStatusIndicator className="w-full" />

        {/* Mobile View: Dedicated Hub Cards to Access Sections (Tapping opens scrollable modal with X close button) */}
        {!mobileActiveModal && (
          <div className="md:hidden grid grid-cols-2 gap-2.5 pt-1">
            {/* 1. Profile & Photo */}
            <button
              onClick={() => {
                setActiveTab('profile');
                setMobileActiveModal('profile');
              }}
              className="p-3 rounded-2xl bg-stone-900/90 border border-emerald-500/30 hover:border-emerald-400/50 flex flex-col justify-between text-left transition-all active:scale-95 shadow-md group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">Open</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Profile &amp; Photo</p>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">Edit photo &amp; address</p>
              </div>
            </button>

            {/* 2. My Job & Classifieds */}
            <button
              onClick={() => {
                setActiveTab('classifieds');
                setMobileActiveModal('classifieds');
              }}
              className="p-3 rounded-2xl bg-stone-900/90 border border-amber-500/30 hover:border-amber-400/50 flex flex-col justify-between text-left transition-all active:scale-95 shadow-md group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold">
                  {myAccountClassifieds.length}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Job &amp; Classifieds</p>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">
                  {myAccountClassifieds.length === 0
                    ? '0 postings'
                    : `${myAccountClassifieds.length} active ${myAccountClassifieds.length === 1 ? 'posting' : 'postings'}`}
                </p>
              </div>
            </button>

            {/* 3. My Saved Places */}
            <button
              onClick={() => {
                setActiveTab('bookmarks');
                setMobileActiveModal('bookmarks');
              }}
              className="p-3 rounded-2xl bg-stone-900/90 border border-teal-500/30 hover:border-teal-400/50 flex flex-col justify-between text-left transition-all active:scale-95 shadow-md group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Bookmark className="w-4 h-4" />
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[9px] font-mono font-bold">
                  {bookmarkedPlaces.length}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">My Saved Places</p>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">Saved destinations</p>
              </div>
            </button>

            {/* 4. Trip Itinerary Planner */}
            <button
              onClick={() => {
                setActiveTab('itinerary');
                setMobileActiveModal('itinerary');
              }}
              className="p-3 rounded-2xl bg-stone-900/90 border border-emerald-500/30 hover:border-emerald-400/50 flex flex-col justify-between text-left transition-all active:scale-95 shadow-md group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">Plan</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Trip Itinerary</p>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">Highland travel schedule</p>
              </div>
            </button>

            {/* 5. Online Payment Portals */}
            <button
              onClick={() => {
                setActiveTab('online-payment');
                setMobileActiveModal('online-payment');
              }}
              className="p-3 rounded-2xl bg-stone-900/90 border border-cyan-500/30 hover:border-cyan-400/50 flex flex-col justify-between text-left transition-all active:scale-95 shadow-md group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-cyan-400 font-mono">Pay</span>
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Payment Portals</p>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">TNB, PAIP, Council tax</p>
              </div>
            </button>

            {/* 6. Emergency Card (ICE) */}
            <button
              onClick={() => {
                setActiveTab('emergency-card');
                setMobileActiveModal('emergency-card');
              }}
              className="p-3 rounded-2xl bg-gradient-to-br from-red-950/40 to-stone-900/90 border border-red-500/40 hover:border-red-400/60 flex flex-col justify-between text-left transition-all active:scale-95 shadow-md group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[9px] font-mono font-bold animate-pulse">
                  ICE
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Emergency Card</p>
                <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">Medical &amp; SOS ICE</p>
              </div>
            </button>
          </div>
        )}

        {/* Tab Switcher with Role-Based State Matrix */}
        {/* PC VIEW ONLY: Hidden on mobile so duplicate menu below sync status is removed */}
        <div className="hidden md:flex flex-row md:flex-wrap gap-1.5 p-1 rounded-2xl bg-stone-900/90 border border-white/10 text-xs font-bold w-fit [scrollbar-width:none] shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Edit Profile & Photo
          </button>

          {/* My Job & Classifieds: Fully active for account management */}
          <button
            onClick={() => setActiveTab('classifieds')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'classifieds'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            My Job &amp; Classifieds ({myAccountClassifieds.length})
          </button>

          {/* My Saved Places: Active for visitor, Greyed out (Disabled) for local */}
          {!isLocalUser ? (
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'bookmarks'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              My Saved Places ({bookmarkedPlaces.length})
            </button>
          ) : (
            <div
              className="px-4 py-2 rounded-xl bg-stone-950/60 text-stone-500 border border-white/5 flex items-center gap-1.5 opacity-60 cursor-not-allowed select-none"
              title="Visitor mode only"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500/80" />
              <span>My Saved Places 🔒 (Disabled)</span>
            </div>
          )}

          {/* Trip Itinerary Planner: Active for visitor, Greyed out (Disabled) for local */}
          {!isLocalUser ? (
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'itinerary'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Trip Itinerary Planner
            </button>
          ) : (
            <div
              className="px-4 py-2 rounded-xl bg-stone-950/60 text-stone-500 border border-white/5 flex items-center gap-1.5 opacity-60 cursor-not-allowed select-none"
              title="Visitor mode only"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500/80" />
              <span>Trip Itinerary 🔒 (Disabled)</span>
            </div>
          )}

          {/* Online Payment Portals: Active for local, Greyed out (Disabled) for visitor */}
          {isLocalUser ? (
            <button
              onClick={() => setActiveTab('online-payment')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'online-payment'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50'
                  : 'text-cyan-300/80 hover:text-white hover:bg-cyan-500/10'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Online Payment Portals</span>
            </button>
          ) : (
            <div
              className="px-4 py-2 rounded-xl bg-stone-950/60 text-stone-500 border border-white/5 flex items-center gap-1.5 opacity-60 cursor-not-allowed select-none"
              title="Requires Local Resident role"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500/80" />
              <span>Online Payment 🔒 (Disabled)</span>
            </div>
          )}

          <button
            onClick={() => setActiveTab('emergency-card')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'emergency-card'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-950/50'
                : 'text-rose-300/80 hover:text-white hover:bg-red-500/10'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Emergency Card (ICE)</span>
          </button>
        </div>

        {/* Tab: Online Payment Portals & Billing Gateways */}
        {((activeTab === 'online-payment' && !mobileActiveModal) || mobileActiveModal === 'online-payment') && (
          <div className={mobileActiveModal === 'online-payment' ? "fixed inset-0 z-[60] overflow-y-auto bg-stone-950/95 backdrop-blur-2xl p-3 sm:p-5 flex flex-col md:relative md:inset-auto md:z-auto md:p-0 md:bg-transparent md:backdrop-blur-none" : "hidden md:block"}>
            <MobileModalHeader
              title={language === 'bm' ? 'Portal Bayaran & Bil' : 'Online Payment Portals'}
              language={language}
              onClose={() => setMobileActiveModal(null)}
            />
            <div className="p-5 sm:p-7 rounded-3xl glass-panel bg-stone-900/90 border border-cyan-500/30 space-y-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-stone-100">
                    Online Payment Portals &amp; Billing Gateways
                  </h4>
                  <p className="text-xs text-stone-400">
                    Secure official portals for municipal assessment tax, utilities (TNB &amp; PAIP), land revenue (e-Tanah), and LHDN tax.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                Official Government &amp; Utility Gateways
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PBTPay KPKT */}
              <a
                href="https://pbtpay.kpkt.gov.my"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-stone-950/80 border border-white/10 hover:border-cyan-500/50 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-cyan-400 font-mono">KPKT Portal</span>
                    <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h5 className="text-sm font-bold text-stone-100 group-hover:text-cyan-300 transition-colors">
                    PBTPay KPKT (Local Authority Payment)
                  </h5>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Official portal for local council (PBT) assessment rates, license renewals, and municipal fines.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-cyan-400 font-semibold">
                  <span>https://pbtpay.kpkt.gov.my</span>
                  <span>Access Portal →</span>
                </div>
              </a>

              {/* PahangGo & JomPAY */}
              <div className="p-4 rounded-2xl bg-stone-950/80 border border-amber-500/30 hover:border-amber-500/60 transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      JomPAY Biller Code: 66647
                    </span>
                    <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-amber-400 transition-colors" />
                  </div>
                  <h5 className="text-sm font-bold text-stone-100 group-hover:text-amber-300 transition-colors">
                    PahangGo &amp; MDCH Assessment Tax
                  </h5>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Pay Cameron Highlands assessment tax (Cukai Taksiran) online via PahangGo or online banking JomPAY (Biller Code: 66647).
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <a
                    href="https://pahanggo.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>pahanggo.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-stone-400 font-mono text-[10px]">JomPAY: 66647</span>
                </div>
              </div>

              {/* myTNB Official Portal */}
              <a
                href="https://www.mytnb.com.my"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-stone-950/80 border border-white/10 hover:border-cyan-500/50 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-amber-400 font-mono">Tenaga Nasional</span>
                    <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h5 className="text-sm font-bold text-stone-100 group-hover:text-cyan-300 transition-colors">
                    myTNB Official Payment Portal
                  </h5>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Manage highland electricity accounts, view monthly consumption statements, and settle electricity bills.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-cyan-400 font-semibold">
                  <span>https://www.mytnb.com.my</span>
                  <span>Access Portal →</span>
                </div>
              </a>

              {/* myTNB Express Payment Link */}
              <a
                href="https://www.mytnb.com.my/payment/express-payment"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-stone-950/80 border border-white/10 hover:border-cyan-500/50 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-emerald-400 font-mono">Quick Pay</span>
                    <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h5 className="text-sm font-bold text-stone-100 group-hover:text-cyan-300 transition-colors">
                    myTNB Express Payment Link
                  </h5>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Fast quick-pay link to settle TNB utility bills instantly using your account contract number without logging in.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                  <span>Express Payment Link</span>
                  <span>Pay Now →</span>
                </div>
              </a>

              {/* PAIP e-Services */}
              <a
                href="https://e-services.paip.com.my"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-stone-950/80 border border-white/10 hover:border-cyan-500/50 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-blue-400 font-mono">Pengurusan Air Pahang</span>
                    <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h5 className="text-sm font-bold text-stone-100 group-hover:text-cyan-300 transition-colors">
                    PAIP e-Services Portal
                  </h5>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Water supply bill inquiries, payment gateway, and highland water service announcements for Cameron Highlands.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-blue-400 font-semibold">
                  <span>https://e-services.paip.com.my</span>
                  <span>Access Portal →</span>
                </div>
              </a>

              {/* e-Tanah Pahang */}
              <a
                href="https://etanah.pahang.gov.my"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-stone-950/80 border border-white/10 hover:border-cyan-500/50 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-amber-500 font-mono">PTG Pahang</span>
                    <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h5 className="text-sm font-bold text-stone-100 group-hover:text-cyan-300 transition-colors">
                    e-Tanah Pahang Portal
                  </h5>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Pahang land office portal for quit rent (cukai tanah), parcel rent, and land title search.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-amber-400 font-semibold">
                  <span>https://etanah.pahang.gov.my</span>
                  <span>Access Portal →</span>
                </div>
              </a>

              {/* LHDN MyTax */}
              <a
                href="https://mytax.hasil.gov.my"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-stone-950/80 border border-white/10 hover:border-cyan-500/50 transition-all group flex flex-col justify-between md:col-span-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-emerald-400 font-mono">Hasil / LHDN</span>
                    <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <h5 className="text-sm font-bold text-stone-100 group-hover:text-cyan-300 transition-colors">
                    LHDN MyTax Portal
                  </h5>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    Official Inland Revenue Board (LHDN) MyTax portal for filing tax returns, e-Filing, and income tax payments.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                  <span>https://mytax.hasil.gov.my</span>
                  <span>Access Portal →</span>
                </div>
              </a>
            </div>
          </div>
          </div>
        )}

        {/* Tab: Edit Profile */}
        {((activeTab === 'profile' && !mobileActiveModal) || mobileActiveModal === 'profile') && (
          <div className={mobileActiveModal === 'profile' ? "fixed inset-0 z-[60] overflow-y-auto bg-stone-950/95 backdrop-blur-2xl p-3 sm:p-5 flex flex-col md:relative md:inset-auto md:z-auto md:p-0 md:bg-transparent md:backdrop-blur-none" : "hidden md:block"}>
            <MobileModalHeader
              title={language === 'bm' ? 'Profil & Gambar' : 'Profile & Photo'}
              language={language}
              onClose={() => setMobileActiveModal(null)}
            />
            <div className="p-5 sm:p-7 rounded-3xl glass-panel bg-stone-900/80 border border-white/5 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-stone-100">
                    Profile Photo &amp; Account Settings
                  </h4>
                  <p className="text-xs text-stone-400">
                    Auto-fit profile photo container with instant preview and aspect-ratio preservation.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-bold">
                  Responsive Auto-Fitting Photo Container
                </span>
              </div>
            </div>

            {profileSuccessMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-950/60 animate-in fade-in duration-200">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-semibold">{profileSuccessMessage}</span>
              </div>
            )}

            {profileErrorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center gap-2.5 shadow-lg shadow-red-950/60 animate-in fade-in duration-200">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                <span className="font-semibold">{profileErrorMessage}</span>
              </div>
            )}

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileImageUpload}
              className="hidden"
            />

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Responsive 2-Column Layout: Left (Responsive Photo Container), Right (Profile Fields) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                {/* Column 1: Responsive Auto-Fit Photo Container & Instant Preview */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Profile Photo</span>
                    </label>
                    <span className="text-[10px] text-stone-400 font-mono">Auto-Fit • Overflow Hidden</span>
                  </div>

                  {/* 1. CONTAINER: Circular auto-fit on mobile (rounded-full) */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative w-32 h-32 sm:w-44 sm:h-44 aspect-square overflow-hidden rounded-full border-2 transition-all duration-300 cursor-pointer shadow-2xl bg-stone-950 flex items-center justify-center group shrink-0 ${
                      isDragging
                        ? 'border-emerald-400 scale-[1.02] shadow-[0_0_35px_rgba(16,185,129,0.4)] ring-4 ring-emerald-500/30'
                        : 'border-emerald-500/40 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                    }`}
                    title="Click or drop an image to upload"
                  >
                    {/* 2. AUTO-FIT & ASPECT RATIO: object-fit: cover inside circular container */}
                    <img
                      src={
                        editPhotoUrl ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'
                      }
                      alt="Profile Avatar Preview"
                      className="w-full h-full object-cover object-center rounded-full select-none transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Instant Preview Hover / Touch Overlay */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-stone-950/85 via-stone-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2 sm:p-4 text-center">
                      <div className="mx-auto p-1.5 sm:p-2 rounded-full bg-emerald-600/90 text-white mb-1 shadow-lg">
                        <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <p className="font-bold text-[9px] sm:text-xs text-white">Tap to Upload</p>
                    </div>

                    {/* Auto-Fit badge */}
                    <div className="absolute bottom-2 inset-x-0 mx-auto w-fit px-2 py-0.5 rounded-full bg-stone-900/90 backdrop-blur-md border border-white/10 text-[8px] font-mono text-emerald-400 font-bold shadow-md">
                      Auto-Fit
                    </div>

                    {isDragging && (
                      <div className="absolute inset-0 rounded-full bg-emerald-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-emerald-300 p-2 border-2 border-dashed border-emerald-400">
                        <Upload className="w-6 h-6 sm:w-8 sm:h-8 animate-bounce mb-1" />
                        <span className="font-bold text-xs">Drop to Auto-Fit</span>
                      </div>
                    )}
                  </div>

                  {/* 3. PREVIEW FUNCTIONALITY: Upload Feedback, Buttons & Metadata */}
                  <div className="w-full max-w-[240px] sm:max-w-[280px] mt-2.5 sm:mt-3 space-y-2">
                    {uploadMeta && (
                      <div className="p-2 rounded-xl bg-stone-950/90 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 text-center flex items-center justify-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{uploadMeta}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetAvatar}
                        className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs cursor-pointer transition-colors"
                        title="Reset to default avatar"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-center text-[10px] text-stone-400">
                      Supports JPG, PNG, WEBP, GIF. Auto-centers and scales.
                    </div>
                  </div>
                </div>

                {/* Column 2: Account Details & Visitor/Local Resident Fields */}
                <div className="lg:col-span-7 space-y-4 text-xs">
                  {/* 1. Display Name */}
                  <div>
                    <label className="text-stone-300 font-bold block mb-1.5">
                      Display Name
                    </label>
                    <input
                      required
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800/90 border border-white/10 text-stone-100 placeholder-stone-500 outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* 2. Full legal name */}
                  <div>
                    <label className="text-stone-300 font-bold block mb-1.5">
                      Full Legal Name
                    </label>
                    <input
                      required
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      placeholder="e.g. Sarah Binti Jenkins"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800/90 border border-white/10 text-stone-100 placeholder-stone-500 outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  {/* 3. Email Address & 4. Contact Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-stone-300 font-bold block mb-1.5">
                        Email Address
                      </label>
                      <input
                        required
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="e.g. explorer@highlands.my"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800/90 border border-white/10 text-stone-100 placeholder-stone-500 outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-stone-300 font-bold block mb-1.5">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        placeholder="e.g. +60 12-345 6789"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800/90 border border-white/10 text-stone-100 placeholder-stone-500 outline-none focus:border-emerald-500 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  {/* 5. Toggle: Resident Status: Visitor / Local */}
                  <div className="p-4 rounded-2xl bg-stone-950/80 border border-white/10 flex items-center justify-between gap-4 shadow-inner">
                    <div>
                      <div className="text-stone-200 font-bold flex items-center gap-2">
                        <span>Resident Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                          editIsLocal
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {editIsLocal ? 'Local / Resident' : 'Visitor / Tourist'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 mt-1">
                        {editIsLocal
                          ? 'Local resident mode enabled: Highland residential address fields are unlocked below.'
                          : 'Visitor mode enabled: District and state origin fields are unlocked below.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditIsLocal(!editIsLocal)}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        editIsLocal ? 'bg-emerald-600' : 'bg-cyan-600'
                      }`}
                      role="switch"
                      aria-checked={editIsLocal}
                      title="Toggle resident status between Visitor and Local"
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          editIsLocal ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* 1. Highland Residential Address Field (Enabled for Local, Greyed Out for Visitor) */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      editIsLocal
                        ? 'bg-stone-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                        : 'bg-stone-950/40 border-white/5 opacity-40 select-none'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-4 h-4 ${editIsLocal ? 'text-emerald-400' : 'text-stone-500'}`} />
                        <span className="font-bold text-stone-200">
                          1. Highland Residential Address
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          editIsLocal
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                            : 'bg-stone-800 text-stone-500 border border-white/5'
                        }`}
                      >
                        {editIsLocal ? 'Enabled (Local Resident)' : 'Greyed Out (Visitor Mode)'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Street Name field */}
                      <div>
                        <label className={`block mb-1 font-bold text-[11px] ${editIsLocal ? 'text-stone-300' : 'text-stone-500'}`}>
                          Street Name
                        </label>
                        <input
                          type="text"
                          disabled={!editIsLocal}
                          required={editIsLocal}
                          value={editStreet}
                          onChange={(e) => setEditStreet(e.target.value)}
                          placeholder={editIsLocal ? "e.g. No. 12, Persiaran Camelia 3" : "Greyed out (toggle Local to enable)"}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                            editIsLocal
                              ? 'bg-stone-800/90 border-white/10 text-stone-100 placeholder-stone-500 focus:border-emerald-500'
                              : 'bg-stone-900/40 border-white/5 text-stone-500 placeholder-stone-600 cursor-not-allowed'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Postcode field */}
                        <div>
                          <label className={`block mb-1 font-bold text-[11px] ${editIsLocal ? 'text-stone-300' : 'text-stone-500'}`}>
                            Postcode
                          </label>
                          <input
                            type="text"
                            disabled={!editIsLocal}
                            required={editIsLocal}
                            value={editPostcode}
                            onChange={(e) => setEditPostcode(e.target.value)}
                            placeholder={editIsLocal ? "e.g. 39000" : "Greyed out"}
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors font-mono ${
                              editIsLocal
                                ? 'bg-stone-800/90 border-white/10 text-stone-100 placeholder-stone-500 focus:border-emerald-500'
                                : 'bg-stone-900/40 border-white/5 text-stone-500 placeholder-stone-600 cursor-not-allowed'
                            }`}
                          />
                        </div>

                        {/* Town field */}
                        <div>
                          <label className={`block mb-1 font-bold text-[11px] ${editIsLocal ? 'text-stone-300' : 'text-stone-500'}`}>
                            Town
                          </label>
                          <select
                            disabled={!editIsLocal}
                            value={editTown}
                            onChange={(e) => setEditTown(e.target.value as Township)}
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                              editIsLocal
                                ? 'bg-stone-800/90 border-white/10 text-stone-100 focus:border-emerald-500'
                                : 'bg-stone-900/40 border-white/5 text-stone-500 cursor-not-allowed'
                            }`}
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
                      </div>
                    </div>
                  </div>

                  {/* 2. District and State (Visitor) (Enabled for Visitor, Greyed Out for Local) */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      !editIsLocal
                        ? 'bg-stone-900/90 border-cyan-500/40 shadow-lg shadow-cyan-950/30'
                        : 'bg-stone-950/40 border-white/5 opacity-40 select-none'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Compass className={`w-4 h-4 ${!editIsLocal ? 'text-cyan-400' : 'text-stone-500'}`} />
                        <span className="font-bold text-stone-200">
                          2. District &amp; State (Visitor Origin)
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          !editIsLocal
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
                            : 'bg-stone-800 text-stone-500 border border-white/5'
                        }`}
                      >
                        {!editIsLocal ? 'Enabled (Visitor Mode)' : 'Greyed Out (Local Resident)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* District field */}
                      <div>
                        <label className={`block mb-1 font-bold text-[11px] ${!editIsLocal ? 'text-stone-300' : 'text-stone-500'}`}>
                          District (Where you came from)
                        </label>
                        <input
                          type="text"
                          disabled={editIsLocal}
                          required={!editIsLocal}
                          value={editDistrict}
                          onChange={(e) => setEditDistrict(e.target.value)}
                          placeholder={!editIsLocal ? "e.g. Kinta / Ipoh, Petaling, George Town" : "Greyed out (toggle Visitor to enable)"}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                            !editIsLocal
                              ? 'bg-stone-800/90 border-white/10 text-stone-100 placeholder-stone-500 focus:border-cyan-500'
                              : 'bg-stone-900/40 border-white/5 text-stone-500 placeholder-stone-600 cursor-not-allowed'
                          }`}
                        />
                      </div>

                      {/* State field */}
                      <div>
                        <label className={`block mb-1 font-bold text-[11px] ${!editIsLocal ? 'text-stone-300' : 'text-stone-500'}`}>
                          State (Where you came from)
                        </label>
                        <select
                          disabled={editIsLocal}
                          value={editState}
                          onChange={(e) => setEditState(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                            !editIsLocal
                              ? 'bg-stone-800/90 border-white/10 text-stone-100 focus:border-cyan-500'
                              : 'bg-stone-900/40 border-white/5 text-stone-500 cursor-not-allowed'
                          }`}
                        >
                          <option value="Perak">Perak</option>
                          <option value="Selangor">Selangor</option>
                          <option value="Kuala Lumpur">Kuala Lumpur</option>
                          <option value="Pulau Pinang">Pulau Pinang</option>
                          <option value="Johor">Johor</option>
                          <option value="Kedah">Kedah</option>
                          <option value="Pahang">Pahang</option>
                          <option value="Melaka">Melaka</option>
                          <option value="Negeri Sembilan">Negeri Sembilan</option>
                          <option value="Kelantan">Kelantan</option>
                          <option value="Terengganu">Terengganu</option>
                          <option value="Perlis">Perlis</option>
                          <option value="Sabah">Sabah</option>
                          <option value="Sarawak">Sarawak</option>
                          <option value="Putrajaya">Putrajaya</option>
                          <option value="Labuan">Labuan</option>
                          <option value="International / Overseas">International / Overseas</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-stone-300 font-bold block mb-1.5">
                      Photo URL (Alternative or Web Hosted)
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={editPhotoUrl}
                        onChange={(e) => {
                          setEditPhotoUrl(e.target.value);
                          setUploadMeta('Custom URL Loaded • Auto-fitting inside container');
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800/90 border border-white/10 text-stone-100 placeholder-stone-500 outline-none focus:border-emerald-500 transition-colors font-mono text-[11px]"
                      />
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Any external image URL instantly previews in the auto-fitting container with object-fit: cover.
                    </p>
                  </div>

                  {/* Highlights Card */}
                  <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-white/5 space-y-2 text-[11px] text-stone-300">
                    <div className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">
                      Container &amp; Upload Specifications
                    </div>
                    <ul className="space-y-1 text-stone-400">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Responsive auto-fit dimension with overflow: hidden</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Auto-fit CSS object-cover eliminates stretching &amp; distortion</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Instant real-time preview &amp; HTML5 canvas center-crop compression</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Responsive scaling on mobile viewports down to small screens</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/70 transition-all active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
          </div>
        )}

        {/* Tab 1: Bookmarks */}
        {((activeTab === 'bookmarks' && !mobileActiveModal) || mobileActiveModal === 'bookmarks') && (
          <div className={mobileActiveModal === 'bookmarks' ? "fixed inset-0 z-[60] overflow-y-auto bg-stone-950/95 backdrop-blur-2xl p-3 sm:p-5 flex flex-col md:relative md:inset-auto md:z-auto md:p-0 md:bg-transparent md:backdrop-blur-none" : "hidden md:block"}>
            <MobileModalHeader
              title={language === 'bm' ? 'Tempat Disimpan Saya' : 'My Saved Places'}
              language={language}
              onClose={() => setMobileActiveModal(null)}
            />
            <div>
            {bookmarkedPlaces.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-stone-900/40 border border-white/5">
                <Heart className="w-10 h-10 text-stone-600 mx-auto mb-2" />
                <p className="text-stone-400 text-sm">
                  {language === 'bm'
                    ? 'Anda belum mempunyai tempat kegemaran yang disimpan.'
                    : 'You haven’t saved any places yet. Click the bookmark icon on any directory card!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookmarkedPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="glass-card-hover rounded-3xl p-4 bg-stone-900/80 border border-white/5 flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={place.imageUrl}
                        alt={place.name}
                        className="w-16 h-16 rounded-2xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-emerald-400 font-bold block truncate">
                          {place.township} • {place.elevation}
                        </span>
                        <h5 className="text-sm font-bold text-stone-100 truncate mt-0.5">
                          {place.name}
                        </h5>
                        <p className="text-xs text-stone-400 line-clamp-1 mt-1">
                          {place.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onToggleBookmark(place.id)}
                        className="text-xs text-rose-400 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                      <button
                        onClick={() => {
                          onSelectPlaceForMap(place);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Show on Map
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        )}

        {/* Tab 2: Trip Itinerary Planner */}
        {((activeTab === 'itinerary' && !mobileActiveModal) || mobileActiveModal === 'itinerary') && (
          <div className={mobileActiveModal === 'itinerary' ? "fixed inset-0 z-[60] overflow-y-auto bg-stone-950/95 backdrop-blur-2xl p-3 sm:p-5 flex flex-col md:relative md:inset-auto md:z-auto md:p-0 md:bg-transparent md:backdrop-blur-none" : "hidden md:block"}>
            <MobileModalHeader
              title={language === 'bm' ? 'Perancang Jadual Perjalanan' : 'Trip Itinerary Planner'}
              language={language}
              onClose={() => setMobileActiveModal(null)}
            />
            <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header Toolbar */}
            <div className="p-5 sm:p-6 rounded-3xl glass-panel bg-stone-900/90 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-stone-100 flex items-center gap-2">
                    <span>Trip Itinerary Planner</span>
                    {savedItinerary ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                        Custom Saved Plan Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-white/10 text-[10px] font-mono font-bold">
                        Sample Preview Plan
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-stone-400">
                    {language === 'bm'
                      ? 'Urus dan padam data jadual perjalanan percutian Cameron Highlands anda'
                      : 'Manage, view or clear your saved custom trip itinerary data.'}
                  </p>
                </div>
              </div>

              {/* Clear/Delete Itinerary Data Button */}
              <button
                onClick={() => setShowClearItineraryModal(true)}
                className="px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
                title="Clear or delete saved itinerary data"
              >
                <Trash2 className="w-4 h-4 text-red-400 group-hover:text-white" />
                <span>Clear / Delete Saved Data</span>
              </button>
            </div>

            {/* Notification Banner */}
            {itineraryNoticeMessage && (
              <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5 font-semibold">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{itineraryNoticeMessage}</span>
                </div>
                <button
                  onClick={() => setItineraryNoticeMessage('')}
                  className="p-1 rounded-lg hover:bg-emerald-800/50 text-emerald-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Itinerary Contents: Saved vs Sample */}
            {savedItinerary && savedItinerary.days && savedItinerary.days.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                  <span className="font-semibold">
                    Saved Plan: {savedItinerary.title || 'Highland Gateway Exploration'} ({savedItinerary.days.length} Days)
                  </span>
                  <span className="font-mono text-[11px] text-stone-400">
                    {savedItinerary.days.reduce((acc, d) => acc + (d.activities?.length || 0), 0)} Saved Activities
                  </span>
                </div>

                {savedItinerary.days.map((dayPlan, dayIdx) => (
                  <div
                    key={dayIdx}
                    className="p-5 rounded-3xl glass-panel bg-stone-900/80 border border-white/5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-emerald-400 font-bold text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Day {dayPlan.dayNumber || dayIdx + 1}: {dayPlan.title || dayPlan.date || 'Highland Schedule'}</span>
                      </div>
                      <span className="text-xs text-stone-400 font-normal">
                        {dayPlan.activities?.length || 0} activities scheduled
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {dayPlan.activities && dayPlan.activities.length > 0 ? (
                        dayPlan.activities.map((act, actIdx) => (
                          <div
                            key={act.id || actIdx}
                            className="p-3.5 rounded-2xl bg-stone-950/70 border border-white/5 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="flex items-start gap-3">
                              <span className="font-mono text-emerald-400 font-bold shrink-0 mt-0.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                {act.timeSlot || '09:00 AM'}
                              </span>
                              <div>
                                <div className="font-bold text-stone-100">{act.title}</div>
                                {act.township && (
                                  <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                                    {act.township}
                                  </div>
                                )}
                                {act.notes && (
                                  <div className="text-stone-400 text-[11px] mt-1 italic">
                                    "{act.notes}"
                                  </div>
                                )}
                              </div>
                            </div>
                            {act.estimatedCost !== undefined ? (
                              <span className="text-[11px] font-mono text-amber-400 font-bold shrink-0 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                                RM {act.estimatedCost}
                              </span>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 rounded-2xl bg-stone-950/40 text-stone-500 text-xs text-center">
                          No activities added for this day.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-stone-950/60 border border-white/5 text-xs text-stone-400 flex items-center justify-between">
                  <span>Displaying default sample itinerary structure:</span>
                  <span className="font-mono text-[10px] text-stone-500">2 Days • 8 Recommended Spots</span>
                </div>

                {itineraryDays.map((plan, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-3xl glass-panel bg-stone-900/80 border border-white/5 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{plan.day}</span>
                    </div>

                    <div className="space-y-2.5">
                      {plan.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="p-3 rounded-2xl bg-stone-950/70 border border-white/5 flex items-start gap-3 text-xs"
                        >
                          <span className="font-mono text-emerald-400 font-bold shrink-0 mt-0.5">
                            {item.time}
                          </span>
                          <div>
                            <div className="font-bold text-stone-100">{item.title}</div>
                            <div className="text-stone-400 text-[11px] mt-0.5">{item.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Clear / Delete Confirmation Modal */}
            {showClearItineraryModal && (
              <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
                <div className="glass-panel w-full max-w-md rounded-3xl p-6 bg-stone-900 border border-red-500/40 shadow-2xl relative space-y-4">
                  <button
                    onClick={() => setShowClearItineraryModal(false)}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-3 text-red-400">
                    <div className="p-3 rounded-2xl bg-red-500/20 text-red-400">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-stone-100">
                        {language === 'bm' ? 'Padam Data Jadual Perjalanan?' : 'Clear Saved Itinerary Data?'}
                      </h3>
                      <p className="text-xs text-stone-400">This action cannot be undone</p>
                    </div>
                  </div>

                  <p className="text-xs text-stone-300 leading-relaxed bg-stone-950/80 p-3.5 rounded-2xl border border-white/5">
                    {language === 'bm'
                      ? 'Adakah anda pasti mahu memadamkan semua data jadual perjalanan yang disimpan daripada storan akaun anda?'
                      : 'Are you sure you want to delete and clear all saved itinerary days, custom activities, and schedule data from your account storage?'}
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowClearItineraryModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleClearItinerary}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-950/60 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Yes, Clear Data</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {/* Tab 3: My Job & Classifieds Dashboard */}
        {((activeTab === 'classifieds' && !mobileActiveModal) || mobileActiveModal === 'classifieds') && (
          <div className={mobileActiveModal === 'classifieds' ? "fixed inset-0 z-[60] overflow-y-auto bg-stone-950/95 backdrop-blur-2xl p-3 sm:p-5 flex flex-col md:relative md:inset-auto md:z-auto md:p-0 md:bg-transparent md:backdrop-blur-none" : "hidden md:block"}>
            <MobileModalHeader
              title={language === 'bm' ? 'Jawatan & Iklan' : 'My Job & Classifieds'}
              language={language}
              onClose={() => setMobileActiveModal(null)}
            />
            <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-stone-100 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  <span>Manage Your Classifieds & Job Postings</span>
                </h4>
                <p className="text-xs text-stone-400">
                  Post job offers, jobs wanted, services offered/wanted, and items for sale/wanted.
                </p>
              </div>

              <button
                onClick={handleOpenAddJob}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Post New Classified</span>
              </button>
            </div>

            {myAccountClassifieds.length === 0 ? (
              <div className="p-8 sm:p-12 text-center rounded-3xl bg-stone-900/60 border border-white/5 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                  <Briefcase className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h5 className="text-base font-bold text-stone-100">
                    {language === 'bm' ? 'Tiada Iklan Diterbitkan Lagi' : 'No Active Classified Postings'}
                  </h5>
                  <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                    {language === 'bm'
                      ? 'Akaun anda belum mempunyai sebarang iklan aktif. Tekan "Post New Classified" untuk memuat naik tawaran kerja, mencari kerja, servis atau barangan jualan.'
                      : 'You do not have any active classified postings in your account. Click "Post New Classified" above to submit job offers, jobs wanted, services, or items for sale.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddJob}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/60 transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'bm' ? 'Terbitkan Iklan Pertama' : 'Post Your First Classified'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myAccountClassifieds.map((job) => (
                  <div
                    key={job.id}
                    className="glass-card-hover rounded-3xl p-5 bg-stone-900/80 border border-white/5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                          {job.type}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {job.salary}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-stone-100">{job.title}</h4>
                      <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-1.5">
                        <span>{job.company}</span>
                        <span>•</span>
                        <span className="text-emerald-400">{job.township}</span>
                      </div>

                      <p className="text-xs text-stone-300 mt-2.5 leading-relaxed">
                        {job.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-3 text-xs">
                      <span className="text-stone-500 font-mono text-[11px] truncate max-w-[180px]">{job.contact}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditJob(job)}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                          title="Edit Posting"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                          title="Delete Posting"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal: Add/Edit Classified */}
            {showJobModal && (
              <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
                <div className="glass-panel w-full max-w-lg rounded-3xl p-6 bg-stone-900 border border-emerald-500/30 shadow-2xl relative">
                  <button
                    onClick={() => setShowJobModal(false)}
                    className="absolute top-5 right-5 p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <h3 className="text-lg font-bold text-stone-100 mb-4">
                    {editingJobId ? 'Edit Classified Listing' : 'Post New Classified Listing'}
                  </h3>

                  <form onSubmit={handleSaveJob} className="space-y-3 text-xs">
                    <div>
                      <label className="text-stone-300 block mb-1 font-bold">Listing Title</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Tour Guide & Nature Expert"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-stone-300 block mb-1 font-bold">Category / Type</label>
                        <select
                          value={jobType}
                          onChange={(e) => setJobType(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 outline-none"
                        >
                          <option value="Job Offer">Job Offer</option>
                          <option value="Job Wanted">Job Wanted</option>
                          <option value="Service Offered">Service Offered</option>
                          <option value="Service Wanted">Service Wanted</option>
                          <option value="Item For Sale">Item For Sale</option>
                          <option value="Item Wanted">Item Wanted</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-stone-300 block mb-1 font-bold">Township Hub</label>
                        <select
                          value={jobTownship}
                          onChange={(e) => setJobTownship(e.target.value as Township)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 outline-none"
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
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-stone-300 block mb-1 font-bold">Company / Poster Name</label>
                        <input
                          required
                          type="text"
                          value={jobCompany}
                          onChange={(e) => setJobCompany(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-stone-300 block mb-1 font-bold">Salary / Price Tag</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. RM 2,500 / month"
                          value={jobSalary}
                          onChange={(e) => setJobSalary(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-stone-300 block mb-1 font-bold">Description</label>
                      <textarea
                        required
                        rows={3}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-stone-300 block mb-1 font-bold">Contact Info (WhatsApp / Email / Phone)</label>
                      <input
                        required
                        type="text"
                        placeholder="WhatsApp: +60 12-345 6789"
                        value={jobContact}
                        onChange={(e) => setJobContact(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-stone-100 outline-none"
                      />
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setShowJobModal(false)}
                        className="flex-1 py-2.5 rounded-xl bg-stone-800 text-stone-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                      >
                        {editingJobId ? 'Update Listing' : 'Publish Listing'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {/* Tab: Emergency Card (ICE) */}
        {((activeTab === 'emergency-card' && !mobileActiveModal) || mobileActiveModal === 'emergency-card') && (
          <div className={mobileActiveModal === 'emergency-card' ? "fixed inset-0 z-[60] overflow-y-auto bg-stone-950/95 backdrop-blur-2xl p-3 sm:p-5 flex flex-col md:relative md:inset-auto md:z-auto md:p-0 md:bg-transparent md:backdrop-blur-none" : "hidden md:block"}>
            <MobileModalHeader
              title={language === 'bm' ? 'Kad Kecemasan (ICE)' : 'Emergency Card (ICE)'}
              language={language}
              onClose={() => setMobileActiveModal(null)}
            />
            <div className="animate-in fade-in duration-200">
              <EmergencyCardSection language={language} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
