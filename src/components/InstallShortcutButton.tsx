import React, { useState } from 'react';
import { Smartphone, Download, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

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
  const { isInstalled, installPWA, isStandalone, hasPrompt } = usePWAInstall();
  const [showGuideNotice, setShowGuideNotice] = useState<boolean>(false);

  // Trigger native prompt when captured, or show guidance tooltip when deferredPrompt is null
  const handleInstallClick = async () => {
    const res = await installPWA();
    if (!res.success && res.reason !== 'dismissed') {
      setShowGuideNotice(!showGuideNotice);
    } else if (res.success && onInstalled) {
      onInstalled();
    }
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
      {showGuideNotice && !hasPrompt && (
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
