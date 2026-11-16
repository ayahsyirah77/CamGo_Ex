import React, { useState, useEffect } from 'react';
import { Volume2, X, Sparkles, Check, AlertCircle } from 'lucide-react';
import { voiceLocalizationService, VoiceLocalizationStatus } from '../services/voiceLocalizationService';
import { navigationTtsService } from '../services/navigationTtsService';
import { Language } from '../types';

interface VoiceLanguageManagerProps {
  language: Language;
}

export const VoiceLanguageManager: React.FC<VoiceLanguageManagerProps> = ({ language }) => {
  const [status, setStatus] = useState<VoiceLocalizationStatus>(() =>
    voiceLocalizationService.getStatus()
  );
  const [hasSettledVoices, setHasSettledVoices] = useState<boolean>(
    () => voiceLocalizationService.getStatus().voicesLoaded
  );
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('camgo_voice_manager_dismissed') === 'true';
  });
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  useEffect(() => {
    const syncStatus = () => {
      const next = voiceLocalizationService.getStatus();
      setStatus(next);
      if (next.voicesLoaded) {
        setHasSettledVoices(true);
      }
    };

    syncStatus();
    const unsubscribe = voiceLocalizationService.subscribe(syncStatus);

    // Asynchronous re-check for voices loaded post-mount on mobile devices
    const timer = setTimeout(() => {
      syncStatus();
      setHasSettledVoices(true);
    }, 1200);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Only show the non-intrusive notification banner if voice discovery settled AND a true ms-MY system pack is missing
  if (dismissed || !hasSettledVoices || !status.missingSystemPack) {
    return null;
  }

  const handleTestVoice = async () => {
    setTesting(true);
    const testText =
      language === 'bm'
        ? 'Panduan suara Bahasa Malaysia CamGo sedang diuji.'
        : 'Testing CamGo Bahasa Malaysia navigation voice.';
    await navigationTtsService.speakNavigationInstruction(testText, { language: 'bm' });
    setTesting(false);
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 3500);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('camgo_voice_manager_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[85] bg-gradient-to-r from-amber-950/95 via-stone-950/95 to-stone-900/95 backdrop-blur-xl border-2 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.28)] rounded-2xl p-3.5 text-stone-100 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2.5 rounded-xl border bg-amber-500/20 border-amber-400/40 text-amber-300 shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-black text-white tracking-wide">
            <span>
              {language === 'bm' ? 'Perlukan Suara Panduan BM?' : 'Malay Voice Pack (ms-MY) Missing'}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/30 text-amber-200">
              {status.localeMatch === 'id-ID' ? 'No ms-MY (id-ID blocked)' : 'ms-MY'}
            </span>
          </div>
          <p className="text-[11px] text-stone-300 mt-0.5 leading-snug">
            {language === 'bm'
              ? 'Pek suara ms-MY tiada pada peranti. Semak Tetapan Bahasa telefon & muat turun Bahasa Melayu (Malaysia).'
              : 'No ms-MY voice detected on this device. Check phone Language & Speech settings to install Malay (Malaysia).'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleTestVoice}
          disabled={testing}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
        >
          {testSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>{language === 'bm' ? 'Diuji' : 'Tested'}</span>
            </>
          ) : (
            <>
              <Volume2 className={`w-3.5 h-3.5 ${testing ? 'animate-pulse' : ''}`} />
              <span>{testing ? '...' : language === 'bm' ? 'Uji Suara' : 'Test Voice'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Dismiss Voice Language Manager"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
