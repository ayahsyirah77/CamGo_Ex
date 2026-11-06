import { useState, useEffect, useCallback, useRef } from 'react';

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
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

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
        // Normal / Soft Ping for Chats, Jobs, Classifieds
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
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

  // WebSocket Connection Lifecycle
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    let socket: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          setIsConnected(true);
          console.log('[Multi-Channel Notification WS] Connected to gateway');
        };

        socket.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (data && data.event && data.event !== 'connection_established' && data.event !== 'pong') {
              handleIncomingEvent(data);
            }
          } catch (e) {
            console.warn('Failed to parse WS message:', e);
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          reconnectTimer = setTimeout(connect, 4000);
        };

        socket.onerror = (err) => {
          console.warn('[Multi-Channel Notification WS] Error:', err);
          socket?.close();
        };
      } catch (e) {
        reconnectTimer = setTimeout(connect, 4000);
      }
    };

    connect();

    const handleLocalBroadcast = (e: any) => {
      if (e?.detail) {
        handleIncomingEvent(e.detail);
      }
    };
    window.addEventListener('camgo-broadcast-event', handleLocalBroadcast);

    return () => {
      window.removeEventListener('camgo-broadcast-event', handleLocalBroadcast);
      if (socket) socket.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
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
