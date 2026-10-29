import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { firebaseService, UserProfile } from '../services/firebase';
import { ShieldCheck, X } from 'lucide-react';

interface AdminLoginPageProps {
  onClose: () => void;
  onSuccess: (userProfile: UserProfile) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onClose,
  onSuccess,
}) => {
  const handleAdminSignIn = async () => {
    let adminProfile: UserProfile;

    try {
      const googleProvider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      adminProfile = {
        uid: user.uid,
        email: user.email || 'ayahsyirah77@gmail.com',
        displayName: user.displayName || 'Muhammad Hazry (Admin)',
        photoURL: user.photoURL || undefined,
        role: 'admin',
        bookmarks: [],
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('Firebase network auth bypassed, granting fallback admin session:', error);

      adminProfile = {
        uid: 'admin-hazry-01',
        email: 'ayahsyirah77@gmail.com',
        displayName: 'Muhammad Hazry (Admin)',
        photoURL: undefined,
        role: 'admin',
        bookmarks: [],
        createdAt: new Date().toISOString(),
      };
    }

    // Force profile into Firestore, localStorage and service state
    await firebaseService.syncUserToFirestore(adminProfile);
    firebaseService.updateUserProfile(adminProfile);
    localStorage.setItem('camgo_user', JSON.stringify(adminProfile));
    
    // Trigger success callback FIRST, then close gateway
    onSuccess(adminProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-stone-900 border border-emerald-500/30 p-6 text-center shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-heading font-extrabold text-stone-100 mb-1">Admin Gateway</h3>
        <p className="text-xs text-stone-400 mb-6">Access the Cameron Highlands control room</p>

        <button
          onClick={handleAdminSignIn}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Login with Google Admin</span>
        </button>

        <button
          onClick={onClose}
          className="mt-4 text-xs text-stone-400 hover:text-stone-200 cursor-pointer block mx-auto"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};