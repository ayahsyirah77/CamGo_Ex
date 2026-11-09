/**
 * Global Audio Utility & Mobile Autoplay Unlock Handler
 * Manages Web Audio API context, synthesized chimes, HTML5 audio test buffers,
 * and global touchstart/click listeners for mobile autoplay policy compliance.
 */

class AudioService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;
  private unlockListenersAttached = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initUnlockListeners();
    }
  }

  /**
   * Attaches one-time global touchstart and click listeners to unlock audio on first user interaction
   */
  public initUnlockListeners(): void {
    if (this.unlockListenersAttached || typeof window === 'undefined') return;
    this.unlockListenersAttached = true;

    const unlockHandler = () => {
      this.unlockAudio();
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('click', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };

    window.addEventListener('touchstart', unlockHandler, { once: true, passive: true });
    window.addEventListener('click', unlockHandler, { once: true, passive: true });
    window.addEventListener('keydown', unlockHandler, { once: true, passive: true });
  }

  /**
   * Explicitly resumes Web Audio API context and plays a silent/test audio buffer to satisfy mobile autoplay
   */
  public async unlockAudio(): Promise<boolean> {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return false;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // Play a brief silent oscillator or test beep buffer to fully satisfy mobile browser autoplay policies
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime); // near silent
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);

      this.isUnlocked = true;
      console.log('[AudioService] Audio context successfully unlocked and ready.');
      return true;
    } catch (err) {
      console.warn('[AudioService] Unlock audio note:', err);
      return false;
    }
  }

  /**
   * Checks current audio context status ('ready' | 'locked')
   */
  public getAudioState(): 'ready' | 'locked' {
    if (!this.audioCtx) return this.isUnlocked ? 'ready' : 'locked';
    return this.audioCtx.state === 'running' ? 'ready' : 'locked';
  }

  /**
   * Plays a pleasant test chime (incoming message style)
   */
  public playTestChime(): void {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx && AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('[AudioService] playTestChime error:', e);
    }
  }
}

export const audioService = new AudioService();
