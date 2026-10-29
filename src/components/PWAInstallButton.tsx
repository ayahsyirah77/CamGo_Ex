import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, CheckCircle2, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'badge' | 'fullWidth';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button',
}) => {
  const { isInstallable, isInstalled, isIOS, installPWA, hasPrompt } = usePWAInstall();
  const [showIosModal, setShowIosModal] = useState(false);

  if (isInstalled) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 shadow-sm ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>App Installed</span>
      </div>
    );
  }

  if (!isInstallable) return null;

  const handleClick = async () => {
    if (hasPrompt) {
      await installPWA();
    } else if (isIOS) {
      setShowIosModal(true);
    }
  };

  return (
    <>
      {variant === 'button' && (
        <button
          onClick={handleClick}
          className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 transition-all hover:scale-105 active:scale-95 border border-emerald-400/30 cursor-pointer ${className}`}
          title="Install CamGo App for Offline Use"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span>Install CamGo App</span>
        </button>
      )}

      {variant === 'badge' && (
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer ${className}`}
        >
          <Smartphone className="w-3 h-3 text-emerald-400" />
          <span>Install Offline App</span>
        </button>
      )}

      {variant === 'fullWidth' && (
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50 transition-all cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Install CamGo App for Offline Trails & Maps</span>
        </button>
      )}

      <AnimatePresence>
        {showIosModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-stone-900 border border-emerald-500/30 rounded-2xl p-6 text-stone-100 shadow-2xl"
            >
              <button
                onClick={() => setShowIosModal(false)}
                className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Install on iOS</h3>
                  <p className="text-xs text-stone-400">Add CamGo to your Home Screen</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-stone-300 bg-stone-950/60 p-4 rounded-xl border border-stone-800 mb-5">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>
                    Tap the <Share className="w-3.5 h-3.5 inline text-emerald-400 mx-1" /> <strong>Share</strong> button in Safari toolbar.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>
                    Scroll down and select <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400 mx-1" /> <strong>Add to Home Screen</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-xs">
                    3
                  </span>
                  <span>Tap <strong>Add</strong> in top right corner. Done!</span>
                </div>
              </div>

              <button
                onClick={() => setShowIosModal(false)}
                className="w-full py-2.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer text-xs"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
