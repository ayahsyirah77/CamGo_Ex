/**
 * PreventExitToast Component
 * Floating notification toast banner alerting Android/PWA users
 * to tap back once more within 2 seconds if they intend to exit CamGo.
 */

import React from 'react';
import { ArrowLeft, LogOut, X, Sparkles } from 'lucide-react';

export interface PreventExitToastProps {
  isVisible: boolean;
  message?: string;
  remainingSeconds?: number;
  onDismiss: () => void;
  className?: string;
}

export const PreventExitToast: React.FC<PreventExitToastProps> = ({
  isVisible,
  message = 'Press back again to exit CamGo',
  remainingSeconds = 2,
  onDismiss,
  className = '',
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <aside
      aria-label="Exit confirmation notice"
      role="alert"
      className={`fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[250] w-[92%] max-w-sm pointer-events-auto animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200 ${className}`}
    >
      <div className="rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 p-3.5 shadow-2xl shadow-black/90 text-slate-100 flex items-center justify-between gap-3 relative overflow-hidden">
        {/* Subtle decorative emerald ambient glow */}
        <div className="absolute -left-6 -top-6 w-20 h-20 rounded-full bg-emerald-500/20 blur-xl pointer-events-none" />

        {/* Icon & Message */}
        <div className="flex items-center gap-3 relative z-10 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <ArrowLeft className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-black text-white text-xs sm:text-sm tracking-tight truncate">
                {message}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Tap back within {remainingSeconds}s to leave</span>
            </p>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          aria-label="Dismiss toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
