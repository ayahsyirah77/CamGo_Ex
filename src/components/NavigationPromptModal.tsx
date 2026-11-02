import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation, MapPin, X, ExternalLink, Compass, Loader2 } from 'lucide-react';
import { Place } from '../types';

interface NavigationPromptModalProps {
  language?: 'en' | 'bm';
  onNavigateInternal: (place: Place) => void;
}

export const NavigationPromptModal: React.FC<NavigationPromptModalProps> = ({
  language = 'en',
  onNavigateInternal,
}) => {
  const [targetPlace, setTargetPlace] = useState<Place | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const handleOpenNavPrompt = (e: any) => {
      if (e?.detail) {
        setTargetPlace(e.detail);
      }
    };
    window.addEventListener('open-navigation-prompt', handleOpenNavPrompt as EventListener);
    return () => {
      window.removeEventListener('open-navigation-prompt', handleOpenNavPrompt as EventListener);
    };
  }, []);

  const onClose = () => {
    setIsLocating(false);
    setTargetPlace(null);
  };

  const handleLaunchNavigation = (mode: 'google' | 'waze' | 'internal') => {
    if (!targetPlace) return;

    if (mode === 'internal') {
      onNavigateInternal(targetPlace);
      setTargetPlace(null);
      return;
    }

    const lat = targetPlace.coordinates?.lat || 4.49;
    const lng = targetPlace.coordinates?.lng || 101.39;

    setIsLocating(true);

    const executeLaunch = (userLat?: number, userLng?: number) => {
      setIsLocating(false);
      if (mode === 'google') {
        const originParam = userLat && userLng ? `&origin=${userLat},${userLng}` : '';
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${originParam}&travelmode=driving`;
        window.open(url, '_blank');
      } else if (mode === 'waze') {
        const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
        window.open(url, '_blank');
      }
      setTargetPlace(null);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          executeLaunch(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('[NavigationPromptModal] GPS acquisition fallback:', err);
          executeLaunch();
        },
        { timeout: 4000, enableHighAccuracy: true }
      );
    } else {
      executeLaunch();
    }
  };

  return (
    <AnimatePresence>
      {targetPlace && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-panel w-full max-w-md bg-stone-900 border border-emerald-500/40 rounded-3xl p-6 text-stone-100 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 animate-pulse" />
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Navigation className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                    {language === 'bm' ? 'NAVIGASI GPS LANGSUNG' : 'LIVE GPS ROUTE NAVIGATOR'}
                  </div>
                  <h3 className="text-lg font-heading font-extrabold text-white line-clamp-1">
                    {targetPlace.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-950/80 rounded-2xl p-4 border border-white/5 space-y-2 mb-5">
              <div className="flex items-center justify-between text-xs text-stone-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  {targetPlace.township} • {targetPlace.elevation || 'Cameron Highlands'}
                </span>
                <span className="text-amber-400 font-bold">★ {targetPlace.rating || 4.8}</span>
              </div>
              <p className="text-xs text-stone-300 font-medium pt-1">
                {language === 'bm'
                  ? 'Adakah anda ingin memulakan navigasi GPS ke tempat ini menggunakan lokasi semasa anda?'
                  : 'Would you like to start GPS turn-by-turn navigation to this location using your current position?'}
              </p>
            </div>

            {isLocating ? (
              <div className="p-6 rounded-2xl bg-stone-950 border border-emerald-500/30 flex flex-col items-center justify-center space-y-3 text-center my-2">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs font-bold text-emerald-300">
                  {language === 'bm' ? 'Mengesan Lokasi GPS Semasa...' : 'Acquiring your current GPS location...'}
                </span>
                <span className="text-[11px] text-stone-400">
                  {language === 'bm' ? 'Menyediakan laluan terpantas...' : 'Preparing turn-by-turn route...'}
                </span>
              </div>
            ) : (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  {language === 'bm' ? 'Pilih Mod Navigasi / Peta:' : 'Select Navigation App / Mode:'}
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Google Maps Button */}
                  <button
                    onClick={() => handleLaunchNavigation('google')}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/60 cursor-pointer active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Google Maps</span>
                  </button>

                  {/* Waze Button */}
                  <button
                    onClick={() => handleLaunchNavigation('waze')}
                    className="p-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/60 cursor-pointer active:scale-95"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Waze GPS</span>
                  </button>
                </div>

                {/* In-App Interactive Map Button */}
                <button
                  onClick={() => handleLaunchNavigation('internal')}
                  className="w-full p-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                >
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'bm' ? 'Lihat Dalam Peta Interaktif CamGo' : 'View on CamGo Interactive Map'}</span>
                </button>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-stone-500">
                {targetPlace.coordinates ? `GPS: ${targetPlace.coordinates.lat.toFixed(4)}, ${targetPlace.coordinates.lng.toFixed(4)}` : 'Cameron Highlands'}
              </span>
              <button
                onClick={onClose}
                className="text-stone-400 hover:text-white font-semibold cursor-pointer underline"
              >
                {language === 'bm' ? 'Batal' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
