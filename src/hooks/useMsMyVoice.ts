import { useState, useEffect, useCallback } from 'react';
import { voiceLocalizationService, VoiceLocalizationStatus } from '../services/voiceLocalizationService';

export function useMsMyVoice() {
  const [status, setStatus] = useState<VoiceLocalizationStatus>(() =>
    voiceLocalizationService.getStatus()
  );
  const [dismissedBanner, setDismissedBanner] = useState<boolean>(false);

  const refreshVoices = useCallback(() => {
    const s = voiceLocalizationService.getStatus();
    setStatus(s);
  }, []);

  useEffect(() => {
    refreshVoices();
    const timer = setTimeout(refreshVoices, 800);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        refreshVoices();
      };
    }

    return () => clearTimeout(timer);
  }, [refreshVoices]);

  const dismissBannerPermanently = useCallback(() => {
    setDismissedBanner(true);
    try {
      localStorage.setItem('camgo_ms_voice_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  }, []);

  return {
    ...status,
    refreshVoices,
    dismissedBanner:
      dismissedBanner ||
      (typeof window !== 'undefined' &&
        localStorage.getItem('camgo_ms_voice_banner_dismissed') === 'true'),
    dismissBannerPermanently,
  };
}
