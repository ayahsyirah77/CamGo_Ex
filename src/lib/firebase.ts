import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Single Source of Truth: Initialize Firebase only once across entire applet
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

console.log('[Firebase] Single source of truth initialized for project:', firebaseConfig.projectId);

export const auth = getAuth(app);
export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
export { firebaseConfig };