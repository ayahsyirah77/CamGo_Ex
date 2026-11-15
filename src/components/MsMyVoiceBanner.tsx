import React, { useState } from 'react';
import { Volume2, X, Sparkles, Check } from 'lucide-react';
import { useMsMyVoice } from '../hooks/useMsMyVoice';
import { navigationTtsService } from '../services/navigationTtsService';
import { Language } from '../types';

interface MsMyVoiceBannerProps {
  language: Language;
}

export const MsMyVoiceBanner: React.FC<MsMyVoiceBannerProps> = ({ language }) => {
  const { missingSystemPack, selectedVoice, refreshVoices, dismissedBanner, dismissBannerPermanently } =
    useMsMyVoice();
  const [testing, setTesting] = useState(false);
  const [testedSuccess, setTestedSuccess] = useState(false);

  // Only show if missing system pack or user wants verification
  if (dismissedBanner) return null;

  const handleTestVoice = async () => {
    setTesting(true);
    refreshVoices();
    const testMsg =
      language === 'bm'
        ? 'Suara panduan navigasi CamGo Bahasa Malaysia aktif.'
        : 'CamGo Bahasa Malaysia navigation voice is active.';
    await navigationTtsService.speakNavigationInstruction(testMsg, { language: 'bm' });
    setTesting(false);
    setTestedSuccess(true);
    setTimeout(() => setTestedSuccess(false), 4000);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[85] bg-gradient-to-r from-emerald-950/95 via-stone-950/95 to-teal-950/95 backdrop-blur-xl border-2 border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.3)] rounded-2xl p-3.5 text-stone-100 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shrink-0">
          <Volume2 className="w-5 h-5 animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-black text-white tracking-wide">
            <span>Perlukan Suara Panduan BM?</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 text-[9px] font-mono">
              {selectedVoice ? selectedVoice.lang : 'ms-MY'}
            </span>
          </div>
          <p className="text-[11px] text-stone-300 truncate mt-0.5">
            {missingSystemPack
              ? 'Pek suara ms-MY tiada. Klik uji atau tetapkan suara tempatan.'
              : 'Aktifkan sebutan lancar Bahasa Malaysia untuk navigasi.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleTestVoice}
          disabled={testing}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
        >
          {testedSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Aktif!</span>
            </>
          ) : (
            <>
              <Sparkles className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Uji...' : 'Uji Suara'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={dismissBannerPermanently}
          className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Dismiss voice prompt banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
