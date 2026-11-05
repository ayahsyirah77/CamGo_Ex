/**
 * Web Push Notification Service
 * Manages Service Worker push subscriptions, native Notification API,
 * background lockscreen delivery (WhatsApp style), and synthesized sound alerts.
 */

import { PushNotificationPayload } from '../types/chatLounge';

class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initServiceWorker();
    }
  }

  /**
   * Initializes Service Worker for Web Push and background sync
   */
  public async initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      // Wait until the service worker is active and ready
      await navigator.serviceWorker.ready;
      this.swRegistration = reg;
      console.log('[PUSH SERVICE] Service Worker active and ready with scope:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('[PUSH SERVICE] Service Worker registration note:', err);
      try {
        const readyReg = await navigator.serviceWorker.ready;
        this.swRegistration = readyReg;
        return readyReg;
      } catch {
        return null;
      }
    }
  }

  /**
   * Checks if browser supports native Notifications & Push API
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Returns current permission state ('granted' | 'denied' | 'default')
   */
  public getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Prompts user for native push notification permission and saves subscription state
   */
  public async requestPermission(): Promise<{
    success: boolean;
    permission: NotificationPermission;
    error?: string;
  }> {
    if (typeof window === 'undefined') {
      return { success: false, permission: 'denied', error: 'Browser environment not available' };
    }

    if (!('Notification' in window)) {
      return {
        success: false,
        permission: 'denied',
        error: 'Web Push requires adding CamGo to your Home Screen on iOS Safari, or using Chrome/Edge.',
      };
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const reg = await this.initServiceWorker();
        // Save subscription state so it never fails silently
        try {
          localStorage.setItem('camgo_push_enabled', 'true');
          localStorage.setItem('camgo_push_granted_at', new Date().toISOString());
          if (reg && 'pushManager' in reg) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              localStorage.setItem('camgo_push_subscription', JSON.stringify(sub));
            } else {
              localStorage.setItem('camgo_push_subscription', JSON.stringify({ active: true, registeredAt: Date.now() }));
            }
          }
        } catch {
          // ignore localStorage error
        }

        this.playChime('success');
        return { success: true, permission: perm };
      } else {
        try {
          localStorage.setItem('camgo_push_enabled', 'false');
        } catch {
          // ignore
        }
        return {
          success: false,
          permission: perm,
          error:
            perm === 'denied'
              ? 'Notifications are blocked. Please enable them in your browser or phone app settings.'
              : 'Permission prompt was dismissed.',
        };
      }
    } catch (err: any) {
      console.error('[PUSH SERVICE] Error requesting notification permission:', err);
      return {
        success: false,
        permission: this.getPermission(),
        error: err?.message || 'Failed to request notification permission.',
      };
    }
  }

  /**
   * Synthesizes a clean, pleasant notification sound using Web Audio API
   * Guarantees instant chime playback without relying on external MP3 assets
   */
  public playChime(type: 'incoming' | 'sent' | 'success' = 'incoming'): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'incoming') {
        // WhatsApp / Messenger inspired double-tap chime (587Hz -> 880Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'sent') {
        // Subtle pop (740Hz -> 1000Hz short blip)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(740, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.06);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'success') {
        // Uplifting triad chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.07); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.14); // G5

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {
      // AudioContext could be blocked by autoplay policies
    }
  }

  /**
   * Dispatches a native Push / Web Notification
   * Works whether the app is in the background or locked screen
   */
  public async dispatchNotification(payload: PushNotificationPayload): Promise<boolean> {
    if (!this.isSupported()) return false;

    // Trigger audio & haptic feedback
    this.playChime('incoming');
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([180, 80, 180]);
      } catch {
        // ignore
      }
    }

    if (Notification.permission !== 'granted') {
      return false;
    }

    const title = payload.title;
    const options: NotificationOptions & Record<string, any> = {
      body: payload.body,
      icon: payload.icon || '/pwa-icon.svg',
      badge: '/pwa-icon.svg',
      image: payload.image,
      tag: payload.tag || `chat-${Date.now()}`,
      renotify: true,
      data: {
        url: payload.url || '/#chat',
        threadId: payload.threadId,
        channelId: payload.channelId,
        senderId: payload.senderId,
        senderName: payload.senderName,
      },
    };

    // Ensure service worker registration is ready
    if (!this.swRegistration && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.ready;
      } catch {
        // ignore
      }
    }

    // Prefer service worker registration showNotification (handles lockscreen and background on Android/iOS)
    if (this.swRegistration && 'showNotification' in this.swRegistration) {
      try {
        await this.swRegistration.showNotification(title, options);
        return true;
      } catch (err) {
        console.warn('[PUSH SERVICE] SW showNotification error, falling back to window.Notification:', err);
      }
    }

    // Try posting message to active service worker controller
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options,
        });
      } catch {
        // ignore
      }
    }

    // Fallback: standard window.Notification
    try {
      const n = new Notification(title, options);
      n.onclick = (e) => {
        e.preventDefault();
        window.focus();
        window.location.hash = payload.url || 'chat';
        n.close();
      };
      return true;
    } catch (err) {
      console.warn('[PUSH SERVICE] Notification constructor failed:', err);
      return false;
    }
  }

  /**
   * Simulates a background lock-screen push notification (WhatsApp / Messenger style)
   * Delays delivery by 3-5 seconds so user can switch apps or lock phone screen
   */
  public scheduleSimulatedPush(
    payload: PushNotificationPayload,
    delaySeconds = 3,
    onCountdownTick?: (remainingSeconds: number) => void
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let remaining = delaySeconds;
      if (onCountdownTick) onCountdownTick(remaining);

      const interval = setInterval(() => {
        remaining -= 1;
        if (onCountdownTick) onCountdownTick(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          this.dispatchNotification(payload).then(resolve);
        }
      }, 1000);
    });
  }
}

export const pushNotificationService = new PushNotificationService();
