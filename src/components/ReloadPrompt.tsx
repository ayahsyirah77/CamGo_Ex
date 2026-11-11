/**
 * ReloadPrompt Component
 * Floating notification toast banner that detects PWA service worker updates
 * and prompts users to reload for the latest version of CamGo.
 */

import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, Sparkles, X, Wifi } from 'lucide-react';

export interface ReloadPromptProps {
  className?: string;
  autoCheckInterval?: number; // Periodic check interval in ms (default: 60 minutes)
}

export const ReloadPrompt: React.FC<ReloadPromptProps> = ({
  className = '',
  autoCheckInterval = 60 * 60 * 1000,
}) => {
  const [isReloading, setIsReloading] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (registration && autoCheckInterval > 0) {
        setInterval(() => {
          registration.update().catch((err) => {
            console.warn('[PWA] Periodic update check notice:', err);
          });
        }, autoCheckInterval);
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Service Worker registration warning:', error);
    },
  });

  const handleReload = async () => {
    setIsReloading(true);
    // Set a fast 300ms fallback timeout to force reload if service worker update stalls
    const fallbackTimer = setTimeout(() => {
      window.location.reload();
    }, 300);

    try {
      await updateServiceWorker(true);
    } catch (err) {
      console.error('[PWA] updateServiceWorker error:', err);
      clearTimeout(fallbackTimer);
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    return null;
  }

  return (
    <aside
      aria-label="App update notification"
      aria-live="polite"
      className={`fixed bottom-24 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto sm:max-w-md z-[200] animate-in fade-in slide-in-from-bottom-5 duration-300 ${className}`}
    >
      <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 p-4 shadow-2xl shadow-black/80 text-slate-100 flex flex-col gap-3 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />

        {/* Header & Content */}
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <h4 className="font-heading font-black text-white text-sm sm:text-base leading-tight">
                A new version of CamGo is available!
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Tap reload to get the latest traffic &amp; weather updates.
            </p>
          </div>

          {/* Close / Dismiss Icon Button */}
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss update notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/70 relative z-10">
          <button
            onClick={handleReload}
            disabled={isReloading}
            className="flex-1 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`}
            />
            <span>{isReloading ? 'Updating App...' : 'Reload Now'}</span>
          </button>

          <button
            onClick={handleDismiss}
            className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800/90 text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer border border-slate-700/60"
          >
            Dismiss
          </button>
        </div>
      </div>
    </aside>
  );
};
