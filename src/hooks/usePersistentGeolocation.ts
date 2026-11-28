import { useState, useEffect, useRef, useCallback } from 'react';

export type GpsTrackingStatus =
  | 'idle'
  | 'acquiring'
  | 'active'
  | 'stalled_recovering'
  | 'permission_denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported';

export interface PersistentGpsPosition {
  lat: number;
  lng: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

interface UsePersistentGeolocationOptions {
  isActive: boolean;
  wakeLockEnabledWhenActive?: boolean;
  heartbeatIntervalMs?: number;
  staleThresholdMs?: number;
  onPositionFix: (pos: PersistentGpsPosition) => void;
  onErrorFix?: (code: number, message: string) => void;
}

interface WakeLockSentinelLike {
  released?: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
}

const DEFAULT_GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 15000,
};

export function usePersistentGeolocation({
  isActive,
  wakeLockEnabledWhenActive = false,
  heartbeatIntervalMs = 12000,
  staleThresholdMs = 12000,
  onPositionFix,
  onErrorFix,
}: UsePersistentGeolocationOptions) {
  const [gpsStatus, setGpsStatus] = useState<GpsTrackingStatus>('idle');
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFixAt, setLastFixAt] = useState<number | null>(null);
  const [keepAwakeEnabled, setKeepAwakeEnabled] = useState<boolean>(true);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);

  const wakeLockSupported =
    typeof navigator !== 'undefined' &&
    'wakeLock' in navigator &&
    typeof (navigator as unknown as { wakeLock?: { request?: unknown } }).wakeLock?.request === 'function';

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const lastFixTimeRef = useRef<number>(0);
  const onPositionRef = useRef(onPositionFix);
  const onErrorRef = useRef(onErrorFix);

  onPositionRef.current = onPositionFix;
  onErrorRef.current = onErrorFix;

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    const now = Date.now();
    lastFixTimeRef.current = now;
    setLastFixAt(now);
    setErrorCode(null);
    setErrorMessage(null);
    setGpsStatus('active');

    onPositionRef.current({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : null,
      altitude: typeof pos.coords.altitude === 'number' ? pos.coords.altitude : null,
      speed: typeof pos.coords.speed === 'number' ? pos.coords.speed : null,
      heading: typeof pos.coords.heading === 'number' ? pos.coords.heading : null,
      timestamp: pos.timestamp || now,
    });
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    const code = err?.code ?? 0;
    const msg = err?.message || 'GPS position signal error';
    setErrorCode(code);
    setErrorMessage(msg);

    if (code === 1) {
      setGpsStatus('permission_denied');
    } else if (code === 2) {
      setGpsStatus('unavailable');
    } else if (code === 3) {
      setGpsStatus('timeout');
    }

    onErrorRef.current?.(code, msg);
  }, []);

  const clearWatcher = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {
        // Ignore clearWatch errors
      }
      watchIdRef.current = null;
    }
  }, []);

  const bindWatcher = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('unsupported');
      return;
    }

    clearWatcher();
    if (lastFixTimeRef.current === 0) {
      setGpsStatus('acquiring');
    }

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        DEFAULT_GEO_OPTIONS
      );
    } catch {
      setGpsStatus('unavailable');
    }
  }, [clearWatcher, handleSuccess, handleError]);

  const forceRefreshFix = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    try {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      });
    } catch {
      // Ignore fallback errors
    }
  }, [handleSuccess, handleError]);

  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    setWakeLockActive(false);
    if (sentinel) {
      try {
        await sentinel.release();
      } catch {
        // Ignore release rejection
      }
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (!wakeLockSupported) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (wakeLockRef.current && !wakeLockRef.current.released) {
      setWakeLockActive(true);
      return;
    }

    try {
      const navWithWakeLock = navigator as unknown as {
        wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      };
      const sentinel = await navWithWakeLock.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener?.('release', () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
          setWakeLockActive(false);
        }
      });
    } catch {
      // Battery saver or iframe policy can reject Wake Lock safely without breaking GPS
      setWakeLockActive(false);
    }
  }, [wakeLockSupported]);

  // Manage Screen Wake Lock lifecycle
  useEffect(() => {
    const shouldHoldWakeLock = isActive && wakeLockEnabledWhenActive && keepAwakeEnabled;
    if (shouldHoldWakeLock) {
      void acquireWakeLock();
    } else {
      void releaseWakeLock();
    }
    return () => {
      void releaseWakeLock();
    };
  }, [isActive, wakeLockEnabledWhenActive, keepAwakeEnabled, acquireWakeLock, releaseWakeLock]);

  // Continuous watchPosition + 12s stalled heartbeat + visibilitychange recovery
  useEffect(() => {
    if (!isActive) {
      clearWatcher();
      setGpsStatus('idle');
      setErrorCode(null);
      setErrorMessage(null);
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('unsupported');
      return;
    }

    bindWatcher();
    forceRefreshFix();

    const heartbeatId = window.setInterval(() => {
      const now = Date.now();
      const sinceLast = now - (lastFixTimeRef.current || 0);
      if (sinceLast > staleThresholdMs) {
        setGpsStatus((prev) => (prev === 'permission_denied' ? prev : 'stalled_recovering'));
        forceRefreshFix();
      }
    }, heartbeatIntervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        bindWatcher();
        forceRefreshFix();
        if (wakeLockEnabledWhenActive && keepAwakeEnabled) {
          void acquireWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(heartbeatId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearWatcher();
    };
  }, [
    isActive,
    heartbeatIntervalMs,
    staleThresholdMs,
    wakeLockEnabledWhenActive,
    keepAwakeEnabled,
    bindWatcher,
    clearWatcher,
    forceRefreshFix,
    acquireWakeLock,
  ]);

  return {
    gpsStatus,
    errorCode,
    errorMessage,
    lastFixAt,
    wakeLockSupported,
    wakeLockActive,
    keepAwakeEnabled,
    setKeepAwakeEnabled,
    forceRefreshFix,
  };
}
