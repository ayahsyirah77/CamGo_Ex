import React, { useState } from 'react';
import { Download, Smartphone, Share, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface VendorPwaInstallerProps {
  variant?: 'banner' | 'compact';
  className?: string;
}

export const VendorPwaInstaller: React.FC<VendorPwaInstallerProps> = ({
  variant = 'banner',
  className = '',
}) => {
  const { hasPrompt, isIOS, isStandalone, isInstalled, installPWA } = usePWAInstall();
  const [showIosModal, setShowIosModal] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  // Never show installer if already running as installed standalone PWA or after appinstalled fires
  if (isStandalone || isInstalled) {
    return null;
  }

  // Only render when installable via Android/Chromium beforeinstallprompt or iOS Safari non-standalone
  if (!hasPrompt && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (hasPrompt) {
      setIsPrompting(true);
      try {
        await installPWA();
      } finally {
        setIsPrompting(false);
      }
      return;
    }

    if (isIOS) {
      setShowIosModal(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={isPrompting}
          className={`px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/50 text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/50 transition-all active:scale-95 cursor-pointer disabled:opacity-60 shrink-0 ${className}`}
          title={hasPrompt ? 'Install Vendor Dashboard App' : 'Install Vendor App'}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>{hasPrompt ? 'Install Vendor Dashboard App' : 'Install Vendor App'}</span>
        </button>
      ) : (
        <div
          className={`p-3 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-stone-900 to-teal-950/80 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-lg ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-extrabold text-white truncate">
                CamGo Vendor Portal Home Screen App
              </p>
              <p className="text-[11px] text-emerald-200/80 truncate">
                Launch straight into your Vendor Dashboard in one tap.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isPrompting}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60 shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>{hasPrompt ? 'Install Vendor Dashboard App' : 'Install Vendor App'}</span>
          </button>
        </div>
      )}

      {showIosModal && (
        <div
          className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setShowIosModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-stone-900 border border-emerald-500/40 p-5 text-left text-stone-100 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Share className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-heading">
                    Install CamGo Vendor App
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    iPhone &amp; iPad Safari Shortcut
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="p-1.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close iOS install instructions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-950/90 border border-white/10 text-xs text-stone-200 leading-relaxed flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <p>
                Tap the Share icon at the bottom of Safari, then select &apos;Add to Home Screen&apos; for one-tap Vendor Dashboard access.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
