/**
 * CamGo Strict Voice Localization Service (ms-MY)
 * Inspects device speech synthesis voices to guarantee true Bahasa Malaysia (ms-MY)
 * pronunciation, strictly rejecting Indonesian (id-ID) accents, handling asynchronous
 * voiceschanged events safely, and binding isolated voice objects to SpeechSynthesisUtterance.
 */

export interface VoiceLocalizationStatus {
  available: boolean;
  voicesLoaded: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  localeMatch: 'ms-MY' | 'ms' | 'id-ID' | 'en' | 'none';
  missingSystemPack: boolean;
}

/**
 * Requirement 1: Strict Voice Matcher Utility
 * Inspects browser/device speech synthesis voices, searching explicitly for 'ms-MY'
 * or regional 'ms' language codes while strictly rejecting 'id' (Indonesian) matches.
 */
export function findStrictMsMyVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!Array.isArray(voices) || voices.length === 0) return null;

  // Step 1: Explicit exact 'ms-MY' / 'ms_MY' match
  const exactMsMy = voices.find((v) => {
    if (!v || !v.lang) return false;
    const normalizedLang = v.lang.toLowerCase().replace('_', '-');
    return normalizedLang === 'ms-my';
  });
  if (exactMsMy) return exactMsMy;

  // Step 2: Regional 'ms' prefix match strictly filtering out Indonesian ('id')
  const regionalMs = voices.find((v) => {
    if (!v || !v.lang) return false;
    const l = v.lang.toLowerCase().replace('_', '-');
    const name = (v.name || '').toLowerCase();
    const isMalay = l === 'ms' || l.startsWith('ms-');
    const isIndonesian = l === 'id' || l.startsWith('id-') || name.includes('indonesia');
    return isMalay && !isIndonesian;
  });
  if (regionalMs) return regionalMs;

  // Step 3: Check voice name for Malay/Malaysia keywords while strictly rejecting Indonesian name matches
  const namedMalay = voices.find((v) => {
    if (!v || !v.name) return false;
    const name = v.name.toLowerCase();
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    const isIndonesian = lang === 'id' || lang.startsWith('id-') || name.includes('indonesia');
    const isMalayName =
      name.includes('malay') || name.includes('malaysia') || name.includes('bahasa melayu');
    return isMalayName && !isIndonesian;
  });
  if (namedMalay) return namedMalay;

  return null;
}

class VoiceLocalizationService {
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private selectedMsVoice: SpeechSynthesisVoice | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      const handleVoicesChanged = () => {
        this.loadVoices();
        this.notifyListeners();
      };
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      } else {
        window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // ignore listener errors
      }
    }
  }

  public loadVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }
    try {
      this.cachedVoices = window.speechSynthesis.getVoices() || [];
      this.selectedMsVoice = findStrictMsMyVoice(this.cachedVoices);
    } catch {
      this.cachedVoices = [];
    }
    return this.cachedVoices;
  }

  public getStatus(): VoiceLocalizationStatus {
    const voices = this.loadVoices();
    const selected = this.selectedMsVoice;

    let localeMatch: VoiceLocalizationStatus['localeMatch'] = 'none';
    if (selected) {
      localeMatch = selected.lang.toLowerCase().replace('_', '-').includes('ms-my')
        ? 'ms-MY'
        : 'ms';
    } else {
      const hasId = voices.some(
        (v) =>
          v &&
          v.lang &&
          (v.lang.toLowerCase().startsWith('id') ||
            (v.name || '').toLowerCase().includes('indonesia'))
      );
      if (hasId) localeMatch = 'id-ID';
    }

    const missingSystemPack = !selected;

    return {
      available: voices.length > 0,
      voicesLoaded: voices.length > 0,
      voices,
      selectedVoice: selected,
      localeMatch,
      missingSystemPack,
    };
  }

  /**
   * Requirement 2: Auto-Selection & Fallback helper
   * Binds the isolated true Malaysian voice object to the SpeechSynthesisUtterance instance.
   */
  public configureUtteranceVoice(utterance: SpeechSynthesisUtterance, lang: 'bm' | 'en' = 'bm'): void {
    const voices = this.loadVoices();
    if (lang === 'bm') {
      const trueMs = this.selectedMsVoice || findStrictMsMyVoice(voices);
      if (trueMs) {
        utterance.voice = trueMs;
        utterance.lang = trueMs.lang;
      } else {
        // Explicitly pin ms-MY without binding an Indonesian (id-ID) voice object
        utterance.lang = 'ms-MY';
      }
    } else {
      const enVoice =
        voices.find(
          (v) => v && v.lang && (v.lang.toLowerCase() === 'en-us' || v.lang.toLowerCase() === 'en-gb')
        ) ||
        voices.find((v) => v && v.lang && v.lang.toLowerCase().startsWith('en')) ||
        voices[0];
      if (enVoice) {
        utterance.voice = enVoice;
        utterance.lang = enVoice.lang;
      } else {
        utterance.lang = 'en-US';
      }
    }
  }
}

export const voiceLocalizationService = new VoiceLocalizationService();
