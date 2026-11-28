import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Single Source of Truth: Initialize Firebase only once across entire applet
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

console.log('[Firebase] Single source of truth initialized for project:', firebaseConfig.projectId);

export const auth = getAuth(app);

// Force long-polling + enable IndexedDB offline persistence so Quick Pings & check-ins queue offline and sync cleanly
const firestoreSettings = {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
};

const fallbackFirestoreSettings = {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
};

export const db = (() => {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  try {
    return dbId
      ? initializeFirestore(app, firestoreSettings, dbId)
      : initializeFirestore(app, firestoreSettings);
  } catch (e) {
    try {
      return dbId
        ? initializeFirestore(app, fallbackFirestoreSettings, dbId)
        : initializeFirestore(app, fallbackFirestoreSettings);
    } catch (innerErr) {
      console.warn('[Firebase] initializeFirestore already called, falling back to getFirestore:', innerErr || e);
      return dbId ? getFirestore(app, dbId) : getFirestore(app);
    }
  }
})();

async function testFirestoreConnection() {
  if (typeof window === 'undefined' || !db) return;
  try {
    await getDocFromServer(doc(db, 'places', '_connection_probe'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Firestore client offline; operating with local cache until connection resumes.');
    }
  }
}
void testFirestoreConnection();

export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
export { firebaseConfig };