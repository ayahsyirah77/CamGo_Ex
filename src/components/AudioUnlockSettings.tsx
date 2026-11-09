/**
 * AudioUnlockSettings Component
 * Dark-themed card (slate-900 with emerald accent styling) that detects audio context state
 * and browser notification permission, with an "Enable Chimes & Alerts" unlock button.
 */

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell, CheckCircle2, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { audioService } from '../services/audioService';
import { pushNotificationService } from '../services/pushNotificationService';

interface AudioUnlockSettingsProps {
  onStatusChange?: () => void;
}

export const AudioUnlockSettings: React.FC<AudioUnlockSettingsProps> = ({ onStatusChange }) => {
  const [audioState, setAudioState] = useState<'ready' | 'locked'>(audioService.getAudioState());
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setAudioState(audioService.getAudioState());
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPerm(Notification.permission);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEnableAudioAndNotifications = async () => {
    setIsProcessing(true);
    setFeedbackMessage(null);

    try {
      // 1. Unlock Web Audio API & play test chime
      const audioSuccess = await audioService.unlockAudio();
      audioService.playTestChime();

      // 2. Request Push Notification Permission
      const notifResult = await pushNotificationService.requestPermission();

      setAudioState(audioService.getAudioState());
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPerm(Notification.permission);
      }

      if (audioSuccess && notifResult.success) {
        setFeedbackMessage('Audio chimes and push notifications successfully enabled!');
      } else if (audioSuccess) {
        setFeedbackMessage('Audio unlocked successfully. Notification permission: ' + notifResult.permission);
      } else {
        setFeedbackMessage('Audio unlock attempted. Please tap anywhere on the screen if chimes remain locked.');
      }

      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setFeedbackMessage(err?.message || 'Failed to enable chimes and notifications.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-emerald-500/30 p-5 shadow-2xl space-y-4 text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-black text-white text-base">Audio &amp; Push Alerts</h3>
            <p className="text-xs text-slate-400">Manage browser autoplay chimes &amp; lockscreen notifications</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>Active Hub</span>
        </span>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* App Audio Status */}
        <div className="rounded-xl bg-slate-950/80 border border-white/5 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {audioState === 'ready' ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Volume2 className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <VolumeX className="w-4 h-4" />
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-slate-200">App Audio</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {audioState === 'ready' ? 'Ready & Unlocked' : 'Locked (Tap to Unlock)'}
              </div>
            </div>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              audioState === 'ready' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400'
            }`}
          />
        </div>

        {/* Push Notification Status */}
        <div className="rounded-xl bg-slate-950/80 border border-white/5 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                notificationPerm === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : notificationPerm === 'denied'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">Push Notifications</div>
              <div className="text-[10px] text-slate-400 font-mono capitalize">
                {notificationPerm}
              </div>
            </div>
          </div>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              notificationPerm === 'granted'
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                : notificationPerm === 'denied'
                ? 'bg-rose-400'
                : 'bg-amber-400'
            }`}
          />
        </div>
      </div>

      {/* Enable Button */}
      <button
        onClick={handleEnableAudioAndNotifications}
        disabled={isProcessing}
        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Bell className="w-4 h-4" />
        <span>{isProcessing ? 'Enabling Chimes & Alerts...' : 'Enable Chimes &amp; Alerts'}</span>
      </button>

      {feedbackMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}
    </div>
  );
};
