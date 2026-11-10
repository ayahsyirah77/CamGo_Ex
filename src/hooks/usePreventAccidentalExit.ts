/**
 * usePreventAccidentalExit Hook
 * Intercepts mobile hardware/browser back button popstate events to implement
 * a "Double-Tap Back to Exit" pattern, preventing users on Android/PWA from
 * accidentally exiting CamGo.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UsePreventAccidentalExitOptions {
  /** Whether the back-button trap is currently active (default: true) */
  enabled?: boolean;
  /** Max time in ms between the two back presses to allow exit (default: 2000ms) */
  timeoutMs?: number;
  /** Custom notification message */
  message?: string;
  /** Optional callback fired when an exit is confirmed */
  onConfirmExit?: () => void;
  /**
   * Optional custom handler for when modals/drawers are open.
   * If provided and returns true, the modal was closed instead of triggering exit logic.
   */
  handleModalClose?: () => boolean;
}

export interface UsePreventAccidentalExitReturn {
  showExitToast: boolean;
  exitMessage: string;
  dismissToast: () => void;
  remainingSeconds: number;
}

export function usePreventAccidentalExit({
  enabled = true,
  timeoutMs = 2000,
  message = 'Press back again to exit CamGo',
  onConfirmExit,
  handleModalClose,
}: UsePreventAccidentalExitOptions = {}): UsePreventAccidentalExitReturn {
  const [showExitToast, setShowExitToast] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(2);
  const lastBackPressTimeRef = useRef<number>(0);
  const toastTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const isPushedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    clearTimers();
    setShowExitToast(false);
    lastBackPressTimeRef.current = 0;
  }, [clearTimers]);

  const handleModalCloseRef = useRef(handleModalClose);
  const onConfirmExitRef = useRef(onConfirmExit);

  useEffect(() => {
    handleModalCloseRef.current = handleModalClose;
    onConfirmExitRef.current = onConfirmExit;
  }, [handleModalClose, onConfirmExit]);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) {
      return;
    }

    // Push initial guard state onto history stack once so back button triggers popstate rather than exiting immediately
    const pushGuardState = () => {
      try {
        if (!isPushedRef.current) {
          const stateObj = { camgoPreventExit: true, timestamp: Date.now() };
          window.history.pushState(stateObj, document.title, window.location.href);
          isPushedRef.current = true;
        }
      } catch (e) {
        console.warn('[PWA Back Trap] pushState note:', e);
      }
    };

    pushGuardState();

    const handlePopState = (event: PopStateEvent) => {
      // 1. If an active modal/drawer is open, prioritize closing it first
      if (handleModalCloseRef.current && handleModalCloseRef.current()) {
        isPushedRef.current = false;
        pushGuardState();
        return;
      }

      const now = Date.now();
      const timeSinceLastPress = now - lastBackPressTimeRef.current;

      if (timeSinceLastPress <= timeoutMs) {
        // Double-tap confirmed within 2 seconds: Allow exit!
        dismissToast();
        if (onConfirmExitRef.current) {
          onConfirmExitRef.current();
        }
        // Let user navigate back/exit naturally
        window.history.back();
      } else {
        // First back press: intercept, re-push guard state, and display prompt
        lastBackPressTimeRef.current = now;
        isPushedRef.current = false;
        pushGuardState();

        // Optional haptic vibration feedback for mobile physical buttons
        if ('vibrate' in navigator) {
          try {
            navigator.vibrate(35);
          } catch {
            // ignore
          }
        }

        clearTimers();
        setShowExitToast(true);
        setRemainingSeconds(Math.ceil(timeoutMs / 1000));

        // Start countdown display
        const startTime = Date.now();
        countdownIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const left = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
          setRemainingSeconds(left);
        }, 200);

        // Auto-hide toast after timeoutMs
        toastTimerRef.current = setTimeout(() => {
          dismissToast();
        }, timeoutMs);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearTimers();
    };
  }, [enabled, timeoutMs, clearTimers, dismissToast]);

  return {
    showExitToast,
    exitMessage: message,
    dismissToast,
    remainingSeconds,
  };
}
