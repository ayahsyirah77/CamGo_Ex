import React, { useEffect, useState } from 'react';
import { CamLogo } from './CamLogo';
import { Language } from '../types';

interface LoadingScreenProps {
  language: Language;
  onFinish?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ language, onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // If autostart query param is set, skip immediately
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      setIsVisible(false);
      onFinish?.();
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsVisible(false);
            onFinish?.();
          }, 350);
          return 100;
        }
        return prev + Math.floor(Math.random() * 25) + 12;
      });
    }, 180);

    return () => clearInterval(interval);
  }, [onFinish]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-950 text-stone-100 transition-opacity duration-500 overflow-hidden"
      data-testid="loading-screen"
    >
      {/* Animated Highland Mountain Mist Background */}
      <div className="absolute inset-0 bg-radial from-emerald-950/40 via-stone-950/90 to-stone-950 pointer-events-none" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Floating Mountain Silhouette Glow */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-md text-center">
        {/* Animated CamGo Logo with Pulsing Ring */}
        <div className="relative mb-8 p-6 rounded-3xl bg-emerald-950/30 border border-emerald-500/20 backdrop-blur-xl shadow-2xl shadow-emerald-950/50">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur-xl animate-pulse" />
          <div className="relative animate-bounce duration-1000">
            <CamLogo size="xl" variant="light" showTagline={true} />
          </div>
        </div>

        {/* Ambient Highland Altitude & Weather Indicator */}
        <div className="flex items-center gap-3 px-4 py-1.5 mb-6 rounded-full bg-stone-900/80 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Tanah Tinggi Cameron | 1,440m - 2,032m ASL</span>
          <span className="text-stone-400">•</span>
          <span className="text-stone-300">17°C Cool Mist</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-heading font-bold text-stone-100 mb-2 tracking-tight">
          {language === 'bm'
            ? 'Menyediakan Panduan Tanah Tinggi...'
            : 'Connecting to Highlands Live Stream...'}
        </h2>
        <p className="text-xs sm:text-sm text-stone-400 mb-8 max-w-xs">
          {language === 'bm'
            ? 'Memuatkan cuaca masa nyata, amaran trafik, dan direktori lengkap.'
            : 'Loading real-time weather microclimates, road choke points, and verified directories.'}
        </p>

        {/* Progress Bar */}
        <div className="w-64 h-1.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 transition-all duration-200 ease-out rounded-full"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between w-64 text-[10px] text-stone-400 mt-2 font-mono">
          <span>CamGo v2.5</span>
          <span>{Math.min(progress, 100)}%</span>
        </div>

        {/* Fast skip button for testing/instant access */}
        <button
          onClick={() => {
            setIsVisible(false);
            onFinish?.();
          }}
          className="mt-8 text-xs text-stone-400 hover:text-emerald-400 underline underline-offset-4 cursor-pointer transition-colors"
        >
          {language === 'bm' ? 'Langkau Terus' : 'Enter Now →'}
        </button>
      </div>
    </div>
  );
};
