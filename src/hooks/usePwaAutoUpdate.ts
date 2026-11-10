/**
 * usePwaAutoUpdate Hook
 * Manages seamless, automatic background updates for the CamGo PWA.
 * Automatically checks for updates on visibility changes, online events,
 * and app focus, activating updates smoothly in the background without
 * intrusive manual reload popups.
 */

import { useEffect, useRef } from 'react';

export function usePwaAutoUpdate() {
  const lastCheckTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Function to trigger background service worker update check
    const checkForUpdates = async () => {
      const now = Date.now();
      // Throttle update checks to at most once every 30 seconds
      if (now - lastCheckTimeRef.current < 30000) {
        return;
      }
      lastCheckTimeRef.current = now;

      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          console.log('[PWA AutoUpdate] Checking for updates in background...');
          await reg.update();
        }
      } catch (err) {
        console.warn('[PWA AutoUpdate] Background check notice:', err);
      }
    };

    // 1. Check for updates on visibility change (when user returns to PWA shortcut)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    // 2. Check for updates when device regains internet connection or gains focus
    const handleFocusOrOnline = () => {
      checkForUpdates();
    };

    // 3. Listen for Service Worker controllerchange for silent activation
    const handleControllerChange = () => {
      console.log('[PWA AutoUpdate] New Service Worker activated smoothly in background.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Initial check after 5 seconds of idle app launch
    const initialTimer = setTimeout(checkForUpdates, 5000);

    return () => {
      clearTimeout(initialTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);
}
