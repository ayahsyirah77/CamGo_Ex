import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, PhoneCall, MapPin, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineIndicatorProps {
  onOpenEmergencyModal?: () => void;
  onOpenOfflineTrailsModal?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  onOpenEmergencyModal,
  onOpenOfflineTrailsModal,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-16 left-0 right-0 z-[80] px-4 py-2 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-amber-50 shadow-lg border-b border-amber-500/30 text-xs sm:text-sm font-medium flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-200"></span>
              </span>
              <WifiOff className="w-4 h-4 text-amber-200 flex-shrink-0" />
              <span>
                <strong>Offline Mode Active:</strong> Using cached Leaflet maps & local emergency directory.
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {onOpenOfflineTrailsModal && (
                <button
                  onClick={onOpenOfflineTrailsModal}
                  className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-400/40 text-amber-200 text-xs flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden sm:inline">Offline Trails</span>
                </button>
              )}
              {onOpenEmergencyModal && (
                <button
                  onClick={onOpenEmergencyModal}
                  className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-400/40 text-rose-200 text-xs flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-rose-300" />
                  <span>SOS Contacts</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {isOnline && showNotification && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-16 left-0 right-0 z-[80] px-4 py-2 bg-emerald-700 text-emerald-50 shadow-lg border-b border-emerald-500/30 text-xs font-medium text-center flex items-center justify-center gap-2"
        >
          <Wifi className="w-4 h-4 text-emerald-200" />
          <span>You are back online. Live weather & traffic updates resumed.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
