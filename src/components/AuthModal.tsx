import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { firebaseService } from '../services/firebase';
import { CamLogo } from './CamLogo';
import { Language } from '../types';
import {
  X,
  User,
  AlertTriangle,
  Store,
  Loader2,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (accountType: 'individual' | 'business' | 'admin') => void;
  language?: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  language = 'en',
}) => {
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual');
  const [profileName, setProfileName] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('camgo_preferred_profile_name') ||
        firebaseService.getCurrentUser()?.displayName ||
        ''
      );
    } catch {
      return '';
    }
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isBm = language === 'bm';

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    const trimmedName = profileName.trim();
    if (!trimmedName) {
      setErrorMsg(
        isBm
          ? 'Sila isi nama profil anda dahulu sebelum log masuk dengan Google.'
          : 'Please enter your profile name before signing in with Google.'
      );
      nameInputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const preferredRole = accountType === 'business' ? 'vendor' : 'user';
      const user = await firebaseService.signInWithGoogle(false, preferredRole, trimmedName);
      const effectiveType =
        user.role === 'vendor' || accountType === 'business'
          ? 'business'
          : user.role === 'admin'
          ? 'admin'
          : 'individual';
      onSuccess(effectiveType);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || (isBm ? 'Log masuk Google gagal.' : 'Google Sign-In failed.'));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[150] bg-stone-950/90 sm:backdrop-blur-md flex items-center justify-center sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full h-[100dvh] sm:h-auto sm:min-h-[680px] sm:max-h-[92dvh] sm:max-w-[430px] sm:rounded-[34px] overflow-hidden flex flex-col justify-between bg-[#0b1410] sm:border sm:border-white/20 sm:shadow-[0_25px_75px_rgba(0,0,0,0.85)] animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full-bleed Scenic Cameron Highlands Mountain & Forest Backdrop */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/assets/aistudio/explore_c7c5621e.jpg"
            alt="Cameron Highlands misty mountain forest"
            className="w-full h-full object-cover object-top scale-105"
          />
          {/* Top sky contrast veil */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/35 via-transparent to-transparent" />
          {/* Atmospheric frosted mist transition matching mobile hero layout */}
          <div
            className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-b from-transparent via-[#0f1d17]/80 to-[#0a120e] backdrop-blur-[10px]"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.65) 26%, black 52%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.65) 26%, black 52%)',
            }}
          />
        </div>

        {/* Top Bar: Subtle Close Trigger */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5 sm:pt-6">
          <div className="px-3 py-1 rounded-full bg-stone-950/40 backdrop-blur-md border border-white/15 text-[11px] font-mono font-bold tracking-wider uppercase text-emerald-200/95">
            Cameron Highlands
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] rounded-full bg-stone-950/45 hover:bg-stone-900/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lower Atmospheric Sign-In Section */}
        <div className="relative z-10 mt-auto px-6 pb-8 pt-6 flex flex-col items-center text-center space-y-5">
          {/* CamGo Logo */}
          <CamLogo size="lg" variant="light" showTagline={false} className="drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]" />

          {/* Headline */}
          <div className="space-y-1.5">
            <h2 className="text-[32px] sm:text-[36px] font-heading font-black text-white tracking-tight leading-[1.08] drop-shadow-md no-mobile-clamp">
              Explore the Highlands
            </h2>
            <p className="text-xs sm:text-sm text-stone-200/90 max-w-xs mx-auto leading-relaxed">
              {isBm
                ? 'Masukkan nama profil anda dan teruskan dengan Google untuk pengalaman Cameron Highlands.'
                : 'Enter your profile name and sign in with Google to personalize your highland guide.'}
            </p>
          </div>

          {/* Account Role Pill Selector */}
          <div className="w-full grid grid-cols-2 gap-1 p-1 rounded-full bg-stone-950/60 backdrop-blur-md border border-white/15">
            <button
              type="button"
              onClick={() => {
                setAccountType('individual');
                setErrorMsg(null);
              }}
              className={`min-h-[40px] px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                accountType === 'individual'
                  ? 'bg-emerald-500 text-stone-950 shadow-md'
                  : 'text-stone-200 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>{isBm ? 'Pelawat & Tempatan' : 'Traveler & Local'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountType('business');
                setErrorMsg(null);
              }}
              className={`min-h-[40px] px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                accountType === 'business'
                  ? 'bg-amber-400 text-stone-950 shadow-md'
                  : 'text-stone-200 hover:text-white'
              }`}
            >
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span>{isBm ? 'Peniaga' : 'Business'}</span>
            </button>
          </div>

          {/* Profile Name Field (Before Signing In) */}
          <div className="w-full text-left space-y-1.5">
            <label
              htmlFor="camgo-profile-name-input"
              className="block text-[11px] font-bold uppercase tracking-wider text-emerald-200/95 pl-2"
            >
              {isBm ? 'Nama Profil Anda' : 'Profile Name'}
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-stone-500 absolute left-4 pointer-events-none" />
              <input
                ref={nameInputRef}
                id="camgo-profile-name-input"
                type="text"
                autoComplete="name"
                value={profileName}
                onChange={(e) => {
                  setProfileName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGoogleSignIn();
                  }
                }}
                placeholder={
                  accountType === 'business'
                    ? isBm
                      ? 'cth. Kebun Strawberi Ahmad'
                      : 'e.g. Cameron Farm Lodge'
                    : isBm
                    ? 'cth. Aisyah atau Morgan'
                    : 'e.g. Morgan or Aisyah'
                }
                className="w-full min-h-[50px] pl-11 pr-4 rounded-full bg-white/95 text-stone-900 placeholder-stone-500 text-sm font-semibold border border-white/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 outline-none shadow-lg transition-all"
              />
            </div>
          </div>

          {/* Inline Validation / Error Banner */}
          {errorMsg && (
            <div className="w-full p-3 rounded-2xl bg-rose-950/85 border border-rose-400/50 text-rose-200 text-xs flex items-start gap-2 text-left">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Google Sign-In CTA */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full min-h-[52px] py-3.5 px-6 rounded-full bg-white hover:bg-stone-100 text-stone-900 font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-[0_12px_32px_rgba(0,0,0,0.45)] active:scale-[0.98] cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
            )}
            <span>
              {loading
                ? isBm
                  ? 'Mengesahkan...'
                  : 'Signing in...'
                : isBm
                ? 'Log masuk dengan Google'
                : 'Sign in with Google'}
            </span>
          </button>

          <p className="text-[11px] text-stone-400">
            {accountType === 'business'
              ? isBm
                ? 'Membuka Portal Peniaga selepas pengesahan Google.'
                : 'Opens your Business Vendor Dashboard after Google sign-in.'
              : isBm
              ? 'Selamat datang ke panduan rasmi Cameron Highlands.'
              : 'Access live hazards, maps, stays & trail safety.'}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
