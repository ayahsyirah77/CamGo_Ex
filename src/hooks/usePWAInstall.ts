import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isTouchMac =
    window.navigator.platform === 'MacIntel' && (window.navigator.maxTouchPoints || 0) > 1;
  return (/iphone|ipad|ipod/.test(userAgent) || isTouchMac) && !('MSStream' in window);
}

// Module-level store ensures early beforeinstallprompt events are never missed by late-mounting modals like VendorDashboard
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled: boolean = detectStandalone();
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((cb) => cb());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  window.addEventListener('appinstalled', () => {
    globalIsInstalled = true;
    globalDeferredPrompt = null;
    notifySubscribers();
  });

  try {
    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = () => {
      if (detectStandalone()) {
        globalIsInstalled = true;
        globalDeferredPrompt = null;
        notifySubscribers();
      }
    };
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
    }
  } catch {
    // Ignore older browser matchMedia listener limitations
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => globalIsInstalled || detectStandalone());
  const [isIOS] = useState<boolean>(() => detectIOS());

  useEffect(() => {
    const syncState = () => {
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstalled(globalIsInstalled || detectStandalone());
    };

    subscribers.add(syncState);
    syncState();

    return () => {
      subscribers.delete(syncState);
    };
  }, []);

  const installPWA = useCallback(async (): Promise<{ success: boolean; reason?: string }> => {
    const activePrompt = globalDeferredPrompt || deferredPrompt;
    if (!activePrompt) {
      return { success: false, reason: 'no-prompt' };
    }

    try {
      await activePrompt.prompt();
      const choice = await activePrompt.userChoice;
      if (choice.outcome === 'accepted') {
        globalIsInstalled = true;
        globalDeferredPrompt = null;
        notifySubscribers();
        return { success: true };
      }
      return { success: false, reason: 'dismissed' };
    } catch (err) {
      console.warn('[PWA INSTALL] Error calling prompt:', err);
      return { success: false, reason: 'error' };
    }
  }, [deferredPrompt]);

  const isStandalone = isInstalled || detectStandalone();
  const hasPrompt = !!deferredPrompt && !isStandalone;

  return {
    isInstallable: hasPrompt || (isIOS && !isStandalone),
    isInstalled: isStandalone,
    isStandalone,
    isIOS,
    installPWA,
    hasPrompt,
  };
}
