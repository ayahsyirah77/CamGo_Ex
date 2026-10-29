import React, { useState } from 'react';
import { firebaseService } from '../services/firebase';
import { CamLogo } from './CamLogo';
import { Language } from '../types';
import {
  X,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertTriangle,
  Store,
  Sparkles,
  Building2,
  ShieldCheck,
  CheckCircle2,
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
  const [accountType, setAccountType] = useState<'individual' | 'business' | 'admin'>('individual');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isBm = language === 'bm';

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await firebaseService.signInWithGoogle(accountType === 'admin');
      onSuccess(accountType);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.endsWith('@gmail.com')) {
      setErrorMsg(
        isBm
          ? 'Pendaftaran dan log masuk memerlukan alamat emel Google (@gmail.com) yang sah.'
          : 'Registration and sign-in require a valid Google (@gmail.com) email address.'
      );
      return;
    }

    setLoading(true);
    try {
      await firebaseService.signInWithEmail(cleanEmail, name);
      onSuccess(accountType);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-md rounded-3xl p-5 sm:p-7 bg-stone-900 border border-emerald-500/40 shadow-2xl relative my-auto animate-in fade-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-stone-800/80 text-stone-400 hover:text-white hover:bg-stone-700 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Logo & Title */}
        <div className="text-center mb-5">
          <CamLogo size="lg" variant="light" className="mx-auto mb-2" />
          <h3 className="text-xl sm:text-2xl font-heading font-black text-stone-100">
            {isSignUp
              ? isBm
                ? 'Daftar Akaun CamGo'
                : 'Create CamGo Account'
              : isBm
              ? 'Selamat Kembali ke CamGo'
              : 'Welcome Back to CamGo'}
          </h3>
          <p className="text-xs text-stone-400 mt-1">
            {isBm
              ? 'Sila pilih jenis akaun anda untuk meneruskan:'
              : 'Please choose your account type to proceed:'}
          </p>
        </div>

        {/* Account Type Selector: Individual vs Business */}
        <div className="mb-5 grid grid-cols-3 gap-2 p-1 rounded-2xl bg-stone-950/90 border border-white/10">
          {/* Individual Option */}
          <button
            type="button"
            onClick={() => {
              setAccountType('individual');
              setErrorMsg(null);
            }}
            className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              accountType === 'individual'
                ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-950/60 font-bold border border-emerald-400/40'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <div
              className={`p-2 rounded-xl ${
                accountType === 'individual' ? 'bg-white/20 text-white' : 'bg-stone-800 text-emerald-400'
              }`}
            >
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-heading font-extrabold block">
                {isBm ? 'Pelawat & Tempatan' : 'Traveler & Local'}
              </span>
              <span className="text-[10px] opacity-80 block font-normal leading-tight">
                {isBm ? 'Pelawat & Penduduk Tempatan' : 'Visitor & Local Resident'}
              </span>
            </div>
          </button>

          {/* Business Option */}
          <button
            type="button"
            onClick={() => {
              setAccountType('business');
              setErrorMsg(null);
            }}
            className={`p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
              accountType === 'business'
                ? 'bg-gradient-to-b from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-950/60 font-bold border border-amber-400/40'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <div
              className={`p-2 rounded-xl ${
                accountType === 'business' ? 'bg-white/20 text-white' : 'bg-stone-800 text-amber-400'
              }`}
            >
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-heading font-extrabold block">
                {isBm ? 'Akaun Perniagaan' : 'Business'}
              </span>
              <span className="text-[10px] opacity-80 block font-normal leading-tight">
                {isBm ? 'Peniaga & Operator' : 'Vendor & Operator'}
              </span>
            </div>
          </button>


        </div>

        {/* Dynamic Context Notice based on selected account type */}
        <div
          className={`mb-4 p-3 rounded-2xl text-xs border flex items-start gap-2.5 ${
            accountType === 'business'
              ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              : accountType === 'admin'
              ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
              : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
          }`}
        >
          {accountType === 'business' ? (
            <Store className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          ) : accountType === 'admin' ? (
            <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="text-[11px] leading-relaxed">
            {accountType === 'business' ? (
              <span>
                <strong>{isBm ? 'Portal Peniaga:' : 'Business Vendor Portal:'}</strong>{' '}
                {isBm
                  ? 'Akan membuka papan pemuka layan diri untuk mengurus profil premis, status DIY petik strawberi, parkir langsung, dan baucar promosi.'
                  : 'Immediately opens the Vendor Management Dashboard to manage your business presence, live DIY harvest alerts, parking, and deals.'}
              </span>
            ) : accountType === 'admin' ? (
              <span>
                <strong>{isBm ? 'Portal Admin:' : 'Admin Portal:'}</strong>{' '}
                {isBm
                  ? 'Akses eksklusif untuk pengurusan sistem, pengguna, dan tetapan global.'
                  : 'Exclusive access for system management, user administration, and global settings.'}
              </span>
            ) : (
              <span>
                <strong>{isBm ? 'Akaun Pelawat & Tempatan:' : 'Traveler & Local Account:'}</strong>{' '}
                {isBm
                  ? 'Akses ke laman utama, penanda buku, perancang jadual, atau kemudahan penduduk tempatan Cameron Highlands.'
                  : 'Access the portal for attractions, split-screen itineraries, community, or local resident services.'}
              </span>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs flex items-center justify-center gap-3 transition-colors shadow-md cursor-pointer mb-3 disabled:opacity-50"
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
          <span>
            {accountType === 'business'
              ? isBm
                ? 'Teruskan dengan Google (Peniaga)'
                : 'Sign In with Google (Business)'
              : isBm
              ? 'Teruskan dengan Google (Pelawat & Tempatan)'
              : 'Sign In with Google (Traveler & Local)'}
          </span>
        </button>

        <div className="relative my-3 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative bg-stone-900 px-3 text-[10px] text-stone-500 uppercase tracking-widest font-mono">
            {isBm ? 'Atau dengan Emel @gmail.com' : 'Or with @gmail.com'}
          </span>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <div>
              <label className="text-xs text-stone-300 block mb-1">
                {accountType === 'business'
                  ? isBm
                    ? 'Nama Pemilik / Syarikat'
                    : 'Owner / Business Contact Name'
                  : isBm
                  ? 'Nama Anda'
                  : 'Your Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  required
                  type="text"
                  placeholder={accountType === 'business' ? 'Haji Ahmad / Strawberry Valley Sdn Bhd' : 'Alex Tan'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-stone-300">{isBm ? 'Alamat Emel' : 'Email Address'}</label>
              <span className="text-[10px] font-mono text-emerald-400">* @gmail.com</span>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                type="email"
                placeholder={accountType === 'business' ? 'vendor.cameron@gmail.com' : 'alex.traveler@gmail.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-stone-300 block mb-1">{isBm ? 'Kata Laluan' : 'Password'}</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-800 border border-white/10 text-xs text-stone-100 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-2 py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 ${
              accountType === 'business'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-amber-950/60'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/60'
            }`}
          >
            <span>
              {loading
                ? isBm
                  ? 'Mengesahkan...'
                  : 'Authenticating...'
                : accountType === 'business'
                ? isSignUp
                  ? isBm
                    ? 'Daftar & Buka Portal Peniaga'
                    : 'Sign Up & Open Vendor Portal'
                  : isBm
                  ? 'Log Masuk ke Portal Peniaga'
                  : 'Sign In to Vendor Portal'
                : isSignUp
                ? isBm
                  ? 'Daftar sebagai Pelawat & Tempatan'
                  : 'Sign Up as Traveler & Local'
                : isBm
                ? 'Log Masuk ke CamGo'
                : 'Sign In to CamGo'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-stone-400">
          <span>{isSignUp ? (isBm ? 'Sudah mempunyai akaun?' : 'Already have an account?') : (isBm ? 'Belum mempunyai akaun?' : "Don't have an account?")} </span>
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsSignUp(!isSignUp);
            }}
            className="text-emerald-400 hover:underline font-bold cursor-pointer"
          >
            {isSignUp ? (isBm ? 'Log Masuk' : 'Sign In') : (isBm ? 'Daftar Percuma' : 'Sign Up Free')}
          </button>
        </div>
      </div>
    </div>
  );
};
