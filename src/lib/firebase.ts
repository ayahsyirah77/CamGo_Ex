import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Single Source of Truth: Initialize Firebase only once across entire applet
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

console.log('[Firebase] Single source of truth initialized for project:', firebaseConfig.projectId);

export const auth = getAuth(app);

// Initialize Firestore with auto-detect long polling to resolve 400/404 channel stream errors in browser environments
export const db = (() => {
  try {
    return (firebaseConfig as any).firestoreDatabaseId
      ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, (firebaseConfig as any).firestoreDatabaseId)
      : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch (e) {
    console.warn('[Firebase] initializeFirestore already called, falling back to getFirestore:', e);
    return (firebaseConfig as any).firestoreDatabaseId
      ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
      : getFirestore(app);
  }
})();

export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
export { firebaseConfig };