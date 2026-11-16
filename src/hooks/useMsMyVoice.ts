import { useState, useEffect, useCallback } from 'react';
import { voiceLocalizationService, VoiceLocalizationStatus } from '../services/voiceLocalizationService';

export function useMsMyVoice() {
  const [status, setStatus] = useState<VoiceLocalizationStatus>(() =>
    voiceLocalizationService.getStatus()
  );
  const [dismissedBanner, setDismissedBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('camgo_ms_voice_banner_dismissed') === 'true';
  });

  const refreshVoices = useCallback(() => {
    setStatus(voiceLocalizationService.getStatus());
  }, []);

  useEffect(() => {
    refreshVoices();
    const unsubscribe = voiceLocalizationService.subscribe(refreshVoices);
    const timer = setTimeout(refreshVoices, 800);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
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
    dismissedBanner,
    dismissBannerPermanently,
  };
}
