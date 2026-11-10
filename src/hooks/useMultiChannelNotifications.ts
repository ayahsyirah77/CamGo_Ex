import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export interface NotificationEvent {
  id: string;
  event: 'sos_alert' | 'weather_alert' | 'chat_message' | 'job_posted' | 'classified_item' | 'service_update' | string;
  priority: NotificationPriority;
  payload: {
    title?: string;
    message?: string;
    sender?: string;
    location?: string;
    severity?: string;
    category?: string;
    [key: string]: any;
  };
  timestamp: string;
}

export function useMultiChannelNotifications() {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [activeSos, setActiveSos] = useState<NotificationEvent | null>(null);
  const [activeWeatherBanner, setActiveWeatherBanner] = useState<NotificationEvent | null>(null);
  const [activeChatPreview, setActiveChatPreview] = useState<NotificationEvent | null>(null);
  const [toasts, setToasts] = useState<NotificationEvent[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('camgo_notif_muted') === 'true';
  });
  const [isConnected, setIsConnected] = useState<boolean>(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const processedNotifIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem('camgo_notif_muted', String(isMuted));
  }, [isMuted]);

  // Sound Synthesis Engine
  const playSound = useCallback((priority: NotificationPriority) => {
    if (isMuted && priority !== 'critical') return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      if (priority === 'critical') {
        // SOS Urgent Dual-Tone Siren
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.2);
        osc2.frequency.setValueAtTime(440, now);
        osc2.frequency.exponentialRampToValueAtTime(880, now + 0.2);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.6);
      } else if (priority === 'high') {
        // Weather warning chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.3); // E5

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        // Two-Tone Pleasant Bell Chime for Chat & Messages (D5 -> A5)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn('AudioContext playback error:', e);
    }
  }, [isMuted]);

  // Haptic Vibration Engine
  const triggerVibration = useCallback((priority: NotificationPriority) => {
    if (typeof window === 'undefined' || !navigator.vibrate) return;
    if (isMuted && priority !== 'critical') return;

    try {
      if (priority === 'critical') {
        navigator.vibrate([300, 100, 300, 100, 500, 200, 500]);
      } else if (priority === 'high') {
        navigator.vibrate([200, 100, 200]);
      } else {
        navigator.vibrate([100]);
      }
    } catch (e) {
      // vibration blocked or unsupported
    }
  }, [isMuted]);

  // Central Event Dispatch & Router
  const handleIncomingEvent = useCallback((eventData: NotificationEvent) => {
    if (!eventData || !eventData.event || eventData.event === 'connection_established' || eventData.event === 'pong') {
      return;
    }

    if (eventData.id && processedNotifIds.current.has(eventData.id)) {
      return;
    }
    if (eventData.id) {
      processedNotifIds.current.add(eventData.id);
    }

    const rawPayload = eventData.payload || {};
    const normalizedPayload = {
      ...rawPayload,
      sender: rawPayload.sender || rawPayload.senderName || (eventData.event === 'chat_message' ? 'Lounge Member' : 'CamGo Dispatch'),
      message: rawPayload.message || rawPayload.text || (eventData.event === 'chat_message' ? 'Sent a new message in Chat Lounge' : 'New notification received'),
      title: rawPayload.title || (eventData.event === 'chat_message' ? `Chat: ${rawPayload.sender || rawPayload.senderName || 'Lounge Member'}` : 'Highland Alert'),
    };

    const enrichedEvent: NotificationEvent = {
      ...eventData,
      id: eventData.id || 'notif-' + Math.random().toString(36).substring(2, 9),
      payload: normalizedPayload,
      timestamp: eventData.timestamp || new Date().toISOString()
    };

    setNotifications((prev) => [enrichedEvent, ...prev.slice(0, 49)]);

    // Trigger audio & haptics
    playSound(enrichedEvent.priority);
    triggerVibration(enrichedEvent.priority);

    // Route to appropriate UI component
    if (enrichedEvent.event === 'sos_alert' || enrichedEvent.priority === 'critical') {
      setActiveSos(enrichedEvent);
    } else if (enrichedEvent.event === 'weather_alert' || enrichedEvent.priority === 'high') {
      setActiveWeatherBanner(enrichedEvent);
    } else if (enrichedEvent.event === 'chat_message') {
      setActiveChatPreview(enrichedEvent);
      setTimeout(() => {
        setActiveChatPreview((curr) => (curr?.id === enrichedEvent.id ? null : curr));
      }, 7000);
    } else {
      setToasts((prev) => [enrichedEvent, ...prev.slice(0, 4)]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== enrichedEvent.id));
      }, 6000);
    }
  }, [playSound, triggerVibration]);

  // Firebase Firestore Real-Time Listener (replacing legacy persistent WebSocket)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isInitialMount = true;

    try {
      const notifRef = collection(db, 'broadcast_notifications');
      const notifQuery = query(notifRef, orderBy('createdAt', 'desc'), limit(20));

      unsubscribe = onSnapshot(
        notifQuery,
        (snapshot) => {
          setIsConnected(true);

          // On initial load, mark existing docs as processed without triggering audio alarms
          if (isInitialMount) {
            isInitialMount = false;
            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data();
              if (data && data.event) {
                const notifObj: NotificationEvent = {
                  id: docSnap.id,
                  event: data.event,
                  priority: data.priority || 'normal',
                  payload: data.payload || {},
                  timestamp: data.timestamp || new Date().toISOString(),
                };
                processedNotifIds.current.add(docSnap.id);
                setNotifications((prev) => [notifObj, ...prev.slice(0, 49)]);
              }
            });
            return;
          }

          // Process new incoming changes in real time
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              if (data && data.event) {
                const notifObj: NotificationEvent = {
                  id: change.doc.id,
                  event: data.event,
                  priority: data.priority || 'normal',
                  payload: data.payload || {},
                  timestamp: data.timestamp || new Date().toISOString(),
                };
                handleIncomingEvent(notifObj);
              }
            }
          });
        },
        (error) => {
          console.warn('[Firebase Notifications] Firestore listener non-fatal notice:', error);
          setIsConnected(true);
        }
      );
    } catch (e) {
      console.warn('[Firebase Notifications] Setup notice:', e);
      setIsConnected(true);
    }

    const handleLocalBroadcast = (e: any) => {
      if (e?.detail) {
        handleIncomingEvent(e.detail);
      }
    };
    window.addEventListener('camgo-broadcast-event', handleLocalBroadcast);

    return () => {
      window.removeEventListener('camgo-broadcast-event', handleLocalBroadcast);
      if (unsubscribe) unsubscribe();
    };
  }, [handleIncomingEvent]);

  const simulateEvent = useCallback((event: string, priority: NotificationPriority, payload: any) => {
    handleIncomingEvent({
      id: 'sim-' + Date.now(),
      event,
      priority,
      payload,
      timestamp: new Date().toISOString()
    });
  }, [handleIncomingEvent]);

  return {
    notifications,
    activeSos,
    setActiveSos,
    activeWeatherBanner,
    setActiveWeatherBanner,
    activeChatPreview,
    setActiveChatPreview,
    toasts,
    setToasts,
    isMuted,
    setIsMuted,
    isConnected,
    simulateEvent,
  };
}
