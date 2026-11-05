import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallShortcutButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
  onInstalled?: () => void;
}

export const InstallShortcutButton: React.FC<InstallShortcutButtonProps> = ({
  className = '',
  variant = 'compact',
  onInstalled,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // 1. Intercept standard browser mini-infobar
      e.preventDefault();
      // 2. Save prompt event to React state
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      if (onInstalled) onInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstalled]);

  const [showGuideNotice, setShowGuideNotice] = useState<boolean>(false);

  // Trigger native prompt when captured, or show guidance tooltip when deferredPrompt is null
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setShowGuideNotice(false);
          if (onInstalled) onInstalled();
          return;
        }
      } catch (err) {
        console.warn('[PWA INSTALL] Prompt error:', err);
      }
    }
    // Show instruction notice whenever button is clicked if prompt not available
    setShowGuideNotice(!showGuideNotice);
  };

  if (isInstalled) {
    return (
      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 text-[10px] sm:text-xs font-bold border border-emerald-500/30 ${className}`}>
        <Check className="w-3.5 h-3.5" />
        <span>Installed</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      {variant === 'full' ? (
        <button
          onClick={handleInstallClick}
          className={`w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg active:scale-95 transition-all cursor-pointer border border-emerald-400/40 flex items-center justify-center gap-2 ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Install Shortcut Now</span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          className={`px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-[9px] sm:text-[10px] shadow-sm active:scale-95 transition-transform cursor-pointer border border-emerald-400/40 flex items-center gap-1 shrink-0 ${className}`}
          title="Install CamGo Chat App shortcut to Home Screen"
        >
          <Smartphone className="w-3 h-3 text-emerald-200" />
          <span>Install Shortcut Now</span>
        </button>
      )}

      {/* Helpful Guidance Banner / Tooltip when deferredPrompt is null */}
      {showGuideNotice && !deferredPrompt && (
        <div className="absolute top-full right-0 mt-2 w-64 p-2.5 rounded-xl bg-stone-950 border border-emerald-500/40 text-stone-200 text-[10px] sm:text-xs shadow-2xl z-50 animate-in fade-in slide-in-from-top-1">
          <p className="leading-tight">
            To install this app on PC, click the install icon in your browser's address bar. On mobile, add to home screen via your browser menu.
          </p>
          <button
            onClick={() => setShowGuideNotice(false)}
            className="mt-1.5 px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[9px] font-bold block ml-auto"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default InstallShortcutButton;
