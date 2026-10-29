import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  CheckCircle2,
  Upload,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Store,
  Phone,
  Mail,
  Lock,
  FileText,
  BadgeCheck,
  Zap,
  CreditCard,
  MapPin,
  Check,
} from 'lucide-react';
import {
  VendorListing,
  MainCategory,
  SubCategory,
  Township,
  SubscriptionTier,
} from '../types';
import { firebaseService, UserProfile } from '../services/firebase';
import { INITIAL_PLACES } from '../data/initialData';

interface VendorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  onOnboardingComplete: (listing: VendorListing) => void;
}

export const VendorOnboardingModal: React.FC<VendorOnboardingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onOnboardingComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Account Registration / Identity
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'google'>('email');
  const [emailInput, setEmailInput] = useState(currentUser?.email || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('+6012');
  const [whatsappOtp, setWhatsappOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Step 2: Claim or Register Listing
  const [listingMode, setListingMode] = useState<'claim' | 'register'>('register');
  const [claimSearchQuery, setClaimSearchQuery] = useState('');
  const [selectedClaimPlace, setSelectedClaimPlace] = useState<typeof INITIAL_PLACES[0] | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [ssmNumber, setSsmNumber] = useState('');
  const [category, setCategory] = useState<MainCategory>('services_utilities');
  const [subCategory, setSubCategory] = useState<SubCategory>('agritourism_plantations');
  const [township, setTownship] = useState<Township>('Brinchang');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('+601');
  const [whatsappNumber, setWhatsappNumber] = useState('+601');
  const [description, setDescription] = useState('');

  // Step 3: Verification Upload
  const [verificationDocFileName, setVerificationDocFileName] = useState<string | null>(null);
  const [verificationDocPreview, setVerificationDocPreview] = useState<string | null>(null);
  const [docType, setDocType] = useState<'ssm' | 'utility' | 'mdch'>('ssm');

  // Step 4: Subscription Tier Selection
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('annual_pro');
  const [billingCadence, setBillingCadence] = useState<'monthly' | 'annual'>('annual');

  if (!isOpen) return null;

  const filteredClaimPlaces = claimSearchQuery.trim()
    ? INITIAL_PLACES.filter(
        (p) =>
          p.name.toLowerCase().includes(claimSearchQuery.toLowerCase()) ||
          p.township.toLowerCase().includes(claimSearchQuery.toLowerCase())
      )
    : INITIAL_PLACES.slice(0, 4);

  const handleSelectClaim = (place: typeof INITIAL_PLACES[0]) => {
    setSelectedClaimPlace(place);
    setBusinessName(place.name);
    setCategory(place.category);
    setSubCategory(place.subCategory);
    setTownship(place.township);
    setAddress(place.location);
    if (place.contact) setContactPhone(place.contact);
    if (place.description) setDescription(place.description);
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVerificationDocFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVerificationDocPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteOnboarding = async () => {
    const newVendorListing: VendorListing = {
      id: selectedClaimPlace ? selectedClaimPlace.id : `vendor-${Date.now()}`,
      ownerUid: currentUser?.uid || `vendor-user-${Date.now()}`,
      ownerEmail: currentUser?.email || emailInput || 'vendor@camgo.my',
      businessName: businessName || 'Highland Local Business',
      ssmNumber: ssmNumber || 'Pending SSM Upload',
      verificationStatus: verificationDocPreview ? 'pending' : 'unverified',
      verificationDocUrl:
        verificationDocPreview ||
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      category,
      subCategory,
      township,
      address: address || `${township}, Cameron Highlands`,
      contactPhone: contactPhone || '+6012-3456789',
      whatsappNumber: whatsappNumber || contactPhone || '+60123456789',
      whatsappTemplateMessage: `Hello ${businessName}! I found your listing on CamGo Cameron Highlands.`,
      description: description || 'Verified Cameron Highlands local business providing authentic highland experiences.',
      operatingHours: {
        from: '08:30',
        to: '20:00',
        isOpen: true,
      },
      coverImage: selectedClaimPlace
        ? selectedClaimPlace.name.toLowerCase().includes('strawberry')
          ? '/src/assets/images/vendor_cover_strawberry_1792917725766.jpg'
          : '/src/assets/images/vendor_cover_steamboat_1792917728048.jpg'
        : '/src/assets/images/vendor_cover_strawberry_1792917725766.jpg',
      galleryImages: [
        '/src/assets/images/vendor_cover_strawberry_1792917725766.jpg',
        '/src/assets/images/vendor_cover_steamboat_1792917728048.jpg',
      ],
      coordinates: selectedClaimPlace ? selectedClaimPlace.coordinates : { lat: 4.49, lng: 101.39 },
      realTimeStatus: 'open',
      diyHarvestStatus: category === 'attraction' ? 'picking_open' : undefined,
      parkingStatus: 'private_available',
      dietaryTags: ['halal_certified', 'muslim_owned'],
      tier: selectedTier,
      billingCadence,
      tierExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isSponsored: selectedTier === 'pay_per_feature' || selectedTier === 'annual_pro',
      profileHealthScore: verificationDocPreview ? 90 : 75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firebaseService.saveVendorListing(newVendorListing);
    onOnboardingComplete(newVendorListing);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-stone-950/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-3xl bg-stone-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-8 text-stone-100 shadow-2xl my-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
                CamGo Vendor Onboarding
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                Self-Service Portal
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Manage your local business presence & convert regional highland tourists into direct leads.
            </p>
          </div>
        </div>

        {/* Progress Tracker (4 Steps) */}
        <div className="grid grid-cols-4 gap-2 mb-8 border-b border-stone-800 pb-4">
          {[
            { s: 1, label: 'Account' },
            { s: 2, label: 'Listing' },
            { s: 3, label: 'Verification' },
            { s: 4, label: 'Subscription' },
          ].map((item) => (
            <div
              key={item.s}
              onClick={() => {
                if (item.s < step) setStep(item.s as any);
              }}
              className={`flex flex-col items-center text-center cursor-pointer ${
                step === item.s
                  ? 'text-emerald-400 font-bold'
                  : step > item.s
                  ? 'text-stone-300'
                  : 'text-stone-600'
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-1 ${
                  step === item.s
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/40'
                    : step > item.s
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : 'bg-stone-800 text-stone-500 border border-stone-700'
                }`}
              >
                {step > item.s ? <Check className="w-4 h-4" /> : item.s}
              </div>
              <span className="text-[11px] truncate">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Account Registration */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Step 1: Vendor Account Registration
              </h3>
              <p className="text-xs text-stone-400 mb-4">
                Sign in or register your official business representative account to access the dashboard.
              </p>

              {currentUser ? (
                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        currentUser.photoURL ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
                      }
                      alt={currentUser.displayName}
                      className="w-10 h-10 rounded-full object-cover border border-emerald-400"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">{currentUser.displayName}</span>
                      <span className="text-[11px] text-stone-400">{currentUser.email}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Account Verified
                  </span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Method Selector Tabs */}
                  <div className="flex items-center gap-2 p-1 bg-stone-900 rounded-xl border border-stone-800">
                    <button
                      onClick={() => setAuthMethod('email')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        authMethod === 'email' ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Email & Password
                    </button>
                    <button
                      onClick={() => setAuthMethod('phone')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        authMethod === 'phone' ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      WhatsApp OTP
                    </button>
                    <button
                      onClick={() => setAuthMethod('google')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        authMethod === 'google' ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Google OAuth
                    </button>
                  </div>

                  {authMethod === 'email' && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1">Business Email</label>
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="owner@cameronstrawberries.my"
                          className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1">Secure Password</label>
                        <input
                          type="password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}

                  {authMethod === 'phone' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-300 mb-1">WhatsApp Mobile Number</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value)}
                            placeholder="+60123456789"
                            className="flex-1 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={() => setOtpSent(true)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                          >
                            {otpSent ? 'Resend OTP' : 'Send WhatsApp OTP'}
                          </button>
                        </div>
                      </div>
                      {otpSent && (
                        <div>
                          <label className="block text-xs font-medium text-stone-300 mb-1">Enter 6-Digit OTP</label>
                          <input
                            type="text"
                            value={whatsappOtp}
                            onChange={(e) => setWhatsappOtp(e.target.value)}
                            placeholder="849201"
                            className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono tracking-widest text-center text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {authMethod === 'google' && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const u = await firebaseService.signInWithGoogle(true);
                          setEmailInput(u.email);
                          setStep(2);
                        } catch (err) {
                          console.error("Google sign in error:", err);
                        }
                      }}
                      className="w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign In with Google Mail (ayahsyirah77@gmail.com / OAuth)</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2"
              >
                <span>Continue to Listing Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Claim or Register Listing */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Step 2: Business Claim or New Listing
                </h3>
                <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-xl border border-stone-800">
                  <button
                    onClick={() => setListingMode('register')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      listingMode === 'register' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Register New Listing
                  </button>
                  <button
                    onClick={() => setListingMode('claim')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      listingMode === 'claim' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Claim Existing Profile
                  </button>
                </div>
              </div>

              {listingMode === 'claim' && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-stone-300">
                    Search CamGo Directory to Claim Ownership
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={claimSearchQuery}
                      onChange={(e) => setClaimSearchQuery(e.target.value)}
                      placeholder="Search by business name (e.g. Raju Strawberry, Boh Tea...)"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid gap-2 max-h-48 overflow-y-auto pr-1">
                    {filteredClaimPlaces.map((place) => (
                      <div
                        key={place.id}
                        onClick={() => handleSelectClaim(place)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          selectedClaimPlace?.id === place.id
                            ? 'bg-emerald-950/80 border-emerald-500 text-white'
                            : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-xs block text-white">{place.name}</span>
                          <span className="text-[10px] text-stone-400">
                            {place.township} · {place.category.toUpperCase()}
                          </span>
                        </div>
                        {selectedClaimPlace?.id === place.id ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <span className="text-[11px] text-emerald-400 hover:underline">Select & Claim</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Input Fields */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Business Name *</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Raju Highland Strawberry & Agritourism Farm"
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    SSM Reg Number <span className="text-stone-500 font-normal">(Optional for Verified Badge)</span>
                  </label>
                  <input
                    type="text"
                    value={ssmNumber}
                    onChange={(e) => setSsmNumber(e.target.value)}
                    placeholder="201901034928"
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Primary Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MainCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="services_utilities">Services & Utilities</option>
                    <option value="food">Food & Beverages</option>
                    <option value="travel_tourism">Travel & Highland Tourism</option>
                    <option value="accommodation">Accommodation</option>
                    <option value="transport">Transport & Mobility Services</option>
                    <option value="local_services">Local Services & Amenities</option>
                    <option value="shopping">Shopping & Local Produce</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Primary Township</label>
                  <select
                    value={township}
                    onChange={(e) => setTownship(e.target.value as Township)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
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

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+6016-5521908"
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Direct WhatsApp Inquiry Number</label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+60165521908"
                    className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Full Premise Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Lot 44, Kea Farm Market Street, Brinchang, Pahang"
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Business Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe your strawberry farm, steamboat specialty, or boutique resort offerings..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!businessName.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2"
              >
                <span>Continue to Verification</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verification Step */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-400" />
                  Step 3: Verification Document Upload
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Upload a photo or PDF of your SSM Certificate, Premise Utility Bill, or MDCH License to receive the <strong>Verified Local Business</strong> badge on CamGo maps & directories.
                </p>
              </div>

              {/* Document Type Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDocType('ssm')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    docType === 'ssm'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <span className="text-xs font-bold block">SSM Certificate</span>
                  <span className="text-[10px] text-stone-400">Borang D / E</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocType('utility')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    docType === 'utility'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Building2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <span className="text-xs font-bold block">Premise Utility Bill</span>
                  <span className="text-[10px] text-stone-400">TNB / SYABAS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocType('mdch')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    docType === 'mdch'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <BadgeCheck className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <span className="text-xs font-bold block">MDCH License</span>
                  <span className="text-[10px] text-stone-400">District Council</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-stone-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center bg-stone-900/50 transition-all relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleDocUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {verificationDocFileName ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-xs font-bold text-white">{verificationDocFileName}</p>
                    <p className="text-[11px] text-emerald-400">Document ready for instant verification check</p>
                    {verificationDocPreview && (
                      <div className="mt-2 max-w-xs mx-auto overflow-hidden rounded-xl border border-emerald-500/30">
                        <img
                          src={verificationDocPreview}
                          alt="Doc preview"
                          className="w-full h-24 object-cover"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 text-stone-400 mx-auto" />
                    <p className="text-xs font-bold text-stone-200">
                      Drag & Drop your document photo or PDF here
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Supports JPG, PNG, PDF up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2"
              >
                <span>Select Subscription Package</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Subscription Tier Selection */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Step 4: Choose Vendor Subscription Plan
                  </h3>
                  <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-xl border border-stone-800 text-[11px]">
                    <button
                      onClick={() => setBillingCadence('monthly')}
                      className={`px-3 py-1 font-semibold rounded-lg transition-colors ${
                        billingCadence === 'monthly' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingCadence('annual')}
                      className={`px-3 py-1 font-semibold rounded-lg transition-colors ${
                        billingCadence === 'annual' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Annual (2 Months Free)
                    </button>
                  </div>
                </div>
              </div>

              {/* Pricing Cards */}
              <div className="grid sm:grid-cols-3 gap-3">
                {/* 1. Free Trial */}
                <div
                  onClick={() => setSelectedTier('free_trial')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedTier === 'free_trial'
                      ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-stone-300 block">Free Trial</span>
                    <div className="my-2">
                      <span className="text-xl font-black text-white">RM 0</span>
                      <span className="text-[11px] text-stone-400"> / 14 days</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-stone-300 my-3">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Basic Directory Listing
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        1-Click WhatsApp Trigger
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Real-time Open/Closed Switch
                      </li>
                    </ul>
                  </div>
                  <span className="w-full text-center py-1.5 rounded-xl bg-stone-800 text-stone-200 text-xs font-bold">
                    Start Free Trial
                  </span>
                </div>

                {/* 2. Pro Vendor (Recommended) */}
                <div
                  onClick={() => setSelectedTier(billingCadence === 'annual' ? 'annual_pro' : 'monthly_pro')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                    selectedTier === 'annual_pro' || selectedTier === 'monthly_pro'
                      ? 'bg-gradient-to-b from-emerald-950 via-stone-900 to-stone-900 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl'
                      : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-black shadow">
                    Most Popular
                  </span>
                  <div>
                    <span className="text-xs font-bold text-emerald-300 block">Pro Vendor</span>
                    <div className="my-2">
                      <span className="text-2xl font-black text-white">
                        RM {billingCadence === 'annual' ? '39' : '49'}
                      </span>
                      <span className="text-[11px] text-stone-400"> / month</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-stone-200 my-3">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <strong>Verified Badge</strong>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        DIY Harvest & Parking Alerts
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Voucher & Event Publisher
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Customer Analytics Dashboard
                      </li>
                    </ul>
                  </div>
                  <span className="w-full text-center py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow">
                    Select Pro Plan
                  </span>
                </div>

                {/* 3. Pay-Per-Feature / Sponsored */}
                <div
                  onClick={() => setSelectedTier('pay_per_feature')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    selectedTier === 'pay_per_feature'
                      ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-stone-300 block">Sponsored Boost</span>
                    <div className="my-2">
                      <span className="text-xl font-black text-white">RM 99</span>
                      <span className="text-[11px] text-stone-400"> / campaign</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-stone-300 my-3">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Top of Search Placement
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Township Priority Pin
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Featured Event Banner
                      </li>
                    </ul>
                  </div>
                  <span className="w-full text-center py-1.5 rounded-xl bg-stone-800 text-stone-200 text-xs font-bold">
                    Select Sponsored
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleCompleteOnboarding}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs shadow-xl shadow-emerald-950/60 flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Launch My Vendor Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
