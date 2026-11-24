/**
 * usePwaAutoUpdate Hook
 * Manages seamless, instant background updates for the CamGo PWA on Vercel.
 * Uses vite-plugin-pwa autoUpdate without intrusive reload popups.
 */

import { useEffect, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

const SW_RELOAD_GUARD_KEY = 'camgo_sw_auto_reloaded_at';

export function usePwaAutoUpdate() {
  const lastCheckTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const hadControllerAtBoot = Boolean(navigator.serviceWorker.controller);
    let activeRegistration: ServiceWorkerRegistration | undefined;
    let isRefreshing = false;

    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        activeRegistration = registration;
        if (registration) {
          registration.update().catch(() => {});
        }
      },
      onNeedRefresh() {
        // Auto-activate any waiting worker immediately without showing a reload popup
        updateSW(true).catch(() => {});
      },
      onRegisterError(error) {
        console.warn('[PWA AutoUpdate] Service Worker registration note:', error);
      },
    });

    const checkForUpdates = async () => {
      const now = Date.now();
      if (now - lastCheckTimeRef.current < 30000) {
        return;
      }
      lastCheckTimeRef.current = now;

      try {
        const reg = activeRegistration || (await navigator.serviceWorker.getRegistration());
        if (reg) {
          await reg.update();
        }
      } catch {
        // Ignore offline/network check errors
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    const handleFocusOrOnline = () => {
      checkForUpdates();
    };

    // If a new SW replaces an existing controller mid-session, reload cleanly once (never loop)
    const handleControllerChange = () => {
      if (!hadControllerAtBoot || isRefreshing) {
        return;
      }
      try {
        const lastReload = Number(sessionStorage.getItem(SW_RELOAD_GUARD_KEY) || '0');
        if (Date.now() - lastReload < 15000) {
          return;
        }
        sessionStorage.setItem(SW_RELOAD_GUARD_KEY, String(Date.now()));
      } catch {
        // ignore storage errors
      }
      isRefreshing = true;
      window.location.reload();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);
}
