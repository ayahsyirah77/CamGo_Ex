/**
 * CamGo Navigation TTS Service
 * Provides robust text normalization for Bahasa Malaysia turn-by-turn navigation,
 * neural TTS endpoint integration (/api/tts/navigate), Web Speech API ms-MY/en-US
 * neural fallback, and seamless HTML5 Audio object URL playback without blocking UI.
 */

import { voiceLocalizationService } from './voiceLocalizationService';

export interface TtsNavigationOptions {
  language?: 'bm' | 'en';
  voiceSpeed?: number; // 0.85 to 1.15
  pitch?: number;
  useNeuralServer?: boolean;
}

/**
 * Requirement 1: Normalization Utility
 * Cleans up and expands abbreviations ("KM" -> "Kilometer", "Jln" -> "Jalan", "FT" -> "Laluan Persekutuan"),
 * ensuring highland landmarks (Kea Farm, Ringlet, Tanah Rata, Brinchang, Simpang Pulai, Mossy Forest)
 * are pronounced smoothly in natural Bahasa Malaysia or English cadence.
 */
export function normalizeNavigationText(rawText: string, language: 'bm' | 'en' = 'bm'): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText
    .replace(/km\b/gi, language === 'bm' ? 'kilometer' : 'kilometers')
    .replace(/jln\.?/gi, 'Jalan')
    .replace(/ft\s*(\d+)/gi, language === 'bm' ? 'Laluan Persekutuan $1' : 'Federal Route $1')
    .replace(/sek\.?\s*(\d+[\.\d]*)/gi, language === 'bm' ? 'Seksyen $1' : 'Section $1')
    .replace(/min\b/gi, language === 'bm' ? 'minit' : 'minutes')
    .replace(/hr\b/gi, language === 'bm' ? 'jam' : 'hours')
    .replace(/(&|&amp;)/g, language === 'bm' ? 'dan' : 'and');

  // Landmark pronunciation smoothing
  if (language === 'bm') {
    cleaned = cleaned
      .replace(/kea farm/gi, 'Ki Faam')
      .replace(/mossy forest/gi, 'Mosi Forest')
      .replace(/boh tea/gi, 'Boh Ti');
  }

  return cleaned.trim();
}

class NavigationTtsService {
  private activeAudio: HTMLAudioElement | null = null;

  /**
   * Stops any currently playing navigation audio announcement
   */
  public stopAudio(): void {
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
        this.activeAudio = null;
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Requirement 2 & 3: Neural TTS Integration & Audio Playback Handler
   * Sends normalized text to server-side TTS proxy or falls back to strict ms-MY Web Speech API,
   * converts audio stream to object URL, and plays seamlessly via browser Audio API.
   */
  public async speakNavigationInstruction(
    text: string,
    options: TtsNavigationOptions = {}
  ): Promise<boolean> {
    const lang = options.language || 'bm';
    const normalized = normalizeNavigationText(text, lang);
    if (!normalized) return false;

    // Stop previous announcement
    this.stopAudio();

    // 1. Try modern neural TTS server endpoint (/api/tts/navigate) when enabled
    if (options.useNeuralServer !== false && typeof navigator !== 'undefined' && navigator.onLine !== false) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const response = await fetch('/api/tts/navigate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: normalized,
            language: lang,
            speed: options.voiceSpeed || 1.0,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('audio/')) {
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            this.activeAudio = audio;
            audio.playbackRate = options.voiceSpeed || 1.0;

            await new Promise<void>((resolve, reject) => {
              audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                if (this.activeAudio === audio) this.activeAudio = null;
                resolve();
              };
              audio.onerror = (err) => {
                URL.revokeObjectURL(audioUrl);
                if (this.activeAudio === audio) this.activeAudio = null;
                reject(err);
              };
              audio.play().catch(reject);
            });
            return true;
          }
        }
      } catch (netErr) {
        console.warn('[NavigationTtsService] Neural server TTS fallback notice:', netErr);
      }
    }

    // 2. Fallback: Browser Web Speech API strictly bound to ms-MY (no id-ID fallback) or en-US
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return new Promise((resolve) => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          const utterance = new SpeechSynthesisUtterance(normalized);
          voiceLocalizationService.configureUtteranceVoice(utterance, lang);
          utterance.rate = options.voiceSpeed || (lang === 'bm' ? 0.95 : 1.0);
          utterance.pitch = options.pitch || 1.0;

          utterance.onend = () => resolve(true);
          utterance.onerror = () => resolve(false);

          window.speechSynthesis.speak(utterance);
        } catch (synthErr) {
          console.warn('[NavigationTtsService] Web Speech API fallback failed:', synthErr);
          resolve(false);
        }
      });
    }

    return false;
  }
}

export const navigationTtsService = new NavigationTtsService();
