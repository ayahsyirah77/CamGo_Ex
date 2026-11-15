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
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('camgo_voice_manager_dismissed') === 'true';
  });
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = voiceLocalizationService.subscribe(() => {
      setStatus(voiceLocalizationService.getStatus());
    });

    // Asynchronous re-check for voices loaded post-mount
    const timer = setTimeout(() => {
      setStatus(voiceLocalizationService.getStatus());
    }, 1000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  if (dismissed) return null;

  const handleTestVoice = async () => {
    setTesting(true);
    const testText =
      language === 'bm'
        ? 'Navigasi CamGo dikonfigurasi dalam Bahasa Malaysia asli.'
        : 'CamGo navigation configured in true Bahasa Malaysia.';
    await navigationTtsService.speakNavigationInstruction(testText, { language: 'bm' });
    setTesting(false);
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 4000);
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
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[85] bg-gradient-to-r from-emerald-950/95 via-stone-950/95 to-teal-950/95 backdrop-blur-xl border-2 border-emerald-400/60 shadow-[0_0_35px_rgba(16,185,129,0.35)] rounded-2xl p-3.5 text-stone-100 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`p-2.5 rounded-xl border shrink-0 ${
            status.missingSystemPack
              ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
              : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
          }`}
        >
          {status.missingSystemPack ? (
            <AlertCircle className="w-5 h-5 animate-pulse" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-black text-white tracking-wide">
            <span>Suara Panduan BM (ms-MY)</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                status.missingSystemPack
                  ? 'bg-amber-500/30 text-amber-200'
                  : 'bg-emerald-500/30 text-emerald-300'
              }`}
            >
              {status.selectedVoice ? status.selectedVoice.lang : 'Fallback Active'}
            </span>
          </div>
          <p className="text-[11px] text-stone-300 truncate mt-0.5">
            {status.missingSystemPack
              ? 'Pek suara ms-MY tiada pada peranti. Sila semak tetapan bahasa telefon.'
              : 'Sebutan rasmi Bahasa Malaysia diaktifkan (tiada loghat Indonesia).'}
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
          {testSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Jelas!</span>
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
