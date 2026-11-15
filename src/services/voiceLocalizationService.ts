/**
 * CamGo Voice Localization Service (ms-MY)
 * Inspects device speech synthesis voices to guarantee true Bahasa Malaysia (ms-MY)
 * pronunciation, automatically selecting ms-MY over Indonesian or English, and providing
 * detection state for missing system speech packs.
 */

export interface VoiceLocalizationStatus {
  available: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  localeMatch: 'ms-MY' | 'ms' | 'id-ID' | 'en' | 'none';
  missingSystemPack: boolean;
}

class VoiceLocalizationService {
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private selectedMsVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  public loadVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }
    try {
      this.cachedVoices = window.speechSynthesis.getVoices() || [];
      this.selectedMsVoice = this.findBestMsVoice(this.cachedVoices);
    } catch {
      this.cachedVoices = [];
    }
    return this.cachedVoices;
  }

  private findBestMsVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (!voices || voices.length === 0) return null;

    // 1. Strict 'ms-MY' match
    const exactMsMy = voices.find((v) => v.lang.toLowerCase() === 'ms-my');
    if (exactMsMy) return exactMsMy;

    // 2. Any Malay 'ms' prefix match (excluding Indonesian 'id')
    const generalMs = voices.find(
      (v) => v.lang.toLowerCase().startsWith('ms') && !v.lang.toLowerCase().includes('id')
    );
    if (generalMs) return generalMs;

    // 3. Fallback to any voice with 'malay' in name
    const namedMalay = voices.find(
      (v) => v.name.toLowerCase().includes('malay') || v.name.toLowerCase().includes('bahasa')
    );
    if (namedMalay) return namedMalay;

    return null;
  }

  public getStatus(): VoiceLocalizationStatus {
    const voices = this.loadVoices();
    const selected = this.selectedMsVoice;

    let localeMatch: VoiceLocalizationStatus['localeMatch'] = 'none';
    if (selected) {
      localeMatch = selected.lang.toLowerCase() === 'ms-my' ? 'ms-MY' : 'ms';
    } else {
      const hasId = voices.some((v) => v.lang.toLowerCase().startsWith('id'));
      if (hasId) localeMatch = 'id-ID';
    }

    const missingSystemPack = !selected;

    return {
      available: voices.length > 0,
      voices,
      selectedVoice: selected,
      localeMatch,
      missingSystemPack,
    };
  }

  public getBestVoiceForLanguage(lang: 'bm' | 'en'): SpeechSynthesisVoice | null {
    const voices = this.loadVoices();
    if (lang === 'bm') {
      if (this.selectedMsVoice) return this.selectedMsVoice;
      return this.findBestMsVoice(voices);
    }
    return voices.find((v) => v.lang.toLowerCase().startsWith('en')) || voices[0] || null;
  }
}

export const voiceLocalizationService = new VoiceLocalizationService();
